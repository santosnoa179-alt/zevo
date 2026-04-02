import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import { Modal } from '../../components/ui/Modal'
import {
  FolderPlus, Upload, File, FileText, FileImage, FileVideo,
  Folder, ChevronRight, MoreVertical, Trash2, Share2,
  Download, Search, Grid3X3, List, Loader2, X, Plus,
  HardDrive, Users, Eye, FolderOpen, ArrowLeft
} from 'lucide-react'

// ── Helpers ──

function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} Go`
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fileTypeFromName(name) {
  const ext = (name || '').split('.').pop().toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image'
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) return 'video'
  if (['pdf'].includes(ext)) return 'pdf'
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'].includes(ext)) return 'document'
  return 'other'
}

function FileIcon({ type, size = 18 }) {
  switch (type) {
    case 'image': return <FileImage size={size} className="text-blue-400" />
    case 'video': return <FileVideo size={size} className="text-purple-400" />
    case 'pdf': return <FileText size={size} className="text-red-400" />
    case 'document': return <FileText size={size} className="text-green-400" />
    default: return <File size={size} className="text-[var(--text-muted)]" />
  }
}

// ══════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════

export default function CoachDrivePage() {
  const { user } = useAuth()
  const toast = useToast()

  // ── State ──
  const [folders, setFolders] = useState([])
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [breadcrumbs, setBreadcrumbs] = useState([]) // [{id, name}, ...]
  const [viewMode, setViewMode] = useState('list') // 'list' | 'grid'
  const [searchQuery, setSearchQuery] = useState('')

  // Clients (pour le partage)
  const [clients, setClients] = useState([])

  // Modales
  const [modalNewFolder, setModalNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [modalShare, setModalShare] = useState(null) // file object
  const [shareClientId, setShareClientId] = useState('')
  const [sharing, setSharing] = useState(false)

  const [contextMenu, setContextMenu] = useState(null) // {type:'file'|'folder', item, x, y}

  // ── Charger les données ──
  const chargerDonnees = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const folderFilter = currentFolderId
      ? supabase.from('drive_folders').select('*').eq('coach_id', user.id).eq('parent_id', currentFolderId)
      : supabase.from('drive_folders').select('*').eq('coach_id', user.id).is('parent_id', null)

    const fileFilter = currentFolderId
      ? supabase.from('drive_files').select('*, profiles:client_id(nom, prenom, email)').eq('coach_id', user.id).eq('folder_id', currentFolderId)
      : supabase.from('drive_files').select('*, profiles:client_id(nom, prenom, email)').eq('coach_id', user.id).is('folder_id', null)

    const [foldersRes, filesRes] = await Promise.all([
      folderFilter.order('name'),
      fileFilter.order('created_at', { ascending: false }),
    ])

    setFolders(foldersRes.data || [])
    setFiles(filesRes.data || [])
    setLoading(false)
  }, [user, currentFolderId])

  useEffect(() => { chargerDonnees() }, [chargerDonnees])

  // Charger les clients pour le partage
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, profiles(nom, prenom, email)')
        .eq('coach_id', user.id)
      setClients(data || [])
    }
    load()
  }, [user])

  // ── Navigation dossiers ──
  const naviguerDossier = (folder) => {
    setCurrentFolderId(folder.id)
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }])
    setSearchQuery('')
  }

  const naviguerBreadcrumb = (index) => {
    if (index === -1) {
      // Racine
      setCurrentFolderId(null)
      setBreadcrumbs([])
    } else {
      const bc = breadcrumbs[index]
      setCurrentFolderId(bc.id)
      setBreadcrumbs(prev => prev.slice(0, index + 1))
    }
    setSearchQuery('')
  }

  // ── Créer un dossier ──
  const creerDossier = async (e) => {
    e.preventDefault()
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    const { data, error } = await supabase
      .from('drive_folders')
      .insert({
        coach_id: user.id,
        name: newFolderName.trim(),
        parent_id: currentFolderId || null,
      })
      .select()
      .single()
    if (error) {
      toast.error('Erreur lors de la création du dossier')
    } else {
      setFolders(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      toast.success(`Dossier "${data.name}" créé`)
      setModalNewFolder(false)
      setNewFolderName('')
    }
    setCreatingFolder(false)
  }

  // ── Upload fichier ──
  const uploadFichier = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    setUploadProgress(0)

    try {
      // Simuler une progression
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 15, 90))
      }, 200)

      // Upload vers Supabase Storage
      const path = `${user.id}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('drive')
        .upload(path, file)

      clearInterval(progressInterval)

      if (uploadError) {
        toast.error('Erreur d\'upload : ' + uploadError.message)
        setUploading(false)
        setUploadProgress(0)
        return
      }

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage.from('drive').getPublicUrl(path)
      const url = urlData?.publicUrl || path

      setUploadProgress(95)

      // Insérer dans drive_files
      const { data: fileData, error: dbError } = await supabase
        .from('drive_files')
        .insert({
          coach_id: user.id,
          name: file.name,
          url,
          size: file.size,
          type: fileTypeFromName(file.name),
          folder_id: currentFolderId || null,
        })
        .select('*, profiles:client_id(nom, prenom, email)')
        .single()

      if (dbError) {
        toast.error('Erreur d\'enregistrement')
      } else {
        setFiles(prev => [fileData, ...prev])
        toast.success(`"${file.name}" uploadé avec succès`)
      }

      setUploadProgress(100)
    } catch (err) {
      toast.error('Erreur inattendue')
      console.error(err)
    }

    setTimeout(() => {
      setUploading(false)
      setUploadProgress(0)
    }, 500)

    // Reset input
    e.target.value = ''
  }

  // ── Partager un fichier ──
  const partagerFichier = async () => {
    if (!modalShare || !shareClientId) return
    setSharing(true)
    const { error } = await supabase
      .from('drive_files')
      .update({ client_id: shareClientId })
      .eq('id', modalShare.id)
    if (error) {
      toast.error('Erreur lors du partage')
    } else {
      // Recharger le fichier avec les infos client
      const { data } = await supabase
        .from('drive_files')
        .select('*, profiles:client_id(nom, prenom, email)')
        .eq('id', modalShare.id)
        .single()
      if (data) {
        setFiles(prev => prev.map(f => f.id === data.id ? data : f))
      }
      toast.success('Fichier partagé avec le client !')
      setModalShare(null)
      setShareClientId('')
    }
    setSharing(false)
  }

  // ── Supprimer un fichier ──
  const supprimerFichier = async (file) => {
    // Supprimer du storage
    if (file.url) {
      const path = file.url.split('/drive/')[1] || ''
      if (path) await supabase.storage.from('drive').remove([decodeURIComponent(path)])
    }
    // Supprimer de la DB
    const { error } = await supabase.from('drive_files').delete().eq('id', file.id)
    if (!error) {
      setFiles(prev => prev.filter(f => f.id !== file.id))
      toast.success('Fichier supprimé')
    }
    setContextMenu(null)
  }

  // ── Supprimer un dossier ──
  const supprimerDossier = async (folder) => {
    const { error } = await supabase.from('drive_folders').delete().eq('id', folder.id)
    if (!error) {
      setFolders(prev => prev.filter(f => f.id !== folder.id))
      toast.success('Dossier supprimé')
    }
    setContextMenu(null)
  }

  // ── Retirer le partage ──
  const retirerPartage = async (file) => {
    const { error } = await supabase
      .from('drive_files')
      .update({ client_id: null })
      .eq('id', file.id)
    if (!error) {
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, client_id: null, profiles: null } : f))
      toast.success('Partage retiré')
    }
    setContextMenu(null)
  }

  // ── Filtrer ──
  const filteredFolders = folders.filter(f => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredFiles = files.filter(f => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const totalItems = filteredFolders.length + filteredFiles.length

  // ── Fermer le context menu au clic n'importe où ──
  useEffect(() => {
    const handler = () => setContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  return (
    <div className="p-6 space-y-6" onClick={() => setContextMenu(null)}>

      {/* ══════════════════════════════════════ */}
      {/* HEADER                                */}
      {/* ══════════════════════════════════════ */}
      <div>
        <h1 className="text-[var(--text-primary)] text-2xl font-bold flex items-center gap-3">
          <HardDrive size={22} className="text-[#FF6B2B]" />
          Drive
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">Gérez et partagez vos fichiers avec vos clients.</p>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* BREADCRUMBS + ACTIONS                 */}
      {/* ══════════════════════════════════════ */}
      <div className="flex items-center justify-between gap-4 flex-wrap">

        {/* Fil d'Ariane */}
        <div className="flex items-center gap-1 text-sm min-w-0">
          <button
            onClick={() => naviguerBreadcrumb(-1)}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              breadcrumbs.length === 0
                ? 'bg-[#FF6B2B]/10 text-[#FF6B2B] font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            Drive
          </button>
          {breadcrumbs.map((bc, i) => (
            <div key={bc.id} className="flex items-center gap-1 min-w-0">
              <ChevronRight size={12} className="text-[var(--text-muted)] flex-shrink-0" />
              <button
                onClick={() => naviguerBreadcrumb(i)}
                className={`px-2.5 py-1 rounded-lg truncate max-w-[150px] transition-colors ${
                  i === breadcrumbs.length - 1
                    ? 'bg-[#FF6B2B]/10 text-[#FF6B2B] font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {bc.name}
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setModalNewFolder(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-base)] text-[var(--text-primary)] text-xs font-medium hover:bg-[var(--bg-surface)]/50 transition-colors"
          >
            <FolderPlus size={14} />
            Nouveau dossier
          </button>
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF6B2B] text-white text-xs font-semibold hover:bg-[#e55e24] transition-colors cursor-pointer">
            <Upload size={14} />
            Ajouter
            <Plus size={12} />
            <input type="file" className="hidden" onChange={uploadFichier} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* BARRE DE RECHERCHE + VUE              */}
      {/* ══════════════════════════════════════ */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
          />
        </div>

        <div className="flex items-center bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-muted)]'}`}
          >
            <List size={15} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-muted)]'}`}
          >
            <Grid3X3 size={15} />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* BARRE DE PROGRESSION UPLOAD           */}
      {/* ══════════════════════════════════════ */}
      {uploading && (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 size={16} className="animate-spin text-[#FF6B2B]" />
            <span className="text-[var(--text-primary)] text-sm font-medium">Upload en cours...</span>
            <span className="text-[var(--text-muted)] text-xs ml-auto">{uploadProgress}%</span>
          </div>
          <div className="h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FF6B2B] rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* CONTENU — DOSSIERS + FICHIERS         */}
      {/* ══════════════════════════════════════ */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#FF6B2B]" />
        </div>
      ) : totalItems === 0 && !searchQuery ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-[var(--bg-surface)]/30 flex items-center justify-center mb-4">
            <HardDrive size={32} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-[var(--text-muted)] text-sm font-medium mb-1">
            {currentFolderId ? 'Ce dossier est vide' : 'Votre Drive est vide'}
          </p>
          <p className="text-[var(--text-muted)] text-xs max-w-[280px] text-center">
            Créez un dossier ou uploadez un fichier pour commencer
          </p>
        </div>
      ) : totalItems === 0 && searchQuery ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Search size={28} className="text-[var(--text-muted)] mb-3" />
          <p className="text-[var(--text-muted)] text-sm">Aucun résultat pour "{searchQuery}"</p>
        </div>
      ) : viewMode === 'list' ? (
        /* ── VUE LISTE ── */
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl overflow-hidden">
          {/* En-tête tableau */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-[var(--border-base)] text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-semibold">
            <div className="col-span-1"></div>
            <div className="col-span-4">Nom</div>
            <div className="col-span-3">Partagé avec</div>
            <div className="col-span-2">Taille</div>
            <div className="col-span-2">Date</div>
          </div>

          {/* Dossiers */}
          {filteredFolders.map((folder) => (
            <div
              key={folder.id}
              className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-[var(--border-base)]/50 hover:bg-[var(--bg-surface)]/20 transition-colors cursor-pointer group items-center"
              onDoubleClick={() => naviguerDossier(folder)}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ type: 'folder', item: folder, x: e.clientX, y: e.clientY }) }}
            >
              <div className="col-span-1 flex justify-center">
                <div className="w-9 h-9 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center">
                  <Folder size={17} className="text-[#FF6B2B]" />
                </div>
              </div>
              <div className="col-span-4">
                <button onClick={() => naviguerDossier(folder)} className="text-[var(--text-primary)] text-sm font-medium hover:text-[#FF6B2B] transition-colors text-left truncate">
                  {folder.name}
                </button>
              </div>
              <div className="col-span-3 text-[var(--text-muted)] text-sm">—</div>
              <div className="col-span-2 text-[var(--text-muted)] text-sm">—</div>
              <div className="col-span-2 flex items-center justify-between">
                <span className="text-[var(--text-muted)] text-sm">{formatDate(folder.created_at)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setContextMenu({ type: 'folder', item: folder, x: e.clientX, y: e.clientY }) }}
                  className="p-1 rounded text-white/0 group-hover:text-[var(--text-muted)] hover:!text-[var(--text-secondary)] transition-all"
                >
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>
          ))}

          {/* Fichiers */}
          {filteredFiles.map((file) => {
            const sharedWith = file.profiles
              ? [file.profiles.prenom, file.profiles.nom].filter(Boolean).join(' ') || file.profiles.email
              : null

            return (
              <div
                key={file.id}
                className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-[var(--border-base)]/50 hover:bg-[var(--bg-surface)]/20 transition-colors group items-center"
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ type: 'file', item: file, x: e.clientX, y: e.clientY }) }}
              >
                <div className="col-span-1 flex justify-center">
                  <div className="w-9 h-9 rounded-lg bg-[var(--bg-base)] border border-[var(--border-base)] flex items-center justify-center">
                    {file.type === 'image' && file.url ? (
                      <img src={file.url} alt="" className="w-full h-full rounded-lg object-cover" />
                    ) : (
                      <FileIcon type={file.type} size={17} />
                    )}
                  </div>
                </div>
                <div className="col-span-4">
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-[var(--text-primary)] text-sm font-medium hover:text-[#FF6B2B] transition-colors truncate block">
                    {file.name}
                  </a>
                </div>
                <div className="col-span-3">
                  {sharedWith ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
                      <Users size={11} /> {sharedWith}
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)] text-sm">—</span>
                  )}
                </div>
                <div className="col-span-2 text-[var(--text-muted)] text-sm">{formatSize(file.size)}</div>
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-[var(--text-muted)] text-sm">{formatDate(file.created_at)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setContextMenu({ type: 'file', item: file, x: e.clientX, y: e.clientY }) }}
                    className="p-1 rounded text-white/0 group-hover:text-[var(--text-muted)] hover:!text-[var(--text-secondary)] transition-all"
                  >
                    <MoreVertical size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── VUE GRILLE ── */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {/* Dossiers */}
          {filteredFolders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => naviguerDossier(folder)}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ type: 'folder', item: folder, x: e.clientX, y: e.clientY }) }}
              className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl p-4 hover:border-[#FF6B2B]/30 hover:bg-[#FF6B2B]/5 transition-colors text-left group"
            >
              <div className="w-11 h-11 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center mb-3">
                <FolderOpen size={20} className="text-[#FF6B2B]" />
              </div>
              <p className="text-[var(--text-primary)] text-sm font-medium truncate">{folder.name}</p>
              <p className="text-[var(--text-muted)] text-[10px] mt-1">Dossier</p>
            </button>
          ))}

          {/* Fichiers */}
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ type: 'file', item: file, x: e.clientX, y: e.clientY }) }}
              className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl p-4 hover:border-[var(--border-base)] transition-colors group relative"
            >
              {/* Thumbnail / Icon */}
              <div className="w-full aspect-square rounded-lg bg-[var(--bg-base)] border border-[var(--border-base)] flex items-center justify-center mb-3 overflow-hidden">
                {file.type === 'image' && file.url ? (
                  <img src={file.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <FileIcon type={file.type} size={28} />
                )}
              </div>
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-[var(--text-primary)] text-xs font-medium truncate block hover:text-[#FF6B2B] transition-colors">
                {file.name}
              </a>
              <p className="text-[var(--text-muted)] text-[10px] mt-1">{formatSize(file.size)}</p>
              {file.profiles && (
                <p className="text-green-400/60 text-[9px] mt-1 flex items-center gap-1">
                  <Users size={8} /> Partagé
                </p>
              )}

              {/* Actions hover */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); setContextMenu({ type: 'file', item: file, x: e.clientX, y: e.clientY }) }}
                  className="p-1.5 rounded-lg bg-[var(--bg-elevated)]/80 text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-base)]"
                >
                  <MoreVertical size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* CONTEXT MENU (clic droit / ...)       */}
      {/* ══════════════════════════════════════ */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl shadow-2xl py-1.5 min-w-[180px]"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 200), top: Math.min(contextMenu.y, window.innerHeight - 200) }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'file' && (
            <>
              <a
                href={contextMenu.item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-4 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/50 transition-colors"
                onClick={() => setContextMenu(null)}
              >
                <Eye size={13} className="text-[var(--text-muted)]" />
                Ouvrir
              </a>
              <a
                href={contextMenu.item.url}
                download
                className="flex items-center gap-2.5 px-4 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/50 transition-colors"
                onClick={() => setContextMenu(null)}
              >
                <Download size={13} className="text-[var(--text-muted)]" />
                Télécharger
              </a>
              <button
                onClick={() => { setModalShare(contextMenu.item); setContextMenu(null) }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/50 transition-colors"
              >
                <Share2 size={13} className="text-[#FF6B2B]" />
                Partager avec un client
              </button>
              {contextMenu.item.client_id && (
                <button
                  onClick={() => retirerPartage(contextMenu.item)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-surface)]/50 transition-colors"
                >
                  <X size={13} className="text-[var(--text-muted)]" />
                  Retirer le partage
                </button>
              )}
              <div className="border-t border-[var(--border-base)] my-1" />
              <button
                onClick={() => supprimerFichier(contextMenu.item)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={13} />
                Supprimer
              </button>
            </>
          )}

          {contextMenu.type === 'folder' && (
            <>
              <button
                onClick={() => { naviguerDossier(contextMenu.item); setContextMenu(null) }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/50 transition-colors"
              >
                <FolderOpen size={13} className="text-[#FF6B2B]" />
                Ouvrir le dossier
              </button>
              <div className="border-t border-[var(--border-base)] my-1" />
              <button
                onClick={() => supprimerDossier(contextMenu.item)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={13} />
                Supprimer le dossier
              </button>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* MODAL — Nouveau dossier               */}
      {/* ══════════════════════════════════════ */}
      <Modal isOpen={modalNewFolder} onClose={() => setModalNewFolder(false)} title="Nouveau dossier">
        <form onSubmit={creerDossier} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Nom du dossier</label>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Ex: Mes documents"
              autoFocus
              required
              className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B] transition-colors"
            />
          </div>
          {currentFolderId && (
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3 flex items-center gap-2">
              <Folder size={13} className="text-[#FF6B2B]" />
              <span className="text-[var(--text-muted)] text-xs">
                Dans : {breadcrumbs[breadcrumbs.length - 1]?.name || 'Drive'}
              </span>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModalNewFolder(false)}
              className="flex-1 py-2.5 rounded-xl text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] hover:bg-[#3f3f46] transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={creatingFolder}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40">
              {creatingFolder ? <Loader2 size={15} className="animate-spin" /> : <FolderPlus size={15} />}
              Créer
            </button>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════ */}
      {/* MODAL — Partager un fichier            */}
      {/* ══════════════════════════════════════ */}
      <Modal isOpen={!!modalShare} onClose={() => setModalShare(null)} title="Partager le fichier">
        {modalShare && (
          <div className="space-y-4">
            {/* Fichier concerné */}
            <div className="bg-[var(--bg-elevated)] rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--bg-base)] border border-[var(--border-base)] flex items-center justify-center flex-shrink-0">
                <FileIcon type={modalShare.type} size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-primary)] text-sm font-medium truncate">{modalShare.name}</p>
                <p className="text-[var(--text-muted)] text-[10px]">{formatSize(modalShare.size)}</p>
              </div>
            </div>

            {/* Sélection du client */}
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Partager avec</label>
              {clients.length === 0 ? (
                <p className="text-[var(--text-muted)] text-xs bg-[var(--bg-elevated)] rounded-lg p-3">Aucun client trouvé</p>
              ) : (
                <select
                  value={shareClientId}
                  onChange={(e) => setShareClientId(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B] transition-colors"
                >
                  <option value="">— Sélectionner un client —</option>
                  {clients.map((c) => {
                    const name = [c.profiles?.prenom, c.profiles?.nom].filter(Boolean).join(' ') || c.profiles?.email || c.id
                    return <option key={c.id} value={c.id}>{name}</option>
                  })}
                </select>
              )}
            </div>

            <p className="text-[var(--text-muted)] text-xs">Le client pourra voir et télécharger ce fichier depuis son espace.</p>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setModalShare(null)}
                className="flex-1 py-2.5 rounded-xl text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] hover:bg-[#3f3f46] transition-colors">
                Annuler
              </button>
              <button onClick={partagerFichier} disabled={sharing || !shareClientId}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40">
                {sharing ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />}
                Partager
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
