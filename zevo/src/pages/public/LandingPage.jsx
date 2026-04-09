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
import SEO from '../../components/SEO'

// ══════════════════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════════════════

const FEATURE_NAV = [
  { icon: Dumbbell, label: 'Entrainement', desc: 'Seances guidees en direct', path: '/features/entrainement' },
  { icon: ClipboardList, label: 'Programmes', desc: 'Cree en 5 min, suivi auto', path: '/features/programmes' },
  { icon: Utensils, label: 'Nutrition', desc: 'Macros & plans alimentaires', path: '/features/nutrition' },
  { icon: CalendarDays, label: 'Calendrier', desc: 'Reservations en un clic', path: '/features/calendrier' },
  { icon: Users, label: 'Hub Client', desc: 'Chaque client en 3 secondes', path: '/features/hub-client' },
  { icon: MessageCircle, label: 'Messagerie', desc: 'Chat integre, fini WhatsApp', path: '/features/messagerie' },
  { icon: BookOpen, label: 'Bibliotheque', desc: 'Videos & ressources partagees', path: '/features/bibliotheque' },
  { icon: ClipboardList, label: 'Formulaires', desc: 'Bilans & check-ins auto', path: '/features/formulaires' },
  { icon: BarChart3, label: 'Statistiques', desc: 'Prouve tes resultats en PDF', path: '/features/statistiques' },
  { icon: Paintbrush, label: 'App Builder', desc: 'Ton app a tes couleurs', path: '/features/app-builder' },
  { icon: CreditCard, label: 'Paiements', desc: 'Encaissement Stripe auto', path: '/features/paiements' },
  { icon: UserPlus, label: 'CRM Prospects', desc: 'Convertis plus de leads', path: '/features/prospects' },
]

const BENTO_FEATURES = [
  {
    icon: Users, title: 'Connais chaque client en 3s',
    desc: 'Score bien-etre, objectifs, mensurations, historique des seances. Fini les fichiers Excel disperses — tout est dans une fiche unique.',
    span: 'col-span-1 md:col-span-2 md:row-span-2', visual: 'hub',
  },
  {
    icon: Dumbbell, title: 'Programmes en 5 min',
    desc: 'Drag & drop, multi-semaines, suivi live. Tes clients voient leur progression en temps reel.',
    span: 'col-span-1', visual: null,
  },
  {
    icon: MessageCircle, title: 'Messagerie integree',
    desc: 'Chat, audio, fichiers. Reponds a tes clients sans quitter Zevo. Fini WhatsApp pro.',
    span: 'col-span-1', visual: null,
  },
  {
    icon: BarChart3, title: 'Prouve tes resultats',
    desc: 'Dashboards clairs, graphiques automatiques, export PDF. Montre l\'impact concret de ton coaching a chaque client.',
    span: 'col-span-1 md:col-span-2', visual: 'stats',
  },
  {
    icon: Utensils, title: 'Nutrition en 2 clics',
    desc: 'Plans alimentaires, macros, repas. Le suivi nutritionnel que tes clients attendent vraiment.',
    span: 'col-span-1', visual: null,
  },
  {
    icon: Paintbrush, title: 'Ton app, ta marque',
    desc: 'Logo, couleurs, modules. Tes clients pensent utiliser ta propre application.',
    span: 'col-span-1', visual: null,
  },
  {
    icon: ClipboardList, title: 'Bilans automatises',
    desc: 'Check-in hebdo, bilan initial, questionnaire satisfaction. Zero paperasse, tout est automatique.',
    span: 'col-span-1', visual: null,
  },
  {
    icon: CreditCard, title: 'Encaisse en automatique',
    desc: 'Stripe connecte en 1 clic. Tu fixes tes prix, tes clients paient, l\'argent tombe. Zero relance.',
    span: 'col-span-1', visual: null,
  },
]

const SHOWCASES = [
  {
    badge: 'Suivi client coaching',
    title: 'Fini les tableurs. Connais chaque client en un coup d\'oeil.',
    desc: 'Score bien-etre, objectifs, seances realisees, mensurations — tout centralise dans une fiche unique. Tu reperes un client en difficulte en 3 secondes, pas en 30 minutes.',
    features: ['Fiche client 360 unifiee', 'Score bien-etre automatique', 'Alertes desengagement', 'Historique complet des seances'],
    visual: 'client',
    metric: { value: '3s', label: 'pour scanner un client' },
    screenshot: '/screenshots/hub-client.png',
  },
  {
    badge: 'Programme sport en ligne',
    title: 'Des programmes que tes clients terminent vraiment',
    desc: 'Interface claire, exercices avec videos, validation en temps reel. Le taux de completion explose parce que l\'experience client est addictive.',
    features: ['Drag & drop intuitif', 'Videos demo integrees', 'Validation live', 'Templates reutilisables'],
    visual: 'program',
    metric: { value: '5h', label: 'gagnees par semaine' },
    screenshot: '/screenshots/programme.png',
  },
  {
    badge: 'Application coach sportif',
    title: 'Tes clients pensent que c\'est TON app',
    desc: 'Ton logo, tes couleurs, tes modules. L\'experience est 100% brandee a ton image. Augmente ta valeur percue et justifie des tarifs 40% plus eleves.',
    features: ['Branding complet', 'Modules au choix', 'Preview en temps reel', 'Experience client premium'],
    visual: 'app',
    metric: { value: '+40%', label: 'de valeur percue' },
    screenshot: '/screenshots/app-builder.png',
  },
]

const STEPS = [
  { num: '01', title: 'Cree ton espace', desc: '30 secondes chrono. Sans carte bancaire. Acces complet a toutes les fonctionnalites pendant 14 jours.', icon: Rocket },
  { num: '02', title: 'Importe tes clients', desc: 'Invite par email ou lien. Tes clients accedent a leur espace en 1 minute. L\'onboarding te guide pas a pas.', icon: Paintbrush },
  { num: '03', title: 'Automatise et grandis', desc: 'Tes clients progressent, tu mesures l\'impact, tu augmentes tes tarifs. Le cercle vertueux du coaching digital.', icon: TrendingUp },
]

