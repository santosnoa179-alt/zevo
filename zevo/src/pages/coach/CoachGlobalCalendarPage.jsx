import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Clock, User,
  Dumbbell, X, CheckSquare, Phone, FileText, Users as UsersIcon,
  Star, Loader2, Filter, Edit3, ExternalLink, AlignLeft, Save, Trash2
} from 'lucide-react'
import { useToast } from '../../components/ui/Toast'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const JOURS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const EVENT_TYPES = [
  { id: 'seance', label: 'Séance', icon: Dumbbell, color: '#FF6B2B' },
  { id: 'bilan', label: 'Bilan', icon: CheckSquare, color: '#22c55e' },
  { id: 'appel', label: 'Appel', icon: Phone, color: '#3b82f6' },
  { id: 'reunion', label: 'Réunion', icon: UsersIcon, color: '#a855f7' },
  { id: 'note', label: 'Note', icon: FileText, color: '#f59e0b' },
  { id: 'perso', label: 'Personnel', icon: Star, color: '#ec4899' },
  { id: 'autre', label: 'Autre', icon: Calendar, color: '#64748b' },
]

// ── Date helpers ──

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatHHmm(dateStr) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function getWeekDates(offset) {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getMonthGrid(offset) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + offset
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)

  // Lundi = 0, Dimanche = 6 (ISO)
  let startDay = first.getDay() - 1
  if (startDay < 0) startDay = 6

  const cells = []
  // Days from previous month
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(first)
    d.setDate(d.getDate() - i - 1)
    cells.push({ date: d, inMonth: false })
  }
  // Days in current month
  for (let i = 1; i <= last.getDate(); i++) {
    cells.push({ date: new Date(year, month, i), inMonth: true })
  }
  // Fill remaining to complete 6 rows (42 cells) or 5 rows (35 cells)
  const targetLen = cells.length > 35 ? 42 : 35
  while (cells.length < targetLen) {
    const next = new Date(last)
    next.setDate(next.getDate() + (cells.length - (startDay + last.getDate()) + 1))
    cells.push({ date: next, inMonth: false })
  }

  return { cells, monthLabel: first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), first, last }
}

function formatWeekRange(dates) {
  if (!dates.length) return ''
  const opts = { day: 'numeric', month: 'short' }
  return `${dates[0].toLocaleDateString('fr-FR', opts)} — ${dates[6].toLocaleDateString('fr-FR', opts)} ${dates[0].getFullYear()}`
}

// ── Hours for week view ──
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7h → 20h

// ══════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════

