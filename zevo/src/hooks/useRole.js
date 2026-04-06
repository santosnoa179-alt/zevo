import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Cache global — évite de relancer les requêtes Supabase
// à chaque composant qui appelle useRole()
const roleCache = { userId: null, role: null }

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

  useEffect(() => {
    if (!user) {
      setRole(null)
      setLoading(false)
      roleCache.userId = null
      roleCache.role = null
      return
    }

    // Cache hit — pas besoin de refetch
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
  }, [user?.id])

  return { role, loading }
}
