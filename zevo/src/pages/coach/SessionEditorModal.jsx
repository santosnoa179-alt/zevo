import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import {
  X, Search, Plus, Trash2, Dumbbell, GripVertical,
  Clock, Repeat, Timer, Loader2, Check, Filter,
  FileText, Paperclip, Upload, File, ExternalLink, StickyNote,
  SlidersHorizontal, RotateCcw,
} from 'lucide-react'

// Mappings labels (meme que dans ExerciseLibraryPage)
const BODY_PART_LABELS = {
  back: 'Dos', cardio: 'Cardio', chest: 'Poitrine',
  'lower arms': 'Avant-bras', 'lower legs': 'Mollets',
  neck: 'Cou', shoulders: 'Epaules',
  'upper arms': 'Bras', 'upper legs': 'Cuisses', waist: 'Abdos',
}

const EQUIPMENT_LABELS = {
  barbell: 'Barre', dumbbell: 'Halteres', 'body weight': 'Poids du corps',
  cable: 'Cable', machine: 'Machine', band: 'Elastique', kettlebell: 'Kettlebell',
  'medicine ball': 'Medecine ball', 'stability ball': 'Swiss ball',
  'ez barbell': 'Barre EZ', 'olympic barbell': 'Barre olympique',
  'smith machine': 'Smith machine', roller: 'Rouleau', rope: 'Corde',
  'leverage machine': 'Machine a levier', assisted: 'Assiste', weighted: 'Leste',
  bosu: 'Bosu', 'resistance band': 'Bande de resistance', tire: 'Pneu',
  trap: 'Trap bar', 'upper body ergometer': 'Ergometre', hammer: 'Marteau',
  sled: 'Traineau', elliptical: 'Elliptique', skierg: 'SkiErg',
  stepmill: 'Stepmill', 'stationary bike': 'Velo stationnaire',
}

const TARGET_LABELS = {
  abductors: 'Abducteurs', abs: 'Abdominaux', adductors: 'Adducteurs',
  biceps: 'Biceps', calves: 'Mollets', 'cardiovascular system': 'Cardio',
  delts: 'Deltoides', forearms: 'Avant-bras', glutes: 'Fessiers',
  hamstrings: 'Ischio-jambiers', lats: 'Dorsaux',
  'levator scapulae': 'Elevateur scapulaire', pectorals: 'Pectoraux',
  quads: 'Quadriceps', 'serratus anterior': 'Dentele', spine: 'Colonne',
  traps: 'Trapezes', triceps: 'Triceps', 'upper back': 'Haut du dos',
}

const normalizeBodyPart = (bp) => BODY_PART_LABELS[bp] || bp || ''
const normalizeEquipment = (eq) => EQUIPMENT_LABELS[eq] || eq || ''
const translate = (key, map) =>
  map[key] || (key ? key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '—')

