import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useOffline } from '../../hooks/useOffline'
import { supabase } from '../../lib/supabase'
import {
  X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, CheckCircle2, Play, Pause,
  Dumbbell, Timer, Trophy, Loader2, AlertCircle, RotateCcw, StickyNote, Info, WifiOff,
} from 'lucide-react'

// Clé localStorage pour les séances terminées hors-ligne (sync différée)
const PENDING_SEANCES_KEY = '_zevo_pending_seances'

// ══════════════════════════════════════
// MOCK DATA — Utilisé si aucune séance réelle n'est trouvée
// ══════════════════════════════════════
const MOCK_EXERCICES = [
  {
    id: 'mock-1',
    ordre: 0,
    series: 4,
    reps: 10,
    poids: 80,
    repos: 90,
    exercices: { nom: 'Développé Couché', muscle_group: 'Pectoraux', equipment: 'Barre' },
  },
  {
    id: 'mock-2',
    ordre: 1,
    series: 3,
    reps: 12,
    poids: 30,
    repos: 60,
    exercices: { nom: 'Rowing Haltères', muscle_group: 'Dos', equipment: 'Haltères' },
  },
  {
    id: 'mock-3',
    ordre: 2,
    series: 3,
    reps: 15,
    poids: null,
    repos: 45,
    exercices: { nom: 'Crunchs', muscle_group: 'Abdominaux', equipment: 'Poids du corps' },
  },
]

const MOCK_SEANCE = { id: 'mock', titre: 'Full Body — Séance démo', notes: null }

// ══════════════════════════════════════
// HELPERS
// ══════════════════════════════════════

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatRestTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ══════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════

