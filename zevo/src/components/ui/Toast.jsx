import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { CheckCircle2, AlertTriangle, X, Info } from 'lucide-react'

// ── Context ──
const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ type = 'success', message, duration = 3500 }) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const toast = useCallback({
    success: (message) => addToast({ type: 'success', message }),
    error: (message) => addToast({ type: 'error', message }),
    info: (message) => addToast({ type: 'info', message }),
  }, [addToast])

  // Make toast callable for convenience
  const api = useCallback((message) => addToast({ type: 'success', message }), [addToast])
  api.success = toast.success
  api.error = toast.error
  api.info = toast.info

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const ICONS = {
  success: <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />,
  error: <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />,
  info: <Info size={18} className="text-blue-400 flex-shrink-0" />,
}

const BORDER_COLORS = {
  success: 'border-green-500/20',
  error: 'border-red-500/20',
  info: 'border-blue-500/20',
}

function ToastItem({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  return (
    <div
      className={`
        pointer-events-auto flex items-center gap-3 min-w-[280px] max-w-[400px]
        bg-[#1E1E1E] border ${BORDER_COLORS[toast.type]}
        rounded-xl px-4 py-3 shadow-lg shadow-black/30
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
      `}
    >
      {ICONS[toast.type]}
      <p className="text-[#F5F5F3] text-sm flex-1">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  )
}
