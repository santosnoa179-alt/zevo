import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { usePageTransition } from '../../hooks/useAnimations'
import {
  Calendar, ChevronLeft, ChevronRight, Dumbbell, CheckCircle2,
  Loader2, Clock, X, FileText, Phone, CheckSquare, Users as UsersIcon,
  Star, Play, ArrowRight, CalendarPlus, CalendarCheck
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ClientBookingModal from '../../components/ClientBookingModal'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const EVENT_TYPES = {
  seance:  { label: 'Séance',     icon: Dumbbell,    color: 'var(--color-primary)' },
  bilan:   { label: 'Bilan',      icon: CheckSquare,  color: 'var(--color-primary)' },
  appel:   { label: 'Appel',      icon: Phone,        color: 'var(--color-primary-light)' },
  reunion: { label: 'Réunion',    icon: UsersIcon,    color: 'var(--color-primary-light)' },
  note:    { label: 'Note',       icon: FileText,     color: '#7A7A78' },
  perso:   { label: 'Personnel',  icon: Star,         color: '#7A7A78' },
  autre:   { label: 'Autre',      icon: Calendar,     color: '#7A7A78' },
  reservation: { label: 'Réservation', icon: CalendarCheck, color: 'var(--color-primary)' },
}

// ── Date helpers ──
function toLocalDateStr(input) {
  const d = input instanceof Date ? input : new Date(input)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

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
  return `${dates[0].toLocaleDateString('fr-FR', opts)} — ${dates[6].toLocaleDateString('fr-FR', opts)}`
}

// ══════════════════════════════════════
// COMPONENT
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
  const [selectedDay, setSelectedDay] = useState(null)
  const [exercices, setExercices] = useState([])
  const [loadingExos, setLoadingExos] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [coachId, setCoachId] = useState(null)
  const [clientReservations, setClientReservations] = useState([])

  const today = new Date()

  const allItems = useMemo(() => {
    const items = []
    seances.forEach(s => {
      const dateStr = s.date_prevue ? toLocalDateStr(s.date_prevue) : ''
      items.push({
        id: `s-${s.id}`, type: 'seance', dateStr,
        title: s.titre || 'Séance',
        color: s.is_completed ? 'var(--color-primary-light)' : 'var(--color-primary)',
        isCompleted: !!s.is_completed, original: s,
      })
    })
    events.forEach(e => {
      const dateStr = e.event_date ? toLocalDateStr(e.event_date) : ''
      const evType = EVENT_TYPES[e.event_type] || EVENT_TYPES.autre
      items.push({
        id: `e-${e.id}`, type: 'event', dateStr,
        title: e.title || evType.label,
        color: evType.color, isCompleted: false, original: e,
      })
    })
    clientReservations.forEach(r => {
      const dateStr = r.date_debut ? toLocalDateStr(r.date_debut) : ''
      items.push({
        id: `r-${r.id}`, type: 'event', dateStr,
        title: 'Réservation',
        color: 'var(--color-primary)', isCompleted: false,
        original: { ...r, event_type: 'reservation', title: 'Réservation', event_date: r.date_debut },
      })
    })
    return items
  }, [seances, events, clientReservations])

  const fetchData = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)

    // Fenetre de chargement : -180j / +365j autour d'aujourd'hui.
    // Evite de rapatrier des annees d'historique sur mobile.
    // Si un jour on veut permettre la nav au-dela, il faudra refetch
    // dynamiquement en fonction de offset (pour l'instant c'est rare).
    const now = new Date()
    const sinceDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const untilDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const [seancesRes, eventsRes, clientRes, reservRes] = await Promise.all([
      supabase.from('seances').select('*').eq('client_id', user.id).eq('is_template', false)
        .gte('date_prevue', sinceDate).lte('date_prevue', untilDate)
        .order('date_prevue', { ascending: true }),
      supabase.from('coach_events').select('*').eq('client_id', user.id)
        .gte('event_date', sinceDate).lte('event_date', untilDate)
        .order('event_date', { ascending: true }),
      supabase.from('clients').select('coach_id').eq('id', user.id).maybeSingle(),
      supabase.from('reservations').select('*').eq('client_id', user.id).eq('statut', 'confirmee')
        .gte('date_debut', sinceDate + 'T00:00:00').lte('date_debut', untilDate + 'T23:59:59')
        .order('date_debut', { ascending: true }),
    ])

    if (seancesRes.error) console.error('[ClientCalendar] Erreur séances:', seancesRes.error)
    if (eventsRes.error) console.error('[ClientCalendar] Erreur événements:', eventsRes.error)

    setSeances(seancesRes.data || [])
    setEvents(eventsRes.data || [])
    setClientReservations(reservRes.data || [])
    if (clientRes.data?.coach_id) setCoachId(clientRes.data.coach_id)
    if (!silent) setLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`client-cal-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seances', filter: `client_id=eq.${user.id}` }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coach_events', filter: `client_id=eq.${user.id}` }, () => fetchData(true))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, fetchData])

  const openSeanceDetail = async (seance) => {
    setSelectedEvent(null)
    setSelectedSeance(seance)
    setLoadingExos(true)
    const { data, error } = await supabase
      .from('seance_exercices')
      .select('*, exercices(nom, muscle_group), sport_seance_exercices(exercice_id, exercice_nom_custom)')
      .eq('seance_id', seance.id)
      .order('ordre')
    if (error) console.error('[ClientCalendar] Erreur exercices:', error)
    let rows = data || []
    // Résout le nom des exos Pro V3 (exercice_id legacy null) via la lib ExerciseDB
    const libIds = [...new Set(rows.map(r => r.sport_seance_exercices?.exercice_id).filter(Boolean))]
    if (libIds.length) {
      const { data: lib } = await supabase
        .from('exercises').select('id, name, name_fr, target_muscle').in('id', libIds)
      const libMap = Object.fromEntries((lib || []).map(e => [e.id, e]))
      rows = rows.map(r => {
        if (r.exercices?.nom) return r
        const li = r.sport_seance_exercices?.exercice_id ? libMap[r.sport_seance_exercices.exercice_id] : null
        const nom = r.sport_seance_exercices?.exercice_nom_custom || li?.name_fr || li?.name
        return nom ? { ...r, exercices: { nom, muscle_group: li?.target_muscle } } : r
      })
    }
    setExercices(rows)
    setLoadingExos(false)
  }

  const openEventDetail = (event) => {
    setSelectedSeance(null)
    setSelectedEvent(event)
  }

  const getItemsForDay = (date) => {
    const dateStr = toLocalDateStr(date)
    return allItems.filter(item => item.dateStr === dateStr)
  }

  const handleItemClick = (item) => {
    if (item.type === 'seance') openSeanceDetail(item.original)
    else openEventDetail(item.original)
  }

  const prev = () => setOffset(o => o - 1)
  const next = () => setOffset(o => o + 1)
  const goToday = () => setOffset(0)

  // ══════════ NAVIGATION BAR (shared between views) ══════════
  const NavBar = ({ label }) => (
    <div className="flex items-center justify-between">
      <button onClick={prev} className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all active:scale-90">
        <ChevronLeft size={18} />
      </button>
      <div className="text-center">
        <p className="text-[var(--text-primary)] text-sm font-bold capitalize tracking-tight">{label}</p>
        {offset !== 0 && (
          <button onClick={goToday} className="text-primary text-[10px] font-semibold hover:underline mt-0.5 transition-colors">
            Aujourd'hui
          </button>
        )}
      </div>
      <button onClick={next} className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all active:scale-90">
        <ChevronRight size={18} />
      </button>
    </div>
  )

  // ══════════ MONTH VIEW ══════════
  const renderMonth = () => {
    const { cells, monthLabel } = getMonthGrid(offset)

    return (
      <div className="space-y-3">
        <NavBar label={monthLabel} />

        {/* Day headers */}
        <div className="grid grid-cols-7">
          {JOURS.map(j => (
            <div key={j} className="text-center text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest py-1.5">{j}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 rounded-2xl overflow-hidden border border-[var(--border-base)]"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
          {cells.map(({ date, inMonth }, i) => {
            const isToday = isSameDay(date, today)
            const dayItems = getItemsForDay(date)
            const hasItems = dayItems.length > 0

            return (
              <div
                key={i}
                className={`relative min-h-[54px] p-1 transition-all border-b border-r border-[var(--border-subtle)] ${
                  inMonth ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-base)]'
                } ${hasItems ? 'cursor-pointer hover:bg-[var(--bg-surface)] active:scale-[0.97]' : ''}`}
                onClick={() => {
                  if (dayItems.length === 1) handleItemClick(dayItems[0])
                  else if (dayItems.length > 1) setSelectedDay({ date, items: dayItems })
                }}
              >
                {/* Today glow */}
                {isToday && (
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ boxShadow: 'inset 0 0 12px rgba(var(--color-primary-rgb),0.08)' }} />
                )}

                <div className="flex items-center justify-center">
                  <span className={`text-[11px] leading-none font-semibold tabular-nums ${
                    isToday
                      ? 'w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-md shadow-primary/25'
                      : inMonth
                        ? 'text-[var(--text-secondary)]'
                        : 'text-[var(--text-muted)] opacity-40'
                  }`}>
                    {date.getDate()}
                  </span>
                </div>

                {/* Event dots / pills */}
                <div className="mt-0.5 space-y-px">
                  {dayItems.slice(0, 2).map(item => (
                    <div
                      key={item.id}
                      className="truncate text-[7px] font-semibold px-1 py-[1px] rounded-sm leading-tight"
                      style={{ backgroundColor: `${item.color}15`, color: item.color }}
                      onClick={(ev) => { ev.stopPropagation(); handleItemClick(item) }}
                    >
                      {item.title}
                    </div>
                  ))}
                  {dayItems.length > 2 && (
                    <p className="text-[var(--text-muted)] text-[7px] text-center font-medium">+{dayItems.length - 2}</p>
                  )}
                </div>

                {/* Dot indicators for small screens when text is too small */}
                {hasItems && dayItems.length <= 2 && (
                  <div className="flex items-center justify-center gap-0.5 mt-0.5 sm:hidden">
                    {dayItems.map(item => (
                      <div key={item.id} className="w-1 h-1 rounded-full" style={{ backgroundColor: item.color }} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Today's events preview (quick glance under the calendar) */}
        {(() => {
          const todayItems = getItemsForDay(today)
          if (todayItems.length === 0 || offset !== 0) return null
          return (
            <div className="space-y-2">
              <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-bold px-1">
                Aujourd'hui
              </p>
              {todayItems.map(item => {
                const ItemIcon = item.type === 'seance'
                  ? (item.isCompleted ? CheckCircle2 : Dumbbell)
                  : (EVENT_TYPES[item.original.event_type] || EVENT_TYPES.autre).icon
                const itemColor = item.color

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98]"
                    style={{ background: `linear-gradient(135deg, ${itemColor}08, transparent)`, border: `1px solid ${itemColor}12` }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${itemColor}12` }}>
                      <ItemIcon size={16} style={{ color: itemColor }} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[var(--text-primary)] text-[13px] font-semibold truncate">{item.title}</p>
                      {item.isCompleted && (
                        <p className="text-primary/60 text-[10px] font-medium">Terminée</p>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          )
        })()}
      </div>
    )
  }

  // ══════════ WEEK VIEW ══════════
  const renderWeek = () => {
    const dates = getWeekDates(offset)
    const weekLabel = formatWeekRange(dates)

    return (
      <div className="space-y-3">
        <NavBar label={weekLabel} />

        <div className="space-y-2">
          {dates.map((date, i) => {
            const isToday = isSameDay(date, today)
            const dayItems = getItemsForDay(date)
            const dayLabel = date.toLocaleDateString('fr-FR', { weekday: 'short' })
            const dayNum = date.getDate()
            const monthLabel = date.toLocaleDateString('fr-FR', { month: 'short' })
            const isPast = date < today && !isToday

            return (
              <div
                key={i}
                className={`rounded-xl overflow-hidden transition-all ${
                  isToday
                    ? 'ring-1 ring-primary/20'
                    : ''
                }`}
                style={isToday ? { background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb),0.04), var(--bg-card))' } : {}}
              >
                <div className="flex gap-3 p-3">
                  {/* Date column */}
                  <div className={`flex flex-col items-center justify-start pt-0.5 w-12 flex-shrink-0 ${isPast ? 'opacity-40' : ''}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      isToday ? 'text-primary' : 'text-[var(--text-muted)]'
                    }`}>
                      {dayLabel}
                    </span>
                    <span className={`text-xl font-black leading-none mt-0.5 tabular-nums ${
                      isToday ? 'text-primary' : 'text-[var(--text-primary)]'
                    }`}>
                      {dayNum}
                    </span>
                    <span className="text-[8px] text-[var(--text-muted)] mt-0.5 uppercase">{monthLabel}</span>
                  </div>

                  {/* Events column */}
                  <div className="flex-1 min-w-0">
                    {dayItems.length === 0 ? (
                      <div className={`py-3 ${isPast ? 'opacity-40' : ''}`}>
                        <p className="text-[var(--text-muted)] text-[11px]">Rien de prévu</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {dayItems.map(item => {
                          if (item.type === 'seance') {
                            const s = item.original
                            return (
                              <button
                                key={item.id}
                                onClick={() => openSeanceDetail(s)}
                                className="w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-2.5 active:scale-[0.98]"
                                style={{
                                  background: s.is_completed ? 'rgba(var(--color-primary-rgb), 0.08)' : 'rgba(var(--color-primary-rgb),0.06)',
                                  borderLeft: `2px solid ${s.is_completed ? 'var(--color-primary-light)' : 'var(--color-primary)'}`,
                                }}
                              >
                                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                                  s.is_completed ? 'bg-primary-light/10' : 'bg-primary/10'
                                }`}>
                                  {s.is_completed
                                    ? <CheckCircle2 size={14} className="text-primary-light" />
                                    : <Dumbbell size={14} className="text-primary" />
                                  }
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[12px] font-semibold truncate ${
                                    s.is_completed ? 'text-primary-light/70' : 'text-[var(--text-primary)]'
                                  }`}>
                                    {s.titre}
                                  </p>
                                  {s.notes && !s.notes.startsWith('programme:') && (
                                    <p className="text-[var(--text-muted)] text-[9px] truncate mt-0.5">{s.notes}</p>
                                  )}
                                </div>
                                {s.is_completed && (
                                  <span className="text-primary-light/60 text-[8px] font-bold shrink-0 uppercase tracking-wider">Done</span>
                                )}
                              </button>
                            )
                          }

                          const e = item.original
                          const evType = EVENT_TYPES[e.event_type] || EVENT_TYPES.autre
                          const EvIcon = evType.icon
                          return (
                            <button
                              key={item.id}
                              onClick={() => openEventDetail(e)}
                              className="w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-2.5 active:scale-[0.98]"
                              style={{
                                background: `${evType.color}06`,
                                borderLeft: `2px solid ${evType.color}40`,
                              }}
                            >
                              <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${evType.color}12` }}>
                                <EvIcon size={14} style={{ color: evType.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[var(--text-primary)] text-[12px] font-semibold truncate">{e.title}</p>
                                <p className="text-[var(--text-muted)] text-[9px] mt-0.5">{evType.label}</p>
                              </div>
                              {e.event_date && (
                                <span className="text-[var(--text-muted)] text-[9px] shrink-0 tabular-nums">
                                  {new Date(e.event_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Separator line (except last) */}
                {i < 6 && <div className="h-px bg-[var(--border-subtle)] ml-16" />}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ══════════ SÉANCE DETAIL MODAL ══════════
  const renderSeanceModal = () => {
    if (!selectedSeance) return null
    const isDone = selectedSeance.is_completed

    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedSeance(null)} />
        <div className="relative z-[101] w-full sm:w-[480px] sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto bg-[var(--bg-base)] border border-[var(--border-base)]"
          style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.4)' }}>

          {/* Accent bar */}
          <div className="h-[3px] w-full rounded-t-2xl" style={{ background: isDone ? 'linear-gradient(90deg, var(--color-primary-light), var(--color-primary-light), transparent)' : 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light), transparent)' }} />

          {/* Handle bar (mobile) */}
          <div className="flex justify-center pt-2 pb-1 sm:hidden">
            <div className="w-8 h-1 rounded-full bg-[var(--border-base)]" />
          </div>

          {/* Header */}
          <div className="px-5 pt-3 pb-3 flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {isDone
                  ? <CheckCircle2 size={14} className="text-primary-light flex-shrink-0" />
                  : <Dumbbell size={14} className="text-primary flex-shrink-0" />
                }
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isDone ? 'text-primary-light/60' : 'text-primary/60'}`}>
                  {isDone ? 'Séance terminée' : 'Séance prévue'}
                </span>
              </div>
              <h3 className="text-[var(--text-primary)] text-lg font-bold leading-snug">{selectedSeance.titre}</h3>
            </div>
            <button onClick={() => setSelectedSeance(null)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors ml-2 flex-shrink-0">
              <X size={16} />
            </button>
          </div>

          <div className="px-5 pb-28 space-y-4">
            {/* Date info */}
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs">
              <Calendar size={13} className="flex-shrink-0" />
              <span className="capitalize">{new Date(selectedSeance.date_prevue).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>

            {selectedSeance.notes && !selectedSeance.notes.startsWith('programme:') && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[var(--bg-surface)]/50">
                <FileText size={13} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
                <p className="text-[var(--text-secondary)] text-xs leading-relaxed">{selectedSeance.notes}</p>
              </div>
            )}

            {/* Exercices */}
            <div>
              <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-bold mb-2.5">Exercices</p>
              {loadingExos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-primary" size={20} />
                </div>
              ) : exercices.length === 0 ? (
                <p className="text-[var(--text-muted)] text-xs text-center py-6">Aucun exercice détaillé</p>
              ) : (
                <div className="space-y-1.5">
                  {exercices.map((ex, i) => (
                    <div key={i} className="flex items-center gap-3 bg-[var(--bg-surface)]/60 rounded-xl px-3.5 py-2.5"
                      style={{ borderLeft: '2px solid rgba(var(--color-primary-rgb),0.15)' }}>
                      <div className="w-7 h-7 rounded-md bg-primary/8 flex items-center justify-center shrink-0">
                        <Dumbbell size={13} className="text-primary/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--text-primary)] text-[12px] font-medium truncate">
                          {ex.exercices?.nom || 'Exercice'}
                        </p>
                        {ex.exercices?.muscle_group && (
                          <p className="text-[var(--text-muted)] text-[9px]">{ex.exercices.muscle_group}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[9px] shrink-0 tabular-nums">
                        {ex.series && <span className="text-primary font-bold">{ex.series}x</span>}
                        {(ex.reps || ex.reps_cible) && <span className="text-[var(--text-muted)] font-medium">{ex.reps || ex.reps_cible} reps</span>}
                        {ex.repos && (
                          <span className="text-[var(--text-muted)] flex items-center gap-0.5">
                            <Clock size={8} />{ex.repos}s
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CTA */}
            {isDone ? (
              <button
                onClick={() => navigate(`/app/workout/${selectedSeance.id}`)}
                className="w-full py-3.5 rounded-xl text-primary text-[13px] font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2 bg-primary/10 border border-primary/20 hover:bg-primary/15"
              >
                <CheckCircle2 size={15} />
                Voir le résumé
              </button>
            ) : (
              <button
                onClick={() => navigate(`/app/workout/${selectedSeance.id}`)}
                className="w-full py-3.5 rounded-xl text-white text-[13px] font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                  boxShadow: '0 4px 20px rgba(var(--color-primary-rgb),0.3)',
                }}
              >
                <Play size={15} className="fill-white" />
                Commencer la séance
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ══════════ EVENT DETAIL MODAL ══════════
  const renderEventModal = () => {
    if (!selectedEvent) return null
    const evType = EVENT_TYPES[selectedEvent.event_type] || EVENT_TYPES.autre
    const EvIcon = evType.icon

    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
        <div className="relative z-[101] w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto bg-[var(--bg-base)] border border-[var(--border-base)]"
          style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.4)' }}>

          {/* Accent bar */}
          <div className="h-[3px] w-full rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${evType.color}, ${evType.color}80, transparent)` }} />

          <div className="flex justify-center pt-2 pb-1 sm:hidden">
            <div className="w-8 h-1 rounded-full bg-[var(--border-base)]" />
          </div>

          <div className="px-5 pt-3 pb-3 flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <EvIcon size={14} style={{ color: evType.color }} className="flex-shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${evType.color}80` }}>
                  {evType.label}
                </span>
              </div>
              <h3 className="text-[var(--text-primary)] text-lg font-bold leading-snug">{selectedEvent.title}</h3>
            </div>
            <button onClick={() => setSelectedEvent(null)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors ml-2 flex-shrink-0">
              <X size={16} />
            </button>
          </div>

          <div className="px-5 pb-28 space-y-3">
            {selectedEvent.event_date && (
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs">
                <Calendar size={13} className="flex-shrink-0" />
                <span className="capitalize">{new Date(selectedEvent.event_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                <span className="text-[var(--text-muted)] tabular-nums">
                  {new Date(selectedEvent.event_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            {selectedEvent.notes && (
              <div className="rounded-xl px-4 py-3 bg-[var(--bg-surface)]/50">
                <p className="text-[var(--text-secondary)] text-xs leading-relaxed">{selectedEvent.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ══════════ DAY MODAL ══════════
  const renderDayModal = () => {
    if (!selectedDay) return null
    const dayLabel = selectedDay.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

    return (
      <div className="fixed inset-0 z-[105] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedDay(null)} />
        <div className="relative z-[106] w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto bg-[var(--bg-base)] border border-[var(--border-base)]"
          style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.4)' }}>

          <div className="h-[3px] w-full rounded-t-2xl bg-gradient-to-r from-primary via-primary-light to-transparent" />

          <div className="flex justify-center pt-2 pb-1 sm:hidden">
            <div className="w-8 h-1 rounded-full bg-[var(--border-base)]" />
          </div>

          <div className="px-5 pt-3 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-primary" />
              <h3 className="text-[var(--text-primary)] font-bold text-sm capitalize">{dayLabel}</h3>
            </div>
            <button onClick={() => setSelectedDay(null)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="px-4 pb-28 space-y-1.5">
            {selectedDay.items.map(item => {
              if (item.type === 'seance') {
                const s = item.original
                return (
                  <button
                    key={item.id}
                    onClick={() => { setSelectedDay(null); openSeanceDetail(s) }}
                    className="w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 active:scale-[0.98]"
                    style={{
                      background: s.is_completed ? 'rgba(var(--color-primary-rgb), 0.08)' : 'rgba(var(--color-primary-rgb),0.06)',
                      borderLeft: `2px solid ${s.is_completed ? 'var(--color-primary-light)' : 'var(--color-primary)'}`,
                    }}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      s.is_completed ? 'bg-primary-light/10' : 'bg-primary/10'
                    }`}>
                      {s.is_completed
                        ? <CheckCircle2 size={15} className="text-primary-light" />
                        : <Dumbbell size={15} className="text-primary" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] font-semibold truncate ${
                        s.is_completed ? 'text-primary-light/70' : 'text-[var(--text-primary)]'
                      }`}>
                        {s.titre || 'Séance'}
                      </p>
                      {s.notes && !s.notes.startsWith('programme:') && (
                        <p className="text-[var(--text-muted)] text-[9px] truncate mt-0.5">{s.notes}</p>
                      )}
                    </div>
                    {s.is_completed && (
                      <span className="text-primary-light/50 text-[8px] font-bold shrink-0 uppercase">Done</span>
                    )}
                  </button>
                )
              }

              const e = item.original
              const evType = EVENT_TYPES[e.event_type] || EVENT_TYPES.autre
              const EvIcon = evType.icon
              return (
                <button
                  key={item.id}
                  onClick={() => { setSelectedDay(null); openEventDetail(e) }}
                  className="w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 active:scale-[0.98]"
                  style={{
                    background: `${evType.color}06`,
                    borderLeft: `2px solid ${evType.color}30`,
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${evType.color}12` }}>
                    <EvIcon size={15} style={{ color: evType.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-[12px] font-semibold truncate">{e.title}</p>
                    <p className="text-[var(--text-muted)] text-[9px] mt-0.5">{evType.label}</p>
                  </div>
                  {e.event_date && (
                    <span className="text-[var(--text-muted)] text-[9px] shrink-0 tabular-nums">
                      {new Date(e.event_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const pageTransition = usePageTransition()

  // ══════════ MAIN RENDER ══════════
  if (loading) {
    return (
      <div className="p-5 space-y-4 max-w-4xl mx-auto">
        {/* Header skeleton */}
        <div className="pt-2 space-y-2">
          <div className="h-7 w-40 skel-block rounded-lg" />
          <div className="h-3.5 w-56 skel-block rounded-lg" />
        </div>
        {/* Toggle skeleton */}
        <div className="flex justify-end">
          <div className="h-8 w-28 skel-block rounded-xl" />
        </div>
        {/* Grid skeleton */}
        <div className="h-[340px] skel-block rounded-2xl" />
      </div>
    )
  }

  return (
    <div className={`p-5 pb-28 space-y-4 max-w-4xl mx-auto ${pageTransition.className}`}>

      {/* ── Header ── */}
      <div className="pt-2 flex items-end justify-between">
        <div>
          <h1 className="text-[var(--text-primary)] text-xl font-bold tracking-tight flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            Calendrier
          </h1>
          <p className="text-[var(--text-muted)] text-[11px] mt-0.5">
            {allItems.length === 0
              ? 'Aucun événement prévu'
              : `${seances.length} séance${seances.length !== 1 ? 's' : ''}${events.length > 0 ? ` · ${events.length} événement${events.length !== 1 ? 's' : ''}` : ''}`
            }
          </p>
        </div>

        {/* View toggle */}
        <div className="flex bg-[var(--bg-surface)] rounded-xl p-0.5 border border-[var(--border-subtle)]">
          {[
            { id: 'month', label: 'Mois' },
            { id: 'week', label: 'Sem.' },
          ].map(v => (
            <button
              key={v.id}
              onClick={() => { setView(v.id); setOffset(0) }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                view === v.id
                  ? 'bg-primary text-white shadow-sm shadow-primary/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Calendar Content ── */}
      {view === 'month' ? renderMonth() : renderWeek()}

      {/* ── Modals ── */}
      {renderSeanceModal()}
      {renderEventModal()}
      {renderDayModal()}

      {/* ── Bouton flottant Réserver ── */}
      {coachId && (
        <button
          onClick={() => setBookingOpen(true)}
          className="fixed bottom-24 right-5 z-30 flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-lg active:scale-[0.95] transition-all"
          style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', boxShadow: '0 6px 20px rgba(var(--color-primary-rgb),0.35)' }}
        >
          <CalendarPlus size={18} /> Réserver
        </button>
      )}

      {/* ── Modal Booking ── */}
      <ClientBookingModal
        open={bookingOpen}
        onClose={() => { setBookingOpen(false); fetchData(true) }}
        coachId={coachId}
      />
    </div>
  )
}
