import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ZevoLogo } from '../../components/ui/ZevoLogo'
import { Dumbbell, Utensils, LineChart, MessageCircle, ShieldCheck } from 'lucide-react'

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
      // Utilise la fonction RPC sécurisée (pas de select * sur invitations)
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_invitation_by_token', { p_token: token })

      // Vérifier que l'invitation est valide et non expirée
      const data = rpcData?.[0] || null
      const error = rpcError || (!data ? { message: 'Token invalide' } : null)
      if (data && data.acceptee === true) {
        setError('Cette invitation a déjà été utilisée.')
        setLoading(false)
        return
      }
      if (data && data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('Ce lien d\'invitation a expiré.')
        setLoading(false)
        return
      }

      if (error || !data) {
        console.error('[InvitePage] Token invalide:', error)
        setError('Ce lien d\'invitation est invalide ou expiré.')
      } else {
        // Charger le nom de l'app du coach separement (non bloquant)
        const { data: coach } = await supabase
          .from('coaches')
          .select('nom_app')
          .eq('id', data.coach_id)
          .single()
        setInvitation({ ...data, coach_nom_app: coach?.nom_app || 'Zevo' })
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

      // Crée l'entrée dans la table clients (inactif tant qu'il n'a pas payé)
      await supabase.from('clients').insert({
        id: authData.user.id,
        coach_id: invitation.coach_id,
        actif: false,
        onboarding_complete: true,
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
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF6B2B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-4 relative overflow-hidden">
        {/* Glow ambiant */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,107,43,0.08),transparent_55%)]" />
        <div className="relative z-10 w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
            <span className="text-2xl">🔗</span>
          </div>
          <h2 className="text-[var(--text-primary)] text-2xl font-bold mb-2">Lien invalide</h2>
          <p className="text-[var(--text-muted)] text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const coachAppName = invitation?.coach_nom_app ?? 'Zevo'

  return (
    <div className="min-h-screen bg-[var(--bg-base)] relative overflow-hidden">
      {/* Glow ambiant orange en haut */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[50vh] bg-[radial-gradient(ellipse_at_top,rgba(255,107,43,0.10),transparent_60%)]"
      />
      {/* Grain subtil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">

          {/* ── HEADER ── */}
          <div className="flex flex-col items-center text-center mb-8">
            <ZevoLogo size="md" className="text-[var(--text-primary)] mb-6" />

            {/* Badge d'invitation */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 mb-5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#FF6B2B] opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF6B2B]" />
              </span>
              <span className="text-[11px] font-semibold text-[#FF6B2B] tracking-wide uppercase">
                Invitation active
              </span>
            </div>

            <h1 className="text-[var(--text-primary)] text-3xl font-extrabold tracking-tight leading-tight">
              Bienvenue sur{' '}
              <span className="text-[#FF6B2B]">{coachAppName}</span>
            </h1>
            <p className="text-[var(--text-muted)] text-sm mt-3 max-w-xs">
              Ton coach a créé ton espace personnalisé. Finalise ton inscription en 30 secondes.
            </p>
          </div>

          {/* ── CARD FORM ── */}
          <div className="hero-card p-5 md:p-6 rounded-2xl border border-white/[0.06] bg-[var(--bg-card)] backdrop-blur-sm shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Ton prénom"
                type="text"
                placeholder="Prénom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                required
                autoFocus
              />
              <Input
                label="Email"
                type="email"
                value={invitation?.email ?? ''}
                disabled
                className="opacity-60"
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

              <Button type="submit" loading={submitting} className="w-full mt-1" size="lg">
                Créer mon compte
              </Button>

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-muted)] pt-1">
                <ShieldCheck size={12} className="text-[var(--text-muted)]" strokeWidth={2} />
                Tes données sont chiffrées et privées
              </p>
            </form>
          </div>

          {/* ── FEATURES PREVIEW ── */}
          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {[
              { icon: Dumbbell,      label: 'Programmes sport' },
              { icon: Utensils,      label: 'Nutrition sur mesure' },
              { icon: LineChart,     label: 'Suivi progression' },
              { icon: MessageCircle, label: 'Messagerie coach' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]"
              >
                <Icon size={14} className="text-[#FF6B2B] shrink-0" strokeWidth={2} />
                <span className="text-[12px] text-[var(--text-muted)] font-medium truncate">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* ── FOOTER ── */}
          <p className="text-center text-[11px] text-[var(--text-muted)] mt-8 opacity-60">
            Propulsé par <span className="font-semibold">Zevo</span> — La plateforme des coachs sportifs
          </p>

        </div>
      </div>
    </div>
  )
}
