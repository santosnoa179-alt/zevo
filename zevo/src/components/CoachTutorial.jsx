import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { sendInvitation } from '../lib/invitations'
import { useAuth } from '../hooks/useAuth'
import { usePlanLimits } from '../hooks/usePlanLimits'
import { useToast } from './ui/Toast'
import {
  ArrowRight, X, Check, Copy,
  Users, Dumbbell, UtensilsCrossed, MessageCircle,
  BarChart3, CalendarDays, Trophy, Target,
  Sparkles, Zap, Crown, LayoutDashboard,
  Settings, Rocket, UserPlus, Mail,
  Loader2, Send,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
// STEPS CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const STEPS = [
  // ── Phase 1: Tour de l'interface ──
  {
    phase: 'tour',
    key: 'welcome',
    target: null,
    position: 'center',
    icon: Rocket,
    title: 'Bienvenue sur Zevo',
    description: 'Votre espace de coaching tout-en-un est prêt. Découvrons ensemble toutes les fonctionnalités en quelques secondes.',
    btnLabel: "C'est parti",
    accent: 'orange',
  },
  {
    phase: 'tour',
    key: 'dashboard',
    target: 'a[href="/coach/dashboard"]',
    position: 'right',
    icon: LayoutDashboard,
    title: 'Tableau de bord',
    description: 'Votre vue d\'ensemble : statistiques, prochaines séances et activité récente de vos clients.',
    btnLabel: 'Suivant',
    accent: 'orange',
  },
  {
    phase: 'tour',
    key: 'clients',
    target: 'a[href="/coach/client-hub"]',
    position: 'right',
    icon: Users,
    title: 'Hub Clients',
    description: 'Gérez tous vos clients. Invitez-les par email, consultez leur fiche 360° et suivez leur progression.',
    btnLabel: 'Suivant',
    accent: 'orange',
  },
  {
    phase: 'tour',
    key: 'calendar',
    target: 'a[href="/coach/calendar"]',
    position: 'right',
    icon: CalendarDays,
    title: 'Calendrier',
    description: 'Planifiez vos séances, rendez-vous et rappels. Tout votre emploi du temps centralisé.',
    btnLabel: 'Suivant',
    accent: 'blue',
  },
  {
    phase: 'tour',
    key: 'messages',
    target: 'a[href="/coach/messages"]',
    position: 'right',
    icon: MessageCircle,
    title: 'Messages',
    description: 'Communiquez directement avec vos clients via la messagerie intégrée en temps réel.',
    btnLabel: 'Suivant',
    accent: 'blue',
  },
  {
    phase: 'tour',
    key: 'sport',
    target: 'a[href="/coach/sport"]',
    position: 'right',
    icon: Trophy,
    title: 'Programmes Sport',
    description: 'Créez des programmes sur mesure avec phases, exercices et séries. Assignez-les en un clic.',
    btnLabel: 'Suivant',
    accent: 'green',
  },
  {
    phase: 'tour',
    key: 'nutrition',
    target: 'a[href="/coach/nutrition"]',
    position: 'right',
    icon: UtensilsCrossed,
    title: 'Plans Nutrition',
    description: 'Construisez des plans alimentaires personnalisés avec repas, macros et aliments.',
    btnLabel: 'Suivant',
    accent: 'green',
  },
  {
    phase: 'tour',
    key: 'stats',
    target: 'a[href="/coach/statistiques"]',
    position: 'right',
    icon: BarChart3,
    title: 'Statistiques',
    description: 'Analysez la progression de vos clients, le taux de complétion et votre activité globale.',
    btnLabel: 'Suivant',
    accent: 'purple',
  },

  // ── Phase 2: Invitation du premier client ──
  {
    phase: 'invite',
    key: 'invite-intro',
    target: null,
    position: 'center',
    icon: UserPlus,
    title: 'Invitez votre premier client',
    description: 'Le meilleur moyen de démarrer est d\'inviter votre premier client. Faisons-le ensemble maintenant.',
    btnLabel: 'Inviter un client',
    showSkipInvite: true,
    accent: 'orange',
  },
  {
    phase: 'invite',
    key: 'invite-form',
    target: null,
    position: 'center',
    icon: Mail,
    title: 'Informations du client',
    description: 'Renseignez le prénom et l\'email. Votre client recevra un lien pour créer son compte.',
    isForm: true,
    accent: 'orange',
  },
  {
    phase: 'invite',
    key: 'invite-success',
    target: null,
    position: 'center',
    icon: Check,
    title: 'Invitation envoyée',
    description: '',
    isSuccess: true,
    btnLabel: 'Terminer',
    accent: 'green',
  },
  {
    phase: 'invite',
    key: 'celebration',
    target: null,
    position: 'center',
    icon: Crown,
    title: 'Vous êtes prêt',
    description: 'Votre espace est configuré. Vous pouvez relancer ce tour à tout moment depuis la sidebar.',
    isFinal: true,
    btnLabel: 'Commencer',
    accent: 'orange',
  },
]

