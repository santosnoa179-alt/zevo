import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import { Wallet, ArrowDownToLine, Clock, CheckCircle, Building2, XCircle } from 'lucide-react'

export default function SoldePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [soldeDisponible, setSoldeDisponible] = useState(0)
  const [soldeEnAttente, setSoldeEnAttente] = useState(0)
  const [virements, setVirements] = useState([])
  const [stripeAccountId, setStripeAccountId] = useState(null)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)

    const { data: coach } = await supabase
      .from('coaches')
      .select('solde_disponible, solde_en_attente, stripe_account_id')
      .eq('id', user.id)
      .maybeSingle()

    setSoldeDisponible(coach?.solde_disponible || 0)
    setSoldeEnAttente(coach?.solde_en_attente || 0)
    setStripeAccountId(coach?.stripe_account_id || null)

    const { data: virementsData } = await supabase
      .from('virements_coach')
      .select('*')
      .eq('coach_id', user.id)
      .order('date_virement', { ascending: false })
      .limit(20)

    setVirements(virementsData || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-4xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="glass-card p-5 h-40 animate-pulse"><div className="skel-block h-6 w-24 rounded mb-4" /><div className="skel-block h-8 w-32 rounded" /></div>)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">

      {/* Solde cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card p-5 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[#22C55E]/5" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#22C55E]/10">
              <Wallet size={18} className="text-[#22C55E]" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Solde disponible</p>
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">
            {(soldeDisponible / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-sm text-[var(--text-muted)]">€</span>
          </p>
          <button className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#22C55E] hover:bg-[#22C55E]/90 transition-colors">
            <ArrowDownToLine size={15} />
            Demander un virement
          </button>
        </div>

        <div className="glass-card p-5 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[#F59E0B]/5" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#F59E0B]/10">
              <Clock size={18} className="text-[#F59E0B]" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">En attente</p>
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">
            {(soldeEnAttente / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-sm text-[var(--text-muted)]">€</span>
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-4">Disponible sous 2-3 jours ouvrés</p>
        </div>
      </div>

      {/* Compte Stripe */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Compte Stripe</h3>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)]">
          <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] flex items-center justify-center">
            <Building2 size={16} className="text-[var(--text-muted)]" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-medium text-[var(--text-primary)]">
              {stripeAccountId ? `${stripeAccountId.slice(0, 8)}•••` : 'Non connecté'}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {stripeAccountId ? 'Compte Stripe Connect vérifié' : 'Connectez votre compte Stripe pour recevoir des paiements'}
            </p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${stripeAccountId ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {stripeAccountId ? 'Vérifié' : 'Non connecté'}
          </span>
        </div>
      </div>

      {/* Historique virements */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-base)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Historique des virements</h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Tous les virements vers votre compte</p>
        </div>

        {virements.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Wallet size={20} className="text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-[var(--text-muted)] text-sm">Aucun virement pour le moment</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-base)]/50">
            {virements.map(v => {
              const isEffectue = v.statut === 'effectue'
              const isEchoue = v.statut === 'echoue'
              return (
                <div key={v.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--bg-surface)]/30 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEffectue ? 'bg-emerald-500/10' : isEchoue ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
                    {isEffectue ? <CheckCircle size={15} className="text-emerald-400" /> : isEchoue ? <XCircle size={15} className="text-red-400" /> : <Clock size={15} className="text-yellow-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--text-primary)]">
                      Virement vers •••• {v.banque_dernier4 || '****'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {new Date(v.date_virement).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-[var(--text-primary)]">{(v.montant / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</p>
                    <span className={`text-[10px] font-medium ${isEffectue ? 'text-emerald-400' : isEchoue ? 'text-red-400' : 'text-yellow-400'}`}>
                      {isEffectue ? 'Effectué' : isEchoue ? 'Échoué' : 'En cours'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
