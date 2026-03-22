import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Clock, User,
  Dumbbell, X, CheckSquare, Phone, FileText, Users as UsersIcon,
  Star, Loader2
} from 'lucide-react'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const EVENT_TYPES = [
  { id: 'bilan', label: 'Bilan', icon: CheckSquare, color: '#22c55e' },
  { id: 'appel', label: 'Appel', icon: Phone, color: '#3b82f6' },
  { id: 'reunion', label: 'Réunion', icon: UsersIcon, color: '#a855f7' },
  { id: 'note', label: 'Note', icon: FileText, color: '#f59e0b' },
  { id: 'perso', label: 'Personnel', icon: Star, color: '#ec4899' },
  { id: 'autre', label: 'Autre', icon: Calendar, color: '#64748b' },
]

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

function formatHHmm(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateRange(dates) {
  if (!dates.length) return ''
  const opts = { day: 'numeric', month: 'short' }
  const start = dates[0].toLocaleDateString('fr-FR', opts)
  const end = dates[6].toLocaleDateString('fr-FR', opts)
  const year = dates[0].getFullYear()
  return `${start} — ${end} ${year}`
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function CoachGlobalCalendarPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [weekOffset, setWeekOffset] = useState(0)
  const [seances, setSeances] = useState([])
  const [events, setEvents] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState(null) // null = choice, 'event' = form

  // Event form state
  const [evtTitle, setEvtTitle] = useState('')
  const [evtDate, setEvtDate] = useState('')
  const [evtTime, setEvtTime] = useState('09:00')
  const [evtType, setEvtType] = useState('bilan')
  const [evtClient, setEvtClient] = useState('')
  const [evtNotes, setEvtNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const weekDates = getWeekDates(weekOffset)
  const today = new Date()

  const fetchData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)

    const start = weekDates[0].toISOString()
    const endDate = new Date(weekDates[6])
    endDate.setHours(23, 59, 59, 999)
    const end = endDate.toISOString()

    const [seancesRes, eventsRes, clientsRes] = await Promise.all([
      supabase
        .from('seances')
        .select('id, titre, date_prevue, client_id, profiles!seances_client_id_fkey(nom)')
        .eq('coach_id', user.id)
        .eq('is_template', false)
        .gte('date_prevue', start)
        .lte('date_prevue', end)
        .order('date_prevue', { ascending: true }),
      supabase
        .from('coach_events')
        .select('id, title, event_date, event_type, client_id, notes')
        .eq('coach_id', user.id)
        .gte('event_date', start)
        .lte('event_date', end)
        .order('event_date', { ascending: true }),
      supabase
        .from('clients')
        .select('id, profiles(nom)')
        .eq('coach_id', user.id)
        .eq('actif', true),
    ])

    setSeances(seancesRes.data ?? [])
    setEvents(eventsRes.data ?? [])
    setClients(clientsRes.data ?? [])
    setLoading(false)
  }, [user?.id, weekOffset])

  useEffect(() => { fetchData() }, [fetchData])

  // Stats
  const totalItems = seances.length + events.length
  const uniqueClients = new Set([
    ...seances.map(s => s.client_id),
    ...events.filter(e => e.client_id).map(e => e.client_id),
  ].filter(Boolean)).size
  const itemsToday = seances.filter(s => isSameDay(new Date(s.date_prevue), today)).length +
    events.filter(e => isSameDay(new Date(e.event_date), today)).length

  // Group items by day
  function itemsForDay(date) {
    const daySeances = seances.filter(s => isSameDay(new Date(s.date_prevue), date)).map(s => ({
      ...s, _type: 'seance', _time: s.date_prevue,
    }))
    const dayEvents = events.filter(e => isSameDay(new Date(e.event_date), date)).map(e => ({
      ...e, _type: 'event', _time: e.event_date,
    }))
    return [...daySeances, ...dayEvents].sort((a, b) => new Date(a._time) - new Date(b._time))
  }

  // Open modal
  const openNewModal = () => {
    setModalType(null)
    setEvtTitle('')
    setEvtDate(new Date().toISOString().split('T')[0])
    setEvtTime('09:00')
    setEvtType('bilan')
    setEvtClient('')
    setEvtNotes('')
    setModalOpen(true)
  }

  // Save event
  const saveEvent = async () => {
    if (!evtTitle.trim() || !evtDate) return
    setSaving(true)
    const eventDate = new Date(`${evtDate}T${evtTime}:00`)
    await supabase.from('coach_events').insert({
      coach_id: user.id,
      client_id: evtClient || null,
      title: evtTitle.trim(),
      event_date: eventDate.toISOString(),
      event_type: evtType,
      notes: evtNotes.trim() || null,
    })
    setSaving(false)
    setModalOpen(false)
    fetchData()
  }

  // Client name lookup from loaded clients list
  function getClientName(clientId) {
    if (!clientId) return null
    const c = clients.find(cl => cl.id === clientId)
    return c?.profiles?.nom || null
  }

  // Event type info
  function getEventTypeInfo(typeId) {
    return EVENT_TYPES.find(t => t.id === typeId) || EVENT_TYPES[EVENT_TYPES.length - 1]
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 w-full space-y-5 max-w-[1400px]">
        <div className="flex items-center justify-between">
          <div className="h-8 w-56 bg-[#27272a] rounded-lg animate-pulse" />
          <div className="h-10 w-40 bg-[#27272a] rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 space-y-2">
              <div className="h-4 w-24 bg-[#27272a] rounded animate-pulse" />
              <div className="h-7 w-12 bg-[#27272a] rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="bg-[#09090b] border border-[#27272a] rounded-xl p-3 space-y-3">
              <div className="h-5 w-16 bg-[#27272a] rounded animate-pulse" />
              <div className="h-16 bg-[#27272a] rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 w-full space-y-5 max-w-[1400px]">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-[#FF6B2B]" />
          <h1 className="text-xl md:text-2xl font-bold text-[#F5F5F3]">Calendrier Global</h1>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 bg-[#FF6B2B] hover:bg-[#e55e24] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvel événement
        </button>
      </div>

      {/* ── Week navigation ── */}
      <div className="flex items-center justify-between bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-3">
        <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-[#27272a] text-white/40 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm md:text-base font-medium text-[#F5F5F3]">{formatDateRange(weekDates)}</span>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-semibold hover:bg-[#FF6B2B]/20 transition-colors">
              Aujourd'hui
            </button>
          )}
        </div>
        <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-[#27272a] text-white/40 hover:text-white transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Événements cette semaine', value: totalItems, icon: Calendar, color: '#FF6B2B' },
          { label: 'Clients concernés', value: uniqueClients, icon: User, color: '#3b82f6' },
          { label: "Aujourd'hui", value: itemsToday, icon: Clock, color: '#22c55e' },
        ].map((s, i) => (
          <div key={i} className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${s.color}15` }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-xs text-white/40">{s.label}</p>
              <p className="text-lg font-bold text-[#F5F5F3]">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Week grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDates.map((date, idx) => {
          const dayItems = itemsForDay(date)
          const isToday = isSameDay(date, today)

          return (
            <div
              key={idx}
              className={`rounded-xl border p-3 min-h-[140px] flex flex-col gap-2 ${
                isToday ? 'bg-[#FF6B2B]/[0.03] border-[#FF6B2B]/30' : 'bg-[#09090b] border-[#27272a]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white/40">{JOURS[idx]}</span>
                <span className={`text-sm font-semibold ${isToday ? 'text-[#FF6B2B]' : 'text-[#F5F5F3]'}`}>
                  {date.getDate()}
                </span>
              </div>

              {dayItems.length === 0 ? (
                <p className="text-[11px] text-white/20 italic mt-1">Aucun événement</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {dayItems.map((item) => {
                    if (item._type === 'seance') {
                      return (
                        <div key={`s-${item.id}`} className="bg-[#18181b] border border-[#27272a] border-l-2 border-l-[#FF6B2B] rounded-lg p-2.5">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Dumbbell className="w-3 h-3 text-[#FF6B2B]" />
                            <span className="text-[10px] font-medium text-[#FF6B2B]">{formatHHmm(item.date_prevue)}</span>
                          </div>
                          <p className="text-xs font-medium text-[#F5F5F3] leading-snug truncate">{item.titre}</p>
                          {item.profiles?.nom && (
                            <p className="text-[10px] text-white/35 mt-0.5 truncate">({item.profiles.nom})</p>
                          )}
                        </div>
                      )
                    } else {
                      const typeInfo = getEventTypeInfo(item.event_type)
                      const TypeIcon = typeInfo.icon
                      return (
                        <div key={`e-${item.id}`} className="bg-[#18181b] border border-[#27272a] rounded-lg p-2.5" style={{ borderLeftWidth: 2, borderLeftColor: typeInfo.color }}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <TypeIcon className="w-3 h-3" style={{ color: typeInfo.color }} />
                            <span className="text-[10px] font-medium" style={{ color: typeInfo.color }}>{formatHHmm(item.event_date)}</span>
                          </div>
                          <p className="text-xs font-medium text-[#F5F5F3] leading-snug truncate">{item.title}</p>
                          {getClientName(item.client_id) && (
                            <p className="text-[10px] text-white/35 mt-0.5 truncate">({getClientName(item.client_id)})</p>
                          )}
                        </div>
                      )
                    }
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ══════════════════════════════════════ */}
      {/* MODAL NOUVEL ÉVÉNEMENT                */}
      {/* ══════════════════════════════════════ */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#09090b] border border-[#27272a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="px-6 py-4 border-b border-[#27272a] flex items-center justify-between">
                <h2 className="text-[#F5F5F3] font-semibold text-base">
                  {modalType === null ? 'Nouvel événement' : 'Événement classique'}
                </h2>
                <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Contenu */}
              <div className="p-6">
                {modalType === null ? (
                  /* Choix du type */
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
                  /* Formulaire événement */
                  <div className="space-y-4">
                    {/* Titre */}
                    <div>
                      <label className="block text-white/40 text-xs mb-1.5">Titre</label>
                      <input
                        type="text"
                        value={evtTitle}
                        onChange={(e) => setEvtTitle(e.target.value)}
                        placeholder="Ex: Bilan mensuel avec Noa"
                        autoFocus
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                      />
                    </div>

                    {/* Date + Heure */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-white/40 text-xs mb-1.5">Date</label>
                        <input
                          type="date"
                          value={evtDate}
                          onChange={(e) => setEvtDate(e.target.value)}
                          className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-white/40 text-xs mb-1.5">Heure</label>
                        <input
                          type="time"
                          value={evtTime}
                          onChange={(e) => setEvtTime(e.target.value)}
                          className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Type */}
                    <div>
                      <label className="block text-white/40 text-xs mb-1.5">Type</label>
                      <div className="flex flex-wrap gap-2">
                        {EVENT_TYPES.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setEvtType(t.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              evtType === t.id
                                ? 'border-2'
                                : 'border border-[#27272a] text-white/40 hover:text-white/60'
                            }`}
                            style={evtType === t.id ? { borderColor: t.color, color: t.color, backgroundColor: `${t.color}10` } : {}}
                          >
                            <t.icon size={12} />
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Client associé */}
                    <div>
                      <label className="block text-white/40 text-xs mb-1.5">Client associé (optionnel)</label>
                      <select
                        value={evtClient}
                        onChange={(e) => setEvtClient(e.target.value)}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                      >
                        <option value="">Aucun client</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.profiles?.nom || 'Client'}</option>
                        ))}
                      </select>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-white/40 text-xs mb-1.5">Notes</label>
                      <textarea
                        value={evtNotes}
                        onChange={(e) => setEvtNotes(e.target.value)}
                        placeholder="Notes optionnelles..."
                        rows={2}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors resize-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setModalType(null)}
                        className="flex-1 py-2.5 rounded-xl text-sm text-white/40 bg-[#27272a] hover:bg-[#3f3f46] transition-colors"
                      >
                        Retour
                      </button>
                      <button
                        onClick={saveEvent}
                        disabled={!evtTitle.trim() || !evtDate || saving}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40"
                      >
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                        Créer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