export default function SessionEditorModal({ session, dayLabel, onSave, onClose }) {
  const { user } = useAuth()
  const toast = useToast()

  // Library state
  const [allExercises, setAllExercises] = useState([])
  const [loadingLib, setLoadingLib] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  // 3 filtres identiques a ExerciseLibraryPage (stockent la valeur EN brute)
  const [bodyPartFilter, setBodyPartFilter] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState('')
  const [targetFilter, setTargetFilter] = useState('')
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

  // Tags state
  const [tags, setTags] = useState(Array.isArray(session?.tags) ? session.tags : [])
  const [tagInput, setTagInput] = useState('')

  // Note panel open state (store _key of the exercise whose note panel is open)
  const [openNoteKey, setOpenNoteKey] = useState(null)

  // Load exercises from Supabase: library (exercises table, 1000 exos) + custom (exercices)
  useEffect(() => {
    const load = async () => {
      setLoadingLib(true)

      const [libraryRes, customRes] = await Promise.all([
        supabase
          .from('exercises')
          .select('id, name, name_fr, target_muscle, body_part, equipment, gif_url')
          .order('name'),
        supabase
          .from('exercices')
          .select('id, nom, muscle_group, equipment, category, description, video_url, gif_url, library_id')
          .or(`coach_id.is.null,coach_id.eq.${user?.id}`)
          .order('nom'),
      ])

      // Normaliser shape: { id, nom, muscle_group, equipment, gif_url, source, library_id? }
      // On garde AUSSI les valeurs EN brutes (body_part, equipment_raw, target_muscle)
      // pour que les filtres "Zone / Equipement / Muscle cible" matchent exactement
      // ceux de la page ExerciseLibraryPage.
      const libraryExos = (libraryRes.data || []).map(ex => ({
        id: ex.id, // ExerciseDB id (text)
        nom: ex.name_fr || ex.name,
        muscle_group: normalizeBodyPart(ex.body_part), // FR pour affichage
        equipment: normalizeEquipment(ex.equipment),    // FR pour affichage
        body_part: ex.body_part || '',                  // EN brut pour filtre
        equipment_raw: ex.equipment || '',              // EN brut pour filtre
        target_muscle: ex.target_muscle || '',          // EN brut pour filtre
        gif_url: ex.gif_url,
        source: 'library',
        library_id: ex.id, // meme valeur, utilise pour bridging
      }))

      // Ne pas dupliquer les exos custom qui sont deja des imports de library
      const customExos = (customRes.data || [])
        .filter(ex => !ex.library_id) // les bridges on les cache (ils apparaitront via libraryExos)
        .map(ex => ({
          id: ex.id,
          nom: ex.nom,
          muscle_group: ex.muscle_group,
          equipment: ex.equipment,
          body_part: '',          // custom n'ont pas de body_part EN
          equipment_raw: '',
          target_muscle: '',
          gif_url: ex.gif_url,
          source: 'custom',
        }))

      // Library en premier (alphabetique), puis custom
      setAllExercises([...libraryExos, ...customExos])
      setLoadingLib(false)
    }
    load()
  }, [user?.id])

  // Derived filter options (uniquement depuis exos library, car custom n'ont pas ces champs EN)
  const bodyParts = useMemo(
    () => [...new Set(allExercises.map(e => e.body_part))].filter(Boolean).sort(),
    [allExercises]
  )
  const equipments = useMemo(
    () => [...new Set(allExercises.map(e => e.equipment_raw))].filter(Boolean).sort(),
    [allExercises]
  )
  const targets = useMemo(
    () => [...new Set(allExercises.map(e => e.target_muscle))].filter(Boolean).sort(),
    [allExercises]
  )

  // Filtered exercises (memoized for 1000+ items performance)
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return allExercises.filter(ex => {
      const matchSearch = !q || (ex.nom || '').toLowerCase().includes(q)
      const matchBodyPart = !bodyPartFilter || ex.body_part === bodyPartFilter
      const matchEquipment = !equipmentFilter || ex.equipment_raw === equipmentFilter
      const matchTarget = !targetFilter || ex.target_muscle === targetFilter
      return matchSearch && matchBodyPart && matchEquipment && matchTarget
    })
  }, [allExercises, searchQuery, bodyPartFilter, equipmentFilter, targetFilter])

  const activeFilterCount = [bodyPartFilter, equipmentFilter, targetFilter].filter(Boolean).length

  const clearFilters = () => {
    setBodyPartFilter('')
    setEquipmentFilter('')
    setTargetFilter('')
  }

  // Add exercise to canvas
  // Si l'exo vient de la library (source: 'library'), on le bridge dans exercices pour que
  // seance_exercices.exercice_id (FK uuid) puisse le referencer.
  // Bridge lazy + cache: chaque library_id n'est importe qu'une seule fois par coach.
  const addToCanvas = async (exercise) => {
    let canvasExercise = exercise

    if (exercise.source === 'library') {
      try {
        // Check if already bridged for this coach
        const { data: existing } = await supabase
          .from('exercices')
          .select('id, nom, muscle_group, equipment, gif_url')
          .eq('coach_id', user?.id)
          .eq('library_id', exercise.library_id)
          .maybeSingle()

        if (existing) {
          canvasExercise = { ...existing }
        } else {
          // Create bridge entry
          const { data: inserted, error: insertErr } = await supabase
            .from('exercices')
            .insert({
              coach_id: user?.id,
              nom: exercise.nom,
              muscle_group: exercise.muscle_group,
              equipment: exercise.equipment,
              gif_url: exercise.gif_url,
              category: 'Musculation',
              library_id: exercise.library_id,
            })
            .select('id, nom, muscle_group, equipment, gif_url')
            .single()

          if (insertErr) {
            console.error('[SessionEditor] Bridge insert error:', insertErr)
            toast.error('Impossible d\'importer l\'exercice')
            return
          }
          canvasExercise = { ...inserted }
        }
      } catch (err) {
        console.error('[SessionEditor] Bridge error:', err)
        toast.error('Erreur lors de l\'ajout de l\'exercice')
        return
      }
    }

    setCanvas(prev => [...prev, {
      ...canvasExercise,
      // track original library_id so isInCanvas() works on subsequent clicks
      library_id: exercise.library_id || null,
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

      // Normalize shape (custom source for isInCanvas + filter logic)
      const normalized = {
        id: data.id,
        nom: data.nom,
        muscle_group: data.muscle_group,
        equipment: data.equipment,
        gif_url: data.gif_url || null,
        source: 'custom',
      }
      // Add to library list
      setAllExercises(prev => [normalized, ...prev])
      // Add directly to canvas
      addToCanvas(normalized)
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
  const [uploading, setUploading] = useState(false)

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // Reset input so same file can be re-selected

    const ext = file.name.split('.').pop()?.toLowerCase()
    let fileType = 'file'
    if (['pdf'].includes(ext)) fileType = 'pdf'
    else if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) fileType = 'video'
    else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) fileType = 'image'
    else if (['xlsx', 'xls', 'csv'].includes(ext)) fileType = 'spreadsheet'
    else if (['docx', 'doc'].includes(ext)) fileType = 'doc'

    const sizeLabel = file.size < 1024 * 1024
      ? (file.size / 1024).toFixed(0) + ' KB'
      : (file.size / (1024 * 1024)).toFixed(1) + ' MB'

    // Upload to Supabase Storage
    setUploading(true)
    const storagePath = `coach_uploads/${Date.now()}_${file.name}`

    const { error: uploadErr } = await supabase.storage
      .from('program-files')
      .upload(storagePath, file)

    let publicUrl = null
    if (uploadErr) {
      console.error('[SessionEditor] Upload error:', uploadErr)
      toast.error('Erreur upload : ' + (uploadErr.message || 'Vérifiez les policies Storage'))
      // Fallback: keep file locally
    } else {
      const { data: urlData } = supabase.storage.from('program-files').getPublicUrl(storagePath)
      publicUrl = urlData?.publicUrl || null
      toast.success(`${file.name} uploadé !`)
    }

    const newFile = {
      id: crypto.randomUUID(),
      name: file.name,
      type: fileType,
      size: sizeLabel,
      path: storagePath,
      url: publicUrl,
      _localFile: uploadErr ? file : null, // Keep local ref only if upload failed
    }

    setAvailableFiles(prev => [newFile, ...prev])
    setAttachedFiles(prev => [...prev, newFile])
    setUploading(false)
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

  // Open/preview a file
  const handleOpenFile = (file) => {
    if (file.url) {
      console.log('[SessionEditor] Ouverture du lien :', file.url)
      window.open(file.url, '_blank')
    } else if (file._localFile) {
      // Fallback: local blob (upload failed earlier)
      const blobUrl = URL.createObjectURL(file._localFile)
      console.log('[SessionEditor] Ouverture blob local :', blobUrl)
      window.open(blobUrl, '_blank')
    } else if (file.path) {
      // File has a storage path but no cached URL — regenerate it
      const { data } = supabase.storage.from('program-files').getPublicUrl(file.path)
      if (data?.publicUrl) {
        console.log('[SessionEditor] URL régénérée :', data.publicUrl)
        window.open(data.publicUrl, '_blank')
      } else {
        toast.error('Impossible de générer le lien pour ce fichier.')
      }
    } else {
      toast.error('Ce fichier n\'a pas de lien disponible.')
    }
  }

  // Tag helpers
  const addTag = (rawTag) => {
    const t = (rawTag || '').trim().slice(0, 40)
    if (!t) return
    setTags(prev => prev.includes(t) ? prev : [...prev, t])
    setTagInput('')
  }
  const removeTag = (tag) => {
    setTags(prev => prev.filter(t => t !== tag))
  }

  // Save
  const handleSave = () => {
    const sessionData = {
      titre,
      tags,
      exercices: canvas.map(({ _key, ...rest }) => ({ ...rest, _key })),
      fichiers: attachedFiles.map(f => ({ id: f.id, name: f.name, type: f.type, size: f.size, url: f.url || null, path: f.path || null })),
    }
    console.log('[SessionEditor] Fichier prêt avec URL :', sessionData.fichiers)
    console.log('[SessionEditorModal] Séance prête à être sauvegardée:', sessionData)
    onSave(sessionData)
  }

  // Check if exercise already in canvas (handles both library ids and bridged UUIDs)
  const isInCanvas = (ex) => {
    if (ex.source === 'library') {
      return canvas.some(c => c.library_id === ex.library_id)
    }
    return canvas.some(c => c.id === ex.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative w-full max-w-6xl h-[85vh] bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-base)] shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* ═══ Header ═══ */}
        <div className="px-6 py-4 border-b border-[var(--border-base)] flex items-start justify-between shrink-0 gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center shrink-0 mt-0.5">
              <Dumbbell size={16} className="text-[#FF6B2B]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-[var(--text-primary)] text-base font-bold">Édition de séance</h2>
                {dayLabel && <>
                  <span className="text-[var(--text-muted)] text-sm">—</span>
                  <span className="text-[var(--text-muted)] text-sm">{dayLabel}</span>
                </>}
              </div>
              <input
                type="text"
                value={titre}
                onChange={e => setTitre(e.target.value)}
                className="bg-transparent text-[var(--text-secondary)] text-xs border-none focus:outline-none focus:text-[var(--text-primary)] placeholder:text-[var(--text-muted)] mt-0.5 w-full"
                placeholder="Nom de la séance..."
              />
              {/* Tags */}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-semibold">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}
                      className="ml-0.5 hover:text-[#FF9A6C] transition-colors" aria-label={`Retirer ${tag}`}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
                    else if (e.key === 'Backspace' && !tagInput && tags.length > 0) { removeTag(tags[tags.length - 1]) }
                  }}
                  onBlur={() => tagInput && addTag(tagInput)}
                  placeholder={tags.length === 0 ? '+ Ajouter un tag (Push, Pull, Cardio…)' : '+ tag'}
                  className="bg-transparent text-[var(--text-muted)] text-[10px] border-none focus:outline-none focus:text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] min-w-[110px] flex-1"
                />
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* ═══ Body — Split Screen ═══ */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── Left: Library (35%) ── */}
          <div className="w-[35%] border-r border-[var(--border-base)] flex flex-col bg-[var(--bg-base)]">

            {/* Segmented Control */}
            <div className="px-4 pt-3 pb-0">
              <div className="bg-[var(--bg-base)] p-0.5 flex rounded-lg">
                <button onClick={() => setLeftTab('exercices')}
                  className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold text-center transition-all ${
                    leftTab === 'exercices' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}>
                  <Dumbbell size={11} className="inline mr-1" />Exercices
                </button>
                <button onClick={() => setLeftTab('fichiers')}
                  className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold text-center transition-all ${
                    leftTab === 'fichiers' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}>
                  <Paperclip size={11} className="inline mr-1" />Fichiers
                </button>
              </div>
            </div>

            {/* ── Fichiers tab ── */}
            {leftTab === 'fichiers' && (
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-[var(--border-base)]/50">
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload}
                    accept=".pdf,.mp4,.mov,.xlsx,.docx,.jpg,.jpeg,.png,.gif,.webp" />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-[var(--border-base)] text-[var(--text-muted)] text-xs font-medium hover:border-[#FF6B2B]/30 hover:text-[#FF6B2B]/50 hover:bg-[#FF6B2B]/[0.02] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-wait">
                    {uploading ? <><Loader2 size={14} className="animate-spin" /> Upload en cours...</> : <><Upload size={14} /> Importer un fichier</>}
                  </button>
                  <p className="text-[var(--text-muted)] text-[10px] mt-2">{availableFiles.length} fichier{availableFiles.length !== 1 ? 's' : ''} disponible{availableFiles.length !== 1 ? 's' : ''}</p>
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
                            : 'bg-[var(--bg-base)] border border-transparent hover:border-[#FF6B2B]/20 hover:bg-[var(--bg-card)]'
                        }`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          file.type === 'pdf' ? 'bg-red-500/10' : file.type === 'video' ? 'bg-purple-500/10' : 'bg-blue-500/10'
                        }`}>
                          <FileText size={16} className={
                            file.type === 'pdf' ? 'text-red-400' : file.type === 'video' ? 'text-purple-400' : 'text-blue-400'
                          } />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--text-primary)] text-sm font-medium truncate">{file.name}</p>
                          <p className="text-[var(--text-muted)] text-[10px] mt-0.5">{file.size}</p>
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
            <div className="p-4 space-y-3 border-b border-[var(--border-base)]/50">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un exercice..."
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl pl-9 pr-3 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 transition-all"
                  />
                </div>
                <button onClick={() => setShowFilters(!showFilters)}
                  className={`relative p-2.5 rounded-xl border transition-all ${
                    showFilters || activeFilterCount > 0
                      ? 'bg-[#FF6B2B]/10 border-[#FF6B2B]/30 text-[#FF6B2B]'
                      : 'bg-[var(--bg-base)] border-[var(--border-base)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                  title="Filtres avances">
                  <SlidersHorizontal size={14} />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF6B2B] text-white text-[9px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Filtres avances : Zone / Equipement / Muscle cible */}
              {showFilters && (
                <div className="rounded-xl border border-[var(--border-base)] bg-[var(--bg-base)]/50 p-3 space-y-2.5 animate-page-enter">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Filtres</p>
                    {activeFilterCount > 0 && (
                      <button onClick={clearFilters}
                        className="text-[10px] font-semibold text-[#FF6B2B] hover:underline flex items-center gap-1">
                        <RotateCcw size={10} />
                        Reinitialiser
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Zone du corps</label>
                    <select
                      value={bodyPartFilter}
                      onChange={e => setBodyPartFilter(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-base)] rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
                    >
                      <option value="">Toutes les zones</option>
                      {bodyParts.map(bp => (
                        <option key={bp} value={bp}>{translate(bp, BODY_PART_LABELS)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Equipement</label>
                    <select
                      value={equipmentFilter}
                      onChange={e => setEquipmentFilter(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-base)] rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
                    >
                      <option value="">Tous les equipements</option>
                      {equipments.map(eq => (
                        <option key={eq} value={eq}>{translate(eq, EQUIPMENT_LABELS)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Muscle cible</label>
                    <select
                      value={targetFilter}
                      onChange={e => setTargetFilter(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-base)] rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
                    >
                      <option value="">Tous les muscles</option>
                      {targets.map(t => (
                        <option key={t} value={t}>{translate(t, TARGET_LABELS)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-[var(--text-muted)] text-[10px]">
                  {filtered.length} exercice{filtered.length !== 1 ? 's' : ''}
                  {activeFilterCount > 0 && ' (filtres)'}
                </p>
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
                <div className="bg-[var(--bg-card)] border border-[#FF6B2B]/20 rounded-xl p-4 mb-3 space-y-3">
                  <p className="text-[var(--text-primary)] text-xs font-bold">Nouvel exercice personnalisé</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-base)]/50">
                      <span className="text-[var(--text-muted)] text-[11px] font-medium">Nom</span>
                      <input type="text" value={newExName} onChange={e => setNewExName(e.target.value)}
                        placeholder="Ex : Romanian deadlift" autoFocus
                        className="bg-transparent text-[var(--text-primary)] text-[11px] text-right border-none focus:outline-none placeholder:text-[var(--text-muted)] w-2/3" />
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-base)]/50">
                      <span className="text-[var(--text-muted)] text-[11px] font-medium">Muscle</span>
                      <select value={newExMuscle} onChange={e => setNewExMuscle(e.target.value)}
                        className="bg-transparent text-[var(--text-primary)] text-[11px] text-right border-none focus:outline-none appearance-none cursor-pointer">
                        <option value="">—</option>
                        {MUSCLE_GROUPS.filter(m => m !== 'Tous').map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[var(--text-muted)] text-[11px] font-medium">Équipement</span>
                      <input type="text" value={newExEquip} onChange={e => setNewExEquip(e.target.value)}
                        placeholder="Barre, Haltère..."
                        className="bg-transparent text-[var(--text-primary)] text-[11px] text-right border-none focus:outline-none placeholder:text-[var(--text-muted)] w-2/3" />
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
                  <Dumbbell size={24} className="text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-[var(--text-muted)] text-xs mb-3">Aucun exercice trouvé</p>
                  {searchQuery && !isCreatingExercise && (
                    <button onClick={() => { setIsCreatingExercise(true); setNewExName(searchQuery) }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#FF6B2B]/30 text-[#FF6B2B] text-[11px] font-semibold hover:bg-[#FF6B2B]/5 transition-all">
                      <Plus size={12} /> Créer "{searchQuery}"
                    </button>
                  )}
                </div>
              ) : (
                filtered.map(ex => {
                  const added = isInCanvas(ex)
                  return (
                    <button
                      key={`${ex.source}-${ex.id}`}
                      onClick={() => !added && addToCanvas(ex)}
                      disabled={added}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                        added
                          ? 'bg-[#FF6B2B]/5 border border-[#FF6B2B]/15 opacity-60'
                          : 'bg-[var(--bg-base)] border border-transparent hover:border-[#FF6B2B]/20 hover:bg-[var(--bg-card)]'
                      }`}
                    >
                      {/* Thumbnail: GIF si dispo, sinon icone */}
                      <div className="w-11 h-11 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center shrink-0 overflow-hidden">
                        {ex.gif_url ? (
                          <img
                            src={ex.gif_url}
                            alt={ex.nom}
                            loading="lazy"
                            className="w-full h-full object-cover"
                            onError={e => { e.currentTarget.style.display = 'none' }}
                          />
                        ) : (
                          <Dumbbell size={16} className="text-[var(--text-muted)]" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--text-primary)] text-sm font-medium truncate">{ex.nom}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {ex.muscle_group && (
                            <span className="text-[10px] text-[#FF6B2B]/70 font-medium capitalize">{ex.muscle_group}</span>
                          )}
                          {ex.equipment && (
                            <span className="text-[10px] text-[var(--text-muted)] capitalize">{ex.equipment}</span>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      {added ? (
                        <div className="w-6 h-6 rounded-full bg-[#FF6B2B]/20 flex items-center justify-center shrink-0">
                          <Check size={12} className="text-[#FF6B2B]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-[var(--border-base)] flex items-center justify-center shrink-0">
                          <Plus size={12} className="text-[var(--text-muted)]" />
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
          <div className="flex-1 flex flex-col bg-[var(--bg-base)]">

            {/* Canvas header */}
            <div className="px-5 py-3 border-b border-[var(--border-base)]/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell size={14} className="text-[#FF6B2B]" />
                <span className="text-[var(--text-primary)] text-sm font-semibold">{titre}</span>
                <span className="text-[var(--text-muted)] text-xs ml-1">
                  {canvas.length} exercice{canvas.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
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
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-[var(--border-base)] flex items-center justify-center mb-4 hover:border-[#FF6B2B]/30 transition-all">
                    <Plus size={28} className="text-[var(--text-muted)]" />
                  </div>
                  <p className="text-[var(--text-primary)] text-base font-semibold mb-1">Séance vide</p>
                  <p className="text-[var(--text-muted)] text-sm text-center max-w-xs leading-relaxed">
                    Cliquez sur un exercice à gauche pour commencer à construire votre séance
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {canvas.map((ex, idx) => {
                    const hasNote = !!(ex.note_coach && ex.note_coach.trim())
                    const isNoteOpen = openNoteKey === ex._key
                    return (
                    <div key={ex._key}
                      className="group rounded-xl bg-[var(--bg-base)] border border-[var(--border-base)]/50 hover:border-[var(--border-base)] transition-all overflow-hidden">

                      {/* Row principale */}
                      <div className="flex items-center gap-3 p-3">
                        {/* Drag handle + order */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <GripVertical size={14} className="text-[var(--text-muted)] cursor-grab" />
                          <span className="text-[#FF6B2B] text-xs font-bold w-5 text-center">{idx + 1}</span>
                        </div>

                        {/* Thumbnail */}
                        <div className="w-9 h-9 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center shrink-0 overflow-hidden">
                          {ex.gif_url ? (
                            <img
                              src={ex.gif_url}
                              alt={ex.nom}
                              loading="lazy"
                              className="w-full h-full object-cover"
                              onError={e => { e.currentTarget.style.display = 'none' }}
                            />
                          ) : (
                            <Dumbbell size={14} className="text-[var(--text-muted)]" />
                          )}
                        </div>

                        {/* Name + muscle */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--text-primary)] text-sm font-medium truncate">{ex.nom}</p>
                          <p className="text-[var(--text-muted)] text-[10px] mt-0.5 capitalize">{ex.muscle_group || ''}</p>
                        </div>

                        {/* Series / Reps / Repos inputs */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              value={ex.series}
                              onChange={e => updateExField(ex._key, 'series', parseInt(e.target.value) || 0)}
                              className="w-12 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg px-2 py-1.5 text-[var(--text-primary)] text-xs text-center font-semibold focus:outline-none focus:border-[#FF6B2B]/40 transition-all"
                            />
                            <span className="text-[var(--text-muted)] text-[8px] mt-0.5">séries</span>
                          </div>
                          <span className="text-[var(--text-muted)] text-xs">×</span>
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              value={ex.reps}
                              onChange={e => updateExField(ex._key, 'reps', parseInt(e.target.value) || 0)}
                              className="w-12 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg px-2 py-1.5 text-[var(--text-primary)] text-xs text-center font-semibold focus:outline-none focus:border-[#FF6B2B]/40 transition-all"
                            />
                            <span className="text-[var(--text-muted)] text-[8px] mt-0.5">reps</span>
                          </div>
                          <div className="flex flex-col items-center ml-1">
                            <div className="flex items-center">
                              <input
                                type="number"
                                value={ex.repos}
                                onChange={e => updateExField(ex._key, 'repos', parseInt(e.target.value) || 0)}
                                className="w-14 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg px-2 py-1.5 text-[var(--text-primary)] text-xs text-center font-semibold focus:outline-none focus:border-[#FF6B2B]/40 transition-all"
                              />
                            </div>
                            <span className="text-[var(--text-muted)] text-[8px] mt-0.5">repos (s)</span>
                          </div>
                        </div>

                        {/* Note button */}
                        <button
                          onClick={() => setOpenNoteKey(isNoteOpen ? null : ex._key)}
                          title={hasNote ? 'Modifier la note' : 'Ajouter une note'}
                          className={`p-1.5 rounded-lg transition-all shrink-0 ${
                            hasNote
                              ? 'text-[#FF6B2B] bg-[#FF6B2B]/10 hover:bg-[#FF6B2B]/20'
                              : 'text-[var(--text-muted)] hover:text-[#FF6B2B] hover:bg-[#FF6B2B]/10 opacity-0 group-hover:opacity-100'
                          } ${isNoteOpen ? 'bg-[#FF6B2B]/20 text-[#FF6B2B] opacity-100' : ''}`}>
                          <StickyNote size={14} />
                        </button>

                        {/* Delete */}
                        <button onClick={() => removeFromCanvas(ex._key)}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Note panel (expand) */}
                      {isNoteOpen && (
                        <div className="px-3 pb-3 border-t border-[var(--border-base)]/30 pt-3">
                          <div className="flex items-start gap-2 mb-1.5">
                            <StickyNote size={11} className="text-[#FF6B2B] mt-0.5" />
                            <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                              Consigne pour le client
                            </span>
                          </div>
                          <textarea
                            value={ex.note_coach || ''}
                            onChange={e => updateExField(ex._key, 'note_coach', e.target.value)}
                            placeholder="Ex: RPE 8, focus gainage, charge 80% 1RM, tempo 3-1-1, descente lente..."
                            rows={2}
                            autoFocus
                            className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-xs placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 transition-all resize-none"
                          />
                        </div>
                      )}

                      {/* Note preview (when closed but has content) */}
                      {!isNoteOpen && hasNote && (
                        <button
                          onClick={() => setOpenNoteKey(ex._key)}
                          className="w-full text-left px-3 pb-2.5 -mt-1 group/note"
                        >
                          <div className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-[#FF6B2B]/5 border border-[#FF6B2B]/15 hover:bg-[#FF6B2B]/10 transition-all">
                            <StickyNote size={10} className="text-[#FF6B2B] mt-0.5 shrink-0" />
                            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed truncate flex-1">
                              {ex.note_coach}
                            </p>
                          </div>
                        </button>
                      )}
                    </div>
                  )})}
                </div>
              )}
            </div>

            {/* Fichiers joints section */}
            {attachedFiles.length > 0 && (
              <div className="px-5 py-3 border-t border-[var(--border-base)]/50 shrink-0">
                <p className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Paperclip size={10} /> Fichiers joints ({attachedFiles.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {attachedFiles.map(file => (
                    <div key={file.id} onClick={() => handleOpenFile(file)}
                      className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-base)]/50 cursor-pointer hover:bg-[var(--bg-surface)] hover:border-[var(--border-base)] transition-all">
                      <FileText size={12} className={file.type === 'pdf' ? 'text-red-400' : file.type === 'video' ? 'text-purple-400' : 'text-blue-400'} />
                      <span className="text-[var(--text-primary)] text-[11px] font-medium">{file.name}</span>
                      <ExternalLink size={9} className="text-[var(--text-muted)] group-hover:text-[var(--text-muted)] transition-all" />
                      <button onClick={e => { e.stopPropagation(); removeFile(file.id) }}
                        className="p-0.5 rounded text-[var(--text-muted)] hover:text-red-400 transition-all opacity-0 group-hover:opacity-100">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Canvas footer */}
            <div className="px-5 py-4 border-t border-[var(--border-base)] flex items-center justify-between shrink-0">
              <div className="text-xs text-[var(--text-muted)]">
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
