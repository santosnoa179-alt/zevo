import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Check, Star, Users, Dumbbell, BarChart3,
  MessageCircle, ClipboardList, Zap, Shield,
  ChevronDown, Menu, X, Sparkles, Play,
  Smartphone, CreditCard, BookOpen,
  TrendingUp, Heart, Clock, Target,
  Crown, Flame, Activity,
  FileText, Paintbrush, UserPlus, CalendarDays,
  Lock, Bell, Utensils, CheckCircle,
  ArrowUpRight, Trophy, Rocket, Eye, ChevronRight,
  Video, HelpCircle, PhoneCall
} from 'lucide-react'
import { ZevoLogo } from '../../components/ui/ZevoLogo'

// ══════════════════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════════════════

const FEATURE_NAV = [
  { icon: Dumbbell, label: 'Entrainement', desc: 'Suivi en temps reel', path: '/features/entrainement' },
  { icon: ClipboardList, label: 'Programmes', desc: 'Multi-semaines, drag & drop', path: '/features/programmes' },
  { icon: Utensils, label: 'Nutrition', desc: 'Plans alimentaires & macros', path: '/features/nutrition' },
  { icon: CalendarDays, label: 'Calendrier', desc: 'Reservations & planning', path: '/features/calendrier' },
  { icon: Users, label: 'Hub Client', desc: 'Fiche client 360', path: '/features/hub-client' },
  { icon: MessageCircle, label: 'Messagerie', desc: 'Chat temps reel', path: '/features/messagerie' },
  { icon: BookOpen, label: 'Bibliotheque', desc: 'Ressources & videos', path: '/features/bibliotheque' },
  { icon: ClipboardList, label: 'Formulaires', desc: 'Bilans & questionnaires', path: '/features/formulaires' },
  { icon: BarChart3, label: 'Statistiques', desc: 'Rapports & analytics', path: '/features/statistiques' },
  { icon: Paintbrush, label: 'App Builder', desc: 'Branding personnalise', path: '/features/app-builder' },
  { icon: CreditCard, label: 'Paiements', desc: 'Stripe & abonnements', path: '/features/paiements' },
  { icon: UserPlus, label: 'CRM Prospects', desc: 'Pipeline commercial', path: '/features/prospects' },
]

const BENTO_FEATURES = [
  {
    icon: Users, title: 'Hub Client 360',
    desc: 'Objectifs, mensurations, score bien-etre, historique. Chaque client a sa fiche complete.',
    span: 'col-span-1 md:col-span-2 md:row-span-2', visual: 'hub',
  },
  {
    icon: Dumbbell, title: 'Programmes',
    desc: 'Multi-semaines, drag & drop, suivi live.',
    span: 'col-span-1', visual: null,
  },
  {
    icon: MessageCircle, title: 'Messagerie',
    desc: 'Chat temps reel + notifications push.',
    span: 'col-span-1', visual: null,
  },
  {
    icon: BarChart3, title: 'Statistiques & Rapports',
    desc: 'Dashboards, graphiques, PDF automatiques. Mesure tout ce qui compte.',
    span: 'col-span-1 md:col-span-2', visual: 'stats',
  },
  {
    icon: Utensils, title: 'Nutrition',
    desc: 'Plans alimentaires, macros, repas.',
    span: 'col-span-1', visual: null,
  },
  {
    icon: Paintbrush, title: 'App Builder',
    desc: 'Ton logo, tes couleurs, tes modules.',
    span: 'col-span-1', visual: null,
  },
  {
    icon: ClipboardList, title: 'Formulaires',
    desc: 'Questionnaires & bilans automatises.',
    span: 'col-span-1', visual: null,
  },
  {
    icon: CreditCard, title: 'Paiements Stripe',
    desc: 'Offres, encaissement auto, facturation.',
    span: 'col-span-1', visual: null,
  },
]

const SHOWCASES = [
  {
    badge: 'Suivi client',
    title: 'Chaque client merite une attention sur-mesure',
    desc: 'Objectifs, mensurations, score bien-etre, historique des seances. Tout est centralise dans une fiche unique. Tu sais exactement ou en est chaque client en 3 secondes.',
    features: ['Fiche client unifiee', 'Score bien-etre auto', 'Alertes desengagement', 'Historique complet'],
    visual: 'client',
    metric: { value: '3s', label: 'pour voir l\'essentiel' },
  },
  {
    badge: 'Programmation',
    title: 'Des programmes que tes clients adorent suivre',
    desc: 'Interface intuitive, exercices avec demos, validation en temps reel. Tes clients restent motives, tu gagnes des heures chaque semaine.',
    features: ['Drag & drop', 'Videos demo', 'Suivi temps reel', 'Templates'],
    visual: 'program',
    metric: { value: '4h', label: 'gagnees par semaine' },
  },
  {
    badge: 'Ton app',
    title: 'Tes clients pensent que c\'est TON app',
    desc: 'Avec l\'App Builder, personnalise tout : logo, couleurs, modules. L\'experience est 100% a ton image. Tes clients ne savent meme pas que c\'est Zevo.',
    features: ['Branding complet', 'Modules au choix', 'Preview live', 'Experience premium'],
    visual: 'app',
    metric: { value: '100%', label: 'a ton image' },
  },
]

const STEPS = [
  { num: '01', title: 'Cree ton compte', desc: '30 secondes. Pas de carte bancaire. Toutes les fonctionnalites pendant 14 jours.', icon: Rocket },
  { num: '02', title: 'Configure & invite', desc: 'Ajoute tes clients, cree tes premiers programmes. L\'onboarding te guide.', icon: Paintbrush },
  { num: '03', title: 'Scale ton coaching', desc: 'Tes clients progressent, tu mesures tout, tu scales. Simple.', icon: TrendingUp },
]

const TESTIMONIALS = [
  {
    name: 'Lucas Martin', role: 'Coach sportif · Paris', avatar: 'LM',
    text: 'J\'ai double mon nombre de clients en 3 mois. Le Hub Client me fait gagner un temps fou. Mes clients adorent l\'experience.',
    metric: { value: 'x2', label: 'clients en 3 mois' }, rating: 5,
  },
  {
    name: 'Sarah Khelifi', role: 'Coach nutrition · Lyon', avatar: 'SK',
    text: 'Les formulaires automatiques et le suivi nutritionnel ont change ma facon de travailler. Je ne reviendrais en arriere pour rien au monde.',
    metric: { value: '4h', label: 'gagnees/semaine' }, rating: 5,
  },
  {
    name: 'Thomas Renaud', role: 'Preparateur physique · Bordeaux', avatar: 'TR',
    text: 'Les rapports PDF automatiques m\'ont fait gagner des heures. Mes athletes voient leur progression, ca les motive enormement.',
    metric: { value: '98%', label: 'retention clients' }, rating: 5,
  },
  {
    name: 'Marie Petit', role: 'Coach holistique · Nantes', avatar: 'MP',
    text: 'L\'App Builder est genial. Mes clients pensent que j\'ai ma propre app. Ca a transforme l\'image de mon business completement.',
    metric: { value: '+45%', label: 'revenue en 2 mois' }, rating: 5,
  },
]

