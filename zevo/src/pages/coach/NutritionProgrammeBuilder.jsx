import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import Ring from '../../components/ui/Ring'
import {
  ArrowLeft, Save, Plus, Trash2, Loader2, Calendar,
  Target, Users, Dumbbell, Moon, Flame, Coffee, Utensils, Apple,
  ChevronDown, ChevronRight, Layers, X, Edit3, Copy,
  BookmarkPlus, Book, Minus, Search, ShoppingCart
} from 'lucide-react'

// ══════════════════════════════════════════════════════
// Constantes
// ══════════════════════════════════════════════════════
const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const JOURS_LONGS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const REPAS_TYPES = [
  { id: 'petit_dej', label: 'Petit-déjeuner', icon: Coffee },
  { id: 'collation_matin', label: 'Collation matin', icon: Apple },
  { id: 'dejeuner', label: 'Déjeuner', icon: Utensils },
  { id: 'collation', label: 'Collation', icon: Apple },
  { id: 'diner', label: 'Dîner', icon: Utensils },
  { id: 'collation_soir', label: 'Collation soir', icon: Moon },
]

const JOUR_TYPE_ICONS = {
  dumbbell: Dumbbell,
  moon: Moon,
  flame: Flame,
  apple: Apple,
}

// Calories = 4 kcal/g pour P+G, 9 kcal/g pour L
function calcKcal(p, g, l) {
  return Math.round((+p || 0) * 4 + (+g || 0) * 4 + (+l || 0) * 9)
}

// Recalcule P/G/L à partir d'une liste d'aliments
function computeMacrosFromAliments(aliments) {
  let p = 0, g = 0, l = 0
  ;(aliments || []).forEach(a => {
    const ratio = (a.quantite_g || 0) / 100
    p += (a.proteines || 0) * ratio
    g += (a.glucides || 0) * ratio
    l += (a.lipides || 0) * ratio
  })
  return { p: Math.round(p * 10) / 10, g: Math.round(g * 10) / 10, l: Math.round(l * 10) / 10 }
}

