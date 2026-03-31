import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard, Dumbbell, Target, MessageSquare, Sparkles,
  ArrowRight, X, Flame, Moon, Smile, Zap, ChevronRight
} from 'lucide-react'

// ─── CSS-in-JS styles ──────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
  },

  container: {
    position: 'relative',
    width: '100%',
    maxWidth: 480,
    margin: '0 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },

  // Progress dots
  dotsRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 32,
  },
  dot: (active, passed) => ({
    width: active ? 28 : 8,
    height: 8,
    borderRadius: 4,
    background: active ? '#FF6B2B' : passed ? 'rgba(255,107,43,0.5)' : 'rgba(255,255,255,0.12)',
    transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
  }),

  // Step card
  card: {
    width: '100%',
    borderRadius: 24,
    padding: '40px 28px 32px',
    background: 'linear-gradient(145deg, rgba(30,30,30,0.95), rgba(18,18,18,0.98))',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 0 80px rgba(255,107,43,0.06), 0 24px 48px rgba(0,0,0,0.5)',
    position: 'relative',
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 25,
    background: 'linear-gradient(135deg, rgba(255,107,43,0.25) 0%, transparent 40%, transparent 60%, rgba(255,107,43,0.1) 100%)',
    zIndex: -1,
    pointerEvents: 'none',
  },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
    pointerEvents: 'none',
  },

  // Icon circle
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(255,107,43,0.15), rgba(255,107,43,0.05))',
    border: '1px solid rgba(255,107,43,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },

  // Typography
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#F5F5F3',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 1.3,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 1.6,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 360,
    marginLeft: 'auto',
    marginRight: 'auto',
  },

  // Illustration containers
  illustration: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    marginBottom: 8,
  },

  // Buttons
  nextBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '14px 24px',
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(135deg, #FF6B2B, #e55a1b)',
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: '0 4px 20px rgba(255,107,43,0.3)',
    marginTop: 24,
  },
  skipBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    cursor: 'pointer',
    padding: '12px 16px',
    marginTop: 8,
    transition: 'color 0.2s',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.4)',
    transition: 'all 0.2s',
    zIndex: 2,
  },
}

// ─── Mini-illustration components ───────────────────────────────────────────

function DashboardPreview() {
  return (
    <div style={styles.illustration}>
      {/* Header row — streak + score */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{
          flex: 1, borderRadius: 12, padding: '12px 14px',
          background: 'linear-gradient(135deg, rgba(255,107,43,0.12), rgba(255,107,43,0.04))',
          border: '1px solid rgba(255,107,43,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Flame size={14} color="#FF6B2B" />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Streak</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#FF6B2B' }}>7j</div>
        </div>
        <div style={{
          flex: 1, borderRadius: 12, padding: '12px 14px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Smile size={14} color="#4ADE80" />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Score</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#4ADE80' }}>82</div>
        </div>
      </div>
      {/* Next session card */}
      <div style={{
        borderRadius: 12, padding: '12px 14px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Prochaine seance</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F3' }}>Upper Body</div>
        </div>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #FF6B2B, #e55a1b)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ChevronRight size={16} color="#fff" />
        </div>
      </div>
    </div>
  )
}

