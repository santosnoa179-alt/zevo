import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { ZevoLogo } from '../../components/ui/ZevoLogo'
import {
  ArrowRight, ArrowLeft, Check, Loader2, User, Briefcase, Target,
  Phone, Sparkles, Zap, BarChart3, Users, CalendarCheck, Rocket,
  Shield, TrendingUp, Clock, LayoutDashboard, Dumbbell, Apple, Brain, Wand2
} from 'lucide-react'

// ── Donnees des etapes ──
const METIERS = [
  { id: 'coach_sportif', label: 'Coach sportif', icon: Dumbbell, desc: 'Remise en forme, musculation, cardio' },
  { id: 'nutritionniste', label: 'Nutritionniste', icon: Apple, desc: 'Plans alimentaires, rééquilibrage' },
  { id: 'preparateur_mental', label: 'Préparateur mental', icon: Brain, desc: 'Performance, mindset, gestion du stress' },
  { id: 'autre', label: 'Autre', icon: Wand2, desc: 'Yoga, pilates, naturopathie...' },
]

const NB_CLIENTS = [
  { id: '0', label: '0', sub: 'Je démarre', icon: Rocket },
  { id: '1-5', label: '1 — 5', sub: 'Petite activité', icon: User },
  { id: '5-20', label: '5 — 20', sub: 'En croissance', icon: Users },
  { id: '20-50', label: '20 — 50', sub: 'Activité soutenue', icon: BarChart3 },
  { id: '50+', label: '50 +', sub: 'Gros volume', icon: Zap },
]

const PRIORITES = [
  { id: 'gagner_temps', label: 'Gagner du temps', desc: 'Automatiser les tâches répétitives', icon: Zap },
  { id: 'organiser_seances', label: 'Organiser mes séances', desc: 'Planning, exercices, programmation', icon: CalendarCheck },
  { id: 'suivi_client', label: 'Suivre mes clients', desc: 'Progrès, bilans, indicateurs', icon: BarChart3 },
  { id: 'developper_activite', label: 'Développer mon activité', desc: 'Nouveaux clients, visibilité', icon: Rocket },
]

const STEP_CONFIG = [
  {
    badge: 'Étape 1 sur 3',
    title: 'Faisons connaissance',
    subtitle: 'Quelques infos pour personnaliser votre espace.',
    panelTitle: 'Votre espace personnalisé',
    panelDesc: 'Un tableau de bord conçu pour votre pratique, avec vos couleurs et votre identité.',
    panelIcon: User,
    stat: { value: '2 min', label: 'pour configurer' },
  },
  {
    badge: 'Étape 2 sur 3',
    title: 'Votre activité',
    subtitle: 'Aidez-nous à adapter Zevo à votre pratique.',
    panelTitle: 'Adapté à votre métier',
    panelDesc: 'Zevo s\'ajuste à votre spécialité pour vous proposer les bons outils.',
    panelIcon: Briefcase,
    stat: { value: '4 000+', label: 'coachs actifs' },
  },
  {
    badge: 'Étape 3 sur 3',
    title: 'Vos priorités',
    subtitle: 'On adapte les outils à vos besoins réels.',
    panelTitle: 'Vos outils, vos règles',
    panelDesc: 'Chaque fonctionnalité est activée selon vos besoins réels. Rien de superflu.',
    panelIcon: Target,
    stat: { value: '10h', label: 'gagnées / mois' },
  },
]

const FEATURES = [
  { icon: LayoutDashboard, label: 'Dashboard intelligent' },
  { icon: Users, label: 'Gestion clients' },
  { icon: TrendingUp, label: 'Suivi & analytics' },
  { icon: Shield, label: 'Paiements sécurisés' },
]

