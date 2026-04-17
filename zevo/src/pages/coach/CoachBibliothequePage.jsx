import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Modal } from '../../components/ui/Modal'
import {
  Plus, FileText, Video, Link2, Image, BookOpen, Search, Upload,
  Trash2, Share2, Loader2, X, ExternalLink, Users, Filter,
  CheckCircle2, Circle, FolderPlus, Folder, FolderOpen, ChevronRight,
  Lock, Globe, Grid3X3, List, MoreVertical, Eye, Download, Star,
  Bookmark, BookmarkCheck
} from 'lucide-react'

// ── Types & Config ──
// ── Langage Fitness OS : palette atténuée slate + orange pour différencier ──
// L'orange est réservé aux éléments actifs/CTA. Les types restent distinguables
// via l'icône uniquement (plus besoin de couleur saturée).
const TYPE_CONFIG = {
  pdf:      { icon: FileText,  color: '#FF6B2B', label: 'PDF' },        // orange = contenu principal
  video:    { icon: Video,     color: '#64748b', label: 'Vidéo' },      // slate
  lien:     { icon: Link2,     color: '#9ca3af', label: 'Lien' },       // gris
  image:    { icon: Image,     color: '#64748b', label: 'Image' },      // slate
  guide:    { icon: BookOpen,  color: '#FF9A6C', label: 'Guide' },      // orange clair
  document: { icon: FileText,  color: '#64748b', label: 'Document' },   // slate
  autre:    { icon: FileText,  color: '#9ca3af', label: 'Autre' },      // gris
}
const TYPES = Object.keys(TYPE_CONFIG)
const CATEGORIES = ['Nutrition', 'Sport', 'Mindset', 'Santé', 'Admin', 'Autre']

// ── Smart sections ──
const SECTIONS = [
  { id: 'all',     label: 'Tout',      icon: BookOpen, filter: () => true },
  { id: 'private', label: 'Privé',     icon: Lock,     filter: (r, sc) => !sc[r.id] },
  { id: 'shared',  label: 'Partagé',   icon: Globe,    filter: (r, sc) => (sc[r.id] || 0) > 0 },
  { id: 'favori',  label: 'Favoris',   icon: Star,     filter: (r) => r.favori },
]

