import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Zap, Star, Crown, ArrowLeft, Loader2 } from 'lucide-react'
import { ZevoLogo } from '../../components/ui/ZevoLogo'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'

// Définition des 3 plans — tarification mise à jour
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 39,
    icon: Zap,
    description: '5 clients, branding inclus',
    features: [
      'Jusqu\'à 5 clients',
      'Dashboard coach complet',
      'Messagerie temps réel',
      'Branding (logo, couleurs)',
      'Score bien-être & alertes',
      'Habitudes & objectifs',
      'Support par email',
    ],
    cta: 'Commencer',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 59,
    icon: Star,
    popular: true,
    description: '20 clients, rapports auto, programmes 30j',
    features: [
      'Jusqu\'à 20 clients',
      'Tout le plan Starter',
      'Rapports PDF automatiques',
      'Programmes multi-semaines',
      'Formulaires personnalisés',
      'Bibliothèque de ressources',
      'Statistiques avancées',
      'Support prioritaire',
    ],
    cta: 'Commencer',
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: 79,
    icon: Crown,
    description: 'Illimité, API, domaine perso, App Builder',
    features: [
      'Clients illimités',
      'Tout le plan Pro',
      'App Builder premium',
      'Prévisualisation temps réel',
      'API & webhooks',
      'Domaine personnalisé',
      'Coach IA intégré',
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

  // Met à jour le plan du coach dans la DB et redirige
  const handleSelectPlan = async (planId) => {
    // Si pas connecté, redirige vers login
    if (!user) {
      navigate('/login')
      return
    }

    setLoadingPlan(planId)

    try {
      const { error } = await supabase
        .from('coaches')
        .update({ plan: planId })
        .eq('id', user.id)

      if (error) throw error

      toast.success(`Plan ${planId.charAt(0).toUpperCase() + planId.slice(1)} active !`)
      navigate('/coach/dashboard')
    } catch (err) {
      console.error('Erreur plan:', err)
      toast.error('Erreur lors de la mise a jour du plan.')
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
        <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto">
          Installation unique de 249€ (setup + formation 1h) puis un abonnement mensuel adapté à ton activité.
        </p>
      </div>

      {/* Badge installation */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FF6B2B]/10 border border-[#FF6B2B]/20">
          <Zap size={16} className="text-[#FF6B2B]" />
          <span className="text-sm font-medium text-[#FF6B2B]">
            Installation unique : 249€ — setup complet + formation 1h
          </span>
        </div>
      </div>

      {/* Cards pricing */}
      <div className="max-w-6xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon
          const isLoading = loadingPlan === plan.id

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
                  <span className="text-4xl font-bold">{plan.price}€</span>
                  <span className="text-[var(--text-muted)] text-sm">/mois</span>
                </div>
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
