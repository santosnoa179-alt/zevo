import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  Search, Filter, X, ChevronLeft, ChevronRight, Loader2,
  Dumbbell, Target, Layers, Info, ExternalLink, Play,
  SlidersHorizontal, RotateCcw, Zap, ArrowRight
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

function translate(key, map) {
  return map[key] || key?.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '—'
}

export default function ExerciseLibraryPage() {
  const { user } = useAuth()

  // Data
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
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

  // ── Load exercises from Supabase ──
  const loadExercises = useCallback(async () => {
    setLoading(true)
    const { data, error, count } = await supabase
      .from('exercises')
      .select('*', { count: 'exact' })
      .order('name')

    if (error) {
      console.error('[ExerciseLibrary] Load error:', error)
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      // Table is empty — trigger sync
      await triggerSync()
    } else {
      setExercises(data)
      setLoading(false)
    }
  }, [])

  const triggerSync = async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/sync-exercises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
      })
      const json = await res.json()
      if (!res.ok) {
        setSyncError(json.error || 'Erreur sync')
        setSyncing(false)
        setLoading(false)
        return
      }
      // Reload from Supabase
      const { data } = await supabase.from('exercises').select('*').order('name')
      setExercises(data || [])
    } catch (err) {
      setSyncError(err.message)
    }
    setSyncing(false)
    setLoading(false)
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
      result = result.filter(e => e.name.toLowerCase().includes(q))
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
            <p className="text-[var(--text-muted)] text-sm max-w-md mx-auto">
              Premier chargement : import de +1300 exercices depuis ExerciseDB. Cela peut prendre 10-20 secondes.
            </p>
            <div className="mt-6 h-1.5 w-48 mx-auto bg-[var(--bg-surface)] rounded-full overflow-hidden">
              <div className="h-full bg-[#FF6B2B] rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
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
      </div>

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
        {/* Search */}
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

        {/* Filter toggle */}
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
            {/* Body part */}
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

            {/* Equipment */}
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

            {/* Target muscle */}
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
          {paginated.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setSelectedExercise(ex)}
              className="group rounded-2xl border border-[var(--border-base)] bg-[var(--bg-card)] overflow-hidden text-left transition-all duration-300 hover:border-[#FF6B2B]/30 hover:shadow-lg hover:shadow-[#FF6B2B]/5 hover:scale-[1.02] active:scale-[0.98]"
            >
              {/* GIF */}
              <div className="relative aspect-square bg-[var(--bg-base)] overflow-hidden">
                {ex.gif_url ? (
                  <img
                    src={ex.gif_url}
                    alt={ex.name}
                    loading="lazy"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Dumbbell size={32} className="text-[var(--text-muted)]/20" />
                  </div>
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white bg-[#FF6B2B] px-3 py-1.5 rounded-full">
                    <Info size={10} />
                    Voir les details
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-2">
                <h3 className="text-[13px] font-bold text-[var(--text-primary)] leading-tight line-clamp-2 capitalize">
                  {ex.name}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#FF6B2B]/10 text-[#FF6B2B]">
                    <Target size={8} />
                    {translate(ex.target_muscle, TARGET_LABELS)}
                  </span>
                  <span className="text-[9px] font-medium text-[var(--text-muted)] px-2 py-0.5 rounded-md bg-[var(--bg-surface)]">
                    {translate(ex.equipment, EQUIPMENT_LABELS)}
                  </span>
                </div>
              </div>
            </button>
          ))}
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

          {/* Page numbers */}
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
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--border-base)] bg-[var(--bg-card)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedExercise(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all"
            >
              <X size={16} />
            </button>

            {/* GIF */}
            <div className="relative bg-[var(--bg-base)] aspect-[4/3] flex items-center justify-center overflow-hidden rounded-t-3xl">
              {selectedExercise.gif_url ? (
                <img
                  src={selectedExercise.gif_url}
                  alt={selectedExercise.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Dumbbell size={48} className="text-[var(--text-muted)]/20" />
              )}
              {/* Gradient overlay bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--bg-card)] to-transparent" />
            </div>

            {/* Content */}
            <div className="p-6 -mt-8 relative">
              {/* Title */}
              <h2 className="text-xl font-extrabold text-[var(--text-primary)] capitalize mb-3">
                {selectedExercise.name}
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

              {/* Secondary muscles */}
              {selectedExercise.secondary_muscles?.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Muscles secondaires</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedExercise.secondary_muscles.map((m, i) => (
                      <span key={i} className="text-[10px] font-medium px-2.5 py-1 rounded-md bg-[var(--bg-surface)] text-[var(--text-secondary)] capitalize">
                        {translate(m, TARGET_LABELS)}
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
                    {selectedExercise.instructions.map((step, i) => (
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