export default function WorkoutTrackerPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { seanceId } = useParams()
  const isOffline = useOffline()

  // ── Data ──
  const [seance, setSeance] = useState(null)
  const [exercices, setExercices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingSync, setPendingSync] = useState(false) // true quand finish hors-ligne en attente

  // ── Navigation exercice ──
  const [currentIdx, setCurrentIdx] = useState(0)
  const [direction, setDirection] = useState(0) // -1 = left, 0 = none, 1 = right
  const [animating, setAnimating] = useState(false)

  // ── Suivi séries : Map { exoIdx: Set<serieIdx> } ──
  const [completedSeries, setCompletedSeries] = useState({})

  // ── Chrono global ──
  const [globalTime, setGlobalTime] = useState(0)
  const [isRunning, setIsRunning] = useState(true)
  const globalTimerRef = useRef(null)

  // ── Chrono repos ──
  const [restTime, setRestTime] = useState(0)
  const [restTarget, setRestTarget] = useState(0)
  const [isResting, setIsResting] = useState(false)
  const restTimerRef = useRef(null)

  // ── Séance terminée ──
  const [finished, setFinished] = useState(false)

  // ── Description/Instructions expand state (un seul à la fois car 1 exo affiché) ──
  const [showDescription, setShowDescription] = useState(false)

  // ── Charger les données ──
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      // Si pas d'ID ou "demo", utiliser les mock data
      if (!seanceId || seanceId === 'demo') {
        setSeance(MOCK_SEANCE)
        setExercices(MOCK_EXERCICES)
        setLoading(false)
        return
      }

      // Charger la séance
      const { data: seanceData, error: seanceErr } = await supabase
        .from('seances')
        .select('id, titre, notes, is_completed')
        .eq('id', seanceId)
        .single()

      if (seanceErr || !seanceData) {
        console.error('[Workout] Erreur fetch séance:', seanceErr?.message)
        setError('Séance introuvable')
        setLoading(false)
        return
      }

      // Charger les exercices (+ params Pro V3 : RPE, tempo, rest, supersets, progression…)
      // Le join `sport_seance_exercices → exercises` permet de récupérer le GIF/nom ExerciseDB
      // pour les séances déployées depuis un programme Pro (exercice_id uuid legacy est NULL).
      const { data: exosData, error: exosErr } = await supabase
        .from('seance_exercices')
        .select(`id, series, reps, reps_cible, poids, repos, ordre, media_url, note_coach,
                 charge_kg, charge_unite, rpe_cible, rir_cible, tempo, rest_sec,
                 superset_group, technique, notes_coach, sport_seance_exercice_id,
                 seance_exercice_logs(id, set_number, charge_kg_reel, reps_reel, rpe_percu, notes_client),
                 exercices(nom, muscle_group, equipment, image_url, video_url, gif_url, description, library_id),
                 sport_seance_exercices(exercice_id, exercice_nom_custom)`)
        .eq('seance_id', seanceId)
        .order('ordre')

      if (exosErr) {
        console.error('[Workout] Erreur fetch exercices:', exosErr.message)
      }

      if (!exosData || exosData.length === 0) {
        // Pas d'exercices — fallback mock
        setSeance(seanceData)
        setExercices(MOCK_EXERCICES)
        setLoading(false)
        return
      }

      // Collecte les IDs ExerciseDB (depuis 2 sources) :
      // A) legacy bridge : exercices.library_id (text)
      // B) Pro V3 direct : sport_seance_exercices.exercice_id (text)
      const libraryIdsSet = new Set()
      exosData.forEach(ex => {
        if (ex.exercices?.library_id) libraryIdsSet.add(ex.exercices.library_id)
        if (ex.sport_seance_exercices?.exercice_id) libraryIdsSet.add(ex.sport_seance_exercices.exercice_id)
      })
      const libraryIds = [...libraryIdsSet]

      let enriched = exosData
      if (libraryIds.length > 0) {
        const { data: libData, error: libErr } = await supabase
          .from('exercises')
          .select('id, name, name_fr, target_muscle, body_part, equipment, gif_url, instructions, instructions_fr')
          .in('id', libraryIds)
        if (libErr) {
          console.error('[Workout] Erreur fetch library exercises:', libErr.message)
        }
        const libMap = Object.fromEntries(
          (libData || []).map(ex => {
            const en = Array.isArray(ex.instructions) ? ex.instructions : []
            const fr = Array.isArray(ex.instructions_fr) ? ex.instructions_fr : []
            const chosenInstr = fr.length === en.length && fr.length > 0 ? fr : en
            return [ex.id, {
              name: ex.name_fr || ex.name,
              target_muscle: ex.target_muscle,
              body_part: ex.body_part,
              equipment: ex.equipment,
              gif_url: ex.gif_url,
              instructions: chosenInstr,
            }]
          })
        )
        enriched = exosData.map(ex => {
          // Priorité : legacy.library_id > Pro V3 sport_seance_exercices.exercice_id
          const libId = ex.exercices?.library_id || ex.sport_seance_exercices?.exercice_id
          const libInfo = libId ? libMap[libId] : null
          if (!libInfo && !ex.exercices) return ex
          const customName = ex.sport_seance_exercices?.exercice_nom_custom
          // Merge : garde les champs legacy si dispo, sinon fallback sur ExerciseDB
          const merged = {
            nom: ex.exercices?.nom || customName || libInfo?.name || 'Exercice',
            muscle_group: ex.exercices?.muscle_group || libInfo?.target_muscle,
            equipment: ex.exercices?.equipment || libInfo?.equipment,
            image_url: ex.exercices?.image_url,
            video_url: ex.exercices?.video_url,
            gif_url: ex.exercices?.gif_url || libInfo?.gif_url,
            description: ex.exercices?.description,
            library_id: libId,
            instructions: libInfo?.instructions,
          }
          return { ...ex, exercices: merged }
        })
      }

      setSeance(seanceData)
      setExercices(enriched)
      setLoading(false)
    }
    load()
  }, [seanceId])

  // ── Chrono global ──
  useEffect(() => {
    if (isRunning && !finished) {
      globalTimerRef.current = setInterval(() => {
        setGlobalTime(t => t + 1)
      }, 1000)
    }
    return () => clearInterval(globalTimerRef.current)
  }, [isRunning, finished])

  // ── Chrono repos ──
  useEffect(() => {
    if (isResting && restTime > 0) {
      restTimerRef.current = setInterval(() => {
        setRestTime(t => {
          if (t <= 1) {
            clearInterval(restTimerRef.current)
            setIsResting(false)
            return 0
          }
          return t - 1
        })
      }, 1000)
    }
    return () => clearInterval(restTimerRef.current)
  }, [isResting, restTime])

  // ── Sync différée : rejoue les séances terminées hors-ligne dès reconnexion ──
  useEffect(() => {
    if (isOffline) return
    let pending = []
    try {
      pending = JSON.parse(localStorage.getItem(PENDING_SEANCES_KEY) || '[]')
      if (!Array.isArray(pending)) pending = []
    } catch {
      localStorage.removeItem(PENDING_SEANCES_KEY)
      return
    }
    if (pending.length === 0) return

    const syncPending = async () => {
      const remaining = []
      for (const id of pending) {
        const { error } = await supabase
          .from('seances')
          .update({ is_completed: true })
          .eq('id', id)
        if (error) remaining.push(id) // garde en attente si ça échoue encore
      }
      if (remaining.length === 0) {
        localStorage.removeItem(PENDING_SEANCES_KEY)
        setPendingSync(false)
      } else {
        localStorage.setItem(PENDING_SEANCES_KEY, JSON.stringify(remaining))
      }
    }
    syncPending()
  }, [isOffline])

  // ── Current exercice ──
  const currentExo = exercices[currentIdx] || null
  const totalExos = exercices.length
  const completedForCurrent = completedSeries[currentIdx] || new Set()

  // ── Progression totale ──
  const totalSeries = exercices.reduce((acc, ex) => acc + (ex.series || 0), 0)
  const totalDone = Object.values(completedSeries).reduce((acc, s) => acc + s.size, 0)
  const progressPct = totalSeries > 0 ? Math.round((totalDone / totalSeries) * 100) : 0

  // ── Toggle une série ──
  const toggleSerie = useCallback((serieIdx) => {
    setCompletedSeries(prev => {
      const current = new Set(prev[currentIdx] || [])
      if (current.has(serieIdx)) {
        current.delete(serieIdx)
        // Annuler le repos si on décoche
        setIsResting(false)
        setRestTime(0)
      } else {
        current.add(serieIdx)
        // Lancer le repos automatiquement
        const repos = currentExo?.repos || 60
        setRestTarget(repos)
        setRestTime(repos)
        setIsResting(true)
      }
      return { ...prev, [currentIdx]: current }
    })
  }, [currentIdx, currentExo])

  // ── Annuler le repos ──
  const skipRest = () => {
    setIsResting(false)
    setRestTime(0)
    clearInterval(restTimerRef.current)
  }

  // ── Navigation exercice avec animation ──
  const goToExercice = useCallback((newIdx) => {
    if (newIdx < 0 || newIdx >= totalExos || animating) return
    setDirection(newIdx > currentIdx ? 1 : -1)
    setAnimating(true)
    // Annuler repos en cours
    skipRest()
    // Refermer la description (on change d'exo)
    setShowDescription(false)
    setTimeout(() => {
      setCurrentIdx(newIdx)
      setDirection(0)
      setAnimating(false)
    }, 250)
  }, [currentIdx, totalExos, animating])

  // ── Sauvegarder une séance en localStorage pour sync différée ──
  const savePendingSeance = useCallback((id) => {
    let pending = []
    try {
      pending = JSON.parse(localStorage.getItem(PENDING_SEANCES_KEY) || '[]')
      if (!Array.isArray(pending)) pending = []
    } catch {
      pending = []
    }
    if (!pending.includes(id)) {
      localStorage.setItem(PENDING_SEANCES_KEY, JSON.stringify([...pending, id]))
    }
    setPendingSync(true)
  }, [])

  // ── Terminer la séance ──
  const finishWorkout = async () => {
    setFinished(true)
    setIsRunning(false)
    clearInterval(globalTimerRef.current)
    skipRest()

    // Marquer comme complétée en DB si c'est une vraie séance
    if (seanceId && seanceId !== 'demo' && seance?.id) {
      // Hors ligne → sauvegarder localement, sync au reconnect
      if (!navigator.onLine) {
        savePendingSeance(seance.id)
        return
      }

      const { error } = await supabase
        .from('seances')
        .update({ is_completed: true })
        .eq('id', seance.id)
      if (error) {
        console.error('[Workout] Erreur update is_completed:', error.message)
        // Fallback : sauvegarder pour sync différée
        savePendingSeance(seance.id)
      }

      // ── Formulaires post-séance : créer automatiquement les réponses ──
      if (user?.id) {
        try {
          // 1. Trouver le coach_id du client
          const { data: clientData } = await supabase
            .from('clients')
            .select('coach_id')
            .eq('id', user.id)
            .single()

          if (clientData?.coach_id) {
            // 2. Chercher les formulaires actifs avec récurrence post_seance
            const { data: postSeanceForms } = await supabase
              .from('formulaires')
              .select('id, recurrence')
              .eq('coach_id', clientData.coach_id)
              .eq('statut', 'actif')
              .not('recurrence', 'is', null)

            // 3. Filtrer ceux qui ont intervalle === 'post_seance'
            const formsToSend = (postSeanceForms || []).filter(f => {
              let rec = f.recurrence
              if (typeof rec === 'string') {
                try { rec = JSON.parse(rec) } catch { return false }
              }
              return rec?.intervalle === 'post_seance' && rec?.actif === true
            })

            if (formsToSend.length > 0) {
              // 4. Anti-doublon PAR SÉANCE : on ne recrée pas un formulaire déjà
              //    rattaché à cette séance précise (ex. si le client rouvre le tracker).
              //    Chaque séance terminée a donc son propre questionnaire post-séance.
              const { data: existing } = await supabase
                .from('formulaire_reponses')
                .select('formulaire_id')
                .eq('client_id', user.id)
                .eq('seance_id', seanceId)
                .in('formulaire_id', formsToSend.map(f => f.id))

              const existingIds = new Set((existing || []).map(e => e.formulaire_id))
              const newForms = formsToSend.filter(f => !existingIds.has(f.id))

              // 5. Insérer les formulaires manquants, rattachés à la séance terminée
              if (newForms.length > 0) {
                await supabase.from('formulaire_reponses').insert(
                  newForms.map(f => ({
                    formulaire_id: f.id,
                    client_id: user.id,
                    seance_id: seanceId,
                    reponses: {},
                    complete: false,
                  }))
                )
              }
            }
          }
        } catch (err) {
          console.error('[Workout] Erreur formulaires post-séance:', err.message)
        }
      }
    }
  }

  // ── Quitter ──
  const handleQuit = () => {
    if (!finished && totalDone > 0) {
      if (!window.confirm('Tu es en plein entraînement ! Quitter quand même ?')) return
    }
    navigate(-1)
  }

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════

  // Loading
  if (loading) {
    return (
      <div className="fixed inset-0 bg-[var(--bg-elevated)] z-[100] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-muted)] text-sm">Chargement de la séance...</p>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════
  // ÉCRAN RÉSUMÉ — séance déjà complétée
  // ══════════════════════════════════════
  if (seance?.is_completed && !finished) {
    const exosArr = Array.isArray(exercices) ? exercices : []
    const totalExosDone = exosArr.length
    let totalLogs = 0
    let totalKgTotal = 0
    exosArr.forEach(ex => {
      const logs = ex?.seance_exercice_logs || []
      totalLogs += logs.length
      logs.forEach(l => {
        const c = Number(l?.charge_kg_reel)
        const r = Number(l?.reps_reel)
        if (!isNaN(c) && !isNaN(r) && c > 0 && r > 0) totalKgTotal += c * r
      })
    })
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, overflowY: 'auto', background: '#0D0D0D', color: '#F5F5F3' }}>
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(13,13,13,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-[var(--bg-surface)] transition-colors"
              style={{ color: 'rgba(245,245,243,0.6)' }}>
              <ChevronLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <CheckCircle2 size={14} style={{ color: 'var(--color-primary)' }} />
                <span style={{ color: 'var(--color-primary)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Séance terminée</span>
              </div>
              <h1 style={{ color: '#F5F5F3', fontSize: 16, fontWeight: 700, lineHeight: 1.2 }} className="truncate">{seance?.titre || 'Séance'}</h1>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>

          {/* Stats globales */}
          <div className="grid grid-cols-3 gap-3">
            <div style={{ background: '#1E1E1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, textAlign: 'center' }}>
              <Dumbbell style={{ color: 'var(--color-primary)', margin: '0 auto 8px', width: 20, height: 20 }} />
              <p style={{ color: '#F5F5F3', fontSize: 18, fontWeight: 900 }} className="tabular-nums">{totalExosDone}</p>
              <p style={{ color: 'rgba(245,245,243,0.6)', fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Exercices</p>
            </div>
            <div style={{ background: '#1E1E1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, textAlign: 'center' }}>
              <Check style={{ color: 'var(--color-primary)', margin: '0 auto 8px', width: 20, height: 20 }} />
              <p style={{ color: '#F5F5F3', fontSize: 18, fontWeight: 900 }} className="tabular-nums">{totalLogs}</p>
              <p style={{ color: 'rgba(245,245,243,0.6)', fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Séries</p>
            </div>
            <div style={{ background: '#1E1E1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, textAlign: 'center' }}>
              <Trophy style={{ color: 'var(--color-primary)', margin: '0 auto 8px', width: 20, height: 20 }} />
              <p style={{ color: '#F5F5F3', fontSize: 18, fontWeight: 900 }} className="tabular-nums">{Math.round(totalKgTotal)}</p>
              <p style={{ color: 'rgba(245,245,243,0.6)', fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.15em' }}>kg·reps</p>
            </div>
          </div>

          {/* Liste des exercices avec logs */}
          <div className="space-y-3">
            <p style={{ color: 'rgba(245,245,243,0.6)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>Détail des exercices</p>
            {exosArr.length === 0 ? (
              <div style={{ background: '#1E1E1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, textAlign: 'center', color: 'rgba(245,245,243,0.6)', fontSize: 13 }}>
                Aucun exercice enregistré sur cette séance.
              </div>
            ) : (
              exosArr.map((ex, idx) => {
                const logs = (ex?.seance_exercice_logs || []).slice().sort((a, b) => (a?.set_number || 0) - (b?.set_number || 0))
                const chargeCible = ex?.charge_kg ?? ex?.poids
                return (
                  <div key={ex?.id || idx} style={{ background: '#1E1E1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(var(--color-primary-rgb),0.1)', border: '1px solid rgba(var(--color-primary-rgb),0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: 'var(--color-primary)', fontSize: 12, fontWeight: 900 }} className="tabular-nums">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ color: '#F5F5F3', fontSize: 14, fontWeight: 700 }} className="truncate">{ex?.exercices?.nom || 'Exercice'}</p>
                        <p style={{ color: 'rgba(245,245,243,0.6)', fontSize: 10 }} className="tabular-nums">
                          {ex?.series || 0} séries × {ex?.reps || '?'} reps
                          {chargeCible != null ? ` · ${chargeCible} ${ex?.charge_unite || 'kg'}` : ''}
                        </p>
                      </div>
                    </div>

                    {logs.length === 0 ? (
                      <div style={{ padding: '12px 16px', color: 'rgba(245,245,243,0.6)', fontSize: 11, fontStyle: 'italic' }}>Pas de perf enregistrée</div>
                    ) : (
                      <div>
                        {logs.map(log => (
                          <div key={log.id} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ color: 'rgba(245,245,243,0.6)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', width: 40, flexShrink: 0 }}>Set {log.set_number}</span>
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              <div>
                                <p style={{ color: 'rgba(245,245,243,0.6)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Charge</p>
                                <p style={{ color: '#F5F5F3', fontSize: 14, fontWeight: 900 }} className="tabular-nums">{log.charge_kg_reel ?? '—'}<span style={{ color: 'rgba(245,245,243,0.6)', fontSize: 10, fontWeight: 500 }}> {ex?.charge_unite || 'kg'}</span></p>
                              </div>
                              <div>
                                <p style={{ color: 'rgba(245,245,243,0.6)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Reps</p>
                                <p style={{ color: '#F5F5F3', fontSize: 14, fontWeight: 900 }} className="tabular-nums">{log.reps_reel ?? '—'}</p>
                              </div>
                              <div>
                                <p style={{ color: 'rgba(245,245,243,0.6)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>RPE</p>
                                <p style={{ color: '#F5F5F3', fontSize: 14, fontWeight: 900 }} className="tabular-nums">{log.rpe_percu ?? '—'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => navigate(-1)}
              style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#2A2A2A', color: 'rgba(245,245,243,0.85)', fontSize: 14, fontWeight: 600, border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Retour
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Erreur
  if (error) {
    return (
      <div
        className="fixed inset-0 bg-[var(--bg-elevated)] z-[100] flex items-center justify-center p-6"
        style={{ paddingTop: 'calc(24px + env(safe-area-inset-top, 0px))', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-[var(--text-primary)] text-xl font-bold mb-2">Oops !</h2>
          <p className="text-[var(--text-muted)] text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════
  // ÉCRAN DE FIN
  // ══════════════════════════════════════
  if (finished) {
    return (
      <div
        className="fixed inset-0 bg-[var(--bg-elevated)] z-[100] flex items-center justify-center p-6"
        style={{ paddingTop: 'calc(24px + env(safe-area-inset-top, 0px))', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="text-center max-w-sm w-full">
          {/* Celebration */}
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center mx-auto shadow-2xl shadow-primary/30">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            {/* Pulse ring */}
            <div className="absolute inset-0 w-24 h-24 rounded-full mx-auto animate-ping bg-primary/20" style={{ animationDuration: '2s' }} />
          </div>

          <h1 className="text-[var(--text-primary)] text-3xl font-black mb-2">Bravo !</h1>
          {pendingSync ? (
            <p className="text-[var(--text-muted)] text-sm mb-8 flex items-center justify-center gap-1.5">
              <WifiOff size={12} className="opacity-60" />
              Séance enregistrée — synchronisation en attente
            </p>
          ) : (
            <p className="text-[var(--text-muted)] text-sm mb-8">Séance terminée avec succès</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-2xl p-4">
              <Timer className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-[var(--text-primary)] text-lg font-bold">{formatTime(globalTime)}</p>
              <p className="text-[var(--text-muted)] text-[10px] mt-1">Durée</p>
            </div>
            <div className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-2xl p-4">
              <Dumbbell className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-[var(--text-primary)] text-lg font-bold">{totalExos}</p>
              <p className="text-[var(--text-muted)] text-[10px] mt-1">Exercices</p>
            </div>
            <div className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-2xl p-4">
              <Check className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-[var(--text-primary)] text-lg font-bold">{totalDone}/{totalSeries}</p>
              <p className="text-[var(--text-muted)] text-[10px] mt-1">Séries</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/app/dashboard')}
            className="w-full py-4 rounded-2xl bg-primary text-white text-base font-bold hover:bg-[#e55e24] active:scale-[0.98] transition-all shadow-lg shadow-primary/25"
          >
            Retour au Dashboard
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════
  // ÉCRAN PRINCIPAL — ENTRAÎNEMENT
  // ══════════════════════════════════════

  const isLastExo = currentIdx === totalExos - 1
  const allSeriesDone = currentExo ? completedForCurrent.size >= (currentExo.series || 0) : false

  // ── Log d'une perf pour un set (V3b suivi client) ──
  const logSetPerf = async (seanceExoId, setNumber, field, value) => {
    if (!user?.id || !seanceExoId) return
    // Cherche un log existant pour (seance_exercice_id, set_number)
    const exoLogs = exercices.find(e => e.id === seanceExoId)?.seance_exercice_logs || []
    const existing = exoLogs.find(l => l.set_number === setNumber)
    const numVal = value === '' ? null : +value
    try {
      if (existing) {
        const { error } = await supabase.from('seance_exercice_logs').update({ [field]: numVal }).eq('id', existing.id)
        if (error) throw error
        // Update local state
        setExercices(prev => prev.map(e => e.id !== seanceExoId ? e : {
          ...e,
          seance_exercice_logs: (e.seance_exercice_logs || []).map(l =>
            l.id === existing.id ? { ...l, [field]: numVal } : l
          )
        }))
      } else {
        const payload = { seance_exercice_id: seanceExoId, client_id: user.id, set_number: setNumber, [field]: numVal }
        const { data, error } = await supabase.from('seance_exercice_logs').insert(payload).select().single()
        if (error) throw error
        setExercices(prev => prev.map(e => e.id !== seanceExoId ? e : {
          ...e,
          seance_exercice_logs: [...(e.seance_exercice_logs || []), data]
        }))
      }
    } catch (err) {
      console.error('[logSetPerf]', err)
    }
  }

  const getLogForSet = (exoId, setNumber) => {
    const exo = exercices.find(e => e.id === exoId)
    return (exo?.seance_exercice_logs || []).find(l => l.set_number === setNumber) || {}
  }

  return (
    <div className="fixed inset-0 bg-[var(--bg-elevated)] z-[100] flex flex-col select-none overflow-hidden">

      {/* ═══════ OFFLINE BANNER ═══════ */}
      {isOffline && (
        <div
          className="flex-shrink-0 flex items-center justify-center gap-2 py-1.5 px-4 text-[11px] font-semibold"
          style={{ background: 'rgba(20,20,20,0.98)', color: 'rgba(245,245,243,0.6)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <WifiOff size={11} />
          <span>Mode hors ligne — les séries cochées sont sauvegardées localement</span>
        </div>
      )}

      {/* ═══════ HEADER ═══════ */}
      <div
        className="flex-shrink-0 px-4 pb-3 space-y-3"
        style={{ paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}
      >
        {/* Top row: Quit — Title — Timer */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleQuit}
            className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-surface)] active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 mx-4 text-center min-w-0">
            <p className="text-[var(--text-primary)] text-sm font-bold truncate">{seance?.titre || 'Entraînement'}</p>
            <p className="text-[var(--text-muted)] text-[10px]">Exercice {currentIdx + 1} / {totalExos}</p>
          </div>

          <button
            onClick={() => setIsRunning(r => !r)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] active:scale-95 transition-all"
          >
            {isRunning ? <Pause className="w-3.5 h-3.5 text-primary" /> : <Play className="w-3.5 h-3.5 text-primary" />}
            <span className="text-[var(--text-primary)] text-sm font-bold tabular-nums">{formatTime(globalTime)}</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ═══════ EXERCICE FOCUS ═══════ */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div
          className={`transition-all duration-250 ease-out ${
            animating
              ? direction === 1
                ? 'opacity-0 -translate-x-8'
                : 'opacity-0 translate-x-8'
              : 'opacity-100 translate-x-0'
          }`}
        >
          {currentExo && (
            <>
              {/* Média : media_url (coach) > gif_url (library/custom) > video_url > image_url > placeholder */}
              {(() => {
                const mediaUrl = currentExo.media_url?.trim()
                const gifUrl   = currentExo.exercices?.gif_url
                const videoUrl = currentExo.exercices?.video_url
                const imageUrl = currentExo.exercices?.image_url
                const url      = mediaUrl || gifUrl || videoUrl || imageUrl || null

                // Placeholder si aucune URL
                if (!url) {
                  return (
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-2xl h-64 flex items-center justify-center mb-5">
                      <div className="text-center">
                        <Dumbbell className="w-10 h-10 text-white/[0.08] mx-auto mb-2" />
                        <p className="text-white/[0.15] text-[10px] font-medium">Démonstration</p>
                      </div>
                    </div>
                  )
                }

                // Détection du type
                const isImageFile = /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(url)
                const isVideoFile = /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url)
                // CDNs d'images fitness sans extension dans l'URL (ExerciseDB, wger, etc.)
                const isImageCdn  = url.includes('exercisedb.io') || url.includes('wger.de') || url.includes('fittrackee.org')
                // YouTube / Vimeo
                const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
                const vimeoMatch   = url.match(/vimeo\.com\/(\d+)/)

                // 1. Image (extension .gif, .jpg… ou CDN image connu ou champ image_url/gif_url)
                if (isImageFile || isImageCdn || (!mediaUrl && !videoUrl && (url === gifUrl || url === imageUrl))) {
                  return (
                    <div className="rounded-2xl overflow-hidden mb-5 border border-[var(--border-base)]">
                      <img
                        key={url}
                        src={url}
                        alt={currentExo.exercices?.nom || 'Démonstration'}
                        decoding="async"
                        className="w-full h-64 object-contain bg-[var(--bg-surface)]"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.parentElement.classList.add(
                            'h-64', 'flex', 'items-center', 'justify-center'
                          )
                          e.currentTarget.parentElement.innerHTML =
                            '<div class="text-center"><p class="text-white/20 text-xs">Démonstration non disponible</p></div>'
                        }}
                      />
                    </div>
                  )
                }

                // 2. YouTube embed
                if (youtubeMatch) {
                  return (
                    <div className="rounded-2xl overflow-hidden mb-5 border border-[var(--border-base)] bg-black aspect-video">
                      <iframe
                        key={currentExo.id}
                        src={`https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${youtubeMatch[1]}`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={currentExo.exercices?.nom}
                      />
                    </div>
                  )
                }

                // 3. Vimeo embed
                if (vimeoMatch) {
                  return (
                    <div className="rounded-2xl overflow-hidden mb-5 border border-[var(--border-base)] bg-black aspect-video">
                      <iframe
                        key={currentExo.id}
                        src={`https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1`}
                        className="w-full h-full"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        title={currentExo.exercices?.nom}
                      />
                    </div>
                  )
                }

                // 4. Fichier vidéo direct (.mp4, .webm, .mov) ou champ video_url
                if (isVideoFile || url === videoUrl) {
                  return (
                    <div className="rounded-2xl overflow-hidden mb-5 border border-[var(--border-base)] bg-black">
                      <video
                        key={currentExo.id}
                        src={url}
                        className="w-full h-64 object-contain bg-black"
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls
                      />
                    </div>
                  )
                }

                // 5. URL générique (Google Drive, etc.) — iframe en dernier recours
                return (
                  <div className="rounded-2xl overflow-hidden mb-5 border border-[var(--border-base)] bg-black aspect-video">
                    <iframe
                      key={currentExo.id}
                      src={url}
                      className="w-full h-full"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                      title={currentExo.exercices?.nom}
                    />
                  </div>
                )
              })()}

              {/* Exercice name & info */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  {currentExo.exercices?.muscle_group && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {currentExo.exercices.muscle_group}
                    </span>
                  )}
                  {currentExo.exercices?.equipment && (
                    <span className="text-[10px] font-medium text-[var(--text-muted)]">
                      {currentExo.exercices.equipment}
                    </span>
                  )}
                </div>
                <h1 className="text-[var(--text-primary)] text-2xl font-black leading-tight">
                  {currentExo.exercices?.nom || 'Exercice'}
                </h1>
                {/* Subtitle série × reps — charge */}
                <p className="text-[var(--text-muted)] text-sm mt-1">
                  {currentExo.series} séries × {currentExo.reps || currentExo.reps_cible || '?'} reps
                  {currentExo.charge_kg != null ? ` — ${currentExo.charge_kg} ${currentExo.charge_unite || 'kg'}` : (currentExo.poids ? ` — ${currentExo.poids} kg` : '')}
                </p>

                {/* Chips Pro (V3) : RPE / tempo / rest / superset / technique */}
                {(currentExo.rpe_cible || currentExo.tempo || currentExo.rest_sec || currentExo.superset_group || currentExo.technique) && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {currentExo.rpe_cible != null && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                        RPE {currentExo.rpe_cible}
                      </span>
                    )}
                    {currentExo.tempo && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-2 py-0.5 rounded tabular-nums">
                        Tempo {currentExo.tempo}
                      </span>
                    )}
                    {currentExo.rest_sec != null && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-2 py-0.5 rounded tabular-nums">
                        Repos {currentExo.rest_sec}s
                      </span>
                    )}
                    {currentExo.superset_group && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                        Superset {currentExo.superset_group}
                      </span>
                    )}
                    {currentExo.technique && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-2 py-0.5 rounded">
                        {currentExo.technique.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                )}

                {/* Notes du coach (V3) */}
                {currentExo.notes_coach && (
                  <p className="text-[var(--text-secondary)] text-xs mt-2 italic">
                    💬 {currentExo.notes_coach}
                  </p>
                )}

                {/* ═══ Description / Instructions (toggle) ═══ */}
                {(() => {
                  const desc = (currentExo.exercices?.description || '').trim()
                  const instr = currentExo.exercices?.instructions
                  const hasDesc = !!desc
                  const hasInstr = Array.isArray(instr) && instr.filter(s => s && s.trim()).length > 0
                  if (!hasDesc && !hasInstr) return null
                  return (
                    <div className="mt-3">
                      <button
                        onClick={() => setShowDescription(v => !v)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all active:scale-95 ${
                          showDescription
                            ? 'bg-primary/10 border-primary/25 text-primary'
                            : 'bg-[var(--bg-surface)] border-[var(--border-base)] text-[var(--text-secondary)] hover:border-primary/30 hover:text-primary'
                        }`}
                      >
                        <Info className="w-3 h-3" />
                        {showDescription ? 'Masquer la description' : 'Voir la description'}
                        {showDescription
                          ? <ChevronUp className="w-3 h-3" />
                          : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {showDescription && (
                        <div className="mt-3 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-base)]">
                          {hasDesc && (
                            <p className={`text-[var(--text-primary)] text-sm leading-relaxed whitespace-pre-wrap ${hasInstr ? 'mb-4' : ''}`}>
                              {desc}
                            </p>
                          )}
                          {hasInstr && (
                            <>
                              {hasDesc && (
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                  Étapes
                                </p>
                              )}
                              <ol className="list-decimal pl-5 space-y-1.5 marker:text-primary marker:font-bold">
                                {instr.filter(s => s && s.trim()).map((step, i) => (
                                  <li key={i} className="text-[var(--text-secondary)] text-sm leading-relaxed pl-1">
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* ═══════ NOTE COACH ═══════ */}
              {currentExo.note_coach && currentExo.note_coach.trim() && (
                <div className="mb-5 p-4 rounded-2xl bg-primary/[0.08] border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Consigne coach
                    </span>
                  </div>
                  <p className="text-[var(--text-primary)] text-sm leading-relaxed whitespace-pre-wrap">
                    {currentExo.note_coach}
                  </p>
                </div>
              )}

              {/* ═══════ CHRONO REPOS (overlay) ═══════ */}
              {isResting && (
                <div className="mb-5 bg-primary/[0.08] border border-primary/20 rounded-2xl p-5 text-center">
                  <p className="text-primary text-[10px] font-bold uppercase tracking-widest mb-2">Temps de repos</p>
                  <p className="text-[var(--text-primary)] text-5xl font-black tabular-nums mb-1">{formatRestTime(restTime)}</p>
                  <div className="w-full h-1 bg-[var(--bg-surface)] rounded-full overflow-hidden mt-3 mb-4">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: restTarget > 0 ? `${(restTime / restTarget) * 100}%` : '0%' }}
                    />
                  </div>
                  <button
                    onClick={skipRest}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] text-sm font-semibold hover:bg-[var(--bg-surface)] active:scale-95 transition-all"
                  >
                    <RotateCcw className="w-4 h-4" /> Passer le repos
                  </button>
                </div>
              )}

              {/* ═══════ SÉRIES CHECKLIST ═══════ */}
              <div className="space-y-2.5">
                <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest">
                  Séries — {completedForCurrent.size} / {currentExo.series || 0}
                </p>
                {Array.from({ length: currentExo.series || 0 }, (_, i) => {
                  const done = completedForCurrent.has(i)
                  const setNum = i + 1
                  const log = getLogForSet(currentExo.id, setNum)
                  const chargeDisplay = currentExo.charge_kg ?? currentExo.poids
                  const restDisplay = currentExo.rest_sec ?? currentExo.repos
                  return (
                    <div key={i} className={`rounded-2xl border transition-all ${
                      done ? 'bg-primary/[0.08] border-primary/25' : 'bg-[var(--bg-surface)] border-[var(--border-base)]'
                    }`}>
                      <button
                        onClick={() => toggleSerie(i)}
                        className="w-full flex items-center gap-4 px-4 py-4 active:scale-[0.98] transition-all"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          done ? 'bg-primary shadow-lg shadow-primary/25' : 'bg-[var(--bg-surface)] border-2 border-[var(--border-base)]'
                        }`}>
                          {done ? <Check className="w-5 h-5 text-white" /> : <span className="text-[var(--text-muted)] text-sm font-bold">{setNum}</span>}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className={`text-base font-bold transition-all ${done ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                            Série {setNum}
                          </p>
                          <p className="text-sm mt-0.5 text-[var(--text-muted)]">
                            {currentExo.reps || currentExo.reps_cible || '?'} reps
                            {chargeDisplay != null ? ` — ${chargeDisplay} ${currentExo.charge_unite || 'kg'}` : ''}
                          </p>
                        </div>
                        {!done && restDisplay && (
                          <div className="flex items-center gap-1 text-[var(--text-muted)] flex-shrink-0">
                            <Timer className="w-3 h-3" />
                            <span className="text-[10px] font-medium">{restDisplay}s</span>
                          </div>
                        )}
                        {done && <span className="text-[10px] font-bold text-primary flex-shrink-0">FAIT</span>}
                      </button>

                      {/* Log inputs — apparaît quand la série est cochée (V3b) */}
                      {done && (
                        <div className="px-4 pb-3 pt-0 border-t border-[var(--border-subtle)] bg-[var(--bg-card)]/40">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-3 mb-2">Ma performance</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5">
                              <label className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">Charge</label>
                              <div className="flex items-baseline gap-1">
                                <input type="number" min={0} step={0.5}
                                  defaultValue={log.charge_kg_reel ?? chargeDisplay ?? ''}
                                  onBlur={e => logSetPerf(currentExo.id, setNum, 'charge_kg_reel', e.target.value)}
                                  placeholder={chargeDisplay ?? '0'}
                                  className="w-full bg-transparent text-[var(--text-primary)] text-base font-black tabular-nums border-none focus:outline-none" />
                                <span className="text-[10px] text-[var(--text-muted)]">{currentExo.charge_unite || 'kg'}</span>
                              </div>
                            </div>
                            <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5">
                              <label className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">Reps</label>
                              <input type="number" min={0}
                                defaultValue={log.reps_reel ?? (typeof currentExo.reps === 'number' ? currentExo.reps : '')}
                                onBlur={e => logSetPerf(currentExo.id, setNum, 'reps_reel', e.target.value)}
                                placeholder={currentExo.reps_cible || '?'}
                                className="w-full bg-transparent text-[var(--text-primary)] text-base font-black tabular-nums border-none focus:outline-none" />
                            </div>
                            <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5">
                              <label className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">RPE</label>
                              <input type="number" min={0} max={10} step={0.5}
                                defaultValue={log.rpe_percu ?? currentExo.rpe_cible ?? ''}
                                onBlur={e => logSetPerf(currentExo.id, setNum, 'rpe_percu', e.target.value)}
                                placeholder={currentExo.rpe_cible ?? '—'}
                                className="w-full bg-transparent text-[var(--text-primary)] text-base font-black tabular-nums border-none focus:outline-none" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══════ BOTTOM NAV — Exercices Prev / Next ═══════ */}
      <div
        className="flex-shrink-0 px-4 pt-2 border-t border-[var(--border-base)] bg-[var(--bg-elevated)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex gap-2.5">
          {/* Précédent — compact icon button */}
          <button
            onClick={() => goToExercice(currentIdx - 1)}
            disabled={currentIdx === 0}
            aria-label="Exercice précédent"
            className="flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-2xl bg-[var(--bg-surface)] text-[var(--text-secondary)] active:scale-[0.95] transition-all disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Suivant / Terminer — main action */}
          {isLastExo ? (
            <button
              onClick={finishWorkout}
              className="flex-1 h-14 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-light text-white text-[15px] font-bold active:scale-[0.98] transition-all shadow-lg shadow-primary/30"
            >
              <Trophy className="w-5 h-5" /> Terminer la séance
            </button>
          ) : (
            <button
              onClick={() => goToExercice(currentIdx + 1)}
              className="flex-1 h-14 flex items-center justify-center gap-2 rounded-2xl bg-primary text-white text-[15px] font-bold hover:bg-[#e55e24] active:scale-[0.98] transition-all shadow-lg shadow-primary/30"
            >
              Suivant <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
