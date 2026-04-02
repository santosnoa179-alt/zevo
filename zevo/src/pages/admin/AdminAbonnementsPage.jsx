import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Euro, TrendingUp, CreditCard, CheckCircle, XCircle,
  Clock, RefreshCw, ArrowUpRight, ArrowDownRight, Search
} from 'lucide-react'

const PLAN_PRICES = { starter: 29, pro: 49, unlimited: 79 }

const STATUT_CONFIG = {
  paye: { label: 'Payé', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  en_attente: { label: 'En attente', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  echoue: { label: 'Échoué', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  rembourse: { label: 'Remboursé', icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/10' },
}

export default function AdminAbonnementsPage() {
  const [loading, setLoading] = useState(true)
  const [coaches, setCoaches] = useState([])
  const [paiements, setPaiements] = useState([])
  const [filtre, setFiltre] = useState('tous')
  const [search, setSearch] = useState('')

  useEffect(() => {
    chargerDonnees()
  }, [])

  const chargerDonnees = async () => {
    setLoading(true)

    const [coachesRes, paiementsRes] = await Promise.all([
      supabase
        .from('coaches')
        .select('id, plan, abonnement_actif, stripe_customer_id, stripe_subscription_id, created_at, profiles(nom, email)'),
      supabase
        .from('paiements_clients')
        .select('*, clients(profiles(nom, email)), coaches(profiles(nom)), offres_coaching(titre)')
        .order('created_at', { ascending: false })
        .limit(100),
    ])

    setCoaches(coachesRes.data || [])
    setPaiements(paiementsRes.data || [])
    setLoading(false)
  }

  // ── Calculs KPI ──
  const coachsActifs = coaches.filter(c => c.abonnement_actif)
  const mrr = coachsActifs.reduce((total, c) => total + (PLAN_PRICES[c.plan] || 0), 0)

  // Revenus Connect (paiements clients → coachs) ce mois
  const moisCourant = new Date().toISOString().slice(0, 7)
  const paiementsMois = paiements.filter(p => p.statut === 'paye' && p.date_paiement?.startsWith(moisCourant))
  const revenusConnect = paiementsMois.reduce((s, p) => s + (p.montant || 0), 0) / 100

  // Mois précédent pour comparaison
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  const moisPrec = d.toISOString().slice(0, 7)
  const paiementsMoisPrec = paiements.filter(p => p.statut === 'paye' && p.date_paiement?.startsWith(moisPrec))
  const revenusConnectPrec = paiementsMoisPrec.reduce((s, p) => s + (p.montant || 0), 0) / 100

  const connectTrend = revenusConnectPrec > 0
    ? Math.round(((revenusConnect - revenusConnectPrec) / revenusConnectPrec) * 100)
    : revenusConnect > 0 ? 100 : 0

  // Paiements en attente
  const enAttente = paiements.filter(p => p.statut === 'en_attente').length
  const echoues = paiements.filter(p => p.statut === 'echoue').length

  // ── Filtrage paiements ──
  let paiementsFiltres = paiements
  if (filtre !== 'tous') {
    paiementsFiltres = paiementsFiltres.filter(p => p.statut === filtre)
  }
  if (search.trim()) {
    const q = search.toLowerCase()
    paiementsFiltres = paiementsFiltres.filter(p =>
      p.clients?.profiles?.nom?.toLowerCase().includes(q) ||
      p.clients?.profiles?.email?.toLowerCase().includes(q) ||
      p.coaches?.profiles?.nom?.toLowerCase().includes(q) ||
      p.offres_coaching?.titre?.toLowerCase().includes(q)
    )
  }

  const kpis = [
    {
      label: 'MRR Abonnements',
      value: `${mrr.toLocaleString('fr-FR')} €`,
      sub: `${coachsActifs.length} coachs actifs`,
      icon: Euro,
      color: '#FF6B2B',
    },
    {
      label: 'Revenus Connect (ce mois)',
      value: `${revenusConnect.toLocaleString('fr-FR')} €`,
      sub: connectTrend !== 0
        ? `${connectTrend > 0 ? '+' : ''}${connectTrend}% vs mois dernier`
        : 'Pas de comparaison',
      icon: connectTrend >= 0 ? ArrowUpRight : ArrowDownRight,
      color: connectTrend >= 0 ? '#10B981' : '#EF4444',
    },
    {
      label: 'Paiements en attente',
      value: enAttente,
      sub: `${echoues} échoués`,
      icon: Clock,
      color: '#F59E0B',
    },
    {
      label: 'Total transactions',
      value: paiements.length,
      sub: `${paiementsMois.length} ce mois`,
      icon: CreditCard,
      color: '#3B82F6',
    },
  ]

  if (loading) {
    return (
      <div className="p-6 w-full">
        <div className="h-8 w-48 bg-[var(--bg-surface)] rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-[var(--bg-card)] rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 w-full">
      <div className="mb-8">
        <h1 className="text-[var(--text-primary)] text-2xl font-bold">Abonnements & Paiements</h1>
        <p className="text-[var(--text-muted)] text-sm mt-0.5">Suivi des revenus Stripe et des paiements clients</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">{label}</p>
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <p className="text-[var(--text-primary)] text-2xl font-bold">{value}</p>
            <p className="text-[var(--text-muted)] text-xs mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Abonnements coachs actifs ── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl mb-8 overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-base)] flex items-center justify-between">
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">Abonnements coachs</p>
          <span className="text-[var(--text-muted)] text-xs">{coachsActifs.length} actifs / {coaches.length} total</span>
        </div>
        <div className="divide-y divide-[var(--border-subtle)]">
          {coaches
            .sort((a, b) => (PLAN_PRICES[b.plan] || 0) - (PLAN_PRICES[a.plan] || 0))
            .slice(0, 10)
            .map(c => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between hover:bg-[var(--bg-surface)] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-sm font-medium truncate">
                    {c.profiles?.nom || c.profiles?.email || '—'}
                  </p>
                  <p className="text-[var(--text-muted)] text-xs truncate">{c.profiles?.email}</p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                    c.plan === 'unlimited' ? 'bg-green-500/10 text-green-400'
                      : c.plan === 'pro' ? 'bg-[#FF6B2B]/10 text-[#FF6B2B]'
                      : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {c.plan}
                  </span>
                  <span className="text-[var(--text-primary)] text-sm font-bold w-16 text-right">
                    {PLAN_PRICES[c.plan] || 0} €
                  </span>
                  <span className={`w-2 h-2 rounded-full ${c.abonnement_actif ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* ── Historique paiements Connect ── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-base)] flex flex-wrap items-center justify-between gap-3">
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">
            Paiements clients (Stripe Connect)
          </p>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 w-40"
              />
            </div>
            <div className="flex bg-[var(--bg-surface)] rounded-lg p-0.5 border border-[var(--border-base)]">
              {['tous', 'paye', 'en_attente', 'echoue'].map(s => (
                <button
                  key={s}
                  onClick={() => setFiltre(s)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                    filtre === s
                      ? 'bg-[#FF6B2B] text-white font-medium'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {s === 'tous' ? 'Tous' : STATUT_CONFIG[s]?.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {paiementsFiltres.length === 0 ? (
          <div className="p-10 text-center text-[var(--text-muted)] text-sm">
            Aucun paiement{filtre !== 'tous' ? ` avec le statut "${STATUT_CONFIG[filtre]?.label}"` : ''}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-6 gap-4 px-5 py-2.5 border-b border-[var(--border-base)] text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-wider">
              <span>Client</span>
              <span>Coach</span>
              <span>Offre</span>
              <span>Montant</span>
              <span>Date</span>
              <span>Statut</span>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {paiementsFiltres.map(p => {
                const cfg = STATUT_CONFIG[p.statut] || STATUT_CONFIG.en_attente
                const Icon = cfg.icon
                return (
                  <div key={p.id} className="grid grid-cols-6 gap-4 px-5 py-3 border-b border-[var(--border-subtle)] items-center hover:bg-[var(--bg-surface)] transition-colors">
                    <span className="text-[var(--text-primary)] text-sm truncate">
                      {p.clients?.profiles?.nom || p.clients?.profiles?.email || '—'}
                    </span>
                    <span className="text-[var(--text-muted)] text-sm truncate">
                      {p.coaches?.profiles?.nom || '—'}
                    </span>
                    <span className="text-[var(--text-muted)] text-sm truncate">
                      {p.offres_coaching?.titre || '—'}
                    </span>
                    <span className="text-[var(--text-primary)] text-sm font-medium">
                      {(p.montant / 100).toFixed(2)} €
                    </span>
                    <span className="text-[var(--text-muted)] text-xs">
                      {p.date_paiement
                        ? new Date(p.date_paiement).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                        : '—'
                      }
                    </span>
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
                      <Icon size={12} />
                      {cfg.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