function WorkoutPreview() {
  const exercises = [
    { name: 'Developpe couche', sets: '4x10', accent: true },
    { name: 'Rowing halteres', sets: '3x12', accent: false },
    { name: 'Curl biceps', sets: '3x15', accent: false },
  ]
  return (
    <div style={styles.illustration}>
      {/* Session header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14, paddingBottom: 12,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F3' }}>Upper Body</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>45 min  -  12 exercices</div>
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: 8,
          background: 'rgba(255,107,43,0.12)',
          color: '#FF6B2B', fontSize: 11, fontWeight: 600,
        }}>Aujourd'hui</div>
      </div>
      {/* Exercise rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {exercises.map((ex, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 10px', borderRadius: 10,
            background: ex.accent ? 'rgba(255,107,43,0.06)' : 'transparent',
            border: ex.accent ? '1px solid rgba(255,107,43,0.1)' : '1px solid transparent',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 6, height: 6, borderRadius: 3,
                background: ex.accent ? '#FF6B2B' : 'rgba(255,255,255,0.15)',
              }} />
              <span style={{ fontSize: 13, color: '#F5F5F3' }}>{ex.name}</span>
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{ex.sets}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function GoalsPreview() {
  const goals = [
    { label: 'Poids', pct: 65, color: '#FF6B2B' },
    { label: 'Seances', pct: 80, color: '#4ADE80' },
    { label: 'Sommeil', pct: 45, color: '#60A5FA' },
  ]
  return (
    <div style={styles.illustration}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {goals.map((g, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{g.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: g.color }}>{g.pct}%</span>
            </div>
            <div style={{
              height: 8, borderRadius: 4,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${g.pct}%`, height: '100%', borderRadius: 4,
                background: `linear-gradient(90deg, ${g.color}, ${g.color}cc)`,
                boxShadow: `0 0 12px ${g.color}40`,
                transition: 'width 1s cubic-bezier(0.22,1,0.36,1)',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChatPreview() {
  return (
    <div style={styles.illustration}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Coach message */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #FF6B2B, #e55a1b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff',
          }}>C</div>
          <div style={{
            padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.06)',
            maxWidth: '75%',
          }}>
            <div style={{ fontSize: 13, color: '#F5F5F3', lineHeight: 1.5 }}>
              Super seance aujourd'hui ! On augmente la charge la prochaine fois ?
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>14:32</div>
          </div>
        </div>
        {/* Client message */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <div style={{
            padding: '10px 14px', borderRadius: '14px 14px 4px 14px',
            background: 'linear-gradient(135deg, rgba(255,107,43,0.15), rgba(255,107,43,0.08))',
            border: '1px solid rgba(255,107,43,0.15)',
            maxWidth: '75%',
          }}>
            <div style={{ fontSize: 13, color: '#F5F5F3', lineHeight: 1.5 }}>
              Oui, je me sens pret !
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4, textAlign: 'right' }}>14:33</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CelebrationPreview() {
  // Sparkle positions for the celebration step
  const sparkles = [
    { top: '10%', left: '15%', size: 6, delay: 0 },
    { top: '20%', right: '20%', size: 4, delay: 0.3 },
    { top: '60%', left: '10%', size: 5, delay: 0.6 },
    { top: '50%', right: '12%', size: 7, delay: 0.2 },
    { top: '80%', left: '25%', size: 4, delay: 0.8 },
    { top: '75%', right: '25%', size: 5, delay: 0.5 },
    { top: '35%', left: '80%', size: 3, delay: 0.4 },
    { top: '15%', left: '50%', size: 5, delay: 0.7 },
  ]

  return (
    <div style={{ position: 'relative', padding: '20px 0' }}>
      {sparkles.map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: s.top, left: s.left, right: s.right,
          width: s.size, height: s.size,
          borderRadius: '50%',
          background: '#FF6B2B',
          boxShadow: '0 0 8px #FF6B2B, 0 0 16px rgba(255,107,43,0.3)',
          animation: `tutorialSparkle 2s ${s.delay}s ease-in-out infinite`,
          pointerEvents: 'none',
        }} />
      ))}
      <div style={{
        width: 100, height: 100, borderRadius: '50%', margin: '0 auto',
        background: 'linear-gradient(135deg, rgba(255,107,43,0.2), rgba(255,107,43,0.05))',
        border: '2px solid rgba(255,107,43,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 40px rgba(255,107,43,0.15)',
      }}>
        <Zap size={40} color="#FF6B2B" />
      </div>
    </div>
  )
}

// ─── Step definitions ───────────────────────────────────────────────────────

const STEPS = [
  {
    key: 'welcome',
    emoji: '',
    title: 'Bienvenue dans ton espace',
    subtitle: 'Ton dashboard personnel te donne un apercu complet de ta journee.',
    Icon: LayoutDashboard,
    Illustration: DashboardPreview,
    showLogo: true,
  },
  {
    key: 'workouts',
    emoji: '',
    title: 'Tes seances d\'entrainement',
    subtitle: 'Ton coach t\'assigne des seances personnalisees. Lance-les directement depuis l\'app et suis ta progression en temps reel.',
    Icon: Dumbbell,
    Illustration: WorkoutPreview,
  },
  {
    key: 'goals',
    emoji: '',
    title: 'Tes objectifs & suivi',
    subtitle: 'Suis tes objectifs avec des jauges visuelles. Enregistre tes mensurations et vois ta progression semaine apres semaine.',
    Icon: Target,
    Illustration: GoalsPreview,
  },
  {
    key: 'chat',
    emoji: '',
    title: 'Ton coach, toujours connecte',
    subtitle: 'Envoie des messages, partage tes resultats. Ton coach recoit tout en temps reel.',
    Icon: MessageSquare,
    Illustration: ChatPreview,
  },
  {
    key: 'ready',
    emoji: '',
    title: 'C\'est parti !',
    subtitle: 'Ton espace est pret. Commence par completer ton check-in du jour !',
    Icon: Sparkles,
    Illustration: CelebrationPreview,
    isFinal: true,
  },
]

