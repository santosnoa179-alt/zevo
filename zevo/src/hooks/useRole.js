import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Détecte le rôle de l'utilisateur connecté
// Cascade : admins → profiles.role
// .maybeSingle() partout pour éviter les erreurs si 0 résultats
export function useRole() {
  const { user } = useAuth()
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const fetchIdRef = useRef(0) // Anti-race condition

  useEffect(() => {
    // Pas de user → pas de rôle
    if (!user) {
      console.log('useRole — pas de user, reset')
      setRole(null)
      setLoading(false)
      return
    }

    // CRITIQUE : remettre loading à true AVANT de lancer la query
    // Sans ça, ProtectedRoute voit loading=false + role=null et redirige
    setLoading(true)
    setRole(null)

    const currentFetchId = ++fetchIdRef.current

    const detecterRole = async () => {
      console.log('useRole — début détection pour', user.id)

      try {
        // 1. Vérifier la table admins
        const { data: adminRow, error: adminError } = await supabase
          .from('admins')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        // Si un autre effect a démarré entre-temps, abandonner
        if (currentFetchId !== fetchIdRef.current) return

        if (adminError) {
          console.error('useRole — erreur requête admins:', adminError)
          // On continue vers profiles, on ne bloque pas
        }

        if (adminRow) {
          console.log('useRole — rôle résolu: admin')
          setRole('admin')
          setLoading(false)
          return
        }

        // 2. Lire le rôle depuis profiles
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        // Anti-race
        if (currentFetchId !== fetchIdRef.current) return

        if (profileError) {
          console.error('useRole — erreur requête profiles:', profileError)
          setRole(null)
          setLoading(false)
          return
        }

        if (profileData?.role) {
          console.log('useRole — rôle résolu:', profileData.role)
          setRole(profileData.role)
        } else {
          console.warn('useRole — aucun rôle trouvé pour', user.id)
          setRole(null)
        }
      } catch (err) {
        console.error('useRole — erreur inattendue:', err)
        if (currentFetchId !== fetchIdRef.current) return
        setRole(null)
      }

      setLoading(false)
    }

    detecterRole()
  }, [user?.id]) // dépend de user.id, pas de la ref user entière

  return { role, loading }
}
