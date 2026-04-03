import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { usePlanLimits } from '../../hooks/usePlanLimits'
import { supabase } from '../../lib/supabase'
import {
  Users, UserPlus, TrendingUp, Euro, Calendar,
  ChevronRight, Flame, Eye, Target,
  BarChart3, Clock, Zap, FileText, Lock,
  CheckCircle, ArrowUpRight, ArrowDownRight,
  Activity, Dumbbell, Phone, ClipboardList, Star, RefreshCw
} from 'lucide-react'

// ── Couleurs avatar ──
const COULEURS_AVATAR = ['#FF6B2B', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6']

function initialesFrom(nom) {
  const parts = (nom ?? '?').trim().split(' ')
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : (nom ?? '?')[0].toUpperCase()
}

const MOIS_COURTS = ['Janv', 'Fev', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sept', 'Oct', 'Nov', 'Dec']

const EVENT_META = {
  seance:  { icon: Dumbbell, color: '#FF6B2B', label: 'Seance' },
  bilan:   { icon: ClipboardList, color: '#a855f7', label: 'Bilan' },
  appel:   { icon: Phone, color: '#3b82f6', label: 'Appel' },
  reunion: { icon: Users, color: '#f59e0b', label: 'Reunion' },
  perso:   { icon: Star, color: '#71717a', label: 'Perso' },
  note:    { icon: FileText, color: '#71717a', label: 'Note' },
  autre:   { icon: Activity, color: '#71717a', label: 'Autre' },
}

const STATUT_COLORS = {
  contact: '#f59e0b',
  appel: '#3b82f6',
  proposition: '#a855f7',
  closing: '#22c55e',
}

// ── Revenue Chart ──
function RevenueChart({ data }) {
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3 animate-breathe">
        <Euro size={22} className="text-amber-400/50" />
      </div>
      <p className="text-[var(--text-muted)] text-xs">Aucun paiement enregistre</p>
    </div>
  )

  const max = Math.max(...data.map(d => d.value), 1)
  const barW = 40
  const gap = 18
  const chartH = 170
  const topPad = 24
  const totalW = data.length * (barW + gap) - gap

  return (
    <div className="flex flex-col items-center w-full">
      <svg width={totalW} height={chartH + 30 + topPad} className="overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <line key={i} x1={0} y1={topPad + chartH * (1 - pct)} x2={totalW} y2={topPad + chartH * (1 - pct)}
            stroke="var(--border-subtle)" strokeWidth={1} strokeDasharray={pct > 0 && pct < 1 ? '4 4' : '0'} />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * chartH
          const x = i * (barW + gap)
          return (
            <g key={i}>
              {/* Bar with gradient for highlight */}
              <defs>
                <linearGradient id={`bar-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={d.highlight ? '#FF6B2B' : 'rgba(255,107,43,0.3)'} />
                  <stop offset="100%" stopColor={d.highlight ? '#FF8F5E' : 'rgba(255,107,43,0.15)'} />
                </linearGradient>
              </defs>
              <rect x={x} y={topPad + chartH - h} width={barW} height={Math.max(h, 2)} rx={6}
                fill={`url(#bar-grad-${i})`} />
              {/* Glow for current month */}
              {d.highlight && h > 10 && (
                <rect x={x - 2} y={topPad + chartH - h - 2} width={barW + 4} height={h + 4} rx={8}
                  fill="none" stroke="#FF6B2B" strokeWidth={1} opacity={0.15} />
              )}
              {d.value > 0 && (
                <text x={x + barW / 2} y={topPad + chartH - h - 8} textAnchor="middle"
                  fill={d.highlight ? '#FF6B2B' : 'var(--text-secondary)'} fontSize={12} fontWeight={700}>
                  {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}K` : `${d.value}€`}
                </text>
              )}
              <text x={x + barW / 2} y={topPad + chartH + 18} textAnchor="middle"
                fill={d.highlight ? 'var(--text-primary)' : 'var(--text-muted)'} fontSize={10}
                fontWeight={d.highlight ? 600 : 400}>
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Section Card wrapper ──
function DashCard({ children, className = '' }) {
  return (
    <div className={`glass-card overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

// ════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════
export default function CoachDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { hasFeature } = usePlanLimits()

  const [loading, setLoading] = useState(true)
  const [coachProfile, setCoachProfile] = useState(null)
  const [clients, setClients] = useState([])
  const [prospects, setProspects] = useState([])
  const [todaySeances, setTodaySeances] = useState([])
  const [todayEvents, setTodayEvents] = useState([])
  const [revenueData, setRevenueData] = useState([])
  const [pendingForms, setPendingForms] = useState(0)
  const [stats, setStats] = useState({ actifs: 0, prospects: 0, mrr: 0, nouveaux: 0, seancesAujourdhui: 0, revenuMoisActuel: 0, revenuMoisPrecedent: 0 })
  const [lastRefresh, setLastRefresh] = useState(null)

  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10)
  const todayStart = `${todayISO}T00:00:00`
  const todayEnd = `${todayISO}T23:59:59`

  // ══════════════════════════════════════
  // CHARGEMENT DES DONNEES
  // ══════════════════════════════════════
  const chargerDonnees = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)

    const [coachRes, clientsRes, prospectsRes] = await Promise.all([
      supabase.from('coaches').select('prenom, nom, plan, abonnement_actif').eq('id', user.id).maybeSingle(),
      supabase.from('clients').select('id, created_at, actif, profiles(nom, email)').eq('coach_id', user.id).eq('actif', true).order('created_at', { ascending: false }),
      supabase.from('prospects').select('id, prenom, nom, email, statut, valeur_estimee, created_at').eq('coach_id', user.id).order('created_at', { ascending: false }),
    ])

    if (coachRes.error) console.error('[Dashboard] Erreur fetch coach:', coachRes.error.message)
    if (clientsRes.error) console.error('[Dashboard] Erreur fetch clients:', clientsRes.error.message)
    if (prospectsRes.error) console.error('[Dashboard] Erreur fetch prospects:', prospectsRes.error.message)

    const coach = coachRes.data
    const clientsData = clientsRes.data ?? []
    const prospectsData = prospectsRes.data ?? []

    setCoachProfile(coach)
    setClients(clientsData)
    setProspects(prospectsData)

    const { data: seancesData, error: seancesErr } = await supabase
      .from('seances')
      .select('id, titre, date_prevue, client_id, notes, is_completed, is_template')
      .eq('coach_id', user.id)
      .gte('date_prevue', todayISO)
      .lte('date_prevue', todayISO)
      .eq('is_template', false)
      .not('client_id', 'is', null)
      .order('date_prevue', { ascending: true })

    if (seancesErr) console.error('[Dashboard] Erreur fetch seances:', seancesErr.message)

    const { data: eventsData, error: eventsErr } = await supabase
      .from('coach_events')
      .select('id, title, event_date, event_type, client_id, notes')
      .eq('coach_id', user.id)
      .gte('event_date', todayStart)
      .lte('event_date', todayEnd)
      .order('event_date', { ascending: true })

    if (eventsErr) console.error('[Dashboard] Erreur fetch events:', eventsErr.message)

    const allClientIds = [
      ...(seancesData ?? []).map(s => s.client_id),
      ...(eventsData ?? []).filter(e => e.client_id).map(e => e.client_id),
    ].filter(Boolean)
    const uniqueClientIds = [...new Set(allClientIds)]

    let clientNamesMap = {}
    if (uniqueClientIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nom')
        .in('id', uniqueClientIds)
      ;(profilesData ?? []).forEach(p => { clientNamesMap[p.id] = p.nom })
    }

    const enrichedSeances = (seancesData ?? []).map(s => ({
      ...s, profiles: { nom: clientNamesMap[s.client_id] || null },
    }))
    setTodaySeances(enrichedSeances)

    const enrichedEvents = (eventsData ?? []).map(e => ({
      ...e, profiles: { nom: e.client_id ? (clientNamesMap[e.client_id] || null) : null },
    }))
    setTodayEvents(enrichedEvents)

    const { data: coachFormIds } = await supabase
      .from('formulaires')
      .select('id')
      .eq('coach_id', user.id)

    const formIds = (coachFormIds ?? []).map(f => f.id)
    let pendingCount = 0

    if (formIds.length > 0) {
      const { count } = await supabase
        .from('formulaire_reponses')
        .select('id', { count: 'exact', head: true })
        .eq('complete', false)
        .in('formulaire_id', formIds)
      pendingCount = count ?? 0
    }
    setPendingForms(pendingCount)

    const sixMoisAgo = new Date()
    sixMoisAgo.setMonth(sixMoisAgo.getMonth() - 5)
    sixMoisAgo.setDate(1)
    sixMoisAgo.setHours(0, 0, 0, 0)

    const { data: paiementsData } = await supabase
      .from('paiements_clients')
      .select('montant, date_paiement, statut')
      .eq('coach_id', user.id)
      .eq('statut', 'paye')
      .gte('date_paiement', sixMoisAgo.toISOString())
      .order('date_paiement', { ascending: true })

    const revenusParMois = {}
    const moisActuel = today.getMonth()
    const anneeActuelle = today.getFullYear()

    for (let i = 5; i >= 0; i--) {
      const d = new Date(anneeActuelle, moisActuel - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      revenusParMois[key] = { label: MOIS_COURTS[d.getMonth()], value: 0, month: d.getMonth(), year: d.getFullYear() }
    }

    ;(paiementsData ?? []).forEach(p => {
      const d = new Date(p.date_paiement)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (revenusParMois[key]) {
        revenusParMois[key].value += Math.round((p.montant ?? 0) / 100)
      }
    })

    const revenueArray = Object.values(revenusParMois).map((r, i, arr) => ({
      ...r, highlight: i === arr.length - 1,
    }))
    setRevenueData(revenueArray)

    const revenuMoisActuel = revenueArray[revenueArray.length - 1]?.value ?? 0
    const revenuMoisPrecedent = revenueArray.length >= 2 ? revenueArray[revenueArray.length - 2]?.value ?? 0 : 0

    const debutMois = new Date(anneeActuelle, moisActuel, 1)
    const nouveaux = clientsData.filter(c => new Date(c.created_at) >= debutMois).length

    setStats({
      actifs: clientsData.length,
      prospects: prospectsData.length,
      nouveaux,
      mrr: revenuMoisActuel,
      seancesAujourdhui: (seancesData ?? []).length + (eventsData ?? []).filter(e => e.event_type !== 'perso' && e.event_type !== 'note').length,
      revenuMoisActuel,
      revenuMoisPrecedent,
    })

    setLastRefresh(new Date())
    setLoading(false)
  }, [user, todayISO])

  useEffect(() => { chargerDonnees() }, [chargerDonnees])

  // ══════════════════════════════════════
  // TEMPS REEL
  // ══════════════════════════════════════
  useEffect(() => {
    if (!user) return
    const silentRefresh = () => chargerDonnees(true)
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seances', filter: `coach_id=eq.${user.id}` }, silentRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coach_events', filter: `coach_id=eq.${user.id}` }, silentRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: `coach_id=eq.${user.id}` }, silentRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prospects', filter: `coach_id=eq.${user.id}` }, silentRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'paiements_clients', filter: `coach_id=eq.${user.id}` }, silentRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'formulaire_reponses' }, silentRefresh)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, chargerDonnees])

  // ══════════════════════════════════════
  // DONNEES DERIVEES
  // ══════════════════════════════════════
  const todayPlanning = useMemo(() => {
    const items = []
    todaySeances.forEach(s => {
      items.push({
        id: s.id, type: 'seance', label: s.titre || 'Seance',
        clientName: s.profiles?.nom ?? 'Client', time: null,
        isCompleted: !!s.is_completed, clientId: s.client_id,
      })
    })
    todayEvents.forEach(e => {
      const d = new Date(e.event_date)
      const hh = d.getHours().toString().padStart(2, '0')
      const mm = d.getMinutes().toString().padStart(2, '0')
      items.push({
        id: e.id, type: e.event_type, label: e.title,
        clientName: e.profiles?.nom ?? null, time: `${hh}:${mm}`,
        isCompleted: false, clientId: e.client_id,
      })
    })
    items.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time)
      if (a.time && !b.time) return -1
      if (!a.time && b.time) return 1
      return 0
    })
    return items
  }, [todaySeances, todayEvents])

  const revenueEvolution = useMemo(() => {
    if (stats.revenuMoisPrecedent === 0) return null
    const diff = stats.revenuMoisActuel - stats.revenuMoisPrecedent
    const pct = Math.round((diff / stats.revenuMoisPrecedent) * 100)
    return { diff, pct, positive: diff >= 0 }
  }, [stats.revenuMoisActuel, stats.revenuMoisPrecedent])

  const totalRevenu6Mois = useMemo(() => revenueData.reduce((sum, r) => sum + r.value, 0), [revenueData])

  const jourSemaine = today.toLocaleDateString('fr-FR', { weekday: 'long' })
  const jourMois = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const dateAffichee = `${jourSemaine.charAt(0).toUpperCase() + jourSemaine.slice(1)} ${jourMois}`

  const prenom = coachProfile?.prenom ?? 'Coach'

  // ══════════════════════════════════════
  // SKELETON
  // ══════════════════════════════════════
  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-5 w-full max-w-[1400px]">
        <div className="skel-block h-36 md:h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="skel-block h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="skel-block h-48 rounded-xl" />
            <div className="skel-block h-64 rounded-xl" />
          </div>
          <div className="space-y-4">
            <div className="skel-block h-64 rounded-xl" />
            <div className="skel-block h-40 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════
  // RENDU
  // ══════════════════════════════════════
  return (
    <div className="p-4 md:p-6 w-full space-y-5 max-w-[1400px]">

      {/* ══════════════════════════════════════ */}
      {/* HERO BANNER                            */}
      {/* ══════════════════════════════════════ */}
      <div className="glass-card overflow-hidden relative">
        {/* Top gradient accent */}
        <div className="h-1.5 bg-gradient-to-r from-[#FF6B2B] via-[#FF8F5E] to-transparent" />

        {/* Subtle dot pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        <div className="relative p-5 md:p-7">
          {/* Decorative gradient circle */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,107,43,0.08) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-12 left-1/4 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)' }} />

          <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8F5E)', boxShadow: '0 4px 24px rgba(255,107,43,0.3)' }}>
                <Flame size={26} className="text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-[var(--text-primary)] text-2xl md:text-[28px] font-extrabold tracking-tight leading-tight">
                  Bonjour, {prenom}
                </h1>
                <p className="text-[var(--text-muted)] text-sm mt-1">
                  {todayPlanning.length > 0
                    ? <><span className="text-[var(--color-primary,#FF6B2B)] font-semibold">{todayPlanning.length}</span> tache{todayPlanning.length > 1 ? 's' : ''} prevue{todayPlanning.length > 1 ? 's' : ''} — {dateAffichee}</>
                    : <>Aucune tache prevue — {dateAffichee}</>
                  }
                </p>
              </div>
            </div>

            {/* Mobile compact stats row */}
            <div className="flex md:hidden items-center gap-2 -mt-1">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <Users size={12} className="text-[#FF6B2B]" />
                <span className="text-[var(--text-primary)] text-xs font-bold">{stats.actifs}</span>
                <span className="text-[var(--text-muted)] text-[10px]">clients</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <Calendar size={12} className="text-emerald-400" />
                <span className="text-[var(--text-primary)] text-xs font-bold">{stats.seancesAujourdhui}</span>
                <span className="text-[var(--text-muted)] text-[10px]">seances</span>
              </div>
              {pendingForms > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/15">
                  <FileText size={12} className="text-amber-400" />
                  <span className="text-amber-300 text-xs font-bold">{pendingForms}</span>
                </div>
              )}
              <button
                onClick={() => chargerDonnees()}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-colors ml-auto"
                title="Rafraichir"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            {/* Desktop badges */}
            <div className="hidden md:flex items-center gap-2.5 ml-auto flex-shrink-0">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <Zap size={13} className="text-[#FF6B2B]" />
                <span className="text-[var(--text-primary)] text-sm font-bold">{stats.actifs}</span>
                <span className="text-[var(--text-muted)] text-xs">clients</span>
              </div>
              {pendingForms > 0 && (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
                  <FileText size={13} className="text-amber-400" />
                  <span className="text-amber-300 text-sm font-bold">{pendingForms}</span>
                  <span className="text-amber-400/50 text-xs">en attente</span>
                </div>
              )}
              <button
                onClick={() => chargerDonnees()}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-colors"
                title="Rafraichir"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* 4 STAT CARDS                           */}
      {/* ══════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Clients actifs', value: stats.actifs, icon: Users, color: '#FF6B2B' },
          { label: 'Seances aujourd\'hui', value: stats.seancesAujourdhui, icon: Calendar, color: '#22c55e' },
          { label: 'Prospects', value: stats.prospects, icon: Target, color: '#3b82f6' },
          { label: 'Revenus ce mois', value: stats.mrr > 0 ? `${stats.mrr}` : '0', suffix: '\u20AC', icon: Euro, color: '#f59e0b', evolution: revenueEvolution },
        ].map((s, i) => (
          <DashCard key={i} className={`group transition-colors duration-200`}>
            {/* Colored accent bar */}
            <div className="h-[2px]" style={{ background: `linear-gradient(to right, ${s.color}, ${s.color}66, transparent)` }} />
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105" style={{ backgroundColor: `${s.color}14` }}>
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
                {s.evolution && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    s.evolution.positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {s.evolution.positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {s.evolution.positive ? '+' : ''}{s.evolution.pct}%
                  </span>
                )}
              </div>
              <p className="text-[var(--text-primary)] text-2xl font-bold tabular-nums leading-none">
                {s.value}{s.suffix && <span className="text-base font-semibold text-[var(--text-muted)] ml-0.5">{s.suffix}</span>}
              </p>
              <p className="text-[var(--text-muted)] text-[11px] mt-1.5">{s.label}</p>
            </div>
          </DashCard>
        ))}
      </div>

      {/* ══════════════════════════════════════ */}
      {/* MAIN GRID : 2/3 + 1/3                 */}
      {/* ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">

        {/* ── COLONNE GAUCHE (2/3) ── */}
        <div className="lg:col-span-2 space-y-4 md:space-y-5">

          {/* ── Activite du jour ── */}
          <DashCard>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center">
                    <Activity size={16} className="text-[#FF6B2B]" />
                  </div>
                  <h2 className="text-[var(--text-primary)] text-[15px] font-semibold">Activite du jour</h2>
                </div>
                <button
                  onClick={() => chargerDonnees()}
                  className="md:hidden p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-colors"
                >
                  <RefreshCw size={13} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: 'seance', labelPlural: 'seances', sublabel: 'prevue', value: todaySeances.length, icon: Dumbbell, color: '#FF6B2B' },
                  { label: 'evenement', labelPlural: 'evenements', sublabel: '', value: todayEvents.length, icon: Calendar, color: '#3b82f6' },
                  { label: 'formulaire', labelPlural: 'formulaires', sublabel: 'en attente', value: pendingForms, icon: FileText, color: '#f59e0b' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3.5 bg-[var(--bg-base)] rounded-xl p-4 border border-[var(--border-subtle)] relative overflow-hidden"
                  >
                    {/* Colored left accent border */}
                    <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full" style={{ backgroundColor: item.color }} />
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-1" style={{ backgroundColor: `${item.color}14` }}>
                      <item.icon size={20} style={{ color: item.color }} />
                    </div>
                    <div>
                      <p className="text-[var(--text-primary)] text-xl font-bold tabular-nums">{item.value}</p>
                      <p className="text-[var(--text-muted)] text-[11px]">
                        {item.value !== 1 ? item.labelPlural : item.label}{item.sublabel ? ` ${item.sublabel}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DashCard>

          {/* ── Revenus ── */}
          <DashCard>
            {/* Gradient accent bar at top */}
            <div className="h-[2px] bg-gradient-to-r from-amber-500/60 via-[#FF6B2B]/40 to-transparent" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Euro size={16} className="text-amber-400" />
                    </div>
                    <h2 className="text-[var(--text-primary)] text-[15px] font-semibold">Suivi des Revenus</h2>
                  </div>
                  <p className="text-[var(--text-muted)] text-[11px] mt-1.5 ml-[42px]">
                    6 derniers mois — Total : {totalRevenu6Mois > 0 ? `${totalRevenu6Mois.toLocaleString('fr-FR')}€` : '--'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {revenueEvolution && (
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      revenueEvolution.positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {revenueEvolution.positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                      {revenueEvolution.positive ? '+' : ''}{revenueEvolution.pct}%
                    </span>
                  )}
                  <button
                    onClick={() => navigate(hasFeature('statistiques') ? '/coach/statistiques' : '/pricing')}
                    className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-colors"
                  >
                    {hasFeature('statistiques') ? <BarChart3 size={14} /> : <Lock size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-center py-2 overflow-x-auto">
                <RevenueChart data={revenueData} />
              </div>
            </div>
          </DashCard>

          {/* ── Prospects ── */}
          <DashCard>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Target size={16} className="text-blue-400" />
                  </div>
                  <h2 className="text-[var(--text-primary)] text-[15px] font-semibold">Vos prospects</h2>
                </div>
                <button
                  onClick={() => navigate('/coach/prospects')}
                  className="text-[var(--color-primary,#FF6B2B)] text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[#FF6B2B]/10 transition-colors"
                >
                  Voir tout <ChevronRight size={12} />
                </button>
              </div>

              {prospects.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3 animate-breathe">
                    <Target size={22} className="text-blue-400/50" />
                  </div>
                  <p className="text-[var(--text-muted)] text-xs mb-3">Aucun prospect pour le moment</p>
                  <button
                    onClick={() => navigate('/coach/prospects')}
                    className="px-4 py-2 rounded-xl bg-[var(--color-primary,#FF6B2B)]/10 text-[var(--color-primary,#FF6B2B)] text-xs font-semibold hover:bg-[var(--color-primary,#FF6B2B)]/20 transition-colors"
                  >
                    Ajouter un prospect
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Par statut */}
                  <div className="space-y-2.5">
                    <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-medium">Par statut</p>
                    {Object.entries(
                      prospects.reduce((acc, p) => { acc[p.statut] = (acc[p.statut] || 0) + 1; return acc }, {})
                    ).map(([statut, count]) => (
                      <div key={statut} className="flex items-center gap-3 pl-3 py-1.5 rounded-lg relative hover:bg-[var(--bg-surface)]/30 transition-colors">
                        {/* Colored left border */}
                        <div className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full" style={{ backgroundColor: STATUT_COLORS[statut] || '#71717a' }} />
                        <span className="text-[var(--text-secondary)] text-sm flex-1 capitalize">{statut}</span>
                        <span className="text-[var(--text-primary)] text-sm font-bold tabular-nums">{count}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
                      <Euro size={10} className="text-[var(--text-muted)]" />
                      <span className="text-[var(--text-muted)] text-sm flex-1">Valeur totale</span>
                      <span className="text-[var(--color-primary,#FF6B2B)] text-sm font-bold tabular-nums">
                        {prospects.reduce((sum, p) => sum + (p.valeur_estimee || 0), 0)}€
                      </span>
                    </div>
                  </div>

                  {/* Recents */}
                  <div className="space-y-2.5">
                    <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-medium">Recents</p>
                    {prospects.slice(0, 4).map((p, idx) => {
                      const color = STATUT_COLORS[p.statut] || '#71717a'
                      const fullName = [p.prenom, p.nom].filter(Boolean).join(' ') || p.email || '?'
                      return (
                        <div key={p.id} className="flex items-center gap-3 py-1">
                          {/* Avatar-like initials */}
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
                            style={{ backgroundColor: COULEURS_AVATAR[idx % COULEURS_AVATAR.length] }}
                          >
                            {initialesFrom(fullName)}
                          </div>
                          <span className="text-[var(--text-secondary)] text-sm flex-1 truncate">{fullName}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold capitalize"
                            style={{ backgroundColor: `${color}14`, color }}>
                            {p.statut}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </DashCard>
        </div>

        {/* ── COLONNE DROITE (1/3) ── */}
        <div className="space-y-4 md:space-y-5">

          {/* ── Planning d'aujourd'hui ── */}
          <DashCard>
            <div className="h-[2px] bg-gradient-to-r from-[#FF6B2B]/60 via-[#FF8F5E]/30 to-transparent" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(255,107,43,0.15), rgba(255,143,94,0.08))' }}>
                    <Clock size={16} className="text-[#FF6B2B]" />
                  </div>
                  <div>
                    <h2 className="text-[var(--text-primary)] text-[15px] font-semibold leading-tight">Aujourd'hui</h2>
                    {lastRefresh && (
                      <span className="text-[var(--text-muted)] text-[9px]">
                        MAJ {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
                {todayPlanning.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FF6B2B]/10 text-[#FF6B2B] tabular-nums">
                    {todayPlanning.length}
                  </span>
                )}
              </div>

              {todayPlanning.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3 animate-breathe">
                    <CheckCircle size={22} className="text-emerald-400/50" />
                  </div>
                  <p className="text-[var(--text-primary)] text-sm font-medium">Journee libre !</p>
                  <p className="text-[var(--text-muted)] text-[11px] mt-0.5">Aucune seance ni evenement prevu</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {todayPlanning.map((item) => {
                    const meta = EVENT_META[item.type] || EVENT_META.autre
                    const IconComp = meta.icon
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => item.clientId ? navigate(`/coach/clients/${item.clientId}`) : null}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--bg-surface)]/50 transition-colors text-left group relative overflow-hidden`}
                      >
                        {/* Left border for completed items */}
                        {item.isCompleted && (
                          <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-emerald-400/60" />
                        )}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${meta.color}14` }}>
                          <IconComp size={16} style={{ color: item.isCompleted ? '#22c55e' : meta.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${item.isCompleted ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                            {item.clientName ?? item.label}
                          </p>
                          <p className="text-[var(--text-muted)] text-[11px]">
                            {meta.label}{item.label && item.clientName ? ` — ${item.label}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {item.isCompleted && <CheckCircle size={13} className="text-emerald-400" />}
                          <span className={`text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded-md ${
                            item.time ? 'bg-[var(--bg-surface)] text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'
                          }`}>
                            {item.time ?? 'Journee'}
                          </span>
                        </div>
                        {item.clientId && (
                          <div className="md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <Eye size={13} className="text-[var(--text-muted)]" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              <button
                onClick={() => navigate('/coach/calendar')}
                className="w-full mt-3 py-2.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] text-xs font-medium hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30 transition-colors flex items-center justify-center gap-2"
              >
                <Calendar size={12} />
                Voir le calendrier complet
              </button>
            </div>
          </DashCard>

          {/* ── Actions rapides ── */}
          <DashCard>
            <div className="p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Zap size={16} className="text-purple-400" />
                </div>
                <h2 className="text-[var(--text-primary)] text-[15px] font-semibold">Actions rapides</h2>
              </div>
              <div className="space-y-1">
                {[
                  { label: 'Nouveau client', icon: UserPlus, action: () => navigate('/coach/client-hub'), color: '#FF6B2B' },
                  { label: 'Creer un programme', icon: Dumbbell, action: () => navigate('/coach/sport'), color: '#3b82f6' },
                  { label: 'Envoyer un formulaire', icon: FileText, action: () => navigate('/coach/formulaires'), color: '#a855f7' },
                  { label: hasFeature('statistiques') ? 'Voir les stats' : 'Stats (Pro)', icon: hasFeature('statistiques') ? TrendingUp : Lock, action: () => navigate(hasFeature('statistiques') ? '/coach/statistiques' : '/pricing'), color: hasFeature('statistiques') ? '#22c55e' : '#9ca3af' },
                ].map((a, i) => (
                  <button
                    key={i}
                    onClick={a.action}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--bg-surface)]/50 transition-all text-left group"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                      style={{ backgroundColor: `${a.color}12` }}
                    >
                      <a.icon size={16} style={{ color: a.color }} className="transition-transform duration-200 group-hover:scale-110" />
                    </div>
                    <span className="text-[var(--text-primary)] text-sm font-medium flex-1">{a.label}</span>
                    <ChevronRight size={13} className="text-[var(--text-muted)] md:opacity-0 md:group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </DashCard>

          {/* ── Derniers clients ── */}
          <DashCard>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Users size={16} className="text-emerald-400" />
                  </div>
                  <h2 className="text-[var(--text-primary)] text-[15px] font-semibold">Derniers clients</h2>
                </div>
                <button
                  onClick={() => navigate('/coach/client-hub')}
                  className="text-[var(--color-primary,#FF6B2B)] text-xs font-semibold px-2 py-1 rounded-lg hover:bg-[#FF6B2B]/10 transition-colors"
                >
                  Tous
                </button>
              </div>

              {clients.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-3 animate-breathe">
                    <Users size={22} className="text-[var(--text-muted)]" />
                  </div>
                  <p className="text-[var(--text-muted)] text-xs">Aucun client</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {clients.slice(0, 5).map((c, i) => {
                    const avatarColor = COULEURS_AVATAR[i % COULEURS_AVATAR.length]
                    return (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/coach/clients/${c.id}`)}
                        className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-[var(--bg-surface)]/50 transition-colors text-left group"
                      >
                        {/* Avatar with gradient ring */}
                        <div className="relative flex-shrink-0">
                          <div className="absolute -inset-[2px] rounded-full opacity-40 group-hover:opacity-70 transition-opacity"
                            style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}88)` }} />
                          <div
                            className="relative w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {initialesFrom(c.profiles?.nom)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--text-primary)] text-sm font-medium truncate">
                            {c.profiles?.nom ?? c.profiles?.email}
                          </p>
                        </div>
                        <span className="text-[var(--text-muted)] text-[10px] flex-shrink-0 tabular-nums">
                          {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                        <div className="md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <ChevronRight size={12} className="text-[var(--text-muted)]" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </DashCard>
        </div>
      </div>
    </div>
  )
}
