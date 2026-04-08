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
  Video, HelpCircle, PhoneCall, Brain, Minus
} from 'lucide-react'
import { ZevoLogo } from '../../components/ui/ZevoLogo'

// ══════════════════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════════════════

const MEGA_MENU = {
  sport: {
    title: 'SPORT',
    items: [
      { icon: Dumbbell, label: 'Programmes & seances', desc: 'Multi-semaines, drag & drop, suivi live', path: '/features/programmes' },
      { icon: BookOpen, label: 'Bibliotheque d\'exercices', desc: '500+ exercices avec demos video', path: '/features/bibliotheque' },
      { icon: CalendarDays, label: 'Calendrier & reservations', desc: 'Planning automatise + creneaux', path: '/features/calendrier' },
    ],
  },
  nutrition: {
    title: 'NUTRITION',
    items: [
      { icon: Utensils, label: 'Plans nutritionnels', desc: 'Macros, repas personnalises', path: '/features/nutrition' },
      { icon: ClipboardList, label: 'Suivi alimentaire', desc: 'Journal + analyse automatique', path: '/features/nutrition' },
    ],
  },
  suivi: {
    title: 'SUIVI CLIENT',
    items: [
      { icon: Users, label: 'Hub Client 360', desc: 'Fiche complete, objectifs, historique', path: '/features/hub-client' },
      { icon: BarChart3, label: 'Rapports & statistiques', desc: 'Dashboards, PDF automatiques', path: '/features/statistiques' },
      { icon: ClipboardList, label: 'Formulaires & bilans', desc: 'Questionnaires automatises', path: '/features/formulaires' },
    ],
  },
  paiements: {
    title: 'PAIEMENTS',
    items: [
      { icon: CreditCard, label: 'Paiements Stripe', desc: 'Offres, abonnements, facturation', path: '/features/paiements' },
      { icon: UserPlus, label: 'CRM Prospects', desc: 'Pipeline commercial integre', path: '/features/prospects' },
    ],
  },
  app: {
    title: 'APP BUILDER',
    items: [
      { icon: Paintbrush, label: 'Branding personnalise', desc: 'Logo, couleurs, modules au choix', path: '/features/app-builder' },
      { icon: MessageCircle, label: 'Messagerie', desc: 'Chat temps reel + vocaux + fichiers', path: '/features/messagerie' },
    ],
  },
}

const FEATURES_GRID = [
  { icon: Dumbbell, title: 'Sport', desc: 'Programmes multi-semaines, exercices avec demos, suivi en temps reel. Tout pour creer des seances qui font progresser.', color: '#FF5C1A' },
  { icon: Utensils, title: 'Nutrition', desc: 'Plans alimentaires personnalises, calcul des macros, journal alimentaire. Le suivi nutritionnel complet.', color: '#22c55e' },
  { icon: CreditCard, title: 'Paiements', desc: 'Stripe integre : offres, abonnements, facturation automatique. Tu recois tes paiements directement.', color: '#f59e0b' },
  { icon: Paintbrush, title: 'App Builder', desc: 'Ton logo, tes couleurs, tes modules. Tes clients pensent que c\'est ta propre app.', color: '#a855f7' },
  { icon: Heart, title: 'Bien-etre 360', desc: 'Score de bien-etre automatique : sommeil, stress, humeur, energie. Detecte les baisses avant tes clients.', color: '#ec4899' },
  { icon: Brain, title: 'Intelligence', desc: 'Rapports PDF automatiques, alertes de desengagement, statistiques avancees. Prends les bonnes decisions.', color: '#3b82f6' },
]

const STEPS = [
  { num: '01', title: 'Cree ton compte', desc: '30 secondes. Pas de carte bancaire requise. Acces a toutes les fonctionnalites pendant 14 jours.', icon: Rocket },
  { num: '02', title: 'Configure & invite', desc: 'Personnalise ton espace, ajoute tes clients par lien ou email. L\'onboarding te guide pas a pas.', icon: Paintbrush },
  { num: '03', title: 'Scale ton coaching', desc: 'Tes clients progressent, tu mesures tout, tu grandis. C\'est aussi simple que ca.', icon: TrendingUp },
]

const COMPETITORS = [
  { feature: 'Programmes sport', zevo: true, trainerize: true, gymkee: true, excel: false },
  { feature: 'Nutrition & macros', zevo: true, trainerize: false, gymkee: true, excel: false },
  { feature: 'Messagerie temps reel', zevo: true, trainerize: true, gymkee: true, excel: false },
  { feature: 'Paiements Stripe integres', zevo: true, trainerize: false, gymkee: true, excel: false },
  { feature: 'App Builder (branding)', zevo: true, trainerize: false, gymkee: true, excel: false },
  { feature: 'Bien-etre & score 360', zevo: true, trainerize: false, gymkee: false, excel: false },
  { feature: 'Rapports PDF automatiques', zevo: true, trainerize: false, gymkee: false, excel: false },
  { feature: 'Calendrier & reservations', zevo: true, trainerize: true, gymkee: true, excel: false },
  { feature: 'En francais', zevo: true, trainerize: false, gymkee: true, excel: true },
  { feature: 'A partir de 0\u20AC/mois', zevo: true, trainerize: false, gymkee: false, excel: true },
]

