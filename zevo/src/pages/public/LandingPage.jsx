import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Check, Star, Users, Dumbbell, BarChart3,
  MessageCircle, ClipboardList, Zap, Shield,
  ChevronDown, Menu, X, Sparkles, Play,
  Smartphone, CreditCard, BookOpen,
  TrendingUp, Heart, Clock, Target,
  Crown, Flame, Activity, Apple,
  FileText, Paintbrush, UserPlus, CalendarDays,
  Eye, Lock, Bell, ArrowUpRight, Utensils
} from 'lucide-react'
import { ZevoLogo } from '../../components/ui/ZevoLogo'

// ══════════════════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════════════════

const NAV_LINKS = [
  { label: 'Fonctionnalites', id: 'features' },
  { label: 'Comment ca marche', id: 'how' },
  { label: 'Tarifs', id: 'pricing' },
  { label: 'Temoignages', id: 'testimonials' },
  { label: 'FAQ', id: 'faq' },
]

// Bento features — layout irrégulier comme Ekklo
const BENTO_FEATURES = [
  {
    icon: Users,
    title: 'Hub Client 360',
    desc: 'Chaque client a sa fiche complete : objectifs, progression, mensurations, score bien-etre. Tout au meme endroit, en un coup d\'oeil.',
    size: 'large', // span 2 cols
  },
  {
    icon: Dumbbell,
    title: 'Programmes & Seances',
    desc: 'Cree des programmes multi-semaines avec exercices, series, repos. Tes clients les suivent en live.',
    size: 'normal',
  },
  {
    icon: MessageCircle,
    title: 'Messagerie temps reel',
    desc: 'Chat integre avec notifications push. Plus besoin de WhatsApp.',
    size: 'normal',
  },
  {
    icon: Utensils,
    title: 'Plans nutritionnels',
    desc: 'Cree des plans alimentaires personnalises avec macros et repas. Tes clients ont tout dans leur app.',
    size: 'normal',
  },
  {
    icon: ClipboardList,
    title: 'Formulaires & Bilans',
    desc: 'Questionnaires personnalises, bilans automatiques, collecte de donnees simplifiee.',
    size: 'normal',
  },
  {
    icon: BarChart3,
    title: 'Statistiques & Rapports',
    desc: 'Tableaux de bord detailles, graphiques de progression, taux de retention, PDF automatiques. Prends des decisions basees sur les donnees.',
    size: 'large',
  },
  {
    icon: Paintbrush,
    title: 'App Builder',
    desc: 'Ton logo, tes couleurs, tes modules. L\'experience de tes clients ressemble a TA marque.',
    size: 'normal',
  },
  {
    icon: CreditCard,
    title: 'Paiements integres',
    desc: 'Connecte Stripe en un clic. Cree des offres, encaisse automatiquement.',
    size: 'normal',
  },
]

// Section alternance image/texte — comme Ekklo
const SHOWCASES = [
  {
    badge: 'Suivi client',
    title: 'Une vision complete de chaque client',
    desc: 'Objectifs, mensurations, score bien-etre, historique des seances — tout est centralise dans le Hub Client 360. Plus besoin de jongler entre 10 outils.',
    features: ['Fiche client unifiee', 'Score bien-etre automatique', 'Alertes de desengagement', 'Historique complet'],
    visual: 'client',
  },
  {
    badge: 'Programmation',
    title: 'Des programmes qui se suivent tout seuls',
    desc: 'Cree des programmes multi-semaines en quelques minutes. Tes clients voient leurs seances, valident leurs series, et toi tu suis tout en temps reel.',
    features: ['Drag & drop intuitif', 'Exercices avec videos', 'Suivi en temps reel', 'Templates reutilisables'],
    visual: 'program',
  },
  {
    badge: 'Application mobile',
    title: 'Ton app, a tes couleurs',
    desc: 'Avec l\'App Builder, personnalise l\'experience de tes clients. Ton logo, ta palette, tes modules actives. Ils pensent utiliser TON app.',
    features: ['Branding complet', 'Modules au choix', 'Experience premium', 'Preview en direct'],
    visual: 'app',
  },
]

const STEPS = [
  { num: '01', title: 'Cree ton compte', desc: 'Inscription en 30 secondes. 14 jours d\'essai gratuit, toutes fonctionnalites incluses. Aucune carte bancaire requise.', icon: UserPlus },
  { num: '02', title: 'Configure ton espace', desc: 'Ajoute tes clients, cree tes programmes, personnalise ton app. L\'onboarding te guide pas a pas.', icon: Paintbrush },
  { num: '03', title: 'Accompagne & scale', desc: 'Tes clients suivent leurs seances et remplissent leurs bilans. Tu suis tout en temps reel et tu scales.', icon: TrendingUp },
]

