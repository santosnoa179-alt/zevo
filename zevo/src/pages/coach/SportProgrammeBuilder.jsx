import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import Ring from '../../components/ui/Ring'
import {
  ArrowLeft, Save, Plus, Trash2, Loader2, Calendar,
  Target, Users, Dumbbell, Moon, Flame, Activity, Heart, Zap,
  ChevronDown, ChevronRight, Layers, X, Edit3, Copy,
  BookmarkPlus, Book, Minus, Search, Package,
  TrendingUp, Clock, StickyNote, GripVertical, Link2 as LinkIcon
} from 'lucide-react'

// ══════════════════════════════════════════════════════
// Constantes
// ══════════════════════════════════════════════════════
const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const FOCUS_OPTIONS = [
  { id: 'push',      label: 'Push',      icon: Dumbbell, color: '#FF6B2B' },
  { id: 'pull',      label: 'Pull',      icon: Dumbbell, color: '#FF9A6C' },
  { id: 'legs',      label: 'Legs',      icon: Dumbbell, color: '#FFCBA4' },
  { id: 'upper',     label: 'Upper',     icon: Dumbbell, color: '#64748b' },
  { id: 'lower',     label: 'Lower',     icon: Dumbbell, color: '#475569' },
  { id: 'fullbody',  label: 'Full body', icon: Activity, color: '#FF6B2B' },
  { id: 'cardio',    label: 'Cardio',    icon: Heart,    color: '#9ca3af' },
  { id: 'mobility',  label: 'Mobilité',  icon: Activity, color: '#9ca3af' },
  { id: 'repos',     label: 'Repos',     icon: Moon,     color: '#64748b' },
]

const OBJECTIF_FOCUS = [
  { id: 'hypertrophie', label: 'Hypertrophie' },
  { id: 'force',        label: 'Force' },
  { id: 'puissance',    label: 'Puissance' },
  { id: 'endurance',    label: 'Endurance' },
  { id: 'deload',       label: 'Deload' },
  { id: 'peak',         label: 'Peaking' },
]

// Lettres utilisées pour grouper les exercices en superset (A enchaîné avec A, etc.)
const SUPERSET_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

const PROGRESSION_TYPES = [
  { id: 'fixe',        label: 'Fixe',         desc: 'Même charge toutes les semaines' },
  { id: 'lineaire',    label: 'Linéaire',     desc: '+X kg par semaine' },
  { id: 'double',      label: 'Double',       desc: 'Monter les reps avant la charge' },
  { id: 'pourcentage', label: '% du 1RM',     desc: 'Varie en % par semaine' },
]

// ── Traduction FR des catégories ExerciseDB (en anglais brut en DB) ──
const BODY_PART_FR = {
  'back':         'Dos',
  'cardio':       'Cardio',
  'chest':        'Pectoraux',
  'lower arms':   'Avant-bras',
  'lower legs':   'Mollets',
  'neck':         'Nuque',
  'shoulders':    'Épaules',
  'upper arms':   'Bras',
  'upper legs':   'Cuisses',
  'waist':        'Abdos',
}
const TARGET_MUSCLE_FR = {
  'abductors':      'Abducteurs',
  'abs':            'Abdos',
  'adductors':      'Adducteurs',
  'biceps':         'Biceps',
  'calves':         'Mollets',
  'cardiovascular system': 'Cardio',
  'delts':          'Deltoïdes',
  'forearms':       'Avant-bras',
  'glutes':         'Fessiers',
  'hamstrings':     'Ischios',
  'lats':           'Grand dorsal',
  'levator scapulae': 'Trapèze sup.',
  'pectorals':      'Pectoraux',
  'quads':          'Quadriceps',
  'serratus anterior': 'Dentelé',
  'spine':          'Lombaires',
  'traps':          'Trapèzes',
  'triceps':        'Triceps',
  'upper back':     'Haut du dos',
}
const EQUIPMENT_FR = {
  'body weight':      'Poids du corps',
  'barbell':          'Barre',
  'dumbbell':         'Haltères',
  'cable':            'Poulie',
  'leverage machine': 'Machine',
  'smith machine':    'Smith',
  'sled machine':     'Presse',
  'kettlebell':       'Kettlebell',
  'medicine ball':    'Med ball',
  'stability ball':   'Swiss ball',
  'resistance band':  'Élastique',
  'band':             'Élastique',
  'bosu ball':        'Bosu',
  'ez barbell':       'Barre EZ',
  'weighted':         'Lesté',
  'rope':             'Corde',
  'roller':           'Rouleau',
  'wheel roller':     'Roue',
  'stationary bike':  'Vélo',
  'elliptical machine': 'Elliptique',
  'stepmill machine': 'Stepmill',
  'skierg machine':   'Skierg',
  'upper body ergometer': 'Ergo bras',
  'trap bar':         'Trap bar',
  'hammer':           'Marteau',
  'assisted':         'Assisté',
  'olympic barbell':  'Barre olympique',
}
function frBodyPart(s) { return BODY_PART_FR[s?.toLowerCase()] || s || '—' }
function frTarget(s)   { return TARGET_MUSCLE_FR[s?.toLowerCase()] || s || '—' }
function frEquip(s)    { return EQUIPMENT_FR[s?.toLowerCase()] || s || '' }

// Calcul charge à une semaine donnée (Piste B)
function chargeAtWeek(baseCharge, progressionType, progressionValue, weekIdx) {
  if (!baseCharge || !progressionType || progressionType === 'fixe' || !progressionValue) return baseCharge || 0
  const weeksSince = Math.max(0, weekIdx)
  if (progressionType === 'lineaire') return +baseCharge + (+progressionValue * weeksSince)
  if (progressionType === 'pourcentage') return +baseCharge * Math.pow(1 + (+progressionValue / 100), weeksSince)
  if (progressionType === 'double') return baseCharge // La double progression demande un tracking reps, on affiche la base
  return baseCharge
}

// Volume d'un exercice : séries × reps × charge (reps pris moyen si range)
function volumeOfExo(exo) {
  const sets = +exo.series || 0
  const charge = +exo.charge_kg || 0
  const repsStr = (exo.reps_cible || '').toString()
  // Extraire le premier nombre ou la moyenne d'un range
  const nums = repsStr.match(/\d+/g)
  if (!nums) return 0
  const avgReps = nums.length >= 2 ? (parseInt(nums[0]) + parseInt(nums[1])) / 2 : parseInt(nums[0])
  return sets * avgReps * charge
}

