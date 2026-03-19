import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

// Contexte d'authentification partagé dans toute l'app
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Récupère la session active au chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Écoute les changements de session (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Connexion — retourne { user, session }
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  // Inscription — utilisé par InvitePage et éventuellement les coachs
  const signup = async (email, password, meta = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta },
    })
    if (error) throw error
    return data
  }

  // Déconnexion — redirige vers /login via le composant appelant
  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Envoi du lien de réinitialisation du mot de passe
  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) throw error
  }

  const value = { user, loading, login, signup, logout, resetPassword }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook à utiliser dans les composants
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return context
}