// ══════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════
export default function NutritionProgrammeBuilder() {
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
    duree_semaines: 4,
    is_template: true,
    is_active: true,
    client_id: null,
  })

  // ── Phases: [{ id, nom, ordre, semaine_debut, duree_semaines, kcal_cible, proteines_cible_g, glucides_cible_g, lipides_cible_g, notes, jour_types: [...], phase_jours: {0:jourTypeId, 1:..., ...6} }]
  const [phases, setPhases] = useState([])
  const [activePhaseIdx, setActivePhaseIdx] = useState(0)
  const [activeJourTypeIdx, setActiveJourTypeIdx] = useState(0)

  // ── Clients for assignment ──
  const [clients, setClients] = useState([])

  // ── IDs à supprimer à la sauvegarde (ceux qui existaient en DB mais ont été retirés) ──
  const [deletedPhaseIds, setDeletedPhaseIds] = useState([])
  const [deletedJourTypeIds, setDeletedJourTypeIds] = useState([])
  const [deletedRepasIds, setDeletedRepasIds] = useState([])

  // ── Aliments library ──
  const [allAliments, setAllAliments] = useState([])
  const [alimentDrawer, setAlimentDrawer] = useState(null) // { phaseIdx, jtIdx, repasIdx }
  const [alimentSearch, setAlimentSearch] = useState('')
  const [alimentCategoryFilter, setAlimentCategoryFilter] = useState('') // '' = toutes
  const [alimentSortBy, setAlimentSortBy] = useState('nom') // 'nom' | 'kcal' | 'proteines'

  // ── Bibliothèque de repas ──
  const [biblioRepas, setBiblioRepas] = useState([])
  const [biblioDrawer, setBiblioDrawer] = useState(false) // open/close
  const [biblioSearch, setBiblioSearch] = useState('')

  // ── Shopping list ──
  const [shoppingOpen, setShoppingOpen] = useState(false)

  // ══════════════════════════════════════════════════════
  // LOAD
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    if (!user) return
    // Charger clients
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
    // Charger aliments (officiels Zevo + perso coach)
    supabase
      .from('aliments')
      .select('*')
      .or(`coach_id.is.null,coach_id.eq.${user.id}`)
      .order('categorie, nom')
      .then(({ data }) => setAllAliments(data || []))
    // Charger bibliothèque de repas
    supabase
      .from('nutrition_repas_biblio')
      .select('*, nutrition_repas_biblio_aliments(*, aliments(*))')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.warn('[ProgBuilder] biblio fetch err:', error.message)
        setBiblioRepas(data || [])
      })
  }, [user])

  const loadProgramme = useCallback(async () => {
    if (isNew || !user) return
    setLoading(true)

    const { data: prog, error: progErr } = await supabase
      .from('nutrition_programmes')
      .select('*')
      .eq('id', programmeId)
      .maybeSingle()

    if (progErr || !prog) {
      console.error('[NutritionProgrammeBuilder] load prog err:', progErr)
      toast.error('Programme introuvable')
      navigate('/coach/nutrition')
      return
    }

    setProgramme({
      id: prog.id,
      nom: prog.nom || '',
      description: prog.description || '',
      objectif: prog.objectif || '',
      duree_semaines: prog.duree_semaines || 4,
      is_template: prog.is_template ?? true,
      is_active: prog.is_active ?? true,
      client_id: prog.client_id,
    })

    // Charger phases, jour_types, phase_jours, repas (+aliments) en parallèle
    const [phasesRes, jourTypesRes, phaseJoursRes, repasRes] = await Promise.all([
      supabase.from('nutrition_phases').select('*').eq('programme_id', programmeId).order('ordre'),
      supabase.from('nutrition_jour_types').select('*, phase_id').order('ordre'),
      supabase.from('nutrition_phase_jours').select('*'),
      supabase.from('nutrition_programme_repas').select('*, nutrition_programme_repas_aliments(*, aliments(*))').order('ordre'),
    ])

    const allPhases = phasesRes.data || []
    const allJourTypes = jourTypesRes.data || []
    const allPhaseJours = phaseJoursRes.data || []
    const allRepas = (repasRes.data || []).map(r => ({
      ...r,
      aliments: (r.nutrition_programme_repas_aliments || []).map(ra => ({
        aliment_id: ra.aliment_id,
        nom: ra.aliments?.nom || 'Aliment',
        quantite_g: ra.quantite_g,
        kcal_100g: ra.aliments?.kcal_100g || 0,
        proteines: ra.aliments?.proteines || 0,
        glucides: ra.aliments?.glucides || 0,
        lipides: ra.aliments?.lipides || 0,
        categorie: ra.aliments?.categorie || '',
      })),
    }))

    // Structurer : phases → jour_types (appartenant à cette phase) → repas
    const structured = allPhases.map(ph => {
      const jourTypes = allJourTypes
        .filter(jt => jt.phase_id === ph.id)
        .map(jt => ({
          ...jt,
          repas: allRepas.filter(r => r.jour_type_id === jt.id),
        }))

      // phase_jours : { 0: jourTypeId|null, 1: ..., ..., 6: ... }
      const phaseJours = {}
      for (let d = 0; d < 7; d++) {
        const pj = allPhaseJours.find(p => p.phase_id === ph.id && p.jour_semaine === d)
        phaseJours[d] = pj?.jour_type_id || null
      }

      return {
        ...ph,
        jour_types: jourTypes,
        phase_jours: phaseJours,
      }
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
        kcal_cible: null,
        proteines_cible_g: null,
        glucides_cible_g: null,
        lipides_cible_g: null,
        notes: '',
        jour_types: [],
        phase_jours: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      }])
    }
  }, [isNew, phases.length, loading])

  const activePhase = phases[activePhaseIdx]
  const activeJourType = activePhase?.jour_types?.[activeJourTypeIdx]

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
      kcal_cible: null,
      proteines_cible_g: null,
      glucides_cible_g: null,
      lipides_cible_g: null,
      notes: '',
      jour_types: [],
      phase_jours: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
    }])
    setActivePhaseIdx(phases.length)
    setActiveJourTypeIdx(0)
  }

  const updatePhase = (idx, field, value) => {
    setPhases(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  const removePhase = (idx) => {
    if (phases.length <= 1) {
      toast.error('Un programme doit avoir au moins 1 phase')
      return
    }
    const phase = phases[idx]
    // Marquer les IDs en DB pour suppression
    if (!phase.id.startsWith('new-')) setDeletedPhaseIds(ids => [...ids, phase.id])
    phase.jour_types.forEach(jt => {
      if (!jt.id.startsWith('new-')) setDeletedJourTypeIds(ids => [...ids, jt.id])
      jt.repas?.forEach(r => { if (!r.id.startsWith('new-')) setDeletedRepasIds(ids => [...ids, r.id]) })
    })
    setPhases(phases.filter((_, i) => i !== idx))
    setActivePhaseIdx(Math.max(0, idx - 1))
    setActiveJourTypeIdx(0)
  }

  // ══════════════════════════════════════════════════════
  // JOUR_TYPE ACTIONS
  // ══════════════════════════════════════════════════════
  const addJourType = (nom = 'Nouveau jour type') => {
    const jt = {
      id: `new-jt-${Date.now()}`,
      phase_id: activePhase?.id,
      nom,
      icon: 'dumbbell',
      ordre: (activePhase?.jour_types?.length || 0) + 1,
      repas: [],
    }
    setPhases(prev => prev.map((p, i) => i === activePhaseIdx ? { ...p, jour_types: [...p.jour_types, jt] } : p))
    setActiveJourTypeIdx(activePhase?.jour_types?.length || 0)
  }

  const updateJourType = (jtIdx, field, value) => {
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      return { ...p, jour_types: p.jour_types.map((jt, k) => k === jtIdx ? { ...jt, [field]: value } : jt) }
    }))
  }

  const removeJourType = (jtIdx) => {
    const jt = activePhase.jour_types[jtIdx]
    if (!jt.id.startsWith('new-')) setDeletedJourTypeIds(ids => [...ids, jt.id])
    jt.repas?.forEach(r => { if (!r.id.startsWith('new-')) setDeletedRepasIds(ids => [...ids, r.id]) })

    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      // Retirer aussi de phase_jours
      const newPhaseJours = { ...p.phase_jours }
      for (let d = 0; d < 7; d++) if (newPhaseJours[d] === jt.id) newPhaseJours[d] = null
      return {
        ...p,
        jour_types: p.jour_types.filter((_, k) => k !== jtIdx),
        phase_jours: newPhaseJours,
      }
    }))
    setActiveJourTypeIdx(Math.max(0, jtIdx - 1))
  }

  const assignJourTypeToDay = (dayIdx, jourTypeId) => {
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      return { ...p, phase_jours: { ...p.phase_jours, [dayIdx]: jourTypeId } }
    }))
  }

  // ══════════════════════════════════════════════════════
  // REPAS ACTIONS
  // ══════════════════════════════════════════════════════
  const addRepas = (type) => {
    if (!activeJourType) return
    const newRepas = {
      id: `new-repas-${Date.now()}`,
      jour_type_id: activeJourType.id,
      type,
      ordre: (activeJourType.repas?.length || 0) + 1,
      titre: '',
      description: '',
      proteines_g: 0,
      glucides_g: 0,
      lipides_g: 0,
    }
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      return {
        ...p,
        jour_types: p.jour_types.map((jt, k) => {
          if (k !== activeJourTypeIdx) return jt
          return { ...jt, repas: [...(jt.repas || []), newRepas] }
        }),
      }
    }))
  }

  const updateRepas = (repasIdx, field, value) => {
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      return {
        ...p,
        jour_types: p.jour_types.map((jt, k) => {
          if (k !== activeJourTypeIdx) return jt
          return { ...jt, repas: jt.repas.map((r, m) => m === repasIdx ? { ...r, [field]: value } : r) }
        }),
      }
    }))
  }

  const removeRepas = (repasIdx) => {
    const repas = activeJourType.repas[repasIdx]
    if (!repas.id.startsWith('new-')) setDeletedRepasIds(ids => [...ids, repas.id])
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      return {
        ...p,
        jour_types: p.jour_types.map((jt, k) => {
          if (k !== activeJourTypeIdx) return jt
          return { ...jt, repas: jt.repas.filter((_, m) => m !== repasIdx) }
        }),
      }
    }))
  }

  // ══════════════════════════════════════════════════════
  // ALIMENTS ACTIONS (dans un repas)
  // ══════════════════════════════════════════════════════
  const addAlimentToRepas = (repasIdx, aliment) => {
    const newAliment = {
      aliment_id: aliment.id,
      nom: aliment.nom,
      quantite_g: 100,
      kcal_100g: aliment.kcal_100g || 0,
      proteines: aliment.proteines || 0,
      glucides: aliment.glucides || 0,
      lipides: aliment.lipides || 0,
      categorie: aliment.categorie || '',
    }
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      return {
        ...p,
        jour_types: p.jour_types.map((jt, k) => {
          if (k !== activeJourTypeIdx) return jt
          return {
            ...jt,
            repas: jt.repas.map((r, m) => {
              if (m !== repasIdx) return r
              const newAliments = [...(r.aliments || []), newAliment]
              const macros = computeMacrosFromAliments(newAliments)
              return { ...r, aliments: newAliments, proteines_g: macros.p, glucides_g: macros.g, lipides_g: macros.l }
            }),
          }
        }),
      }
    }))
  }

  const updateAlimentQty = (repasIdx, alimentIdx, newQty) => {
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      return {
        ...p,
        jour_types: p.jour_types.map((jt, k) => {
          if (k !== activeJourTypeIdx) return jt
          return {
            ...jt,
            repas: jt.repas.map((r, m) => {
              if (m !== repasIdx) return r
              const newAliments = (r.aliments || []).map((a, ai) =>
                ai === alimentIdx ? { ...a, quantite_g: Math.max(0, +newQty || 0) } : a
              )
              const macros = computeMacrosFromAliments(newAliments)
              return { ...r, aliments: newAliments, proteines_g: macros.p, glucides_g: macros.g, lipides_g: macros.l }
            }),
          }
        }),
      }
    }))
  }

  const removeAlimentFromRepas = (repasIdx, alimentIdx) => {
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      return {
        ...p,
        jour_types: p.jour_types.map((jt, k) => {
          if (k !== activeJourTypeIdx) return jt
          return {
            ...jt,
            repas: jt.repas.map((r, m) => {
              if (m !== repasIdx) return r
              const newAliments = (r.aliments || []).filter((_, ai) => ai !== alimentIdx)
              const macros = computeMacrosFromAliments(newAliments)
              return { ...r, aliments: newAliments, proteines_g: macros.p, glucides_g: macros.g, lipides_g: macros.l }
            }),
          }
        }),
      }
    }))
  }

  // ══════════════════════════════════════════════════════
  // BIBLIOTHÈQUE DE REPAS
  // ══════════════════════════════════════════════════════
  const saveRepasToBiblio = async (repasIdx) => {
    const r = activeJourType?.repas?.[repasIdx]
    if (!r) return
    if (!r.titre?.trim()) { toast.error('Nomme le repas avant de l\'enregistrer'); return }
    try {
      const { data: biblio, error } = await supabase
        .from('nutrition_repas_biblio')
        .insert({
          coach_id: user.id,
          nom: r.titre,
          type: r.type,
          description: r.description || null,
          proteines_g: +r.proteines_g || 0,
          glucides_g: +r.glucides_g || 0,
          lipides_g: +r.lipides_g || 0,
        })
        .select()
        .single()
      if (error) throw error

      // Copier les aliments
      if (r.aliments?.length) {
        const rows = r.aliments.map((a, i) => ({
          repas_biblio_id: biblio.id,
          aliment_id: a.aliment_id,
          quantite_g: a.quantite_g,
          ordre: i,
        }))
        const { error: alErr } = await supabase.from('nutrition_repas_biblio_aliments').insert(rows)
        if (alErr) throw alErr
      }

      toast.success(`Repas "${r.titre}" ajouté à ta bibliothèque`)
      // Refresh biblio
      const { data: refreshed } = await supabase
        .from('nutrition_repas_biblio')
        .select('*, nutrition_repas_biblio_aliments(*, aliments(*))')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })
      setBiblioRepas(refreshed || [])
    } catch (err) {
      console.error('[saveRepasToBiblio]', err)
      toast.error('Erreur : ' + (err.message || err))
    }
  }

  const insertRepasFromBiblio = (biblio) => {
    if (!activeJourType) { toast.error('Sélectionne un jour type d\'abord'); return }
    const aliments = (biblio.nutrition_repas_biblio_aliments || []).map(ra => ({
      aliment_id: ra.aliment_id,
      nom: ra.aliments?.nom || 'Aliment',
      quantite_g: ra.quantite_g,
      kcal_100g: ra.aliments?.kcal_100g || 0,
      proteines: ra.aliments?.proteines || 0,
      glucides: ra.aliments?.glucides || 0,
      lipides: ra.aliments?.lipides || 0,
      categorie: ra.aliments?.categorie || '',
    }))
    const macros = computeMacrosFromAliments(aliments)
    const newRepas = {
      id: `new-repas-${Date.now()}`,
      jour_type_id: activeJourType.id,
      type: biblio.type || 'dejeuner',
      ordre: (activeJourType.repas?.length || 0) + 1,
      titre: biblio.nom,
      description: biblio.description || '',
      proteines_g: aliments.length ? macros.p : biblio.proteines_g,
      glucides_g: aliments.length ? macros.g : biblio.glucides_g,
      lipides_g: aliments.length ? macros.l : biblio.lipides_g,
      aliments,
    }
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      return {
        ...p,
        jour_types: p.jour_types.map((jt, k) => {
          if (k !== activeJourTypeIdx) return jt
          return { ...jt, repas: [...(jt.repas || []), newRepas] }
        }),
      }
    }))
    setBiblioDrawer(false)
    toast.success(`"${biblio.nom}" ajouté au jour`)
  }

  const deleteFromBiblio = async (biblioId) => {
    if (!window.confirm('Supprimer ce repas de ta bibliothèque ?')) return
    const { error } = await supabase.from('nutrition_repas_biblio').delete().eq('id', biblioId)
    if (error) { toast.error('Erreur'); return }
    setBiblioRepas(prev => prev.filter(b => b.id !== biblioId))
  }

  // ══════════════════════════════════════════════════════
  // DUPLICATION
  // ══════════════════════════════════════════════════════
  const duplicateJourType = (jtIdx) => {
    const jt = activePhase.jour_types[jtIdx]
    if (!jt) return
    const cloned = {
      id: `new-jt-${Date.now()}`,
      phase_id: activePhase.id,
      nom: `${jt.nom} (copie)`,
      icon: jt.icon,
      ordre: (activePhase.jour_types.length || 0) + 1,
      notes: jt.notes,
      repas: (jt.repas || []).map(r => ({
        ...r,
        id: `new-repas-${Date.now()}-${Math.random()}`,
        aliments: (r.aliments || []).map(a => ({ ...a })),
      })),
    }
    setPhases(prev => prev.map((p, i) => {
      if (i !== activePhaseIdx) return p
      return { ...p, jour_types: [...p.jour_types, cloned] }
    }))
    setActiveJourTypeIdx(activePhase.jour_types.length)
    toast.success(`"${jt.nom}" dupliqué`)
  }

  // ══════════════════════════════════════════════════════
  // SAVE
  // ══════════════════════════════════════════════════════
  const handleSave = async () => {
    if (!programme.nom.trim()) { toast.error('Donne un nom au programme'); return }
    setSaving(true)

    try {
      // 1) Upsert programme
      const progPayload = {
        coach_id: user.id,
        client_id: programme.client_id || null,
        nom: programme.nom,
        description: programme.description || null,
        objectif: programme.objectif || null,
        duree_semaines: programme.duree_semaines,
        is_template: !programme.client_id,
        is_active: programme.is_active,
      }

      let progId = programme.id
      if (isNew && !progId) {
        const { data, error } = await supabase.from('nutrition_programmes').insert(progPayload).select().single()
        if (error) throw error
        progId = data.id
      } else {
        const { error } = await supabase.from('nutrition_programmes').update(progPayload).eq('id', progId)
        if (error) throw error
      }

      // 2) Delete removed entities
      if (deletedRepasIds.length) await supabase.from('nutrition_programme_repas').delete().in('id', deletedRepasIds)
      if (deletedJourTypeIds.length) await supabase.from('nutrition_jour_types').delete().in('id', deletedJourTypeIds)
      if (deletedPhaseIds.length) await supabase.from('nutrition_phases').delete().in('id', deletedPhaseIds)

      // 3) Upsert each phase + jour_types + repas + phase_jours
      for (const phase of phases) {
        const phasePayload = {
          programme_id: progId,
          nom: phase.nom,
          ordre: phase.ordre,
          semaine_debut: phase.semaine_debut,
          duree_semaines: phase.duree_semaines,
          kcal_cible: phase.kcal_cible || null,
          proteines_cible_g: phase.proteines_cible_g || null,
          glucides_cible_g: phase.glucides_cible_g || null,
          lipides_cible_g: phase.lipides_cible_g || null,
          notes: phase.notes || null,
        }

        let phaseId = phase.id
        if (phase.id.startsWith('new-')) {
          const { data, error } = await supabase.from('nutrition_phases').insert(phasePayload).select().single()
          if (error) throw error
          phaseId = data.id
        } else {
          const { error } = await supabase.from('nutrition_phases').update(phasePayload).eq('id', phaseId)
          if (error) throw error
        }

        // Jour types of this phase
        const jourTypeIdMap = {} // old temp id → real id (pour phase_jours)
        for (const jt of phase.jour_types) {
          const jtPayload = {
            phase_id: phaseId,
            nom: jt.nom,
            icon: jt.icon || 'dumbbell',
            ordre: jt.ordre,
            notes: jt.notes || null,
          }
          let jtId = jt.id
          if (jt.id.startsWith('new-')) {
            const { data, error } = await supabase.from('nutrition_jour_types').insert(jtPayload).select().single()
            if (error) throw error
            jtId = data.id
            jourTypeIdMap[jt.id] = jtId
          } else {
            const { error } = await supabase.from('nutrition_jour_types').update(jtPayload).eq('id', jtId)
            if (error) throw error
            jourTypeIdMap[jt.id] = jtId
          }

          // Repas of this jour_type
          for (const r of jt.repas || []) {
            const rPayload = {
              jour_type_id: jtId,
              type: r.type,
              ordre: r.ordre,
              titre: r.titre || null,
              description: r.description || null,
              proteines_g: +r.proteines_g || 0,
              glucides_g: +r.glucides_g || 0,
              lipides_g: +r.lipides_g || 0,
            }
            let repasId = r.id
            if (r.id.startsWith('new-')) {
              const { data, error } = await supabase.from('nutrition_programme_repas').insert(rPayload).select().single()
              if (error) throw error
              repasId = data.id
            } else {
              const { error } = await supabase.from('nutrition_programme_repas').update(rPayload).eq('id', repasId)
              if (error) throw error
            }

            // Aliments du repas — replace all (delete + reinsert)
            await supabase.from('nutrition_programme_repas_aliments').delete().eq('repas_id', repasId)
            if (r.aliments?.length) {
              const rows = r.aliments.map((a, ai) => ({
                repas_id: repasId,
                aliment_id: a.aliment_id,
                quantite_g: a.quantite_g,
                ordre: ai,
              }))
              const { error: alErr } = await supabase.from('nutrition_programme_repas_aliments').insert(rows)
              if (alErr) throw alErr
            }
          }
        }

        // Phase jours (upsert: delete all for this phase, reinsert)
        await supabase.from('nutrition_phase_jours').delete().eq('phase_id', phaseId)
        const phaseJoursRows = []
        for (let d = 0; d < 7; d++) {
          const rawJtId = phase.phase_jours[d]
          // Remplacer les IDs temp par les vrais
          const realJtId = rawJtId && rawJtId.startsWith?.('new-') ? jourTypeIdMap[rawJtId] : rawJtId
          if (realJtId) {
            phaseJoursRows.push({ phase_id: phaseId, jour_semaine: d, jour_type_id: realJtId })
          }
        }
        if (phaseJoursRows.length) {
          const { error } = await supabase.from('nutrition_phase_jours').insert(phaseJoursRows)
          if (error) throw error
        }
      }

      toast.success('Programme sauvegardé !')
      setDeletedPhaseIds([]); setDeletedJourTypeIds([]); setDeletedRepasIds([])

      if (isNew) navigate(`/coach/nutrition/programme/${progId}`)
      else loadProgramme()
    } catch (err) {
      console.error('[NutritionProgrammeBuilder] save err:', err)
      toast.error('Erreur de sauvegarde : ' + (err.message || err))
    }
    setSaving(false)
  }

  // ══════════════════════════════════════════════════════
  // DÉRIVÉS
  // ══════════════════════════════════════════════════════
  const currentRepas = activeJourType?.repas || []
  const jourTypeTotals = useMemo(() => {
    let p = 0, g = 0, l = 0
    currentRepas.forEach(r => { p += +r.proteines_g || 0; g += +r.glucides_g || 0; l += +r.lipides_g || 0 })
    return { p: Math.round(p), g: Math.round(g), l: Math.round(l), kcal: calcKcal(p, g, l) }
  }, [currentRepas])

  // Check des cibles : % atteint
  const kcalPct = activePhase?.kcal_cible > 0 ? Math.round((jourTypeTotals.kcal / activePhase.kcal_cible) * 100) : 0

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

          <button onClick={() => navigate('/coach/nutrition')}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all shrink-0">
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <input type="text" value={programme.nom}
              onChange={e => setProgramme(p => ({ ...p, nom: e.target.value }))}
              placeholder="Nom du programme (ex: Sèche 12 semaines)"
              className="w-full bg-transparent text-[var(--text-primary)] text-xl font-bold tracking-tight border-none focus:outline-none placeholder:text-[var(--text-muted)]" />
          </div>

          {/* Objectif */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Target size={14} className="text-[var(--text-muted)]" />
            <input type="text" value={programme.objectif}
              onChange={e => setProgramme(p => ({ ...p, objectif: e.target.value }))}
              placeholder="Objectif"
              className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-3 py-2 text-[var(--text-secondary)] text-xs w-40 focus:outline-none focus:border-[#FF6B2B]/40 transition-all" />
          </div>

          {/* Durée totale */}
          <div className="hidden md:flex items-center gap-1.5 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-3 py-2 shrink-0">
            <Calendar size={13} className="text-[var(--text-muted)]" />
            <input type="number" min={1} max={52} value={programme.duree_semaines}
              onChange={e => setProgramme(p => ({ ...p, duree_semaines: Math.max(1, +e.target.value) }))}
              className="w-10 bg-transparent text-[var(--text-primary)] text-xs font-bold text-center border-none focus:outline-none tabular-nums" />
            <span className="text-[var(--text-muted)] text-xs">sem.</span>
          </div>

          {/* Client picker */}
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

      {/* ═══ Timeline des phases ═══ */}
      {phases.length > 0 && (
        <div className="px-4 md:px-6 py-3 border-b border-[var(--border-base)] bg-[var(--bg-card)]/30">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--text-muted)] mb-2">
            <Layers size={11} /> Timeline · {programme.duree_semaines} semaines
          </div>
          <div className="flex gap-0.5 h-7 rounded-lg overflow-hidden bg-[var(--bg-surface)]">
            {phases.map((ph, i) => {
              const totalWeeks = programme.duree_semaines || 4
              const pct = Math.min(100, (ph.duree_semaines / totalWeeks) * 100)
              const isActive = i === activePhaseIdx
              return (
                <button key={ph.id} onClick={() => { setActivePhaseIdx(i); setActiveJourTypeIdx(0) }}
                  className={`flex items-center justify-center text-[10px] font-bold tracking-tight transition-all hover:brightness-110 ${
                    isActive ? 'text-white' : 'text-[var(--text-secondary)]'
                  }`}
                  style={{
                    width: `${pct}%`,
                    background: isActive ? '#FF6B2B' : `rgba(255,107,43,${0.12 + 0.08 * i})`,
                  }}>
                  {ph.nom}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ Phase tabs + add ═══ */}
      <div className="px-4 md:px-6 py-3 border-b border-[var(--border-base)] flex items-center gap-2 overflow-x-auto">
        {phases.map((ph, i) => (
          <button key={ph.id} onClick={() => { setActivePhaseIdx(i); setActiveJourTypeIdx(0) }}
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
                  className="bg-transparent text-[var(--text-primary)] text-lg font-bold tracking-tight border-none focus:outline-none flex-1 min-w-[200px] placeholder:text-[var(--text-muted)]"
                  placeholder="Nom de la phase" />
                <button onClick={() => removePhase(activePhaseIdx)}
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Supprimer la phase">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Phase config — durée + macros cibles */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl p-3">
                  <label className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] block mb-1.5">Durée</label>
                  <div className="flex items-baseline gap-1">
                    <input type="number" min={1} value={activePhase.duree_semaines}
                      onChange={e => updatePhase(activePhaseIdx, 'duree_semaines', Math.max(1, +e.target.value))}
                      className="w-12 bg-transparent text-[var(--text-primary)] text-lg font-black tabular-nums border-none focus:outline-none" />
                    <span className="text-[var(--text-muted)] text-xs">semaines</span>
                  </div>
                </div>
                <div className="relative bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl p-3 overflow-hidden">
                  <span className="absolute top-0 left-3 right-3 h-[2px] rounded-b-full bg-[#FF6B2B]" />
                  <label className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] block mb-1.5">Kcal cible</label>
                  <div className="flex items-baseline gap-1">
                    <input type="number" min={0} value={activePhase.kcal_cible || ''}
                      onChange={e => updatePhase(activePhaseIdx, 'kcal_cible', +e.target.value || null)}
                      placeholder="—"
                      className="w-16 bg-transparent text-[var(--text-primary)] text-lg font-black tabular-nums border-none focus:outline-none placeholder:text-[var(--text-muted)]" />
                    <span className="text-[var(--text-muted)] text-xs">kcal</span>
                  </div>
                </div>
                <div className="relative bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl p-3 overflow-hidden">
                  <span className="absolute top-0 left-3 right-3 h-[2px] rounded-b-full bg-[#FF6B2B]" />
                  <label className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] block mb-1.5">Protéines</label>
                  <div className="flex items-baseline gap-1">
                    <input type="number" min={0} value={activePhase.proteines_cible_g || ''}
                      onChange={e => updatePhase(activePhaseIdx, 'proteines_cible_g', +e.target.value || null)}
                      placeholder="—"
                      className="w-14 bg-transparent text-[var(--text-primary)] text-lg font-black tabular-nums border-none focus:outline-none" />
                    <span className="text-[var(--text-muted)] text-xs">g</span>
                  </div>
                </div>
                <div className="relative bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl p-3 overflow-hidden">
                  <span className="absolute top-0 left-3 right-3 h-[2px] rounded-b-full bg-[#FF9A6C]" />
                  <label className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] block mb-1.5">Glucides</label>
                  <div className="flex items-baseline gap-1">
                    <input type="number" min={0} value={activePhase.glucides_cible_g || ''}
                      onChange={e => updatePhase(activePhaseIdx, 'glucides_cible_g', +e.target.value || null)}
                      placeholder="—"
                      className="w-14 bg-transparent text-[var(--text-primary)] text-lg font-black tabular-nums border-none focus:outline-none" />
                    <span className="text-[var(--text-muted)] text-xs">g</span>
                  </div>
                </div>
                <div className="relative bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl p-3 overflow-hidden">
                  <span className="absolute top-0 left-3 right-3 h-[2px] rounded-b-full bg-[#FFCBA4]" />
                  <label className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] block mb-1.5">Lipides</label>
                  <div className="flex items-baseline gap-1">
                    <input type="number" min={0} value={activePhase.lipides_cible_g || ''}
                      onChange={e => updatePhase(activePhaseIdx, 'lipides_cible_g', +e.target.value || null)}
                      placeholder="—"
                      className="w-14 bg-transparent text-[var(--text-primary)] text-lg font-black tabular-nums border-none focus:outline-none" />
                    <span className="text-[var(--text-muted)] text-xs">g</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Week planner ── */}
            <div className="hero-card p-4 md:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={14} className="text-[var(--text-muted)]" strokeWidth={1.75} />
                <h3 className="text-[var(--text-primary)] text-sm font-bold tracking-tight">Semaine type</h3>
                <span className="text-[var(--text-muted)] text-[11px]">— assigne un jour type à chaque jour</span>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {JOURS_COURTS.map((j, dIdx) => {
                  const assignedJtId = activePhase.phase_jours[dIdx]
                  const assignedJt = activePhase.jour_types.find(jt => jt.id === assignedJtId)
                  return (
                    <div key={j} className="flex flex-col items-center gap-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{j}</p>
                      <select value={assignedJtId || ''}
                        onChange={e => assignJourTypeToDay(dIdx, e.target.value || null)}
                        className={`w-full appearance-none bg-[var(--bg-base)] border rounded-lg px-2 py-2 text-[11px] font-semibold focus:outline-none cursor-pointer transition-all ${
                          assignedJt
                            ? 'border-[#FF6B2B]/40 text-[var(--text-primary)]'
                            : 'border-[var(--border-subtle)] text-[var(--text-muted)]'
                        }`}>
                        <option value="">—</option>
                        {activePhase.jour_types.map(jt => (
                          <option key={jt.id} value={jt.id}>{jt.nom}</option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Jour types editor ── */}
            <div className="hero-card p-4 md:p-5">
              <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Dumbbell size={14} className="text-[var(--text-muted)]" strokeWidth={1.75} />
                  <h3 className="text-[var(--text-primary)] text-sm font-bold tracking-tight">Jours types</h3>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <button onClick={() => addJourType('Jour entraînement')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)]/80 border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] font-semibold transition-colors">
                    <Plus size={11} /> Entraînement
                  </button>
                  <button onClick={() => addJourType('Jour repos')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)]/80 border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] font-semibold transition-colors">
                    <Plus size={11} /> Repos
                  </button>
                  <button onClick={() => addJourType('Refeed')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)]/80 border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] font-semibold transition-colors">
                    <Plus size={11} /> Refeed
                  </button>
                </div>
              </div>

              {activePhase.jour_types.length === 0 ? (
                <div className="text-center py-10 animate-breathe">
                  <Dumbbell size={22} className="text-[var(--text-muted)] mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-[var(--text-muted)] text-xs">Crée ton premier jour type (entraînement, repos...)</p>
                </div>
              ) : (
                <>
                  {/* Jour type tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 -mx-2 px-2">
                    {activePhase.jour_types.map((jt, i) => (
                      <button key={jt.id} onClick={() => setActiveJourTypeIdx(i)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                          i === activeJourTypeIdx
                            ? 'bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/30'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-transparent'
                        }`}>
                        {jt.nom}
                      </button>
                    ))}
                  </div>

                  {activeJourType && (
                    <div className="space-y-4">
                      {/* Jour type header + nom */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <input type="text" value={activeJourType.nom}
                          onChange={e => updateJourType(activeJourTypeIdx, 'nom', e.target.value)}
                          className="bg-transparent text-[var(--text-primary)] text-base font-bold tracking-tight border-none focus:outline-none flex-1 min-w-[200px]"
                          placeholder="Nom du jour type" />
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Totals */}
                          <span className="text-[var(--text-primary)] text-xs font-black tabular-nums">{jourTypeTotals.kcal} <span className="text-[var(--text-muted)] font-semibold">kcal</span></span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums text-[var(--text-secondary)]">
                            <span className="w-1.5 h-1.5 rounded-sm bg-[#FF6B2B]" /> {jourTypeTotals.p}g
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums text-[var(--text-secondary)]">
                            <span className="w-1.5 h-1.5 rounded-sm bg-[#FF9A6C]" /> {jourTypeTotals.g}g
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums text-[var(--text-secondary)]">
                            <span className="w-1.5 h-1.5 rounded-sm bg-[#FFCBA4]" /> {jourTypeTotals.l}g
                          </span>
                          {activePhase.kcal_cible > 0 && (
                            <Ring value={jourTypeTotals.kcal} max={activePhase.kcal_cible} size={30} thickness={3}
                              color={kcalPct > 110 ? '#ef4444' : kcalPct >= 90 ? '#22c55e' : '#FF6B2B'}
                              trackColor="var(--ring-track)">
                              <span className="text-[8px] font-black tabular-nums text-[var(--text-primary)]">{kcalPct}%</span>
                            </Ring>
                          )}
                          <button onClick={() => duplicateJourType(activeJourTypeIdx)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#FF6B2B] hover:bg-[#FF6B2B]/10 transition-all"
                            title="Dupliquer ce jour type">
                            <Copy size={13} />
                          </button>
                          <button onClick={() => removeJourType(activeJourTypeIdx)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Supprimer le jour type">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Bibliothèque + Shopping list */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => { setBiblioDrawer(true); setBiblioSearch('') }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-base)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] font-semibold transition-colors">
                          <Book size={11} strokeWidth={1.75} /> Bibliothèque ({biblioRepas.length})
                        </button>
                        <button onClick={() => setShoppingOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-base)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] font-semibold transition-colors">
                          <ShoppingCart size={11} strokeWidth={1.75} /> Liste de courses
                        </button>
                      </div>

                      {/* Repas list */}
                      <div className="space-y-2">
                        {currentRepas.length === 0 ? (
                          <div className="text-center py-8 animate-breathe">
                            <Utensils size={22} className="text-[var(--text-muted)] mx-auto mb-3" strokeWidth={1.5} />
                            <p className="text-[var(--text-muted)] text-xs">Aucun repas. Ajoute-en ci-dessous ↓</p>
                          </div>
                        ) : (
                          currentRepas.map((r, rIdx) => {
                            const typeMeta = REPAS_TYPES.find(t => t.id === r.type)
                            const RepasIcon = typeMeta?.icon || Utensils
                            const rKcal = calcKcal(r.proteines_g, r.glucides_g, r.lipides_g)
                            return (
                              <div key={r.id} className="group bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl overflow-hidden">
                                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border-subtle)]">
                                  <RepasIcon size={13} className="text-[var(--text-muted)]" strokeWidth={1.75} />
                                  <span className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-[0.14em] flex-1">{typeMeta?.label || r.type}</span>
                                  <span className="text-[var(--text-primary)] text-xs font-black tabular-nums">{rKcal} <span className="text-[var(--text-muted)] font-semibold">kcal</span></span>
                                  <button onClick={() => saveRepasToBiblio(rIdx)}
                                    className="p-1 rounded text-[var(--text-muted)] hover:text-[#FF6B2B] hover:bg-[#FF6B2B]/10 transition-all opacity-0 group-hover:opacity-100"
                                    title="Enregistrer dans ma bibliothèque">
                                    <BookmarkPlus size={12} />
                                  </button>
                                  <button onClick={() => removeRepas(rIdx)}
                                    className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                                <div className="p-4 space-y-2">
                                  <input type="text" value={r.titre || ''}
                                    onChange={e => updateRepas(rIdx, 'titre', e.target.value)}
                                    placeholder="Nom du repas (ex: Bowl cake avoine)"
                                    className="w-full bg-transparent text-[var(--text-primary)] text-sm font-bold border-none focus:outline-none placeholder:text-[var(--text-muted)]" />
                                  <textarea value={r.description || ''}
                                    onChange={e => updateRepas(rIdx, 'description', e.target.value)}
                                    placeholder="Ingrédients, instructions..."
                                    rows={2}
                                    className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-xs placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/30 transition-all resize-none" />

                                  {/* Aliments list (V2) */}
                                  {(r.aliments || []).length > 0 && (
                                    <div className="space-y-1 pt-1">
                                      <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-[0.14em]">Aliments · macros auto</p>
                                      {r.aliments.map((a, aIdx) => {
                                        const ratio = (a.quantite_g || 0) / 100
                                        const aKcal = Math.round((a.kcal_100g || 0) * ratio)
                                        return (
                                          <div key={aIdx} className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-[var(--bg-card)] group/alim">
                                            <div className="flex-1 min-w-0">
                                              <p className="text-[var(--text-primary)] text-xs font-semibold truncate">{a.nom}</p>
                                              <p className="text-[var(--text-muted)] text-[9px] tabular-nums">{aKcal} kcal · {Math.round((a.proteines || 0) * ratio * 10) / 10}P / {Math.round((a.glucides || 0) * ratio * 10) / 10}G / {Math.round((a.lipides || 0) * ratio * 10) / 10}L</p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                              <button onClick={() => updateAlimentQty(rIdx, aIdx, (a.quantite_g || 0) - 25)}
                                                className="w-5 h-5 rounded bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                                                <Minus size={10} />
                                              </button>
                                              <input type="number" min={0} value={a.quantite_g || 0}
                                                onChange={e => updateAlimentQty(rIdx, aIdx, e.target.value)}
                                                className="w-12 bg-[var(--bg-surface)] rounded px-1 py-0.5 text-[var(--text-primary)] text-[10px] font-bold tabular-nums text-center border-none focus:outline-none" />
                                              <span className="text-[var(--text-muted)] text-[9px]">g</span>
                                              <button onClick={() => updateAlimentQty(rIdx, aIdx, (a.quantite_g || 0) + 25)}
                                                className="w-5 h-5 rounded bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                                                <Plus size={10} />
                                              </button>
                                              <button onClick={() => removeAlimentFromRepas(rIdx, aIdx)}
                                                className="w-5 h-5 rounded text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover/alim:opacity-100 transition-all">
                                                <X size={10} />
                                              </button>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between gap-2">
                                    <div className="grid grid-cols-3 gap-2 flex-1">
                                      <div className="flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5">
                                        <span className="w-1.5 h-1.5 rounded-sm bg-[#FF6B2B]" />
                                        <span className="text-[10px] text-[var(--text-muted)] font-semibold">P</span>
                                        <input type="number" min={0} value={r.proteines_g || ''}
                                          onChange={e => updateRepas(rIdx, 'proteines_g', e.target.value)}
                                          placeholder="0"
                                          disabled={(r.aliments || []).length > 0}
                                          className="w-10 bg-transparent text-[var(--text-primary)] text-xs font-black tabular-nums text-right border-none focus:outline-none disabled:opacity-70" />
                                        <span className="text-[10px] text-[var(--text-muted)]">g</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5">
                                        <span className="w-1.5 h-1.5 rounded-sm bg-[#FF9A6C]" />
                                        <span className="text-[10px] text-[var(--text-muted)] font-semibold">G</span>
                                        <input type="number" min={0} value={r.glucides_g || ''}
                                          onChange={e => updateRepas(rIdx, 'glucides_g', e.target.value)}
                                          placeholder="0"
                                          disabled={(r.aliments || []).length > 0}
                                          className="w-10 bg-transparent text-[var(--text-primary)] text-xs font-black tabular-nums text-right border-none focus:outline-none disabled:opacity-70" />
                                        <span className="text-[10px] text-[var(--text-muted)]">g</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5">
                                        <span className="w-1.5 h-1.5 rounded-sm bg-[#FFCBA4]" />
                                        <span className="text-[10px] text-[var(--text-muted)] font-semibold">L</span>
                                        <input type="number" min={0} value={r.lipides_g || ''}
                                          onChange={e => updateRepas(rIdx, 'lipides_g', e.target.value)}
                                          placeholder="0"
                                          disabled={(r.aliments || []).length > 0}
                                          className="w-10 bg-transparent text-[var(--text-primary)] text-xs font-black tabular-nums text-right border-none focus:outline-none disabled:opacity-70" />
                                        <span className="text-[10px] text-[var(--text-muted)]">g</span>
                                      </div>
                                    </div>
                                    <button onClick={() => { setAlimentDrawer({ repasIdx: rIdx }); setAlimentSearch('') }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FF6B2B]/10 text-[#FF6B2B] hover:bg-[#FF6B2B]/20 border border-[#FF6B2B]/20 text-[10px] font-semibold transition-colors shrink-0"
                                      title="Ajouter un aliment (macros auto-calculées)">
                                      <Plus size={11} /> Aliment
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}

                        {/* Add repas buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-2">
                          {REPAS_TYPES.map(t => {
                            const Icon = t.icon
                            return (
                              <button key={t.id} onClick={() => addRepas(t.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-base)] hover:bg-[var(--bg-surface)] border border-dashed border-[var(--border-base)] hover:border-[#FF6B2B]/30 text-[var(--text-muted)] hover:text-[#FF6B2B] text-[10px] font-semibold transition-colors">
                                <Icon size={11} strokeWidth={1.75} />
                                {t.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* DRAWER ALIMENTS                        */}
      {/* ══════════════════════════════════════ */}
      {alimentDrawer && (() => {
        // Liste unique des catégories disponibles (avec compteur)
        const categoryCounts = allAliments.reduce((acc, a) => {
          const c = a.categorie || 'Autre'
          acc[c] = (acc[c] || 0) + 1
          return acc
        }, {})
        const categories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])

        // Filtrage + tri
        const filtered = allAliments
          .filter(a => {
            if (alimentCategoryFilter && a.categorie !== alimentCategoryFilter) return false
            if (alimentSearch.trim() && !a.nom.toLowerCase().includes(alimentSearch.toLowerCase())) return false
            return true
          })
          .sort((a, b) => {
            if (alimentSortBy === 'kcal') return (b.kcal_100g || 0) - (a.kcal_100g || 0)
            if (alimentSortBy === 'proteines') return (b.proteines || 0) - (a.proteines || 0)
            return (a.nom || '').localeCompare(b.nom || '', 'fr')
          })

        return (
          <>
            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setAlimentDrawer(null)} />
            <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[var(--bg-card)] border-l border-[var(--border-base)] shadow-2xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-[var(--border-base)] flex items-center justify-between">
                <div>
                  <h3 className="text-[var(--text-primary)] text-base font-bold tracking-tight">Ajouter un aliment</h3>
                  <p className="text-[var(--text-muted)] text-xs mt-0.5">
                    <span className="text-[var(--text-primary)] font-semibold tabular-nums">{filtered.length}</span>
                    {' / '}
                    <span className="tabular-nums">{allAliments.length}</span>
                    {' aliments'}
                    {(alimentSearch.trim() || alimentCategoryFilter) && (
                      <button onClick={() => { setAlimentSearch(''); setAlimentCategoryFilter('') }}
                        className="ml-2 text-[#FF6B2B] font-semibold hover:underline">
                        · Réinitialiser
                      </button>
                    )}
                  </p>
                </div>
                <button onClick={() => setAlimentDrawer(null)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all">
                  <X size={16} />
                </button>
              </div>

              {/* Search + Sort */}
              <div className="px-5 py-3 border-b border-[var(--border-base)] space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input type="text" value={alimentSearch} onChange={e => setAlimentSearch(e.target.value)}
                      placeholder="Rechercher..."
                      autoFocus
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl pl-9 pr-3 py-2 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40" />
                  </div>
                  <select value={alimentSortBy} onChange={e => setAlimentSortBy(e.target.value)}
                    className="appearance-none bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] cursor-pointer focus:outline-none focus:border-[#FF6B2B]/40"
                    title="Trier">
                    <option value="nom">A→Z</option>
                    <option value="kcal">Kcal ↓</option>
                    <option value="proteines">Protéines ↓</option>
                  </select>
                </div>

                {/* Category chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                  <button onClick={() => setAlimentCategoryFilter('')}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-[0.1em] transition-all ${
                      alimentCategoryFilter === ''
                        ? 'bg-[#FF6B2B] text-white'
                        : 'bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}>
                    Tous <span className="opacity-70 tabular-nums">· {allAliments.length}</span>
                  </button>
                  {categories.map(([cat, n]) => (
                    <button key={cat} onClick={() => setAlimentCategoryFilter(cat === alimentCategoryFilter ? '' : cat)}
                      className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-[0.1em] transition-all ${
                        alimentCategoryFilter === cat
                          ? 'bg-[#FF6B2B] text-white'
                          : 'bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}>
                      {cat} <span className="opacity-70 tabular-nums">· {n}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 animate-breathe">
                    <Search size={22} className="text-[var(--text-muted)] mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-[var(--text-muted)] text-sm font-semibold">Aucun aliment trouvé</p>
                    <p className="text-[var(--text-muted)] text-[11px] mt-1">Essaie une autre recherche ou catégorie</p>
                  </div>
                ) : (
                  filtered.slice(0, 150).map(a => (
                    <button key={a.id}
                      onClick={() => { addAlimentToRepas(alimentDrawer.repasIdx, a); setAlimentDrawer(null) }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-surface)] transition-colors text-left">
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--text-primary)] text-sm font-semibold truncate">{a.nom}</p>
                        <p className="text-[var(--text-muted)] text-[10px] tabular-nums">{a.kcal_100g || 0} kcal/100g · {a.proteines || 0}P / {a.glucides || 0}G / {a.lipides || 0}L</p>
                      </div>
                      {a.categorie && (
                        <span className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wider bg-[var(--bg-base)] px-2 py-0.5 rounded-md shrink-0">
                          {a.categorie}
                        </span>
                      )}
                    </button>
                  ))
                )}
                {filtered.length > 150 && (
                  <p className="text-center text-[var(--text-muted)] text-[10px] pt-3">
                    {filtered.length - 150} autres résultats — affine ta recherche pour voir plus
                  </p>
                )}
              </div>
            </div>
          </>
        )
      })()}

      {/* ══════════════════════════════════════ */}
      {/* DRAWER BIBLIOTHÈQUE REPAS              */}
      {/* ══════════════════════════════════════ */}
      {biblioDrawer && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setBiblioDrawer(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[var(--bg-card)] border-l border-[var(--border-base)] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[var(--border-base)] flex items-center justify-between">
              <div>
                <h3 className="text-[var(--text-primary)] text-base font-bold tracking-tight">Bibliothèque de repas</h3>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">{biblioRepas.length} repas enregistrés · clic pour ajouter</p>
              </div>
              <button onClick={() => setBiblioDrawer(false)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-3 border-b border-[var(--border-base)]">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input type="text" value={biblioSearch} onChange={e => setBiblioSearch(e.target.value)}
                  placeholder="Rechercher dans ta bibliothèque..."
                  autoFocus
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl pl-9 pr-3 py-2 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {biblioRepas.length === 0 ? (
                <div className="text-center py-12 animate-breathe">
                  <Book size={22} className="text-[var(--text-muted)] mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-[var(--text-muted)] text-xs">Aucun repas enregistré</p>
                  <p className="text-[var(--text-muted)] text-[11px] mt-1">Utilise l'icône 🔖 sur un repas pour l'enregistrer ici</p>
                </div>
              ) : (
                biblioRepas
                  .filter(b => !biblioSearch.trim() || (b.nom || '').toLowerCase().includes(biblioSearch.toLowerCase()))
                  .map(b => {
                    const typeMeta = REPAS_TYPES.find(t => t.id === b.type)
                    const BIcon = typeMeta?.icon || Utensils
                    const bKcal = calcKcal(b.proteines_g, b.glucides_g, b.lipides_g)
                    const nAliments = b.nutrition_repas_biblio_aliments?.length || 0
                    return (
                      <div key={b.id}
                        className="group bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl p-3 hover:border-[#FF6B2B]/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <BIcon size={14} className="text-[var(--text-muted)] shrink-0" strokeWidth={1.75} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[var(--text-primary)] text-sm font-bold truncate">{b.nom}</p>
                            <p className="text-[var(--text-muted)] text-[10px] tabular-nums">{bKcal} kcal · {b.proteines_g}P/{b.glucides_g}G/{b.lipides_g}L · {nAliments} aliment{nAliments > 1 ? 's' : ''}</p>
                          </div>
                          <button onClick={() => insertRepasFromBiblio(b)}
                            className="px-3 py-1.5 rounded-lg bg-[#FF6B2B] text-white text-[10px] font-semibold hover:bg-[#FF6B2B]/90 transition-all active:scale-95">
                            Ajouter
                          </button>
                          <button onClick={() => deleteFromBiblio(b.id)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                            title="Supprimer">
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

      {/* ══════════════════════════════════════ */}
      {/* MODAL SHOPPING LIST                    */}
      {/* ══════════════════════════════════════ */}
      {shoppingOpen && (() => {
        // Agrège tous les aliments de tout le programme avec quantité × nb de jours où ils apparaissent
        const totalsByAliment = {} // aliment_id → { nom, categorie, totalG }
        phases.forEach(phase => {
          // Compte combien de fois chaque jour_type apparaît dans la semaine
          const jourTypeUseCount = {}
          for (let d = 0; d < 7; d++) {
            const jtId = phase.phase_jours[d]
            if (jtId) jourTypeUseCount[jtId] = (jourTypeUseCount[jtId] || 0) + 1
          }
          // Pour chaque jour_type, additionne ses aliments × nb apparitions × nb semaines phase
          phase.jour_types.forEach(jt => {
            const nUse = (jourTypeUseCount[jt.id] || 0) * phase.duree_semaines
            if (nUse === 0) return
            jt.repas?.forEach(r => {
              r.aliments?.forEach(a => {
                const key = a.aliment_id
                if (!totalsByAliment[key]) {
                  totalsByAliment[key] = { nom: a.nom, categorie: a.categorie, totalG: 0 }
                }
                totalsByAliment[key].totalG += (a.quantite_g || 0) * nUse
              })
            })
          })
        })
        const grouped = {}
        Object.values(totalsByAliment).forEach(a => {
          const cat = a.categorie || 'Autres'
          if (!grouped[cat]) grouped[cat] = []
          grouped[cat].push(a)
        })

        return (
          <>
            <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setShoppingOpen(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-2xl max-h-[85vh] bg-[var(--bg-card)] border border-[var(--border-base)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-[var(--border-base)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShoppingCart size={16} className="text-[var(--text-muted)]" strokeWidth={1.75} />
                    <div>
                      <h3 className="text-[var(--text-primary)] text-lg font-bold tracking-tight">Liste de courses</h3>
                      <p className="text-[var(--text-muted)] text-xs mt-0.5">Totaux sur toute la durée du programme ({programme.duree_semaines} semaines)</p>
                    </div>
                  </div>
                  <button onClick={() => setShoppingOpen(false)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {Object.keys(grouped).length === 0 ? (
                    <div className="text-center py-12 animate-breathe">
                      <ShoppingCart size={24} className="text-[var(--text-muted)] mx-auto mb-3" strokeWidth={1.5} />
                      <p className="text-[var(--text-muted)] text-sm">Aucun aliment dans le programme</p>
                      <p className="text-[var(--text-muted)] text-[11px] mt-1">Ajoute des aliments aux repas pour voir la liste ici</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {Object.entries(grouped).map(([cat, list]) => (
                        <div key={cat}>
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] mb-2">{cat}</p>
                          <div className="space-y-1">
                            {list.sort((a, b) => b.totalG - a.totalG).map((a, i) => (
                              <div key={i} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                                <p className="text-[var(--text-primary)] text-sm font-semibold truncate flex-1">{a.nom}</p>
                                <p className="text-[var(--text-primary)] text-sm font-black tabular-nums shrink-0">
                                  {a.totalG >= 1000 ? `${(a.totalG / 1000).toFixed(1)} kg` : `${Math.round(a.totalG)} g`}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 border-t border-[var(--border-base)] flex items-center justify-between">
                  <p className="text-[var(--text-muted)] text-[11px]">
                    <span className="text-[var(--text-primary)] font-semibold">{Object.values(totalsByAliment).length}</span> aliments · {Object.keys(grouped).length} catégories
                  </p>
                  <button onClick={() => setShoppingOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs font-semibold hover:text-[var(--text-primary)] transition-colors border border-[var(--border-subtle)]">
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}
