import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import {
  X, ChevronLeft, ChevronRight, Check, Play, Pause,
  Dumbbell, Timer, Trophy, Loader2, AlertCircle, RotateCcw, StickyNote
} from 'lucide-react'

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

  // ── Data ──
  const [seance, setSeance] = useState(null)
  const [exercices, setExercices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

      // Charger les exercices
      const { data: exosData, error: exosErr } = await supabase
        .from('seance_exercices')
        .select('id, series, reps, poids, repos, ordre, media_url, note_coach, exercices(nom, muscle_group, equipment, image_url, video_url, gif_url)')
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

      setSeance(seanceData)
      setExercices(exosData)
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
    setTimeout(() => {
      setCurrentIdx(newIdx)
      setDirection(0)
      setAnimating(false)
    }, 250)
  }, [currentIdx, totalExos, animating])

  // ── Terminer la séance ──
  const finishWorkout = async () => {
    setFinished(true)
    setIsRunning(false)
    clearInterval(globalTimerRef.current)
    skipRest()

    // Marquer comme complétée en DB si c'est une vraie séance
    if (seanceId && seanceId !== 'demo' && seance?.id) {
      const { error } = await supabase
        .from('seances')
        .update({ is_completed: true })
        .eq('id', seance.id)
      if (error) console.error('[Workout] Erreur update is_completed:', error.message)

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
              const rec = typeof f.recurrence === 'string' ? JSON.parse(f.recurrence) : f.recurrence
              return rec?.intervalle === 'post_seance' && rec?.actif === true
            })

            if (formsToSend.length > 0) {
              // 4. Vérifier les formulaires déjà en attente (éviter les doublons)
              const { data: existing } = await supabase
                .from('formulaire_reponses')
                .select('formulaire_id')
                .eq('client_id', user.id)
                .eq('complete', false)
                .in('formulaire_id', formsToSend.map(f => f.id))

              const existingIds = new Set((existing || []).map(e => e.formulaire_id))
              const newForms = formsToSend.filter(f => !existingIds.has(f.id))

              // 5. Insérer uniquement les formulaires sans doublon en attente
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
          <Loader2 className="w-10 h-10 text-[#FF6B2B] animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-muted)] text-sm">Chargement de la séance...</p>
        </div>
      </div>
    )
  }

  // Erreur
  if (error) {
    return (
      <div className="fixed inset-0 bg-[var(--bg-elevated)] z-[100] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-[var(--text-primary)] text-xl font-bold mb-2">Oops !</h2>
          <p className="text-[var(--text-muted)] text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors"
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
      <div className="fixed inset-0 bg-[var(--bg-elevated)] z-[100] flex items-center justify-center p-6">
        <div className="text-center max-w-sm w-full">
          {/* Celebration */}
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FF6B2B] to-[#FF9A6C] flex items-center justify-center mx-auto shadow-2xl shadow-[#FF6B2B]/30">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            {/* Pulse ring */}
            <div className="absolute inset-0 w-24 h-24 rounded-full mx-auto animate-ping bg-[#FF6B2B]/20" style={{ animationDuration: '2s' }} />
          </div>

          <h1 className="text-[var(--text-primary)] text-3xl font-black mb-2">Bravo !</h1>
          <p className="text-[var(--text-muted)] text-sm mb-8">Séance terminée avec succès</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-2xl p-4">
              <Timer className="w-5 h-5 text-[#FF6B2B] mx-auto mb-2" />
              <p className="text-[var(--text-primary)] text-lg font-bold">{formatTime(globalTime)}</p>
              <p className="text-[var(--text-muted)] text-[10px] mt-1">Durée</p>
            </div>
            <div className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-2xl p-4">
              <Dumbbell className="w-5 h-5 text-[#FF6B2B] mx-auto mb-2" />
              <p className="text-[var(--text-primary)] text-lg font-bold">{totalExos}</p>
              <p className="text-[var(--text-muted)] text-[10px] mt-1">Exercices</p>
            </div>
            <div className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-2xl p-4">
              <Check className="w-5 h-5 text-[#FF6B2B] mx-auto mb-2" />
              <p className="text-[var(--text-primary)] text-lg font-bold">{totalDone}/{totalSeries}</p>
              <p className="text-[var(--text-muted)] text-[10px] mt-1">Séries</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/app/dashboard')}
            className="w-full py-4 rounded-2xl bg-[#FF6B2B] text-white text-base font-bold hover:bg-[#e55e24] active:scale-[0.98] transition-all shadow-lg shadow-[#FF6B2B]/25"
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

  return (
    <div className="fixed inset-0 bg-[var(--bg-elevated)] z-[100] flex flex-col select-none overflow-hidden">

      {/* ═══════ HEADER ═══════ */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 space-y-3">
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
            {isRunning ? <Pause className="w-3.5 h-3.5 text-[#FF6B2B]" /> : <Play className="w-3.5 h-3.5 text-[#FF6B2B]" />}
            <span className="text-[var(--text-primary)] text-sm font-bold tabular-nums">{formatTime(globalTime)}</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C] rounded-full transition-all duration-500 ease-out"
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
              {/* Média : media_url (coach) > video_url (exercice) > image_url > placeholder */}
              {(() => {
                const mediaUrl = currentExo.media_url?.trim()
                const videoUrl = currentExo.exercices?.video_url
                const imageUrl = currentExo.exercices?.image_url
                const url = mediaUrl || videoUrl || imageUrl || null

                if (!url) {
                  return (
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-2xl h-44 flex items-center justify-center mb-5">
                      <div className="text-center">
                        <Dumbbell className="w-10 h-10 text-white/[0.08] mx-auto mb-2" />
                        <p className="text-white/[0.15] text-[10px] font-medium">Vidéo de démonstration</p>
                      </div>
                    </div>
                  )
                }

                // Détection du type par extension (prioritaire sur l'origine du champ)
                const isImageFile = /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(url)
                const isVideoFile = /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url)

                // YouTube / Vimeo embed detection
                const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
                const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)

                // 1. Image statique — PAS d'icône play, PAS de contrôles vidéo
                if (isImageFile) {
                  return (
                    <div className="rounded-2xl overflow-hidden mb-5 border border-[var(--border-base)]">
                      <img
                        src={url}
                        alt={currentExo.exercices?.nom}
                        className="w-full h-44 object-cover"
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

                // 4. Fichier vidéo direct (.mp4, .webm, .mov)
                if (isVideoFile) {
                  return (
                    <div className="rounded-2xl overflow-hidden mb-5 border border-[var(--border-base)] bg-black">
                      <video
                        key={currentExo.id}
                        src={url}
                        className="w-full h-44 object-contain bg-black"
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls
                      />
                    </div>
                  )
                }

                // 5. URL sans extension claire — deviner par origine du champ
                // Si ça vient de image_url → afficher comme image
                if (url === imageUrl && url !== videoUrl) {
                  return (
                    <div className="rounded-2xl overflow-hidden mb-5 border border-[var(--border-base)]">
                      <img
                        src={url}
                        alt={currentExo.exercices?.nom}
                        className="w-full h-44 object-cover"
                      />
                    </div>
                  )
                }

                // Si ça vient de video_url → afficher comme vidéo
                if (url === videoUrl) {
                  return (
                    <div className="rounded-2xl overflow-hidden mb-5 border border-[var(--border-base)] bg-black">
                      <video
                        key={currentExo.id}
                        src={url}
                        className="w-full h-44 object-contain bg-black"
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls
                      />
                    </div>
                  )
                }

                // 6. URL générique (Google Drive, etc.) — iframe
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
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B]">
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
                {currentExo.poids && (
                  <p className="text-[var(--text-muted)] text-sm mt-1">{currentExo.series} séries × {currentExo.reps} reps — {currentExo.poids} kg</p>
                )}
                {!currentExo.poids && (
                  <p className="text-[var(--text-muted)] text-sm mt-1">{currentExo.series} séries × {currentExo.reps} reps</p>
                )}
              </div>

              {/* ═══════ NOTE COACH ═══════ */}
              {currentExo.note_coach && currentExo.note_coach.trim() && (
                <div className="mb-5 p-4 rounded-2xl bg-[#FF6B2B]/[0.08] border border-[#FF6B2B]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote className="w-4 h-4 text-[#FF6B2B]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B2B]">
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
                <div className="mb-5 bg-[#FF6B2B]/[0.08] border border-[#FF6B2B]/20 rounded-2xl p-5 text-center">
                  <p className="text-[#FF6B2B] text-[10px] font-bold uppercase tracking-widest mb-2">Temps de repos</p>
                  <p className="text-[var(--text-primary)] text-5xl font-black tabular-nums mb-1">{formatRestTime(restTime)}</p>
                  <div className="w-full h-1 bg-[var(--bg-surface)] rounded-full overflow-hidden mt-3 mb-4">
                    <div
                      className="h-full bg-[#FF6B2B] rounded-full transition-all duration-1000 ease-linear"
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
                  return (
                    <button
                      key={i}
                      onClick={() => toggleSerie(i)}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all active:scale-[0.98] ${
                        done
                          ? 'bg-[#FF6B2B]/[0.08] border-[#FF6B2B]/25'
                          : 'bg-[var(--bg-surface)] border-[var(--border-base)] hover:border-[var(--border-base)]'
                      }`}
                    >
                      {/* Check circle */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        done
                          ? 'bg-[#FF6B2B] shadow-lg shadow-[#FF6B2B]/25'
                          : 'bg-[var(--bg-surface)] border-2 border-[var(--border-base)]'
                      }`}>
                        {done ? (
                          <Check className="w-5 h-5 text-white" />
                        ) : (
                          <span className="text-[var(--text-muted)] text-sm font-bold">{i + 1}</span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 text-left min-w-0">
                        <p className={`text-base font-bold transition-all ${done ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                          Série {i + 1}
                        </p>
                        <p className={`text-sm mt-0.5 transition-all ${done ? 'text-[var(--text-muted)]' : 'text-[var(--text-muted)]'}`}>
                          {currentExo.reps} reps{currentExo.poids ? ` — ${currentExo.poids} kg` : ''}
                        </p>
                      </div>

                      {/* Repos indicator */}
                      {!done && currentExo.repos && (
                        <div className="flex items-center gap-1 text-[var(--text-muted)] flex-shrink-0">
                          <Timer className="w-3 h-3" />
                          <span className="text-[10px] font-medium">{currentExo.repos}s</span>
                        </div>
                      )}

                      {done && (
                        <span className="text-[10px] font-bold text-[#FF6B2B] flex-shrink-0">FAIT</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══════ BOTTOM NAV — Exercices Prev / Next ═══════ */}
      <div className="flex-shrink-0 px-4 pb-6 pt-3 border-t border-[var(--border-base)] bg-[var(--bg-elevated)]">
        {/* Quick dots navigation */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {exercices.map((_, i) => {
            const exoCompleted = completedSeries[i] && completedSeries[i].size >= (exercices[i]?.series || 0)
            return (
              <button
                key={i}
                onClick={() => goToExercice(i)}
                className={`rounded-full transition-all ${
                  i === currentIdx
                    ? 'w-8 h-2 bg-[#FF6B2B]'
                    : exoCompleted
                      ? 'w-2 h-2 bg-[#FF6B2B]/40'
                      : 'w-2 h-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)]'
                }`}
              />
            )
          })}
        </div>

        <div className="flex gap-3">
          {/* Précédent */}
          <button
            onClick={() => goToExercice(currentIdx - 1)}
            disabled={currentIdx === 0}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-[var(--bg-surface)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-surface)] active:scale-[0.98] transition-all disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-5 h-5" /> Précédent
          </button>

          {/* Suivant / Terminer */}
          {isLastExo ? (
            <button
              onClick={finishWorkout}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C] text-white text-sm font-bold active:scale-[0.98] transition-all shadow-lg shadow-[#FF6B2B]/25"
            >
              <Trophy className="w-5 h-5" /> Terminer
            </button>
          ) : (
            <button
              onClick={() => goToExercice(currentIdx + 1)}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#e55e24] active:scale-[0.98] transition-all shadow-lg shadow-[#FF6B2B]/25"
            >
              Suivant <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