const PLANS = [
  {
    id: 'starter', name: 'Starter', price: { monthly: 0, yearly: 0 },
    desc: 'Pour decouvrir Zevo',
    features: ['5 clients', 'Programmes sport', 'Messagerie', 'Calendrier', 'Formulaires', 'Suivi basique'],
    cta: 'Commencer gratuitement',
  },
  {
    id: 'pro', name: 'Pro', price: { monthly: 29, yearly: 24 }, popular: true,
    desc: 'Pour scaler serieusement',
    features: ['Clients illimites', 'Tout le Starter', 'Nutrition & macros', 'App Builder (branding)', 'Paiements Stripe', 'Rapports PDF', 'Statistiques avancees', 'Support prioritaire'],
    cta: 'Essai gratuit 14 jours',
  },
  {
    id: 'unlimited', name: 'Business', price: { monthly: 59, yearly: 49 },
    desc: 'Pour les equipes',
    features: ['Tout le Pro', 'Multi-coachs', 'Automatisations', 'API & webhooks', 'Support dedie', 'Onboarding personnalise'],
    cta: 'Contacter l\'equipe',
  },
]

const TESTIMONIALS = [
  {
    name: 'Lucas Martin', role: 'Coach sportif, Paris', avatar: 'LM',
    text: 'J\'ai double mon nombre de clients en 3 mois. Le Hub Client me fait gagner un temps fou. Mes clients adorent l\'experience.',
    metric: { value: 'x2', label: 'clients en 3 mois' },
  },
  {
    name: 'Sarah Khelifi', role: 'Coach nutrition, Lyon', avatar: 'SK',
    text: 'Le suivi nutritionnel et les formulaires automatiques ont completement change ma facon de travailler. Je ne reviendrais en arriere pour rien au monde.',
    metric: { value: '4h', label: 'gagnees par semaine' },
  },
  {
    name: 'Thomas Renaud', role: 'Preparateur physique, Bordeaux', avatar: 'TR',
    text: 'Les rapports PDF auto m\'ont fait gagner des heures. Mes athletes voient leur progression, ca les motive enormement.',
    metric: { value: '98%', label: 'retention clients' },
  },
]

const FAQS = [
  { q: 'L\'essai gratuit est-il vraiment sans engagement ?', a: 'Oui, 14 jours gratuits avec TOUTES les fonctionnalites Pro. Aucune carte bancaire requise. Tu peux annuler en un clic.' },
  { q: 'Mes clients doivent-ils payer pour utiliser Zevo ?', a: 'Non. Tes clients accedent gratuitement a leur espace via un lien d\'invitation. Ils n\'ont rien a payer.' },
  { q: 'Puis-je personnaliser l\'app a mes couleurs ?', a: 'Oui ! L\'App Builder (plan Pro) te permet de mettre ton logo, tes couleurs, tes modules. Tes clients ont l\'impression d\'utiliser ta propre application.' },
  { q: 'Comment fonctionnent les paiements ?', a: 'Tu connectes Stripe en un clic. Tu crees des offres avec ton prix, tes clients paient directement. L\'argent arrive sur ton compte, zero commission Zevo.' },
  { q: 'Y a-t-il un engagement ?', a: 'Non. Mensuel sans engagement. Upgrade, downgrade ou annule a tout moment. Zero frais caches.' },
  { q: 'Ca marche sur mobile ?', a: '100% responsive et installable en PWA. Smartphone, tablette, desktop — tout fonctionne partout, comme une app native.' },
]

const SOCIAL_PROOF_NAMES = [
  'Julien D.', 'Amira K.', 'Paul R.', 'Laura M.', 'Kevin T.', 'Sofia B.', 'Marc L.', 'Chloe V.',
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
      { threshold: opts.threshold || 0.1 }
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref])
  return inView
}

// ══════════════════════════════════════════════════════════
// SOCIAL PROOF POPUP
// ══════════════════════════════════════════════════════════

