// Input réutilisable — style Zevo sombre
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm text-white/60 font-medium">{label}</label>
      )}
      <input
        className={`
          bg-[#2A2A2A] border rounded-lg px-3.5 py-2.5 text-[#F5F5F3] text-sm
          placeholder:text-white/25
          focus:outline-none focus:ring-2 focus:ring-[#FF6B2B]/50
          transition-all duration-150
          ${error ? 'border-red-500/50' : 'border-white/[0.08] focus:border-[#FF6B2B]/50'}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
