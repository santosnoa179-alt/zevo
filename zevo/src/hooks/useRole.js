import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Détecte le rôle de l'utilisateur connecté depuis la table profiles
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

    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Erreur récupération rôle :', error)
          setRole(null)
        } else {
          setRole(data?.role ?? null)
        }
        setLoading(false)
      })
  }, [user])

  return { role, loading }
}
