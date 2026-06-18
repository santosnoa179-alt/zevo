// Logo Zevo — disponible en 3 tailles : sm | md | lg
// SVG inline pour supporter currentColor (dark/light mode)
export function ZevoLogo({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 88"
      className={`${sizes[size]} w-auto flex-shrink-0 ${className}`}
      aria-label="Zevo"
    >
      <defs>
        <clipPath id="zevo-clip">
          <polygon points="0,0 88,0 88,61.6 61.6,88 0,88"/>
        </clipPath>
      </defs>
      {/* Icône fond orange + coin coupé */}
      <rect width="88" height="88" rx="18" fill="var(--color-primary)" clipPath="url(#zevo-clip)"/>
      {/* Z miroir blanc */}
      <rect x="12" y="12" width="64" height="11" fill="white"/>
      <polygon points="71,23 76,12 17,44 12,44" fill="white"/>
      <rect x="12" y="44" width="64" height="11" fill="white"/>
      <polygon points="12,55 17,44 76,75 71,75" fill="white"/>
      <rect x="12" y="65" width="64" height="11" fill="white"/>
      {/* Wordmark — hérite de la couleur texte du parent */}
      <text
        x="106"
        y="66"
        fontFamily="'Barlow Condensed', 'Arial Narrow', Impact, Arial, sans-serif"
        fontWeight="900"
        fontSize="72"
        letterSpacing="-1"
        fill="currentColor"
      >ZEVO</text>
    </svg>
  )
}