const TOTAL = STEPS.length
const TOUR_STEPS = STEPS.filter(s => s.phase === 'tour').length

const ACCENT_COLORS = {
  orange: { bg: 'rgba(var(--color-primary-rgb),0.12)', border: 'rgba(var(--color-primary-rgb),0.20)', text: 'var(--color-primary)', glow: 'rgba(var(--color-primary-rgb),0.15)' },
  green:  { bg: 'rgba(74,222,128,0.10)', border: 'rgba(74,222,128,0.20)', text: '#4ADE80', glow: 'rgba(74,222,128,0.12)' },
  blue:   { bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.20)', text: '#60A5FA', glow: 'rgba(96,165,250,0.12)' },
  purple: { bg: 'rgba(168,85,247,0.10)', border: 'rgba(168,85,247,0.20)', text: '#A855F7', glow: 'rgba(168,85,247,0.12)' },
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function CoachTutorial({ onComplete, coachName }) {
  const { user } = useAuth()
  const { canAddClient, maxClients } = usePlanLimits()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [animState, setAnimState] = useState('in')
  const [visible, setVisible] = useState(true)
  const [targetRect, setTargetRect] = useState(null)
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )
  const tooltipRef = useRef(null)

  // ── Invitation form state ──
  const [invitePrenom, setInvitePrenom] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteResult, setInviteResult] = useState(null)
  const [copied, setCopied] = useState(false)

  // ── Resolve target element ──
  useEffect(() => {
    const current = STEPS[step]
    if (!current.target) { setTargetRect(null); return }
    const timer = setTimeout(() => {
      const el = document.querySelector(current.target)
      if (el) {
        setTargetRect(el.getBoundingClientRect())
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
      setIsMobile(window.innerWidth < 768)
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
    setTimeout(() => { setStep(s => s + 1); setAnimState('in') }, 200)
  }, [step, finish])

  const goBack = useCallback(() => {
    if (step <= 0) return
    setAnimState('out')
    setTimeout(() => { setStep(s => s - 1); setAnimState('in') }, 200)
  }, [step])

  const skip = useCallback(() => { finish() }, [finish])

  const skipInvite = useCallback(() => {
    setAnimState('out')
    const finalIdx = STEPS.findIndex(s => s.key === 'celebration')
    setTimeout(() => { setStep(finalIdx); setAnimState('in') }, 200)
  }, [])

  // ── Send invitation ──
  const handleSendInvite = useCallback(async () => {
    if (!inviteEmail.trim() || !invitePrenom.trim()) {
      setInviteError('Remplissez les deux champs pour continuer.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      setInviteError('Vérifiez le format de l\'email.')
      return
    }
    if (!canAddClient) {
      setInviteError(`Limite de ${maxClients} client${maxClients > 1 ? 's' : ''} atteinte. Passez au plan supérieur.`)
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
      toast.success(`Invitation envoyée à ${inviteEmail.trim()}`)
    } else if (result.emailError) {
      toast.info(result.emailError)
    }

    setAnimState('out')
    setTimeout(() => {
      setStep(STEPS.findIndex(s => s.key === 'invite-success'))
      setAnimState('in')
    }, 200)

    setInviteSending(false)
  }, [user, inviteEmail, invitePrenom, coachName, toast, canAddClient, maxClients])

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
  const accent = ACCENT_COLORS[current.accent] || ACCENT_COLORS.orange

  const tourPct = isTourPhase
    ? ((step + 1) / TOUR_STEPS) * 60
    : 60 + ((step - TOUR_STEPS + 1) / (TOTAL - TOUR_STEPS)) * 40
  const progressPct = Math.min(100, tourPct)

  const spotPad = 6
  const spotRadius = 12

  const getTooltipStyle = () => {
    // ── Mobile : on ignore le positionnement lateral (right/bottom) qui
    // deborde de l'ecran. La bulle est ancree en bas, pleine largeur (avec
    // marges + safe-area iOS), facon bottom-sheet. Pour les etapes "center"
    // on garde le centrage vertical.
    if (isMobile) {
      if (!hasTarget || current.position === 'center') {
        return {
          position: 'fixed',
          left: 16,
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
        }
      }
      return {
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      }
    }

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
    <div className="fixed inset-0 z-[9999] animate-[ctOverlayIn_0.4s_ease_forwards]">

      {/* ── Dark overlay with spotlight cutout ── */}
      <svg className="fixed inset-0 z-[9999] w-full h-full" onClick={skip}>
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
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.78)" mask="url(#ct-spotlight-mask)" />
      </svg>

      {/* ── Spotlight ring ── */}
      {hasTarget && (
        <div
          className="fixed z-[10000] pointer-events-none rounded-xl animate-[ctSpotlightPulse_2s_ease-in-out_infinite]"
          style={{
            top: targetRect.top - spotPad, left: targetRect.left - spotPad,
            width: targetRect.width + spotPad * 2, height: targetRect.height + spotPad * 2,
            border: `2px solid ${accent.text}`,
            boxShadow: `0 0 0 4px ${accent.glow}, 0 0 20px ${accent.glow}`,
          }}
        />
      )}

      {/* ══════════════════════════════════════ */}
      {/* TOOLTIP CARD                          */}
      {/* ══════════════════════════════════════ */}
      <div
        ref={tooltipRef}
        onClick={e => e.stopPropagation()}
        className={`z-[10001] ${animState === 'in' ? 'animate-[ctFadeIn_0.35s_cubic-bezier(0.22,1,0.36,1)_forwards]' : 'animate-[ctFadeOut_0.15s_ease-in_forwards]'}`}
        style={{
          ...getTooltipStyle(),
          // Sur mobile la largeur est geree par left/right:16 (pleine largeur
          // moins les marges). Sur desktop on garde les largeurs fixes.
          ...(isMobile
            ? { maxHeight: '85dvh', overflowY: 'auto' }
            : { width: current.phase === 'invite' ? 460 : (hasTarget ? 370 : 440) }),
        }}
      >
        {/* Arrow for sidebar tooltips (desktop only — masqué sur mobile car
            la bulle passe en bottom-sheet pleine largeur) */}
        {!isMobile && hasTarget && current.position === 'right' && (
          <div className="absolute -left-2 top-6 w-0 h-0"
            style={{
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderRight: '8px solid #1a1a1a',
            }}
          />
        )}

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08]
          bg-[#141414] shadow-[0_24px_80px_rgba(0,0,0,0.6),0_0_40px_rgba(var(--color-primary-rgb),0.06)]">

          {/* Top accent line */}
          <div className="absolute top-0 inset-x-0 h-[1px]"
            style={{ background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${accent.text} 31.4%, transparent), transparent)` }} />

          {/* Content padding */}
          <div className={`${hasTarget ? 'px-6 pt-5 pb-5' : 'px-7 pt-7 pb-6'}`}>

            {/* Close button */}
            <button
              onClick={skip}
              className="absolute top-3 right-3 w-8 h-8 rounded-lg
                bg-white/[0.04] border border-white/[0.06]
                flex items-center justify-center
                text-white/30 hover:text-white/70 hover:bg-white/[0.08]
                transition-all duration-200 z-10"
            >
              <X size={14} />
            </button>

            {/* Progress bar */}
            <div className="w-full h-[3px] rounded-full bg-white/[0.06] mb-5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPct}%`,
                  background: `linear-gradient(90deg, ${accent.text}, color-mix(in srgb, ${accent.text} 60%, transparent))`,
                }}
              />
            </div>

            {/* ── Header: Icon + Title ── */}
            <div className="flex items-start gap-3.5 mb-3">
              <div
                className={`${hasTarget ? 'w-10 h-10 rounded-xl' : 'w-12 h-12 rounded-2xl'} flex items-center justify-center flex-shrink-0 transition-all`}
                style={{
                  background: accent.bg,
                  border: `1.5px solid ${accent.border}`,
                  ...(current.isSuccess ? { animation: 'ctCheckPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards' } : {}),
                }}
              >
                <Icon size={hasTarget ? 18 : 22} color={accent.text} strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-1"
                  style={{ color: accent.text }}>
                  {isTourPhase ? `Découverte ${step + 1}/${TOUR_STEPS}` : 'Première action'}
                </div>
                <h3 className={`${hasTarget ? 'text-lg' : 'text-xl'} font-bold text-white leading-tight`}>
                  {current.title}
                </h3>
              </div>
            </div>

            {/* ── Description ── */}
            {current.description && (
              <p className="text-[13.5px] leading-[1.7] text-white/50 mb-5">
                {current.description}
              </p>
            )}

            {/* ══════════════════════════════════════ */}
            {/* WELCOME STEP                           */}
            {/* ══════════════════════════════════════ */}
            {current.key === 'welcome' && coachName && (
              <div className="flex items-center gap-3 p-4 rounded-xl
                bg-white/[0.03] border border-white/[0.06] mb-5">
                <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center
                  bg-gradient-to-br from-primary to-[var(--color-primary)]
                  text-white text-sm font-bold shadow-lg shadow-primary/20">
                  {coachName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    Bonjour {coachName}
                  </div>
                  <div className="text-xs text-white/35 mt-0.5">
                    Explorons votre espace ensemble
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════ */}
            {/* INVITE INTRO                            */}
            {/* ══════════════════════════════════════ */}
            {current.key === 'invite-intro' && (
              <div className="flex items-center gap-3 p-4 rounded-xl
                bg-white/[0.03] border border-white/[0.06] mb-5">
                <div className="flex items-center -space-x-2">
                  {['A', 'M', '+'].map((letter, i) => (
                    <div key={i} className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center
                      text-xs font-bold border-2
                      ${i < 2
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'bg-white/[0.04] border-white/[0.08] border-dashed text-white/30'
                      }`}
                      style={{ zIndex: 3 - i }}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">Vos futurs clients</div>
                  <div className="text-xs text-white/35 mt-0.5">Un lien d'invitation suffit</div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════ */}
            {/* INVITE FORM                             */}
            {/* ══════════════════════════════════════ */}
            {current.isForm && (
              <div className="mb-5 space-y-3.5">
                {/* Prénom */}
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1.5">
                    Prénom du client
                  </label>
                  <div className="flex items-center gap-2.5 px-3.5 h-11 rounded-xl
                    bg-white/[0.04] border border-white/[0.08]
                    focus-within:border-primary/40 focus-within:bg-white/[0.06]
                    transition-all duration-200">
                    <Users size={15} className="text-white/25 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Ex: Lucas"
                      value={invitePrenom}
                      onChange={e => setInvitePrenom(e.target.value)}
                      autoFocus
                      className="flex-1 bg-transparent border-none outline-none
                        text-white text-sm placeholder:text-white/20"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1.5">
                    Email du client
                  </label>
                  <div className="flex items-center gap-2.5 px-3.5 h-11 rounded-xl
                    bg-white/[0.04] border border-white/[0.08]
                    focus-within:border-primary/40 focus-within:bg-white/[0.06]
                    transition-all duration-200">
                    <Mail size={15} className="text-white/25 flex-shrink-0" />
                    <input
                      type="email"
                      placeholder="client@email.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSendInvite() }}
                      className="flex-1 bg-transparent border-none outline-none
                        text-white text-sm placeholder:text-white/20"
                    />
                  </div>
                </div>

                {/* Hint */}
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl
                  bg-blue-500/[0.06] border border-blue-500/[0.10]">
                  <Sparkles size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs leading-relaxed text-white/40">
                    Votre client recevra un lien personnalisé pour créer son compte et accéder à son espace.
                  </span>
                </div>

                {/* Error */}
                {inviteError && (
                  <div className="px-3.5 py-2.5 rounded-xl bg-red-500/[0.08] border border-red-500/[0.15]
                    text-xs text-red-400">
                    {inviteError}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════ */}
            {/* INVITE SUCCESS                          */}
            {/* ══════════════════════════════════════ */}
            {current.isSuccess && inviteResult && (
              <div className="mb-5 space-y-3.5">
                {/* Client card */}
                <div className="flex items-center gap-3 p-4 rounded-xl
                  bg-emerald-500/[0.04] border border-emerald-500/[0.12]">
                  <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center
                    bg-emerald-500/10 border border-emerald-500/20
                    text-emerald-400 text-sm font-bold
                    animate-[ctCheckPop_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]">
                    {inviteResult.prenom.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">{inviteResult.prenom}</div>
                    <div className="text-xs text-white/35 mt-0.5">{inviteResult.email}</div>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/15
                    text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                    Invité
                  </div>
                </div>

                {/* Link */}
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1.5">
                    Lien d'invitation
                  </label>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl
                    bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex-1 text-xs text-white/40 font-mono truncate">
                      {inviteResult.lien}
                    </div>
                    <button
                      onClick={copyLink}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                        flex-shrink-0 transition-all duration-200
                        ${copied
                          ? 'bg-emerald-500/12 text-emerald-400'
                          : 'bg-primary/12 text-primary hover:bg-primary/20'
                        }`}
                    >
                      {copied ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
                    </button>
                  </div>
                </div>

                {/* Tip */}
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl
                  bg-primary/[0.04] border border-primary/[0.08]">
                  <Send size={12} className="text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-xs leading-relaxed text-white/40">
                    Envoyez ce lien à <strong className="text-white/70">{inviteResult.prenom}</strong> par email, SMS ou WhatsApp.
                  </span>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════ */}
            {/* FINAL CELEBRATION                       */}
            {/* ══════════════════════════════════════ */}
            {current.isFinal && (
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { icon: Trophy, label: 'Programme sport', color: 'var(--color-primary)' },
                  { icon: UtensilsCrossed, label: 'Plan nutrition', color: '#4ADE80' },
                  { icon: CalendarDays, label: 'Planifier', color: '#60A5FA' },
                ].map((action, i) => {
                  const AIcon = action.icon
                  return (
                    <div key={i} className="flex flex-col items-center gap-2 p-3.5 rounded-xl
                      bg-white/[0.03] border border-white/[0.06]
                      hover:bg-white/[0.06] hover:border-white/[0.10]
                      transition-all duration-200 cursor-default"
                      style={{ animationDelay: `${i * 0.1}s` }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: `color-mix(in srgb, ${action.color} 8.2%, transparent)` }}>
                        <AIcon size={16} color={action.color} strokeWidth={1.8} />
                      </div>
                      <span className="text-[11px] font-medium text-white/60 text-center leading-tight">
                        {action.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ══════════════════════════════════════ */}
            {/* BUTTONS                                 */}
            {/* ══════════════════════════════════════ */}
            <div className="flex items-center gap-2">
              {/* Back */}
              {step > 0 && !current.isForm && !current.isSuccess && (
                <button
                  onClick={goBack}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium
                    bg-white/[0.04] border border-white/[0.06]
                    text-white/40 hover:text-white/70 hover:bg-white/[0.08]
                    transition-all duration-200 flex-shrink-0"
                >
                  Retour
                </button>
              )}

              {/* Main CTA */}
              {current.isForm ? (
                <button
                  onClick={handleSendInvite}
                  disabled={inviteSending}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl
                    bg-gradient-to-r from-primary to-[var(--color-primary)]
                    text-white text-sm font-semibold
                    hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-px
                    active:translate-y-0
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
                    transition-all duration-200"
                >
                  {inviteSending ? (
                    <><Loader2 size={15} className="animate-spin" /> Envoi...</>
                  ) : (
                    <><Send size={15} /> Envoyer l'invitation</>
                  )}
                </button>
              ) : (
                <button
                  onClick={goNext}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl
                    text-white text-sm font-semibold
                    hover:shadow-lg hover:-translate-y-px
                    active:translate-y-0
                    transition-all duration-200"
                  style={{
                    background: `linear-gradient(135deg, ${accent.text}, color-mix(in srgb, ${accent.text} 80%, transparent))`,
                    boxShadow: `0 4px 20px ${accent.glow}`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = `0 8px 30px ${accent.glow}`}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = `0 4px 20px ${accent.glow}`}
                >
                  {current.btnLabel}
                  {!current.isFinal && <ArrowRight size={15} className="animate-[ctBounce_1.5s_ease-in-out_infinite]" />}
                  {current.isFinal && <Zap size={15} />}
                </button>
              )}
            </div>

            {/* Skip links */}
            {(current.showSkipInvite || current.isForm) && (
              <button
                onClick={skipInvite}
                className="w-full text-center text-xs text-white/25
                  hover:text-white/50 transition-colors duration-200
                  mt-3 py-1"
              >
                {current.isForm ? 'Passer cette étape' : 'Je le ferai plus tard'}
              </button>
            )}

            {isTourPhase && !current.isFinal && step > 0 && (
              <button
                onClick={skip}
                className="w-full text-center text-[11px] text-white/20
                  hover:text-white/40 transition-colors duration-200
                  mt-2 py-0.5"
              >
                Passer le tour
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Keyframes ── */}
      <style>{`
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
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        @keyframes ctBounce {
          0%, 100% { transform: translateX(0); }
          50%      { transform: translateX(3px); }
        }
        @keyframes ctCheckPop {
          0%   { transform: scale(0); opacity: 0; }
          50%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
