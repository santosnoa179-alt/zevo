import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

// Page d'onboarding pour un nouveau client invité par son coach
export default function InvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { signup } = useAuth()

  const [invitation, setInvitation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [prenom, setPrenom] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  // Vérifie la validité du token au chargement
  useEffect(() => {
    const checkToken = async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*, coaches(nom_app)')
        .eq('token', token)
        .eq('acceptee', false)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data) {
        setError('Ce lien d\'invitation est invalide ou expiré.')
      } else {
        setInvitation(data)
      }
      setLoading(false)
    }

    checkToken()
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Crée le compte via le hook useAuth
      const authData = await signup(invitation.email, password, { prenom })

      // Met à jour le profil avec le prénom
      await supabase
        .from('profiles')
        .update({ nom: prenom, role: 'client' })
        .eq('id', authData.user.id)

      // Crée l'entrée dans la table clients
      await supabase.from('clients').insert({
        id: authData.user.id,
        coach_id: invitation.coach_id,
      })

      // Marque l'invitation comme acceptée
      await supabase
        .from('invitations')
        .update({ acceptee: true })
        .eq('token', token)

      // Redirige vers l'app client
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err.message || 'Une erreur est survenue. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF6B2B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">🔗</div>
          <h2 className="text-[#F5F5F3] text-xl font-semibold mb-2">Lien invalide</h2>
          <p className="text-white/40 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#FF6B2B]/10 rounded-2xl mb-4">
            <span className="text-[#FF6B2B] font-bold text-2xl">Z</span>
          </div>
          <h1 className="text-[#F5F5F3] text-2xl font-bold">Bienvenue !</h1>
          <p className="text-white/40 text-sm mt-1">
            Ton coach t'a invité sur {invitation?.coaches?.nom_app ?? 'Zevo'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Ton prénom"
            type="text"
            placeholder="Prénom"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            value={invitation?.email ?? ''}
            disabled
            className="opacity-50"
          />
          <Input
            label="Choisis un mot de passe"
            type="password"
            placeholder="8 caractères minimum"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirme le mot de passe"
            type="password"
            placeholder="••••••••"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
          />

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" loading={submitting} className="w-full" size="lg">
            Créer mon compte
          </Button>
        </form>
      </div>
    </div>
  )
}
