import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ZevoLogo } from '../../components/ui/ZevoLogo'
import { CheckCircle, AlertCircle } from 'lucide-react'

// Page de définition d'un nouveau mot de passe, cible du lien email
// "Réinitialiser mon mot de passe" (redirectTo de resetPasswordForEmail).
// Le lien Supabase arrive avec #access_token=...&type=recovery : le client
// supabase-js (detectSessionInUrl) établit une session de recovery, on attend
// qu'elle soit prête avant d'afficher le formulaire.
export default function ResetPasswordPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [linkExpired, setLinkExpired] = useState(false)

  // Filet : si aucune session ne s'établit (lien expiré/déjà utilisé/invalide),
  // on ne reste pas bloqué sur le spinner.
  useEffect(() => {
    if (user) return
    const hash = window.location.hash || ''
    // Supabase signale les liens invalides via #error=...&error_code=otp_expired
    if (hash.includes('error')) {
      setLinkExpired(true)
      return
    }
    const t = setTimeout(() => setLinkExpired(true), 5000)
    return () => clearTimeout(t)
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSuccess(true)
    } catch (err) {
      console.error('ResetPasswordPage — erreur updateUser:', err)
      const msg = err?.message || ''
      if (msg.includes('different from the old password')) {
        setError("Le nouveau mot de passe doit être différent de l'ancien.")
      } else if (msg.toLowerCase().includes('session')) {
        setError('Ta session a expiré. Redemande un lien de réinitialisation.')
      } else {
        setError('Une erreur est survenue. Réessaie ou redemande un lien.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--bg-base)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <ZevoLogo size="lg" />
          </div>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {success ? 'Mot de passe mis à jour' : 'Choisis un nouveau mot de passe'}
          </p>
        </div>

        {/* Lien invalide ou expiré */}
        {!user && linkExpired && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-3">
              <AlertCircle size={16} className="flex-shrink-0" />
              Ce lien de réinitialisation est invalide ou a expiré.
            </div>
            <Button onClick={() => navigate('/login', { replace: true })} className="w-full" size="lg">
              Redemander un lien
            </Button>
          </div>
        )}

        {/* Attente de la session de recovery */}
        {!user && !linkExpired && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-[#FF6B2B] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Formulaire nouveau mot de passe */}
        {user && !success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nouveau mot de passe"
              type="password"
              placeholder="6 caractères minimum"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              autoFocus
            />
            <Input
              label="Confirme le mot de passe"
              type="password"
              placeholder="••••••••"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" loading={submitting} className="w-full" size="lg">
              Mettre à jour mon mot de passe
            </Button>
          </form>
        )}

        {/* Succès */}
        {success && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
              <p className="text-green-400 text-sm font-medium">
                Ton mot de passe a été mis à jour.
              </p>
            </div>
            <Button onClick={() => navigate('/', { replace: true })} className="w-full" size="lg">
              Accéder à mon espace
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