const TESTIMONIALS = [
  {
    name: 'Lucas M.',
    role: 'Coach sportif independant',
    text: 'Depuis que j\'utilise Zevo, j\'ai double mon nombre de clients. L\'app me fait gagner un temps fou au quotidien. Le Hub Client est une vraie pepite.',
    avatar: 'L',
    rating: 5,
  },
  {
    name: 'Sarah K.',
    role: 'Coach nutrition & bien-etre',
    text: 'Mes clients adorent l\'experience. Les formulaires et le suivi automatique ont completement change ma facon de travailler. Je ne reviendrais en arriere pour rien.',
    avatar: 'S',
    rating: 5,
  },
  {
    name: 'Thomas R.',
    role: 'Preparateur physique',
    text: 'Le Hub Client 360 est incroyable. J\'ai toutes les infos de mes athletes en un coup d\'oeil. Les rapports PDF m\'ont fait gagner des heures chaque semaine.',
    avatar: 'T',
    rating: 5,
  },
  {
    name: 'Marie P.',
    role: 'Coach holistique',
    text: 'L\'App Builder est genial, mes clients pensent que j\'ai ma propre application. Ca change completement l\'image de mon business. Merci Zevo !',
    avatar: 'M',
    rating: 5,
  },
]

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: { monthly: 29, yearly: 24 },
    desc: 'Ideal pour demarrer ton activite de coaching',
    features: [
      'Jusqu\'a 5 clients',
      'Dashboard coach complet',
      'Messagerie temps reel',
      'Score bien-etre & alertes',
      'Formulaires personnalises',
      'Programmes multi-semaines',
      'Bibliotheque / Drive',
      'CRM prospects',
      'Support par email',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 49, yearly: 39 },
    popular: true,
    desc: 'Pour scaler ton activite et te demarquer',
    features: [
      'Jusqu\'a 50 clients',
      'Tout le plan Starter',
      'App Builder (branding)',
      'Rapports PDF automatiques',
      'Statistiques avancees',
      'Plans nutritionnels',
      'Support prioritaire',
    ],
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: { monthly: 79, yearly: 65 },
    desc: 'Pour les coachs sans aucune limite',
    features: [
      'Clients illimites',
      'Tout le plan Pro',
      'Automatisation avancee',
      'API & webhooks',
      'Support dedie',
    ],
  },
]

const STATS = [
  { value: '500+', label: 'Coachs actifs' },
  { value: '12 000+', label: 'Clients suivis' },
  { value: '4.8/5', label: 'Note moyenne' },
  { value: '98%', label: 'Taux de satisfaction' },
]

const FAQS = [
  { q: 'L\'essai gratuit est-il vraiment sans engagement ?', a: 'Oui, 14 jours gratuits avec toutes les fonctionnalites. Aucune carte bancaire demandee. Tu peux annuler a tout moment, tes donnees seront conservees 30 jours.' },
  { q: 'Mes clients doivent-ils payer pour utiliser Zevo ?', a: 'Non. Tes clients accedent gratuitement a leur espace via un lien d\'invitation que tu leur envoies. Ils n\'ont rien a payer pour utiliser l\'app.' },
  { q: 'Puis-je personnaliser l\'app a mes couleurs ?', a: 'Oui, avec l\'App Builder (inclus dans le plan Pro), tu peux personnaliser le logo, les couleurs, les modules actifs. Tes clients ont l\'impression d\'utiliser ta propre application.' },
  { q: 'Comment fonctionnent les paiements ?', a: 'Tu connectes ton compte Stripe en un clic depuis les parametres. Tu crees des offres de coaching avec le prix souhaite, et tes clients paient directement. L\'argent arrive sur ton compte Stripe.' },
  { q: 'Puis-je migrer mes clients existants ?', a: 'Oui, tu peux inviter tes clients existants par email ou via un lien d\'invitation. Ils creent leur compte en moins d\'une minute et retrouvent tout leur suivi.' },
  { q: 'Y a-t-il un engagement minimum ?', a: 'Non, tous nos plans sont sans engagement. Tu peux upgrader, downgrader ou annuler a tout moment. Pas de frais caches.' },
  { q: 'Zevo fonctionne-t-il sur mobile ?', a: 'Oui, Zevo est 100% responsive. Tes clients et toi pouvez utiliser la plateforme depuis n\'importe quel appareil : smartphone, tablette ou ordinateur.' },
]

