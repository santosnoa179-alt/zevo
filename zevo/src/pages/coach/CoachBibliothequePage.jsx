import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import {
  Plus, FileText, Video, Link2, Image, BookOpen, Search,
  Upload, Trash2, Share2, Loader2, X, ExternalLink, Users, Filter
} from 'lucide-react'

// Icônes et couleurs par type de ressource
const TYPE_CONFIG = {
  pdf:   { icon: FileText, color: '#EF4444', label: 'PDF' },
  video: { icon: Video,    color: '#8B5CF6', label: 'Vidéo' },
  lien:  { icon: Link2,    color: '#3B82F6', label: 'Lien' },
  image: { icon: Image,    color: '#10B981', label: 'Image' },
  guide: { icon: BookOpen, color: '#F59E0B', label: 'Guide' },
}

const TYPES = ['pdf', 'video', 'lien', 'image', 'guide']
const CATEGORIES = ['Nutrition', 'Sport', 'Mindset', 'Santé', 'Admin', 'Autre']

export default function CoachBibliothequePage() {
  const { user } = useAuth()

  const [ressources, setRessources] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCat, setFilterCat] = useState('')

  // Modal ajout
  const [modalAdd, setModalAdd] = useState(false)
  const [addMode, setAddMode] = useState('lien') // 'lien' ou 'fichier'
  const [titre, setTitre] = useState('')
  const [type, setType] = useState('lien')
  const [url, setUrl] = useState('')
  const [categorie, setCategorie] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)

  // Modal partage
  const [modalShare, setModalShare] = useState(false)
  const [shareRessourceId, setShareRessourceId] = useState(null)
  const [clients, setClients] = useState([])
  const [partagesExistants, setPartagesExistants] = useState([])
  const [loadingClients, setLoadingClients] = useState(false)

  // Compteur partages par ressource
  const [shareCounts, setShareCounts] = useState({})

  // ── Chargement ──
  useEffect(() => {
    if (!user) return
    loadRessources()
  }, [user])

  const loadRessources = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ressources')
      .select('*')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })

    setRessources(data || [])

    // Compte les partages par ressource
    if (data?.length) {
      const ids = data.map(r => r.id)
      const { data: partages } = await supabase
        .from('ressources_partages')
        .select('ressource_id')
        .in('ressource_id', ids)

      const counts = {}
      ;(partages || []).forEach(p => {
        counts[p.ressource_id] = (counts[p.ressource_id] || 0) + 1
      })
      setShareCounts(counts)
    }

    setLoading(false)
  }

  // ── Ajout d'une ressource ──
  const handleAdd = async (e) => {
    e.preventDefault()
    if (!titre.trim()) return
    setSaving(true)

    let finalUrl = url

    // Upload fichier si mode fichier
    if (addMode === 'fichier' && file) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('ressources')
        .upload(path, file)

      if (upErr) {
        console.error('Erreur upload:', upErr)
        setSaving(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('ressources')
        .getPublicUrl(path)
      finalUrl = urlData.publicUrl
    }

    const { data, error } = await supabase
      .from('ressources')
      .insert({
        coach_id: user.id,
        titre: titre.trim(),
        type,
        url: finalUrl,
        categorie: categorie || null,
        description: description.trim() || null,
      })
      .select()
      .single()

    if (!error && data) {
      setRessources(prev => [data, ...prev])
      resetAddForm()
      setModalAdd(false)
    }
    setSaving(false)
  }

  const resetAddForm = () => {
    setTitre(''); setUrl(''); setCategorie(''); setDescription(''); setFile(null)
    setType('lien'); setAddMode('lien')
  }

  // ── Suppression ──
  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette ressource ?')) return
    await supabase.from('ressources').delete().eq('id', id)
    setRessources(prev => prev.filter(r => r.id !== id))
  }

  // ── Partage — ouvrir le modal ──
  const openShareModal = async (ressourceId) => {
    setShareRessourceId(ressourceId)
    setModalShare(true)
    setLoadingClients(true)

    // Charge les clients du coach + partages existants en parallèle
    const [clientsRes, partagesRes] = await Promise.all([
      supabase.from('clients').select('id, profiles(nom, email)').eq('coach_id', user.id).eq('actif', true),
      supabase.from('ressources_partages').select('client_id').eq('ressource_id', ressourceId),
    ])

    setClients(clientsRes.data || [])
    setPartagesExistants((partagesRes.data || []).map(p => p.client_id))
    setLoadingClients(false)
  }

  // Partager / retirer le partage pour un client
  const togglePartage = async (clientId) => {
    const dejaPartage = partagesExistants.includes(clientId)

    if (dejaPartage) {
      await supabase.from('ressources_partages')
        .delete()
        .eq('ressource_id', shareRessourceId)
        .eq('client_id', clientId)
      setPartagesExistants(prev => prev.filter(id => id !== clientId))
      setShareCounts(prev => ({ ...prev, [shareRessourceId]: (prev[shareRessourceId] || 1) - 1 }))
    } else {
      await supabase.from('ressources_partages')
        .insert({ ressource_id: shareRessourceId, client_id: clientId })
      setPartagesExistants(prev => [...prev, clientId])
      setShareCounts(prev => ({ ...prev, [shareRessourceId]: (prev[shareRessourceId] || 0) + 1 }))
    }
  }

  // ── Filtrage ──
  const filtered = ressources.filter(r => {
    if (filterType && r.type !== filterType) return false
    if (filterCat && r.categorie !== filterCat) return false
    if (search && !r.titre.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // ── RENDER ──

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#FF6B2B]" size={32} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#F5F5F3] text-2xl font-bold">Bibliothèque</h1>
          <p className="text-white/40 text-sm mt-0.5">Stocke et partage tes ressources avec tes clients</p>
        </div>
        <button
          onClick={() => setModalAdd(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-colors"
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {/* Barre de recherche + filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une ressource..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#1E1E1E] border border-white/[0.08] rounded-xl text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/50"
        >
          <option value="">Tous les types</option>
          {TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
        </select>

        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/50"
        >
          <option value="">Toutes les catégories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Grille vide */}
      {filtered.length === 0 && (
        <div className="bg-[#1E1E1E] rounded-2xl p-12 text-center">
          <BookOpen size={48} className="text-white/10 mx-auto mb-4" />
          <h3 className="text-[#F5F5F3] font-semibold mb-1">
            {ressources.length === 0 ? 'Aucune ressource' : 'Aucun résultat'}
          </h3>
          <p className="text-white/40 text-sm mb-6">
            {ressources.length === 0
              ? 'Ajoute des PDF, vidéos ou guides pour tes clients'
              : 'Modifie tes filtres pour trouver ce que tu cherches'
            }
          </p>
          {ressources.length === 0 && (
            <button
              onClick={() => setModalAdd(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-colors"
            >
              <Plus size={16} />
              Ajouter une ressource
            </button>
          )}
        </div>
      )}

      {/* Grille des ressources */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((res) => {
          const config = TYPE_CONFIG[res.type] || TYPE_CONFIG.lien
          const Icon = config.icon
          const nbPartages = shareCounts[res.id] || 0

          return (
            <div
              key={res.id}
              className="bg-[#1E1E1E] rounded-2xl border border-white/[0.08] p-5 hover:border-white/[0.15] transition-colors group"
            >
              {/* Header card */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${config.color}15` }}
                >
                  <Icon size={18} style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#F5F5F3] font-medium text-sm truncate">{res.titre}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${config.color}15`, color: config.color }}
                    >
                      {config.label}
                    </span>
                    {res.categorie && (
                      <span className="text-white/30 text-[10px]">{res.categorie}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {res.description && (
                <p className="text-white/40 text-xs mb-3 line-clamp-2">{res.description}</p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                <span className="text-white/25 text-xs inline-flex items-center gap-1">
                  <Users size={11} />
                  {nbPartages} client{nbPartages > 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-1">
                  {/* Ouvrir */}
                  {res.url && (
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.04] transition-colors"
                      title="Ouvrir"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  {/* Partager */}
                  <button
                    onClick={() => openShareModal(res.id)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-[#FF6B2B] hover:bg-white/[0.04] transition-colors"
                    title="Partager"
                  >
                    <Share2 size={14} />
                  </button>
                  {/* Supprimer */}
                  <button
                    onClick={() => handleDelete(res.id)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/[0.04] transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ══════════ MODAL AJOUT ══════════ */}
      <Modal isOpen={modalAdd} onClose={() => { setModalAdd(false); resetAddForm() }} title="Ajouter une ressource">
        <form onSubmit={handleAdd} className="space-y-4">
          {/* Mode : lien ou fichier */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAddMode('lien')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                addMode === 'lien' ? 'bg-[#FF6B2B] text-white' : 'bg-[#2A2A2A] text-white/40'
              }`}
            >
              Lien / URL
            </button>
            <button
              type="button"
              onClick={() => setAddMode('fichier')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                addMode === 'fichier' ? 'bg-[#FF6B2B] text-white' : 'bg-[#2A2A2A] text-white/40'
              }`}
            >
              Upload fichier
            </button>
          </div>

          <Input
            label="Titre"
            placeholder="Ex : Guide nutrition semaine 1"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            required
            autoFocus
          />

          {/* Type */}
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Type</label>
            <div className="flex gap-2 flex-wrap">
              {TYPES.map(t => {
                const cfg = TYPE_CONFIG[t]
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      type === t
                        ? 'text-white'
                        : 'text-white/40 bg-[#2A2A2A]'
                    }`}
                    style={type === t ? { backgroundColor: cfg.color } : {}}
                  >
                    <cfg.icon size={12} />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* URL ou Upload */}
          {addMode === 'lien' ? (
            <Input
              label="URL"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              type="url"
            />
          ) : (
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Fichier</label>
              <label className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed border-white/[0.12] text-white/40 text-sm cursor-pointer hover:border-white/[0.2] hover:text-white/60 transition-colors">
                <Upload size={16} />
                {file ? file.name : 'Choisir un fichier'}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Catégorie */}
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Catégorie (optionnel)</label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-4 py-2.5 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/50"
            >
              <option value="">Aucune</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Quelques mots sur cette ressource..."
              rows={2}
              className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => { setModalAdd(false); resetAddForm() }}>
              Annuler
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              Ajouter
            </Button>
          </div>
        </form>
      </Modal>

      {/* ══════════ MODAL PARTAGE ══════════ */}
      <Modal isOpen={modalShare} onClose={() => setModalShare(false)} title="Partager avec">
        {loadingClients ? (
          <div className="py-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-[#FF6B2B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-8">
            <Users size={28} className="text-white/15 mx-auto mb-2" />
            <p className="text-white/30 text-sm">Aucun client actif</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {clients.map((c) => {
              const nom = c.profiles?.nom || c.profiles?.email || 'Client'
              const partage = partagesExistants.includes(c.id)
              return (
                <button
                  key={c.id}
                  onClick={() => togglePartage(c.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                    partage
                      ? 'bg-[#FF6B2B]/10 border border-[#FF6B2B]/20'
                      : 'bg-[#2A2A2A]/50 hover:bg-[#2A2A2A] border border-transparent'
                  }`}
                >
                  {/* Avatar initiale */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    partage ? 'bg-[#FF6B2B] text-white' : 'bg-[#2A2A2A] text-white/50'
                  }`}>
                    {nom.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[#F5F5F3] text-sm flex-1 truncate">{nom}</span>
                  {partage && (
                    <span className="text-[#FF6B2B] text-xs font-medium">Partagé ✓</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </Modal>
    </div>
  )
}
