import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import SessionEditorModal from './SessionEditorModal'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Save, Rocket,
  Plus, Dumbbell, Clock, Trash2, GripVertical, X, Loader2, Paperclip,
  Upload, FileText
} from 'lucide-react'

const DAYS = ['JOUR 1', 'JOUR 2', 'JOUR 3', 'JOUR 4', 'JOUR 5', 'JOUR 6', 'JOUR 7']

export default function ProgramBuilder({ programme, onBack }) {
  const { user } = useAuth()
  const toast = useToast()

  const [weekOffset, setWeekOffset] = useState(0)
  const totalWeeks = programme?.duree_semaines || 4
  const currentWeek = weekOffset + 1

  // Sessions data: { [dayIndex]: [{ id, titre, exercices: [] }] }
  const [sessions, setSessions] = useState({})

  // Session editor modal
  const [editingSession, setEditingSession] = useState(null)

  // Saving states
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)

  // Programme ID (set after first save)
  const [programmeId, setProgrammeId] = useState(programme?.id || null)
  const [loadingData, setLoadingData] = useState(false)

  // Global document attachment
  const [globalDoc, setGlobalDoc] = useState(null)       // { nom, url } — already saved in DB
  const [pendingFile, setPendingFile] = useState(null)    // File object waiting for save
  const [uploadingGlobal, setUploadingGlobal] = useState(false)

  // ── Load existing seances when opening a saved programme ──
  const loadProgrammeData = useCallback(async () => {
    if (!programmeId || !user) return
    const marker = `programme:${programmeId}`

    setLoadingData(true)
    console.log('[ProgramBuilder] Loading seances for marker:', marker)

    const { data: seancesData, error } = await supabase
      .from('seances')
      .select('*, seance_exercices(*, exercices(*))')
      .eq('coach_id', user.id)
      .eq('notes', marker)
      .eq('is_template', true)
      .order('date_prevue', { ascending: true })

    console.log('[ProgramBuilder] Séances récupérées avec fichiers:', seancesData)
    if (error) {
      console.error('[ProgramBuilder] Erreur load séances:', error)
      setLoadingData(false)
      return
    }

    if (!seancesData || seancesData.length === 0) {
      console.log('[ProgramBuilder] Aucune séance trouvée pour ce programme')
      setLoadingData(false)
      return
    }

    // Reconstruct sessions state from DB data
    const startDate = programme?.date_debut ? new Date(programme.date_debut) : new Date()
    const newSessions = {}

    seancesData.forEach(seance => {
      // Calculate which week/day this seance belongs to
      const seanceDate = new Date(seance.date_prevue)
      const diffDays = Math.round((seanceDate - startDate) / (1000 * 60 * 60 * 24))
      const dayNum = diffDays + 1 // 1-based
      const week = Math.ceil(dayNum / 7)
      const dayIdx = ((dayNum - 1) % 7)
      const key = `w${week}_d${dayIdx}`

      // Build exercices array from joined data
      const exercices = (seance.seance_exercices || [])
        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
        .map(se => ({
          id: se.exercice_id,
          nom: se.exercices?.nom || 'Exercice',
          muscle_group: se.exercices?.muscle_group || '',
          equipment: se.exercices?.equipment || '',
          gif_url: se.exercices?.gif_url || null,
          library_id: se.exercices?.library_id || null,
          _key: crypto.randomUUID(),
          series: se.series || 3,
          reps: se.reps || 10,
          repos: se.repos || 90,
          poids: se.poids || null,
          note_coach: se.note_coach || '',
        }))

      // Extract fichiers from metadata
      const fichiers = seance.metadata?.fichiers || []

      const sessionObj = {
        id: seance.id,
        titre: seance.titre,
        exercices,
        fichiers,
      }

      if (!newSessions[key]) newSessions[key] = []
      newSessions[key].push(sessionObj)
    })

    console.log('[ProgramBuilder] Sessions reconstruites:', newSessions)
    setSessions(newSessions)
    setSaved(true)
    setLoadingData(false)
  }, [programmeId, user, programme?.date_debut])

  useEffect(() => { loadProgrammeData() }, [loadProgrammeData])

  // Load existing global doc from programme
  useEffect(() => {
    if (programme?.document_url) {
      setGlobalDoc({ nom: programme.document_nom || 'Document', url: programme.document_url })
    }
  }, [programme?.document_url, programme?.document_nom])

  // ── Global file picker ──
  const triggerGlobalFileUpload = () => {
    if (uploadingGlobal) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx'
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (programmeId) {
        uploadGlobalDoc(file)
      } else {
        setPendingFile(file)
        setSaved(false)
        toast.success('Fichier prêt — sera uploadé à la sauvegarde')
      }
    }
    input.click()
  }

  // Upload global doc to Supabase Storage + update programmes row
  const uploadGlobalDoc = async (file, progId) => {
    const pid = progId || programmeId
    if (!pid) return null
    setUploadingGlobal(true)
    try {
      const filePath = `programme_docs/${pid}/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('program-files').upload(filePath, file)
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('program-files').getPublicUrl(filePath)

      const { error: dbErr } = await supabase.from('programmes').update({
        document_url: publicUrl,
        document_nom: file.name,
      }).eq('id', pid)
      if (dbErr) throw dbErr

      setGlobalDoc({ nom: file.name, url: publicUrl })
      setPendingFile(null)
      toast.success('Fichier joint au programme !')
      return publicUrl
    } catch (err) {
      console.error('[ProgramBuilder] Erreur upload doc global:', err)
      toast.error('Erreur upload : ' + (err.message || 'inconnu'))
      return null
    } finally {
      setUploadingGlobal(false)
    }
  }

  // Remove global doc
  const removeGlobalDoc = async () => {
    if (pendingFile) {
      setPendingFile(null)
      toast.success('Fichier en attente retiré')
      return
    }
    if (!programmeId || !globalDoc) return
    try {
      await supabase.from('programmes').update({
        document_url: null,
        document_nom: null,
      }).eq('id', programmeId)
      setGlobalDoc(null)
      toast.success('Fichier retiré')
    } catch (err) {
      toast.error('Erreur suppression')
    }
  }

  // Get sessions for current week + day
  const getKey = (dayIdx) => `w${currentWeek}_d${dayIdx}`
  const getDaySessions = (dayIdx) => sessions[getKey(dayIdx)] || []

  // Add empty session to a day
  const addSession = (dayIdx) => {
    const key = getKey(dayIdx)
    const current = sessions[key] || []
    setSessions(prev => ({
      ...prev,
      [key]: [...current, { id: crypto.randomUUID(), titre: `Jour ${dayIdx + 1}`, exercices: [] }],
    }))
    setSaved(false)
  }

  // Remove session
  const removeSession = (dayIdx, sessionIdx) => {
    const key = getKey(dayIdx)
    setSessions(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, i) => i !== sessionIdx),
    }))
    setSaved(false)
  }

  // Update session title
  const updateSessionTitle = (dayIdx, sessionIdx, titre) => {
    const key = getKey(dayIdx)
    setSessions(prev => ({
      ...prev,
      [key]: (prev[key] || []).map((s, i) => i === sessionIdx ? { ...s, titre } : s),
    }))
    setSaved(false)
  }

  // Open session editor
  const openSessionEditor = (dayIdx, sessionIdx) => {
    const key = getKey(dayIdx)
    const session = (sessions[key] || [])[sessionIdx]
    if (!session) return
    const dayNum = weekOffset * 7 + dayIdx + 1
    setEditingSession({ dayIdx, sessionIdx, session, dayLabel: `Jour ${dayNum}` })
  }

  // Save from session editor
  const handleSessionEditorSave = ({ titre, exercices, fichiers }) => {
    if (!editingSession) return
    const { dayIdx, sessionIdx } = editingSession
    const key = getKey(dayIdx)
    console.log('[ProgramBuilder] Session sauvegardée:', { titre, exercices: exercices?.length, fichiers: fichiers?.length })
    setSessions(prev => ({
      ...prev,
      [key]: (prev[key] || []).map((s, i) =>
        i === sessionIdx ? { ...s, titre, exercices, fichiers: fichiers || [] } : s
      ),
    }))
    setEditingSession(null)
    setSaved(false)
  }

  // ── Core save logic (shared by Save + Publish) ──
  const persistToSupabase = async () => {
    if (!user) throw new Error('Non authentifié')

    console.log('[ProgramBuilder] persistToSupabase START', { programmeId, userId: user.id, programme })

    // 1. Upsert programme — always works: insert if new, update if exists
    const upsertPayload = {
      coach_id: user.id,
      titre: programme?.titre || 'Nouveau programme',
      description: programme?.description || null,
      duree_semaines: totalWeeks,
      categorie: programme?.categorie || null,
      actif: true,
    }
    // Only include id if we already have a real DB id (not a frontend-generated one)
    if (programmeId) upsertPayload.id = programmeId

    console.log('[ProgramBuilder] UPSERT programmes:', upsertPayload)
    const { data: progData, error: progErr } = await supabase
      .from('programmes')
      .upsert(upsertPayload)
      .select()
      .single()

    if (progErr) {
      console.error('[ProgramBuilder] ERREUR UPSERT programmes:', progErr)
      throw progErr
    }

    const progId = progData.id
    console.log('[ProgramBuilder] Programme upserted OK, id:', progId)
    if (progId !== programmeId) setProgrammeId(progId)

    // Upload pending global doc if any
    if (pendingFile) {
      await uploadGlobalDoc(pendingFile, progId)
    }

    // 2. Delete existing seances for this programme (template seances)
    const marker = `programme:${progId}`
    console.log('[ProgramBuilder] DELETE anciennes séances, marker:', marker)
    const { error: delErr } = await supabase.from('seances').delete().eq('coach_id', user.id).eq('notes', marker).eq('is_template', true)
    if (delErr) console.error('[ProgramBuilder] ERREUR DELETE séances:', delErr)

    // 3. Flatten all sessions from all weeks/days and insert as template seances
    const allEntries = Object.entries(sessions)
    for (const [key, daySessions] of allEntries) {
      // Parse key: w{week}_d{dayIdx}
      const match = key.match(/w(\d+)_d(\d+)/)
      if (!match) continue
      const week = parseInt(match[1])
      const dayIdx = parseInt(match[2])
      const dayNum = (week - 1) * 7 + dayIdx + 1

      for (const session of daySessions) {
        if (!session.titre && session.exercices.length === 0) continue

        // Calculate target date from programme start
        const startDate = programme?.date_debut ? new Date(programme.date_debut) : new Date()
        const targetDate = new Date(startDate)
        targetDate.setDate(targetDate.getDate() + dayNum - 1)
        const dateStr = targetDate.toISOString().split('T')[0]

        // Insert seance (client_id may be nullable for templates)
        // Store fichiers in metadata JSONB column
        const fichiers = (session.fichiers || []).map(f => ({
          id: f.id, name: f.name, type: f.type, size: f.size,
          url: f.url || null, path: f.path || null,
        }))
        const seancePayload = {
          coach_id: user.id,
          titre: session.titre || `Jour ${dayNum}`,
          date_prevue: dateStr,
          notes: marker,
          is_template: true,
          metadata: fichiers.length > 0 ? { fichiers } : {},
        }
        if (programme?.client_id) seancePayload.client_id = programme.client_id

        console.log('[ProgramBuilder] INSERT séance:', seancePayload)
        const { data: seanceData, error: sErr } = await supabase.from('seances')
          .insert(seancePayload).select().single()

        if (sErr) {
          console.error('[ProgramBuilder] ERREUR INSERT séance:', sErr)
          continue
        }
        console.log('[ProgramBuilder] Séance créée:', seanceData?.id)

        // Insert exercises
        if (seanceData && session.exercices.length > 0) {
          const exRows = session.exercices.map((ex, idx) => ({
            seance_id: seanceData.id,
            exercice_id: ex.id,
            series: ex.series || 3,
            reps: ex.reps || 10,
            poids: ex.poids || null,
            repos: ex.repos || 90,
            ordre: idx,
            note_coach: ex.note_coach || null,
          }))
          console.log('[ProgramBuilder] INSERT exercices:', exRows.length, 'pour séance', seanceData.id)
          const { error: eErr } = await supabase.from('seance_exercices').insert(exRows)
          if (eErr) console.error('[ProgramBuilder] ERREUR INSERT exercices:', eErr)
        }
      }
    }

    return progId
  }

  // ── Save (brouillon) ──
  const handleSave = async () => {
    setSaving(true)
    try {
      await persistToSupabase()
      setSaved(true)
      toast.success('Programme sauvegardé !')
    } catch (err) {
      console.error('[ProgramBuilder] ERREUR CRITIQUE SAUVEGARDE:', err)
      toast.error('Erreur DB : ' + (err.message || err.details || err.hint || JSON.stringify(err)))
    } finally {
      setSaving(false)
    }
  }

  // ── Publish ──
  const handlePublish = async () => {
    setIsPublishing(true)
    try {
      const progId = await persistToSupabase()

      // Mark programme as published (actif = true)
      await supabase.from('programmes').update({ actif: true }).eq('id', progId)

      // If there's a client, check-then-insert assignation (avoids 409)
      console.log('[ProgramBuilder] client_id pour assignation:', programme?.client_id)
      if (programme?.client_id) {
        const { data: existingAssign } = await supabase
          .from('programme_assignations')
          .select('id')
          .eq('programme_id', progId)
          .eq('client_id', programme.client_id)
          .maybeSingle()

        if (!existingAssign) {
          console.log('[ProgramBuilder] INSERT assignation:', { progId, client_id: programme.client_id })
          const { error: assignErr } = await supabase.from('programme_assignations').insert({
            programme_id: progId,
            client_id: programme.client_id,
            coach_id: user.id,
            date_debut: programme.date_debut || new Date().toISOString().split('T')[0],
            phase_actuelle: 1,
            statut: 'en_cours',
          })
          if (assignErr) console.error('[ProgramBuilder] Erreur INSERT assignation:', assignErr)
        } else {
          console.log('[ProgramBuilder] Assignation déjà existante, skip')
        }
      }

      setSaved(true)
      toast.success('Programme publié avec succès ! 🚀')
      onBack()
    } catch (err) {
      console.error('[ProgramBuilder] ERREUR CRITIQUE PUBLICATION:', err)
      toast.error('Erreur DB : ' + (err.message || err.details || err.hint || JSON.stringify(err)))
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-screen">

      {/* ═══ Header ═══ */}
      <div className="px-4 md:px-6 py-4 border-b border-[var(--border-base)] bg-[var(--bg-base)] flex-shrink-0">
        <div className="flex items-center justify-between gap-4">

          {/* Left: Back + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all shrink-0">
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-[var(--text-primary)] text-lg font-bold truncate">{programme?.titre || 'Nouveau programme'}</h1>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-bold shrink-0">
                  {programme?.mode === 'modele' ? 'Modèle' : 'Client'}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Week navigation */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
              disabled={weekOffset === 0}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all disabled:opacity-20 disabled:cursor-not-allowed">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center min-w-[140px]">
              <p className="text-[var(--text-primary)] text-sm font-bold">Semaine {currentWeek} / {totalWeeks}</p>
              <p className="text-[var(--text-muted)] text-[10px]">Dates indicatives uniquement</p>
            </div>
            <button onClick={() => setWeekOffset(prev => Math.min(totalWeeks - 1, prev + 1))}
              disabled={weekOffset >= totalWeeks - 1}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all disabled:opacity-20 disabled:cursor-not-allowed">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Right: Attach + Save + Publish */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Global doc attach button */}
            <button onClick={triggerGlobalFileUpload} disabled={uploadingGlobal}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                uploadingGlobal
                  ? 'bg-[var(--bg-surface)] text-[var(--text-muted)] cursor-wait'
                  : globalDoc || pendingFile
                    ? 'bg-[#FF6B2B]/10 text-[#FF6B2B] hover:bg-[#FF6B2B]/20 border border-[#FF6B2B]/20'
                    : 'bg-[#FF6B2B]/10 text-[#FF6B2B] hover:bg-[#FF6B2B]/20'
              }`}
              title="Joindre un PDF/fichier global au programme">
              {uploadingGlobal ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploadingGlobal ? 'Upload...' : 'Joindre PDF'}
            </button>
            <button onClick={handleSave} disabled={saving || saved}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                saved
                  ? 'bg-[var(--bg-base)] text-[var(--text-muted)] cursor-default'
                  : 'bg-[var(--bg-base)] border border-[var(--border-base)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-surface)]'
              }`}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Sauvegarde...' : saved ? '● Sauvegardé' : 'Sauvegarder'}
            </button>
            <button onClick={handlePublish} disabled={isPublishing}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-lg shadow-[#FF6B2B]/20 disabled:opacity-50 disabled:cursor-not-allowed">
              {isPublishing ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
              {isPublishing ? 'Publication...' : 'Publier'}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Global attached file banner ═══ */}
      {(globalDoc || pendingFile) && (
        <div className="px-4 md:px-6 py-2.5 border-b border-[var(--border-base)] bg-[var(--bg-card)]/50">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              pendingFile ? 'bg-[#FF6B2B]/10' : 'bg-[#FF6B2B]/10'
            }`}>
              <FileText size={16} className={pendingFile ? 'text-[#FF6B2B]' : 'text-[#FF6B2B]'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-primary)] text-xs font-semibold truncate">
                {pendingFile ? pendingFile.name : globalDoc?.nom}
              </p>
              <p className="text-[var(--text-muted)] text-[10px]">
                {pendingFile
                  ? '⏳ En attente — sera uploadé à la sauvegarde'
                  : '✓ Fichier global joint au programme'}
              </p>
            </div>
            {globalDoc?.url && (
              <a href={globalDoc.url} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#FF6B2B] hover:bg-[#FF6B2B]/10 transition-all shrink-0"
                title="Voir le fichier">
                <FileText size={14} />
              </a>
            )}
            <button onClick={removeGlobalDoc}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
              title="Retirer le fichier">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loadingData && (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-[#FF6B2B]" size={20} />
          <span className="text-[var(--text-muted)] text-sm">Chargement des séances...</span>
        </div>
      )}

      {/* ═══ Grid — 7 days ═══ */}
      <div className="flex-1 overflow-x-auto px-4 md:px-6 py-5">
        <div className="grid grid-cols-7 gap-px bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl overflow-hidden min-w-[900px]">

          {/* Column headers */}
          {DAYS.map((day, i) => (
            <div key={i} className="bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-bold text-center py-3 uppercase tracking-wider">
              {day}
            </div>
          ))}

          {/* Day columns */}
          {DAYS.map((_, dayIdx) => {
            const daySessions = getDaySessions(dayIdx)
            return (
              <div key={dayIdx} className="bg-[var(--bg-base)] p-2 flex flex-col gap-2" style={{ minHeight: '60vh' }}>

                {/* Day number label */}
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-[#FF6B2B] text-xs font-bold">
                    Jour {weekOffset * 7 + dayIdx + 1}
                  </span>
                </div>

                {/* Sessions in this day */}
                {daySessions.map((session, sIdx) => (
                  <div key={session.id}
                    onClick={() => openSessionEditor(dayIdx, sIdx)}
                    className="bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl p-3 group hover:border-[#FF6B2B]/20 transition-all cursor-pointer">
                    {/* Session title */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <GripVertical size={12} className="text-[var(--text-muted)] shrink-0 cursor-grab" />
                      <input type="text" value={session.titre}
                        onClick={e => e.stopPropagation()}
                        onChange={e => updateSessionTitle(dayIdx, sIdx, e.target.value)}
                        className="flex-1 bg-transparent text-[var(--text-primary)] text-xs font-semibold border-none focus:outline-none placeholder:text-[var(--text-muted)] min-w-0"
                        placeholder="Nom de la séance" />
                      <button onClick={e => { e.stopPropagation(); removeSession(dayIdx, sIdx) }}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0">
                        <Trash2 size={11} />
                      </button>
                    </div>

                    {/* Exercises list */}
                    {session.exercices.length === 0 ? (
                      <div className="border border-dashed border-[var(--border-base)] rounded-lg p-3 flex items-center justify-center text-[var(--text-muted)] text-[10px] italic hover:border-[#FF6B2B]/30 hover:text-[#FF6B2B]/40 transition-all cursor-pointer">
                        <Plus size={12} className="mr-1" /> Ajouter des exercices
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {session.exercices.map((ex, eIdx) => (
                          <div key={eIdx} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--bg-base)] text-xs">
                            <span className="text-[var(--text-muted)] text-[9px] font-mono w-4">{eIdx + 1}.</span>
                            <span className="text-[var(--text-primary)] text-[11px] truncate flex-1">{ex.nom}</span>
                            <span className="text-[var(--text-muted)] text-[9px] shrink-0">{ex.series}×{ex.reps}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Fichiers badge */}
                    {session.fichiers?.length > 0 && (
                      <div className="mt-1.5 flex items-center gap-1 text-[var(--text-muted)] text-[9px]">
                        <Paperclip size={9} />
                        <span>{session.fichiers.length} fichier{session.fichiers.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Empty state / Add session button */}
                <button onClick={() => addSession(dayIdx)}
                  className="group/add flex-1 min-h-[80px] border border-dashed border-[var(--border-base)] rounded-xl flex flex-col items-center justify-center text-[var(--text-muted)] transition-all hover:border-[#FF6B2B]/30 hover:text-[#FF6B2B]/50 hover:bg-[#FF6B2B]/[0.02] cursor-pointer">
                  <div className="w-8 h-8 rounded-full border border-dashed border-current flex items-center justify-center mb-1.5 group-hover/add:border-[#FF6B2B]/30 transition-all">
                    <Plus size={14} />
                  </div>
                  <span className="text-[10px] italic">Séance vide</span>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Session Editor Modal */}
      {editingSession && (
        <SessionEditorModal
          session={editingSession.session}
          dayLabel={editingSession.dayLabel}
          onSave={handleSessionEditorSave}
          onClose={() => setEditingSession(null)}
        />
      )}
    </div>
  )
}
