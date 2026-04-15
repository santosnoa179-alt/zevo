import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  Search, X, ChevronLeft, ChevronRight, Loader2,
  Dumbbell, Target, Layers, Info,
  SlidersHorizontal, RotateCcw, Zap,
  ArrowUpDown, Heart, Footprints, Hand, CircleDot,
  Activity, Crown, Shield, Languages
} from 'lucide-react'

const PER_PAGE = 12

// ── Traductions body parts ──
const BODY_PART_LABELS = {
  back: 'Dos',
  cardio: 'Cardio',
  chest: 'Poitrine',
  'lower arms': 'Avant-bras',
  'lower legs': 'Mollets',
  neck: 'Cou',
  shoulders: 'Epaules',
  'upper arms': 'Bras',
  'upper legs': 'Cuisses',
  waist: 'Abdos',
}

const EQUIPMENT_LABELS = {
  barbell: 'Barre',
  dumbbell: 'Halteres',
  'body weight': 'Poids du corps',
  cable: 'Cable',
  machine: 'Machine',
  band: 'Elastique',
  kettlebell: 'Kettlebell',
  'medicine ball': 'Medecine ball',
  'stability ball': 'Swiss ball',
  'ez barbell': 'Barre EZ',
  'olympic barbell': 'Barre olympique',
  'smith machine': 'Smith machine',
  roller: 'Rouleau',
  rope: 'Corde',
  'leverage machine': 'Machine a levier',
  assisted: 'Assiste',
  weighted: 'Leste',
  bosu: 'Bosu',
  'resistance band': 'Bande de resistance',
  tire: 'Pneu',
  trap: 'Trap bar',
  'upper body ergometer': 'Ergometre',
  hammer: 'Marteau',
  sled: 'Traineau',
  elliptical: 'Elliptique',
  skierg: 'SkiErg',
  stepmill: 'Stepmill',
  'stationary bike': 'Velo stationnaire',
}

const TARGET_LABELS = {
  abductors: 'Abducteurs',
  abs: 'Abdominaux',
  adductors: 'Adducteurs',
  biceps: 'Biceps',
  calves: 'Mollets',
  'cardiovascular system': 'Cardio',
  delts: 'Deltoides',
  forearms: 'Avant-bras',
  glutes: 'Fessiers',
  hamstrings: 'Ischio-jambiers',
  lats: 'Dorsaux',
  'levator scapulae': 'Elevateur scapulaire',
  pectorals: 'Pectoraux',
  quads: 'Quadriceps',
  'serratus anterior': 'Dentele',
  spine: 'Colonne',
  traps: 'Trapezes',
  triceps: 'Triceps',
  'upper back': 'Haut du dos',
}

// Map combinée pour muscles secondaires (noms variés dans ExerciseDB)
const MUSCLE_LABELS = {
  ...TARGET_LABELS,
  ...BODY_PART_LABELS,
  chest: 'Poitrine',
  shoulders: 'Epaules',
  'upper arms': 'Bras',
  'lower arms': 'Avant-bras',
  'lower legs': 'Mollets',
  'upper legs': 'Cuisses',
  'anterior deltoid': 'Deltoides anterieurs',
  'lateral deltoid': 'Deltoides lateraux',
  'posterior deltoid': 'Deltoides posterieurs',
  'sternal head': 'Faisceau sternal',
  'clavicular head': 'Faisceau claviculaire',
  'long head': 'Longue portion',
  'short head': 'Courte portion',
  'inner thigh': 'Interieur cuisse',
  'outer thigh': 'Exterieur cuisse',
  'hip flexors': 'Flechisseurs hanche',
  'lower back': 'Lombaires',
  'upper back': 'Haut du dos',
  core: 'Gainage',
  obliques: 'Obliques',
  'rotator cuff': 'Coiffe des rotateurs',
  rhomboids: 'Rhomboides',
  'tensor fasciae latae': 'Tenseur fascia lata',
  brachialis: 'Brachial',
  brachioradialis: 'Brachio-radial',
  infraspinatus: 'Infra-epineux',
  teres: 'Petit rond',
  'teres major': 'Grand rond',
  'teres minor': 'Petit rond',
  soleus: 'Soleaire',
  gastrocnemius: 'Gastrocnemien',
  sartorius: 'Couturier',
  gracilis: 'Gracile',
  plantaris: 'Plantaire',
  piriformis: 'Piriforme',
  'wrist extensors': 'Extenseurs poignet',
  'wrist flexors': 'Flechisseurs poignet',
}

