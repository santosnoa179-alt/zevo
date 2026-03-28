import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import {
  Calendar, ChevronLeft, ChevronRight, Dumbbell, CheckCircle2,
  Loader2, Clock, X, FileText, Phone, CheckSquare, Users as UsersIcon,
  Star
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

// Types d'événements (lecture seule, pour affichage)
const EVENT_TYPES = {
  seance:  { label: 'Séance',     icon: Dumbbell,    color: '#FF6B2B' },
  bilan:   { label: 'Bilan',      icon: CheckSquare,  color: '#22c55e' },
  appel:   { label: 'Appel',      icon: Phone,        color: '#3b82f6' },
  reunion: { label: 'Réunion',    icon: UsersIcon,    color: '#a855f7' },
  note:    { label: 'Note',       icon: FileText,     color: '#f59e0b' },
  perso:   { label: 'Personnel',  icon: Star,         color: '#ec4899' },
  autre:   { label: 'Autre',      icon: Calendar,     color: '#64748b' },
}

// ── Date helpers ──

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
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

  let startDay = first.getDay() - 1
  if (startDay < 0) startDay = 6

  const cells = []
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(first)
    d.setDate(d.getDate() - i - 1)
    cells.push({ date: d, inMonth: false })
  }
  for (let i = 1; i <= last.getDate(); i++) {
    cells.push({ date: new Date(year, month, i), inMonth: true })
  }
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

// ══════════════════════════════════════
// COMPONENT — Calendrier Client (lecture seule)
// ══════════════════════════════════════

