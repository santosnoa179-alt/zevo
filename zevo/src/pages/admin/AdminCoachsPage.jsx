import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Search, UserCheck, UserX, Users, ArrowUpDown,
  CheckCircle, XCircle, Filter, RefreshCw
} from 'lucide-react'

const PLAN_PRICES = { starter: 29, pro: 49, unlimited: 79 }

const PLAN_COLORS = {
  starter:   { border: 'border-blue-500/30',   text: 'text-blue-400',   bg: 'bg-blue-500/10',   accent: '#3B82F6' },
  pro:       { border: 'border-[#FF6B2B]/30',  text: 'text-[#FF6B2B]',  bg: 'bg-[#FF6B2B]/10',  accent: '#FF6B2B' },
  unlimited: { border: 'border-green-500/30',   text: 'text-green-400',  bg: 'bg-green-500/10',  accent: '#22C55E' },
}

export default function AdminCoachsPage() {
  const [loading, setLoading] = useState(true)
  const [coaches, setCoaches] = useState([])
  const [clientCounts, setClientCounts] = useState({})
  const [search, setSearch] = useState('')
  const [filtrePlan, setFiltrePlan] = useState('tous')
  const [filtreActif, setFiltreActif] = useState('tous')
  const [sortBy, setSortBy] = useState('date') // date | clients | plan
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    chargerCoachs()
  }, [])

  const chargerCoachs = async () => {
    setLoading(true)

    const { data: coachsData } = await supabase
      .from('coaches')
      .select('id, plan, abonnement_actif, stripe_customer_id, created_at, profiles(nom, email)')
      .order('created_at', { ascending: false })

    const allCoaches = coachsData || []
    setCoaches(allCoaches)

    // Compter les clients par coach
    const { data: clientsData } = await supabase
      .from('clients')
      .select('coach_id')

    const counts = {}
    ;(clientsData || []).forEach(c => {
      counts[c.coach_id] = (counts[c.coach_id] || 0) + 1
    })
    setClientCounts(counts)

    setLoading(false)
  }

  // -- Actions admin --
  const toggleAbonnement = async (coachId, actif) => {
    setActionLoading(coachId)
    await supabase
      .from('coaches')
      .update({ abonnement_actif: !actif })
      .eq('id', coachId)
    setCoaches(prev =>
      prev.map(c => c.id === coachId ? { ...c, abonnement_actif: !actif } : c)
    )
    setActionLoading(null)
  }

  const changerPlan = async (coachId, nouveauPlan) => {
    setActionLoading(coachId)
    await supabase
      .from('coaches')
      .update({ plan: nouveauPlan })
      .eq('id', coachId)
    setCoaches(prev =>
      prev.map(c => c.id === coachId ? { ...c, plan: nouveauPlan } : c)
    )
    setActionLoading(null)
  }

  // -- Filtrage & tri --
  let coachsFiltres = coaches

  if (search.trim()) {
    const q = search.toLowerCase()
    coachsFiltres = coachsFiltres.filter(c =>
      c.profiles?.nom?.toLowerCase().includes(q) ||
      c.profiles?.email?.toLowerCase().includes(q)
    )
  }

  if (filtrePlan !== 'tous') {
    coachsFiltres = coachsFiltres.filter(c => c.plan === filtrePlan)
  }

  if (filtreActif !== 'tous') {
    coachsFiltres = coachsFiltres.filter(c =>
      filtreActif === 'actif' ? c.abonnement_actif : !c.abonnement_actif
    )
  }

  coachsFiltres = [...coachsFiltres].sort((a, b) => {
    if (sortBy === 'clients') return (clientCounts[b.id] || 0) - (clientCounts[a.id] || 0)
    if (sortBy === 'plan') {
      const order = { unlimited: 3, pro: 2, starter: 1 }
      return (order[b.plan] || 0) - (order[a.plan] || 0)
    }
    return new Date(b.created_at) - new Date(a.created_at)
  })

  // -- Loading skeleton --
  if (loading) {
    return (
      <div className="animate-page-enter p-4 md:p-6 w-full max-w-6xl mx-auto">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 mb-6">
          <div className="skel-block w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <div className="skel-block h-6 w-32 rounded-lg" />
            <div className="skel-block h-3 w-48 rounded-lg" />
          </div>
        </div>
        {/* Toolbar skeleton */}
        <div className="glass-card p-4 mb-6">
          <div className="skel-block h-10 w-full rounded-xl mb-3" />
          <div className="flex gap-3">
            <div className="skel-block h-9 w-28 rounded-lg" />
            <div className="skel-block h-9 w-28 rounded-lg" />
          </div>
        </div>
        {/* Rows skeleton */}
        <div className="glass-card p-1 space-y-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skel-block h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const actifsCount = coaches.filter(c => c.abonnement_actif).length

  return (
    <div className="animate-page-enter p-4 md:p-6 w-full max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
            <Users size={20} className="text-[#FF6B2B]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[var(--text-primary)] text-xl md:text-2xl font-bold">Coachs</h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B]">
                {coaches.length}
              </span>
            </div>
            <p className="text-[var(--text-muted)] text-xs mt-0.5">
              {actifsCount} actif{actifsCount > 1 ? 's' : ''} sur {coaches.length}
            </p>
          </div>
        </div>

        <button
          onClick={chargerCoachs}
          className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)] flex items-center justify-center text-[var(--text-muted)] hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30 transition-colors"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* ── Toolbar : Search + Filters ── */}
      <div className="glass-card p-4 mb-6 relative overflow-hidden">
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF6B2B] to-[#FF6B2B]/0" />

        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un coach..."
            className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FF6B2B]/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[var(--text-muted)] mr-1">
            <Filter size={13} />
            <span className="text-xs font-medium hidden sm:inline">Filtres</span>
          </div>

          <select
            value={filtrePlan}
            onChange={(e) => setFiltrePlan(e.target.value)}
            className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
          >
            <option value="tous">Tous les plans</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="unlimited">Unlimited</option>
          </select>

          <select
            value={filtreActif}
            onChange={(e) => setFiltreActif(e.target.value)}
            className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
          >
            <option value="tous">Tous statuts</option>
            <option value="actif">Actifs</option>
            <option value="inactif">Inactifs</option>
          </select>

          {/* Sort pills */}
          <div className="flex items-center gap-1 ml-auto bg-[var(--bg-base)] rounded-lg p-0.5 border border-[var(--border-base)]">
            <ArrowUpDown size={12} className="text-[var(--text-muted)] ml-1.5" />
            {[
              { key: 'date', label: 'Date' },
              { key: 'clients', label: 'Clients' },
              { key: 'plan', label: 'Plan' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setSortBy(s.key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  sortBy === s.key
                    ? 'bg-[#FF6B2B]/15 text-[#FF6B2B]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Empty state ── */}
      {coachsFiltres.length === 0 && (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mb-4 animate-breathe">
            <Users size={24} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">Aucun coach trouve</p>
          <p className="text-[var(--text-muted)] text-xs">Essayez de modifier vos filtres ou votre recherche.</p>
        </div>
      )}

      {/* ── Desktop table (hidden on mobile) ── */}
      {coachsFiltres.length > 0 && (
        <div className="hidden md:block glass-card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_0.8fr_0.8fr_1fr] gap-4 px-5 py-3 border-b border-[var(--border-base)] text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-wider">
            <span>Coach</span>
            <span>Plan</span>
            <span>Clients</span>
            <span>Statut</span>
            <span className="text-right">Actions</span>
          </div>

          {/* Table rows */}
          {coachsFiltres.map(c => {
            const plan = c.plan || 'starter'
            const colors = PLAN_COLORS[plan] || PLAN_COLORS.starter
            const initiale = (c.profiles?.nom || c.profiles?.email || '?')[0].toUpperCase()

            return (
              <div
                key={c.id}
                className="grid grid-cols-[2fr_1fr_0.8fr_0.8fr_1fr] gap-4 px-5 py-3.5 border-b border-[var(--border-subtle)] items-center hover:bg-[var(--bg-surface)]/50 transition-colors group"
              >
                {/* Coach info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ background: `${colors.accent}15`, color: colors.accent }}
                  >
                    {initiale}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[var(--text-primary)] text-sm font-medium truncate">
                      {c.profiles?.nom || '--'}
                    </p>
                    <p className="text-[var(--text-muted)] text-xs truncate">{c.profiles?.email}</p>
                    <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
                      Inscrit le {new Date(c.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                {/* Plan select */}
                <div>
                  <select
                    value={plan}
                    onChange={(e) => changerPlan(c.id, e.target.value)}
                    disabled={actionLoading === c.id}
                    className={`bg-transparent border rounded-lg px-2 py-1 text-xs font-semibold cursor-pointer focus:outline-none disabled:opacity-40 transition-colors ${colors.border} ${colors.text}`}
                  >
                    <option value="starter">Starter - {PLAN_PRICES.starter}$</option>
                    <option value="pro">Pro - {PLAN_PRICES.pro}$</option>
                    <option value="unlimited">Unlimited - {PLAN_PRICES.unlimited}$</option>
                  </select>
                </div>

                {/* Client count */}
                <div className="flex items-center gap-1.5">
                  <Users size={13} className="text-[var(--text-muted)]" />
                  <span className="text-[var(--text-primary)] text-sm font-semibold">{clientCounts[c.id] || 0}</span>
                </div>

                {/* Status badge */}
                <div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                    c.abonnement_actif
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    {c.abonnement_actif ? <CheckCircle size={11} /> : <XCircle size={11} />}
                    {c.abonnement_actif ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                {/* Action button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => toggleAbonnement(c.id, c.abonnement_actif)}
                    disabled={actionLoading === c.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${
                      c.abonnement_actif
                        ? 'text-red-400 hover:bg-red-500/10'
                        : 'text-green-400 hover:bg-green-500/10'
                    }`}
                  >
                    {actionLoading === c.id ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : c.abonnement_actif ? (
                      <UserX size={13} />
                    ) : (
                      <UserCheck size={13} />
                    )}
                    {c.abonnement_actif ? 'Suspendre' : 'Activer'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Mobile cards (visible only on mobile) ── */}
      {coachsFiltres.length > 0 && (
        <div className="md:hidden space-y-3">
          {coachsFiltres.map(c => {
            const plan = c.plan || 'starter'
            const colors = PLAN_COLORS[plan] || PLAN_COLORS.starter
            const initiale = (c.profiles?.nom || c.profiles?.email || '?')[0].toUpperCase()

            return (
              <div
                key={c.id}
                className="glass-card p-4 relative overflow-hidden"
                style={{ borderLeftWidth: '3px', borderLeftColor: colors.accent }}
              >
                {/* Top: avatar + name + status */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      style={{ background: `${colors.accent}15`, color: colors.accent }}
                    >
                      {initiale}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[var(--text-primary)] text-sm font-semibold truncate">
                        {c.profiles?.nom || '--'}
                      </p>
                      <p className="text-[var(--text-muted)] text-xs truncate">{c.profiles?.email}</p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    c.abonnement_actif
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    {c.abonnement_actif ? <CheckCircle size={10} /> : <XCircle size={10} />}
                    {c.abonnement_actif ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                {/* Middle: plan + clients + date */}
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <select
                    value={plan}
                    onChange={(e) => changerPlan(c.id, e.target.value)}
                    disabled={actionLoading === c.id}
                    className={`bg-transparent border rounded-lg px-2 py-1 text-[11px] font-semibold cursor-pointer focus:outline-none disabled:opacity-40 ${colors.border} ${colors.text}`}
                  >
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="unlimited">Unlimited</option>
                  </select>

                  <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                    <Users size={12} className="text-[var(--text-muted)]" />
                    <span className="text-xs font-semibold">{clientCounts[c.id] || 0}</span>
                    <span className="text-[var(--text-muted)] text-[10px]">client{(clientCounts[c.id] || 0) > 1 ? 's' : ''}</span>
                  </div>

                  <span className="text-[var(--text-muted)] text-[10px] ml-auto">
                    {new Date(c.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>

                {/* Action button */}
                <button
                  onClick={() => toggleAbonnement(c.id, c.abonnement_actif)}
                  disabled={actionLoading === c.id}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 border ${
                    c.abonnement_actif
                      ? 'text-red-400 border-red-500/20 hover:bg-red-500/10'
                      : 'text-green-400 border-green-500/20 hover:bg-green-500/10'
                  }`}
                >
                  {actionLoading === c.id ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : c.abonnement_actif ? (
                    <UserX size={13} />
                  ) : (
                    <UserCheck size={13} />
                  )}
                  {c.abonnement_actif ? 'Suspendre' : 'Activer'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
