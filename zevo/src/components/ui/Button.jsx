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
    secondary: 'bg-[#2A2A2A] text-[#F5F5F3] hover:bg-white/[0.12] border border-white/[0.08]',
    ghost: 'text-white/60 hover:text-white hover:bg-white/[0.06]',
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
