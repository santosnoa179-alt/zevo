import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Dumbbell,
} from 'lucide-react'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function getWeekDates(offset) {
  const now = new Date()
  const day = now.getDay()
  // getDay() returns 0 for Sunday; shift so Monday = 0
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
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export default function CoachGlobalCalendarPage() {
  const { user } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [seances, setSeances] = useState([])
  const [loading, setLoading] = useState(true)

  const weekDates = getWeekDates(weekOffset)
  const today = new Date()

  const fetchSeances = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)

    const start = weekDates[0].toISOString()
    const endDate = new Date(weekDates[6])
    endDate.setHours(23, 59, 59, 999)
    const end = endDate.toISOString()

    const { data, error } = await supabase
      .from('seances')
      .select('id, titre, date_prevue, client_id, profiles!seances_client_id_fkey(nom)')
      .eq('coach_id', user.id)
      .eq('is_template', false)
      .gte('date_prevue', start)
      .lte('date_prevue', end)
      .order('date_prevue', { ascending: true })

    if (!error && data) {
      setSeances(data)
    }
    setLoading(false)
  }, [user?.id, weekOffset])

  useEffect(() => {
    fetchSeances()
  }, [fetchSeances])

  // --- Stats ---
  const totalSessions = seances.length
  const uniqueClients = new Set(seances.map((s) => s.client_id)).size
  const sessionsToday = seances.filter((s) => isSameDay(new Date(s.date_prevue), today)).length

  // --- Group seances by day ---
  function seancesForDay(date) {
    return seances.filter((s) => isSameDay(new Date(s.date_prevue), date))
  }

  // --- Skeleton ---
  if (loading) {
    return (
      <div className="p-4 md:p-6 w-full space-y-5 max-w-[1400px]">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-56 bg-[#27272a] rounded-lg animate-pulse" />
          <div className="h-10 w-36 bg-[#27272a] rounded-lg animate-pulse" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 space-y-2"
            >
              <div className="h-4 w-24 bg-[#27272a] rounded animate-pulse" />
              <div className="h-7 w-12 bg-[#27272a] rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className="bg-[#09090b] border border-[#27272a] rounded-xl p-3 space-y-3"
            >
              <div className="h-5 w-16 bg-[#27272a] rounded animate-pulse" />
              <div className="h-16 bg-[#27272a] rounded-lg animate-pulse" />
              <div className="h-16 bg-[#27272a] rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 w-full space-y-5 max-w-[1400px]">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-[#FF6B2B]" />
          <h1 className="text-xl md:text-2xl font-bold text-[#F5F5F3]">
            Calendrier Global
          </h1>
        </div>

        <button className="flex items-center gap-2 bg-[#FF6B2B] hover:bg-[#FF6B2B]/90 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Nouvelle séance
        </button>
      </div>

      {/* ---- Week navigation ---- */}
      <div className="flex items-center justify-between bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-3">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="p-1.5 rounded-lg hover:bg-[#27272a] text-[rgba(245,245,243,0.6)] hover:text-[#F5F5F3] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-sm md:text-base font-medium text-[#F5F5F3]">
          {formatDateRange(weekDates)}
        </span>

        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          className="p-1.5 rounded-lg hover:bg-[#27272a] text-[rgba(245,245,243,0.6)] hover:text-[#F5F5F3] transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ---- Stats ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#FF6B2B]/10">
            <Dumbbell className="w-5 h-5 text-[#FF6B2B]" />
          </div>
          <div>
            <p className="text-xs text-[rgba(245,245,243,0.6)]">Séances cette semaine</p>
            <p className="text-lg font-bold text-[#F5F5F3]">{totalSessions}</p>
          </div>
        </div>

        <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#FF6B2B]/10">
            <User className="w-5 h-5 text-[#FF6B2B]" />
          </div>
          <div>
            <p className="text-xs text-[rgba(245,245,243,0.6)]">Clients avec séances</p>
            <p className="text-lg font-bold text-[#F5F5F3]">{uniqueClients}</p>
          </div>
        </div>

        <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#FF6B2B]/10">
            <Calendar className="w-5 h-5 text-[#FF6B2B]" />
          </div>
          <div>
            <p className="text-xs text-[rgba(245,245,243,0.6)]">{"Séances aujourd'hui"}</p>
            <p className="text-lg font-bold text-[#F5F5F3]">{sessionsToday}</p>
          </div>
        </div>
      </div>

      {/* ---- Week grid ---- */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDates.map((date, idx) => {
          const daySessions = seancesForDay(date)
          const isToday = isSameDay(date, today)

          return (
            <div
              key={idx}
              className={`rounded-xl border p-3 min-h-[140px] flex flex-col gap-2 ${
                isToday
                  ? 'bg-[#FF6B2B]/5 border-[#FF6B2B]/30'
                  : 'bg-[#09090b] border-[#27272a]'
              }`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[rgba(245,245,243,0.6)]">
                  {JOURS[idx]}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    isToday ? 'text-[#FF6B2B]' : 'text-[#F5F5F3]'
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* Sessions */}
              {daySessions.length === 0 ? (
                <p className="text-[11px] text-[rgba(245,245,243,0.3)] italic mt-1">
                  Aucune séance
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {daySessions.map((s) => (
                    <div
                      key={s.id}
                      className="bg-[#18181b] border border-[#27272a] border-l-2 border-l-[#FF6B2B] rounded-lg p-3"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="w-3 h-3 text-[#FF6B2B]" />
                        <span className="text-xs font-medium text-[#FF6B2B]">
                          {formatHHmm(s.date_prevue)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[#F5F5F3] leading-snug truncate">
                        {s.titre}
                      </p>
                      {s.profiles?.nom && (
                        <p className="text-[11px] text-[rgba(245,245,243,0.5)] mt-0.5 truncate">
                          ({s.profiles.nom})
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