export default function CoachOnboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [direction, setDirection] = useState('next') // pour l'animation

  // Step 1
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')

  // Step 2
  const [metier, setMetier] = useState('')
  const [nbClients, setNbClients] = useState('')

  // Step 3
  const [priorites, setPriorites] = useState([])

  const togglePriorite = (id) => {
    setPriorites(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const canNext = () => {
    if (step === 0) return prenom.trim() && nom.trim() && telephone.trim()
    if (step === 1) return metier && nbClients
    if (step === 2) return priorites.length > 0
    return false
  }

  const goNext = () => {
    setDirection('next')
    setStep(s => s + 1)
  }

  const goBack = () => {
    setDirection('back')
    setStep(s => s - 1)
  }

  const handleNext = async () => {
    if (step < 2) {
      goNext()
      return
    }

    // Derniere etape → sauvegarder
    setSaving(true)
    try {
      const { error } = await supabase
        .from('coaches')
        .update({
          prenom: prenom.trim(),
          nom: nom.trim(),
          telephone: telephone.trim() || null,
          metier,
          nb_clients_moyen: nbClients,
          priorites,
          onboarding_complete: true,
        })
        .eq('id', user.id)

      if (error) throw error

      await supabase
        .from('profiles')
        .update({
          prenom: prenom.trim(),
          nom: nom.trim(),
        })
        .eq('id', user.id)

      toast.success('Bienvenue sur Zevo ! Votre espace est prêt.')
      navigate('/coach/dashboard')
    } catch (err) {
      console.error('Erreur onboarding:', err)
      toast.error('Erreur lors de la sauvegarde. Réessayez.')
    }
    setSaving(false)
  }

  const progress = ((step + 1) / 3) * 100
  const config = STEP_CONFIG[step]

  return (
    <div className="min-h-screen flex bg-white dark:bg-[#1a1a1a]">

      {/* ════════════════════════════════════════════ */}
      {/* GAUCHE — Formulaire                         */}
      {/* ════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen relative">

        {/* Barre de progression */}
        <div className="h-1 bg-gray-100 dark:bg-white/[0.04]">
          <div
            className="h-full bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C] transition-all duration-700 ease-out rounded-r-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Logo mobile seulement */}
        <div className="lg:hidden px-6 pt-6 text-gray-900 dark:text-white">
          <ZevoLogo size="sm" />
        </div>

        {/* Contenu centré */}
        <div className="flex-1 flex items-center justify-center px-6 py-10 lg:px-12">
          <div className="w-full max-w-[440px]">

            {/* Indicateur d'étapes */}
            <div className="flex items-center gap-2 mb-10">
              {[0, 1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                      s < step
                        ? 'bg-[#FF6B2B] text-white shadow-lg shadow-[#FF6B2B]/25'
                        : s === step
                          ? 'bg-[#FF6B2B]/10 text-[#FF6B2B] ring-2 ring-[#FF6B2B]/30 dark:bg-[#FF6B2B]/15'
                          : 'bg-gray-100 text-gray-400 dark:bg-white/[0.06] dark:text-white/30'
                    }`}
                  >
                    {s < step ? <Check size={14} strokeWidth={3} /> : s + 1}
                  </div>
                  {s < 2 && (
                    <div className={`w-10 h-[2px] rounded-full transition-all duration-500 ${
                      s < step ? 'bg-[#FF6B2B]' : 'bg-gray-200 dark:bg-white/[0.06]'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Header d'étape */}
            <div className="mb-8">
              <span className="inline-flex items-center gap-1.5 text-[#FF6B2B] text-xs font-semibold uppercase tracking-widest mb-3">
                <Sparkles size={12} />
                {config.badge}
              </span>
              <h1 className="text-gray-900 dark:text-white text-[28px] font-extrabold leading-tight tracking-tight">
                {config.title}
              </h1>
              <p className="text-gray-500 dark:text-white/50 text-[15px] mt-2 leading-relaxed">
                {config.subtitle}
              </p>
            </div>

            {/* ── Contenu dynamique par step ── */}
            <div
              key={step}
              className="animate-fade-in"
              style={{
                animation: direction === 'next'
                  ? 'fadeSlideIn 0.4s ease-out'
                  : 'fadeSlideInReverse 0.4s ease-out'
              }}
            >

              {/* ── STEP 1 : Infos personnelles ── */}
              {step === 0 && (
                <div className="space-y-5">
                  <InputField
                    label="Prénom"
                    required
                    icon={<User size={16} />}
                    value={prenom}
                    onChange={setPrenom}
                    placeholder="Votre prénom"
                    autoFocus
                  />
                  <InputField
                    label="Nom"
                    required
                    icon={<User size={16} />}
                    value={nom}
                    onChange={setNom}
                    placeholder="Votre nom de famille"
                  />
                  <InputField
                    label="Téléphone"
                    required
                    icon={<Phone size={16} />}
                    value={telephone}
                    onChange={setTelephone}
                    placeholder="+33 6 12 34 56 78"
                    type="tel"
                  />
                </div>
              )}

              {/* ── STEP 2 : Activité ── */}
              {step === 1 && (
                <div className="space-y-7">
                  {/* Métier */}
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-white/70 mb-3 font-semibold">
                      Votre métier
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {METIERS.map((m) => {
                        const selected = metier === m.id
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMetier(m.id)}
                            className={`group relative flex flex-col items-start gap-1 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                              selected
                                ? 'border-[#FF6B2B] bg-[#FF6B2B]/[0.06] dark:bg-[#FF6B2B]/10 shadow-sm shadow-[#FF6B2B]/10'
                                : 'border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] hover:border-gray-300 dark:hover:border-white/[0.15] hover:shadow-sm'
                            }`}
                          >
                            <m.icon size={24} className={`mb-1 transition-colors ${selected ? 'text-[#FF6B2B]' : 'text-gray-400 dark:text-white/40'}`} />
                            <span className={`text-sm font-semibold transition-colors ${
                              selected ? 'text-[#FF6B2B]' : 'text-gray-800 dark:text-white/90'
                            }`}>
                              {m.label}
                            </span>
                            <span className="text-[11px] text-gray-400 dark:text-white/35 leading-snug">
                              {m.desc}
                            </span>
                            {selected && (
                              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#FF6B2B] flex items-center justify-center">
                                <Check size={11} className="text-white" strokeWidth={3} />
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Nombre de clients */}
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-white/70 mb-3 font-semibold">
                      Nombre moyen de clients
                    </label>
                    <div className="space-y-2">
                      {NB_CLIENTS.map((n) => {
                        const selected = nbClients === n.id
                        const Icon = n.icon
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => setNbClients(n.id)}
                            className={`w-full flex items-center gap-4 p-3.5 rounded-xl border-2 text-left transition-all duration-200 ${
                              selected
                                ? 'border-[#FF6B2B] bg-[#FF6B2B]/[0.06] dark:bg-[#FF6B2B]/10 shadow-sm shadow-[#FF6B2B]/10'
                                : 'border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] hover:border-gray-300 dark:hover:border-white/[0.15]'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                              selected
                                ? 'bg-[#FF6B2B]/15 text-[#FF6B2B]'
                                : 'bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-white/30'
                            }`}>
                              <Icon size={16} />
                            </div>
                            <div className="flex-1">
                              <span className={`text-sm font-semibold ${
                                selected ? 'text-[#FF6B2B]' : 'text-gray-800 dark:text-white/90'
                              }`}>
                                {n.label}
                              </span>
                              <span className="text-gray-400 dark:text-white/35 text-xs ml-2">
                                {n.sub}
                              </span>
                            </div>
                            {selected && (
                              <div className="w-5 h-5 rounded-full bg-[#FF6B2B] flex items-center justify-center">
                                <Check size={11} className="text-white" strokeWidth={3} />
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3 : Priorités ── */}
              {step === 2 && (
                <div className="space-y-3">
                  {PRIORITES.map((p) => {
                    const selected = priorites.includes(p.id)
                    const Icon = p.icon
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePriorite(p.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                          selected
                            ? 'border-[#FF6B2B] bg-[#FF6B2B]/[0.06] dark:bg-[#FF6B2B]/10 shadow-sm shadow-[#FF6B2B]/10'
                            : 'border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] hover:border-gray-300 dark:hover:border-white/[0.15]'
                        }`}
                      >
                        {/* Checkbox custom */}
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                          selected
                            ? 'bg-[#FF6B2B] border-[#FF6B2B] shadow-sm shadow-[#FF6B2B]/25'
                            : 'border-gray-300 dark:border-white/20'
                        }`}>
                          {selected && <Check size={13} className="text-white" strokeWidth={3} />}
                        </div>

                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                          selected
                            ? 'bg-[#FF6B2B]/15 text-[#FF6B2B]'
                            : 'bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-white/30'
                        }`}>
                          <Icon size={18} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-semibold block ${
                            selected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-white/70'
                          }`}>
                            {p.label}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-white/35">
                            {p.desc}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                  <p className="text-xs text-gray-400 dark:text-white/30 text-center pt-1">
                    Sélectionnez une ou plusieurs priorités
                  </p>
                </div>
              )}
            </div>

            {/* ── Boutons navigation ── */}
            <div className="flex items-center gap-3 mt-10">
              {step > 0 && (
                <button
                  onClick={goBack}
                  className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-medium
                    text-gray-500 dark:text-white/40
                    hover:text-gray-700 dark:hover:text-white/60
                    hover:bg-gray-100 dark:hover:bg-white/[0.04]
                    transition-all duration-200"
                >
                  <ArrowLeft size={15} />
                  Retour
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!canNext() || saving}
                className="flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl
                  bg-[#FF6B2B] text-white text-sm font-bold
                  hover:bg-[#e55e24] hover:shadow-lg hover:shadow-[#FF6B2B]/20
                  active:scale-[0.98]
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enregistrement...
                  </>
                ) : step === 2 ? (
                  <>
                    Lancer mon espace
                    <Sparkles size={15} />
                  </>
                ) : (
                  <>
                    Continuer
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Séparateur vertical subtil */}
      <div className="hidden lg:block w-[1px] bg-gradient-to-b from-transparent via-gray-200 to-transparent
        dark:via-white/[0.06]" />

      {/* ════════════════════════════════════════════ */}
      {/* DROITE — Premium Branding Panel              */}
      {/* ════════════════════════════════════════════ */}
      <BrandingPanel step={step} config={config} />

      {/* ── CSS Animations ── */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeSlideInReverse {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes floatOrb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(12px, -18px) scale(1.05); }
          66% { transform: translate(-8px, 10px) scale(0.97); }
        }
        @keyframes floatOrbSlow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-15px, -12px) scale(1.03); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  )
}


/* ═══════════════════════════════════════════════ */
/* Panneau droit — Branding premium               */
/* ═══════════════════════════════════════════════ */
function BrandingPanel({ step, config }) {
  const PanelIcon = config.panelIcon

  return (
    <div className="hidden lg:flex w-[46%] flex-col items-center justify-center relative overflow-hidden
      bg-[#0a0a0a]
    ">
      {/* ── Animated gradient orbs ── */}
      <div
        className="absolute w-[420px] h-[420px] rounded-full opacity-30 blur-[120px]"
        style={{
          background: 'radial-gradient(circle, #FF6B2B 0%, transparent 70%)',
          top: '-8%', right: '-10%',
          animation: 'floatOrb 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[350px] h-[350px] rounded-full opacity-20 blur-[100px]"
        style={{
          background: 'radial-gradient(circle, #FF9A6C 0%, transparent 70%)',
          bottom: '-5%', left: '-8%',
          animation: 'floatOrbSlow 10s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[200px] h-[200px] rounded-full opacity-10 blur-[80px]"
        style={{
          background: 'radial-gradient(circle, #fff 0%, transparent 70%)',
          top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
        }}
      />

      {/* ── Geometric grid overlay ── */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,107,43,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,107,43,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Diagonal accent line ── */}
      <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-[#FF6B2B]/20 to-transparent" />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-[360px] px-8">

        {/* Logo officiel Zevo */}
        <div className="mb-16 text-white">
          <ZevoLogo size="md" />
        </div>

        {/* ── Central icon with glow ── */}
        <div className="relative mb-10" key={step} style={{ animation: 'scaleIn 0.5s ease-out' }}>
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF6B2B]/20 to-[#FF9A6C]/10
            border border-[#FF6B2B]/15
            flex items-center justify-center
            backdrop-blur-sm">
            <PanelIcon size={32} className="text-[#FF6B2B]" strokeWidth={1.5} />
          </div>
          {/* Glow under icon */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-4
            bg-[#FF6B2B]/20 rounded-full blur-xl" />
        </div>

        {/* ── Dynamic text ── */}
        <div className="text-center mb-10" key={`text-${step}`} style={{ animation: 'slideUp 0.4s ease-out' }}>
          <h2 className="text-white text-[22px] font-bold tracking-tight leading-snug mb-3">
            {config.panelTitle}
          </h2>
          <p className="text-white/45 text-[13px] leading-relaxed max-w-[280px] mx-auto">
            {config.panelDesc}
          </p>
        </div>

        {/* ── Stat highlight ── */}
        <div className="mb-12" key={`stat-${step}`} style={{ animation: 'scaleIn 0.5s ease-out 0.1s both' }}>
          <div className="flex items-center gap-4 px-6 py-4 rounded-2xl
            bg-white/[0.04] border border-white/[0.06]
            backdrop-blur-sm">
            <div className="text-[28px] font-black text-[#FF6B2B] leading-none tracking-tight">
              {config.stat.value}
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <div className="text-white/40 text-xs font-medium leading-snug">
              {config.stat.label}
            </div>
          </div>
        </div>

        {/* ── Feature pills ── */}
        <div className="grid grid-cols-2 gap-2.5 w-full mb-12">
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon
            return (
              <div
                key={feat.label}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl
                  bg-white/[0.03] border border-white/[0.06]
                  hover:bg-white/[0.06] hover:border-white/[0.1]
                  transition-all duration-300 group"
                style={{ animation: `slideUp 0.3s ease-out ${0.15 + i * 0.05}s both` }}
              >
                <Icon size={14} className="text-[#FF6B2B]/70 group-hover:text-[#FF6B2B] transition-colors flex-shrink-0" />
                <span className="text-white/50 text-[11px] font-medium group-hover:text-white/70 transition-colors">
                  {feat.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* ── Trust bar ── */}
        <div className="flex items-center gap-2 opacity-40">
          <Shield size={12} className="text-white/60" />
          <span className="text-white/60 text-[10px] font-medium uppercase tracking-wider">
            Données chiffrées  ·  RGPD  ·  Hébergé en EU
          </span>
        </div>
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════ */
/* Composant InputField réutilisable premium      */
/* ═══════════════════════════════════════════════ */
function InputField({ label, required, icon, value, onChange, placeholder, type = 'text', hint, autoFocus }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-white/70">
        {label}
        {required && <span className="text-[#FF6B2B]">*</span>}
      </label>
      <div className="relative group">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/25
            group-focus-within:text-[#FF6B2B] transition-colors duration-200">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full
            bg-white dark:bg-white/[0.05]
            border-2 border-gray-200 dark:border-white/[0.10]
            rounded-xl
            ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3.5
            text-gray-900 dark:text-white text-sm
            placeholder:text-gray-400 dark:placeholder:text-white/25
            focus:outline-none focus:border-[#FF6B2B] focus:ring-4 focus:ring-[#FF6B2B]/10
            dark:focus:ring-[#FF6B2B]/[0.07]
            hover:border-gray-300 dark:hover:border-white/[0.12]
            transition-all duration-200`}
        />
      </div>
      {hint && (
        <p className="text-xs text-gray-400 dark:text-white/30 pl-1">{hint}</p>
      )}
    </div>
  )
}
