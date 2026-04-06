import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { usePlanLimits } from '../../hooks/usePlanLimits'
import { supabase } from '../../lib/supabase'
import { sendInvitation } from '../../lib/invitations'
import { useToast } from '../../components/ui/Toast'
import { Modal } from '../../components/ui/Modal'
import { calculerScoreBienEtre, couleurScore } from '../../utils/wellbeing'
import ProgramBuilder from './ProgramBuilder'
import {
  Search, MessageCircle, Settings, UserPlus, Mail, Phone,
  Target, Apple, Scale, Activity, Dumbbell,
  Calendar, Eye, Share2, ChevronRight, Loader2,
  User, Heart, Flame, BarChart3, Clock,
  Plus, X, Save, Trash2, Filter, Info, GripVertical,
  PlayCircle, ChevronLeft, Star, Video, Sparkles,
  Copy, CalendarPlus, Layers, PanelRightOpen, PanelRightClose,
  Pencil, ExternalLink, Coffee, UtensilsCrossed, Moon, Cookie, Minus,
  Wheat, Beef, Fish, Egg, Carrot, Grape, Droplets, TrendingUp, TrendingDown,
  Ruler, Weight, ChevronUp, ChevronDown as ChevronDownIcon,
  FolderOpen, Paperclip, FileText,
  CheckCircle2, Circle, Footprints, BookOpen, Smile, Upload,
  ClipboardList, AlertTriangle, Lock
} from 'lucide-react'

// ── Couleurs avatar ──
const AVATAR_COLORS = ['#FF6B2B', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6']

// ── Onglets internes ──
const TABS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: Eye },
  { id: 'infos', label: 'Informations', icon: User },
  { id: 'calendar', label: 'Calendrier', icon: Calendar },
  { id: 'sport', label: 'Sport', icon: Dumbbell },
  { id: 'nutrition', label: 'Nutrition', icon: Apple },
  { id: 'habitudes', label: 'Habitudes', icon: Flame },
  { id: 'objectifs', label: 'Objectifs', icon: Target },
  { id: 'suivi', label: 'Suivi', icon: BarChart3 },
  { id: 'partage', label: 'Partage', icon: Share2 },
]

