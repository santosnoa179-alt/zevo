// Bouton réutilisable — variantes : primary, secondary, ghost, danger
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-[#FF6B2B] text-white hover:bg-[#FF9A6C] active:scale-[0.98]',
    secondary: 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:opacity-80 border border-[var(--border-base)]',
    ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-base)]',
    danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
