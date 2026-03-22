import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { Modal } from '../../components/ui/Modal'
import {
  Plus, Search, GripVertical, MoreHorizontal, Euro,
  LayoutGrid, List, Phone, Mail, Loader2, Trash2, X, User
} from 'lucide-react'

// ── Colonnes Kanban ──
const COLUMNS = [
  { id: 'contact', label: 'Premier contact', color: '#71717a', dotClass: 'bg-zinc-500' },
  { id: 'appel', label: 'Appel découverte', color: '#3b82f6', dotClass: 'bg-blue-500' },
  { id: 'proposition', label: 'Proposition', color: '#FF6B2B', dotClass: 'bg-[#FF6B2B]' },
  { id: 'closing', label: 'Closing', color: '#22c55e', dotClass: 'bg-green-500' },
]

// ══════════════════════════════════════
// CARTE PROSPECT (Draggable)
// ══════════════════════════════════════
function ProspectCard({ prospect, onDragStart, onDelete }) {
  const fullName = [prospect.prenom, prospect.nom].filter(Boolean).join(' ')
  const initials = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', prospect.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(prospect.id)
      }}
      className="bg-[#18181b] border border-[#27272a] rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-[#3f3f46] transition-all group"
    >
      <div className="flex items-start gap-2.5">
        {/* Grip handle */}
        <GripVertical size={14} className="text-white/10 group-hover:text-white/25 mt-0.5 flex-shrink-0 transition-colors" />

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
          <span className="text-[#FF6B2B] text-[10px] font-bold">{initials}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[#F5F5F3] text-sm font-medium truncate">{fullName}</p>
          {prospect.email && (
            <p className="text-white/25 text-[11px] truncate mt-0.5">{prospect.email}</p>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(prospect.id) }}
          className="p-1 rounded text-white/0 group-hover:text-white/20 hover:!text-red-400 transition-colors flex-shrink-0"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Valeur */}
      {prospect.valeur_estimee > 0 && (
        <div className="mt-2 ml-[38px] flex items-center gap-1">
          <Euro size={11} className="text-[#FF6B2B]" />
          <span className="text-[#FF6B2B] text-xs font-semibold">{prospect.valeur_estimee} €</span>
        </div>
      )}

      {/* Notes preview */}
      {prospect.notes && (
        <p className="mt-1.5 ml-[38px] text-white/20 text-[11px] line-clamp-1">{prospect.notes}</p>
      )}
    </div>
  )
}

