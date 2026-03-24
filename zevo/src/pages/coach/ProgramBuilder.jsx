import { useState } from 'react'
import SessionEditorModal from './SessionEditorModal'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Save, Rocket,
  Plus, Dumbbell, Clock, Trash2, GripVertical, X, Loader2
} from 'lucide-react'

const DAYS = ['JOUR 1', 'JOUR 2', 'JOUR 3', 'JOUR 4', 'JOUR 5', 'JOUR 6', 'JOUR 7']

export default function ProgramBuilder({ programme, onBack }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const totalWeeks = programme?.duree_semaines || 4
  const currentWeek = weekOffset + 1

  // Sessions data: { [dayIndex]: [{ id, titre, exercices: [] }] }
  const [sessions, setSessions] = useState({})

  // Session editor modal
  const [editingSession, setEditingSession] = useState(null) // { dayIdx, sessionIdx, session, dayLabel }

  // Saving state
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(true)

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
  const handleSessionEditorSave = ({ titre, exercices }) => {
    if (!editingSession) return
    const { dayIdx, sessionIdx } = editingSession
    const key = getKey(dayIdx)
    setSessions(prev => ({
      ...prev,
      [key]: (prev[key] || []).map((s, i) =>
        i === sessionIdx ? { ...s, titre, exercices } : s
      ),
    }))
    setEditingSession(null)
    setSaved(false)
  }

  // Save handler
  const handleSave = async () => {
    setSaving(true)
    // TODO: real Supabase save
    await new Promise(r => setTimeout(r, 600))
    setSaved(true)
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-full min-h-screen">

      {/* ═══ Header ═══ */}
      <div className="px-4 md:px-6 py-4 border-b border-[#27272a] bg-[#0D0D0D] flex-shrink-0">
        <div className="flex items-center justify-between gap-4">

          {/* Left: Back + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack}
              className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.06] transition-all shrink-0">
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-[#F5F5F3] text-lg font-bold truncate">{programme?.titre || 'Nouveau programme'}</h1>
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
              className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-20 disabled:cursor-not-allowed">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center min-w-[140px]">
              <p className="text-[#F5F5F3] text-sm font-bold">Semaine {currentWeek} / {totalWeeks}</p>
              <p className="text-white/20 text-[10px]">Dates indicatives uniquement</p>
            </div>
            <button onClick={() => setWeekOffset(prev => Math.min(totalWeeks - 1, prev + 1))}
              disabled={weekOffset >= totalWeeks - 1}
              className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-20 disabled:cursor-not-allowed">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Right: Save + Publish */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button onClick={handleSave} disabled={saving || saved}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                saved
                  ? 'bg-[#18181b] text-white/25 cursor-default'
                  : 'bg-[#18181b] border border-[#27272a] text-white/50 hover:text-white hover:bg-[#27272a]'
              }`}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Sauvegarde...' : saved ? '● Sauvegardé' : 'Sauvegarder'}
            </button>
            <button className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-lg shadow-[#FF6B2B]/20">
              <Rocket size={14} /> Publier
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Grid — 7 days ═══ */}
      <div className="flex-1 overflow-x-auto px-4 md:px-6 py-5">
        <div className="grid grid-cols-7 gap-px bg-[#27272a] border border-[#27272a] rounded-xl overflow-hidden min-w-[900px]">

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
              <div key={dayIdx} className="bg-[#0D0D0D] p-2 flex flex-col gap-2" style={{ minHeight: '60vh' }}>

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
                    className="bg-[#1E1E1E] border border-white/[0.06] rounded-xl p-3 group hover:border-[#FF6B2B]/20 transition-all cursor-pointer">
                    {/* Session title */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <GripVertical size={12} className="text-white/10 shrink-0 cursor-grab" />
                      <input type="text" value={session.titre}
                        onClick={e => e.stopPropagation()}
                        onChange={e => updateSessionTitle(dayIdx, sIdx, e.target.value)}
                        className="flex-1 bg-transparent text-[#F5F5F3] text-xs font-semibold border-none focus:outline-none placeholder:text-white/20 min-w-0"
                        placeholder="Nom de la séance" />
                      <button onClick={e => { e.stopPropagation(); removeSession(dayIdx, sIdx) }}
                        className="p-1 rounded text-white/10 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0">
                        <Trash2 size={11} />
                      </button>
                    </div>

                    {/* Exercises list */}
                    {session.exercices.length === 0 ? (
                      <div className="border border-dashed border-[#27272a] rounded-lg p-3 flex items-center justify-center text-white/15 text-[10px] italic hover:border-[#FF6B2B]/30 hover:text-[#FF6B2B]/40 transition-all cursor-pointer">
                        <Plus size={12} className="mr-1" /> Ajouter des exercices
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {session.exercices.map((ex, eIdx) => (
                          <div key={eIdx} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#0D0D0D] text-xs">
                            <span className="text-white/20 text-[9px] font-mono w-4">{eIdx + 1}.</span>
                            <span className="text-[#F5F5F3] text-[11px] truncate flex-1">{ex.nom}</span>
                            <span className="text-white/15 text-[9px] shrink-0">{ex.series}×{ex.reps}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Empty state / Add session button */}
                <button onClick={() => addSession(dayIdx)}
                  className="group/add flex-1 min-h-[80px] border border-dashed border-[#27272a] rounded-xl flex flex-col items-center justify-center text-white/10 transition-all hover:border-[#FF6B2B]/30 hover:text-[#FF6B2B]/50 hover:bg-[#FF6B2B]/[0.02] cursor-pointer">
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
