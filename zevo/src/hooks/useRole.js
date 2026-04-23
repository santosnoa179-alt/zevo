import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Cache global — évite de relancer les requêtes Supabase
// à chaque composant qui appelle useRole()
const roleCache = { userId: null, role: null }

// Listeners pour notifier les composants utilisant useRole() quand
// on force une invalidation (ex: après signup coach, on doit refetch
// le rôle qui vient juste d'être UPDATE en DB).
const listeners = new Set()

/**
 * Force un refetch du rôle — à appeler après toute mutation de `profiles.role`
 * (ex: signup coach où on crée un profil puis UPDATE role='coach').
 *
 * Sinon le cache contient encore l'ancien rôle et la redirection part sur
 * la mauvaise section (/app au lieu de /coach).
 */
export function invalidateRoleCache() {
  roleCache.userId = null
  roleCache.role = null
  listeners.forEach(cb => cb())
}

/**
 * Set directement le rôle dans le cache, sans passer par un refetch Supabase.
 * À utiliser juste après un UPDATE qu'on vient de faire nous-mêmes — on sait
 * quelle est la nouvelle valeur, pas besoin de demander à Supabase.
 *
 * Règle le bug de replication lag où un SELECT immédiat après UPDATE peut
 * renvoyer l'ancienne valeur pendant quelques millisecondes.
 */
export function setRoleCache(userId, role) {
  roleCache.userId = userId
  roleCache.role = role
  listeners.forEach(cb => cb())
}

// Détecte le rôle de l'utilisateur connecté
// Cascade : admins → profiles.role
export function useRole() {
  const { user } = useAuth()
  const [role, setRole] = useState(() => {
    // Initialiser depuis le cache si même user
    if (user?.id && roleCache.userId === user.id) return roleCache.role
    return null
  })
  const [loading, setLoading] = useState(() => {
    // Pas de loading si déjà en cache
    if (user?.id && roleCache.userId === user.id && roleCache.role) return false
    return true
  })
  const fetchIdRef = useRef(0)
  const [refetchCounter, setRefetchCounter] = useState(0)

  // Abonne ce composant aux invalidations globales du cache
  useEffect(() => {
    const cb = () => setRefetchCounter(c => c + 1)
    listeners.add(cb)
    return () => { listeners.delete(cb) }
  }, [])

  useEffect(() => {
    if (!user) {
      setRole(null)
      setLoading(false)
      roleCache.userId = null
      roleCache.role = null
      return
    }

    // Cache hit — pas besoin de refetch
    // (inclut le cas où setRoleCache a été appelé juste avant via LoginPage
    // après l'UPDATE role='coach' → on prend direct la valeur sans risque de
    // replication lag Supabase)
    if (roleCache.userId === user.id && roleCache.role) {
      setRole(roleCache.role)
      setLoading(false)
      return
    }

    setLoading(true)
    setRole(null)

    const currentFetchId = ++fetchIdRef.current

    const detecterRole = async () => {
      try {
        // Requêtes en PARALLÈLE au lieu de séquentiel
        const [adminResult, profileResult] = await Promise.all([
          supabase.from('admins').select('id').eq('id', user.id).maybeSingle(),
          supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        ])

        // Anti-race
        if (currentFetchId !== fetchIdRef.current) return

        let resolvedRole = null

        if (adminResult.data) {
          resolvedRole = 'admin'
        } else if (profileResult.data?.role) {
          resolvedRole = profileResult.data.role
        }

        // ── Auto-guérison : profiles.role = 'client' mais row coaches existe ──
        // Cas : le trigger handle_new_user() crée role='client', puis l'UPDATE
        // role='coach' échoue silencieusement (RLS, lag réseau). Le cache cache
        // le bug pendant la première session, mais au re-login on lit la DB et
        // on tombe sur 'client' → redirection vers /app.
        // Fix : si profiles dit 'client' mais qu'il y a une row coaches, c'est
        // un coach. On corrige le DB en arrière-plan pour les prochains logins.
        if (resolvedRole === 'client') {
          const { data: coachRow } = await supabase
            .from('coaches')
            .select('id')
            .eq('id', user.id)
            .maybeSingle()

          if (coachRow) {
            console.warn('useRole — auto-heal: profiles.role=client mais coaches existe → correction role=coach')
            resolvedRole = 'coach'
            // Heal silencieux — on ne bloque pas si ça échoue
            supabase
              .from('profiles')
              .update({ role: 'coach' })
              .eq('id', user.id)
              .then(({ error }) => {
                if (error) console.error('useRole — heal profiles.role échoué:', error)
              })
          }
        }

        // Mettre en cache
        roleCache.userId = user.id
        roleCache.role = resolvedRole

        setRole(resolvedRole)
      } catch (err) {
        console.error('useRole — erreur:', err)
        if (currentFetchId !== fetchIdRef.current) return
        setRole(null)
      }

      setLoading(false)
    }

    detecterRole()
  }, [user?.id, refetchCounter])

  return { role, loading }
}
