import { useState } from 'react'
import { FileText, Download, X, ZoomIn } from 'lucide-react'

// ══════════════════════════════════════════════════════════
// IMAGE BUBBLE — Affichage d'une image dans le chat
// ══════════════════════════════════════════════════════════

export function ImageBubble({ imageUrl, contenu, estMoi, createdAt }) {
  const [fullscreen, setFullscreen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  const time = createdAt
    ? new Date(createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <>
      <div className={`flex ${estMoi ? 'justify-end' : 'justify-start'} mb-2`}>
        <div
          className={`max-w-[75%] min-w-[180px] rounded-2xl overflow-hidden cursor-pointer group relative ${
            estMoi ? 'rounded-br-sm' : 'rounded-bl-sm'
          }`}
          onClick={() => !errored && setFullscreen(true)}
        >
          {/* Placeholder skeleton (tant que pas chargé ET pas d'erreur) */}
          {!loaded && !errored && (
            <div className="w-full aspect-[4/3] bg-[var(--bg-surface)] animate-pulse rounded-2xl" />
          )}

          {/* État d'erreur — image indisponible */}
          {errored && (
            <div className="w-full aspect-[4/3] bg-[var(--bg-surface)] rounded-2xl flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
              <FileText size={24} className="opacity-50" />
              <p className="text-[11px]">Image indisponible</p>
            </div>
          )}

          {!errored && (
            <img
              src={imageUrl}
              alt="Image partagée"
              className={`w-full max-h-[320px] object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0 h-0'}`}
              onLoad={() => setLoaded(true)}
              onError={() => setErrored(true)}
              loading="lazy"
            />
          )}

          {/* Overlay au hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <ZoomIn size={24} className="text-white opacity-0 group-hover:opacity-80 transition-opacity" />
          </div>

          {/* Caption + time */}
          <div className={`px-3 py-2 ${estMoi ? 'bg-[#FF6B2B]' : 'bg-[var(--bg-card)] border-t border-[var(--border-subtle)]'}`}>
            {contenu && contenu !== 'Photo' && contenu !== 'Fichier' && (
              <p className={`text-[13px] mb-1 ${estMoi ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                {contenu}
              </p>
            )}
            <p className={`text-[10px] text-right ${estMoi ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>
              {time}
            </p>
          </div>
        </div>
      </div>

      {/* Fullscreen viewer */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
          >
            <X size={20} />
          </button>
          <img
            src={imageUrl}
            alt="Image en plein écran"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}


// ══════════════════════════════════════════════════════════
// FILE BUBBLE — Affichage d'un fichier (PDF, doc, etc.)
// ══════════════════════════════════════════════════════════

export function FileBubble({ fileUrl, fileName, fileType, estMoi, createdAt }) {
  const time = createdAt
    ? new Date(createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : ''

  // Icône et couleur selon le type
  const getFileStyle = () => {
    if (fileType?.includes('pdf')) return { color: '#ef4444', label: 'PDF' }
    if (fileType?.includes('video')) return { color: '#8b5cf6', label: 'Vidéo' }
    return { color: '#3b82f6', label: 'Fichier' }
  }

  const style = getFileStyle()

  // Nom tronqué
  const displayName = fileName && fileName.length > 30
    ? fileName.slice(0, 25) + '...' + fileName.slice(fileName.lastIndexOf('.'))
    : fileName || 'Fichier'

  return (
    <div className={`flex ${estMoi ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[75%] min-w-[220px] rounded-2xl overflow-hidden ${
          estMoi
            ? 'bg-[#FF6B2B] rounded-br-sm'
            : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-bl-sm'
        }`}
      >
        <div className="px-3.5 py-3 flex items-center gap-3">
          {/* File icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${style.color}20` }}
          >
            <FileText size={18} style={{ color: style.color }} />
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <p className={`text-[13px] font-medium truncate ${estMoi ? 'text-white' : 'text-[var(--text-primary)]'}`}>
              {displayName}
            </p>
            <p className={`text-[10px] mt-0.5 ${estMoi ? 'text-white/50' : 'text-[var(--text-muted)]'}`}>
              {style.label}
            </p>
          </div>

          {/* Download */}
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
              estMoi ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={14} />
          </a>
        </div>

        {/* Time */}
        <div className={`px-3.5 pb-2 flex justify-end`}>
          <span className={`text-[10px] ${estMoi ? 'text-white/50' : 'text-[var(--text-muted)]'}`}>
            {time}
          </span>
        </div>
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════
// FILE PICKER BUTTON — Bouton d'ajout de fichier/photo
// ══════════════════════════════════════════════════════════

export function FilePickerButton({ onFileSelected, uploading }) {
  const handleClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/gif,image/webp,image/heic,application/pdf,video/mp4,video/quicktime'
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (file) onFileSelected(file)
    }
    input.click()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={uploading}
      className="w-11 h-11 rounded-full bg-[var(--bg-card)] border border-[var(--border-base)] flex items-center justify-center flex-shrink-0 text-[var(--text-muted)] hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30 transition-all active:scale-90 disabled:opacity-40"
      title="Envoyer un fichier"
    >
      {uploading ? (
        <div className="w-4 h-4 border-2 border-[#FF6B2B] border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
        </svg>
      )}
    </button>
  )
}
