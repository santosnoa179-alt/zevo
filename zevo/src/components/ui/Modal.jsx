import { useEffect } from 'react'
import { X } from 'lucide-react'

// Modal générique — overlay sombre avec contenu centré
export function Modal({ isOpen, onClose, title, children, className = '' }) {
  // Ferme avec la touche Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Bloque le scroll du body quand ouvert
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Contenu */}
      <div className={`relative bg-[#1E1E1E] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl ${className}`}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
            <h2 className="text-[#F5F5F3] font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors p-1"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Corps */}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
