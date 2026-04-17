import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { Modal } from '../../components/ui/Modal'
import {
  Plus, Search, GripVertical, MoreHorizontal, Euro,
  LayoutGrid, List, Phone, Mail, Loader2, Trash2, X, User,
  Users, TrendingUp
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
function ProspectCard({ prospect, onDragStart, onDelete, columnColor }) {
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
      className="hero-card group cursor-grab active:cursor-grabbing transition-all hover:border-[var(--border-subtle)]"
      style={{ borderLeft: `3px solid ${columnColor}` }}
    >
      <div className="p-3 flex items-start gap-2.5">
        {/* Grip handle */}
        <div className="p-2 -m-2 flex-shrink-0 touch-manipulation">
          <GripVertical size={14} className="text-[var(--text-muted)] mt-0.5 transition-colors" />
        </div>

        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#FF6B2B' }}
        >
          <span className="text-white text-[10px] font-bold tracking-wide">{initials}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[var(--text-primary)] text-sm font-medium truncate">{fullName}</p>
          {prospect.email && (
            <p className="text-[var(--text-muted)] text-[11px] truncate mt-0.5">{prospect.email}</p>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(prospect.id) }}
          className="p-2 -m-1 rounded-lg md:opacity-0 md:group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-all flex-shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Valeur */}
      {prospect.valeur_estimee > 0 && (
        <div className="px-3 pb-2 ml-[52px] flex items-center gap-1">
          <Euro size={11} className="text-[#FF6B2B]" />
          <span className="text-[#FF6B2B] text-xs font-semibold">{prospect.valeur_estimee} €</span>
        </div>
      )}

      {/* Notes preview */}
      {prospect.notes && (
        <p className="px-3 pb-2.5 ml-[52px] text-[var(--text-muted)] text-[11px] line-clamp-1">{prospect.notes}</p>
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
      className="flex flex-col min-h-[300px] md:min-h-[400px]"
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
      <div className="hero-card mb-3">
        <div className="h-[3px] rounded-t-xl" style={{ background: column.color }} />
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${column.dotClass}`} />
            <span className="text-[var(--text-primary)] text-sm font-semibold">{column.label}</span>
            <span className="text-[var(--text-muted)] text-[11px] bg-[var(--bg-surface)] px-2 py-0.5 rounded-md font-medium">
              {prospects.length}
            </span>
          </div>
          {total > 0 && (
            <span className="text-[var(--text-muted)] text-xs font-medium">{total} €</span>
          )}
        </div>
      </div>

      {/* Bouton ajouter */}
      <button
        onClick={() => onNewClick(column.id)}
        className="w-full py-2.5 mb-2.5 rounded-xl border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] text-xs hover:text-[#FF6B2B] hover:border-[#FF6B2B] transition-colors flex items-center justify-center gap-1.5 p-2"
      >
        <Plus size={13} />
        Nouveau prospect
      </button>

      {/* Zone de drop */}
      <div className={`flex-1 space-y-2 rounded-xl p-1.5 transition-all ${
        dragOver ? 'bg-[#FF6B2B]/5 ring-1 ring-[#FF6B2B]/20' : ''
      }`}>
        {prospects.map((p) => (
          <ProspectCard
            key={p.id}
            prospect={p}
            onDragStart={onDragStart}
            onDelete={onDelete}
            columnColor={column.color}
          />
        ))}

        {/* Placeholder quand colonne vide */}
        {prospects.length === 0 && !dragOver && (
          <div className="py-10 text-center hero-card">
            <User size={24} className="text-[var(--text-muted)] mx-auto mb-2 animate-breathe" />
            <p className="text-[var(--text-muted)] text-xs">Aucun prospect</p>
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

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="hero-card p-4">
          <div className="h-[3px] rounded-t-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] -mx-4 -mt-4 mb-4 rounded-t-xl" />
          <div className="skel-block h-7 w-44 rounded-lg mb-2" />
          <div className="skel-block h-4 w-64 rounded" />
        </div>
        <div className="hero-card p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="skel-block h-10 w-36 rounded-lg" />
            <div className="skel-block h-10 flex-1 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <div className="hero-card p-3">
                <div className="skel-block h-4 w-28 rounded mb-1" />
              </div>
              <div className="hero-card p-3 space-y-2">
                <div className="skel-block h-16 rounded-lg" />
                <div className="skel-block h-16 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 w-full">

      {/* ── En-tête ── */}
      <div className="hero-card hero-card--accent p-4 md:p-5 mb-4 md:mb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users size={18} className="text-[var(--text-muted)] flex-shrink-0" strokeWidth={1.75} />
            <div>
              <h1 className="text-[var(--text-primary)] text-xl md:text-2xl font-bold tracking-tight leading-tight">Vos prospects</h1>
              <p className="text-[var(--text-muted)] text-xs md:text-sm mt-0.5">
                Gérez votre pipeline et convertissez vos leads en clients.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)]">
              <span className="text-[var(--text-muted)] text-[11px] font-semibold">
                <span className="text-[var(--text-primary)] tabular-nums">{prospects.length}</span> prospect{prospects.length !== 1 ? 's' : ''}
              </span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="text-[#FF6B2B] text-[11px] font-bold tabular-nums">{totalPipeline} €</span>
            </div>
            <button
              onClick={() => openNewModal()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B2B] hover:bg-[#FF6B2B]/90 text-white text-sm font-semibold transition-all active:scale-95"
            >
              <Plus size={15} />
              Ajouter
            </button>
          </div>
        </div>
      </div>

      {/* ── Barre outils ── */}
      <div className="hero-card p-3 mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Toggle Vue */}
          <div className="flex bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl overflow-hidden flex-shrink-0">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium transition-colors p-2 ${
                viewMode === 'kanban' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <LayoutGrid size={14} />
              Tableau
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium transition-colors p-2 ${
                viewMode === 'list' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <List size={14} />
              Liste
            </button>
          </div>

          {/* Recherche */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un prospect..."
              className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ── Kanban Board ── */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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
        <div className="hero-card overflow-hidden">
          {/* Accent bar */}
          <div
            className="h-[3px]"
            style={{ background: 'var(--metric-highlight)' }}
          />

          {/* Header - hidden on mobile */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold border-b border-[var(--border-base)]">
            <div className="col-span-4">Prospect</div>
            <div className="col-span-2">Email</div>
            <div className="col-span-2">Statut</div>
            <div className="col-span-2">Valeur</div>
            <div className="col-span-2">Date</div>
          </div>

          {filteredProspects.length === 0 ? (
            <div className="py-16 text-center">
              <User size={32} className="text-[var(--text-muted)] mx-auto mb-3 animate-breathe" />
              <p className="text-[var(--text-muted)] text-sm">Aucun prospect trouvé</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-base)]">
              {filteredProspects.map((p) => {
                const col = COLUMNS.find(c => c.id === p.statut)
                return (
                  <div key={p.id} className="group transition-colors hover:bg-[var(--bg-surface)]/40">
                    {/* Desktop row */}
                    <div className="hidden md:grid grid-cols-12 gap-3 items-center px-4 py-3">
                      <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: '#FF6B2B' }}
                        >
                          <span className="text-white text-[9px] font-bold">
                            {[p.prenom?.[0], p.nom?.[0]].filter(Boolean).join('').toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[var(--text-primary)] text-sm font-medium truncate">
                          {[p.prenom, p.nom].filter(Boolean).join(' ')}
                        </span>
                      </div>
                      <div className="col-span-2 text-[var(--text-muted)] text-xs truncate">{p.email || '—'}</div>
                      <div className="col-span-2">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <div className={`w-1.5 h-1.5 rounded-full ${col?.dotClass}`} />
                          <span className="text-[var(--text-muted)]">{col?.label}</span>
                        </span>
                      </div>
                      <div className="col-span-2 text-[#FF6B2B] text-xs font-semibold">
                        {p.valeur_estimee > 0 ? `${p.valeur_estimee} €` : '—'}
                      </div>
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-[var(--text-muted)] text-xs">
                          {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 rounded-lg md:opacity-0 md:group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Mobile row */}
                    <div className="flex md:hidden items-center gap-3 px-3 py-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: '#FF6B2B' }}
                      >
                        <span className="text-white text-[10px] font-bold">
                          {[p.prenom?.[0], p.nom?.[0]].filter(Boolean).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--text-primary)] text-sm font-medium truncate">
                          {[p.prenom, p.nom].filter(Boolean).join(' ')}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <div className={`w-1.5 h-1.5 rounded-full ${col?.dotClass}`} />
                            <span className="text-[var(--text-muted)]">{col?.label}</span>
                          </span>
                          {p.valeur_estimee > 0 && (
                            <>
                              <span className="text-[var(--border-subtle)]">|</span>
                              <span className="text-[#FF6B2B] text-[11px] font-semibold">{p.valeur_estimee} €</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 transition-all flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* MODAL AJOUT PROSPECT                  */}
      {/* ══════════════════════════════════════ */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau prospect">
        <form onSubmit={handleAdd} className="space-y-4">
          {/* Gradient accent bar */}
          <div
            className="h-[3px] rounded-full -mt-2 mb-4"
            style={{ background: 'var(--metric-highlight)' }}
          />

          {/* Prénom */}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5 font-medium">Prénom *</label>
            <input
              type="text"
              value={formPrenom}
              onChange={(e) => setFormPrenom(e.target.value)}
              placeholder="Prénom du prospect"
              autoFocus
              required
              className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B] transition-colors"
            />
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5 font-medium">Nom</label>
            <input
              type="text"
              value={formNom}
              onChange={(e) => setFormNom(e.target.value)}
              placeholder="Nom de famille"
              className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B] transition-colors"
            />
          </div>

          {/* Email + Téléphone en row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5 font-medium">Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@exemple.com"
                className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5 font-medium">Téléphone</label>
              <input
                type="tel"
                value={formTelephone}
                onChange={(e) => setFormTelephone(e.target.value)}
                placeholder="+33 6..."
                className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B] transition-colors"
              />
            </div>
          </div>

          {/* Valeur + Statut en row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5 font-medium">Valeur estimée (€)</label>
              <div className="relative">
                <Euro size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="number"
                  value={formValeur}
                  onChange={(e) => setFormValeur(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl pl-9 pr-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B] transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5 font-medium">Statut de départ</label>
              <select
                value={modalStatut}
                onChange={(e) => setModalStatut(e.target.value)}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B] transition-colors"
              >
                {COLUMNS.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5 font-medium">Notes</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Notes sur ce prospect..."
              rows={2}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B] transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)]/80 border border-[var(--border-base)] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !formPrenom.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-40  active:scale-[0.97]"
              style={{ background: '#FF6B2B', boxShadow: '0 2px 12px rgba(255,107,43,0.25)' }}
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
