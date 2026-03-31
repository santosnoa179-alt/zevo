import { useState, useEffect, useRef } from 'react'

/**
 * Animated number counter — rolls up from 0 (or previous value) to target
 * @param {number} value - target number
 * @param {number} duration - animation duration in ms (default 800)
 * @param {number} decimals - decimal places (default 0)
 * @param {string} suffix - optional suffix like "%" or "kg"
 * @param {string} prefix - optional prefix like "€"
 */
export default function AnimatedNumber({
  value = 0,
  duration = 800,
  decimals = 0,
  suffix = '',
  prefix = '',
  className = '',
}) {
  const [display, setDisplay] = useState(0)
  const prevValue = useRef(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const from = prevValue.current
    const to = value
    const startTime = performance.now()

    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + (to - from) * eased

      setDisplay(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        prevValue.current = to
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, duration])

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display)

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  )
}
