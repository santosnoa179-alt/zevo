import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Zap, Star, Crown, ArrowLeft, Loader2 } from 'lucide-react'
import { ZevoLogo } from '../../components/ui/ZevoLogo'
import { useAuth } from '../../hooks/useAuth'
import { getStripe } from '../../lib/stripe'
import { useToast } from '../../components/ui/Toast'

// Définition des 3 plans avec prix mensuel et annuel
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: { monthly: 29, yearly: 24 },
    icon: Zap,
    description: '5 clients, idéal pour démarrer',
    features: [
      'Jusqu\'à 5 clients',
      'Dashboard coach complet',
      'Messagerie temps réel',
      'Score bien-être & alertes',
      'Formulaires personnalisés',
      'Programmes multi-semaines',
      'Drive / Bibliothèque',
      'CRM intégrée',
      'Support par email',
    ],
    cta: 'Commencer',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 49, yearly: 39 },
    icon: Star,
    popular: true,
    description: '50 clients, App Builder, rapports auto',
    features: [
      'Jusqu\'à 50 clients',
      'Tout le plan Starter',
      'App Builder (branding)',
      'Rapports PDF automatiques',
      'Statistiques avancées',
      'Support prioritaire',
    ],
    cta: 'Commencer',
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: { monthly: 79, yearly: 65 },
    icon: Crown,
    description: 'Clients illimités, tout inclus',
    features: [
      'Clients illimités',
      'Tout le plan Pro',
      'Automatisation avancée',
      'Support dédié',
    ],
    cta: 'Commencer',
  },
]

export default function PricingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [billingYearly, setBillingYearly] = useState(false)

  // Crée une session Stripe Checkout et redirige vers la page de paiement
  const handleSelectPlan = async (planId) => {
    if (!user) {
      navigate('/register')
      return
    }

    setLoadingPlan(planId)

    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planId,
          billing: billingYearly ? 'yearly' : 'monthly',
          email: user.email,
          userId: user.id,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')

      if (data.url) {
        window.location.href = data.url
      } else if (data.sessionId) {
        const stripe = await getStripe()
        const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId })
        if (error) throw error
      }
    } catch (err) {
      console.error('Erreur Stripe Checkout:', err)
      toast.error('Erreur lors de la redirection vers le paiement.')
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <ZevoLogo size="md" />
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <ArrowLeft size={16} />
          Connexion
        </button>
      </header>

      {/* Hero */}
      <div className="text-center px-6 pt-12 pb-8 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Tout ce qu'il faut pour{' '}
          <span className="text-[#FF6B2B]">scaler ton coaching</span>
        </h1>
        <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto mb-8">
          Un abonnement adapté à ton activité. Sans engagement, annulable à tout moment.
        </p>

        {/* Toggle mensuel / annuel */}
        <div className="inline-flex items-center bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl p-1">
          <button
            onClick={() => setBillingYearly(false)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              !billingYearly
                ? 'bg-[#FF6B2B] text-white shadow-lg shadow-[#FF6B2B]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBillingYearly(true)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              billingYearly
                ? 'bg-[#FF6B2B] text-white shadow-lg shadow-[#FF6B2B]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            Annuel
            {!billingYearly && (
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                -20%
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Cards pricing */}
      <div className="max-w-6xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon
          const isLoading = loadingPlan === plan.id
          const price = billingYearly ? plan.price.yearly : plan.price.monthly
          const savings = (plan.price.monthly - plan.price.yearly) * 12

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 flex flex-col transition-all ${
                plan.popular
                  ? 'bg-[var(--bg-card)] border-2 border-[#FF6B2B] shadow-[0_0_40px_rgba(255,107,43,0.15)]'
                  : 'bg-[var(--bg-card)] border border-[var(--border-base)]'
              }`}
            >
              {/* Badge populaire */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#FF6B2B] text-white text-xs font-bold px-4 py-1 rounded-full">
                    Le plus populaire
                  </span>
                </div>
              )}

              {/* En-tête */}
              <div className="mb-6">
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      plan.popular ? 'bg-[#FF6B2B]/20' : 'bg-[var(--bg-surface)]'
                    }`}
                  >
                    <Icon
                      size={20}
                      className={plan.popular ? 'text-[#FF6B2B]' : 'text-[var(--text-secondary)]'}
                    />
                  </div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                </div>
                <p className="text-[var(--text-muted)] text-sm">{plan.description}</p>
              </div>

              {/* Prix */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{price}€</span>
                  <span className="text-[var(--text-muted)] text-sm">/mois</span>
                </div>
                {billingYearly && (
                  <p className="text-xs text-emerald-400/80 font-medium mt-1">
                    Facturé {price * 12}€/an · Économise {savings}€/an
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check size={16} className="text-[#FF6B2B] shrink-0 mt-0.5" />
                    <span className="text-sm text-[var(--text-secondary)]">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isLoading || loadingPlan !== null}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  plan.popular
                    ? 'bg-[#FF6B2B] text-white hover:bg-[#FF6B2B]/90'
                    : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-[var(--border-base)]'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Redirection...
                  </>
                ) : (
                  plan.cta
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="text-center pb-12 text-[var(--text-muted)] text-xs">
        Paiement sécurisé via Stripe · Annulation possible à tout moment
      </div>
    </div>
  )
}
