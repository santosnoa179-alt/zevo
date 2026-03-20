import { useState, useEffect, useCallback } from 'react'

// Couleurs des confettis
const COLORS = ['#FF6B2B', '#FF9A6C', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4']

function randomBetween(a, b) {
  return Math.random() * (b - a) + a
}

// Un seul confetti
function ConfettiPiece({ color, style }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        width: randomBetween(6, 10),
        height: randomBetween(4, 8),
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        ...style,
      }}
    />
  )
}

/**
 * Composant Confetti — affiche une explosion de confettis
 * @param {boolean} active - Déclenche l'animation quand passe à true
 * @param {number} duration - Durée d'affichage en ms (default 3000)
 * @param {number} count - Nombre de confettis (default 50)
 */
export function Confetti({ active, duration = 3000, count = 50 }) {
  const [pieces, setPieces] = useState([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!active) return

    const newPieces = Array.from({ length: count }, (_, i) => ({
      id: i,
      color: COLORS[i % COLORS.length],
      left: `${randomBetween(10, 90)}%`,
      animDelay: `${randomBetween(0, 0.5)}s`,
      animDuration: `${randomBetween(1.5, 3)}s`,
      rotate: `${randomBetween(0, 360)}deg`,
      translateY: `${randomBetween(200, 600)}px`,
      translateX: `${randomBetween(-150, 150)}px`,
      scale: randomBetween(0.5, 1.2),
    }))

    setPieces(newPieces)
    setVisible(true)

    const timer = setTimeout(() => {
      setVisible(false)
      setPieces([])
    }, duration)

    return () => clearTimeout(timer)
  }, [active, count, duration])

  if (!visible || pieces.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 animate-confetti-fall"
          style={{
            left: p.left,
            animationDelay: p.animDelay,
            animationDuration: p.animDuration,
            '--translate-y': p.translateY,
            '--translate-x': p.translateX,
            '--rotate': p.rotate,
          }}
        >
          <ConfettiPiece
            color={p.color}
            style={{ transform: `scale(${p.scale})` }}
          />
        </div>
      ))}
    </div>
  )
}

/**
 * Composant StreakMilestone — badge animé pour les milestones de streak
 * @param {number} streak - Nombre de jours consécutifs
 */
export function StreakMilestone({ streak }) {
  const [show, setShow] = useState(false)
  const [milestone, setMilestone] = useState(null)

  useEffect(() => {
    const milestones = [
      { days: 7, label: '1 semaine', emoji: '🔥' },
      { days: 14, label: '2 semaines', emoji: '💪' },
      { days: 30, label: '1 mois', emoji: '⭐' },
      { days: 60, label: '2 mois', emoji: '🏆' },
      { days: 100, label: '100 jours', emoji: '🎯' },
      { days: 365, label: '1 an', emoji: '👑' },
    ]

    const match = milestones.find(m => m.days === streak)
    if (match) {
      setMilestone(match)
      setShow(true)
      const timer = setTimeout(() => setShow(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [streak])

  if (!show || !milestone) return null

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] animate-bounce-in">
      <div className="bg-[#1E1E1E] border border-[#FF6B2B]/30 rounded-2xl px-6 py-4 shadow-2xl shadow-[#FF6B2B]/10 text-center">
        <span className="text-4xl block mb-2">{milestone.emoji}</span>
        <p className="text-[#F5F5F3] font-bold text-lg">Streak {milestone.label} !</p>
        <p className="text-white/40 text-xs mt-1">{streak} jours consécutifs — Continue comme ça !</p>
      </div>
    </div>
  )
}
