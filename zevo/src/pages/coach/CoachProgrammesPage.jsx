import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import {
  Plus, ChevronRight, ChevronDown, Trash2, Users,
  Calendar, Layers, Loader2, Save, X, ArrowLeft, Edit3,
  Dumbbell, Search, Apple, Image as ImageIcon,
  BookOpen, FileText, Video, Link as LinkIcon, CheckSquare
} from 'lucide-react'

// Icônes & couleurs par type de ressource
const RESSOURCE_ICONS = {
  pdf: { icon: FileText, color: 'text-red-400', bg: 'bg-red-500/10' },
  video: { icon: Video, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  lien: { icon: LinkIcon, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  image: { icon: ImageIcon, color: 'text-green-400', bg: 'bg-green-500/10' },
  guide: { icon: BookOpen, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
}

const CATEGORIES = ['Remise en forme', 'Perte de poids', 'Prise de masse', 'Bien-être', 'Nutrition', 'Mindset', 'Autre']

export default function CoachProgrammesPage() {
  const { user } = useAuth()
  const toast = useToast()

  const [view, setView] = useState('list')
  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(true)

  const [editProgramme, setEditProgramme] = useState(null)
  const [phases, setPhases] = useState([])
  const [saving, setSaving] = useState(false)
  const [assignationCounts, setAssignationCounts] = useState({})

  // Bibliothèque d'exercices
  const [allExercises, setAllExercises] = useState([])
  // Bibliothèque de ressources du coach
  const [allRessources, setAllRessources] = useState([])

  useEffect(() => {
    if (!user) return
    loadProgrammes()
    loadExercises()
    loadRessources()
  }, [user])

  const loadExercises = async () => {
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .order('category, name')
    setAllExercises(data || [])
  }

  const loadRessources = async () => {
    const { data } = await supabase
      .from('ressources')
      .select('id, titre, type, url, categorie, description')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
    setAllRessources(data || [])
  }

  const loadProgrammes = async () => {
    setLoading(true)
    const { data: progs } = await supabase
      .from('programmes')
      .select('*')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })

    setProgrammes(progs || [])

    if (progs?.length) {
      const { data: assignations } = await supabase
        .from('programme_assignations')
        .select('programme_id')
        .eq('coach_id', user.id)

      const counts = {}
      ;(assignations || []).forEach(a => {
        counts[a.programme_id] = (counts[a.programme_id] || 0) + 1
      })
      setAssignationCounts(counts)
    }
    setLoading(false)
  }

  // ── Créer un nouveau programme ──
  const handleNew = () => {
    setEditProgramme({
      id: null, titre: '', description: '',
      duree_semaines: 4, categorie: '', actif: true,
    })
    setPhases([{
      id: crypto.randomUUID(), titre: 'Phase 1', description: '',
      ordre: 1, duree_semaines: 1,
      habitudes: [], objectifs: [], exercices: [], ressources_attachees: [],
      calories_objectif: null, proteines_g: null, glucides_g: null, lipides_g: null,
      consignes_nutrition: '',
      isNew: true,
    }])
    setView('editor')
  }

  // ── Ouvrir un programme existant ──
  const handleEdit = async (prog) => {
    setEditProgramme(prog)
    const { data: phasesData } = await supabase
      .from('programme_phases')
      .select('*')
      .eq('programme_id', prog.id)
      .order('ordre', { ascending: true })

    setPhases((phasesData || []).map(p => ({ ...p, isNew: false })))
    setView('editor')
  }

  // ── Sauvegarder le programme + phases ──
  const handleSave = async () => {
    if (!editProgramme.titre.trim()) {
      toast.error('Le titre du programme est requis.')
      return
    }
    setSaving(true)

    try {
      let programmeId = editProgramme.id

      if (programmeId) {
        await supabase.from('programmes').update({
          titre: editProgramme.titre,
          description: editProgramme.description,
          duree_semaines: editProgramme.duree_semaines,
          categorie: editProgramme.categorie,
          actif: editProgramme.actif,
        }).eq('id', programmeId)
      } else {
        const { data, error } = await supabase.from('programmes').insert({
          coach_id: user.id,
          titre: editProgramme.titre,
          description: editProgramme.description,
          duree_semaines: editProgramme.duree_semaines,
          categorie: editProgramme.categorie,
          actif: editProgramme.actif,
        }).select().single()

        if (error) throw error
        programmeId = data.id
      }

      // Delete + recreate phases
      await supabase.from('programme_phases').delete().eq('programme_id', programmeId)

      if (phases.length > 0) {
        const phasesToInsert = phases.map((p, i) => ({
          programme_id: programmeId,
          titre: p.titre,
          description: p.description,
          ordre: i + 1,
          duree_semaines: p.duree_semaines,
          habitudes: p.habitudes || [],
          objectifs: p.objectifs || [],
          exercices: p.exercices || [],
          ressources_attachees: p.ressources_attachees || [],
          calories_objectif: p.calories_objectif || null,
          proteines_g: p.proteines_g || null,
          glucides_g: p.glucides_g || null,
          lipides_g: p.lipides_g || null,
          consignes_nutrition: p.consignes_nutrition || null,
        }))
        await supabase.from('programme_phases').insert(phasesToInsert)
      }

      toast.success('Programme enregistré avec succès !')
      await loadProgrammes()
      setView('list')
    } catch (err) {
      console.error('Erreur sauvegarde programme:', err)
      toast.error('Erreur lors de l\'enregistrement. Réessayez.')
    }
    setSaving(false)
  }

  const handleDelete = async (progId) => {
    if (!confirm('Supprimer ce programme ? Les assignations en cours seront aussi supprimées.')) return
    await supabase.from('programmes').delete().eq('id', progId)
    setProgrammes(prev => prev.filter(p => p.id !== progId))
    toast.success('Programme supprimé.')
  }

  // ── Gestion des phases ──
  const addPhase = () => {
    setPhases(prev => [...prev, {
      id: crypto.randomUUID(),
      titre: `Phase ${prev.length + 1}`,
      description: '', ordre: prev.length + 1, duree_semaines: 1,
      habitudes: [], objectifs: [], exercices: [], ressources_attachees: [],
      calories_objectif: null, proteines_g: null, glucides_g: null, lipides_g: null,
      consignes_nutrition: '',
      isNew: true,
    }])
  }

  const updatePhase = (index, field, value) => {
    setPhases(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  const removePhase = (index) => {
    if (phases.length <= 1) return
    setPhases(prev => prev.filter((_, i) => i !== index))
  }

  const removeFromPhase = (phaseIndex, type, itemIndex) => {
    setPhases(prev => prev.map((p, i) => {
      if (i !== phaseIndex) return p
      const updated = [...(p[type] || [])]
      updated.splice(itemIndex, 1)
      return { ...p, [type]: updated }
    }))
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#FF6B2B]" size={32} />
      </div>
    )
  }

  // ═══════════════════════════════════════
  // VUE ÉDITEUR
  // ═══════════════════════════════════════
  if (view === 'editor') {
    return (
      <div className="p-6 w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-[#F5F5F3] text-2xl font-bold">
              {editProgramme.id ? 'Modifier le programme' : 'Nouveau programme'}
            </h1>
            <p className="text-white/30 text-sm mt-0.5">Construis un parcours premium pour tes clients</p>
          </div>
        </div>

        {/* ── Card Informations ── */}
        <div className="bg-[#1E1E1E] rounded-2xl border border-white/[0.06] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-[#F5F5F3] font-semibold">Informations générales</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm text-white/50 mb-1.5 font-medium">Titre du programme</label>
              <input type="text" value={editProgramme.titre}
                onChange={(e) => setEditProgramme(prev => ({ ...prev, titre: e.target.value }))}
                placeholder="Ex : Transformation 12 semaines"
                className="w-full bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-4 py-3 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 focus:ring-1 focus:ring-[#FF6B2B]/20 transition-all" />
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1.5 font-medium">Description</label>
              <textarea value={editProgramme.description || ''}
                onChange={(e) => setEditProgramme(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Décris le programme en quelques lignes..."
                rows={3}
                className="w-full bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-4 py-3 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 focus:ring-1 focus:ring-[#FF6B2B]/20 transition-all resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/50 mb-1.5 font-medium">Durée (semaines)</label>
                <input type="number" min={1} max={52} value={editProgramme.duree_semaines}
                  onChange={(e) => setEditProgramme(prev => ({ ...prev, duree_semaines: parseInt(e.target.value) || 4 }))}
                  className="w-full bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-4 py-3 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/50 focus:ring-1 focus:ring-[#FF6B2B]/20 transition-all" />
              </div>
              <div>
                <label className="block text-sm text-white/50 mb-1.5 font-medium">Catégorie</label>
                <select value={editProgramme.categorie || ''}
                  onChange={(e) => setEditProgramme(prev => ({ ...prev, categorie: e.target.value }))}
                  className="w-full bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-4 py-3 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/50 focus:ring-1 focus:ring-[#FF6B2B]/20 transition-all">
                  <option value="">Choisir...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Phases ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[#F5F5F3] text-lg font-semibold">Phases du programme</h2>
            <button onClick={addPhase}
              className="inline-flex items-center gap-1.5 text-sm text-[#FF6B2B] hover:text-[#FF9A6C] transition-colors font-medium">
              <Plus size={16} /> Ajouter une phase
            </button>
          </div>

          <div className="space-y-0">
            {phases.map((phase, index) => (
              <PhaseEditor
                key={phase.id}
                phase={phase}
                index={index}
                isLast={index === phases.length - 1}
                allExercises={allExercises}
                allRessources={allRessources}
                onUpdate={(field, value) => updatePhase(index, field, value)}
                onRemove={() => removePhase(index)}
                onRemoveItem={(type, itemIndex) => removeFromPhase(index, type, itemIndex)}
                canRemove={phases.length > 1}
                setPhases={setPhases}
              />
            ))}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 justify-end pb-8 pt-2">
          <button onClick={() => setView('list')}
            className="px-6 py-3 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/[0.04] transition-all">
            Annuler
          </button>
          <button onClick={handleSave}
            disabled={saving || !editProgramme.titre.trim()}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-50 shadow-lg shadow-[#FF6B2B]/20">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Enregistrement...' : 'Sauvegarder le programme'}
          </button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // VUE LISTE
  // ═══════════════════════════════════════
  return (
    <div className="p-6 w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#F5F5F3] text-2xl font-bold">Programmes</h1>
          <p className="text-white/40 text-sm mt-0.5">Crée des parcours multi-semaines et assigne-les en 1 clic</p>
        </div>
        <button onClick={handleNew}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all shadow-lg shadow-[#FF6B2B]/20">
          <Plus size={16} /> Nouveau programme
        </button>
      </div>

      {programmes.length === 0 && (
        <div className="bg-[#1E1E1E] rounded-2xl border border-white/[0.06] p-16 text-center">
          <div className="w-16 h-16 bg-[#FF6B2B]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Layers size={28} className="text-[#FF6B2B]" />
          </div>
          <h3 className="text-[#F5F5F3] font-semibold text-lg mb-2">Aucun programme</h3>
          <p className="text-white/40 text-sm mb-8 max-w-sm mx-auto">
            Crée ton premier programme de coaching structuré avec exercices, nutrition et phases personnalisées
          </p>
          <button onClick={handleNew}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all shadow-lg shadow-[#FF6B2B]/20">
            <Plus size={16} /> Créer un programme
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {programmes.map((prog) => (
          <div key={prog.id}
            className="bg-[#1E1E1E] rounded-2xl border border-white/[0.06] overflow-hidden hover:border-white/[0.12] transition-all group shadow-sm hover:shadow-md hover:shadow-black/20">
            {/* Gradient top bar */}
            <div className="h-1 bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]" />

            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#F5F5F3] font-semibold text-base truncate">{prog.titre}</h3>
                  {prog.description && (
                    <p className="text-white/35 text-sm mt-1 line-clamp-2">{prog.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 ml-3 shrink-0">
                  <button onClick={() => handleEdit(prog)}
                    className="p-2 rounded-lg text-white/25 hover:text-white hover:bg-white/[0.06] transition-all" title="Modifier">
                    <Edit3 size={15} />
                  </button>
                  <button onClick={() => handleDelete(prog.id)}
                    className="p-2 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Supprimer">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-white/40 mt-4">
                <span className="inline-flex items-center gap-1.5 bg-[#2A2A2A] px-2.5 py-1 rounded-lg">
                  <Calendar size={12} /> {prog.duree_semaines} sem.
                </span>
                {prog.categorie && (
                  <span className="px-2.5 py-1 rounded-lg bg-[#FF6B2B]/10 text-[#FF6B2B] font-medium">
                    {prog.categorie}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 bg-[#2A2A2A] px-2.5 py-1 rounded-lg">
                  <Users size={12} /> {assignationCounts[prog.id] || 0}
                </span>
              </div>

              <button onClick={() => handleEdit(prog)}
                className="mt-5 w-full py-2.5 rounded-xl bg-white/[0.04] text-white/50 text-sm font-medium hover:bg-white/[0.08] hover:text-white transition-all flex items-center justify-center gap-1.5 border border-white/[0.04]">
                Ouvrir le programme <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


// ═══════════════════════════════════════
// COMPOSANT PHASE EDITOR — Premium
// ═══════════════════════════════════════
function PhaseEditor({ phase, index, isLast, allExercises, allRessources, onUpdate, onRemove, onRemoveItem, canRemove, setPhases }) {
  const [expanded, setExpanded] = useState(true)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [showResourcePicker, setShowResourcePicker] = useState(false)
  const [showNutrition, setShowNutrition] = useState(
    !!(phase.calories_objectif || phase.proteines_g || phase.consignes_nutrition)
  )

  // Add habitude inline
  const [newHab, setNewHab] = useState('')
  const [newObj, setNewObj] = useState('')

  const addHabitude = () => {
    if (!newHab.trim()) return
    setPhases(prev => prev.map((p, i) => {
      if (i !== index) return p
      return { ...p, habitudes: [...(p.habitudes || []), { nom: newHab.trim(), couleur: '#FF6B2B' }] }
    }))
    setNewHab('')
  }

  const addObjectif = () => {
    if (!newObj.trim()) return
    setPhases(prev => prev.map((p, i) => {
      if (i !== index) return p
      return { ...p, objectifs: [...(p.objectifs || []), { titre: newObj.trim() }] }
    }))
    setNewObj('')
  }

  const addExercise = (exercise) => {
    setPhases(prev => prev.map((p, i) => {
      if (i !== index) return p
      return {
        ...p,
        exercices: [...(p.exercices || []), {
          exercise_id: exercise.id,
          name: exercise.name,
          image_url: exercise.image_url,
          muscle_group: exercise.muscle_group,
          sets: 3,
          reps: 12,
          rest_seconds: 60,
        }]
      }
    }))
    setShowExercisePicker(false)
  }

  const updateExerciseField = (exIndex, field, value) => {
    setPhases(prev => prev.map((p, i) => {
      if (i !== index) return p
      const updated = [...(p.exercices || [])]
      updated[exIndex] = { ...updated[exIndex], [field]: value }
      return { ...p, exercices: updated }
    }))
  }

  const toggleResource = (ressource) => {
    setPhases(prev => prev.map((p, i) => {
      if (i !== index) return p
      const current = p.ressources_attachees || []
      const exists = current.some(r => r.id === ressource.id)
      if (exists) {
        return { ...p, ressources_attachees: current.filter(r => r.id !== ressource.id) }
      } else {
        return { ...p, ressources_attachees: [...current, {
          id: ressource.id,
          titre: ressource.titre,
          type: ressource.type,
          url: ressource.url,
          categorie: ressource.categorie,
          description: ressource.description,
        }]}
      }
    }))
  }

  return (
    <div className="relative">
      {!isLast && (
        <div className="absolute left-5 top-14 bottom-0 w-0.5 bg-gradient-to-b from-[#FF6B2B]/30 to-transparent" />
      )}

      <div className="relative flex gap-4">
        <div className="shrink-0 mt-5 z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B2B] to-[#FF9A6C] flex items-center justify-center shadow-lg shadow-[#FF6B2B]/20">
            <span className="text-white text-sm font-bold">{index + 1}</span>
          </div>
        </div>

        <div className="flex-1 bg-[#1E1E1E] rounded-2xl border border-white/[0.06] mb-4 overflow-hidden shadow-sm">
          {/* Header */}
          <button onClick={() => setExpanded(prev => !prev)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-all">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {expanded ? <ChevronDown size={16} className="text-[#FF6B2B]" /> : <ChevronRight size={16} className="text-white/40" />}
              <span className="text-[#F5F5F3] font-semibold text-sm truncate">{phase.titre || `Phase ${index + 1}`}</span>
              <div className="flex items-center gap-2">
                <span className="text-white/25 text-xs bg-[#2A2A2A] px-2 py-0.5 rounded-md">{phase.duree_semaines} sem.</span>
                {(phase.exercices?.length || 0) > 0 && (
                  <span className="text-[#FF6B2B]/70 text-xs bg-[#FF6B2B]/10 px-2 py-0.5 rounded-md">
                    {phase.exercices.length} exo
                  </span>
                )}
              </div>
            </div>
            {canRemove && (
              <button onClick={(e) => { e.stopPropagation(); onRemove() }}
                className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all">
                <X size={14} />
              </button>
            )}
          </button>

          {expanded && (
            <div className="px-5 pb-5 space-y-5">
              {/* Titre + durée */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-white/40 mb-1.5 font-medium">Titre</label>
                  <input type="text" value={phase.titre}
                    onChange={(e) => onUpdate('titre', e.target.value)}
                    className="w-full bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 font-medium">Durée (sem.)</label>
                  <input type="number" min={1} max={12} value={phase.duree_semaines}
                    onChange={(e) => onUpdate('duree_semaines', parseInt(e.target.value) || 1)}
                    className="w-full bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-medium">Description</label>
                <textarea value={phase.description || ''}
                  onChange={(e) => onUpdate('description', e.target.value)}
                  rows={2} placeholder="Objectif de cette phase..."
                  className="w-full bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-all resize-none" />
              </div>

              {/* ── Exercices ── */}
              <div className="bg-[#0D0D0D] rounded-xl border border-white/[0.06] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Dumbbell size={14} className="text-[#FF6B2B]" />
                    <label className="text-xs text-white/50 font-semibold uppercase tracking-wider">Exercices</label>
                  </div>
                  <button onClick={() => setShowExercisePicker(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-[#FF6B2B] hover:text-[#FF9A6C] font-medium transition-colors">
                    <Plus size={14} /> Ajouter un exercice
                  </button>
                </div>

                {(phase.exercices || []).length === 0 ? (
                  <p className="text-white/20 text-xs text-center py-3">Aucun exercice ajouté</p>
                ) : (
                  <div className="space-y-2">
                    {(phase.exercices || []).map((ex, ei) => (
                      <div key={ei} className="flex items-center gap-3 bg-[#1E1E1E] rounded-xl p-3 group">
                        {ex.image_url ? (
                          <img src={ex.image_url} alt={ex.name}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                            <ImageIcon size={16} className="text-white/20" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[#F5F5F3] text-sm font-medium truncate">{ex.name}</p>
                          <p className="text-white/30 text-xs">{ex.muscle_group}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <input type="number" min={1} max={10} value={ex.sets}
                            onChange={(e) => updateExerciseField(ei, 'sets', parseInt(e.target.value) || 3)}
                            className="w-12 bg-[#2A2A2A] border border-white/[0.06] rounded-lg px-2 py-1 text-[#F5F5F3] text-xs text-center focus:outline-none focus:border-[#FF6B2B]/50"
                            title="Séries" />
                          <span className="text-white/20 text-xs">×</span>
                          <input type="number" min={1} max={100} value={ex.reps}
                            onChange={(e) => updateExerciseField(ei, 'reps', parseInt(e.target.value) || 12)}
                            className="w-12 bg-[#2A2A2A] border border-white/[0.06] rounded-lg px-2 py-1 text-[#F5F5F3] text-xs text-center focus:outline-none focus:border-[#FF6B2B]/50"
                            title="Reps" />
                          <button onClick={() => onRemoveItem('exercices', ei)}
                            className="p-1 rounded text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Exercise Picker Modal */}
                {showExercisePicker && (
                  <ExercisePicker
                    exercises={allExercises}
                    onSelect={addExercise}
                    onClose={() => setShowExercisePicker(false)}
                  />
                )}
              </div>

              {/* ── Habitudes ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/50 font-semibold uppercase tracking-wider">Habitudes à créer</label>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(phase.habitudes || []).map((h, hi) => (
                    <span key={hi} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D0D0D] border border-white/[0.06] text-[#F5F5F3] text-xs">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: h.couleur || '#FF6B2B' }} />
                      {h.nom}
                      <button onClick={() => onRemoveItem('habitudes', hi)} className="text-white/30 hover:text-red-400 ml-0.5">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newHab} onChange={(e) => setNewHab(e.target.value)}
                    placeholder="Nom de l'habitude..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHabitude())}
                    className="flex-1 bg-[#0D0D0D] border border-white/[0.06] rounded-lg px-3 py-2 text-[#F5F5F3] text-xs placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50" />
                  <button onClick={addHabitude} disabled={!newHab.trim()}
                    className="px-3 py-2 rounded-lg bg-[#FF6B2B]/10 text-[#FF6B2B] text-xs font-medium hover:bg-[#FF6B2B]/20 transition-colors disabled:opacity-30">
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* ── Objectifs ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/50 font-semibold uppercase tracking-wider">Objectifs à créer</label>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(phase.objectifs || []).map((o, oi) => (
                    <span key={oi} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D0D0D] border border-white/[0.06] text-[#F5F5F3] text-xs">
                      <span className="text-[#FF6B2B]">&#x1F3AF;</span> {o.titre}
                      <button onClick={() => onRemoveItem('objectifs', oi)} className="text-white/30 hover:text-red-400 ml-0.5">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newObj} onChange={(e) => setNewObj(e.target.value)}
                    placeholder="Titre de l'objectif..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addObjectif())}
                    className="flex-1 bg-[#0D0D0D] border border-white/[0.06] rounded-lg px-3 py-2 text-[#F5F5F3] text-xs placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50" />
                  <button onClick={addObjectif} disabled={!newObj.trim()}
                    className="px-3 py-2 rounded-lg bg-[#FF6B2B]/10 text-[#FF6B2B] text-xs font-medium hover:bg-[#FF6B2B]/20 transition-colors disabled:opacity-30">
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* ── Ressources additionnelles ── */}
              <div className="bg-[#0D0D0D] rounded-xl border border-white/[0.06] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-blue-400" />
                    <label className="text-xs text-white/50 font-semibold uppercase tracking-wider">Ressources</label>
                  </div>
                  <button onClick={() => setShowResourcePicker(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                    <BookOpen size={14} /> Parcourir ma bibliothèque
                  </button>
                </div>

                {(phase.ressources_attachees || []).length === 0 ? (
                  <p className="text-white/20 text-xs text-center py-3">Aucune ressource attachée</p>
                ) : (
                  <div className="space-y-2">
                    {(phase.ressources_attachees || []).map((res) => {
                      const typeInfo = RESSOURCE_ICONS[res.type] || RESSOURCE_ICONS.lien
                      const Icon = typeInfo.icon
                      return (
                        <div key={res.id} className="flex items-center gap-3 bg-[#1E1E1E] rounded-xl p-3 group">
                          <div className={`w-10 h-10 rounded-lg ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon size={16} className={typeInfo.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#F5F5F3] text-sm font-medium truncate">{res.titre}</p>
                            <p className="text-white/30 text-xs capitalize">{res.type}{res.categorie ? ` · ${res.categorie}` : ''}</p>
                          </div>
                          <button onClick={() => toggleResource(res)}
                            className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                            <X size={12} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {showResourcePicker && (
                  <ResourcePicker
                    ressources={allRessources}
                    selected={phase.ressources_attachees || []}
                    onToggle={toggleResource}
                    onClose={() => setShowResourcePicker(false)}
                  />
                )}
              </div>

              {/* ── Nutrition Toggle ── */}
              <div>
                <button onClick={() => setShowNutrition(prev => !prev)}
                  className="inline-flex items-center gap-2 text-xs text-[#FF6B2B] hover:text-[#FF9A6C] font-medium transition-colors">
                  <Apple size={14} />
                  {showNutrition ? 'Masquer la nutrition' : 'Ajouter des objectifs nutritionnels'}
                </button>

                {showNutrition && (
                  <div className="mt-3 bg-[#0D0D0D] rounded-xl border border-white/[0.06] p-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] text-white/40 mb-1 uppercase tracking-wider">Calories</label>
                        <div className="relative">
                          <input type="number" min={0} value={phase.calories_objectif || ''}
                            onChange={(e) => onUpdate('calories_objectif', parseInt(e.target.value) || null)}
                            placeholder="2000"
                            className="w-full bg-[#1E1E1E] border border-white/[0.06] rounded-lg px-3 py-2 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/50" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">kcal</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-white/40 mb-1 uppercase tracking-wider">Protéines</label>
                        <div className="relative">
                          <input type="number" min={0} value={phase.proteines_g || ''}
                            onChange={(e) => onUpdate('proteines_g', parseInt(e.target.value) || null)}
                            placeholder="150"
                            className="w-full bg-[#1E1E1E] border border-white/[0.06] rounded-lg px-3 py-2 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/50" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">g</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-white/40 mb-1 uppercase tracking-wider">Glucides</label>
                        <div className="relative">
                          <input type="number" min={0} value={phase.glucides_g || ''}
                            onChange={(e) => onUpdate('glucides_g', parseInt(e.target.value) || null)}
                            placeholder="250"
                            className="w-full bg-[#1E1E1E] border border-white/[0.06] rounded-lg px-3 py-2 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/50" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">g</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-white/40 mb-1 uppercase tracking-wider">Lipides</label>
                        <div className="relative">
                          <input type="number" min={0} value={phase.lipides_g || ''}
                            onChange={(e) => onUpdate('lipides_g', parseInt(e.target.value) || null)}
                            placeholder="70"
                            className="w-full bg-[#1E1E1E] border border-white/[0.06] rounded-lg px-3 py-2 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/50" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">g</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/40 mb-1 uppercase tracking-wider">Consignes nutritionnelles</label>
                      <textarea value={phase.consignes_nutrition || ''}
                        onChange={(e) => onUpdate('consignes_nutrition', e.target.value)}
                        rows={2} placeholder="Ex : Privilégier les protéines maigres, manger 5 fruits et légumes par jour..."
                        className="w-full bg-[#1E1E1E] border border-white/[0.06] rounded-lg px-3 py-2 text-[#F5F5F3] text-xs placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 resize-none" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════
// EXERCISE PICKER — Sélecteur visuel
// ═══════════════════════════════════════
function ExercisePicker({ exercises, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const categories = [...new Set(exercises.map(e => e.category))].sort()

  const filtered = exercises.filter(e => {
    const matchSearch = !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.muscle_group.toLowerCase().includes(search.toLowerCase())
    const matchCategory = !filterCategory || e.category === filterCategory
    return matchSearch && matchCategory
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#1E1E1E] rounded-2xl border border-white/[0.08] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h3 className="text-[#F5F5F3] font-semibold text-lg">Bibliothèque d'exercices</h3>
            <p className="text-white/30 text-xs mt-0.5">{exercises.length} exercices disponibles</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Search + Filter */}
        <div className="px-6 py-3 border-b border-white/[0.06] flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input ref={inputRef} type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un exercice..."
              className="w-full bg-[#0D0D0D] border border-white/[0.06] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/25 focus:outline-none focus:border-[#FF6B2B]/50" />
          </div>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-[#0D0D0D] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#FF6B2B]/50">
            <option value="">Toutes catégories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Exercise Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">Aucun exercice trouvé</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map((ex) => (
                <button key={ex.id} onClick={() => onSelect(ex)}
                  className="text-left bg-[#0D0D0D] rounded-xl border border-white/[0.06] overflow-hidden hover:border-[#FF6B2B]/40 hover:shadow-lg hover:shadow-[#FF6B2B]/10 transition-all group">
                  {ex.image_url ? (
                    <img src={ex.image_url} alt={ex.name}
                      className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-24 bg-[#2A2A2A] flex items-center justify-center">
                      <Dumbbell size={24} className="text-white/15" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-[#F5F5F3] text-xs font-medium truncate">{ex.name}</p>
                    <p className="text-white/30 text-[10px] mt-0.5">{ex.muscle_group}</p>
                    <span className="inline-block mt-1.5 text-[9px] text-[#FF6B2B]/70 bg-[#FF6B2B]/10 px-2 py-0.5 rounded-full">
                      {ex.category}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════
// RESOURCE PICKER — Parcourir la bibliothèque
// ═══════════════════════════════════════
function ResourcePicker({ ressources, selected, onToggle, onClose }) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const types = [...new Set(ressources.map(r => r.type))].sort()
  const selectedIds = new Set(selected.map(r => r.id))

  const filtered = ressources.filter(r => {
    const matchSearch = !search ||
      r.titre.toLowerCase().includes(search.toLowerCase()) ||
      (r.categorie || '').toLowerCase().includes(search.toLowerCase())
    const matchType = !filterType || r.type === filterType
    return matchSearch && matchType
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#1E1E1E] rounded-2xl border border-white/[0.08] w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h3 className="text-[#F5F5F3] font-semibold text-lg">Ma bibliothèque</h3>
            <p className="text-white/30 text-xs mt-0.5">
              {ressources.length} ressource{ressources.length > 1 ? 's' : ''} · {selected.length} sélectionnée{selected.length > 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Search + Filter */}
        <div className="px-6 py-3 border-b border-white/[0.06] flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input ref={inputRef} type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une ressource..."
              className="w-full bg-[#0D0D0D] border border-white/[0.06] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/25 focus:outline-none focus:border-blue-500/50" />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#0D0D0D] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-blue-500/50">
            <option value="">Tous types</option>
            {types.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>

        {/* Resource List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen size={32} className="text-white/15 mx-auto mb-3" />
              <p className="text-white/30 text-sm">
                {ressources.length === 0 ? 'Aucune ressource dans ta bibliothèque' : 'Aucun résultat'}
              </p>
              {ressources.length === 0 && (
                <p className="text-white/20 text-xs mt-1">Ajoute des ressources depuis l'onglet Bibliothèque</p>
              )}
            </div>
          ) : (
            filtered.map((res) => {
              const isSelected = selectedIds.has(res.id)
              const typeInfo = RESSOURCE_ICONS[res.type] || RESSOURCE_ICONS.lien
              const Icon = typeInfo.icon
              return (
                <button key={res.id} onClick={() => onToggle(res)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-blue-500/10 border border-blue-500/30'
                      : 'bg-[#0D0D0D] border border-white/[0.04] hover:border-white/[0.1]'
                  }`}>
                  <div className={`w-10 h-10 rounded-lg ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={16} className={typeInfo.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#F5F5F3] text-sm font-medium truncate">{res.titre}</p>
                    <p className="text-white/30 text-xs capitalize mt-0.5">
                      {res.type}{res.categorie ? ` · ${res.categorie}` : ''}
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected ? 'bg-blue-500' : 'border border-white/20'
                  }`}>
                    {isSelected && <CheckSquare size={12} className="text-white" />}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.06] flex justify-end">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20">
            Valider ({selected.length})
          </button>
        </div>
      </div>
    </div>
  )
}
