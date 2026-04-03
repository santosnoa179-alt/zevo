import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Euro, TrendingUp, CreditCard, CheckCircle, XCircle,
  Clock, RefreshCw, ArrowUpRight, ArrowDownRight, Search
} from 'lucide-react'

const PLAN_PRICES = { starter: 29, pro: 49, unlimited: 79 }

const STATUT_CONFIG = {
  paye: { label: 'Paye', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', accent: '#10B981' },
  en_attente: { label: 'En attente', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10', accent: '#F59E0B' },
  echoue: { label: 'Echoue', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', accent: '#EF4444' },
  rembourse: { label: 'Rembourse', icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/10', accent: '#3B82F6' },
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

  const moisCourant = new Date().toISOString().slice(0, 7)
  const paiementsMois = paiements.filter(p => p.statut === 'paye' && p.date_paiement?.startsWith(moisCourant))
  const revenusConnect = paiementsMois.reduce((s, p) => s + (p.montant || 0), 0) / 100

  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  const moisPrec = d.toISOString().slice(0, 7)
  const paiementsMoisPrec = paiements.filter(p => p.statut === 'paye' && p.date_paiement?.startsWith(moisPrec))
  const revenusConnectPrec = paiementsMoisPrec.reduce((s, p) => s + (p.montant || 0), 0) / 100

  const connectTrend = revenusConnectPrec > 0
    ? Math.round(((revenusConnect - revenusConnectPrec) / revenusConnectPrec) * 100)
    : revenusConnect > 0 ? 100 : 0

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
      value: `${mrr.toLocaleString('fr-FR')} \u20AC`,
      sub: `${coachsActifs.length} coachs actifs`,
      icon: Euro,
      color: '#FF6B2B',
      trend: null,
    },
    {
      label: 'Revenus Connect',
      value: `${revenusConnect.toLocaleString('fr-FR')} \u20AC`,
      sub: 'Ce mois',
      icon: connectTrend >= 0 ? ArrowUpRight : ArrowDownRight,
      color: connectTrend >= 0 ? '#10B981' : '#EF4444',
      trend: connectTrend !== 0
        ? `${connectTrend > 0 ? '+' : ''}${connectTrend}%`
        : null,
      trendUp: connectTrend >= 0,
    },
    {
      label: 'En attente',
      value: enAttente,
      sub: `${echoues} echoues`,
      icon: Clock,
      color: '#F59E0B',
      trend: null,
    },
    {
      label: 'Transactions',
      value: paiements.length,
      sub: `${paiementsMois.length} ce mois`,
      icon: CreditCard,
      color: '#3B82F6',
      trend: null,
    },
  ]

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="animate-page-enter p-4 md:p-6 w-full max-w-[1400px] mx-auto">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 mb-6">
          <div className="skel-block w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-2">
            <div className="skel-block h-6 w-52" />
            <div className="skel-block h-3.5 w-72" />
          </div>
        </div>

        {/* KPI skeletons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-4 md:p-5">
              <div className="skel-block h-2 w-full rounded-full mb-5" />
              <div className="flex items-center justify-between mb-3">
                <div className="skel-block h-3 w-20" />
                <div className="skel-block w-9 h-9 rounded-xl" />
              </div>
              <div className="skel-block h-7 w-24 mb-2" />
              <div className="skel-block h-3 w-16" />
            </div>
          ))}
        </div>

        {/* Coach section skeleton */}
        <div className="glass-card mb-6">
          <div className="skel-block h-2 w-full rounded-none rounded-t-2xl" />
          <div className="p-4 md:p-5 space-y-3">
            <div className="skel-block h-4 w-40 mb-4" />
            {[1, 2, 3].map(i => (
              <div key={i} className="skel-block h-14 w-full" />
            ))}
          </div>
        </div>

        {/* Payments skeleton */}
        <div className="glass-card">
          <div className="skel-block h-2 w-full rounded-none rounded-t-2xl" />
          <div className="p-4 md:p-5 space-y-3">
            <div className="skel-block h-4 w-56 mb-4" />
            <div className="skel-block h-10 w-full mb-3" />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skel-block h-14 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-page-enter p-4 md:p-6 w-full max-w-[1400px] mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,107,43,0.12)' }}
        >
          <CreditCard size={20} color="#FF6B2B" />
        </div>
        <div>
          <h1 className="text-[var(--text-primary)] text-xl md:text-2xl font-bold leading-tight">
            Abonnements & Paiements
          </h1>
          <p className="text-[var(--text-muted)] text-xs md:text-sm mt-0.5">
            Suivi des revenus Stripe et des paiements clients
          </p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {kpis.map(({ label, value, sub, icon: Icon, color, trend, trendUp }) => (
          <div key={label} className="glass-card p-4 md:p-5">
            {/* Gradient accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
              style={{ background: `linear-gradient(90deg, ${color}, ${color}66)` }}
            />

            <div className="flex items-center justify-between mb-3 mt-1">
              <p className="text-[var(--text-muted)] text-[10px] md:text-xs uppercase tracking-wider font-semibold leading-tight">
                {label}
              </p>
              <div
                className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}15` }}
              >
                <Icon size={16} style={{ color }} />
              </div>
            </div>

            <p className="text-[var(--text-primary)] text-xl md:text-2xl font-bold leading-none">
              {value}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <p className="text-[var(--text-muted)] text-[10px] md:text-xs">{sub}</p>
              {trend && (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: trendUp ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                    color: trendUp ? '#10B981' : '#EF4444',
                  }}
                >
                  {trendUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Abonnements coachs ── */}
      <div className="glass-card mb-6">
        {/* Accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
          style={{ background: 'linear-gradient(90deg, #FF6B2B, #FF6B2B66)' }}
        />

        <div className="px-4 md:px-5 py-4 border-b border-[var(--border-base)] flex items-center justify-between">
          <p className="text-[var(--text-secondary)] text-xs uppercase tracking-wider font-semibold">
            Abonnements coachs
          </p>
          <span className="text-[var(--text-muted)] text-xs">
            {coachsActifs.length} actifs / {coaches.length} total
          </span>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          {coaches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <CreditCard size={32} className="text-[var(--text-muted)] animate-breathe mb-3" />
              <p className="text-[var(--text-muted)] text-sm text-center">
                Aucun coach enregistre
              </p>
            </div>
          ) : (
            coaches
              .sort((a, b) => (PLAN_PRICES[b.plan] || 0) - (PLAN_PRICES[a.plan] || 0))
              .slice(0, 10)
              .map(c => (
                <div
                  key={c.id}
                  className="px-4 md:px-5 py-3 flex items-center justify-between hover:bg-[var(--bg-surface)] transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-[var(--text-primary)] text-sm font-medium truncate">
                      {c.profiles?.nom || c.profiles?.email || '\u2014'}
                    </p>
                    <p className="text-[var(--text-muted)] text-xs truncate hidden md:block">
                      {c.profiles?.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 md:gap-4 shrink-0">
                    {/* Plan badge */}
                    <span
                      className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                        c.plan === 'unlimited'
                          ? 'bg-green-500/10 text-green-400'
                          : c.plan === 'pro'
                            ? 'bg-[#FF6B2B]/10 text-[#FF6B2B]'
                            : 'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      {c.plan}
                    </span>

                    {/* Price */}
                    <span className="text-[var(--text-primary)] text-sm font-bold w-12 md:w-16 text-right">
                      {PLAN_PRICES[c.plan] || 0} \u20AC
                    </span>

                    {/* Status dot */}
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        c.abonnement_actif ? 'bg-green-400' : 'bg-red-400'
                      }`}
                    />
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* ── Historique paiements Connect ── */}
      <div className="glass-card">
        {/* Accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
          style={{ background: 'linear-gradient(90deg, #3B82F6, #3B82F666)' }}
        />

        {/* Toolbar */}
        <div className="px-4 md:px-5 py-4 border-b border-[var(--border-base)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <p className="text-[var(--text-secondary)] text-xs uppercase tracking-wider font-semibold">
              Paiements clients (Stripe Connect)
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              {/* Search */}
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full sm:w-44 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg pl-8 pr-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                />
              </div>

              {/* Filter pills - segmented control */}
              <div className="flex bg-[var(--bg-surface)] rounded-lg p-0.5 border border-[var(--border-base)] self-start">
                {['tous', 'paye', 'en_attente', 'echoue'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFiltre(s)}
                    className={`px-2.5 md:px-3 py-1.5 rounded-md text-[10px] md:text-xs font-medium transition-all whitespace-nowrap ${
                      filtre === s
                        ? 'bg-[#FF6B2B] text-white shadow-sm shadow-[#FF6B2B]/20'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {s === 'tous' ? 'Tous' : STATUT_CONFIG[s]?.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {paiementsFiltres.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Search size={32} className="text-[var(--text-muted)] animate-breathe mb-3" />
            <p className="text-[var(--text-muted)] text-sm text-center">
              Aucun paiement
              {filtre !== 'tous' ? ` avec le statut "${STATUT_CONFIG[filtre]?.label}"` : ''}
            </p>
          </div>
        ) : (
          <>
            {/* ── DESKTOP: Grid table ── */}
            <div className="hidden md:block">
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
                  const StatusIcon = cfg.icon
                  return (
                    <div
                      key={p.id}
                      className="grid grid-cols-6 gap-4 px-5 py-3 border-b border-[var(--border-subtle)] items-center hover:bg-[var(--bg-surface)] transition-colors"
                    >
                      <span className="text-[var(--text-primary)] text-sm truncate">
                        {p.clients?.profiles?.nom || p.clients?.profiles?.email || '\u2014'}
                      </span>
                      <span className="text-[var(--text-muted)] text-sm truncate">
                        {p.coaches?.profiles?.nom || '\u2014'}
                      </span>
                      <span className="text-[var(--text-muted)] text-sm truncate">
                        {p.offres_coaching?.titre || '\u2014'}
                      </span>
                      <span className="text-[var(--text-primary)] text-sm font-medium">
                        {(p.montant / 100).toFixed(2)} \u20AC
                      </span>
                      <span className="text-[var(--text-muted)] text-xs">
                        {p.date_paiement
                          ? new Date(p.date_paiement).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                            })
                          : '\u2014'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full w-fit ${cfg.color} ${cfg.bg}`}
                      >
                        <StatusIcon size={12} />
                        {cfg.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── MOBILE: Card layout ── */}
            <div className="md:hidden max-h-[500px] overflow-y-auto">
              <div className="p-3 space-y-2.5">
                {paiementsFiltres.map(p => {
                  const cfg = STATUT_CONFIG[p.statut] || STATUT_CONFIG.en_attente
                  const StatusIcon = cfg.icon
                  return (
                    <div
                      key={p.id}
                      className="relative bg-[var(--bg-surface)] rounded-xl p-3.5 border border-[var(--border-subtle)]"
                      style={{ borderLeftWidth: '3px', borderLeftColor: cfg.accent }}
                    >
                      {/* Top row: client name + amount */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="text-[var(--text-primary)] text-sm font-semibold truncate">
                            {p.clients?.profiles?.nom || p.clients?.profiles?.email || '\u2014'}
                          </p>
                          <p className="text-[var(--text-muted)] text-[11px] truncate mt-0.5">
                            {p.coaches?.profiles?.nom || '\u2014'}
                          </p>
                        </div>
                        <p className="text-[var(--text-primary)] text-lg font-bold whitespace-nowrap">
                          {(p.montant / 100).toFixed(2)} \u20AC
                        </p>
                      </div>

                      {/* Middle: offer */}
                      <p className="text-[var(--text-secondary)] text-xs truncate mb-2.5">
                        {p.offres_coaching?.titre || '\u2014'}
                      </p>

                      {/* Bottom row: date + status badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)] text-[11px]">
                          {p.date_paiement
                            ? new Date(p.date_paiement).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit',
                              })
                            : '\u2014'}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.color} ${cfg.bg}`}
                        >
                          <StatusIcon size={10} />
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