const LOGOS_PARTNERS = [
  'CrossFit', 'BPJEPS', 'STAPS', 'FitPro', 'CoachHub'
]

// ══════════════════════════════════════════════════════════
// HOOKS
// ══════════════════════════════════════════════════════════

function useInView(ref, opts = {}) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); if (opts.once !== false) obs.disconnect() } },
      { threshold: opts.threshold || 0.2 }
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref])
  return inView
}

// ══════════════════════════════════════════════════════════
// SHOWCASE VISUAL MOCKUPS
// ══════════════════════════════════════════════════════════

function ShowcaseVisual({ type }) {
  if (type === 'client') {
    return (
      <div className="rounded-2xl bg-[#161616] border border-white/[0.06] p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center text-white text-sm font-bold">JD</div>
          <div>
            <div className="text-sm font-semibold text-[#F5F5F3]">Julie Dupont</div>
            <div className="text-[10px] text-[#F5F5F3]/30">Objectif : Perte de poids</div>
          </div>
          <div className="ml-auto px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">Actif</div>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: 'Bien-etre', val: '8.4', color: '#10B981' },
            { label: 'Seances', val: '12/16', color: '#3B82F6' },
            { label: 'Poids', val: '-3.2 kg', color: '#FF6B2B' },
          ].map((s, i) => (
            <div key={i} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 text-center">
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.val}</p>
              <p className="text-[9px] text-[#F5F5F3]/30 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-1 h-16">
          {[35, 42, 38, 55, 50, 62, 58, 70, 65, 75, 72, 80].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#FF6B2B]/60 to-[#FF8F5E]/30" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (type === 'program') {
    return (
      <div className="rounded-2xl bg-[#161616] border border-white/[0.06] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-[#F5F5F3]">Programme Force</div>
          <div className="text-[10px] text-[#F5F5F3]/30">Semaine 3/8</div>
        </div>
        {[
          { name: 'Squat Back', sets: '4x8', rpe: '8', done: true },
          { name: 'Bench Press', sets: '4x6', rpe: '9', done: true },
          { name: 'Romanian Deadlift', sets: '3x10', rpe: '7', done: false },
          { name: 'Pull-ups', sets: '4x8', rpe: '8', done: false },
        ].map((ex, i) => (
          <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${ex.done ? 'bg-emerald-500/[0.04] border-emerald-500/20' : 'bg-white/[0.02] border-white/[0.05]'}`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${ex.done ? 'bg-emerald-500/15' : 'bg-white/[0.05]'}`}>
              {ex.done ? <Check size={14} className="text-emerald-400" /> : <Dumbbell size={14} className="text-[#F5F5F3]/30" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#F5F5F3]">{ex.name}</p>
              <p className="text-[10px] text-[#F5F5F3]/30">{ex.sets} · RPE {ex.rpe}</p>
            </div>
            {ex.done && <span className="text-[9px] text-emerald-400 font-bold">FAIT</span>}
          </div>
        ))}
      </div>
    )
  }

  // App builder visual
  return (
    <div className="rounded-2xl bg-[#161616] border border-white/[0.06] overflow-hidden">
      {/* Phone frame */}
      <div className="mx-auto max-w-[220px] py-6">
        <div className="rounded-[24px] border-2 border-white/[0.08] bg-[#0D0D0D] overflow-hidden shadow-2xl">
          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-1.5 text-[8px] text-[#F5F5F3]/40">
            <span>9:41</span>
            <div className="flex gap-1">
              <Activity size={8} />
              <Bell size={8} />
            </div>
          </div>
          {/* App header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E]">
            <p className="text-white text-[10px] font-bold">Mon Coach App</p>
            <p className="text-white/60 text-[8px]">Bienvenue, Julie</p>
          </div>
          {/* Content */}
          <div className="p-3 space-y-2">
            <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays size={10} className="text-[#FF6B2B]" />
                <span className="text-[9px] font-semibold text-[#F5F5F3]">Prochaine seance</span>
              </div>
              <p className="text-[8px] text-[#F5F5F3]/40">Upper Body · Aujourd'hui 18h</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5">
              <div className="flex items-center gap-2 mb-2">
                <Heart size={10} className="text-emerald-400" />
                <span className="text-[9px] font-semibold text-[#F5F5F3]">Bien-etre</span>
              </div>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`h-4 flex-1 rounded ${i <= 4 ? 'bg-emerald-500/30' : 'bg-white/[0.05]'}`} />
                ))}
              </div>
            </div>
          </div>
          {/* Bottom nav */}
          <div className="flex items-center justify-around py-2 border-t border-white/[0.06]">
            {[Activity, Dumbbell, MessageCircle, Users].map((Icon, i) => (
              <Icon key={i} size={12} className={i === 0 ? 'text-[#FF6B2B]' : 'text-[#F5F5F3]/20'} />
            ))}
          </div>
        </div>
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
  const [openFaq, setOpenFaq] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const [billingYearly, setBillingYearly] = useState(false)
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  // Intersection observers
  const statsRef = useRef(null)
  const statsInView = useInView(statsRef)
  const featuresRef = useRef(null)
  const featuresInView = useInView(featuresRef)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % TESTIMONIALS.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const scrollTo = (id) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F3] overflow-x-hidden">

      {/* ══════════════════════════════════════ */}
      {/* NAVBAR — sticky, glassmorphism on scroll */}
      {/* ══════════════════════════════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#0D0D0D]/70 backdrop-blur-2xl border-b border-white/[0.06] py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-5 md:px-8 flex items-center justify-between">
          <ZevoLogo size="md" />

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map(link => (
              <button key={link.id} onClick={() => scrollTo(link.id)} className="text-[13px] text-[#F5F5F3]/50 hover:text-[#F5F5F3] transition-colors duration-300 font-medium">
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-medium text-[#F5F5F3]/60 hover:text-[#F5F5F3] transition-colors">
              Se connecter
            </button>
            <button onClick={() => navigate('/register')} className="group px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[#FF6B2B]/25 transition-all duration-300 flex items-center gap-2">
              Essai gratuit
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Mobile burger */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-[#F5F5F3]/60 hover:text-[#F5F5F3] transition-colors">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu overlay */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 top-[60px] bg-[#0D0D0D]/98 backdrop-blur-2xl z-40">
            <div className="p-6 space-y-1">
              {NAV_LINKS.map((link, i) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="block w-full text-left text-lg font-medium text-[#F5F5F3]/60 hover:text-[#F5F5F3] py-3 border-b border-white/[0.04] transition-all"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-6 space-y-3">
                <button onClick={() => { setMenuOpen(false); navigate('/login') }} className="block w-full text-center text-sm text-[#F5F5F3]/60 py-3">
                  Se connecter
                </button>
                <button onClick={() => { setMenuOpen(false); navigate('/register') }} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white text-sm font-semibold">
                  Commencer gratuitement
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════ */}
      {/* HERO — Fullscreen avec reveal anim     */}
      {/* ══════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center px-5 md:px-8 pt-24 pb-20">
        {/* Background effects */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] rounded-full bg-[#FF6B2B]/[0.06] blur-[150px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-[#FF8F5E]/[0.03] blur-[120px]" />
        {/* Grid pattern */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,black,transparent)]" />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Rating badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] mb-8">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => <Star key={i} size={12} className="text-[#FF6B2B] fill-[#FF6B2B]" />)}
            </div>
            <span className="text-xs font-medium text-[#F5F5F3]/50">4.8/5 — Aime par 500+ coachs</span>
          </div>

          <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-bold tracking-tight leading-[1.08] mb-7">
            Le logiciel tout-en-un
            <br />
            pour les{' '}
            <span className="relative">
              <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">coachs ambitieux</span>
              {/* Underline decoration */}
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 8C50 2 150 2 298 8" stroke="#FF6B2B" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
              </svg>
            </span>
          </h1>

          <p className="text-lg md:text-xl text-[#F5F5F3]/40 max-w-2xl mx-auto mb-10 leading-relaxed">
            Gere tes clients, cree des programmes, suis leur progression et developpe ton activite. Tout depuis une seule plateforme.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <button
              onClick={() => navigate('/register')}
              className="group w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white font-semibold text-base hover:shadow-2xl hover:shadow-[#FF6B2B]/30 transition-all duration-300 flex items-center justify-center gap-2.5"
            >
              Commencer gratuitement
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
            </button>
            <button
              onClick={() => scrollTo('features')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/[0.08] text-[#F5F5F3]/60 font-medium text-base hover:bg-white/[0.03] hover:text-[#F5F5F3] hover:border-white/[0.12] transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Play size={16} className="text-[#FF6B2B]" />
              Voir la demo
            </button>
          </div>

          <p className="text-xs text-[#F5F5F3]/25 mb-16">14 jours gratuits · Sans carte bancaire · Sans engagement</p>

          {/* Hero mockup browser */}
          <div className="relative mx-auto max-w-4xl">
            <div className="rounded-2xl md:rounded-3xl border border-white/[0.08] bg-[#1A1A1A] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#141414] border-b border-white/[0.05]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-2 px-4 py-1 rounded-lg bg-white/[0.04] text-[10px] text-[#F5F5F3]/25 font-mono">
                    <Lock size={8} />
                    app.zevo.coach/dashboard
                  </div>
                </div>
              </div>
              {/* Dashboard content */}
              <div className="p-4 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-base md:text-lg font-bold text-[#F5F5F3]">Bonjour, Coach</div>
                    <div className="text-[11px] text-[#F5F5F3]/30">Tableau de bord · Lundi 7 Avril</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                      <Bell size={14} className="text-[#F5F5F3]/30" />
                    </div>
                  </div>
                </div>
                {/* KPI row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Clients actifs', val: '24', trend: '+3', icon: Users, color: '#FF6B2B' },
                    { label: 'Seances / semaine', val: '67', trend: '+12%', icon: Dumbbell, color: '#3B82F6' },
                    { label: 'Taux retention', val: '94%', trend: '+2%', icon: TrendingUp, color: '#10B981' },
                    { label: 'Revenu mensuel', val: '3 240\u20AC', trend: '+18%', icon: CreditCard, color: '#F59E0B' },
                  ].map((kpi, i) => (
                    <div key={i} className="rounded-xl bg-white/[0.025] border border-white/[0.05] p-3 md:p-4">
                      <div className="flex items-center justify-between mb-2">
                        <kpi.icon size={14} style={{ color: kpi.color }} />
                        <span className="text-[9px] text-emerald-400 font-semibold">{kpi.trend}</span>
                      </div>
                      <p className="text-lg md:text-xl font-bold text-[#F5F5F3]">{kpi.val}</p>
                      <p className="text-[10px] text-[#F5F5F3]/30 mt-0.5">{kpi.label}</p>
                    </div>
                  ))}
                </div>
                {/* Chart area */}
                <div className="rounded-xl bg-white/[0.025] border border-white/[0.05] p-4 md:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-[#F5F5F3]/60">Progression clients</span>
                    <span className="text-[10px] text-[#F5F5F3]/25">12 derniers mois</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-20 md:h-28">
                    {[30, 45, 40, 55, 50, 65, 60, 72, 68, 80, 78, 90].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t transition-all duration-500" style={{ height: `${h}%`, background: i >= 10 ? 'linear-gradient(to top, #FF6B2B, #FF8F5E)' : `linear-gradient(to top, rgba(255,107,43,${0.15 + i * 0.05}), rgba(255,143,94,${0.1 + i * 0.04}))` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating glow */}
            <div className="pointer-events-none absolute -bottom-20 left-1/2 -translate-x-1/2 w-[60%] h-32 bg-[#FF6B2B]/[0.05] blur-[80px] rounded-full" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* TRUST BAR — Logos & Stats              */}
      {/* ══════════════════════════════════════ */}
      <section className="border-y border-white/[0.05] bg-[#0A0A0A]">
        {/* Logos marquee */}
        <div className="py-8 border-b border-white/[0.04] overflow-hidden">
          <p className="text-center text-[10px] uppercase tracking-[0.2em] text-[#F5F5F3]/20 font-medium mb-6">Utilise par des coachs certifies</p>
          <div className="flex items-center justify-center gap-12 md:gap-20 opacity-30">
            {LOGOS_PARTNERS.map((name, i) => (
              <span key={i} className="text-sm md:text-base font-bold text-[#F5F5F3] whitespace-nowrap tracking-wider">{name}</span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div ref={statsRef} className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <div key={i} className="text-center">
              <p
                className={`text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent transition-all duration-700 ${statsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                {s.value}
              </p>
              <p className="text-sm text-[#F5F5F3]/30 mt-2 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* FEATURES — Bento Grid (like Ekklo)     */}
      {/* ══════════════════════════════════════ */}
      <section id="features" className="py-24 md:py-36 px-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 md:mb-20">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-[#F5F5F3]/40 font-medium mb-6">
              <Zap size={12} className="text-[#FF6B2B]" />
              Fonctionnalites
            </div>
            <h2 className="text-3xl md:text-[3.25rem] font-bold tracking-tight leading-tight mb-5">
              Tout ce dont tu as besoin.
              <br />
              <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">Rien de superflu.</span>
            </h2>
            <p className="text-[#F5F5F3]/35 text-lg max-w-xl mx-auto leading-relaxed">
              Chaque fonctionnalite a ete pensee pour te faire gagner du temps et offrir une experience premium a tes clients.
            </p>
          </div>

          {/* Bento grid */}
          <div ref={featuresRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {BENTO_FEATURES.map((f, i) => {
              const Icon = f.icon
              const isLarge = f.size === 'large'
              return (
                <div
                  key={i}
                  className={`group relative rounded-2xl border border-white/[0.06] bg-[#161616] p-6 md:p-7 hover:border-[#FF6B2B]/20 transition-all duration-500 ${isLarge ? 'lg:col-span-2' : ''} ${featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  {/* Hover gradient */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[#FF6B2B]/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative">
                    <div className="w-11 h-11 rounded-xl bg-[#FF6B2B]/10 border border-[#FF6B2B]/10 flex items-center justify-center mb-5 group-hover:bg-[#FF6B2B]/15 group-hover:border-[#FF6B2B]/20 transition-all duration-500">
                      <Icon size={20} className="text-[#FF6B2B]" />
                    </div>
                    <h3 className="text-base font-semibold mb-2 text-[#F5F5F3]">{f.title}</h3>
                    <p className="text-sm text-[#F5F5F3]/35 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* SHOWCASES — Alternance image/texte     */}
      {/* ══════════════════════════════════════ */}
      <section className="py-12 md:py-24 px-5 md:px-8">
        <div className="max-w-6xl mx-auto space-y-20 md:space-y-32">
          {SHOWCASES.map((item, i) => {
            const isReversed = i % 2 === 1
            return (
              <div key={i} className={`flex flex-col ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-10 md:gap-16`}>
                {/* Text */}
                <div className="flex-1 max-w-lg">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF6B2B]/10 border border-[#FF6B2B]/15 text-[10px] font-bold text-[#FF6B2B] uppercase tracking-wider mb-5">
                    {item.badge}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-4 leading-tight">{item.title}</h3>
                  <p className="text-[#F5F5F3]/40 text-base leading-relaxed mb-6">{item.desc}</p>
                  <ul className="space-y-3">
                    {item.features.map((feat, j) => (
                      <li key={j} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-md bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                          <Check size={12} className="text-[#FF6B2B]" />
                        </div>
                        <span className="text-sm text-[#F5F5F3]/50">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Visual */}
                <div className="flex-1 w-full max-w-md">
                  <ShowcaseVisual type={item.visual} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* HOW IT WORKS — 3 Steps                 */}
      {/* ══════════════════════════════════════ */}
      <section id="how" className="py-24 md:py-36 px-5 md:px-8 relative border-y border-white/[0.05]">
        <div className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#FF6B2B]/[0.025] blur-[150px]" />

        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-16 md:mb-20">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-[#F5F5F3]/40 font-medium mb-6">
              <Target size={12} className="text-[#FF6B2B]" />
              Comment ca marche
            </div>
            <h2 className="text-3xl md:text-[3.25rem] font-bold tracking-tight leading-tight mb-5">
              Operationnel en{' '}
              <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">2 minutes</span>
            </h2>
            <p className="text-[#F5F5F3]/35 text-lg max-w-lg mx-auto">
              Pas de configuration complexe. Tu t'inscris, tu configures, c'est parti.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector line desktop */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-[#FF6B2B]/20 to-transparent" />

            {STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={i} className="relative rounded-2xl border border-white/[0.06] bg-[#161616] p-7 hover:border-[#FF6B2B]/15 transition-all duration-500 group text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#FF6B2B]/10 border border-[#FF6B2B]/15 flex items-center justify-center mx-auto mb-5 group-hover:bg-[#FF6B2B]/15 transition-all">
                    <Icon size={24} className="text-[#FF6B2B]" />
                  </div>
                  <span className="text-[10px] font-bold text-[#FF6B2B]/40 uppercase tracking-widest">Etape {s.num}</span>
                  <h3 className="text-lg font-semibold mt-2 mb-3 text-[#F5F5F3]">{s.title}</h3>
                  <p className="text-sm text-[#F5F5F3]/35 leading-relaxed">{s.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* TESTIMONIALS — Carousel style          */}
      {/* ══════════════════════════════════════ */}
      <section id="testimonials" className="py-24 md:py-36 px-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-[#F5F5F3]/40 font-medium mb-6">
              <Star size={12} className="text-[#FF6B2B]" />
              Temoignages
            </div>
            <h2 className="text-3xl md:text-[3.25rem] font-bold tracking-tight leading-tight mb-5">
              Ils ont choisi{' '}
              <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">Zevo</span>
            </h2>
            <p className="text-[#F5F5F3]/35 text-lg max-w-lg mx-auto">
              Decouvre pourquoi des centaines de coachs nous font confiance au quotidien.
            </p>
          </div>

          {/* Cards grid with featured */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className={`rounded-2xl border bg-[#161616] p-6 flex flex-col transition-all duration-500 ${
                  i === activeTestimonial
                    ? 'border-[#FF6B2B]/25 shadow-[0_0_40px_rgba(255,107,43,0.06)]'
                    : 'border-white/[0.06]'
                }`}
              >
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={13} className="text-[#FF6B2B] fill-[#FF6B2B]" />
                  ))}
                </div>
                <p className="text-sm text-[#F5F5F3]/50 leading-relaxed flex-1 mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.05]">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#F5F5F3]">{t.name}</p>
                    <p className="text-[11px] text-[#F5F5F3]/25">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === activeTestimonial ? 'w-8 h-2 bg-[#FF6B2B]' : 'w-2 h-2 bg-white/[0.1] hover:bg-white/[0.2]'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* PRICING — Toggle mensuel/annuel        */}
      {/* ══════════════════════════════════════ */}
      <section id="pricing" className="py-24 md:py-36 px-5 md:px-8 relative border-y border-white/[0.05]">
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-[#FF6B2B]/[0.04] blur-[150px]" />

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-[#F5F5F3]/40 font-medium mb-6">
              <CreditCard size={12} className="text-[#FF6B2B]" />
              Tarifs
            </div>
            <h2 className="text-3xl md:text-[3.25rem] font-bold tracking-tight leading-tight mb-5">
              Simple, transparent,{' '}
              <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">sans surprise</span>
            </h2>
            <p className="text-[#F5F5F3]/35 text-lg max-w-lg mx-auto mb-8">
              14 jours d'essai gratuit. Sans engagement. Annulable a tout moment.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-3 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <button
                onClick={() => setBillingYearly(false)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${!billingYearly ? 'bg-[#FF6B2B] text-white shadow-lg shadow-[#FF6B2B]/20' : 'text-[#F5F5F3]/40 hover:text-[#F5F5F3]/60'}`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setBillingYearly(true)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${billingYearly ? 'bg-[#FF6B2B] text-white shadow-lg shadow-[#FF6B2B]/20' : 'text-[#F5F5F3]/40 hover:text-[#F5F5F3]/60'}`}
              >
                Annuel
                {!billingYearly && <span className="text-[10px] text-emerald-400 font-bold">-20%</span>}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {PLANS.map((plan) => {
              const price = billingYearly ? plan.price.yearly : plan.price.monthly
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-7 flex flex-col transition-all duration-500 ${
                    plan.popular
                      ? 'bg-[#1A1A1A] border-2 border-[#FF6B2B]/30 shadow-[0_0_80px_rgba(255,107,43,0.08)] scale-[1.02] md:scale-105'
                      : 'bg-[#161616] border border-white/[0.06] hover:border-white/[0.1]'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-[#FF6B2B]/25">
                        Le plus populaire
                      </span>
                    </div>
                  )}

                  <div className="mb-5">
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    <p className="text-xs text-[#F5F5F3]/25">{plan.desc}</p>
                  </div>

                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold">{price}</span>
                    <span className="text-[#F5F5F3]/25 text-sm">{'\u20AC'}/mois</span>
                  </div>

                  {billingYearly && (
                    <p className="text-[10px] text-emerald-400/70 font-medium -mt-4 mb-5">
                      Economise {(plan.price.monthly - plan.price.yearly) * 12}{'\u20AC'}/an
                    </p>
                  )}

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5">
                        <Check size={14} className="text-[#FF6B2B] flex-shrink-0" />
                        <span className="text-sm text-[#F5F5F3]/45">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => navigate('/register')}
                    className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white hover:shadow-lg hover:shadow-[#FF6B2B]/25'
                        : 'bg-white/[0.05] text-[#F5F5F3] hover:bg-white/[0.08] border border-white/[0.08]'
                    }`}
                  >
                    Commencer l'essai gratuit
                  </button>
                </div>
              )
            })}
          </div>

          <p className="text-center text-xs text-[#F5F5F3]/20 mt-8">
            Paiement securise via Stripe · Annulation en un clic · Pas de frais caches
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* FAQ — Accordion                        */}
      {/* ══════════════════════════════════════ */}
      <section id="faq" className="py-24 md:py-36 px-5 md:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Questions frequentes
            </h2>
            <p className="text-[#F5F5F3]/30 text-base">
              Une question ? On a surement la reponse.
            </p>
          </div>

          <div className="space-y-2.5">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className={`rounded-2xl border transition-all duration-300 ${
                  openFaq === i ? 'border-[#FF6B2B]/15 bg-[#161616]' : 'border-white/[0.06] bg-[#161616]/50 hover:bg-[#161616]'
                }`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <span className="text-sm font-medium text-[#F5F5F3] pr-4">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-[#F5F5F3]/25 flex-shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-[#FF6B2B]' : ''}`}
                  />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-48 pb-5' : 'max-h-0'}`}>
                  <p className="px-6 text-sm text-[#F5F5F3]/35 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* FINAL CTA — Full-width gradient        */}
      {/* ══════════════════════════════════════ */}
      <section className="relative py-24 md:py-36 px-5 md:px-8 overflow-hidden">
        {/* Gradient background */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#FF6B2B]/[0.06] via-[#FF6B2B]/[0.02] to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[#FF6B2B]/[0.06] blur-[120px]" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 mb-8">
            <Flame size={14} className="text-[#FF6B2B]" />
            <span className="text-xs font-semibold text-[#FF6B2B]">Rejoinds 500+ coachs</span>
          </div>

          <h2 className="text-3xl md:text-[3.5rem] font-bold tracking-tight leading-tight mb-6">
            Pret a transformer
            <br />
            <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">ton coaching ?</span>
          </h2>
          <p className="text-[#F5F5F3]/35 text-lg max-w-lg mx-auto mb-10 leading-relaxed">
            Cree ton compte en 30 secondes et decouvre tout ce que Zevo peut faire pour toi. 14 jours gratuits, sans carte bancaire.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="group w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white font-semibold text-base hover:shadow-2xl hover:shadow-[#FF6B2B]/30 transition-all duration-300 inline-flex items-center justify-center gap-2.5"
            >
              Commencer gratuitement
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/[0.08] text-[#F5F5F3]/50 font-medium text-base hover:bg-white/[0.03] hover:text-[#F5F5F3] transition-all"
            >
              J'ai deja un compte
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* FOOTER                                 */}
      {/* ══════════════════════════════════════ */}
      <footer className="border-t border-white/[0.05] bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <ZevoLogo size="md" />
              <p className="text-xs text-[#F5F5F3]/20 mt-3 leading-relaxed max-w-[200px]">
                Le logiciel tout-en-un pour les coachs qui veulent scaler leur activite.
              </p>
            </div>

            {/* Produit */}
            <div>
              <p className="text-xs font-semibold text-[#F5F5F3]/40 uppercase tracking-wider mb-4">Produit</p>
              <ul className="space-y-2.5">
                {['Fonctionnalites', 'Tarifs', 'Temoignages', 'FAQ'].map((link, i) => (
                  <li key={i}>
                    <button
                      onClick={() => scrollTo(['features', 'pricing', 'testimonials', 'faq'][i])}
                      className="text-sm text-[#F5F5F3]/25 hover:text-[#F5F5F3]/50 transition-colors"
                    >
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Ressources */}
            <div>
              <p className="text-xs font-semibold text-[#F5F5F3]/40 uppercase tracking-wider mb-4">Ressources</p>
              <ul className="space-y-2.5">
                {['Centre d\'aide', 'Blog', 'Changelog', 'Contact'].map((link, i) => (
                  <li key={i}>
                    <a href="#" className="text-sm text-[#F5F5F3]/25 hover:text-[#F5F5F3]/50 transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-semibold text-[#F5F5F3]/40 uppercase tracking-wider mb-4">Legal</p>
              <ul className="space-y-2.5">
                {['Mentions legales', 'Confidentialite', 'CGV', 'Cookies'].map((link, i) => (
                  <li key={i}>
                    <a href="#" className="text-sm text-[#F5F5F3]/25 hover:text-[#F5F5F3]/50 transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-[#F5F5F3]/15">&copy; {new Date().getFullYear()} Zevo. Tous droits reserves.</p>
            <div className="flex items-center gap-2 text-[11px] text-[#F5F5F3]/15">
              <span>Fait avec</span>
              <Heart size={10} className="text-[#FF6B2B] fill-[#FF6B2B]" />
              <span>pour les coachs</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