const PLANS = [
  {
    id: 'starter', name: 'Starter', price: { monthly: 29, yearly: 24 },
    desc: 'Pour demarrer ton activite',
    features: ['5 clients', 'Dashboard complet', 'Messagerie temps reel', 'Programmes & seances', 'Formulaires', 'Bibliotheque', 'CRM prospects', 'Support email'],
  },
  {
    id: 'pro', name: 'Pro', price: { monthly: 49, yearly: 39 }, popular: true,
    desc: 'Pour scaler serieusement',
    features: ['50 clients', 'Tout le Starter', 'App Builder (branding)', 'Rapports PDF auto', 'Statistiques avancees', 'Plans nutritionnels', 'Support prioritaire'],
  },
  {
    id: 'unlimited', name: 'Unlimited', price: { monthly: 79, yearly: 65 },
    desc: 'Zero limite',
    features: ['Clients illimites', 'Tout le Pro', 'Automatisation', 'API & webhooks', 'Support dedie'],
  },
]

const FAQS = [
  { q: 'L\'essai gratuit est-il vraiment sans engagement ?', a: 'Oui, 14 jours gratuits avec TOUTES les fonctionnalites. Aucune carte bancaire. Tu peux annuler en un clic, tes donnees sont conservees 30 jours.' },
  { q: 'Mes clients doivent-ils payer pour utiliser Zevo ?', a: 'Non. Tes clients accedent gratuitement a leur espace via un lien d\'invitation. Ils n\'ont rien a payer.' },
  { q: 'Puis-je personnaliser l\'app a mes couleurs ?', a: 'Oui ! L\'App Builder (plan Pro) te permet de mettre ton logo, tes couleurs, tes modules. Tes clients ont l\'impression d\'utiliser ta propre application.' },
  { q: 'Comment fonctionnent les paiements ?', a: 'Tu connectes Stripe en un clic. Tu crees des offres avec ton prix, tes clients paient directement. L\'argent arrive sur ton compte.' },
  { q: 'Puis-je migrer mes clients ?', a: 'Oui, invite-les par email ou lien. Creation de compte en moins d\'une minute.' },
  { q: 'Y a-t-il un engagement ?', a: 'Non. Sans engagement. Upgrade, downgrade ou annule a tout moment. Zero frais caches.' },
  { q: 'Ca marche sur mobile ?', a: '100% responsive. Smartphone, tablette, desktop — tout fonctionne partout.' },
]

const SOCIAL_PROOF_NAMES = [
  'Julien D.', 'Amira K.', 'Paul R.', 'Laura M.', 'Kevin T.', 'Sofia B.', 'Marc L.', 'Chloe V.',
  'Antoine P.', 'Yasmine N.', 'Hugo F.', 'Leila S.', 'Nathan G.', 'Emma C.', 'Dylan H.', 'Ines A.',
]

// ══════════════════════════════════════════════════════════
// HOOKS
// ══════════════════════════════════════════════════════════

function useInView(ref, opts = {}) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); if (opts.once !== false) obs.disconnect() } },
      { threshold: opts.threshold || 0.15 }
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref])
  return inView
}

function useAnimatedCounter(target, inView, duration = 2000) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!inView) return
    const num = parseInt(target.replace(/[^0-9]/g, ''), 10)
    if (isNaN(num)) { setCount(target); return }
    let start = 0
    const step = num / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= num) { setCount(num); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target, duration])
  return count
}

// ══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════