// ── Helpers ──
function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / 1048576).toFixed(1)} Mo`
}

function detectType(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase()
  if (['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return 'image'
  if (['mp4','mov','avi','webm','mkv'].includes(ext)) return 'video'
  if (['pdf'].includes(ext)) return 'pdf'
  if (['doc','docx','xls','xlsx','ppt','pptx','txt','csv'].includes(ext)) return 'document'
  return 'autre'
}

// ══════════════════════════════════════
// COMPONENT — Bibliothèque unifiée
// ══════════════════════════════════════

export default function CoachBibliothequePage() {
  const { user } = useAuth()

  // Data
  const [ressources, setRessources] = useState([])
  const [dossiers, setDossiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState([])
  const [shareCounts, setShareCounts] = useState({})

  // Navigation
  const [currentDossier, setCurrentDossier] = useState(null)
  const [breadcrumbs, setBreadcrumbs] = useState([])
  const [activeSection, setActiveSection] = useState('all')

  // View
  const [viewMode, setViewMode] = useState('grid')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCat, setFilterCat] = useState('')

  // Upload
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Modal ajout
  const [modalAdd, setModalAdd] = useState(false)
  const [addMode, setAddMode] = useState('lien')
  const [titre, setTitre] = useState('')
  const [type, setType] = useState('lien')
  const [url, setUrl] = useState('')
  const [categorie, setCategorie] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)

  // Modal nouveau dossier
  const [modalNewFolder, setModalNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)

  // Modal partage
  const [modalShare, setModalShare] = useState(false)
  const [shareRessourceId, setShareRessourceId] = useState(null)
  const [partagesExistants, setPartagesExistants] = useState([])
  const [loadingClients, setLoadingClients] = useState(false)

  // Context menu
  const [contextMenu, setContextMenu] = useState(null)

  // ── Load data ──
  const chargerDonnees = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const folderQ = currentDossier
      ? supabase.from('drive_folders').select('*').eq('coach_id', user.id).eq('parent_id', currentDossier)
      : supabase.from('drive_folders').select('*').eq('coach_id', user.id).is('parent_id', null)

    const ressQ = currentDossier
      ? supabase.from('ressources').select('*').eq('coach_id', user.id).eq('dossier_id', currentDossier)
      : supabase.from('ressources').select('*').eq('coach_id', user.id).order('created_at', { ascending: false })

    const [foldersRes, ressRes, clientsRes] = await Promise.all([
      folderQ.order('name'),
      activeSection === 'all' && !currentDossier
        ? ressQ
        : ressQ,
      supabase.from('clients').select('id, profiles(nom, email)').eq('coach_id', user.id).eq('actif', true),
    ])

    const allRessources = ressRes.data || []
    setDossiers(foldersRes.data || [])
    setRessources(allRessources)
    setClients(clientsRes.data || [])

    // Share counts
    if (allRessources.length > 0) {
      const ids = allRessources.map(r => r.id)
      const { data: partages } = await supabase
        .from('ressources_partages').select('ressource_id').in('ressource_id', ids)
      const counts = {}
      ;(partages || []).forEach(p => { counts[p.ressource_id] = (counts[p.ressource_id] || 0) + 1 })
      setShareCounts(counts)
    } else {
      setShareCounts({})
    }

    setLoading(false)
  }, [user, currentDossier, activeSection])

  useEffect(() => { chargerDonnees() }, [chargerDonnees])

  // Close context menu
  useEffect(() => {
    const h = () => setContextMenu(null)
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [])

  // ── Filtering ──
  const filtered = useMemo(() => {
    let list = ressources
    // Section smart filter
    const sec = SECTIONS.find(s => s.id === activeSection)
    if (sec) list = list.filter(r => sec.filter(r, shareCounts))
    // Dossier filter (when not in root with a section)
    if (currentDossier) list = list.filter(r => r.dossier_id === currentDossier)
    else if (activeSection === 'all') { /* show all */ }
    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r => r.titre?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q))
    }
    if (filterType) list = list.filter(r => r.type === filterType)
    if (filterCat) list = list.filter(r => r.categorie === filterCat)
    return list
  }, [ressources, activeSection, currentDossier, search, filterType, filterCat, shareCounts])

  const filteredDossiers = useMemo(() => {
    if (!search.trim()) return dossiers
    return dossiers.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
  }, [dossiers, search])

  // ── Folder navigation ──
  const naviguerDossier = (folder) => {
    setCurrentDossier(folder.id)
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }])
    setActiveSection('all')
    setSearch('')
  }

  const naviguerBreadcrumb = (index) => {
    if (index === -1) {
      setCurrentDossier(null); setBreadcrumbs([])
    } else {
      setCurrentDossier(breadcrumbs[index].id)
      setBreadcrumbs(prev => prev.slice(0, index + 1))
    }
    setSearch('')
  }

  // ── Create folder ──
  const creerDossier = async (e) => {
    e.preventDefault()
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    const { data, error } = await supabase.from('drive_folders').insert({
      coach_id: user.id, name: newFolderName.trim(), parent_id: currentDossier || null,
    }).select().single()
    if (!error && data) setDossiers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setCreatingFolder(false); setModalNewFolder(false); setNewFolderName('')
  }

  const supprimerDossier = async (folder) => {
    if (!confirm(`Supprimer le dossier "${folder.name}" ?`)) return
    await supabase.from('drive_folders').delete().eq('id', folder.id)
    setDossiers(prev => prev.filter(f => f.id !== folder.id))
    setContextMenu(null)
  }

  // ── Add resource (link or file) ──
  const handleAdd = async (e) => {
    e.preventDefault()
    if (!titre.trim()) return
    if (addMode === 'lien' && !url.trim()) return
    if (addMode === 'fichier' && !file) return
    setSaving(true)

    let finalUrl = url.trim() || null
    let fileSize = null

    if (addMode === 'fichier' && file) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('ressources').upload(path, file, { contentType: file.type, upsert: false })
      if (upErr) {
        alert("Erreur lors de l'upload. Vérifie que le bucket 'ressources' existe.")
        setSaving(false); return
      }
      const { data: urlData } = supabase.storage.from('ressources').getPublicUrl(path)
      finalUrl = urlData.publicUrl
      fileSize = file.size
    }

    const detectedType = addMode === 'fichier' ? detectType(file?.name) : type
    const { data, error } = await supabase.from('ressources').insert({
      coach_id: user.id, titre: titre.trim(), type: detectedType, url: finalUrl,
      categorie: categorie || null, description: description.trim() || null,
      dossier_id: currentDossier || null, taille: fileSize,
    }).select().single()

    if (!error && data) setRessources(prev => [data, ...prev])
    else if (error) alert(`Erreur : ${error.message}`)

    setSaving(false); setModalAdd(false); resetAddForm()
  }

  const resetAddForm = () => {
    setTitre(''); setUrl(''); setCategorie(''); setDescription(''); setFile(null)
    setType('lien'); setAddMode('lien')
  }

  // ── Quick upload (drag & drop or button) ──
  const quickUpload = async (fileObj) => {
    if (!fileObj || !user) return
    setUploading(true); setUploadProgress(0)
    const progressInterval = setInterval(() => setUploadProgress(p => Math.min(p + 15, 90)), 200)

    const ext = fileObj.name.split('.').pop()
    const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('ressources').upload(path, fileObj, { contentType: fileObj.type })
    clearInterval(progressInterval)

    if (upErr) { setUploading(false); setUploadProgress(0); return }

    const { data: urlData } = supabase.storage.from('ressources').getPublicUrl(path)
    setUploadProgress(95)

    const { data, error } = await supabase.from('ressources').insert({
      coach_id: user.id, titre: fileObj.name.replace(/\.[^/.]+$/, ''),
      type: detectType(fileObj.name), url: urlData.publicUrl,
      dossier_id: currentDossier || null, taille: fileObj.size,
    }).select().single()

    if (!error && data) setRessources(prev => [data, ...prev])
    setUploadProgress(100)
    setTimeout(() => { setUploading(false); setUploadProgress(0) }, 400)
  }

  // ── Delete resource ──
  const handleDelete = async (res) => {
    if (!confirm(`Supprimer "${res.titre}" ?`)) return
    if (res.url?.includes('/ressources/')) {
      const path = res.url.split('/ressources/')[1]
      if (path) await supabase.storage.from('ressources').remove([decodeURIComponent(path)])
    }
    await supabase.from('ressources').delete().eq('id', res.id)
    setRessources(prev => prev.filter(r => r.id !== res.id))
    setContextMenu(null)
  }

  // ── Toggle favori ──
  const toggleFavori = async (res) => {
    const newVal = !res.favori
    await supabase.from('ressources').update({ favori: newVal }).eq('id', res.id)
    setRessources(prev => prev.map(r => r.id === res.id ? { ...r, favori: newVal } : r))
    setContextMenu(null)
  }

  // ── Share modal ──
  const openShareModal = async (ressourceId) => {
    setShareRessourceId(ressourceId); setModalShare(true); setLoadingClients(true)
    const { data: partages } = await supabase
      .from('ressources_partages').select('client_id').eq('ressource_id', ressourceId)
    setPartagesExistants((partages || []).map(p => p.client_id))
    setLoadingClients(false)
  }

  const togglePartage = async (clientId) => {
    const exists = partagesExistants.includes(clientId)
    if (exists) {
      await supabase.from('ressources_partages').delete()
        .eq('ressource_id', shareRessourceId).eq('client_id', clientId)
      setPartagesExistants(prev => prev.filter(id => id !== clientId))
      setShareCounts(prev => ({ ...prev, [shareRessourceId]: Math.max(0, (prev[shareRessourceId] || 1) - 1) }))
    } else {
      await supabase.from('ressources_partages')
        .insert({ ressource_id: shareRessourceId, client_id: clientId })
      setPartagesExistants(prev => [...prev, clientId])
      setShareCounts(prev => ({ ...prev, [shareRessourceId]: (prev[shareRessourceId] || 0) + 1 }))
    }
  }

  // ── Stats ──
  const totalCount = ressources.length
  const sharedCount = ressources.filter(r => shareCounts[r.id] > 0).length
  const privateCount = totalCount - sharedCount

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════

  return (
    <div className="p-4 md:p-6 w-full" onClick={() => setContextMenu(null)}>

      {/* ═══════ HEADER ═══════ */}
      <div className="hero-card hero-card--accent p-4 md:p-5 mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BookOpen size={18} className="text-[var(--text-muted)] shrink-0" strokeWidth={1.75} />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">Bibliothèque</h1>
            <p className="text-[var(--text-muted)] text-xs md:text-sm mt-0.5">Tous vos fichiers et ressources en un seul endroit</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModalNewFolder(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border-base)] text-[var(--text-secondary)] text-xs font-semibold hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors">
            <FolderPlus size={13} /> Dossier
          </button>
          <button onClick={() => setModalAdd(true)}
            className="flex items-center gap-2 bg-[#FF6B2B] hover:bg-[#FF6B2B]/90 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95">
            <Plus size={15} /> Ajouter
          </button>
        </div>
      </div>

      {/* ═══════ TOOLBAR : Sections + Breadcrumbs + Search + View ═══════ */}
      <div className="space-y-3 mb-5">

        {/* Smart sections — segmented control neutre */}
        <div className="flex items-center bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl p-1 w-fit">
          {SECTIONS.map(s => {
            const Ic = s.icon
            const count = s.id === 'all' ? totalCount : s.id === 'shared' ? sharedCount : s.id === 'private' ? privateCount : ressources.filter(r => r.favori).length
            const active = activeSection === s.id && !currentDossier
            return (
              <button key={s.id}
                onClick={() => { setActiveSection(s.id); setCurrentDossier(null); setBreadcrumbs([]) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-base)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent'
                }`}>
                <Ic size={12} strokeWidth={1.75} />
                {s.label}
                <span className={`text-[10px] tabular-nums font-bold ${active ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'}`}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Breadcrumbs (only when inside a folder) */}
        {currentDossier && (
          <div className="flex items-center gap-1 text-sm">
            <button onClick={() => naviguerBreadcrumb(-1)}
              className="px-2 py-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors text-xs">
              Bibliothèque
            </button>
            {breadcrumbs.map((bc, i) => (
              <div key={bc.id} className="flex items-center gap-1">
                <ChevronRight size={12} className="text-[var(--text-muted)]" />
                <button onClick={() => naviguerBreadcrumb(i)}
                  className={`px-2 py-1 rounded-lg text-xs truncate max-w-[150px] transition-colors ${
                    i === breadcrumbs.length - 1 ? 'bg-[#FF6B2B]/10 text-[#FF6B2B] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}>{bc.name}</button>
              </div>
            ))}
          </div>
        )}

        {/* Search + filters + view toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors" />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="appearance-none bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors cursor-pointer">
            <option value="">Tous types</option>
            {TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
          </select>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
            className="appearance-none bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors cursor-pointer">
            <option value="">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {/* View toggle */}
          <div className="flex items-center bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl overflow-hidden ml-auto">
            <button onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-muted)]'}`}>
              <Grid3X3 size={14} />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-muted)]'}`}>
              <List size={14} />
            </button>
          </div>
          {/* Quick upload */}
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)] text-[var(--text-muted)] text-xs cursor-pointer hover:text-white hover:bg-[var(--bg-surface)] transition-colors">
            <Upload size={14} /> Upload rapide
            <input type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) quickUpload(e.target.files[0]); e.target.value = '' }} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl p-3 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 size={14} className="animate-spin text-[#FF6B2B]" />
            <span className="text-[var(--text-primary)] text-xs font-medium">Upload en cours...</span>
            <span className="text-[var(--text-muted)] text-xs ml-auto tabular-nums">{uploadProgress}%</span>
          </div>
          <div className="h-1 bg-[var(--bg-surface)] rounded-full overflow-hidden">
            <div className="h-full bg-[#FF6B2B] rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* ═══════ CONTENT ═══════ */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-[#FF6B2B]" />
        </div>
      ) : filteredDossiers.length === 0 && filtered.length === 0 ? (
        /* Empty state */
        <div className="hero-card border-dashed p-14 text-center">
          <BookOpen size={28} className="text-[var(--text-muted)] mx-auto mb-4 animate-breathe" strokeWidth={1.5} />
          <p className="text-[var(--text-primary)] text-sm font-bold tracking-tight mb-1">
            {ressources.length === 0 ? 'Votre bibliothèque est vide' : 'Aucun résultat'}
          </p>
          <p className="text-[var(--text-muted)] text-xs mb-5">
            {ressources.length === 0 ? 'Ajoutez des PDF, vidéos, liens ou guides pour vos clients' : 'Modifiez vos filtres'}
          </p>
          {ressources.length === 0 && (
            <button onClick={() => setModalAdd(true)}
              className="inline-flex items-center gap-2 bg-[#FF6B2B] hover:bg-[#FF6B2B]/90 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95">
              <Plus size={15} /> Ajouter une ressource
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ── VUE GRILLE ── */
        <div>
          {/* Dossiers */}
          {filteredDossiers.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-3">Dossiers</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {filteredDossiers.map(folder => (
                  <button key={folder.id} onClick={() => naviguerDossier(folder)}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ type: 'folder', item: folder, x: e.clientX, y: e.clientY }) }}
                    className="hero-card p-4 hover:border-[#FF6B2B]/30 transition-colors text-left group">
                    <FolderOpen size={18} className="text-[#FF6B2B] mb-3" strokeWidth={1.75} />
                    <p className="text-[var(--text-primary)] text-sm font-bold truncate tracking-tight">{folder.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resources grid */}
          {filtered.length > 0 && (
            <div>
              {filteredDossiers.length > 0 && <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-3">Fichiers</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(res => {
                  const config = TYPE_CONFIG[res.type] || TYPE_CONFIG.autre
                  const Icon = config.icon
                  const nbPartages = shareCounts[res.id] || 0

                  return (
                    <div key={res.id}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ type: 'resource', item: res, x: e.clientX, y: e.clientY }) }}
                      className="relative group hero-card hover:border-[#FF6B2B]/30 transition-colors">

                      {/* Barre latérale 3px (langage unifié) */}
                      <span className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full" style={{ backgroundColor: config.color }} />

                      {/* Favori star */}
                      {res.favori && (
                        <div className="absolute top-3 right-3 z-10">
                          <Star size={14} className="text-yellow-400 fill-yellow-400" />
                        </div>
                      )}

                      {/* Main clickable zone */}
                      <button type="button"
                        onClick={() => res.url && window.open(res.url, '_blank', 'noopener,noreferrer')}
                        disabled={!res.url}
                        className="w-full text-left p-5 pb-0 cursor-pointer">
                        <div className="flex items-start gap-3 mb-3">
                          <Icon size={16} strokeWidth={1.75} style={{ color: config.color }} className="shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[var(--text-primary)] font-medium text-sm truncate group-hover:text-white transition-colors">
                              {res.titre}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${config.color}15`, color: config.color }}>
                                {config.label}
                              </span>
                              {res.categorie && <span className="text-[var(--text-muted)] text-[10px]">{res.categorie}</span>}
                              {res.taille && <span className="text-[var(--text-muted)] text-[10px]">{formatSize(res.taille)}</span>}
                            </div>
                          </div>
                          {res.url && <ExternalLink size={13} className="text-[var(--text-muted)] group-hover:text-[var(--text-muted)] transition-colors shrink-0 mt-0.5" />}
                        </div>
                        {res.description && <p className="text-[var(--text-muted)] text-xs mb-3 line-clamp-2">{res.description}</p>}
                      </button>

                      {/* Actions bar */}
                      <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-subtle)]">
                        {/* Visibility badge */}
                        {nbPartages > 0 ? (
                          <span className="text-xs inline-flex items-center gap-1.5 text-[#FF6B2B]/70">
                            <Globe size={11} /> {nbPartages} client{nbPartages > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs inline-flex items-center gap-1.5 text-[var(--text-muted)]">
                            <Lock size={11} /> Privé
                          </span>
                        )}

                        <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={(e) => { e.stopPropagation(); toggleFavori(res) }} title="Favori"
                            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors">
                            {res.favori ? <BookmarkCheck size={15} className="text-yellow-400" /> : <Bookmark size={15} />}
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); openShareModal(res.id) }} title="Partager"
                            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[#FF6B2B] hover:bg-[#FF6B2B]/10 transition-colors">
                            <Share2 size={15} />
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(res) }} title="Supprimer"
                            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── VUE LISTE ── */
        <div className="hero-card overflow-hidden">
          {/* Folders in list */}
          {filteredDossiers.map(folder => (
            <div key={folder.id}
              onClick={() => naviguerDossier(folder)}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ type: 'folder', item: folder, x: e.clientX, y: e.clientY }) }}
              className="flex items-center gap-3 pl-5 pr-4 py-3 border-b border-[var(--border-base)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer group">
              <Folder size={15} className="text-[#FF6B2B] flex-shrink-0" strokeWidth={1.75} />
              <p className="text-[var(--text-primary)] text-sm font-semibold flex-1 truncate">{folder.name}</p>
              <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold">Dossier</span>
              <ChevronRight size={13} className="text-[var(--text-muted)]" />
            </div>
          ))}

          {/* Resources in list */}
          {filtered.map(res => {
            const config = TYPE_CONFIG[res.type] || TYPE_CONFIG.autre
            const Icon = config.icon
            const nbPartages = shareCounts[res.id] || 0

            return (
              <div key={res.id}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ type: 'resource', item: res, x: e.clientX, y: e.clientY }) }}
                className="group relative flex items-center gap-3 pl-5 pr-4 py-3 border-b border-[var(--border-base)] last:border-b-0 hover:bg-[var(--bg-surface)] transition-colors">
                <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full" style={{ backgroundColor: config.color }} />
                <Icon size={15} strokeWidth={1.75} style={{ color: config.color }} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <a href={res.url} target="_blank" rel="noopener noreferrer"
                    className="text-[var(--text-primary)] text-sm font-medium truncate block hover:text-[#FF6B2B] transition-colors">{res.titre}</a>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[var(--text-muted)]">{config.label}</span>
                    {res.categorie && <><span className="text-[var(--text-muted)]">·</span><span className="text-[10px] text-[var(--text-muted)]">{res.categorie}</span></>}
                  </div>
                </div>
                {res.favori && <Star size={13} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                {nbPartages > 0 ? (
                  <span className="text-[10px] text-[#FF6B2B]/60 flex items-center gap-1 flex-shrink-0"><Globe size={10} />{nbPartages}</span>
                ) : (
                  <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 flex-shrink-0"><Lock size={10} /></span>
                )}
                <span className="text-[var(--text-muted)] text-[10px] flex-shrink-0 w-16 text-right">{formatDate(res.created_at)}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); toggleFavori(res) }}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-yellow-400 transition-colors">
                    {res.favori ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); openShareModal(res.id) }}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#FF6B2B] transition-colors"><Share2 size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(res) }}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══════ CONTEXT MENU ═══════ */}
      {contextMenu && (
        <div className="fixed z-50 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl shadow-2xl py-1.5 min-w-[180px]"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 200), top: Math.min(contextMenu.y, window.innerHeight - 200) }}
          onClick={(e) => e.stopPropagation()}>
          {contextMenu.type === 'resource' && (
            <>
              {contextMenu.item.url && (
                <a href={contextMenu.item.url} target="_blank" rel="noopener noreferrer" onClick={() => setContextMenu(null)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors">
                  <Eye size={13} className="text-[var(--text-muted)]" /> Ouvrir
                </a>
              )}
              <button onClick={() => { openShareModal(contextMenu.item.id); setContextMenu(null) }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors">
                <Share2 size={13} className="text-[#FF6B2B]" /> Partager
              </button>
              <button onClick={() => { toggleFavori(contextMenu.item) }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors">
                <Star size={13} className="text-yellow-400" /> {contextMenu.item.favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              </button>
              <div className="border-t border-[var(--border-base)] my-1" />
              <button onClick={() => handleDelete(contextMenu.item)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 size={13} /> Supprimer
              </button>
            </>
          )}
          {contextMenu.type === 'folder' && (
            <>
              <button onClick={() => { naviguerDossier(contextMenu.item); setContextMenu(null) }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors">
                <FolderOpen size={13} className="text-[#FF6B2B]" /> Ouvrir
              </button>
              <div className="border-t border-[var(--border-base)] my-1" />
              <button onClick={() => supprimerDossier(contextMenu.item)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 size={13} /> Supprimer
              </button>
            </>
          )}
        </div>
      )}

      {/* ═══════ MODAL AJOUT ═══════ */}
      <Modal isOpen={modalAdd} onClose={() => { setModalAdd(false); resetAddForm() }} title="Ajouter une ressource">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="flex gap-2">
            {[{ id: 'lien', label: 'Lien / URL' }, { id: 'fichier', label: 'Upload fichier' }].map(m => (
              <button key={m.id} type="button" onClick={() => setAddMode(m.id)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${addMode === m.id ? 'bg-[#FF6B2B] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                {m.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold mb-1.5">Titre *</label>
            <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex : Guide nutrition" required autoFocus
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors" />
          </div>

          {addMode === 'lien' ? (
            <>
              <div>
                <label className="block text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold mb-1.5">Type</label>
                <div className="flex gap-2 flex-wrap">
                  {TYPES.map(t => {
                    const cfg = TYPE_CONFIG[t]
                    return (
                      <button key={t} type="button" onClick={() => setType(t)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${type === t ? 'text-white' : 'text-[var(--text-muted)] bg-[var(--bg-surface)]'}`}
                        style={type === t ? { backgroundColor: cfg.color } : {}}>
                        <cfg.icon size={12} /> {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold mb-1.5">URL *</label>
                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..."
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors" />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold mb-1.5">Fichier *</label>
              <label className="flex items-center justify-center gap-2 w-full py-5 rounded-xl border-2 border-dashed border-[var(--border-base)] text-[var(--text-muted)] text-sm cursor-pointer hover:border-[#FF6B2B]/30 hover:text-[var(--text-secondary)] transition-colors">
                <Upload size={16} />
                {file ? file.name : 'Choisir un fichier'}
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold mb-1.5">Catégorie</label>
              <select value={categorie} onChange={(e) => setCategorie(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors">
                <option value="">Aucune</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold mb-1.5">Description</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optionnel..."
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => { setModalAdd(false); resetAddForm() }}
              className="flex-1 py-2.5 rounded-xl text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] hover:bg-[#3f3f46] transition-colors">Annuler</button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Ajouter
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══════ MODAL NOUVEAU DOSSIER ═══════ */}
      <Modal isOpen={modalNewFolder} onClose={() => setModalNewFolder(false)} title="Nouveau dossier">
        <form onSubmit={creerDossier} className="space-y-4">
          <div>
            <label className="block text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold mb-1.5">Nom</label>
            <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Ex : Programmes" autoFocus required
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors" />
          </div>
          {currentDossier && (
            <div className="bg-[var(--bg-elevated)] rounded-xl p-3 flex items-center gap-2">
              <Folder size={13} className="text-[#FF6B2B]" />
              <span className="text-[var(--text-muted)] text-xs">Dans : {breadcrumbs[breadcrumbs.length - 1]?.name || 'Racine'}</span>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModalNewFolder(false)}
              className="flex-1 py-2.5 rounded-xl text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] hover:bg-[#3f3f46] transition-colors">Annuler</button>
            <button type="submit" disabled={creatingFolder}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40">
              {creatingFolder ? <Loader2 size={15} className="animate-spin" /> : <FolderPlus size={15} />} Créer
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══════ MODAL PARTAGE ═══════ */}
      <Modal isOpen={modalShare} onClose={() => setModalShare(false)}
        title={`Partager — ${ressources.find(r => r.id === shareRessourceId)?.titre || 'Ressource'}`}>
        {loadingClients ? (
          <div className="py-8 flex justify-center">
            <Loader2 size={20} className="animate-spin text-[#FF6B2B]" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-8">
            <Users size={24} className="text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-[var(--text-muted)] text-sm">Aucun client actif</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-[var(--text-muted)] text-xs">{clients.length} client{clients.length > 1 ? 's' : ''}</p>
              <p className="text-[#FF6B2B] text-xs font-medium">{partagesExistants.length} partagé{partagesExistants.length > 1 ? 's' : ''}</p>
            </div>
            <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
              {clients.map(c => {
                const nom = c.profiles?.nom || c.profiles?.email || 'Client'
                const email = c.profiles?.email || ''
                const partage = partagesExistants.includes(c.id)
                return (
                  <button key={c.id} type="button" onClick={() => togglePartage(c.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      partage ? 'bg-[#FF6B2B]/10 border border-[#FF6B2B]/25 hover:bg-[#FF6B2B]/15' : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] border border-transparent'
                    }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${partage ? 'bg-[#FF6B2B] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                      {nom.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--text-primary)] text-sm truncate">{nom}</p>
                      {email && nom !== email && <p className="text-[var(--text-muted)] text-[10px] truncate">{email}</p>}
                    </div>
                    {partage ? <CheckCircle2 size={18} className="text-[#FF6B2B] shrink-0" /> : <Circle size={18} className="text-[var(--text-muted)] shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
