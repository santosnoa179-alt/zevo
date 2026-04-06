import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ZevoLogo } from '../ui/ZevoLogo'
import { AlertTriangle, CreditCard, LogOut, Loader2, CheckCircle } from 'lucide-react'

// Guard coach : vérifie que abonnement_actif = true
// Si checkout=success dans l'URL → attend le webhook avec polling
export function CoachGuard({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [abonnementActif, setAbonnementActif] = useState(null) // null = chargement
  const [onboardingDone, setOnboardingDone] = useState(null)
  const [stripeCustomerId, setStripeCustomerId] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)

  // ── Détection retour Stripe Checkout ──
  const isCheckoutReturn = searchParams.get('checkout') === 'success'
  const [waitingForWebhook, setWaitingForWebhook] = useState(isCheckoutReturn)
  const [pollCount, setPollCount] = useState(0)
  const pollTimerRef = useRef(null)

  // ── Checker le statut coach dans Supabase ──
  const checkCoachStatus = useCallback(async () => {
    if (!user) return null

    const { data, error } = await supabase
      .from('coaches')
      .select('abonnement_actif, stripe_customer_id, onboarding_complete, trial_ends_at, subscription_status')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('CoachGuard: erreur requête coaches:', error)
      return { abonnementActif: false, onboardingDone: false, stripeCustomerId: null }
    }

    if (data) {
      // Trial actif = accès autorisé même sans abonnement
      const trialActive = data.trial_ends_at && new Date(data.trial_ends_at) > new Date()
      const hasActiveSubscription = data.abonnement_actif === true || data.subscription_status === 'active'

      return {
        abonnementActif: hasActiveSubscription || trialActive,
        onboardingDone: data.onboarding_complete === true,
        stripeCustomerId: data.stripe_customer_id,
      }
    }
    return { abonnementActif: false, onboardingDone: false, stripeCustomerId: null }
  }, [user])

  // ── Check initial (pas de retour Stripe) ──
  useEffect(() => {
    if (!user) return
    if (isCheckoutReturn) return // géré par le polling ci-dessous

    const check = async () => {
      const result = await checkCoachStatus()
      if (result) {
        setAbonnementActif(result.abonnementActif)
        setOnboardingDone(result.onboardingDone)
        setStripeCustomerId(result.stripeCustomerId)
      }
    }
    check()
  }, [user, isCheckoutReturn, checkCoachStatus])

  // ── Polling post-checkout : attend que le webhook mette à jour Supabase ──
  useEffect(() => {
    if (!user || !isCheckoutReturn) return

    const MAX_POLLS = 15 // 15 x 2s = 30 secondes max
    let currentPoll = 0

    const poll = async () => {
      currentPoll++
      setPollCount(currentPoll)
      console.log(`[CoachGuard] Polling #${currentPoll}/${MAX_POLLS}...`)

      const result = await checkCoachStatus()

      if (result?.abonnementActif) {
        // Webhook a fait son travail
        console.log('[CoachGuard] Abonnement actif détecté !')
        setAbonnementActif(true)
        setOnboardingDone(result.onboardingDone)
        setStripeCustomerId(result.stripeCustomerId)
        setWaitingForWebhook(false)
        return // stop polling
      }

      if (currentPoll >= MAX_POLLS) {
        // Timeout — on laisse passer quand même (le webhook viendra plus tard)
        console.warn('[CoachGuard] Timeout polling — on laisse passer')
        setAbonnementActif(result?.abonnementActif ?? false)
        setOnboardingDone(result?.onboardingDone ?? true)
        setStripeCustomerId(result?.stripeCustomerId ?? null)
        setWaitingForWebhook(false)
        return
      }

      // Continuer le polling
      pollTimerRef.current = setTimeout(poll, 2000)
    }

    // Premier check après 1.5s (laisser au webhook le temps d'arriver)
    pollTimerRef.current = setTimeout(poll, 1500)

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current)
      }
    }
  }, [user, isCheckoutReturn, checkCoachStatus])

  // ── Écran d'attente post-checkout ──
  if (waitingForWebhook) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-6">
          <ZevoLogo size="lg" className="justify-center" />

          <div className="bg-[var(--bg-card)] rounded-2xl p-8 space-y-5">
            {/* Spinner animé */}
            <div className="w-16 h-16 rounded-2xl bg-[#FF6B2B]/10 mx-auto flex items-center justify-center">
              <Loader2 size={28} className="text-[#FF6B2B] animate-spin" />
            </div>

            <div>
              <h1 className="text-[var(--text-primary)] text-lg font-bold mb-2">
                Validation du paiement...
              </h1>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Ton paiement a été reçu. On active ton abonnement, ça prend quelques secondes.
              </p>
            </div>

            {/* Barre de progression subtile */}
            <div className="w-full bg-[var(--bg-surface)] rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C] rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min((pollCount / 10) * 100, 95)}%` }}
              />
            </div>

            <p className="text-[var(--text-muted)] text-xs">
              Ne ferme pas cette page
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Chargement initial ──
  if (abonnementActif === null || onboardingDone === null) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF6B2B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Onboarding pas terminé ──
  if (!onboardingDone) {
    return <Navigate to="/coach/onboarding" replace />
  }

  // ── Abonnement actif → accès normal ──
  if (abonnementActif) {
    return children
  }

  // ── Ouvre le Customer Portal pour réactiver ──
  const handleReactivate = async () => {
    if (stripeCustomerId) {
      setPortalLoading(true)
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession()
        const res = await fetch('/api/create-portal-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authSession?.access_token}`,
          },
          body: JSON.stringify({ customerId: stripeCustomerId }),
        })
        const { url, error } = await res.json()
        if (error) throw new Error(error)
        window.location.href = url
      } catch (err) {
        console.error('Erreur portal:', err)
        setPortalLoading(false)
      }
    } else {
      navigate('/pricing')
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // ── Page de renouvellement ──
  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-8">
        <ZevoLogo size="lg" className="justify-center" />

        <div className="bg-[var(--bg-card)] rounded-2xl p-8 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#FF6B2B]/10 mx-auto flex items-center justify-center">
            <AlertTriangle size={32} className="text-[#FF6B2B]" />
          </div>

          <div>
            <h1 className="text-[var(--text-primary)] text-xl font-bold mb-2">
              Abonnement inactif
            </h1>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              Ton abonnement Zevo n'est plus actif. Réactive-le pour retrouver l'accès à ton espace coach et à toutes tes données.
            </p>
          </div>

          <button
            onClick={handleReactivate}
            disabled={portalLoading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-colors disabled:opacity-50"
          >
            {portalLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CreditCard size={16} />
            )}
            {stripeCustomerId ? 'Réactiver mon abonnement' : 'Choisir un plan'}
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <LogOut size={14} />
            Se déconnecter
          </button>
        </div>

        <p className="text-[var(--text-muted)] text-xs">
          Tes données sont conservées — elles seront disponibles dès la réactivation.
        </p>
      </div>
    </div>
  )
}