const TESTIMONIALS = [
  {
    name: 'Julien Morel', role: 'Coach sportif · Paris', avatar: 'JM',
    text: 'Avant Zevo, je passais 2h par jour sur mes tableurs. Maintenant le suivi client coaching est automatise. J\'ai pris 12 clients de plus sans embaucher personne.',
    metric: { value: 'x2', label: 'clients en 3 mois' }, rating: 5,
  },
  {
    name: 'Camille Rousseau', role: 'Coach nutrition · Lyon', avatar: 'CR',
    text: 'Mes clients adorent recevoir leur programme sport en ligne directement dans l\'app. Le taux de completion a explose. Je ne reviendrais en arriere pour rien au monde.',
    metric: { value: '5h', label: 'gagnees/semaine' }, rating: 5,
  },
  {
    name: 'Romain Dubois', role: 'Preparateur physique · Bordeaux', avatar: 'RD',
    text: 'La facturation automatique m\'a libere un temps fou. Plus de relances, plus d\'impayes. Et les rapports PDF impressionnent mes athletes a chaque bilan.',
    metric: { value: '98%', label: 'retention clients' }, rating: 5,
  },
  {
    name: 'Lea Fontaine', role: 'Coach bien-etre · Nantes', avatar: 'LF',
    text: 'L\'App Builder a tout change. Mes clients pensent que c\'est ma propre application coach sportif. J\'ai augmente mes tarifs de 35% et personne n\'a bronche.',
    metric: { value: '+35%', label: 'sur ses tarifs' }, rating: 5,
  },
]

const PLANS = [
  {
    id: 'starter', name: 'Starter', price: { monthly: 29, yearly: 24 },
    desc: 'Lance ton activite de coaching digital',
    features: ['5 clients actifs', 'Dashboard coach complet', 'Messagerie integree', 'Programmes & seances', 'Formulaires & bilans', 'Bibliotheque de ressources', 'CRM prospects', 'Support email 24h'],
  },
  {
    id: 'pro', name: 'Pro', price: { monthly: 49, yearly: 39 }, popular: true,
    desc: 'Automatise et developpe ton activite',
    features: ['50 clients actifs', 'Tout le Starter +', 'App Builder (ton branding)', 'Rapports PDF automatiques', 'Statistiques avancees', 'Plans nutritionnels complets', 'Support prioritaire'],
  },
  {
    id: 'unlimited', name: 'Unlimited', price: { monthly: 79, yearly: 65 },
    desc: 'Coaching sans aucune limite',
    features: ['Clients illimites', 'Tout le Pro +', 'Automatisation avancee', 'API & webhooks', 'Support dedie sous 2h'],
  },
]

const FAQS = [
  { q: 'L\'essai gratuit est vraiment sans carte bancaire ?', a: 'Oui. 14 jours avec TOUTES les fonctionnalites du logiciel coach sportif. Zero carte bancaire demandee. Tu annules en un clic si tu veux, tes donnees restent 30 jours.' },
  { q: 'Mes clients doivent payer pour utiliser l\'app ?', a: 'Non. Tes clients accedent gratuitement a leur espace coaching via un simple lien d\'invitation. Ils n\'ont rien a debourser.' },
  { q: 'En quoi Zevo est different des autres logiciels de coaching ?', a: 'Zevo est la seule plateforme coaching en France qui reunit suivi client, programmes sport en ligne, nutrition, paiements et branding dans une seule app. Pas 5 outils, un seul.' },
  { q: 'Comment fonctionne la facturation coach sportif ?', a: 'Tu connectes Stripe en un clic. Tu crees tes offres au prix que tu veux. Tes clients paient directement. L\'argent arrive sur ton compte. Zero relance manuelle.' },
  { q: 'Puis-je personnaliser l\'app a mes couleurs ?', a: 'Oui. L\'App Builder te permet de mettre ton logo, ta palette, tes modules. Tes clients pensent utiliser ta propre application coach sportif.' },
  { q: 'Combien de temps pour migrer mes clients ?', a: 'Invite-les par email ou lien. Ils creent leur compte en moins d\'une minute. La plupart des coachs migrent en un apres-midi.' },
  { q: 'Y a-t-il un engagement ?', a: 'Zero engagement. Upgrade, downgrade ou annule a tout moment. Pas de frais caches, pas de mauvaise surprise.' },
  { q: 'Ca fonctionne sur mobile ?', a: '100% responsive et optimise mobile. Smartphone, tablette, desktop — tes clients s\'entrainent depuis n\'importe ou en France.' },
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
  const hasDecimal = target.includes('.')
  useEffect(() => {
    if (!inView) return
    const num = parseFloat(target.replace(/[^0-9.]/g, ''))
    if (isNaN(num)) { setCount(target); return }
    let start = 0
    const step = num / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= num) { setCount(num); clearInterval(timer) }
      else setCount(hasDecimal ? Math.round(start * 10) / 10 : Math.floor(start))
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
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF5C1A] to-[#FF7A42] flex items-center justify-center text-white text-[10px] font-bold">JD</div>
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
          { v: '-3.2kg', l: 'Poids', c: '#FF5C1A' },
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
        <div key={i} className="flex-1 rounded-t transition-all" style={{ height: `${h}%`, background: `linear-gradient(to top, #FF5C1A${i > 10 ? '' : '80'}, #FF7A42${i > 10 ? '' : '50'})` }} />
      ))}
    </div>
  )
}

