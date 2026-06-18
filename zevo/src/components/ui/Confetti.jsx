import { useState, useEffect, useCallback } from 'react'

// Couleurs des confettis
const COLORS = ['var(--color-primary)', 'var(--color-primary-light)', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4']

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
 * Composant StreakMilestone — popup premium pour les milestones de streak
 * @param {number} streak - Nombre de jours consécutifs
 */
export function StreakMilestone({ streak }) {
  const [show, setShow] = useState(false)
  const [milestone, setMilestone] = useState(null)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const milestones = [
      { days: 7, label: '1 semaine', sub: 'Première étape franchie', color: 'var(--color-primary)', icon: '7' },
      { days: 14, label: '2 semaines', sub: 'L\'habitude se forme', color: '#F59E0B', icon: '14' },
      { days: 30, label: '1 mois', sub: 'Discipline remarquable', color: '#10B981', icon: '30' },
      { days: 60, label: '2 mois', sub: 'Transformation en cours', color: '#3B82F6', icon: '60' },
      { days: 100, label: '100 jours', sub: 'Vous êtes inarrêtable', color: '#8B5CF6', icon: '100' },
      { days: 365, label: '1 an', sub: 'Légende vivante', color: '#EC4899', icon: '365' },
    ]

    const match = milestones.find(m => m.days === streak)
    if (match) {
      setMilestone(match)
      setExiting(false)
      setShow(true)
      const timer = setTimeout(() => {
        setExiting(true)
        setTimeout(() => setShow(false), 400)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [streak])

  if (!show || !milestone) return null

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-6 pointer-events-none">
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto
        ${exiting ? 'animate-[msOut_0.3s_ease-in_forwards]' : 'animate-[msIn_0.3s_ease-out_forwards]'}`}
        onClick={() => { setExiting(true); setTimeout(() => setShow(false), 400) }}
      />

      {/* Card */}
      <div className={`relative pointer-events-auto w-full max-w-[300px]
        ${exiting ? 'animate-[msCardOut_0.35s_ease-in_forwards]' : 'animate-[msCardIn_0.5s_cubic-bezier(0.22,1,0.36,1)_forwards]'}`}>
        <div className="relative overflow-hidden rounded-3xl bg-[var(--bg-card)] border border-[var(--border-base)]
          shadow-2xl" style={{ boxShadow: `0 24px 60px ${milestone.color}20, 0 0 40px ${milestone.color}10` }}>

          {/* Top glow */}
          <div className="absolute top-0 inset-x-0 h-32 opacity-20 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at center top, ${milestone.color}, transparent 70%)` }} />

          {/* Accent line */}
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, transparent, ${milestone.color}, transparent)` }} />

          <div className="relative px-8 pt-8 pb-7 text-center">
            {/* Big number badge */}
            <div className="relative w-20 h-20 mx-auto mb-5">
              <div className="absolute inset-0 rounded-2xl rotate-6 opacity-20"
                style={{ background: milestone.color }} />
              <div className="relative w-full h-full rounded-2xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${milestone.color}, ${milestone.color}cc)`,
                  boxShadow: `0 8px 24px ${milestone.color}40` }}>
                <span className="text-white text-2xl font-black">{milestone.icon}</span>
              </div>
              {/* Sparkle */}
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full
                bg-yellow-400 flex items-center justify-center
                shadow-lg shadow-yellow-400/30
                animate-[msSpark_1s_ease-in-out_infinite]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-[var(--text-primary)] text-xl font-extrabold tracking-tight mb-1">
              {milestone.label}
            </h3>
            <p className="text-[var(--text-muted)] text-sm mb-5">
              {milestone.sub}
            </p>

            {/* Streak count */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
              bg-[var(--bg-surface)] border border-[var(--border-base)]">
              <div className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: `${milestone.color}20` }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill={milestone.color}>
                  <path d="M12 23c-3.6 0-8-3.1-8-9.3C4 7.5 11.4 1 11.7.7c.2-.2.4-.2.6 0C12.6 1 20 7.5 20 13.7c0 6.2-4.4 9.3-8 9.3z"/>
                </svg>
              </div>
              <span className="text-[var(--text-primary)] text-sm font-bold">{streak} jours consécutifs</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes msIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes msOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes msCardIn {
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes msCardOut {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to { opacity: 0; transform: scale(0.9) translateY(-10px); }
        }
        @keyframes msSpark {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.2) rotate(15deg); }
        }
      `}</style>
    </div>
  )
}
