// Input réutilisable — style Zevo (theme-aware)
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm text-[var(--text-secondary)] font-medium">{label}</label>
      )}
      <input
        className={`
          bg-[var(--bg-input)] border rounded-lg px-3.5 py-2.5 text-[var(--text-primary)] text-sm
          placeholder:text-[var(--text-muted)]
          focus:outline-none focus:ring-2 focus:ring-[#FF6B2B]/50
          transition-all duration-150
          ${error ? 'border-red-500/50' : 'border-[var(--border-base)] focus:border-[#FF6B2B]/50'}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
