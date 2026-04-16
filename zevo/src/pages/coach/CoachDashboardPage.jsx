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
import Ring from '../../components/ui/Ring'

// ── Langage Fitness OS : 3 familles de couleurs ──
const FAMILY = {
  seance:  '#FF6B2B',
  contact: '#64748b',
  perso:   '#9ca3af',
}

// ── Palette avatar atténuée (identité conservée sans saturer) ──
const COULEURS_AVATAR = ['#FF6B2B', '#64748b', '#475569', '#9ca3af', '#334155', '#7c7c7c', '#FF9A6C']

function initialesFrom(nom) {
  const parts = (nom ?? '?').trim().split(' ')
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : (nom ?? '?')[0].toUpperCase()
}

const MOIS_COURTS = ['Janv', 'Fev', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sept', 'Oct', 'Nov', 'Dec']

const EVENT_META = {
  seance:  { icon: Dumbbell, color: FAMILY.seance, label: 'Seance' },
  bilan:   { icon: ClipboardList, color: FAMILY.contact, label: 'Bilan' },
  appel:   { icon: Phone, color: FAMILY.contact, label: 'Appel' },
  reunion: { icon: Users, color: FAMILY.contact, label: 'Reunion' },
  perso:   { icon: Star, color: FAMILY.perso, label: 'Perso' },
  note:    { icon: FileText, color: FAMILY.perso, label: 'Note' },
  autre:   { icon: Activity, color: FAMILY.perso, label: 'Autre' },
}

// ── Statuts prospects : progression nuancée orange → neutre ──
const STATUT_COLORS = {
  contact:     '#9ca3af',
  appel:       '#64748b',
  proposition: '#FF9A6C',
  closing:     '#FF6B2B',
}

// ── Revenue Chart ──
function RevenueChart({ data }) {
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center py-10">
      <Euro size={22} className="text-[var(--text-muted)] mb-3 animate-breathe" strokeWidth={1.5} />
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
      <div className="hero-card hero-card--accent p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <Flame size={22} strokeWidth={1.75} className="text-[#FF6B2B] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-[var(--text-primary)] text-2xl md:text-[28px] font-extrabold tracking-tight leading-tight">
                Bonjour, {prenom}
              </h1>
              <p className="text-[var(--text-muted)] text-sm mt-1">
                {todayPlanning.length > 0
                  ? <><span className="text-[var(--text-primary)] font-semibold tabular-nums">{todayPlanning.length}</span> tache{todayPlanning.length > 1 ? 's' : ''} prevue{todayPlanning.length > 1 ? 's' : ''} — {dateAffichee}</>
                  : <>Aucune tache prevue — {dateAffichee}</>
                }
              </p>
            </div>
          </div>

          {/* Mobile compact stats row */}
          <div className="flex md:hidden items-center gap-2 -mt-1">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <Users size={12} className="text-[var(--text-muted)]" />
              <span className="text-[var(--text-primary)] text-xs font-bold tabular-nums">{stats.actifs}</span>
              <span className="text-[var(--text-muted)] text-[10px]">clients</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <Calendar size={12} className="text-[var(--text-muted)]" />
              <span className="text-[var(--text-primary)] text-xs font-bold tabular-nums">{stats.seancesAujourdhui}</span>
              <span className="text-[var(--text-muted)] text-[10px]">seances</span>
            </div>
            {pendingForms > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <FileText size={12} className="text-[#FF6B2B]" />
                <span className="text-[var(--text-primary)] text-xs font-bold tabular-nums">{pendingForms}</span>
              </div>
            )}
            <button
              onClick={() => chargerDonnees()}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors ml-auto"
              title="Rafraichir"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          {/* Desktop badges */}
          <div className="hidden md:flex items-center gap-2.5 ml-auto flex-shrink-0">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <Users size={13} className="text-[var(--text-muted)]" strokeWidth={1.75} />
              <span className="text-[var(--text-primary)] text-sm font-bold tabular-nums">{stats.actifs}</span>
              <span className="text-[var(--text-muted)] text-xs">clients</span>
            </div>
            {pendingForms > 0 && (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <FileText size={13} className="text-[#FF6B2B]" strokeWidth={1.75} />
                <span className="text-[var(--text-primary)] text-sm font-bold tabular-nums">{pendingForms}</span>
                <span className="text-[var(--text-muted)] text-xs">en attente</span>
              </div>
            )}
            <button
              onClick={() => chargerDonnees()}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors"
              title="Rafraichir"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* 4 STAT CARDS — Fitness OS              */}
      {/* ══════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(() => {
          // Ring values — chaque carte a son indicateur de progression
          const activePct = stats.actifs > 0
            ? Math.min(100, Math.round((stats.nouveaux / stats.actifs) * 100))
            : 0
          const seancesPct = Math.min(100, Math.round((stats.seancesAujourdhui / 8) * 100))
          const prospectPct = stats.prospects > 0
            ? Math.min(100, Math.round((prospects.filter(p => p.statut === 'closing' || p.statut === 'proposition').length / stats.prospects) * 100))
            : 0
          const revPct = stats.revenuMoisPrecedent > 0
            ? Math.min(100, Math.round((stats.revenuMoisActuel / stats.revenuMoisPrecedent) * 100))
            : (stats.revenuMoisActuel > 0 ? 100 : 0)

          return [
            {
              label: 'Clients actifs', value: stats.actifs, icon: Users,
              sub: stats.nouveaux > 0 ? `+${stats.nouveaux} ce mois` : 'base stable',
              ringValue: activePct,
            },
            {
              label: 'Seances aujourd\'hui', value: stats.seancesAujourdhui, icon: Calendar,
              sub: stats.seancesAujourdhui > 0 ? `sur 8 creneaux` : 'journee libre',
              ringValue: seancesPct,
            },
            {
              label: 'Prospects', value: stats.prospects, icon: Target,
              sub: 'en pipeline',
              ringValue: prospectPct,
            },
            {
              label: 'Revenus ce mois', value: stats.mrr > 0 ? `${stats.mrr}` : '0', suffix: '\u20AC',
              sub: stats.revenuMoisPrecedent > 0 ? `vs ${stats.revenuMoisPrecedent}\u20AC mois passe` : 'premier mois',
              icon: Euro,
              evolution: revenueEvolution,
              ringValue: revPct,
            },
          ]
        })().map((s, i) => (
          <div key={i} className="metric-card p-4 min-h-[130px]">
            <div className="relative z-[1] flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <s.icon size={11} className="text-[var(--text-muted)]" />
                  <p className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-[0.14em] truncate">{s.label}</p>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <p className="text-[var(--text-primary)] text-[26px] font-black tabular-nums tracking-tight leading-none">{s.value}</p>
                  {s.suffix && <span className="text-[var(--text-muted)] text-base font-semibold tabular-nums">{s.suffix}</span>}
                </div>
                {s.evolution ? (
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold mt-1.5 ${
                    s.evolution.positive ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {s.evolution.positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {s.evolution.positive ? '+' : ''}{s.evolution.pct}%
                    <span className="text-[var(--text-muted)] font-medium ml-1 normal-case">vs mois passe</span>
                  </span>
                ) : (
                  <p className="text-[var(--text-muted)] text-[10px] mt-1.5 font-medium truncate">{s.sub}</p>
                )}
              </div>
              <Ring
                value={s.ringValue}
                max={100}
                size={46}
                thickness={4}
                color="#FF6B2B"
                trackColor="var(--ring-track)"
                className="shrink-0"
              >
                <span className="text-[10px] font-black tabular-nums text-[var(--text-primary)]">{s.ringValue}%</span>
              </Ring>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════ */}
      {/* MAIN GRID : 2/3 + 1/3                 */}
      {/* ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">

        {/* ── COLONNE GAUCHE (2/3) ── */}
        <div className="lg:col-span-2 space-y-4 md:space-y-5">

          {/* ── Activite du jour ── */}
          <div className="hero-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Activity size={14} className="text-[var(--text-muted)]" strokeWidth={1.75} />
                <h2 className="text-[var(--text-primary)] text-[15px] font-semibold tracking-tight">Activite du jour</h2>
              </div>
              <button
                onClick={() => chargerDonnees()}
                className="md:hidden p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: 'seance', labelPlural: 'seances', sublabel: 'prevue', value: todaySeances.length, icon: Dumbbell, color: FAMILY.seance },
                { label: 'evenement', labelPlural: 'evenements', sublabel: '', value: todayEvents.length, icon: Calendar, color: FAMILY.contact },
                { label: 'formulaire', labelPlural: 'formulaires', sublabel: 'en attente', value: pendingForms, icon: FileText, color: FAMILY.perso },
              ].map((item, i) => (
                <div
                  key={i}
                  className="relative flex items-center gap-3.5 bg-[var(--bg-base)] rounded-xl p-4 border border-[var(--border-subtle)]"
                >
                  {/* Barre latérale 3px — langage unifié events Calendar */}
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full" style={{ backgroundColor: item.color }} />
                  <item.icon size={18} strokeWidth={1.75} style={{ color: item.color }} className="flex-shrink-0 ml-1" />
                  <div>
                    <p className="text-[var(--text-primary)] text-xl font-black tabular-nums leading-none">{item.value}</p>
                    <p className="text-[var(--text-muted)] text-[11px] mt-1">
                      {item.value !== 1 ? item.labelPlural : item.label}{item.sublabel ? ` ${item.sublabel}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Revenus ── */}
          <div className="hero-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <Euro size={14} className="text-[var(--text-muted)]" strokeWidth={1.75} />
                  <h2 className="text-[var(--text-primary)] text-[15px] font-semibold tracking-tight">Suivi des Revenus</h2>
                </div>
                <p className="text-[var(--text-muted)] text-[11px] mt-1.5 ml-[22px]">
                  6 derniers mois — Total : <span className="text-[var(--text-primary)] font-semibold tabular-nums">{totalRevenu6Mois > 0 ? `${totalRevenu6Mois.toLocaleString('fr-FR')}€` : '--'}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {revenueEvolution && (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                    revenueEvolution.positive ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {revenueEvolution.positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                    {revenueEvolution.positive ? '+' : ''}{revenueEvolution.pct}%
                  </span>
                )}
                <button
                  onClick={() => navigate(hasFeature('statistiques') ? '/coach/statistiques' : '/pricing')}
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {hasFeature('statistiques') ? <BarChart3 size={14} /> : <Lock size={14} />}
                </button>
              </div>
            </div>

            <div className="flex justify-center py-2 overflow-x-auto">
              <RevenueChart data={revenueData} />
            </div>
          </div>

          {/* ── Prospects ── */}
          <div className="hero-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Target size={14} className="text-[var(--text-muted)]" strokeWidth={1.75} />
                <h2 className="text-[var(--text-primary)] text-[15px] font-semibold tracking-tight">Vos prospects</h2>
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
                <Target size={22} className="text-[var(--text-muted)] mx-auto mb-3 animate-breathe" strokeWidth={1.5} />
                <p className="text-[var(--text-muted)] text-xs mb-3">Aucun prospect pour le moment</p>
                <button
                  onClick={() => navigate('/coach/prospects')}
                  className="px-4 py-2 rounded-xl bg-[#FF6B2B]/10 text-[#FF6B2B] text-xs font-semibold hover:bg-[#FF6B2B]/20 transition-colors"
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
        </div>

        {/* ── COLONNE DROITE (1/3) ── */}
        <div className="space-y-4 md:space-y-5">

          {/* ── Planning d'aujourd'hui ── */}
          <div className="hero-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Clock size={14} className="text-[var(--text-muted)]" strokeWidth={1.75} />
                <div>
                  <h2 className="text-[var(--text-primary)] text-[15px] font-semibold tracking-tight leading-tight">Aujourd'hui</h2>
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
                <CheckCircle size={22} className="text-[var(--text-muted)] mx-auto mb-3 animate-breathe" strokeWidth={1.5} />
                <p className="text-[var(--text-primary)] text-sm font-medium">Journee libre !</p>
                <p className="text-[var(--text-muted)] text-[11px] mt-0.5">Aucune seance ni evenement prevu</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {todayPlanning.map((item) => {
                  const meta = EVENT_META[item.type] || EVENT_META.autre
                  const IconComp = meta.icon
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => item.clientId ? navigate(`/coach/clients/${item.clientId}`) : null}
                      className="w-full flex items-center gap-2.5 pl-3 pr-2 py-2.5 rounded-lg hover:bg-[var(--bg-surface)]/60 transition-colors text-left group relative"
                    >
                      {/* Barre latérale 3px — même langage que le Calendar */}
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full" style={{ backgroundColor: item.isCompleted ? '#22c55e' : meta.color }} />
                      <IconComp size={14} strokeWidth={1.75} style={{ color: item.isCompleted ? '#22c55e' : meta.color }} className="flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${item.isCompleted ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                          {item.clientName ?? item.label}
                        </p>
                        <p className="text-[var(--text-muted)] text-[11px] truncate">
                          {meta.label}{item.label && item.clientName ? ` — ${item.label}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.isCompleted && <CheckCircle size={13} className="text-emerald-400" />}
                        <span className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md ${
                          item.time ? 'bg-[var(--bg-surface)] text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'
                        }`}>
                          {item.time ?? 'Journee'}
                        </span>
                      </div>
                      {item.clientId && (
                        <Eye size={12} className="text-[var(--text-muted)] md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0" />
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

          {/* ── Actions rapides ── */}
          <div className="hero-card p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <Zap size={14} className="text-[var(--text-muted)]" strokeWidth={1.75} />
              <h2 className="text-[var(--text-primary)] text-[15px] font-semibold tracking-tight">Actions rapides</h2>
            </div>
            <div className="space-y-0.5">
              {[
                { label: 'Nouveau client', icon: UserPlus, action: () => navigate('/coach/client-hub') },
                { label: 'Creer un programme', icon: Dumbbell, action: () => navigate('/coach/sport') },
                { label: 'Envoyer un formulaire', icon: FileText, action: () => navigate('/coach/formulaires') },
                { label: hasFeature('statistiques') ? 'Voir les stats' : 'Stats (Pro)', icon: hasFeature('statistiques') ? TrendingUp : Lock, action: () => navigate(hasFeature('statistiques') ? '/coach/statistiques' : '/pricing'), locked: !hasFeature('statistiques') },
              ].map((a, i) => (
                <button
                  key={i}
                  onClick={a.action}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[var(--bg-surface)]/60 transition-colors text-left group"
                >
                  <a.icon size={15} strokeWidth={1.75} className={`flex-shrink-0 transition-colors ${a.locked ? 'text-[var(--text-muted)]' : 'text-[var(--text-muted)] group-hover:text-[#FF6B2B]'}`} />
                  <span className="text-[var(--text-primary)] text-sm font-medium flex-1">{a.label}</span>
                  <ChevronRight size={13} className="text-[var(--text-muted)] md:opacity-0 md:group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          {/* ── Derniers clients ── */}
          <div className="hero-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Users size={14} className="text-[var(--text-muted)]" strokeWidth={1.75} />
                <h2 className="text-[var(--text-primary)] text-[15px] font-semibold tracking-tight">Derniers clients</h2>
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
                <Users size={22} className="text-[var(--text-muted)] mx-auto mb-3 animate-breathe" strokeWidth={1.5} />
                <p className="text-[var(--text-muted)] text-xs">Aucun client</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {clients.slice(0, 5).map((c, i) => {
                  const avatarColor = COULEURS_AVATAR[i % COULEURS_AVATAR.length]
                  return (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/coach/clients/${c.id}`)}
                      className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-[var(--bg-surface)]/60 transition-colors text-left group"
                    >
                      {/* Avatar sobre (palette atténuée, plus de glow ring) */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {initialesFrom(c.profiles?.nom)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--text-primary)] text-sm font-medium truncate">
                          {c.profiles?.nom ?? c.profiles?.email}
                        </p>
                      </div>
                      <span className="text-[var(--text-muted)] text-[10px] flex-shrink-0 tabular-nums">
                        {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                      <ChevronRight size={12} className="text-[var(--text-muted)] md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
