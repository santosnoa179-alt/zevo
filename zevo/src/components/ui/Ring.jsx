// ═══════════════════════════════════════════════════════════
// RING — Progression circulaire (Apple Fitness-inspired)
// ═══════════════════════════════════════════════════════════
// Composant réutilisable pour afficher une progression en arc
// de cercle. Utilisé comme langage visuel unifié dans le Hub
// Client : score bien-être, macros nutrition, objectifs...
//
// Props:
//   value      : valeur actuelle (number)
//   max        : valeur max (défaut 100)
//   size       : diamètre total en px (défaut 64)
//   thickness  : épaisseur du trait (défaut auto selon size)
//   color      : couleur du ring actif (défaut var(--color-primary))
//   trackColor : couleur de la piste (défaut rgba blanc 6%)
//   gradient   : activer un dégradé (défaut false)
//   children   : contenu centre du ring (valeur, label, icône)
//   label      : label texte sous la valeur (optionnel)
//   animate    : animer au montage (défaut true)
// ═══════════════════════════════════════════════════════════

import { useEffect, useState, useId } from 'react'

export default function Ring({
  value = 0,
  max = 100,
  size = 64,
  thickness,
  color = 'var(--color-primary)',
  trackColor = 'var(--ring-track, rgba(255,255,255,0.06))',
  gradient = false,
  children,
  label,
  className = '',
  animate = true,
}) {
  // Épaisseur proportionnelle par défaut (8% du diamètre)
  const stroke = thickness ?? Math.max(3, Math.round(size * 0.085))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  // Clamp et calcul du pourcentage
  const safeMax = max > 0 ? max : 1
  const pct = Math.max(0, Math.min(1, value / safeMax))

  // Animation au montage : on interpole de 0 → pct
  const [anim, setAnim] = useState(animate ? 0 : pct)
  useEffect(() => {
    if (!animate) { setAnim(pct); return }
    const start = performance.now()
    const duration = 900
    let raf
    const tick = (t) => {
      const progress = Math.min(1, (t - start) / duration)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnim(pct * eased)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [pct, animate])

  const dashOffset = circumference * (1 - anim)

  // ID unique pour le gradient (évite collision si plusieurs rings)
  const gradId = useId().replace(/:/g, '')

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        style={{ overflow: 'visible' }}
      >
        {gradient && (
          <defs>
            <linearGradient id={`ring-grad-${gradId}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.6" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
          </defs>
        )}
        {/* Piste de fond */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        {/* Arc de progression */}
        {pct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={gradient ? `url(#ring-grad-${gradId})` : color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke 200ms ease' }}
          />
        )}
      </svg>
      {/* Contenu central (valeur, label, icône) */}
      {(children || label) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {children}
          {label && (
            <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] mt-0.5 font-medium">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MULTIRING — Plusieurs anneaux concentriques (Apple Fitness)
// Usage : Nutrition macros, multi-objectifs
// ═══════════════════════════════════════════════════════════
//   rings: [{ value, max, color }, ...] (du + extérieur au + intérieur)
export function MultiRing({
  rings = [],
  size = 80,
  gap = 3,
  thickness,
  children,
  className = '',
  animate = true,
}) {
  const stroke = thickness ?? Math.max(3, Math.round(size * 0.085))

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {rings.map((ring, i) => {
        const innerSize = size - i * 2 * (stroke + gap)
        if (innerSize <= stroke * 2) return null
        return (
          <div
            key={i}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Ring
              value={ring.value}
              max={ring.max}
              size={innerSize}
              thickness={stroke}
              color={ring.color}
              trackColor={ring.trackColor || 'var(--ring-track, rgba(255,255,255,0.05))'}
              animate={animate}
            />
          </div>
        )
      })}
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {children}
        </div>
      )}
    </div>
  )
}
