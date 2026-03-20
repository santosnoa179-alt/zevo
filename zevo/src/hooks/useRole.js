import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Détecte le rôle de l'utilisateur connecté
// Cascade : admins → profiles.role
// Utilise .maybeSingle() partout pour éviter les erreurs Supabase si 0 résultats
export function useRole() {
  const { user } = useAuth()
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setRole(null)
      setLoading(false)
      return
    }

    const detecterRole = async () => {
      try {
        // 1. Vérifier la table admins
        const { data: adminRow, error: adminError } = await supabase
          .from('admins')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        if (adminError) {
          console.error('useRole — erreur requête admins:', adminError)
        }

        if (adminRow) {
          console.log('useRole — rôle détecté: admin')
          setRole('admin')
          setLoading(false)
          return
        }

        // 2. Lire le rôle depuis profiles (.maybeSingle pour ne jamais throw)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          console.error('useRole — erreur requête profiles:', profileError)
          setRole(null)
          setLoading(false)
          return
        }

        if (profileData?.role) {
          console.log('useRole — rôle détecté:', profileData.role)
          setRole(profileData.role)
        } else {
          console.warn('useRole — aucun rôle trouvé pour', user.id)
          setRole(null)
        }
      } catch (err) {
        console.error('useRole — erreur inattendue:', err)
        setRole(null)
      }

      setLoading(false)
    }

    detecterRole()
  }, [user])

  return { role, loading }
}
