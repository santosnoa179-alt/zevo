// Logo Zevo — disponible en 3 tailles : sm | md | lg
// Variante "full" affiche le nom à côté, "icon" affiche uniquement l'icône
export function ZevoLogo({ size = 'md', variant = 'full', className = '' }) {
  const sizes = {
    sm: { h: 'h-9 w-9', font: 'text-lg', gap: 'gap-2.5' },
    md: { h: 'h-11 w-11', font: 'text-2xl',   gap: 'gap-3.5' },
    lg: { h: 'h-14 w-14', font: 'text-3xl',  gap: 'gap-4' },
  }
  const s = sizes[size]

  return (
    <div className={`inline-flex items-center ${s.gap} ${className}`}>
      <img
        src="/icons/Gemini_Generated_Image_vsyssevsyssevsys-Photoroom.png"
        alt="Zevo"
        className={`${s.h} rounded-xl object-contain flex-shrink-0`}
      />

      {/* ── Nom ── */}
      {variant === 'full' && (
        <span className={`font-extrabold tracking-tight text-[#F5F5F3] ${s.font}`}>
          Zevo
        </span>
      )}
    </div>
  )
}