// ══════════════════════════════════════
// STAT CARD — Carte réutilisable
// ══════════════════════════════════════
function StatCard({ icon: Icon, label, value, sub, accent = false }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        accent ? 'bg-[#FF6B2B]/10' : 'bg-[var(--bg-surface)]'
      }`}>
        <Icon size={15} className={accent ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[var(--text-muted)] text-[11px]">{label}</p>
        <p className="text-[var(--text-primary)] text-sm font-semibold">{value || '—'}</p>
      </div>
      {sub && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-semibold flex-shrink-0">
          {sub}
        </span>
      )}
    </div>
  )
}

// ══════════════════════════════════════
// CARTE PROGRAMME — Premium card pour overview
// ══════════════════════════════════════

function ClientProgrammesSection({ clientId, coachId, onOpenProgramme, onOpenNutrition }) {
  const [sportProgrammes, setSportProgrammes] = useState([])
  const [nutritionPlans, setNutritionPlans] = useState([])
  const [progProgress, setProgProgress] = useState({}) // {assignation_id: {total, done, pct}}
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId || !coachId) return
    setLoading(true)

    const loadAll = async () => {
      // Sport programmes
      const { data: sportData, error: sportErr } = await supabase
        .from('programme_assignations')
        .select('id, date_debut, statut, phase_actuelle, programmes(id, titre, duree_semaines, categorie)')
        .eq('coach_id', coachId)

      if (sportErr) console.error('[Programmes] Erreur fetch assignations:', sportErr.message)
      const progs = (sportData || []).filter(a => a.programmes)
      setSportProgrammes(progs)

      // Calculer la progression de chaque programme
      const progressMap = {}
      for (const assign of progs) {
        if (!assign.programmes?.id) continue
        const marker = `programme:${assign.programmes.id}`
        const { data: seancesData, error: seErr } = await supabase
          .from('seances')
          .select('id, is_completed')
          .eq('client_id', clientId)
          .eq('is_template', false)
          .not('client_id', 'is', null)
          .eq('notes', marker)
        if (seErr) console.error('[Programmes] Erreur fetch séances programme:', seErr.message)
        const all = seancesData || []
        const done = all.filter(s => s.is_completed).length
        progressMap[assign.id] = { total: all.length, done, pct: all.length > 0 ? Math.round((done / all.length) * 100) : 0 }
      }
      setProgProgress(progressMap)

      // Nutrition plans (from client_nutrition_plans table)
      const { data: nutritionData, error: nutritionErr } = await supabase
        .from('client_nutrition_plans')
        .select('id, nom, date_plan, created_at')
        .eq('coach_id', coachId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(5)
      setNutritionPlans(nutritionData || [])

      setLoading(false)
    }
    loadAll()
  }, [clientId, coachId])

  if (loading) return <div className="space-y-3"><div className="h-28 skel-block" /><div className="h-28 skel-block" /></div>

  return (
    <div className="space-y-4">

      {/* Section Entrainement Sportif */}
      <div className="glass-card overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#FF6B2B] via-[#FF8F5E] to-transparent" />
        <div className="px-5 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B2B]/15 to-[#FF8F5E]/10 flex items-center justify-center">
              <Dumbbell size={17} className="text-[#FF6B2B]" />
            </div>
            <div>
              <h3 className="text-[var(--text-primary)] text-sm font-bold">Entrainement Sportif</h3>
              <p className="text-[var(--text-muted)] text-[11px]">Programmes multi-semaines</p>
            </div>
          </div>
          <a href="/coach/sport"
            className="text-[11px] text-[#FF6B2B] font-semibold hover:text-[#FF9A6C] transition-colors flex items-center gap-1">
            Gerer <ChevronRight size={12} />
          </a>
        </div>

        <div className="px-5 md:px-6 pb-5">
          {sportProgrammes.length === 0 ? (
            <div className="bg-[var(--bg-base)] rounded-xl p-6 text-center border border-[var(--border-subtle)]">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-3">
                <Dumbbell size={18} className="text-[var(--text-muted)]" />
              </div>
              <p className="text-[var(--text-muted)] text-xs">Aucun programme sportif assigne</p>
              <a href="/coach/sport"
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl bg-[#FF6B2B]/10 text-[#FF6B2B] text-[11px] font-semibold hover:bg-[#FF6B2B]/20 transition-colors">
                <Plus size={12} /> Assigner un programme
              </a>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sportProgrammes.map(a => {
                const prog = progProgress[a.id]
                const pct = prog?.pct ?? 0
                const progressColor = pct >= 80 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#FF6B2B'
                return (
                  <div key={a.id} className="bg-[var(--bg-base)] rounded-xl p-4 border border-[var(--border-subtle)] hover:border-[var(--border-base)] transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center shrink-0">
                        <Dumbbell size={18} className="text-[#FF6B2B]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--text-primary)] text-sm font-semibold truncate">{a.programmes?.titre}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)] font-medium">{a.programmes?.duree_semaines} sem.</span>
                          {a.programmes?.categorie && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-medium">{a.programmes.categorie}</span>
                          )}
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">Phase {a.phase_actuelle}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onOpenProgramme?.(a.programmes)}
                        className="px-3 py-2 rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] text-[11px] font-medium hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all flex items-center gap-1.5 shrink-0">
                        Ouvrir <ChevronRight size={12} />
                      </button>
                    </div>
                    {prog && prog.total > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[var(--text-muted)] text-[10px]">{prog.done}/{prog.total} seances completees</span>
                          <span className="text-[10px] font-bold" style={{ color: progressColor }}>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700 relative" style={{ width: `${pct}%`, backgroundColor: progressColor }}>
                            {pct > 8 && <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15) 50%, transparent)' }} />}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Section Plan Nutritionnel */}
      <div className="glass-card overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 via-emerald-400 to-transparent" />
        <div className="px-5 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-400/10 flex items-center justify-center">
              <Apple size={17} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-[var(--text-primary)] text-sm font-bold">Plan Nutritionnel</h3>
              <p className="text-[var(--text-muted)] text-[11px]">Plans de repas et macros</p>
            </div>
          </div>
          <a href="/coach/nutrition"
            className="text-[11px] text-emerald-400 font-semibold hover:text-emerald-300 transition-colors flex items-center gap-1">
            Gerer <ChevronRight size={12} />
          </a>
        </div>

        <div className="px-5 md:px-6 pb-5">
          {nutritionPlans.length === 0 ? (
            <div className="bg-[var(--bg-base)] rounded-xl p-6 text-center border border-[var(--border-subtle)]">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-3">
                <Apple size={18} className="text-[var(--text-muted)]" />
              </div>
              <p className="text-[var(--text-muted)] text-xs">Aucun plan nutritionnel cree</p>
              <a href={`/coach/nutrition/new?clientId=${clientId}`}
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold hover:bg-emerald-500/20 transition-colors">
                <Plus size={12} /> Creer un plan
              </a>
            </div>
          ) : (
            <div className="space-y-2.5">
              {nutritionPlans.map(plan => (
                <a key={plan.id} href={`/coach/nutrition/${plan.id}`}
                  className="bg-[var(--bg-base)] rounded-xl p-4 flex items-center gap-4 border border-[var(--border-subtle)] hover:border-[var(--border-base)] transition-all block group">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Apple size={18} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-sm font-semibold truncate">{plan.nom || 'Plan du jour'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)] font-medium">
                        {new Date(plan.date_plan).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">Actif</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-[var(--text-muted)] group-hover:text-emerald-400 shrink-0 transition-colors" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ClientSeancesSection({ clientId, onOpenCalendar }) {
  const [seances, setSeances] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('seances')
      .select('id, titre, date_prevue, is_completed')
      .eq('client_id', clientId)
      .eq('is_template', false)
      .not('client_id', 'is', null)
      .gte('date_prevue', today)
      .order('date_prevue', { ascending: true })
      .limit(5)
      .then(({ data, error }) => {
        if (error) console.error('[Hub/ProchSeances] Erreur fetch séances:', error.message)
        setSeances(data ?? [])
        setLoading(false)
      })
  }, [clientId])

  if (loading) return <div className="h-28 skel-block" />

  return (
    <div className="glass-card overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 via-blue-400 to-transparent" />
      <div className="px-5 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-400/10 flex items-center justify-center">
            <Calendar size={17} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-[var(--text-primary)] text-sm font-bold">Prochaines seances</h3>
            <p className="text-[var(--text-muted)] text-[11px]">Entrainements planifies</p>
          </div>
        </div>
        <button onClick={onOpenCalendar}
          className="text-[11px] text-blue-400 font-semibold hover:text-blue-300 transition-colors flex items-center gap-1">
          Calendrier <ChevronRight size={12} />
        </button>
      </div>

      <div className="px-5 md:px-6 pb-5">
        {seances.length === 0 ? (
          <div className="bg-[var(--bg-base)] rounded-xl p-6 text-center border border-[var(--border-subtle)]">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-3">
              <Calendar size={18} className="text-[var(--text-muted)]" />
            </div>
            <p className="text-[var(--text-muted)] text-xs">Aucune seance planifiee</p>
          </div>
        ) : (
          <div className="space-y-2">
            {seances.map(s => (
              <div key={s.id} className="flex items-center gap-3.5 px-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] hover:border-[var(--border-base)] transition-all">
                <div className="w-11 h-11 rounded-xl bg-blue-500/8 flex flex-col items-center justify-center shrink-0">
                  <p className="text-blue-400 text-sm font-bold leading-none">
                    {new Date(s.date_prevue + 'T00:00:00').getDate()}
                  </p>
                  <p className="text-[var(--text-muted)] text-[8px] uppercase font-medium">
                    {new Date(s.date_prevue + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })}
                  </p>
                </div>
                <div className="w-[2px] h-8 rounded-full shrink-0 bg-gradient-to-b from-blue-500/30 to-transparent" />
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-sm font-medium truncate">{s.titre}</p>
                  <p className="text-[var(--text-muted)] text-[10px] capitalize">
                    {new Date(s.date_prevue + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long' })}
                  </p>
                </div>
                {s.is_completed && (
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// BIBLIOTHÈQUE D'EXERCICES — Config
// ══════════════════════════════════════

const MUSCLE_GROUPS = ['Tous', 'Pectoraux', 'Dos', 'Jambes', 'Épaules', 'Biceps', 'Triceps', 'Abdominaux', 'Full body', 'Cardio', 'Hanches']
const EXERCISE_CATEGORIES = ['Tous', 'Force', 'Haltères', 'Poids du corps', 'Cardio / HIIT', 'Fonctionnel', 'Mobilité / Stretching']
const SOURCES = ['Tous', 'Zevo Officiel', 'Mes exercices', 'Favoris']

// Couleurs par groupe musculaire
const GROUP_COLORS = {
  Pectoraux: '#3b82f6', Dos: '#a855f7', Jambes: '#22c55e', Épaules: '#f59e0b',
  Biceps: '#f97316', Triceps: '#ec4899', Abdominaux: '#14b8a6', Cardio: '#ef4444', Souplesse: '#8b5cf6',
}

// ══════════════════════════════════════
// SPORT TAB — Catalogue + Éditeur
// ══════════════════════════════════════

function SportTab({ clientName, coachId, clientId, editingSeanceId, onSeanceSaved, onClearEditing }) {
  const toast = useToast()

  // ── Bibliothèque state ──
  const [exercices, setExercices] = useState([])
  const [favorisIds, setFavorisIds] = useState(new Set())
  const [loadingExos, setLoadingExos] = useState(true)
  const [searchExo, setSearchExo] = useState('')
  const [filtreGroupe, setFiltreGroupe] = useState('Tous')
  const [filtreSource, setFiltreSource] = useState('Tous')

  // ── Modale création exercice ──
  const [modalCreer, setModalCreer] = useState(false)
  const [newExo, setNewExo] = useState({ nom: '', muscle_group: '', equipment: '', description: '', muscles: '', video_url: '', gif_url: '', category: 'Musculation' })
  const [creatingExo, setCreatingExo] = useState(false)

  // ── Éditeur de séance ──
  const [currentSeanceId, setCurrentSeanceId] = useState(null)
  const [seanceNom, setSeanceNom] = useState(`Séance de ${clientName || 'remise en forme'}`)
  const [seanceExercices, setSeanceExercices] = useState([])
  const [drawerExercice, setDrawerExercice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loadingSeance, setLoadingSeance] = useState(false)

  // ── Charger les exercices + favoris depuis Supabase ──
  useEffect(() => {
    if (!coachId) return
    const load = async () => {
      setLoadingExos(true)
      const [exosRes, favsRes] = await Promise.all([
        supabase.from('exercices').select('*').or(`coach_id.is.null,coach_id.eq.${coachId}`).order('muscle_group').order('nom'),
        supabase.from('exercices_favoris').select('exercice_id').eq('coach_id', coachId),
      ])
      setExercices(exosRes.data || [])
      setFavorisIds(new Set((favsRes.data || []).map(f => f.exercice_id)))
      setLoadingExos(false)
    }
    load()
  }, [coachId])

  // ── Charger une séance existante quand editingSeanceId change ──
  useEffect(() => {
    if (!editingSeanceId) {
      // Pas de séance à éditer → reset si on avait une séance chargée
      if (currentSeanceId) {
        setCurrentSeanceId(null)
        setSeanceNom(`Séance de ${clientName || 'remise en forme'}`)
        setSeanceExercices([])
      }
      return
    }
    if (editingSeanceId === currentSeanceId) return // déjà chargée

    const load = async () => {
      setLoadingSeance(true)
      // Charger la séance
      const { data: seance } = await supabase
        .from('seances')
        .select('id, titre, notes')
        .eq('id', editingSeanceId)
        .single()

      if (seance) {
        setCurrentSeanceId(seance.id)
        setSeanceNom(seance.titre)

        // Charger ses exercices
        const { data: seanceExos } = await supabase
          .from('seance_exercices')
          .select('id, exercice_id, series, reps, poids, repos, ordre, media_url, exercices(*)')
          .eq('seance_id', seance.id)
          .order('ordre')

        if (seanceExos && seanceExos.length > 0) {
          // Transformer pour l'éditeur : on garde les infos de l'exercice + les params de la séance
          const mapped = seanceExos.map(se => ({
            ...se.exercices,
            _seance_exercice_id: se.id,
            series: se.series,
            repetitions: se.reps,
            poids: se.poids || '',
            repos: se.repos,
            media_url: se.media_url || '',
          }))
          setSeanceExercices(mapped)
        } else {
          setSeanceExercices([])
        }
      }
      setLoadingSeance(false)
    }
    load()
  }, [editingSeanceId])

  // ── Toggle favori ──
  const toggleFavori = async (exId) => {
    const isFav = favorisIds.has(exId)
    // Optimistic
    setFavorisIds(prev => {
      const next = new Set(prev)
      isFav ? next.delete(exId) : next.add(exId)
      return next
    })
    if (isFav) {
      await supabase.from('exercices_favoris').delete().eq('coach_id', coachId).eq('exercice_id', exId)
    } else {
      await supabase.from('exercices_favoris').insert({ coach_id: coachId, exercice_id: exId })
    }
  }

  // ── Créer un exercice ──
  const creerExercice = async (e) => {
    e.preventDefault()
    if (!newExo.nom.trim()) return
    setCreatingExo(true)
    const { data, error } = await supabase
      .from('exercices')
      .insert({
        coach_id: coachId,
        nom: newExo.nom.trim(),
        muscle_group: newExo.muscle_group || null,
        equipment: newExo.equipment || null,
        description: newExo.description || null,
        muscles: newExo.muscles ? newExo.muscles.split(',').map(m => m.trim()).filter(Boolean) : null,
        video_url: newExo.video_url || null,
        gif_url: newExo.gif_url || null,
        category: newExo.category || 'Musculation',
      })
      .select()
      .single()
    if (error) {
      toast.error('Erreur lors de la création')
    } else {
      setExercices(prev => [...prev, data])
      toast.success(`"${data.nom}" ajouté à votre bibliothèque !`)
      setModalCreer(false)
      setNewExo({ nom: '', muscle_group: '', equipment: '', description: '', muscles: '', video_url: '', gif_url: '', category: 'Musculation' })
    }
    setCreatingExo(false)
  }

  // ── Filtrer la bibliothèque (recherche avancée) ──
  const exosFiltres = exercices.filter((ex) => {
    const q = searchExo.toLowerCase()
    const matchSearch = !q ||
      (ex.nom || '').toLowerCase().includes(q) ||
      (ex.equipment || '').toLowerCase().includes(q) ||
      (ex.muscle_group || '').toLowerCase().includes(q) ||
      (ex.muscles || []).some(m => m.toLowerCase().includes(q))
    const matchGroupe = filtreGroupe === 'Tous' || ex.muscle_group === filtreGroupe
    const matchSource =
      filtreSource === 'Tous' ? true :
      filtreSource === 'Zevo Officiel' ? ex.coach_id === null :
      filtreSource === 'Mes exercices' ? ex.coach_id === coachId :
      filtreSource === 'Favoris' ? favorisIds.has(ex.id) :
      true
    return matchSearch && matchGroupe && matchSource
  })

  // ── Ajout / suppression / modification séance ──
  const ajouterExercice = (ex) => {
    if (seanceExercices.find(s => s.id === ex.id)) return
    setSeanceExercices(prev => [...prev, { ...ex, series: 3, repetitions: 12, poids: '', repos: 60, media_url: '' }])
  }
  const supprimerExercice = (exId) => setSeanceExercices(prev => prev.filter(e => e.id !== exId))
  const modifierExercice = (exId, champ, valeur) => setSeanceExercices(prev => prev.map(e => e.id === exId ? { ...e, [champ]: valeur } : e))

  const sauvegarder = async () => {
    setSaving(true)
    try {
      if (currentSeanceId) {
        // ── Mode édition : mise à jour d'une séance existante ──
        // 1. Mettre à jour le titre
        await supabase.from('seances').update({ titre: seanceNom }).eq('id', currentSeanceId)

        // 2. Supprimer tous les anciens exercices de la séance
        await supabase.from('seance_exercices').delete().eq('seance_id', currentSeanceId)

        // 3. Réinsérer les exercices avec les nouvelles valeurs
        if (seanceExercices.length > 0) {
          const rows = seanceExercices.map((ex, i) => ({
            seance_id: currentSeanceId,
            exercice_id: ex.id,
            series: ex.series || 3,
            reps: ex.repetitions || 12,
            poids: ex.poids ? parseFloat(ex.poids) : null,
            repos: ex.repos || 60,
            ordre: i,
            media_url: ex.media_url?.trim() || null,
          }))
          await supabase.from('seance_exercices').insert(rows)
        }

        toast.success(`"${seanceNom}" mis à jour (${seanceExercices.length} exercices)`)
        if (onSeanceSaved) onSeanceSaved()
      } else if (clientId && coachId) {
        // ── Mode création : nouvelle séance ──
        const { data: newSeance, error } = await supabase
          .from('seances')
          .insert({
            coach_id: coachId,
            client_id: clientId,
            titre: seanceNom,
            date_prevue: formatDateISO(new Date()),
            is_template: false,
            is_completed: false,
          })
          .select()
          .single()

        if (error) throw error

        if (seanceExercices.length > 0) {
          const rows = seanceExercices.map((ex, i) => ({
            seance_id: newSeance.id,
            exercice_id: ex.id,
            series: ex.series || 3,
            reps: ex.repetitions || 12,
            poids: ex.poids ? parseFloat(ex.poids) : null,
            repos: ex.repos || 60,
            ordre: i,
            media_url: ex.media_url?.trim() || null,
          }))
          await supabase.from('seance_exercices').insert(rows)
        }

        setCurrentSeanceId(newSeance.id)
        toast.success(`"${seanceNom}" créée (${seanceExercices.length} exercices)`)
        if (onSeanceSaved) onSeanceSaved()
      } else {
        toast.error('Client non sélectionné')
      }
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde')
      console.error(err)
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col md:flex-row gap-0 md:h-[calc(100vh-16rem)] min-h-[500px]">

      {/* ════════════════════════════════════ */}
      {/* PANNEAU GAUCHE — Bibliothèque       */}
      {/* ════════════════════════════════════ */}
      <div className="w-full md:w-1/3 flex-shrink-0 glass-card !rounded-xl flex flex-col overflow-hidden max-h-[50vh] md:max-h-none">

        {/* Header bibliothèque */}
        <div className="p-4 border-b border-[var(--border-base)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[var(--text-primary)] text-sm font-semibold flex items-center gap-2">
              <Dumbbell size={14} className="text-[#FF6B2B]" />
              Bibliothèque
              <span className="text-[var(--text-muted)] text-[10px] font-normal ml-1">{exosFiltres.length}</span>
            </h3>
            <button
              onClick={() => setModalCreer(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#FF6B2B] text-white text-[10px] font-semibold hover:bg-[#e55e24] transition-colors"
            >
              <Plus size={12} />
              Créer
            </button>
          </div>

          {/* Recherche avancée */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={searchExo}
              onChange={(e) => setSearchExo(e.target.value)}
              placeholder="Nom, muscle ou équipement..."
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg pl-8 pr-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
            />
          </div>

          {/* Filtre source */}
          <div className="flex gap-1.5">
            {SOURCES.map((s) => (
              <button
                key={s}
                onClick={() => setFiltreSource(s)}
                className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors flex items-center gap-1 ${
                  filtreSource === s
                    ? 'bg-[#FF6B2B]/15 text-[#FF6B2B] border border-[#FF6B2B]/30'
                    : 'bg-[var(--bg-surface)]/50 text-[var(--text-muted)] hover:text-[var(--text-muted)] border border-transparent'
                }`}
              >
                {s === 'Favoris' && <Star size={9} className={filtreSource === s ? 'fill-[#FF6B2B]' : ''} />}
                {s === 'Zevo Officiel' && <Sparkles size={9} />}
                {s}
              </button>
            ))}
          </div>

          {/* Filtres groupes musculaires */}
          <div className="flex gap-1 flex-wrap">
            {MUSCLE_GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => setFiltreGroupe(g)}
                className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-colors ${
                  filtreGroupe === g
                    ? 'bg-[#FF6B2B] text-white'
                    : 'bg-[var(--bg-surface)]/50 text-[var(--text-muted)] hover:text-[var(--text-muted)]'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Liste des exercices */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loadingExos ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-[#FF6B2B]" />
            </div>
          ) : exosFiltres.length === 0 ? (
            <div className="text-center py-8">
              <Dumbbell size={24} className="text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-[var(--text-muted)] text-xs">Aucun exercice trouvé</p>
              {filtreSource !== 'Tous' && (
                <button onClick={() => { setFiltreSource('Tous'); setFiltreGroupe('Tous'); setSearchExo('') }}
                  className="text-[#FF6B2B] text-[10px] mt-2 hover:underline">Réinitialiser les filtres</button>
              )}
            </div>
          ) : (
            exosFiltres.map((ex) => {
              const dejaAjoute = seanceExercices.some(s => s.id === ex.id)
              const isFav = favorisIds.has(ex.id)
              const couleur = GROUP_COLORS[ex.muscle_group] || '#6b7280'
              const isPerso = ex.coach_id !== null

              return (
                <div
                  key={ex.id}
                  className="bg-[var(--bg-surface)]/30 rounded-lg p-2.5 group hover:bg-[var(--bg-surface)]/60 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    {/* Icône / GIF */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer"
                      style={{ backgroundColor: `${couleur}12` }}
                      onClick={() => setDrawerExercice(ex)}
                    >
                      {ex.gif_url ? (
                        <img src={ex.gif_url} alt="" className="w-full h-full rounded-lg object-cover" />
                      ) : (
                        <Dumbbell size={15} style={{ color: couleur }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Nom cliquable */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDrawerExercice(ex)}
                          className="text-[var(--text-primary)] text-xs font-medium hover:text-[#FF6B2B] transition-colors text-left truncate"
                        >
                          {ex.nom}
                        </button>
                        {isPerso && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#FF6B2B]/10 text-[#FF6B2B] font-bold flex-shrink-0">PERSO</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[var(--text-muted)] text-[9px] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">{ex.equipment || '—'}</span>
                        {ex.category && ex.category !== 'Musculation' && (
                          <span className="text-[8px] text-[var(--text-muted)]">{ex.category}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions : Favori + Ajouter */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => toggleFavori(ex.id)}
                        className={`p-1 rounded transition-all ${
                          isFav ? 'text-yellow-400' : 'text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-yellow-400'
                        }`}
                      >
                        <Star size={12} className={isFav ? 'fill-yellow-400' : ''} />
                      </button>
                      <button
                        onClick={() => ajouterExercice(ex)}
                        disabled={dejaAjoute}
                        className={`p-1 rounded-lg transition-all ${
                          dejaAjoute
                            ? 'bg-green-500/10 text-green-400 cursor-default'
                            : 'bg-[#FF6B2B]/10 text-[#FF6B2B] hover:bg-[#FF6B2B]/20 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {dejaAjoute ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          <Plus size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ════════════════════════════════════ */}
      {/* PANNEAU CENTRAL — Éditeur de séance */}
      {/* ════════════════════════════════════ */}
      <div className="flex-1 flex flex-col mt-3 md:mt-0 md:ml-4 glass-card !rounded-xl overflow-hidden">

        {/* Bandeau mode édition */}
        {currentSeanceId && (
          <div className="px-4 py-2 bg-[#FF6B2B]/5 border-b border-[#FF6B2B]/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pencil size={12} className="text-[#FF6B2B]" />
              <span className="text-[#FF6B2B] text-[10px] font-semibold uppercase tracking-wider">Mode édition</span>
              <span className="text-[var(--text-muted)] text-[10px]">— Séance liée au calendrier</span>
            </div>
            <button
              onClick={() => { setCurrentSeanceId(null); setSeanceNom(`Séance de ${clientName || 'remise en forme'}`); setSeanceExercices([]); if (onClearEditing) onClearEditing() }}
              className="text-[var(--text-muted)] text-[10px] hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1"
            >
              <Plus size={10} /> Nouvelle séance
            </button>
          </div>
        )}

        {/* Header éditeur */}
        <div className="p-4 border-b border-[var(--border-base)] flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${currentSeanceId ? 'bg-[#FF6B2B]/15' : 'bg-[#FF6B2B]/10'}`}>
              {currentSeanceId ? <Pencil size={15} className="text-[#FF6B2B]" /> : <Calendar size={15} className="text-[#FF6B2B]" />}
            </div>
            {loadingSeance ? (
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-[#FF6B2B]" />
                <span className="text-[var(--text-muted)] text-sm">Chargement...</span>
              </div>
            ) : (
              <input
                value={seanceNom}
                onChange={(e) => setSeanceNom(e.target.value)}
                className="bg-transparent border-none text-[var(--text-primary)] text-sm font-semibold focus:outline-none flex-1 min-w-0 placeholder:text-[var(--text-muted)]"
                placeholder="Nom de la séance..."
              />
            )}
          </div>
          <button
            onClick={sauvegarder}
            disabled={saving || seanceExercices.length === 0 || loadingSeance}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF6B2B] text-white text-xs font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {currentSeanceId ? 'Mettre à jour' : 'Enregistrer'}
          </button>
        </div>

        {/* Liste d'exercices ajoutés */}
        <div className="flex-1 overflow-y-auto p-4">
          {seanceExercices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-2xl bg-[var(--bg-surface)]/40 flex items-center justify-center mb-4">
                <Plus size={28} className="text-[var(--text-muted)]" />
              </div>
              <p className="text-[var(--text-muted)] text-sm font-medium mb-1">Aucun exercice ajouté</p>
              <p className="text-[var(--text-muted)] text-xs max-w-[250px] text-center">
                Cliquez sur <span className="text-[#FF6B2B]">+</span> dans la bibliothèque pour composer votre séance
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {seanceExercices.map((ex, index) => {
                const couleur = GROUP_COLORS[ex.muscle_group] || '#6b7280'
                const hasMedia = !!ex.media_url?.trim()
                return (
                  <div key={ex.id} className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl p-4 group hover:border-[#FF6B2B]/20 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <GripVertical size={14} className="text-[var(--text-muted)]" />
                        <span className="w-6 h-6 rounded-md bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${couleur}15` }}>
                          <Dumbbell size={14} style={{ color: couleur }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[var(--text-primary)] text-sm font-medium truncate">{ex.nom}</p>
                          <p className="text-[var(--text-muted)] text-[10px]">{ex.equipment || ex.equipement || '—'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => modifierExercice(ex.id, '_showMediaInput', !ex._showMediaInput)}
                        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                          hasMedia
                            ? 'text-[#FF6B2B] bg-[#FF6B2B]/10 hover:bg-[#FF6B2B]/20'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-muted)] hover:bg-[var(--bg-surface)] opacity-0 group-hover:opacity-100'
                        }`}
                        title={hasMedia ? 'Média attaché — cliquer pour modifier' : 'Ajouter un lien vidéo/image'}
                      >
                        <Video size={14} />
                      </button>
                      <button onClick={() => supprimerExercice(ex.id)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Media URL input + Upload (toggle) */}
                    {ex._showMediaInput && (
                      <div className="mb-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 relative">
                            <Video size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                              type="url"
                              value={ex.media_url || ''}
                              onChange={(e) => modifierExercice(ex.id, 'media_url', e.target.value)}
                              placeholder="Lien vidéo ou image (YouTube, mp4, jpg...)"
                              className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg pl-8 pr-3 py-2 text-[var(--text-primary)] text-xs placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
                            />
                          </div>
                          {/* Upload file button */}
                          <label
                            className={`p-2 rounded-lg transition-colors flex-shrink-0 cursor-pointer ${
                              ex._uploading
                                ? 'bg-[#FF6B2B]/10 text-[#FF6B2B] cursor-wait'
                                : 'bg-[var(--bg-base)] border border-[var(--border-base)] text-[var(--text-muted)] hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30'
                            }`}
                            title="Uploader un fichier vidéo ou image"
                          >
                            {ex._uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            <input
                              type="file"
                              accept="video/*,image/*"
                              className="hidden"
                              disabled={!!ex._uploading}
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                e.target.value = ''

                                // Max 50MB
                                if (file.size > 50 * 1024 * 1024) {
                                  toast.error('Fichier trop volumineux (max 50 Mo)')
                                  return
                                }

                                modifierExercice(ex.id, '_uploading', true)
                                try {
                                  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
                                  const path = `exercices/${coachId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

                                  const { error: uploadErr } = await supabase.storage
                                    .from('medias')
                                    .upload(path, file, { cacheControl: '3600', upsert: false })

                                  if (uploadErr) throw uploadErr

                                  const { data: urlData } = supabase.storage
                                    .from('medias')
                                    .getPublicUrl(path)

                                  modifierExercice(ex.id, 'media_url', urlData.publicUrl)
                                  toast.success(`"${file.name}" uploadé !`)
                                } catch (err) {
                                  console.error('[Upload] Erreur:', err.message || err)
                                  toast.error(`Erreur upload : ${err.message || 'Erreur inconnue'}`)
                                } finally {
                                  modifierExercice(ex.id, '_uploading', false)
                                }
                              }}
                            />
                          </label>
                          {hasMedia && (
                            <button
                              onClick={() => modifierExercice(ex.id, 'media_url', '')}
                              className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                              title="Supprimer le média"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        {/* Preview thumbnail si média attaché */}
                        {hasMedia && /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(ex.media_url) && (
                          <div className="rounded-lg overflow-hidden border border-[var(--border-base)] h-20">
                            <img src={ex.media_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        {hasMedia && /\.(mp4|webm|mov)(\?.*)?$/i.test(ex.media_url) && (
                          <div className="rounded-lg overflow-hidden border border-[var(--border-base)] h-20 bg-black">
                            <video src={ex.media_url} className="w-full h-full object-contain" muted />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { key: 'series', label: 'Séries', val: ex.series },
                        { key: 'repetitions', label: 'Répétitions', val: ex.repetitions },
                        { key: 'poids', label: 'Poids (kg)', val: ex.poids, placeholder: '—' },
                        { key: 'repos', label: 'Repos (s)', val: ex.repos },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-1.5">{f.label}</label>
                          <input type="number" value={f.val}
                            onChange={(e) => modifierExercice(ex.id, f.key, f.key === 'poids' ? e.target.value : (parseInt(e.target.value) || 0))}
                            placeholder={f.placeholder}
                            className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm text-center font-medium placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors" />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              <div className="flex items-center justify-between py-3 px-4 bg-[var(--bg-surface)]/30 rounded-lg mt-2">
                <span className="text-[var(--text-muted)] text-xs">
                  {seanceExercices.length} exercice{seanceExercices.length > 1 ? 's' : ''} · {seanceExercices.reduce((a, e) => a + (e.series || 0), 0)} séries au total
                </span>
                <span className="text-[var(--text-muted)] text-[10px]">
                  ~{Math.round(seanceExercices.reduce((a, e) => a + (e.series || 0) * ((e.repos || 60) + 40), 0) / 60)} min estimées
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════ */}
      {/* TIROIR DROIT — Détails exercice     */}
      {/* ════════════════════════════════════ */}
      {drawerExercice && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerExercice(null)} />
      )}
      <div className={`fixed top-0 right-0 z-50 h-full w-[400px] max-w-[90vw] bg-[var(--bg-elevated)] border-l border-[var(--border-base)] flex flex-col transition-transform duration-300 ease-out ${drawerExercice ? 'translate-x-0' : 'translate-x-full'}`}>
        {drawerExercice && (() => {
          const couleur = GROUP_COLORS[drawerExercice.muscle_group] || '#6b7280'
          const muscles = drawerExercice.muscles || []
          const isFav = favorisIds.has(drawerExercice.id)
          return (
            <>
              <div className="px-5 py-4 border-b border-[var(--border-base)] flex items-center justify-between">
                <h3 className="text-[var(--text-primary)] font-semibold text-base">Détails de l'exercice</h3>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => toggleFavori(drawerExercice.id)}
                    className={`p-1.5 rounded-lg transition-colors ${isFav ? 'text-yellow-400' : 'text-[var(--text-muted)] hover:text-yellow-400'}`}>
                    <Star size={16} className={isFav ? 'fill-yellow-400' : ''} />
                  </button>
                  <button onClick={() => setDrawerExercice(null)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Video / GIF / Placeholder */}
                {drawerExercice.video_url ? (
                  <div className="w-full aspect-video rounded-xl overflow-hidden bg-black">
                    <iframe src={drawerExercice.video_url} className="w-full h-full" allowFullScreen title={drawerExercice.nom}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                  </div>
                ) : drawerExercice.gif_url ? (
                  <img src={drawerExercice.gif_url} alt={drawerExercice.nom} className="w-full aspect-video rounded-xl object-cover" />
                ) : (
                  <div className="w-full aspect-video rounded-xl flex items-center justify-center" style={{ backgroundColor: `${couleur}10` }}>
                    <div className="text-center">
                      <Dumbbell size={48} style={{ color: couleur }} className="mx-auto mb-2 opacity-40" />
                      <p className="text-[var(--text-muted)] text-xs">Démonstration</p>
                    </div>
                  </div>
                )}

                {/* Nom + meta */}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-[var(--text-primary)] text-xl font-bold">{drawerExercice.nom}</h4>
                    {drawerExercice.coach_id === null && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">ZEVO</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[var(--text-muted)] text-xs bg-[var(--bg-surface)] px-2.5 py-1 rounded-md">{drawerExercice.equipment || '—'}</span>
                    <span className="text-[var(--text-muted)] text-xs">{drawerExercice.muscle_group}</span>
                    {drawerExercice.category && (
                      <span className="text-[9px] px-2 py-0.5 rounded bg-[var(--bg-surface)]/60 text-[var(--text-muted)]">{drawerExercice.category}</span>
                    )}
                  </div>
                </div>

                {/* Muscles ciblés */}
                {muscles.length > 0 && (
                  <div>
                    <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-semibold mb-2">Muscles ciblés</p>
                    <div className="flex flex-wrap gap-1.5">
                      {muscles.map((m) => (
                        <span key={m} className="text-xs px-2.5 py-1 rounded-md bg-purple-500/15 text-purple-400 font-medium">{m}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {drawerExercice.description && (
                  <div>
                    <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-semibold mb-2">Consignes d'exécution</p>
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{drawerExercice.description}</p>
                  </div>
                )}

                {/* Bouton ajouter */}
                <button
                  onClick={() => { ajouterExercice(drawerExercice); setDrawerExercice(null) }}
                  disabled={seanceExercices.some(s => s.id === drawerExercice.id)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {seanceExercices.some(s => s.id === drawerExercice.id) ? (
                    <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Déjà dans la séance</>
                  ) : (
                    <><Plus size={15} /> Ajouter à la séance</>
                  )}
                </button>
              </div>
            </>
          )
        })()}
      </div>

      {/* ════════════════════════════════════ */}
      {/* MODALE — Créer un exercice          */}
      {/* ════════════════════════════════════ */}
      <Modal isOpen={modalCreer} onClose={() => setModalCreer(false)} title="Créer un exercice">
        <form onSubmit={creerExercice} className="space-y-3">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Nom de l'exercice *</label>
            <input type="text" value={newExo.nom} onChange={(e) => setNewExo(p => ({ ...p, nom: e.target.value }))}
              placeholder="Ex: Squat Gobelet" required autoFocus
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B] transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Groupe musculaire</label>
              <select value={newExo.muscle_group} onChange={(e) => setNewExo(p => ({ ...p, muscle_group: e.target.value }))}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B] transition-colors">
                <option value="">— Sélectionner —</option>
                {MUSCLE_GROUPS.filter(g => g !== 'Tous').map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Catégorie</label>
              <select value={newExo.category} onChange={(e) => setNewExo(p => ({ ...p, category: e.target.value }))}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B] transition-colors">
                {EXERCISE_CATEGORIES.filter(c => c !== 'Tous').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Équipement</label>
            <input type="text" value={newExo.equipment} onChange={(e) => setNewExo(p => ({ ...p, equipment: e.target.value }))}
              placeholder="Ex: Haltères, Barre, Poids du corps..."
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B] transition-colors" />
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Muscles ciblés <span className="text-[var(--text-muted)]">(séparés par des virgules)</span></label>
            <input type="text" value={newExo.muscles} onChange={(e) => setNewExo(p => ({ ...p, muscles: e.target.value }))}
              placeholder="Quadriceps, Fessiers, Ischio-jambiers"
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B] transition-colors" />
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Description / Consignes</label>
            <textarea value={newExo.description} onChange={(e) => setNewExo(p => ({ ...p, description: e.target.value }))}
              rows={3} placeholder="Décrivez l'exécution du mouvement..."
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B] transition-colors resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
                <Video size={13} className="text-[#FF6B2B]" /> URL Vidéo
              </label>
              <input type="url" value={newExo.video_url} onChange={(e) => setNewExo(p => ({ ...p, video_url: e.target.value }))}
                placeholder="https://youtube.com/..."
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B] transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
                <PlayCircle size={13} className="text-[#FF6B2B]" /> URL GIF
              </label>
              <input type="url" value={newExo.gif_url} onChange={(e) => setNewExo(p => ({ ...p, gif_url: e.target.value }))}
                placeholder="https://exemple.com/demo.gif"
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B] transition-colors" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setModalCreer(false)}
              className="flex-1 py-2.5 rounded-xl text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={creatingExo}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40">
              {creatingExo ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Créer l'exercice
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ══════════════════════════════════════
// CALENDAR TAB — Vue Mois / Semaine (miroir du Global Calendar)
// ══════════════════════════════════════

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const EVENT_TYPES_CAL = [
  { id: 'seance', label: 'Séance', icon: Dumbbell, color: '#FF6B2B' },
  { id: 'bilan', label: 'Bilan', icon: CheckCircle2, color: '#22c55e' },
  { id: 'appel', label: 'Appel', icon: Calendar, color: '#3b82f6' },
  { id: 'reunion', label: 'Réunion', icon: Calendar, color: '#a855f7' },
  { id: 'note', label: 'Note', icon: FileText, color: '#f59e0b' },
  { id: 'perso', label: 'Personnel', icon: Star, color: '#ec4899' },
  { id: 'autre', label: 'Autre', icon: Calendar, color: '#64748b' },
]

function getWeekDates(offset = 0) {
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

function getMonthGridCal(offset) {
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

function formatDateISO(d) {
  return d.toISOString().split('T')[0]
}

function isSameDayCal(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatHHmmCal(dateStr) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const HOURS_CAL = Array.from({ length: 14 }, (_, i) => i + 7) // 7h → 20h

function CalendarTab({ clientId, clientName, coachId, onEditSeance }) {
  const toast = useToast()

  // ── View state (Mois / Semaine) ──
  const [calView, setCalView] = useState('month')
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)

  // ── Mobile: selected day for event list ──
  const [mobileSelectedDay, setMobileSelectedDay] = useState(new Date())

  // ── Data ──
  const [seances, setSeances] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  // ── Filter type ──
  const [filterType, setFilterType] = useState('')

  // ── Creation modal ──
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState(null) // null=choice, 'event'=form
  const [evtTitle, setEvtTitle] = useState('')
  const [evtDate, setEvtDate] = useState('')
  const [evtTime, setEvtTime] = useState('09:00')
  const [evtType, setEvtType] = useState('bilan')
  const [evtNotes, setEvtNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // ── Séance creation flow (3-step Apple) ──
  const [modalSeance, setModalSeance] = useState(false)
  const [modalDate, setModalDate] = useState(null)
  const [newSeanceTitre, setNewSeanceTitre] = useState('')
  const [newSeanceNotes, setNewSeanceNotes] = useState('')
  const [creatingSeance, setCreatingSeance] = useState(false)
  const [seanceStep, setSeanceStep] = useState(1)
  const [selectedTemplateForPlan, setSelectedTemplateForPlan] = useState(null)

  // ── Detail modals ──
  const [dayDetailDate, setDayDetailDate] = useState(null)
  const [detailSeance, setDetailSeance] = useState(null)
  const [detailExercices, setDetailExercices] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailEvent, setDetailEvent] = useState(null)
  const [editingNotes, setEditingNotes] = useState(false)
  const [editNotesValue, setEditNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  // ── Templates (Modèles) — drawer ──
  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)

  // Modale : créer un modèle
  const [modalTemplate, setModalTemplate] = useState(false)
  const [newTemplateTitre, setNewTemplateTitre] = useState('')
  const [newTemplateNotes, setNewTemplateNotes] = useState('')
  const [creatingTemplate, setCreatingTemplate] = useState(false)

  // Modale : planifier un modèle
  const [modalPlanifier, setModalPlanifier] = useState(null)
  const [planifDate, setPlanifDate] = useState('')
  const [planifying, setPlanifying] = useState(false)

  // Preview exercices d'un template
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [previewExos, setPreviewExos] = useState([])
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Workout builder drawer
  const [drawerTemplate, setDrawerTemplate] = useState(null)
  const [drawerExos, setDrawerExos] = useState([])
  const [drawerSaving, setDrawerSaving] = useState(false)
  const [drawerTitle, setDrawerTitle] = useState('')
  const [drawerSearch, setDrawerSearch] = useState('')
  const [drawerShowSearch, setDrawerShowSearch] = useState(false)
  const [drawerCatFilter, setDrawerCatFilter] = useState('Tous')
  const [allExercicesDrawer, setAllExercicesDrawer] = useState([])
  const [loadingDrawerExos, setLoadingDrawerExos] = useState(false)

  // ── Computed date ranges ──
  const todayCal = new Date()
  todayCal.setHours(0, 0, 0, 0)
  const weekDates = getWeekDates(weekOffset)
  const monthGrid = getMonthGridCal(monthOffset)

  const getDateRange = useCallback(() => {
    if (calView === 'week') {
      const wd = getWeekDates(weekOffset)
      const start = new Date(wd[0]); start.setHours(0, 0, 0, 0)
      const end = new Date(wd[6]); end.setHours(23, 59, 59, 999)
      return { start, end }
    } else {
      const mg = getMonthGridCal(monthOffset)
      const start = new Date(mg.cells[0].date); start.setHours(0, 0, 0, 0)
      const end = new Date(mg.cells[mg.cells.length - 1].date); end.setHours(23, 59, 59, 999)
      return { start, end }
    }
  }, [calView, weekOffset, monthOffset])

  // ── Data fetching (silent = true → no skeleton flash) ──
  const fetchCalData = useCallback(async (silent = false) => {
    if (!clientId || !coachId) return
    if (!silent) setLoading(true)
    const { start, end } = getDateRange()
    const startISO = start.toISOString().slice(0, 10)
    const endISO = end.toISOString().slice(0, 10)

    const [seancesRes, eventsRes] = await Promise.all([
      supabase
        .from('seances')
        .select('id, titre, date_prevue, notes, is_completed, is_template')
        .eq('coach_id', coachId)
        .eq('client_id', clientId)
        .eq('is_template', false)
        .not('client_id', 'is', null)
        .gte('date_prevue', startISO)
        .lte('date_prevue', endISO)
        .order('date_prevue', { ascending: true }),
      supabase
        .from('coach_events')
        .select('id, title, event_date, event_type, client_id, notes')
        .eq('coach_id', coachId)
        .eq('client_id', clientId)
        .gte('event_date', start.toISOString())
        .lte('event_date', end.toISOString())
        .order('event_date', { ascending: true }),
    ])

    if (seancesRes.error) console.error('[Hub/Calendar] Erreur fetch séances:', seancesRes.error.message)
    if (eventsRes.error) console.error('[Hub/Calendar] Erreur fetch events:', eventsRes.error.message)

    setSeances(seancesRes.data ?? [])
    setEvents(eventsRes.data ?? [])
    setLoading(false)
  }, [clientId, coachId, getDateRange])

  useEffect(() => { fetchCalData() }, [fetchCalData])

  // ── Realtime ──
  useEffect(() => {
    if (!coachId) return
    const silentRefresh = () => fetchCalData(true)
    const channel = supabase
      .channel(`hub-calendar-${clientId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seances', filter: `coach_id=eq.${coachId}` }, silentRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coach_events', filter: `coach_id=eq.${coachId}` }, silentRefresh)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [coachId, clientId, fetchCalData])

  // ── Charger les modèles du coach ──
  useEffect(() => {
    if (!coachId) return
    const load = async () => {
      setLoadingTemplates(true)
      const { data } = await supabase
        .from('seances')
        .select('id, titre, notes, created_at')
        .eq('coach_id', coachId)
        .eq('is_template', true)
        .order('created_at', { ascending: false })
      const userTemplates = (data || []).filter(t => !t.notes || !t.notes.startsWith('programme:'))
      setTemplates(userTemplates)
      setLoadingTemplates(false)
    }
    load()
  }, [coachId])

  // ── Helpers ──
  function getEventTypeInfoCal(typeId) {
    return EVENT_TYPES_CAL.find(t => t.id === typeId) || EVENT_TYPES_CAL[EVENT_TYPES_CAL.length - 1]
  }

  function itemsForDayCal(date) {
    const daySeances = seances
      .filter(s => isSameDayCal(new Date(s.date_prevue + 'T00:00:00'), date))
      .map(s => ({ ...s, _type: 'seance', _time: s.date_prevue, _clientId: s.client_id || clientId }))
    const dayEvents = events
      .filter(e => isSameDayCal(new Date(e.event_date), date))
      .map(e => ({ ...e, _type: 'event', _time: e.event_date, _clientId: e.client_id }))
    let items = [...daySeances, ...dayEvents].sort((a, b) => new Date(a._time) - new Date(b._time))
    if (filterType) {
      if (filterType === 'seance') items = items.filter(i => i._type === 'seance')
      else items = items.filter(i => i._type === 'event' && i.event_type === filterType)
    }
    return items
  }

  // ── Navigation ──
  const goBack = () => calView === 'week' ? setWeekOffset(o => o - 1) : setMonthOffset(o => o - 1)
  const goForward = () => calView === 'week' ? setWeekOffset(o => o + 1) : setMonthOffset(o => o + 1)
  const goToday = () => { setWeekOffset(0); setMonthOffset(0) }
  const isAtToday = calView === 'week' ? weekOffset === 0 : monthOffset === 0
  const navLabel = calView === 'week'
    ? `${weekDates[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${weekDates[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${weekDates[0].getFullYear()}`
    : monthGrid.monthLabel.charAt(0).toUpperCase() + monthGrid.monthLabel.slice(1)

  // ── Stats ──
  const allFiltered = (() => {
    const wd = calView === 'week' ? weekDates : monthGrid.cells.filter(c => c.inMonth).map(c => c.date)
    return wd.flatMap(d => itemsForDayCal(d))
  })()
  const totalItems = allFiltered.length
  const itemsToday = itemsForDayCal(todayCal).length

  // ── Click-to-add (client_id verrouillé) ──
  const openNewModal = (prefilledDate = null) => {
    setModalType(null)
    setEvtTitle('')
    setEvtDate(prefilledDate || new Date().toISOString().split('T')[0])
    setEvtTime('09:00')
    setEvtType('bilan'); setEvtNotes('')
    setModalOpen(true)
  }

  const handleDayClick = (date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    openNewModal(dateStr)
  }

  const saveEvent = async () => {
    if (!evtTitle.trim() || !evtDate) return
    setSaving(true)
    const eventDate = new Date(`${evtDate}T${evtTime}:00`)
    const { error } = await supabase.from('coach_events').insert({
      coach_id: coachId, client_id: clientId,
      title: evtTitle.trim(), event_date: eventDate.toISOString(),
      event_type: evtType, notes: evtNotes.trim() || null,
    })

    // Notifier le client de l'ajout d'événement
    if (!error && clientId) {
      supabase.from('notifications').insert({
        coach_id: coachId,
        client_id: clientId,
        titre: 'Nouvel événement prévu 📅',
        message: `Ton coach a ajouté "${evtTitle.trim()}" à ton calendrier le ${new Date(eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.`,
        type: 'calendrier',
        destinataire: 'client',
      }).then(({ error: notifErr }) => {
        if (notifErr) console.error('[Calendar] Erreur notif:', notifErr.message)
      })
    }

    setSaving(false); setModalOpen(false); fetchCalData()
  }

  // ── Detail handlers ──
  const openDayDetail = (date, e) => { e.stopPropagation(); setDayDetailDate(date) }

  const openSeanceDetail = async (seance, e) => {
    e.stopPropagation()
    setDetailSeance(seance)
    setDetailExercices([])
    setLoadingDetail(true)
    const { data } = await supabase
      .from('seance_exercices')
      .select('*, exercices(nom, muscle_group, equipment)')
      .eq('seance_id', seance.id)
      .order('ordre')
    setDetailExercices(data || [])
    setLoadingDetail(false)
  }

  const openEventDetail = (evt, e) => {
    e.stopPropagation()
    setDetailEvent(evt)
    setEditingNotes(false)
    setEditNotesValue(evt.notes || '')
  }

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
      fetchCalData(true)
    }
    setSavingNotes(false)
  }

  // ── Supprimer un événement ──
  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet événement ?')) return
    const { error } = await supabase.from('coach_events').delete().eq('id', id)
    if (error) {
      console.error('[Hub/Calendar] Erreur DELETE event:', error.message)
      toast.error('Erreur lors de la suppression')
    } else {
      toast.success('Événement supprimé')
      setDetailEvent(null)
      fetchCalData(true)
    }
  }

  // ── Séance creation (from modal) ──
  const openSeanceCreationModal = (prefilledDate) => {
    setModalDate(prefilledDate)
    setModalSeance(true)
    setSeanceStep(1)
    setSelectedTemplateForPlan(null)
    setNewSeanceTitre('')
    setNewSeanceNotes('')
    setModalOpen(false)
  }

  const creerSeance = async (e) => {
    e.preventDefault()
    if (!newSeanceTitre.trim()) return
    setCreatingSeance(true)
    const { data, error } = await supabase
      .from('seances')
      .insert({
        coach_id: coachId,
        client_id: clientId,
        titre: newSeanceTitre.trim(),
        date_prevue: modalDate,
        notes: newSeanceNotes.trim() || null,
        is_template: false,
        is_completed: false,
      })
      .select()
      .single()
    if (error) {
      console.error('[Hub/creerSeance] Erreur INSERT:', error.message, error.details)
      toast.error('Erreur lors de la création')
    } else {
      toast.success('Séance créée ! Ajoutez des exercices.')
      setModalSeance(false)
      setNewSeanceTitre('')
      setNewSeanceNotes('')
      fetchCalData(true)
      if (onEditSeance) onEditSeance(data.id)
    }
    setCreatingSeance(false)
  }

  // ── Créer un modèle ──
  const creerTemplate = async (e) => {
    e.preventDefault()
    if (!newTemplateTitre.trim()) return
    setCreatingTemplate(true)
    const { data, error } = await supabase
      .from('seances')
      .insert({
        coach_id: coachId,
        client_id: null,
        date_prevue: null,
        titre: newTemplateTitre.trim(),
        notes: newTemplateNotes.trim() || null,
        is_template: true,
        is_completed: false,
      })
      .select()
      .single()
    if (error) {
      console.error('[Hub/creerTemplate] Erreur INSERT:', error.message, error.details)
      toast.error('Erreur lors de la création du modèle')
    } else {
      setTemplates(prev => [data, ...prev])
      toast.success(`Modèle "${data.titre}" créé !`)
      setModalTemplate(false)
      setNewTemplateTitre('')
      setNewTemplateNotes('')
    }
    setCreatingTemplate(false)
  }

  // ── Supprimer une séance ──
  const supprimerSeance = async (id) => {
    const { error } = await supabase.from('seances').delete().eq('id', id)
    if (error) {
      console.error('[Hub/supprimerSeance] Erreur DELETE:', error.message)
      toast.error('Erreur lors de la suppression')
    } else {
      setDetailSeance(null)
      toast.success('Séance supprimée')
      fetchCalData(true)
    }
  }

  // ── Supprimer un modèle ──
  const supprimerTemplate = async (id) => {
    const { error } = await supabase.from('seances').delete().eq('id', id)
    if (error) {
      console.error('[Hub/supprimerTemplate] Erreur DELETE:', error.message)
      toast.error('Erreur lors de la suppression')
    } else {
      setTemplates(prev => prev.filter(t => t.id !== id))
      toast.success('Modèle supprimé')
    }
  }

  // ── Preview d'un template ──
  const voirPreview = async (template) => {
    setPreviewTemplate(template)
    setLoadingPreview(true)
    const { data } = await supabase
      .from('seance_exercices')
      .select('*, exercices(nom, muscle_group, equipment)')
      .eq('seance_id', template.id)
      .order('ordre')
    setPreviewExos(data || [])
    setLoadingPreview(false)
  }

  // ── Planifier un modèle : copier la séance + ses exercices ──
  const planifierTemplate = async () => {
    if (!modalPlanifier || !planifDate) return
    setPlanifying(true)

    // 1. Créer la copie de la séance
    const { data: newSeance, error: errSeance } = await supabase
      .from('seances')
      .insert({
        coach_id: coachId,
        client_id: clientId,
        titre: modalPlanifier.titre,
        date_prevue: planifDate,
        notes: modalPlanifier.notes,
        is_template: false,
        is_completed: false,
      })
      .select()
      .single()

    if (errSeance || !newSeance) {
      console.error('[Hub/planifier] Erreur INSERT:', errSeance?.message, errSeance?.details)
      toast.error('Erreur lors de la planification')
      setPlanifying(false)
      return
    }

    // 2. Copier tous les exercices du template
    const { data: templateExos } = await supabase
      .from('seance_exercices')
      .select('exercice_id, series, reps, poids, repos, ordre')
      .eq('seance_id', modalPlanifier.id)
      .order('ordre')

    if (templateExos && templateExos.length > 0) {
      const copies = templateExos.map(ex => ({
        seance_id: newSeance.id,
        exercice_id: ex.exercice_id,
        series: ex.series,
        reps: ex.reps,
        poids: ex.poids,
        repos: ex.repos,
        ordre: ex.ordre,
      }))
      await supabase.from('seance_exercices').insert(copies)
    }

    // 3. Mettre à jour le calendrier
    fetchCalData(true)

    const exoCount = templateExos?.length || 0
    toast.success(`"${modalPlanifier.titre}" planifié le ${new Date(planifDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} (${exoCount} exercice${exoCount > 1 ? 's' : ''} copiés)`)
    setModalPlanifier(null)
    setPlanifDate('')
    setPlanifying(false)
  }

  // ── Ouvrir le drawer pour un modèle (existant ou nouveau) ──
  const ouvrirDrawer = async (template) => {
    setDrawerTemplate(template)
    setDrawerTitle(template.titre)
    setDrawerSearch('')
    setDrawerShowSearch(false)
    setLoadingDrawerExos(true)

    // Charger les exercices du modèle
    const { data } = await supabase
      .from('seance_exercices')
      .select('id, exercice_id, series, reps, repos, ordre, media_url, exercices(nom, muscle_group, equipment)')
      .eq('seance_id', template.id)
      .order('ordre')
    setDrawerExos((data || []).map(e => ({
      id: e.id, exercice_id: e.exercice_id,
      nom: e.exercices?.nom || '?', muscle_group: e.exercices?.muscle_group || '',
      equipment: e.exercices?.equipment || '',
      series: e.series || 3, reps: e.reps || 10, repos: e.repos || 90, ordre: e.ordre,
      media_url: e.media_url || '',
    })))
    setLoadingDrawerExos(false)

    // Charger la bibliothèque d'exercices si pas déjà
    if (allExercicesDrawer.length === 0) {
      const { data: exos } = await supabase
        .from('exercices')
        .select('id, nom, muscle_group, equipment')
        .or(`coach_id.is.null,coach_id.eq.${coachId}`)
        .order('nom')
      setAllExercicesDrawer(exos || [])
    }
  }

  const ouvrirDrawerNouveau = async () => {
    // Créer un modèle vide en DB
    const { data, error } = await supabase
      .from('seances')
      .insert({ coach_id: coachId, client_id: null, date_prevue: null, titre: 'Nouveau modèle', notes: null, is_template: true })
      .select().single()
    if (error || !data) { console.error('[Hub/ouvrirDrawerNouveau] Erreur INSERT template:', error?.message); toast.error('Erreur création modèle'); return }
    setTemplates(prev => [data, ...prev])
    ouvrirDrawer(data)
  }

  // ── Ajouter un exercice au modèle (drawer) ──
  const drawerAddExercice = (exo) => {
    setDrawerExos(prev => [...prev, {
      id: null, exercice_id: exo.id, nom: exo.nom,
      muscle_group: exo.muscle_group || '', equipment: exo.equipment || '',
      series: 4, reps: 10, repos: 90, ordre: prev.length,
    }])
    setDrawerShowSearch(false)
    setDrawerSearch('')
  }

  // ── Supprimer un exercice du modèle (drawer) ──
  const drawerRemoveExo = (idx) => {
    setDrawerExos(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Mettre à jour un champ exercice (drawer) ──
  const drawerUpdateExo = (idx, field, value) => {
    setDrawerExos(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  // ── Sauvegarder le modèle (titre + exercices) ──
  const drawerSave = async () => {
    if (!drawerTemplate) return
    setDrawerSaving(true)

    // 1. Mettre à jour le titre
    await supabase.from('seances').update({ titre: drawerTitle.trim() || 'Sans titre' }).eq('id', drawerTemplate.id)

    // 2. Supprimer les anciens exercices et réinsérer
    await supabase.from('seance_exercices').delete().eq('seance_id', drawerTemplate.id)
    if (drawerExos.length > 0) {
      const rows = drawerExos.map((e, i) => ({
        seance_id: drawerTemplate.id,
        exercice_id: e.exercice_id,
        series: parseInt(e.series) || 3,
        reps: parseInt(e.reps) || 10,
        repos: parseInt(e.repos) || 60,
        ordre: i,
        media_url: e.media_url?.trim() || null,
      }))
      await supabase.from('seance_exercices').insert(rows)
    }

    // 3. Mettre à jour la liste locale
    setTemplates(prev => prev.map(t => t.id === drawerTemplate.id ? { ...t, titre: drawerTitle.trim() || 'Sans titre' } : t))
    toast.success(`Modèle "${drawerTitle}" sauvegardé !`)
    setDrawerSaving(false)
    setDrawerTemplate(null)
  }

  // Filtrage de la bibliothèque dans le drawer
  const filteredDrawerExos = allExercicesDrawer.filter(e => {
    const matchSearch = !drawerSearch.trim() || e.nom.toLowerCase().includes(drawerSearch.toLowerCase()) || (e.muscle_group || '').toLowerCase().includes(drawerSearch.toLowerCase())
    const matchCat = drawerCatFilter === 'Tous' || e.category === drawerCatFilter
    return matchSearch && matchCat
  })

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-10 w-48 skel-block" />
          <div className="h-10 w-32 skel-block" />
        </div>
        {/* Mobile skeleton */}
        <div className="md:hidden space-y-3">
          <div className="h-64 skel-block" />
          <div className="h-20 skel-block" />
          <div className="h-20 skel-block" />
        </div>
        {/* Desktop skeleton */}
        <div className="hidden md:grid grid-cols-7 gap-px rounded-xl overflow-hidden">
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="h-20 skel-block rounded-none" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ═══════ TOOLBAR MOBILE ═══════ */}
      <div className="md:hidden space-y-3">
        {/* Row 1: Nav + Add */}
        <div className="flex items-center gap-2">
          <button onClick={goBack} className="w-9 h-9 rounded-xl bg-[var(--bg-card)] border border-[var(--border-base)] flex items-center justify-center text-[var(--text-muted)] active:scale-95 transition-all flex-shrink-0">
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 text-center">
            <p className="text-[var(--text-primary)] text-sm font-bold capitalize">{navLabel}</p>
            {!isAtToday && (
              <button onClick={goToday} className="text-[10px] text-[#FF6B2B] font-semibold">
                Aujourd'hui
              </button>
            )}
          </div>
          <button onClick={goForward} className="w-9 h-9 rounded-xl bg-[var(--bg-card)] border border-[var(--border-base)] flex items-center justify-center text-[var(--text-muted)] active:scale-95 transition-all flex-shrink-0">
            <ChevronRight size={18} />
          </button>
          <button onClick={() => openNewModal()} className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] text-white flex items-center justify-center shadow-lg shadow-[#FF6B2B]/20 active:scale-95 transition-all flex-shrink-0">
            <Plus size={18} />
          </button>
        </div>
        {/* Row 2: View toggle + Filter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center glass-card p-1 flex-1">
            {[{ id: 'month', label: 'Mois' }, { id: 'week', label: 'Semaine' }].map(v => (
              <button
                key={v.id}
                onClick={() => setCalView(v.id)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  calView === v.id ? 'bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white shadow-sm' : 'text-[var(--text-muted)]'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl pl-8 pr-3 py-2 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors cursor-pointer">
              <option value="">Tous</option>
              {EVENT_TYPES_CAL.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <Filter className="w-3 h-3 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ═══════ TOOLBAR DESKTOP ═══════ */}
      <div className="hidden md:flex md:items-center gap-3">
        {/* Navigation */}
        <div className="flex items-center gap-2 glass-card px-3 py-2 flex-1 min-w-0">
          <button onClick={goBack} className="p-1 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-[var(--text-primary)] flex-1 text-center truncate capitalize">{navLabel}</span>
          {!isAtToday && (
            <button onClick={goToday} className="text-[10px] px-2.5 py-1 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-semibold hover:bg-[#FF6B2B]/20 transition-colors flex-shrink-0 whitespace-nowrap">
              Aujourd'hui
            </button>
          )}
          <button onClick={goForward} className="p-1 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Toggle Mois / Semaine */}
        <div className="flex items-center glass-card p-1 flex-shrink-0">
          {[{ id: 'month', label: 'Mois' }, { id: 'week', label: 'Semaine' }].map(v => (
            <button
              key={v.id}
              onClick={() => setCalView(v.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                calView === v.id ? 'bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Filtre type + Templates drawer toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl pl-8 pr-4 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors cursor-pointer min-w-[120px]">
              <option value="">Tous les types</option>
              {EVENT_TYPES_CAL.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button onClick={() => setPanelOpen(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              panelOpen ? 'bg-[#FF6B2B] text-white' : 'glass-card !rounded-xl text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
            title="Modeles de seances">
            {panelOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            Modeles
          </button>
          <button onClick={() => openNewModal()} className="flex items-center gap-1.5 bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] hover:shadow-lg hover:shadow-[#FF6B2B]/20 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all">
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>
      </div>

      {/* ═══════ STATS ═══════ */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {[
          { label: calView === 'week' ? 'Semaine' : 'Ce mois', value: totalItems, icon: Calendar, color: '#FF6B2B' },
          { label: 'Seances', value: allFiltered.filter(i => i._type === 'seance').length, icon: Dumbbell, color: '#3b82f6' },
          { label: "Auj.", value: itemsToday, icon: Clock, color: '#22c55e' },
        ].map((s, i) => (
          <div key={i} className="glass-card !rounded-xl p-2.5 md:p-3 flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: `${s.color}12` }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] text-[var(--text-muted)] truncate">{s.label}</p>
              <p className="text-base md:text-lg font-bold text-[var(--text-primary)] leading-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════ CALENDAR + TEMPLATES DRAWER ═══════ */}
      <div className="flex gap-4">
        {/* Calendar zone */}
        <div className="flex-1 min-w-0">

          {calView === 'month' ? (
            <>
              {/* ────────── VUE MOIS — MOBILE ────────── */}
              <div className="md:hidden space-y-3">
                {/* Mini calendar grid */}
                <div className="glass-card overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#FF6B2B] via-[#FF8F5E] to-transparent" />
                  {/* Day headers */}
                  <div className="grid grid-cols-7 px-2 pt-3 pb-1">
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((j, i) => (
                      <div key={i} className="text-center text-[10px] font-semibold text-[var(--text-muted)]">{j}</div>
                    ))}
                  </div>
                  {/* Date grid — compact touch-friendly */}
                  <div className="grid grid-cols-7 gap-y-0.5 px-2 pb-3">
                    {monthGrid.cells.map((cell, idx) => {
                      const isTo = isSameDayCal(cell.date, todayCal)
                      const isSel = isSameDayCal(cell.date, mobileSelectedDay)
                      const dayItems = itemsForDayCal(cell.date)
                      const hasItems = dayItems.length > 0

                      return (
                        <button
                          key={idx}
                          onClick={() => setMobileSelectedDay(new Date(cell.date))}
                          className={`relative flex flex-col items-center py-1.5 rounded-xl transition-all active:scale-95 ${
                            isSel
                              ? 'bg-gradient-to-b from-[#FF6B2B] to-[#FF8F5E] shadow-md shadow-[#FF6B2B]/20'
                              : isTo
                                ? 'bg-[#FF6B2B]/8'
                                : ''
                          }`}
                        >
                          <span className={`text-[13px] font-semibold leading-none ${
                            isSel
                              ? 'text-white'
                              : isTo
                                ? 'text-[#FF6B2B]'
                                : cell.inMonth
                                  ? 'text-[var(--text-primary)]'
                                  : 'text-[var(--text-muted)]'
                          }`}>
                            {cell.date.getDate()}
                          </span>
                          {/* Dot indicators */}
                          {hasItems && !isSel && (
                            <div className="flex gap-0.5 mt-0.5">
                              {dayItems.slice(0, 3).map((item, di) => {
                                const c = item._type === 'seance'
                                  ? (item.is_completed ? '#22c55e' : '#FF6B2B')
                                  : getEventTypeInfoCal(item.event_type).color
                                return <div key={di} className="w-1 h-1 rounded-full" style={{ backgroundColor: c }} />
                              })}
                            </div>
                          )}
                          {hasItems && isSel && (
                            <div className="w-1 h-1 rounded-full bg-white/80 mt-0.5" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Selected day events list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[var(--text-primary)] text-sm font-bold capitalize">
                      {mobileSelectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <button
                      onClick={() => handleDayClick(mobileSelectedDay)}
                      className="text-[10px] text-[#FF6B2B] font-semibold flex items-center gap-1"
                    >
                      <Plus size={12} /> Ajouter
                    </button>
                  </div>

                  {(() => {
                    const dayItems = itemsForDayCal(mobileSelectedDay)
                    if (dayItems.length === 0) {
                      return (
                        <div className="glass-card p-8 text-center">
                          <div className="w-11 h-11 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-3">
                            <Calendar size={18} className="text-[var(--text-muted)]" />
                          </div>
                          <p className="text-[var(--text-muted)] text-xs">Aucun evenement ce jour</p>
                          <button
                            onClick={() => handleDayClick(mobileSelectedDay)}
                            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B2B]/10 text-[#FF6B2B] text-[11px] font-semibold active:scale-95 transition-all"
                          >
                            <Plus size={12} /> Planifier
                          </button>
                        </div>
                      )
                    }
                    return dayItems.map(item => {
                      if (item._type === 'seance') {
                        return (
                          <button
                            key={`ms-${item.id}`}
                            onClick={(e) => openSeanceDetail(item, e)}
                            className={`w-full glass-card !p-0 overflow-hidden active:scale-[0.98] transition-all text-left`}
                          >
                            <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${item.is_completed ? 'bg-emerald-500' : 'bg-[#FF6B2B]'}`} />
                            <div className="flex items-center gap-3 pl-4 pr-3 py-3.5">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                item.is_completed ? 'bg-emerald-500/10' : 'bg-[#FF6B2B]/10'
                              }`}>
                                <Dumbbell size={18} className={item.is_completed ? 'text-emerald-400' : 'text-[#FF6B2B]'} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${item.is_completed ? 'text-emerald-400/70 line-through' : 'text-[var(--text-primary)]'}`}>
                                  {item.titre}
                                </p>
                                <p className="text-[var(--text-muted)] text-[11px] mt-0.5">
                                  Seance{item.is_completed ? ' — Completee' : ''}
                                </p>
                              </div>
                              <ChevronRight size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                            </div>
                          </button>
                        )
                      } else {
                        const ti = getEventTypeInfoCal(item.event_type)
                        const TI = ti.icon
                        return (
                          <button
                            key={`me-${item.id}`}
                            onClick={(e) => openEventDetail(item, e)}
                            className="w-full glass-card !p-0 overflow-hidden active:scale-[0.98] transition-all text-left"
                          >
                            <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ backgroundColor: ti.color }} />
                            <div className="flex items-center gap-3 pl-4 pr-3 py-3.5">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${ti.color}12` }}>
                                <TI size={18} style={{ color: ti.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] text-[var(--text-muted)]">{formatHHmmCal(item.event_date)}</span>
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${ti.color}10`, color: ti.color }}>
                                    {ti.label}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                            </div>
                          </button>
                        )
                      }
                    })
                  })()}
                </div>
              </div>

              {/* ────────── VUE MOIS — DESKTOP ────────── */}
              <div className="hidden md:block glass-card overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#FF6B2B] via-[#FF8F5E] to-transparent" />
                {/* Jours header */}
                <div className="grid grid-cols-7 border-b border-[var(--border-base)]">
                  {JOURS_COURTS.map(j => (
                    <div key={j} className="px-2 py-2.5 text-center text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{j}</div>
                  ))}
                </div>
                {/* Grid */}
                <div className="grid grid-cols-7">
                  {monthGrid.cells.map((cell, idx) => {
                    const isTo = isSameDayCal(cell.date, todayCal)
                    const dayItems = itemsForDayCal(cell.date)
                    const maxShow = 2
                    const overflow = dayItems.length - maxShow

                    return (
                      <div
                        key={idx}
                        onClick={() => handleDayClick(cell.date)}
                        className={`relative border-b border-r border-[var(--border-base)] min-h-[85px] p-1.5 flex flex-col cursor-pointer transition-colors hover:bg-[var(--bg-surface)] ${
                          cell.inMonth ? '' : 'opacity-40'
                        } ${isTo ? 'bg-[#FF6B2B]/[0.04] hover:bg-[#FF6B2B]/[0.07]' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            onClick={(e) => { if (dayItems.length > 0) openDayDetail(cell.date, e) }}
                            className={`text-xs font-medium leading-none ${
                              isTo ? 'w-6 h-6 flex items-center justify-center rounded-full bg-[#FF6B2B] text-white text-[11px] font-bold'
                                : cell.inMonth ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'
                            } ${dayItems.length > 0 ? 'hover:underline cursor-pointer' : ''}`}
                          >
                            {cell.date.getDate()}
                          </span>
                          {dayItems.length > 0 && (
                            <span className="text-[9px] text-[var(--text-muted)] font-medium">{dayItems.length}</span>
                          )}
                        </div>

                        <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
                          {dayItems.slice(0, maxShow).map((item) => {
                            if (item._type === 'seance') {
                              return (
                                <div
                                  key={`s-${item.id}`}
                                  onClick={(e) => openSeanceDetail(item, e)}
                                  className={`flex items-center gap-1 px-1 py-0.5 rounded truncate cursor-pointer transition-colors ${
                                    item.is_completed ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : 'bg-[#FF6B2B]/10 hover:bg-[#FF6B2B]/20'
                                  }`}
                                >
                                  <Dumbbell className="w-2.5 h-2.5 flex-shrink-0" style={{ color: item.is_completed ? '#22c55e' : '#FF6B2B' }} />
                                  <span className={`text-[10px] truncate ${item.is_completed ? 'text-emerald-300/70 line-through' : 'text-[var(--text-primary)]'}`}>{item.titre}</span>
                                </div>
                              )
                            } else {
                              const ti = getEventTypeInfoCal(item.event_type)
                              const TI = ti.icon
                              return (
                                <div
                                  key={`e-${item.id}`}
                                  onClick={(e) => openEventDetail(item, e)}
                                  className="flex items-center gap-1 px-1 py-0.5 rounded truncate cursor-pointer hover:brightness-125 transition-all"
                                  style={{ backgroundColor: `${ti.color}15` }}
                                >
                                  <TI className="w-2.5 h-2.5 flex-shrink-0" style={{ color: ti.color }} />
                                  <span className="text-[10px] text-[var(--text-primary)] truncate">{item.title}</span>
                                </div>
                              )
                            }
                          })}
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
            </>
          ) : (
            <>
              {/* ────────── VUE SEMAINE — MOBILE ────────── */}
              <div className="md:hidden space-y-3">
                {/* Horizontal day selector */}
                <div className="glass-card px-2 py-2 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                  {weekDates.map((date, idx) => {
                    const isTo = isSameDayCal(date, todayCal)
                    const isSel = isSameDayCal(date, mobileSelectedDay)
                    const dayItems = itemsForDayCal(date)

                    return (
                      <button
                        key={idx}
                        onClick={() => setMobileSelectedDay(new Date(date))}
                        className={`flex-1 min-w-[48px] flex flex-col items-center py-2 rounded-xl transition-all active:scale-95 ${
                          isSel
                            ? 'bg-gradient-to-b from-[#FF6B2B] to-[#FF8F5E] shadow-md shadow-[#FF6B2B]/20'
                            : isTo
                              ? 'bg-[#FF6B2B]/8'
                              : ''
                        }`}
                      >
                        <span className={`text-[9px] font-semibold uppercase ${
                          isSel ? 'text-white/70' : 'text-[var(--text-muted)]'
                        }`}>
                          {JOURS_COURTS[idx]}
                        </span>
                        <span className={`text-lg font-bold mt-0.5 ${
                          isSel ? 'text-white' : isTo ? 'text-[#FF6B2B]' : 'text-[var(--text-primary)]'
                        }`}>
                          {date.getDate()}
                        </span>
                        {dayItems.length > 0 && (
                          <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSel ? 'bg-white/80' : 'bg-[#FF6B2B]'}`} />
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Selected day header + events */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[var(--text-primary)] text-sm font-bold capitalize">
                      {mobileSelectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <button
                      onClick={() => handleDayClick(mobileSelectedDay)}
                      className="text-[10px] text-[#FF6B2B] font-semibold flex items-center gap-1"
                    >
                      <Plus size={12} /> Ajouter
                    </button>
                  </div>

                  {(() => {
                    const dayItems = itemsForDayCal(mobileSelectedDay)
                    if (dayItems.length === 0) {
                      return (
                        <div className="glass-card p-8 text-center">
                          <div className="w-11 h-11 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-3">
                            <Calendar size={18} className="text-[var(--text-muted)]" />
                          </div>
                          <p className="text-[var(--text-muted)] text-xs">Rien de prevu</p>
                          <button
                            onClick={() => handleDayClick(mobileSelectedDay)}
                            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B2B]/10 text-[#FF6B2B] text-[11px] font-semibold active:scale-95 transition-all"
                          >
                            <Plus size={12} /> Planifier
                          </button>
                        </div>
                      )
                    }
                    return dayItems.map(item => {
                      if (item._type === 'seance') {
                        return (
                          <button
                            key={`ws-${item.id}`}
                            onClick={(e) => openSeanceDetail(item, e)}
                            className="w-full glass-card !p-0 overflow-hidden active:scale-[0.98] transition-all text-left"
                          >
                            <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${item.is_completed ? 'bg-emerald-500' : 'bg-[#FF6B2B]'}`} />
                            <div className="flex items-center gap-3 pl-4 pr-3 py-3.5">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                item.is_completed ? 'bg-emerald-500/10' : 'bg-[#FF6B2B]/10'
                              }`}>
                                <Dumbbell size={18} className={item.is_completed ? 'text-emerald-400' : 'text-[#FF6B2B]'} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${item.is_completed ? 'text-emerald-400/70 line-through' : 'text-[var(--text-primary)]'}`}>
                                  {item.titre}
                                </p>
                                <p className="text-[var(--text-muted)] text-[11px] mt-0.5">Seance</p>
                              </div>
                              <ChevronRight size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                            </div>
                          </button>
                        )
                      } else {
                        const ti = getEventTypeInfoCal(item.event_type)
                        const TI = ti.icon
                        return (
                          <button
                            key={`we-m-${item.id}`}
                            onClick={(e) => openEventDetail(item, e)}
                            className="w-full glass-card !p-0 overflow-hidden active:scale-[0.98] transition-all text-left"
                          >
                            <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ backgroundColor: ti.color }} />
                            <div className="flex items-center gap-3 pl-4 pr-3 py-3.5">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${ti.color}12` }}>
                                <TI size={18} style={{ color: ti.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] text-[var(--text-muted)]">{formatHHmmCal(item.event_date)}</span>
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${ti.color}10`, color: ti.color }}>
                                    {ti.label}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                            </div>
                          </button>
                        )
                      }
                    })
                  })()}
                </div>
              </div>

              {/* ────────── VUE SEMAINE — DESKTOP ────────── */}
              <div className="hidden md:block glass-card overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 via-blue-400 to-transparent" />
                {/* All-day seances section */}
                {(() => {
                  const hasAllDay = weekDates.some(d => itemsForDayCal(d).some(i => i._type === 'seance'))
                  if (!hasAllDay) return null
                  return (
                    <div className="border-b border-[var(--border-base)]">
                      <div className="grid grid-cols-[60px_repeat(7,1fr)]">
                        <div className="p-2 border-r border-[var(--border-base)] flex items-center justify-center">
                          <span className="text-[9px] text-[var(--text-muted)] uppercase font-semibold">Seances</span>
                        </div>
                        {weekDates.map((date, idx) => {
                          const daySeances = itemsForDayCal(date).filter(i => i._type === 'seance')
                          return (
                            <div key={idx} className={`p-1.5 border-r border-[var(--border-base)] last:border-r-0 min-h-[40px] ${isSameDayCal(date, todayCal) ? 'bg-[#FF6B2B]/[0.03]' : ''}`}>
                              <div className="flex flex-col gap-1">
                                {daySeances.map(s => (
                                  <div
                                    key={`ad-${s.id}`}
                                    onClick={(e) => openSeanceDetail(s, e)}
                                    className={`flex items-center gap-1 px-1.5 py-1 rounded-md border cursor-pointer transition-colors ${
                                      s.is_completed
                                        ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                                        : 'bg-[#FF6B2B]/10 border-[#FF6B2B]/20 hover:bg-[#FF6B2B]/20'
                                    }`}
                                  >
                                    <Dumbbell className="w-2.5 h-2.5 flex-shrink-0" style={{ color: s.is_completed ? '#22c55e' : '#FF6B2B' }} />
                                    <span className={`text-[10px] font-medium truncate ${s.is_completed ? 'text-emerald-300/70 line-through' : 'text-[var(--text-primary)]'}`}>{s.titre}</span>
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
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[var(--border-base)]">
                  <div className="p-2 border-r border-[var(--border-base)]" />
                  {weekDates.map((date, idx) => {
                    const isTo = isSameDayCal(date, todayCal)
                    return (
                      <div key={idx} className={`p-2 border-r border-[var(--border-base)] last:border-r-0 text-center ${isTo ? 'bg-[#FF6B2B]/[0.03]' : ''}`}>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">{JOURS_COURTS[idx]}</p>
                        <p className={`text-sm font-bold mt-0.5 ${isTo ? 'text-[#FF6B2B]' : 'text-[var(--text-primary)]'}`}>{date.getDate()}</p>
                      </div>
                    )
                  })}
                </div>

                {/* Time grid */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ maxHeight: 480, overflowY: 'auto' }}>
                  {HOURS_CAL.map(h => (
                    <div key={h} className="contents">
                      <div className="h-[40px] border-r border-b border-[var(--border-base)] flex items-start justify-end pr-2 pt-0.5">
                        <span className="text-[10px] text-[var(--text-muted)] font-medium tabular-nums">{String(h).padStart(2, '0')}:00</span>
                      </div>
                      {weekDates.map((date, dIdx) => {
                        const isTo = isSameDayCal(date, todayCal)
                        const dayEvts = itemsForDayCal(date).filter(i => i._type === 'event')
                        const hourEvts = dayEvts.filter(e => new Date(e.event_date).getHours() === h)
                        return (
                          <div
                            key={dIdx}
                            onClick={() => handleDayClick(date)}
                            className={`h-[40px] border-r border-b border-[var(--border-base)] last:border-r-0 relative cursor-pointer hover:bg-[var(--bg-surface)] transition-colors ${isTo ? 'bg-[#FF6B2B]/[0.02]' : ''}`}
                          >
                            {hourEvts.map(evt => {
                              const ti = getEventTypeInfoCal(evt.event_type)
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
                                    <span className="text-[10px] font-medium text-[var(--text-primary)] truncate">{evt.title}</span>
                                  </div>
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
            </>
          )}
        </div>

        {/* ═══════ TEMPLATES DRAWER (PANNEAU DROIT) ═══════ */}
        {panelOpen && (
          <div className="hidden md:flex w-72 flex-shrink-0 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-2xl flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 20rem)' }}>
            <div className="p-4 border-b border-[var(--border-base)]">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[var(--text-primary)] text-sm font-bold">Mes modèles</h3>
                <button onClick={ouvrirDrawerNouveau}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FF6B2B] text-white text-[10px] font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-sm shadow-[#FF6B2B]/20">
                  <Plus size={11} /> Nouveau
                </button>
              </div>
              <p className="text-[var(--text-muted)] text-[10px]">{templates.length} modèle{templates.length !== 1 ? 's' : ''} disponible{templates.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-8"><Loader2 size={16} className="animate-spin text-[var(--text-muted)]" /></div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8">
                  <Layers size={28} className="text-[var(--text-muted)] mx-auto mb-3" />
                  <p className="text-[var(--text-muted)] text-xs mb-1">Aucun modèle</p>
                  <p className="text-[var(--text-muted)] text-[10px]">Créez des modèles de séances pour les réutiliser</p>
                </div>
              ) : (
                templates.map((tpl) => (
                  <div key={tpl.id} className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-2xl p-3.5 group hover:border-[#FF6B2B]/20 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                        <Dumbbell size={16} className="text-[#FF6B2B]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <button onClick={() => ouvrirDrawer(tpl)} className="text-[var(--text-primary)] text-xs font-bold hover:text-[#FF6B2B] transition-colors text-left truncate block w-full">
                          {tpl.titre}
                        </button>
                        <p className="text-[var(--text-muted)] text-[9px] mt-0.5">Cliquer pour modifier</p>
                      </div>
                      <button onClick={() => supprimerTemplate(tpl.id)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <button onClick={() => { setModalPlanifier(tpl); setPlanifDate(formatDateISO(new Date())) }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#FF6B2B] text-white text-[10px] font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-sm shadow-[#FF6B2B]/20">
                      <CalendarPlus size={11} /> Planifier
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════ MODAL CRÉATION EVENT/SÉANCE ═══════ */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-base)] flex items-center justify-between">
                <h2 className="text-[var(--text-primary)] font-semibold text-base">
                  {modalType === null ? 'Ajouter pour ' + clientName : 'Événement classique'}
                </h2>
                <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6">
                {modalType === null ? (
                  <div className="space-y-3">
                    <p className="text-[var(--text-muted)] text-sm mb-4">Que souhaitez-vous ajouter ?</p>
                    <button
                      onClick={() => { openSeanceCreationModal(evtDate) }}
                      className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-[var(--border-base)] hover:border-[#FF6B2B]/30 hover:bg-[#FF6B2B]/[0.03] transition-colors text-left"
                    >
                      <div className="w-11 h-11 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                        <Dumbbell size={20} className="text-[#FF6B2B]" />
                      </div>
                      <div>
                        <p className="text-[var(--text-primary)] text-sm font-semibold">Séance de sport</p>
                        <p className="text-[var(--text-muted)] text-xs mt-0.5">Planifier depuis un modèle ou créer</p>
                      </div>
                      <ChevronRight size={16} className="text-[var(--text-muted)] ml-auto" />
                    </button>
                    <button
                      onClick={() => setModalType('event')}
                      className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-[var(--border-base)] hover:border-[#3b82f6]/30 hover:bg-[#3b82f6]/[0.03] transition-colors text-left"
                    >
                      <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Calendar size={20} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="text-[var(--text-primary)] text-sm font-semibold">Événement classique</p>
                        <p className="text-[var(--text-muted)] text-xs mt-0.5">Bilan, appel, réunion, note...</p>
                      </div>
                      <ChevronRight size={16} className="text-[var(--text-muted)] ml-auto" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[var(--text-muted)] text-xs mb-1.5">Titre</label>
                      <input type="text" value={evtTitle} onChange={(e) => setEvtTitle(e.target.value)} placeholder="Ex: Bilan mensuel" autoFocus
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[var(--text-muted)] text-xs mb-1.5">Date</label>
                        <input type="date" value={evtDate} onChange={(e) => setEvtDate(e.target.value)}
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-[var(--text-muted)] text-xs mb-1.5">Heure</label>
                        <input type="time" value={evtTime} onChange={(e) => setEvtTime(e.target.value)}
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[var(--text-muted)] text-xs mb-1.5">Type</label>
                      <div className="flex flex-wrap gap-2">
                        {EVENT_TYPES_CAL.filter(t => t.id !== 'seance').map((t) => (
                          <button key={t.id} onClick={() => setEvtType(t.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${evtType === t.id ? 'border-2' : 'border border-[var(--border-base)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                            style={evtType === t.id ? { borderColor: t.color, color: t.color, backgroundColor: `${t.color}10` } : {}}>
                            <t.icon size={12} /> {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Client is locked — show info */}
                    <div className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <User size={14} className="text-[#FF6B2B]" />
                      <span className="text-sm text-[var(--text-primary)]">{clientName}</span>
                      <span className="text-[10px] text-[var(--text-muted)] ml-auto">Verrouillé</span>
                    </div>
                    <div>
                      <label className="block text-[var(--text-muted)] text-xs mb-1.5">Notes</label>
                      <textarea value={evtNotes} onChange={(e) => setEvtNotes(e.target.value)} placeholder="Notes optionnelles..." rows={2}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors resize-none" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setModalType(null)}
                        className="flex-1 py-2.5 rounded-xl text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] transition-colors">Retour</button>
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
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-base)] flex items-center justify-between">
                <h2 className="text-[var(--text-primary)] font-semibold text-base">
                  {dayDetailDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h2>
                <button onClick={() => setDayDetailDate(null)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                {itemsForDayCal(dayDetailDate).length === 0 ? (
                  <p className="text-center text-[var(--text-muted)] text-sm py-8">Aucun événement ce jour</p>
                ) : itemsForDayCal(dayDetailDate).map(item => {
                  if (item._type === 'seance') {
                    return (
                      <button
                        key={`dd-s-${item.id}`}
                        onClick={(e) => { setDayDetailDate(null); openSeanceDetail(item, e) }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border hover:brightness-110 transition-all text-left ${
                          item.is_completed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-[#FF6B2B]/10 border-[#FF6B2B]/20'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${item.is_completed ? 'bg-emerald-500/20' : 'bg-[#FF6B2B]/20'}`}>
                          <Dumbbell size={16} className={item.is_completed ? 'text-emerald-400' : 'text-[#FF6B2B]'} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${item.is_completed ? 'text-emerald-300/70 line-through' : 'text-[var(--text-primary)]'}`}>{item.titre}</p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Séance{item.is_completed ? ' — Complétée' : ''}</p>
                        </div>
                      </button>
                    )
                  } else {
                    const ti = getEventTypeInfoCal(item.event_type)
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
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title}</p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{formatHHmmCal(item.event_date)}</p>
                        </div>
                      </button>
                    )
                  }
                })}
              </div>
              <div className="px-4 pb-4">
                <button
                  onClick={() => { setDayDetailDate(null); handleDayClick(dayDetailDate) }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--border-base)] text-[var(--text-muted)] text-xs font-medium hover:text-[var(--text-secondary)] hover:border-[var(--border-base)] transition-colors"
                >
                  <Plus size={14} /> Ajouter un événement
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════ MODAL DÉTAIL SÉANCE ═══════ */}
      <Modal isOpen={!!detailSeance} onClose={() => setDetailSeance(null)} title={detailSeance?.titre || 'Séance'}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-[var(--bg-elevated)] rounded-lg p-3">
            <Calendar size={14} className="text-[#FF6B2B]" />
            <span className="text-[var(--text-primary)] text-sm">
              {detailSeance?.date_prevue
                ? new Date(detailSeance.date_prevue + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                : ''}
            </span>
            {detailSeance?.is_completed && (
              <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">
                <CheckCircle2 size={10} /> Complétée
              </span>
            )}
          </div>
          {detailSeance?.notes && (
            <p className="text-[var(--text-muted)] text-xs bg-[var(--bg-elevated)] rounded-lg p-3">{detailSeance.notes}</p>
          )}
          <div>
            <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-semibold mb-2">Exercices ({detailExercices.length})</p>
            {loadingDetail ? (
              <div className="flex items-center justify-center py-6"><Loader2 size={18} className="animate-spin text-[var(--text-muted)]" /></div>
            ) : detailExercices.length === 0 ? (
              <div className="text-center py-6 bg-[var(--bg-elevated)] rounded-lg">
                <Dumbbell size={20} className="text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-[var(--text-muted)] text-xs">Aucun exercice ajouté</p>
                <p className="text-[var(--text-muted)] text-[10px] mt-1">Ouvrez l'onglet Sport pour composer la séance</p>
              </div>
            ) : (
              <div className="space-y-2">
                {detailExercices.map((ex, i) => (
                  <div key={ex.id} className="flex items-center gap-3 bg-[var(--bg-elevated)] rounded-lg p-3">
                    <span className="w-5 h-5 rounded bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--text-primary)] text-sm font-medium truncate">{ex.exercices?.nom || 'Exercice'}</p>
                      <p className="text-[var(--text-muted)] text-[10px]">{ex.series}×{ex.reps} {ex.poids ? `· ${ex.poids}kg` : ''} {ex.repos ? `· ${ex.repos}s repos` : ''}</p>
                    </div>
                    {ex.exercices?.muscle_group && (
                      <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">{ex.exercices.muscle_group}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => supprimerSeance(detailSeance?.id)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-red-400 bg-red-500/10 hover:bg-red-500/15 transition-colors">
              <Trash2 size={14} /> Supprimer
            </button>
            <button onClick={() => { if (onEditSeance) onEditSeance(detailSeance?.id); setDetailSeance(null) }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors">
              <Pencil size={14} /> Modifier les exercices
            </button>
          </div>
        </div>
      </Modal>

      {/* ═══════ MODAL DÉTAIL ÉVÉNEMENT ═══════ */}
      {detailEvent && (() => {
        const ti = getEventTypeInfoCal(detailEvent.event_type)
        const TI = ti.icon
        return (
          <>
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setDetailEvent(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--border-base)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${ti.color}20` }}>
                      <TI size={18} style={{ color: ti.color }} />
                    </div>
                    <div>
                      <h2 className="text-[var(--text-primary)] font-semibold text-base">{detailEvent.title}</h2>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${ti.color}15`, color: ti.color }}>
                        {ti.label}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setDetailEvent(null)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors">
                    <X size={18} />
                  </button>
                </div>
                <div className="px-6 py-4 border-b border-[var(--border-base)] flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-[var(--text-muted)]" />
                    <span className="text-sm text-[var(--text-primary)]">
                      {new Date(detailEvent.event_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[var(--text-muted)]" />
                    <span className="text-sm text-[var(--text-primary)]">{formatHHmmCal(detailEvent.event_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-[var(--text-muted)]" />
                    <span className="text-sm text-[var(--text-primary)]">{clientName}</span>
                  </div>
                </div>
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold">Notes</p>
                    {!editingNotes && (
                      <button onClick={() => { setEditingNotes(true); setEditNotesValue(detailEvent.notes || '') }}
                        className="flex items-center gap-1 text-[10px] text-[#FF6B2B] font-medium hover:text-[#FF9A6C] transition-colors">
                        <Pencil size={11} /> Modifier
                      </button>
                    )}
                  </div>
                  {editingNotes ? (
                    <div className="space-y-3">
                      <textarea value={editNotesValue} onChange={(e) => setEditNotesValue(e.target.value)} rows={4} autoFocus
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors resize-none"
                        placeholder="Ajouter des notes..." />
                      <div className="flex gap-2">
                        <button onClick={() => setEditingNotes(false)}
                          className="flex-1 py-2 rounded-xl text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] transition-colors">Annuler</button>
                        <button onClick={saveEventNotes} disabled={savingNotes}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40">
                          {savingNotes ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl p-4 min-h-[60px]">
                      {detailEvent.notes ? (
                        <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{detailEvent.notes}</p>
                      ) : (
                        <p className="text-sm text-[var(--text-muted)] italic">Aucune note pour cet événement</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer — Supprimer */}
                <div className="px-6 pb-4">
                  <button
                    onClick={() => handleDeleteEvent(detailEvent.id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-red-400 bg-red-500/10 hover:bg-red-500/15 transition-colors"
                  >
                    <Trash2 size={14} /> Supprimer cet événement
                  </button>
                </div>
              </div>
            </div>
          </>
        )
      })()}

      {/* ═══════ MODAL — Séance 3 étapes Apple ═══════ */}
      {modalSeance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setModalSeance(false); setSeanceStep(1); setSelectedTemplateForPlan(null) }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="h-1 bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]" />
            <div className="px-6 pt-5 pb-3">
              <div className="flex items-center gap-2 mb-2">
                {[1, 2].map(s => (
                  <div key={s} className={`flex-1 h-1 rounded-full transition-all duration-300 ${seanceStep >= s ? 'bg-[#FF6B2B]' : 'bg-[var(--bg-surface)]'}`} />
                ))}
              </div>
              <p className="text-[var(--text-muted)] text-[10px] font-medium">Étape {seanceStep} sur 2</p>
            </div>
            {seanceStep === 1 && (
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <h2 className="text-[var(--text-primary)] text-xl font-bold">Choisir une séance</h2>
                  <p className="text-[var(--text-muted)] text-sm mt-1">Sélectionnez un modèle ou créez-en un nouveau.</p>
                </div>
                <div className="space-y-2">
                  <button onClick={() => { setSelectedTemplateForPlan('new'); setNewSeanceTitre('') }}
                    className={`w-full flex items-center gap-3.5 px-4 py-4 rounded-xl border-2 border-dashed transition-all ${
                      selectedTemplateForPlan === 'new' ? 'border-[#FF6B2B] bg-[#FF6B2B]/5' : 'border-[var(--border-base)] hover:border-[#FF6B2B]/30'
                    }`}>
                    <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center shrink-0">
                      <Plus size={18} className="text-[#FF6B2B]" />
                    </div>
                    <div className="text-left">
                      <p className="text-[var(--text-primary)] text-sm font-semibold">Nouvelle séance</p>
                      <p className="text-[var(--text-muted)] text-[11px]">Créer une séance personnalisée</p>
                    </div>
                  </button>
                  {selectedTemplateForPlan === 'new' && (
                    <input type="text" value={newSeanceTitre} onChange={e => setNewSeanceTitre(e.target.value)}
                      placeholder="Nom de la séance..." autoFocus
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
                  )}
                </div>
                {templates.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-wider">Ou utiliser un modèle</p>
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {templates.map(tpl => (
                        <button key={tpl.id} onClick={() => { setSelectedTemplateForPlan(tpl); setNewSeanceTitre(tpl.titre) }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                            selectedTemplateForPlan?.id === tpl.id ? 'bg-[#FF6B2B]/10 border border-[#FF6B2B]/30' : 'bg-[var(--bg-base)] hover:bg-[var(--bg-base)]/80 border border-transparent'
                          }`}>
                          <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center shrink-0">
                            <Dumbbell size={14} className="text-[#FF6B2B]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[var(--text-primary)] text-xs font-semibold truncate">{tpl.titre}</p>
                            {tpl.notes && <p className="text-[var(--text-muted)] text-[9px] truncate">{tpl.notes}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setModalSeance(false); setSeanceStep(1) }}
                    className="flex-1 py-3 rounded-xl text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] transition-colors">Annuler</button>
                  <button onClick={() => setSeanceStep(2)}
                    disabled={!selectedTemplateForPlan || (selectedTemplateForPlan === 'new' && !newSeanceTitre.trim())}
                    className="flex-1 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                    Suivant <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
            {seanceStep === 2 && (
              <div className="px-6 pb-6 space-y-5">
                <div>
                  <h2 className="text-[var(--text-primary)] text-xl font-bold">Planifier la date</h2>
                  <p className="text-[var(--text-muted)] text-sm mt-1">
                    {selectedTemplateForPlan === 'new' ? `"${newSeanceTitre}"` : `"${selectedTemplateForPlan?.titre}"`} pour {clientName}
                  </p>
                </div>
                <div className="bg-[var(--bg-base)] rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center shrink-0">
                    <Dumbbell size={18} className="text-[#FF6B2B]" />
                  </div>
                  <div>
                    <p className="text-[var(--text-primary)] text-sm font-semibold">
                      {selectedTemplateForPlan === 'new' ? newSeanceTitre : selectedTemplateForPlan?.titre}
                    </p>
                    <p className="text-[var(--text-muted)] text-[10px]">
                      {selectedTemplateForPlan === 'new' ? 'Nouvelle séance' : 'Modèle existant (exercices copiés)'}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-2 font-semibold uppercase tracking-wider">Date de la séance</label>
                  <input type="date" value={modalDate || ''} onChange={e => setModalDate(e.target.value)}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-2 font-semibold uppercase tracking-wider">Notes (optionnel)</label>
                  <textarea value={newSeanceNotes} onChange={e => setNewSeanceNotes(e.target.value)}
                    placeholder="Instructions spécifiques..." rows={2}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-all resize-none" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setSeanceStep(1)}
                    className="flex-1 py-3 rounded-xl text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] transition-colors flex items-center justify-center gap-1.5">
                    <ChevronLeft size={14} /> Retour
                  </button>
                  <button
                    onClick={async (e) => {
                      if (selectedTemplateForPlan && selectedTemplateForPlan !== 'new') {
                        setModalPlanifier(selectedTemplateForPlan)
                        setPlanifDate(modalDate || formatDateISO(new Date()))
                        setModalSeance(false); setSeanceStep(1); setSelectedTemplateForPlan(null)
                      } else {
                        await creerSeance(e)
                        setSeanceStep(1); setSelectedTemplateForPlan(null)
                      }
                    }}
                    disabled={creatingSeance || !modalDate}
                    className="flex-1 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B2B]/20">
                    {creatingSeance ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                    Planifier
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ MODAL — Créer un modèle ═══════ */}
      <Modal isOpen={modalTemplate} onClose={() => setModalTemplate(false)} title="Nouveau modèle de séance">
        <form onSubmit={creerTemplate} className="space-y-4">
          <div className="bg-[var(--bg-elevated)] rounded-lg p-3 flex items-start gap-2.5">
            <Layers size={16} className="text-[#FF6B2B] mt-0.5 flex-shrink-0" />
            <p className="text-[var(--text-muted)] text-xs leading-relaxed">Un modèle est une séance type réutilisable.</p>
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Titre du modèle *</label>
            <input type="text" value={newTemplateTitre} onChange={(e) => setNewTemplateTitre(e.target.value)}
              placeholder="Ex: Push Day, Full Body débutant..." autoFocus required
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B] transition-colors" />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Notes (optionnel)</label>
            <textarea value={newTemplateNotes} onChange={(e) => setNewTemplateNotes(e.target.value)}
              placeholder="Description ou objectifs..." rows={3}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B] transition-colors resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModalTemplate(false)}
              className="flex-1 py-2.5 rounded-xl text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] transition-colors">Annuler</button>
            <button type="submit" disabled={creatingTemplate}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40">
              {creatingTemplate ? <Loader2 size={15} className="animate-spin" /> : <Layers size={15} />}
              Créer le modèle
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══════ MODAL — Planifier un modèle ═══════ */}
      <Modal isOpen={!!modalPlanifier} onClose={() => setModalPlanifier(null)} title="Ajouter au calendrier">
        {modalPlanifier && (
          <div className="space-y-4">
            <div className="bg-[var(--bg-elevated)] rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                <Copy size={16} className="text-[#FF6B2B]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-primary)] text-sm font-semibold truncate">{modalPlanifier.titre}</p>
                <p className="text-[var(--text-muted)] text-[10px]">Ce modèle et ses exercices seront copiés</p>
              </div>
            </div>
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3 flex items-center gap-2">
              <User size={14} className="text-[#FF6B2B]" />
              <span className="text-[var(--text-primary)] text-sm">{clientName}</span>
              <span className="text-[var(--text-muted)] text-[10px] ml-auto">Client verrouillé</span>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Date de la séance *</label>
              <input type="date" value={planifDate} onChange={(e) => setPlanifDate(e.target.value)} required
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B] transition-colors" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModalPlanifier(null)}
                className="flex-1 py-2.5 rounded-xl text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] transition-colors">Annuler</button>
              <button onClick={planifierTemplate} disabled={planifying || !planifDate}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40">
                {planifying ? <Loader2 size={15} className="animate-spin" /> : <CalendarPlus size={15} />}
                Confirmer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════ MODAL — Preview modèle ═══════ */}
      <Modal isOpen={!!previewTemplate} onClose={() => setPreviewTemplate(null)} title={previewTemplate?.titre || 'Modèle'}>
        {previewTemplate && (
          <div className="space-y-4">
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3 flex items-center gap-2">
              <Layers size={14} className="text-[#FF6B2B]" />
              <span className="text-[#FF6B2B] text-[10px] font-bold">MODÈLE</span>
            </div>
            <div>
              <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-semibold mb-2">Exercices ({previewExos.length})</p>
              {loadingPreview ? (
                <div className="flex items-center justify-center py-6"><Loader2 size={18} className="animate-spin text-[var(--text-muted)]" /></div>
              ) : previewExos.length === 0 ? (
                <div className="text-center py-6 bg-[var(--bg-elevated)] rounded-lg">
                  <Dumbbell size={20} className="text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-[var(--text-muted)] text-xs">Aucun exercice dans ce modèle</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {previewExos.map((ex, i) => (
                    <div key={ex.id} className="flex items-center gap-3 bg-[var(--bg-elevated)] rounded-lg p-3">
                      <span className="w-5 h-5 rounded bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--text-primary)] text-sm font-medium truncate">{ex.exercices?.nom || 'Exercice'}</p>
                        <p className="text-[var(--text-muted)] text-[10px]">{ex.series}×{ex.reps} {ex.poids ? `· ${ex.poids}kg` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setModalPlanifier(previewTemplate); setPreviewTemplate(null); setPlanifDate(formatDateISO(new Date())) }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors">
                <CalendarPlus size={15} /> Planifier
              </button>
              <button onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] text-[var(--text-muted)] text-sm hover:bg-[var(--bg-surface)] transition-colors">Fermer</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ══════════════════════════════════════ */}
      {/* DRAWER — Workout Builder (Modèle)     */}
      {/* ══════════════════════════════════════ */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-[var(--bg-elevated)] border-l border-[var(--border-base)] shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
        drawerTemplate ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {drawerTemplate && (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-[var(--border-base)] flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center">
                    <Dumbbell size={16} className="text-[#FF6B2B]" />
                  </div>
                  <h3 className="text-[var(--text-primary)] text-sm font-bold">Workout Builder</h3>
                </div>
                <button onClick={() => setDrawerTemplate(null)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all">
                  <X size={18} />
                </button>
              </div>
              {/* Nom du modèle */}
              <input
                type="text"
                value={drawerTitle}
                onChange={e => setDrawerTitle(e.target.value)}
                placeholder="Nom du modèle..."
                className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm font-semibold placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 focus:ring-1 focus:ring-[#FF6B2B]/20 transition-all"
              />
            </div>

            {/* Exercices du modèle */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
              {loadingDrawerExos ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
                </div>
              ) : drawerExos.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--bg-base)] border border-dashed border-[var(--border-base)] flex items-center justify-center mx-auto mb-4">
                    <Dumbbell size={22} className="text-[var(--text-muted)]" />
                  </div>
                  <p className="text-[var(--text-muted)] text-sm font-medium mb-1">Aucun exercice</p>
                  <p className="text-[var(--text-muted)] text-xs">Ajoutez des exercices pour construire votre séance</p>
                </div>
              ) : (
                drawerExos.map((exo, idx) => (
                  <div key={`${exo.exercice_id}-${idx}`} className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl p-3.5 group hover:border-[var(--border-base)]/80 transition-all">
                    {/* Titre + supprimer */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                          <Dumbbell size={13} className="text-[#FF6B2B]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--text-primary)] text-xs font-semibold truncate">{exo.nom}</p>
                          {exo.muscle_group && (
                            <p className="text-[var(--text-muted)] text-[10px]">{exo.muscle_group}{exo.equipment ? ` • ${exo.equipment}` : ''}</p>
                          )}
                        </div>
                      </div>
                      <button onClick={() => drawerRemoveExo(idx)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {/* Séries / Reps / Repos */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[9px] text-[var(--text-muted)] mb-1 font-medium">Séries</label>
                        <input type="number" min={1} value={exo.series}
                          onChange={e => drawerUpdateExo(idx, 'series', e.target.value)}
                          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)] text-xs font-semibold text-center focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
                      </div>
                      <div>
                        <label className="block text-[9px] text-[var(--text-muted)] mb-1 font-medium">Reps</label>
                        <input type="number" min={1} value={exo.reps}
                          onChange={e => drawerUpdateExo(idx, 'reps', e.target.value)}
                          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)] text-xs font-semibold text-center focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
                      </div>
                      <div>
                        <label className="block text-[9px] text-[var(--text-muted)] mb-1 font-medium">Repos (s)</label>
                        <input type="number" min={0} step={15} value={exo.repos}
                          onChange={e => drawerUpdateExo(idx, 'repos', e.target.value)}
                          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)] text-xs font-semibold text-center focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Ajouter un exercice — Bibliothèque intégrée */}
            <div className="border-t border-[var(--border-base)] flex-shrink-0 flex flex-col" style={{ maxHeight: drawerShowSearch ? '55vh' : 'auto' }}>
              {drawerShowSearch ? (
                <>
                  {/* Search header */}
                  <div className="px-5 py-3 space-y-2.5 border-b border-[var(--border-base)]/50">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[var(--text-primary)] text-xs font-bold">Ma bibliothèque</h4>
                      <button onClick={() => { setDrawerShowSearch(false); setDrawerSearch(''); setDrawerCatFilter('Tous') }}
                        className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">Fermer</button>
                    </div>
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input type="text" value={drawerSearch} onChange={e => setDrawerSearch(e.target.value)}
                        placeholder="Rechercher..." autoFocus
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl pl-8 pr-4 py-2 text-[var(--text-primary)] text-[11px] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {EXERCISE_CATEGORIES.map(cat => (
                        <button key={cat} onClick={() => setDrawerCatFilter(cat)}
                          className={`px-2 py-0.5 rounded-lg text-[9px] font-medium transition-colors ${
                            drawerCatFilter === cat ? 'bg-[#FF6B2B] text-white' : 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                          }`}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Library list */}
                  <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
                    {filteredDrawerExos.length === 0 ? (
                      <div className="text-center py-6 space-y-2">
                        <p className="text-[var(--text-muted)] text-xs">Aucun exercice trouvé</p>
                        {drawerSearch.trim().length > 1 && (
                          <button onClick={async () => {
                            const nom = drawerSearch.trim()
                            const { data, error } = await supabase.from('exercices').insert({
                              coach_id: coachId, nom, muscle_group: 'Autre', equipment: 'Autre', category: drawerCatFilter !== 'Tous' ? drawerCatFilter : 'Force',
                            }).select().single()
                            if (data && !error) {
                              setAllExercicesDrawer(prev => [data, ...prev])
                              drawerAddExercice(data)
                              toast.success(`"${nom}" créé et ajouté !`)
                            }
                          }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B2B]/10 text-[#FF6B2B] text-xs font-semibold hover:bg-[#FF6B2B]/20 transition-colors">
                            <Plus size={12} /> Créer « {drawerSearch.trim()} »
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredDrawerExos.map(exo => (
                        <button key={exo.id} onClick={() => drawerAddExercice(exo)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-base)] transition-colors text-left group">
                          <div className="w-9 h-9 rounded-xl bg-[#FF6B2B]/8 flex items-center justify-center flex-shrink-0">
                            {exo.image_url ? (
                              <img src={exo.image_url} alt="" className="w-full h-full rounded-xl object-cover" />
                            ) : (
                              <Dumbbell size={14} className="text-[#FF6B2B]/60" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[var(--text-primary)] text-xs font-semibold truncate">{exo.nom}</p>
                            <p className="text-[var(--text-muted)] text-[9px]">{exo.muscle_group || ''}{exo.category ? ` • ${exo.category}` : ''}</p>
                          </div>
                          <Plus size={15} className="text-[#FF6B2B] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="px-5 py-3">
                  <button onClick={() => setDrawerShowSearch(true)}
                    className="w-full py-3.5 rounded-xl bg-[#FF6B2B]/10 text-[#FF6B2B] text-xs font-semibold hover:bg-[#FF6B2B]/20 transition-all flex items-center justify-center gap-2">
                    <Plus size={14} /> Ajouter depuis ma bibliothèque
                  </button>
                </div>
              )}
            </div>

            {/* Footer — Sauvegarder */}
            <div className="px-5 py-4 border-t border-[var(--border-base)] flex-shrink-0 flex gap-2">
              <button onClick={() => setDrawerTemplate(null)}
                className="flex-1 py-3 rounded-xl text-sm text-[var(--text-muted)] bg-[var(--bg-base)] hover:bg-[var(--bg-surface)] transition-colors border border-[var(--border-base)]">
                Annuler
              </button>
              <button onClick={drawerSave} disabled={drawerSaving}
                className="flex-1 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B2B]/20">
                {drawerSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Enregistrer
              </button>
            </div>
          </>
        )}
      </div>
      {/* Overlay pour le drawer */}
      {drawerTemplate && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerTemplate(null)} />
      )}
    </div>
  )
}

// ══════════════════════════════════════
// FOOD ICON MAPPER
// ══════════════════════════════════════
const FOOD_ICONS = {
  'Protéine':     { icon: Beef,     color: 'text-red-400',    bg: 'bg-red-500/10' },
  'Féculent':     { icon: Wheat,    color: 'text-amber-400',  bg: 'bg-amber-500/10' },
  'Légume':       { icon: Carrot,   color: 'text-green-400',  bg: 'bg-green-500/10' },
  'Fruit':        { icon: Apple,    color: 'text-pink-400',   bg: 'bg-pink-500/10' },
  'Lipide':       { icon: Droplets, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  'Laitier':      { icon: Egg,      color: 'text-sky-400',    bg: 'bg-sky-500/10' },
  'Légumineuse':  { icon: Grape,    color: 'text-purple-400', bg: 'bg-purple-500/10' },
  'Snack':        { icon: Cookie,   color: 'text-orange-300', bg: 'bg-orange-500/10' },
}

function FoodIcon({ categorie, size = 16, className = '' }) {
  const config = FOOD_ICONS[categorie] || { icon: Apple, color: 'text-[#FF6B2B]', bg: 'bg-[#FF6B2B]/10' }
  const Icon = config.icon
  return <Icon size={size} className={`${config.color} ${className}`} />
}

function FoodIconBg({ categorie }) {
  return (FOOD_ICONS[categorie] || { bg: 'bg-[#FF6B2B]/10' }).bg
}

// ══════════════════════════════════════
// INFOS TAB — Dossier Client
// ══════════════════════════════════════
const NIVEAUX_ACTIVITE = ['Sédentaire', 'Légèrement actif', 'Modérément actif', 'Très actif', 'Extrêmement actif']
const SEXE_OPTIONS = ['Homme', 'Femme', 'Autre']

// Apple Settings row — defined OUTSIDE component to avoid re-creation on each render
const INFOS_INPUT_STYLE = "bg-transparent text-[var(--text-primary)] text-sm font-semibold text-right border-none focus:outline-none focus:ring-0 placeholder-zinc-600"

function SettingsRow({ label, children, last }) {
  return (
    <div className={`flex items-center justify-between py-3.5 ${last ? '' : 'border-b border-[var(--border-base)]/40'}`}>
      <span className="text-zinc-400 text-sm font-medium">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  )
}

function InfosTab({ coachId, clientId }) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    prenom: '', nom: '', email: '', telephone: '',
    age: '', sexe: '', taille: '', poids_depart: '',
    poids_cible: '', date_limite: '', niveau_activite: '',
    objectif_type: '', notes_coach: '',
  })

  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    supabase.from('profiles').select('*').eq('id', clientId).single().then(({ data }) => {
      if (data) {
        setFormData({
          prenom: data.prenom || '',
          nom: data.nom || '',
          email: data.email || '',
          telephone: data.telephone || '',
          age: data.age ?? '',
          sexe: data.sexe || '',
          taille: data.taille ?? '',
          poids_depart: data.poids_depart ?? '',
          poids_cible: data.poids_cible ?? '',
          date_limite: data.date_limite || '',
          niveau_activite: data.niveau_activite || '',
          objectif_type: data.objectif_type || '',
          notes_coach: data.notes_coach || '',
        })
      }
      setLoading(false)
    })
  }, [clientId])

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      prenom: formData.prenom || null,
      nom: formData.nom || null,
      telephone: formData.telephone || null,
      age: formData.age ? parseInt(formData.age) : null,
      sexe: formData.sexe || null,
      taille: formData.taille ? parseFloat(formData.taille) : null,
      poids_depart: formData.poids_depart ? parseFloat(formData.poids_depart) : null,
      poids_cible: formData.poids_cible ? parseFloat(formData.poids_cible) : null,
      date_limite: formData.date_limite || null,
      niveau_activite: formData.niveau_activite || null,
      objectif_type: formData.objectif_type || null,
      notes_coach: formData.notes_coach || null,
    }
    const { error } = await supabase.from('profiles').update(payload).eq('id', clientId)
    if (error) {
      console.error('Save error:', error)
      toast.error(`Erreur : ${error.message}`)
    } else {
      toast.success('Informations mises à jour !')
    }
    setSaving(false)
  }

  // IMC auto-calculé
  const imc = formData.poids_depart && formData.taille
    ? (parseFloat(formData.poids_depart) / ((parseFloat(formData.taille) / 100) ** 2)).toFixed(1)
    : null
  const imcLabel = imc ? (imc < 18.5 ? 'Insuffisant' : imc < 25 ? 'Normal' : imc < 30 ? 'Surpoids' : 'Obésité') : null

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-[#FF6B2B]" size={28} /></div>
  }

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ═══ Identité ═══ */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-base)]">
          <h3 className="text-[var(--text-primary)] text-base font-bold">Identité</h3>
        </div>
        <div className="px-6">
          <SettingsRow label="Prénom">
            <input type="text" value={formData.prenom} onChange={e => set('prenom', e.target.value)}
              placeholder="Prénom" className={INFOS_INPUT_STYLE} />
          </SettingsRow>
          <SettingsRow label="Nom">
            <input type="text" value={formData.nom} onChange={e => set('nom', e.target.value)}
              placeholder="Nom" className={INFOS_INPUT_STYLE} />
          </SettingsRow>
          <SettingsRow label="Email">
            <span className="text-[var(--text-muted)] text-sm">{formData.email || '—'}</span>
          </SettingsRow>
          <SettingsRow label="Téléphone" last>
            <input type="tel" value={formData.telephone} onChange={e => set('telephone', e.target.value)}
              placeholder="+33..." className={INFOS_INPUT_STYLE} />
          </SettingsRow>
        </div>
      </div>

      {/* ═══ Profil ═══ */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-base)]">
          <h3 className="text-[var(--text-primary)] text-base font-bold">Profil</h3>
        </div>
        <div className="px-6">
          <SettingsRow label="Genre">
            <select value={formData.sexe} onChange={e => set('sexe', e.target.value)}
              className={`${INFOS_INPUT_STYLE} cursor-pointer appearance-none pr-0`}>
              <option value="" className="bg-[var(--bg-card)]">—</option>
              {SEXE_OPTIONS.map(s => <option key={s} value={s} className="bg-[var(--bg-card)]">{s}</option>)}
            </select>
          </SettingsRow>
          <SettingsRow label="Âge">
            <input type="number" value={formData.age} onChange={e => set('age', e.target.value)}
              placeholder="—" className={`${INFOS_INPUT_STYLE} w-12`} />
            <span className="text-[var(--text-secondary)] text-sm">ans</span>
          </SettingsRow>
          <SettingsRow label="Taille">
            <input type="number" value={formData.taille} onChange={e => set('taille', e.target.value)}
              placeholder="—" className={`${INFOS_INPUT_STYLE} w-14`} />
            <span className="text-[var(--text-secondary)] text-sm">cm</span>
          </SettingsRow>
          <SettingsRow label="Poids">
            <input type="number" step="0.1" value={formData.poids_depart} onChange={e => set('poids_depart', e.target.value)}
              placeholder="—" className={`${INFOS_INPUT_STYLE} w-16`} />
            <span className="text-[var(--text-secondary)] text-sm">kg</span>
          </SettingsRow>
          <SettingsRow label="IMC">
            <span className="text-[var(--text-primary)] text-sm font-semibold">{imc || '—'}</span>
            <span className="text-[var(--text-secondary)] text-sm">kg/m²</span>
            {imcLabel && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-bold ml-1">{imcLabel}</span>
            )}
          </SettingsRow>
          <SettingsRow label="Activité" last>
            <select value={formData.niveau_activite} onChange={e => set('niveau_activite', e.target.value)}
              className={`${INFOS_INPUT_STYLE} cursor-pointer appearance-none pr-0`}>
              <option value="" className="bg-[var(--bg-card)]">—</option>
              {NIVEAUX_ACTIVITE.map(n => <option key={n} value={n} className="bg-[var(--bg-card)]">{n}</option>)}
            </select>
          </SettingsRow>
        </div>
      </div>

      {/* ═══ Objectifs ═══ */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-base)]">
          <h3 className="text-[var(--text-primary)] text-base font-bold">Objectifs</h3>
        </div>
        <div className="px-6">
          <SettingsRow label="Type d'objectif">
            <input type="text" value={formData.objectif_type} onChange={e => set('objectif_type', e.target.value)}
              placeholder="Perte de poids, Prise de masse..." className={INFOS_INPUT_STYLE} />
          </SettingsRow>
          <SettingsRow label="Poids cible">
            <input type="number" step="0.1" value={formData.poids_cible} onChange={e => set('poids_cible', e.target.value)}
              placeholder="—" className={`${INFOS_INPUT_STYLE} w-16`} />
            <span className="text-[var(--text-secondary)] text-sm">kg</span>
          </SettingsRow>
          <SettingsRow label="Échéance" last>
            <input type="date" value={formData.date_limite} onChange={e => set('date_limite', e.target.value)}
              className={`${INFOS_INPUT_STYLE} cursor-pointer`} />
          </SettingsRow>
        </div>
      </div>

      {/* ═══ Poids visuel ═══ */}
      {(formData.poids_depart || formData.poids_cible) && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6">
          <div className="flex items-center justify-around">
            <div className="text-center">
              <p className="text-[var(--text-secondary)] text-[10px] uppercase tracking-widest mb-1">Départ</p>
              <p className="text-[var(--text-primary)] text-2xl font-bold">{formData.poids_depart || '—'}</p>
              <p className="text-[var(--text-muted)] text-xs">kg</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-[1.5px] bg-[var(--bg-surface)]" />
              <div className="w-8 h-8 rounded-full bg-[#FF6B2B]/10 flex items-center justify-center">
                <ChevronRight size={14} className="text-[#FF6B2B]" />
              </div>
              <div className="w-8 h-[1.5px] bg-[var(--bg-surface)]" />
            </div>
            <div className="text-center">
              <p className="text-[var(--text-secondary)] text-[10px] uppercase tracking-widest mb-1">Cible</p>
              <p className="text-[#FF6B2B] text-2xl font-bold">{formData.poids_cible || '—'}</p>
              <p className="text-[#FF6B2B]/40 text-xs">kg</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Notes ═══ */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-base)]">
          <h3 className="text-[var(--text-primary)] text-base font-bold">Notes du coach</h3>
        </div>
        <div className="p-6">
          <textarea value={formData.notes_coach} onChange={e => set('notes_coach', e.target.value)}
            placeholder="Notes internes, restrictions alimentaires, historique médical..."
            rows={4}
            className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl px-5 py-3.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 transition-all resize-none" />
        </div>
      </div>

      {/* ═══ Enregistrer ═══ */}
      <div className="flex justify-end pt-2">
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-50 shadow-xl shadow-[#FF6B2B]/25">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>
    </div>
  )
}


// ══════════════════════════════════════
// SUIVI TAB — Dashboard Performance Global
// ══════════════════════════════════════
function SuiviTab({ coachId, clientId }) {
  const toast = useToast()

  // ── Poids ──
  const [pesees, setPesees] = useState([])
  const [profile, setProfile] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [newPoids, setNewPoids] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)

  // ── Assiduité Sport ──
  const [seancesMonth, setSeancesMonth] = useState([]) // { date_prevue, is_completed }

  // ── Habitudes ──
  const [habitudes, setHabitudes] = useState([])
  const [habLogs, setHabLogs] = useState([]) // { habitude_id, date }

  // ── Objectifs ──
  const [objectifs, setObjectifs] = useState([])

  // ── Formulaires (tous les retours client) ──
  const [allFormReponses, setAllFormReponses] = useState([])
  const [allFormChamps, setAllFormChamps] = useState([])
  const [allFormulaires, setAllFormulaires] = useState([])
  const [formFilter, setFormFilter] = useState('tous') // 'tous' | 'post_seance' | formulaire_id

  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!clientId || !coachId) return
    const load = async () => {
      setLoading(true)

      // Dates pour 4 semaines alignées Lun→Dim
      // Lundi de la semaine courante
      const now = new Date()
      const dayOfWeek = now.getDay() // 0=Dim, 1=Lun, ..., 6=Sam
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // jours depuis lundi
      const mondayThisWeek = new Date(now)
      mondayThisWeek.setDate(now.getDate() - diffToMonday)
      // Lundi d'il y a 3 semaines (= début de la grille 4 semaines)
      const gridStart = new Date(mondayThisWeek)
      gridStart.setDate(mondayThisWeek.getDate() - 21)
      // Dimanche de la semaine courante (= fin de la grille)
      const gridEnd = new Date(mondayThisWeek)
      gridEnd.setDate(mondayThisWeek.getDate() + 6)

      const dateMin28 = gridStart.toISOString().split('T')[0]
      const dateMax28 = gridEnd.toISOString().split('T')[0]

      // Habitudes : 30 derniers jours
      const il30j = new Date()
      il30j.setDate(il30j.getDate() - 29)
      const dateMin30 = il30j.toISOString().split('T')[0]

      const [peseesRes, profileRes, seancesRes, habsRes, logsRes, objsRes] = await Promise.all([
        supabase.from('suivi_poids').select('*').eq('client_id', clientId).eq('coach_id', coachId).order('date_pesee', { ascending: true }),
        supabase.from('profiles').select('poids_depart, poids_cible, poids_actuel').eq('id', clientId).single(),
        supabase.from('seances').select('id, date_prevue, is_completed').eq('client_id', clientId).eq('is_template', false).not('client_id', 'is', null).gte('date_prevue', dateMin28).lte('date_prevue', dateMax28),
        supabase.from('habitudes').select('id, nom, couleur, icone').eq('client_id', clientId).eq('actif', true),
        supabase.from('habitudes_log').select('habitude_id, date').eq('client_id', clientId).gte('date', dateMin30),
        supabase.from('objectifs').select('*').eq('client_id', clientId).eq('statut', 'en_cours').order('created_at', { ascending: false }),
      ])

      if (peseesRes.error) console.error('[Hub/Overview] Erreur pesées:', peseesRes.error.message)
      if (profileRes.error) console.error('[Hub/Overview] Erreur profile:', profileRes.error.message)
      if (seancesRes.error) console.error('[Hub/Overview] Erreur séances:', seancesRes.error.message)
      if (habsRes.error) console.error('[Hub/Overview] Erreur habitudes:', habsRes.error.message)
      if (logsRes.error) console.error('[Hub/Overview] Erreur hab_logs:', logsRes.error.message)
      if (objsRes.error) console.error('[Hub/Overview] Erreur objectifs:', objsRes.error.message)

      setPesees(peseesRes.data || [])
      setProfile(profileRes.data)
      setSeancesMonth(seancesRes.data || [])
      setHabitudes(habsRes.data || [])
      setHabLogs(logsRes.data || [])
      setObjectifs(objsRes.data || [])

      // ── Tous les formulaires du coach pour ce client ──
      const { data: coachForms } = await supabase
        .from('formulaires')
        .select('id, titre, type, recurrence')
        .eq('coach_id', coachId)

      const formIds = (coachForms || []).map(f => f.id)
      setAllFormulaires(coachForms || [])

      if (formIds.length > 0) {
        const [repRes, champsRes] = await Promise.all([
          supabase.from('formulaire_reponses')
            .select('id, formulaire_id, reponses, complete, created_at')
            .eq('client_id', clientId)
            .in('formulaire_id', formIds)
            .order('created_at', { ascending: true }),
          supabase.from('formulaire_champs')
            .select('id, label, type_champ, formulaire_id, poids_score, ordre')
            .in('formulaire_id', formIds)
            .order('ordre'),
        ])
        setAllFormReponses(repRes.data || [])
        setAllFormChamps(champsRes.data || [])
      } else {
        setAllFormReponses([])
        setAllFormChamps([])
      }

      setLoading(false)
    }
    load()
  }, [clientId, coachId, today])

  // ── Ajouter pesée ──
  const ajouterPesee = async () => {
    if (!newPoids) return
    setSaving(true)
    const { error } = await supabase.from('suivi_poids').upsert({
      client_id: clientId, coach_id: coachId, date_pesee: newDate,
      poids: parseFloat(newPoids), notes: newNote || null,
    }, { onConflict: 'client_id,date_pesee' })
    if (error) { toast.error('Erreur'); } else {
      await supabase.from('profiles').update({ poids_actuel: parseFloat(newPoids) }).eq('id', clientId)
      toast.success('Pesée enregistrée !')
      setShowModal(false); setNewPoids(''); setNewNote('')
      const { data } = await supabase.from('suivi_poids').select('*').eq('client_id', clientId).eq('coach_id', coachId).order('date_pesee', { ascending: true })
      setPesees(data || [])
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-20 skel-block !rounded-xl" />)}</div>
        <div className="h-48 skel-block !rounded-xl" />
        <div className="h-48 skel-block !rounded-xl" />
      </div>
    )
  }

  // ── Calculs Poids ──
  const dernierPoids = pesees.length > 0 ? pesees[pesees.length - 1].poids : (profile?.poids_actuel || profile?.poids_depart || null)
  const premierPoids = pesees.length > 0 ? pesees[0].poids : (profile?.poids_depart || null)
  const evolution = dernierPoids && premierPoids ? (dernierPoids - premierPoids).toFixed(1) : null
  const poidsObjectif = profile?.poids_cible

  // ── Calculs Assiduité ──
  const totalSeances = seancesMonth.length
  const completedSeances = seancesMonth.filter(s => s.is_completed).length
  const assiduitePct = totalSeances > 0 ? Math.round((completedSeances / totalSeances) * 100) : 0

  // Heatmap: 4 semaines alignées Lun→Dim
  // Recalcul du lundi de la semaine courante (identique au useEffect)
  const nowHm = new Date()
  const dowHm = nowHm.getDay() // 0=Dim, 1=Lun, ..., 6=Sam
  const diffHm = dowHm === 0 ? 6 : dowHm - 1
  const mondayHm = new Date(nowHm.getFullYear(), nowHm.getMonth(), nowHm.getDate() - diffHm)
  // Premier jour de la grille = lundi d'il y a 3 semaines
  const gridStartHm = new Date(mondayHm)
  gridStartHm.setDate(mondayHm.getDate() - 21)

  const heatmapDays = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(gridStartHm)
    d.setDate(gridStartHm.getDate() + i)
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const daySeances = seancesMonth.filter(s => s.date_prevue === ds)
    const hasSeance = daySeances.length > 0
    const allDone = hasSeance && daySeances.every(s => s.is_completed)
    const someDone = hasSeance && daySeances.some(s => s.is_completed) && !allDone
    return { date: ds, day: d, hasSeance, allDone, someDone, isToday: ds === today }
  })

  // ── Calculs Habitudes ──
  const getHabStreak = (habId) => {
    const dates = habLogs.filter(l => l.habitude_id === habId).map(l => l.date)
    return calculerStreak(dates)
  }

  const getHabDays = (habId) => {
    return habLogs.filter(l => l.habitude_id === habId).map(l => l.date)
  }

  // ── SVG Weight Chart ──
  const renderWeightChart = () => {
    if (pesees.length < 2) return null
    const cW = 600, cH = 180, cP = 35
    const poids = pesees.map(p => p.poids)
    const allVals = [...poids]
    if (poidsObjectif) allVals.push(poidsObjectif)
    const minP = Math.min(...allVals) - 1
    const maxP = Math.max(...allVals) + 1
    const rng = maxP - minP || 1

    const pts = pesees.map((p, i) => ({
      x: cP + (i / (pesees.length - 1)) * (cW - cP * 2),
      y: cP + (1 - (p.poids - minP) / rng) * (cH - cP * 2),
      poids: p.poids, date: p.date_pesee,
    }))
    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaD = `${pathD} L ${pts[pts.length - 1].x} ${cH - cP} L ${pts[0].x} ${cH - cP} Z`
    const objY = poidsObjectif ? cP + (1 - (poidsObjectif - minP) / rng) * (cH - cP * 2) : null

    return (
      <svg viewBox={`0 0 ${cW} ${cH}`} className="w-full h-auto">
        <defs>
          <linearGradient id="suiviGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B2B" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FF6B2B" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = cP + pct * (cH - cP * 2)
          return <line key={pct} x1={cP} y1={y} x2={cW - cP} y2={y} stroke="var(--border-base)" />
        })}
        {objY !== null && objY >= cP && objY <= cH - cP && (
          <>
            <line x1={cP} y1={objY} x2={cW - cP} y2={objY} stroke="#22c55e" strokeDasharray="4 4" strokeWidth="1" opacity="0.5" />
            <text x={cW - cP + 4} y={objY + 3} fill="#22c55e" fontSize="8" opacity="0.6">Cible</text>
          </>
        )}
        <path d={areaD} fill="url(#suiviGrad)" />
        <path d={pathD} fill="none" stroke="#FF6B2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="var(--bg-base)" stroke="#FF6B2B" strokeWidth="1.5" />
            {(i === 0 || i === pts.length - 1) && (
              <text x={p.x} y={p.y - 8} textAnchor="middle" fill="var(--text-primary)" fontSize="8" fontWeight="600">{p.poids}</text>
            )}
          </g>
        ))}
        {pts.filter((_, i) => i === 0 || i === pts.length - 1).map((p, i) => (
          <text key={i} x={p.x} y={cH - 8} textAnchor="middle" fill="var(--text-muted)" fontSize="7">
            {new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </text>
        ))}
      </svg>
    )
  }

  return (
    <div className="space-y-6">

      {/* ══════════════════════════════════════════ */}
      {/* SECTION 1 — Assiduité Sportive            */}
      {/* ══════════════════════════════════════════ */}
      <div className="glass-card relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#FF6B2B] via-[#FF8F5E] to-transparent" />
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center">
              <BarChart3 size={15} className="text-[#FF6B2B]" />
            </div>
            <div>
              <h3 className="text-[var(--text-primary)] text-[15px] font-bold tracking-tight">Assiduité Sportive</h3>
              <p className="text-[var(--text-secondary)] text-[11px] mt-0.5">4 dernières semaines</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{
              background: assiduitePct >= 80 ? 'rgba(34,197,94,0.08)' : assiduitePct >= 50 ? 'rgba(245,158,11,0.08)' : 'rgba(255,107,43,0.08)',
            }}>
              <Activity size={12} style={{ color: assiduitePct >= 80 ? '#22c55e' : assiduitePct >= 50 ? '#f59e0b' : '#FF6B2B' }} />
              <span className="text-xs font-bold tabular-nums" style={{
                color: assiduitePct >= 80 ? '#22c55e' : assiduitePct >= 50 ? '#f59e0b' : '#FF6B2B',
              }}>
                {assiduitePct}%
              </span>
            </div>
            <span className="text-[var(--text-muted)] text-[11px] font-medium tabular-nums">{completedSeances}/{totalSeances} séances</span>
          </div>
        </div>

        {/* Heatmap */}
        <div className="px-6 pb-6">
          <div className="glass-card !rounded-xl p-4">
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((j, i) => (
                <div key={i} className="text-center text-[9px] text-[var(--text-muted)] font-medium">{j}</div>
              ))}
            </div>
            {/* Cells */}
            <div className="grid grid-cols-7 gap-2">
              {heatmapDays.map((day, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-lg transition-all relative ${
                    day.allDone
                      ? 'bg-emerald-500/90 shadow-[0_0_8px_rgba(34,197,94,0.25)]'
                      : day.someDone
                        ? 'bg-gradient-to-br from-amber-500/50 to-amber-600/30'
                        : day.hasSeance
                          ? 'bg-[var(--bg-surface)] border border-red-500/15'
                          : 'bg-[var(--bg-surface)]'
                  } ${day.isToday ? 'ring-[1.5px] ring-[#FF6B2B] ring-offset-1 ring-offset-[var(--bg-card)]' : ''}`}
                  title={`${new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} — ${day.allDone ? '✅ Complétée' : day.someDone ? '⚠️ Partielle' : day.hasSeance ? '❌ Manquée' : 'Repos'}`}
                >
                  {/* Date label inside cell */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-[8px] font-medium ${
                      day.allDone ? 'text-[var(--text-muted)]0' : day.someDone ? 'text-amber-200/60' : day.hasSeance ? 'text-red-400/40' : 'text-[var(--text-muted)]'
                    }`}>
                      {day.day.getDate()}
                    </span>
                  </div>
                  {/* Completed glow dot */}
                  {day.allDone && (
                    <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white/40" />
                  )}
                </div>
              ))}
            </div>

            {/* Légende */}
            <div className="flex items-center justify-center gap-5 mt-4 pt-3 border-t border-[var(--border-base)]">
              {[
                { color: 'bg-emerald-500/90', label: 'Complétée' },
                { color: 'bg-gradient-to-br from-amber-500/50 to-amber-600/30', label: 'Partielle' },
                { color: 'bg-[var(--bg-surface)] border border-red-500/15', label: 'Manquée' },
                { color: 'bg-[var(--bg-surface)]', label: 'Repos' },
              ].map((l, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded ${l.color}`} />
                  <span className="text-[var(--text-muted)] text-[9px] font-medium">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* SECTION 2 — Discipline des Habitudes       */}
      {/* ══════════════════════════════════════════ */}
      <div className="glass-card relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#FF6B2B] via-[#FF8F5E] to-transparent" />
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center">
              <Flame size={15} className="text-[#FF6B2B]" />
            </div>
            <div>
              <h3 className="text-[var(--text-primary)] text-[15px] font-bold tracking-tight">Discipline des Habitudes</h3>
              <p className="text-[var(--text-secondary)] text-[11px] mt-0.5">30 derniers jours</p>
            </div>
          </div>
          {habitudes.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF6B2B]/8">
              <Flame size={12} className="text-[#FF6B2B]" />
              <span className="text-[#FF6B2B] text-xs font-bold tabular-nums">
                {Math.max(0, ...habitudes.map(h => getHabStreak(h.id)))}j
              </span>
              <span className="text-[#FF6B2B]/40 text-[10px] font-medium ml-0.5">meilleur</span>
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          {habitudes.length === 0 ? (
            <div className="glass-card !rounded-xl py-10 text-center">
              <Flame size={24} className="text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-[var(--text-muted)] text-xs">Aucune habitude active</p>
            </div>
          ) : (
            <div className="space-y-1">
              {habitudes.map((hab, hi) => {
                const streak = getHabStreak(hab.id)
                const days = getHabDays(hab.id)
                const rate = Math.round((days.length / 30) * 100)
                const IconComp = getHabitIcon(hab.icone)

                return (
                  <div key={hab.id} className={`glass-card !rounded-xl p-4 ${hi > 0 ? '' : ''}`}>
                    {/* Row */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${hab.couleur || '#FF6B2B'}12` }}>
                        <IconComp size={14} style={{ color: hab.couleur || '#FF6B2B' }} />
                      </div>
                      <span className="text-[var(--text-primary)] text-[13px] font-semibold flex-1 truncate">{hab.nom}</span>
                      {streak > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md shrink-0"
                          style={{ backgroundColor: `${hab.couleur || '#FF6B2B'}12` }}>
                          <Flame size={10} style={{ color: hab.couleur || '#FF6B2B' }} />
                          <span className="text-[10px] font-bold tabular-nums" style={{ color: hab.couleur || '#FF6B2B' }}>{streak}j</span>
                        </div>
                      )}
                      <span className="text-[var(--text-muted)] text-[11px] font-medium tabular-nums shrink-0">{rate}%</span>
                    </div>

                    {/* 30-day timeline */}
                    <div className="flex gap-[2.5px]">
                      {Array.from({ length: 30 }, (_, i) => {
                        const d = new Date()
                        d.setDate(d.getDate() - (29 - i))
                        const ds = d.toISOString().split('T')[0]
                        const done = days.includes(ds)
                        const isT = ds === today
                        return (
                          <div key={i}
                            className={`h-[14px] flex-1 rounded-[3px] transition-all ${
                              done
                                ? 'shadow-sm'
                                : isT
                                  ? 'ring-1 ring-[#FF6B2B]/40 ring-offset-0 bg-[var(--bg-surface)]'
                                  : 'bg-[var(--bg-surface)]'
                            }`}
                            style={done ? { backgroundColor: hab.couleur || '#FF6B2B', opacity: 0.85 } : {}}
                            title={`${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${done ? '✅' : '—'}`}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* SECTION 3 — Courbe de Poids               */}
      {/* ══════════════════════════════════════════ */}
      <div className="glass-card relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#FF6B2B] via-[#FF8F5E] to-transparent" />
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center">
              <Activity size={15} className="text-[#FF6B2B]" />
            </div>
            <div>
              <h3 className="text-[var(--text-primary)] text-[15px] font-bold tracking-tight">Courbe de Poids</h3>
              <p className="text-[var(--text-secondary)] text-[11px] mt-0.5">{pesees.length} pesée{pesees.length > 1 ? 's' : ''} enregistrée{pesees.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B2B] text-white text-[11px] font-semibold hover:bg-[#e55a1b] transition-all shadow-lg shadow-[#FF6B2B]/15 active:scale-95">
            <Plus size={13} /> Pesée
          </button>
        </div>

        {/* Stats ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mx-6 mb-5">
          {[
            { label: 'Actuel', value: dernierPoids ? `${dernierPoids}` : '—', unit: 'kg', color: 'var(--text-primary)' },
            { label: 'Objectif', value: poidsObjectif ? `${poidsObjectif}` : '—', unit: 'kg', color: '#22c55e' },
            { label: 'Évolution', value: evolution ? `${parseFloat(evolution) > 0 ? '+' : ''}${evolution}` : '—', unit: 'kg', color: evolution && parseFloat(evolution) < 0 ? '#22c55e' : evolution && parseFloat(evolution) > 0 ? '#ef4444' : 'var(--text-primary)' },
            { label: 'Pesées', value: `${pesees.length}`, unit: '', color: 'var(--text-primary)' },
          ].map((s, i) => (
            <div key={i} className="glass-card !rounded-xl px-4 py-3.5 text-center">
              <p className="text-[var(--text-muted)] text-[9px] font-medium uppercase tracking-widest">{s.label}</p>
              <p className="text-xl font-bold mt-1 tabular-nums tracking-tight" style={{ color: s.color }}>
                {s.value}
                {s.unit && <span className="text-[10px] text-zinc-700 ml-0.5 font-medium">{s.unit}</span>}
              </p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="px-6 pb-6">
          <div className="glass-card !rounded-xl p-4">
            {pesees.length < 2 ? (
              <div className="text-center py-12">
                <Scale size={28} className="text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-[var(--text-muted)] text-xs">2 pesées minimum pour afficher le graphique</p>
                <button onClick={() => setShowModal(true)}
                  className="mt-3 text-[#FF6B2B] text-xs font-semibold hover:underline">+ Ajouter une pesée</button>
              </div>
            ) : (
              renderWeightChart()
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* SECTION 4 — Progression Objectifs          */}
      {/* ══════════════════════════════════════════ */}
      {objectifs.length > 0 && (
        <div className="glass-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#FF6B2B] via-[#FF8F5E] to-transparent" />
          <div className="px-6 py-5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center">
              <Target size={15} className="text-[#FF6B2B]" />
            </div>
            <div>
              <h3 className="text-[var(--text-primary)] text-[15px] font-bold tracking-tight">Progression des Objectifs</h3>
              <p className="text-[var(--text-secondary)] text-[11px] mt-0.5">{objectifs.length} objectif{objectifs.length > 1 ? 's' : ''} en cours</p>
            </div>
          </div>
          <div className="px-6 pb-6 space-y-3">
            {objectifs.map(obj => {
              const pct = calcProgress(obj.valeur_depart, obj.valeur_actuelle, obj.valeur_cible)
              const color = progressColor(pct)
              const isLoss = obj.valeur_cible < obj.valeur_depart
              const jours = joursRestants(obj.date_limite)
              const typeInfo = OBJ_TYPES.find(t => t.id === obj.type_objectif) || OBJ_TYPES[3]
              return (
                <div key={obj.id} className="glass-card !rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${typeInfo.color}12` }}>
                        {isLoss ? <TrendingDown size={13} style={{ color }} /> : <TrendingUp size={13} style={{ color }} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[var(--text-primary)] text-[13px] font-semibold truncate">{obj.titre}</p>
                        <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
                          {obj.valeur_actuelle ?? obj.valeur_depart} / {obj.valeur_cible} {obj.unite}
                          {jours !== null && (
                            <span className={`ml-2 ${jours < 0 ? 'text-red-400' : jours <= 7 ? 'text-amber-400' : ''}`}>
                              · {jours < 0 ? `${Math.abs(jours)}j retard` : jours === 0 ? "Aujourd'hui" : `${jours}j restants`}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold tabular-nums shrink-0 ml-3" style={{ color }}>{pct}%</span>
                  </div>
                  <div className="h-2.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700 relative"
                      style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }}>
                      <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 50%, transparent)' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* SECTION 5 — Bilans & Formulaires           */}
      {/* ══════════════════════════════════════════ */}
      {(() => {
        const TYPE_COLORS = { bilan: '#a855f7', satisfaction: '#f59e0b', evaluation: '#3b82f6', feedback: '#22c55e', custom: '#FF6B2B', post_seance: '#ec4899' }
        const TYPE_LABELS = { bilan: 'Bilan', satisfaction: 'Satisfaction', evaluation: 'Évaluation', feedback: 'Feedback', custom: 'Custom', post_seance: 'Post-séance' }
        const TYPE_ICONS_MAP = { bilan: '📋', satisfaction: '⭐', evaluation: '📊', feedback: '💬', custom: '📝', post_seance: '🏋️' }

        // Enrichir chaque formulaire avec son type effectif (post_seance si recurrence)
        const enrichedForms = allFormulaires.map(f => {
          const rec = typeof f.recurrence === 'string' ? JSON.parse(f.recurrence) : f.recurrence
          const isPostSeance = rec?.intervalle === 'post_seance' && rec?.actif === true
          return { ...f, effectiveType: isPostSeance ? 'post_seance' : (f.type || 'custom') }
        })

        // Filtrer les réponses selon le filtre actif
        const filteredReponses = formFilter === 'tous'
          ? allFormReponses
          : formFilter === 'post_seance'
            ? allFormReponses.filter(r => enrichedForms.find(f => f.id === r.formulaire_id)?.effectiveType === 'post_seance')
            : allFormReponses.filter(r => r.formulaire_id === formFilter)

        const completed = filteredReponses.filter(r => r.complete)
        const pending = filteredReponses.filter(r => !r.complete)

        // Formulaires qui ont des réponses pour ce client
        const formsWithData = enrichedForms.filter(f => allFormReponses.some(r => r.formulaire_id === f.id))

        // Score calculator (notes /10)
        const getScore = (rep) => {
          const formChamps = allFormChamps.filter(c => c.formulaire_id === rep.formulaire_id && c.type_champ === 'note_1_10')
          if (!formChamps.length || !rep.reponses) return null
          const vals = formChamps.map(c => Number(rep.reponses[c.id])).filter(v => !isNaN(v) && v > 0)
          return vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null
        }

        const scoredEntries = completed.map(r => ({ ...r, score: getScore(r) })).filter(r => r.score !== null)
        const avgScore = scoredEntries.length > 0 ? Math.round((scoredEntries.reduce((a, b) => a + b.score, 0) / scoredEntries.length) * 10) / 10 : null

        // Trend
        let trend = null
        if (scoredEntries.length >= 4) {
          const last3 = scoredEntries.slice(-3)
          const prev3 = scoredEntries.slice(-6, -3)
          if (prev3.length >= 2) {
            const avgLast = last3.reduce((a, b) => a + b.score, 0) / last3.length
            const avgPrev = prev3.reduce((a, b) => a + b.score, 0) / prev3.length
            trend = Math.round((avgLast - avgPrev) * 10) / 10
          }
        }

        // Alerte
        const lastScored = scoredEntries.length > 0 ? scoredEntries[scoredEntries.length - 1] : null
        const isAlerte = lastScored && lastScored.score <= 4

        // Moyennes par champ note (filtrées)
        const filteredFormIds = [...new Set(filteredReponses.map(r => r.formulaire_id))]
        const noteChamps = allFormChamps.filter(c => c.type_champ === 'note_1_10' && filteredFormIds.includes(c.formulaire_id))
        const champMoyennes = noteChamps.map(ch => {
          const vals = completed.filter(r => r.formulaire_id === ch.formulaire_id).map(r => Number(r.reponses?.[ch.id])).filter(v => !isNaN(v) && v > 0)
          const moy = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null
          return { ...ch, moyenne: moy, count: vals.length }
        }).filter(c => c.moyenne !== null)

        // Couleur active du filtre
        const activeFilterColor = formFilter === 'tous'
          ? '#a855f7'
          : TYPE_COLORS[formFilter] || TYPE_COLORS[enrichedForms.find(f => f.id === formFilter)?.effectiveType] || '#a855f7'

        // SVG chart
        const chartW = 560, chartH = 120, padX = 30, padY = 15
        const chartPoints = scoredEntries.map((r, i) => {
          const x = scoredEntries.length === 1 ? chartW / 2 : padX + (i / (scoredEntries.length - 1)) * (chartW - padX * 2)
          const y = padY + ((10 - r.score) / 10) * (chartH - padY * 2)
          const form = enrichedForms.find(f => f.id === r.formulaire_id)
          return { x, y, score: r.score, date: r.created_at, color: TYPE_COLORS[form?.effectiveType] || '#a855f7' }
        })
        const linePath = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
        const areaPath = chartPoints.length > 1
          ? `${linePath} L${chartPoints[chartPoints.length - 1].x},${chartH - padY} L${chartPoints[0].x},${chartH - padY} Z`
          : ''

        // Résumé par formulaire (mini stats cards)
        const formSummaries = formsWithData.map(f => {
          const reps = allFormReponses.filter(r => r.formulaire_id === f.id)
          const done = reps.filter(r => r.complete).length
          const total = reps.length
          const scores = reps.filter(r => r.complete).map(r => getScore(r)).filter(s => s !== null)
          const avg = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null
          return { ...f, done, total, avg }
        })

        return (
          <div className="glass-card relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#FF6B2B] via-[#FF8F5E] to-transparent" />
            {/* Header */}
            <div className="px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isAlerte ? 'bg-red-500/15' : 'bg-purple-500/10'}`}>
                  <ClipboardList size={15} className={isAlerte ? 'text-red-400' : 'text-purple-400'} />
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] text-[15px] font-bold tracking-tight">Bilans & Formulaires</h3>
                  <p className="text-[var(--text-muted)] text-xs mt-0.5">
                    {allFormReponses.filter(r => r.complete).length} rempli{allFormReponses.filter(r => r.complete).length > 1 ? 's' : ''}
                    {allFormReponses.filter(r => !r.complete).length > 0 ? ` · ${allFormReponses.filter(r => !r.complete).length} en attente` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {trend !== null && (
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold ${
                    trend > 0 ? 'bg-emerald-500/10 text-emerald-400' : trend < 0 ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-[var(--text-secondary)]'
                  }`}>
                    {trend > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {trend > 0 ? '+' : ''}{trend}
                  </span>
                )}
                {avgScore !== null && (
                  <span className={`px-3 py-1.5 rounded-xl text-sm font-bold ${
                    avgScore >= 7 ? 'bg-emerald-500/10 text-emerald-400' : avgScore >= 5 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {avgScore}/10
                  </span>
                )}
              </div>
            </div>

            {/* Mini-cards résumé par formulaire */}
            {formSummaries.length > 0 && (
              <div className="px-6 pb-4">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {/* Filtre "Tous" */}
                  <button onClick={() => setFormFilter('tous')}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                      formFilter === 'tous' ? 'bg-white/10 text-[var(--text-primary)] border border-white/15' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-transparent hover:bg-[var(--bg-surface)]'
                    }`}>
                    Tous ({allFormReponses.length})
                  </button>
                  {formSummaries.map(f => {
                    const color = TYPE_COLORS[f.effectiveType] || '#FF6B2B'
                    const isActive = formFilter === f.id || (formFilter === 'post_seance' && f.effectiveType === 'post_seance')
                    return (
                      <button key={f.id}
                        onClick={() => setFormFilter(f.effectiveType === 'post_seance' ? 'post_seance' : f.id)}
                        className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                          isActive ? 'border text-[var(--text-primary)]' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-transparent hover:bg-[var(--bg-surface)]'
                        }`}
                        style={isActive ? { backgroundColor: color + '15', borderColor: color + '30' } : {}}>
                        <span>{TYPE_ICONS_MAP[f.effectiveType] || '📝'}</span>
                        <span style={isActive ? { color } : {}}>{f.titre}</span>
                        {f.avg !== null && (
                          <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: color + '15', color }}>{f.avg}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Alerte score critique */}
            {isAlerte && (
              <div className="mx-6 mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/15">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={15} className="text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-red-300 text-xs font-semibold">Score bas détecté : {lastScored.score}/10</p>
                  <p className="text-red-400/50 text-[11px] mt-0.5">
                    Dernier retour le {new Date(lastScored.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — pensez à prendre des nouvelles
                  </p>
                </div>
              </div>
            )}

            {/* Graphe évolution */}
            {scoredEntries.length >= 2 && (
              <div className="px-6 pb-2">
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-32">
                  <defs>
                    <linearGradient id="formSuiviGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={activeFilterColor} stopOpacity="0.25" />
                      <stop offset="100%" stopColor={activeFilterColor} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[3, 5, 7].map(v => {
                    const y = padY + ((10 - v) / 10) * (chartH - padY * 2)
                    return (
                      <g key={v}>
                        <line x1={padX} y1={y} x2={chartW - padX} y2={y} stroke="var(--border-base)" strokeWidth={1} />
                        <text x={padX - 6} y={y + 3} textAnchor="end" fill="var(--text-muted)" fontSize={9}>{v}</text>
                      </g>
                    )
                  })}
                  {areaPath && <path d={areaPath} fill="url(#formSuiviGrad)" />}
                  <path d={linePath} fill="none" stroke={activeFilterColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  {chartPoints.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r={3.5} fill="var(--bg-base)" stroke={p.score <= 4 ? '#ef4444' : p.score >= 7 ? '#22c55e' : p.color} strokeWidth={2} />
                      {(i === chartPoints.length - 1 || i === 0) && (
                        <text x={p.x} y={p.y - 10} textAnchor="middle" fill="var(--text-secondary)" fontSize={10} fontWeight={600}>{p.score}</text>
                      )}
                    </g>
                  ))}
                  {chartPoints.filter((_, i) => i === 0 || i === chartPoints.length - 1 || i === Math.floor(chartPoints.length / 2)).map((p, i) => (
                    <text key={i} x={p.x} y={chartH - 2} textAnchor="middle" fill="var(--text-muted)" fontSize={9}>
                      {new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </text>
                  ))}
                </svg>
              </div>
            )}

            {/* Moyennes par question */}
            {champMoyennes.length > 0 && (
              <div className="px-6 pb-5 pt-1">
                <p className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-wider mb-3">Moyennes par question</p>
                <div className="space-y-2.5">
                  {champMoyennes.map(ch => {
                    const pct = (ch.moyenne / 10) * 100
                    const color = ch.moyenne >= 7 ? '#22c55e' : ch.moyenne >= 5 ? '#f59e0b' : '#ef4444'
                    return (
                      <div key={ch.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-zinc-400 text-xs truncate flex-1 mr-3">{ch.label}</span>
                          <span className="text-[var(--text-primary)] text-xs font-bold tabular-nums" style={{ color }}>{ch.moyenne}/10</span>
                        </div>
                        <div className="h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Historique complet (8 derniers) */}
            {completed.length > 0 && (
              <div className="border-t border-[var(--border-base)]">
                <div className="px-6 py-3">
                  <p className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-wider mb-2.5">Derniers retours</p>
                  <div className="space-y-1.5">
                    {[...completed].reverse().slice(0, 8).map(r => {
                      const sc = getScore(r)
                      const form = enrichedForms.find(f => f.id === r.formulaire_id)
                      const typeColor = TYPE_COLORS[form?.effectiveType] || '#a855f7'
                      const scoreColor = sc >= 7 ? 'text-emerald-400' : sc >= 5 ? 'text-amber-400' : 'text-red-400'
                      const scoreBg = sc >= 7 ? 'bg-emerald-500/10' : sc >= 5 ? 'bg-amber-500/10' : 'bg-red-500/10'
                      return (
                        <div key={r.id} className="flex items-center gap-3 py-1.5">
                          <span className="text-[var(--text-muted)] text-[11px] font-medium tabular-nums w-14 flex-shrink-0">
                            {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0" style={{ backgroundColor: typeColor + '15', color: typeColor }}>
                            {TYPE_ICONS_MAP[form?.effectiveType] || '📝'} {form?.titre ? (form.titre.length > 18 ? form.titre.slice(0, 18) + '…' : form.titre) : 'Formulaire'}
                          </span>
                          {sc !== null ? (
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${scoreBg} ${scoreColor}`}>{sc}/10</span>
                          ) : (
                            <span className="text-zinc-700 text-[11px]">—</span>
                          )}
                          {(() => {
                            const txtChamp = allFormChamps.find(c => c.type_champ === 'texte' && c.formulaire_id === r.formulaire_id && r.reponses?.[c.id])
                            return txtChamp ? (
                              <span className="text-[var(--text-secondary)] text-[11px] truncate flex-1">{r.reponses[txtChamp.id]}</span>
                            ) : null
                          })()}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* État vide */}
            {allFormReponses.length === 0 && (
              <div className="px-6 pb-6 flex flex-col items-center text-center py-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/5 flex items-center justify-center mb-3">
                  <ClipboardList size={24} className="text-purple-400/30" />
                </div>
                <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">Aucun formulaire rempli</p>
                <p className="text-zinc-700 text-xs max-w-xs">Les bilans, évaluations et retours post-séance de ce client apparaîtront ici.</p>
              </div>
            )}
          </div>
        )
      })()}

      {/* ══════════════════════════════════════════ */}
      {/* SECTION 6 — Historique Pesées              */}
      {/* ══════════════════════════════════════════ */}
      {pesees.length > 0 && (
        <div className="glass-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#FF6B2B] via-[#FF8F5E] to-transparent" />
          <div className="px-6 py-5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center">
              <Clock size={15} className="text-[#FF6B2B]" />
            </div>
            <h3 className="text-[var(--text-primary)] text-[15px] font-bold tracking-tight">Historique des pesées</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-t border-b border-[var(--border-base)]">
                  <th className="text-left px-6 py-3 text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-wider">Poids</th>
                  <th className="text-left px-6 py-3 text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-wider">Évol.</th>
                  <th className="text-left px-6 py-3 text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[...pesees].reverse().slice(0, 10).map((p, i, arr) => {
                  const prev = arr[i + 1]
                  const diff = prev ? (p.poids - prev.poids).toFixed(1) : null
                  return (
                    <tr key={p.id} className="border-b border-[var(--border-base)]/50 hover:bg-[var(--bg-surface)] transition-colors">
                      <td className="px-6 py-3 text-[var(--text-primary)] text-xs font-medium tabular-nums">
                        {new Date(p.date_pesee).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-6 py-3 text-[var(--text-primary)] text-xs font-bold tabular-nums">{p.poids} kg</td>
                      <td className="px-6 py-3">
                        {diff !== null ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-bold tabular-nums ${
                            parseFloat(diff) < 0 ? 'text-emerald-400' : parseFloat(diff) > 0 ? 'text-red-400' : 'text-[var(--text-muted)]'
                          }`}>
                            {parseFloat(diff) < 0 ? <TrendingDown size={10} /> : parseFloat(diff) > 0 ? <TrendingUp size={10} /> : null}
                            {parseFloat(diff) > 0 ? '+' : ''}{diff}
                          </span>
                        ) : <span className="text-zinc-700 text-xs">—</span>}
                      </td>
                      <td className="px-6 py-3 text-[var(--text-muted)] text-xs truncate max-w-[160px]">{p.notes || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal pesée ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-[var(--bg-base)] rounded-2xl border border-[var(--border-base)] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="h-1 bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]" />
            <div className="px-6 pt-5 pb-4 border-b border-[var(--border-base)] flex items-center justify-between">
              <h2 className="text-[var(--text-primary)] text-base font-bold">Nouvelle pesée</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Poids (kg)</label>
                <input type="number" step="0.1" value={newPoids} onChange={e => setNewPoids(e.target.value)}
                  placeholder="75.5" autoFocus
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-lg font-bold text-center placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Date</label>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B]/50 transition-all [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Notes (opt.)</label>
                <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)}
                  placeholder="Après le sport, à jeun..."
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all border border-[var(--border-base)]">
                Annuler
              </button>
              <button onClick={ajouterPesee} disabled={!newPoids || saving}
                className="flex-1 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55a1b] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ══════════════════════════════════════
// NUTRITION TAB — Builder
// ══════════════════════════════════════
const REPAS_TYPES = [
  { id: 'petit_dej', label: 'Petit-déjeuner', icon: Coffee },
  { id: 'dejeuner', label: 'Déjeuner', icon: UtensilsCrossed },
  { id: 'diner', label: 'Dîner', icon: Moon },
  { id: 'collation', label: 'Collation', icon: Cookie },
]

const ALIMENT_CATEGORIES = ['Tous', 'Protéine', 'Féculent', 'Légume', 'Fruit', 'Lipide', 'Laitier', 'Légumineuse', 'Snack']

// ══════════════════════════════════════
// OBJECTIFS TAB — Module Objectifs SMART
// ══════════════════════════════════════
const OBJ_TYPES = [
  { id: 'poids', label: 'Poids', icon: Scale, color: '#FF6B2B' },
  { id: 'mensuration', label: 'Mensuration', icon: Ruler, color: '#3b82f6' },
  { id: 'performance', label: 'Performance', icon: TrendingUp, color: '#22c55e' },
  { id: 'autre', label: 'Autre', icon: Target, color: '#a855f7' },
]

function calcProgress(depart, actuelle, cible) {
  if (depart == null || cible == null) return 0
  const current = actuelle ?? depart
  const totalDelta = cible - depart
  if (totalDelta === 0) return current === cible ? 100 : 0
  const currentDelta = current - depart
  const pct = (currentDelta / totalDelta) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}

function progressColor(pct) {
  if (pct >= 80) return '#22c55e'
  if (pct >= 50) return '#f59e0b'
  if (pct >= 25) return '#FF6B2B'
  return '#ef4444'
}

function joursRestants(dateLimite) {
  if (!dateLimite) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateLimite)
  target.setHours(0, 0, 0, 0)
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
  return diff
}

function ObjectifsTab({ coachId, clientId, clientName, onObjectifsChanged }) {
  const toast = useToast()
  const [objectifs, setObjectifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingValue, setEditingValue] = useState({}) // { [id]: string }
  const [updatingId, setUpdatingId] = useState(null)

  // Form
  const [formTitre, setFormTitre] = useState('')
  const [formType, setFormType] = useState('poids')
  const [formDepart, setFormDepart] = useState('')
  const [formCible, setFormCible] = useState('')
  const [formActuelle, setFormActuelle] = useState('')
  const [formUnite, setFormUnite] = useState('kg')
  const [formDateLimite, setFormDateLimite] = useState('')

  const loadData = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    const { data } = await supabase
      .from('objectifs')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    setObjectifs(data || [])
    setLoading(false)
  }, [clientId])

  useEffect(() => { loadData() }, [loadData])

  // ── Créer un objectif ──
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!formTitre.trim() || !formDepart || !formCible) return
    setSaving(true)

    const payload = {
      client_id: clientId,
      titre: formTitre.trim(),
      type_objectif: formType,
      valeur_depart: parseFloat(formDepart),
      valeur_cible: parseFloat(formCible),
      valeur_actuelle: formActuelle ? parseFloat(formActuelle) : parseFloat(formDepart),
      unite: formUnite.trim() || 'kg',
      date_limite: formDateLimite || null,
      statut: 'en_cours',
    }

    const { data, error } = await supabase.from('objectifs').insert(payload).select().single()
    if (!error && data) {
      setObjectifs(prev => [data, ...prev])
      resetForm()
      setShowModal(false)
      toast.success('Objectif créé !')
      onObjectifsChanged?.()
    } else {
      toast.error('Erreur : ' + (error?.message || 'Échec'))
    }
    setSaving(false)
  }

  const resetForm = () => {
    setFormTitre(''); setFormType('poids'); setFormDepart(''); setFormCible('')
    setFormActuelle(''); setFormUnite('kg'); setFormDateLimite('')
  }

  // ── Mettre à jour la valeur actuelle ──
  const handleUpdateValue = async (obj) => {
    const newVal = parseFloat(editingValue[obj.id])
    if (isNaN(newVal)) return
    setUpdatingId(obj.id)

    const isAtteint = obj.valeur_cible > obj.valeur_depart
      ? newVal >= obj.valeur_cible
      : newVal <= obj.valeur_cible

    const { error } = await supabase.from('objectifs').update({
      valeur_actuelle: newVal,
      statut: isAtteint ? 'atteint' : 'en_cours',
    }).eq('id', obj.id)

    if (!error) {
      setObjectifs(prev => prev.map(o => o.id === obj.id ? {
        ...o,
        valeur_actuelle: newVal,
        statut: isAtteint ? 'atteint' : 'en_cours',
      } : o))
      setEditingValue(prev => { const c = { ...prev }; delete c[obj.id]; return c })
      toast.success(isAtteint ? '🎉 Objectif atteint !' : 'Valeur mise à jour')
      onObjectifsChanged?.()
    }
    setUpdatingId(null)
  }

  // ── Archiver ──
  const handleArchive = async (id) => {
    await supabase.from('objectifs').update({ archive: true }).eq('id', id)
    setObjectifs(prev => prev.filter(o => o.id !== id))
    toast.success('Objectif archivé')
    onObjectifsChanged?.()
  }

  // ── Supprimer ──
  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer définitivement cet objectif ?')) return
    await supabase.from('objectifs').delete().eq('id', id)
    setObjectifs(prev => prev.filter(o => o.id !== id))
    toast.success('Objectif supprimé')
    onObjectifsChanged?.()
  }

  const enCours = objectifs.filter(o => o.statut === 'en_cours')
  const atteints = objectifs.filter(o => o.statut === 'atteint')

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 skel-block rounded-2xl" />
        <div className="h-20 skel-block rounded-2xl" />
        <div className="h-20 skel-block rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Header stats ── */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <div className="glass-card rounded-2xl p-3 md:p-4 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]" />
          <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-medium">En cours</p>
          <p className="text-[#FF6B2B] text-xl md:text-2xl font-bold mt-1">{enCours.length}</p>
        </div>
        <div className="glass-card rounded-2xl p-3 md:p-4 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-emerald-300" />
          <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-medium">Atteints</p>
          <p className="text-emerald-400 text-xl md:text-2xl font-bold mt-1">{atteints.length}</p>
        </div>
        <div className="glass-card rounded-2xl p-3 md:p-4 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--text-muted)] to-[var(--text-primary)]" />
          <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-medium">Progression moy.</p>
          <p className="text-[var(--text-primary)] text-xl md:text-2xl font-bold mt-1">
            {enCours.length > 0
              ? Math.round(enCours.reduce((s, o) => s + calcProgress(o.valeur_depart, o.valeur_actuelle, o.valeur_cible), 0) / enCours.length)
              : 0}%
          </p>
        </div>
      </div>

      {/* ── Action bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center">
            <Target size={15} className="text-[#FF6B2B]" />
          </div>
          <h3 className="text-[var(--text-primary)] text-sm font-bold">
            Objectifs de {clientName || 'ce client'}
          </h3>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B2B] hover:bg-[#e55a1b] text-white text-xs font-semibold transition-all active:scale-95"
        >
          <Plus size={14} /> Nouvel objectif
        </button>
      </div>

      {/* ── Liste objectifs en cours ── */}
      {enCours.length === 0 && atteints.length === 0 ? (
        <div className="glass-card rounded-2xl py-16 text-center">
          <div className="w-14 h-14 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-4">
            <Target size={24} className="text-[#FF6B2B]" />
          </div>
          <p className="text-[var(--text-muted)] text-sm">Aucun objectif défini</p>
          <p className="text-[var(--text-muted)] text-xs mt-1">Cliquez sur "Nouvel objectif" pour commencer</p>
        </div>
      ) : (
        <>
          {/* En cours */}
          {enCours.length > 0 && (
            <div className="space-y-2.5">
              {enCours.map((obj) => {
                const pct = calcProgress(obj.valeur_depart, obj.valeur_actuelle, obj.valeur_cible)
                const color = progressColor(pct)
                const jours = joursRestants(obj.date_limite)
                const typeInfo = OBJ_TYPES.find(t => t.id === obj.type_objectif) || OBJ_TYPES[3]
                const IconComp = typeInfo.icon
                const isLoss = obj.valeur_cible < obj.valeur_depart

                return (
                  <div key={obj.id} className="glass-card rounded-2xl p-5 hover:border-[var(--border-base)]/80 transition-all group relative overflow-hidden" style={{ borderLeft: `3px solid ${typeInfo.color}` }}>

                    {/* Header */}
                    <div className="flex items-start gap-3.5 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${typeInfo.color}15` }}>
                        <IconComp size={18} style={{ color: typeInfo.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[var(--text-primary)] text-sm font-semibold truncate">{obj.titre}</p>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0"
                            style={{ backgroundColor: `${typeInfo.color}15`, color: typeInfo.color }}>
                            {typeInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[var(--text-muted)] text-[10px]">
                            {obj.valeur_depart} → {obj.valeur_cible} {obj.unite}
                          </span>
                          {jours !== null && (
                            <span className={`text-[10px] flex items-center gap-1 ${
                              jours < 0 ? 'text-red-400' : jours <= 7 ? 'text-amber-400' : 'text-[var(--text-muted)]'
                            }`}>
                              <Calendar size={9} />
                              {jours < 0 ? `${Math.abs(jours)}j en retard` : jours === 0 ? "Aujourd'hui" : `${jours}j restants`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions — always visible on mobile */}
                      <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => handleArchive(obj.id)}
                          className="p-2 md:p-1.5 rounded-lg text-[var(--text-muted)] hover:text-amber-400 hover:bg-amber-500/10 transition-all" title="Archiver">
                          <FolderOpen size={14} />
                        </button>
                        <button onClick={() => handleDelete(obj.id)}
                          className="p-2 md:p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all" title="Supprimer">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          {isLoss ? <TrendingDown size={12} style={{ color }} /> : <TrendingUp size={12} style={{ color }} />}
                          <span className="text-xs font-bold" style={{ color }}>
                            {obj.valeur_actuelle ?? obj.valeur_depart} {obj.unite}
                          </span>
                        </div>
                        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                      </div>
                      <div className="h-2.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700 relative"
                          style={{ width: `${pct}%`, backgroundColor: color }}>
                          {pct > 8 && (
                            <div className="absolute inset-0 rounded-full"
                              style={{ background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)` }} />
                          )}
                        </div>
                      </div>
                      {/* Scale markers */}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-[var(--text-muted)]">{obj.valeur_depart} {obj.unite}</span>
                        <span className="text-[9px] text-[var(--text-muted)]">{obj.valeur_cible} {obj.unite}</span>
                      </div>
                    </div>

                    {/* Update value inline */}
                    <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-base)]/40">
                      <span className="text-[var(--text-muted)] text-[10px] shrink-0">Mise à jour :</span>
                      <input
                        type="number"
                        step="0.1"
                        value={editingValue[obj.id] ?? ''}
                        onChange={(e) => setEditingValue(prev => ({ ...prev, [obj.id]: e.target.value }))}
                        placeholder={`${obj.valeur_actuelle ?? obj.valeur_depart}`}
                        className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] text-xs placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors min-w-0"
                      />
                      <span className="text-[var(--text-muted)] text-[10px] shrink-0">{obj.unite}</span>
                      <button
                        onClick={() => handleUpdateValue(obj)}
                        disabled={!editingValue[obj.id] || updatingId === obj.id}
                        className="px-3 py-1.5 rounded-lg bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-bold hover:bg-[#FF6B2B]/20 transition-all disabled:opacity-30 shrink-0 flex items-center gap-1"
                      >
                        {updatingId === obj.id ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                        OK
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Atteints */}
          {atteints.length > 0 && (
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                </div>
                <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-medium">
                  Objectifs atteints ({atteints.length})
                </p>
              </div>
              <div className="space-y-2">
                {atteints.map((obj) => {
                  const typeInfo = OBJ_TYPES.find(t => t.id === obj.type_objectif) || OBJ_TYPES[3]
                  return (
                    <div key={obj.id} className="glass-card rounded-2xl px-5 py-3.5 flex items-center gap-3.5 group" style={{ borderLeft: '3px solid #22c55e' }}>
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-emerald-300/80 text-sm font-semibold truncate">{obj.titre}</p>
                        <p className="text-emerald-400/30 text-[10px] mt-0.5">
                          {obj.valeur_depart} → {obj.valeur_actuelle ?? obj.valeur_cible} {obj.unite} · {typeInfo.label}
                        </p>
                      </div>
                      <span className="text-emerald-400 text-xs font-bold shrink-0">100%</span>
                      <button onClick={() => handleDelete(obj.id)}
                        className="p-2 md:p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all md:opacity-0 md:group-hover:opacity-100 shrink-0" title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════ */}
      {/* MODAL — Créer un objectif SMART   */}
      {/* ══════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="glass-card rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border-base)] flex items-center justify-between relative">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]" />
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center">
                  <Target size={16} className="text-[#FF6B2B]" />
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] text-base font-bold">Nouvel objectif</h3>
                  <p className="text-[var(--text-muted)] text-xs mt-0.5">Définir un objectif SMART pour {clientName}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Titre */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Titre</label>
                <input
                  type="text"
                  value={formTitre}
                  onChange={(e) => setFormTitre(e.target.value)}
                  placeholder="Ex : Perte de masse grasse"
                  required
                  autoFocus
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Type</label>
                <div className="flex flex-wrap gap-2">
                  {OBJ_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormType(t.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        formType === t.id
                          ? 'border text-[var(--text-primary)]'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-base)] hover:text-[var(--text-secondary)]'
                      }`}
                      style={formType === t.id ? { backgroundColor: `${t.color}15`, borderColor: `${t.color}40`, color: t.color } : {}}
                    >
                      <t.icon size={13} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Valeurs : Départ / Cible / Actuelle */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Départ</label>
                  <input
                    type="number" step="0.1" value={formDepart} required
                    onChange={(e) => setFormDepart(e.target.value)}
                    placeholder="90"
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Cible</label>
                  <input
                    type="number" step="0.1" value={formCible} required
                    onChange={(e) => setFormCible(e.target.value)}
                    placeholder="80"
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Actuelle <span className="text-[var(--text-muted)]">(opt.)</span></label>
                  <input
                    type="number" step="0.1" value={formActuelle}
                    onChange={(e) => setFormActuelle(e.target.value)}
                    placeholder={formDepart || '—'}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                  />
                </div>
              </div>

              {/* Unité + Date limite */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Unité</label>
                  <input
                    type="text" value={formUnite}
                    onChange={(e) => setFormUnite(e.target.value)}
                    placeholder="kg, cm, reps..."
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Date limite</label>
                  <input
                    type="date" value={formDateLimite}
                    onChange={(e) => setFormDateLimite(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B]/50 transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Preview */}
              {formDepart && formCible && (
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-base)]/50 rounded-xl p-3">
                  <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-1.5">Aperçu</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[var(--text-muted)]">{formDepart} {formUnite}</span>
                    <span className="text-[var(--text-muted)]">→</span>
                    {parseFloat(formCible) < parseFloat(formDepart)
                      ? <TrendingDown size={12} className="text-[#FF6B2B]" />
                      : <TrendingUp size={12} className="text-emerald-400" />
                    }
                    <span className="text-[var(--text-primary)] font-bold">{formCible} {formUnite}</span>
                    <span className="text-[var(--text-muted)] ml-auto">
                      Δ {Math.abs(parseFloat(formCible) - parseFloat(formDepart)).toFixed(1)} {formUnite}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { resetForm(); setShowModal(false) }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-surface)] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || !formTitre.trim() || !formDepart || !formCible}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#FF6B2B] hover:bg-[#e55a1b] text-white text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />}
                  Créer l'objectif
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════
// ICÔNES HABITUDES — Sélection coach
// ══════════════════════════════════════
const HABIT_ICONS = [
  { id: 'Droplets', icon: Droplets, label: 'Eau' },
  { id: 'Footprints', icon: Footprints, label: 'Marche' },
  { id: 'BookOpen', icon: BookOpen, label: 'Lecture' },
  { id: 'Moon', icon: Moon, label: 'Sommeil' },
  { id: 'Dumbbell', icon: Dumbbell, label: 'Sport' },
  { id: 'Apple', icon: Apple, label: 'Nutrition' },
  { id: 'Heart', icon: Heart, label: 'Bien-être' },
  { id: 'Target', icon: Target, label: 'Focus' },
  { id: 'Flame', icon: Flame, label: 'Énergie' },
  { id: 'Coffee', icon: Coffee, label: 'Routine' },
]

const HABIT_COULEURS = ['#FF6B2B', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6']

function getHabitIcon(iconeName) {
  const found = HABIT_ICONS.find(i => i.id === iconeName)
  return found ? found.icon : Flame
}

function calculerStreak(logsDates) {
  if (!logsDates.length) return 0
  const sorted = [...logsDates].sort((a, b) => b.localeCompare(a))
  let streak = 0
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (let i = 0; ; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    if (sorted.includes(ds)) streak++
    else if (i === 0) continue
    else break
  }
  return streak
}

// ══════════════════════════════════════
// HABITUDES TAB — Gestion des habitudes client
// ══════════════════════════════════════
function HabitudesTab({ coachId, clientId, clientName, onHabitudesChanged }) {
  const toast = useToast()
  const [habitudes, setHabitudes] = useState([])
  const [todayLogs, setTodayLogs] = useState([])
  const [allLogs, setAllLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(null)

  // Form state
  const [formNom, setFormNom] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCouleur, setFormCouleur] = useState('#FF6B2B')
  const [formIcone, setFormIcone] = useState('Droplets')

  const today = new Date().toISOString().split('T')[0]

  const loadData = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    const il30j = new Date()
    il30j.setDate(il30j.getDate() - 29)
    const dateMin = il30j.toISOString().split('T')[0]

    const [habsRes, todayRes, allRes] = await Promise.all([
      supabase.from('habitudes').select('*').eq('client_id', clientId).eq('actif', true).order('created_at'),
      supabase.from('habitudes_log').select('habitude_id').eq('client_id', clientId).eq('date', today),
      supabase.from('habitudes_log').select('habitude_id, date').eq('client_id', clientId).gte('date', dateMin),
    ])

    setHabitudes(habsRes.data || [])
    setTodayLogs((todayRes.data || []).map(l => l.habitude_id))
    setAllLogs(allRes.data || [])
    setLoading(false)
  }, [clientId, today])

  useEffect(() => { loadData() }, [loadData])

  // ── Ajouter une habitude ──
  const handleAdd = async (e) => {
    e.preventDefault()
    if (!formNom.trim()) return
    setSaving(true)

    const { data, error } = await supabase.from('habitudes').insert({
      client_id: clientId,
      nom: formNom.trim(),
      couleur: formCouleur,
      icone: formIcone,
      description: formDescription.trim() || null,
      assigned_by: coachId,
      actif: true,
    }).select().single()

    if (!error && data) {
      setHabitudes(prev => [...prev, data])
      setFormNom('')
      setFormDescription('')
      setFormCouleur('#FF6B2B')
      setFormIcone('Droplets')
      setShowModal(false)
      toast.success('Habitude assignée !')
      onHabitudesChanged?.()
    } else {
      toast.error('Erreur : ' + (error?.message || 'Échec'))
    }
    setSaving(false)
  }

  // ── Désactiver ──
  const handleDeactivate = async (id) => {
    setDeactivating(id)
    const { error } = await supabase.from('habitudes').update({ actif: false }).eq('id', id)
    if (!error) {
      setHabitudes(prev => prev.filter(h => h.id !== id))
      toast.success('Habitude désactivée')
      onHabitudesChanged?.()
    }
    setDeactivating(null)
  }

  // ── Supprimer définitivement ──
  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer définitivement cette habitude et tout son historique ?')) return
    await supabase.from('habitudes_log').delete().eq('habitude_id', id)
    await supabase.from('habitudes').delete().eq('id', id)
    setHabitudes(prev => prev.filter(h => h.id !== id))
    toast.success('Habitude supprimée')
    onHabitudesChanged?.()
  }

  const cochees = habitudes.filter(h => todayLogs.includes(h.id)).length

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 skel-block rounded-2xl" />
        <div className="h-16 skel-block rounded-2xl" />
        <div className="h-16 skel-block rounded-2xl" />
        <div className="h-16 skel-block rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Header stats ── */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <div className="glass-card rounded-2xl p-3 md:p-4 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-amber-300" />
          <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-medium">Actives</p>
          <p className="text-[var(--text-primary)] text-xl md:text-2xl font-bold mt-1">{habitudes.length}</p>
        </div>
        <div className="glass-card rounded-2xl p-3 md:p-4 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-emerald-300" />
          <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-medium">Aujourd'hui</p>
          <p className="text-xl md:text-2xl font-bold mt-1" style={{ color: cochees === habitudes.length && habitudes.length > 0 ? '#22c55e' : '#FF6B2B' }}>
            {cochees}/{habitudes.length}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-3 md:p-4 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]" />
          <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-medium">Meilleur streak</p>
          <p className="text-[#FF6B2B] text-xl md:text-2xl font-bold mt-1 flex items-center justify-center gap-1">
            <Flame size={16} />
            {Math.max(0, ...habitudes.map(h => calculerStreak(allLogs.filter(l => l.habitude_id === h.id).map(l => l.date))))}j
          </p>
        </div>
      </div>

      {/* ── Action bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Flame size={15} className="text-amber-500" />
          </div>
          <h3 className="text-[var(--text-primary)] text-sm font-bold">
            Habitudes de {clientName || 'ce client'}
          </h3>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B2B] hover:bg-[#e55a1b] text-white text-xs font-semibold transition-all active:scale-95"
        >
          <Plus size={14} /> Assigner
        </button>
      </div>

      {/* ── Liste des habitudes ── */}
      {habitudes.length === 0 ? (
        <div className="glass-card rounded-2xl py-16 text-center">
          <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <Flame size={24} className="text-amber-500" />
          </div>
          <p className="text-[var(--text-muted)] text-sm">Aucune habitude assignée</p>
          <p className="text-[var(--text-muted)] text-xs mt-1">Cliquez sur "Assigner" pour créer la premiere habitude</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {habitudes.map((h) => {
            const fait = todayLogs.includes(h.id)
            const logsDates = allLogs.filter(l => l.habitude_id === h.id).map(l => l.date)
            const streak = calculerStreak(logsDates)
            const rate = Math.round((logsDates.length / 30) * 100)
            const IconComp = getHabitIcon(h.icone)

            return (
              <div key={h.id}
                className="glass-card rounded-2xl p-4 hover:border-[var(--border-base)]/80 transition-all group relative overflow-hidden"
                style={{ borderLeft: `3px solid ${h.couleur || '#FF6B2B'}` }}>

                {/* Ligne principale */}
                <div className="flex items-center gap-3.5">
                  {/* Icône + état today */}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${h.couleur || '#FF6B2B'}15` }}>
                      <IconComp size={18} style={{ color: h.couleur || '#FF6B2B' }} />
                    </div>
                    {fait && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                        <CheckCircle2 size={10} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Nom + description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[var(--text-primary)] text-sm font-semibold truncate">{h.nom}</p>
                      {fait && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold shrink-0">
                          Fait
                        </span>
                      )}
                      {!fait && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--text-muted)] font-bold shrink-0">
                          En attente
                        </span>
                      )}
                    </div>
                    {h.description && (
                      <p className="text-[var(--text-muted)] text-xs mt-0.5 truncate">{h.description}</p>
                    )}
                  </div>

                  {/* Streak */}
                  {streak > 0 && (
                    <div className="flex items-center gap-1 shrink-0" style={{ color: h.couleur || '#FF6B2B' }}>
                      <Flame size={13} />
                      <span className="text-xs font-bold">{streak}j</span>
                    </div>
                  )}

                  {/* Taux */}
                  <span className="text-[var(--text-muted)] text-[10px] font-medium shrink-0">{rate}%</span>

                  {/* Actions — always visible on mobile */}
                  <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => handleDeactivate(h.id)}
                      disabled={deactivating === h.id}
                      className="p-2 md:p-1.5 rounded-lg text-[var(--text-muted)] hover:text-amber-400 hover:bg-amber-500/10 transition-all disabled:opacity-30"
                      title="Désactiver"
                    >
                      <Circle size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(h.id)}
                      className="p-2 md:p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Barre de progression 30j */}
                <div className="mt-3 h-1 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${rate}%`, backgroundColor: h.couleur || '#FF6B2B' }}
                  />
                </div>

                {/* Mini heatmap 7 derniers jours */}
                <div className="flex gap-1 mt-2.5 justify-end">
                  {Array.from({ length: 7 }, (_, i) => {
                    const d = new Date()
                    d.setDate(d.getDate() - (6 - i))
                    const ds = d.toISOString().split('T')[0]
                    const done = logsDates.includes(ds)
                    const isToday = ds === today
                    return (
                      <div key={i} className="flex flex-col items-center gap-0.5">
                        <div
                          className={`w-5 h-5 rounded-md transition-all ${
                            done
                              ? ''
                              : isToday
                                ? 'border border-dashed border-white/15'
                                : 'bg-[var(--bg-surface)]'
                          }`}
                          style={done ? { backgroundColor: `${h.couleur || '#FF6B2B'}` } : {}}
                          title={`${['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d.getDay()]} ${d.getDate()}`}
                        />
                        <span className={`text-[8px] ${isToday ? 'text-[var(--text-muted)]' : 'text-[var(--text-muted)]'}`}>
                          {['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getDay()]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ══════════════════════════════ */}
      {/* MODAL — Assigner une habitude */}
      {/* ══════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="glass-card rounded-2xl w-full max-w-md overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border-base)] flex items-center justify-between relative">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-amber-300" />
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Flame size={16} className="text-amber-500" />
                </div>
                <h3 className="text-[var(--text-primary)] text-base font-bold">Nouvelle habitude</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-6 space-y-5">
              {/* Titre */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-medium mb-2">Titre de l'habitude</label>
                <input
                  type="text"
                  value={formNom}
                  onChange={(e) => setFormNom(e.target.value)}
                  placeholder="Ex : Boire 2L d'eau"
                  required
                  autoFocus
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                />
              </div>

              {/* Description (optionnelle) */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-medium mb-2">Description <span className="text-[var(--text-muted)]">(optionnelle)</span></label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex : Au moins 8 verres répartis dans la journée"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                />
              </div>

              {/* Choix d'icône */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-medium mb-2">Icône</label>
                <div className="flex flex-wrap gap-2">
                  {HABIT_ICONS.map((ic) => {
                    const isSelected = formIcone === ic.id
                    return (
                      <button
                        key={ic.id}
                        type="button"
                        onClick={() => setFormIcone(ic.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-[#FF6B2B]/15 text-[#FF6B2B] border border-[#FF6B2B]/30'
                            : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-base)] hover:border-[var(--border-base)]/80 hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        <ic.icon size={14} />
                        {ic.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Choix couleur */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-medium mb-2">Couleur</label>
                <div className="flex gap-2">
                  {HABIT_COULEURS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormCouleur(c)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        formCouleur === c
                          ? 'ring-2 ring-offset-2 ring-offset-[#18181b] ring-white/50 scale-110'
                          : 'hover:scale-105 opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-surface)] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || !formNom.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#FF6B2B] hover:bg-[#e55a1b] text-white text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Assigner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function NutritionTab({ coachId, clientId, clientName }) {
  const toast = useToast()

  // Assigned plan from NutritionBuilder (/coach/nutrition/)
  const [assignedPlan, setAssignedPlan] = useState(null)
  const [assignedRepas, setAssignedRepas] = useState([])
  const [loadingAssigned, setLoadingAssigned] = useState(true)
  const [historyPlans, setHistoryPlans] = useState([])
  const [planDocuments, setPlanDocuments] = useState([])
  const [activating, setActivating] = useState(null)

  // Assign template modal
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [templatePlans, setTemplatePlans] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [assigning, setAssigning] = useState(false)

  // MacroRing is still used for assigned plan display
  const [saving, setSaving] = useState(false)

  // ── Activate a different plan ──
  const activatePlan = async (planId) => {
    setActivating(planId)
    // Deactivate all plans for this client
    await supabase
      .from('client_nutrition_plans')
      .update({ is_active: false })
      .eq('client_id', clientId)
      .eq('coach_id', coachId)

    // Activate the selected one
    await supabase
      .from('client_nutrition_plans')
      .update({ is_active: true })
      .eq('id', planId)

    toast.success('Plan activé !')
    setActivating(null)

    // Reload
    setLoadingAssigned(true)
    const { data: allPlans } = await supabase
      .from('client_nutrition_plans')
      .select('*')
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    const plans = allPlans || []
    const active = plans.find(p => p.is_active) || null

    if (active) {
      setAssignedPlan(active)
      const { data: repasData } = await supabase
        .from('plan_repas')
        .select('id, type, metadata, repas_aliments(id, aliment_id, quantite_g, ordre, aliments(*))')
        .eq('plan_id', active.id)
        .order('ordre')
      setAssignedRepas(repasData || [])
    } else {
      setAssignedPlan(null)
      setAssignedRepas([])
    }
    setHistoryPlans(plans.filter(p => p.id !== active?.id))
    setLoadingAssigned(false)
  }

  // ── Open assign template modal ──
  const openAssignModal = async () => {
    setShowAssignModal(true)
    setLoadingTemplates(true)
    // Load template plans (no client_id = templates)
    const { data } = await supabase
      .from('client_nutrition_plans')
      .select('id, nom, created_at')
      .eq('coach_id', coachId)
      .is('client_id', null)
      .order('created_at', { ascending: false })
    setTemplatePlans(data || [])
    setLoadingTemplates(false)
  }

  // ── Assign a template plan to this client ──
  const assignTemplate = async (templateId) => {
    setAssigning(true)
    try {
      // 1. Get the template plan
      const { data: tpl } = await supabase
        .from('client_nutrition_plans')
        .select('*')
        .eq('id', templateId)
        .single()
      if (!tpl) throw new Error('Plan introuvable')

      // 2. Create a copy for this client
      const { data: newPlan, error: pErr } = await supabase
        .from('client_nutrition_plans')
        .insert({
          coach_id: coachId,
          client_id: clientId,
          nom: tpl.nom,
          objectif: tpl.objectif || null,
          date_plan: new Date().toISOString().split('T')[0],
        })
        .select()
        .single()
      if (pErr) throw pErr

      // 3. Copy repas + aliments
      const { data: repas } = await supabase
        .from('plan_repas')
        .select('*, repas_aliments(*)')
        .eq('plan_id', templateId)
        .order('ordre')

      for (const r of (repas || [])) {
        const { data: newRepas } = await supabase
          .from('plan_repas')
          .insert({ plan_id: newPlan.id, type: r.type, ordre: r.ordre })
          .select()
          .single()
        if (newRepas && r.repas_aliments?.length > 0) {
          const copies = r.repas_aliments.map(ra => ({
            repas_id: newRepas.id,
            aliment_id: ra.aliment_id,
            quantite_g: ra.quantite_g,
            ordre: ra.ordre,
          }))
          await supabase.from('repas_aliments').insert(copies)
        }
      }

      setAssignedPlan(newPlan)
      // Reload repas
      const { data: newRepasData } = await supabase
        .from('plan_repas')
        .select('id, type, repas_aliments(id, aliment_id, quantite_g, ordre, aliments(*))')
        .eq('plan_id', newPlan.id)
        .order('ordre')
      setAssignedRepas(newRepasData || [])

      toast.success(`Plan "${tpl.nom}" assigné à ${clientName} !`)
      setShowAssignModal(false)
    } catch (err) {
      console.error('[NutritionTab] Erreur assignation:', err)
      toast.error('Erreur lors de l\'assignation')
    }
    setAssigning(false)
  }

  // ── Load assigned plan (from NutritionBuilder) ──
  useEffect(() => {
    if (!coachId || !clientId) return
    const loadAssigned = async () => {
      setLoadingAssigned(true)
      // Get ALL plans for this client
      const { data: allPlans, error: planErr } = await supabase
        .from('client_nutrition_plans')
        .select('*')
        .eq('coach_id', coachId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (planErr) console.error('[NutritionTab] Erreur fetch plans:', planErr)

      const plans = allPlans || []

      // Find the active plan (is_active = true only, no fallback)
      const activePlan = plans.find(p => p.is_active) || null
      const otherPlans = plans.filter(p => p.id !== activePlan?.id)

      if (activePlan) {
        setAssignedPlan(activePlan)

        // Load repas for active plan (with metadata + aliments)
        const { data: repasData } = await supabase
          .from('plan_repas')
          .select('id, type, metadata, repas_aliments(id, aliment_id, quantite_g, ordre, aliments(*))')
          .eq('plan_id', activePlan.id)
          .order('ordre')

        setAssignedRepas(repasData || [])

        // Load documents for active plan
        const { data: docsData } = await supabase
          .from('plan_documents')
          .select('*')
          .eq('plan_id', activePlan.id)
          .order('created_at', { ascending: false })
        setPlanDocuments(docsData || [])
      } else {
        setAssignedPlan(null)
        setAssignedRepas([])
        setPlanDocuments([])
      }

      setHistoryPlans(otherPlans)
      setLoadingAssigned(false)
    }
    loadAssigned()
  }, [coachId, clientId])

  // ── Compute assigned plan macros (from aliments OR metadata) ──
  const assignedMacros = (() => {
    let kcal = 0, prot = 0, gluc = 0, lip = 0
    assignedRepas.forEach(r => {
      // Method 1: From metadata macros (NutritionBuilder)
      const meta = r.metadata
      if (meta?.macros) {
        prot += meta.macros.p || 0
        gluc += meta.macros.g || 0
        lip += meta.macros.l || 0
        kcal += (meta.macros.p || 0) * 4 + (meta.macros.g || 0) * 4 + (meta.macros.l || 0) * 9
        return
      }
      // Method 2: From aliments (old daily builder)
      ;(r.repas_aliments || []).forEach(ra => {
        const a = ra.aliments
        if (!a) return
        const ratio = (ra.quantite_g || 0) / 100
        kcal += Math.round((a.kcal_100g || 0) * ratio)
        prot += (a.proteines || 0) * ratio
        gluc += (a.glucides || 0) * ratio
        lip += (a.lipides || 0) * ratio
      })
    })
    return { kcal: Math.round(kcal), prot: Math.round(prot), gluc: Math.round(gluc), lip: Math.round(lip) }
  })()

  // Macro ring SVG helper
  const MacroRing = ({ value, max, color, label, unit, size = 90 }) => {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
    const r = (size - 12) / 2
    const circ = 2 * Math.PI * r
    const offset = circ - (pct / 100) * circ
    return (
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#27272a" strokeWidth="6" />
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
              className="transition-all duration-500" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[var(--text-primary)] text-sm font-bold leading-none">{Math.round(value)}</p>
            <p className="text-[var(--text-muted)] text-[8px]">{unit}</p>
          </div>
        </div>
        <p className="text-[var(--text-muted)] text-[10px] font-medium mt-1.5">{label}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Apple size={15} className="text-emerald-400" />
          </div>
          <h3 className="text-[var(--text-primary)] text-base font-bold">Plan nutritionnel</h3>
        </div>
        <a href="/coach/nutrition" className="text-[11px] text-[#FF6B2B] font-semibold hover:text-[#FF9A6C] transition-colors">
          Gérer les plans →
        </a>
      </div>

      {/* ═══ Plan assigné au client ═══ */}
      {loadingAssigned ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-[#FF6B2B]" size={24} />
        </div>
      ) : !assignedPlan ? (
        <div className="glass-card rounded-2xl p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-emerald-300" />
          <Apple size={36} className="text-[var(--text-muted)] mx-auto mb-3" />
          <h3 className="text-[var(--text-primary)] text-base font-bold mb-1">Aucun plan assigné</h3>
          <p className="text-[var(--text-muted)] text-xs mb-5 max-w-xs mx-auto">
            Créez un plan nutritionnel et assignez-le à {clientName} pour le voir ici
          </p>
          <div className="flex items-center justify-center gap-3">
            <a href={`/coach/nutrition/new?clientId=${clientId}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-xs font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-lg shadow-[#FF6B2B]/20">
              <Plus size={13} /> Créer un plan
            </a>
            <button onClick={openAssignModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs font-semibold hover:text-white hover:bg-[var(--bg-surface)]/80 transition-all border border-[var(--border-base)]">
              <Layers size={13} /> Assigner un modèle
            </button>
          </div>
        </div>
        ) : (
          <div className="space-y-4">
            {/* Plan header */}
            <div className="glass-card rounded-2xl p-4 md:p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-emerald-300" />
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[var(--text-primary)] text-base font-bold">{assignedPlan.nom || 'Plan nutritionnel'}</h3>
                  <p className="text-[var(--text-muted)] text-[11px] mt-0.5">
                    {assignedPlan.objectif || `Plan assigné à ${clientName}`}
                  </p>
                </div>
                <a href={`/coach/nutrition/${assignedPlan.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B2B]/10 text-[#FF6B2B] text-[11px] font-bold hover:bg-[#FF6B2B]/20 transition-all">
                  <Pencil size={11} /> Modifier
                </a>
              </div>

              {/* Macro summary rings */}
              <div className="flex items-center justify-around flex-wrap gap-3 md:gap-0">
                <MacroRing value={assignedMacros.kcal} max={2500} color="#FF6B2B" label="Calories" unit="kcal" size={80} />
                <MacroRing value={assignedMacros.prot} max={150} color="#3b82f6" label="Protéines" unit="g" size={65} />
                <MacroRing value={assignedMacros.gluc} max={250} color="#f59e0b" label="Glucides" unit="g" size={65} />
                <MacroRing value={assignedMacros.lip} max={80} color="#ef4444" label="Lipides" unit="g" size={65} />
              </div>
            </div>

            {/* Repas du plan */}
            {assignedRepas.length === 0 ? (
              <div className="glass-card rounded-2xl p-6 text-center">
                <p className="text-[var(--text-muted)] text-xs">Ce plan ne contient pas encore de repas détaillés</p>
              </div>
            ) : (
              assignedRepas.map((repas, ri) => {
                const typeLabel = REPAS_TYPES.find(r => r.id === repas.type)?.label || repas.type
                const TypeIcon = REPAS_TYPES.find(r => r.id === repas.type)?.icon || Apple
                const items = repas.repas_aliments || []
                let repasKcal = 0
                items.forEach(ra => { if (ra.aliments) repasKcal += Math.round((ra.aliments.kcal_100g || 0) * (ra.quantite_g || 0) / 100) })

                return (
                  <div key={repas.id || ri} className="glass-card rounded-2xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-[var(--border-base)] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <TypeIcon size={15} className="text-[#FF6B2B]" />
                        <h4 className="text-[var(--text-primary)] text-sm font-bold">{typeLabel}</h4>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-bold">
                        {repasKcal} kcal
                      </span>
                    </div>
                    {items.length === 0 ? (
                      <div className="px-5 py-4 text-center">
                        <p className="text-[var(--text-muted)] text-xs italic">Aucun aliment</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#27272a]/30">
                        {items.sort((a, b) => (a.ordre || 0) - (b.ordre || 0)).map((ra, ai) => {
                          const a = ra.aliments
                          if (!a) return null
                          const ratio = (ra.quantite_g || 0) / 100
                          return (
                            <div key={ai} className="px-5 py-3 flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg ${FoodIconBg(a.categorie)} flex items-center justify-center shrink-0`}>
                                <FoodIcon categorie={a.categorie} size={14} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[var(--text-primary)] text-xs font-medium truncate">{a.nom}</p>
                                <p className="text-[var(--text-muted)] text-[10px]">{ra.quantite_g}g</p>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] shrink-0">
                                <span className="text-[#FF6B2B] font-bold">{Math.round((a.kcal_100g || 0) * ratio)}</span>
                                <span className="text-blue-400">P{Math.round((a.proteines || 0) * ratio)}</span>
                                <span className="text-amber-400">G{Math.round((a.glucides || 0) * ratio)}</span>
                                <span className="text-rose-400">L{Math.round((a.lipides || 0) * ratio)}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )
      }

      {/* ── Documents du plan ── */}
      {planDocuments.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border-base)]">
            <h3 className="text-[var(--text-primary)] text-sm font-bold flex items-center gap-2">
              <Paperclip size={14} className="text-emerald-400" />
              Documents joints
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-bold">{planDocuments.length}</span>
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {planDocuments.map(doc => (
              <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-base)]/50 hover:border-[#FF6B2B]/20 transition-all group cursor-pointer">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  doc.type === 'pdf' ? 'bg-red-500/10' : doc.type === 'image' ? 'bg-blue-500/10' : 'bg-[#FF6B2B]/10'
                }`}>
                  <FileText size={16} className={
                    doc.type === 'pdf' ? 'text-red-400' : doc.type === 'image' ? 'text-blue-400' : 'text-[#FF6B2B]'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-sm font-medium truncate">{doc.nom}</p>
                  <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
                    {doc.type?.toUpperCase()} • {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <ExternalLink size={14} className="text-[var(--text-muted)] group-hover:text-[#FF6B2B] transition-all shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Historique des plans ── */}
      {historyPlans.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border-base)]">
            <h3 className="text-[var(--text-primary)] text-sm font-bold">Historique des plans</h3>
            <p className="text-[var(--text-muted)] text-[10px] mt-0.5">{historyPlans.length} plan{historyPlans.length > 1 ? 's' : ''} précédent{historyPlans.length > 1 ? 's' : ''}</p>
          </div>
          <div className="divide-y divide-[#27272a]/30">
            {historyPlans.map(plan => (
              <div key={plan.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-[var(--bg-surface)] transition-colors">
                <div className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center shrink-0">
                  <Apple size={15} className="text-[var(--text-muted)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-xs font-semibold truncate">{plan.nom || 'Plan sans titre'}</p>
                  <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
                    {plan.created_at ? new Date(plan.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={`/coach/nutrition/${plan.id}`}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                    Modifier
                  </a>
                  <button onClick={() => activatePlan(plan.id)} disabled={activating === plan.id}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-[#FF6B2B]/10 text-[#FF6B2B] hover:bg-[#FF6B2B]/20 transition-colors disabled:opacity-50">
                    {activating === plan.id ? <Loader2 size={10} className="animate-spin" /> : 'Activer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modale : Assigner un modèle ── */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[var(--bg-card)] rounded-2xl border border-[var(--border-base)] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="h-1 bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]" />
            <div className="px-6 pt-5 pb-4 border-b border-[var(--border-base)] flex items-center justify-between">
              <h2 className="text-[var(--text-primary)] text-lg font-bold">Assigner un modèle</h2>
              <button onClick={() => setShowAssignModal(false)} className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto space-y-2">
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-[#FF6B2B]" />
                </div>
              ) : templatePlans.length === 0 ? (
                <div className="text-center py-8">
                  <Apple size={28} className="text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-[var(--text-muted)] text-xs mb-3">Aucun modèle disponible</p>
                  <a href="/coach/nutrition/new"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B2B]/10 text-[#FF6B2B] text-[11px] font-semibold hover:bg-[#FF6B2B]/20 transition-colors">
                    <Plus size={12} /> Créer un modèle
                  </a>
                </div>
              ) : (
                templatePlans.map(tpl => (
                  <button key={tpl.id} onClick={() => assignTemplate(tpl.id)} disabled={assigning}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border-base)] hover:border-[#FF6B2B]/30 transition-all text-left disabled:opacity-50">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Apple size={16} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--text-primary)] text-sm font-semibold truncate">{tpl.nom || 'Plan sans titre'}</p>
                      <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
                        Créé le {new Date(tpl.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-[var(--text-muted)] shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ══════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════
export default function CoachClientHub() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { canAddClient, maxClients } = usePlanLimits()

  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [editingSeanceId, setEditingSeanceId] = useState(null)
  const [openProgramme, setOpenProgramme] = useState(null) // programme object to open in Sport tab

  // Stats du client sélectionné
  const [habitudes, setHabitudes] = useState([])
  const [habitudeLogs, setHabitudeLogs] = useState([]) // today's completed habit IDs
  const [objectifs, setObjectifs] = useState([])
  const [score, setScore] = useState(0)
  const [planCalories, setPlanCalories] = useState(null) // from nutrition plan
  const [weekSeances, setWeekSeances] = useState({ total: 0, done: 0, spark: [0,0,0,0,0,0,0] }) // seances cette semaine

  // Données 7 jours pour sparklines et KPIs
  const [sommeil7j, setSommeil7j] = useState([])   // [{date, heures, qualite}]
  const [humeur7j, setHumeur7j] = useState([])     // [{date, score}]
  const [habLogs7j, setHabLogs7j] = useState([])   // [{date, count}]
  const [poids7j, setPoids7j] = useState([])        // [{date, poids}]
  const [progSeances, setProgSeances] = useState({ total: 0, done: 0 }) // programme en cours

  // Invitation modal
  const [modalInvit, setModalInvit] = useState(false)
  const [invitEmail, setInvitEmail] = useState('')
  const [invitPrenom, setInvitPrenom] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [invitSuccess, setInvitSuccess] = useState(null)
  const [invitError, setInvitError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  // ── Charger la liste des clients ──
  const chargerClients = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [clientsRes, paiementsRes] = await Promise.all([
      supabase
        .from('clients')
        .select('id, created_at, actif, profiles(nom, prenom, email, avatar_url)')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('paiements_clients')
        .select('client_id, statut, offres_coaching(titre, frequence, prix)')
        .eq('coach_id', user.id)
        .eq('statut', 'paye')
        .order('date_paiement', { ascending: false }),
    ])
    const data = clientsRes.data
    const paiements = paiementsRes.data ?? []

    const cl = (data || []).map((c, i) => ({
      ...c,
      couleurAvatar: AVATAR_COLORS[i % AVATAR_COLORS.length],
      dernierPaiement: paiements.find(p => p.client_id === c.id) ?? null,
    }))
    setClients(cl)
    // Auto-select first client only on desktop (md+)
    if (cl.length > 0 && !selectedId && window.innerWidth >= 768) {
      setSelectedId(cl[0].id)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { chargerClients() }, [chargerClients])

  // ── Charger le profil détaillé du client sélectionné ──
  useEffect(() => {
    if (!selectedId) return
    const load = async () => {
      setLoadingProfile(true)

      const [profileRes, clientRes, habsRes, objsRes, logsRes, sommeilRes, humeurRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', selectedId).single(),
        supabase.from('clients').select('actif, created_at').eq('id', selectedId).single(),
        supabase.from('habitudes').select('id, nom, couleur, icone, description').eq('client_id', selectedId).eq('actif', true),
        supabase.from('objectifs').select('*').eq('client_id', selectedId).order('created_at', { ascending: false }),
        supabase.from('habitudes_log').select('habitude_id').eq('client_id', selectedId).eq('date', today),
        supabase.from('sommeil_log').select('*').eq('client_id', selectedId).eq('date', today).maybeSingle(),
        supabase.from('humeur_log').select('*').eq('client_id', selectedId).eq('date', today).maybeSingle(),
      ])

      setSelectedProfile(profileRes.data)
      setSelectedClient(clientRes.data)

      const habs = habsRes.data || []
      const logsData = logsRes.data || []
      const cochees = logsData.length
      setHabitudes(habs)
      setHabitudeLogs(logsData.map(l => l.habitude_id))
      setObjectifs(objsRes.data || [])

      const s = calculerScoreBienEtre({
        habitudes: { cochees, total: habs.length },
        sommeil: sommeilRes.data,
        humeur: humeurRes.data,
        sport: null,
      })
      setScore(s)

      // Fetch nutrition plan calories
      const { data: nutPlans } = await supabase
        .from('client_nutrition_plans')
        .select('id, is_active')
        .eq('coach_id', user.id)
        .eq('client_id', selectedId)
        .eq('is_active', true)
        .limit(1)

      if (nutPlans && nutPlans.length > 0) {
        const { data: repasData } = await supabase
          .from('plan_repas')
          .select('metadata, repas_aliments(quantite_g, aliments(kcal_100g))')
          .eq('plan_id', nutPlans[0].id)

        let totalKcal = 0
        ;(repasData || []).forEach(r => {
          // From metadata macros
          if (r.metadata?.macros) {
            const m = r.metadata.macros
            totalKcal += (m.p || 0) * 4 + (m.g || 0) * 4 + (m.l || 0) * 9
            return
          }
          // From aliments
          ;(r.repas_aliments || []).forEach(ra => {
            if (ra.aliments) totalKcal += Math.round((ra.aliments.kcal_100g || 0) * (ra.quantite_g || 0) / 100)
          })
        })
        setPlanCalories(totalKcal > 0 ? Math.round(totalKcal) : null)
      } else {
        setPlanCalories(null)
      }

      // Fetch seances de la semaine en cours
      const now = new Date()
      const dayOfWeek = now.getDay() // 0=dimanche
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(now)
      monday.setDate(now.getDate() + mondayOffset)
      monday.setHours(0, 0, 0, 0)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)
      const mondayStr = monday.toISOString().split('T')[0]
      const sundayStr = sunday.toISOString().split('T')[0]

      const { data: weekData, error: weekErr } = await supabase
        .from('seances')
        .select('id, date_prevue, is_completed')
        .eq('client_id', selectedId)
        .eq('is_template', false)
        .not('client_id', 'is', null)
        .gte('date_prevue', mondayStr)
        .lte('date_prevue', sundayStr)

      if (weekErr) console.error('[Hub/Sidebar] Erreur fetch séances semaine:', weekErr.message)
      const seancesWeek = weekData || []
      const doneCount = seancesWeek.filter(s => s.is_completed).length

      // Sparkline : nombre de séances par jour (lun→dim)
      const sparkByDay = [0, 0, 0, 0, 0, 0, 0]
      seancesWeek.forEach(s => {
        const d = new Date(s.date_prevue)
        const idx = (d.getDay() + 6) % 7 // 0=lundi, 6=dimanche
        sparkByDay[idx]++
      })

      setWeekSeances({ total: seancesWeek.length, done: doneCount, spark: sparkByDay })

      // ── 7 jours de données pour sparklines & KPIs ──
      const il7j = new Date()
      il7j.setDate(il7j.getDate() - 6)
      const date7jStr = il7j.toISOString().split('T')[0]

      const [sommeil7Res, humeur7Res, habLogs7Res, poids7Res] = await Promise.all([
        supabase.from('sommeil_log').select('date, heures, qualite').eq('client_id', selectedId).gte('date', date7jStr).order('date'),
        supabase.from('humeur_log').select('date, score').eq('client_id', selectedId).gte('date', date7jStr).order('date'),
        supabase.from('habitudes_log').select('date, habitude_id').eq('client_id', selectedId).gte('date', date7jStr),
        supabase.from('suivi_poids').select('date_pesee, poids').eq('client_id', selectedId).gte('date_pesee', date7jStr).order('date_pesee'),
      ])

      if (sommeil7Res.error) console.error('[Hub/7j] Erreur sommeil:', sommeil7Res.error.message)
      if (humeur7Res.error) console.error('[Hub/7j] Erreur humeur:', humeur7Res.error.message)
      if (habLogs7Res.error) console.error('[Hub/7j] Erreur hab_logs:', habLogs7Res.error.message)
      if (poids7Res.error) console.error('[Hub/7j] Erreur poids:', poids7Res.error.message)

      setSommeil7j(sommeil7Res.data || [])
      setHumeur7j(humeur7Res.data || [])
      setPoids7j(poids7Res.data || [])

      // Agréger les logs habitudes par jour
      const habByDay = {}
      ;(habLogs7Res.data || []).forEach(l => {
        habByDay[l.date] = (habByDay[l.date] || 0) + 1
      })
      setHabLogs7j(Object.entries(habByDay).map(([date, count]) => ({ date, count })))

      // ── Programme en cours : progression séances ──
      const { data: assignations, error: progErr } = await supabase
        .from('programme_assignations')
        .select('id, programmes(id, titre)')
        .eq('coach_id', user.id)
        .eq('statut', 'actif')

      if (progErr) console.error('[Hub/Programme] Erreur fetch assignations:', progErr.message)

      const activeAssign = (assignations || []).find(a => a.programmes)
      if (activeAssign?.programmes?.id) {
        const marker = `programme:${activeAssign.programmes.id}`
        const { data: progSeancesData, error: psErr } = await supabase
          .from('seances')
          .select('id, is_completed')
          .eq('client_id', selectedId)
          .eq('is_template', false)
          .not('client_id', 'is', null)
          .or(`notes.eq.${marker},coach_id.eq.${user.id}`)

        // Fallback : toutes les séances non-template du client pour ce coach
        if (psErr) console.error('[Hub/Programme] Erreur fetch séances programme:', psErr.message)
        const allProgSeances = progSeancesData || []
        setProgSeances({ total: allProgSeances.length, done: allProgSeances.filter(s => s.is_completed).length })
      } else {
        setProgSeances({ total: 0, done: 0 })
      }

      setLoadingProfile(false)
    }
    load()
  }, [selectedId, today, user?.id])

  // ── Rafraîchir uniquement les habitudes (appelé par HabitudesTab après modif) ──
  const refreshHabitudes = useCallback(async () => {
    if (!selectedId) return
    const [habsRes, logsRes] = await Promise.all([
      supabase.from('habitudes').select('id, nom, couleur, icone, description').eq('client_id', selectedId).eq('actif', true),
      supabase.from('habitudes_log').select('habitude_id').eq('client_id', selectedId).eq('date', today),
    ])
    const habs = habsRes.data || []
    const logsData = logsRes.data || []
    setHabitudes(habs)
    setHabitudeLogs(logsData.map(l => l.habitude_id))

    // Recalculer le score bien-être
    const s = calculerScoreBienEtre({
      habitudes: { cochees: logsData.length, total: habs.length },
      sommeil: null,
      humeur: null,
      sport: null,
    })
    setScore(s)
  }, [selectedId, today])

  // ── Rafraîchir les objectifs (appelé par ObjectifsTab après modif) ──
  const refreshObjectifs = useCallback(async () => {
    if (!selectedId) return
    const { data } = await supabase
      .from('objectifs')
      .select('*')
      .eq('client_id', selectedId)
      .order('created_at', { ascending: false })
    setObjectifs(data || [])
  }, [selectedId])

  // ── Invitation (DB + email via Edge Function) ──
  const envoyerInvitation = async (e) => {
    e.preventDefault()
    setEnvoi(true)
    setInvitError('')

    const result = await sendInvitation({
      coachId: user.id,
      email: invitEmail.trim(),
      prenom: invitPrenom.trim(),
    })

    if (!result.success) {
      setInvitError(result.error)
      setEnvoi(false)
      return
    }

    setInvitSuccess({ email: invitEmail, lien: result.lien, prenom: invitPrenom })
    setInvitEmail('')
    setInvitPrenom('')

    if (result.emailSent) {
      toast.success(`Email d'invitation envoyé à ${invitEmail} !`)
    } else if (result.emailError) {
      toast.info(result.emailError)
    }

    setEnvoi(false)
  }

  // ── Helpers ──
  const clientsFiltres = clients.filter(c => {
    const q = recherche.toLowerCase()
    return (
      c.profiles?.nom?.toLowerCase().includes(q) ||
      c.profiles?.prenom?.toLowerCase().includes(q) ||
      c.profiles?.email?.toLowerCase().includes(q)
    )
  })

  const p = selectedProfile
  const fullName = p ? [p.prenom, p.nom].filter(Boolean).join(' ') || p.email : ''
  const initials = fullName ? fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'

  // IMC
  const imc = (p?.poids_actuel || p?.poids_depart) && p?.taille
    ? ((p.poids_actuel || p.poids_depart) / ((p.taille / 100) ** 2)).toFixed(1)
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-[#FF6B2B]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-3.5rem)] overflow-hidden bg-[var(--bg-base)]">

      {/* ══════════════════════════════════════ */}
      {/* SIDEBAR — Liste des clients           */}
      {/* ══════════════════════════════════════ */}
      <div className={`${selectedId ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-shrink-0 bg-[var(--bg-elevated)] border-r border-[var(--border-base)] flex-col overflow-hidden`}>

        {/* Header */}
        <div className="p-5 border-b border-[var(--border-base)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[var(--text-primary)] font-bold text-base tracking-tight">Clients</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                {clients.length}
              </span>
            </div>
            {canAddClient ? (
              <button
                onClick={() => { setModalInvit(true); setInvitSuccess(null); setInvitError('') }}
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] text-white flex items-center justify-center hover:shadow-lg hover:shadow-[#FF6B2B]/20 transition-all active:scale-95"
              >
                <UserPlus size={14} />
              </button>
            ) : (
              <button
                onClick={() => navigate('/pricing')}
                className="w-8 h-8 rounded-xl bg-[var(--bg-surface)] text-[var(--text-muted)] flex items-center justify-center hover:text-[#FF6B2B] transition-colors"
                title={`Limite de ${maxClients} clients atteinte`}
              >
                <Lock size={14} />
              </button>
            )}
          </div>
          <div className="relative group">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher..."
              className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 focus:shadow-[0_0_0_3px_rgba(255,107,43,0.08)] transition-all"
            />
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto py-2">
          {clientsFiltres.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-3">
                <User size={20} className="text-[var(--text-muted)]" />
              </div>
              <p className="text-[var(--text-muted)] text-xs">Aucun client</p>
            </div>
          ) : (
            clientsFiltres.map((c) => {
              const isSelected = selectedId === c.id
              const name = [c.profiles?.prenom, c.profiles?.nom].filter(Boolean).join(' ') || c.profiles?.email || '?'
              const ini = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

              return (
                <button
                  key={c.id}
                  onClick={() => { setSelectedId(c.id); setActiveTab('overview'); setEditingSeanceId(null); setOpenProgramme(null) }}
                  className={`w-full flex items-center gap-3.5 px-5 py-3.5 text-left transition-all relative ${
                    isSelected
                      ? 'bg-[var(--bg-base)]'
                      : 'hover:bg-[var(--bg-base)]/50'
                  }`}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full bg-gradient-to-b from-[#FF6B2B] to-[#FF8F5E]" />
                  )}

                  {/* Avatar */}
                  {c.profiles?.avatar_url ? (
                    <div className={`relative flex-shrink-0 ${isSelected ? 'ring-2 ring-[#FF6B2B]/30' : ''} rounded-xl`}>
                      <img src={c.profiles.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                    </div>
                  ) : (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold text-white transition-all ${isSelected ? 'ring-2 ring-[#FF6B2B]/30 shadow-lg' : ''}`}
                      style={{ background: `linear-gradient(135deg, ${c.couleurAvatar}, ${c.couleurAvatar}cc)` }}>
                      {ini}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {name}
                    </p>
                    {c.dernierPaiement ? (
                      <p className="text-emerald-500 text-[10px] font-medium truncate mt-0.5">
                        {c.dernierPaiement.offres_coaching?.titre || 'Offre'}{c.dernierPaiement.offres_coaching?.prix ? ` · ${(c.dernierPaiement.offres_coaching.prix / 100).toFixed(0)}€` : ''}
                      </p>
                    ) : (
                      <p className="text-[var(--text-muted)] text-[10px] truncate mt-0.5">{c.actif ? c.profiles?.email : 'Non abonné'}</p>
                    )}
                  </div>

                  {/* Pastille statut */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${c.actif ? 'bg-emerald-500' : 'bg-[var(--text-muted)]/40'}`} />
                    {c.actif && <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-30" />}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* ZONE PRINCIPALE — Dashboard client    */}
      {/* ══════════════════════════════════════ */}
      <div className={`${selectedId ? 'flex' : 'hidden md:flex'} flex-1 overflow-y-auto bg-[var(--bg-base)] flex-col`}>
        {!selectedId || loadingProfile ? (
          <div className="flex items-center justify-center h-full">
            {loadingProfile ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-white" />
                </div>
                <p className="text-[var(--text-muted)] text-xs">Chargement...</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-4">
                  <User size={28} className="text-[var(--text-muted)]" />
                </div>
                <p className="text-[var(--text-secondary)] text-sm font-medium">Selectionnez un client</p>
                <p className="text-[var(--text-muted)] text-xs mt-1">pour afficher son tableau de bord</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 md:p-6 space-y-5">

            {/* ── Bouton retour mobile ── */}
            <button
              onClick={() => setSelectedId(null)}
              className="md:hidden inline-flex items-center gap-2 text-[var(--text-muted)] text-sm font-medium hover:text-[var(--text-primary)] transition-colors -mb-1"
            >
              <ChevronLeft size={16} /> Retour
            </button>

            {/* ── En-tete client — glass-card hero ── */}
            <div className="glass-card p-5 md:p-6">
              {/* Accent bar */}
              <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-[#FF6B2B] to-transparent opacity-40" />

              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Avatar with glow */}
                  <div className="relative">
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-14 h-14 md:w-16 md:h-16 rounded-2xl object-cover ring-2 ring-[var(--border-base)]" />
                    ) : (
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center ring-2 ring-[#FF6B2B]/20"
                        style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8F5E)' }}>
                        <span className="text-white text-lg md:text-xl font-bold">{initials}</span>
                      </div>
                    )}
                    {/* Status dot */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[var(--bg-card)] ${selectedClient?.actif ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  </div>
                  <div>
                    <h2 className="text-[var(--text-primary)] text-xl md:text-2xl font-bold tracking-tight">{fullName}</h2>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        selectedClient?.actif
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {selectedClient?.actif ? 'Actif' : 'Inactif'}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                        color: couleurScore(score),
                        backgroundColor: `${couleurScore(score)}15`
                      }}>
                        {score}/100
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p?.telephone ? (
                    <a
                      href={`tel:${p.telephone}`}
                      title={`Appeler ${p.telephone}`}
                      className="w-9 h-9 rounded-xl bg-[var(--bg-base)] border border-[var(--border-base)] flex items-center justify-center text-[var(--text-muted)] hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all"
                    >
                      <Phone size={15} />
                    </a>
                  ) : (
                    <button
                      title="Aucun numero renseigne"
                      className="w-9 h-9 rounded-xl bg-[var(--bg-base)] border border-[var(--border-base)] flex items-center justify-center text-[var(--text-muted)] opacity-30 cursor-not-allowed"
                      disabled
                    >
                      <Phone size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/coach/messages?client=${selectedId}`)}
                    title="Envoyer un message"
                    className="w-9 h-9 rounded-xl bg-[var(--bg-base)] border border-[var(--border-base)] flex items-center justify-center text-[var(--text-muted)] hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30 hover:bg-[#FF6B2B]/5 transition-all"
                  >
                    <MessageCircle size={15} />
                  </button>
                  <button
                    onClick={() => setActiveTab('infos')}
                    title="Informations client"
                    className="w-9 h-9 rounded-xl bg-[var(--bg-base)] border border-[var(--border-base)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all"
                  >
                    <Settings size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Tabs — premium pill navigation ── */}
            <div className="relative">
              <div className="bg-[var(--bg-card)] border border-[var(--border-base)] rounded-2xl px-2 py-1.5 flex gap-0.5 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', overflow: 'auto' }}>
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id
                  const TabIcon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); if (tab.id !== 'sport') setOpenProgramme(null) }}
                      className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium whitespace-nowrap rounded-xl transition-all flex-shrink-0 ${
                        isActive
                          ? 'bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white shadow-md shadow-[#FF6B2B]/15'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-base)]'
                      }`}
                    >
                      <TabIcon size={13} />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
              {/* Fade hint right */}
              <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-[var(--bg-card)] to-transparent rounded-r-2xl" />
            </div>

            {/* ── Contenu "Vue d'ensemble" ── */}
            {activeTab === 'overview' && (
              <div className="space-y-5">

                {/* ── Données de suivi — 6 cartes avec sparklines ── */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  {(() => {
                    // ── Sparklines dynamiques ──
                    const poidsSparkRaw = poids7j.map(p => p.poids)
                    const poidsSpark = poidsSparkRaw.length >= 2 ? poidsSparkRaw : [1, 1]

                    // Sommeil : heures par jour sur 7j
                    const sommeilSparkRaw = sommeil7j.map(s => s.heures || 0)
                    const sommeilSpark = sommeilSparkRaw.length >= 2 ? sommeilSparkRaw : [0, 0]
                    const sommeilMoy = sommeil7j.length > 0
                      ? (sommeil7j.reduce((s, v) => s + (v.heures || 0), 0) / sommeil7j.length).toFixed(1)
                      : null

                    // Humeur : score par jour sur 7j
                    const humeurSparkRaw = humeur7j.map(h => h.score || 0)
                    const humeurSpark = humeurSparkRaw.length >= 2 ? humeurSparkRaw : [0, 0]
                    const humeurMoy = humeur7j.length > 0
                      ? (humeur7j.reduce((s, v) => s + (v.score || 0), 0) / humeur7j.length).toFixed(1)
                      : null

                    // Habitudes : ratio complété par jour
                    const habSpark = habLogs7j.length >= 2
                      ? habLogs7j.map(h => h.count)
                      : habitudes.length > 0 ? [habitudeLogs.length] : [0, 0]

                    return [
                      { icon: Scale, label: 'Poids', value: (() => { const po = objectifs.find(o => o.type_objectif === 'poids' && o.statut === 'en_cours'); return po ? `${po.valeur_actuelle ?? po.valeur_depart} kg` : (p?.poids_actuel || p?.poids_depart) ? `${p.poids_actuel || p.poids_depart} kg` : '—' })(), spark: poidsSpark, color: '#FF6B2B' },
                      { icon: Moon, label: 'Sommeil', value: sommeilMoy ? `${sommeilMoy}h` : 'N/A', sub: sommeil7j.length > 0 ? `moy. 7j (${sommeil7j.length} entrée${sommeil7j.length > 1 ? 's' : ''})` : 'Aucune donnée', spark: sommeilSpark, color: '#8b5cf6' },
                      { icon: Smile, label: 'Humeur', value: humeurMoy ? `${humeurMoy}/10` : 'N/A', sub: humeur7j.length > 0 ? `moy. 7j (${humeur7j.length} entrée${humeur7j.length > 1 ? 's' : ''})` : 'Aucune donnée', spark: humeurSpark, color: '#f59e0b' },
                      { icon: Flame, label: 'Habitudes', value: habitudes.length > 0 ? `${habitudeLogs.length}/${habitudes.length}` : 'N/A', sub: habitudes.length > 0 ? "aujourd'hui" : 'Aucune assignée', spark: habSpark.length >= 2 ? habSpark : [0, 0], color: '#22c55e', onClick: () => setActiveTab('habitudes') },
                      { icon: Dumbbell, label: 'Séances', value: weekSeances.total > 0 ? `${weekSeances.total}` : '—', sub: weekSeances.total > 0 ? `${weekSeances.done} faite${weekSeances.done > 1 ? 's' : ''} sur ${weekSeances.total}` : 'cette sem.', spark: weekSeances.spark.some(v => v > 0) ? weekSeances.spark : [0, 0], color: '#3b82f6', onClick: () => setActiveTab('sport') },
                      { icon: Target, label: 'Objectifs', value: `${objectifs.filter(o => o.statut === 'en_cours').length}`, sub: 'en cours', spark: [objectifs.filter(o => o.statut === 'en_cours').length], color: '#a855f7', onClick: () => setActiveTab('objectifs') },
                    ]
                  })().map((card, ci) => (
                    <div key={ci} onClick={card.onClick || undefined}
                      className={`glass-card p-4 flex flex-col justify-between min-h-[120px] transition-all group ${card.onClick ? 'cursor-pointer hover:border-[var(--border-strong)] active:scale-[0.98]' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-wider">{card.label}</p>
                          <p className="text-[var(--text-primary)] text-lg font-bold mt-1">{card.value}</p>
                          {card.sub && <p className="text-[var(--text-muted)] text-[10px] mt-0.5">{card.sub}</p>}
                        </div>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                          style={{ backgroundColor: `${card.color}12` }}>
                          <card.icon size={15} style={{ color: card.color }} />
                        </div>
                      </div>
                      {/* Mini sparkline */}
                      <svg viewBox="0 0 100 24" className="w-full h-5 mt-2" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id={`spark-${ci}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={card.color} stopOpacity="0.2" />
                            <stop offset="100%" stopColor={card.color} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {(() => {
                          const d = card.spark
                          // Guard: pas assez de points → ligne plate
                          if (!d || d.length < 2) {
                            return <path d="M0,12 L100,12" fill="none" stroke={card.color} strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
                          }
                          const numD = d.map(v => (typeof v === 'number' && isFinite(v)) ? v : 0)
                          const rawMin = Math.min(...numD)
                          const rawMax = Math.max(...numD)
                          const range = rawMax - rawMin
                          // Guard: toutes les valeurs identiques → ligne plate centrée
                          if (range === 0) {
                            return <path d="M0,12 L100,12" fill="none" stroke={card.color} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
                          }
                          const min = rawMin - 0.5
                          const max = rawMax + 0.5
                          const pts = numD.map((v, i) => `${(i / (numD.length - 1)) * 100},${24 - ((v - min) / (max - min)) * 20}`)
                          const lineD = `M${pts.join(' L')}`
                          const areaD = `${lineD} L100,24 L0,24 Z`
                          return (
                            <>
                              <path d={areaD} fill={`url(#spark-${ci})`} />
                              <path d={lineD} fill="none" stroke={card.color} strokeWidth="1.5" strokeLinecap="round" />
                            </>
                          )
                        })()}
                      </svg>
                    </div>
                  ))}
                </div>

                {/* ── Row: Poids + Objectifs ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                  {/* Carte Poids — Dynamique depuis objectifs */}
                  {(() => {
                    const poidsObj = objectifs.find(o => o.type_objectif === 'poids' && o.statut === 'en_cours')
                    const depart = poidsObj?.valeur_depart ?? p?.poids_depart
                    const cible = poidsObj?.valeur_cible ?? p?.poids_cible
                    const actuel = poidsObj?.valeur_actuelle ?? p?.poids_actuel ?? depart
                    const unite = poidsObj?.unite || 'kg'
                    const pct = (depart && cible) ? calcProgress(depart, actuel, cible) : 0
                    const color = progressColor(pct)
                    const jours = poidsObj ? joursRestants(poidsObj.date_limite) : null
                    const delta = (depart && actuel) ? Math.abs(actuel - depart).toFixed(1) : null
                    const isLoss = cible < depart

                    return (
                      <div className="glass-card p-5">
                        {/* Accent bar */}
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#FF6B2B] via-[#FF8F5E] to-transparent" />
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="text-[var(--text-primary)] text-sm font-bold flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center">
                              <Scale size={13} className="text-[#FF6B2B]" />
                            </div>
                            Poids
                          </h3>
                          <div className="flex items-center gap-3">
                            {jours !== null && (
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                                jours < 0 ? 'bg-red-500/10 text-red-400' : jours <= 14 ? 'bg-amber-500/10 text-amber-400' : 'bg-white/5 text-[var(--text-muted)]'
                              }`}>
                                {jours < 0 ? `${Math.abs(jours)}j retard` : jours === 0 ? "Auj." : `${jours}j restants`}
                              </span>
                            )}
                            <button onClick={() => setActiveTab('objectifs')} className="text-[10px] text-[#FF6B2B] font-semibold hover:text-[#FF9A6C] transition-colors">
                              {poidsObj ? 'Modifier →' : 'Définir →'}
                            </button>
                          </div>
                        </div>

                        {/* Depart - Actuel - Cible */}
                        <div className="bg-[var(--bg-base)] rounded-xl p-4 flex items-center border border-[var(--border-subtle)]">
                          <div className="flex-1 text-center">
                            <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-1">Départ</p>
                            <p className="text-[var(--text-primary)] text-2xl font-bold">{depart || '—'}<span className="text-sm text-[var(--text-muted)] ml-1">{unite}</span></p>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 px-2 shrink-0">
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-[1.5px] bg-[var(--bg-surface)]" />
                              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                                {isLoss ? <TrendingDown size={11} style={{ color }} /> : <TrendingUp size={11} style={{ color }} />}
                              </div>
                              <div className="w-4 h-[1.5px] bg-[var(--bg-surface)]" />
                            </div>
                            {delta && delta !== '0.0' && (
                              <span className="text-[9px] font-bold" style={{ color }}>
                                {isLoss ? '-' : '+'}{delta}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 text-center">
                            <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-1">Cible</p>
                            <p className="text-2xl font-bold" style={{ color: '#FF6B2B' }}>{cible || '—'}<span className="text-sm opacity-40 ml-1">{unite}</span></p>
                          </div>
                        </div>

                        {/* Barre de progression */}
                        {depart && cible ? (
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[var(--text-muted)] text-[10px]">Progression</span>
                              <span className="text-[10px] font-bold" style={{ color }}>{pct}%</span>
                            </div>
                            <div className="h-2.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700 relative"
                                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }}>
                                {pct > 8 && (
                                  <div className="absolute inset-0 rounded-full"
                                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15) 50%, transparent)' }} />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <p className="text-[var(--text-muted)] text-[10px]">
                                Actuel : <span className="text-[var(--text-primary)] font-semibold">{actuel} {unite}</span>
                              </p>
                              {depart && cible && (
                                <p className="text-[var(--text-muted)] text-[9px]">
                                  Reste {Math.abs(actuel - cible).toFixed(1)} {unite}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 text-center py-2">
                            <p className="text-[var(--text-muted)] text-xs">Aucun objectif poids défini</p>
                            <button onClick={() => setActiveTab('objectifs')} className="text-[#FF6B2B] text-xs font-medium mt-1 hover:underline">
                              + Créer un objectif poids
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Carte Autres Objectifs (hors poids, déjà affiché à gauche) */}
                  {(() => {
                    const autresEnCours = objectifs.filter(o => o.statut === 'en_cours' && o.type_objectif !== 'poids')
                    const atteints = objectifs.filter(o => o.statut === 'atteint')
                    const totalEnCours = objectifs.filter(o => o.statut === 'en_cours').length

                    return (
                  <div className="glass-card p-5">
                    {/* Accent bar */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#a855f7] via-[#c084fc] to-transparent" />
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[var(--text-primary)] text-sm font-bold flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <Target size={13} className="text-purple-400" />
                        </div>
                        Objectifs
                      </h3>
                      <div className="flex items-center gap-2">
                        {totalEnCours > 0 && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-bold">
                            {totalEnCours} en cours
                          </span>
                        )}
                        <button
                          onClick={() => setActiveTab('objectifs')}
                          className="text-[var(--text-muted)] hover:text-purple-400 transition-colors"
                          title="Gerer les objectifs"
                        >
                          <Settings size={13} />
                        </button>
                      </div>
                    </div>
                    {autresEnCours.length > 0 ? (
                      <div className="space-y-3.5">
                        {autresEnCours.slice(0, 4).map((o) => {
                          const pct = calcProgress(o.valeur_depart, o.valeur_actuelle, o.valeur_cible)
                          const color = progressColor(pct)
                          const jours = joursRestants(o.date_limite)
                          const isLoss = o.valeur_cible < o.valeur_depart
                          return (
                            <div key={o.id}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  {isLoss
                                    ? <TrendingDown size={11} style={{ color }} className="shrink-0" />
                                    : <TrendingUp size={11} style={{ color }} className="shrink-0" />
                                  }
                                  <p className="text-[var(--text-primary)] text-xs font-medium truncate">{o.titre}</p>
                                </div>
                                <span className="text-xs font-bold ml-2 shrink-0" style={{ color }}>{pct}%</span>
                              </div>
                              <div className="h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700 relative"
                                  style={{ width: `${pct}%`, backgroundColor: color }}>
                                  {pct > 8 && (
                                    <div className="absolute inset-0 rounded-full"
                                      style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15) 50%, transparent)' }} />
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[var(--text-muted)] text-[9px]">
                                  {o.valeur_actuelle ?? o.valeur_depart} / {o.valeur_cible} {o.unite}
                                </span>
                                {jours !== null && (
                                  <span className={`text-[9px] ${jours < 0 ? 'text-red-400' : jours <= 7 ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
                                    {jours < 0 ? `${Math.abs(jours)}j retard` : jours === 0 ? "Auj." : `${jours}j`}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        {atteints.length > 0 && (
                          <p className="text-emerald-400/50 text-[10px] text-center pt-1 flex items-center justify-center gap-1">
                            <CheckCircle2 size={10} /> {atteints.length} objectif{atteints.length > 1 ? 's' : ''} atteint{atteints.length > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    ) : atteints.length > 0 ? (
                      <div className="text-center py-4">
                        <p className="text-emerald-400 text-sm font-bold flex items-center justify-center gap-1.5"><CheckCircle2 size={15} /> Tous les objectifs atteints</p>
                        <p className="text-emerald-400/30 text-xs mt-1">{atteints.length} objectif{atteints.length > 1 ? 's' : ''}</p>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-[var(--text-muted)] text-xs">Aucun objectif défini</p>
                        <button
                          onClick={() => setActiveTab('objectifs')}
                          className="text-[#FF6B2B] text-xs font-medium mt-2 hover:underline"
                        >
                          + Créer un objectif
                        </button>
                      </div>
                    )}
                  </div>
                    )
                  })()}
                </div>

                {/* ── Row: Nutrition + Habitudes ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                  {/* Carte Nutrition recap */}
                  <div className="glass-card p-5">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 via-emerald-400 to-transparent" />
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[var(--text-primary)] text-sm font-bold flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Apple size={13} className="text-emerald-400" />
                        </div>
                        Nutrition
                      </h3>
                      <button onClick={() => setActiveTab('nutrition')} className="text-[10px] text-[#FF6B2B] font-semibold hover:text-[#FF9A6C] transition-colors">
                        Ouvrir le plan →
                      </button>
                    </div>
                    <div className="flex items-center gap-5">
                      {/* Donut SVG */}
                      <div className="relative w-20 h-20 shrink-0">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#27272a" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray={`${(p?.proteines_cibles || 30) * 0.94} 100`} strokeLinecap="round" />
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray={`${(p?.glucides_cibles || 40) * 0.94} 100`} strokeDashoffset={`-${(p?.proteines_cibles || 30) * 0.94}`} strokeLinecap="round" />
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray={`${(p?.lipides_cibles || 30) * 0.94} 100`} strokeDashoffset={`-${((p?.proteines_cibles || 30) + (p?.glucides_cibles || 40)) * 0.94}`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-[var(--text-primary)] text-sm font-bold">{planCalories || p?.calories_cibles || '—'}</p>
                            <p className="text-[var(--text-muted)] text-[8px]">kcal</p>
                          </div>
                        </div>
                      </div>
                      {/* Macros */}
                      <div className="flex-1 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-[var(--text-muted)] text-xs">Protéines</span>
                          </div>
                          <span className="text-[var(--text-primary)] text-xs font-semibold">{p?.proteines_cibles || 30}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-[var(--text-muted)] text-xs">Glucides</span>
                          </div>
                          <span className="text-[var(--text-primary)] text-xs font-semibold">{p?.glucides_cibles || 40}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-[var(--text-muted)] text-xs">Lipides</span>
                          </div>
                          <span className="text-[var(--text-primary)] text-xs font-semibold">{p?.lipides_cibles || 30}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Carte Habitudes du jour */}
                  <div className="glass-card p-5">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-amber-500 via-amber-400 to-transparent" />
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[var(--text-primary)] text-sm font-bold flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Flame size={13} className="text-amber-400" />
                        </div>
                        Habitudes du jour
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          habitudes.length > 0 && habitudeLogs.length === habitudes.length
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-[#FF6B2B]/10 text-[#FF6B2B]'
                        }`}>
                          {habitudeLogs.length}/{habitudes.length}
                        </span>
                        <button
                          onClick={() => setActiveTab('habitudes')}
                          className="text-[var(--text-muted)] hover:text-[#FF6B2B] transition-colors"
                          title="Gérer les habitudes"
                        >
                          <Settings size={13} />
                        </button>
                      </div>
                    </div>
                    {habitudes.length === 0 ? (
                      <div className="text-center py-5">
                        <p className="text-[var(--text-muted)] text-xs">Aucune habitude assignée</p>
                        <button
                          onClick={() => setActiveTab('habitudes')}
                          className="text-[#FF6B2B] text-xs font-medium mt-2 hover:underline"
                        >
                          + Assigner une habitude
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {habitudes.map((h) => {
                          const fait = habitudeLogs.includes(h.id)
                          const IconComp = getHabitIcon(h.icone)
                          return (
                            <div key={h.id} className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all ${
                              fait ? 'bg-emerald-500/[0.06]' : 'bg-[var(--bg-elevated)]'
                            }`}>
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${h.couleur || '#FF6B2B'}15` }}>
                                <IconComp size={13} style={{ color: h.couleur || '#FF6B2B' }} />
                              </div>
                              <span className={`text-xs font-medium flex-1 truncate ${
                                fait ? 'text-emerald-400 line-through' : 'text-[var(--text-primary)]'
                              }`}>
                                {h.nom}
                              </span>
                              {fait ? (
                                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                              ) : (
                                <Circle size={15} className="text-[var(--text-muted)] shrink-0" />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Programmes assignés ── */}
                <ClientProgrammesSection
                  clientId={selectedId}
                  coachId={user?.id}
                  onOpenProgramme={(prog) => {
                    setOpenProgramme(prog)
                    setActiveTab('sport')
                  }}
                />

                {/* ── Prochaines séances ── */}
                <ClientSeancesSection clientId={selectedId} onOpenCalendar={() => setActiveTab('calendar')} />
              </div>
            )}

            {/* ── Onglet Calendrier — Vue hebdomadaire ── */}
            {activeTab === 'calendar' && (
              <CalendarTab
                clientId={selectedId}
                clientName={fullName}
                coachId={user?.id}
                onEditSeance={(seanceId) => { setEditingSeanceId(seanceId); setActiveTab('sport') }}
              />
            )}

            {/* ── Onglet Sport — Éditeur de séances ou ProgramBuilder ── */}
            {activeTab === 'sport' && (
              openProgramme ? (
                <ProgramBuilder
                  programme={openProgramme}
                  onBack={() => { setOpenProgramme(null); setActiveTab('overview') }}
                />
              ) : (
                <SportTab
                  clientName={fullName}
                  coachId={user?.id}
                  clientId={selectedId}
                  editingSeanceId={editingSeanceId}
                  onSeanceSaved={() => {}}
                  onClearEditing={() => setEditingSeanceId(null)}
                />
              )
            )}

            {activeTab === 'nutrition' && (
              <NutritionTab
                coachId={user?.id}
                clientId={selectedId}
                clientName={(() => {
                  const c = clients.find(c => c.profiles?.id === selectedId)
                  return c?.profiles?.nom || 'Client'
                })()}
              />
            )}

            {activeTab === 'infos' && (
              <InfosTab coachId={user?.id} clientId={selectedId} />
            )}

            {activeTab === 'suivi' && (
              <SuiviTab coachId={user?.id} clientId={selectedId} />
            )}

            {activeTab === 'habitudes' && (
              <HabitudesTab
                coachId={user?.id}
                clientId={selectedId}
                clientName={(() => {
                  const c = clients.find(c => c.id === selectedId)
                  return c?.profiles?.prenom || c?.profiles?.nom || 'ce client'
                })()}
                onHabitudesChanged={refreshHabitudes}
              />
            )}

            {activeTab === 'objectifs' && (
              <ObjectifsTab
                coachId={user?.id}
                clientId={selectedId}
                clientName={(() => {
                  const c = clients.find(c => c.id === selectedId)
                  return c?.profiles?.prenom || c?.profiles?.nom || 'ce client'
                })()}
                onObjectifsChanged={refreshObjectifs}
              />
            )}

            {/* Placeholder pour les autres onglets */}
            {activeTab !== 'overview' && activeTab !== 'sport' && activeTab !== 'calendar' && activeTab !== 'nutrition' && activeTab !== 'infos' && activeTab !== 'suivi' && activeTab !== 'habitudes' && activeTab !== 'objectifs' && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-4">
                    <BarChart3 size={24} className="text-[var(--text-muted)]" />
                  </div>
                  <p className="text-[var(--text-secondary)] text-sm font-medium">
                    {TABS.find(t => t.id === activeTab)?.label}
                  </p>
                  <p className="text-[var(--text-muted)] text-xs mt-1">
                    Bientot disponible
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════ */}
      {/* MODAL INVITATION                      */}
      {/* ══════════════════════════════════════ */}
      <Modal isOpen={modalInvit} onClose={() => setModalInvit(false)} title="Inviter un client">
        {!invitSuccess ? (
          <form onSubmit={envoyerInvitation} className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Prénom du client</label>
              <input type="text" value={invitPrenom} onChange={(e) => setInvitPrenom(e.target.value)}
                placeholder="Lucas" autoFocus
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B] transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Email</label>
              <input type="email" value={invitEmail} onChange={(e) => setInvitEmail(e.target.value)}
                placeholder="lucas@exemple.com" required
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B] transition-colors" />
            </div>
            {invitError && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{invitError}</p>
            )}
            <p className="text-[var(--text-muted)] text-xs">Un lien d'invitation valable 7 jours sera généré.</p>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setModalInvit(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={envoi}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40">
                {envoi ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                Générer le lien
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <p className="text-green-400 text-sm font-medium flex items-center gap-1.5"><CheckCircle2 size={14} /> Invitation creee</p>
              <p className="text-[var(--text-muted)] text-xs mt-1">Envoyez ce lien à {invitSuccess.prenom || invitSuccess.email} :</p>
            </div>
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3">
              <p className="text-[#FF6B2B] text-xs font-mono break-all">{invitSuccess.lien}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(invitSuccess.lien); toast.success('Lien copie !') }}
              className="w-full py-2.5 rounded-xl text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] transition-colors">
              Copier le lien
            </button>
            <button onClick={() => { setModalInvit(false); setInvitSuccess(null) }}
              className="w-full py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors">
              Fermer
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
