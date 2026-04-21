import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { Save, Loader2, Check, Link2, CheckCircle, ExternalLink, User, Shield, CreditCard, Bell, PartyPopper } from 'lucide-react'

// Modules activables par le coach
const MODULES_CONFIG = [
  { key: 'sport',    label: 'Sport',    desc: 'Suivi activité physique' },
  { key: 'sommeil',  label: 'Sommeil',  desc: 'Heures & qualité de sommeil' },
  { key: 'humeur',   label: 'Humeur',   desc: 'Score humeur quotidien' },
  { key: 'routines', label: 'Routines', desc: 'Routines matin / soir' },
]

export default function CoachParametresPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // Retour Stripe Checkout
  const checkoutSuccess = searchParams.get('checkout') === 'success'
  const checkoutPlan = searchParams.get('plan')

  // Nettoyer les params après affichage (éviter re-affichage au refresh)
  useEffect(() => {
    if (checkoutSuccess) {
      const timer = setTimeout(() => {
        setSearchParams({}, { replace: true })
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [checkoutSuccess, setSearchParams])

  // État du formulaire — plus de nomApp, logoUrl, couleur ici
  const [messageBienvenue, setMessageBienvenue] = useState('')
  const [modules, setModules] = useState({ sport: true, sommeil: true, humeur: true, routines: true })
  const [plan, setPlan] = useState('starter')
  const [coachPrenom, setCoachPrenom] = useState('')
  const [coachNom, setCoachNom] = useState('')
  const [coachEmail, setCoachEmail] = useState('')

  const [stripeCustomerId, setStripeCustomerId] = useState(null)
  const [stripeAccountId, setStripeAccountId] = useState(null)
  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState(false)
  const [connectLoading, setConnectLoading] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  // Charge les paramètres actuels du coach
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await supabase
        .from('coaches')
        .select('prenom, nom, message_bienvenue, modules, plan, stripe_customer_id, stripe_account_id, stripe_onboarding_complete, trial_ends_at, subscription_status')
        .eq('id', user.id)
        .single()

      if (data) {
        setCoachPrenom(data.prenom || '')
        setCoachNom(data.nom || '')
        setMessageBienvenue(data.message_bienvenue || '')
        // Si en période d'essai sans abonnement actif → afficher "none"
        const trialActive = data.trial_ends_at && new Date(data.trial_ends_at) > new Date()
        const hasSubscription = data.subscription_status === 'active'
        setPlan(trialActive && !hasSubscription ? 'none' : (data.plan || 'starter'))
        setStripeCustomerId(data.stripe_customer_id || null)
        setStripeAccountId(data.stripe_account_id || null)
        setStripeOnboardingComplete(data.stripe_onboarding_complete || false)
        if (data.modules) {
          setModules(prev => ({ ...prev, ...data.modules }))
        }
      }
      setCoachEmail(user.email || '')
      setLoading(false)
    }
    load()
  }, [user])

  // Toggle un module
  const toggleModule = (key) => {
    setModules(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Sauvegarde dans Supabase — uniquement les champs compte/modules
  const handleSave = async () => {
    const data = {
      prenom: coachPrenom,
      nom: coachNom,
      message_bienvenue: messageBienvenue,
      modules,
    }

    setSaving(true)
    setSaved(false)

    try {
      const { error } = await supabase
        .from('coaches')
        .update(data)
        .eq('id', user.id)

      if (error) {
        console.error('Erreur sauvegarde:', error)
        toast.error(`Erreur : ${error.message}`)
      } else {
        toast.success('Paramètres mis à jour avec succès !')
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch (err) {
      console.error('Erreur inattendue:', err)
      toast.error('Erreur réseau. Vérifiez votre connexion.')
    }

    setSaving(false)
  }

  // Ouvre le Stripe Customer Portal pour gérer l'abonnement
  const handleOpenPortal = async () => {
    if (!stripeCustomerId) return
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
      console.error('Erreur Customer Portal:', err)
      setPortalLoading(false)
    }
  }

  // Vérifie le retour d'onboarding Stripe Connect
  // On appelle /api/connect-sync qui vérifie en temps réel avec Stripe
  // que le compte est prêt, puis met à jour onboarding_complete en DB.
  // Plus fiable que de marquer true aveuglément (Stripe peut refuser
  // un compte pour défaut d'infos, KYC en attente, etc).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('stripe_connect') === 'success' && user) {
      const syncConnect = async () => {
        try {
          const { data: { session: authSession } } = await supabase.auth.getSession()
          const res = await fetch('/api/connect-sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authSession?.access_token}`,
            },
          })
          const data = await res.json()
          if (data.connected) {
            setStripeOnboardingComplete(true)
          } else {
            console.warn('[connect-sync] compte Stripe incomplet:', data.requirements)
          }
        } catch (err) {
          console.error('[connect-sync] erreur:', err)
        }
      }
      syncConnect()
      window.history.replaceState({}, '', '/coach/parametres')
    }
  }, [user])

  // Lancer l'onboarding Stripe Connect
  const handleConnectStripe = async () => {
    setConnectLoading(true)
    try {
      const { data: { session: authSession2 } } = await supabase.auth.getSession()
      const res = await fetch('/api/connect-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession2?.access_token}`,
        },
        body: JSON.stringify({ coachId: user.id }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (err) {
      console.error('Erreur Stripe Connect:', err)
      setConnectLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#FF6B2B]" size={32} />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 w-full max-w-3xl mx-auto space-y-5">
      {/* Banner succès Stripe Checkout */}
      {checkoutSuccess && (
        <div className="bg-[#FF6B2B]/10 border border-[#FF6B2B]/30 rounded-2xl p-5 flex items-start gap-4 animate-in fade-in">
          <PartyPopper size={20} className="text-[#FF6B2B] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
          <div>
            <p className="text-[#FF6B2B] font-bold text-sm tracking-tight">
              Paiement confirmé — Bienvenue sur le plan {checkoutPlan ? checkoutPlan.charAt(0).toUpperCase() + checkoutPlan.slice(1) : ''} !
            </p>
            <p className="text-[var(--text-muted)] text-xs mt-1">
              Ton abonnement est actif. Tu peux commencer à utiliser toutes les fonctionnalités de ton plan.
            </p>
          </div>
        </div>
      )}

      {/* Titre */}
      <div className="hero-card hero-card--accent p-4 md:p-5 flex items-center gap-3">
        <User size={18} className="text-[var(--text-muted)] shrink-0" strokeWidth={1.75} />
        <div>
          <h1 className="text-[var(--text-primary)] text-xl md:text-2xl font-bold tracking-tight leading-tight">Paramètres</h1>
          <p className="text-[var(--text-muted)] text-xs md:text-sm mt-0.5">Gérez votre compte, modules et abonnement</p>
        </div>
      </div>

      {/* ── Section Profil Coach ── */}
      <section className="hero-card p-5 md:p-6 space-y-5">
        <div className="flex items-center gap-2.5 mb-1">
          <User size={14} className="text-[var(--text-muted)]" strokeWidth={1.75} />
          <h2 className="text-[var(--text-primary)] font-bold text-base tracking-tight">Profil</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Prénom</label>
            <input
              type="text"
              value={coachPrenom}
              onChange={(e) => setCoachPrenom(e.target.value)}
              placeholder="Votre prénom"
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Nom</label>
            <input
              type="text"
              value={coachNom}
              onChange={(e) => setCoachNom(e.target.value)}
              placeholder="Votre nom"
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Email</label>
          <div className="flex items-center gap-3">
            <input
              type="email"
              value={coachEmail}
              disabled
              className="w-full bg-[var(--bg-surface)]/50 border border-[var(--border-base)] rounded-lg px-4 py-2.5 text-[var(--text-muted)] text-sm cursor-not-allowed"
            />
            <span className="text-[var(--text-muted)] text-xs whitespace-nowrap">via Supabase Auth</span>
          </div>
        </div>
      </section>

      {/* ── Section Message de bienvenue ── */}
      <section className="hero-card p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2.5 mb-1">
          <Bell size={14} className="text-[var(--text-muted)]" strokeWidth={1.75} />
          <div>
            <h2 className="text-[var(--text-primary)] font-bold text-base tracking-tight">Message de bienvenue</h2>
            <p className="text-[var(--text-muted)] text-xs">Affiché au 1er login de chaque nouveau client</p>
          </div>
        </div>
        <textarea
          value={messageBienvenue}
          onChange={(e) => setMessageBienvenue(e.target.value)}
          placeholder="Ex : Bienvenue dans ton espace coaching ! Je suis ravi de t'accompagner..."
          rows={4}
          className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg px-4 py-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors resize-none"
        />
      </section>

      {/* ── Section Modules ── */}
      <section className="hero-card p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2.5 mb-1">
          <Shield size={14} className="text-[var(--text-muted)]" strokeWidth={1.75} />
          <div>
            <h2 className="text-[var(--text-primary)] font-bold text-base tracking-tight">Modules activés</h2>
            <p className="text-[var(--text-muted)] text-xs">Active ou désactive les modules visibles par tes clients</p>
          </div>
        </div>

        <div className="space-y-3">
          {MODULES_CONFIG.map(({ key, label, desc }) => (
            <div
              key={key}
              className="flex items-center justify-between py-3 px-4 rounded-xl bg-[var(--bg-surface)]/50"
            >
              <div>
                <p className="text-[var(--text-primary)] text-sm font-medium">{label}</p>
                <p className="text-[var(--text-muted)] text-xs">{desc}</p>
              </div>
              <button
                onClick={() => toggleModule(key)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  modules[key] ? 'bg-[#FF6B2B]' : 'bg-white/10'
                }`}
                role="switch"
                aria-checked={modules[key]}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    modules[key] ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section Paiements en ligne (Stripe Connect) ── */}
      <section className="hero-card p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2.5 mb-1">
          <CreditCard size={14} className="text-[var(--text-muted)]" strokeWidth={1.75} />
          <div>
            <h2 className="text-[var(--text-primary)] font-bold text-base tracking-tight">Paiements en ligne</h2>
            <p className="text-[var(--text-muted)] text-xs">Connectez votre compte Stripe pour recevoir les paiements</p>
          </div>
        </div>

        {stripeOnboardingComplete ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#FF6B2B]/10 border border-[#FF6B2B]/20">
            <CheckCircle size={20} className="text-[#FF6B2B] flex-shrink-0" />
            <div>
              <p className="text-[#FF6B2B] text-sm font-medium">Paiements activés</p>
              <p className="text-[#FF6B2B]/60 text-xs">Votre compte Stripe est connecté. Vos clients peuvent payer en ligne.</p>
            </div>
          </div>
        ) : (
          <button
            onClick={handleConnectStripe}
            disabled={connectLoading}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#635BFF] text-white text-sm font-semibold hover:bg-[#5851e6] transition-colors disabled:opacity-50"
          >
            {connectLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Link2 size={16} />
            )}
            {connectLoading ? 'Redirection...' : 'Connecter mon compte Stripe'}
          </button>
        )}
      </section>

      {/* ── Section Abonnement ── */}
      <section className="hero-card p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2.5 mb-1">
          <CreditCard size={14} className="text-[var(--text-muted)]" strokeWidth={1.75} />
          <h2 className="text-[var(--text-primary)] font-bold text-base tracking-tight">Abonnement</h2>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-surface)]/50">
          <div>
            <p className="text-[var(--text-primary)] text-sm font-medium capitalize">
              {plan === 'none' ? 'Aucun abonnement' : `Plan ${plan}`}
            </p>
            <p className="text-[var(--text-muted)] text-xs">
              {plan === 'none' && 'Période d\'essai en cours · Toutes les fonctionnalités'}
              {plan === 'starter' && '29€/mois · 5 clients'}
              {plan === 'pro' && '49€/mois · 50 clients'}
              {plan === 'unlimited' && '79€/mois · Illimité'}
            </p>
          </div>
          <button
            onClick={handleOpenPortal}
            disabled={portalLoading || !stripeCustomerId}
            className="inline-flex items-center gap-1.5 text-sm text-[#FF6B2B] hover:text-[#FF9A6C] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {portalLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ExternalLink size={14} />
            )}
            Gérer l'abonnement
          </button>
        </div>
      </section>

      {/* ── Bouton Sauvegarder ── */}
      <div className="flex justify-end pb-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF6B2B] text-sm font-semibold text-white transition-all hover:bg-[#e55e24] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : saved ? (
            <Check size={16} />
          ) : (
            <Save size={16} />
          )}
          {saving ? 'Enregistrement...' : saved ? 'Enregistré ✓' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}
