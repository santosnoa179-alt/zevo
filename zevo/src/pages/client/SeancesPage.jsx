import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { usePageTransition, useStagger } from '../../hooks/useAnimations'
import {
  Dumbbell, CheckCircle2, Circle, ChevronLeft, ChevronRight,
  Flame, Clock, Loader2, Calendar, Sparkles, Trophy
} from 'lucide-react'

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function getWeekBounds(offset = 0) {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=dimanche
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset + offset * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return {
    monday,
    sunday,
    mondayStr: monday.toISOString().split('T')[0],
    sundayStr: sunday.toISOString().split('T')[0],
  }
}

function formatDateFr(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

export default function SeancesPage() {
  const { user } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [seances, setSeances] = useState([])
  const [exercicesMap, setExercicesMap] = useState({}) // { seanceId: [exercices] }
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)
  const [celebration, setCelebration] = useState(null) // seance id for animation
  const [expandedId, setExpandedId] = useState(null)

  const { monday, sunday, mondayStr, sundayStr } = getWeekBounds(weekOffset)
  const todayStr = new Date().toISOString().split('T')[0]

  const loadSeances = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data } = await supabase
      .from('seances')
      .select('id, titre, date_prevue, notes, is_completed, metadata')
      .eq('client_id', user.id)
      .eq('is_template', false)
      .gte('date_prevue', mondayStr)
      .lte('date_prevue', sundayStr)
      .order('date_prevue')

    setSeances(data || [])
    setLoading(false)
  }, [user, mondayStr, sundayStr])

  useEffect(() => { loadSeances() }, [loadSeances])

  // Charger les exercices d'une séance quand on l'expand
  const loadExercices = async (seanceId) => {
    if (exercicesMap[seanceId]) return // déjà chargé
    const { data } = await supabase
      .from('seance_exercices')
      .select('*, exercices(nom, muscle_group, gif_url)')
      .eq('seance_id', seanceId)
      .order('ordre')
    setExercicesMap(prev => ({ ...prev, [seanceId]: data || [] }))
  }

  // ── Toggle complétion ──
  const toggleComplete = async (seance) => {
    setToggling(seance.id)
    const newVal = !seance.is_completed

    const { error } = await supabase
      .from('seances')
      .update({ is_completed: newVal })
      .eq('id', seance.id)

    if (!error) {
      setSeances(prev => prev.map(s =>
        s.id === seance.id
          ? { ...s, is_completed: newVal }
          : s
      ))

      // Animation de célébration
      if (newVal) {
        setCelebration(seance.id)
        setTimeout(() => setCelebration(null), 1500)

        // ── Formulaires post-séance ──
        if (user?.id) {
          try {
            const { data: clientData } = await supabase
              .from('clients').select('coach_id').eq('id', user.id).single()

            if (clientData?.coach_id) {
              const { data: postSeanceForms } = await supabase
                .from('formulaires')
                .select('id, recurrence')
                .eq('coach_id', clientData.coach_id)
                .eq('statut', 'actif')
                .not('recurrence', 'is', null)

              const formsToSend = (postSeanceForms || []).filter(f => {
                const rec = typeof f.recurrence === 'string' ? JSON.parse(f.recurrence) : f.recurrence
                return rec?.intervalle === 'post_seance' && rec?.actif === true
              })

              if (formsToSend.length > 0) {
                // Vérifier les formulaires déjà en attente (éviter les doublons)
                const { data: existing } = await supabase
                  .from('formulaire_reponses')
                  .select('formulaire_id')
                  .eq('client_id', user.id)
                  .eq('complete', false)
                  .in('formulaire_id', formsToSend.map(f => f.id))

                const existingIds = new Set((existing || []).map(e => e.formulaire_id))
                const newForms = formsToSend.filter(f => !existingIds.has(f.id))

                if (newForms.length > 0) {
                  await supabase.from('formulaire_reponses').insert(
                    newForms.map(f => ({
                      formulaire_id: f.id,
                      client_id: user.id,
                      reponses: {},
                      complete: false,
                    }))
                  )
                }
              }
            }
          } catch (err) {
            console.error('[Séances] Erreur formulaires post-séance:', err.message)
          }
        }
      }
    }
    setToggling(null)
  }

  // Stats
  const total = seances.length
  const done = seances.filter(s => s.is_completed).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  // Grouper par jour
  const seancesByDay = {}
  seances.forEach(s => {
    const d = new Date(s.date_prevue)
    const idx = (d.getDay() + 6) % 7 // 0=lundi
    if (!seancesByDay[idx]) seancesByDay[idx] = []
    seancesByDay[idx].push(s)
  })

  // Label de la semaine
  const weekLabel = `${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`

  const pageTransition = usePageTransition()
  const stagger = useStagger(seances.length + 2) // +2 for header and stats

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#FF6B2B]" size={32} />
      </div>
    )
  }

  return (
    <div className={`p-4 space-y-5 max-w-2xl ${pageTransition.className}`}>

      {/* ── Header ── */}
      <div className={`pt-2 ${stagger[0].className}`} style={stagger[0].style}>
        <h1 className="text-[#F5F5F3] text-xl font-bold flex items-center gap-2">
          <Dumbbell size={20} className="text-[#FF6B2B]" />
          Mes Séances
        </h1>
        <p className="text-white/40 text-sm mt-0.5">Suis ta progression cette semaine</p>
      </div>

      {/* ── Barre de progression de la semaine ── */}
      <div className={`bg-[#18181b] border border-[#27272a] rounded-2xl p-5 ${stagger[1].className}`} style={stagger[1].style}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[#F5F5F3] text-sm font-bold">Progression hebdo</p>
            <p className="text-white/25 text-xs mt-0.5">{done}/{total} séances terminées</p>
          </div>
          <div className="flex items-center gap-1">
            {done === total && total > 0 ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15">
                <Trophy size={13} className="text-emerald-400" />
                <span className="text-emerald-400 text-xs font-bold">Semaine complète !</span>
              </div>
            ) : (
              <span className="text-2xl font-black" style={{ color: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#FF6B2B' }}>
                {pct}%
              </span>
            )}
          </div>
        </div>
        <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 relative"
            style={{
              width: `${total > 0 ? pct : 0}%`,
              background: pct >= 80
                ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                : pct >= 50
                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                  : 'linear-gradient(90deg, #FF6B2B, #FF9A6C)',
            }}
          >
            <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2) 50%, transparent)' }} />
          </div>
        </div>
        {/* Mini dots pour chaque séance */}
        <div className="flex items-center gap-1.5 mt-3 justify-center">
          {seances.map(s => (
            <div key={s.id} className={`w-3 h-3 rounded-full transition-all ${
              s.is_completed
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(34,197,94,0.4)]'
                : 'bg-white/10'
            }`} />
          ))}
          {total === 0 && <p className="text-white/15 text-xs">Aucune séance cette semaine</p>}
        </div>
      </div>

      {/* ── Navigation semaine ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekOffset(o => o - 1)}
          className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-[#27272a] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-[#F5F5F3] text-sm font-semibold">{weekLabel}</p>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-[#FF6B2B] text-[10px] font-medium hover:underline mt-0.5">
              Revenir à cette semaine
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekOffset(o => o + 1)}
          className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-[#27272a] transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── Liste des séances par jour ── */}
      {total === 0 ? (
        <div className="bg-[#18181b] border border-[#27272a] rounded-2xl py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FF6B2B]/10 flex items-center justify-center mx-auto mb-4">
            <Calendar size={24} className="text-[#FF6B2B]" />
          </div>
          <p className="text-white/40 text-sm">Aucune séance prévue cette semaine</p>
          <p className="text-white/20 text-xs mt-1">Ton coach n'a pas encore planifié de séance</p>
        </div>
      ) : (
        <div className="space-y-2">
          {JOURS.map((jour, idx) => {
            const daySeances = seancesByDay[idx] || []
            if (daySeances.length === 0) return null

            const dayDate = new Date(monday)
            dayDate.setDate(monday.getDate() + idx)
            const dayStr = dayDate.toISOString().split('T')[0]
            const isToday = dayStr === todayStr
            const isPast = dayStr < todayStr

            return (
              <div key={idx}>
                {/* Label jour */}
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <span className={`text-[10px] uppercase tracking-wider font-bold ${
                    isToday ? 'text-[#FF6B2B]' : 'text-white/25'
                  }`}>
                    {jour} {dayDate.getDate()}
                  </span>
                  {isToday && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#FF6B2B]/15 text-[#FF6B2B] font-bold">
                      Aujourd'hui
                    </span>
                  )}
                </div>

                {daySeances.map(seance => {
                  const isExpanded = expandedId === seance.id
                  const isCelebrating = celebration === seance.id
                  const exos = exercicesMap[seance.id] || []
                  const seanceIdx = seances.indexOf(seance)
                  const si = stagger[seanceIdx + 2] || {}

                  return (
                    <div
                      key={seance.id}
                      className={`relative bg-[#18181b] border rounded-2xl overflow-hidden transition-all mb-2 ${
                        seance.is_completed
                          ? 'border-emerald-500/20'
                          : isToday
                            ? 'border-[#FF6B2B]/20'
                            : 'border-[#27272a]'
                      } ${isCelebrating ? 'animate-pulse ring-2 ring-emerald-400/30' : ''} ${si.className || ''}`}
                      style={si.style}
                    >
                      {/* Bandeau complété */}
                      {seance.is_completed && (
                        <div className="bg-emerald-500/10 px-4 py-1.5 flex items-center gap-1.5">
                          <CheckCircle2 size={11} className="text-emerald-400" />
                          <span className="text-emerald-400 text-[10px] font-bold">Terminée</span>
                        </div>
                      )}

                      {/* Contenu principal */}
                      <div className="p-4">
                        <div className="flex items-center gap-3.5">
                          {/* Icône */}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                            seance.is_completed
                              ? 'bg-emerald-500/15'
                              : 'bg-[#FF6B2B]/10'
                          }`}>
                            {seance.is_completed
                              ? <CheckCircle2 size={22} className="text-emerald-400" />
                              : <Dumbbell size={22} className="text-[#FF6B2B]" />
                            }
                          </div>

                          {/* Titre + infos */}
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => {
                              if (isExpanded) {
                                setExpandedId(null)
                              } else {
                                setExpandedId(seance.id)
                                loadExercices(seance.id)
                              }
                            }}
                          >
                            <p className={`text-sm font-semibold truncate ${
                              seance.is_completed ? 'text-emerald-300/80 line-through' : 'text-[#F5F5F3]'
                            }`}>
                              {seance.titre}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-white/20 text-[10px] flex items-center gap-1">
                                <Calendar size={9} />
                                {formatDateFr(seance.date_prevue)}
                              </span>
                              {seance.notes && !seance.notes.startsWith('programme:') && (
                                <span className="text-white/15 text-[10px] truncate max-w-[120px]">{seance.notes}</span>
                              )}
                            </div>
                          </div>

                          {/* Bouton principal */}
                          <button
                            onClick={() => toggleComplete(seance)}
                            disabled={toggling === seance.id}
                            className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 ${
                              seance.is_completed
                                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400'
                                : 'bg-[#FF6B2B] text-white hover:bg-[#e55a1b] shadow-lg shadow-[#FF6B2B]/20'
                            }`}
                          >
                            {toggling === seance.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : seance.is_completed ? (
                              <>
                                <CheckCircle2 size={14} />
                                <span className="hidden sm:inline">Fait</span>
                              </>
                            ) : (
                              <>
                                <Flame size={14} />
                                Terminer
                              </>
                            )}
                          </button>
                        </div>

                        {/* ── Détail exercices (expandable) ── */}
                        {isExpanded && (
                          <div className="mt-4 pt-3 border-t border-[#27272a]/40">
                            {exos.length === 0 ? (
                              <p className="text-white/15 text-xs text-center py-3">Aucun exercice détaillé</p>
                            ) : (
                              <div className="space-y-2">
                                {exos.map((ex, ei) => (
                                  <div key={ei} className="flex items-center gap-3 bg-[#09090b] rounded-xl px-3.5 py-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center shrink-0 overflow-hidden">
                                      {ex.exercices?.gif_url ? (
                                        <img src={ex.exercices.gif_url} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <Dumbbell size={14} className="text-[#FF6B2B]" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[#F5F5F3] text-xs font-medium truncate">
                                        {ex.exercices?.nom || 'Exercice'}
                                      </p>
                                      <p className="text-white/20 text-[10px]">
                                        {ex.exercices?.muscle_group}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] shrink-0">
                                      {ex.series && <span className="text-[#FF6B2B] font-bold">{ex.series}×</span>}
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
                        )}
                      </div>

                      {/* Confetti animation overlay */}
                      {isCelebrating && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="flex gap-1 animate-bounce">
                            <Sparkles size={20} className="text-amber-400 animate-pulse" />
                            <Trophy size={22} className="text-emerald-400" />
                            <Sparkles size={20} className="text-amber-400 animate-pulse" />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
