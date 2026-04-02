import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { sendInvitation } from '../lib/invitations'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './ui/Toast'
import {
  ArrowRight, X, ChevronRight, Check, Copy, ExternalLink,
  Users, Dumbbell, UtensilsCrossed, MessageCircle,
  BarChart3, CalendarDays, Trophy, Target,
  Sparkles, Zap, Crown, LayoutDashboard,
  BookOpen, Settings, Rocket, UserPlus, Mail,
  Loader2, Send, PartyPopper,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
// STEPS CONFIG
// ═══════════════════════════════════════════════════════════════════════════
// phase: 'tour' = guided tour on sidebar | 'invite' = interactive invitation flow
// target: CSS selector for spotlight (null = centered modal)

const STEPS = [
  // ── Phase 1: Tour de l'interface ──
  {
    phase: 'tour',
    key: 'welcome',
    target: null,
    position: 'center',
    icon: Rocket,
    title: 'Bienvenue sur Zevo ! 🚀',
    description: 'Ton espace de coaching tout-en-un est prêt. Laisse-moi te faire un tour rapide pour découvrir toutes les fonctionnalités.',
    btnLabel: "C'est parti",
  },
  {
    phase: 'tour',
    key: 'dashboard',
    target: 'a[href="/coach/dashboard"]',
    position: 'right',
    icon: LayoutDashboard,
    title: 'Tableau de bord',
    description: 'Ta vue d\'ensemble. Retrouve tes statistiques, tes prochaines séances et l\'activité récente de tes clients.',
    btnLabel: 'Suivant',
  },
  {
    phase: 'tour',
    key: 'clients',
    target: 'a[href="/coach/client-hub"]',
    position: 'right',
    icon: Users,
    title: 'Hub Clients',
    description: 'Gère tous tes clients ici. Invite-les par email, consulte leur fiche 360° et suis leur progression en temps réel.',
    btnLabel: 'Suivant',
  },
  {
    phase: 'tour',
    key: 'calendar',
    target: 'a[href="/coach/calendar"]',
    position: 'right',
    icon: CalendarDays,
    title: 'Calendrier',
    description: 'Planifie tes séances, tes rendez-vous et tes rappels. Tout ton emploi du temps coaching centralisé.',
    btnLabel: 'Suivant',
  },
  {
    phase: 'tour',
    key: 'messages',
    target: 'a[href="/coach/messages"]',
    position: 'right',
    icon: MessageCircle,
    title: 'Messages',
    description: 'Communique directement avec tes clients via la messagerie intégrée en temps réel.',
    btnLabel: 'Suivant',
  },
  {
    phase: 'tour',
    key: 'sport',
    target: 'a[href="/coach/sport"]',
    position: 'right',
    icon: Trophy,
    title: 'Programmes Sport',
    description: 'Crée des programmes sportifs sur mesure avec phases, exercices et séries. Assigne-les en un clic.',
    btnLabel: 'Suivant',
  },
  {
    phase: 'tour',
    key: 'nutrition',
    target: 'a[href="/coach/nutrition"]',
    position: 'right',
    icon: UtensilsCrossed,
    title: 'Plans Nutrition',
    description: 'Construis des plans alimentaires personnalisés avec repas, macros et aliments.',
    btnLabel: 'Suivant',
  },
  {
    phase: 'tour',
    key: 'stats',
    target: 'a[href="/coach/statistiques"]',
    position: 'right',
    icon: BarChart3,
    title: 'Statistiques',
    description: 'Analyse la progression de tes clients, le taux de complétion et ton activité globale.',
    btnLabel: 'Suivant',
  },

  // ── Phase 2: Invitation du premier client ──
  {
    phase: 'invite',
    key: 'invite-intro',
    target: null,
    position: 'center',
    icon: UserPlus,
    title: 'Invite ton premier client 🎯',
    description: 'Le meilleur moyen de démarrer, c\'est d\'inviter ton premier client. On va le faire ensemble maintenant !',
    btnLabel: 'Inviter un client',
    showSkipInvite: true,
  },
  {
    phase: 'invite',
    key: 'invite-form',
    target: null,
    position: 'center',
    icon: Mail,
    title: 'Les infos de ton client',
    description: 'Renseigne le prénom et l\'email de ton client. Il recevra un lien pour créer son compte.',
    isForm: true,
  },
  {
    phase: 'invite',
    key: 'invite-success',
    target: null,
    position: 'center',
    icon: Check,
    title: 'Invitation envoyée ! 🎉',
    description: '',
    isSuccess: true,
    btnLabel: 'Terminer',
  },
  {
    phase: 'invite',
    key: 'celebration',
    target: null,
    position: 'center',
    icon: Crown,
    title: 'Tu es prêt à coacher ! 👑',
    description: 'Ton espace est configuré et ton premier client a été invité. Tu peux relancer ce tour à tout moment depuis le bouton "Démarrage" dans la sidebar.',
    isFinal: true,
    btnLabel: 'C\'est parti !',
  },
]

const TOTAL = STEPS.length
const TOUR_STEPS = STEPS.filter(s => s.phase === 'tour').length

// ═══════════════════════════════════════════════════════════════════════════
// KEYFRAME INJECTION
// ═══════════════════════════════════════════════════════════════════════════

let injected = false
function injectKeyframes() {
  if (injected) return
  injected = true
  const css = `
    @keyframes ctFadeIn {
      from { opacity: 0; transform: translateY(12px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes ctFadeOut {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to   { opacity: 0; transform: translateY(-8px) scale(0.97); }
    }
    @keyframes ctOverlayIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes ctSpotlightPulse {
      0%, 100% { box-shadow: 0 0 0 4px rgba(255,107,43,0.25), 0 0 20px rgba(255,107,43,0.12); }
      50%      { box-shadow: 0 0 0 6px rgba(255,107,43,0.4), 0 0 30px rgba(255,107,43,0.2); }
    }
    @keyframes ctBounce {
      0%, 100% { transform: translateX(0); }
      50%      { transform: translateX(4px); }
    }
    @keyframes ctCheckPop {
      0%   { transform: scale(0); opacity: 0; }
      50%  { transform: scale(1.2); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes ctConfetti1 { 0% { transform: translateY(0) rotate(0deg); opacity:1; } 100% { transform: translateY(-60px) rotate(180deg); opacity:0; } }
    @keyframes ctConfetti2 { 0% { transform: translateY(0) rotate(0deg); opacity:1; } 100% { transform: translateY(-50px) rotate(-120deg); opacity:0; } }
    @keyframes ctConfetti3 { 0% { transform: translateY(0) rotate(0deg); opacity:1; } 100% { transform: translateY(-70px) rotate(240deg); opacity:0; } }
    @keyframes ctShine {
      from { left: -100%; }
      to   { left: 200%; }
    }
  `
  const el = document.createElement('style')
  el.textContent = css
  document.head.appendChild(el)
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function CoachTutorial({ onComplete, coachName }) {
  const { user } = useAuth()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [animState, setAnimState] = useState('in')
  const [visible, setVisible] = useState(true)
  const [targetRect, setTargetRect] = useState(null)
  const tooltipRef = useRef(null)

  // ── Invitation form state ──
  const [invitePrenom, setInvitePrenom] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteResult, setInviteResult] = useState(null) // { email, lien, prenom }
  const [copied, setCopied] = useState(false)

  useEffect(() => { injectKeyframes() }, [])

  // ── Resolve target element ──
  useEffect(() => {
    const current = STEPS[step]
    if (!current.target) { setTargetRect(null); return }
    const timer = setTimeout(() => {
      const el = document.querySelector(current.target)
      if (el) {
        const rect = el.getBoundingClientRect()
        setTargetRect(rect)
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      } else {
        setTargetRect(null)
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [step])

  // ── Recalc on resize ──
  useEffect(() => {
    const handle = () => {
      const current = STEPS[step]
      if (!current.target) return
      const el = document.querySelector(current.target)
      if (el) setTargetRect(el.getBoundingClientRect())
    }
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [step])

  // ── Mark tutorial done ──
  const markSeen = useCallback(async () => {
    if (!user) return
    try {
      await supabase.from('coaches').update({ tutorial_coach_done: true }).eq('id', user.id)
    } catch (err) { console.error('[CoachTutorial] save error:', err) }
  }, [user])

  const finish = useCallback(async () => {
    await markSeen()
    setVisible(false)
    setTimeout(() => onComplete?.(), 350)
  }, [markSeen, onComplete])

  const goNext = useCallback(() => {
    if (step >= TOTAL - 1) { finish(); return }
    setAnimState('out')
    setTimeout(() => { setStep(s => s + 1); setAnimState('in') }, 250)
  }, [step, finish])

  const goBack = useCallback(() => {
    if (step <= 0) return
    setAnimState('out')
    setTimeout(() => { setStep(s => s - 1); setAnimState('in') }, 250)
  }, [step])

  const skip = useCallback(() => { finish() }, [finish])

  // ── Skip invitation and go to final celebration ──
  const skipInvite = useCallback(() => {
    setAnimState('out')
    const finalIdx = STEPS.findIndex(s => s.key === 'celebration')
    setTimeout(() => { setStep(finalIdx); setAnimState('in') }, 250)
  }, [])

  // ── Send invitation (via shared utility) ──
  const handleSendInvite = useCallback(async () => {
    if (!inviteEmail.trim() || !invitePrenom.trim()) {
      setInviteError('Remplis les deux champs pour continuer.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      setInviteError('Vérifie le format de l\'email.')
      return
    }
    setInviteSending(true)
    setInviteError('')

    const result = await sendInvitation({
      coachId: user.id,
      email: inviteEmail.trim(),
      prenom: invitePrenom.trim(),
      coachName: coachName || '',
    })

    if (!result.success) {
      setInviteError(result.error)
      setInviteSending(false)
      return
    }

    setInviteResult({ email: inviteEmail.trim(), lien: result.lien, prenom: invitePrenom.trim() })

    if (result.emailSent) {
      toast.success(`Email d'invitation envoyé à ${inviteEmail.trim()} !`)
    } else if (result.emailError) {
      toast.info(result.emailError)
    }

    // Auto-advance to success step
    setAnimState('out')
    setTimeout(() => {
      setStep(STEPS.findIndex(s => s.key === 'invite-success'))
      setAnimState('in')
    }, 250)

    setInviteSending(false)
  }, [user, inviteEmail, invitePrenom, coachName, toast])

  // ── Copy link ──
  const copyLink = useCallback(() => {
    if (!inviteResult?.lien) return
    navigator.clipboard.writeText(inviteResult.lien)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }, [inviteResult])

  if (!visible) return null

  const current = STEPS[step]
  const Icon = current.icon
  const hasTarget = !!targetRect
  const isTourPhase = current.phase === 'tour'

  // Progress: tour = first portion, invite = second portion
  const tourPct = isTourPhase
    ? ((step + 1) / TOUR_STEPS) * 60
    : 60 + ((step - TOUR_STEPS + 1) / (TOTAL - TOUR_STEPS)) * 40
  const progressPct = Math.min(100, tourPct)

  const tooltipAnim = animState === 'in'
    ? 'ctFadeIn 0.4s cubic-bezier(0.22,1,0.36,1) forwards'
    : 'ctFadeOut 0.2s ease-in forwards'

  // ── Spotlight padding ──
  const spotPad = 6
  const spotRadius = 12

  // ── Tooltip position ──
  const getTooltipStyle = () => {
    if (!hasTarget || current.position === 'center') {
      return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }
    if (current.position === 'right') {
      return {
        position: 'fixed',
        top: Math.max(16, targetRect.top + targetRect.height / 2 - 80),
        left: targetRect.right + 16,
      }
    }
    if (current.position === 'bottom') {
      return {
        position: 'fixed',
        top: targetRect.bottom + 16,
        left: Math.max(16, targetRect.left + targetRect.width / 2 - 180),
      }
    }
    return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }

  // ════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      animation: 'ctOverlayIn 0.4s ease forwards',
    }}>

      {/* ── Dark overlay with spotlight cutout ── */}
      <svg width="100%" height="100%" style={{ position: 'fixed', inset: 0, zIndex: 9999 }} onClick={skip}>
        <defs>
          <mask id="ct-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {hasTarget && (
              <rect
                x={targetRect.left - spotPad} y={targetRect.top - spotPad}
                width={targetRect.width + spotPad * 2} height={targetRect.height + spotPad * 2}
                rx={spotRadius} ry={spotRadius} fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.82)" mask="url(#ct-spotlight-mask)" />
      </svg>

      {/* ── Spotlight ring ── */}
      {hasTarget && (
        <div style={{
          position: 'fixed',
          top: targetRect.top - spotPad, left: targetRect.left - spotPad,
          width: targetRect.width + spotPad * 2, height: targetRect.height + spotPad * 2,
          borderRadius: spotRadius,
          border: '2px solid rgba(255,107,43,0.5)',
          animation: 'ctSpotlightPulse 2s ease-in-out infinite',
          zIndex: 10000, pointerEvents: 'none',
        }} />
      )}

      {/* ══════════════════════════════════════ */}
      {/* TOOLTIP CARD                          */}
      {/* ══════════════════════════════════════ */}
      <div
        ref={tooltipRef}
        onClick={e => e.stopPropagation()}
        style={{
          ...getTooltipStyle(),
          zIndex: 10001,
          width: current.phase === 'invite' ? 440 : (hasTarget ? 360 : 420),
          animation: tooltipAnim,
        }}
      >
        {/* Arrow left (sidebar tooltips) */}
        {hasTarget && current.position === 'right' && (
          <div style={{
            position: 'absolute', left: -8, top: 24,
            width: 0, height: 0,
            borderTop: '8px solid transparent', borderBottom: '8px solid transparent',
            borderRight: '8px solid var(--bg-card)',
          }} />
        )}

        <div style={{
          background: 'linear-gradient(160deg, var(--bg-card), var(--bg-base))',
          border: '1px solid var(--border-base)',
          borderRadius: 20,
          padding: hasTarget ? '24px 24px 20px' : '32px 28px 24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(255,107,43,0.08)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Glow line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: current.phase === 'invite'
              ? 'linear-gradient(90deg, transparent, rgba(255,107,43,0.4), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(255,107,43,0.3), transparent)',
            pointerEvents: 'none',
          }} />

          {/* Close */}
          <button onClick={skip} style={{
            position: 'absolute', top: 12, right: 12,
            background: 'var(--bg-surface)', border: '1px solid var(--border-base)',
            borderRadius: 8, width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated, rgba(255,255,255,0.1))'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <X size={14} />
          </button>

          {/* Progress bar */}
          <div style={{
            width: '100%', height: 3, borderRadius: 2,
            background: 'var(--bg-surface)',
            marginBottom: 18, overflow: 'hidden',
          }}>
            <div style={{
              width: `${progressPct}%`, height: '100%', borderRadius: 2,
              background: 'linear-gradient(90deg, #FF6B2B, #FF9A6C)',
              transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)',
            }} />
          </div>

          {/* ── Header: Icon + Title ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{
              width: hasTarget ? 40 : 52, height: hasTarget ? 40 : 52,
              borderRadius: hasTarget ? 12 : 14,
              background: current.isSuccess
                ? 'linear-gradient(135deg, rgba(74,222,128,0.15), rgba(74,222,128,0.05))'
                : 'linear-gradient(135deg, rgba(255,107,43,0.15), rgba(255,107,43,0.05))',
              border: current.isSuccess
                ? '1.5px solid rgba(74,222,128,0.25)'
                : '1.5px solid rgba(255,107,43,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              ...(current.isSuccess ? { animation: 'ctCheckPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards' } : {}),
            }}>
              <Icon size={hasTarget ? 20 : 26} color={current.isSuccess ? '#4ADE80' : '#FF6B2B'} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
                textTransform: 'uppercase', marginBottom: 2,
                color: isTourPhase ? '#FF6B2B' : '#FF9A6C',
              }}>
                {isTourPhase ? `Découverte ${step + 1}/${TOUR_STEPS}` : 'Première action'}
              </div>
              <h3 style={{
                fontSize: hasTarget ? 18 : 20, fontWeight: 700,
                color: 'var(--text-primary)', lineHeight: 1.2, margin: 0,
              }}>
                {current.title}
              </h3>
            </div>
          </div>

          {/* ── Description ── */}
          {current.description && (
            <p style={{
              fontSize: 14, lineHeight: 1.65, color: 'var(--text-secondary)',
              margin: '0 0 20px 0',
            }}>
              {current.description}
            </p>
          )}

          {/* ══════════════════════════════════════ */}
          {/* WELCOME STEP: Coach greeting          */}
          {/* ══════════════════════════════════════ */}
          {current.key === 'welcome' && coachName && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 14,
              background: 'rgba(255,107,43,0.06)', border: '1px solid rgba(255,107,43,0.1)',
              marginBottom: 20,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #FF6B2B, #e55a1b)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, color: '#fff',
                boxShadow: '0 0 20px rgba(255,107,43,0.2)',
              }}>
                {coachName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Salut {coachName} 👋
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  On va explorer ton espace ensemble
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════ */}
          {/* INVITE INTRO: visual teaser            */}
          {/* ══════════════════════════════════════ */}
          {current.key === 'invite-intro' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '16px', borderRadius: 14,
              background: 'rgba(255,107,43,0.04)',
              border: '1px solid rgba(255,107,43,0.08)',
              marginBottom: 20,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: -8,
              }}>
                {['M', 'L', '+'].map((letter, i) => (
                  <div key={i} style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: i < 2
                      ? `linear-gradient(135deg, rgba(255,107,43,${0.15 + i * 0.1}), rgba(255,107,43,0.05))`
                      : 'var(--bg-surface)',
                    border: i < 2
                      ? '2px solid rgba(255,107,43,0.2)'
                      : '2px dashed var(--border-base)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700,
                    color: i < 2 ? '#FF6B2B' : 'var(--text-muted)',
                    marginLeft: i > 0 ? -8 : 0,
                    zIndex: 3 - i,
                  }}>
                    {letter}
                  </div>
                ))}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Tes futurs clients
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Un lien d'invitation suffit pour démarrer
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════ */}
          {/* INVITE FORM                            */}
          {/* ══════════════════════════════════════ */}
          {current.isForm && (
            <div style={{ marginBottom: 20 }}>
              {/* Prénom */}
              <div style={{ marginBottom: 14 }}>
                <label style={{
                  display: 'block', fontSize: 12, fontWeight: 600,
                  color: 'var(--text-secondary)', marginBottom: 6,
                }}>
                  Prénom du client
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0 14px', height: 44, borderRadius: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-base)',
                  transition: 'border-color 0.2s',
                }}>
                  <Users size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Ex: Lucas"
                    value={invitePrenom}
                    onChange={e => setInvitePrenom(e.target.value)}
                    autoFocus
                    style={{
                      flex: 1, background: 'none', border: 'none', outline: 'none',
                      color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: 14 }}>
                <label style={{
                  display: 'block', fontSize: 12, fontWeight: 600,
                  color: 'var(--text-secondary)', marginBottom: 6,
                }}>
                  Email du client
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0 14px', height: 44, borderRadius: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-base)',
                  transition: 'border-color 0.2s',
                }}>
                  <Mail size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <input
                    type="email"
                    placeholder="client@email.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSendInvite() }}
                    style={{
                      flex: 1, background: 'none', border: 'none', outline: 'none',
                      color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              {/* Hint */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '10px 12px', borderRadius: 10,
                background: 'rgba(96,165,250,0.06)',
                border: '1px solid rgba(96,165,250,0.1)',
                marginBottom: 4,
              }}>
                <Sparkles size={14} style={{ color: '#60A5FA', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)' }}>
                  Ton client recevra un lien personnalisé pour créer son compte et accéder directement à son espace.
                </span>
              </div>

              {/* Error */}
              {inviteError && (
                <div style={{
                  marginTop: 10, padding: '8px 12px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                  fontSize: 12, color: '#EF4444',
                }}>
                  {inviteError}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════ */}
          {/* INVITE SUCCESS                         */}
          {/* ══════════════════════════════════════ */}
          {current.isSuccess && inviteResult && (
            <div style={{ marginBottom: 20 }}>
              {/* Confetti dots */}
              <div style={{ position: 'relative', height: 0, overflow: 'visible' }}>
                {[
                  { left: '15%', color: '#FF6B2B', anim: 'ctConfetti1 1s ease-out forwards', delay: '0s' },
                  { left: '40%', color: '#4ADE80', anim: 'ctConfetti2 1.1s ease-out forwards', delay: '0.1s' },
                  { left: '65%', color: '#60A5FA', anim: 'ctConfetti3 0.9s ease-out forwards', delay: '0.05s' },
                  { left: '85%', color: '#FF6B2B', anim: 'ctConfetti1 1.2s ease-out forwards', delay: '0.15s' },
                ].map((c, i) => (
                  <div key={i} style={{
                    position: 'absolute', top: -8, left: c.left,
                    width: 6, height: 6, borderRadius: '50%',
                    background: c.color, animation: c.anim, animationDelay: c.delay,
                    pointerEvents: 'none',
                  }} />
                ))}
              </div>

              {/* Client card */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '16px', borderRadius: 14,
                background: 'rgba(74,222,128,0.04)',
                border: '1px solid rgba(74,222,128,0.12)',
                marginBottom: 16,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(74,222,128,0.15), rgba(74,222,128,0.05))',
                  border: '1.5px solid rgba(74,222,128,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: '#4ADE80',
                }}>
                  {inviteResult.prenom.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {inviteResult.prenom}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                    {inviteResult.email}
                  </div>
                </div>
                <div style={{
                  padding: '5px 10px', borderRadius: 8,
                  background: 'rgba(74,222,128,0.1)',
                  border: '1px solid rgba(74,222,128,0.15)',
                  fontSize: 11, fontWeight: 600, color: '#4ADE80',
                }}>
                  Invité ✓
                </div>
              </div>

              {/* Invitation link */}
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 600,
                color: 'var(--text-secondary)', marginBottom: 6,
              }}>
                Lien d'invitation à partager
              </label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', borderRadius: 12,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-base)',
                marginBottom: 12,
              }}>
                <div style={{
                  flex: 1, fontSize: 12, color: 'var(--text-secondary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: 'monospace',
                }}>
                  {inviteResult.lien}
                </div>
                <button
                  onClick={copyLink}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 8, border: 'none',
                    background: copied ? 'rgba(74,222,128,0.12)' : 'rgba(255,107,43,0.12)',
                    color: copied ? '#4ADE80' : '#FF6B2B',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s', flexShrink: 0,
                  }}
                >
                  {copied ? <><Check size={13} /> Copié</> : <><Copy size={13} /> Copier</>}
                </button>
              </div>

              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '10px 12px', borderRadius: 10,
                background: 'rgba(255,107,43,0.04)', border: '1px solid rgba(255,107,43,0.08)',
              }}>
                <Send size={13} style={{ color: '#FF6B2B', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)' }}>
                  Envoie ce lien à <strong style={{ color: 'var(--text-primary)' }}>{inviteResult.prenom}</strong> par email, SMS ou WhatsApp. Il pourra créer son compte en un clic.
                </span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════ */}
          {/* FINAL CELEBRATION                      */}
          {/* ══════════════════════════════════════ */}
          {current.isFinal && (
            <div style={{
              display: 'flex', gap: 8, marginBottom: 20,
            }}>
              {[
                { icon: Trophy, label: 'Créer un programme', color: '#FF6B2B' },
                { icon: UtensilsCrossed, label: 'Plan nutrition', color: '#4ADE80' },
                { icon: CalendarDays, label: 'Planifier', color: '#60A5FA' },
              ].map((action, i) => {
                const AIcon = action.icon
                return (
                  <div key={i} style={{
                    flex: 1, padding: '12px 8px', borderRadius: 12,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-base)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 6, textAlign: 'center',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10,
                      background: `${action.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <AIcon size={16} color={action.color} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {action.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* ══════════════════════════════════════ */}
          {/* BUTTONS                                */}
          {/* ══════════════════════════════════════ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Back (tour steps only, not invite flow) */}
            {step > 0 && !current.isForm && !current.isSuccess && (
              <button onClick={goBack} style={{
                padding: '10px 16px', borderRadius: 12,
                border: '1px solid var(--border-base)',
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated, rgba(255,255,255,0.08))'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                Retour
              </button>
            )}

            {/* Main CTA */}
            {current.isForm ? (
              // ── Send invitation button ──
              <button
                onClick={handleSendInvite}
                disabled={inviteSending}
                style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '13px 20px', borderRadius: 12, border: 'none',
                  background: inviteSending
                    ? 'rgba(255,107,43,0.5)'
                    : 'linear-gradient(135deg, #FF6B2B, #e55a1b)',
                  color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: inviteSending ? 'not-allowed' : 'pointer',
                  transition: 'all 0.25s',
                  boxShadow: '0 4px 20px rgba(255,107,43,0.3)',
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => { if (!inviteSending) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(255,107,43,0.4)' } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,107,43,0.3)' }}
              >
                {inviteSending ? (
                  <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Envoi en cours...</>
                ) : (
                  <><Send size={16} /> Envoyer l'invitation</>
                )}
              </button>
            ) : (
              // ── Standard Next / Finish button ──
              <button onClick={goNext} style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 20px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #FF6B2B, #e55a1b)',
                color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.25s',
                boxShadow: '0 4px 20px rgba(255,107,43,0.3)',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(255,107,43,0.4)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,107,43,0.3)' }}
              >
                {current.btnLabel}
                {!current.isFinal && (
                  <ArrowRight size={16} style={{ animation: 'ctBounce 1.5s ease-in-out infinite' }} />
                )}
                {current.isFinal && <Zap size={16} />}
              </button>
            )}
          </div>

          {/* ── Skip invite link ── */}
          {current.showSkipInvite && (
            <button onClick={skipInvite} style={{
              display: 'block', width: '100%', textAlign: 'center',
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontSize: 12, cursor: 'pointer', padding: '10px 0 0', marginTop: 4,
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              Je le ferai plus tard
            </button>
          )}

          {/* ── Skip form link ── */}
          {current.isForm && (
            <button onClick={skipInvite} style={{
              display: 'block', width: '100%', textAlign: 'center',
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontSize: 12, cursor: 'pointer', padding: '10px 0 0', marginTop: 4,
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              Passer cette étape
            </button>
          )}

          {/* ── Skip tour link (tour phase only) ── */}
          {isTourPhase && !current.isFinal && step > 0 && (
            <button onClick={skip} style={{
              display: 'block', width: '100%', textAlign: 'center',
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontSize: 11, cursor: 'pointer', padding: '8px 0 0', marginTop: 2,
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              Passer le tour
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
