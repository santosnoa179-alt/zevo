import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Sparkles, Zap, Crown, ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Zap,
    price: { monthly: 29, yearly: 24 },
    yearlyTotal: 288,
    desc: 'Lance ton activité de coaching digital',
    cta: 'Choisir Starter',
    features: [
      '5 clients actifs',
      'Dashboard coach complet',
      'Messagerie intégrée',
      'Programmes & séances',
      'Formulaires & bilans',
      'Bibliothèque de ressources',
      'CRM prospects',
      'Support email 24h',
    ],
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Sparkles,
    price: { monthly: 49, yearly: 39 },
    yearlyTotal: 468,
    desc: 'Automatise et développe ton activité',
    cta: 'Choisir Pro',
    features: [
      '50 clients actifs',
      'Tout le Starter +',
      'App Builder (ton branding)',
      'Rapports PDF automatiques',
      'Statistiques avancées',
      'Plans nutritionnels complets',
      'Support prioritaire',
    ],
    popular: true,
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    icon: Crown,
    price: { monthly: 79, yearly: 65 },
    yearlyTotal: 780,
    desc: 'Coaching sans aucune limite',
    cta: 'Choisir Unlimited',
    features: [
      'Clients illimités',
      'Tout le Pro +',
      'Automatisation avancée',
      'API & webhooks',
      'Support dédié sous 2h',
    ],
    popular: false,
  },
]

export default function CoachPricingPage() {
  const [billing, setBilling] = useState('monthly') // 'monthly' | 'yearly'
  const [loadingPlan, setLoadingPlan] = useState(null) // id du plan en cours de checkout
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const handleChoose = async (planId) => {
    if (!user) {
      toast.error('Tu dois être connecté pour souscrire un plan.')
      return
    }

    setLoadingPlan(planId)
    try {
      // Récupère le token pour autoriser la fonction serverless
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) {
        throw new Error('Session invalide, reconnecte-toi.')
      }

      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          plan: planId,
          billing,
          email: user.email,
          userId: user.id,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Erreur création session Stripe')
      }

      // Redirige vers Stripe Checkout
      window.location.href = json.url
    } catch (err) {
      console.error('Erreur checkout:', err)
      toast.error(err.message || 'Impossible de démarrer le paiement. Réessaie dans un instant.')
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen p-5 md:p-10">
      {/* Bouton retour */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-8"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 text-xs text-[#FF6B2B] font-medium mb-5">
          <Sparkles size={13} />
          Tarifs transparents — sans engagement
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-4 text-[var(--text-primary)]">
          Choisis ton plan
        </h1>
        <p className="text-[var(--text-muted)] text-base md:text-lg">
          Moins cher qu'un café par jour. Rentabilisé dès le premier client.
        </p>
      </div>

      {/* Toggle Mensuel / Annuel */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border)]">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              billing === 'monthly'
                ? 'bg-[#FF6B2B] text-white shadow-lg shadow-[#FF6B2B]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
              billing === 'yearly'
                ? 'bg-[#FF6B2B] text-white shadow-lg shadow-[#FF6B2B]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Annuel
            {billing !== 'yearly' && (
              <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                -20%
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Grille plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto items-stretch">
        {PLANS.map((plan) => {
          const Icon = plan.icon
          const price = plan.price[billing]
          const savings = billing === 'yearly' ? (plan.price.monthly - plan.price.yearly) * 12 : 0
          const isLoading = loadingPlan === plan.id

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-7 flex flex-col h-full transition-all duration-300 ${
                plan.popular
                  ? 'border-2 border-[#FF6B2B]/30 bg-gradient-to-b from-[#FF6B2B]/[0.03] to-transparent shadow-[0_0_80px_rgba(255,107,43,0.08)]'
                  : 'border border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-[2]">
                  <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white text-[9px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-[#FF6B2B]/25">
                    Le plus populaire
                  </span>
                </div>
              )}

              <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    plan.popular ? 'bg-[#FF6B2B]/15 text-[#FF6B2B]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                  }`}>
                    <Icon size={18} />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">{plan.name}</h3>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mb-5 min-h-[32px]">{plan.desc}</p>

                {/* Prix */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-[var(--text-primary)]">{price}</span>
                  <span className="text-[var(--text-muted)] text-sm">€/mois</span>
                </div>
                <p className="text-[10px] mb-7 min-h-[14px]">
                  {billing === 'yearly' ? (
                    <span className="text-emerald-400 font-medium">
                      Économise {savings}€/an (facturé {plan.yearlyTotal}€)
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">facturé mensuellement</span>
                  )}
                </p>

                {/* Features */}
                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check size={14} className="text-[#FF6B2B] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-[var(--text-primary)]/80">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleChoose(plan.id)}
                  disabled={isLoading || loadingPlan !== null}
                  className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden flex items-center justify-center gap-2 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white hover:shadow-lg hover:shadow-[#FF6B2B]/25'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-gradient-to-r hover:from-[#FF6B2B] hover:to-[#FF8F5E] hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-[#FF6B2B]/25'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Redirection…
                    </>
                  ) : (
                    plan.cta
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Trust signals */}
      <p className="text-center text-[11px] text-[var(--text-muted)] mt-10">
        Paiement sécurisé par Stripe • Sans engagement • Annulation en 1 clic • Facture automatique
      </p>
    </div>
  )
}
