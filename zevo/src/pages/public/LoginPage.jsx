import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ZevoLogo } from '../../components/ui/ZevoLogo'
import { supabase } from '../../lib/supabase'

// Page de connexion — design Zevo noir/orange
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const { login, resetPassword } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // login() retourne { user, session }
      const { user } = await login(email, password)

      // Récupère le rôle via user.id (respecte la RLS — ne pas utiliser l'email)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const redirects = { admin: '/admin', coach: '/coach', client: '/app' }
      navigate(redirects[profile?.role] ?? '/app', { replace: true })
    } catch (err) {
      setError('Email ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await resetPassword(email)
      setResetSent(true)
    } catch {
      setError("Erreur lors de l'envoi. Vérifiez l'email.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <ZevoLogo size="lg" />
          </div>
          <p className="text-white/40 text-sm mt-1">
            {forgotMode ? 'Réinitialiser le mot de passe' : 'Connexion à votre espace'}
          </p>
        </div>

        {/* Formulaire login */}
        {!forgotMode && (
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Se connecter
            </Button>

            <button
              type="button"
              onClick={() => setForgotMode(true)}
              className="w-full text-center text-sm text-white/40 hover:text-white/70 transition-colors mt-2"
            >
              Mot de passe oublié ?
            </button>
          </form>
        )}

        {/* Formulaire mot de passe oublié */}
        {forgotMode && !resetSent && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Envoyer le lien
            </Button>

            <button
              type="button"
              onClick={() => { setForgotMode(false); setError('') }}
              className="w-full text-center text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              ← Retour à la connexion
            </button>
          </form>
        )}

        {/* Confirmation envoi */}
        {forgotMode && resetSent && (
          <div className="text-center space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <p className="text-green-400 text-sm">
                Lien envoyé ! Vérifiez votre boîte mail.
              </p>
            </div>
            <button
              onClick={() => { setForgotMode(false); setResetSent(false) }}
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              ← Retour à la connexion
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
