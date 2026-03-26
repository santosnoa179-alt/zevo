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
const TYPE_CONFIG = {
  pdf:      { icon: FileText,  color: '#EF4444', label: 'PDF' },
  video:    { icon: Video,     color: '#8B5CF6', label: 'Vidéo' },
  lien:     { icon: Link2,     color: '#3B82F6', label: 'Lien' },
  image:    { icon: Image,     color: '#10B981', label: 'Image' },
  guide:    { icon: BookOpen,  color: '#F59E0B', label: 'Guide' },
  document: { icon: FileText,  color: '#6366F1', label: 'Document' },
  autre:    { icon: FileText,  color: '#64748b', label: 'Autre' },
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F3] tracking-tight flex items-center gap-3">
            <BookOpen size={22} className="text-[#FF6B2B]" />
            Bibliothèque
          </h1>
          <p className="text-white/30 text-sm mt-0.5">Tous vos fichiers et ressources en un seul endroit</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModalNewFolder(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.08] text-white/50 text-xs font-medium hover:text-white hover:bg-white/[0.04] transition-colors">
            <FolderPlus size={14} /> Dossier
          </button>
          <button onClick={() => setModalAdd(true)}
            className="flex items-center gap-2 bg-[#FF6B2B] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#e55e24] transition-all hover:shadow-lg hover:shadow-[#FF6B2B]/20">
            <Plus size={16} /> Ajouter
          </button>
        </div>
      </div>

      {/* ═══════ TOOLBAR : Sections + Breadcrumbs + Search + View ═══════ */}
      <div className="space-y-3 mb-5">

        {/* Smart sections */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {SECTIONS.map(s => {
            const Ic = s.icon
            const count = s.id === 'all' ? totalCount : s.id === 'shared' ? sharedCount : s.id === 'private' ? privateCount : ressources.filter(r => r.favori).length
            return (
              <button key={s.id}
                onClick={() => { setActiveSection(s.id); setCurrentDossier(null); setBreadcrumbs([]) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeSection === s.id && !currentDossier
                    ? 'bg-[#FF6B2B] text-white shadow-sm'
                    : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
                }`}>
                <Ic size={13} />
                {s.label}
                <span className={`text-[10px] tabular-nums ${activeSection === s.id && !currentDossier ? 'text-white/70' : 'text-white/20'}`}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Breadcrumbs (only when inside a folder) */}
        {currentDossier && (
          <div className="flex items-center gap-1 text-sm">
            <button onClick={() => naviguerBreadcrumb(-1)}
              className="px-2 py-1 rounded-lg text-white/30 hover:text-white/60 transition-colors text-xs">
              Bibliothèque
            </button>
            {breadcrumbs.map((bc, i) => (
              <div key={bc.id} className="flex items-center gap-1">
                <ChevronRight size={12} className="text-white/15" />
                <button onClick={() => naviguerBreadcrumb(i)}
                  className={`px-2 py-1 rounded-lg text-xs truncate max-w-[150px] transition-colors ${
                    i === breadcrumbs.length - 1 ? 'bg-[#FF6B2B]/10 text-[#FF6B2B] font-semibold' : 'text-white/30 hover:text-white/60'
                  }`}>{bc.name}</button>
              </div>
            ))}
          </div>
        )}

        {/* Search + filters + view toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-3 py-2 bg-[#09090b] border border-white/[0.08] rounded-xl text-sm text-[#F5F5F3] placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/40 transition-colors" />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="appearance-none bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-[#F5F5F3] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors cursor-pointer">
            <option value="">Tous types</option>
            {TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
          </select>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
            className="appearance-none bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-[#F5F5F3] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors cursor-pointer">
            <option value="">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {/* View toggle */}
          <div className="flex items-center bg-[#09090b] border border-white/[0.08] rounded-xl overflow-hidden ml-auto">
            <button onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-white/[0.08] text-[#F5F5F3]' : 'text-white/20 hover:text-white/40'}`}>
              <Grid3X3 size={14} />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-white/[0.08] text-[#F5F5F3]' : 'text-white/20 hover:text-white/40'}`}>
              <List size={14} />
            </button>
          </div>
          {/* Quick upload */}
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/40 text-xs cursor-pointer hover:text-white hover:bg-white/[0.08] transition-colors">
            <Upload size={14} /> Upload rapide
            <input type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) quickUpload(e.target.files[0]); e.target.value = '' }} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div className="bg-[#09090b] border border-white/[0.08] rounded-xl p-3 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 size={14} className="animate-spin text-[#FF6B2B]" />
            <span className="text-[#F5F5F3] text-xs font-medium">Upload en cours...</span>
            <span className="text-white/20 text-xs ml-auto tabular-nums">{uploadProgress}%</span>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
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
        <div className="bg-white/[0.02] rounded-2xl border border-dashed border-white/[0.08] p-14 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FF6B2B]/[0.06] flex items-center justify-center mx-auto mb-5">
            <BookOpen size={28} className="text-[#FF6B2B]/40" />
          </div>
          <p className="text-white/40 text-sm font-medium">
            {ressources.length === 0 ? 'Votre bibliothèque est vide' : 'Aucun résultat'}
          </p>
          <p className="text-white/20 text-xs mt-1.5 mb-5">
            {ressources.length === 0 ? 'Ajoutez des PDF, vidéos, liens ou guides pour vos clients' : 'Modifiez vos filtres'}
          </p>
          {ressources.length === 0 && (
            <button onClick={() => setModalAdd(true)}
              className="inline-flex items-center gap-2 bg-[#FF6B2B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e55e24] transition-colors">
              <Plus size={16} /> Ajouter une ressource
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ── VUE GRILLE ── */
        <div>
          {/* Dossiers */}
          {filteredDossiers.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-3">Dossiers</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {filteredDossiers.map(folder => (
                  <button key={folder.id} onClick={() => naviguerDossier(folder)}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ type: 'folder', item: folder, x: e.clientX, y: e.clientY }) }}
                    className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4 hover:border-[#FF6B2B]/30 hover:-translate-y-0.5 transition-all text-left group">
                    <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center mb-3">
                      <FolderOpen size={18} className="text-[#FF6B2B]" />
                    </div>
                    <p className="text-[#F5F5F3] text-sm font-medium truncate">{folder.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resources grid */}
          {filtered.length > 0 && (
            <div>
              {filteredDossiers.length > 0 && <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-3">Fichiers</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(res => {
                  const config = TYPE_CONFIG[res.type] || TYPE_CONFIG.autre
                  const Icon = config.icon
                  const nbPartages = shareCounts[res.id] || 0

                  return (
                    <div key={res.id}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ type: 'resource', item: res, x: e.clientX, y: e.clientY }) }}
                      className="bg-white/[0.02] rounded-2xl border border-white/[0.06] hover:border-white/[0.15] transition-all group relative">

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
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${config.color}15` }}>
                            <Icon size={18} style={{ color: config.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[#F5F5F3] font-medium text-sm truncate group-hover:text-white transition-colors">
                              {res.titre}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${config.color}15`, color: config.color }}>
                                {config.label}
                              </span>
                              {res.categorie && <span className="text-white/25 text-[10px]">{res.categorie}</span>}
                              {res.taille && <span className="text-white/15 text-[10px]">{formatSize(res.taille)}</span>}
                            </div>
                          </div>
                          {res.url && <ExternalLink size={13} className="text-white/10 group-hover:text-white/30 transition-colors shrink-0 mt-0.5" />}
                        </div>
                        {res.description && <p className="text-white/30 text-xs mb-3 line-clamp-2">{res.description}</p>}
                      </button>

                      {/* Actions bar */}
                      <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.04]">
                        {/* Visibility badge */}
                        {nbPartages > 0 ? (
                          <span className="text-xs inline-flex items-center gap-1.5 text-[#FF6B2B]/70">
                            <Globe size={11} /> {nbPartages} client{nbPartages > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs inline-flex items-center gap-1.5 text-white/20">
                            <Lock size={11} /> Privé
                          </span>
                        )}

                        <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={(e) => { e.stopPropagation(); toggleFavori(res) }} title="Favori"
                            className="p-2 rounded-lg text-white/40 hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors">
                            {res.favori ? <BookmarkCheck size={15} className="text-yellow-400" /> : <Bookmark size={15} />}
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); openShareModal(res.id) }} title="Partager"
                            className="p-2 rounded-lg text-white/40 hover:text-[#FF6B2B] hover:bg-[#FF6B2B]/10 transition-colors">
                            <Share2 size={15} />
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(res) }} title="Supprimer"
                            className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
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
        <div className="bg-[#09090b] border border-white/[0.08] rounded-2xl overflow-hidden">
          {/* Folders in list */}
          {filteredDossiers.map(folder => (
            <div key={folder.id}
              onClick={() => naviguerDossier(folder)}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ type: 'folder', item: folder, x: e.clientX, y: e.clientY }) }}
              className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors cursor-pointer group">
              <div className="w-9 h-9 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                <Folder size={16} className="text-[#FF6B2B]" />
              </div>
              <p className="text-[#F5F5F3] text-sm font-medium flex-1 truncate">{folder.name}</p>
              <span className="text-white/15 text-xs">Dossier</span>
              <ChevronRight size={14} className="text-white/10 group-hover:text-white/30" />
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
                className="group flex items-center gap-4 px-5 py-3 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.03] transition-colors">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${config.color}15` }}>
                  <Icon size={16} style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <a href={res.url} target="_blank" rel="noopener noreferrer"
                    className="text-[#F5F5F3] text-sm font-medium truncate block hover:text-[#FF6B2B] transition-colors">{res.titre}</a>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-white/25">{config.label}</span>
                    {res.categorie && <><span className="text-white/10">·</span><span className="text-[10px] text-white/25">{res.categorie}</span></>}
                  </div>
                </div>
                {res.favori && <Star size={13} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                {nbPartages > 0 ? (
                  <span className="text-[10px] text-[#FF6B2B]/60 flex items-center gap-1 flex-shrink-0"><Globe size={10} />{nbPartages}</span>
                ) : (
                  <span className="text-[10px] text-white/15 flex items-center gap-1 flex-shrink-0"><Lock size={10} /></span>
                )}
                <span className="text-white/15 text-[10px] flex-shrink-0 w-16 text-right">{formatDate(res.created_at)}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); toggleFavori(res) }}
                    className="p-1.5 rounded-lg text-white/30 hover:text-yellow-400 transition-colors">
                    {res.favori ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); openShareModal(res.id) }}
                    className="p-1.5 rounded-lg text-white/30 hover:text-[#FF6B2B] transition-colors"><Share2 size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(res) }}
                    className="p-1.5 rounded-lg text-white/30 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══════ CONTEXT MENU ═══════ */}
      {contextMenu && (
        <div className="fixed z-50 bg-[#09090b] border border-[#27272a] rounded-xl shadow-2xl py-1.5 min-w-[180px]"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 200), top: Math.min(contextMenu.y, window.innerHeight - 200) }}
          onClick={(e) => e.stopPropagation()}>
          {contextMenu.type === 'resource' && (
            <>
              {contextMenu.item.url && (
                <a href={contextMenu.item.url} target="_blank" rel="noopener noreferrer" onClick={() => setContextMenu(null)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-[#F5F5F3] hover:bg-white/[0.06] transition-colors">
                  <Eye size={13} className="text-white/30" /> Ouvrir
                </a>
              )}
              <button onClick={() => { openShareModal(contextMenu.item.id); setContextMenu(null) }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#F5F5F3] hover:bg-white/[0.06] transition-colors">
                <Share2 size={13} className="text-[#FF6B2B]" /> Partager
              </button>
              <button onClick={() => { toggleFavori(contextMenu.item) }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#F5F5F3] hover:bg-white/[0.06] transition-colors">
                <Star size={13} className="text-yellow-400" /> {contextMenu.item.favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              </button>
              <div className="border-t border-[#27272a] my-1" />
              <button onClick={() => handleDelete(contextMenu.item)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 size={13} /> Supprimer
              </button>
            </>
          )}
          {contextMenu.type === 'folder' && (
            <>
              <button onClick={() => { naviguerDossier(contextMenu.item); setContextMenu(null) }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#F5F5F3] hover:bg-white/[0.06] transition-colors">
                <FolderOpen size={13} className="text-[#FF6B2B]" /> Ouvrir
              </button>
              <div className="border-t border-[#27272a] my-1" />
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
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${addMode === m.id ? 'bg-[#FF6B2B] text-white' : 'bg-[#27272a] text-white/40'}`}>
                {m.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-wider font-semibold mb-1.5">Titre *</label>
            <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex : Guide nutrition" required autoFocus
              className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors" />
          </div>

          {addMode === 'lien' ? (
            <>
              <div>
                <label className="block text-white/40 text-[10px] uppercase tracking-wider font-semibold mb-1.5">Type</label>
                <div className="flex gap-2 flex-wrap">
                  {TYPES.map(t => {
                    const cfg = TYPE_CONFIG[t]
                    return (
                      <button key={t} type="button" onClick={() => setType(t)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${type === t ? 'text-white' : 'text-white/40 bg-[#27272a]'}`}
                        style={type === t ? { backgroundColor: cfg.color } : {}}>
                        <cfg.icon size={12} /> {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-white/40 text-[10px] uppercase tracking-wider font-semibold mb-1.5">URL *</label>
                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..."
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors" />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-wider font-semibold mb-1.5">Fichier *</label>
              <label className="flex items-center justify-center gap-2 w-full py-5 rounded-xl border-2 border-dashed border-white/[0.1] text-white/30 text-sm cursor-pointer hover:border-[#FF6B2B]/30 hover:text-white/50 transition-colors">
                <Upload size={16} />
                {file ? file.name : 'Choisir un fichier'}
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-wider font-semibold mb-1.5">Catégorie</label>
              <select value={categorie} onChange={(e) => setCategorie(e.target.value)}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2.5 text-sm text-[#F5F5F3] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors">
                <option value="">Aucune</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-wider font-semibold mb-1.5">Description</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optionnel..."
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => { setModalAdd(false); resetAddForm() }}
              className="flex-1 py-2.5 rounded-xl text-sm text-white/40 bg-[#27272a] hover:bg-[#3f3f46] transition-colors">Annuler</button>
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
            <label className="block text-white/40 text-[10px] uppercase tracking-wider font-semibold mb-1.5">Nom</label>
            <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Ex : Programmes" autoFocus required
              className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors" />
          </div>
          {currentDossier && (
            <div className="bg-[#09090b] rounded-xl p-3 flex items-center gap-2">
              <Folder size={13} className="text-[#FF6B2B]" />
              <span className="text-white/25 text-xs">Dans : {breadcrumbs[breadcrumbs.length - 1]?.name || 'Racine'}</span>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModalNewFolder(false)}
              className="flex-1 py-2.5 rounded-xl text-sm text-white/40 bg-[#27272a] hover:bg-[#3f3f46] transition-colors">Annuler</button>
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
            <Users size={24} className="text-white/15 mx-auto mb-2" />
            <p className="text-white/30 text-sm">Aucun client actif</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-white/30 text-xs">{clients.length} client{clients.length > 1 ? 's' : ''}</p>
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
                      partage ? 'bg-[#FF6B2B]/10 border border-[#FF6B2B]/25 hover:bg-[#FF6B2B]/15' : 'bg-white/[0.02] hover:bg-white/[0.06] border border-transparent'
                    }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${partage ? 'bg-[#FF6B2B] text-white' : 'bg-white/[0.06] text-white/40'}`}>
                      {nom.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#F5F5F3] text-sm truncate">{nom}</p>
                      {email && nom !== email && <p className="text-white/20 text-[10px] truncate">{email}</p>}
                    </div>
                    {partage ? <CheckCircle2 size={18} className="text-[#FF6B2B] shrink-0" /> : <Circle size={18} className="text-white/15 shrink-0" />}
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