function translate(key, map) {
  return map[key] || MUSCLE_LABELS[key] || key?.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '—'
}

// Icône + couleur par zone du corps
const BODY_PART_ICONS = {
  back: { icon: ArrowUpDown, color: '#8B5CF6' },
  cardio: { icon: Activity, color: '#EF4444' },
  chest: { icon: Shield, color: '#3B82F6' },
  'lower arms': { icon: Hand, color: '#F59E0B' },
  'lower legs': { icon: Footprints, color: '#10B981' },
  neck: { icon: CircleDot, color: '#EC4899' },
  shoulders: { icon: Crown, color: '#6366F1' },
  'upper arms': { icon: Zap, color: '#FF6B2B' },
  'upper legs': { icon: Dumbbell, color: '#14B8A6' },
  waist: { icon: Heart, color: '#F43F5E' },
}

const DIFFICULTY_LABELS = {
  beginner: { label: 'Debutant', color: '#10B981' },
  intermediate: { label: 'Intermediaire', color: '#F59E0B' },
  expert: { label: 'Expert', color: '#EF4444' },
}

// ── Card image avec lazy loading GIF via IntersectionObserver ──
function ExerciseCardImage({ exercise, bpIcon, onGifLoaded }) {
  const [gif, setGif] = useState(exercise.gif_url || null)
  const [loading, setLoading] = useState(false)
  const [errored, setErrored] = useState(false)
  const ref = useRef(null)
  const fetchedRef = useRef(false)
  const IconComp = bpIcon.icon

  useEffect(() => {
    if (exercise.gif_url) {
      setGif(exercise.gif_url)
      return
    }
    if (fetchedRef.current) return

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0]
        if (!entry.isIntersecting || fetchedRef.current) return
        fetchedRef.current = true
        observer.disconnect()

        setLoading(true)
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch('/api/exercise-gif', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ exerciseId: exercise.id }),
          })
          const json = await res.json()
          if (res.ok && json.url) {
            setGif(json.url)
            if (onGifLoaded) onGifLoaded(exercise.id, json.url)
          } else {
            setErrored(true)
          }
        } catch (err) {
          setErrored(true)
        } finally {
          setLoading(false)
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [exercise.id, exercise.gif_url, onGifLoaded])

  return (
    <div ref={ref} className="relative h-32 bg-[var(--bg-base)] overflow-hidden flex items-center justify-center">
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-500"
        style={{ background: `radial-gradient(circle at center, ${bpIcon.color} 0%, transparent 70%)` }}
      />

      {/* GIF si dispo */}
      {gif && !errored && (
        <img
          src={gif}
          alt={exercise.name_fr || exercise.name}
          loading="lazy"
          className="relative max-h-full max-w-full object-contain transition-transform group-hover:scale-105 duration-500"
          onError={() => setErrored(true)}
        />
      )}

      {/* Loader */}
      {loading && !gif && (
        <div
          className="relative w-14 h-14 rounded-2xl flex items-center justify-center animate-pulse"
          style={{ background: `${bpIcon.color}15` }}
        >
          <Loader2 size={20} className="animate-spin" style={{ color: bpIcon.color }} />
        </div>
      )}

      {/* Fallback icone */}
      {!gif && !loading && (
        <div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
          style={{ background: `${bpIcon.color}15` }}
        >
          <IconComp size={28} style={{ color: bpIcon.color }} />
        </div>
      )}
    </div>
  )
}

