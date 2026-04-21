import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import { CreditCard, Bell, Shield, Globe, ExternalLink, CheckCircle, AlertCircle, Loader2, Link2 } from 'lucide-react'

export default function ParametresPaiementPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stripeAccount, setStripeAccount] = useState(null)
  const [stripeOnboarded, setStripeOnboarded] = useState(false)
  const [connectLoading, setConnectLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    loadSettings()
  }, [user])

  const loadSettings = async () => {
    setLoading(true)
    const { data: coach } = await supabase
      .from('coaches')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', user.id)
      .maybeSingle()

    setStripeAccount(coach?.stripe_account_id || null)
    setStripeOnboarded(coach?.stripe_onboarding_complete || false)
    setLoading(false)
  }

  // Lancer l'onboarding Stripe Connect — appelle /api/connect-onboarding
  // pour créer un compte Connect standard et générer un account link.
  const handleConnectStripe = async () => {
    setConnectLoading(true)
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res = await fetch('/api/connect-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession?.access_token}`,
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
      <div className="p-4 md:p-6 space-y-6 max-w-3xl">
        {[1,2,3].map(i => <div key={i} className="hero-card p-5 h-32 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">

      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Paramètres de paiement</h2>
        <p className="text-xs text-[var(--text-muted)]">Configurez vos préférences de paiement</p>
      </div>

      {/* Stripe Connect */}
      <div className="hero-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#635BFF]/10">
            <CreditCard size={18} className="text-[#635BFF]" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Stripe Connect</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Recevez des paiements directement sur votre compte</p>
          </div>
          {stripeAccount ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle size={11} />
              Connecté
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-400">
              <AlertCircle size={11} />
              Non connecté
            </span>
          )}
        </div>

        {stripeAccount ? (
          <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-[var(--text-primary)]">{stripeAccount}</p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {stripeOnboarded ? 'Compte vérifié · Virements automatiques activés' : 'Onboarding en cours'}
                </p>
              </div>
              <a
                href="https://dashboard.stripe.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#635BFF] bg-[#635BFF]/10 hover:bg-[#635BFF]/15 transition-colors"
              >
                Dashboard Stripe
                <ExternalLink size={11} />
              </a>
            </div>
          </div>
        ) : (
          <button
            onClick={handleConnectStripe}
            disabled={connectLoading}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold text-white bg-[#635BFF] hover:bg-[#635BFF]/90 transition-colors disabled:opacity-50"
          >
            {connectLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Link2 size={16} />
            )}
            {connectLoading ? 'Redirection...' : 'Connecter Stripe'}
          </button>
        )}
      </div>

      {/* Devise */}
      <div className="hero-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FF6B2B]/10">
            <Globe size={18} className="text-[#FF6B2B]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Devise</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Devise utilisée pour vos produits et factures</p>
          </div>
        </div>
        <select className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[#FF6B2B]/40 focus:outline-none transition-all">
          <option value="EUR">Euro (€)</option>
          <option value="USD">Dollar US ($)</option>
          <option value="GBP">Livre Sterling (£)</option>
          <option value="CHF">Franc Suisse (CHF)</option>
        </select>
      </div>

      {/* Notifications */}
      <div className="hero-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#64748b]/10">
            <Bell size={18} className="text-[#64748b]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Notifications</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Choisissez quand être notifié</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Nouveau paiement reçu', desc: 'Soyez notifié à chaque paiement' },
            { label: 'Nouvel abonnement', desc: 'Quand un client souscrit à une offre' },
            { label: 'Remboursement', desc: 'En cas de remboursement ou litige' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)]">
              <div>
                <p className="text-[13px] font-medium text-[var(--text-primary)]">{item.label}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{item.desc}</p>
              </div>
              <div className="w-10 h-6 rounded-full bg-[#FF6B2B] relative cursor-pointer">
                <div className="absolute top-1 left-5 w-4 h-4 rounded-full bg-white transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Politique remboursement */}
      <div className="hero-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={16} className="text-[var(--text-muted)]" strokeWidth={1.75} />
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Politique de remboursement</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Conditions affichées à vos clients</p>
          </div>
        </div>
        <textarea
          rows={3}
          defaultValue="Remboursement possible dans les 14 jours suivant l'achat, sous réserve que le programme n'ait pas été commencé."
          className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FF6B2B]/40 focus:outline-none transition-all resize-none"
        />
        <button className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF6B2BD0)' }}>
          Sauvegarder
        </button>
      </div>
    </div>
  )
}
