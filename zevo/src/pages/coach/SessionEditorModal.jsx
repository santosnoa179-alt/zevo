import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  X, Search, Plus, Trash2, Dumbbell, GripVertical,
  Clock, Repeat, Timer, Loader2, Check, Filter,
  FileText, Paperclip, Upload, File
} from 'lucide-react'

// Fallback mock exercises if Supabase is empty
const MOCK_EXERCISES = [
  { id: 'm1', nom: 'Développé couché', muscle_group: 'Pectoraux', equipment: 'Barre' },
  { id: 'm2', nom: 'Squat barre', muscle_group: 'Jambes', equipment: 'Barre' },
  { id: 'm3', nom: 'Soulevé de terre', muscle_group: 'Dos', equipment: 'Barre' },
  { id: 'm4', nom: 'Tractions', muscle_group: 'Dos', equipment: 'Poids du corps' },
  { id: 'm5', nom: 'Développé militaire', muscle_group: 'Épaules', equipment: 'Barre' },
  { id: 'm6', nom: 'Rowing barre', muscle_group: 'Dos', equipment: 'Barre' },
  { id: 'm7', nom: 'Curl biceps', muscle_group: 'Biceps', equipment: 'Haltère' },
  { id: 'm8', nom: 'Extension triceps', muscle_group: 'Triceps', equipment: 'Câble' },
  { id: 'm9', nom: 'Fentes marchées', muscle_group: 'Jambes', equipment: 'Poids du corps' },
  { id: 'm10', nom: 'Leg press', muscle_group: 'Jambes', equipment: 'Machine' },
  { id: 'm11', nom: 'Pompes', muscle_group: 'Pectoraux', equipment: 'Poids du corps' },
  { id: 'm12', nom: 'Dips', muscle_group: 'Triceps', equipment: 'Poids du corps' },
  { id: 'm13', nom: 'Planche gainage', muscle_group: 'Abdominaux', equipment: 'Poids du corps' },
  { id: 'm14', nom: 'Crunch', muscle_group: 'Abdominaux', equipment: 'Poids du corps' },
  { id: 'm15', nom: 'Hip thrust', muscle_group: 'Fessiers', equipment: 'Barre' },
]

const MUSCLE_GROUPS = ['Tous', 'Pectoraux', 'Dos', 'Jambes', 'Épaules', 'Biceps', 'Triceps', 'Abdominaux', 'Fessiers']