function BentoVisualHub() {
  return (
    <div className="mt-4 rounded-xl bg-[#111] border border-white/[0.05] p-3 space-y-2.5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center text-white text-[10px] font-bold">JD</div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-[#F5F5F3]">Julie Dupont</div>
          <div className="text-[9px] text-[#F5F5F3]/25">Perte de poids · 3 mois</div>
        </div>
        <div className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">Actif</div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { v: '8.4', l: 'Bien-etre', c: '#10B981' },
          { v: '12/16', l: 'Seances', c: '#3B82F6' },
          { v: '-3.2kg', l: 'Poids', c: '#FF6B2B' },
        ].map((s, i) => (
          <div key={i} className="rounded-lg bg-white/[0.03] border border-white/[0.04] p-2 text-center">
            <p className="text-sm font-bold" style={{ color: s.c }}>{s.v}</p>
            <p className="text-[8px] text-[#F5F5F3]/25">{s.l}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function BentoVisualStats() {
  return (
    <div className="mt-4 flex items-end gap-1 h-14 px-1">
      {[25, 35, 30, 50, 45, 60, 55, 68, 62, 75, 70, 85, 80, 92].map((h, i) => (
        <div key={i} className="flex-1 rounded-t transition-all" style={{ height: `${h}%`, background: `linear-gradient(to top, #FF6B2B${i > 10 ? '' : '80'}, #FF8F5E${i > 10 ? '' : '50'})` }} />
      ))}
    </div>
  )
}

function ShowcaseVisual({ type }) {
  if (type === 'client') {
    return (
      <div className="relative">
        <div className="rounded-2xl bg-[#141414] border border-white/[0.06] p-5 space-y-4 shadow-[0_20px_60px_rgba(0,0,0,0.4)] noise-overlay">
          <div className="flex items-center gap-3 relative">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-[#FF6B2B]/20">JD</div>
            <div>
              <div className="text-sm font-semibold text-[#F5F5F3]">Julie Dupont</div>
              <div className="text-[10px] text-[#F5F5F3]/25">Objectif : Perte de poids · Depuis 3 mois</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'Bien-etre', val: '8.4/10', color: '#10B981', trend: '+0.6' },
              { label: 'Seances', val: '12/16', color: '#3B82F6', trend: '75%' },
              { label: 'Poids', val: '-3.2 kg', color: '#FF6B2B', trend: 'objectif' },
            ].map((s, i) => (
              <div key={i} className="rounded-xl bg-white/[0.025] border border-white/[0.05] p-3 text-center">
                <p className="text-lg font-bold" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[9px] text-[#F5F5F3]/25 mt-0.5">{s.label}</p>
                <p className="text-[8px] mt-1 font-semibold" style={{ color: s.color }}>{s.trend}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-white/[0.025] border border-white/[0.05] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-[#F5F5F3]/40">Progression</span>
              <span className="text-[9px] text-emerald-400 font-bold">En bonne voie</span>
            </div>
            <div className="flex items-end gap-1 h-14">
              {[30, 42, 38, 55, 50, 62, 58, 70, 65, 78, 72, 85].map((h, i) => (
                <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: `linear-gradient(to top, rgba(16,185,129,${0.2 + i * 0.05}), rgba(16,185,129,${0.1 + i * 0.04}))` }} />
              ))}
            </div>
          </div>
        </div>
        {/* Floating notification */}
        <div className="absolute -top-3 -right-3 px-3 py-2 rounded-xl bg-[#1A1A1A] border border-emerald-500/20 shadow-xl shadow-black/30 flex items-center gap-2 animate-bounce-slow">
          <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle size={12} className="text-emerald-400" />
          </div>
          <span className="text-[10px] font-semibold text-emerald-400">Seance validee !</span>
        </div>
      </div>
    )
  }

  if (type === 'program') {
    return (
      <div className="relative">
        <div className="rounded-2xl bg-[#141414] border border-white/[0.06] p-5 space-y-3 shadow-[0_20px_60px_rgba(0,0,0,0.4)] noise-overlay">
          <div className="flex items-center justify-between mb-1 relative">
            <div className="text-sm font-semibold text-[#F5F5F3]">Programme Force</div>
            <div className="px-2 py-0.5 rounded-lg bg-[#FF6B2B]/10 text-[9px] text-[#FF6B2B] font-bold">Semaine 3/8</div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] w-[37.5%] transition-all" />
          </div>
          {[
            { name: 'Squat Back', sets: '4x8 @ 80kg', done: true },
            { name: 'Bench Press', sets: '4x6 @ 70kg', done: true },
            { name: 'Romanian DL', sets: '3x10 @ 60kg', done: false },
            { name: 'Pull-ups lestes', sets: '4x8 @ +10kg', done: false },
          ].map((ex, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${ex.done ? 'bg-emerald-500/[0.03] border-emerald-500/15' : 'bg-white/[0.015] border-white/[0.05]'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ex.done ? 'bg-emerald-500/15' : 'bg-white/[0.04]'}`}>
                {ex.done ? <Check size={15} className="text-emerald-400" /> : <Dumbbell size={15} className="text-[#F5F5F3]/25" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#F5F5F3]">{ex.name}</p>
                <p className="text-[10px] text-[#F5F5F3]/25">{ex.sets}</p>
              </div>
              {ex.done && <span className="text-[9px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10">Fait</span>}
            </div>
          ))}
        </div>
        {/* Floating badge */}
        <div className="absolute -bottom-3 -left-3 px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#FF6B2B]/20 shadow-xl shadow-black/30 flex items-center gap-2">
          <Flame size={14} className="text-[#FF6B2B]" />
          <span className="text-[10px] font-bold text-[#FF6B2B]">7 jours de suite !</span>
        </div>
      </div>
    )
  }

  // App builder
  return (
    <div className="relative flex justify-center">
      <div className="w-[240px]">
        <div className="rounded-[28px] border-2 border-white/[0.08] bg-[#0D0D0D] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between px-5 py-1.5 text-[8px] text-[#F5F5F3]/30">
            <span>9:41</span>
            <div className="w-16 h-4 rounded-full bg-white/[0.06]" />
            <div className="flex gap-1"><Activity size={7} /></div>
          </div>
          <div className="px-4 py-3.5 bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E]">
            <p className="text-white text-xs font-bold">FitCoach Pro</p>
            <p className="text-white/50 text-[9px]">Bonjour Julie !</p>
          </div>
          <div className="p-3 space-y-2.5">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays size={11} className="text-[#FF6B2B]" />
                <span className="text-[10px] font-semibold text-[#F5F5F3]">Prochaine seance</span>
              </div>
              <p className="text-[9px] text-[#F5F5F3]/30">Upper Body · Aujourd'hui 18h</p>
              <div className="mt-2 h-1 rounded-full bg-white/[0.05]">
                <div className="h-full rounded-full bg-[#FF6B2B] w-[60%]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-2.5 text-center">
                <Heart size={12} className="text-emerald-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-[#F5F5F3]">8.4</p>
                <p className="text-[7px] text-[#F5F5F3]/25">Bien-etre</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-2.5 text-center">
                <Flame size={12} className="text-[#FF6B2B] mx-auto mb-1" />
                <p className="text-sm font-bold text-[#F5F5F3]">7j</p>
                <p className="text-[7px] text-[#F5F5F3]/25">Serie</p>
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
              <div className="flex items-center gap-2">
                <MessageCircle size={11} className="text-[#3B82F6]" />
                <span className="text-[10px] font-semibold text-[#F5F5F3]">Message du coach</span>
              </div>
              <p className="text-[9px] text-[#F5F5F3]/30 mt-1">"Super semaine Julie ! Continue..."</p>
            </div>
          </div>
          <div className="flex items-center justify-around py-2.5 border-t border-white/[0.05]">
            {[Activity, Dumbbell, Utensils, MessageCircle].map((Icon, i) => (
              <Icon key={i} size={14} className={i === 0 ? 'text-[#FF6B2B]' : 'text-[#F5F5F3]/15'} />
            ))}
          </div>
        </div>
      </div>
      {/* Phone glow */}
      <div className="pointer-events-none absolute inset-0 -bottom-10 bg-[#FF6B2B]/[0.04] blur-[50px] rounded-full" />
    </div>
  )
}

// Social proof notification popup
function SocialProofPopup({ visible, name }) {
  return (
    <div className={`fixed bottom-6 left-6 z-40 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#1A1A1A]/90 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/50">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
          {name?.charAt(0)}
        </div>
        <div>
          <p className="text-xs font-semibold text-[#F5F5F3]">{name} vient de s'inscrire</p>
          <p className="text-[10px] text-[#F5F5F3]/30">Il y a quelques instants</p>
        </div>
        <Sparkles size={14} className="text-[#FF6B2B] flex-shrink-0" />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════

export default function LandingPage() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const [billingYearly, setBillingYearly] = useState(false)
  const [activeTesti, setActiveTesti] = useState(0)

  // Social proof popup
  const [showPopup, setShowPopup] = useState(false)
  const [popupName, setPopupName] = useState('')

  // Intersection observers
  const statsRef = useRef(null)
  const statsInView = useInView(statsRef)
  const featuresRef = useRef(null)
  const featuresInView = useInView(featuresRef)
  const heroRef = useRef(null)
  const heroInView = useInView(heroRef, { threshold: 0.05 })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Social proof popup timer
  useEffect(() => {
    const show = () => {
      const name = SOCIAL_PROOF_NAMES[Math.floor(Math.random() * SOCIAL_PROOF_NAMES.length)]
      setPopupName(name)
      setShowPopup(true)
      setTimeout(() => setShowPopup(false), 4000)
    }
    const first = setTimeout(show, 8000)
    const interval = setInterval(show, 25000)
    return () => { clearTimeout(first); clearInterval(interval) }
  }, [])

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => setActiveTesti(p => (p + 1) % TESTIMONIALS.length), 5000)
    return () => clearInterval(interval)
  }, [])

  const scrollTo = (id) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F3] overflow-x-hidden">
      <SocialProofPopup visible={showPopup} name={popupName} />

      {/* ══════════════════════ NAVBAR ══════════════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#0D0D0D]/70 backdrop-blur-2xl border-b border-white/[0.06] py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-5 md:px-8 flex items-center justify-between">
          <ZevoLogo size="md" />
          <div className="hidden lg:flex items-center gap-6">
            {/* Fonctionnalites dropdown */}
            <div className="relative"
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <button className="flex items-center gap-1.5 text-[13px] text-[#F5F5F3]/40 hover:text-[#F5F5F3] transition-colors duration-300 font-medium py-2">
                Fonctionnalites <ChevronDown size={12} className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[680px]">
                  <div className="rounded-2xl border border-white/[0.08] bg-[#141414]/95 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden">
                    <div className="p-2 grid grid-cols-3 gap-0.5">
                      {FEATURE_NAV.map((f) => {
                        const Icon = f.icon
                        return (
                          <button
                            key={f.path}
                            onClick={() => { setDropdownOpen(false); navigate(f.path) }}
                            className="group flex items-start gap-3 px-3.5 py-3 rounded-xl hover:bg-white/[0.04] transition-all text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/10 border border-[#FF6B2B]/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#FF6B2B]/15 transition-colors">
                              <Icon size={14} className="text-[#FF6B2B]" />
                            </div>
                            <div>
                              <p className="text-[12px] font-semibold text-[#F5F5F3]/70 group-hover:text-[#F5F5F3] transition-colors">{f.label}</p>
                              <p className="text-[10px] text-[#F5F5F3]/25 group-hover:text-[#F5F5F3]/35 transition-colors leading-snug">{f.desc}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    <div className="border-t border-white/[0.05] px-4 py-3 flex items-center justify-between bg-white/[0.015]">
                      <span className="text-[10px] text-[#F5F5F3]/20">12 fonctionnalites incluses</span>
                      <button onClick={() => { setDropdownOpen(false); navigate('/pricing') }} className="text-[10px] font-medium text-[#FF6B2B] hover:text-[#FF8F5E] transition-colors flex items-center gap-1">
                        Voir les tarifs <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => scrollTo('pricing')} className="text-[13px] text-[#F5F5F3]/40 hover:text-[#F5F5F3] transition-colors duration-300 font-medium">Tarifs</button>
            <button onClick={() => scrollTo('faq')} className="text-[13px] text-[#F5F5F3]/40 hover:text-[#F5F5F3] transition-colors duration-300 font-medium">FAQ</button>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/demo')} className="px-4 py-2 text-sm font-medium text-[#F5F5F3]/50 hover:text-[#F5F5F3] transition-colors flex items-center gap-1.5">
              <Video size={13} /> Demo
            </button>
            <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-medium text-[#F5F5F3]/50 hover:text-[#F5F5F3] transition-colors">Se connecter</button>
            <button onClick={() => navigate('/register')} className="group px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[#FF6B2B]/25 transition-all duration-300 flex items-center gap-2">
              Essai gratuit <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-[#F5F5F3]/60">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
        {menuOpen && (
          <div className="md:hidden fixed inset-0 top-[60px] bg-[#0D0D0D]/98 backdrop-blur-2xl z-40">
            <div className="p-6 space-y-1">
              <p className="text-[10px] font-semibold text-[#F5F5F3]/20 uppercase tracking-wider mb-2 px-1">Fonctionnalites</p>
              {FEATURE_NAV.map((f) => {
                const Icon = f.icon
                return (
                  <button key={f.path} onClick={() => { setMenuOpen(false); navigate(f.path) }} className="flex items-center gap-3 w-full text-left py-2.5 border-b border-white/[0.04]">
                    <div className="w-7 h-7 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={13} className="text-[#FF6B2B]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#F5F5F3]/60">{f.label}</p>
                      <p className="text-[10px] text-[#F5F5F3]/20">{f.desc}</p>
                    </div>
                  </button>
                )
              })}
              <button onClick={() => { setMenuOpen(false); scrollTo('pricing') }} className="block w-full text-left text-lg font-medium text-[#F5F5F3]/50 hover:text-[#F5F5F3] py-3.5 border-b border-white/[0.04]">Tarifs</button>
              <button onClick={() => { setMenuOpen(false); scrollTo('faq') }} className="block w-full text-left text-lg font-medium text-[#F5F5F3]/50 hover:text-[#F5F5F3] py-3.5 border-b border-white/[0.04]">FAQ</button>
              <div className="pt-6 space-y-3">
                <button onClick={() => { setMenuOpen(false); navigate('/demo') }} className="w-full py-3.5 rounded-xl border border-white/[0.08] text-[#F5F5F3]/50 text-sm font-medium flex items-center justify-center gap-2">
                  <Video size={14} className="text-[#FF6B2B]" /> Demander une demo
                </button>
                <button onClick={() => { setMenuOpen(false); navigate('/login') }} className="block w-full text-center text-sm text-[#F5F5F3]/50 py-3">Se connecter</button>
                <button onClick={() => { setMenuOpen(false); navigate('/register') }} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white text-sm font-semibold">Commencer gratuitement</button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ══════════════════════ HERO ══════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center px-5 md:px-8 pt-24 pb-20">
        {/* BG — multi-layer premium */}
        <div className="pointer-events-none absolute top-[-200px] left-1/2 -translate-x-1/2 w-[1400px] h-[900px] rounded-full bg-[#FF6B2B]/[0.05] blur-[200px] animate-glow-pulse" />
        <div className="pointer-events-none absolute top-[100px] right-[-200px] w-[600px] h-[600px] rounded-full bg-[#FF8F5E]/[0.03] blur-[150px]" />
        <div className="pointer-events-none absolute bottom-[100px] left-[-200px] w-[500px] h-[500px] rounded-full bg-[#FF6B2B]/[0.02] blur-[130px]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_40%,black,transparent)]" />

        <div className={`relative max-w-5xl mx-auto text-center transition-all duration-1000 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Social proof badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] mb-8 hover:bg-white/[0.06] transition-colors cursor-default">
            <div className="flex -space-x-1.5">
              {['#FF6B2B', '#3B82F6', '#10B981', '#F59E0B'].map((c, i) => (
                <div key={i} className="w-5 h-5 rounded-full border-2 border-[#0D0D0D] flex items-center justify-center text-[7px] font-bold text-white" style={{ backgroundColor: c, zIndex: 4 - i }}>
                  {['L', 'S', 'T', 'M'][i]}
                </div>
              ))}
            </div>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => <Star key={i} size={10} className="text-[#FF6B2B] fill-[#FF6B2B]" />)}
            </div>
            <span className="text-xs font-medium text-[#F5F5F3]/40">Aime par <strong className="text-[#F5F5F3]/70">500+</strong> coachs</span>
          </div>

          <h1 className="text-[clamp(2.5rem,7vw,4.75rem)] font-bold tracking-tight leading-[1.08] mb-7">
            <span className="block">Arrete de jongler entre</span>
            <span className="block">10 outils.{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#FF6B2B] via-[#FF8F5E] to-[#FF6B2B] bg-clip-text text-transparent bg-[size:200%] animate-gradient-x">Scale ton coaching.</span>
              </span>
            </span>
          </h1>

          <p className="text-base md:text-xl text-[#F5F5F3]/35 max-w-2xl mx-auto mb-10 leading-relaxed">
            Clients, programmes, nutrition, paiements, messagerie — tout dans <strong className="text-[#F5F5F3]/60">une seule plateforme</strong> pensee pour les coachs qui veulent grandir.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-5">
            <button onClick={() => navigate('/register')} className="group w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white font-semibold text-base hover:shadow-2xl hover:shadow-[#FF6B2B]/30 transition-all duration-300 flex items-center justify-center gap-2.5 relative overflow-hidden">
              <span className="relative z-10 flex items-center gap-2.5">
                Commencer gratuitement
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
              </span>
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.15] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
            <button onClick={() => navigate('/demo')} className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/[0.08] text-[#F5F5F3]/50 font-medium text-base hover:bg-white/[0.03] hover:text-[#F5F5F3] hover:border-white/[0.12] transition-all duration-300 flex items-center justify-center gap-2">
              <Video size={15} className="text-[#FF6B2B]" /> Demander une demo
            </button>
          </div>

          <div className="flex items-center justify-center gap-5 text-[#F5F5F3]/20 text-xs mb-16 md:mb-20">
            <span className="flex items-center gap-1.5"><Shield size={12} /> Sans carte bancaire</span>
            <span className="flex items-center gap-1.5"><Clock size={12} /> Setup 2 min</span>
            <span className="flex items-center gap-1.5"><Zap size={12} /> 14 jours gratuits</span>
          </div>

          {/* Browser mockup */}
          <div className="relative mx-auto max-w-4xl animate-float">
            <div className="rounded-2xl md:rounded-3xl border border-white/[0.07] bg-[#161616] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.6)] noise-overlay">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#111] border-b border-white/[0.04]">
                <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" /><div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" /><div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" /></div>
                <div className="flex-1 flex justify-center"><div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.03] text-[10px] text-[#F5F5F3]/20 font-mono"><Lock size={7} /> app.zevo.coach</div></div>
              </div>
              <div className="p-4 md:p-7">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm md:text-base font-bold text-[#F5F5F3]">Bonjour, Coach</p>
                    <p className="text-[10px] text-[#F5F5F3]/25">Lundi 7 Avril 2026</p>
                  </div>
                  <div className="hidden md:flex gap-2">
                    <div className="px-3 py-1.5 rounded-lg bg-[#FF6B2B]/10 text-[10px] text-[#FF6B2B] font-bold flex items-center gap-1.5"><Sparkles size={10} /> 3 clients en attente</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
                  {[
                    { l: 'Clients', v: '24', t: '+3', c: '#FF6B2B', ic: Users },
                    { l: 'Seances', v: '67', t: '+12%', c: '#3B82F6', ic: Dumbbell },
                    { l: 'Retention', v: '94%', t: '+2%', c: '#10B981', ic: TrendingUp },
                    { l: 'Revenu', v: '3 240\u20AC', t: '+18%', c: '#F59E0B', ic: CreditCard },
                  ].map((k, i) => (
                    <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <k.ic size={13} style={{ color: k.c }} />
                        <span className="text-[8px] text-emerald-400 font-bold">{k.t}</span>
                      </div>
                      <p className="text-lg font-bold text-[#F5F5F3]">{k.v}</p>
                      <p className="text-[9px] text-[#F5F5F3]/25">{k.l}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="md:col-span-2 rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
                    <span className="text-[10px] font-semibold text-[#F5F5F3]/30">Progression clients · 12 mois</span>
                    <div className="flex items-end gap-1 h-20 mt-3">
                      {[28, 35, 32, 48, 42, 56, 52, 65, 60, 72, 68, 82].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: `linear-gradient(to top, #FF6B2B${i >= 10 ? '' : Math.round(30 + i * 6).toString(16)}, #FF8F5E${i >= 10 ? '' : Math.round(20 + i * 5).toString(16)})` }} />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 space-y-2.5">
                    <span className="text-[10px] font-semibold text-[#F5F5F3]/30">Activite recente</span>
                    {[
                      { t: 'Julie a valide sa seance', c: '#10B981' },
                      { t: 'Nouveau prospect', c: '#FF6B2B' },
                      { t: 'Paiement recu 49\u20AC', c: '#F59E0B' },
                    ].map((a, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.c }} />
                        <span className="text-[9px] text-[#F5F5F3]/35 truncate">{a.t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-[60%] h-40 bg-[#FF6B2B]/[0.05] blur-[100px] rounded-full" />
          </div>
        </div>
      </section>

      {/* ══════════════════════ LOGOS + STATS ══════════════════════ */}
      <section className="border-y border-white/[0.04] bg-[#0A0A0A]">
        <div className="py-6 border-b border-white/[0.03] overflow-hidden relative">
          <p className="text-center text-[9px] uppercase tracking-[0.25em] text-[#F5F5F3]/15 font-semibold mb-5">Utilise par des coachs certifies</p>
          {/* Infinite marquee */}
          <div className="relative">
            <div className="flex gap-16 animate-marquee whitespace-nowrap">
              {[...Array(2)].flatMap((_, r) =>
                ['CrossFit', 'BPJEPS', 'STAPS', 'FitPro', 'CoachHub', 'TrainMe', 'SportEasy', 'MyCoach'].map((n, i) => (
                  <span key={`${r}-${i}`} className="text-sm font-bold text-[#F5F5F3]/[0.12] tracking-wider">{n}</span>
                ))
              )}
            </div>
          </div>
        </div>
        <div ref={statsRef} className="max-w-6xl mx-auto px-5 md:px-8 py-14 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '500', suffix: '+', label: 'Coachs actifs' },
            { value: '12000', suffix: '+', label: 'Clients suivis' },
            { value: '4.8', suffix: '/5', label: 'Note moyenne' },
            { value: '98', suffix: '%', label: 'Satisfaction' },
          ].map((s, i) => {
            const count = useAnimatedCounter(s.value, statsInView)
            return (
              <div key={i} className="text-center">
                <p className={`text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent transition-all duration-700 ${statsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: `${i * 100}ms` }}>
                  {typeof count === 'number' ? count.toLocaleString('fr-FR') : count}{s.suffix}
                </p>
                <p className="text-sm text-[#F5F5F3]/25 mt-2 font-medium">{s.label}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ══════════════════════ FEATURES BENTO ══════════════════════ */}
      <section id="features" className="py-24 md:py-36 px-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 md:mb-20">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-[#F5F5F3]/35 font-medium mb-6">
              <Zap size={12} className="text-[#FF6B2B]" /> Fonctionnalites
            </div>
            <h2 className="text-3xl md:text-[3.25rem] font-bold tracking-tight leading-tight mb-5">
              Tout ce dont tu as besoin.
              <br /><span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">Rien de superflu.</span>
            </h2>
            <p className="text-[#F5F5F3]/30 text-lg max-w-xl mx-auto">Chaque feature est pensee pour te faire gagner du temps et impressionner tes clients.</p>
          </div>

          <div ref={featuresRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {BENTO_FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <div
                  key={i}
                  className={`group relative rounded-2xl border border-white/[0.06] glass-landing p-5 md:p-6 hover:border-[#FF6B2B]/20 hover:shadow-[0_8px_40px_rgba(255,107,43,0.04)] transition-all duration-500 overflow-hidden ${f.span} ${featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[#FF6B2B]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 border border-[#FF6B2B]/10 flex items-center justify-center mb-4 group-hover:bg-[#FF6B2B]/15 group-hover:scale-110 transition-all duration-500">
                      <Icon size={18} className="text-[#FF6B2B]" />
                    </div>
                    <h3 className="text-sm font-semibold mb-1.5 text-[#F5F5F3]">{f.title}</h3>
                    <p className="text-xs text-[#F5F5F3]/30 leading-relaxed">{f.desc}</p>
                    {f.visual === 'hub' && <BentoVisualHub />}
                    {f.visual === 'stats' && <BentoVisualStats />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════ SHOWCASES ══════════════════════ */}
      <section className="py-12 md:py-24 px-5 md:px-8">
        <div className="max-w-6xl mx-auto space-y-24 md:space-y-40">
          {SHOWCASES.map((item, i) => {
            const isReversed = i % 2 === 1
            return (
              <div key={i} className={`flex flex-col ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12 md:gap-20`}>
                <div className="flex-1 max-w-lg">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF6B2B]/10 border border-[#FF6B2B]/15 text-[10px] font-bold text-[#FF6B2B] uppercase tracking-wider mb-5">{item.badge}</div>
                  <h3 className="text-2xl md:text-[2.25rem] font-bold tracking-tight mb-4 leading-tight">{item.title}</h3>
                  <p className="text-[#F5F5F3]/35 text-base leading-relaxed mb-6">{item.desc}</p>
                  {/* Metric highlight */}
                  <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#FF6B2B]/[0.06] border border-[#FF6B2B]/10 mb-6">
                    <span className="text-2xl font-bold text-[#FF6B2B]">{item.metric.value}</span>
                    <span className="text-xs text-[#F5F5F3]/40">{item.metric.label}</span>
                  </div>
                  <ul className="space-y-2.5">
                    {item.features.map((feat, j) => (
                      <li key={j} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-md bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                          <Check size={11} className="text-[#FF6B2B]" />
                        </div>
                        <span className="text-sm text-[#F5F5F3]/40">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`flex-1 w-full max-w-md ${i % 2 === 0 ? 'animate-float' : 'animate-float-delayed'}`}>
                  <ShowcaseVisual type={item.visual} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ══════════════════════ HOW IT WORKS ══════════════════════ */}
      <section id="how" className="py-24 md:py-36 px-5 md:px-8 relative border-y border-white/[0.04]">
        <div className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#FF6B2B]/[0.02] blur-[150px]" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-16 md:mb-20">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-[#F5F5F3]/35 font-medium mb-6">
              <Target size={12} className="text-[#FF6B2B]" /> 3 etapes
            </div>
            <h2 className="text-3xl md:text-[3.25rem] font-bold tracking-tight leading-tight mb-5">
              Operationnel en <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">2 minutes</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
            <div className="hidden md:block absolute top-20 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-[#FF6B2B]/15 to-transparent" />
            {STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={i} className="relative rounded-2xl border border-white/[0.06] glass-landing p-7 hover:border-[#FF6B2B]/20 hover:shadow-[0_8px_40px_rgba(255,107,43,0.04)] transition-all duration-500 group text-center noise-overlay">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B2B]/15 to-[#FF8F5E]/5 border border-[#FF6B2B]/10 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,107,43,0.15)] transition-all duration-500">
                    <Icon size={26} className="text-[#FF6B2B]" />
                  </div>
                  <span className="text-[10px] font-bold text-[#FF6B2B]/30 uppercase tracking-widest">Etape {s.num}</span>
                  <h3 className="text-lg font-semibold mt-2 mb-3 text-[#F5F5F3]">{s.title}</h3>
                  <p className="text-sm text-[#F5F5F3]/30 leading-relaxed">{s.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════ TESTIMONIALS ══════════════════════ */}
      <section id="testimonials" className="py-24 md:py-36 px-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-[#F5F5F3]/35 font-medium mb-6">
              <Heart size={12} className="text-[#FF6B2B]" /> Temoignages
            </div>
            <h2 className="text-3xl md:text-[3.25rem] font-bold tracking-tight leading-tight mb-5">
              Ils ont choisi <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">Zevo</span>
            </h2>
          </div>
          {/* Featured + grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Featured testimonial */}
            <div className="rounded-2xl border-2 border-[#FF6B2B]/20 glass-landing p-7 md:p-8 flex flex-col relative overflow-hidden noise-overlay shadow-[0_8px_60px_rgba(255,107,43,0.06)]">
              <div className="pointer-events-none absolute top-0 right-0 w-60 h-60 bg-[#FF6B2B]/[0.05] blur-[80px] rounded-full animate-glow-pulse" />
              <div className="flex gap-0.5 mb-5">
                {[1,2,3,4,5].map(j => <Star key={j} size={16} className="text-[#FF6B2B] fill-[#FF6B2B]" />)}
              </div>
              <p className="text-base md:text-lg text-[#F5F5F3]/60 leading-relaxed flex-1 mb-6 relative">
                "{TESTIMONIALS[activeTesti].text}"
              </p>
              {/* Metric badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#FF6B2B]/[0.06] border border-[#FF6B2B]/10 mb-5 self-start">
                <span className="text-xl font-bold text-[#FF6B2B]">{TESTIMONIALS[activeTesti].metric.value}</span>
                <span className="text-xs text-[#F5F5F3]/35">{TESTIMONIALS[activeTesti].metric.label}</span>
              </div>
              <div className="flex items-center gap-3 pt-5 border-t border-white/[0.05]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-[#FF6B2B]/20">{TESTIMONIALS[activeTesti].avatar}</div>
                <div>
                  <p className="text-sm font-semibold text-[#F5F5F3]">{TESTIMONIALS[activeTesti].name}</p>
                  <p className="text-[11px] text-[#F5F5F3]/25">{TESTIMONIALS[activeTesti].role}</p>
                </div>
              </div>
            </div>
            {/* Smaller cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TESTIMONIALS.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTesti(i)}
                  className={`rounded-2xl border p-5 text-left transition-all duration-300 ${i === activeTesti ? 'border-[#FF6B2B]/20 bg-[#1A1A1A]' : 'border-white/[0.05] bg-[#141414] hover:border-white/[0.1]'}`}
                >
                  <div className="flex gap-0.5 mb-3">
                    {[1,2,3,4,5].map(j => <Star key={j} size={10} className="text-[#FF6B2B] fill-[#FF6B2B]" />)}
                  </div>
                  <p className="text-xs text-[#F5F5F3]/40 leading-relaxed line-clamp-3 mb-3">"{t.text}"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center text-white text-[8px] font-bold">{t.avatar.charAt(0)}</div>
                    <span className="text-[11px] font-semibold text-[#F5F5F3]/50">{t.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ PRICING ══════════════════════ */}
      <section id="pricing" className="py-24 md:py-36 px-5 md:px-8 relative border-y border-white/[0.04]">
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-[#FF6B2B]/[0.035] blur-[150px]" />
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-[#F5F5F3]/35 font-medium mb-6">
              <CreditCard size={12} className="text-[#FF6B2B]" /> Tarifs transparents
            </div>
            <h2 className="text-3xl md:text-[3.25rem] font-bold tracking-tight leading-tight mb-5">
              Investis dans <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">ta croissance</span>
            </h2>
            <p className="text-[#F5F5F3]/30 text-lg max-w-lg mx-auto mb-8">Moins cher que ton cafe quotidien. Rentabilise des le premier client.</p>
            {/* Toggle */}
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <button onClick={() => setBillingYearly(false)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${!billingYearly ? 'bg-[#FF6B2B] text-white shadow-lg shadow-[#FF6B2B]/20' : 'text-[#F5F5F3]/35'}`}>Mensuel</button>
              <button onClick={() => setBillingYearly(true)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${billingYearly ? 'bg-[#FF6B2B] text-white shadow-lg shadow-[#FF6B2B]/20' : 'text-[#F5F5F3]/35'}`}>
                Annuel {!billingYearly && <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full">-20%</span>}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {PLANS.map((plan) => {
              const price = billingYearly ? plan.price.yearly : plan.price.monthly
              return (
                <div key={plan.id} className={`relative rounded-2xl p-7 flex flex-col transition-all duration-500 noise-overlay ${plan.popular ? 'glass-landing border-2 border-[#FF6B2B]/25 shadow-[0_0_80px_rgba(255,107,43,0.08)] md:scale-[1.04]' : 'glass-landing border border-white/[0.06] hover:border-white/[0.12] hover:shadow-[0_8px_40px_rgba(0,0,0,0.3)]'}`}>
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white text-[9px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-[#FF6B2B]/25">Le plus populaire</span>
                    </div>
                  )}
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-[11px] text-[#F5F5F3]/25 mb-5">{plan.desc}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-bold">{price}</span>
                    <span className="text-[#F5F5F3]/20 text-sm">{'\u20AC'}/mois</span>
                  </div>
                  {billingYearly && <p className="text-[10px] text-emerald-400/60 font-medium mb-5">Economise {(plan.price.monthly - plan.price.yearly) * 12}{'\u20AC'}/an</p>}
                  {!billingYearly && <p className="text-[10px] text-[#F5F5F3]/15 mb-5">facture mensuellement</p>}
                  <ul className="space-y-2.5 mb-7 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5"><Check size={13} className="text-[#FF6B2B] flex-shrink-0" /><span className="text-sm text-[#F5F5F3]/40">{f}</span></li>
                    ))}
                  </ul>
                  <button onClick={() => navigate('/register')} className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${plan.popular ? 'bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white hover:shadow-lg hover:shadow-[#FF6B2B]/25' : 'bg-white/[0.04] text-[#F5F5F3] hover:bg-white/[0.07] border border-white/[0.06]'}`}>
                    <span className="relative z-10">Essai gratuit 14 jours</span>
                    {plan.popular && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />}
                  </button>
                </div>
              )
            })}
          </div>
          <p className="text-center text-[11px] text-[#F5F5F3]/15 mt-8">Paiement securise Stripe · Sans engagement · Annulation en un clic</p>
        </div>
      </section>

      {/* ══════════════════════ FAQ ══════════════════════ */}
      <section id="faq" className="py-24 md:py-36 px-5 md:px-8 relative">
        {/* Background glow */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#FF6B2B]/[0.02] blur-[150px]" />

        <div className="relative max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-[#F5F5F3]/35 font-medium mb-6">
              <HelpCircle size={12} className="text-[#FF6B2B]" />
              FAQ
            </div>
            <h2 className="text-3xl md:text-[3.25rem] font-bold tracking-tight leading-tight mb-4">
              Des questions ?
              <br />
              <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">On a les reponses.</span>
            </h2>
            <p className="text-[#F5F5F3]/25 text-base max-w-md mx-auto">
              Tout ce que tu dois savoir avant de te lancer. Et si tu ne trouves pas, demande-nous en demo.
            </p>
          </div>

          {/* FAQ grid — 2 colonnes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  openFaq === i
                    ? 'border-[#FF6B2B]/20 glass-landing shadow-[0_4px_30px_rgba(255,107,43,0.06)]'
                    : 'border-white/[0.06] glass-landing hover:border-white/[0.1] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
                }`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-start gap-3.5 px-5 py-5 text-left"
                >
                  {/* Number badge */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold transition-all duration-300 ${
                    openFaq === i
                      ? 'bg-[#FF6B2B]/15 text-[#FF6B2B]'
                      : 'bg-white/[0.04] text-[#F5F5F3]/20'
                  }`}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium block pr-2 transition-colors duration-300 ${
                      openFaq === i ? 'text-[#F5F5F3]' : 'text-[#F5F5F3]/70'
                    }`}>{faq.q}</span>
                  </div>
                  <ChevronDown
                    size={15}
                    className={`flex-shrink-0 mt-1 transition-all duration-300 ${
                      openFaq === i ? 'rotate-180 text-[#FF6B2B]' : 'text-[#F5F5F3]/15'
                    }`}
                  />
                </button>
                <div className={`transition-all duration-300 ease-out ${
                  openFaq === i ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                } overflow-hidden`}>
                  <div className="px-5 pb-5 pl-[52px]">
                    <p className="text-sm text-[#F5F5F3]/40 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA under FAQ */}
          <div className="mt-10 rounded-2xl border border-white/[0.06] glass-landing p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden noise-overlay">
            <div className="pointer-events-none absolute top-0 right-0 w-40 h-40 bg-[#FF6B2B]/[0.04] blur-[60px] rounded-full" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FF6B2B]/10 border border-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                <PhoneCall size={20} className="text-[#FF6B2B]" />
              </div>
              <div>
                <p className="text-base font-semibold text-[#F5F5F3]">Encore des questions ?</p>
                <p className="text-sm text-[#F5F5F3]/30">Reserve une demo gratuite et on en discute en live.</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/demo')}
              className="group w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[#FF6B2B]/25 transition-all flex items-center justify-center gap-2"
            >
              <Video size={15} />
              Demander une demo
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FINAL CTA ══════════════════════ */}
      <section className="relative py-28 md:py-40 px-5 md:px-8 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#FF6B2B]/[0.08] via-[#FF6B2B]/[0.02] to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] rounded-full bg-[#FF6B2B]/[0.06] blur-[150px] animate-glow-pulse" />
        <div className="pointer-events-none absolute top-1/4 left-[10%] w-[300px] h-[300px] rounded-full bg-[#FF8F5E]/[0.03] blur-[100px]" />
        <div className="pointer-events-none absolute top-1/4 right-[10%] w-[300px] h-[300px] rounded-full bg-[#FF6B2B]/[0.03] blur-[100px]" />
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 mb-8">
            <Flame size={14} className="text-[#FF6B2B]" />
            <span className="text-xs font-semibold text-[#FF6B2B]">Rejoinds 500+ coachs</span>
          </div>
          <h2 className="text-3xl md:text-[3.5rem] font-bold tracking-tight leading-tight mb-6">
            Pendant que tu hesites,
            <br /><span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">d'autres coachs scalent.</span>
          </h2>
          <p className="text-[#F5F5F3]/30 text-lg max-w-lg mx-auto mb-10 leading-relaxed">
            14 jours gratuits. Toutes les fonctionnalites. Zero risque. Ton espace t'attend deja.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/register')} className="group w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white font-semibold text-base hover:shadow-2xl hover:shadow-[#FF6B2B]/30 transition-all duration-300 inline-flex items-center justify-center gap-2.5 relative overflow-hidden">
              <span className="relative z-10 flex items-center gap-2.5">Commencer maintenant <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.15] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
            <button onClick={() => navigate('/demo')} className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/[0.07] text-[#F5F5F3]/40 font-medium hover:bg-white/[0.03] hover:text-[#F5F5F3] transition-all flex items-center justify-center gap-2">
              <Video size={15} className="text-[#FF6B2B]" /> Demander une demo
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer className="border-t border-white/[0.04] bg-[#080808] relative noise-overlay">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <ZevoLogo size="md" />
              <p className="text-[11px] text-[#F5F5F3]/15 mt-3 leading-relaxed max-w-[200px]">Le logiciel tout-en-un pour les coachs qui veulent scaler.</p>
            </div>
            {[
              { title: 'Produit', links: ['Entrainement', 'Programmes', 'Nutrition', 'Calendrier', 'Tarifs'], paths: ['/features/entrainement', '/features/programmes', '/features/nutrition', '/features/calendrier', null], ids: [null, null, null, null, 'pricing'] },
              { title: 'Ressources', links: ['Centre d\'aide', 'Blog', 'Changelog', 'Contact'] },
              { title: 'Legal', links: ['Mentions legales', 'Confidentialite', 'CGV', 'Cookies'] },
            ].map((col, i) => (
              <div key={i}>
                <p className="text-[10px] font-semibold text-[#F5F5F3]/30 uppercase tracking-wider mb-4">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      {col.paths && col.paths[j] ? (
                        <button onClick={() => navigate(col.paths[j])} className="text-sm text-[#F5F5F3]/20 hover:text-[#F5F5F3]/40 transition-colors">{link}</button>
                      ) : col.ids && col.ids[j] ? (
                        <button onClick={() => scrollTo(col.ids[j])} className="text-sm text-[#F5F5F3]/20 hover:text-[#F5F5F3]/40 transition-colors">{link}</button>
                      ) : (
                        <a href="#" className="text-sm text-[#F5F5F3]/20 hover:text-[#F5F5F3]/40 transition-colors">{link}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-white/[0.03] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-[#F5F5F3]/10">&copy; {new Date().getFullYear()} Zevo. Tous droits reserves.</p>
            <p className="text-[10px] text-[#F5F5F3]/10 flex items-center gap-1.5">Fait avec <Heart size={9} className="text-[#FF6B2B] fill-[#FF6B2B]" /> pour les coachs</p>
          </div>
        </div>
      </footer>

      {/* ══════════════════════ PREMIUM CSS ══════════════════════ */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee { animation: marquee 30s linear infinite; }

        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x { animation: gradient-x 4s ease infinite; }

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-8px) rotate(0.5deg); }
          66% { transform: translateY(4px) rotate(-0.5deg); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float 6s ease-in-out 2s infinite; }

        @keyframes glow-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        .animate-glow-pulse { animation: glow-pulse 4s ease-in-out infinite; }

        @keyframes reveal-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Premium glass card */
        .glass-landing {
          background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        /* Noise texture overlay */
        .noise-overlay::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          border-radius: inherit;
          z-index: 0;
        }

        /* Shimmer on pricing popular */
        .shimmer-border {
          background: linear-gradient(90deg, transparent 0%, rgba(255,107,43,0.15) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }

        /* Smooth scroll */
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  )
}