// ══════════════════════════════════════
// COLONNE KANBAN (Drop zone)
// ══════════════════════════════════════
function KanbanColumn({ column, prospects, onDrop, onNewClick, onDragStart, onDelete }) {
  const [dragOver, setDragOver] = useState(false)

  const total = prospects.reduce((s, p) => s + (p.valeur_estimee || 0), 0)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(true)
  }

  return (
    <div
      className="flex flex-col min-h-[400px]"
      onDragOver={handleDragOver}
      onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={(e) => {
        // Only set false if we're leaving the column entirely
        if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const prospectId = e.dataTransfer.getData('text/plain')
        if (prospectId) onDrop(prospectId, column.id)
      }}
    >
      {/* En-tête colonne */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${column.dotClass}`} />
          <span className="text-[#F5F5F3] text-sm font-semibold">{column.label}</span>
          <span className="text-white/30 text-xs bg-[#27272a] px-1.5 py-0.5 rounded-md font-medium">
            {prospects.length}
          </span>
        </div>
        {total > 0 && (
          <span className="text-white/30 text-xs">{total} €</span>
        )}
      </div>

      {/* Bouton ajouter */}
      <button
        onClick={() => onNewClick(column.id)}
        className="w-full py-2 mb-2 rounded-lg border border-dashed border-[#3f3f46] text-white/30 text-xs hover:text-[#FF6B2B] hover:border-[#FF6B2B] transition-colors flex items-center justify-center gap-1.5"
      >
        <Plus size={13} />
        Nouveau prospect
      </button>

      {/* Zone de drop */}
      <div className={`flex-1 space-y-2 rounded-lg p-1 transition-colors ${
        dragOver ? 'bg-[#FF6B2B]/5 ring-1 ring-[#FF6B2B]/20' : ''
      }`}>
        {prospects.map((p) => (
          <ProspectCard
            key={p.id}
            prospect={p}
            onDragStart={onDragStart}
            onDelete={onDelete}
          />
        ))}

        {/* Placeholder quand colonne vide */}
        {prospects.length === 0 && !dragOver && (
          <div className="py-8 text-center">
            <p className="text-white/10 text-xs">Aucun prospect</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════
export default function CoachProspectsPage() {
  const { user } = useAuth()
  const toast = useToast()

  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('kanban') // kanban | list
  const [draggingId, setDraggingId] = useState(null)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [modalStatut, setModalStatut] = useState('contact')
  const [formPrenom, setFormPrenom] = useState('')
  const [formNom, setFormNom] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formTelephone, setFormTelephone] = useState('')
  const [formValeur, setFormValeur] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // ── Chargement ──
  const charger = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('prospects')
      .select('*')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
    setProspects(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { charger() }, [charger])

  // ── Drag & Drop ──
  const handleDrop = async (prospectId, newStatut) => {
    const prospect = prospects.find(p => p.id === prospectId)
    if (!prospect || prospect.statut === newStatut) {
      setDraggingId(null)
      return
    }

    // Optimistic update
    setProspects(prev =>
      prev.map(p => p.id === prospectId ? { ...p, statut: newStatut } : p)
    )
    setDraggingId(null)

    const { error } = await supabase
      .from('prospects')
      .update({ statut: newStatut })
      .eq('id', prospectId)

    if (error) {
      console.error('Erreur déplacement prospect:', error)
      toast.error('Erreur lors du deplacement.')
      charger() // Rollback
    } else {
      const colLabel = COLUMNS.find(c => c.id === newStatut)?.label
      toast.success(`Prospect deplace vers "${colLabel}"`)
    }
  }

  // ── Ajout ──
  const handleAdd = async (e) => {
    e.preventDefault()
    if (!formPrenom.trim()) return
    setSaving(true)

    const { data, error } = await supabase
      .from('prospects')
      .insert({
        coach_id: user.id,
        prenom: formPrenom.trim(),
        nom: formNom.trim() || null,
        email: formEmail.trim() || null,
        telephone: formTelephone.trim() || null,
        valeur_estimee: parseInt(formValeur) || 0,
        notes: formNotes.trim() || null,
        statut: modalStatut,
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur ajout prospect:', error)
      toast.error('Erreur lors de l\'ajout.')
    } else if (data) {
      setProspects(prev => [data, ...prev])
      toast.success(`${formPrenom} ajoute au pipeline !`)
      resetForm()
      setModalOpen(false)
    }
    setSaving(false)
  }

  // ── Suppression ──
  const handleDelete = async (id) => {
    setProspects(prev => prev.filter(p => p.id !== id))
    const { error } = await supabase.from('prospects').delete().eq('id', id)
    if (error) {
      toast.error('Erreur lors de la suppression.')
      charger()
    }
  }

  const resetForm = () => {
    setFormPrenom('')
    setFormNom('')
    setFormEmail('')
    setFormTelephone('')
    setFormValeur('')
    setFormNotes('')
  }

  const openNewModal = (statut = 'contact') => {
    resetForm()
    setModalStatut(statut)
    setModalOpen(true)
  }

  // Filtrage
  const filteredProspects = searchQuery.trim()
    ? prospects.filter(p => {
        const q = searchQuery.toLowerCase()
        return (
          p.prenom?.toLowerCase().includes(q) ||
          p.nom?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q)
        )
      })
    : prospects

  // Stats
  const totalPipeline = prospects.reduce((s, p) => s + (p.valeur_estimee || 0), 0)

  if (loading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-8 w-48 bg-[#27272a] rounded-lg" />
        <div className="h-4 w-72 bg-[#27272a] rounded" />
        <div className="grid grid-cols-4 gap-4 mt-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-[#27272a] rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 w-full">

      {/* ── En-tête ── */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[#F5F5F3] text-2xl font-bold">Vos prospects</h1>
          <p className="text-[#a1a1aa] text-sm mt-1">
            Gérez votre pipeline de vente et convertissez vos leads en clients.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Stats badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#27272a]/60 border border-[#27272a]">
            <span className="text-white/30 text-xs">{prospects.length} prospect{prospects.length !== 1 ? 's' : ''}</span>
            <span className="text-white/10">·</span>
            <span className="text-[#FF6B2B] text-xs font-semibold">{totalPipeline} €</span>
          </div>
          {/* Bouton ajouter */}
          <button
            onClick={() => openNewModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors"
          >
            <Plus size={15} />
            Ajouter
          </button>
        </div>
      </div>

      {/* ── Barre outils ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Toggle Vue */}
        <div className="flex bg-[#18181b] border border-[#27272a] rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
              viewMode === 'kanban' ? 'bg-[#27272a] text-[#F5F5F3]' : 'text-white/30 hover:text-white/50'
            }`}
          >
            <LayoutGrid size={13} />
            Tableau
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
              viewMode === 'list' ? 'bg-[#27272a] text-[#F5F5F3]' : 'text-white/30 hover:text-white/50'
            }`}
          >
            <List size={13} />
            Liste
          </button>
        </div>

        {/* Recherche */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un prospect..."
            className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-9 pr-4 py-2 text-sm text-[#F5F5F3] placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
          />
        </div>
      </div>

      {/* ── Kanban Board ── */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              prospects={filteredProspects.filter(p => p.statut === col.id)}
              onDrop={handleDrop}
              onNewClick={openNewModal}
              onDragStart={setDraggingId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        /* ── Vue Liste ── */
        <div className="space-y-1.5">
          {/* Header */}
          <div className="grid grid-cols-12 gap-3 px-3 py-2 text-[10px] uppercase tracking-wider text-white/20 font-semibold">
            <div className="col-span-4">Prospect</div>
            <div className="col-span-2">Email</div>
            <div className="col-span-2">Statut</div>
            <div className="col-span-2">Valeur</div>
            <div className="col-span-2">Date</div>
          </div>

          {filteredProspects.length === 0 ? (
            <div className="py-12 text-center">
              <User size={32} className="text-white/10 mx-auto mb-3" />
              <p className="text-white/20 text-sm">Aucun prospect trouvé</p>
            </div>
          ) : (
            filteredProspects.map((p) => {
              const col = COLUMNS.find(c => c.id === p.statut)
              return (
                <div key={p.id} className="grid grid-cols-12 gap-3 items-center px-3 py-2.5 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] transition-colors group">
                  <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#FF6B2B] text-[9px] font-bold">
                        {[p.prenom?.[0], p.nom?.[0]].filter(Boolean).join('').toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[#F5F5F3] text-sm font-medium truncate">
                      {[p.prenom, p.nom].filter(Boolean).join(' ')}
                    </span>
                  </div>
                  <div className="col-span-2 text-white/30 text-xs truncate">{p.email || '—'}</div>
                  <div className="col-span-2">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full ${col?.dotClass}`} />
                      <span className="text-white/40">{col?.label}</span>
                    </span>
                  </div>
                  <div className="col-span-2 text-[#FF6B2B] text-xs font-semibold">
                    {p.valeur_estimee > 0 ? `${p.valeur_estimee} €` : '—'}
                  </div>
                  <div className="col-span-2 flex items-center justify-between">
                    <span className="text-white/20 text-xs">
                      {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1 rounded text-transparent group-hover:text-white/20 hover:!text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* MODAL AJOUT PROSPECT                  */}
      {/* ══════════════════════════════════════ */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau prospect">
        <form onSubmit={handleAdd} className="space-y-4">
          {/* Prénom */}
          <div>
            <label className="block text-sm text-white/50 mb-1.5 font-medium">Prénom *</label>
            <input
              type="text"
              value={formPrenom}
              onChange={(e) => setFormPrenom(e.target.value)}
              placeholder="Prénom du prospect"
              autoFocus
              required
              className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors"
            />
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm text-white/50 mb-1.5 font-medium">Nom</label>
            <input
              type="text"
              value={formNom}
              onChange={(e) => setFormNom(e.target.value)}
              placeholder="Nom de famille"
              className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors"
            />
          </div>

          {/* Email + Téléphone en row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/50 mb-1.5 font-medium">Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@exemple.com"
                className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1.5 font-medium">Téléphone</label>
              <input
                type="tel"
                value={formTelephone}
                onChange={(e) => setFormTelephone(e.target.value)}
                placeholder="+33 6..."
                className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors"
              />
            </div>
          </div>

          {/* Valeur + Statut en row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/50 mb-1.5 font-medium">Valeur estimée (€)</label>
              <div className="relative">
                <Euro size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                <input
                  type="number"
                  value={formValeur}
                  onChange={(e) => setFormValeur(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl pl-9 pr-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1.5 font-medium">Statut de départ</label>
              <select
                value={modalStatut}
                onChange={(e) => setModalStatut(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B] transition-colors"
              >
                {COLUMNS.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-white/50 mb-1.5 font-medium">Notes</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Notes sur ce prospect..."
              rows={2}
              className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/60 bg-[#27272a] hover:bg-[#3f3f46] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !formPrenom.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40"
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Plus size={15} />
              )}
              {saving ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
