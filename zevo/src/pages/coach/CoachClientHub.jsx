import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import { Modal } from '../../components/ui/Modal'
import { calculerScoreBienEtre, couleurScore } from '../../utils/wellbeing'
import {
  Search, MessageCircle, Settings, UserPlus, Mail,
  Target, Apple, Scale, Activity, Dumbbell,
  Calendar, Eye, Share2, ChevronRight, Loader2,
  User, Heart, Flame, BarChart3, Clock,
  Plus, X, Save, Trash2, Filter, Info, GripVertical,
  PlayCircle, ChevronLeft, Star, Video, Sparkles,
  Copy, CalendarPlus, Layers, PanelRightOpen, PanelRightClose,
  Pencil, ExternalLink, Coffee, UtensilsCrossed, Moon, Cookie, Minus,
  Wheat, Beef, Fish, Egg, Carrot, Grape, Droplets, TrendingUp, TrendingDown,
  Ruler, Weight, ChevronUp, ChevronDown as ChevronDownIcon,
  FolderOpen
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
        accent ? 'bg-[#FF6B2B]/10' : 'bg-[#27272a]'
      }`}>
        <Icon size={15} className={accent ? 'text-[#FF6B2B]' : 'text-white/30'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/30 text-[11px]">{label}</p>
        <p className="text-[#F5F5F3] text-sm font-semibold">{value || '—'}</p>
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

function ClientProgrammesSection({ clientId, coachId }) {
  const [sportProgrammes, setSportProgrammes] = useState([])
  const [nutritionPlans, setNutritionPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId || !coachId) return
    setLoading(true)

    const loadAll = async () => {
      // Sport programmes
      const { data: sportData } = await supabase
        .from('programme_assignations')
        .select('id, date_debut, statut, phase_actuelle, programmes(id, titre, duree_semaines, categorie)')
        .eq('coach_id', coachId)
      setSportProgrammes((sportData || []).filter(a => a.programmes))

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

  if (loading) return <div className="space-y-3"><div className="h-24 bg-[#1E1E1E] rounded-2xl animate-pulse" /><div className="h-24 bg-[#1E1E1E] rounded-2xl animate-pulse" /></div>

  return (
    <div className="space-y-4">

      {/* ═══ Section Entraînement Sportif ═══ */}
      <div className="bg-[#1E1E1E] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center">
              <Dumbbell size={17} className="text-[#FF6B2B]" />
            </div>
            <div>
              <h3 className="text-[#F5F5F3] text-base font-bold">Entraînement Sportif</h3>
              <p className="text-white/25 text-[11px]">Programmes sport multi-semaines</p>
            </div>
          </div>
          <a href="/coach/sport"
            className="text-[11px] text-[#FF6B2B] font-semibold hover:text-[#FF9A6C] transition-colors">
            Gérer →
          </a>
        </div>

        <div className="px-6 pb-5">
          {sportProgrammes.length === 0 ? (
            <div className="bg-[#0D0D0D] rounded-xl p-5 text-center">
              <Dumbbell size={22} className="text-white/8 mx-auto mb-2" />
              <p className="text-white/20 text-xs">Aucun programme sportif assigné</p>
              <a href="/coach/sport"
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl bg-[#FF6B2B]/10 text-[#FF6B2B] text-[11px] font-semibold hover:bg-[#FF6B2B]/20 transition-colors">
                <Plus size={12} /> Assigner un programme
              </a>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sportProgrammes.map(a => (
                <div key={a.id} className="bg-[#0D0D0D] rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center shrink-0">
                    <Dumbbell size={18} className="text-[#FF6B2B]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#F5F5F3] text-sm font-semibold truncate">{a.programmes?.titre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#2A2A2A] text-white/35 font-medium">{a.programmes?.duree_semaines} sem.</span>
                      {a.programmes?.categorie && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-medium">{a.programmes.categorie}</span>
                      )}
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">Phase {a.phase_actuelle}</span>
                    </div>
                  </div>
                  <a href="/coach/sport"
                    className="px-3 py-2 rounded-xl bg-[#2A2A2A] text-white/50 text-[11px] font-medium hover:bg-[#3f3f46] hover:text-white transition-all flex items-center gap-1.5 shrink-0">
                    Ouvrir <ChevronRight size={12} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Section Plan Nutritionnel ═══ */}
      <div className="bg-[#1E1E1E] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Apple size={17} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-[#F5F5F3] text-base font-bold">Plan Nutritionnel</h3>
              <p className="text-white/25 text-[11px]">Plans de repas et macros</p>
            </div>
          </div>
          <a href="/coach/nutrition"
            className="text-[11px] text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">
            Gérer →
          </a>
        </div>

        <div className="px-6 pb-5">
          {nutritionPlans.length === 0 ? (
            <div className="bg-[#0D0D0D] rounded-xl p-5 text-center">
              <Apple size={22} className="text-white/8 mx-auto mb-2" />
              <p className="text-white/20 text-xs">Aucun plan nutritionnel créé</p>
              <a href={`/coach/nutrition/new?clientId=${clientId}`}
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold hover:bg-emerald-500/20 transition-colors">
                <Plus size={12} /> Créer un plan
              </a>
            </div>
          ) : (
            <div className="space-y-2.5">
              {nutritionPlans.map(plan => (
                <a key={plan.id} href={`/coach/nutrition/${plan.id}`}
                  className="bg-[#0D0D0D] rounded-xl p-4 flex items-center gap-4 hover:bg-[#0D0D0D]/80 transition-all block">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Apple size={18} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#F5F5F3] text-sm font-semibold truncate">{plan.nom || 'Plan du jour'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#2A2A2A] text-white/35 font-medium">
                        {new Date(plan.date_plan).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">Actif</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-white/15 shrink-0" />
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
      .select('id, titre, date_prevue')
      .eq('client_id', clientId)
      .eq('is_template', false)
      .gte('date_prevue', today)
      .order('date_prevue', { ascending: true })
      .limit(5)
      .then(({ data }) => {
        setSeances(data ?? [])
        setLoading(false)
      })
  }, [clientId])

  if (loading) return <div className="h-24 bg-[#1E1E1E] rounded-2xl animate-pulse" />

  return (
    <div className="bg-[#1E1E1E] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Dumbbell size={17} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-[#F5F5F3] text-base font-bold">Prochaines séances</h3>
            <p className="text-white/25 text-[11px]">Entraînements individuels planifiés</p>
          </div>
        </div>
        <button onClick={onOpenCalendar}
          className="text-[11px] text-[#FF6B2B] font-semibold hover:text-[#FF9A6C] transition-colors">
          Calendrier →
        </button>
      </div>

      <div className="px-6 pb-5">
        {seances.length === 0 ? (
          <div className="bg-[#0D0D0D] rounded-xl p-6 text-center">
            <Dumbbell size={24} className="text-white/8 mx-auto mb-2" />
            <p className="text-white/20 text-xs">Aucune séance planifiée</p>
          </div>
        ) : (
          <div className="space-y-2">
            {seances.map(s => (
              <div key={s.id} className="flex items-center gap-3.5 px-4 py-3 rounded-xl bg-[#0D0D0D]">
                <div className="w-10 text-center shrink-0">
                  <p className="text-[#FF6B2B] text-sm font-bold leading-none">
                    {new Date(s.date_prevue + 'T00:00:00').getDate()}
                  </p>
                  <p className="text-white/20 text-[9px] uppercase">
                    {new Date(s.date_prevue + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })}
                  </p>
                </div>
                <div className="w-[2px] h-8 bg-[#FF6B2B]/20 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[#F5F5F3] text-sm font-medium truncate">{s.titre}</p>
                  <p className="text-white/20 text-[10px]">
                    {new Date(s.date_prevue + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long' })}
                  </p>
                </div>
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
          .select('id, exercice_id, series, reps, poids, repos, ordre, exercices(*)')
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
    setSeanceExercices(prev => [...prev, { ...ex, series: 3, repetitions: 12, poids: '', repos: 60 }])
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
      <div className="w-1/3 flex-shrink-0 bg-[#18181b] border border-[#27272a] rounded-xl flex flex-col overflow-hidden">

        {/* Header bibliothèque */}
        <div className="p-4 border-b border-[#27272a] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[#F5F5F3] text-sm font-semibold flex items-center gap-2">
              <Dumbbell size={14} className="text-[#FF6B2B]" />
              Bibliothèque
              <span className="text-white/15 text-[10px] font-normal ml-1">{exosFiltres.length}</span>
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
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/15" />
            <input
              value={searchExo}
              onChange={(e) => setSearchExo(e.target.value)}
              placeholder="Nom, muscle ou équipement..."
              className="w-full bg-[#09090b] border border-[#27272a] rounded-lg pl-8 pr-3 py-2 text-xs text-[#F5F5F3] placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
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
                    : 'bg-[#27272a]/50 text-white/25 hover:text-white/40 border border-transparent'
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
                    : 'bg-[#27272a]/50 text-white/20 hover:text-white/40'
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
              <Dumbbell size={24} className="text-white/10 mx-auto mb-2" />
              <p className="text-white/15 text-xs">Aucun exercice trouvé</p>
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
                  className="bg-[#27272a]/30 rounded-lg p-2.5 group hover:bg-[#27272a]/60 transition-colors"
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
                          className="text-[#F5F5F3] text-xs font-medium hover:text-[#FF6B2B] transition-colors text-left truncate"
                        >
                          {ex.nom}
                        </button>
                        {isPerso && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#FF6B2B]/10 text-[#FF6B2B] font-bold flex-shrink-0">PERSO</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-white/15 text-[9px] bg-[#09090b] px-1.5 py-0.5 rounded">{ex.equipment || '—'}</span>
                        {ex.category && ex.category !== 'Musculation' && (
                          <span className="text-[8px] text-white/15">{ex.category}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions : Favori + Ajouter */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => toggleFavori(ex.id)}
                        className={`p-1 rounded transition-all ${
                          isFav ? 'text-yellow-400' : 'text-white/10 opacity-0 group-hover:opacity-100 hover:text-yellow-400'
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
      <div className="flex-1 flex flex-col ml-4 bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">

        {/* Bandeau mode édition */}
        {currentSeanceId && (
          <div className="px-4 py-2 bg-[#FF6B2B]/5 border-b border-[#FF6B2B]/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pencil size={12} className="text-[#FF6B2B]" />
              <span className="text-[#FF6B2B] text-[10px] font-semibold uppercase tracking-wider">Mode édition</span>
              <span className="text-white/20 text-[10px]">— Séance liée au calendrier</span>
            </div>
            <button
              onClick={() => { setCurrentSeanceId(null); setSeanceNom(`Séance de ${clientName || 'remise en forme'}`); setSeanceExercices([]); if (onClearEditing) onClearEditing() }}
              className="text-white/25 text-[10px] hover:text-white/50 transition-colors flex items-center gap-1"
            >
              <Plus size={10} /> Nouvelle séance
            </button>
          </div>
        )}

        {/* Header éditeur */}
        <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${currentSeanceId ? 'bg-[#FF6B2B]/15' : 'bg-[#FF6B2B]/10'}`}>
              {currentSeanceId ? <Pencil size={15} className="text-[#FF6B2B]" /> : <Calendar size={15} className="text-[#FF6B2B]" />}
            </div>
            {loadingSeance ? (
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-[#FF6B2B]" />
                <span className="text-white/20 text-sm">Chargement...</span>
              </div>
            ) : (
              <input
                value={seanceNom}
                onChange={(e) => setSeanceNom(e.target.value)}
                className="bg-transparent border-none text-[#F5F5F3] text-sm font-semibold focus:outline-none flex-1 min-w-0 placeholder:text-white/20"
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
              <div className="w-20 h-20 rounded-2xl bg-[#27272a]/40 flex items-center justify-center mb-4">
                <Plus size={28} className="text-white/10" />
              </div>
              <p className="text-white/20 text-sm font-medium mb-1">Aucun exercice ajouté</p>
              <p className="text-white/10 text-xs max-w-[250px] text-center">
                Cliquez sur <span className="text-[#FF6B2B]">+</span> dans la bibliothèque pour composer votre séance
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {seanceExercices.map((ex, index) => {
                const couleur = GROUP_COLORS[ex.muscle_group] || '#6b7280'
                return (
                  <div key={ex.id} className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 group hover:border-[#FF6B2B]/20 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <GripVertical size={14} className="text-white/10" />
                        <span className="w-6 h-6 rounded-md bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${couleur}15` }}>
                          <Dumbbell size={14} style={{ color: couleur }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[#F5F5F3] text-sm font-medium truncate">{ex.nom}</p>
                          <p className="text-white/15 text-[10px]">{ex.equipment || ex.equipement || '—'}</p>
                        </div>
                      </div>
                      <button onClick={() => supprimerExercice(ex.id)}
                        className="p-1.5 rounded-lg text-white/10 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { key: 'series', label: 'Séries', val: ex.series },
                        { key: 'repetitions', label: 'Répétitions', val: ex.repetitions },
                        { key: 'poids', label: 'Poids (kg)', val: ex.poids, placeholder: '—' },
                        { key: 'repos', label: 'Repos (s)', val: ex.repos },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-white/20 text-[10px] uppercase tracking-wider mb-1.5">{f.label}</label>
                          <input type="number" value={f.val}
                            onChange={(e) => modifierExercice(ex.id, f.key, f.key === 'poids' ? e.target.value : (parseInt(e.target.value) || 0))}
                            placeholder={f.placeholder}
                            className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-[#F5F5F3] text-sm text-center font-medium placeholder:text-white/10 focus:outline-none focus:border-[#FF6B2B]/40 transition-colors" />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              <div className="flex items-center justify-between py-3 px-4 bg-[#27272a]/30 rounded-lg mt-2">
                <span className="text-white/20 text-xs">
                  {seanceExercices.length} exercice{seanceExercices.length > 1 ? 's' : ''} · {seanceExercices.reduce((a, e) => a + (e.series || 0), 0)} séries au total
                </span>
                <span className="text-white/10 text-[10px]">
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
      <div className={`fixed top-0 right-0 z-50 h-full w-[400px] max-w-[90vw] bg-[#09090b] border-l border-[#27272a] flex flex-col transition-transform duration-300 ease-out ${drawerExercice ? 'translate-x-0' : 'translate-x-full'}`}>
        {drawerExercice && (() => {
          const couleur = GROUP_COLORS[drawerExercice.muscle_group] || '#6b7280'
          const muscles = drawerExercice.muscles || []
          const isFav = favorisIds.has(drawerExercice.id)
          return (
            <>
              <div className="px-5 py-4 border-b border-[#27272a] flex items-center justify-between">
                <h3 className="text-[#F5F5F3] font-semibold text-base">Détails de l'exercice</h3>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => toggleFavori(drawerExercice.id)}
                    className={`p-1.5 rounded-lg transition-colors ${isFav ? 'text-yellow-400' : 'text-white/20 hover:text-yellow-400'}`}>
                    <Star size={16} className={isFav ? 'fill-yellow-400' : ''} />
                  </button>
                  <button onClick={() => setDrawerExercice(null)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors">
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
                      <p className="text-white/15 text-xs">Démonstration</p>
                    </div>
                  </div>
                )}

                {/* Nom + meta */}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-[#F5F5F3] text-xl font-bold">{drawerExercice.nom}</h4>
                    {drawerExercice.coach_id === null && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">ZEVO</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-white/30 text-xs bg-[#27272a] px-2.5 py-1 rounded-md">{drawerExercice.equipment || '—'}</span>
                    <span className="text-white/15 text-xs">{drawerExercice.muscle_group}</span>
                    {drawerExercice.category && (
                      <span className="text-[9px] px-2 py-0.5 rounded bg-[#27272a]/60 text-white/20">{drawerExercice.category}</span>
                    )}
                  </div>
                </div>

                {/* Muscles ciblés */}
                {muscles.length > 0 && (
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-2">Muscles ciblés</p>
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
                    <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-2">Consignes d'exécution</p>
                    <p className="text-white/50 text-sm leading-relaxed">{drawerExercice.description}</p>
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
            <label className="block text-sm text-white/50 mb-1">Nom de l'exercice *</label>
            <input type="text" value={newExo.nom} onChange={(e) => setNewExo(p => ({ ...p, nom: e.target.value }))}
              placeholder="Ex: Squat Gobelet" required autoFocus
              className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/50 mb-1">Groupe musculaire</label>
              <select value={newExo.muscle_group} onChange={(e) => setNewExo(p => ({ ...p, muscle_group: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B] transition-colors">
                <option value="">— Sélectionner —</option>
                {MUSCLE_GROUPS.filter(g => g !== 'Tous').map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1">Catégorie</label>
              <select value={newExo.category} onChange={(e) => setNewExo(p => ({ ...p, category: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B] transition-colors">
                {EXERCISE_CATEGORIES.filter(c => c !== 'Tous').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-1">Équipement</label>
            <input type="text" value={newExo.equipment} onChange={(e) => setNewExo(p => ({ ...p, equipment: e.target.value }))}
              placeholder="Ex: Haltères, Barre, Poids du corps..."
              className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors" />
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-1">Muscles ciblés <span className="text-white/20">(séparés par des virgules)</span></label>
            <input type="text" value={newExo.muscles} onChange={(e) => setNewExo(p => ({ ...p, muscles: e.target.value }))}
              placeholder="Quadriceps, Fessiers, Ischio-jambiers"
              className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors" />
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-1">Description / Consignes</label>
            <textarea value={newExo.description} onChange={(e) => setNewExo(p => ({ ...p, description: e.target.value }))}
              rows={3} placeholder="Décrivez l'exécution du mouvement..."
              className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/50 mb-1 flex items-center gap-1.5">
                <Video size={13} className="text-[#FF6B2B]" /> URL Vidéo
              </label>
              <input type="url" value={newExo.video_url} onChange={(e) => setNewExo(p => ({ ...p, video_url: e.target.value }))}
                placeholder="https://youtube.com/..."
                className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1 flex items-center gap-1.5">
                <PlayCircle size={13} className="text-[#FF6B2B]" /> URL GIF
              </label>
              <input type="url" value={newExo.gif_url} onChange={(e) => setNewExo(p => ({ ...p, gif_url: e.target.value }))}
                placeholder="https://exemple.com/demo.gif"
                className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setModalCreer(false)}
              className="flex-1 py-2.5 rounded-xl text-sm text-white/40 bg-[#27272a] hover:bg-[#3f3f46] transition-colors">
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
// CALENDAR TAB — Vue hebdomadaire
// ══════════════════════════════════════

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function getWeekDates(offset = 0) {
  const now = new Date()
  now.setDate(now.getDate() + offset * 7)
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function formatDateISO(d) {
  return d.toISOString().split('T')[0]
}

function CalendarTab({ clientId, clientName, coachId, onEditSeance }) {
  const toast = useToast()
  const [weekOffset, setWeekOffset] = useState(0)
  const [seances, setSeances] = useState([])
  const [loadingSeances, setLoadingSeances] = useState(true)

  // Flow création de séance (3 étapes Apple)
  const [modalSeance, setModalSeance] = useState(false)
  const [modalDate, setModalDate] = useState(null)
  const [newSeanceTitre, setNewSeanceTitre] = useState('')
  const [newSeanceNotes, setNewSeanceNotes] = useState('')
  const [creatingSeance, setCreatingSeance] = useState(false)
  const [seanceStep, setSeanceStep] = useState(1) // 1=template, 2=date
  const [selectedTemplateForPlan, setSelectedTemplateForPlan] = useState(null) // template or 'new'

  // Modale détail d'une séance
  const [detailSeance, setDetailSeance] = useState(null)
  const [detailExercices, setDetailExercices] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  // ── Templates (Modèles) ──
  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)

  // Modale : créer un modèle
  const [modalTemplate, setModalTemplate] = useState(false)
  const [newTemplateTitre, setNewTemplateTitre] = useState('')
  const [newTemplateNotes, setNewTemplateNotes] = useState('')
  const [creatingTemplate, setCreatingTemplate] = useState(false)

  // Modale : ajouter un modèle au calendrier
  const [modalPlanifier, setModalPlanifier] = useState(null)
  const [planifDate, setPlanifDate] = useState('')
  const [planifying, setPlanifying] = useState(false)

  // Preview exercices d'un template
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [previewExos, setPreviewExos] = useState([])
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Workout builder drawer
  const [drawerTemplate, setDrawerTemplate] = useState(null) // template object to edit
  const [drawerExos, setDrawerExos] = useState([]) // [{exercice_id, nom, series, reps, repos, ordre}]
  const [drawerSaving, setDrawerSaving] = useState(false)
  const [drawerTitle, setDrawerTitle] = useState('')
  const [drawerSearch, setDrawerSearch] = useState('')
  const [drawerShowSearch, setDrawerShowSearch] = useState(false)
  const [drawerCatFilter, setDrawerCatFilter] = useState('Tous')
  const [allExercicesDrawer, setAllExercicesDrawer] = useState([])
  const [loadingDrawerExos, setLoadingDrawerExos] = useState(false)

  const weekDates = getWeekDates(weekOffset)
  const weekStart = formatDateISO(weekDates[0])
  const weekEnd = formatDateISO(weekDates[6])

  // ── Charger les séances de la semaine ──
  useEffect(() => {
    if (!clientId || !coachId) return
    const load = async () => {
      setLoadingSeances(true)
      const { data } = await supabase
        .from('seances')
        .select('id, titre, date_prevue, notes')
        .eq('coach_id', coachId)
        .eq('client_id', clientId)
        .eq('is_template', false)
        .gte('date_prevue', weekStart)
        .lte('date_prevue', weekEnd)
        .order('date_prevue')
      setSeances(data || [])
      setLoadingSeances(false)
    }
    load()
  }, [clientId, coachId, weekStart, weekEnd])

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
      // Filter out ProgramBuilder internal seances (notes starts with 'programme:')
      const userTemplates = (data || []).filter(t => !t.notes || !t.notes.startsWith('programme:'))
      setTemplates(userTemplates)
      setLoadingTemplates(false)
    }
    load()
  }, [coachId])

  // ── Créer une séance ──
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
      })
      .select()
      .single()
    if (error) {
      toast.error('Erreur lors de la création')
    } else {
      setSeances(prev => [...prev, data])
      toast.success('Séance créée ! Ajoutez des exercices.')
      setModalSeance(false)
      setNewSeanceTitre('')
      setNewSeanceNotes('')
      // Basculer vers l'éditeur Sport avec cette séance
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
      })
      .select()
      .single()
    if (error) {
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
    if (!error) {
      setSeances(prev => prev.filter(s => s.id !== id))
      setDetailSeance(null)
      toast.success('Séance supprimée')
    }
  }

  // ── Supprimer un modèle ──
  const supprimerTemplate = async (id) => {
    const { error } = await supabase.from('seances').delete().eq('id', id)
    if (!error) {
      setTemplates(prev => prev.filter(t => t.id !== id))
      toast.success('Modèle supprimé')
    }
  }

  // ── Charger le détail d'une séance (exercices) ──
  const voirDetail = async (seance) => {
    setDetailSeance(seance)
    setLoadingDetail(true)
    const { data } = await supabase
      .from('seance_exercices')
      .select('*, exercices(nom, muscle_group, equipment)')
      .eq('seance_id', seance.id)
      .order('ordre')
    setDetailExercices(data || [])
    setLoadingDetail(false)
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
      })
      .select()
      .single()

    if (errSeance || !newSeance) {
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

    // 3. Mettre à jour le calendrier si la date est dans la semaine affichée
    if (planifDate >= weekStart && planifDate <= weekEnd) {
      setSeances(prev => [...prev, newSeance])
    }

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
      .select('id, exercice_id, series, reps, repos, ordre, exercices(nom, muscle_group, equipment)')
      .eq('seance_id', template.id)
      .order('ordre')
    setDrawerExos((data || []).map(e => ({
      id: e.id, exercice_id: e.exercice_id,
      nom: e.exercices?.nom || '?', muscle_group: e.exercices?.muscle_group || '',
      equipment: e.exercices?.equipment || '',
      series: e.series || 3, reps: e.reps || 10, repos: e.repos || 90, ordre: e.ordre,
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
    if (error || !data) { toast.error('Erreur création modèle'); return }
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

  // Helpers
  const moisAnnee = weekDates[0].toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const today = formatDateISO(new Date())

  return (
    <div className="flex gap-4 h-[calc(100vh-16rem)] min-h-[500px]">

      {/* ══════════════════════════════════════ */}
      {/* ZONE GAUCHE — Calendrier              */}
      {/* ══════════════════════════════════════ */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all ${panelOpen ? '' : ''}`}>

        {/* Header semaine */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h3 className="text-[#F5F5F3] text-lg font-bold capitalize">{moisAnnee}</h3>
            <p className="text-white/20 text-xs mt-0.5">Programmation de {clientName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(0)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${weekOffset === 0 ? 'bg-[#FF6B2B]/10 text-[#FF6B2B]' : 'bg-[#27272a] text-white/30 hover:text-white/50'}`}>
              Aujourd'hui
            </button>
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-lg bg-[#27272a] text-white/30 hover:text-white/60 transition-colors">
              <ChevronLeft size={15} />
            </button>
            <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 rounded-lg bg-[#27272a] text-white/30 hover:text-white/60 transition-colors">
              <ChevronRight size={15} />
            </button>
            <div className="w-px h-5 bg-[#27272a] mx-1" />
            <button onClick={() => setPanelOpen(p => !p)}
              className={`p-2 rounded-lg transition-colors ${panelOpen ? 'bg-[#FF6B2B]/10 text-[#FF6B2B]' : 'bg-[#27272a] text-white/30 hover:text-white/50'}`}
              title={panelOpen ? 'Masquer les modèles' : 'Afficher les modèles'}>
              {panelOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            </button>
          </div>
        </div>

        {/* Grille 7 jours */}
        <div className="flex-1 overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[700px]">
          {weekDates.map((date, i) => {
            const dateStr = formatDateISO(date)
            const isToday = dateStr === today
            const jourSeances = seances.filter(s => s.date_prevue === dateStr)

            return (
              <div key={i} className={`bg-[#18181b] border rounded-2xl flex flex-col overflow-hidden transition-all ${isToday ? 'border-[#FF6B2B]/40 shadow-lg shadow-[#FF6B2B]/5' : 'border-[#27272a] hover:border-[#27272a]/80'}`}>
                <div className={`px-3 py-3 border-b text-center flex-shrink-0 ${isToday ? 'border-[#FF6B2B]/20 bg-[#FF6B2B]/5' : 'border-[#27272a]'}`}>
                  <p className={`text-[9px] uppercase tracking-[0.15em] font-semibold mb-1 ${isToday ? 'text-[#FF6B2B]' : 'text-white/25'}`}>{JOURS_COURTS[i]}</p>
                  <div className={`inline-flex items-center justify-center ${isToday ? 'w-8 h-8 rounded-full bg-[#FF6B2B] text-white' : ''}`}>
                    <p className={`text-lg font-bold ${isToday ? 'text-white' : 'text-[#F5F5F3]'}`}>{date.getDate()}</p>
                  </div>
                </div>
                <div className="flex-1 p-1.5 space-y-1 overflow-y-auto">
                  {loadingSeances ? (
                    <div className="flex items-center justify-center py-4"><Loader2 size={12} className="animate-spin text-white/10" /></div>
                  ) : (
                    jourSeances.map((s) => (
                      <button key={s.id} onClick={() => voirDetail(s)}
                        className="w-full bg-[#FF6B2B]/8 border border-[#FF6B2B]/10 rounded-xl px-2.5 py-2 hover:bg-[#FF6B2B]/15 hover:border-[#FF6B2B]/25 transition-all group/card text-left">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-4 rounded-full bg-[#FF6B2B] flex-shrink-0" />
                          <span className="text-[#F5F5F3] text-[10px] font-semibold truncate flex-1 min-w-0">
                            {s.titre}
                          </span>
                          <span
                            onClick={(e) => { e.stopPropagation(); if (onEditSeance) onEditSeance(s.id) }}
                            className="p-0.5 rounded text-transparent group-hover/card:text-white/20 hover:!text-[#FF6B2B] transition-all flex-shrink-0 cursor-pointer"
                            title="Modifier"
                          >
                            <Pencil size={9} />
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <div className="px-2 pb-2 flex-shrink-0">
                  <button onClick={() => { setModalDate(dateStr); setModalSeance(true); setSeanceStep(1); setSelectedTemplateForPlan(null) }}
                    className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl border border-dashed border-[#27272a]/60 text-white/15 hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30 hover:bg-[#FF6B2B]/[0.03] transition-all text-[10px] font-medium">
                    <Plus size={10} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* PANNEAU DROIT — Modèles de séances    */}
      {/* ══════════════════════════════════════ */}
      {panelOpen && (
        <div className="hidden md:flex w-72 flex-shrink-0 bg-[#18181b] border border-[#27272a] rounded-2xl flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-[#27272a]">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[#F5F5F3] text-sm font-bold">Mes modèles</h3>
              <button onClick={ouvrirDrawerNouveau}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FF6B2B] text-white text-[10px] font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-sm shadow-[#FF6B2B]/20">
                <Plus size={11} /> Nouveau
              </button>
            </div>
            <p className="text-white/20 text-[10px]">{templates.length} modèle{templates.length !== 1 ? 's' : ''} disponible{templates.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Liste des modèles */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-8"><Loader2 size={16} className="animate-spin text-white/10" /></div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <Layers size={28} className="text-white/8 mx-auto mb-3" />
                <p className="text-white/15 text-xs mb-1">Aucun modèle</p>
                <p className="text-white/10 text-[10px]">Créez des modèles de séances pour les réutiliser facilement</p>
              </div>
            ) : (
              templates.map((tpl) => (
                <div key={tpl.id} className="bg-[#0D0D0D] border border-[#27272a] rounded-2xl p-3.5 group hover:border-[#FF6B2B]/20 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                      <Dumbbell size={16} className="text-[#FF6B2B]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => ouvrirDrawer(tpl)} className="text-[#F5F5F3] text-xs font-bold hover:text-[#FF6B2B] transition-colors text-left truncate block w-full">
                        {tpl.titre}
                      </button>
                      <p className="text-white/15 text-[9px] mt-0.5">Cliquer pour modifier</p>
                    </div>
                    <button onClick={() => supprimerTemplate(tpl.id)}
                      className="p-1.5 rounded-lg text-white/10 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                      <Trash2 size={11} />
                    </button>
                  </div>

                  <button onClick={() => { setModalPlanifier(tpl); setPlanifDate(formatDateISO(new Date())) }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#FF6B2B] text-white text-[10px] font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-sm shadow-[#FF6B2B]/20">
                    <CalendarPlus size={11} />
                    Planifier
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* MODAL — Planifier une séance (3 étapes Apple) */}
      {/* ══════════════════════════════════════ */}
      {modalSeance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setModalSeance(false); setSeanceStep(1); setSelectedTemplateForPlan(null) }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-[#1E1E1E] rounded-2xl border border-white/[0.06] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="h-1 bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]" />

            {/* Progress bar */}
            <div className="px-6 pt-5 pb-3">
              <div className="flex items-center gap-2 mb-2">
                {[1, 2].map(s => (
                  <div key={s} className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                    seanceStep >= s ? 'bg-[#FF6B2B]' : 'bg-[#27272a]'
                  }`} />
                ))}
              </div>
              <p className="text-white/25 text-[10px] font-medium">Étape {seanceStep} sur 2</p>
            </div>

            {/* Step 1 — Choisir ou créer un modèle */}
            {seanceStep === 1 && (
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <h2 className="text-[#F5F5F3] text-xl font-bold">Choisir une séance</h2>
                  <p className="text-white/30 text-sm mt-1">Sélectionnez un modèle existant ou créez-en un nouveau.</p>
                </div>

                {/* Créer une nouvelle */}
                <div className="space-y-2">
                  <button onClick={() => { setSelectedTemplateForPlan('new'); setNewSeanceTitre(''); }}
                    className={`w-full flex items-center gap-3.5 px-4 py-4 rounded-xl border-2 border-dashed transition-all ${
                      selectedTemplateForPlan === 'new' ? 'border-[#FF6B2B] bg-[#FF6B2B]/5' : 'border-[#27272a] hover:border-[#FF6B2B]/30'
                    }`}>
                    <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center shrink-0">
                      <Plus size={18} className="text-[#FF6B2B]" />
                    </div>
                    <div className="text-left">
                      <p className="text-[#F5F5F3] text-sm font-semibold">Nouvelle séance</p>
                      <p className="text-white/25 text-[11px]">Créer une séance personnalisée</p>
                    </div>
                  </button>
                  {selectedTemplateForPlan === 'new' && (
                    <input type="text" value={newSeanceTitre} onChange={e => setNewSeanceTitre(e.target.value)}
                      placeholder="Nom de la séance..." autoFocus
                      className="w-full bg-[#0D0D0D] border border-[#27272a] rounded-xl px-4 py-3 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
                  )}
                </div>

                {/* Modèles existants */}
                {templates.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-white/25 text-[10px] font-semibold uppercase tracking-wider">Ou utiliser un modèle</p>
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {templates.map(tpl => (
                        <button key={tpl.id} onClick={() => { setSelectedTemplateForPlan(tpl); setNewSeanceTitre(tpl.titre) }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                            selectedTemplateForPlan?.id === tpl.id ? 'bg-[#FF6B2B]/10 border border-[#FF6B2B]/30' : 'bg-[#0D0D0D] hover:bg-[#0D0D0D]/80 border border-transparent'
                          }`}>
                          <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center shrink-0">
                            <Dumbbell size={14} className="text-[#FF6B2B]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#F5F5F3] text-xs font-semibold truncate">{tpl.titre}</p>
                            {tpl.notes && <p className="text-white/15 text-[9px] truncate">{tpl.notes}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next button */}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setModalSeance(false); setSeanceStep(1) }}
                    className="flex-1 py-3 rounded-xl text-sm text-white/30 bg-[#27272a] hover:bg-[#3f3f46] transition-colors">
                    Annuler
                  </button>
                  <button onClick={() => setSeanceStep(2)}
                    disabled={!selectedTemplateForPlan || (selectedTemplateForPlan === 'new' && !newSeanceTitre.trim())}
                    className="flex-1 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                    Suivant <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 — Choisir la date */}
            {seanceStep === 2 && (
              <div className="px-6 pb-6 space-y-5">
                <div>
                  <h2 className="text-[#F5F5F3] text-xl font-bold">Planifier la date</h2>
                  <p className="text-white/30 text-sm mt-1">
                    {selectedTemplateForPlan === 'new' ? `"${newSeanceTitre}"` : `"${selectedTemplateForPlan?.titre}"`} pour {clientName}
                  </p>
                </div>

                {/* Résumé visuel */}
                <div className="bg-[#0D0D0D] rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center shrink-0">
                    <Dumbbell size={18} className="text-[#FF6B2B]" />
                  </div>
                  <div>
                    <p className="text-[#F5F5F3] text-sm font-semibold">
                      {selectedTemplateForPlan === 'new' ? newSeanceTitre : selectedTemplateForPlan?.titre}
                    </p>
                    <p className="text-white/20 text-[10px]">
                      {selectedTemplateForPlan === 'new' ? 'Nouvelle séance' : 'Modèle existant (exercices copiés)'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/35 mb-2 font-semibold uppercase tracking-wider">Date de la séance</label>
                  <input type="date" value={modalDate || ''} onChange={e => setModalDate(e.target.value)}
                    className="w-full bg-[#0D0D0D] border border-[#27272a] rounded-xl px-4 py-3 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
                </div>

                <div>
                  <label className="block text-xs text-white/35 mb-2 font-semibold uppercase tracking-wider">Notes (optionnel)</label>
                  <textarea value={newSeanceNotes} onChange={e => setNewSeanceNotes(e.target.value)}
                    placeholder="Instructions spécifiques..." rows={2}
                    className="w-full bg-[#0D0D0D] border border-[#27272a] rounded-xl px-4 py-3 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/50 transition-all resize-none" />
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setSeanceStep(1)}
                    className="flex-1 py-3 rounded-xl text-sm text-white/30 bg-[#27272a] hover:bg-[#3f3f46] transition-colors flex items-center justify-center gap-1.5">
                    <ChevronLeft size={14} /> Retour
                  </button>
                  <button
                    onClick={async (e) => {
                      if (selectedTemplateForPlan && selectedTemplateForPlan !== 'new') {
                        // Copier depuis un template
                        setModalPlanifier(selectedTemplateForPlan)
                        setPlanifDate(modalDate || formatDateISO(new Date()))
                        setModalSeance(false)
                        setSeanceStep(1)
                        setSelectedTemplateForPlan(null)
                      } else {
                        // Créer une nouvelle séance
                        await creerSeance(e)
                        setSeanceStep(1)
                        setSelectedTemplateForPlan(null)
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

      {/* ══════════════════════════════════════ */}
      {/* MODAL — Créer un modèle              */}
      {/* ══════════════════════════════════════ */}
      <Modal isOpen={modalTemplate} onClose={() => setModalTemplate(false)} title="Nouveau modèle de séance">
        <form onSubmit={creerTemplate} className="space-y-4">
          <div className="bg-[#09090b] rounded-lg p-3 flex items-start gap-2.5">
            <Layers size={16} className="text-[#FF6B2B] mt-0.5 flex-shrink-0" />
            <p className="text-white/30 text-xs leading-relaxed">Un modèle est une séance type réutilisable. Créez-le ici, puis ajoutez-lui des exercices via l'onglet Sport.</p>
          </div>
          <div>
            <label className="block text-sm text-white/50 mb-1.5">Titre du modèle *</label>
            <input type="text" value={newTemplateTitre} onChange={(e) => setNewTemplateTitre(e.target.value)}
              placeholder="Ex: Push Day, Full Body débutant, Cardio HIIT..." autoFocus required
              className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors" />
          </div>
          <div>
            <label className="block text-sm text-white/50 mb-1.5">Notes (optionnel)</label>
            <textarea value={newTemplateNotes} onChange={(e) => setNewTemplateNotes(e.target.value)}
              placeholder="Description ou objectifs de cette séance..." rows={3}
              className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModalTemplate(false)}
              className="flex-1 py-2.5 rounded-xl text-sm text-white/40 bg-[#27272a] hover:bg-[#3f3f46] transition-colors">Annuler</button>
            <button type="submit" disabled={creatingTemplate}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40">
              {creatingTemplate ? <Loader2 size={15} className="animate-spin" /> : <Layers size={15} />}
              Créer le modèle
            </button>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════ */}
      {/* MODAL — Planifier un modèle           */}
      {/* ══════════════════════════════════════ */}
      <Modal isOpen={!!modalPlanifier} onClose={() => setModalPlanifier(null)} title="Ajouter au calendrier">
        {modalPlanifier && (
          <div className="space-y-4">
            {/* Résumé du modèle */}
            <div className="bg-[#09090b] rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                <Copy size={16} className="text-[#FF6B2B]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#F5F5F3] text-sm font-semibold truncate">{modalPlanifier.titre}</p>
                <p className="text-white/20 text-[10px]">Ce modèle et tous ses exercices seront copiés</p>
              </div>
            </div>

            {/* Client cible */}
            <div className="bg-[#09090b] rounded-lg p-3 flex items-center gap-2">
              <User size={14} className="text-[#FF6B2B]" />
              <span className="text-[#F5F5F3] text-sm">{clientName}</span>
              <span className="text-white/15 text-[10px] ml-auto">Client sélectionné</span>
            </div>

            {/* Sélection de la date */}
            <div>
              <label className="block text-sm text-white/50 mb-1.5">Date de la séance *</label>
              <input type="date" value={planifDate} onChange={(e) => setPlanifDate(e.target.value)} required
                className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B] transition-colors" />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setModalPlanifier(null)}
                className="flex-1 py-2.5 rounded-xl text-sm text-white/40 bg-[#27272a] hover:bg-[#3f3f46] transition-colors">
                Annuler
              </button>
              <button onClick={planifierTemplate} disabled={planifying || !planifDate}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40">
                {planifying ? <Loader2 size={15} className="animate-spin" /> : <CalendarPlus size={15} />}
                Confirmer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ══════════════════════════════════════ */}
      {/* MODAL — Détail d'une séance           */}
      {/* ══════════════════════════════════════ */}
      <Modal isOpen={!!detailSeance} onClose={() => setDetailSeance(null)} title={detailSeance?.titre || 'Séance'}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-[#09090b] rounded-lg p-3">
            <Calendar size={14} className="text-[#FF6B2B]" />
            <span className="text-[#F5F5F3] text-sm">
              {detailSeance?.date_prevue
                ? new Date(detailSeance.date_prevue + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                : ''}
            </span>
          </div>
          {detailSeance?.notes && (
            <p className="text-white/30 text-xs bg-[#09090b] rounded-lg p-3">{detailSeance.notes}</p>
          )}
          <div>
            <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-2">Exercices ({detailExercices.length})</p>
            {loadingDetail ? (
              <div className="flex items-center justify-center py-6"><Loader2 size={18} className="animate-spin text-white/10" /></div>
            ) : detailExercices.length === 0 ? (
              <div className="text-center py-6 bg-[#09090b] rounded-lg">
                <Dumbbell size={20} className="text-white/10 mx-auto mb-2" />
                <p className="text-white/15 text-xs">Aucun exercice ajouté</p>
                <p className="text-white/10 text-[10px] mt-1">Ouvrez l'onglet Sport pour composer la séance</p>
              </div>
            ) : (
              <div className="space-y-2">
                {detailExercices.map((ex, i) => (
                  <div key={ex.id} className="flex items-center gap-3 bg-[#09090b] rounded-lg p-3">
                    <span className="w-5 h-5 rounded bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#F5F5F3] text-sm font-medium truncate">{ex.exercices?.nom || 'Exercice'}</p>
                      <p className="text-white/20 text-[10px]">{ex.series}×{ex.reps} {ex.poids ? `· ${ex.poids}kg` : ''} {ex.repos ? `· ${ex.repos}s repos` : ''}</p>
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

      {/* ══════════════════════════════════════ */}
      {/* MODAL — Preview d'un modèle           */}
      {/* ══════════════════════════════════════ */}
      <Modal isOpen={!!previewTemplate} onClose={() => setPreviewTemplate(null)} title={previewTemplate?.titre || 'Modèle'}>
        {previewTemplate && (
          <div className="space-y-4">
            <div className="bg-[#09090b] rounded-lg p-3 flex items-center gap-2">
              <Layers size={14} className="text-[#FF6B2B]" />
              <span className="text-[#FF6B2B] text-[10px] font-bold">MODÈLE</span>
              {previewTemplate.notes && <span className="text-white/20 text-xs ml-auto truncate">{previewTemplate.notes}</span>}
            </div>
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-2">Exercices ({previewExos.length})</p>
              {loadingPreview ? (
                <div className="flex items-center justify-center py-6"><Loader2 size={18} className="animate-spin text-white/10" /></div>
              ) : previewExos.length === 0 ? (
                <div className="text-center py-6 bg-[#09090b] rounded-lg">
                  <Dumbbell size={20} className="text-white/10 mx-auto mb-2" />
                  <p className="text-white/15 text-xs">Aucun exercice dans ce modèle</p>
                  <p className="text-white/10 text-[10px] mt-1">Ajoutez des exercices via l'onglet Sport</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {previewExos.map((ex, i) => (
                    <div key={ex.id} className="flex items-center gap-3 bg-[#09090b] rounded-lg p-3">
                      <span className="w-5 h-5 rounded bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#F5F5F3] text-sm font-medium truncate">{ex.exercices?.nom || 'Exercice'}</p>
                        <p className="text-white/20 text-[10px]">{ex.series}×{ex.reps} {ex.poids ? `· ${ex.poids}kg` : ''} {ex.repos ? `· ${ex.repos}s repos` : ''}</p>
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
              <button onClick={() => { setModalPlanifier(previewTemplate); setPreviewTemplate(null); setPlanifDate(formatDateISO(new Date())) }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors">
                <CalendarPlus size={15} /> Planifier
              </button>
              <button onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2.5 rounded-xl bg-[#27272a] text-white/40 text-sm hover:bg-[#3f3f46] transition-colors">Fermer</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ══════════════════════════════════════ */}
      {/* DRAWER — Workout Builder (Modèle)     */}
      {/* ══════════════════════════════════════ */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-[#09090b] border-l border-[#27272a] shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
        drawerTemplate ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {drawerTemplate && (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#27272a] flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center">
                    <Dumbbell size={16} className="text-[#FF6B2B]" />
                  </div>
                  <h3 className="text-[#F5F5F3] text-sm font-bold">Workout Builder</h3>
                </div>
                <button onClick={() => setDrawerTemplate(null)} className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all">
                  <X size={18} />
                </button>
              </div>
              {/* Nom du modèle */}
              <input
                type="text"
                value={drawerTitle}
                onChange={e => setDrawerTitle(e.target.value)}
                placeholder="Nom du modèle..."
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm font-semibold placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 focus:ring-1 focus:ring-[#FF6B2B]/20 transition-all"
              />
            </div>

            {/* Exercices du modèle */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
              {loadingDrawerExos ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-white/10" />
                </div>
              ) : drawerExos.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-2xl bg-[#18181b] border border-dashed border-[#27272a] flex items-center justify-center mx-auto mb-4">
                    <Dumbbell size={22} className="text-white/10" />
                  </div>
                  <p className="text-white/25 text-sm font-medium mb-1">Aucun exercice</p>
                  <p className="text-white/10 text-xs">Ajoutez des exercices pour construire votre séance</p>
                </div>
              ) : (
                drawerExos.map((exo, idx) => (
                  <div key={`${exo.exercice_id}-${idx}`} className="bg-[#18181b] border border-[#27272a] rounded-xl p-3.5 group hover:border-[#27272a]/80 transition-all">
                    {/* Titre + supprimer */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                          <Dumbbell size={13} className="text-[#FF6B2B]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#F5F5F3] text-xs font-semibold truncate">{exo.nom}</p>
                          {exo.muscle_group && (
                            <p className="text-white/20 text-[10px]">{exo.muscle_group}{exo.equipment ? ` • ${exo.equipment}` : ''}</p>
                          )}
                        </div>
                      </div>
                      <button onClick={() => drawerRemoveExo(idx)}
                        className="p-1.5 rounded-lg text-white/10 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {/* Séries / Reps / Repos */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[9px] text-white/20 mb-1 font-medium">Séries</label>
                        <input type="number" min={1} value={exo.series}
                          onChange={e => drawerUpdateExo(idx, 'series', e.target.value)}
                          className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-[#F5F5F3] text-xs font-semibold text-center focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
                      </div>
                      <div>
                        <label className="block text-[9px] text-white/20 mb-1 font-medium">Reps</label>
                        <input type="number" min={1} value={exo.reps}
                          onChange={e => drawerUpdateExo(idx, 'reps', e.target.value)}
                          className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-[#F5F5F3] text-xs font-semibold text-center focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
                      </div>
                      <div>
                        <label className="block text-[9px] text-white/20 mb-1 font-medium">Repos (s)</label>
                        <input type="number" min={0} step={15} value={exo.repos}
                          onChange={e => drawerUpdateExo(idx, 'repos', e.target.value)}
                          className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-[#F5F5F3] text-xs font-semibold text-center focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Ajouter un exercice — Bibliothèque intégrée */}
            <div className="border-t border-[#27272a] flex-shrink-0 flex flex-col" style={{ maxHeight: drawerShowSearch ? '55vh' : 'auto' }}>
              {drawerShowSearch ? (
                <>
                  {/* Search header */}
                  <div className="px-5 py-3 space-y-2.5 border-b border-[#27272a]/50">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[#F5F5F3] text-xs font-bold">Ma bibliothèque</h4>
                      <button onClick={() => { setDrawerShowSearch(false); setDrawerSearch(''); setDrawerCatFilter('Tous') }}
                        className="text-[10px] text-white/25 hover:text-white/50 transition-colors">Fermer</button>
                    </div>
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                      <input type="text" value={drawerSearch} onChange={e => setDrawerSearch(e.target.value)}
                        placeholder="Rechercher..." autoFocus
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-8 pr-4 py-2 text-[#F5F5F3] text-[11px] placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {EXERCISE_CATEGORIES.map(cat => (
                        <button key={cat} onClick={() => setDrawerCatFilter(cat)}
                          className={`px-2 py-0.5 rounded-lg text-[9px] font-medium transition-colors ${
                            drawerCatFilter === cat ? 'bg-[#FF6B2B] text-white' : 'bg-[#18181b] text-white/25 hover:text-white/50'
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
                        <p className="text-white/15 text-xs">Aucun exercice trouvé</p>
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
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#18181b] transition-colors text-left group">
                          <div className="w-9 h-9 rounded-xl bg-[#FF6B2B]/8 flex items-center justify-center flex-shrink-0">
                            {exo.image_url ? (
                              <img src={exo.image_url} alt="" className="w-full h-full rounded-xl object-cover" />
                            ) : (
                              <Dumbbell size={14} className="text-[#FF6B2B]/60" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#F5F5F3] text-xs font-semibold truncate">{exo.nom}</p>
                            <p className="text-white/20 text-[9px]">{exo.muscle_group || ''}{exo.category ? ` • ${exo.category}` : ''}</p>
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
            <div className="px-5 py-4 border-t border-[#27272a] flex-shrink-0 flex gap-2">
              <button onClick={() => setDrawerTemplate(null)}
                className="flex-1 py-3 rounded-xl text-sm text-white/40 bg-[#18181b] hover:bg-[#27272a] transition-colors border border-[#27272a]">
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
const INFOS_INPUT_STYLE = "bg-transparent text-[#F5F5F3] text-sm font-semibold text-right border-none focus:outline-none focus:ring-0 placeholder-zinc-600"

function SettingsRow({ label, children, last }) {
  return (
    <div className={`flex items-center justify-between py-3.5 ${last ? '' : 'border-b border-[#27272a]/40'}`}>
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
      <div className="bg-[#1E1E1E] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#27272a]">
          <h3 className="text-[#F5F5F3] text-base font-bold">Identité</h3>
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
            <span className="text-white/25 text-sm">{formData.email || '—'}</span>
          </SettingsRow>
          <SettingsRow label="Téléphone" last>
            <input type="tel" value={formData.telephone} onChange={e => set('telephone', e.target.value)}
              placeholder="+33..." className={INFOS_INPUT_STYLE} />
          </SettingsRow>
        </div>
      </div>

      {/* ═══ Profil ═══ */}
      <div className="bg-[#1E1E1E] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#27272a]">
          <h3 className="text-[#F5F5F3] text-base font-bold">Profil</h3>
        </div>
        <div className="px-6">
          <SettingsRow label="Genre">
            <select value={formData.sexe} onChange={e => set('sexe', e.target.value)}
              className={`${INFOS_INPUT_STYLE} cursor-pointer appearance-none pr-0`}>
              <option value="" className="bg-[#1E1E1E]">—</option>
              {SEXE_OPTIONS.map(s => <option key={s} value={s} className="bg-[#1E1E1E]">{s}</option>)}
            </select>
          </SettingsRow>
          <SettingsRow label="Âge">
            <input type="number" value={formData.age} onChange={e => set('age', e.target.value)}
              placeholder="—" className={`${INFOS_INPUT_STYLE} w-12`} />
            <span className="text-zinc-500 text-sm">ans</span>
          </SettingsRow>
          <SettingsRow label="Taille">
            <input type="number" value={formData.taille} onChange={e => set('taille', e.target.value)}
              placeholder="—" className={`${INFOS_INPUT_STYLE} w-14`} />
            <span className="text-zinc-500 text-sm">cm</span>
          </SettingsRow>
          <SettingsRow label="Poids">
            <input type="number" step="0.1" value={formData.poids_depart} onChange={e => set('poids_depart', e.target.value)}
              placeholder="—" className={`${INFOS_INPUT_STYLE} w-16`} />
            <span className="text-zinc-500 text-sm">kg</span>
          </SettingsRow>
          <SettingsRow label="IMC">
            <span className="text-[#F5F5F3] text-sm font-semibold">{imc || '—'}</span>
            <span className="text-zinc-500 text-sm">kg/m²</span>
            {imcLabel && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-bold ml-1">{imcLabel}</span>
            )}
          </SettingsRow>
          <SettingsRow label="Activité" last>
            <select value={formData.niveau_activite} onChange={e => set('niveau_activite', e.target.value)}
              className={`${INFOS_INPUT_STYLE} cursor-pointer appearance-none pr-0`}>
              <option value="" className="bg-[#1E1E1E]">—</option>
              {NIVEAUX_ACTIVITE.map(n => <option key={n} value={n} className="bg-[#1E1E1E]">{n}</option>)}
            </select>
          </SettingsRow>
        </div>
      </div>

      {/* ═══ Objectifs ═══ */}
      <div className="bg-[#1E1E1E] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#27272a]">
          <h3 className="text-[#F5F5F3] text-base font-bold">Objectifs</h3>
        </div>
        <div className="px-6">
          <SettingsRow label="Type d'objectif">
            <input type="text" value={formData.objectif_type} onChange={e => set('objectif_type', e.target.value)}
              placeholder="Perte de poids, Prise de masse..." className={INFOS_INPUT_STYLE} />
          </SettingsRow>
          <SettingsRow label="Poids cible">
            <input type="number" step="0.1" value={formData.poids_cible} onChange={e => set('poids_cible', e.target.value)}
              placeholder="—" className={`${INFOS_INPUT_STYLE} w-16`} />
            <span className="text-zinc-500 text-sm">kg</span>
          </SettingsRow>
          <SettingsRow label="Échéance" last>
            <input type="date" value={formData.date_limite} onChange={e => set('date_limite', e.target.value)}
              className={`${INFOS_INPUT_STYLE} cursor-pointer`} />
          </SettingsRow>
        </div>
      </div>

      {/* ═══ Poids visuel ═══ */}
      {(formData.poids_depart || formData.poids_cible) && (
        <div className="bg-[#1E1E1E] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center justify-around">
            <div className="text-center">
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Départ</p>
              <p className="text-[#F5F5F3] text-2xl font-bold">{formData.poids_depart || '—'}</p>
              <p className="text-zinc-600 text-xs">kg</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-[1.5px] bg-[#27272a]" />
              <div className="w-8 h-8 rounded-full bg-[#FF6B2B]/10 flex items-center justify-center">
                <ChevronRight size={14} className="text-[#FF6B2B]" />
              </div>
              <div className="w-8 h-[1.5px] bg-[#27272a]" />
            </div>
            <div className="text-center">
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Cible</p>
              <p className="text-[#FF6B2B] text-2xl font-bold">{formData.poids_cible || '—'}</p>
              <p className="text-[#FF6B2B]/40 text-xs">kg</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Notes ═══ */}
      <div className="bg-[#1E1E1E] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#27272a]">
          <h3 className="text-[#F5F5F3] text-base font-bold">Notes du coach</h3>
        </div>
        <div className="p-6">
          <textarea value={formData.notes_coach} onChange={e => set('notes_coach', e.target.value)}
            placeholder="Notes internes, restrictions alimentaires, historique médical..."
            rows={4}
            className="w-full bg-[#0D0D0D] border border-white/[0.06] rounded-2xl px-5 py-3.5 text-[#F5F5F3] text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#FF6B2B]/40 transition-all resize-none" />
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
// SUIVI TAB — Poids & évolution
// ══════════════════════════════════════
function SuiviTab({ coachId, clientId }) {
  const toast = useToast()
  const [pesees, setPesees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newPoids, setNewPoids] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!clientId || !coachId) return
    const load = async () => {
      setLoading(true)
      const [peseesRes, profileRes] = await Promise.all([
        supabase.from('suivi_poids').select('*').eq('client_id', clientId).eq('coach_id', coachId).order('date_pesee', { ascending: true }),
        supabase.from('profiles').select('poids_depart, poids_cible, poids_actuel').eq('id', clientId).single(),
      ])
      setPesees(peseesRes.data || [])
      setProfile(profileRes.data)
      setLoading(false)
    }
    load()
  }, [clientId, coachId])

  const ajouterPesee = async () => {
    if (!newPoids) return
    setSaving(true)
    const { error } = await supabase.from('suivi_poids').upsert({
      client_id: clientId,
      coach_id: coachId,
      date_pesee: newDate,
      poids: parseFloat(newPoids),
      notes: newNote || null,
    }, { onConflict: 'client_id,date_pesee' })

    if (error) {
      toast.error('Erreur lors de l\'ajout')
    } else {
      // Mettre à jour poids_actuel sur le profil
      await supabase.from('profiles').update({ poids_actuel: parseFloat(newPoids) }).eq('id', clientId)
      toast.success('Pesée enregistrée !')
      setShowModal(false)
      setNewPoids('')
      setNewNote('')
      // Recharger
      const { data } = await supabase.from('suivi_poids').select('*').eq('client_id', clientId).eq('coach_id', coachId).order('date_pesee', { ascending: true })
      setPesees(data || [])
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#FF6B2B]" size={28} />
      </div>
    )
  }

  const dernierPoids = pesees.length > 0 ? pesees[pesees.length - 1].poids : (profile?.poids_actuel || profile?.poids_depart || null)
  const premierPoids = pesees.length > 0 ? pesees[0].poids : (profile?.poids_depart || null)
  const evolution = dernierPoids && premierPoids ? (dernierPoids - premierPoids).toFixed(1) : null
  const objectif = profile?.poids_cible

  // Simple SVG chart
  const chartHeight = 200
  const chartWidth = 600
  const chartPadding = 40

  const renderChart = () => {
    if (pesees.length < 2) return null
    const poids = pesees.map(p => p.poids)
    const minP = Math.min(...poids) - 1
    const maxP = Math.max(...poids) + 1
    const rangeP = maxP - minP || 1

    const points = pesees.map((p, i) => {
      const x = chartPadding + (i / (pesees.length - 1)) * (chartWidth - chartPadding * 2)
      const y = chartPadding + (1 - (p.poids - minP) / rangeP) * (chartHeight - chartPadding * 2)
      return { x, y, poids: p.poids, date: p.date_pesee }
    })

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    // Gradient area
    const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - chartPadding} L ${points[0].x} ${chartHeight - chartPadding} Z`

    return (
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B2B" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FF6B2B" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = chartPadding + pct * (chartHeight - chartPadding * 2)
          const val = (maxP - pct * rangeP).toFixed(1)
          return (
            <g key={pct}>
              <line x1={chartPadding} y1={y} x2={chartWidth - chartPadding} y2={y} stroke="rgba(255,255,255,0.05)" />
              <text x={chartPadding - 8} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="9">{val}</text>
            </g>
          )
        })}
        {/* Objectif line */}
        {objectif && objectif >= minP && objectif <= maxP && (
          <>
            <line
              x1={chartPadding} y1={chartPadding + (1 - (objectif - minP) / rangeP) * (chartHeight - chartPadding * 2)}
              x2={chartWidth - chartPadding} y2={chartPadding + (1 - (objectif - minP) / rangeP) * (chartHeight - chartPadding * 2)}
              stroke="#22c55e" strokeDasharray="4 4" strokeWidth="1" opacity="0.5"
            />
            <text x={chartWidth - chartPadding + 5} y={chartPadding + (1 - (objectif - minP) / rangeP) * (chartHeight - chartPadding * 2) + 3}
              fill="#22c55e" fontSize="9" opacity="0.6">Objectif</text>
          </>
        )}
        {/* Area */}
        <path d={areaD} fill="url(#chartGrad)" />
        {/* Line */}
        <path d={pathD} fill="none" stroke="#FF6B2B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#09090b" stroke="#FF6B2B" strokeWidth="2" />
            {(i === 0 || i === points.length - 1) && (
              <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#F5F5F3" fontSize="9" fontWeight="600">{p.poids}kg</text>
            )}
          </g>
        ))}
        {/* Date labels */}
        {points.filter((_, i) => i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 5) === 0).map((p, i) => (
          <text key={i} x={p.x} y={chartHeight - 10} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="8">
            {new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </text>
        ))}
      </svg>
    )
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 text-center">
          <p className="text-white/30 text-[10px] font-medium mb-1">Poids actuel</p>
          <p className="text-[#F5F5F3] text-2xl font-bold">{dernierPoids ? `${dernierPoids}` : '—'}<span className="text-sm text-white/30 ml-1">kg</span></p>
        </div>
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 text-center">
          <p className="text-white/30 text-[10px] font-medium mb-1">Objectif</p>
          <p className="text-[#F5F5F3] text-2xl font-bold">{objectif ? `${objectif}` : '—'}<span className="text-sm text-white/30 ml-1">kg</span></p>
        </div>
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 text-center">
          <p className="text-white/30 text-[10px] font-medium mb-1">Évolution totale</p>
          <p className={`text-2xl font-bold ${evolution && parseFloat(evolution) < 0 ? 'text-green-400' : evolution && parseFloat(evolution) > 0 ? 'text-red-400' : 'text-[#F5F5F3]'}`}>
            {evolution ? `${parseFloat(evolution) > 0 ? '+' : ''}${evolution}` : '—'}<span className="text-sm text-white/30 ml-1">kg</span>
          </p>
        </div>
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 text-center">
          <p className="text-white/30 text-[10px] font-medium mb-1">Pesées</p>
          <p className="text-[#F5F5F3] text-2xl font-bold">{pesees.length}</p>
        </div>
      </div>

      {/* Graphique */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#27272a] flex items-center justify-between">
          <h3 className="text-[#F5F5F3] text-sm font-bold flex items-center gap-2">
            <Activity size={15} className="text-[#FF6B2B]" />
            Courbe de poids
          </h3>
          <button onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B2B] text-white text-xs font-semibold hover:bg-[#FF6B2B]/90 transition-all shadow-lg shadow-[#FF6B2B]/20">
            <Plus size={13} /> Nouvelle pesée
          </button>
        </div>
        <div className="p-5">
          {pesees.length < 2 ? (
            <div className="text-center py-12">
              <Scale size={32} className="text-white/10 mx-auto mb-3" />
              <p className="text-white/20 text-sm">Ajoutez au moins 2 pesées pour voir le graphique</p>
              <button onClick={() => setShowModal(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B2B]/10 text-[#FF6B2B] text-xs font-semibold hover:bg-[#FF6B2B]/20 transition-all">
                <Plus size={13} /> Ajouter une pesée
              </button>
            </div>
          ) : (
            renderChart()
          )}
        </div>
      </div>

      {/* Historique */}
      {pesees.length > 0 && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#27272a]">
            <h3 className="text-[#F5F5F3] text-sm font-bold">Historique des pesées</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272a]">
                  <th className="text-left px-5 py-2.5 text-white/30 text-xs font-medium">Date</th>
                  <th className="text-left px-5 py-2.5 text-white/30 text-xs font-medium">Poids</th>
                  <th className="text-left px-5 py-2.5 text-white/30 text-xs font-medium">Évolution</th>
                  <th className="text-left px-5 py-2.5 text-white/30 text-xs font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[...pesees].reverse().map((p, i, arr) => {
                  const prev = arr[i + 1]
                  const diff = prev ? (p.poids - prev.poids).toFixed(1) : null
                  return (
                    <tr key={p.id} className="border-b border-[#27272a]/30 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-[#F5F5F3] text-xs">
                        {new Date(p.date_pesee).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3 text-[#F5F5F3] text-xs font-semibold">{p.poids} kg</td>
                      <td className="px-5 py-3">
                        {diff !== null ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            parseFloat(diff) < 0 ? 'text-green-400' : parseFloat(diff) > 0 ? 'text-red-400' : 'text-white/30'
                          }`}>
                            {parseFloat(diff) < 0 ? <TrendingDown size={12} /> : parseFloat(diff) > 0 ? <TrendingUp size={12} /> : null}
                            {parseFloat(diff) > 0 ? '+' : ''}{diff} kg
                          </span>
                        ) : (
                          <span className="text-white/15 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-white/30 text-xs truncate max-w-[200px]">{p.notes || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal nouvelle pesée */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-[#1E1E1E] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="h-1 bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]" />
            <div className="px-6 pt-5 pb-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-[#F5F5F3] text-lg font-bold">Nouvelle pesée</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.06] transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-medium">Poids (kg)</label>
                <input type="number" step="0.1" value={newPoids} onChange={e => setNewPoids(e.target.value)}
                  placeholder="75.5" autoFocus
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-3 text-[#F5F5F3] text-lg font-bold text-center placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 focus:ring-1 focus:ring-[#FF6B2B]/20 transition-all" />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-medium">Date</label>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-medium">Notes (optionnel)</label>
                <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)}
                  placeholder="Après le sport, à jeun..."
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/[0.04] transition-all border border-white/[0.04]">
                Annuler
              </button>
              <button onClick={ajouterPesee} disabled={!newPoids || saving}
                className="flex-1 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B2B]/20">
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

function NutritionTab({ coachId, clientId, clientName }) {
  const toast = useToast()

  // Bibliothèque
  const [aliments, setAliments] = useState([])
  const [searchAliment, setSearchAliment] = useState('')
  const [catFilter, setCatFilter] = useState('Tous')
  const [loadingAliments, setLoadingAliments] = useState(true)

  // Plan
  const [activeRepas, setActiveRepas] = useState('petit_dej')
  const [planItems, setPlanItems] = useState({
    petit_dej: [],
    dejeuner: [],
    diner: [],
    collation: [],
  })
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [existingPlanId, setExistingPlanId] = useState(null)

  // Charger aliments
  useEffect(() => {
    if (!coachId) return
    const load = async () => {
      setLoadingAliments(true)
      const { data } = await supabase
        .from('aliments')
        .select('*')
        .or(`coach_id.is.null,coach_id.eq.${coachId}`)
        .order('categorie, nom')
      setAliments(data || [])
      setLoadingAliments(false)
    }
    load()
  }, [coachId])

  // Charger plan existant pour cette date
  useEffect(() => {
    if (!coachId || !clientId || !planDate) return
    const loadPlan = async () => {
      const { data: plans } = await supabase
        .from('client_nutrition_plans')
        .select('id')
        .eq('coach_id', coachId)
        .eq('client_id', clientId)
        .eq('date_plan', planDate)
        .limit(1)

      if (plans && plans.length > 0) {
        const planId = plans[0].id
        setExistingPlanId(planId)

        // Charger les repas + aliments
        const { data: repasData } = await supabase
          .from('plan_repas')
          .select('id, type, repas_aliments(id, aliment_id, quantite_g, ordre, aliments(*))')
          .eq('plan_id', planId)
          .order('ordre')

        const loaded = { petit_dej: [], dejeuner: [], diner: [], collation: [] }
        ;(repasData || []).forEach(r => {
          if (loaded[r.type]) {
            loaded[r.type] = (r.repas_aliments || [])
              .sort((a, b) => a.ordre - b.ordre)
              .map(ra => ({
                ...ra.aliments,
                quantite: ra.quantite_g,
                _ra_id: ra.id,
              }))
          }
        })
        setPlanItems(loaded)
      } else {
        setExistingPlanId(null)
        setPlanItems({ petit_dej: [], dejeuner: [], diner: [], collation: [] })
      }
    }
    loadPlan()
  }, [coachId, clientId, planDate])

  // Ajouter un aliment au repas actif
  const addAliment = (aliment) => {
    setPlanItems(prev => ({
      ...prev,
      [activeRepas]: [...prev[activeRepas], { ...aliment, quantite: 100 }],
    }))
  }

  // Modifier la quantité
  const updateQuantite = (repasType, index, newQty) => {
    setPlanItems(prev => ({
      ...prev,
      [repasType]: prev[repasType].map((item, i) =>
        i === index ? { ...item, quantite: Math.max(0, newQty) } : item
      ),
    }))
  }

  // Supprimer un aliment du repas
  const removeAliment = (repasType, index) => {
    setPlanItems(prev => ({
      ...prev,
      [repasType]: prev[repasType].filter((_, i) => i !== index),
    }))
  }

  // Calcul des macros pour un item
  const macrosForItem = (item) => {
    const ratio = (item.quantite || 0) / 100
    return {
      kcal: Math.round((item.kcal_100g || 0) * ratio),
      prot: Math.round((item.proteines || 0) * ratio * 10) / 10,
      gluc: Math.round((item.glucides || 0) * ratio * 10) / 10,
      lip: Math.round((item.lipides || 0) * ratio * 10) / 10,
    }
  }

  // Totaux par repas
  const repasTotal = (type) => {
    return (planItems[type] || []).reduce(
      (acc, item) => {
        const m = macrosForItem(item)
        return { kcal: acc.kcal + m.kcal, prot: acc.prot + m.prot, gluc: acc.gluc + m.gluc, lip: acc.lip + m.lip }
      },
      { kcal: 0, prot: 0, gluc: 0, lip: 0 }
    )
  }

  // Total général
  const totalMacros = Object.keys(planItems).reduce(
    (acc, type) => {
      const t = repasTotal(type)
      return { kcal: acc.kcal + t.kcal, prot: acc.prot + t.prot, gluc: acc.gluc + t.gluc, lip: acc.lip + t.lip }
    },
    { kcal: 0, prot: 0, gluc: 0, lip: 0 }
  )

  // Filtrage
  const filteredAliments = aliments.filter(a => {
    const matchSearch = a.nom.toLowerCase().includes(searchAliment.toLowerCase())
    const matchCat = catFilter === 'Tous' || a.categorie === catFilter
    return matchSearch && matchCat
  })

  // Sauvegarder le plan
  const sauvegarderPlan = async () => {
    setSaving(true)
    try {
      let planId = existingPlanId

      if (planId) {
        // Supprimer les anciens repas (cascade supprime les repas_aliments)
        await supabase.from('plan_repas').delete().eq('plan_id', planId)
      } else {
        const { data, error } = await supabase
          .from('client_nutrition_plans')
          .insert({ coach_id: coachId, client_id: clientId, date_plan: planDate, nom: 'Plan du jour' })
          .select()
          .single()
        if (error) throw error
        planId = data.id
        setExistingPlanId(planId)
      }

      // Insérer les repas
      for (const type of Object.keys(planItems)) {
        const items = planItems[type]
        if (items.length === 0) continue

        const { data: repasRow, error: rErr } = await supabase
          .from('plan_repas')
          .insert({ plan_id: planId, type, ordre: REPAS_TYPES.findIndex(r => r.id === type) })
          .select()
          .single()

        if (rErr) throw rErr

        const rows = items.map((item, idx) => ({
          repas_id: repasRow.id,
          aliment_id: item.id,
          quantite_g: item.quantite,
          ordre: idx,
        }))
        await supabase.from('repas_aliments').insert(rows)
      }

      toast.success('Plan nutritionnel sauvegardé !')
    } catch (err) {
      console.error('Erreur sauvegarde plan:', err)
      toast.error('Erreur lors de la sauvegarde.')
    }
    setSaving(false)
  }

  // Drawer pour ajouter un aliment
  const [alimentDrawerOpen, setAlimentDrawerOpen] = useState(false)
  const [alimentDrawerTarget, setAlimentDrawerTarget] = useState('petit_dej')

  const openAlimentDrawer = (repasType) => {
    setAlimentDrawerTarget(repasType)
    setAlimentDrawerOpen(true)
    setSearchAliment('')
    setCatFilter('Tous')
  }

  const addAlimentFromDrawer = (aliment) => {
    setPlanItems(prev => ({
      ...prev,
      [alimentDrawerTarget]: [...prev[alimentDrawerTarget], { ...aliment, quantite: 100 }],
    }))
  }

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
            <p className="text-[#F5F5F3] text-sm font-bold leading-none">{Math.round(value)}</p>
            <p className="text-white/20 text-[8px]">{unit}</p>
          </div>
        </div>
        <p className="text-white/40 text-[10px] font-medium mt-1.5">{label}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {/* ── Header : Date + Save ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)}
            className="bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-[#F5F5F3] text-xs font-medium focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
          <p className="text-white/25 text-xs">Plan de {clientName}</p>
        </div>
        <button onClick={sauvegarderPlan} disabled={saving || totalMacros.kcal === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-xs font-semibold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-40 shadow-lg shadow-[#FF6B2B]/20">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      {/* ── Macro Rings — Apple Health style ── */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6">
        <div className="flex items-center justify-around">
          <MacroRing value={totalMacros.kcal} max={2200} color="#FF6B2B" label="Calories" unit="kcal" size={100} />
          <MacroRing value={totalMacros.prot} max={150} color="#3b82f6" label="Protéines" unit="g" size={80} />
          <MacroRing value={totalMacros.gluc} max={250} color="#f59e0b" label="Glucides" unit="g" size={80} />
          <MacroRing value={totalMacros.lip} max={80} color="#ef4444" label="Lipides" unit="g" size={80} />
        </div>
      </div>

      {/* ── Cartes repas ── */}
      {REPAS_TYPES.map(repas => {
        const items = planItems[repas.id] || []
        const total = repasTotal(repas.id)
        const RepasIcon = repas.icon
        return (
          <div key={repas.id} className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden">
            {/* Header repas */}
            <div className="px-5 py-3.5 border-b border-[#27272a] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center">
                  <RepasIcon size={15} className="text-[#FF6B2B]" />
                </div>
                <div>
                  <h3 className="text-[#F5F5F3] text-sm font-bold">{repas.label}</h3>
                  {total.kcal > 0 && (
                    <p className="text-white/25 text-[10px]">{total.kcal} kcal • P{total.prot}g • G{total.gluc}g • L{total.lip}g</p>
                  )}
                </div>
              </div>
              <button onClick={() => openAlimentDrawer(repas.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-semibold hover:bg-[#FF6B2B]/20 transition-colors">
                <Plus size={12} /> Ajouter
              </button>
            </div>

            {/* Liste aliments */}
            <div className="px-5 py-3">
              {items.length === 0 ? (
                <button onClick={() => openAlimentDrawer(repas.id)}
                  className="w-full py-5 border border-dashed border-[#27272a] rounded-xl text-white/15 text-xs hover:border-[#FF6B2B]/20 hover:text-[#FF6B2B]/40 transition-all flex items-center justify-center gap-2">
                  <Plus size={14} /> Ajouter un aliment
                </button>
              ) : (
                <div className="space-y-1.5">
                  {items.map((item, idx) => {
                    const m = macrosForItem(item)
                    return (
                      <div key={`${item.id}-${idx}`} className="flex items-center gap-3 py-2 group">
                        <div className={`w-7 h-7 rounded-lg ${FoodIconBg(item.categorie)} flex items-center justify-center flex-shrink-0`}>
                          <FoodIcon categorie={item.categorie} size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#F5F5F3] text-xs font-medium truncate">{item.nom}</p>
                          <p className="text-white/20 text-[10px]">{m.kcal} kcal</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => updateQuantite(repas.id, idx, item.quantite - 25)}
                            className="w-5 h-5 rounded bg-[#27272a] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors">
                            <Minus size={10} />
                          </button>
                          <span className="text-[#F5F5F3] text-[10px] font-semibold w-10 text-center">{item.quantite}g</span>
                          <button onClick={() => updateQuantite(repas.id, idx, item.quantite + 25)}
                            className="w-5 h-5 rounded bg-[#27272a] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors">
                            <Plus size={10} />
                          </button>
                        </div>
                        <button onClick={() => removeAliment(repas.id, idx)}
                          className="p-1 rounded text-white/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* ══════════════════════════════════════ */}
      {/* DRAWER — Bibliothèque d'aliments      */}
      {/* ══════════════════════════════════════ */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] bg-[#09090b] border-l border-[#27272a] shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
        alimentDrawerOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {alimentDrawerOpen && (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#27272a] flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#F5F5F3] text-sm font-bold">Ajouter un aliment</h3>
                <button onClick={() => setAlimentDrawerOpen(false)} className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all">
                  <X size={18} />
                </button>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                <input type="text" value={searchAliment} onChange={e => setSearchAliment(e.target.value)}
                  placeholder="Rechercher un aliment..." autoFocus
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-9 pr-4 py-2.5 text-[#F5F5F3] text-xs placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
              </div>
              {/* Catégories */}
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {ALIMENT_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setCatFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                      catFilter === cat ? 'bg-[#FF6B2B] text-white' : 'bg-[#18181b] text-white/30 hover:text-white/50'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
              {loadingAliments ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-white/10" />
                </div>
              ) : filteredAliments.length === 0 ? (
                <p className="text-white/15 text-xs text-center py-8">Aucun aliment trouvé</p>
              ) : (
                filteredAliments.map(aliment => (
                  <button key={aliment.id} onClick={() => addAlimentFromDrawer(aliment)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#18181b] transition-colors text-left group">
                    <div className={`w-8 h-8 rounded-lg ${FoodIconBg(aliment.categorie)} flex items-center justify-center flex-shrink-0`}>
                      <FoodIcon categorie={aliment.categorie} size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#F5F5F3] text-xs font-medium truncate">{aliment.nom}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#FF6B2B] font-bold">{aliment.kcal_100g}kcal</span>
                        <span className="text-[10px] text-blue-400/60">P{aliment.proteines}</span>
                        <span className="text-[10px] text-amber-400/60">G{aliment.glucides}</span>
                        <span className="text-[10px] text-rose-400/60">L{aliment.lipides}</span>
                      </div>
                    </div>
                    <Plus size={14} className="text-[#FF6B2B] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
      {alimentDrawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setAlimentDrawerOpen(false)} />
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

  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [editingSeanceId, setEditingSeanceId] = useState(null)

  // Stats du client sélectionné
  const [habitudes, setHabitudes] = useState([])
  const [objectifs, setObjectifs] = useState([])
  const [score, setScore] = useState(0)

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
    const { data } = await supabase
      .from('clients')
      .select('id, created_at, actif, profiles(nom, prenom, email, avatar_url)')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })

    const cl = (data || []).map((c, i) => ({
      ...c,
      couleurAvatar: AVATAR_COLORS[i % AVATAR_COLORS.length],
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
        supabase.from('habitudes').select('id, nom, couleur').eq('client_id', selectedId).eq('actif', true),
        supabase.from('objectifs').select('*').eq('client_id', selectedId).eq('archive', false),
        supabase.from('habitudes_log').select('habitude_id').eq('client_id', selectedId).eq('date', today),
        supabase.from('sommeil_log').select('*').eq('client_id', selectedId).eq('date', today).maybeSingle(),
        supabase.from('humeur_log').select('*').eq('client_id', selectedId).eq('date', today).maybeSingle(),
      ])

      setSelectedProfile(profileRes.data)
      setSelectedClient(clientRes.data)

      const habs = habsRes.data || []
      const cochees = (logsRes.data || []).length
      setHabitudes(habs)
      setObjectifs(objsRes.data || [])

      const s = calculerScoreBienEtre({
        habitudes: { cochees, total: habs.length },
        sommeil: sommeilRes.data,
        humeur: humeurRes.data,
        sport: null,
      })
      setScore(s)
      setLoadingProfile(false)
    }
    load()
  }, [selectedId, today])

  // ── Invitation ──
  const envoyerInvitation = async (e) => {
    e.preventDefault()
    setEnvoi(true)
    setInvitError('')
    try {
      const { data, error } = await supabase
        .from('invitations')
        .insert({ coach_id: user.id, email: invitEmail.trim() })
        .select()
        .single()
      if (error) {
        setInvitError(error.message?.includes('duplicate')
          ? 'Une invitation a déjà été envoyée à cet email.'
          : 'Erreur lors de l\'invitation.')
        setEnvoi(false)
        return
      }
      if (data) {
        const lien = `${window.location.origin}/invite/${data.token}`
        setInvitSuccess({ email: invitEmail, lien, prenom: invitPrenom })
        setInvitEmail('')
        setInvitPrenom('')
      }
    } catch {
      setInvitError('Erreur réseau.')
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
    <div className="flex flex-col md:flex-row h-[calc(100vh-3.5rem)] overflow-hidden">

      {/* ══════════════════════════════════════ */}
      {/* SIDEBAR — Liste des clients           */}
      {/* ══════════════════════════════════════ */}
      <div className={`${selectedId ? 'hidden md:flex' : 'flex'} w-full md:w-72 flex-shrink-0 bg-[#09090b] border-r border-[#27272a] flex-col overflow-hidden`}>

        {/* Header */}
        <div className="p-4 border-b border-[#27272a]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[#F5F5F3] font-semibold text-sm">Clients</h2>
            <button
              onClick={() => { setModalInvit(true); setInvitSuccess(null); setInvitError('') }}
              className="p-1.5 rounded-lg bg-[#FF6B2B]/10 text-[#FF6B2B] hover:bg-[#FF6B2B]/20 transition-colors"
            >
              <UserPlus size={14} />
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/15" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un client..."
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-8 pr-3 py-2 text-xs text-[#F5F5F3] placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
            />
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {clientsFiltres.length === 0 ? (
            <div className="p-6 text-center">
              <User size={24} className="text-white/10 mx-auto mb-2" />
              <p className="text-white/20 text-xs">Aucun client</p>
            </div>
          ) : (
            clientsFiltres.map((c) => {
              const isSelected = selectedId === c.id
              const name = [c.profiles?.prenom, c.profiles?.nom].filter(Boolean).join(' ') || c.profiles?.email || '?'
              const ini = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

              return (
                <button
                  key={c.id}
                  onClick={() => { setSelectedId(c.id); setActiveTab('overview'); setEditingSeanceId(null) }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                    isSelected
                      ? 'bg-[#18181b] border-l-2 border-[#FF6B2B]'
                      : 'border-l-2 border-transparent hover:bg-[#18181b]/50'
                  }`}
                >
                  {/* Avatar */}
                  {c.profiles?.avatar_url ? (
                    <img src={c.profiles.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                      style={{ backgroundColor: c.couleurAvatar }}>
                      {ini}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-[#F5F5F3]' : 'text-white/50'}`}>
                      {name}
                    </p>
                    <p className="text-white/20 text-[10px] truncate">{c.profiles?.email}</p>
                  </div>

                  {/* Pastille actif */}
                  {c.actif && (
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* ZONE PRINCIPALE — Dashboard client    */}
      {/* ══════════════════════════════════════ */}
      <div className={`${selectedId ? 'flex' : 'hidden md:flex'} flex-1 overflow-y-auto bg-[#18181b] flex-col`}>
        {!selectedId || loadingProfile ? (
          <div className="flex items-center justify-center h-full">
            {loadingProfile ? (
              <Loader2 size={24} className="animate-spin text-[#FF6B2B]" />
            ) : (
              <div className="text-center">
                <User size={40} className="text-white/10 mx-auto mb-3" />
                <p className="text-white/20 text-sm">Sélectionnez un client</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 md:p-6 space-y-6">

            {/* ── Bouton retour mobile ── */}
            <button
              onClick={() => setSelectedId(null)}
              className="md:hidden flex items-center gap-2 text-white/40 text-sm hover:text-white transition-colors -mb-2"
            >
              <ChevronLeft size={16} /> Retour aux clients
            </button>

            {/* ── En-tête client ── */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Gros avatar */}
                {p?.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[#FF6B2B] flex items-center justify-center">
                    <span className="text-white text-xl font-bold">{initials}</span>
                  </div>
                )}
                <div>
                  <h2 className="text-[#F5F5F3] text-2xl font-bold">{fullName}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    {/* Badge actif + toggle */}
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <div className={`w-2 h-2 rounded-full ${selectedClient?.actif ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={selectedClient?.actif ? 'text-green-400' : 'text-red-400'}>
                        {selectedClient?.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </span>
                    {/* Score */}
                    <span className="text-xs font-bold" style={{ color: couleurScore(score) }}>
                      {score}/100
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-[#27272a] transition-colors">
                  <MessageCircle size={17} />
                </button>
                <button className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-[#27272a] transition-colors">
                  <Settings size={17} />
                </button>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'text-[#F5F5F3]'
                        : 'text-white/35 hover:text-white/60'
                    }`}
                  >
                    {tab.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FF6B2B]" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* ── Contenu "Vue d'ensemble" ── */}
            {activeTab === 'overview' && (
              <div className="space-y-5">

                {/* ── Données de suivi — 6 cartes avec sparklines ── */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  {[
                    { icon: Scale, label: 'Poids', value: (p?.poids_actuel || p?.poids_depart) ? `${p.poids_actuel || p.poids_depart} kg` : '—', spark: [80,79,78.5,78,77.8,77.5,77], color: '#FF6B2B' },
                    { icon: Heart, label: 'IMC', value: imc || '—', sub: imc ? (imc < 18.5 ? 'Insuffisant' : imc < 25 ? 'Normal' : imc < 30 ? 'Surpoids' : 'Obésité') : null, spark: [26,25.5,25,24.8,24.5,24.3,24], color: '#FF6B2B' },
                    { icon: Flame, label: 'Calories', value: p?.calories_cibles ? `${p.calories_cibles}` : '—', sub: 'kcal/j', spark: [2000,2100,1950,2000,2050,2000,2100], color: '#f59e0b' },
                    { icon: Activity, label: 'Activité', value: p?.niveau_activite || '—', spark: [3,5,4,6,5,7,6], color: '#22c55e' },
                    { icon: Dumbbell, label: 'Séances', value: '—', sub: 'cette sem.', spark: [2,3,2,4,3,3,4], color: '#3b82f6' },
                    { icon: Target, label: 'Objectifs', value: `${objectifs.length}`, sub: 'actifs', spark: [1,1,2,2,3,3,3], color: '#a855f7' },
                  ].map((card, ci) => (
                    <div key={ci} className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 flex flex-col justify-between min-h-[120px]">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white/30 text-[10px] font-medium uppercase tracking-wider">{card.label}</p>
                          <p className="text-[#F5F5F3] text-lg font-bold mt-1">{card.value}</p>
                          {card.sub && <p className="text-white/20 text-[10px]">{card.sub}</p>}
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center">
                          <card.icon size={14} className="text-white/20" />
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
                          const min = Math.min(...d) - 0.5
                          const max = Math.max(...d) + 0.5
                          const pts = d.map((v, i) => `${(i / (d.length - 1)) * 100},${24 - ((v - min) / (max - min)) * 20}`)
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

                  {/* Carte Poids — Départ → Cible */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-[#F5F5F3] text-sm font-bold flex items-center gap-2">
                        <Scale size={15} className="text-[#FF6B2B]" />
                        Poids
                      </h3>
                      <button onClick={() => setActiveTab('suivi')} className="text-[10px] text-[#FF6B2B] font-semibold hover:text-[#FF9A6C] transition-colors">
                        Voir le suivi →
                      </button>
                    </div>
                    <div className="bg-[#09090b] rounded-xl p-4 flex items-center">
                      <div className="flex-1 text-center">
                        <p className="text-white/25 text-[10px] uppercase tracking-wider mb-1">Poids de départ</p>
                        <p className="text-[#F5F5F3] text-2xl font-bold">{p?.poids_depart || '—'}<span className="text-sm text-white/20 ml-1">kg</span></p>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 shrink-0">
                        <div className="w-6 h-[1.5px] bg-[#27272a]" />
                        <div className="w-6 h-6 rounded-full bg-[#FF6B2B]/10 flex items-center justify-center">
                          <ChevronRight size={12} className="text-[#FF6B2B]" />
                        </div>
                        <div className="w-6 h-[1.5px] bg-[#27272a]" />
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-white/25 text-[10px] uppercase tracking-wider mb-1">Poids cible</p>
                        <p className="text-[#FF6B2B] text-2xl font-bold">{p?.poids_cible || '—'}<span className="text-sm text-[#FF6B2B]/40 ml-1">kg</span></p>
                      </div>
                    </div>
                    {p?.poids_depart && p?.poids_cible && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-white/25 text-[10px]">Progression</span>
                          <span className="text-[#FF6B2B] text-[10px] font-bold">
                            {Math.min(100, Math.max(0, Math.round(((p.poids_depart - (p.poids_actuel || p.poids_depart)) / (p.poids_depart - p.poids_cible)) * 100)))}%
                          </span>
                        </div>
                        <div className="h-2 bg-[#27272a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C] transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, ((p.poids_depart - (p.poids_actuel || p.poids_depart)) / (p.poids_depart - p.poids_cible)) * 100))}%` }} />
                        </div>
                        <p className="text-white/15 text-[10px] mt-1.5">Poids actuel : <span className="text-[#F5F5F3] font-semibold">{p.poids_actuel || p.poids_depart} kg</span></p>
                      </div>
                    )}
                  </div>

                  {/* Carte Objectifs */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[#F5F5F3] text-sm font-bold flex items-center gap-2">
                        <Target size={15} className="text-[#FF6B2B]" />
                        Objectifs
                      </h3>
                      {p?.objectif_type && (
                        <span className="text-[9px] px-2.5 py-1 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-bold">{p.objectif_type}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-[#09090b] rounded-xl p-3.5">
                        <p className="text-white/25 text-[10px] uppercase tracking-wider mb-0.5">Début coaching</p>
                        <p className="text-[#F5F5F3] text-sm font-semibold">
                          {selectedClient?.created_at
                            ? new Date(selectedClient.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                            : '—'}
                        </p>
                      </div>
                      <div className="bg-[#09090b] rounded-xl p-3.5">
                        <p className="text-white/25 text-[10px] uppercase tracking-wider mb-0.5">Échéance</p>
                        <p className="text-[#F5F5F3] text-sm font-semibold">
                          {p?.date_echeance
                            ? new Date(p.date_echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                            : '—'}
                        </p>
                      </div>
                    </div>
                    {objectifs.length > 0 ? (
                      <div className="space-y-3">
                        {objectifs.slice(0, 3).map((o) => (
                          <div key={o.id}>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[#F5F5F3] text-xs font-medium truncate">{o.titre}</p>
                              <span className="text-[#FF6B2B] text-[10px] font-bold ml-2">{o.score || 0}%</span>
                            </div>
                            <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-[#FF6B2B] transition-all" style={{ width: `${o.score || 0}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/15 text-xs text-center py-4">Aucun objectif défini</p>
                    )}
                  </div>
                </div>

                {/* ── Row: Nutrition + Habitudes ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                  {/* Carte Nutrition recap */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[#F5F5F3] text-sm font-bold flex items-center gap-2">
                        <Apple size={15} className="text-[#FF6B2B]" />
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
                            <p className="text-[#F5F5F3] text-sm font-bold">{p?.calories_cibles || '—'}</p>
                            <p className="text-white/20 text-[8px]">kcal</p>
                          </div>
                        </div>
                      </div>
                      {/* Macros */}
                      <div className="flex-1 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-white/40 text-xs">Protéines</span>
                          </div>
                          <span className="text-[#F5F5F3] text-xs font-semibold">{p?.proteines_cibles || 30}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-white/40 text-xs">Glucides</span>
                          </div>
                          <span className="text-[#F5F5F3] text-xs font-semibold">{p?.glucides_cibles || 40}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-white/40 text-xs">Lipides</span>
                          </div>
                          <span className="text-[#F5F5F3] text-xs font-semibold">{p?.lipides_cibles || 30}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Carte Habitudes */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[#F5F5F3] text-sm font-bold flex items-center gap-2">
                        <Flame size={15} className="text-[#FF6B2B]" />
                        Habitudes actives
                      </h3>
                      <span className="text-[9px] px-2.5 py-1 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-bold">{habitudes.length}</span>
                    </div>
                    {habitudes.length === 0 ? (
                      <p className="text-white/15 text-xs text-center py-6">Aucune habitude active</p>
                    ) : (
                      <div className="space-y-2">
                        {habitudes.map((h) => (
                          <div key={h.id} className="flex items-center gap-3 bg-[#09090b] rounded-xl px-3.5 py-2.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: h.couleur }} />
                            <span className="text-[#F5F5F3] text-xs font-medium flex-1 truncate">{h.nom}</span>
                            <span className="text-white/15 text-[10px]">Quotidien</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Programmes assignés ── */}
                <ClientProgrammesSection clientId={selectedId} coachId={user?.id} />

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

            {/* ── Onglet Sport — Éditeur de séances ── */}
            {activeTab === 'sport' && (
              <SportTab
                clientName={fullName}
                coachId={user?.id}
                clientId={selectedId}
                editingSeanceId={editingSeanceId}
                onSeanceSaved={() => {}}
                onClearEditing={() => setEditingSeanceId(null)}
              />
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

            {/* ── Placeholder pour les autres onglets ── */}
            {activeTab !== 'overview' && activeTab !== 'sport' && activeTab !== 'calendar' && activeTab !== 'nutrition' && activeTab !== 'infos' && activeTab !== 'suivi' && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <BarChart3 size={36} className="text-white/10 mx-auto mb-3" />
                  <p className="text-white/20 text-sm">
                    Onglet « {TABS.find(t => t.id === activeTab)?.label} » — bientôt disponible
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
              <label className="block text-sm text-white/50 mb-1.5">Prénom du client</label>
              <input type="text" value={invitPrenom} onChange={(e) => setInvitPrenom(e.target.value)}
                placeholder="Lucas" autoFocus
                className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1.5">Email</label>
              <input type="email" value={invitEmail} onChange={(e) => setInvitEmail(e.target.value)}
                placeholder="lucas@exemple.com" required
                className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors" />
            </div>
            {invitError && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{invitError}</p>
            )}
            <p className="text-white/20 text-xs">Un lien d'invitation valable 7 jours sera généré.</p>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setModalInvit(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-white/40 bg-[#27272a] hover:bg-[#3f3f46] transition-colors">
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
              <p className="text-green-400 text-sm font-medium">✓ Invitation créée !</p>
              <p className="text-white/30 text-xs mt-1">Envoyez ce lien à {invitSuccess.prenom || invitSuccess.email} :</p>
            </div>
            <div className="bg-[#09090b] rounded-lg p-3">
              <p className="text-[#FF6B2B] text-xs font-mono break-all">{invitSuccess.lien}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(invitSuccess.lien); toast.success('Lien copie !') }}
              className="w-full py-2.5 rounded-xl text-sm text-white/40 bg-[#27272a] hover:bg-[#3f3f46] transition-colors">
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
