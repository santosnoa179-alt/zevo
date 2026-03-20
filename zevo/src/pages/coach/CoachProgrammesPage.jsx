import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  Plus, ChevronRight, ChevronDown, GripVertical, Trash2, Users,
  Calendar, Layers, Loader2, Save, X, ArrowLeft, Edit3
} from 'lucide-react'

// Catégories prédéfinies pour les programmes
const CATEGORIES = ['Remise en forme', 'Perte de poids', 'Prise de masse', 'Bien-être', 'Nutrition', 'Mindset', 'Autre']

export default function CoachProgrammesPage() {
  const { user } = useAuth()

  // Vue : 'list' ou 'editor'
  const [view, setView] = useState('list')
  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(true)

  // Programme en cours d'édition
  const [editProgramme, setEditProgramme] = useState(null)
  const [phases, setPhases] = useState([])
  const [saving, setSaving] = useState(false)

  // Stats assignations par programme
  const [assignationCounts, setAssignationCounts] = useState({})

  // ── Chargement des programmes ──
  useEffect(() => {
    if (!user) return
    loadProgrammes()
  }, [user])

  const loadProgrammes = async () => {
    setLoading(true)

    // Charge les programmes du coach
    const { data: progs } = await supabase
      .from('programmes')
      .select('*')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })

    setProgrammes(progs || [])

    // Compte les assignations par programme
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
      id: null,
      titre: '',
      description: '',
      duree_semaines: 4,
      categorie: '',
      actif: true,
    })
    setPhases([{
      id: crypto.randomUUID(),
      titre: 'Phase 1',
      description: '',
      ordre: 1,
      duree_semaines: 1,
      habitudes: [],
      objectifs: [],
      isNew: true,
    }])
    setView('editor')
  }

  // ── Ouvrir un programme existant ──
  const handleEdit = async (prog) => {
    setEditProgramme(prog)

    // Charge les phases du programme
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
    if (!editProgramme.titre.trim()) return
    setSaving(true)

    try {
      let programmeId = editProgramme.id

      if (programmeId) {
        // Mise à jour du programme existant
        await supabase
          .from('programmes')
          .update({
            titre: editProgramme.titre,
            description: editProgramme.description,
            duree_semaines: editProgramme.duree_semaines,
            categorie: editProgramme.categorie,
            actif: editProgramme.actif,
          })
          .eq('id', programmeId)
      } else {
        // Création d'un nouveau programme
        const { data } = await supabase
          .from('programmes')
          .insert({
            coach_id: user.id,
            titre: editProgramme.titre,
            description: editProgramme.description,
            duree_semaines: editProgramme.duree_semaines,
            categorie: editProgramme.categorie,
            actif: editProgramme.actif,
          })
          .select()
          .single()

        programmeId = data.id
      }

      // Supprime toutes les anciennes phases puis recrée (plus simple qu'un diff)
      await supabase
        .from('programme_phases')
        .delete()
        .eq('programme_id', programmeId)

      // Insère les nouvelles phases
      if (phases.length > 0) {
        const phasesToInsert = phases.map((p, i) => ({
          programme_id: programmeId,
          titre: p.titre,
          description: p.description,
          ordre: i + 1,
          duree_semaines: p.duree_semaines,
          habitudes: p.habitudes || [],
          objectifs: p.objectifs || [],
        }))

        await supabase.from('programme_phases').insert(phasesToInsert)
      }

      // Retour à la liste
      await loadProgrammes()
      setView('list')
    } catch (err) {
      console.error('Erreur sauvegarde programme:', err)
    }

    setSaving(false)
  }

  // ── Supprimer un programme ──
  const handleDelete = async (progId) => {
    if (!confirm('Supprimer ce programme ? Les assignations en cours seront aussi supprimées.')) return

    await supabase.from('programmes').delete().eq('id', progId)
    setProgrammes(prev => prev.filter(p => p.id !== progId))
  }

  // ── Gestion des phases dans l'éditeur ──
  const addPhase = () => {
    setPhases(prev => [...prev, {
      id: crypto.randomUUID(),
      titre: `Phase ${prev.length + 1}`,
      description: '',
      ordre: prev.length + 1,
      duree_semaines: 1,
      habitudes: [],
      objectifs: [],
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

  // Ajouter une habitude à une phase
  const addHabitudeToPhase = (phaseIndex) => {
    const nom = prompt('Nom de l\'habitude :')
    if (!nom?.trim()) return
    setPhases(prev => prev.map((p, i) => {
      if (i !== phaseIndex) return p
      return { ...p, habitudes: [...(p.habitudes || []), { nom: nom.trim(), couleur: '#FF6B2B' }] }
    }))
  }

  // Ajouter un objectif à une phase
  const addObjectifToPhase = (phaseIndex) => {
    const titre = prompt('Titre de l\'objectif :')
    if (!titre?.trim()) return
    setPhases(prev => prev.map((p, i) => {
      if (i !== phaseIndex) return p
      return { ...p, objectifs: [...(p.objectifs || []), { titre: titre.trim() }] }
    }))
  }

  // Supprimer un élément d'une phase
  const removeFromPhase = (phaseIndex, type, itemIndex) => {
    setPhases(prev => prev.map((p, i) => {
      if (i !== phaseIndex) return p
      const updated = [...(p[type] || [])]
      updated.splice(itemIndex, 1)
      return { ...p, [type]: updated }
    }))
  }

  // ── RENDER ──

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
      <div className="p-6 w-full max-w-3xl space-y-6">
        {/* Header éditeur */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('list')}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[#F5F5F3] text-2xl font-bold">
            {editProgramme.id ? 'Modifier le programme' : 'Nouveau programme'}
          </h1>
        </div>

        {/* Infos programme */}
        <section className="bg-[#1E1E1E] rounded-2xl p-6 space-y-4">
          <h2 className="text-[#F5F5F3] font-semibold text-lg">Informations</h2>

          <div>
            <label className="block text-sm text-white/60 mb-1.5">Titre du programme</label>
            <input
              type="text"
              value={editProgramme.titre}
              onChange={(e) => setEditProgramme(prev => ({ ...prev, titre: e.target.value }))}
              placeholder="Ex : Remise en forme 12 semaines"
              className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1.5">Description</label>
            <textarea
              value={editProgramme.description || ''}
              onChange={(e) => setEditProgramme(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Décris le programme en quelques lignes..."
              rows={3}
              className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-4 py-3 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Durée totale (semaines)</label>
              <input
                type="number"
                min={1}
                max={52}
                value={editProgramme.duree_semaines}
                onChange={(e) => setEditProgramme(prev => ({ ...prev, duree_semaines: parseInt(e.target.value) || 4 }))}
                className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-4 py-2.5 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Catégorie</label>
              <select
                value={editProgramme.categorie || ''}
                onChange={(e) => setEditProgramme(prev => ({ ...prev, categorie: e.target.value }))}
                className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-4 py-2.5 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
              >
                <option value="">Choisir...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* ── Éditeur de phases ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[#F5F5F3] font-semibold text-lg">Phases</h2>
            <button
              onClick={addPhase}
              className="inline-flex items-center gap-1.5 text-sm text-[#FF6B2B] hover:text-[#FF9A6C] transition-colors"
            >
              <Plus size={16} />
              Ajouter une phase
            </button>
          </div>

          {/* Timeline avec les phases */}
          <div className="space-y-0">
            {phases.map((phase, index) => (
              <PhaseEditor
                key={phase.id}
                phase={phase}
                index={index}
                isLast={index === phases.length - 1}
                onUpdate={(field, value) => updatePhase(index, field, value)}
                onRemove={() => removePhase(index)}
                onAddHabitude={() => addHabitudeToPhase(index)}
                onAddObjectif={() => addObjectifToPhase(index)}
                onRemoveItem={(type, itemIndex) => removeFromPhase(index, type, itemIndex)}
                canRemove={phases.length > 1}
              />
            ))}
          </div>
        </section>

        {/* Bouton sauvegarder */}
        <div className="flex items-center gap-3 justify-end pt-4">
          <button
            onClick={() => setView('list')}
            className="px-5 py-2.5 rounded-xl text-sm text-white/40 hover:text-white transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !editProgramme.titre.trim()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Enregistrement...' : 'Sauvegarder'}
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#F5F5F3] text-2xl font-bold">Programmes</h1>
          <p className="text-white/40 text-sm mt-0.5">Crée des parcours multi-semaines et assigne-les en 1 clic</p>
        </div>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-colors"
        >
          <Plus size={16} />
          Nouveau programme
        </button>
      </div>

      {/* Liste vide */}
      {programmes.length === 0 && (
        <div className="bg-[#1E1E1E] rounded-2xl p-12 text-center">
          <Layers size={48} className="text-white/10 mx-auto mb-4" />
          <h3 className="text-[#F5F5F3] font-semibold mb-1">Aucun programme</h3>
          <p className="text-white/40 text-sm mb-6">Crée ton premier programme de coaching structuré</p>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-colors"
          >
            <Plus size={16} />
            Créer un programme
          </button>
        </div>
      )}

      {/* Cards programmes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {programmes.map((prog) => (
          <div
            key={prog.id}
            className="bg-[#1E1E1E] rounded-2xl border border-white/[0.08] p-5 hover:border-white/[0.15] transition-colors group"
          >
            {/* En-tête */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-[#F5F5F3] font-semibold text-base truncate">{prog.titre}</h3>
                {prog.description && (
                  <p className="text-white/40 text-sm mt-0.5 line-clamp-2">{prog.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 ml-3 shrink-0">
                <button
                  onClick={() => handleEdit(prog)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.04] transition-colors"
                  title="Modifier"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(prog.id)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/[0.04] transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Infos */}
            <div className="flex items-center gap-4 text-xs text-white/40">
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} />
                {prog.duree_semaines} sem.
              </span>
              {prog.categorie && (
                <span className="px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] text-xs">
                  {prog.categorie}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users size={12} />
                {assignationCounts[prog.id] || 0} client{(assignationCounts[prog.id] || 0) > 1 ? 's' : ''}
              </span>
            </div>

            {/* Bouton ouvrir */}
            <button
              onClick={() => handleEdit(prog)}
              className="mt-4 w-full py-2 rounded-lg bg-white/[0.04] text-white/50 text-sm hover:bg-white/[0.08] hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              Ouvrir le programme
              <ChevronRight size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}


// ═══════════════════════════════════════
// COMPOSANT PHASE EDITOR
// ═══════════════════════════════════════
function PhaseEditor({ phase, index, isLast, onUpdate, onRemove, onAddHabitude, onAddObjectif, onRemoveItem, canRemove }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="relative">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-5 top-14 bottom-0 w-0.5 bg-[#FF6B2B]/20" />
      )}

      <div className="relative flex gap-4">
        {/* Timeline dot */}
        <div className="shrink-0 mt-5 z-10">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center">
            <span className="text-[#FF6B2B] text-sm font-bold">{index + 1}</span>
          </div>
        </div>

        {/* Phase content */}
        <div className="flex-1 bg-[#1E1E1E] rounded-2xl border border-white/[0.08] mb-4 overflow-hidden">
          {/* Header phase */}
          <button
            onClick={() => setExpanded(prev => !prev)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {expanded ? <ChevronDown size={16} className="text-white/40" /> : <ChevronRight size={16} className="text-white/40" />}
              <span className="text-[#F5F5F3] font-medium text-sm truncate">{phase.titre || `Phase ${index + 1}`}</span>
              <span className="text-white/30 text-xs">{phase.duree_semaines} sem.</span>
            </div>
            {canRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove() }}
                className="p-1 rounded text-white/20 hover:text-red-400 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </button>

          {/* Contenu expandé */}
          {expanded && (
            <div className="px-4 pb-4 space-y-4">
              {/* Titre + durée */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-white/40 mb-1">Titre</label>
                  <input
                    type="text"
                    value={phase.titre}
                    onChange={(e) => onUpdate('titre', e.target.value)}
                    className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-3 py-2 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">Durée (sem.)</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={phase.duree_semaines}
                    onChange={(e) => onUpdate('duree_semaines', parseInt(e.target.value) || 1)}
                    className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-3 py-2 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-white/40 mb-1">Description (optionnel)</label>
                <textarea
                  value={phase.description || ''}
                  onChange={(e) => onUpdate('description', e.target.value)}
                  rows={2}
                  placeholder="Objectif de cette phase..."
                  className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-3 py-2 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors resize-none"
                />
              </div>

              {/* Habitudes de la phase */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/40 font-medium">Habitudes à créer</label>
                  <button
                    onClick={onAddHabitude}
                    className="text-xs text-[#FF6B2B] hover:text-[#FF9A6C] transition-colors"
                  >
                    + Ajouter
                  </button>
                </div>
                {(phase.habitudes || []).length === 0 ? (
                  <p className="text-white/20 text-xs">Aucune habitude</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(phase.habitudes || []).map((h, hi) => (
                      <span
                        key={hi}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2A2A2A] text-[#F5F5F3] text-xs"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: h.couleur || '#FF6B2B' }} />
                        {h.nom}
                        <button onClick={() => onRemoveItem('habitudes', hi)} className="text-white/30 hover:text-red-400 ml-0.5">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Objectifs de la phase */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/40 font-medium">Objectifs à créer</label>
                  <button
                    onClick={onAddObjectif}
                    className="text-xs text-[#FF6B2B] hover:text-[#FF9A6C] transition-colors"
                  >
                    + Ajouter
                  </button>
                </div>
                {(phase.objectifs || []).length === 0 ? (
                  <p className="text-white/20 text-xs">Aucun objectif</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(phase.objectifs || []).map((o, oi) => (
                      <span
                        key={oi}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2A2A2A] text-[#F5F5F3] text-xs"
                      >
                        🎯 {o.titre}
                        <button onClick={() => onRemoveItem('objectifs', oi)} className="text-white/30 hover:text-red-400 ml-0.5">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
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