// ══════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════
export default function SportProgrammeBuilder() {
  const { programmeId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const isNew = !programmeId

  // ── Programme state ──
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [programme, setProgramme] = useState({
    nom: '',
    description: '',
    objectif: '',
    duree_semaines: 8,
    frequence_hebdo: 4,
    niveau: 'intermediaire',
    is_template: true,
    is_active: true,
    client_id: null,
  })

  const [phases, setPhases] = useState([])
  const [activePhaseIdx, setActivePhaseIdx] = useState(0)
  const [activeSeanceTypeIdx, setActiveSeanceTypeIdx] = useState(0)

  const [clients, setClients] = useState([])
  const [exercises, setExercises] = useState([])

  // ── IDs à supprimer ──
  const [deletedPhaseIds, setDeletedPhaseIds] = useState([])
  const [deletedSeanceTypeIds, setDeletedSeanceTypeIds] = useState([])
  const [deletedExoIds, setDeletedExoIds] = useState([])

  // ── Drawers ──
  const [exoDrawer, setExoDrawer] = useState(null)        // { seanceTypeIdx } pour ajouter un exo
  const [exoSearch, setExoSearch] = useState('')
  const [exoMuscleFilter, setExoMuscleFilter] = useState('')        // body_part (Dos, Pectoraux...)
  const [exoTargetFilter, setExoTargetFilter] = useState('')        // target_muscle (Grand dorsal, Biceps...)
  const [exoEquipFilter, setExoEquipFilter] = useState('')          // equipment (Barre, Haltères, Poids du corps...)
  const [biblioRepas, setBiblioRepas] = useState([])      // Séances dans la biblio
  const [biblioDrawer, setBiblioDrawer] = useState(false)
  const [biblioSearch, setBiblioSearch] = useState('')
  const [materielOpen, setMaterielOpen] = useState(false) // liste de matériel

  // ══════════════════════════════════════════════════════
  // LOAD — clients, exercices, biblio
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    if (!user) return
    supabase
      .from('clients')
      .select('id, actif, profiles(id, nom, prenom, email)')
      .eq('coach_id', user.id)
      .eq('actif', true)
      .then(({ data }) => {
        const list = (data || [])
          .filter(c => c.profiles)
          .map(c => ({ id: c.profiles.id, nom: c.profiles.nom, prenom: c.profiles.prenom, email: c.profiles.email }))
        setClients(list)
      })

    // Exercices de référence (ExerciseDB : ~1500 exos avec GIFs)
    supabase
      .from('exercises')
      .select('id, name, name_fr, target_muscle, body_part, equipment, gif_url')
      .order('name')
      .limit(2000)
      .then(({ data }) => setExercises(data || []))

    // Bibliothèque de séances du coach
    supabase
      .from('sport_seances_biblio')
      .select('*, sport_seances_biblio_exercices(*, exercises(id, name, name_fr, target_muscle, body_part, equipment, gif_url))')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.warn('[SportBuilder] biblio err:', error.message)
        setBiblioRepas(data || [])
      })
  }, [user])

  // ══════════════════════════════════════════════════════
  // LOAD — programme existant
  // ══════════════════════════════════════════════════════
  const loadProgramme = useCallback(async () => {
    if (isNew || !user) return
    setLoading(true)

    const { data: prog, error: progErr } = await supabase
      .from('sport_programmes')
      .select('*')
      .eq('id', programmeId)
      .maybeSingle()

    if (progErr || !prog) {
      console.error('[SportBuilder] load prog err:', progErr)
      toast.error('Programme introuvable')
      navigate('/coach/sport')
      return
    }

    setProgramme({
      id: prog.id,
      nom: prog.nom || '',
      description: prog.description || '',
      objectif: prog.objectif || '',
      duree_semaines: prog.duree_semaines || 8,
      frequence_hebdo: prog.frequence_hebdo || 4,
      niveau: prog.niveau || 'intermediaire',
      is_template: prog.is_template ?? true,
      is_active: prog.is_active ?? true,
      client_id: prog.client_id,
    })

    const [phasesRes, seanceTypesRes, phaseJoursRes, exosRes] = await Promise.all([
      supabase.from('sport_phases').select('*').eq('programme_id', programmeId).order('ordre'),
      supabase.from('sport_seance_types').select('*, phase_id').order('ordre'),
      supabase.from('sport_phase_jours').select('*'),
      supabase.from('sport_seance_exercices').select('*, exercises(id, name, name_fr, target_muscle, body_part, equipment, gif_url)').order('ordre'),
    ])

    const allPhases = phasesRes.data || []
    const allSeanceTypes = seanceTypesRes.data || []
    const allPhaseJours = phaseJoursRes.data || []
    const allExos = (exosRes.data || []).map(e => ({
      ...e,
      exercice: e.exercises, // join (table `exercises` ExerciseDB)
    }))

    const structured = allPhases.map(ph => {
      const seanceTypes = allSeanceTypes
        .filter(st => st.phase_id === ph.id)
        .map(st => ({
          ...st,
          exercices: allExos.filter(ex => ex.seance_type_id === st.id),
        }))

      const phaseJours = {}
      for (let d = 0; d < 7; d++) {
        const pj = allPhaseJours.find(p => p.phase_id === ph.id && p.jour_semaine === d)
        phaseJours[d] = pj?.seance_type_id || null
      }

      return { ...ph, seance_types: seanceTypes, phase_jours: phaseJours }
    })

    setPhases(structured)
    setLoading(false)
  }, [isNew, user, programmeId, navigate, toast])

  useEffect(() => { loadProgramme() }, [loadProgramme])

  // Initialiser 1 phase par défaut pour un nouveau programme
  useEffect(() => {
    if (isNew && phases.length === 0 && !loading) {
      setPhases([{
        id: `new-phase-${Date.now()}`,
        nom: 'Phase 1',
        ordre: 1,
        semaine_debut: 1,
        duree_semaines: 4,
        objectif_focus: 'hypertrophie',
        volume_cible_hebdo_sets: null,
        notes: '',
        seance_types: [],
        phase_jours: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      }])
    }
  }, [isNew, phases.length, loading])

  const activePhase = phases[activePhaseIdx]
  const activeSeanceType = activePhase?.seance_types?.[activeSeanceTypeIdx]

  // ══════════════════════════════════════════════════════
  // PHASE ACTIONS
  // ══════════════════════════════════════════════════════
  const addPhase = () => {
    const lastPhase = phases[phases.length - 1]
    const nextStart = lastPhase ? lastPhase.semaine_debut + lastPhase.duree_semaines : 1
    setPhases([...phases, {
      id: `new-phase-${Date.now()}`,
      nom: `Phase ${phases.length + 1}`,
      ordre: phases.length + 1,
      semaine_debut: nextStart,
      duree_semaines: 4,
      objectif_focus: 'hypertrophie',
      volume_cible_hebdo_sets: null,
      notes: '',
      seance_types: [],
      phase_jours: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
    }])
    setActivePhaseIdx(phases.length)
    setActiveSeanceTypeIdx(0)
  }
  const updatePhase = (idx, field, value) => {
    setPhases(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }
  const removePhase = (idx) => {
    if (phases.length <= 1) { toast.error('Un programme doit avoir au moins 1 phase'); return }
    const phase = phases[idx]
    if (!phase.id.startsWith('new-')) setDeletedPhaseIds(ids => [...ids, phase.id])
    phase.seance_types.forEach(st => {
      if (!st.id.startsWith('new-')) setDeletedSeanceTypeIds(ids => [...ids, st.id])
      st.exercices?.forEach(e => { if (!e.id.startsWith('new-')) setDeletedExoIds(ids => [...ids, e.id]) })
    })
    setPhases(phases.filter((_, i) => i !== idx))
    setActivePhaseIdx(Math.max(0, idx - 1))
    setActiveSeanceTypeIdx(0)
  }

  // ══════════════════════════════════════════════════════
  // SÉANCE TYPE ACTIONS
  // ══════════════════════════════════════════════════════
  const addSeanceType = (preset = { nom: 'Nouvelle séance', focus: null, icon: 'dumbbell' }) => {
    const st = {
      id: `new-st-${Date.now()}`,
      phase_id: activePhase?.id,
      nom: preset.nom,
      focus: preset.focus,
      icon: preset.icon || 'dumbbell',
      ordre: (activePhase?.seance_types?.length || 0) + 1,
      duree_estimee_min: 60,
      notes: '',
      exercices: [],
    }
    setPhases(prev => prev.map((p, i) => i === activePhaseIdx ? { ...p, seance_types: [...p.seance_types, st] } : p))
    setActiveSeanceTypeIdx(activePhase?.seance_types?.length || 0)
  }

  const updateSeanceType = (stIdx, field, value) => {
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      return { ...p, seance_types: p.seance_types.map((st, k) => k === stIdx ? { ...st, [field]: value } : st) }
    }))
  }

  const removeSeanceType = (stIdx) => {
    const st = activePhase.seance_types[stIdx]
    if (!st.id.startsWith('new-')) setDeletedSeanceTypeIds(ids => [...ids, st.id])
    st.exercices?.forEach(e => { if (!e.id.startsWith('new-')) setDeletedExoIds(ids => [...ids, e.id]) })
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      const newPhaseJours = { ...p.phase_jours }
      for (let d = 0; d < 7; d++) if (newPhaseJours[d] === st.id) newPhaseJours[d] = null
      return {
        ...p,
        seance_types: p.seance_types.filter((_, k) => k !== stIdx),
        phase_jours: newPhaseJours,
      }
    }))
    setActiveSeanceTypeIdx(Math.max(0, stIdx - 1))
  }

  const assignSeanceTypeToDay = (dayIdx, seanceTypeId) => {
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      return { ...p, phase_jours: { ...p.phase_jours, [dayIdx]: seanceTypeId } }
    }))
  }

  const duplicateSeanceType = (stIdx) => {
    const st = activePhase.seance_types[stIdx]
    if (!st) return
    const cloned = {
      id: `new-st-${Date.now()}`,
      phase_id: activePhase.id,
      nom: `${st.nom} (copie)`,
      focus: st.focus,
      icon: st.icon,
      ordre: (activePhase.seance_types.length || 0) + 1,
      duree_estimee_min: st.duree_estimee_min,
      notes: st.notes,
      exercices: (st.exercices || []).map(e => ({
        ...e,
        id: `new-exo-${Date.now()}-${Math.random()}`,
      })),
    }
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      return { ...p, seance_types: [...p.seance_types, cloned] }
    }))
    setActiveSeanceTypeIdx(activePhase.seance_types.length)
    toast.success(`"${st.nom}" dupliqué`)
  }

  // ══════════════════════════════════════════════════════
  // EXERCICE ACTIONS
  // ══════════════════════════════════════════════════════
  const addExerciceToSeance = (exercice) => {
    if (!activeSeanceType) return
    const newExo = {
      id: `new-exo-${Date.now()}`,
      seance_type_id: activeSeanceType.id,
      exercice_id: exercice.id,
      exercice: exercice,
      exercice_nom_custom: null,
      ordre: (activeSeanceType.exercices?.length || 0) + 1,
      series: 3,
      reps_cible: '8-12',
      charge_kg: null,
      charge_unite: 'kg',
      progression_type: 'fixe',
      progression_value: null,
      progression_freq: 'semaine',
      rpe_cible: null,
      rir_cible: null,
      tempo: null,
      rest_sec: 90,
      superset_group: null,
      technique: null,
      notes_coach: null,
    }
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      return {
        ...p,
        seance_types: p.seance_types.map((st, k) => {
          if (k !== activeSeanceTypeIdx) return st
          return { ...st, exercices: [...(st.exercices || []), newExo] }
        }),
      }
    }))
    setExoDrawer(null)
  }

  const updateExo = (exoIdx, field, value) => {
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      return {
        ...p,
        seance_types: p.seance_types.map((st, k) => {
          if (k !== activeSeanceTypeIdx) return st
          return { ...st, exercices: st.exercices.map((e, m) => m === exoIdx ? { ...e, [field]: value } : e) }
        }),
      }
    }))
  }

  // Lie / délie un exercice avec celui qui le précède (superset).
  // Deux exos enchaînés partagent la même lettre de groupe.
  const toggleSupersetLink = (exoIdx) => {
    if (exoIdx === 0) return
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      return {
        ...p,
        seance_types: p.seance_types.map((st, k) => {
          if (k !== activeSeanceTypeIdx) return st
          const exos = [...st.exercices]
          const cur = exos[exoIdx]
          const before = exos[exoIdx - 1]
          const linked = cur.superset_group && cur.superset_group === before.superset_group
          if (linked) {
            // Délier l'exo courant ; si son ancien groupe ne contient plus qu'un
            // seul exo, on nettoie aussi cette lettre orpheline.
            const grp = cur.superset_group
            exos[exoIdx] = { ...cur, superset_group: null }
            const remaining = exos.filter(e => e.superset_group === grp)
            if (remaining.length === 1) {
              const orphan = exos.findIndex(e => e.superset_group === grp)
              exos[orphan] = { ...exos[orphan], superset_group: null }
            }
          } else {
            // Lier : rejoindre le groupe du précédent, ou en créer un nouveau.
            let grp = before.superset_group
            if (!grp) {
              const used = new Set(exos.map(e => e.superset_group).filter(Boolean))
              grp = SUPERSET_LETTERS.find(l => !used.has(l)) || 'A'
              exos[exoIdx - 1] = { ...before, superset_group: grp }
            }
            exos[exoIdx] = { ...cur, superset_group: grp }
          }
          return { ...st, exercices: exos }
        }),
      }
    }))
  }

  const removeExo = (exoIdx) => {
    const exo = activeSeanceType.exercices[exoIdx]
    if (!exo.id.startsWith('new-')) setDeletedExoIds(ids => [...ids, exo.id])
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      return {
        ...p,
        seance_types: p.seance_types.map((st, k) => {
          if (k !== activeSeanceTypeIdx) return st
          return { ...st, exercices: st.exercices.filter((_, m) => m !== exoIdx) }
        }),
      }
    }))
  }

  // ══════════════════════════════════════════════════════
  // BIBLIOTHÈQUE DE SÉANCES
  // ══════════════════════════════════════════════════════
  const saveSeanceToBiblio = async () => {
    if (!activeSeanceType) return
    if (!activeSeanceType.nom?.trim()) { toast.error('Nomme la séance avant de l\'enregistrer'); return }
    try {
      const { data: biblio, error } = await supabase
        .from('sport_seances_biblio')
        .insert({
          coach_id: user.id,
          nom: activeSeanceType.nom,
          focus: activeSeanceType.focus,
          icon: activeSeanceType.icon,
          duree_estimee_min: activeSeanceType.duree_estimee_min,
          notes: activeSeanceType.notes,
        })
        .select()
        .single()
      if (error) throw error

      if (activeSeanceType.exercices?.length) {
        const rows = activeSeanceType.exercices.map((e, i) => ({
          seance_biblio_id: biblio.id,
          exercice_id: e.exercice_id,
          exercice_nom_custom: e.exercice_nom_custom,
          ordre: i,
          series: +e.series || 3,
          reps_cible: e.reps_cible || '8-12',
          charge_kg: e.charge_kg || null,
          charge_unite: e.charge_unite || 'kg',
          progression_type: e.progression_type || 'fixe',
          progression_value: e.progression_value || null,
          progression_freq: e.progression_freq || 'semaine',
          rpe_cible: e.rpe_cible || null,
          rir_cible: e.rir_cible || null,
          tempo: e.tempo || null,
          rest_sec: e.rest_sec || 90,
          superset_group: e.superset_group || null,
          technique: e.technique || null,
          notes_coach: e.notes_coach || null,
        }))
        const { error: eErr } = await supabase.from('sport_seances_biblio_exercices').insert(rows)
        if (eErr) throw eErr
      }

      toast.success(`Séance "${activeSeanceType.nom}" ajoutée à ta bibliothèque`)
      const { data: refreshed } = await supabase
        .from('sport_seances_biblio')
        .select('*, sport_seances_biblio_exercices(*, exercises(id, name, name_fr, target_muscle, body_part, equipment, gif_url))')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })
      setBiblioRepas(refreshed || [])
    } catch (err) {
      console.error('[saveSeanceToBiblio]', err)
      toast.error('Erreur : ' + (err.message || err))
    }
  }

  const insertSeanceFromBiblio = (biblio) => {
    if (!activePhase) { toast.error('Sélectionne une phase d\'abord'); return }
    const exercices = (biblio.sport_seances_biblio_exercices || []).map(be => ({
      id: `new-exo-${Date.now()}-${Math.random()}`,
      exercice_id: be.exercice_id,
      exercice: be.exercises,
      exercice_nom_custom: be.exercice_nom_custom,
      ordre: be.ordre,
      series: be.series,
      reps_cible: be.reps_cible,
      charge_kg: be.charge_kg,
      charge_unite: be.charge_unite || 'kg',
      progression_type: be.progression_type || 'fixe',
      progression_value: be.progression_value,
      progression_freq: be.progression_freq || 'semaine',
      rpe_cible: be.rpe_cible,
      rir_cible: be.rir_cible,
      tempo: be.tempo,
      rest_sec: be.rest_sec || 90,
      superset_group: be.superset_group,
      technique: be.technique,
      notes_coach: be.notes_coach,
    }))
    const newSt = {
      id: `new-st-${Date.now()}`,
      phase_id: activePhase.id,
      nom: biblio.nom,
      focus: biblio.focus,
      icon: biblio.icon || 'dumbbell',
      ordre: (activePhase.seance_types?.length || 0) + 1,
      duree_estimee_min: biblio.duree_estimee_min || 60,
      notes: biblio.notes,
      exercices,
    }
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      return { ...p, seance_types: [...p.seance_types, newSt] }
    }))
    setActiveSeanceTypeIdx(activePhase.seance_types.length)
    setBiblioDrawer(false)
    toast.success(`"${biblio.nom}" ajoutée`)
  }

  const deleteFromBiblio = async (biblioId) => {
    if (!window.confirm('Supprimer cette séance de ta bibliothèque ?')) return
    const { error } = await supabase.from('sport_seances_biblio').delete().eq('id', biblioId)
    if (error) { toast.error('Erreur'); return }
    setBiblioRepas(prev => prev.filter(b => b.id !== biblioId))
  }

  // ══════════════════════════════════════════════════════
  // SAVE
  // ══════════════════════════════════════════════════════
  const handleSave = async () => {
    if (!programme.nom.trim()) { toast.error('Donne un nom au programme'); return }
    setSaving(true)

    try {
      const progPayload = {
        coach_id: user.id,
        client_id: programme.client_id || null,
        nom: programme.nom,
        description: programme.description || null,
        objectif: programme.objectif || null,
        duree_semaines: programme.duree_semaines,
        frequence_hebdo: programme.frequence_hebdo || null,
        niveau: programme.niveau || null,
        is_template: !programme.client_id,
        is_active: programme.is_active,
      }

      let progId = programme.id
      if (isNew && !progId) {
        const { data, error } = await supabase.from('sport_programmes').insert(progPayload).select().single()
        if (error) throw error
        progId = data.id
      } else {
        const { error } = await supabase.from('sport_programmes').update(progPayload).eq('id', progId)
        if (error) throw error
      }

      if (deletedExoIds.length) await supabase.from('sport_seance_exercices').delete().in('id', deletedExoIds)
      if (deletedSeanceTypeIds.length) await supabase.from('sport_seance_types').delete().in('id', deletedSeanceTypeIds)
      if (deletedPhaseIds.length) await supabase.from('sport_phases').delete().in('id', deletedPhaseIds)

      for (const phase of phases) {
        const phasePayload = {
          programme_id: progId,
          nom: phase.nom,
          ordre: phase.ordre,
          semaine_debut: phase.semaine_debut,
          duree_semaines: phase.duree_semaines,
          objectif_focus: phase.objectif_focus || null,
          volume_cible_hebdo_sets: phase.volume_cible_hebdo_sets || null,
          notes: phase.notes || null,
        }
        let phaseId = phase.id
        if (phase.id.startsWith('new-')) {
          const { data, error } = await supabase.from('sport_phases').insert(phasePayload).select().single()
          if (error) throw error
          phaseId = data.id
        } else {
          const { error } = await supabase.from('sport_phases').update(phasePayload).eq('id', phaseId)
          if (error) throw error
        }

        const stIdMap = {}
        for (const st of phase.seance_types) {
          const stPayload = {
            phase_id: phaseId,
            nom: st.nom,
            focus: st.focus || null,
            icon: st.icon || 'dumbbell',
            ordre: st.ordre,
            duree_estimee_min: st.duree_estimee_min || null,
            notes: st.notes || null,
          }
          let stId = st.id
          if (st.id.startsWith('new-')) {
            const { data, error } = await supabase.from('sport_seance_types').insert(stPayload).select().single()
            if (error) throw error
            stId = data.id
            stIdMap[st.id] = stId
          } else {
            const { error } = await supabase.from('sport_seance_types').update(stPayload).eq('id', stId)
            if (error) throw error
            stIdMap[st.id] = stId
          }

          // Exercices — delete + reinsert (upsert pattern)
          await supabase.from('sport_seance_exercices').delete().eq('seance_type_id', stId)
          if (st.exercices?.length) {
            const rows = st.exercices.map((e, ei) => ({
              seance_type_id: stId,
              exercice_id: e.exercice_id || null,
              exercice_nom_custom: e.exercice_nom_custom || null,
              ordre: ei,
              series: +e.series || 3,
              reps_cible: e.reps_cible || '8-12',
              charge_kg: e.charge_kg || null,
              charge_unite: e.charge_unite || 'kg',
              progression_type: e.progression_type || 'fixe',
              progression_value: e.progression_value || null,
              progression_freq: e.progression_freq || 'semaine',
              rpe_cible: e.rpe_cible || null,
              rir_cible: e.rir_cible || null,
              tempo: e.tempo || null,
              rest_sec: e.rest_sec || 90,
              superset_group: e.superset_group || null,
              technique: e.technique || null,
              notes_coach: e.notes_coach || null,
            }))
            const { error: exErr } = await supabase.from('sport_seance_exercices').insert(rows)
            if (exErr) throw exErr
          }
        }

        await supabase.from('sport_phase_jours').delete().eq('phase_id', phaseId)
        const phaseJoursRows = []
        for (let d = 0; d < 7; d++) {
          const raw = phase.phase_jours[d]
          const realId = raw && raw.startsWith?.('new-') ? stIdMap[raw] : raw
          if (realId) phaseJoursRows.push({ phase_id: phaseId, jour_semaine: d, seance_type_id: realId })
        }
        if (phaseJoursRows.length) {
          const { error } = await supabase.from('sport_phase_jours').insert(phaseJoursRows)
          if (error) throw error
        }
      }

      toast.success('Programme sauvegardé !')
      setDeletedPhaseIds([]); setDeletedSeanceTypeIds([]); setDeletedExoIds([])
      if (isNew) navigate(`/coach/sport/programme/${progId}`)
      else loadProgramme()
    } catch (err) {
      console.error('[SportBuilder] save err:', err)
      toast.error('Erreur : ' + (err.message || err))
    }
    setSaving(false)
  }

  // ══════════════════════════════════════════════════════
  // DÉRIVÉS
  // ══════════════════════════════════════════════════════
  const currentExos = activeSeanceType?.exercices || []
  const seanceStats = useMemo(() => {
    let totalSets = 0, totalVolume = 0
    currentExos.forEach(e => {
      totalSets += +e.series || 0
      totalVolume += volumeOfExo(e)
    })
    const duree = activeSeanceType?.duree_estimee_min || 0
    return { sets: totalSets, volume: Math.round(totalVolume), duree }
  }, [currentExos, activeSeanceType])

  // Volume hebdo = somme des volumes des séances types assignées dans la semaine
  const phaseVolumeHebdo = useMemo(() => {
    if (!activePhase) return 0
    let v = 0
    for (let d = 0; d < 7; d++) {
      const stId = activePhase.phase_jours[d]
      if (!stId) continue
      const st = activePhase.seance_types.find(s => s.id === stId)
      if (!st) continue
      st.exercices?.forEach(e => v += volumeOfExo(e))
    }
    return Math.round(v)
  }, [activePhase])

  const phaseSetsHebdo = useMemo(() => {
    if (!activePhase) return 0
    let s = 0
    for (let d = 0; d < 7; d++) {
      const stId = activePhase.phase_jours[d]
      if (!stId) continue
      const st = activePhase.seance_types.find(x => x.id === stId)
      if (!st) continue
      st.exercices?.forEach(e => s += +e.series || 0)
    }
    return s
  }, [activePhase])

  // Liste de matériel (Piste A) — dérivée des equipment attachés aux exercices
  const materielList = useMemo(() => {
    const eqSet = new Set()
    phases.forEach(ph => {
      ph.seance_types.forEach(st => {
        st.exercices?.forEach(e => {
          const eq = e.exercice?.equipment
          if (eq) eqSet.add(eq)
        })
      })
    })
    return [...eqSet].sort()
  }, [phases])

  // Filtres dérivés de la biblio d'exercices
  const muscleList = useMemo(() => {
    const mset = new Set()
    exercises.forEach(e => { if (e.body_part) mset.add(e.body_part) })
    return [...mset].sort()
  }, [exercises])

  // Target muscles dispo — contextuels au body_part sélectionné
  const targetList = useMemo(() => {
    const tset = new Set()
    exercises.forEach(e => {
      if (exoMuscleFilter && e.body_part !== exoMuscleFilter) return
      if (e.target_muscle) tset.add(e.target_muscle)
    })
    return [...tset].sort()
  }, [exercises, exoMuscleFilter])

  // Equipment top 12 par fréquence (les + utilisés)
  const equipList = useMemo(() => {
    const counts = {}
    exercises.forEach(e => {
      const eq = e.equipment
      if (!eq) return
      counts[eq] = (counts[eq] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([eq]) => eq)
  }, [exercises])

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)]">
        <Loader2 className="animate-spin text-[#FF6B2B]" size={28} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-[var(--bg-base)]">

      {/* ═══ Header ═══ */}
      <div className="px-4 md:px-6 py-4 border-b border-[var(--border-base)] flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate('/coach/sport')}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <input type="text" value={programme.nom}
              onChange={e => setProgramme(p => ({ ...p, nom: e.target.value }))}
              placeholder="Nom du programme (ex: Hypertrophie 8 semaines)"
              className="w-full bg-transparent text-[var(--text-primary)] text-xl font-bold tracking-tight border-none focus:outline-none placeholder:text-[var(--text-muted)]" />
          </div>

          <div className="hidden md:flex items-center gap-1.5 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-3 py-2 shrink-0">
            <Target size={13} className="text-[var(--text-muted)]" strokeWidth={1.75} />
            <select value={programme.objectif} onChange={e => setProgramme(p => ({ ...p, objectif: e.target.value }))}
              className="bg-transparent text-[var(--text-secondary)] text-xs focus:outline-none cursor-pointer">
              <option value="">Objectif</option>
              {OBJECTIF_FOCUS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>

          <div className="hidden md:flex items-center gap-1.5 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-3 py-2 shrink-0">
            <Calendar size={13} className="text-[var(--text-muted)]" strokeWidth={1.75} />
            <input type="number" min={1} max={52} value={programme.duree_semaines}
              onChange={e => setProgramme(p => ({ ...p, duree_semaines: Math.max(1, +e.target.value) }))}
              className="w-10 bg-transparent text-[var(--text-primary)] text-xs font-bold text-center border-none focus:outline-none tabular-nums" />
            <span className="text-[var(--text-muted)] text-xs">sem.</span>
          </div>

          <select value={programme.client_id || ''}
            onChange={e => setProgramme(p => ({ ...p, client_id: e.target.value || null }))}
            className="hidden md:block appearance-none bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-3 py-2 text-[var(--text-secondary)] text-xs focus:outline-none focus:border-[#FF6B2B]/40 cursor-pointer shrink-0 max-w-[160px]">
            <option value="">Modèle (non assigné)</option>
            {clients.map(c => {
              const name = [c.prenom, c.nom].filter(Boolean).join(' ') || c.email
              return <option key={c.id} value={c.id}>{name}</option>
            })}
          </select>

          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all active:scale-95 disabled:opacity-50 shrink-0">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* ═══ Timeline phases ═══ */}
      {phases.length > 0 && (
        <div className="px-4 md:px-6 py-3 border-b border-[var(--border-base)] bg-[var(--bg-card)]/30">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--text-muted)] mb-2">
            <Layers size={11} strokeWidth={1.75} /> Timeline · {programme.duree_semaines} semaines · {programme.frequence_hebdo} séances/sem
          </div>
          <div className="flex gap-0.5 h-7 rounded-lg overflow-hidden bg-[var(--bg-surface)]">
            {phases.map((ph, i) => {
              const pct = Math.min(100, (ph.duree_semaines / (programme.duree_semaines || 4)) * 100)
              const isActive = i === activePhaseIdx
              return (
                <button key={ph.id} onClick={() => { setActivePhaseIdx(i); setActiveSeanceTypeIdx(0) }}
                  className={`flex items-center justify-center text-[10px] font-bold tracking-tight transition-all hover:brightness-110 ${
                    isActive ? 'text-white' : 'text-[var(--text-secondary)]'
                  }`}
                  style={{ width: `${pct}%`, background: isActive ? '#FF6B2B' : `rgba(255,107,43,${0.12 + 0.08 * i})` }}>
                  {ph.nom}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ Phase tabs ═══ */}
      <div className="px-4 md:px-6 py-3 border-b border-[var(--border-base)] flex items-center gap-2 overflow-x-auto">
        {phases.map((ph, i) => (
          <button key={ph.id} onClick={() => { setActivePhaseIdx(i); setActiveSeanceTypeIdx(0) }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              i === activePhaseIdx
                ? 'bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/30'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-transparent'
            }`}>
            {ph.nom}
            <span className="text-[9px] opacity-70 tabular-nums">· {ph.duree_semaines}s</span>
          </button>
        ))}
        <button onClick={addPhase}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#FF6B2B] border border-dashed border-[var(--border-base)] hover:border-[#FF6B2B]/30 transition-all text-xs">
          <Plus size={12} /> Phase
        </button>
      </div>

      {/* ═══ Main content ═══ */}
      {!activePhase ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-20">
            <Layers size={28} className="text-[var(--text-muted)] mx-auto mb-4 animate-breathe" strokeWidth={1.5} />
            <p className="text-[var(--text-primary)] text-sm font-bold mb-1">Aucune phase</p>
            <p className="text-[var(--text-muted)] text-xs mb-4">Commence par créer une phase pour structurer ton programme</p>
            <button onClick={addPhase}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF6B2B] text-white text-xs font-semibold hover:bg-[#FF6B2B]/90 transition-all">
              <Plus size={13} /> Créer la première phase
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-5">

            {/* ── Phase editor ── */}
            <div className="hero-card p-4 md:p-5">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <input type="text" value={activePhase.nom}
                  onChange={e => updatePhase(activePhaseIdx, 'nom', e.target.value)}
                  className="bg-transparent text-[var(--text-primary)] text-lg font-bold tracking-tight border-none focus:outline-none flex-1 min-w-[200px]"
                  placeholder="Nom de la phase" />
                <button onClick={() => removePhase(activePhaseIdx)}
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Supprimer la phase">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl p-3">
                  <label className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] block mb-1.5">Durée</label>
                  <div className="flex items-baseline gap-1">
                    <input type="number" min={1} value={activePhase.duree_semaines}
                      onChange={e => updatePhase(activePhaseIdx, 'duree_semaines', Math.max(1, +e.target.value))}
                      className="w-12 bg-transparent text-[var(--text-primary)] text-lg font-black tabular-nums border-none focus:outline-none" />
                    <span className="text-[var(--text-muted)] text-xs">semaines</span>
                  </div>
                </div>
                <div className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl p-3">
                  <label className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] block mb-1.5">Focus</label>
                  <select value={activePhase.objectif_focus || ''}
                    onChange={e => updatePhase(activePhaseIdx, 'objectif_focus', e.target.value || null)}
                    className="w-full bg-transparent text-[var(--text-primary)] text-sm font-bold border-none focus:outline-none cursor-pointer">
                    <option value="">—</option>
                    {OBJECTIF_FOCUS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>
                <div className="relative bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl p-3 overflow-hidden">
                  <span className="absolute top-0 left-3 right-3 h-[2px] rounded-b-full bg-[#FF6B2B]" />
                  <label className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] block mb-1.5">Volume cible</label>
                  <div className="flex items-baseline gap-1">
                    <input type="number" min={0} value={activePhase.volume_cible_hebdo_sets || ''}
                      onChange={e => updatePhase(activePhaseIdx, 'volume_cible_hebdo_sets', +e.target.value || null)}
                      placeholder="—"
                      className="w-16 bg-transparent text-[var(--text-primary)] text-lg font-black tabular-nums border-none focus:outline-none placeholder:text-[var(--text-muted)]" />
                    <span className="text-[var(--text-muted)] text-xs">séries/sem</span>
                  </div>
                </div>
                <div className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl p-3">
                  <label className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] block mb-1.5">Planifié</label>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[var(--text-primary)] text-lg font-black tabular-nums leading-none">{phaseSetsHebdo}<span className="text-[var(--text-muted)] text-xs font-semibold"> séries</span></p>
                    {activePhase.volume_cible_hebdo_sets > 0 && (
                      <Ring value={phaseSetsHebdo} max={activePhase.volume_cible_hebdo_sets} size={34} thickness={3}
                        color="#FF6B2B" trackColor="var(--ring-track)">
                        <span className="text-[8px] font-black tabular-nums text-[var(--text-primary)]">
                          {Math.min(100, Math.round((phaseSetsHebdo / activePhase.volume_cible_hebdo_sets) * 100))}%
                        </span>
                      </Ring>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Week planner ── */}
            <div className="hero-card p-4 md:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={14} className="text-[var(--text-muted)]" strokeWidth={1.75} />
                <h3 className="text-[var(--text-primary)] text-sm font-bold tracking-tight">Semaine type</h3>
                <span className="text-[var(--text-muted)] text-[11px]">— assigne une séance type à chaque jour</span>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {JOURS_COURTS.map((j, dIdx) => {
                  const assignedId = activePhase.phase_jours[dIdx]
                  const assigned = activePhase.seance_types.find(st => st.id === assignedId)
                  return (
                    <div key={j} className="flex flex-col items-center gap-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{j}</p>
                      <select value={assignedId || ''}
                        onChange={e => assignSeanceTypeToDay(dIdx, e.target.value || null)}
                        className={`w-full appearance-none bg-[var(--bg-base)] border rounded-lg px-2 py-2 text-[11px] font-semibold focus:outline-none cursor-pointer transition-all ${
                          assigned ? 'border-[#FF6B2B]/40 text-[var(--text-primary)]' : 'border-[var(--border-subtle)] text-[var(--text-muted)]'
                        }`}>
                        <option value="">—</option>
                        {activePhase.seance_types.map(st => (
                          <option key={st.id} value={st.id}>{st.nom}</option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Séance types ── */}
            <div className="hero-card p-4 md:p-5">
              <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Dumbbell size={14} className="text-[var(--text-muted)]" strokeWidth={1.75} />
                  <h3 className="text-[var(--text-primary)] text-sm font-bold tracking-tight">Séances types</h3>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { nom: 'Push', focus: 'push', icon: 'dumbbell' },
                    { nom: 'Pull', focus: 'pull', icon: 'dumbbell' },
                    { nom: 'Legs', focus: 'legs', icon: 'dumbbell' },
                    { nom: 'Cardio', focus: 'cardio', icon: 'heart' },
                    { nom: 'Repos', focus: 'repos', icon: 'moon' },
                  ].map(preset => (
                    <button key={preset.focus} onClick={() => addSeanceType(preset)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)]/80 border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] font-semibold transition-colors">
                      <Plus size={11} /> {preset.nom}
                    </button>
                  ))}
                </div>
              </div>

              {activePhase.seance_types.length === 0 ? (
                <div className="text-center py-10 animate-breathe">
                  <Dumbbell size={22} className="text-[var(--text-muted)] mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-[var(--text-muted)] text-xs">Crée ta première séance type (Push/Pull/Legs/Repos...)</p>
                </div>
              ) : (
                <>
                  {/* Tabs séances */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 -mx-2 px-2">
                    {activePhase.seance_types.map((st, i) => (
                      <button key={st.id} onClick={() => setActiveSeanceTypeIdx(i)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                          i === activeSeanceTypeIdx
                            ? 'bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/30'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-transparent'
                        }`}>
                        {st.nom}
                      </button>
                    ))}
                  </div>

                  {activeSeanceType && (
                    <div className="space-y-4">
                      {/* Header séance */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <input type="text" value={activeSeanceType.nom}
                          onChange={e => updateSeanceType(activeSeanceTypeIdx, 'nom', e.target.value)}
                          className="bg-transparent text-[var(--text-primary)] text-base font-bold tracking-tight border-none focus:outline-none flex-1 min-w-[160px]"
                          placeholder="Nom de la séance" />
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-semibold">
                            <Dumbbell size={11} strokeWidth={1.75} /> {seanceStats.sets} séries · <span className="tabular-nums">{seanceStats.volume}</span> tonnage
                          </span>
                          <div className="flex items-center gap-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2 py-1">
                            <Clock size={11} className="text-[var(--text-muted)]" />
                            <input type="number" min={5} value={activeSeanceType.duree_estimee_min || ''}
                              onChange={e => updateSeanceType(activeSeanceTypeIdx, 'duree_estimee_min', +e.target.value || null)}
                              placeholder="min"
                              className="w-10 bg-transparent text-[var(--text-primary)] text-xs font-bold text-center border-none focus:outline-none tabular-nums" />
                            <span className="text-[var(--text-muted)] text-[10px]">min</span>
                          </div>
                          <button onClick={saveSeanceToBiblio}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#FF6B2B] hover:bg-[#FF6B2B]/10 transition-all"
                            title="Enregistrer dans ma bibliothèque">
                            <BookmarkPlus size={13} />
                          </button>
                          <button onClick={() => duplicateSeanceType(activeSeanceTypeIdx)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#FF6B2B] hover:bg-[#FF6B2B]/10 transition-all"
                            title="Dupliquer">
                            <Copy size={13} />
                          </button>
                          <button onClick={() => removeSeanceType(activeSeanceTypeIdx)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Supprimer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Actions : biblio + matériel */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => { setBiblioDrawer(true); setBiblioSearch('') }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-base)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] font-semibold transition-colors">
                          <Book size={11} strokeWidth={1.75} /> Bibliothèque ({biblioRepas.length})
                        </button>
                        <button onClick={() => setMaterielOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-base)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] font-semibold transition-colors">
                          <Package size={11} strokeWidth={1.75} /> Matériel requis
                        </button>
                      </div>

                      {/* Liste exercices */}
                      <div className="space-y-2">
                        {currentExos.length === 0 ? (
                          <div className="text-center py-8 animate-breathe">
                            <Dumbbell size={22} className="text-[var(--text-muted)] mx-auto mb-3" strokeWidth={1.5} />
                            <p className="text-[var(--text-muted)] text-xs">Aucun exercice. Ajoute-en ci-dessous ↓</p>
                          </div>
                        ) : (
                          currentExos.map((exo, exoIdx) => {
                            const exerciceNom = exo.exercice?.name_fr || exo.exercice?.name || exo.exercice_nom_custom || 'Exercice'
                            const chargeWk1 = chargeAtWeek(exo.charge_kg, exo.progression_type, exo.progression_value, 0)
                            const chargeFinal = chargeAtWeek(exo.charge_kg, exo.progression_type, exo.progression_value, activePhase.duree_semaines - 1)
                            return (
                              <div key={exo.id} className="group bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl overflow-hidden">
                                <div className="flex items-center gap-3 px-3 py-2 border-b border-[var(--border-subtle)]">
                                  <GripVertical size={13} className="text-[var(--text-muted)] opacity-40 cursor-grab shrink-0" strokeWidth={1.75} />
                                  {/* Thumbnail GIF */}
                                  <div className="w-10 h-10 shrink-0 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden flex items-center justify-center">
                                    {exo.exercice?.gif_url ? (
                                      <img src={exo.exercice.gif_url}
                                        alt={exerciceNom}
                                        loading="lazy"
                                        className="max-w-full max-h-full object-contain" />
                                    ) : (
                                      <Dumbbell size={14} className="text-[var(--text-muted)]" strokeWidth={1.5} />
                                    )}
                                  </div>
                                  {exo.superset_group && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/20">
                                      {exo.superset_group}
                                    </span>
                                  )}
                                  <span className="text-[var(--text-primary)] text-sm font-bold flex-1 truncate">{exerciceNom}</span>
                                  {(exo.exercice?.target_muscle || exo.exercice?.body_part) && (
                                    <span className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wider bg-[var(--bg-surface)] px-2 py-0.5 rounded-md hidden md:inline-block">
                                      {frTarget(exo.exercice?.target_muscle) || frBodyPart(exo.exercice?.body_part)}
                                    </span>
                                  )}
                                  <button onClick={() => removeExo(exoIdx)}
                                    className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0">
                                    <Trash2 size={11} />
                                  </button>
                                </div>

                                <div className="p-4 space-y-3">
                                  {/* Ligne 1 : sets × reps × charge */}
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5">
                                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Séries</label>
                                      <input type="number" min={1} value={exo.series || ''}
                                        onChange={e => updateExo(exoIdx, 'series', +e.target.value || 0)}
                                        className="w-full bg-transparent text-[var(--text-primary)] text-sm font-black tabular-nums border-none focus:outline-none" />
                                    </div>
                                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5">
                                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Reps</label>
                                      <input type="text" value={exo.reps_cible || ''}
                                        onChange={e => updateExo(exoIdx, 'reps_cible', e.target.value)}
                                        placeholder="8-12"
                                        className="w-full bg-transparent text-[var(--text-primary)] text-sm font-black tabular-nums border-none focus:outline-none" />
                                    </div>
                                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5">
                                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Charge {exo.charge_unite}</label>
                                      <input type="number" min={0} step={0.5} value={exo.charge_kg || ''}
                                        onChange={e => updateExo(exoIdx, 'charge_kg', +e.target.value || null)}
                                        placeholder="0"
                                        className="w-full bg-transparent text-[var(--text-primary)] text-sm font-black tabular-nums border-none focus:outline-none" />
                                    </div>
                                  </div>

                                  {/* Ligne 2 : progression + RPE + tempo + rest */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5">
                                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] block flex items-center gap-1">
                                        <TrendingUp size={9} /> Progression
                                      </label>
                                      <div className="flex items-center gap-1">
                                        <select value={exo.progression_type || 'fixe'}
                                          onChange={e => updateExo(exoIdx, 'progression_type', e.target.value)}
                                          className="bg-transparent text-[var(--text-primary)] text-xs font-bold border-none focus:outline-none cursor-pointer flex-1 min-w-0">
                                          {PROGRESSION_TYPES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                                        </select>
                                        {exo.progression_type !== 'fixe' && (
                                          <input type="number" step={0.5} value={exo.progression_value || ''}
                                            onChange={e => updateExo(exoIdx, 'progression_value', +e.target.value || null)}
                                            placeholder="+X"
                                            className="w-10 bg-transparent text-[#FF6B2B] text-xs font-black tabular-nums text-right border-none focus:outline-none" />
                                        )}
                                      </div>
                                    </div>
                                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5">
                                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">RPE</label>
                                      <input type="number" min={0} max={10} step={0.5} value={exo.rpe_cible || ''}
                                        onChange={e => updateExo(exoIdx, 'rpe_cible', +e.target.value || null)}
                                        placeholder="—"
                                        className="w-full bg-transparent text-[var(--text-primary)] text-sm font-black tabular-nums border-none focus:outline-none" />
                                    </div>
                                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5">
                                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Tempo</label>
                                      <input type="text" value={exo.tempo || ''}
                                        onChange={e => updateExo(exoIdx, 'tempo', e.target.value)}
                                        placeholder="3-1-2-0"
                                        className="w-full bg-transparent text-[var(--text-primary)] text-xs font-bold tabular-nums border-none focus:outline-none" />
                                    </div>
                                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5">
                                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Repos</label>
                                      <div className="flex items-center gap-1">
                                        <input type="number" min={0} step={15} value={exo.rest_sec || ''}
                                          onChange={e => updateExo(exoIdx, 'rest_sec', +e.target.value || null)}
                                          placeholder="90"
                                          className="w-full bg-transparent text-[var(--text-primary)] text-sm font-black tabular-nums border-none focus:outline-none" />
                                        <span className="text-[var(--text-muted)] text-[9px]">s</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Ligne 3 : superset + technique + notes */}
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {(() => {
                                      const linkedToPrev = exoIdx > 0 && exo.superset_group && exo.superset_group === currentExos[exoIdx - 1]?.superset_group
                                      const disabled = exoIdx === 0
                                      return (
                                        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5">
                                          <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] block flex items-center gap-1">
                                            <LinkIcon size={9} /> Superset
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() => toggleSupersetLink(exoIdx)}
                                            disabled={disabled}
                                            title={disabled ? 'Le 1er exercice ne peut pas être lié au précédent' : 'Enchaîner cet exercice avec le précédent (superset)'}
                                            className={`w-full text-center text-xs font-bold transition-colors ${
                                              disabled
                                                ? 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                                                : linkedToPrev
                                                  ? 'text-[#FF6B2B]'
                                                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                            }`}>
                                            {linkedToPrev ? `Lié ${exo.superset_group} ↑` : '+ Lier au précédent'}
                                          </button>
                                        </div>
                                      )
                                    })()}
                                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5">
                                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Technique</label>
                                      <select value={exo.technique || ''}
                                        onChange={e => updateExo(exoIdx, 'technique', e.target.value || null)}
                                        className="w-full bg-transparent text-[var(--text-primary)] text-xs font-bold border-none focus:outline-none cursor-pointer">
                                        <option value="">—</option>
                                        <option value="superset">Superset</option>
                                        <option value="giant_set">Giant set</option>
                                        <option value="circuit">Circuit</option>
                                        <option value="drop_set">Drop set</option>
                                        <option value="rest_pause">Rest-pause</option>
                                        <option value="cluster">Cluster</option>
                                      </select>
                                    </div>
                                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 col-span-2 md:col-span-1">
                                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] block flex items-center gap-1">
                                        <StickyNote size={9} /> Notes coach
                                      </label>
                                      <input type="text" value={exo.notes_coach || ''}
                                        onChange={e => updateExo(exoIdx, 'notes_coach', e.target.value)}
                                        placeholder="Cues techniques..."
                                        className="w-full bg-transparent text-[var(--text-primary)] text-xs border-none focus:outline-none placeholder:text-[var(--text-muted)]" />
                                    </div>
                                  </div>

                                  {/* Preview progression */}
                                  {exo.progression_type && exo.progression_type !== 'fixe' && exo.progression_value && exo.charge_kg > 0 && (
                                    <div className="bg-[#FF6B2B]/5 border border-[#FF6B2B]/20 rounded-lg px-3 py-2 flex items-center gap-3 text-[10px]">
                                      <TrendingUp size={11} className="text-[#FF6B2B] shrink-0" strokeWidth={2} />
                                      <span className="text-[var(--text-muted)] font-semibold uppercase tracking-wider">Phase</span>
                                      <span className="text-[var(--text-primary)] font-bold tabular-nums">
                                        Sem.1 : {Math.round(chargeWk1 * 10) / 10} {exo.charge_unite}
                                      </span>
                                      <ChevronRight size={11} className="text-[var(--text-muted)]" />
                                      <span className="text-[#FF6B2B] font-black tabular-nums">
                                        Sem.{activePhase.duree_semaines} : {Math.round(chargeFinal * 10) / 10} {exo.charge_unite}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}

                        {/* Add exercice */}
                        <button onClick={() => { setExoDrawer({ seanceTypeIdx: activeSeanceTypeIdx }); setExoSearch(''); setExoMuscleFilter('') }}
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-[var(--bg-base)] hover:bg-[var(--bg-surface)] border border-dashed border-[var(--border-base)] hover:border-[#FF6B2B]/30 text-[var(--text-muted)] hover:text-[#FF6B2B] text-xs font-semibold transition-colors mt-2">
                          <Plus size={13} /> Ajouter un exercice
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ DRAWER EXERCICES (ExerciseDB avec GIFs animés) ══ */}
      {exoDrawer && (() => {
        const hasFilter = !!(exoSearch.trim() || exoMuscleFilter || exoTargetFilter || exoEquipFilter)
        const resetFilters = () => {
          setExoSearch(''); setExoMuscleFilter(''); setExoTargetFilter(''); setExoEquipFilter('')
        }
        const filtered = exercises.filter(e => {
          if (exoMuscleFilter && e.body_part !== exoMuscleFilter) return false
          if (exoTargetFilter && e.target_muscle !== exoTargetFilter) return false
          if (exoEquipFilter && e.equipment !== exoEquipFilter) return false
          if (exoSearch.trim()) {
            const term = exoSearch.toLowerCase()
            const nom = ((e.name_fr || '') + ' ' + (e.name || '')).toLowerCase()
            if (!nom.includes(term)) return false
          }
          return true
        })
        return (
          <>
            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setExoDrawer(null)} />
            <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[var(--bg-card)] border-l border-[var(--border-base)] shadow-2xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-[var(--border-base)] flex items-center justify-between">
                <div>
                  <h3 className="text-[var(--text-primary)] text-base font-bold tracking-tight">Bibliothèque d'exercices</h3>
                  <p className="text-[var(--text-muted)] text-xs mt-0.5">
                    <span className="text-[var(--text-primary)] font-semibold tabular-nums">{filtered.length}</span>
                    {' / '}
                    <span className="tabular-nums">{exercises.length}</span>
                    {' exercices'}
                    {hasFilter && (
                      <button onClick={resetFilters}
                        className="ml-2 text-[#FF6B2B] font-semibold hover:underline">
                        · Réinitialiser
                      </button>
                    )}
                  </p>
                </div>
                <button onClick={() => setExoDrawer(null)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]">
                  <X size={16} />
                </button>
              </div>

              <div className="px-5 py-3 border-b border-[var(--border-base)] space-y-2.5">
                {/* Search */}
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input type="text" value={exoSearch} onChange={e => setExoSearch(e.target.value)}
                    placeholder="Rechercher (fr ou en)..."
                    autoFocus
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl pl-9 pr-3 py-2 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40" />
                </div>

                {/* Row 1 — Body part */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] mb-1.5">Zone</p>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                    <button onClick={() => { setExoMuscleFilter(''); setExoTargetFilter('') }}
                      className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-[0.1em] transition-all ${
                        exoMuscleFilter === '' ? 'bg-[#FF6B2B] text-white' : 'bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                      }`}>
                      Toutes
                    </button>
                    {muscleList.map(m => (
                      <button key={m} onClick={() => { setExoMuscleFilter(m === exoMuscleFilter ? '' : m); setExoTargetFilter('') }}
                        className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-[0.1em] transition-all ${
                          exoMuscleFilter === m ? 'bg-[#FF6B2B] text-white' : 'bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                        }`}>
                        {frBodyPart(m)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 2 — Target muscle (contextuel si zone sélectionnée) */}
                {exoMuscleFilter && targetList.length > 1 && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] mb-1.5">Muscle précis</p>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                      <button onClick={() => setExoTargetFilter('')}
                        className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-[0.1em] transition-all ${
                          exoTargetFilter === '' ? 'bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/30' : 'bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                        }`}>
                        Tous
                      </button>
                      {targetList.map(t => (
                        <button key={t} onClick={() => setExoTargetFilter(t === exoTargetFilter ? '' : t)}
                          className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-[0.1em] transition-all ${
                            exoTargetFilter === t ? 'bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/30' : 'bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                          }`}>
                          {frTarget(t)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Row 3 — Equipment */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] mb-1.5">Matériel</p>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                    <button onClick={() => setExoEquipFilter('')}
                      className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-[0.1em] transition-all ${
                        exoEquipFilter === '' ? 'bg-[#FF6B2B] text-white' : 'bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                      }`}>
                      Tous
                    </button>
                    {/* Bouton rapide "Poids du corps" toujours en premier */}
                    <button onClick={() => setExoEquipFilter('body weight' === exoEquipFilter ? '' : 'body weight')}
                      className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-[0.1em] transition-all ${
                        exoEquipFilter === 'body weight' ? 'bg-[#FF6B2B] text-white' : 'bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                      }`}>
                      Poids du corps
                    </button>
                    {equipList.filter(eq => eq !== 'body weight').map(eq => (
                      <button key={eq} onClick={() => setExoEquipFilter(eq === exoEquipFilter ? '' : eq)}
                        className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-[0.1em] transition-all ${
                          exoEquipFilter === eq ? 'bg-[#FF6B2B] text-white' : 'bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                        }`}>
                        {frEquip(eq)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 animate-breathe">
                    <Search size={22} className="text-[var(--text-muted)] mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-[var(--text-muted)] text-sm font-semibold">Aucun exercice trouvé</p>
                    <p className="text-[var(--text-muted)] text-[11px] mt-1">Essaie une autre recherche ou catégorie</p>
                  </div>
                ) : (
                  filtered.slice(0, 150).map(e => (
                    <button key={e.id}
                      onClick={() => addExerciceToSeance(e)}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg-surface)] transition-colors text-left group">
                      {/* Thumbnail GIF — lazy load */}
                      <div className="w-14 h-14 shrink-0 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] overflow-hidden flex items-center justify-center relative">
                        {e.gif_url ? (
                          <img src={e.gif_url}
                            alt={e.name_fr || e.name}
                            loading="lazy"
                            className="max-w-full max-h-full object-contain"
                            onError={(ev) => { ev.target.style.display = 'none' }} />
                        ) : (
                          <Dumbbell size={18} className="text-[var(--text-muted)]" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--text-primary)] text-sm font-semibold truncate group-hover:text-[#FF6B2B] transition-colors">
                          {e.name_fr || e.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {e.target_muscle && (
                            <span className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wider bg-[var(--bg-base)] px-1.5 py-0.5 rounded">
                              {frTarget(e.target_muscle)}
                            </span>
                          )}
                          {e.equipment && (
                            <span className="text-[9px] text-[var(--text-muted)] font-semibold">
                              · {frEquip(e.equipment)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Plus size={13} className="text-[var(--text-muted)] group-hover:text-[#FF6B2B] shrink-0" />
                    </button>
                  ))
                )}
                {filtered.length > 150 && (
                  <p className="text-center text-[var(--text-muted)] text-[10px] pt-3">
                    {filtered.length - 150} autres résultats — affine ta recherche
                  </p>
                )}
              </div>
            </div>
          </>
        )
      })()}

      {/* ══ DRAWER BIBLIOTHÈQUE ══ */}
      {biblioDrawer && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setBiblioDrawer(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[var(--bg-card)] border-l border-[var(--border-base)] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[var(--border-base)] flex items-center justify-between">
              <div>
                <h3 className="text-[var(--text-primary)] text-base font-bold tracking-tight">Bibliothèque de séances</h3>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">{biblioRepas.length} séances · clic pour ajouter</p>
              </div>
              <button onClick={() => setBiblioDrawer(false)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-3 border-b border-[var(--border-base)]">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input type="text" value={biblioSearch} onChange={e => setBiblioSearch(e.target.value)}
                  placeholder="Rechercher..."
                  autoFocus
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl pl-9 pr-3 py-2 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {biblioRepas.length === 0 ? (
                <div className="text-center py-12 animate-breathe">
                  <Book size={22} className="text-[var(--text-muted)] mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-[var(--text-muted)] text-xs">Aucune séance enregistrée</p>
                  <p className="text-[var(--text-muted)] text-[11px] mt-1">Utilise 🔖 sur une séance pour l'enregistrer ici</p>
                </div>
              ) : (
                biblioRepas
                  .filter(b => !biblioSearch.trim() || (b.nom || '').toLowerCase().includes(biblioSearch.toLowerCase()))
                  .map(b => {
                    const nExos = b.sport_seances_biblio_exercices?.length || 0
                    return (
                      <div key={b.id} className="group bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl p-3 hover:border-[#FF6B2B]/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <Dumbbell size={14} className="text-[var(--text-muted)] shrink-0" strokeWidth={1.75} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[var(--text-primary)] text-sm font-bold truncate">{b.nom}</p>
                            <p className="text-[var(--text-muted)] text-[10px]">{b.focus || '—'} · {nExos} exo{nExos > 1 ? 's' : ''} · {b.duree_estimee_min || '?'} min</p>
                          </div>
                          <button onClick={() => insertSeanceFromBiblio(b)}
                            className="px-3 py-1.5 rounded-lg bg-[#FF6B2B] text-white text-[10px] font-semibold hover:bg-[#FF6B2B]/90 transition-all active:scale-95">
                            Ajouter
                          </button>
                          <button onClick={() => deleteFromBiblio(b.id)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          </div>
        </>
      )}

      {/* ══ MODAL MATÉRIEL ══ */}
      {materielOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMaterielOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-base)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-[var(--border-base)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package size={16} className="text-[var(--text-muted)]" strokeWidth={1.75} />
                  <div>
                    <h3 className="text-[var(--text-primary)] text-lg font-bold tracking-tight">Matériel requis</h3>
                    <p className="text-[var(--text-muted)] text-xs mt-0.5">Pour tout le programme</p>
                  </div>
                </div>
                <button onClick={() => setMaterielOpen(false)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {materielList.length === 0 ? (
                  <div className="text-center py-12 animate-breathe">
                    <Package size={24} className="text-[var(--text-muted)] mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-[var(--text-muted)] text-sm">Aucun matériel détecté</p>
                    <p className="text-[var(--text-muted)] text-[11px] mt-1">Ajoute des exercices avec matériel référencé</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {materielList.map((m, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                        <Package size={12} className="text-[var(--text-muted)] shrink-0" strokeWidth={1.75} />
                        <p className="text-[var(--text-primary)] text-sm font-semibold truncate flex-1">{frEquip(m)}</p>
                      </div>
                    ))}
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