const TOTAL = STEPS.length

// ─── Keyframe injection (runs once) ─────────────────────────────────────────

let stylesInjected = false
function injectKeyframes() {
  if (stylesInjected) return
  stylesInjected = true
  const css = `
    @keyframes tutorialFadeIn {
      from { opacity: 0; transform: translateY(20px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes tutorialFadeOut {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to   { opacity: 0; transform: translateY(-16px) scale(0.97); }
    }
    @keyframes tutorialOverlayIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes tutorialPulse {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50%      { transform: scale(1.08); opacity: 1; }
    }
    @keyframes tutorialSparkle {
      0%, 100% { opacity: 0.2; transform: scale(0.6); }
      50%      { opacity: 1;   transform: scale(1.2); }
    }
    @keyframes tutorialBarGrow {
      from { width: 0%; }
    }
  `
  const el = document.createElement('style')
  el.textContent = css
  document.head.appendChild(el)
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function AppTutorial({ onComplete }) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [animState, setAnimState] = useState('in') // 'in' | 'out'
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    injectKeyframes()
  }, [])

  // Mark tutorial as seen in Supabase
  const markSeen = useCallback(async () => {
    if (!user) return
    try {
      await supabase
        .from('profiles')
        .update({ tutorial_seen: true })
        .eq('id', user.id)
    } catch (err) {
      console.error('Erreur sauvegarde tutorial_seen:', err)
    }
  }, [user])

  const finish = useCallback(async () => {
    await markSeen()
    setVisible(false)
    // Short delay for fade-out before calling parent callback
    setTimeout(() => onComplete?.(), 300)
  }, [markSeen, onComplete])

  const goNext = useCallback(() => {
    if (currentStep >= TOTAL - 1) {
      finish()
      return
    }
    // Animate out, then switch step and animate in
    setAnimState('out')
    setTimeout(() => {
      setCurrentStep((s) => s + 1)
      setAnimState('in')
    }, 280)
  }, [currentStep, finish])

  const skip = useCallback(() => {
    finish()
  }, [finish])

  if (!visible) return null

  const step = STEPS[currentStep]
  const { Icon, Illustration } = step

  const cardAnim = animState === 'in'
    ? 'tutorialFadeIn 0.45s cubic-bezier(0.22,1,0.36,1) forwards'
    : 'tutorialFadeOut 0.25s ease-in forwards'

  return (
    <div
      style={{
        ...styles.overlay,
        animation: 'tutorialOverlayIn 0.4s ease forwards',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div style={styles.container}>
        {/* ── Progress dots ── */}
        <div style={styles.dotsRow}>
          {STEPS.map((_, i) => (
            <div key={i} style={styles.dot(i === currentStep, i < currentStep)} />
          ))}
        </div>

        {/* ── Step card ── */}
        <div
          key={step.key}
          style={{
            ...styles.card,
            animation: cardAnim,
          }}
        >
          <div style={styles.cardGlow} />
          <div style={styles.cardShine} />

          {/* Close button */}
          <button
            onClick={skip}
            style={styles.closeBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
            }}
            aria-label="Fermer le tutoriel"
          >
            <X size={16} />
          </button>

          {/* Icon or pulsing logo */}
          {step.showLogo ? (
            <div style={{
              ...styles.iconCircle,
              animation: 'tutorialPulse 2.5s ease-in-out infinite',
            }}>
              <LayoutDashboard size={32} color="#FF6B2B" />
            </div>
          ) : (
            <div style={styles.iconCircle}>
              <Icon size={32} color="#FF6B2B" />
            </div>
          )}

          {/* Text content */}
          <h2 style={styles.title}>{step.title}</h2>
          <p style={styles.subtitle}>{step.subtitle}</p>

          {/* Illustration */}
          <Illustration />

          {/* CTA button */}
          <button
            onClick={goNext}
            style={styles.nextBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 6px 28px rgba(255,107,43,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,107,43,0.3)'
            }}
          >
            {step.isFinal ? 'Commencer' : 'Suivant'}
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Skip link (hidden on final step) */}
        {!step.isFinal && (
          <button
            onClick={skip}
            style={styles.skipBtn}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
          >
            Passer le tutoriel
          </button>
        )}
      </div>
    </div>
  )
}
