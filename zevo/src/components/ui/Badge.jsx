// Badge coloré pour statuts, rôles, priorités
export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-white/[0.08] text-white/70',
    orange: 'bg-[#FF6B2B]/15 text-[#FF6B2B]',
    green: 'bg-green-500/15 text-green-400',
    red: 'bg-red-500/15 text-red-400',
    yellow: 'bg-yellow-500/15 text-yellow-400',
    blue: 'bg-blue-500/15 text-blue-400',
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