export default function ClientCalendarPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [view, setView] = useState('month')
  const [offset, setOffset] = useState(0)
  const [seances, setSeances] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSeance, setSelectedSeance] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [exercices, setExercices] = useState([])
  const [loadingExos, setLoadingExos] = useState(false)

  const today = new Date()

  // ── Fusion séances + events dans un tableau normalisé ──
  // Chaque item a : { id, type, dateStr, title, color, original }
  const allItems = useMemo(() => {
    const items = []

    seances.forEach(s => {
      const dateStr = s.date_prevue?.slice(0, 10) || ''
      items.push({
        id: `s-${s.id}`,
        type: 'seance',
        dateStr,
        title: s.titre || 'Séance',
        color: s.is_completed ? '#22c55e' : '#FF6B2B',
        isCompleted: !!s.is_completed,
        original: s,
      })
    })

    events.forEach(e => {
      const dateStr = e.event_date?.slice(0, 10) || ''
      const evType = EVENT_TYPES[e.event_type] || EVENT_TYPES.autre
      items.push({
        id: `e-${e.id}`,
        type: 'event',
        dateStr,
        title: e.title || evType.label,
        color: evType.color,
        isCompleted: false,
        original: e,
      })
    })

    return items
  }, [seances, events])

  // ── Fetch séances + events ──
  const fetchData = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)

    const [seancesRes, eventsRes] = await Promise.all([
      supabase
        .from('seances')
        .select('*')
        .eq('client_id', user.id)
        .eq('is_template', false)
        .order('date_prevue', { ascending: true }),
      supabase
        .from('coach_events')
        .select('*')
        .eq('client_id', user.id)
        .order('event_date', { ascending: true }),
    ])

    if (seancesRes.error) {
      console.error('[ClientCalendar] Erreur chargement séances:', seancesRes.error)
    }
    if (eventsRes.error) {
      console.error('[ClientCalendar] Erreur chargement événements:', eventsRes.error)
    }

    console.log('[ClientCalendar] Séances:', seancesRes.data?.length ?? 0, '| Events:', eventsRes.data?.length ?? 0)

    setSeances(seancesRes.data || [])
    setEvents(eventsRes.data || [])

    if (!silent) setLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Realtime ──
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`client-cal-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'seances',
        filter: `client_id=eq.${user.id}`,
      }, () => fetchData(true))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'coach_events',
        filter: `client_id=eq.${user.id}`,
      }, () => fetchData(true))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, fetchData])

  // ── Open séance detail ──
  const openSeanceDetail = async (seance) => {
    setSelectedEvent(null)
    setSelectedSeance(seance)
    setLoadingExos(true)
    const { data, error } = await supabase
      .from('seance_exercices')
      .select('*, exercices(nom, muscle_group)')
      .eq('seance_id', seance.id)
      .order('ordre')
    if (error) {
      console.error('[ClientCalendar] Erreur chargement exercices:', error)
    }
    setExercices(data || [])
    setLoadingExos(false)
  }

  // ── Open event detail ──
  const openEventDetail = (event) => {
    setSelectedSeance(null)
    setSelectedEvent(event)
  }

  // ── Get items for a specific day (uses normalized allItems) ──
  const getItemsForDay = (date) => {
    const dateStr = date.toISOString().slice(0, 10)
    return allItems.filter(item => item.dateStr === dateStr)
  }

  // ── Handle item click ──
  const handleItemClick = (item) => {
    if (item.type === 'seance') openSeanceDetail(item.original)
    else openEventDetail(item.original)
  }

  // ── Navigation ──
  const prev = () => setOffset(o => o - 1)
  const next = () => setOffset(o => o + 1)
  const goToday = () => setOffset(0)

  // ══════════ MONTH VIEW ══════════
  const renderMonth = () => {
    const { cells, monthLabel } = getMonthGrid(offset)

    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <button onClick={prev} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-[#27272a] transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-[#F5F5F3] text-sm font-semibold capitalize">{monthLabel}</p>
            {offset !== 0 && (
              <button onClick={goToday} className="text-[#FF6B2B] text-[10px] font-medium hover:underline mt-0.5">
                Aujourd'hui
              </button>
            )}
          </div>
          <button onClick={next} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-[#27272a] transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {JOURS.map(j => (
            <div key={j} className="text-center text-[10px] text-white/25 font-semibold uppercase py-1">{j}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-[#27272a]/30 rounded-xl overflow-hidden border border-[#27272a]">
          {cells.map(({ date, inMonth }, i) => {
            const isToday = isSameDay(date, today)
            const dayItems = getItemsForDay(date)

            return (
              <div
                key={i}
                className={`min-h-[52px] sm:min-h-[72px] p-1 sm:p-1.5 transition-colors ${
                  inMonth ? 'bg-[#18181b]' : 'bg-[#0f0f10]'
                } ${dayItems.length > 0 ? 'cursor-pointer hover:bg-[#1e1e20]' : ''}`}
                onClick={() => {
                  if (dayItems.length === 1) handleItemClick(dayItems[0])
                }}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] sm:text-xs leading-none ${
                    isToday
                      ? 'bg-[#FF6B2B] text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center font-bold'
                      : inMonth ? 'text-white/50' : 'text-white/15'
                  }`}>
                    {date.getDate()}
                  </span>
                </div>

                <div className="mt-1 space-y-0.5">
                  {dayItems.slice(0, 2).map(item => (
                    <button
                      key={item.id}
                      onClick={(ev) => { ev.stopPropagation(); handleItemClick(item) }}
                      className="w-full text-left truncate text-[8px] sm:text-[9px] px-1 py-0.5 rounded leading-tight"
                      style={{ backgroundColor: `${item.color}20`, color: item.color }}
                    >
                      {item.title}
                    </button>
                  ))}
                  {dayItems.length > 2 && (
                    <p className="text-white/20 text-[8px] pl-1">+{dayItems.length - 2}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  // ══════════ WEEK VIEW ══════════
  const renderWeek = () => {
    const dates = getWeekDates(offset)
    const weekLabel = formatWeekRange(dates)

    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <button onClick={prev} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-[#27272a] transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-[#F5F5F3] text-sm font-semibold">{weekLabel}</p>
            {offset !== 0 && (
              <button onClick={goToday} className="text-[#FF6B2B] text-[10px] font-medium hover:underline mt-0.5">
                Aujourd'hui
              </button>
            )}
          </div>
          <button onClick={next} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-[#27272a] transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {dates.map((date, i) => {
            const isToday = isSameDay(date, today)
            const dayItems = getItemsForDay(date)
            const dayLabel = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })

            return (
              <div
                key={i}
                className={`bg-[#18181b] border rounded-xl overflow-hidden ${
                  isToday ? 'border-[#FF6B2B]/30' : 'border-[#27272a]'
                }`}
              >
                <div className={`px-3 py-2 flex items-center gap-2 ${isToday ? 'bg-[#FF6B2B]/5' : ''}`}>
                  <span className={`text-xs font-semibold capitalize ${isToday ? 'text-[#FF6B2B]' : 'text-white/40'}`}>
                    {dayLabel}
                  </span>
                  {isToday && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#FF6B2B]/15 text-[#FF6B2B] font-bold">
                      Aujourd'hui
                    </span>
                  )}
                </div>

                {dayItems.length === 0 ? (
                  <div className="px-3 py-3">
                    <p className="text-white/10 text-[10px]">Rien de prévu</p>
                  </div>
                ) : (
                  <div className="px-2 pb-2 space-y-1.5">
                    {dayItems.map(item => {
                      if (item.type === 'seance') {
                        const s = item.original
                        return (
                          <button
                            key={item.id}
                            onClick={() => openSeanceDetail(s)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 ${
                              s.is_completed
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/15'
                                : 'bg-[#FF6B2B]/5 hover:bg-[#FF6B2B]/10'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              s.is_completed ? 'bg-emerald-500/15' : 'bg-[#FF6B2B]/10'
                            }`}>
                              {s.is_completed
                                ? <CheckCircle2 size={16} className="text-emerald-400" />
                                : <Dumbbell size={16} className="text-[#FF6B2B]" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium truncate ${
                                s.is_completed ? 'text-emerald-300/80' : 'text-[#F5F5F3]'
                              }`}>
                                {s.titre}
                              </p>
                              {s.notes && !s.notes.startsWith('programme:') && (
                                <p className="text-white/15 text-[10px] truncate mt-0.5">{s.notes}</p>
                              )}
                            </div>
                            {s.is_completed && (
                              <span className="text-emerald-400 text-[9px] font-bold shrink-0">Terminée</span>
                            )}
                          </button>
                        )
                      }

                      // Event
                      const e = item.original
                      const evType = EVENT_TYPES[e.event_type] || EVENT_TYPES.autre
                      const EvIcon = evType.icon
                      return (
                        <button
                          key={item.id}
                          onClick={() => openEventDetail(e)}
                          className="w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 hover:bg-white/[0.03]"
                          style={{ backgroundColor: `${evType.color}08` }}
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${evType.color}15` }}>
                            <EvIcon size={16} style={{ color: evType.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#F5F5F3] text-xs font-medium truncate">{e.title}</p>
                            <p className="text-white/20 text-[10px] mt-0.5">{evType.label}</p>
                          </div>
                          {e.event_date && (
                            <span className="text-white/20 text-[9px] shrink-0">
                              {new Date(e.event_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </>
    )
  }

  // ══════════ SEANCE DETAIL MODAL — z-[100] pour passer au-dessus de la bottom nav ══════════
  const renderSeanceModal = () => {
    if (!selectedSeance) return null

    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={() => setSelectedSeance(null)} />
        <div className="relative z-[101] bg-[#18181b] border border-[#27272a] w-full sm:w-[480px] sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#18181b] border-b border-[#27272a] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedSeance.is_completed
                ? <CheckCircle2 size={16} className="text-emerald-400" />
                : <Dumbbell size={16} className="text-[#FF6B2B]" />
              }
              <h3 className="text-[#F5F5F3] font-semibold text-sm">{selectedSeance.titre}</h3>
            </div>
            <button onClick={() => setSelectedSeance(null)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-[#27272a] transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Contenu scrollable avec pb-24 pour ne pas coller le dernier exercice */}
          <div className="p-4 pb-24 space-y-4">
            {/* Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <Calendar size={13} />
                <span>{new Date(selectedSeance.date_prevue).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
              {selectedSeance.is_completed && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-medium">
                    Séance terminée
                    {selectedSeance.completed_at && (
                      <> le {new Date(selectedSeance.completed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</>
                    )}
                  </span>
                </div>
              )}
              {selectedSeance.notes && !selectedSeance.notes.startsWith('programme:') && (
                <div className="flex items-start gap-2 text-white/30 text-xs">
                  <FileText size={13} className="mt-0.5 shrink-0" />
                  <span>{selectedSeance.notes}</span>
                </div>
              )}
            </div>

            {/* Exercices */}
            <div>
              <p className="text-white/25 text-[10px] uppercase tracking-wider font-semibold mb-2">Exercices</p>
              {loadingExos ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="animate-spin text-[#FF6B2B]" size={20} />
                </div>
              ) : exercices.length === 0 ? (
                <p className="text-white/15 text-xs text-center py-4">Aucun exercice détaillé</p>
              ) : (
                <div className="space-y-1.5">
                  {exercices.map((ex, i) => (
                    <div key={i} className="flex items-center gap-3 bg-[#0f0f10] rounded-xl px-3.5 py-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center shrink-0">
                        <Dumbbell size={14} className="text-[#FF6B2B]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#F5F5F3] text-xs font-medium truncate">
                          {ex.exercices?.nom || 'Exercice'}
                        </p>
                        <p className="text-white/20 text-[10px]">{ex.exercices?.muscle_group}</p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] shrink-0">
                        {ex.series && <span className="text-[#FF6B2B] font-bold">{ex.series}x</span>}
                        {ex.reps && <span className="text-white/40">{ex.reps} reps</span>}
                        {ex.repos && (
                          <span className="text-white/20 flex items-center gap-0.5">
                            <Clock size={8} />{ex.repos}s
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bouton Commencer (si pas terminée) */}
            {!selectedSeance.is_completed && (
              <button
                onClick={() => navigate(`/app/workout/${selectedSeance.id}`)}
                className="w-full py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#e55a1b] transition-colors active:scale-[0.98] shadow-lg shadow-[#FF6B2B]/20 flex items-center justify-center gap-2"
              >
                <Dumbbell size={16} />
                Commencer la séance
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ══════════ EVENT DETAIL MODAL — z-[100] ══════════
  const renderEventModal = () => {
    if (!selectedEvent) return null

    const evType = EVENT_TYPES[selectedEvent.event_type] || EVENT_TYPES.autre
    const EvIcon = evType.icon

    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
        <div className="relative z-[101] bg-[#18181b] border border-[#27272a] w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#18181b] border-b border-[#27272a] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <EvIcon size={16} style={{ color: evType.color }} />
              <h3 className="text-[#F5F5F3] font-semibold text-sm">{selectedEvent.title}</h3>
            </div>
            <button onClick={() => setSelectedEvent(null)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-[#27272a] transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="p-4 pb-24 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-md text-[10px] font-bold" style={{ backgroundColor: `${evType.color}20`, color: evType.color }}>
                {evType.label}
              </span>
            </div>

            {selectedEvent.event_date && (
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <Calendar size={13} />
                <span>{new Date(selectedEvent.event_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                <span className="text-white/20">
                  {new Date(selectedEvent.event_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            {selectedEvent.notes && (
              <div className="bg-[#0f0f10] rounded-xl px-4 py-3">
                <p className="text-white/50 text-xs leading-relaxed">{selectedEvent.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ══════════ MAIN RENDER ══════════
  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#FF6B2B]" size={32} />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 max-w-3xl">

      {/* ── Header + View Toggle ── */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-[#F5F5F3] text-xl font-bold flex items-center gap-2">
            <Calendar size={20} className="text-[#FF6B2B]" />
            Calendrier
          </h1>
          <p className="text-white/40 text-sm mt-0.5">
            {allItems.length === 0
              ? 'Aucun événement pour le moment'
              : `${seances.length} séance${seances.length !== 1 ? 's' : ''} · ${events.length} événement${events.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>

        <div className="flex bg-[#18181b] border border-[#27272a] rounded-xl p-0.5">
          <button
            onClick={() => { setView('month'); setOffset(0) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === 'month'
                ? 'bg-[#FF6B2B] text-white shadow-lg shadow-[#FF6B2B]/20'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            Mois
          </button>
          <button
            onClick={() => { setView('week'); setOffset(0) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === 'week'
                ? 'bg-[#FF6B2B] text-white shadow-lg shadow-[#FF6B2B]/20'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            Semaine
          </button>
        </div>
      </div>

      {/* ── Calendar View ── */}
      {view === 'month' ? renderMonth() : renderWeek()}

      {/* ── Modals ── */}
      {renderSeanceModal()}
      {renderEventModal()}
    </div>
  )
}
