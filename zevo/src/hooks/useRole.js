import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Détecte le rôle de l'utilisateur connecté
// Vérifie d'abord la table admins, puis profiles.role
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
        // 1. Vérifier si l'utilisateur est dans la table admins
        const { data: adminRow, error: adminError } = await supabase
          .from('admins')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        if (!adminError && adminRow) {
          setRole('admin')
          setLoading(false)
          return
        }

        // 2. Sinon, lire le rôle depuis profiles
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Erreur récupération rôle :', profileError)
          setRole(null)
        } else {
          setRole(profileData?.role ?? null)
        }
      } catch (err) {
        console.error('Erreur useRole:', err)
        setRole(null)
      }

      setLoading(false)
    }

    detecterRole()
  }, [user])

  return { role, loading }
}
