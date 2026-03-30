// Logo Zevo — disponible en 3 tailles : sm | md | lg
// Le SVG inclut déjà le wordmark "ZEVO"
export function ZevoLogo({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
  }

  return (
    <img
      src="/icons/zevo-logo.svg"
      alt="Zevo"
      className={`${sizes[size]} object-contain flex-shrink-0 ${className}`}
    />
  )
}
