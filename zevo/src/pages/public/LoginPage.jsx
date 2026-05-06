import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRole, setRoleCache } from '../../hooks/useRole'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ZevoLogo } from '../../components/ui/ZevoLogo'
import { CheckCircle, AlertCircle, Eye, EyeOff, Mail, Check, RefreshCw } from 'lucide-react'

// Page de connexion + inscription — design Zevo noir/orange
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nom, setNom] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const location = useLocation()
  const [mode, setMode] = useState(location.pathname === '/register' ? 'register' : 'login') // 'login' | 'register' | 'forgot'
  const [resetSent, setResetSent] = useState(false)
  const [registerSuccess, setRegisterSuccess] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const { user, loading: authLoading, login, signup, resetPassword } = useAuth()
  const { role, loading: roleLoading } = useRole()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Retour Stripe Checkout — afficher un message de succès
  const checkoutSuccess = searchParams.get('checkout') === 'success'
  const checkoutPlan = searchParams.get('plan')

  // Si l'utilisateur est déjà connecté, redirige vers sa section
  useEffect(() => {
    if (authLoading || roleLoading) return
    if (!user || !role) return

    console.log('LoginPage — user déjà connecté, rôle:', role, '→ redirection')
    const redirects = { admin: '/admin', coach: '/coach', client: '/app' }
    navigate(redirects[role] ?? '/app', { replace: true })
  }, [user, role, authLoading, roleLoading, navigate])

  // ── Login ──
  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
    } catch (err) {
      console.error('LoginPage — erreur login:', err)
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
    }
  }

  // ── Register ──
  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')

    // Validations
    if (!nom.trim()) {
      setError('Renseigne ton nom ou prénom.')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)

    try {
      // 1. Créer le compte via Supabase Auth en passant role + nom dans les metadata.
      //    Le trigger handle_new_user() lit raw_user_meta_data->>'role' et crée
      //    la row profiles avec le bon rôle directement (pas besoin d'UPDATE
      //    après, qui est bloqué par RLS sur la colonne `role`).
      const authData = await signup(email, password, {
        nom: nom.trim(),
        role: 'coach',
      })

      if (!authData?.user) {
        throw new Error('Erreur lors de la création du compte.')
      }

      const userId = authData.user.id

      // 2. Créer la ligne coach avec plan par défaut + essai gratuit 14 jours
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 14)

      const { error: coachError } = await supabase
        .from('coaches')
        .insert({
          id: userId,
          plan: 'starter',
          abonnement_actif: false,
          trial_ends_at: trialEnd.toISOString(),
          subscription_status: 'trialing',
        })

      if (coachError) {
        console.error('Erreur insert coaches:', coachError)
      }

      // 3. Set direct 'coach' dans le cache useRole.
      //    On NE fait PAS invalidateRoleCache (qui forcerait un refetch Supabase) :
      //    il y a un replication lag entre UPDATE et SELECT — le refetch peut
      //    renvoyer 'client' pendant quelques ms et déclencher la redirection
      //    sur /app avant que 'coach' arrive en cache.
      //    Avec setRoleCache on pousse directement la valeur qu'on vient
      //    d'UPDATE — aucun round-trip Supabase possible.
      setRoleCache(userId, 'coach')

      // Vérifier si la confirmation email est requise par Supabase
      // Si session présente → auto-confirmé, sinon → email envoyé
      if (authData.session) {
        // Auto-confirmé : le useEffect va détecter user + role et rediriger
        console.log('LoginPage — inscription réussie, session active → redirection auto')
      } else {
        // Email de confirmation requis
        setRegisterSuccess(true)
        setLoading(false)
      }
    } catch (err) {
      console.error('LoginPage — erreur register:', err)

      // Messages d'erreur Supabase traduits en francais
      const msg = (err.message || '').toLowerCase()
      if (msg.includes('already registered') || msg.includes('compte existe')) {
        setError('Cet email est déjà associé à un compte. Connecte-toi.')
      } else if (msg.includes('valid email') || msg.includes('invalid email')) {
        setError('Vérifie le format de ton email.')
      } else if (msg.includes('rate limit') || msg.includes('too many')) {
        setError('Trop de tentatives. Réessaie dans quelques minutes.')
      } else if (msg.includes('password') && msg.includes('short')) {
        setError('Le mot de passe doit contenir au moins 6 caractères.')
      } else if (msg.includes('weak password')) {
        setError('Mot de passe trop faible. Utilise au moins 6 caractères, avec une majuscule et un chiffre.')
      } else if (msg.includes('network') || msg.includes('fetch')) {
        setError('Problème de connexion. Vérifie ton réseau et réessaie.')
      } else {
        setError("Erreur lors de l'inscription. Réessaie ou contacte le support.")
      }
      setLoading(false)
    }
  }

  // ── Renvoyer l'email de confirmation ──
  const handleResendEmail = async () => {
    if (resending || resent) return
    setResending(true)
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      })
      if (resendError) throw resendError
      setResent(true)
      // Re-permettre un nouvel envoi apres 30s
      setTimeout(() => setResent(false), 30000)
    } catch (err) {
      console.error('LoginPage — erreur resend:', err)
    } finally {
      setResending(false)
    }
  }

  // ── Forgot Password ──
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

  // ── Switch mode helper ──
  const switchMode = (newMode) => {
    setMode(newMode)
    setError('')
    setResetSent(false)
    setRegisterSuccess(false)
  }

  // Spinner pendant le chargement initial
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF6B2B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const subtitle = {
    login: 'Connexion à votre espace',
    register: 'Créer votre compte coach',
    forgot: 'Réinitialiser le mot de passe',
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <ZevoLogo size="lg" />
          </div>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {subtitle[mode]}
          </p>
        </div>

        {/* Message succès checkout Stripe */}
        {checkoutSuccess && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
            <div>
              <p className="text-green-400 text-sm font-medium">
                Paiement réussi{checkoutPlan ? ` — Plan ${checkoutPlan.charAt(0).toUpperCase() + checkoutPlan.slice(1)}` : ''} !
              </p>
              <p className="text-green-400/60 text-xs mt-0.5">
                Connectez-vous pour accéder à votre espace coach.
              </p>
            </div>
          </div>
        )}

        {/* ── Formulaire LOGIN ── */}
        {mode === 'login' && (
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
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Se connecter
            </Button>

            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="w-full text-center text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors mt-2"
            >
              Mot de passe oublié ?
            </button>

            <div className="pt-4 border-t border-[var(--border-base)] text-center">
              <p className="text-[var(--text-muted)] text-sm">
                Pas encore de compte ?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-[#FF6B2B] font-medium hover:underline"
                >
                  S'inscrire
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ── Formulaire REGISTER ── */}
        {mode === 'register' && !registerSuccess && (
          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              label="Nom / Prénom"
              type="text"
              placeholder="Jean Dupont"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              autoComplete="name"
            />
            <Input
              label="Email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <div className="relative">
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 6 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Input
              label="Confirmer le mot de passe"
              type={showPassword ? 'text' : 'password'}
              placeholder="Retapez votre mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Créer mon compte
            </Button>

            <div className="pt-4 border-t border-[var(--border-base)] text-center">
              <p className="text-[var(--text-muted)] text-sm">
                Déjà un compte ?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-[#FF6B2B] font-medium hover:underline"
                >
                  Se connecter
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ── Register success (confirmation email) ── */}
        {mode === 'register' && registerSuccess && (
          <div className="space-y-5 animate-confirm-fade-in">
            {/* Card premium avec halo orange */}
            <div className="relative">
              {/* Glow halo en arriere-plan */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-2 rounded-2xl bg-gradient-to-br from-[#FF6B2B]/25 via-[#FF9A6C]/15 to-transparent blur-xl opacity-70"
              />

              {/* Card content */}
              <div className="relative bg-[var(--bg-card)] border border-[var(--border-base)] rounded-2xl p-6 overflow-hidden">
                {/* Liseré gradient en haut */}
                <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#FF6B2B]/70 to-transparent" />

                {/* Icone mail animee avec halo orange */}
                <div className="flex justify-center mb-5">
                  <div className="relative">
                    <div
                      aria-hidden
                      className="absolute inset-0 -m-2 bg-[#FF6B2B]/30 rounded-full blur-xl animate-confirm-pulse"
                    />
                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B2B] to-[#FF9A6C] flex items-center justify-center shadow-lg shadow-[#FF6B2B]/40">
                      <Mail size={26} className="text-white" strokeWidth={2.2} />
                    </div>
                    {/* Petit badge check qui ressort */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--bg-card)] border-2 border-[var(--bg-card)] flex items-center justify-center">
                      <div className="w-full h-full rounded-full bg-green-500 flex items-center justify-center">
                        <Check size={12} className="text-white" strokeWidth={3.5} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Titre + sous-titre */}
                <div className="text-center mb-5">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1.5">
                    Vérifiez votre email
                  </h2>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                    Nous avons envoyé un lien de confirmation à
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 mt-2.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-base)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B2B] animate-pulse" />
                    <span className="text-sm font-medium text-[var(--text-secondary)] truncate max-w-[200px]">
                      {email}
                    </span>
                  </div>
                </div>

                {/* Etapes */}
                <div className="space-y-2.5 pt-4 border-t border-[var(--border-base)]">
                  {[
                    { num: 1, label: 'Email envoyé dans votre boîte', done: true },
                    { num: 2, label: "Cliquez sur le lien pour confirmer", done: false },
                    { num: 3, label: 'Accédez à votre espace coach', done: false },
                  ].map((step) => (
                    <div key={step.num} className="flex items-center gap-3 text-sm">
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
                          step.done
                            ? 'bg-[#FF6B2B]/15 text-[#FF6B2B] border border-[#FF6B2B]/40'
                            : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-base)]'
                        }`}
                      >
                        {step.done ? <Check size={12} strokeWidth={3} /> : step.num}
                      </div>
                      <span
                        className={
                          step.done
                            ? 'text-[var(--text-secondary)]'
                            : 'text-[var(--text-muted)]'
                        }
                      >
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Hint spam + resend */}
            <div className="text-center space-y-3">
              <p className="text-xs text-[var(--text-muted)]">
                Pas reçu ? Vérifiez votre dossier spam ou indésirables.
              </p>

              <button
                type="button"
                onClick={handleResendEmail}
                disabled={resending || resent}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#FF6B2B] hover:text-[#FF9A6C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw
                  size={14}
                  className={resending ? 'animate-spin' : ''}
                />
                {resent
                  ? 'Email renvoyé ✓'
                  : resending
                  ? 'Envoi en cours…'
                  : "Renvoyer l'email"}
              </button>
            </div>

            {/* Retour connexion */}
            <div className="pt-2 text-center">
              <button
                onClick={() => switchMode('login')}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                ← Retour à la connexion
              </button>
            </div>

            {/* Animations inline (keyframes scopees au composant) */}
            <style>{`
              @keyframes confirm-fade-in {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes confirm-pulse {
                0%, 100% { opacity: 0.5; transform: scale(1); }
                50% { opacity: 0.9; transform: scale(1.15); }
              }
              .animate-confirm-fade-in {
                animation: confirm-fade-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
              }
              .animate-confirm-pulse {
                animation: confirm-pulse 2.4s ease-in-out infinite;
              }
            `}</style>
          </div>
        )}

        {/* ── Formulaire MOT DE PASSE OUBLIÉ ── */}
        {mode === 'forgot' && !resetSent && (
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
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Envoyer le lien
            </Button>

            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full text-center text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              ← Retour à la connexion
            </button>
          </form>
        )}

        {/* ── Confirmation envoi reset ── */}
        {mode === 'forgot' && resetSent && (
          <div className="text-center space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <p className="text-green-400 text-sm">
                Lien envoyé ! Vérifiez votre boîte mail.
              </p>
            </div>
            <button
              onClick={() => switchMode('login')}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              ← Retour à la connexion
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