function ShowcaseVisual({ type, screenshot }) {
  // If a real screenshot exists, use it inside a device frame
  const [imgError, setImgError] = useState(false)
  const hasScreenshot = screenshot && !imgError

  if (hasScreenshot) {
    return (
      <div className="relative">
        <div className="rounded-2xl bg-[#0c0c0c] border border-white/[0.06] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#111] border-b border-white/[0.04]">
            <div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-[#FF5F57]" /><div className="w-2 h-2 rounded-full bg-[#FEBC2E]" /><div className="w-2 h-2 rounded-full bg-[#28C840]" /></div>
            <div className="flex-1 flex justify-center"><div className="flex items-center gap-1.5 px-3 py-0.5 rounded-lg bg-white/[0.03] text-[9px] text-[#F5F5F3]/20 font-mono"><Lock size={7} /> app.zevo.coach</div></div>
          </div>
          <img src={screenshot} alt="Zevo app" className="w-full" onError={() => setImgError(true)} />
        </div>
        <div className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 w-[80%] h-24 bg-[#FF5C1A]/[0.06] blur-[60px] rounded-full" />
      </div>
    )
  }

  // Fallback visuals
  if (type === 'client') {
    return (
      <div className="relative">
        <div className="rounded-2xl bg-[#0c0c0c] border border-white/[0.06] p-5 space-y-4 shadow-[0_20px_60px_rgba(0,0,0,0.4)] noise-overlay">
          <div className="flex items-center gap-3 relative">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FF5C1A] to-[#FF7A42] flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-[#FF5C1A]/20">JD</div>
            <div>
              <div className="text-sm font-semibold text-[#F5F5F3]">Julie Dupont</div>
              <div className="text-[10px] text-[#F5F5F3]/25">Objectif : Perte de poids · Depuis 3 mois</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'Bien-etre', val: '8.4/10', color: '#10B981', trend: '+0.6' },
              { label: 'Seances', val: '12/16', color: '#3B82F6', trend: '75%' },
              { label: 'Poids', val: '-3.2 kg', color: '#FF5C1A', trend: 'objectif' },
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
        <div className="absolute -top-3 -right-3 px-3 py-2 rounded-xl bg-[#111111] border border-emerald-500/20 shadow-xl shadow-black/30 flex items-center gap-2 animate-bounce-slow">
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
        <div className="rounded-2xl bg-[#0c0c0c] border border-white/[0.06] p-5 space-y-3 shadow-[0_20px_60px_rgba(0,0,0,0.4)] noise-overlay">
          <div className="flex items-center justify-between mb-1 relative">
            <div className="text-sm font-semibold text-[#F5F5F3]">Programme Force</div>
            <div className="px-2 py-0.5 rounded-lg bg-[#FF5C1A]/10 text-[9px] text-[#FF5C1A] font-bold">Semaine 3/8</div>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] w-[37.5%] transition-all" />
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
        <div className="absolute -bottom-3 -left-3 px-3 py-2 rounded-xl bg-[#111111] border border-[#FF5C1A]/20 shadow-xl shadow-black/30 flex items-center gap-2">
          <Flame size={14} className="text-[#FF5C1A]" />
          <span className="text-[10px] font-bold text-[#FF5C1A]">7 jours de suite !</span>
        </div>
      </div>
    )
  }

  // App builder — phone
  return (
    <div className="relative flex justify-center">
      <div className="w-[240px]">
        <div className="rounded-[28px] border-2 border-white/[0.08] bg-[#060606] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between px-5 py-1.5 text-[8px] text-[#F5F5F3]/30">
            <span>9:41</span>
            <div className="w-16 h-4 rounded-full bg-white/[0.06]" />
            <div className="flex gap-1"><Activity size={7} /></div>
          </div>
          <div className="px-4 py-3.5 bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42]">
            <p className="text-white text-xs font-bold">FitCoach Pro</p>
            <p className="text-white/50 text-[9px]">Bonjour Julie !</p>
          </div>
          <div className="p-3 space-y-2.5">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays size={11} className="text-[#FF5C1A]" />
                <span className="text-[10px] font-semibold text-[#F5F5F3]">Prochaine seance</span>
              </div>
              <p className="text-[9px] text-[#F5F5F3]/30">Upper Body · Aujourd'hui 18h</p>
              <div className="mt-2 h-1 rounded-full bg-white/[0.05]">
                <div className="h-full rounded-full bg-[#FF5C1A] w-[60%]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-2.5 text-center">
                <Heart size={12} className="text-emerald-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-[#F5F5F3]">8.4</p>
                <p className="text-[7px] text-[#F5F5F3]/25">Bien-etre</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-2.5 text-center">
                <Flame size={12} className="text-[#FF5C1A] mx-auto mb-1" />
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
              <Icon key={i} size={14} className={i === 0 ? 'text-[#FF5C1A]' : 'text-[#F5F5F3]/15'} />
            ))}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 -bottom-10 bg-[#FF5C1A]/[0.04] blur-[50px] rounded-full" />
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════

export default function LandingPage() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [featuresExpanded, setFeaturesExpanded] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const [billingYearly, setBillingYearly] = useState(false)
  const [activeTesti, setActiveTesti] = useState(0)

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

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => setActiveTesti(p => (p + 1) % TESTIMONIALS.length), 5000)
    return () => clearInterval(interval)
  }, [])

  const scrollTo = (id) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }

  // Font helpers
  const clash = "'Clash Display', 'Inter', sans-serif"
  const instrument = "'Instrument Sans', 'Inter', sans-serif"

  return (
    <div className="min-h-screen bg-[#060606] text-[#F5F5F3] overflow-x-hidden relative" style={{ fontFamily: instrument }}>
      <SEO
        title="Logiciel coach sportif tout-en-un"
        description="Gere tes clients, programmes sport en ligne, paiements et nutrition dans une seule app coach sportif. Essai gratuit 14 jours sans CB. 500+ coachs en France."
        url="/"
      />

      {/* ══════════════════════ BACKGROUND MESH ══════════════════════ */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Gradient mesh — large organic blobs */}
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-[#FF5C1A]/[0.04] blur-[200px] animate-glow-pulse" />
        <div className="absolute top-[30%] right-[-15%] w-[600px] h-[600px] rounded-full bg-[#FF7A42]/[0.025] blur-[180px]" />
        <div className="absolute bottom-[10%] left-[20%] w-[500px] h-[500px] rounded-full bg-[#FF5C1A]/[0.02] blur-[160px]" />
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_30%,black,transparent)]" />
        {/* Noise */}
        <div className="absolute inset-0 noise-overlay opacity-40" />
      </div>

      {/* ══════════════════════ NAVBAR ══════════════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#060606]/70 backdrop-blur-2xl border-b border-white/[0.06] py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-5 md:px-8 flex items-center justify-between">
          <ZevoLogo size="md" />
          <div className="hidden lg:flex items-center gap-6">
            <div className="relative"
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <button className="flex items-center gap-1.5 text-[13px] text-[#F5F5F3]/40 hover:text-[#F5F5F3] transition-colors duration-300 font-medium py-2" style={{ fontFamily: instrument }}>
                Fonctionnalites <ChevronDown size={12} className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[680px]">
                  <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0c]/95 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden">
                    <div className="p-2 grid grid-cols-3 gap-0.5">
                      {FEATURE_NAV.map((f) => {
                        const Icon = f.icon
                        return (
                          <button
                            key={f.path}
                            onClick={() => { setDropdownOpen(false); navigate(f.path) }}
                            className="group flex items-start gap-3 px-3.5 py-3 rounded-xl hover:bg-white/[0.04] transition-all text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#FF5C1A]/10 border border-[#FF5C1A]/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#FF5C1A]/15 transition-colors">
                              <Icon size={14} className="text-[#FF5C1A]" />
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
                      <button onClick={() => { setDropdownOpen(false); scrollTo('pricing') }} className="text-[10px] font-medium text-[#FF5C1A] hover:text-[#FF7A42] transition-colors flex items-center gap-1">
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
            <button onClick={() => navigate('/register')} className="group px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[#FF5C1A]/25 transition-all duration-300 flex items-center gap-2">
              Essai gratuit <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-[#F5F5F3]/60">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
        {menuOpen && (
          <div className="md:hidden fixed inset-0 top-[60px] bg-[#060606]/98 backdrop-blur-2xl z-40 overflow-y-auto">
            <div className="p-5 pb-10">
              <button onClick={() => setFeaturesExpanded(!featuresExpanded)} className="flex items-center justify-between w-full py-3.5 border-b border-white/[0.06]">
                <span className="text-[15px] font-semibold text-[#F5F5F3]/70">Fonctionnalites</span>
                <ChevronDown size={16} className={`text-[#F5F5F3]/30 transition-transform duration-300 ${featuresExpanded ? 'rotate-180' : ''}`} />
              </button>
              {featuresExpanded && (
                <div className="grid grid-cols-2 gap-1.5 py-3">
                  {FEATURE_NAV.map((f) => {
                    const Icon = f.icon
                    return (
                      <button key={f.path} onClick={() => { setMenuOpen(false); setFeaturesExpanded(false); navigate(f.path) }} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-[#FF5C1A]/15 transition-all active:scale-[0.97]">
                        <div className="w-7 h-7 rounded-lg bg-[#FF5C1A]/10 flex items-center justify-center flex-shrink-0">
                          <Icon size={12} className="text-[#FF5C1A]" />
                        </div>
                        <span className="text-[12px] font-medium text-[#F5F5F3]/50 truncate">{f.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
              <button onClick={() => { setMenuOpen(false); scrollTo('pricing') }} className="flex items-center justify-between w-full py-3.5 border-b border-white/[0.06]">
                <span className="text-[15px] font-semibold text-[#F5F5F3]/70">Tarifs</span>
                <ArrowUpRight size={14} className="text-[#F5F5F3]/20" />
              </button>
              <button onClick={() => { setMenuOpen(false); scrollTo('faq') }} className="flex items-center justify-between w-full py-3.5 border-b border-white/[0.06]">
                <span className="text-[15px] font-semibold text-[#F5F5F3]/70">FAQ</span>
                <ChevronDown size={14} className="text-[#F5F5F3]/20" />
              </button>
              <div className="pt-6 space-y-3">
                <button onClick={() => { setMenuOpen(false); navigate('/demo') }} className="w-full py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] text-[#F5F5F3]/60 text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
                  <Video size={14} className="text-[#FF5C1A]" /> Voir la demo
                </button>
                <button onClick={() => { setMenuOpen(false); navigate('/register') }} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] text-white text-sm font-semibold active:scale-[0.98] transition-transform">Tester gratuitement</button>
                <button onClick={() => { setMenuOpen(false); navigate('/login') }} className="block w-full text-center text-[13px] text-[#F5F5F3]/30 py-2">Deja un compte ? Se connecter</button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ══════════════════════ HERO — TEXT TOP + FULL-WIDTH MOCKUP ══════════════════════ */}
      <section ref={heroRef} className="relative px-5 md:px-8 pt-28 pb-16">
        <div className={`relative max-w-7xl mx-auto w-full transition-all duration-1000 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* TOP — Text centered-left */}
          <div className="max-w-2xl mb-14 md:mb-20">
            {/* Social proof badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] mb-8 hover:bg-white/[0.06] transition-colors cursor-default">
              <div className="flex -space-x-1.5">
                {['#FF5C1A', '#3B82F6', '#10B981', '#F59E0B'].map((c, i) => (
                  <div key={i} className="w-5 h-5 rounded-full border-2 border-[#060606] flex items-center justify-center text-[7px] font-bold text-white" style={{ backgroundColor: c, zIndex: 4 - i }}>
                    {['L', 'S', 'T', 'M'][i]}
                  </div>
                ))}
              </div>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => <Star key={i} size={10} className="text-[#FF5C1A] fill-[#FF5C1A]" />)}
              </div>
              <span className="text-xs font-medium text-[#F5F5F3]/40">Adopte par <strong className="text-[#F5F5F3]/70">500+</strong> coachs en France</span>
            </div>

            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold tracking-tight leading-[1.05] mb-7" style={{ fontFamily: clash }}>
              <span className="block text-[#F5F5F3]">Libere-toi de tes</span>
              <span className="block text-[#F5F5F3]">tableurs.</span>
              <span className="block mt-2">
                <span className="hero-outline-text">Digitalise</span>{' '}
                <span className="bg-gradient-to-r from-[#FF5C1A] via-[#FF7A42] to-[#FF5C1A] bg-clip-text text-transparent bg-[size:200%] animate-gradient-x">ton coaching.</span>
              </span>
            </h1>

            <p className="text-base md:text-lg text-[#F5F5F3]/35 max-w-md mb-10 leading-relaxed" style={{ fontFamily: instrument }}>
              Le logiciel coach sportif qui remplace 10 outils. Suivi client, programmes, nutrition, facturation — <strong className="text-[#F5F5F3]/60">tout dans une seule app</strong>. Gagne 5h par semaine.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
              <button onClick={() => navigate('/register')} className="group w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] text-white font-semibold text-base hover:shadow-2xl hover:shadow-[#FF5C1A]/30 transition-all duration-300 flex items-center justify-center gap-2.5 relative overflow-hidden">
                <span className="relative z-10 flex items-center gap-2.5">
                  Teste gratuitement 14 jours
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.15] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>
              <button onClick={() => navigate('/demo')} className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/[0.08] text-[#F5F5F3]/50 font-medium text-base hover:bg-white/[0.03] hover:text-[#F5F5F3] hover:border-white/[0.12] transition-all duration-300 flex items-center justify-center gap-2">
                <Video size={15} className="text-[#FF5C1A]" /> Voir la demo
              </button>
            </div>

            <div className="flex items-center gap-5 text-[#F5F5F3]/20 text-xs">
              <span className="flex items-center gap-1.5"><Shield size={12} /> Sans carte bancaire</span>
              <span className="flex items-center gap-1.5"><Clock size={12} /> Setup 2 min</span>
              <span className="flex items-center gap-1.5"><Zap size={12} /> 14 jours gratuits</span>
            </div>
          </div>

          {/* FULL-WIDTH Browser mockup */}
          <div className="relative animate-float mx-auto max-w-5xl">
            {/* Floating badges around mockup */}
            <div className="hidden md:flex absolute -top-5 left-12 z-10 items-center gap-2 px-3.5 py-2 rounded-xl bg-[#111]/90 backdrop-blur-xl border border-white/[0.08] shadow-2xl animate-bounce-slow">
              <Users size={14} className="text-[#3B82F6]" />
              <span className="text-[11px] font-semibold text-[#F5F5F3]/70">24 clients actifs</span>
            </div>
            <div className="hidden md:flex absolute -bottom-4 right-12 z-10 items-center gap-2 px-3.5 py-2 rounded-xl bg-[#111]/90 backdrop-blur-xl border border-emerald-500/20 shadow-2xl animate-bounce-slow" style={{ animationDelay: '1.5s' }}>
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-[11px] font-semibold text-emerald-400">+18% ce mois</span>
            </div>
            <div className="hidden md:flex absolute top-1/2 -right-6 -translate-y-1/2 z-10 items-center gap-2 px-3.5 py-2 rounded-xl bg-[#111]/90 backdrop-blur-xl border border-[#FF5C1A]/20 shadow-2xl animate-bounce-slow" style={{ animationDelay: '3s' }}>
              <Sparkles size={14} className="text-[#FF5C1A]" />
              <span className="text-[11px] font-semibold text-[#FF5C1A]">3 nouveaux clients</span>
            </div>

            <div className="rounded-2xl md:rounded-3xl border border-white/[0.07] bg-[#0c0c0c] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.6)] relative" role="img" aria-label="Tableau de bord Zevo — logiciel coach sportif avec suivi clients, statistiques et revenus">
              {/* Gradient border glow */}
              <div className="absolute inset-0 rounded-2xl md:rounded-3xl bg-gradient-to-br from-[#FF5C1A]/10 via-transparent to-[#FF7A42]/5 pointer-events-none" />
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#111] border-b border-white/[0.04]">
                <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" /><div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" /><div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" /></div>
                <div className="flex-1 flex justify-center"><div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.03] text-[10px] text-[#F5F5F3]/20 font-mono"><Lock size={7} /> app.zevo.coach</div></div>
              </div>
              <div className="p-4 md:p-7">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm md:text-base font-bold text-[#F5F5F3]" style={{ fontFamily: clash }}>Bonjour, Coach</p>
                    <p className="text-[10px] text-[#F5F5F3]/25">Lundi 7 Avril 2026</p>
                  </div>
                  <div className="hidden md:flex gap-2">
                    <div className="px-3 py-1.5 rounded-lg bg-[#FF5C1A]/10 text-[10px] text-[#FF5C1A] font-bold flex items-center gap-1.5"><Sparkles size={10} /> 3 clients en attente</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
                  {[
                    { l: 'Clients', v: '24', t: '+3', c: '#FF5C1A', ic: Users },
                    { l: 'Seances', v: '67', t: '+12%', c: '#3B82F6', ic: Dumbbell },
                    { l: 'Retention', v: '94%', t: '+2%', c: '#10B981', ic: TrendingUp },
                    { l: 'Revenu', v: '3 240\u20AC', t: '+18%', c: '#F59E0B', ic: CreditCard },
                  ].map((k, i) => (
                    <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 hover:border-white/[0.08] transition-colors">
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
                        <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: `linear-gradient(to top, #FF5C1A${i >= 10 ? '' : Math.round(30 + i * 6).toString(16)}, #FF7A42${i >= 10 ? '' : Math.round(20 + i * 5).toString(16)})` }} />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 space-y-2.5">
                    <span className="text-[10px] font-semibold text-[#F5F5F3]/30">Activite recente</span>
                    {[
                      { t: 'Julie a valide sa seance', c: '#10B981' },
                      { t: 'Nouveau prospect', c: '#FF5C1A' },
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
            <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-[60%] h-40 bg-[#FF5C1A]/[0.06] blur-[100px] rounded-full" />
          </div>
        </div>
      </section>

      {/* ══════════════════════ STATS — FULL WIDTH BAND ══════════════════════ */}
      <section className="relative border-y border-white/[0.04] overflow-hidden">
        {/* Accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF5C1A]/30 to-transparent" />

        <div className="py-6 border-b border-white/[0.03] overflow-hidden relative bg-[#050505]">
          <p className="text-center text-[9px] uppercase tracking-[0.25em] text-[#F5F5F3]/15 font-semibold mb-5" style={{ fontFamily: instrument }}>La plateforme coaching choisie par les pros en France</p>
          <div className="relative">
            <div className="flex gap-16 animate-marquee whitespace-nowrap">
              {[...Array(2)].flatMap((_, r) =>
                ['CrossFit', 'BPJEPS', 'STAPS', 'FitPro', 'CoachHub', 'TrainMe', 'SportEasy', 'MyCoach'].map((n, i) => (
                  <span key={`${r}-${i}`} className="text-sm font-bold text-[#F5F5F3]/[0.12] tracking-wider" style={{ fontFamily: clash }}>{n}</span>
                ))
              )}
            </div>
          </div>
        </div>

        <div ref={statsRef} className="max-w-7xl mx-auto px-5 md:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0">
            {[
              { value: '500', suffix: '+', label: 'Coachs actifs en France', icon: Users },
              { value: '12000', suffix: '+', label: 'Clients suivis chaque mois', icon: Heart },
              { value: '4.8', suffix: '/5', label: 'Note satisfaction coach', icon: Star },
              { value: '98', suffix: '%', label: 'Taux de retention client', icon: Trophy },
            ].map((s, i) => {
              const count = useAnimatedCounter(s.value, statsInView)
              const Icon = s.icon
              return (
                <div key={i} className={`text-center relative ${i < 3 ? 'md:border-r md:border-white/[0.04]' : ''}`}>
                  <div className={`transition-all duration-700 ${statsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: `${i * 100}ms` }}>
                    <div className="w-10 h-10 rounded-xl bg-[#FF5C1A]/[0.06] border border-[#FF5C1A]/10 flex items-center justify-center mx-auto mb-3">
                      <Icon size={18} className="text-[#FF5C1A]" />
                    </div>
                    <p className="text-3xl md:text-5xl font-bold bg-gradient-to-b from-[#F5F5F3] to-[#F5F5F3]/60 bg-clip-text text-transparent" style={{ fontFamily: clash }}>
                      {typeof count === 'number' ? count.toLocaleString('fr-FR') : count}{s.suffix}
                    </p>
                    <p className="text-sm text-[#F5F5F3]/25 mt-2 font-medium">{s.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════ FEATURES BENTO ══════════════════════ */}
      <section id="features" className="py-24 md:py-36 px-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Left-aligned header */}
          <div className="max-w-2xl mb-16 md:mb-20">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-[#F5F5F3]/35 font-medium mb-6">
              <Zap size={12} className="text-[#FF5C1A]" /> Fonctionnalites
            </div>
            <h2 className="text-3xl md:text-[3.5rem] font-bold tracking-tight leading-[1.1] mb-5" style={{ fontFamily: clash }}>
              12 outils reunis en un seul.
              <br /><span className="bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] bg-clip-text text-transparent">Zero compromis.</span>
            </h2>
            <p className="text-[#F5F5F3]/30 text-lg">Chaque fonctionnalite te fait gagner du temps concret. Pas de gadget, que de l'essentiel pour ton activite de coaching.</p>
          </div>

          <div ref={featuresRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {BENTO_FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <div
                  key={i}
                  className={`group relative rounded-2xl border border-white/[0.06] p-5 md:p-6 transition-all duration-500 overflow-hidden ${f.span} ${featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} bento-card`}
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  {/* Gradient border on hover */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 gradient-border-glow" />
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[#FF5C1A]/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-[1]">
                    <div className="w-10 h-10 rounded-xl bg-[#FF5C1A]/10 border border-[#FF5C1A]/10 flex items-center justify-center mb-4 group-hover:bg-[#FF5C1A]/15 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(255,92,26,0.15)] transition-all duration-500">
                      <Icon size={18} className="text-[#FF5C1A]" />
                    </div>
                    <h3 className="text-sm font-semibold mb-1.5 text-[#F5F5F3]" style={{ fontFamily: clash }}>{f.title}</h3>
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

      {/* ══════════════════════ SHOWCASES — ZIGZAG + OFFSET ══════════════════════ */}
      <section className="py-12 md:py-24 px-5 md:px-8">
        <div className="max-w-6xl mx-auto space-y-32 md:space-y-48">
          {SHOWCASES.map((item, i) => {
            const isReversed = i % 2 === 1
            return (
              <div key={i} className="relative">
                {/* Decorative blob behind each showcase */}
                <div className={`pointer-events-none absolute ${isReversed ? 'left-[-200px]' : 'right-[-200px]'} top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#FF5C1A]/[0.02] blur-[150px]`} />

                <div className={`relative flex flex-col ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12 md:gap-20`}>
                  <div className="flex-1 max-w-lg">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5C1A]/10 border border-[#FF5C1A]/15 text-[10px] font-bold text-[#FF5C1A] uppercase tracking-wider mb-5">{item.badge}</div>
                    <h3 className="text-2xl md:text-[2.5rem] font-bold tracking-tight mb-4 leading-[1.1]" style={{ fontFamily: clash }}>{item.title}</h3>
                    <p className="text-[#F5F5F3]/35 text-base leading-relaxed mb-6">{item.desc}</p>
                    {/* Metric highlight */}
                    <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#FF5C1A]/[0.06] border border-[#FF5C1A]/10 mb-6">
                      <span className="text-2xl font-bold text-[#FF5C1A]" style={{ fontFamily: clash }}>{item.metric.value}</span>
                      <span className="text-xs text-[#F5F5F3]/40">{item.metric.label}</span>
                    </div>
                    <ul className="space-y-2.5">
                      {item.features.map((feat, j) => (
                        <li key={j} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-md bg-[#FF5C1A]/10 flex items-center justify-center flex-shrink-0">
                            <Check size={11} className="text-[#FF5C1A]" />
                          </div>
                          <span className="text-sm text-[#F5F5F3]/40">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`flex-1 w-full max-w-md ${i % 2 === 0 ? 'animate-float' : 'animate-float-delayed'} ${isReversed ? 'md:-translate-x-4' : 'md:translate-x-4'}`}>
                    <ShowcaseVisual type={item.visual} screenshot={item.screenshot} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ══════════════════════ HOW IT WORKS — HORIZONTAL TIMELINE ══════════════════════ */}
      <section id="how" className="py-24 md:py-36 px-5 md:px-8 relative border-y border-white/[0.04]">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF5C1A]/20 to-transparent" />
        <div className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#FF5C1A]/[0.02] blur-[150px]" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-16 md:mb-20">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-[#F5F5F3]/35 font-medium mb-6">
              <Target size={12} className="text-[#FF5C1A]" /> 3 etapes
            </div>
            <h2 className="text-3xl md:text-[3.5rem] font-bold tracking-tight leading-tight mb-5" style={{ fontFamily: clash }}>
              Ton logiciel coach sportif pret en <span className="bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] bg-clip-text text-transparent">2 minutes</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-20 left-[20%] right-[20%] h-px bg-gradient-to-r from-[#FF5C1A]/5 via-[#FF5C1A]/20 to-[#FF5C1A]/5" />
            {STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={i} className="relative rounded-2xl border border-white/[0.06] p-7 hover:border-[#FF5C1A]/20 transition-all duration-500 group text-center bento-card">
                  <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 gradient-border-glow" />
                  <div className="relative z-[1]">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF5C1A]/15 to-[#FF7A42]/5 border border-[#FF5C1A]/10 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,92,26,0.15)] transition-all duration-500">
                      <Icon size={26} className="text-[#FF5C1A]" />
                    </div>
                    <span className="text-[10px] font-bold text-[#FF5C1A]/30 uppercase tracking-widest" style={{ fontFamily: clash }}>Etape {s.num}</span>
                    <h3 className="text-lg font-semibold mt-2 mb-3 text-[#F5F5F3]" style={{ fontFamily: clash }}>{s.title}</h3>
                    <p className="text-sm text-[#F5F5F3]/30 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════ TESTIMONIALS — HORIZONTAL SCROLL MOBILE ══════════════════════ */}
      <section id="testimonials" className="py-24 md:py-36 px-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Right-aligned header for variety */}
          <div className="text-right mb-16 max-w-2xl ml-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-[#F5F5F3]/35 font-medium mb-6">
              <Heart size={12} className="text-[#FF5C1A]" /> Temoignages
            </div>
            <h2 className="text-3xl md:text-[3.5rem] font-bold tracking-tight leading-tight mb-5" style={{ fontFamily: clash }}>
              500+ coachs ont <span className="bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] bg-clip-text text-transparent">automatise</span>
            </h2>
          </div>

          {/* Featured + grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Featured testimonial */}
            <div className="rounded-2xl border-2 border-[#FF5C1A]/20 p-7 md:p-8 flex flex-col relative overflow-hidden bento-card shadow-[0_8px_60px_rgba(255,92,26,0.06)]">
              <div className="pointer-events-none absolute top-0 right-0 w-60 h-60 bg-[#FF5C1A]/[0.05] blur-[80px] rounded-full animate-glow-pulse" />
              <div className="pointer-events-none absolute inset-0 rounded-2xl gradient-border-glow opacity-50" />
              <div className="relative z-[1]">
                <div className="flex gap-0.5 mb-5">
                  {[1,2,3,4,5].map(j => <Star key={j} size={16} className="text-[#FF5C1A] fill-[#FF5C1A]" />)}
                </div>
                <p className="text-base md:text-lg text-[#F5F5F3]/60 leading-relaxed flex-1 mb-6">
                  "{TESTIMONIALS[activeTesti].text}"
                </p>
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#FF5C1A]/[0.06] border border-[#FF5C1A]/10 mb-5 self-start">
                  <span className="text-xl font-bold text-[#FF5C1A]" style={{ fontFamily: clash }}>{TESTIMONIALS[activeTesti].metric.value}</span>
                  <span className="text-xs text-[#F5F5F3]/35">{TESTIMONIALS[activeTesti].metric.label}</span>
                </div>
                <div className="flex items-center gap-3 pt-5 border-t border-white/[0.05]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF5C1A] to-[#FF7A42] flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-[#FF5C1A]/20">{TESTIMONIALS[activeTesti].avatar}</div>
                  <div>
                    <p className="text-sm font-semibold text-[#F5F5F3]">{TESTIMONIALS[activeTesti].name}</p>
                    <p className="text-[11px] text-[#F5F5F3]/25">{TESTIMONIALS[activeTesti].role}</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Smaller cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TESTIMONIALS.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTesti(i)}
                  className={`rounded-2xl border p-5 text-left transition-all duration-300 bento-card ${i === activeTesti ? 'border-[#FF5C1A]/20 !bg-[#111111]' : 'border-white/[0.05] hover:border-white/[0.1]'}`}
                >
                  <div className="flex gap-0.5 mb-3">
                    {[1,2,3,4,5].map(j => <Star key={j} size={10} className="text-[#FF5C1A] fill-[#FF5C1A]" />)}
                  </div>
                  <p className="text-xs text-[#F5F5F3]/40 leading-relaxed line-clamp-3 mb-3">"{t.text}"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FF5C1A] to-[#FF7A42] flex items-center justify-center text-white text-[8px] font-bold">{t.avatar.charAt(0)}</div>
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
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF5C1A]/20 to-transparent" />
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-[#FF5C1A]/[0.035] blur-[150px]" />
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-[#F5F5F3]/35 font-medium mb-6">
              <CreditCard size={12} className="text-[#FF5C1A]" /> Tarifs transparents
            </div>
            <h2 className="text-3xl md:text-[3.5rem] font-bold tracking-tight leading-tight mb-5" style={{ fontFamily: clash }}>
              Rentabilise des <span className="bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] bg-clip-text text-transparent">le premier client</span>
            </h2>
            <p className="text-[#F5F5F3]/30 text-lg max-w-lg mx-auto mb-8">Moins cher qu'un cafe par jour. Chaque plan inclut tout ce dont un coach a besoin pour gerer et developper son activite.</p>
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <button onClick={() => setBillingYearly(false)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${!billingYearly ? 'bg-[#FF5C1A] text-white shadow-lg shadow-[#FF5C1A]/20' : 'text-[#F5F5F3]/35'}`}>Mensuel</button>
              <button onClick={() => setBillingYearly(true)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${billingYearly ? 'bg-[#FF5C1A] text-white shadow-lg shadow-[#FF5C1A]/20' : 'text-[#F5F5F3]/35'}`}>
                Annuel {!billingYearly && <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full">-20%</span>}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {PLANS.map((plan) => {
              const price = billingYearly ? plan.price.yearly : plan.price.monthly
              return (
                <div key={plan.id} className={`relative rounded-2xl p-7 flex flex-col transition-all duration-500 bento-card ${plan.popular ? 'border-2 border-[#FF5C1A]/25 shadow-[0_0_80px_rgba(255,92,26,0.08)] md:scale-[1.04]' : 'border border-white/[0.06] hover:border-white/[0.12] hover:shadow-[0_8px_40px_rgba(0,0,0,0.3)]'}`}>
                  {/* Gradient glow for popular */}
                  {plan.popular && <div className="pointer-events-none absolute inset-0 rounded-2xl gradient-border-glow opacity-50" />}
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-[2]">
                      <span className="bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] text-white text-[9px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-[#FF5C1A]/25">Le plus populaire</span>
                    </div>
                  )}
                  <div className="relative z-[1]">
                    <h3 className="text-xl font-bold mb-1" style={{ fontFamily: clash }}>{plan.name}</h3>
                    <p className="text-[11px] text-[#F5F5F3]/25 mb-5">{plan.desc}</p>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-4xl font-bold" style={{ fontFamily: clash }}>{price}</span>
                      <span className="text-[#F5F5F3]/20 text-sm">{'\u20AC'}/mois</span>
                    </div>
                    {billingYearly && <p className="text-[10px] text-emerald-400/60 font-medium mb-5">Economise {(plan.price.monthly - plan.price.yearly) * 12}{'\u20AC'}/an</p>}
                    {!billingYearly && <p className="text-[10px] text-[#F5F5F3]/15 mb-5">facture mensuellement</p>}
                    <ul className="space-y-2.5 mb-7 flex-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2.5"><Check size={13} className="text-[#FF5C1A] flex-shrink-0" /><span className="text-sm text-[#F5F5F3]/40">{f}</span></li>
                      ))}
                    </ul>
                    <button onClick={() => navigate('/register')} className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${plan.popular ? 'bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] text-white hover:shadow-lg hover:shadow-[#FF5C1A]/25' : 'bg-white/[0.04] text-[#F5F5F3] hover:bg-white/[0.07] border border-white/[0.06]'}`}>
                      <span className="relative z-10">Essai gratuit 14 jours</span>
                      {plan.popular && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-center text-[11px] text-[#F5F5F3]/15 mt-8">Facturation coach sportif securisee par Stripe · Sans engagement · Annulation en un clic</p>
        </div>
      </section>

      {/* ══════════════════════ FAQ ══════════════════════ */}
      <section id="faq" className="py-24 md:py-36 px-5 md:px-8 relative">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#FF5C1A]/[0.02] blur-[150px]" />
        <div className="relative max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-[#F5F5F3]/35 font-medium mb-6">
              <HelpCircle size={12} className="text-[#FF5C1A]" /> FAQ
            </div>
            <h2 className="text-3xl md:text-[3.5rem] font-bold tracking-tight leading-tight mb-4" style={{ fontFamily: clash }}>
              Questions frequentes
              <br />
              <span className="bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] bg-clip-text text-transparent">sur le logiciel Zevo</span>
            </h2>
            <p className="text-[#F5F5F3]/25 text-base max-w-md mx-auto">
              Tout ce que tu dois savoir sur notre logiciel de gestion coaching avant de te lancer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden bento-card ${
                  openFaq === i
                    ? 'border-[#FF5C1A]/20 shadow-[0_4px_30px_rgba(255,92,26,0.06)]'
                    : 'border-white/[0.06] hover:border-white/[0.1] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
                }`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-start gap-3.5 px-5 py-5 text-left"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold transition-all duration-300 ${
                    openFaq === i ? 'bg-[#FF5C1A]/15 text-[#FF5C1A]' : 'bg-white/[0.04] text-[#F5F5F3]/20'
                  }`} style={{ fontFamily: clash }}>
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
                      openFaq === i ? 'rotate-180 text-[#FF5C1A]' : 'text-[#F5F5F3]/15'
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
          <div className="mt-10 rounded-2xl border border-white/[0.06] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden bento-card">
            <div className="pointer-events-none absolute top-0 right-0 w-40 h-40 bg-[#FF5C1A]/[0.04] blur-[60px] rounded-full" />
            <div className="flex items-center gap-4 relative z-[1]">
              <div className="w-12 h-12 rounded-2xl bg-[#FF5C1A]/10 border border-[#FF5C1A]/10 flex items-center justify-center flex-shrink-0">
                <PhoneCall size={20} className="text-[#FF5C1A]" />
              </div>
              <div>
                <p className="text-base font-semibold text-[#F5F5F3]" style={{ fontFamily: clash }}>Besoin d'un avis personnalise ?</p>
                <p className="text-sm text-[#F5F5F3]/30">Reserve une demo gratuite de 15 min. On te montre le logiciel en live.</p>
              </div>
            </div>
            <button onClick={() => navigate('/demo')} className="relative z-[1] group w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[#FF5C1A]/25 transition-all flex items-center justify-center gap-2">
              <Video size={15} />
              Voir la demo
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FINAL CTA ══════════════════════ */}
      <section className="relative py-28 md:py-40 px-5 md:px-8 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#FF5C1A]/[0.08] via-[#FF5C1A]/[0.02] to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] rounded-full bg-[#FF5C1A]/[0.06] blur-[150px] animate-glow-pulse" />
        <div className="pointer-events-none absolute top-1/4 left-[10%] w-[300px] h-[300px] rounded-full bg-[#FF7A42]/[0.03] blur-[100px]" />
        <div className="pointer-events-none absolute top-1/4 right-[10%] w-[300px] h-[300px] rounded-full bg-[#FF5C1A]/[0.03] blur-[100px]" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF5C1A]/10 border border-[#FF5C1A]/20 mb-8">
            <Flame size={14} className="text-[#FF5C1A]" />
            <span className="text-xs font-semibold text-[#FF5C1A]">Rejoins 500+ coachs en France</span>
          </div>
          <h2 className="text-3xl md:text-[3.75rem] font-bold tracking-tight leading-[1.08] mb-6" style={{ fontFamily: clash }}>
            <span className="block">Pendant que tu hesites,</span>
            <span className="block">
              <span className="hero-outline-text">d'autres coachs</span>{' '}
              <span className="bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] bg-clip-text text-transparent">automatisent.</span>
            </span>
          </h2>
          <p className="text-[#F5F5F3]/30 text-lg max-w-lg mx-auto mb-10 leading-relaxed">
            14 jours gratuits. Tout le logiciel coach sportif, sans carte bancaire. Ton espace est pret en 30 secondes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/register')} className="group w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] text-white font-semibold text-base hover:shadow-2xl hover:shadow-[#FF5C1A]/30 transition-all duration-300 inline-flex items-center justify-center gap-2.5 relative overflow-hidden">
              <span className="relative z-10 flex items-center gap-2.5">Lancer mon essai gratuit <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.15] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
            <button onClick={() => navigate('/demo')} className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/[0.07] text-[#F5F5F3]/40 font-medium hover:bg-white/[0.03] hover:text-[#F5F5F3] transition-all flex items-center justify-center gap-2">
              <Video size={15} className="text-[#FF5C1A]" /> Voir la demo
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer className="border-t border-white/[0.04] bg-[#050505] relative">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <ZevoLogo size="md" />
              <p className="text-[11px] text-[#F5F5F3]/15 mt-3 leading-relaxed max-w-[200px]">Le logiciel coach sportif tout-en-un. Suivi client, programmes et facturation en une seule app.</p>
            </div>
            {[
              { title: 'Produit', links: ['Entrainement', 'Programmes', 'Nutrition', 'Calendrier', 'Tarifs'], paths: ['/features/entrainement', '/features/programmes', '/features/nutrition', '/features/calendrier', null], ids: [null, null, null, null, 'pricing'] },
              { title: 'Ressources', links: ['Centre d\'aide', 'Blog', 'Changelog', 'Contact'] },
              { title: 'Legal', links: ['Mentions legales', 'Confidentialite', 'CGV', 'Cookies'] },
            ].map((col, i) => (
              <div key={i}>
                <p className="text-[10px] font-semibold text-[#F5F5F3]/30 uppercase tracking-wider mb-4" style={{ fontFamily: clash }}>{col.title}</p>
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
            <p className="text-[10px] text-[#F5F5F3]/10 flex items-center gap-1.5">Fait avec <Heart size={9} className="text-[#FF5C1A] fill-[#FF5C1A]" /> pour les coachs</p>
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

        /* Hero outline text — stroke effect */
        .hero-outline-text {
          -webkit-text-stroke: 1.5px rgba(255, 92, 26, 0.5);
          color: transparent;
        }
        @media (min-width: 768px) {
          .hero-outline-text {
            -webkit-text-stroke: 2px rgba(255, 92, 26, 0.5);
          }
        }

        /* Bento card — glassmorphism base */
        .bento-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.008) 100%);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        /* Gradient border glow — on hover via parent */
        .gradient-border-glow {
          background: linear-gradient(135deg, rgba(255,92,26,0.08) 0%, transparent 40%, transparent 60%, rgba(255,122,66,0.06) 100%);
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

        .shimmer-border {
          background: linear-gradient(90deg, transparent 0%, rgba(255,92,26,0.15) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }

        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  )
}