export default function CoachGlobalCalendarPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  // View state
  const [view, setView] = useState('month')
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)

  // Data
  const [seances, setSeances] = useState([])
  const [events, setEvents] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterClient, setFilterClient] = useState('')
  const [filterType, setFilterType] = useState('')

  // Month popover
  const [popoverDay, setPopoverDay] = useState(null)
  const popoverRef = useRef(null)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState(null)
  const [evtTitle, setEvtTitle] = useState('')
  const [evtDate, setEvtDate] = useState('')
  const [evtTime, setEvtTime] = useState('09:00')
  const [evtType, setEvtType] = useState('bilan')
  const [evtClient, setEvtClient] = useState('')
  const [evtNotes, setEvtNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Detail modals
  const [dayDetailDate, setDayDetailDate] = useState(null)     // Modal "tous les events d'un jour"
  const [detailSeance, setDetailSeance] = useState(null)       // Modal détail séance
  const [detailEvent, setDetailEvent] = useState(null)         // Modal détail event
  const [detailExos, setDetailExos] = useState([])             // Exercices de la séance
  const [loadingExos, setLoadingExos] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)      // Mode édition notes event
  const [editNotesValue, setEditNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ── Date ranges ──
  const weekDates = getWeekDates(weekOffset)
  const monthGrid = getMonthGrid(monthOffset)

  // Compute fetch range depending on view
  const getDateRange = useCallback(() => {
    if (view === 'week') {
      const wd = getWeekDates(weekOffset)
      const start = new Date(wd[0])
      start.setHours(0, 0, 0, 0)
      const end = new Date(wd[6])
      end.setHours(23, 59, 59, 999)
      return { start, end }
    } else {
      const mg = getMonthGrid(monthOffset)
      const start = new Date(mg.cells[0].date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(mg.cells[mg.cells.length - 1].date)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
  }, [view, weekOffset, monthOffset])

  // ── Data fetching ──
  // silent = true → pas de skeleton (pour les refresh realtime)
  const fetchData = useCallback(async (silent = false) => {
    if (!user?.id) return
    if (!silent) setLoading(true)
    const { start, end } = getDateRange()

    const startISO = start.toISOString().slice(0, 10) // YYYY-MM-DD pour date_prevue (type date)
    const endISO = end.toISOString().slice(0, 10)

    const [seancesRes, eventsRes, clientsRes] = await Promise.all([
      supabase
        .from('seances')
        .select('id, titre, date_prevue, client_id, is_completed, is_template')
        .eq('coach_id', user.id)
        .eq('is_template', false)
        .not('client_id', 'is', null)
        .gte('date_prevue', startISO)
        .lte('date_prevue', endISO)
        .order('date_prevue', { ascending: true }),
      supabase
        .from('coach_events')
        .select('id, title, event_date, event_type, client_id, notes')
        .eq('coach_id', user.id)
        .gte('event_date', start.toISOString())
        .lte('event_date', end.toISOString())
        .order('event_date', { ascending: true }),
      supabase
        .from('clients')
        .select('id, profiles(nom)')
        .eq('coach_id', user.id)
        .eq('actif', true),
    ])

    if (seancesRes.error) console.error('[Calendar] Erreur fetch séances:', seancesRes.error.message)
    if (eventsRes.error) console.error('[Calendar] Erreur fetch events:', eventsRes.error.message)

    // Résoudre les noms des clients pour les séances (pas de FK directe vers profiles)
    const seancesRaw = seancesRes.data ?? []
    const seanceClientIds = [...new Set(seancesRaw.map(s => s.client_id).filter(Boolean))]
    let clientNamesMap = {}
    if (seanceClientIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nom')
        .in('id', seanceClientIds)
      ;(profilesData ?? []).forEach(p => { clientNamesMap[p.id] = p.nom })
    }

    const enrichedSeances = seancesRaw.map(s => ({
      ...s,
      profiles: { nom: clientNamesMap[s.client_id] || null },
    }))

    setSeances(enrichedSeances)
    setEvents(eventsRes.data ?? [])
    setClients(clientsRes.data ?? [])
    setLoading(false)
  }, [user?.id, getDateRange])

  useEffect(() => { fetchData() }, [fetchData])

  // ══════════════════════════════════════
  // TEMPS RÉEL — Supabase Realtime
  // ══════════════════════════════════════
  useEffect(() => {
    if (!user?.id) return

    const silentRefresh = () => fetchData(true)

    const channel = supabase
      .channel('calendar-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'seances',
        filter: `coach_id=eq.${user.id}`,
      }, silentRefresh)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'coach_events',
        filter: `coach_id=eq.${user.id}`,
      }, silentRefresh)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id, fetchData])

  // Close popover on outside click
  useEffect(() => {
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setPopoverDay(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Client name lookup ──
  function getClientName(clientId) {
    if (!clientId) return null
    // Check enriched séances first
    const s = seances.find(s => s.client_id === clientId)
    if (s?.profiles?.nom) return s.profiles.nom
    // Fallback to clients list
    const c = clients.find(cl => cl.id === clientId)
    return c?.profiles?.nom || null
  }

  function getEventTypeInfo(typeId) {
    return EVENT_TYPES.find(t => t.id === typeId) || EVENT_TYPES[EVENT_TYPES.length - 1]
  }

  // ── Filter + merge items for a day ──
  function itemsForDay(date) {
    const daySeances = seances
      .filter(s => isSameDay(new Date(s.date_prevue), date))
      .map(s => ({ ...s, _type: 'seance', _time: s.date_prevue, _clientId: s.client_id }))
    const dayEvents = events
      .filter(e => isSameDay(new Date(e.event_date), date))
      .map(e => ({ ...e, _type: 'event', _time: e.event_date, _clientId: e.client_id }))

    let items = [...daySeances, ...dayEvents].sort((a, b) => new Date(a._time) - new Date(b._time))

    // Apply filters
    if (filterClient) items = items.filter(i => i._clientId === filterClient)
    if (filterType) {
      if (filterType === 'seance') items = items.filter(i => i._type === 'seance')
      else items = items.filter(i => i._type === 'event' && i.event_type === filterType)
    }

    return items
  }

  // ── Stats ──
  const allFiltered = (() => {
    const wd = view === 'week' ? weekDates : monthGrid.cells.filter(c => c.inMonth).map(c => c.date)
    return wd.flatMap(d => itemsForDay(d))
  })()
  const totalItems = allFiltered.length
  const uniqueClients = new Set(allFiltered.map(i => i._clientId).filter(Boolean)).size
  const itemsToday = itemsForDay(today).length

  // ── Navigation ──
  const goBack = () => view === 'week' ? setWeekOffset(o => o - 1) : setMonthOffset(o => o - 1)
  const goForward = () => view === 'week' ? setWeekOffset(o => o + 1) : setMonthOffset(o => o + 1)
  const goToday = () => { setWeekOffset(0); setMonthOffset(0) }
  const isAtToday = view === 'week' ? weekOffset === 0 : monthOffset === 0
  const navLabel = view === 'week' ? formatWeekRange(weekDates) : monthGrid.monthLabel.charAt(0).toUpperCase() + monthGrid.monthLabel.slice(1)

  // ── Modal création ──
  const openNewModal = (prefilledDate = null) => {
    setModalType(null)
    setEvtTitle('')
    setEvtDate(prefilledDate || new Date().toISOString().split('T')[0])
    setEvtTime('09:00')
    setEvtType('bilan'); setEvtClient(''); setEvtNotes('')
    setModalOpen(true)
  }

  const saveEvent = async () => {
    if (!evtTitle.trim() || !evtDate) return
    setSaving(true)
    const eventDate = new Date(`${evtDate}T${evtTime}:00`)
    await supabase.from('coach_events').insert({
      coach_id: user.id, client_id: evtClient || null,
      title: evtTitle.trim(), event_date: eventDate.toISOString(),
      event_type: evtType, notes: evtNotes.trim() || null,
    })
    setSaving(false); setModalOpen(false); fetchData()
  }

  // ── Clic sur une case de jour (click-to-add) ──
  const handleDayClick = (date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    openNewModal(dateStr)
  }

  // ── Ouvrir le détail d'un jour (tous les items) ──
  const openDayDetail = (date, e) => {
    e.stopPropagation()
    setDayDetailDate(date)
  }

  // ── Ouvrir le détail d'une séance ──
  const openSeanceDetail = async (seance, e) => {
    e.stopPropagation()
    setDetailSeance(seance)
    setDetailExos([])
    setLoadingExos(true)
    const { data } = await supabase
      .from('seance_exercices')
      .select('id, series, reps, poids, repos, ordre, exercices(nom, muscle_group, equipment)')
      .eq('seance_id', seance.id)
      .order('ordre')
    setDetailExos(data || [])
    setLoadingExos(false)
  }

  // ── Ouvrir le détail d'un event ──
  const openEventDetail = (evt, e) => {
    e.stopPropagation()
    setDetailEvent(evt)
    setEditingNotes(false)
    setEditNotesValue(evt.notes || '')
  }

  // ── Sauvegarder les notes éditées d'un event ──
  const saveEventNotes = async () => {
    if (!detailEvent) return
    setSavingNotes(true)
    const { error } = await supabase
      .from('coach_events')
      .update({ notes: editNotesValue.trim() || null })
      .eq('id', detailEvent.id)
    if (!error) {
      setDetailEvent(prev => ({ ...prev, notes: editNotesValue.trim() || null }))
      setEditingNotes(false)
      fetchData(true)
    }
    setSavingNotes(false)
  }

  // ── Supprimer une séance ──
  const handleDeleteSeance = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette séance ?')) return
    const { error } = await supabase.from('seances').delete().eq('id', id)
    if (error) {
      console.error('[Calendar] Erreur DELETE séance:', error.message)
      toast.error('Erreur lors de la suppression')
    } else {
      toast.success('Séance supprimée')
      setDetailSeance(null)
      fetchData(true)
    }
  }

  // ── Supprimer un événement ──
  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet événement ?')) return
    const { error } = await supabase.from('coach_events').delete().eq('id', id)
    if (error) {
      console.error('[Calendar] Erreur DELETE event:', error.message)
      toast.error('Erreur lors de la suppression')
    } else {
      toast.success('Événement supprimé')
      setDetailEvent(null)
      fetchData(true)
    }
  }

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════

  if (loading) {
    return (
      <div className="p-4 md:p-6 w-full space-y-5 max-w-[1400px]">
        <div className="flex items-center justify-between">
          <div className="h-8 w-56 bg-[#27272a] rounded-lg animate-pulse" />
          <div className="h-10 w-40 bg-[#27272a] rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-7 gap-px bg-[#27272a] rounded-xl overflow-hidden">
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="bg-[#09090b] p-3 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 w-full space-y-4 max-w-[1400px]">

      {/* ═══════ HEADER ═══════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-[#FF6B2B]" />
          <h1 className="text-xl md:text-2xl font-bold text-[#F5F5F3]">Calendrier</h1>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 bg-[#FF6B2B] hover:bg-[#e55e24] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Nouvel événement
        </button>
      </div>

      {/* ═══════ TOOLBAR : Nav + Toggle + Filtres ═══════ */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">

        {/* Navigation */}
        <div className="flex items-center gap-2 bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 flex-1 min-w-0">
          <button onClick={goBack} className="p-1 rounded-lg hover:bg-[#27272a] text-white/40 hover:text-white transition-colors flex-shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-[#F5F5F3] flex-1 text-center truncate">{navLabel}</span>
          {!isAtToday && (
            <button onClick={goToday} className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-semibold hover:bg-[#FF6B2B]/20 transition-colors flex-shrink-0 whitespace-nowrap">
              Aujourd'hui
            </button>
          )}
          <button onClick={goForward} className="p-1 rounded-lg hover:bg-[#27272a] text-white/40 hover:text-white transition-colors flex-shrink-0">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Toggle Mois / Semaine */}
        <div className="flex items-center bg-[#09090b] border border-[#27272a] rounded-xl p-1 flex-shrink-0">
          {[{ id: 'month', label: 'Mois' }, { id: 'week', label: 'Semaine' }].map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view === v.id
                  ? 'bg-[#FF6B2B] text-white shadow-sm'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="appearance-none bg-[#09090b] border border-[#27272a] rounded-xl pl-8 pr-4 py-2 text-xs text-[#F5F5F3] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors cursor-pointer min-w-[130px]"
            >
              <option value="">Tous les clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.profiles?.nom || 'Client'}</option>
              ))}
            </select>
            <User className="w-3.5 h-3.5 text-white/30 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none bg-[#09090b] border border-[#27272a] rounded-xl pl-8 pr-4 py-2 text-xs text-[#F5F5F3] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors cursor-pointer min-w-[130px]"
            >
              <option value="">Tous les types</option>
              {EVENT_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-white/30 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ═══════ STATS ═══════ */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: view === 'week' ? 'Cette semaine' : 'Ce mois', value: totalItems, icon: Calendar, color: '#FF6B2B' },
          { label: 'Clients', value: uniqueClients, icon: User, color: '#3b82f6' },
          { label: "Aujourd'hui", value: itemsToday, icon: Clock, color: '#22c55e' },
        ].map((s, i) => (
          <div key={i} className="bg-[#09090b] border border-[#27272a] rounded-xl p-3 flex items-center gap-3">
            <div className="p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: `${s.color}15` }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/40 truncate">{s.label}</p>
              <p className="text-lg font-bold text-[#F5F5F3] leading-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════ CALENDAR VIEWS ═══════ */}

      {view === 'month' ? (
        /* ────────── VUE MOIS ────────── */
        <div className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden">
          {/* Jours header */}
          <div className="grid grid-cols-7 border-b border-[#27272a]">
            {JOURS.map(j => (
              <div key={j} className="px-2 py-2 text-center text-[10px] font-semibold text-white/30 uppercase tracking-wider">{j}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7">
            {monthGrid.cells.map((cell, idx) => {
              const isTo = isSameDay(cell.date, today)
              const dayItems = itemsForDay(cell.date)
              const maxShow = 2
              const overflow = dayItems.length - maxShow

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(cell.date)}
                  className={`relative border-b border-r border-[#27272a] min-h-[90px] md:min-h-[100px] p-1.5 flex flex-col cursor-pointer transition-colors hover:bg-white/[0.02] ${
                    cell.inMonth ? '' : 'bg-[#0a0a0a] hover:bg-[#0e0e0e]'
                  } ${isTo ? 'bg-[#FF6B2B]/[0.04] hover:bg-[#FF6B2B]/[0.07]' : ''}`}
                >
                  {/* Date number — clic ouvre le détail jour si items */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      onClick={(e) => { if (dayItems.length > 0) openDayDetail(cell.date, e) }}
                      className={`text-xs font-medium leading-none ${
                        isTo ? 'w-6 h-6 flex items-center justify-center rounded-full bg-[#FF6B2B] text-white text-[11px] font-bold'
                          : cell.inMonth ? 'text-white/60' : 'text-white/20'
                      } ${dayItems.length > 0 ? 'hover:underline' : ''}`}
                    >
                      {cell.date.getDate()}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-[9px] text-white/25 font-medium">{dayItems.length}</span>
                    )}
                  </div>

                  {/* Compact events — stopPropagation pour ne pas trigger le click-to-add */}
                  <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
                    {dayItems.slice(0, maxShow).map((item) => {
                      if (item._type === 'seance') {
                        return (
                          <div
                            key={`s-${item.id}`}
                            onClick={(e) => openSeanceDetail(item, e)}
                            className="flex items-center gap-1 px-1 py-0.5 rounded bg-[#FF6B2B]/10 truncate cursor-pointer hover:bg-[#FF6B2B]/20 transition-colors"
                          >
                            <Dumbbell className="w-2.5 h-2.5 text-[#FF6B2B] flex-shrink-0" />
                            <span className="text-[10px] text-[#F5F5F3] truncate">{item.profiles?.nom || item.titre}</span>
                          </div>
                        )
                      } else {
                        const ti = getEventTypeInfo(item.event_type)
                        const TI = ti.icon
                        return (
                          <div
                            key={`e-${item.id}`}
                            onClick={(e) => openEventDetail(item, e)}
                            className="flex items-center gap-1 px-1 py-0.5 rounded truncate cursor-pointer hover:brightness-125 transition-all"
                            style={{ backgroundColor: `${ti.color}15` }}
                          >
                            <TI className="w-2.5 h-2.5 flex-shrink-0" style={{ color: ti.color }} />
                            <span className="text-[10px] text-[#F5F5F3] truncate">{getClientName(item.client_id) || item.title}</span>
                          </div>
                        )
                      }
                    })}

                    {/* "+X autres" → ouvre la modale détail jour */}
                    {overflow > 0 && (
                      <button
                        onClick={(e) => openDayDetail(cell.date, e)}
                        className="text-[10px] text-[#FF6B2B] font-semibold hover:text-[#FF9A6C] px-1 py-0.5 text-left transition-colors"
                      >
                        +{overflow} autre{overflow > 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ────────── VUE SEMAINE ────────── */
        <div className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden">
          {/* All-day section */}
          {(() => {
            const hasAllDay = weekDates.some(d => {
              const items = itemsForDay(d)
              return items.some(i => i._type === 'seance')
            })
            if (!hasAllDay) return null

            return (
              <div className="border-b border-[#27272a]">
                <div className="grid grid-cols-[60px_repeat(7,1fr)]">
                  <div className="p-2 border-r border-[#27272a] flex items-center justify-center">
                    <span className="text-[9px] text-white/25 uppercase font-semibold">Séances</span>
                  </div>
                  {weekDates.map((date, idx) => {
                    const daySeances = itemsForDay(date).filter(i => i._type === 'seance')
                    return (
                      <div key={idx} className={`p-1.5 border-r border-[#27272a] last:border-r-0 min-h-[40px] ${isSameDay(date, today) ? 'bg-[#FF6B2B]/[0.03]' : ''}`}>
                        <div className="flex flex-col gap-1">
                          {daySeances.map(s => (
                            <div
                              key={`ad-${s.id}`}
                              onClick={(e) => openSeanceDetail(s, e)}
                              className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 cursor-pointer hover:bg-[#FF6B2B]/20 transition-colors"
                            >
                              <Dumbbell className="w-2.5 h-2.5 text-[#FF6B2B] flex-shrink-0" />
                              <span className="text-[10px] font-medium text-[#F5F5F3] truncate">{s.titre}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Header row */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[#27272a]">
            <div className="p-2 border-r border-[#27272a]" />
            {weekDates.map((date, idx) => {
              const isTo = isSameDay(date, today)
              return (
                <div key={idx} className={`p-2 border-r border-[#27272a] last:border-r-0 text-center ${isTo ? 'bg-[#FF6B2B]/[0.03]' : ''}`}>
                  <p className="text-[10px] text-white/30 uppercase font-semibold">{JOURS[idx]}</p>
                  <p className={`text-sm font-bold mt-0.5 ${isTo ? 'text-[#FF6B2B]' : 'text-[#F5F5F3]'}`}>{date.getDate()}</p>
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ maxHeight: 560, overflowY: 'auto' }}>
            {HOURS.map(h => (
              <div key={h} className="contents">
                {/* Hour label */}
                <div className="h-[40px] border-r border-b border-[#27272a] flex items-start justify-end pr-2 pt-0.5">
                  <span className="text-[10px] text-white/25 font-medium tabular-nums">{String(h).padStart(2, '0')}:00</span>
                </div>
                {/* Day columns */}
                {weekDates.map((date, dIdx) => {
                  const isTo = isSameDay(date, today)
                  // Events that start at this hour
                  const dayEvts = itemsForDay(date).filter(i => i._type === 'event')
                  const hourEvts = dayEvts.filter(e => {
                    const eH = new Date(e.event_date).getHours()
                    return eH === h
                  })
                  return (
                    <div
                      key={dIdx}
                      onClick={() => handleDayClick(date)}
                      className={`h-[40px] border-r border-b border-[#27272a] last:border-r-0 relative cursor-pointer hover:bg-white/[0.02] transition-colors ${isTo ? 'bg-[#FF6B2B]/[0.02]' : ''}`}
                    >
                      {hourEvts.map(evt => {
                        const ti = getEventTypeInfo(evt.event_type)
                        const TI = ti.icon
                        return (
                          <div
                            key={`we-${evt.id}`}
                            onClick={(e) => openEventDetail(evt, e)}
                            className="absolute inset-x-0.5 top-0.5 rounded-md px-1.5 py-1 z-10 border cursor-pointer hover:brightness-125 transition-all"
                            style={{ backgroundColor: `${ti.color}20`, borderColor: `${ti.color}40` }}
                          >
                            <div className="flex items-center gap-1">
                              <TI className="w-2.5 h-2.5 flex-shrink-0" style={{ color: ti.color }} />
                              <span className="text-[10px] font-medium text-[#F5F5F3] truncate">{evt.title}</span>
                            </div>
                            {getClientName(evt.client_id) && (
                              <p className="text-[9px] text-white/35 truncate">{getClientName(evt.client_id)}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ MODAL ═══════ */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#09090b] border border-[#27272a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

              <div className="px-6 py-4 border-b border-[#27272a] flex items-center justify-between">
                <h2 className="text-[#F5F5F3] font-semibold text-base">
                  {modalType === null ? 'Nouvel événement' : 'Événement classique'}
                </h2>
                <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6">
                {modalType === null ? (
                  <div className="space-y-3">
                    <p className="text-white/40 text-sm mb-4">Quel type d'événement souhaitez-vous créer ?</p>
                    <button
                      onClick={() => navigate('/coach/client-hub')}
                      className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-[#27272a] hover:border-[#FF6B2B]/30 hover:bg-[#FF6B2B]/[0.03] transition-colors text-left"
                    >
                      <div className="w-11 h-11 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                        <Dumbbell size={20} className="text-[#FF6B2B]" />
                      </div>
                      <div>
                        <p className="text-[#F5F5F3] text-sm font-semibold">Séance de sport</p>
                        <p className="text-white/30 text-xs mt-0.5">Ouvrir l'éditeur de séances</p>
                      </div>
                      <ChevronRight size={16} className="text-white/15 ml-auto" />
                    </button>
                    <button
                      onClick={() => setModalType('event')}
                      className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-[#27272a] hover:border-[#3b82f6]/30 hover:bg-[#3b82f6]/[0.03] transition-colors text-left"
                    >
                      <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Calendar size={20} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="text-[#F5F5F3] text-sm font-semibold">Événement classique</p>
                        <p className="text-white/30 text-xs mt-0.5">Bilan, appel, réunion, note...</p>
                      </div>
                      <ChevronRight size={16} className="text-white/15 ml-auto" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/40 text-xs mb-1.5">Titre</label>
                      <input type="text" value={evtTitle} onChange={(e) => setEvtTitle(e.target.value)} placeholder="Ex: Bilan mensuel avec Noa" autoFocus
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-white/40 text-xs mb-1.5">Date</label>
                        <input type="date" value={evtDate} onChange={(e) => setEvtDate(e.target.value)}
                          className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-white/40 text-xs mb-1.5">Heure</label>
                        <input type="time" value={evtTime} onChange={(e) => setEvtTime(e.target.value)}
                          className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-white/40 text-xs mb-1.5">Type</label>
                      <div className="flex flex-wrap gap-2">
                        {EVENT_TYPES.filter(t => t.id !== 'seance').map((t) => (
                          <button key={t.id} onClick={() => setEvtType(t.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${evtType === t.id ? 'border-2' : 'border border-[#27272a] text-white/40 hover:text-white/60'}`}
                            style={evtType === t.id ? { borderColor: t.color, color: t.color, backgroundColor: `${t.color}10` } : {}}
                          >
                            <t.icon size={12} /> {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-white/40 text-xs mb-1.5">Client associé (optionnel)</label>
                      <select value={evtClient} onChange={(e) => setEvtClient(e.target.value)}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors">
                        <option value="">Aucun client</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.profiles?.nom || 'Client'}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-white/40 text-xs mb-1.5">Notes</label>
                      <textarea value={evtNotes} onChange={(e) => setEvtNotes(e.target.value)} placeholder="Notes optionnelles..." rows={2}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors resize-none" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setModalType(null)}
                        className="flex-1 py-2.5 rounded-xl text-sm text-white/40 bg-[#27272a] hover:bg-[#3f3f46] transition-colors">Retour</button>
                      <button onClick={saveEvent} disabled={!evtTitle.trim() || !evtDate || saving}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40">
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Créer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      {/* ═══════ MODAL DÉTAIL JOUR ═══════ */}
      {dayDetailDate && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setDayDetailDate(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#09090b] border border-[#27272a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#27272a] flex items-center justify-between">
                <h2 className="text-[#F5F5F3] font-semibold text-base">
                  {dayDetailDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h2>
                <button onClick={() => setDayDetailDate(null)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                {itemsForDay(dayDetailDate).length === 0 ? (
                  <p className="text-center text-white/25 text-sm py-8">Aucun événement ce jour</p>
                ) : itemsForDay(dayDetailDate).map(item => {
                  if (item._type === 'seance') {
                    return (
                      <button
                        key={`dd-s-${item.id}`}
                        onClick={(e) => { setDayDetailDate(null); openSeanceDetail(item, e) }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 hover:bg-[#FF6B2B]/15 transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-lg bg-[#FF6B2B]/20 flex items-center justify-center flex-shrink-0">
                          <Dumbbell size={16} className="text-[#FF6B2B]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#F5F5F3] truncate">{item.titre}</p>
                          <p className="text-[11px] text-white/35 mt-0.5">{item.profiles?.nom || 'Client'}</p>
                        </div>
                        {item.is_completed && <CheckSquare size={14} className="text-green-400 flex-shrink-0" />}
                      </button>
                    )
                  } else {
                    const ti = getEventTypeInfo(item.event_type)
                    const TI = ti.icon
                    return (
                      <button
                        key={`dd-e-${item.id}`}
                        onClick={(e) => { setDayDetailDate(null); openEventDetail(item, e) }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border hover:brightness-110 transition-all text-left"
                        style={{ backgroundColor: `${ti.color}10`, borderColor: `${ti.color}25` }}
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${ti.color}20` }}>
                          <TI size={16} style={{ color: ti.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#F5F5F3] truncate">{item.title}</p>
                          <p className="text-[11px] text-white/35 mt-0.5">
                            {formatHHmm(item.event_date)}{getClientName(item.client_id) ? ` — ${getClientName(item.client_id)}` : ''}
                          </p>
                        </div>
                      </button>
                    )
                  }
                })}
              </div>
              <div className="px-4 pb-4">
                <button
                  onClick={() => { setDayDetailDate(null); handleDayClick(dayDetailDate) }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#27272a] text-white/40 text-xs font-medium hover:text-white/60 hover:border-[#3f3f46] transition-colors"
                >
                  <Plus size={14} /> Ajouter un événement
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════ MODAL DÉTAIL SÉANCE ═══════ */}
      {detailSeance && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setDetailSeance(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#09090b] border border-[#27272a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#27272a] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                    <Dumbbell size={18} className="text-[#FF6B2B]" />
                  </div>
                  <div>
                    <h2 className="text-[#F5F5F3] font-semibold text-base">{detailSeance.titre}</h2>
                    <p className="text-white/35 text-xs mt-0.5">{detailSeance.profiles?.nom || 'Client'}</p>
                  </div>
                </div>
                <button onClick={() => setDetailSeance(null)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Infos */}
              <div className="px-6 py-4 border-b border-[#27272a] flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-white/30" />
                  <span className="text-sm text-[#F5F5F3]">
                    {new Date(detailSeance.date_prevue).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>
                {detailSeance.is_completed && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10">
                    <CheckSquare size={12} className="text-green-400" />
                    <span className="text-[11px] text-green-400 font-medium">Complétée</span>
                  </div>
                )}
              </div>

              {/* Exercices */}
              <div className="px-6 py-4 max-h-[300px] overflow-y-auto">
                <p className="text-white/40 text-[10px] uppercase tracking-wider font-semibold mb-3">
                  Exercices ({detailExos.length})
                </p>
                {loadingExos ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-[#FF6B2B]" />
                  </div>
                ) : detailExos.length === 0 ? (
                  <p className="text-center text-white/20 text-sm py-6">Aucun exercice ajouté</p>
                ) : (
                  <div className="space-y-2">
                    {detailExos.map((ex, i) => (
                      <div key={ex.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
                        <div className="w-7 h-7 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-bold text-[#FF6B2B]">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#F5F5F3] truncate">{ex.exercices?.nom || 'Exercice'}</p>
                          <p className="text-[11px] text-white/30 mt-0.5">
                            {ex.exercices?.muscle_group || ''}{ex.exercices?.equipment ? ` — ${ex.exercices.equipment}` : ''}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-[#F5F5F3] font-medium">{ex.series}×{ex.reps}</p>
                          <p className="text-[10px] text-white/25">{ex.poids ? `${ex.poids}kg` : ''}{ex.repos ? ` ${ex.repos}s` : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[#27272a] flex gap-2">
                <button
                  onClick={() => handleDeleteSeance(detailSeance.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-red-400 bg-red-500/10 hover:bg-red-500/15 transition-colors"
                >
                  <Trash2 size={14} /> Supprimer
                </button>
                <button
                  onClick={() => { setDetailSeance(null); navigate(`/coach/clients/${detailSeance.client_id}`) }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors"
                >
                  <ExternalLink size={14} /> Ouvrir la fiche client
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════ MODAL DÉTAIL ÉVÉNEMENT ═══════ */}
      {detailEvent && (() => {
        const ti = getEventTypeInfo(detailEvent.event_type)
        const TI = ti.icon
        return (
          <>
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setDetailEvent(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-[#09090b] border border-[#27272a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#27272a] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${ti.color}20` }}>
                      <TI size={18} style={{ color: ti.color }} />
                    </div>
                    <div>
                      <h2 className="text-[#F5F5F3] font-semibold text-base">{detailEvent.title}</h2>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${ti.color}15`, color: ti.color }}>
                        {ti.label}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setDetailEvent(null)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors">
                    <X size={18} />
                  </button>
                </div>

                {/* Infos */}
                <div className="px-6 py-4 border-b border-[#27272a] flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-white/30" />
                    <span className="text-sm text-[#F5F5F3]">
                      {new Date(detailEvent.event_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-white/30" />
                    <span className="text-sm text-[#F5F5F3]">{formatHHmm(detailEvent.event_date)}</span>
                  </div>
                  {getClientName(detailEvent.client_id) && (
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-white/30" />
                      <span className="text-sm text-[#F5F5F3]">{getClientName(detailEvent.client_id)}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AlignLeft size={14} className="text-white/30" />
                      <p className="text-white/40 text-[10px] uppercase tracking-wider font-semibold">Notes</p>
                    </div>
                    {!editingNotes && (
                      <button
                        onClick={() => { setEditingNotes(true); setEditNotesValue(detailEvent.notes || '') }}
                        className="flex items-center gap-1 text-[10px] text-[#FF6B2B] font-medium hover:text-[#FF9A6C] transition-colors"
                      >
                        <Edit3 size={11} /> Modifier
                      </button>
                    )}
                  </div>

                  {editingNotes ? (
                    <div className="space-y-3">
                      <textarea
                        value={editNotesValue}
                        onChange={(e) => setEditNotesValue(e.target.value)}
                        rows={4}
                        autoFocus
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-[#F5F5F3] placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors resize-none"
                        placeholder="Ajouter des notes..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingNotes(false)}
                          className="flex-1 py-2 rounded-xl text-sm text-white/40 bg-[#27272a] hover:bg-[#3f3f46] transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={saveEventNotes}
                          disabled={savingNotes}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40"
                        >
                          {savingNotes ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                          Enregistrer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 min-h-[60px]">
                      {detailEvent.notes ? (
                        <p className="text-sm text-[#F5F5F3] leading-relaxed whitespace-pre-wrap">{detailEvent.notes}</p>
                      ) : (
                        <p className="text-sm text-white/20 italic">Aucune note pour cet événement</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-4 flex gap-2">
                  <button
                    onClick={() => handleDeleteEvent(detailEvent.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-red-400 bg-red-500/10 hover:bg-red-500/15 transition-colors"
                  >
                    <Trash2 size={14} /> Supprimer
                  </button>
                  {detailEvent.client_id && (
                    <button
                      onClick={() => { setDetailEvent(null); navigate(`/coach/clients/${detailEvent.client_id}`) }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#27272a] text-white/40 text-sm font-medium hover:text-white/60 hover:border-[#3f3f46] transition-colors"
                    >
                      <ExternalLink size={14} /> Voir la fiche client
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}
