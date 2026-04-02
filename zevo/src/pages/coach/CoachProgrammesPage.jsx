import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import {
  Plus, ChevronRight, ChevronDown, Trash2, Users,
  Calendar, Layers, FolderOpen, Loader2, Save, X, ArrowLeft, Edit3,
  Dumbbell, Search, Apple, Image as ImageIcon,
  BookOpen, FileText, Video, Link as LinkIcon, CheckSquare,
  UserPlus, Send, Rocket
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

  // Onglets & assignations détaillées
  const [tab, setTab] = useState('assigned') // 'assigned' | 'templates'
  const [assignations, setAssignations] = useState([]) // assignations avec client + suivi
  const [suiviData, setSuiviData] = useState({}) // { programme_id_client_id: [{ numero_semaine, completed_at }] }
  const [searchTerm, setSearchTerm] = useState('')

  // Assignation
  const [assignModal, setAssignModal] = useState(null) // programme object or null
  const [clients, setClients] = useState([])
  const [deploying, setDeploying] = useState(false)

  useEffect(() => {
    if (!user) return
    loadProgrammes()
    loadExercises()
    loadRessources()
    loadClients()
  }, [user])

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, profiles(id, nom, email)')
      .eq('coach_id', user.id)
      .eq('actif', true)
    setClients(data || [])
  }

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
      // Récupérer les assignations avec infos client
      const { data: assigns } = await supabase
        .from('programme_assignations')
        .select('id, programme_id, client_id, date_debut, statut, phase_actuelle, clients(id, profiles(nom, email, avatar_url))')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })

      setAssignations(assigns || [])

      const counts = {}
      ;(assigns || []).forEach(a => {
        counts[a.programme_id] = (counts[a.programme_id] || 0) + 1
      })
      setAssignationCounts(counts)

      // Récupérer le suivi de progression via fonction SECURITY DEFINER (bypass RLS)
      const { data: suivis, error: suiviErr } = await supabase
        .rpc('get_coach_suivi_programmes', { coach_uid: user.id })

      if (suiviErr) {
        console.warn('[Programmes] suivi RPC error:', suiviErr.message)
      }

      // Grouper par programme_id + client_id
      const suiviMap = {}
      ;(suivis || []).forEach(s => {
        const key = `${s.programme_id}_${s.client_id}`
        if (!suiviMap[key]) suiviMap[key] = []
        suiviMap[key].push(s)
      })
      setSuiviData(suiviMap)
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

  // ── Déployer un programme chez un client (DEEP COPY du template) ──
  const handleDeploy = async (programmeId, clientProfileId, dateDebut) => {
    setDeploying(true)
    try {
      const originalProg = programmes.find(p => p.id === programmeId)
      if (!originalProg) throw new Error('Programme introuvable')

      // 1. Deep copy : créer une COPIE du programme (le template reste intact)
      const { data: copiedProg, error: copyErr } = await supabase
        .from('programmes')
        .insert({
          coach_id: user.id,
          titre: originalProg.titre,
          description: originalProg.description,
          duree_semaines: originalProg.duree_semaines,
          categorie: originalProg.categorie,
          actif: true,
        })
        .select()
        .single()

      if (copyErr) throw copyErr
      const newProgId = copiedProg.id

      // 2. Récupérer les phases du template original
      const { data: phasesData, error: phErr } = await supabase
        .from('programme_phases')
        .select('*')
        .eq('programme_id', programmeId)
        .order('ordre', { ascending: true })

      if (phErr) throw phErr

      // 3. Dupliquer les phases vers la copie
      if (phasesData?.length > 0) {
        const phasesToInsert = phasesData.map(p => ({
          programme_id: newProgId,
          titre: p.titre,
          description: p.description,
          ordre: p.ordre,
          duree_semaines: p.duree_semaines,
          habitudes: p.habitudes || [],
          objectifs: p.objectifs || [],
          exercices: p.exercices || [],
          ressources_attachees: p.ressources_attachees || [],
          calories_objectif: p.calories_objectif,
          proteines_g: p.proteines_g,
          glucides_g: p.glucides_g,
          lipides_g: p.lipides_g,
          consignes_nutrition: p.consignes_nutrition,
        }))
        await supabase.from('programme_phases').insert(phasesToInsert)
      }

      // 4. Créer des séances dans le calendrier du client
      const startDate = new Date(dateDebut)
      let dayOffset = 0

      for (const phase of (phasesData || [])) {
        const exercicesInPhase = phase.exercices || []
        const phaseDurationDays = (phase.duree_semaines || 1) * 7

        if (exercicesInPhase.length > 0) {
          const weeksInPhase = phase.duree_semaines || 1
          for (let w = 0; w < weeksInPhase; w++) {
            const seanceDate = new Date(startDate)
            seanceDate.setDate(seanceDate.getDate() + dayOffset + (w * 7))
            const dateStr = seanceDate.toISOString().split('T')[0]

            const { data: newSeance, error: sErr } = await supabase
              .from('seances')
              .insert({
                coach_id: user.id,
                client_id: clientProfileId,
                titre: `${phase.titre} — Semaine ${w + 1}`,
                date_prevue: dateStr,
                notes: phase.description || null,
                is_template: false,
              })
              .select()
              .single()

            if (sErr) throw sErr

            if (newSeance && exercicesInPhase.length > 0) {
              const exRows = exercicesInPhase.map((ex, idx) => ({
                seance_id: newSeance.id,
                exercice_id: ex.exercice_id || ex.id,
                series: ex.series || 3,
                reps: ex.reps || 12,
                poids: ex.poids || null,
                repos: ex.repos || 60,
                ordre: idx,
              }))
              await supabase.from('seance_exercices').insert(exRows)
            }
          }
        }

        dayOffset += phaseDurationDays
      }

      // 5. Créer l'assignation vers la COPIE (pas le template original)
      const clientRow = clients.find(c => c.profiles?.id === clientProfileId)
      if (clientRow) {
        await supabase.from('programme_assignations').insert({
          programme_id: newProgId,
          client_id: clientRow.id,
          coach_id: user.id,
          date_debut: dateDebut,
          phase_actuelle: 1,
          statut: 'en_cours',
        })
      }

      const clientName = clients.find(c => c.profiles?.id === clientProfileId)?.profiles?.nom || 'ce client'
      toast.success(`Programme déployé chez ${clientName} !`)
      setAssignModal(null)
      await loadProgrammes()
    } catch (err) {
      console.error('Erreur déploiement programme:', err)
      toast.error('Erreur lors du déploiement. Réessayez.')
    }
    setDeploying(false)
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
    const inputCls = "w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-2xl px-5 py-3.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 focus:ring-1 focus:ring-[#FF6B2B]/10 transition-all"
    return (
      <div className="p-4 md:p-8 lg:p-10 w-full max-w-3xl mx-auto space-y-10">

        {/* ── Header — Apple style ── */}
        <div>
          <button onClick={() => setView('list')}
            className="inline-flex items-center gap-1.5 text-[#FF6B2B] text-sm font-medium hover:text-[#FF9A6C] transition-colors mb-6">
            <ArrowLeft size={16} /> Retour aux programmes
          </button>
          <h1 className="text-[var(--text-primary)] text-3xl md:text-4xl font-bold tracking-tight">
            {editProgramme.id ? editProgramme.titre || 'Modifier le programme' : 'Nouveau programme'}
          </h1>
          <p className="text-[var(--text-muted)] text-base mt-2">Construis un parcours structuré pour tes clients.</p>
        </div>

        {/* ── Informations générales ── */}
        <div className="space-y-6">
          <h2 className="text-[var(--text-primary)] text-lg font-bold">Informations</h2>
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-base)] p-6 md:p-8 space-y-5">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2 font-semibold uppercase tracking-wider">Titre du programme</label>
              <input type="text" value={editProgramme.titre}
                onChange={(e) => setEditProgramme(prev => ({ ...prev, titre: e.target.value }))}
                placeholder="Ex : Transformation 12 semaines"
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2 font-semibold uppercase tracking-wider">Description</label>
              <textarea value={editProgramme.description || ''}
                onChange={(e) => setEditProgramme(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Décris le programme en quelques lignes..."
                rows={3}
                className={`${inputCls} resize-none`} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-2 font-semibold uppercase tracking-wider">Durée (semaines)</label>
                <input type="number" min={1} max={52} value={editProgramme.duree_semaines}
                  onChange={(e) => setEditProgramme(prev => ({ ...prev, duree_semaines: parseInt(e.target.value) || 4 }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-2 font-semibold uppercase tracking-wider">Catégorie</label>
                <select value={editProgramme.categorie || ''}
                  onChange={(e) => setEditProgramme(prev => ({ ...prev, categorie: e.target.value }))}
                  className={inputCls}>
                  <option value="">Choisir...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Phases ── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[var(--text-primary)] text-lg font-bold">Phases</h2>
              <p className="text-[var(--text-muted)] text-sm mt-0.5">{phases.length} phase{phases.length > 1 ? 's' : ''} dans ce programme</p>
            </div>
            <button onClick={addPhase}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-base)] text-[#FF6B2B] text-sm font-semibold hover:bg-[var(--bg-surface)] transition-all">
              <Plus size={15} /> Nouvelle phase
            </button>
          </div>

          <div className="space-y-4">
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

        {/* ── Actions — sticky bottom ── */}
        <div className="flex items-center gap-3 justify-end pb-10 pt-4 border-t border-[var(--border-subtle)]">
          <button onClick={() => setView('list')}
            className="px-6 py-3 rounded-2xl text-sm text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card)] transition-all font-medium">
            Annuler
          </button>
          <button onClick={handleSave}
            disabled={saving || !editProgramme.titre.trim()}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-50 shadow-xl shadow-[#FF6B2B]/25">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Enregistrement...' : 'Sauvegarder le programme'}
          </button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // VUE LISTE — Premium
  // ═══════════════════════════════════════

  const assignedProgIds = new Set(assignations.map(a => a.programme_id))
  const templateProgs = programmes.filter(p => !assignedProgIds.has(p.id))
  const STATUS_LABELS = { en_cours: 'En cours', pause: 'Pause', termine: 'Terminé' }
  const STATUS_COLORS = {
    en_cours: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
    pause: 'text-amber-400 bg-amber-500/10 border border-amber-500/20',
    termine: 'text-[var(--text-muted)] bg-white/5 border border-white/10',
  }

  // Search filter
  const term = searchTerm.toLowerCase()
  const filteredAssignations = assignations.filter(a => {
    if (!term) return true
    const prog = programmes.find(p => p.id === a.programme_id)
    const clientNom = a.clients?.profiles?.nom || ''
    return clientNom.toLowerCase().includes(term) || (prog?.titre || '').toLowerCase().includes(term)
  })
  const filteredTemplates = templateProgs.filter(p => {
    if (!term) return true
    return (p.titre || '').toLowerCase().includes(term) || (p.categorie || '').toLowerCase().includes(term)
  })

  return (
    <div className="p-4 md:p-8 w-full max-w-5xl mx-auto space-y-8">

      {/* ═══ Header ═══ */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[var(--text-primary)] text-3xl font-bold tracking-tight">Programmes Sport</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1.5">Parcours multi-semaines pour tes clients</p>
        </div>
        <button onClick={handleNew}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-xl shadow-[#FF6B2B]/25 shrink-0">
          <Plus size={16} /> Créer un programme
        </button>
      </div>

      {/* ═══ Tabs + Search ═══ */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-[var(--bg-card)] rounded-2xl p-1 border border-[var(--border-base)]">
          {[
            { key: 'assigned', label: 'Assignés', count: assignations.length },
            { key: 'templates', label: 'Modèles', count: templateProgs.length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`py-2.5 px-5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                tab === t.key
                  ? 'bg-[#FF6B2B] text-white shadow-lg shadow-[#FF6B2B]/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}>
              {t.label}
              <span className={`ml-1.5 text-xs ${tab === t.key ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher..."
            className="w-56 bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl pl-10 pr-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 focus:ring-1 focus:ring-[#FF6B2B]/10 transition-all" />
        </div>
      </div>

      {/* ═══════ ONGLET : PROGRAMMES ASSIGNÉS ═══════ */}
      {tab === 'assigned' && (
        <>
          {filteredAssignations.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-base)] p-16 text-center">
              <div className="w-16 h-16 bg-[#FF6B2B]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Send size={28} className="text-[#FF6B2B]" />
              </div>
              <h3 className="text-[var(--text-primary)] font-bold text-lg mb-2">
                {searchTerm ? 'Aucun résultat' : 'Aucun programme assigné'}
              </h3>
              <p className="text-[var(--text-muted)] text-sm mb-6 max-w-sm mx-auto">
                {searchTerm ? `Aucun résultat pour "${searchTerm}"` : 'Crée un modèle puis assigne-le à un client.'}
              </p>
              {!searchTerm && (
                <button onClick={() => setTab('templates')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-surface)] transition-all">
                  <Layers size={14} /> Voir les modèles
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssignations.map((assign) => {
                const prog = programmes.find(p => p.id === assign.programme_id)
                if (!prog) return null
                const clientNom = assign.clients?.profiles?.nom || 'Client'
                const initials = clientNom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

                const suiviKey = `${assign.programme_id}_${assign.client_id}`
                const weeksDone = (suiviData[suiviKey] || []).length
                const totalWeeks = prog.duree_semaines || 4
                const progressPct = Math.min(100, Math.round((weeksDone / totalWeeks) * 100))
                const isComplete = progressPct >= 100

                return (
                  <div key={assign.id}
                    className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-base)] p-5 md:p-6 hover:border-[var(--border-base)] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 transition-all duration-300">

                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isComplete ? 'bg-emerald-500/15 text-emerald-400 ring-2 ring-emerald-500/20' : 'bg-[#FF6B2B]/15 text-[#FF6B2B] ring-2 ring-[#FF6B2B]/10'
                      }`}>
                        {assign.clients?.profiles?.avatar_url ? (
                          <img src={assign.clients.profiles.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                          <h3 className="text-[var(--text-primary)] font-bold text-sm">{clientNom}</h3>
                          <span className="w-1 h-1 rounded-full bg-white/15" />
                          <span className="text-[var(--text-muted)] text-sm truncate">{prog.titre}</span>
                        </div>

                        <div className="flex items-center gap-2 mb-3.5">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[assign.statut] || STATUS_COLORS.en_cours}`}>
                            {STATUS_LABELS[assign.statut] || assign.statut}
                          </span>
                          {prog.categorie && (
                            <span className="text-[var(--text-muted)] text-xs">{prog.categorie}</span>
                          )}
                          {assign.date_debut && (
                            <span className="text-[var(--text-muted)] text-xs">
                              Depuis le {new Date(assign.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ease-out ${
                                isComplete
                                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                  : 'bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold shrink-0 tabular-nums ${isComplete ? 'text-emerald-400' : 'text-[#FF6B2B]'}`}>
                            {weeksDone}/{totalWeeks} sem.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════ ONGLET : MODÈLES ═══════ */}
      {tab === 'templates' && (
        <>
          {filteredTemplates.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-base)] p-20 text-center">
              <div className="w-20 h-20 bg-[#FF6B2B]/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <FolderOpen size={32} className="text-[#FF6B2B]" />
              </div>
              <h3 className="text-[var(--text-primary)] font-bold text-xl mb-2">
                {searchTerm ? 'Aucun résultat' : 'Aucun programme'}
              </h3>
              <p className="text-[var(--text-muted)] text-sm mb-8 max-w-md mx-auto">
                {searchTerm ? `Aucun modèle pour "${searchTerm}"` : 'Crée ton premier programme de coaching structuré.'}
              </p>
              {!searchTerm && (
                <button onClick={handleNew}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-xl shadow-[#FF6B2B]/25">
                  <Plus size={16} /> Créer un programme
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTemplates.map((prog) => (
                <div key={prog.id}
                  className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-base)] overflow-hidden hover:border-[var(--border-base)] hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 transition-all duration-300 group">

                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6B2B] to-[#FF9A6C] flex items-center justify-center shrink-0 shadow-lg shadow-[#FF6B2B]/20">
                        <Dumbbell size={20} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[var(--text-primary)] font-bold text-base leading-tight truncate">{prog.titre}</h3>
                        {prog.description && (
                          <p className="text-[var(--text-muted)] text-sm mt-1 line-clamp-2">{prog.description}</p>
                        )}
                      </div>
                      <button onClick={() => handleDelete(prog.id)}
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-6">
                      <span className="inline-flex items-center gap-1.5 bg-[var(--bg-base)] px-3 py-1.5 rounded-xl text-xs text-[var(--text-muted)] font-medium border border-[var(--border-subtle)]">
                        <Calendar size={12} /> {prog.duree_semaines} sem.
                      </span>
                      {prog.categorie && (
                        <span className="px-3 py-1.5 rounded-xl bg-[#FF6B2B]/10 text-[#FF6B2B] text-xs font-semibold border border-[#FF6B2B]/15">
                          {prog.categorie}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => handleEdit(prog)}
                        className="py-2.5 rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-surface)] hover:text-white transition-all flex items-center justify-center gap-2 border border-[var(--border-subtle)]">
                        <Edit3 size={14} /> Modifier
                      </button>
                      <button onClick={() => setAssignModal(prog)}
                        className="py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B2B]/20">
                        <UserPlus size={14} /> Assigner
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modale d'assignation */}
      {assignModal && (
        <AssignProgramModal
          programme={assignModal}
          clients={clients}
          deploying={deploying}
          onDeploy={handleDeploy}
          onClose={() => setAssignModal(null)}
        />
      )}
    </div>
  )
}


// ═══════════════════════════════════════
// MODALE D'ASSIGNATION RAPIDE
// ═══════════════════════════════════════
function AssignProgramModal({ programme, clients, deploying, onDeploy, onClose }) {
  const [selectedClientId, setSelectedClientId] = useState('')
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0])
  const [searchClient, setSearchClient] = useState('')

  const filteredClients = clients.filter(c => {
    const nom = c.profiles?.nom || ''
    return nom.toLowerCase().includes(searchClient.toLowerCase())
  })

  const selectedClient = clients.find(c => c.profiles?.id === selectedClientId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-[var(--bg-card)] rounded-2xl border border-[var(--border-base)] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* Orange top bar */}
        <div className="h-1 bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[var(--border-base)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[var(--text-primary)] text-lg font-bold">Assigner un programme</h2>
              <p className="text-[var(--text-muted)] text-sm mt-0.5">{programme.titre}</p>
            </div>
            <button onClick={onClose}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Programme info badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-[var(--bg-surface)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)]">
              <Calendar size={12} /> {programme.duree_semaines} semaines
            </span>
            {programme.categorie && (
              <span className="px-3 py-1.5 rounded-lg bg-[#FF6B2B]/10 text-[#FF6B2B] text-xs font-medium">
                {programme.categorie}
              </span>
            )}
          </div>

          {/* Sélection du client */}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-2 font-medium">Sélectionner un client</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchClient}
                onChange={e => setSearchClient(e.target.value)}
                placeholder="Rechercher un client..."
                className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl pl-9 pr-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 focus:ring-1 focus:ring-[#FF6B2B]/20 transition-all"
              />
            </div>
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
              {filteredClients.length === 0 ? (
                <p className="text-[var(--text-muted)] text-xs text-center py-4">Aucun client trouvé</p>
              ) : (
                filteredClients.map(c => {
                  const profileId = c.profiles?.id
                  const nom = c.profiles?.nom || 'Sans nom'
                  const email = c.profiles?.email || ''
                  const isSelected = selectedClientId === profileId
                  const initials = nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <button key={c.id} onClick={() => setSelectedClientId(profileId)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-[#FF6B2B]/10 border border-[#FF6B2B]/30'
                          : 'hover:bg-[var(--bg-surface)] border border-transparent'
                      }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isSelected ? 'bg-[#FF6B2B] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                      }`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-[#FF6B2B]' : 'text-[var(--text-primary)]'}`}>{nom}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{email}</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#FF6B2B] flex items-center justify-center shrink-0">
                          <CheckSquare size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Date de début */}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-2 font-medium">Date de début</label>
            <input
              type="date"
              value={dateDebut}
              onChange={e => setDateDebut(e.target.value)}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B]/50 focus:ring-1 focus:ring-[#FF6B2B]/20 transition-all"
            />
          </div>

          {/* Résumé */}
          {selectedClient && (
            <div className="bg-[var(--bg-base)] rounded-xl p-4 border border-[var(--border-subtle)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Résumé du déploiement</p>
              <p className="text-sm text-[var(--text-primary)]">
                <span className="font-semibold text-[#FF6B2B]">{programme.titre}</span>
                {' → '}
                <span className="font-semibold">{selectedClient.profiles?.nom}</span>
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Début le {new Date(dateDebut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} • {programme.duree_semaines} semaines
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all border border-[var(--border-subtle)]">
            Annuler
          </button>
          <button
            onClick={() => onDeploy(programme.id, selectedClientId, dateDebut)}
            disabled={!selectedClientId || deploying}
            className="flex-1 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B2B]/20">
            {deploying ? (
              <><Loader2 size={16} className="animate-spin" /> Déploiement...</>
            ) : (
              <><Rocket size={16} /> Déployer le programme</>
            )}
          </button>
        </div>
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

        <div className="flex-1 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-base)] mb-4 overflow-hidden shadow-sm">
          {/* Header */}
          <button onClick={() => setExpanded(prev => !prev)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--bg-surface)] transition-all">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {expanded ? <ChevronDown size={16} className="text-[#FF6B2B]" /> : <ChevronRight size={16} className="text-[var(--text-muted)]" />}
              <span className="text-[var(--text-primary)] font-semibold text-sm truncate">{phase.titre || `Phase ${index + 1}`}</span>
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)] text-xs bg-[var(--bg-surface)] px-2 py-0.5 rounded-md">{phase.duree_semaines} sem.</span>
                {(phase.habitudes?.length || 0) > 0 && (
                  <span className="text-[#FF6B2B]/70 text-xs bg-[#FF6B2B]/10 px-2 py-0.5 rounded-md">
                    {phase.habitudes.length} hab.
                  </span>
                )}
              </div>
            </div>
            {canRemove && (
              <button onClick={(e) => { e.stopPropagation(); onRemove() }}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all">
                <X size={14} />
              </button>
            )}
          </button>

          {expanded && (
            <div className="px-5 pb-5 space-y-5">
              {/* Titre + durée */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Titre</label>
                  <input type="text" value={phase.titre}
                    onChange={(e) => onUpdate('titre', e.target.value)}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Durée (sem.)</label>
                  <input type="number" min={1} max={12} value={phase.duree_semaines}
                    onChange={(e) => onUpdate('duree_semaines', parseInt(e.target.value) || 1)}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Description</label>
                <textarea value={phase.description || ''}
                  onChange={(e) => onUpdate('description', e.target.value)}
                  rows={2} placeholder="Objectif de cette phase..."
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-all resize-none" />
              </div>

              {/* ── Habitudes ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider">Habitudes à créer</label>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(phase.habitudes || []).map((h, hi) => (
                    <span key={hi} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-base)] text-[var(--text-primary)] text-xs">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: h.couleur || '#FF6B2B' }} />
                      {h.nom}
                      <button onClick={() => onRemoveItem('habitudes', hi)} className="text-[var(--text-muted)] hover:text-red-400 ml-0.5">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newHab} onChange={(e) => setNewHab(e.target.value)}
                    placeholder="Nom de l'habitude..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHabitude())}
                    className="flex-1 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-xs placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50" />
                  <button onClick={addHabitude} disabled={!newHab.trim()}
                    className="px-3 py-2 rounded-lg bg-[#FF6B2B]/10 text-[#FF6B2B] text-xs font-medium hover:bg-[#FF6B2B]/20 transition-colors disabled:opacity-30">
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* ── Objectifs ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider">Objectifs à créer</label>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(phase.objectifs || []).map((o, oi) => (
                    <span key={oi} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-base)] text-[var(--text-primary)] text-xs">
                      <span className="text-[#FF6B2B]">&#x1F3AF;</span> {o.titre}
                      <button onClick={() => onRemoveItem('objectifs', oi)} className="text-[var(--text-muted)] hover:text-red-400 ml-0.5">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newObj} onChange={(e) => setNewObj(e.target.value)}
                    placeholder="Titre de l'objectif..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addObjectif())}
                    className="flex-1 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-xs placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50" />
                  <button onClick={addObjectif} disabled={!newObj.trim()}
                    className="px-3 py-2 rounded-lg bg-[#FF6B2B]/10 text-[#FF6B2B] text-xs font-medium hover:bg-[#FF6B2B]/20 transition-colors disabled:opacity-30">
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* ── Ressources additionnelles ── */}
              <div className="bg-[var(--bg-base)] rounded-xl border border-[var(--border-base)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-blue-400" />
                    <label className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider">Ressources</label>
                  </div>
                  <button onClick={() => setShowResourcePicker(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                    <BookOpen size={14} /> Parcourir ma bibliothèque
                  </button>
                </div>

                {(phase.ressources_attachees || []).length === 0 ? (
                  <p className="text-[var(--text-muted)] text-xs text-center py-3">Aucune ressource attachée</p>
                ) : (
                  <div className="space-y-2">
                    {(phase.ressources_attachees || []).map((res) => {
                      const typeInfo = RESSOURCE_ICONS[res.type] || RESSOURCE_ICONS.lien
                      const Icon = typeInfo.icon
                      return (
                        <div key={res.id} className="flex items-center gap-3 bg-[var(--bg-card)] rounded-xl p-3 group">
                          <div className={`w-10 h-10 rounded-lg ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon size={16} className={typeInfo.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[var(--text-primary)] text-sm font-medium truncate">{res.titre}</p>
                            <p className="text-[var(--text-muted)] text-xs capitalize">{res.type}{res.categorie ? ` · ${res.categorie}` : ''}</p>
                          </div>
                          <button onClick={() => toggleResource(res)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
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
                  <div className="mt-3 bg-[var(--bg-base)] rounded-xl border border-[var(--border-base)] p-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase tracking-wider">Calories</label>
                        <div className="relative">
                          <input type="number" min={0} value={phase.calories_objectif || ''}
                            onChange={(e) => onUpdate('calories_objectif', parseInt(e.target.value) || null)}
                            placeholder="2000"
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B]/50" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs">kcal</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase tracking-wider">Protéines</label>
                        <div className="relative">
                          <input type="number" min={0} value={phase.proteines_g || ''}
                            onChange={(e) => onUpdate('proteines_g', parseInt(e.target.value) || null)}
                            placeholder="150"
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B]/50" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs">g</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase tracking-wider">Glucides</label>
                        <div className="relative">
                          <input type="number" min={0} value={phase.glucides_g || ''}
                            onChange={(e) => onUpdate('glucides_g', parseInt(e.target.value) || null)}
                            placeholder="250"
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B]/50" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs">g</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase tracking-wider">Lipides</label>
                        <div className="relative">
                          <input type="number" min={0} value={phase.lipides_g || ''}
                            onChange={(e) => onUpdate('lipides_g', parseInt(e.target.value) || null)}
                            placeholder="70"
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B]/50" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs">g</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase tracking-wider">Consignes nutritionnelles</label>
                      <textarea value={phase.consignes_nutrition || ''}
                        onChange={(e) => onUpdate('consignes_nutrition', e.target.value)}
                        rows={2} placeholder="Ex : Privilégier les protéines maigres, manger 5 fruits et légumes par jour..."
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-xs placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 resize-none" />
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
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-base)] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-base)] flex items-center justify-between">
          <div>
            <h3 className="text-[var(--text-primary)] font-semibold text-lg">Bibliothèque d'exercices</h3>
            <p className="text-[var(--text-muted)] text-xs mt-0.5">{exercises.length} exercices disponibles</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Search + Filter */}
        <div className="px-6 py-3 border-b border-[var(--border-base)] flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input ref={inputRef} type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un exercice..."
              className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50" />
          </div>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/50">
            <option value="">Toutes catégories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Exercise Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm text-center py-8">Aucun exercice trouvé</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map((ex) => (
                <button key={ex.id} onClick={() => onSelect(ex)}
                  className="text-left bg-[var(--bg-base)] rounded-xl border border-[var(--border-base)] overflow-hidden hover:border-[#FF6B2B]/40 hover:shadow-lg hover:shadow-[#FF6B2B]/10 transition-all group">
                  {ex.image_url ? (
                    <img src={ex.image_url} alt={ex.name}
                      className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-24 bg-[var(--bg-surface)] flex items-center justify-center">
                      <Dumbbell size={24} className="text-[var(--text-muted)]" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-[var(--text-primary)] text-xs font-medium truncate">{ex.name}</p>
                    <p className="text-[var(--text-muted)] text-[10px] mt-0.5">{ex.muscle_group}</p>
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
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-base)] w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-base)] flex items-center justify-between">
          <div>
            <h3 className="text-[var(--text-primary)] font-semibold text-lg">Ma bibliothèque</h3>
            <p className="text-[var(--text-muted)] text-xs mt-0.5">
              {ressources.length} ressource{ressources.length > 1 ? 's' : ''} · {selected.length} sélectionnée{selected.length > 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Search + Filter */}
        <div className="px-6 py-3 border-b border-[var(--border-base)] flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input ref={inputRef} type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une ressource..."
              className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500/50" />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50">
            <option value="">Tous types</option>
            {types.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>

        {/* Resource List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen size={32} className="text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-[var(--text-muted)] text-sm">
                {ressources.length === 0 ? 'Aucune ressource dans ta bibliothèque' : 'Aucun résultat'}
              </p>
              {ressources.length === 0 && (
                <p className="text-[var(--text-muted)] text-xs mt-1">Ajoute des ressources depuis l'onglet Bibliothèque</p>
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
                      : 'bg-[var(--bg-base)] border border-[var(--border-subtle)] hover:border-[var(--border-base)]'
                  }`}>
                  <div className={`w-10 h-10 rounded-lg ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={16} className={typeInfo.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-sm font-medium truncate">{res.titre}</p>
                    <p className="text-[var(--text-muted)] text-xs capitalize mt-0.5">
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
        <div className="px-6 py-3 border-t border-[var(--border-base)] flex justify-end">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20">
            Valider ({selected.length})
          </button>
        </div>
      </div>
    </div>
  )
}