export default function SessionEditorModal({ session, dayLabel, onSave, onClose }) {
  const { user } = useAuth()

  // Library state
  const [allExercises, setAllExercises] = useState([])
  const [loadingLib, setLoadingLib] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('Tous')
  const [showFilters, setShowFilters] = useState(false)

  // Left panel tab
  const [leftTab, setLeftTab] = useState('exercices') // 'exercices' | 'fichiers'

  // File input ref
  const fileInputRef = useRef(null)

  // Available files (starts with mock, user can add more)
  const [availableFiles, setAvailableFiles] = useState([
    { id: 'f1', name: 'Guide_Echauffement.pdf', type: 'pdf', size: '1.2 MB' },
    { id: 'f2', name: 'Plan_Nutrition_Semaine.pdf', type: 'pdf', size: '850 KB' },
    { id: 'f3', name: 'Video_Technique_Squat.mp4', type: 'video', size: '15 MB' },
    { id: 'f4', name: 'Stretching_Routine.pdf', type: 'pdf', size: '2.1 MB' },
  ])

  // Files attached to this session
  const [attachedFiles, setAttachedFiles] = useState(session?.fichiers || [])

  // Custom exercise creation
  const [isCreatingExercise, setIsCreatingExercise] = useState(false)
  const [newExName, setNewExName] = useState('')
  const [newExMuscle, setNewExMuscle] = useState('')
  const [newExEquip, setNewExEquip] = useState('')
  const [creatingEx, setCreatingEx] = useState(false)

  // Canvas state (exercises in current session)
  const [canvas, setCanvas] = useState(
    (session?.exercices || []).map(ex => ({
      ...ex,
      _key: ex._key || crypto.randomUUID(),
      series: ex.series || 3,
      reps: ex.reps || 10,
      repos: ex.repos || 90,
    }))
  )

  // Session title
  const [titre, setTitre] = useState(session?.titre || dayLabel || 'Séance')

  // Load exercises from Supabase
  useEffect(() => {
    const load = async () => {
      setLoadingLib(true)
      const { data, error } = await supabase
        .from('exercices')
        .select('id, nom, muscle_group, equipment, category, description, video_url, gif_url')
        .or(`coach_id.is.null,coach_id.eq.${user?.id}`)
        .order('nom')

      if (data && data.length > 0) {
        setAllExercises(data)
      } else {
        setAllExercises(MOCK_EXERCISES)
      }
      setLoadingLib(false)
    }
    load()
  }, [user?.id])

  // Filtered exercises
  const filtered = allExercises.filter(ex => {
    const matchSearch = ex.nom.toLowerCase().includes(searchQuery.toLowerCase())
    const matchMuscle = muscleFilter === 'Tous' || ex.muscle_group === muscleFilter
    return matchSearch && matchMuscle
  })

  // Add exercise to canvas
  const addToCanvas = (exercise) => {
    setCanvas(prev => [...prev, {
      ...exercise,
      _key: crypto.randomUUID(),
      series: 3,
      reps: 10,
      repos: 90,
    }])
  }

  // Remove from canvas
  const removeFromCanvas = (key) => {
    setCanvas(prev => prev.filter(ex => ex._key !== key))
  }

  // Update exercise field
  const updateExField = (key, field, value) => {
    setCanvas(prev => prev.map(ex =>
      ex._key === key ? { ...ex, [field]: value } : ex
    ))
  }

  // Create custom exercise
  const handleCreateExercise = async () => {
    if (!newExName.trim()) return
    setCreatingEx(true)
    try {
      const { data, error } = await supabase.from('exercices').insert({
        coach_id: user?.id,
        nom: newExName.trim(),
        muscle_group: newExMuscle || null,
        equipment: newExEquip || null,
        category: 'Musculation',
      }).select().single()

      if (error) throw error

      // Add to library list
      setAllExercises(prev => [data, ...prev])
      // Add directly to canvas
      addToCanvas(data)
      // Reset form
      setNewExName('')
      setNewExMuscle('')
      setNewExEquip('')
      setIsCreatingExercise(false)
    } catch (err) {
      console.error('Erreur création exercice:', err)
    }
    setCreatingEx(false)
  }

  // Handle file upload from system picker
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    let fileType = 'file'
    if (['pdf'].includes(ext)) fileType = 'pdf'
    else if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) fileType = 'video'
    else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) fileType = 'image'
    else if (['xlsx', 'xls', 'csv'].includes(ext)) fileType = 'spreadsheet'
    else if (['docx', 'doc'].includes(ext)) fileType = 'doc'

    const newFile = {
      id: crypto.randomUUID(),
      name: file.name,
      type: fileType,
      size: file.size < 1024 * 1024
        ? (file.size / 1024).toFixed(0) + ' KB'
        : (file.size / (1024 * 1024)).toFixed(1) + ' MB',
      _localFile: file, // Keep reference for future Supabase upload
    }

    setAvailableFiles(prev => [newFile, ...prev])
    // Auto-attach to session
    setAttachedFiles(prev => [...prev, newFile])
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  // File helpers
  const addFile = (file) => {
    if (attachedFiles.some(f => f.id === file.id)) return
    setAttachedFiles(prev => [...prev, file])
  }
  const removeFile = (fileId) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId))
  }
  const isFileAttached = (fileId) => attachedFiles.some(f => f.id === fileId)

  // Save
  const handleSave = () => {
    onSave({
      titre,
      exercices: canvas.map(({ _key, ...rest }) => ({ ...rest, _key })),
      fichiers: attachedFiles,
    })
  }

  // Check if exercise already in canvas
  const isInCanvas = (exId) => canvas.some(c => c.id === exId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative w-full max-w-6xl h-[85vh] bg-[#09090b] rounded-2xl border border-[#27272a] shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* ═══ Header ═══ */}
        <div className="px-6 py-4 border-b border-[#27272a] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center">
              <Dumbbell size={16} className="text-[#FF6B2B]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[#F5F5F3] text-base font-bold">Édition de séance</h2>
                <span className="text-white/20 text-sm">—</span>
                <span className="text-white/40 text-sm">{dayLabel}</span>
              </div>
              <input
                type="text"
                value={titre}
                onChange={e => setTitre(e.target.value)}
                className="bg-transparent text-white/50 text-xs border-none focus:outline-none focus:text-[#F5F5F3] placeholder:text-white/20 mt-0.5"
                placeholder="Nom de la séance..."
              />
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.06] transition-all">
            <X size={18} />
          </button>
        </div>

        {/* ═══ Body — Split Screen ═══ */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── Left: Library (35%) ── */}
          <div className="w-[35%] border-r border-[#27272a] flex flex-col bg-[#0D0D0D]">

            {/* Segmented Control */}
            <div className="px-4 pt-3 pb-0">
              <div className="bg-[#18181b] p-0.5 flex rounded-lg">
                <button onClick={() => setLeftTab('exercices')}
                  className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold text-center transition-all ${
                    leftTab === 'exercices' ? 'bg-[#27272a] text-[#F5F5F3] shadow-sm' : 'text-white/30 hover:text-white/50'
                  }`}>
                  <Dumbbell size={11} className="inline mr-1" />Exercices
                </button>
                <button onClick={() => setLeftTab('fichiers')}
                  className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold text-center transition-all ${
                    leftTab === 'fichiers' ? 'bg-[#27272a] text-[#F5F5F3] shadow-sm' : 'text-white/30 hover:text-white/50'
                  }`}>
                  <Paperclip size={11} className="inline mr-1" />Fichiers
                </button>
              </div>
            </div>

            {/* ── Fichiers tab ── */}
            {leftTab === 'fichiers' && (
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-[#27272a]/50">
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload}
                    accept=".pdf,.mp4,.mov,.xlsx,.docx,.jpg,.jpeg,.png,.gif,.webp" />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-[#27272a] text-white/25 text-xs font-medium hover:border-[#FF6B2B]/30 hover:text-[#FF6B2B]/50 hover:bg-[#FF6B2B]/[0.02] transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <Upload size={14} /> Importer un fichier
                  </button>
                  <p className="text-white/15 text-[10px] mt-2">{availableFiles.length} fichier{availableFiles.length !== 1 ? 's' : ''} disponible{availableFiles.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  {availableFiles.map(file => {
                    const attached = isFileAttached(file.id)
                    return (
                      <button key={file.id} onClick={() => !attached && addFile(file)}
                        disabled={attached}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                          attached
                            ? 'bg-[#FF6B2B]/5 border border-[#FF6B2B]/15 opacity-60'
                            : 'bg-[#18181b] border border-transparent hover:border-[#FF6B2B]/20 hover:bg-[#1E1E1E]'
                        }`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          file.type === 'pdf' ? 'bg-red-500/10' : file.type === 'video' ? 'bg-purple-500/10' : 'bg-blue-500/10'
                        }`}>
                          <FileText size={16} className={
                            file.type === 'pdf' ? 'text-red-400' : file.type === 'video' ? 'text-purple-400' : 'text-blue-400'
                          } />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#F5F5F3] text-sm font-medium truncate">{file.name}</p>
                          <p className="text-white/20 text-[10px] mt-0.5">{file.size}</p>
                        </div>
                        {attached && (
                          <div className="w-6 h-6 rounded-full bg-[#FF6B2B]/20 flex items-center justify-center shrink-0">
                            <Check size={12} className="text-[#FF6B2B]" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Search + filters (exercices tab only) */}
            {leftTab === 'exercices' && <>
            <div className="p-4 space-y-3 border-b border-[#27272a]/50">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un exercice..."
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-9 pr-3 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/40 transition-all"
                  />
                </div>
                <button onClick={() => setShowFilters(!showFilters)}
                  className={`p-2.5 rounded-xl border transition-all ${
                    showFilters ? 'bg-[#FF6B2B]/10 border-[#FF6B2B]/30 text-[#FF6B2B]' : 'bg-[#18181b] border-[#27272a] text-white/30 hover:text-white/50'
                  }`}>
                  <Filter size={14} />
                </button>
              </div>

              {/* Muscle group filters */}
              {showFilters && (
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_GROUPS.map(mg => (
                    <button key={mg} onClick={() => setMuscleFilter(mg)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                        muscleFilter === mg
                          ? 'bg-[#FF6B2B] text-white'
                          : 'bg-[#18181b] text-white/30 hover:text-white/50 border border-[#27272a]'
                      }`}>
                      {mg}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-white/15 text-[10px]">{filtered.length} exercice{filtered.length !== 1 ? 's' : ''}</p>
                <button onClick={() => { setIsCreatingExercise(!isCreatingExercise); setNewExName(searchQuery) }}
                  className="text-[10px] text-[#FF6B2B] font-semibold hover:text-[#FF9A6C] transition-colors">
                  {isCreatingExercise ? 'Annuler' : '+ Créer'}
                </button>
              </div>
            </div>

            {/* Exercise list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">

              {/* ── Create exercise form ── */}
              {isCreatingExercise && (
                <div className="bg-[#1E1E1E] border border-[#FF6B2B]/20 rounded-xl p-4 mb-3 space-y-3">
                  <p className="text-[#F5F5F3] text-xs font-bold">Nouvel exercice personnalisé</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-1.5 border-b border-[#27272a]/50">
                      <span className="text-white/30 text-[11px] font-medium">Nom</span>
                      <input type="text" value={newExName} onChange={e => setNewExName(e.target.value)}
                        placeholder="Ex : Romanian deadlift" autoFocus
                        className="bg-transparent text-[#F5F5F3] text-[11px] text-right border-none focus:outline-none placeholder:text-white/15 w-2/3" />
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-[#27272a]/50">
                      <span className="text-white/30 text-[11px] font-medium">Muscle</span>
                      <select value={newExMuscle} onChange={e => setNewExMuscle(e.target.value)}
                        className="bg-transparent text-[#F5F5F3] text-[11px] text-right border-none focus:outline-none appearance-none cursor-pointer">
                        <option value="">—</option>
                        {MUSCLE_GROUPS.filter(m => m !== 'Tous').map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-white/30 text-[11px] font-medium">Équipement</span>
                      <input type="text" value={newExEquip} onChange={e => setNewExEquip(e.target.value)}
                        placeholder="Barre, Haltère..."
                        className="bg-transparent text-[#F5F5F3] text-[11px] text-right border-none focus:outline-none placeholder:text-white/15 w-2/3" />
                    </div>
                  </div>
                  <button onClick={handleCreateExercise} disabled={!newExName.trim() || creatingEx}
                    className="w-full py-2 rounded-lg bg-[#FF6B2B] text-white text-xs font-bold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
                    {creatingEx ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    {creatingEx ? 'Création...' : 'Créer et ajouter'}
                  </button>
                </div>
              )}

              {loadingLib ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-[#FF6B2B]" size={20} />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <Dumbbell size={24} className="text-white/10 mx-auto mb-2" />
                  <p className="text-white/20 text-xs mb-3">Aucun exercice trouvé</p>
                  {searchQuery && !isCreatingExercise && (
                    <button onClick={() => { setIsCreatingExercise(true); setNewExName(searchQuery) }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#FF6B2B]/30 text-[#FF6B2B] text-[11px] font-semibold hover:bg-[#FF6B2B]/5 transition-all">
                      <Plus size={12} /> Créer "{searchQuery}"
                    </button>
                  )}
                </div>
              ) : (
                filtered.map(ex => {
                  const added = isInCanvas(ex.id)
                  return (
                    <button
                      key={ex.id}
                      onClick={() => !added && addToCanvas(ex)}
                      disabled={added}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                        added
                          ? 'bg-[#FF6B2B]/5 border border-[#FF6B2B]/15 opacity-60'
                          : 'bg-[#18181b] border border-transparent hover:border-[#FF6B2B]/20 hover:bg-[#1E1E1E]'
                      }`}
                    >
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl bg-[#27272a] flex items-center justify-center shrink-0">
                        <Dumbbell size={16} className="text-white/25" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[#F5F5F3] text-sm font-medium truncate">{ex.nom}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {ex.muscle_group && (
                            <span className="text-[10px] text-[#FF6B2B]/60 font-medium">{ex.muscle_group}</span>
                          )}
                          {ex.equipment && (
                            <span className="text-[10px] text-white/20">{ex.equipment}</span>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      {added ? (
                        <div className="w-6 h-6 rounded-full bg-[#FF6B2B]/20 flex items-center justify-center shrink-0">
                          <Check size={12} className="text-[#FF6B2B]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-[#27272a] flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100">
                          <Plus size={12} className="text-white/20" />
                        </div>
                      )}
                    </button>
                  )
                })
              )}
            </div>
            </>}
          </div>

          {/* ── Right: Canvas (65%) ── */}
          <div className="flex-1 flex flex-col bg-[#0D0D0D]">

            {/* Canvas header */}
            <div className="px-5 py-3 border-b border-[#27272a]/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell size={14} className="text-[#FF6B2B]" />
                <span className="text-[#F5F5F3] text-sm font-semibold">{titre}</span>
                <span className="text-white/15 text-xs ml-1">
                  {canvas.length} exercice{canvas.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-white/20">
                <span className="flex items-center gap-1"><Repeat size={10} /> Séries</span>
                <span className="flex items-center gap-1"><Dumbbell size={10} /> Reps</span>
                <span className="flex items-center gap-1"><Timer size={10} /> Repos</span>
              </div>
            </div>

            {/* Canvas body */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              {canvas.length === 0 ? (
                /* Empty state */
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#27272a] flex items-center justify-center mb-4 hover:border-[#FF6B2B]/30 transition-all">
                    <Plus size={28} className="text-white/10" />
                  </div>
                  <p className="text-[#F5F5F3] text-base font-semibold mb-1">Séance vide</p>
                  <p className="text-white/25 text-sm text-center max-w-xs leading-relaxed">
                    Cliquez sur un exercice à gauche pour commencer à construire votre séance
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {canvas.map((ex, idx) => (
                    <div key={ex._key}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-[#18181b] border border-[#27272a]/50 hover:border-[#27272a] transition-all">

                      {/* Drag handle + order */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <GripVertical size={14} className="text-white/10 cursor-grab" />
                        <span className="text-[#FF6B2B] text-xs font-bold w-5 text-center">{idx + 1}</span>
                      </div>

                      {/* Icon */}
                      <div className="w-9 h-9 rounded-lg bg-[#27272a] flex items-center justify-center shrink-0">
                        <Dumbbell size={14} className="text-white/25" />
                      </div>

                      {/* Name + muscle */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[#F5F5F3] text-sm font-medium truncate">{ex.nom}</p>
                        <p className="text-white/20 text-[10px] mt-0.5">{ex.muscle_group || ''}</p>
                      </div>

                      {/* Series / Reps / Repos inputs */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-center">
                          <input
                            type="number"
                            value={ex.series}
                            onChange={e => updateExField(ex._key, 'series', parseInt(e.target.value) || 0)}
                            className="w-12 bg-[#0D0D0D] border border-[#27272a] rounded-lg px-2 py-1.5 text-[#F5F5F3] text-xs text-center font-semibold focus:outline-none focus:border-[#FF6B2B]/40 transition-all"
                          />
                          <span className="text-white/15 text-[8px] mt-0.5">séries</span>
                        </div>
                        <span className="text-white/10 text-xs">×</span>
                        <div className="flex flex-col items-center">
                          <input
                            type="number"
                            value={ex.reps}
                            onChange={e => updateExField(ex._key, 'reps', parseInt(e.target.value) || 0)}
                            className="w-12 bg-[#0D0D0D] border border-[#27272a] rounded-lg px-2 py-1.5 text-[#F5F5F3] text-xs text-center font-semibold focus:outline-none focus:border-[#FF6B2B]/40 transition-all"
                          />
                          <span className="text-white/15 text-[8px] mt-0.5">reps</span>
                        </div>
                        <div className="flex flex-col items-center ml-1">
                          <div className="flex items-center">
                            <input
                              type="number"
                              value={ex.repos}
                              onChange={e => updateExField(ex._key, 'repos', parseInt(e.target.value) || 0)}
                              className="w-14 bg-[#0D0D0D] border border-[#27272a] rounded-lg px-2 py-1.5 text-[#F5F5F3] text-xs text-center font-semibold focus:outline-none focus:border-[#FF6B2B]/40 transition-all"
                            />
                          </div>
                          <span className="text-white/15 text-[8px] mt-0.5">repos (s)</span>
                        </div>
                      </div>

                      {/* Delete */}
                      <button onClick={() => removeFromCanvas(ex._key)}
                        className="p-1.5 rounded-lg text-white/10 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fichiers joints section */}
            {attachedFiles.length > 0 && (
              <div className="px-5 py-3 border-t border-[#27272a]/50 shrink-0">
                <p className="text-white/25 text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Paperclip size={10} /> Fichiers joints ({attachedFiles.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {attachedFiles.map(file => (
                    <div key={file.id} className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a]/50">
                      <FileText size={12} className={file.type === 'pdf' ? 'text-red-400' : file.type === 'video' ? 'text-purple-400' : 'text-blue-400'} />
                      <span className="text-[#F5F5F3] text-[11px] font-medium">{file.name}</span>
                      <button onClick={() => removeFile(file.id)}
                        className="p-0.5 rounded text-white/10 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Canvas footer */}
            <div className="px-5 py-4 border-t border-[#27272a] flex items-center justify-between shrink-0">
              <div className="text-xs text-white/20">
                {canvas.length > 0 && (
                  <span>
                    {canvas.reduce((sum, ex) => sum + ex.series, 0)} séries totales
                    {' · '}
                    ~{Math.round(canvas.reduce((sum, ex) => sum + (ex.series * (ex.reps * 3 + ex.repos)), 0) / 60)} min estimées
                  </span>
                )}
              </div>
              <button onClick={handleSave}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-lg shadow-[#FF6B2B]/20">
                <Check size={14} /> Valider la séance
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