function SocialProofPopup({ visible, name }) {
  return (
    <div className={`fixed bottom-6 left-6 z-40 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#111]/90 backdrop-blur-xl border border-white/[0.06] shadow-2xl shadow-black/50">
        <div className="w-8 h-8 rounded-full bg-[#FF5C1A] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
          {name?.charAt(0)}
        </div>
        <div>
          <p className="text-xs font-semibold text-[#F5F5F3]" style={{ fontFamily: "'Instrument Sans', sans-serif" }}>{name} vient de s'inscrire</p>
          <p className="text-[10px] text-[#F5F5F3]/25">Il y a quelques instants</p>
        </div>
        <Sparkles size={14} className="text-[#FF5C1A] flex-shrink-0" />
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
  const [megaMenuOpen, setMegaMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const [billingYearly, setBillingYearly] = useState(false)

  // Social proof popup
  const [showPopup, setShowPopup] = useState(false)
  const [popupName, setPopupName] = useState('')

  // Intersection refs
  const heroRef = useRef(null)
  const heroInView = useInView(heroRef, { threshold: 0.05 })
  const featuresRef = useRef(null)
  const featuresInView = useInView(featuresRef)
  const stepsRef = useRef(null)
  const stepsInView = useInView(stepsRef)
  const compareRef = useRef(null)
  const compareInView = useInView(compareRef)
  const pricingRef = useRef(null)
  const pricingInView = useInView(pricingRef)
  const testiRef = useRef(null)
  const testiInView = useInView(testiRef)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

  const scrollTo = (id) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }

  // Close mega-menu on click outside
  useEffect(() => {
    if (!megaMenuOpen) return
    const close = () => setMegaMenuOpen(false)
    const timer = setTimeout(() => document.addEventListener('click', close), 0)
    return () => { clearTimeout(timer); document.removeEventListener('click', close) }
  }, [megaMenuOpen])

  const font = { fontFamily: "'Instrument Sans', sans-serif" }
  const fontTitle = { fontFamily: "'Clash Display', sans-serif" }

  return (
    <div className="min-h-screen bg-[#060606] text-[#F5F5F3] overflow-x-hidden relative" style={font}>
      <SocialProofPopup visible={showPopup} name={popupName} />

      {/* ══════════════════════ NAVBAR ══════════════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#060606]/80 backdrop-blur-2xl border-b border-white/[0.06] py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 flex items-center justify-between">
          <ZevoLogo size="md" />

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-7">
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setMegaMenuOpen(!megaMenuOpen)}
                className="flex items-center gap-1.5 text-[13px] text-[#F5F5F3]/40 hover:text-[#F5F5F3] transition-colors font-medium py-2"
                style={font}
              >
                Fonctionnalites <ChevronDown size={12} className={`transition-transform duration-200 ${megaMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {megaMenuOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-[780px]">
                  <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0c]/95 backdrop-blur-2xl shadow-2xl shadow-black/60 overflow-hidden">
                    <div className="p-5 grid grid-cols-5 gap-6">
                      {Object.values(MEGA_MENU).map((col) => (
                        <div key={col.title}>
                          <p className="text-[9px] font-bold text-[#FF5C1A]/60 uppercase tracking-[0.15em] mb-3" style={font}>{col.title}</p>
                          <div className="space-y-1">
                            {col.items.map((item) => {
                              const Icon = item.icon
                              return (
                                <button
                                  key={item.path + item.label}
                                  onClick={() => { setMegaMenuOpen(false); navigate(item.path) }}
                                  className="group flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.04] transition-all text-left w-full"
                                >
                                  <div className="w-7 h-7 rounded-md bg-[#FF5C1A]/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#FF5C1A]/15 transition-colors">
                                    <Icon size={12} className="text-[#FF5C1A]" />
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-semibold text-[#F5F5F3]/60 group-hover:text-[#F5F5F3] transition-colors leading-tight" style={font}>{item.label}</p>
                                    <p className="text-[9px] text-[#F5F5F3]/20 group-hover:text-[#F5F5F3]/30 transition-colors leading-snug mt-0.5" style={font}>{item.desc}</p>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-white/[0.04] px-5 py-3 flex items-center justify-between bg-white/[0.01]">
                      <span className="text-[10px] text-[#F5F5F3]/15" style={font}>12 fonctionnalites incluses</span>
                      <button onClick={() => { setMegaMenuOpen(false); scrollTo('pricing') }} className="text-[10px] font-medium text-[#FF5C1A] hover:text-[#FF5C1A]/80 transition-colors flex items-center gap-1" style={font}>
                        Voir les tarifs <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => scrollTo('pricing')} className="text-[13px] text-[#F5F5F3]/40 hover:text-[#F5F5F3] transition-colors font-medium" style={font}>Tarifs</button>
            <button onClick={() => scrollTo('faq')} className="text-[13px] text-[#F5F5F3]/40 hover:text-[#F5F5F3] transition-colors font-medium" style={font}>FAQ</button>
            <button onClick={() => navigate('/demo')} className="text-[13px] text-[#F5F5F3]/40 hover:text-[#F5F5F3] transition-colors font-medium flex items-center gap-1.5" style={font}>
              <Play size={11} /> Demo
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="px-4 py-2 text-[13px] font-medium text-[#F5F5F3]/40 hover:text-[#F5F5F3] transition-colors" style={font}>Se connecter</button>
            <button onClick={() => navigate('/register')} className="group px-5 py-2.5 rounded-xl bg-[#FF5C1A] text-white text-[13px] font-semibold hover:bg-[#e5510f] hover:shadow-lg hover:shadow-[#FF5C1A]/25 transition-all duration-300 flex items-center gap-2" style={font}>
              Essai gratuit <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden p-2 text-[#F5F5F3]/60">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden fixed inset-0 top-[60px] bg-[#060606]/98 backdrop-blur-2xl z-40 overflow-y-auto">
            <div className="p-5 pb-10 space-y-2">
              {Object.values(MEGA_MENU).flatMap(col => col.items).slice(0, 6).map((item) => {
                const Icon = item.icon
                return (
                  <button key={item.label} onClick={() => { setMenuOpen(false); navigate(item.path) }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] w-full text-left transition-all">
                    <div className="w-8 h-8 rounded-lg bg-[#FF5C1A]/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={14} className="text-[#FF5C1A]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#F5F5F3]/60" style={font}>{item.label}</p>
                      <p className="text-[10px] text-[#F5F5F3]/20" style={font}>{item.desc}</p>
                    </div>
                  </button>
                )
              })}
              <div className="border-t border-white/[0.04] pt-4 mt-4 space-y-2">
                <button onClick={() => { setMenuOpen(false); scrollTo('pricing') }} className="w-full text-left py-3 px-3 text-[14px] font-medium text-[#F5F5F3]/50" style={font}>Tarifs</button>
                <button onClick={() => { setMenuOpen(false); scrollTo('faq') }} className="w-full text-left py-3 px-3 text-[14px] font-medium text-[#F5F5F3]/50" style={font}>FAQ</button>
              </div>
              <div className="pt-4 space-y-3">
                <button onClick={() => { setMenuOpen(false); navigate('/register') }} className="w-full py-3.5 rounded-xl bg-[#FF5C1A] text-white text-sm font-semibold" style={font}>Commencer gratuitement</button>
                <button onClick={() => { setMenuOpen(false); navigate('/login') }} className="w-full text-center text-[13px] text-[#F5F5F3]/25 py-2" style={font}>Deja un compte ? Se connecter</button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ══════════════════════ HERO ══════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center px-5 md:px-8 pt-28 pb-16">
        {/* Dot grid background */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black_20%,transparent_100%)]" />
        {/* Orange glow */}
        <div className="pointer-events-none absolute top-[10%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-[#FF5C1A]/[0.07] blur-[180px] animate-glow-pulse" />

        <div className={`relative max-w-[900px] mx-auto text-center transition-all duration-1000 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Animated badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] mb-8 animate-badge">
            <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-[11px] font-medium text-[#F5F5F3]/40" style={font}>Nouveau : Messagerie vocale + envoi de fichiers</span>
          </div>

          <h1 className="text-[clamp(2.2rem,6.5vw,4.5rem)] font-bold tracking-[-0.03em] leading-[1.08] mb-6" style={fontTitle}>
            <span className="block">Arrete de jongler</span>
            <span className="block">entre 10 outils.</span>
            <span className="block text-[#FF5C1A]">Scale ton coaching.</span>
          </h1>

          <p className="text-[15px] md:text-lg text-[#F5F5F3]/30 max-w-xl mx-auto mb-10 leading-relaxed" style={font}>
            Clients, programmes, nutrition, paiements, messagerie — tout dans une seule plateforme pensee pour les coachs ambitieux.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-5">
            <button onClick={() => navigate('/register')} className="group w-full sm:w-auto px-8 py-4 rounded-xl bg-[#FF5C1A] text-white font-semibold text-[15px] hover:bg-[#e5510f] hover:shadow-2xl hover:shadow-[#FF5C1A]/30 transition-all duration-300 flex items-center justify-center gap-2.5 relative overflow-hidden" style={font}>
              <span className="relative z-10 flex items-center gap-2.5">
                Commencer gratuitement
                <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform duration-300" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
            <button onClick={() => navigate('/demo')} className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/[0.08] text-[#F5F5F3]/40 font-medium text-[15px] hover:bg-white/[0.03] hover:text-[#F5F5F3] hover:border-white/[0.12] transition-all duration-300 flex items-center justify-center gap-2" style={font}>
              <Play size={14} className="text-[#FF5C1A]" /> Voir la demo
            </button>
          </div>

          {/* Micro-reassurances */}
          <div className="flex items-center justify-center gap-5 text-[#F5F5F3]/20 text-[11px] mb-12" style={font}>
            <span className="flex items-center gap-1.5"><Shield size={11} /> Sans carte bancaire</span>
            <span className="flex items-center gap-1.5"><Clock size={11} /> Setup 2 min</span>
            <span className="flex items-center gap-1.5"><Zap size={11} /> 14 jours gratuits</span>
          </div>

          {/* Social proof - avatars */}
          <div className="flex items-center justify-center gap-3 mb-16">
            <div className="flex -space-x-2">
              {['#FF5C1A', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b'].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#060606] flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: c, zIndex: 5 - i }}>
                  {['L', 'S', 'T', 'M', 'K'][i]}
                </div>
              ))}
            </div>
            <div className="flex flex-col items-start">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => <Star key={i} size={10} className="text-[#FF5C1A] fill-[#FF5C1A]" />)}
              </div>
              <span className="text-[11px] text-[#F5F5F3]/30" style={font}><strong className="text-[#F5F5F3]/60">200+</strong> coachs nous font confiance</span>
            </div>
          </div>

          {/* Browser mockup */}
          <div className="relative mx-auto max-w-[900px]">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.7)]">
              {/* Chrome bar */}
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#0f0f0f] border-b border-white/[0.04]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                  <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                  <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-1.5 px-4 py-1 rounded-lg bg-white/[0.04] text-[10px] text-[#F5F5F3]/20 font-mono">
                    <Lock size={8} /> app.zevo.coach
                  </div>
                </div>
              </div>
              {/* Dashboard content */}
              <div className="p-5 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm md:text-base font-bold text-[#F5F5F3]" style={fontTitle}>Bonjour, Maxime</p>
                    <p className="text-[10px] text-[#F5F5F3]/20" style={font}>Mardi 8 Avril 2026 - Vue d'ensemble</p>
                  </div>
                  <div className="hidden md:flex gap-2">
                    <div className="px-3 py-1.5 rounded-lg bg-[#FF5C1A]/10 text-[10px] text-[#FF5C1A] font-bold flex items-center gap-1.5" style={font}><Bell size={10} /> 3 notifications</div>
                  </div>
                </div>
                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { l: 'Clients actifs', v: '47', t: '+5 ce mois', c: '#FF5C1A', ic: Users },
                    { l: 'Seances cette semaine', v: '23', t: '+8 vs sem. dern.', c: '#3b82f6', ic: Dumbbell },
                    { l: 'Taux retention', v: '96%', t: '+2.4%', c: '#22c55e', ic: TrendingUp },
                    { l: 'Revenu mensuel', v: '4 850\u20AC', t: '+22%', c: '#f59e0b', ic: CreditCard },
                  ].map((k, i) => (
                    <div key={i} className="rounded-xl bg-[#0c0c0c] border border-white/[0.06] p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <k.ic size={14} style={{ color: k.c }} />
                        <span className="text-[8px] text-[#22c55e] font-semibold" style={font}>{k.t}</span>
                      </div>
                      <p className="text-xl font-bold text-[#F5F5F3]" style={fontTitle}>{k.v}</p>
                      <p className="text-[9px] text-[#F5F5F3]/20 mt-0.5" style={font}>{k.l}</p>
                    </div>
                  ))}
                </div>
                {/* Chart + activity */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 rounded-xl bg-[#0c0c0c] border border-white/[0.06] p-4">
                    <span className="text-[10px] font-semibold text-[#F5F5F3]/25" style={font}>Progression clients - 12 mois</span>
                    <div className="flex items-end gap-1 h-24 mt-3">
                      {[22, 30, 28, 42, 38, 55, 50, 62, 58, 72, 68, 85].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t transition-all hover:opacity-80" style={{ height: `${h}%`, background: `linear-gradient(to top, #FF5C1A${i >= 10 ? '' : '80'}, #FF5C1A${i >= 10 ? '40' : '20'})` }} />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#0c0c0c] border border-white/[0.06] p-4 space-y-3">
                    <span className="text-[10px] font-semibold text-[#F5F5F3]/25" style={font}>Activite recente</span>
                    {[
                      { t: 'Julie a termine sa seance', c: '#22c55e', time: '2 min' },
                      { t: 'Nouveau prospect inscrit', c: '#FF5C1A', time: '12 min' },
                      { t: 'Paiement recu 49\u20AC', c: '#f59e0b', time: '1h' },
                      { t: 'Thomas a rempli son bilan', c: '#3b82f6', time: '2h' },
                    ].map((a, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.c }} />
                        <span className="text-[10px] text-[#F5F5F3]/30 flex-1 truncate" style={font}>{a.t}</span>
                        <span className="text-[8px] text-[#F5F5F3]/15" style={font}>{a.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Bottom glow */}
            <div className="pointer-events-none absolute -bottom-20 left-1/2 -translate-x-1/2 w-[70%] h-32 bg-[#FF5C1A]/[0.06] blur-[80px] rounded-full" />
          </div>
        </div>
      </section>

      {/* ══════════════════ SEPARATOR ══════════════════ */}
      <div className="h-px bg-white/[0.04]" />

      {/* ══════════════════════ FEATURES GRID ══════════════════════ */}
      <section id="features" ref={featuresRef} className="py-24 md:py-32 px-5 md:px-8">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-[#F5F5F3]/30 font-medium mb-6" style={font}>
              <Zap size={11} className="text-[#FF5C1A]" /> Fonctionnalites
            </div>
            <h2 className="text-3xl md:text-[3rem] font-bold tracking-[-0.02em] leading-tight mb-5" style={fontTitle}>
              Tout ce dont un coach a besoin.
              <br /><span className="text-[#FF5C1A]">Rien de superflu.</span>
            </h2>
            <p className="text-[#F5F5F3]/25 text-base max-w-lg mx-auto" style={font}>Chaque feature est pensee pour te faire gagner du temps et impressionner tes clients.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES_GRID.map((f, i) => {
              const Icon = f.icon
              return (
                <div
                  key={i}
                  className={`group relative rounded-2xl bg-[#0c0c0c] border border-white/[0.06] p-6 hover:border-[#FF5C1A]/15 transition-all duration-500 ${featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: `${f.color}12`, border: `1px solid ${f.color}15` }}>
                    <Icon size={20} style={{ color: f.color }} />
                  </div>
                  <h3 className="text-[15px] font-bold mb-2 text-[#F5F5F3]" style={fontTitle}>{f.title}</h3>
                  <p className="text-[13px] text-[#F5F5F3]/25 leading-relaxed" style={font}>{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <div className="h-px bg-white/[0.04]" />

      {/* ══════════════════════ HOW IT WORKS ══════════════════════ */}
      <section id="how" ref={stepsRef} className="py-24 md:py-32 px-5 md:px-8">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-[#F5F5F3]/30 font-medium mb-6" style={font}>
              <Target size={11} className="text-[#FF5C1A]" /> Comment ca marche
            </div>
            <h2 className="text-3xl md:text-[3rem] font-bold tracking-[-0.02em] leading-tight mb-4" style={fontTitle}>
              Operationnel en <span className="text-[#FF5C1A]">2 minutes</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-[18%] right-[18%] h-px bg-gradient-to-r from-transparent via-[#FF5C1A]/15 to-transparent" />
            {STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <div
                  key={i}
                  className={`relative rounded-2xl bg-[#0c0c0c] border border-white/[0.06] p-7 hover:border-[#FF5C1A]/15 transition-all duration-500 group text-center ${stepsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${i * 120}ms` }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#FF5C1A]/10 border border-[#FF5C1A]/10 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,92,26,0.12)] transition-all duration-500">
                    <Icon size={24} className="text-[#FF5C1A]" />
                  </div>
                  <span className="text-[10px] font-bold text-[#FF5C1A]/30 uppercase tracking-widest" style={font}>Etape {s.num}</span>
                  <h3 className="text-lg font-bold mt-2 mb-3 text-[#F5F5F3]" style={fontTitle}>{s.title}</h3>
                  <p className="text-[13px] text-[#F5F5F3]/25 leading-relaxed" style={font}>{s.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <div className="h-px bg-white/[0.04]" />

      {/* ══════════════════════ COMPARISON TABLE ══════════════════════ */}
      <section id="compare" ref={compareRef} className="py-24 md:py-32 px-5 md:px-8">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-[#F5F5F3]/30 font-medium mb-6" style={font}>
              <Trophy size={11} className="text-[#FF5C1A]" /> Comparatif
            </div>
            <h2 className="text-3xl md:text-[3rem] font-bold tracking-[-0.02em] leading-tight mb-4" style={fontTitle}>
              Zevo vs <span className="text-[#FF5C1A]">le reste</span>
            </h2>
            <p className="text-[#F5F5F3]/25 text-base max-w-md mx-auto" style={font}>On ne se cache pas derriere du marketing. Voici les faits.</p>
          </div>

          <div className={`rounded-2xl bg-[#0c0c0c] border border-white/[0.06] overflow-hidden transition-all duration-700 ${compareInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Table header */}
            <div className="grid grid-cols-5 gap-0 px-5 py-4 border-b border-white/[0.04] bg-white/[0.01]">
              <div className="text-[11px] font-semibold text-[#F5F5F3]/30" style={font}>Fonctionnalite</div>
              <div className="text-center">
                <span className="text-[12px] font-bold text-[#FF5C1A]" style={fontTitle}>Zevo</span>
              </div>
              <div className="text-center text-[11px] text-[#F5F5F3]/20 font-medium" style={font}>Trainerize</div>
              <div className="text-center text-[11px] text-[#F5F5F3]/20 font-medium" style={font}>Gymkee</div>
              <div className="text-center text-[11px] text-[#F5F5F3]/20 font-medium" style={font}>Excel</div>
            </div>
            {/* Table rows */}
            {COMPETITORS.map((row, i) => (
              <div key={i} className={`grid grid-cols-5 gap-0 px-5 py-3 ${i < COMPETITORS.length - 1 ? 'border-b border-white/[0.03]' : ''} hover:bg-white/[0.01] transition-colors`}>
                <div className="text-[12px] text-[#F5F5F3]/40 flex items-center" style={font}>{row.feature}</div>
                {[row.zevo, row.trainerize, row.gymkee, row.excel].map((val, j) => (
                  <div key={j} className="flex items-center justify-center">
                    {val ? (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${j === 0 ? 'bg-[#FF5C1A]/15' : 'bg-white/[0.03]'}`}>
                        <Check size={11} className={j === 0 ? 'text-[#FF5C1A]' : 'text-[#F5F5F3]/30'} />
                      </div>
                    ) : (
                      <Minus size={12} className="text-[#F5F5F3]/10" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-px bg-white/[0.04]" />

      {/* ══════════════════════ PRICING ══════════════════════ */}
      <section id="pricing" ref={pricingRef} className="py-24 md:py-32 px-5 md:px-8 relative">
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[#FF5C1A]/[0.03] blur-[150px]" />
        <div className="relative max-w-[1100px] mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-[#F5F5F3]/30 font-medium mb-6" style={font}>
              <CreditCard size={11} className="text-[#FF5C1A]" /> Tarifs simples
            </div>
            <h2 className="text-3xl md:text-[3rem] font-bold tracking-[-0.02em] leading-tight mb-5" style={fontTitle}>
              Des prix simples, <span className="text-[#FF5C1A]">sans surprise.</span>
            </h2>
            <p className="text-[#F5F5F3]/25 text-base max-w-lg mx-auto mb-8" style={font}>Commence gratuitement. Upgrade quand tu es pret.</p>
            {/* Toggle */}
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <button onClick={() => setBillingYearly(false)} className={`px-5 py-2 rounded-full text-[12px] font-semibold transition-all duration-300 ${!billingYearly ? 'bg-[#FF5C1A] text-white' : 'text-[#F5F5F3]/30'}`} style={font}>Mensuel</button>
              <button onClick={() => setBillingYearly(true)} className={`px-5 py-2 rounded-full text-[12px] font-semibold transition-all duration-300 flex items-center gap-2 ${billingYearly ? 'bg-[#FF5C1A] text-white' : 'text-[#F5F5F3]/30'}`} style={font}>
                Annuel {!billingYearly && <span className="text-[8px] text-[#22c55e] font-bold bg-[#22c55e]/10 px-1.5 py-0.5 rounded-full">-17%</span>}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[950px] mx-auto">
            {PLANS.map((plan, idx) => {
              const price = billingYearly ? plan.price.yearly : plan.price.monthly
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-7 flex flex-col transition-all duration-500 ${plan.popular ? 'bg-[#0c0c0c] border-2 border-[#FF5C1A]/25 shadow-[0_0_60px_rgba(255,92,26,0.06)] md:scale-[1.03]' : 'bg-[#0c0c0c] border border-white/[0.06] hover:border-white/[0.1]'} ${pricingInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${idx * 100}ms` }}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-[#FF5C1A] text-white text-[9px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider" style={font}>Populaire</span>
                    </div>
                  )}
                  <h3 className="text-lg font-bold mb-1" style={fontTitle}>{plan.name}</h3>
                  <p className="text-[11px] text-[#F5F5F3]/20 mb-5" style={font}>{plan.desc}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-bold" style={fontTitle}>{price}</span>
                    <span className="text-[#F5F5F3]/15 text-sm" style={font}>{'\u20AC'}/mois</span>
                  </div>
                  {billingYearly && plan.price.monthly > 0 && <p className="text-[10px] text-[#22c55e]/60 font-medium mb-5" style={font}>Economise {(plan.price.monthly - plan.price.yearly) * 12}{'\u20AC'}/an</p>}
                  {(!billingYearly || plan.price.monthly === 0) && <p className="text-[10px] text-[#F5F5F3]/10 mb-5" style={font}>{plan.price.monthly === 0 ? 'gratuit pour toujours' : 'facture mensuellement'}</p>}
                  <ul className="space-y-2.5 mb-7 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5">
                        <Check size={13} className="text-[#FF5C1A] flex-shrink-0" />
                        <span className="text-[13px] text-[#F5F5F3]/35" style={font}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate('/register')}
                    className={`w-full py-3.5 rounded-xl text-[13px] font-semibold transition-all duration-300 ${plan.popular ? 'bg-[#FF5C1A] text-white hover:bg-[#e5510f] hover:shadow-lg hover:shadow-[#FF5C1A]/20' : 'bg-white/[0.04] text-[#F5F5F3] hover:bg-white/[0.07] border border-white/[0.06]'}`}
                    style={font}
                  >
                    {plan.cta}
                  </button>
                </div>
              )
            })}
          </div>
          <p className="text-center text-[10px] text-[#F5F5F3]/10 mt-8" style={font}>Paiement securise Stripe - Sans engagement - Annulation en un clic</p>
        </div>
      </section>

      <div className="h-px bg-white/[0.04]" />

      {/* ══════════════════════ TESTIMONIALS ══════════════════════ */}
      <section id="testimonials" ref={testiRef} className="py-24 md:py-32 px-5 md:px-8">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-[#F5F5F3]/30 font-medium mb-6" style={font}>
              <Heart size={11} className="text-[#FF5C1A]" /> Temoignages
            </div>
            <h2 className="text-3xl md:text-[3rem] font-bold tracking-[-0.02em] leading-tight" style={fontTitle}>
              Ils ont choisi <span className="text-[#FF5C1A]">Zevo</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className={`rounded-2xl bg-[#0c0c0c] border border-white/[0.06] p-6 flex flex-col hover:border-[#FF5C1A]/15 transition-all duration-500 ${testiInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="flex gap-0.5 mb-4">
                  {[1,2,3,4,5].map(j => <Star key={j} size={12} className="text-[#FF5C1A] fill-[#FF5C1A]" />)}
                </div>
                <p className="text-[13px] text-[#F5F5F3]/40 leading-relaxed flex-1 mb-5" style={font}>"{t.text}"</p>
                {/* Metric */}
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FF5C1A]/[0.06] border border-[#FF5C1A]/10 mb-5 self-start">
                  <span className="text-lg font-bold text-[#FF5C1A]" style={fontTitle}>{t.metric.value}</span>
                  <span className="text-[10px] text-[#F5F5F3]/30" style={font}>{t.metric.label}</span>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.04]">
                  <div className="w-9 h-9 rounded-full bg-[#FF5C1A] flex items-center justify-center text-white text-[10px] font-bold">{t.avatar}</div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#F5F5F3]" style={font}>{t.name}</p>
                    <p className="text-[10px] text-[#F5F5F3]/20" style={font}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-px bg-white/[0.04]" />

      {/* ══════════════════════ FAQ ══════════════════════ */}
      <section id="faq" className="py-24 md:py-32 px-5 md:px-8">
        <div className="max-w-[700px] mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-[#F5F5F3]/30 font-medium mb-6" style={font}>
              <HelpCircle size={11} className="text-[#FF5C1A]" /> FAQ
            </div>
            <h2 className="text-3xl md:text-[3rem] font-bold tracking-[-0.02em] leading-tight" style={fontTitle}>
              Questions frequentes
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className={`rounded-2xl bg-[#0c0c0c] border transition-all duration-300 overflow-hidden ${
                  openFaq === i ? 'border-[#FF5C1A]/15' : 'border-white/[0.06] hover:border-white/[0.08]'
                }`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-5 text-left"
                >
                  <span className={`text-[14px] font-medium pr-4 transition-colors ${openFaq === i ? 'text-[#F5F5F3]' : 'text-[#F5F5F3]/50'}`} style={font}>{faq.q}</span>
                  <ChevronDown size={16} className={`flex-shrink-0 transition-all duration-300 ${openFaq === i ? 'rotate-180 text-[#FF5C1A]' : 'text-[#F5F5F3]/15'}`} />
                </button>
                <div className={`transition-all duration-300 ease-out ${openFaq === i ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                  <div className="px-5 pb-5">
                    <p className="text-[13px] text-[#F5F5F3]/30 leading-relaxed" style={font}>{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-px bg-white/[0.04]" />

      {/* ══════════════════════ FINAL CTA ══════════════════════ */}
      <section className="relative py-28 md:py-36 px-5 md:px-8 overflow-hidden">
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[#FF5C1A]/[0.06] blur-[150px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.03)_1px,transparent_0)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_60%,black_20%,transparent_100%)]" />

        <div className="relative max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF5C1A]/10 border border-[#FF5C1A]/15 mb-8">
            <Flame size={13} className="text-[#FF5C1A]" />
            <span className="text-[11px] font-semibold text-[#FF5C1A]" style={font}>Rejoins 200+ coachs</span>
          </div>
          <h2 className="text-3xl md:text-[3.5rem] font-bold tracking-[-0.02em] leading-tight mb-6" style={fontTitle}>
            Pendant que tu hesites,
            <br /><span className="text-[#FF5C1A]">d'autres coachs scalent.</span>
          </h2>
          <p className="text-[#F5F5F3]/25 text-base max-w-md mx-auto mb-10 leading-relaxed" style={font}>
            14 jours gratuits. Toutes les fonctionnalites. Zero risque.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button onClick={() => navigate('/register')} className="group w-full sm:w-auto px-10 py-4 rounded-xl bg-[#FF5C1A] text-white font-semibold text-[15px] hover:bg-[#e5510f] hover:shadow-2xl hover:shadow-[#FF5C1A]/30 transition-all duration-300 inline-flex items-center justify-center gap-2.5 relative overflow-hidden" style={font}>
              <span className="relative z-10 flex items-center gap-2.5">Commencer maintenant <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" /></span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
            <button onClick={() => navigate('/demo')} className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/[0.08] text-[#F5F5F3]/35 font-medium hover:bg-white/[0.03] hover:text-[#F5F5F3] transition-all flex items-center justify-center gap-2" style={font}>
              <Play size={14} className="text-[#FF5C1A]" /> Voir la demo
            </button>
          </div>
          {/* Micro-reassurances */}
          <div className="flex items-center justify-center gap-5 text-[#F5F5F3]/15 text-[11px] mt-6" style={font}>
            <span className="flex items-center gap-1.5"><Shield size={10} /> Sans carte bancaire</span>
            <span className="flex items-center gap-1.5"><Clock size={10} /> Setup 2 min</span>
            <span className="flex items-center gap-1.5"><Zap size={10} /> 14 jours gratuits</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer className="border-t border-white/[0.04] bg-[#050505]">
        <div className="max-w-[1100px] mx-auto px-5 md:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <ZevoLogo size="md" />
              <p className="text-[11px] text-[#F5F5F3]/12 mt-3 leading-relaxed max-w-[200px]" style={font}>La plateforme tout-en-un pour les coachs qui veulent scaler.</p>
            </div>
            {[
              { title: 'Produit', links: ['Programmes', 'Nutrition', 'Hub Client', 'Paiements', 'Tarifs'], paths: ['/features/programmes', '/features/nutrition', '/features/hub-client', '/features/paiements', null], ids: [null, null, null, null, 'pricing'] },
              { title: 'Ressources', links: ['Centre d\'aide', 'Blog', 'Changelog', 'Contact'] },
              { title: 'Legal', links: ['Mentions legales', 'Confidentialite', 'CGV', 'Cookies'] },
            ].map((col, i) => (
              <div key={i}>
                <p className="text-[9px] font-bold text-[#F5F5F3]/20 uppercase tracking-[0.15em] mb-4" style={font}>{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      {col.paths && col.paths[j] ? (
                        <button onClick={() => navigate(col.paths[j])} className="text-[12px] text-[#F5F5F3]/15 hover:text-[#F5F5F3]/35 transition-colors" style={font}>{link}</button>
                      ) : col.ids && col.ids[j] ? (
                        <button onClick={() => scrollTo(col.ids[j])} className="text-[12px] text-[#F5F5F3]/15 hover:text-[#F5F5F3]/35 transition-colors" style={font}>{link}</button>
                      ) : (
                        <a href="#" className="text-[12px] text-[#F5F5F3]/15 hover:text-[#F5F5F3]/35 transition-colors" style={font}>{link}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-white/[0.03] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-[#F5F5F3]/8" style={font}>&copy; {new Date().getFullYear()} Zevo. Tous droits reserves.</p>
            <p className="text-[10px] text-[#F5F5F3]/8 flex items-center gap-1.5" style={font}>Fait avec <Heart size={8} className="text-[#FF5C1A] fill-[#FF5C1A]" /> pour les coachs</p>
          </div>
        </div>
      </footer>

      {/* ══════════════════════ CSS ══════════════════════ */}
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1) translateX(-50%); }
          50% { opacity: 0.7; transform: scale(1.05) translateX(-50%); }
        }
        .animate-glow-pulse { animation: glow-pulse 5s ease-in-out infinite; transform-origin: center; }

        @keyframes badge-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,92,26,0); }
          50% { box-shadow: 0 0 20px 2px rgba(255,92,26,0.1); }
        }
        .animate-badge { animation: badge-glow 3s ease-in-out infinite; }

        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  )
}