export default function ExerciseLibraryPage() {
  const { user } = useAuth()

  // Data
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncError, setSyncError] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [bodyPartFilter, setBodyPartFilter] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState('')
  const [targetFilter, setTargetFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  // Modal
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [gifUrl, setGifUrl] = useState(null)
  const [gifLoading, setGifLoading] = useState(false)
  const [gifError, setGifError] = useState(false)

  // Translation
  const [translating, setTranslating] = useState(false)
  const [translateProgress, setTranslateProgress] = useState(0)
  const [translateTotal, setTranslateTotal] = useState(0)
  const [translateDone, setTranslateDone] = useState(0)
  const [translateError, setTranslateError] = useState(null)

  // ── Load exercises from Supabase ──
  const loadExercises = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('exercises')
      .select('*', { count: 'exact' })
      .order('name')

    if (error) {
      console.error('[ExerciseLibrary] Load error:', error)
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      await triggerSync()
    } else {
      setExercises(data)
      setLoading(false)
    }
  }, [])

  const triggerSync = async () => {
    setSyncing(true)
    setSyncError(null)
    setSyncProgress(0)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      }

      let offset = 0
      const PAGE_SIZE = 10
      const ESTIMATED_TOTAL = 1300
      let hasMore = true

      while (hasMore) {
        const res = await fetch('/api/sync-exercises', {
          method: 'POST',
          headers,
          body: JSON.stringify({ offset, limit: PAGE_SIZE }),
        })

        const json = await res.json()

        if (!res.ok) {
          setSyncError(json.error || 'Erreur sync')
          setSyncing(false)
          setLoading(false)
          return
        }

        hasMore = json.hasMore
        offset += json.inserted
        setSyncProgress(Math.min(Math.round((offset / ESTIMATED_TOTAL) * 100), 99))
      }

      setSyncProgress(100)

      // Reload from Supabase
      const { data } = await supabase.from('exercises').select('*').order('name')
      setExercises(data || [])
    } catch (err) {
      setSyncError(err.message)
    }
    setSyncing(false)
    setLoading(false)
  }

  // ── Batch translate via OpenAI ──
  const triggerTranslate = async () => {
    setTranslating(true)
    setTranslateError(null)
    setTranslateDone(0)
    setTranslateProgress(0)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      }

      const BATCH_SIZE = 10
      let hasMore = true
      let totalDone = 0
      let total = 0

      while (hasMore) {
        const res = await fetch('/api/sync-exercises', {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'translate', limit: BATCH_SIZE }),
        })
        const json = await res.json()

        if (!res.ok) {
          setTranslateError(json.error || 'Erreur traduction')
          setTranslating(false)
          return
        }

        totalDone += json.translated
        total = json.total || total
        hasMore = json.hasMore
        setTranslateDone(totalDone)
        setTranslateTotal(total)
        setTranslateProgress(total > 0 ? Math.round(((total - json.totalRemaining) / total) * 100) : 0)

        // Safety break
        if (json.translated === 0 && !hasMore) break
      }

      setTranslateProgress(100)

      // Reload
      const { data } = await supabase.from('exercises').select('*').order('name')
      setExercises(data || [])
    } catch (err) {
      setTranslateError(err.message)
    }
    setTranslating(false)
  }

  useEffect(() => {
    loadExercises()
  }, [loadExercises])

  // ── Derived filter options ──
  const bodyParts = useMemo(() => [...new Set(exercises.map(e => e.body_part))].filter(Boolean).sort(), [exercises])
  const equipments = useMemo(() => [...new Set(exercises.map(e => e.equipment))].filter(Boolean).sort(), [exercises])
  const targets = useMemo(() => [...new Set(exercises.map(e => e.target_muscle))].filter(Boolean).sort(), [exercises])

  // ── Filtered + paginated ──
  const filtered = useMemo(() => {
    let result = exercises
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.name_fr && e.name_fr.toLowerCase().includes(q))
      )
    }
    if (bodyPartFilter) result = result.filter(e => e.body_part === bodyPartFilter)
    if (equipmentFilter) result = result.filter(e => e.equipment === equipmentFilter)
    if (targetFilter) result = result.filter(e => e.target_muscle === targetFilter)
    return result
  }, [exercises, search, bodyPartFilter, equipmentFilter, targetFilter])

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE
    return filtered.slice(start, start + PER_PAGE)
  }, [filtered, page])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [search, bodyPartFilter, equipmentFilter, targetFilter])

  // ── Load GIF on demand when modal opens ──
  useEffect(() => {
    if (!selectedExercise) {
      setGifUrl(null)
      setGifLoading(false)
      setGifError(false)
      return
    }

    // Si deja dispo -> affiche direct
    if (selectedExercise.gif_url) {
      setGifUrl(selectedExercise.gif_url)
      setGifLoading(false)
      setGifError(false)
      return
    }

    // Sinon -> fetch via proxy
    let cancelled = false
    const loadGif = async () => {
      setGifLoading(true)
      setGifError(false)
      setGifUrl(null)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/exercise-gif', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ exerciseId: selectedExercise.id }),
        })
        const json = await res.json()
        if (cancelled) return
        if (!res.ok || !json.url) {
          setGifError(true)
        } else {
          setGifUrl(json.url)
          // Update local state pour que le prochain ouvrage affiche direct
          setExercises(prev => prev.map(e => e.id === selectedExercise.id ? { ...e, gif_url: json.url } : e))
        }
      } catch (err) {
        if (!cancelled) setGifError(true)
      } finally {
        if (!cancelled) setGifLoading(false)
      }
    }
    loadGif()
    return () => { cancelled = true }
  }, [selectedExercise])

  const activeFilterCount = [bodyPartFilter, equipmentFilter, targetFilter].filter(Boolean).length

  const clearFilters = () => {
    setBodyPartFilter('')
    setEquipmentFilter('')
    setTargetFilter('')
    setSearch('')
  }

  // ════════════════════════════════════════
  // LOADING / SYNC STATE
  // ════════════════════════════════════════
  if (loading || syncing) {
    return (
      <div className="p-4 md:p-6 max-w-[1300px] animate-page-enter">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#FF6B2B]/10 flex items-center justify-center">
            <Dumbbell size={22} className="text-[#FF6B2B]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Exercices</h1>
            <p className="text-[var(--text-muted)] text-sm">
              {syncing ? 'Synchronisation depuis ExerciseDB...' : 'Chargement...'}
            </p>
          </div>
        </div>

        {syncing && (
          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#FF6B2B]/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 size={28} className="text-[#FF6B2B] animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Import en cours...</h2>
            <p className="text-[var(--text-muted)] text-sm max-w-md mx-auto mb-4">
              Premier chargement : import des exercices depuis ExerciseDB. Cela peut prendre quelques minutes.
            </p>
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="h-2 w-56 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FF6B2B] rounded-full transition-all duration-300"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
              <span className="text-sm font-bold text-[#FF6B2B] min-w-[3ch]">{syncProgress}%</span>
            </div>
            <p className="text-[var(--text-muted)] text-xs">
              {syncProgress < 100 ? `~${Math.round(syncProgress / 100 * 1300)} exercices importes...` : 'Finalisation...'}
            </p>
          </div>
        )}

        {!syncing && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skel-block rounded-2xl h-64" />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ════════════════════════════════════════
  // MAIN PAGE
  // ════════════════════════════════════════
  return (
    <div className="p-4 md:p-6 max-w-[1300px] animate-page-enter">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FF6B2B]/10 flex items-center justify-center relative shrink-0">
            <Dumbbell size={22} className="text-[#FF6B2B]" />
            <div className="absolute inset-0 rounded-2xl blur-xl opacity-30 bg-[#FF6B2B]/20" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Exercices</h1>
            <p className="text-[var(--text-muted)] text-[13px] mt-0.5">
              {exercises.length.toLocaleString()} exercices disponibles
            </p>
          </div>
        </div>

        {/* Bouton traduction */}
        {!translating && (
          <button
            onClick={triggerTranslate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-base)] bg-[var(--bg-card)] text-[var(--text-secondary)] text-sm font-semibold hover:border-[#FF6B2B]/30 hover:text-[#FF6B2B] transition-all"
            title="Traduire tous les exercices en francais via DeepL"
          >
            <Languages size={15} />
            Traduire
          </button>
        )}
      </div>

      {/* Translation progress */}
      {translating && (
        <div className="mb-4 p-4 rounded-xl border border-[#FF6B2B]/20 bg-[#FF6B2B]/5">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 size={16} className="text-[#FF6B2B] animate-spin" />
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Traduction en cours via DeepL...
            </p>
            <span className="ml-auto text-sm font-bold text-[#FF6B2B]">{translateProgress}%</span>
          </div>
          <div className="h-2 w-full bg-[var(--bg-surface)] rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-[#FF6B2B] rounded-full transition-all duration-300"
              style={{ width: `${translateProgress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {translateDone} / {translateTotal} exercices traduits
          </p>
        </div>
      )}

      {/* Translation error */}
      {translateError && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <Info size={16} />
          {translateError}
          <button onClick={triggerTranslate} className="ml-auto text-xs font-bold underline">Reessayer</button>
        </div>
      )}

      {/* Sync error */}
      {syncError && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <Info size={16} />
          {syncError}
          <button onClick={triggerSync} className="ml-auto text-xs font-bold underline">Reessayer</button>
        </div>
      )}

      {/* ── Search + Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un exercice..."
            className="w-full bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl pl-11 pr-4 py-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 focus:shadow-[0_0_0_3px_rgba(255,107,43,0.08)] transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-semibold transition-all shrink-0 ${
            showFilters || activeFilterCount > 0
              ? 'border-[#FF6B2B]/30 bg-[#FF6B2B]/8 text-[#FF6B2B]'
              : 'border-[var(--border-base)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
          }`}
        >
          <SlidersHorizontal size={15} />
          Filtres
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#FF6B2B] text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Filter dropdowns ── */}
      {showFilters && (
        <div className="mb-6 p-5 rounded-2xl border border-[var(--border-base)] bg-[var(--bg-card)] space-y-4 animate-page-enter">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Filtres avances</p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs font-semibold text-[#FF6B2B] hover:underline flex items-center gap-1">
                <RotateCcw size={11} />
                Reinitialiser
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Zone du corps</label>
              <select
                value={bodyPartFilter}
                onChange={(e) => setBodyPartFilter(e.target.value)}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
              >
                <option value="">Toutes les zones</option>
                {bodyParts.map(bp => (
                  <option key={bp} value={bp}>{translate(bp, BODY_PART_LABELS)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Equipement</label>
              <select
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
              >
                <option value="">Tous les equipements</option>
                {equipments.map(eq => (
                  <option key={eq} value={eq}>{translate(eq, EQUIPMENT_LABELS)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Muscle cible</label>
              <select
                value={targetFilter}
                onChange={(e) => setTargetFilter(e.target.value)}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
              >
                <option value="">Tous les muscles</option>
                {targets.map(t => (
                  <option key={t} value={t}>{translate(t, TARGET_LABELS)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Results info ── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[var(--text-muted)]">
          <span className="font-bold text-[var(--text-secondary)]">{filtered.length}</span> exercice{filtered.length !== 1 ? 's' : ''}
          {activeFilterCount > 0 && ' (filtres)'}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Page <span className="font-bold text-[var(--text-secondary)]">{page}</span> / {totalPages || 1}
        </p>
      </div>

      {/* ── Exercise grid ── */}
      {paginated.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Search size={24} className="text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)] font-semibold mb-1">Aucun exercice trouve</p>
          <p className="text-[var(--text-muted)] text-xs">Essayez de modifier vos filtres ou votre recherche</p>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="mt-4 text-xs font-bold text-[#FF6B2B] hover:underline">
              Reinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginated.map((ex) => {
            const bpIcon = BODY_PART_ICONS[ex.body_part] || { icon: Dumbbell, color: '#FF6B2B' }
            const diff = DIFFICULTY_LABELS[ex.difficulty]

            return (
              <button
                key={ex.id}
                onClick={() => setSelectedExercise(ex)}
                className="group rounded-2xl border border-[var(--border-base)] bg-[var(--bg-card)] overflow-hidden text-left transition-all duration-300 hover:border-[#FF6B2B]/30 hover:shadow-lg hover:shadow-[#FF6B2B]/5 hover:scale-[1.02] active:scale-[0.98]"
              >
                {/* Image + lazy GIF load */}
                <div className="relative">
                  <ExerciseCardImage
                    exercise={ex}
                    bpIcon={bpIcon}
                    onGifLoaded={(id, url) => {
                      setExercises(prev => prev.map(e => e.id === id ? { ...e, gif_url: url } : e))
                    }}
                  />
                  {/* Difficulty badge */}
                  {diff && (
                    <span
                      className="absolute top-3 right-3 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md z-10"
                      style={{ background: `${diff.color}25`, color: diff.color, backdropFilter: 'blur(4px)' }}
                    >
                      {diff.label}
                    </span>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3 pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white bg-[#FF6B2B] px-3 py-1.5 rounded-full">
                      <Info size={10} />
                      Voir les details
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 space-y-2.5">
                  <h3 className="text-[13px] font-bold text-[var(--text-primary)] leading-tight line-clamp-2 capitalize">
                    {ex.name_fr || ex.name}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                      style={{ background: `${bpIcon.color}15`, color: bpIcon.color }}
                    >
                      <Target size={8} />
                      {translate(ex.target_muscle, TARGET_LABELS)}
                    </span>
                    <span className="text-[9px] font-medium text-[var(--text-muted)] px-2 py-0.5 rounded-md bg-[var(--bg-surface)]">
                      {translate(ex.equipment, EQUIPMENT_LABELS)}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2.5 rounded-xl border border-[var(--border-base)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <ChevronLeft size={16} />
          </button>

          {(() => {
            const pages = []
            const start = Math.max(1, page - 2)
            const end = Math.min(totalPages, page + 2)
            for (let i = start; i <= end; i++) {
              pages.push(
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                    i === page
                      ? 'bg-[#FF6B2B] text-white shadow-lg shadow-[#FF6B2B]/20'
                      : 'border border-[var(--border-base)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {i}
                </button>
              )
            }
            return pages
          })()}

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2.5 rounded-xl border border-[var(--border-base)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════ */}
      {/* EXERCISE DETAIL MODAL                    */}
      {/* ════════════════════════════════════════ */}
      {selectedExercise && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-page-enter"
          onClick={() => setSelectedExercise(null)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--border-base)] bg-[var(--bg-card)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedExercise(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all"
            >
              <X size={16} />
            </button>

            {/* Modal header with GIF or icon fallback */}
            {(() => {
              const mbp = BODY_PART_ICONS[selectedExercise.body_part] || { icon: Dumbbell, color: '#FF6B2B' }
              const MIcon = mbp.icon
              const mdiff = DIFFICULTY_LABELS[selectedExercise.difficulty]
              const showGif = gifUrl && !gifError
              return (
                <div className="relative h-64 bg-[var(--bg-base)] flex items-center justify-center overflow-hidden rounded-t-3xl">
                  {/* Background glow */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{ background: `radial-gradient(circle at center, ${mbp.color} 0%, transparent 70%)` }}
                  />

                  {/* GIF si dispo */}
                  {showGif && (
                    <img
                      src={gifUrl}
                      alt={selectedExercise.name_fr || selectedExercise.name}
                      className="relative max-h-full max-w-full object-contain"
                      onError={() => setGifError(true)}
                    />
                  )}

                  {/* Loader */}
                  {gifLoading && (
                    <div className="relative flex flex-col items-center gap-3">
                      <div
                        className="w-20 h-20 rounded-3xl flex items-center justify-center animate-pulse"
                        style={{ background: `${mbp.color}15` }}
                      >
                        <Loader2 size={28} className="animate-spin" style={{ color: mbp.color }} />
                      </div>
                      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Chargement du GIF...
                      </p>
                    </div>
                  )}

                  {/* Fallback icone (si pas de GIF et pas de loading) */}
                  {!showGif && !gifLoading && (
                    <div
                      className="relative w-20 h-20 rounded-3xl flex items-center justify-center"
                      style={{ background: `${mbp.color}15` }}
                    >
                      <MIcon size={36} style={{ color: mbp.color }} />
                    </div>
                  )}

                  {/* Difficulty badge */}
                  {mdiff && (
                    <span
                      className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg backdrop-blur-md z-10"
                      style={{ background: `${mdiff.color}25`, color: mdiff.color }}
                    >
                      {mdiff.label}
                    </span>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--bg-card)] to-transparent pointer-events-none" />
                </div>
              )
            })()}

            <div className="p-6 -mt-4 relative">
              <h2 className="text-xl font-extrabold text-[var(--text-primary)] capitalize mb-3">
                {selectedExercise.name_fr || selectedExercise.name}
              </h2>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-[#FF6B2B]/10 text-[#FF6B2B]">
                  <Target size={10} />
                  {translate(selectedExercise.target_muscle, TARGET_LABELS)}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400">
                  <Layers size={10} />
                  {translate(selectedExercise.body_part, BODY_PART_LABELS)}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                  <Dumbbell size={10} />
                  {translate(selectedExercise.equipment, EQUIPMENT_LABELS)}
                </span>
              </div>

              {/* Description */}
              {(selectedExercise.description_fr || selectedExercise.description) && (
                <div className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Description</p>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {selectedExercise.description_fr || selectedExercise.description}
                  </p>
                </div>
              )}

              {/* Secondary muscles */}
              {selectedExercise.secondary_muscles?.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Muscles secondaires</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedExercise.secondary_muscles_fr?.length === selectedExercise.secondary_muscles.length
                      ? selectedExercise.secondary_muscles_fr
                      : selectedExercise.secondary_muscles
                    ).map((m, i) => (
                      <span key={i} className="text-[10px] font-medium px-2.5 py-1 rounded-md bg-[var(--bg-surface)] text-[var(--text-secondary)] capitalize">
                        {selectedExercise.secondary_muscles_fr?.length ? m : translate(m, MUSCLE_LABELS)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              {selectedExercise.instructions?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Instructions</p>
                  <div className="space-y-2.5">
                    {(selectedExercise.instructions_fr?.length === selectedExercise.instructions.length
                      ? selectedExercise.instructions_fr
                      : selectedExercise.instructions
                    ).map((step, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-[#FF6B2B]/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px] font-black text-[#FF6B2B]">{i + 1}</span>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
