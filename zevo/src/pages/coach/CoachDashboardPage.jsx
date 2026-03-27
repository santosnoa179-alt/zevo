import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import {
  Users, UserPlus, TrendingUp, DollarSign, Calendar,
  ChevronRight, MoreHorizontal, Flame, Eye, Target,
  BarChart3, Clock, MessageCircle, Zap, FileText,
  CheckCircle, AlertCircle, ArrowUpRight, ArrowDownRight,
  Activity, Dumbbell, Phone, ClipboardList, Star, RefreshCw
} from 'lucide-react'

// ── Couleurs avatar ──
const COULEURS_AVATAR = ['#FF6B2B', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6']

// ── Initiales ──
function initialesFrom(nom) {
  const parts = (nom ?? '?').trim().split(' ')
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : (nom ?? '?')[0].toUpperCase()
}

// ── Mois courts FR ──
const MOIS_COURTS = ['Janv', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']

// ── Type d'event → icon + couleur ──
const EVENT_META = {
  seance:  { icon: Dumbbell, color: '#FF6B2B', label: 'Séance' },
  bilan:   { icon: ClipboardList, color: '#a855f7', label: 'Bilan' },
  appel:   { icon: Phone, color: '#3b82f6', label: 'Appel' },
  reunion: { icon: Users, color: '#f59e0b', label: 'Réunion' },
  perso:   { icon: Star, color: '#71717a', label: 'Perso' },
  note:    { icon: FileText, color: '#71717a', label: 'Note' },
  autre:   { icon: Activity, color: '#71717a', label: 'Autre' },
}

// ── Status prospect → couleur ──
const STATUT_COLORS = {
  contact: '#f59e0b',
  appel: '#3b82f6',
  proposition: '#a855f7',
  closing: '#22c55e',
}

// ── Mini bar chart SVG (revenus) ──
function RevenueChart({ data }) {
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center py-8">
      <DollarSign size={28} className="text-white/10 mb-2" />
      <p className="text-white/25 text-xs">Aucun paiement enregistré</p>
    </div>
  )

  const max = Math.max(...data.map(d => d.value), 1)
  const barW = 36
  const gap = 16
  const chartH = 120
  const totalW = data.length * (barW + gap) - gap

  return (
    <div className="flex flex-col items-center">
      <svg width={totalW} height={chartH + 30} className="overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <line key={i} x1={0} y1={chartH * (1 - pct)} x2={totalW} y2={chartH * (1 - pct)} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * chartH
          const x = i * (barW + gap)
          return (
            <g key={i}>
              <rect x={x} y={chartH - h} width={barW} height={Math.max(h, 2)} rx={6} fill={d.highlight ? '#FF6B2B' : 'rgba(255,107,43,0.25)'} />
              {d.value > 0 && (
                <text x={x + barW / 2} y={chartH - h - 6} textAnchor="middle" fill="rgba(245,245,243,0.5)" fontSize={10} fontWeight={600}>
                  {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}K` : `${d.value}€`}
                </text>
              )}
              <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={11}>
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

  // ── Dates utiles ──
  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10) // YYYY-MM-DD
  const todayStart = `${todayISO}T00:00:00`
  const todayEnd = `${todayISO}T23:59:59`

  // ══════════════════════════════════════
  // CHARGEMENT DES DONNÉES
  // ══════════════════════════════════════
  const chargerDonnees = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)

    // ── 1. Coach + Clients + Prospects ──
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

    // ── 2. Séances du jour ──
    // is_template et is_completed existent (ALTER TABLE via schema-seances-templates + schema-seances-completed)
    // Filtres robustes :
    //   - gte/lte sur date_prevue (type date) pour couvrir toute la journée
    //   - is_template = false → exclure les modèles
    //   - client_id NOT NULL → exclure les templates orphelins
    const { data: seancesData, error: seancesErr } = await supabase
      .from('seances')
      .select('id, titre, date_prevue, client_id, notes, is_completed, is_template')
      .eq('coach_id', user.id)
      .gte('date_prevue', todayISO)
      .lte('date_prevue', todayISO)
      .eq('is_template', false)
      .not('client_id', 'is', null)
      .order('date_prevue', { ascending: true })

    if (seancesErr) console.error('[Dashboard] Erreur fetch séances:', seancesErr.message, seancesErr.details)

    // ── 3. Events du jour ──
    // Note : coach_events.client_id → auth.users(id), pas de FK vers profiles
    const { data: eventsData, error: eventsErr } = await supabase
      .from('coach_events')
      .select('id, title, event_date, event_type, client_id, notes')
      .eq('coach_id', user.id)
      .gte('event_date', todayStart)
      .lte('event_date', todayEnd)
      .order('event_date', { ascending: true })

    if (eventsErr) console.error('[Dashboard] Erreur fetch events:', eventsErr.message, eventsErr.details)

    // ── 2b. Résoudre les noms des clients (séances + events) ──
    const allClientIds = [
      ...(seancesData ?? []).map(s => s.client_id),
      ...(eventsData ?? []).filter(e => e.client_id).map(e => e.client_id),
    ].filter(Boolean)
    const uniqueClientIds = [...new Set(allClientIds)]

    let clientNamesMap = {}
    if (uniqueClientIds.length > 0) {
      const { data: profilesData, error: profErr } = await supabase
        .from('profiles')
        .select('id, nom')
        .in('id', uniqueClientIds)
      if (profErr) console.error('[Dashboard] Erreur fetch profiles:', profErr.message)
      ;(profilesData ?? []).forEach(p => { clientNamesMap[p.id] = p.nom })
    }

    // Enrichir les séances avec le nom du client
    const enrichedSeances = (seancesData ?? []).map(s => ({
      ...s,
      profiles: { nom: clientNamesMap[s.client_id] || null },
    }))
    setTodaySeances(enrichedSeances)

    // Enrichir les events avec le nom du client
    const enrichedEvents = (eventsData ?? []).map(e => ({
      ...e,
      profiles: { nom: e.client_id ? (clientNamesMap[e.client_id] || null) : null },
    }))
    setTodayEvents(enrichedEvents)

    // ── 4. Formulaires en attente (envoyés mais non complétés) ──
    const { data: coachFormIds, error: formIdsErr } = await supabase
      .from('formulaires')
      .select('id')
      .eq('coach_id', user.id)

    if (formIdsErr) console.error('[Dashboard] Erreur fetch formulaires ids:', formIdsErr.message)

    const formIds = (coachFormIds ?? []).map(f => f.id)
    let pendingCount = 0

    if (formIds.length > 0) {
      const { count, error: repErr } = await supabase
        .from('formulaire_reponses')
        .select('id', { count: 'exact', head: true })
        .eq('complete', false)
        .in('formulaire_id', formIds)

      if (repErr) console.error('[Dashboard] Erreur fetch réponses en attente:', repErr.message)
      pendingCount = count ?? 0
    }

    setPendingForms(pendingCount)

    // ── 5. Revenus (paiements_clients des 6 derniers mois) ──
    const sixMoisAgo = new Date()
    sixMoisAgo.setMonth(sixMoisAgo.getMonth() - 5)
    sixMoisAgo.setDate(1)
    sixMoisAgo.setHours(0, 0, 0, 0)

    const { data: paiementsData, error: paiementsErr } = await supabase
      .from('paiements_clients')
      .select('montant, date_paiement, statut')
      .eq('coach_id', user.id)
      .eq('statut', 'paye')
      .gte('date_paiement', sixMoisAgo.toISOString())
      .order('date_paiement', { ascending: true })

    if (paiementsErr) console.error('[Dashboard] Erreur fetch paiements:', paiementsErr.message)

    // Agréger par mois
    const revenusParMois = {}
    const moisActuel = today.getMonth()
    const anneeActuelle = today.getFullYear()

    // Initialiser les 6 derniers mois
    for (let i = 5; i >= 0; i--) {
      const d = new Date(anneeActuelle, moisActuel - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      revenusParMois[key] = { label: MOIS_COURTS[d.getMonth()], value: 0, month: d.getMonth(), year: d.getFullYear() }
    }

    ;(paiementsData ?? []).forEach(p => {
      const d = new Date(p.date_paiement)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (revenusParMois[key]) {
        revenusParMois[key].value += Math.round((p.montant ?? 0) / 100) // centimes → euros
      }
    })

    const revenueArray = Object.values(revenusParMois).map((r, i, arr) => ({
      ...r,
      highlight: i === arr.length - 1, // mois actuel en orange
    }))
    setRevenueData(revenueArray)

    // Revenus mois actuel vs précédent
    const revenuMoisActuel = revenueArray[revenueArray.length - 1]?.value ?? 0
    const revenuMoisPrecedent = revenueArray.length >= 2 ? revenueArray[revenueArray.length - 2]?.value ?? 0 : 0

    // ── 6. Calculer les stats ──
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

  // ── Premier chargement ──
  useEffect(() => { chargerDonnees() }, [chargerDonnees])

  // ══════════════════════════════════════
  // TEMPS RÉEL — Subscriptions Supabase
  // ══════════════════════════════════════
  useEffect(() => {
    if (!user) return

    // Channel unique pour le dashboard — silent refresh (pas de skeleton)
    const silentRefresh = () => chargerDonnees(true)

    const channel = supabase
      .channel('dashboard-realtime')
      // Séances modifiées
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'seances',
        filter: `coach_id=eq.${user.id}`,
      }, silentRefresh)
      // Events modifiés
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'coach_events',
        filter: `coach_id=eq.${user.id}`,
      }, silentRefresh)
      // Nouveaux clients
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'clients',
        filter: `coach_id=eq.${user.id}`,
      }, silentRefresh)
      // Prospects
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'prospects',
        filter: `coach_id=eq.${user.id}`,
      }, silentRefresh)
      // Paiements
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'paiements_clients',
        filter: `coach_id=eq.${user.id}`,
      }, silentRefresh)
      // Réponses formulaires
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'formulaire_reponses',
      }, silentRefresh)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, chargerDonnees])

  // ══════════════════════════════════════
  // DONNÉES DÉRIVÉES
  // ══════════════════════════════════════

  // Planning combiné : séances + events du jour, triés par heure
  const todayPlanning = useMemo(() => {
    const items = []

    // Séances (is_completed existe via ALTER TABLE)
    todaySeances.forEach(s => {
      items.push({
        id: s.id,
        type: 'seance',
        label: s.titre || 'Séance',
        clientName: s.profiles?.nom ?? 'Client',
        time: null, // seances n'ont pas d'heure, juste date
        isCompleted: !!s.is_completed,
        clientId: s.client_id,
      })
    })

    // Events
    todayEvents.forEach(e => {
      const d = new Date(e.event_date)
      const hh = d.getHours().toString().padStart(2, '0')
      const mm = d.getMinutes().toString().padStart(2, '0')
      items.push({
        id: e.id,
        type: e.event_type,
        label: e.title,
        clientName: e.profiles?.nom ?? null,
        time: `${hh}:${mm}`,
        isCompleted: false,
        clientId: e.client_id,
      })
    })

    // Trier : ceux avec heure d'abord, puis par heure
    items.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time)
      if (a.time && !b.time) return -1
      if (!a.time && b.time) return 1
      return 0
    })

    return items
  }, [todaySeances, todayEvents])

  // Évolution revenus
  const revenueEvolution = useMemo(() => {
    if (stats.revenuMoisPrecedent === 0) return null
    const diff = stats.revenuMoisActuel - stats.revenuMoisPrecedent
    const pct = Math.round((diff / stats.revenuMoisPrecedent) * 100)
    return { diff, pct, positive: diff >= 0 }
  }, [stats.revenuMoisActuel, stats.revenuMoisPrecedent])

  // Total revenus affiché
  const totalRevenu6Mois = useMemo(() => revenueData.reduce((sum, r) => sum + r.value, 0), [revenueData])

  // ── Date formatée ──
  const jourSemaine = today.toLocaleDateString('fr-FR', { weekday: 'long' })
  const jourMois = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const dateAffichee = `${jourSemaine.charAt(0).toUpperCase() + jourSemaine.slice(1)} ${jourMois}`

  const prenom = coachProfile?.prenom ?? 'Coach'

  // ══════════════════════════════════════
  // SKELETON LOADING
  // ══════════════════════════════════════
  if (loading) {
    return (
      <div className="p-6 space-y-6 w-full animate-pulse">
        <div className="h-32 bg-[#27272a]/50 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-[#27272a]/50 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-64 bg-[#27272a]/50 rounded-xl" />
          <div className="h-64 bg-[#27272a]/50 rounded-xl" />
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a2e] via-[#16162a] to-[#0f0f1a] border border-[#27272a] p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6B2B]/8 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-purple-500/5 rounded-full blur-[60px] pointer-events-none" />

        <div className="relative flex items-center gap-5">
          <div className="hidden md:flex w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B2B] to-[#FF9A6C] items-center justify-center flex-shrink-0 shadow-lg shadow-[#FF6B2B]/20">
            <Flame size={32} className="text-white" />
          </div>

          <div className="flex-1">
            <h1 className="text-[#F5F5F3] text-xl md:text-2xl font-bold">
              Bienvenue {prenom} <span className="inline-block">👋</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">
              {todayPlanning.length > 0
                ? `${todayPlanning.length} tâche${todayPlanning.length > 1 ? 's' : ''} prévue${todayPlanning.length > 1 ? 's' : ''} — ${dateAffichee}`
                : `Aucune tâche prévue — ${dateAffichee}`
              }
            </p>
          </div>

          {/* Quick stat badges */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-[#27272a]">
              <Zap size={14} className="text-[#FF6B2B]" />
              <span className="text-[#F5F5F3] text-sm font-semibold">{stats.actifs}</span>
              <span className="text-white/30 text-xs">clients</span>
            </div>
            {pendingForms > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
                <FileText size={14} className="text-amber-400" />
                <span className="text-amber-300 text-sm font-semibold">{pendingForms}</span>
                <span className="text-amber-400/50 text-xs">en attente</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* 4 STAT CARDS                           */}
      {/* ══════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Clients actifs', value: stats.actifs, icon: Users, iconColor: 'text-[#FF6B2B]', iconBg: 'bg-[#FF6B2B]/10' },
          { label: 'Séances aujourd\'hui', value: stats.seancesAujourdhui, icon: Calendar, iconColor: 'text-green-400', iconBg: 'bg-green-500/10' },
          { label: 'Prospects', value: stats.prospects, icon: Target, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10' },
          {
            label: 'Revenus ce mois',
            value: stats.mrr > 0 ? `${stats.mrr}€` : '0€',
            icon: DollarSign,
            iconColor: 'text-amber-400',
            iconBg: 'bg-amber-500/10',
            evolution: revenueEvolution,
          },
        ].map((s, i) => (
          <div key={i} className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 hover:border-[#3f3f46] transition-colors">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.iconBg}`}>
                <s.icon size={16} className={s.iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/35 text-[11px]">{s.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-[#F5F5F3] text-xl font-bold">{s.value}</p>
                  {s.evolution && (
                    <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${s.evolution.positive ? 'text-green-400' : 'text-red-400'}`}>
                      {s.evolution.positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {s.evolution.positive ? '+' : ''}{s.evolution.pct}%
                    </span>
                  )}
                </div>
              </div>
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

          {/* ── Carte Activité du jour ── */}
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[#F5F5F3] text-base font-semibold">Activité du jour</h2>
              <button
                onClick={chargerDonnees}
                className="p-1.5 rounded-lg text-white/20 hover:text-white/40 hover:bg-white/[0.04] transition-colors"
                title="Rafraîchir"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Séances aujourd'hui */}
              <div className="flex items-center gap-4 bg-[#18181b] rounded-xl p-4 border border-[#27272a]/50">
                <div className="w-12 h-12 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center">
                  <Dumbbell size={22} className="text-[#FF6B2B]" />
                </div>
                <div>
                  <p className="text-[#F5F5F3] text-2xl font-bold">{todaySeances.length}</p>
                  <p className="text-white/30 text-xs">séance{todaySeances.length !== 1 ? 's' : ''} prévue{todaySeances.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Events du jour */}
              <div className="flex items-center gap-4 bg-[#18181b] rounded-xl p-4 border border-[#27272a]/50">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Calendar size={22} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-[#F5F5F3] text-2xl font-bold">{todayEvents.length}</p>
                  <p className="text-white/30 text-xs">événement{todayEvents.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Formulaires en attente */}
              <div className="flex items-center gap-4 bg-[#18181b] rounded-xl p-4 border border-[#27272a]/50">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <FileText size={22} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-[#F5F5F3] text-2xl font-bold">{pendingForms}</p>
                  <p className="text-white/30 text-xs">formulaire{pendingForms !== 1 ? 's' : ''} en attente</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Carte Suivi des Revenus ── */}
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[#F5F5F3] text-base font-semibold">Suivi des Revenus</h2>
                <p className="text-white/25 text-xs mt-0.5">6 derniers mois — Total : {totalRevenu6Mois > 0 ? `${totalRevenu6Mois.toLocaleString('fr-FR')}€` : '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                {revenueEvolution && (
                  <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    revenueEvolution.positive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {revenueEvolution.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {revenueEvolution.positive ? '+' : ''}{revenueEvolution.pct}% vs mois dernier
                  </span>
                )}
                <button
                  onClick={() => navigate('/coach/statistiques')}
                  className="p-1.5 rounded-lg text-white/20 hover:text-white/40 hover:bg-white/[0.04] transition-colors"
                >
                  <BarChart3 size={14} />
                </button>
              </div>
            </div>

            <div className="flex justify-center py-2 overflow-x-auto">
              <RevenueChart data={revenueData} />
            </div>
          </div>

          {/* ── Carte Prospects (données réelles) ── */}
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#F5F5F3] text-base font-semibold">Vos prospects</h2>
              <button
                onClick={() => navigate('/coach/prospects')}
                className="text-[#FF6B2B] text-xs font-medium hover:underline flex items-center gap-1"
              >
                Voir tout <ChevronRight size={12} />
              </button>
            </div>

            {prospects.length === 0 ? (
              <div className="text-center py-8">
                <Target size={28} className="text-white/10 mx-auto mb-2" />
                <p className="text-white/25 text-xs">Aucun prospect pour le moment</p>
                <button
                  onClick={() => navigate('/coach/prospects')}
                  className="mt-3 px-4 py-2 rounded-lg bg-[#FF6B2B]/10 text-[#FF6B2B] text-xs font-medium hover:bg-[#FF6B2B]/20 transition-colors"
                >
                  Ajouter un prospect
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Résumé par statut */}
                <div className="space-y-2.5">
                  <p className="text-white/25 text-[10px] uppercase tracking-wider font-semibold">Par statut</p>
                  {Object.entries(
                    prospects.reduce((acc, p) => {
                      acc[p.statut] = (acc[p.statut] || 0) + 1
                      return acc
                    }, {})
                  ).map(([statut, count]) => (
                    <div key={statut} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: STATUT_COLORS[statut] || '#71717a' }} />
                      <span className="text-white/50 text-sm flex-1 capitalize">{statut}</span>
                      <span className="text-[#F5F5F3] text-sm font-semibold">{count}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 pt-1 border-t border-[#27272a]">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0 bg-white/10" />
                    <span className="text-white/30 text-sm flex-1">Valeur totale</span>
                    <span className="text-[#FF6B2B] text-sm font-bold">
                      {prospects.reduce((sum, p) => sum + (p.valeur_estimee || 0), 0)}€
                    </span>
                  </div>
                </div>

                {/* Derniers prospects */}
                <div className="space-y-2.5">
                  <p className="text-white/25 text-[10px] uppercase tracking-wider font-semibold">Récents</p>
                  {prospects.slice(0, 4).map((p, i) => {
                    const color = STATUT_COLORS[p.statut] || '#71717a'
                    const fullName = [p.prenom, p.nom].filter(Boolean).join(' ') || p.email || '?'
                    return (
                      <div key={p.id} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-white/50 text-sm flex-1 truncate">{fullName}</span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                          style={{ backgroundColor: `${color}15`, color }}
                        >
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

          {/* ── Planning d'aujourd'hui (données réelles) ── */}
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#F5F5F3] text-base font-semibold">Aujourd'hui</h2>
              {lastRefresh && (
                <span className="text-white/15 text-[10px]">
                  MàJ {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {todayPlanning.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle size={28} className="text-green-400/30 mx-auto mb-2" />
                <p className="text-white/25 text-xs">Journée libre !</p>
                <p className="text-white/15 text-[10px] mt-1">Aucune séance ni événement prévu</p>
              </div>
            ) : (
              <div className="space-y-1">
                {todayPlanning.map((item, i) => {
                  const meta = EVENT_META[item.type] || EVENT_META.autre
                  const IconComp = meta.icon
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => item.clientId ? navigate(`/coach/clients/${item.clientId}`) : null}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.03] transition-colors text-left group"
                    >
                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${meta.color}20` }}
                      >
                        <IconComp size={18} style={{ color: meta.color }} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[#F5F5F3] text-sm font-medium truncate">
                          {item.clientName ?? item.label}
                        </p>
                        <p className="text-white/25 text-[11px] mt-0.5">{meta.label}{item.label && item.clientName ? ` — ${item.label}` : ''}</p>
                      </div>

                      {/* Heure */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.isCompleted && (
                          <CheckCircle size={14} className="text-green-400" />
                        )}
                        <span className="text-white/30 text-xs font-medium">
                          {item.time ?? 'Journée'}
                        </span>
                      </div>

                      {/* Actions au hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {item.clientId && (
                          <div className="p-1 rounded-md hover:bg-white/[0.06]">
                            <Eye size={13} className="text-white/30" />
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            <button
              onClick={() => navigate('/coach/calendar')}
              className="w-full mt-3 py-2.5 rounded-xl border border-[#27272a] text-white/30 text-xs font-medium hover:text-white/50 hover:border-[#3f3f46] transition-colors flex items-center justify-center gap-2"
            >
              <Calendar size={13} />
              Voir le calendrier complet
            </button>
          </div>

          {/* ── Actions rapides ── */}
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5">
            <h2 className="text-[#F5F5F3] text-base font-semibold mb-4">Actions rapides</h2>
            <div className="space-y-2">
              {[
                { label: 'Nouveau client', icon: UserPlus, action: () => navigate('/coach/client-hub'), color: '#FF6B2B' },
                { label: 'Créer un programme', icon: Dumbbell, action: () => navigate('/coach/sport'), color: '#3b82f6' },
                { label: 'Envoyer un formulaire', icon: FileText, action: () => navigate('/coach/formulaires'), color: '#a855f7' },
                { label: 'Voir les stats', icon: TrendingUp, action: () => navigate('/coach/statistiques'), color: '#22c55e' },
              ].map((a, i) => (
                <button
                  key={i}
                  onClick={a.action}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors text-left group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${a.color}15` }}
                  >
                    <a.icon size={15} style={{ color: a.color }} />
                  </div>
                  <span className="text-[#F5F5F3] text-sm font-medium flex-1">{a.label}</span>
                  <ChevronRight size={13} className="text-white/15 group-hover:text-white/30 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* ── Derniers clients ── */}
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#F5F5F3] text-base font-semibold">Derniers clients</h2>
              <button
                onClick={() => navigate('/coach/client-hub')}
                className="text-[#FF6B2B] text-xs font-medium hover:underline"
              >
                Tous
              </button>
            </div>

            {clients.length === 0 ? (
              <div className="text-center py-6">
                <Users size={28} className="text-white/10 mx-auto mb-2" />
                <p className="text-white/25 text-xs">Aucun client</p>
              </div>
            ) : (
              <div className="space-y-1">
                {clients.slice(0, 5).map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/coach/clients/${c.id}`)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                      style={{ backgroundColor: COULEURS_AVATAR[i % COULEURS_AVATAR.length] }}
                    >
                      {initialesFrom(c.profiles?.nom)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#F5F5F3] text-sm font-medium truncate">
                        {c.profiles?.nom ?? c.profiles?.email}
                      </p>
                    </div>
                    <span className="text-white/20 text-[10px] flex-shrink-0">
                      {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
