// Logo Zevo — disponible en 3 tailles : sm | md | lg
// Variante "full" affiche le nom à côté, "icon" affiche uniquement l'icône
export function ZevoLogo({ size = 'md', variant = 'full', className = '' }) {
  const sizes = {
    sm: { icon: 28, font: 'text-base', gap: 'gap-2' },
    md: { icon: 36, font: 'text-xl',   gap: 'gap-2.5' },
    lg: { icon: 48, font: 'text-2xl',  gap: 'gap-3' },
  }
  const s = sizes[size]

  return (
    <div className={`inline-flex items-center ${s.gap} ${className}`}>
      {/* ── Icône SVG ── */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Fond arrondi */}
        <rect width="40" height="40" rx="10" fill="#FF6B2B" fillOpacity="0.12" />

        {/* Éclair stylisé — symbolise l'énergie / progression */}
        <path
          d="M23 6L11 22H20L17 34L29 18H20L23 6Z"
          fill="url(#zevoGrad)"
          strokeLinejoin="round"
        />

        {/* Dégradé orange → orange clair */}
        <defs>
          <linearGradient id="zevoGrad" x1="11" y1="6" x2="29" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF9A6C" />
            <stop offset="100%" stopColor="#FF6B2B" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── Nom ── */}
      {variant === 'full' && (
        <span className={`font-bold tracking-tight text-[#F5F5F3] ${s.font}`}>
          Zevo
        </span>
      )}
    </div>
  )
}
