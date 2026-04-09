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
  { icon: Dumbbell, label: 'Entraînement', desc: 'Séances guidées en direct', path: '/features/entrainement' },
  { icon: ClipboardList, label: 'Programmes', desc: 'Crée en 5 min, suivi auto', path: '/features/programmes' },
  { icon: Utensils, label: 'Nutrition', desc: 'Macros & plans alimentaires', path: '/features/nutrition' },
  { icon: CalendarDays, label: 'Calendrier', desc: 'Réservations en un clic', path: '/features/calendrier' },
  { icon: Users, label: 'Hub Client', desc: 'Chaque client en 3 secondes', path: '/features/hub-client' },
  { icon: MessageCircle, label: 'Messagerie', desc: 'Chat intégré, fini WhatsApp', path: '/features/messagerie' },
  { icon: BookOpen, label: 'Bibliothèque', desc: 'Vidéos & ressources partagées', path: '/features/bibliotheque' },
  { icon: ClipboardList, label: 'Formulaires', desc: 'Bilans & check-ins auto', path: '/features/formulaires' },
  { icon: BarChart3, label: 'Statistiques', desc: 'Prouve tes résultats en PDF', path: '/features/statistiques' },
  { icon: Paintbrush, label: 'App Builder', desc: 'Ton app à tes couleurs', path: '/features/app-builder' },
  { icon: CreditCard, label: 'Paiements', desc: 'Encaissement Stripe auto', path: '/features/paiements' },
  { icon: UserPlus, label: 'CRM Prospects', desc: 'Convertis plus de leads', path: '/features/prospects' },
]

const FEATURE_CATEGORIES = [
  {
    title: 'Coaching',
    items: [
      { icon: Dumbbell, label: 'Programmes et séances', path: '/features/programmes' },
      { icon: BookOpen, label: "Bibliothèque d'exercices", path: '/features/bibliotheque' },
      { icon: Play, label: 'Entraînement en direct', path: '/features/entrainement' },
    ],
  },
  {
    title: 'Nutrition',
    items: [
      { icon: Utensils, label: 'Plans alimentaires', path: '/features/nutrition' },
      { icon: ClipboardList, label: 'Suivi des macros', path: '/features/nutrition' },
    ],
  },
  {
    title: 'Gestion Clients',
    items: [
      { icon: Users, label: 'Suivi client 360', path: '/features/hub-client' },
      { icon: ClipboardList, label: 'Bilans & formulaires', path: '/features/formulaires' },
      { icon: BarChart3, label: 'Statistiques', path: '/features/statistiques' },
      { icon: UserPlus, label: 'CRM Prospects', path: '/features/prospects' },
      { icon: CreditCard, label: 'Paiements Stripe', path: '/features/paiements' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { icon: MessageCircle, label: 'Messagerie intégrée', path: '/features/messagerie' },
      { icon: CalendarDays, label: 'Calendrier & réservations', path: '/features/calendrier' },
    ],
  },
  {
    title: 'Personnalisation',
    items: [
      { icon: Paintbrush, label: 'Branding personnalisé', path: '/features/app-builder' },
      { icon: Smartphone, label: 'App en marque blanche', path: '/features/app-builder' },
    ],
  },
]

const BENTO_FEATURES = [
  {
    icon: Users, title: 'Connais chaque client en 3s',
    desc: 'Score bien-être, objectifs, mensurations, historique des séances. Fini les fichiers Excel dispersés — tout est dans une fiche unique.',
    span: 'col-span-1 md:col-span-2 md:row-span-2', visual: 'hub',
  },
  {
    icon: Dumbbell, title: 'Programmes en 5 min',
    desc: 'Drag & drop, multi-semaines, suivi live. Tes clients voient leur progression en temps réel.',
    span: 'col-span-1', visual: null,
  },
  {
    icon: MessageCircle, title: 'Messagerie intégrée',
    desc: 'Chat, audio, fichiers. Réponds à tes clients sans quitter Zevo. Fini WhatsApp pro.',
    span: 'col-span-1', visual: null,
  },
  {
    icon: BarChart3, title: 'Prouve tes résultats',
    desc: 'Dashboards clairs, graphiques automatiques, export PDF. Montre l\'impact concret de ton coaching à chaque client.',
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
    icon: ClipboardList, title: 'Bilans automatisés',
    desc: 'Check-in hebdo, bilan initial, questionnaire satisfaction. Zéro paperasse, tout est automatique.',
    span: 'col-span-1', visual: null,
  },
  {
    icon: CreditCard, title: 'Encaisse en automatique',
    desc: 'Stripe connecté en 1 clic. Tu fixes tes prix, tes clients paient, l\'argent tombe. Zéro relance.',
    span: 'col-span-1', visual: null,
  },
]

const SHOWCASES = [
  {
    badge: 'Suivi client coaching',
    title: 'Fini les tableurs. Connais chaque client en un coup d\'œil.',
    desc: 'Score bien-être, objectifs, séances réalisées, mensurations — tout centralisé dans une fiche unique. Tu repères un client en difficulté en 3 secondes, pas en 30 minutes.',
    features: ['Fiche client 360 unifiée', 'Score bien-être automatique', 'Alertes désengagement', 'Historique complet des séances'],
    visual: 'client',
    metric: { value: '3s', label: 'pour scanner un client' },
    screenshot: null,
  },
  {
    badge: 'Programme sport en ligne',
    title: 'Des programmes que tes clients terminent vraiment',
    desc: 'Interface claire, exercices avec vidéos, validation en temps réel. Le taux de complétion explose parce que l\'expérience client est addictive.',
    features: ['Drag & drop intuitif', 'Vidéos démo intégrées', 'Validation live', 'Templates réutilisables'],
    visual: 'program',
    metric: { value: '5h', label: 'gagnées par semaine' },
    screenshot: null,
  },
  {
    badge: 'Application coach sportif',
    title: 'Tes clients pensent que c\'est TON app',
    desc: 'Ton logo, tes couleurs, tes modules. L\'expérience est 100% brandée à ton image. Augmente ta valeur perçue et justifie des tarifs 40% plus élevés.',
    features: ['Branding complet', 'Modules au choix', 'Preview en temps réel', 'Expérience client premium'],
    visual: 'app',
    metric: { value: '+40%', label: 'de valeur perçue' },
    screenshot: null,
  },
]

const STEPS = [
  { num: '01', title: 'Crée ton espace', desc: '30 secondes chrono. Sans carte bancaire. Accès complet à toutes les fonctionnalités pendant 14 jours.', icon: Rocket },
  { num: '02', title: 'Importe tes clients', desc: 'Invite par email ou lien. Tes clients accèdent à leur espace en 1 minute. L\'onboarding te guide pas à pas.', icon: Paintbrush },
  { num: '03', title: 'Automatise et grandis', desc: 'Tes clients progressent, tu mesures l\'impact, tu augmentes tes tarifs. Le cercle vertueux du coaching digital.', icon: TrendingUp },
]

const TESTIMONIALS = [
  {
    name: 'Julien Morel', role: 'Coach sportif · Paris', avatar: 'JM',
    text: 'Avant Zevo, je passais 2h par jour sur mes tableurs. Maintenant le suivi client coaching est automatisé. J\'ai pris 12 clients de plus sans embaucher personne.',
    metric: { value: 'x2', label: 'clients en 3 mois' }, rating: 5,
  },
  {
    name: 'Camille Rousseau', role: 'Coach nutrition · Lyon', avatar: 'CR',
    text: 'Mes clients adorent recevoir leur programme sport en ligne directement dans l\'app. Le taux de complétion a explosé. Je ne reviendrais en arrière pour rien au monde.',
    metric: { value: '5h', label: 'gagnées/semaine' }, rating: 5,
  },
  {
    name: 'Romain Dubois', role: 'Préparateur physique · Bordeaux', avatar: 'RD',
    text: 'La facturation automatique m\'a libéré un temps fou. Plus de relances, plus d\'impayés. Et les rapports PDF impressionnent mes athlètes à chaque bilan.',
    metric: { value: '98%', label: 'rétention clients' }, rating: 5,
  },
  {
    name: 'Léa Fontaine', role: 'Coach bien-être · Nantes', avatar: 'LF',
    text: 'L\'App Builder a tout changé. Mes clients pensent que c\'est ma propre application coach sportif. J\'ai augmenté mes tarifs de 35% et personne n\'a bronché.',
    metric: { value: '+35%', label: 'sur ses tarifs' }, rating: 5,
  },
]

const PLANS = [
  {
    id: 'starter', name: 'Starter', price: { monthly: 29, yearly: 24 },
    desc: 'Lance ton activité de coaching digital',
    features: ['5 clients actifs', 'Dashboard coach complet', 'Messagerie intégrée', 'Programmes & séances', 'Formulaires & bilans', 'Bibliothèque de ressources', 'CRM prospects', 'Support email 24h'],
  },
  {
    id: 'pro', name: 'Pro', price: { monthly: 49, yearly: 39 }, popular: true,
    desc: 'Automatise et développe ton activité',
    features: ['50 clients actifs', 'Tout le Starter +', 'App Builder (ton branding)', 'Rapports PDF automatiques', 'Statistiques avancées', 'Plans nutritionnels complets', 'Support prioritaire'],
  },
  {
    id: 'unlimited', name: 'Unlimited', price: { monthly: 79, yearly: 65 },
    desc: 'Coaching sans aucune limite',
    features: ['Clients illimités', 'Tout le Pro +', 'Automatisation avancée', 'API & webhooks', 'Support dédié sous 2h'],
  },
]

const FAQS = [
  { q: 'L\'essai gratuit est vraiment sans carte bancaire ?', a: 'Oui. 14 jours avec TOUTES les fonctionnalités du logiciel coach sportif. Zéro carte bancaire demandée. Tu annules en un clic si tu veux, tes données restent 30 jours.' },
  { q: 'Mes clients doivent payer pour utiliser l\'app ?', a: 'Non. Tes clients accèdent gratuitement à leur espace coaching via un simple lien d\'invitation. Ils n\'ont rien à débourser.' },
  { q: 'En quoi Zevo est différent des autres logiciels de coaching ?', a: 'Zevo est la seule plateforme coaching en France qui réunit suivi client, programmes sport en ligne, nutrition, paiements et branding dans une seule app. Pas 5 outils, un seul.' },
  { q: 'Comment fonctionne la facturation coach sportif ?', a: 'Tu connectes Stripe en un clic. Tu crées tes offres au prix que tu veux. Tes clients paient directement. L\'argent arrive sur ton compte. Zéro relance manuelle.' },
  { q: 'Puis-je personnaliser l\'app à mes couleurs ?', a: 'Oui. L\'App Builder te permet de mettre ton logo, ta palette, tes modules. Tes clients pensent utiliser ta propre application coach sportif.' },
  { q: 'Combien de temps pour migrer mes clients ?', a: 'Invite-les par email ou lien. Ils créent leur compte en moins d\'une minute. La plupart des coachs migrent en un après-midi.' },
  { q: 'Y a-t-il un engagement ?', a: 'Zéro engagement. Upgrade, downgrade ou annule à tout moment. Pas de frais cachés, pas de mauvaise surprise.' },
  { q: 'Ça fonctionne sur mobile ?', a: '100% responsive et optimisé mobile. Smartphone, tablette, desktop — tes clients s\'entraînent depuis n\'importe où en France.' },
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
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF5C1A] to-[#FF7A42] flex items-center justify-center text-white text-[10px] font-bold">SD</div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-[#F5F5F3]">Sarah Dumont</div>
          <div className="text-[9px] text-[#F5F5F3]/25">Remise en forme · 4 mois</div>
        </div>
        <div className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">Actif</div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { v: '8.7', l: 'Bien-être', c: '#10B981' },
          { v: '14/16', l: 'Séances', c: '#3B82F6' },
          { v: '-4.8kg', l: 'Objectif', c: '#FF5C1A' },
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
          {/* Client header with status */}
          <div className="flex items-center gap-3 relative">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FF5C1A] to-[#FF7A42] flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-[#FF5C1A]/20">SD</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-[#F5F5F3]">Sarah Dumont</div>
              <div className="text-[10px] text-[#F5F5F3]/25">Remise en forme · Depuis 4 mois</div>
            </div>
            <div className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-[9px] text-emerald-400 font-bold">Actif</div>
          </div>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'Bien-être', val: '8.7/10', color: '#10B981', trend: '+1.2' },
              { label: 'Séances', val: '14/16', color: '#3B82F6', trend: '87%' },
              { label: 'Objectif', val: '-4.8 kg', color: '#FF5C1A', trend: 'atteint' },
            ].map((s, i) => (
              <div key={i} className="rounded-xl bg-white/[0.025] border border-white/[0.05] p-3 text-center">
                <p className="text-lg font-bold" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[9px] text-[#F5F5F3]/25 mt-0.5">{s.label}</p>
                <p className="text-[8px] mt-1 font-semibold" style={{ color: s.color }}>{s.trend}</p>
              </div>
            ))}
          </div>
          {/* Prochaine séance + historique */}
          <div className="rounded-xl bg-white/[0.025] border border-white/[0.05] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-[#F5F5F3]/40">Progression poids</span>
              <span className="text-[9px] text-emerald-400 font-bold">Objectif atteint ✓</span>
            </div>
            <div className="flex items-end gap-1 h-14">
              {[85, 78, 72, 68, 62, 58, 52, 48, 42, 38, 32, 28].map((h, i) => (
                <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: `linear-gradient(to top, rgba(16,185,129,${0.3 + i * 0.05}), rgba(16,185,129,${0.15 + i * 0.04}))` }} />
              ))}
            </div>
          </div>
          {/* Notes coach */}
          <div className="rounded-xl bg-white/[0.025] border border-white/[0.05] p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <FileText size={10} className="text-[#FF5C1A]" />
              <span className="text-[10px] font-semibold text-[#F5F5F3]/40">Note du coach</span>
              <span className="text-[8px] text-[#F5F5F3]/15 ml-auto">09/04</span>
            </div>
            <p className="text-[9px] text-[#F5F5F3]/30 leading-relaxed">Sarah progresse très bien. Augmenter charges sur squat la semaine prochaine. Moral au top.</p>
          </div>
        </div>
        <div className="absolute -top-3 -right-3 px-3 py-2 rounded-xl bg-[#111111] border border-emerald-500/20 shadow-xl shadow-black/30 flex items-center gap-2 animate-bounce-slow">
          <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle size={12} className="text-emerald-400" />
          </div>
          <span className="text-[10px] font-semibold text-emerald-400">Séance validée !</span>
        </div>
      </div>
    )
  }

  if (type === 'program') {
    return (
      <div className="relative">
        <div className="rounded-2xl bg-[#0c0c0c] border border-white/[0.06] p-5 space-y-3 shadow-[0_20px_60px_rgba(0,0,0,0.4)] noise-overlay">
          <div className="flex items-center justify-between mb-1 relative">
            <div>
              <div className="text-sm font-semibold text-[#F5F5F3]">Hypertrophie — Haut du corps</div>
              <div className="text-[9px] text-[#F5F5F3]/25 mt-0.5">Sarah D. · Séance 3/4 cette semaine</div>
            </div>
            <div className="px-2 py-0.5 rounded-lg bg-[#FF5C1A]/10 text-[9px] text-[#FF5C1A] font-bold">Sem. 6/12</div>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] w-[50%] transition-all" />
          </div>
          {[
            { name: 'Développé couché', sets: '4×10 @ 65kg', done: true, rpe: '8' },
            { name: 'Rowing barre', sets: '4×10 @ 60kg', done: true, rpe: '7' },
            { name: 'Développé militaire', sets: '3×12 @ 35kg', done: true, rpe: '8.5' },
            { name: 'Curl haltères', sets: '3×12 @ 14kg', done: false, rpe: null },
            { name: 'Dips lestés', sets: '3×10 @ +10kg', done: false, rpe: null },
          ].map((ex, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${ex.done ? 'bg-emerald-500/[0.03] border-emerald-500/15' : 'bg-white/[0.015] border-white/[0.05]'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ex.done ? 'bg-emerald-500/15' : 'bg-white/[0.04]'}`}>
                {ex.done ? <Check size={15} className="text-emerald-400" /> : <Dumbbell size={15} className="text-[#F5F5F3]/25" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#F5F5F3]">{ex.name}</p>
                <p className="text-[10px] text-[#F5F5F3]/25">{ex.sets}</p>
              </div>
              {ex.done && <span className="text-[9px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10">RPE {ex.rpe}</span>}
            </div>
          ))}
        </div>
        <div className="absolute -bottom-3 -left-3 px-3 py-2 rounded-xl bg-[#111111] border border-[#FF5C1A]/20 shadow-xl shadow-black/30 flex items-center gap-2">
          <Flame size={14} className="text-[#FF5C1A]" />
          <span className="text-[10px] font-bold text-[#FF5C1A]">12 jours de suite !</span>
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-xs font-bold">Thomas Coaching</p>
                <p className="text-white/50 text-[9px]">Bonjour Sarah !</p>
              </div>
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <Bell size={10} className="text-white" />
              </div>
            </div>
          </div>
          <div className="p-3 space-y-2.5">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CalendarDays size={11} className="text-[#FF5C1A]" />
                  <span className="text-[10px] font-semibold text-[#F5F5F3]">Séance du jour</span>
                </div>
                <span className="text-[8px] text-emerald-400 font-bold">Dans 2h</span>
              </div>
              <p className="text-[9px] text-[#F5F5F3]/40 font-medium">Hypertrophie — Haut du corps</p>
              <p className="text-[8px] text-[#F5F5F3]/20 mt-0.5">5 exercices · ~55 min</p>
              <div className="mt-2 h-1 rounded-full bg-white/[0.05]">
                <div className="h-full rounded-full bg-[#FF5C1A] w-[50%]" />
              </div>
              <p className="text-[7px] text-[#F5F5F3]/15 mt-1">Semaine 6/12</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-2.5 text-center">
                <Heart size={12} className="text-emerald-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-[#F5F5F3]">8.7</p>
                <p className="text-[7px] text-[#F5F5F3]/25">Bien-être</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-2.5 text-center">
                <Flame size={12} className="text-[#FF5C1A] mx-auto mb-1" />
                <p className="text-sm font-bold text-[#F5F5F3]">12j</p>
                <p className="text-[7px] text-[#F5F5F3]/25">Série</p>
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
              <div className="flex items-center gap-2">
                <MessageCircle size={11} className="text-[#3B82F6]" />
                <span className="text-[10px] font-semibold text-[#F5F5F3]">Coach Thomas</span>
                <span className="text-[7px] text-[#F5F5F3]/15 ml-auto">14:32</span>
              </div>
              <p className="text-[9px] text-[#F5F5F3]/30 mt-1">Bravo pour hier ! On augmente les charges aujourd'hui 💪</p>
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
  const [compareMode, setCompareMode] = useState('sans') // 'sans' | 'avec'

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
        description="Gère tes clients, programmes sport en ligne, paiements et nutrition dans une seule app coach sportif. Essai gratuit 14 jours sans CB. 500+ coachs en France."
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
                Fonctionnalités <ChevronDown size={12} className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute top-full pt-2 z-[100]" style={{ left: '50%', transform: 'translateX(-50%)', width: '860px' }}>
                  <div className="w-full">
                    <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0c] backdrop-blur-2xl shadow-2xl shadow-black/60 overflow-hidden">
                      {/* Top row — 3 columns */}
                      <div className="grid grid-cols-3 gap-0 p-8 pb-6">
                        {FEATURE_CATEGORIES.slice(0, 3).map((cat) => (
                          <div key={cat.title} className="space-y-4">
                            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#FF5C1A]/70">{cat.title}</p>
                            <div className="space-y-1">
                              {cat.items.map((item) => {
                                const Icon = item.icon
                                return (
                                  <button
                                    key={item.label}
                                    onClick={() => { setDropdownOpen(false); navigate(item.path) }}
                                    className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-all text-left"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-[#FF5C1A]/8 flex items-center justify-center flex-shrink-0 group-hover:bg-[#FF5C1A]/15 transition-colors">
                                      <Icon size={15} className="text-[#FF5C1A]/70 group-hover:text-[#FF5C1A] transition-colors" />
                                    </div>
                                    <span className="text-[13px] font-medium text-[#F5F5F3]/60 group-hover:text-[#F5F5F3] transition-colors">{item.label}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Bottom row — 2 columns */}
                      <div className="grid grid-cols-3 gap-0 px-8 pb-6">
                        {FEATURE_CATEGORIES.slice(3).map((cat) => (
                          <div key={cat.title} className="space-y-4">
                            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#FF5C1A]/70">{cat.title}</p>
                            <div className="space-y-1">
                              {cat.items.map((item) => {
                                const Icon = item.icon
                                return (
                                  <button
                                    key={item.label}
                                    onClick={() => { setDropdownOpen(false); navigate(item.path) }}
                                    className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-all text-left"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-[#FF5C1A]/8 flex items-center justify-center flex-shrink-0 group-hover:bg-[#FF5C1A]/15 transition-colors">
                                      <Icon size={15} className="text-[#FF5C1A]/70 group-hover:text-[#FF5C1A] transition-colors" />
                                    </div>
                                    <span className="text-[13px] font-medium text-[#F5F5F3]/60 group-hover:text-[#F5F5F3] transition-colors">{item.label}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Footer */}
                      <div className="border-t border-white/[0.05] px-8 py-4 bg-white/[0.015]">
                        <button onClick={() => { setDropdownOpen(false); scrollTo('features') }} className="text-[12px] font-medium text-[#FF5C1A] hover:text-[#FF7A42] transition-colors flex items-center gap-1.5">
                          Toutes les fonctionnalités <ArrowRight size={12} />
                        </button>
                      </div>
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
              <Video size={13} /> Démo
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
                <span className="text-[15px] font-semibold text-[#F5F5F3]/70">Fonctionnalités</span>
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
                  <Video size={14} className="text-[#FF5C1A]" /> Voir la démo
                </button>
                <button onClick={() => { setMenuOpen(false); navigate('/register') }} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] text-white text-sm font-semibold active:scale-[0.98] transition-transform">Tester gratuitement</button>
                <button onClick={() => { setMenuOpen(false); navigate('/login') }} className="block w-full text-center text-[13px] text-[#F5F5F3]/30 py-2">Déjà un compte ? Se connecter</button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ══════════════════════ HERO — TEXT LEFT + STATS RIGHT ══════════════════════ */}
      <section ref={heroRef} className="relative px-5 md:px-8 pt-28 pb-16">
        <div className={`relative max-w-7xl mx-auto w-full transition-all duration-1000 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-12 lg:gap-16 mb-14 md:mb-20">
            {/* LEFT — Text */}
            <div className="flex-1 max-w-2xl">
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
                <span className="text-xs font-medium text-[#F5F5F3]/40">Adopté par <strong className="text-[#F5F5F3]/70">500+</strong> coachs en France</span>
              </div>

              <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold tracking-tight leading-[1.05] mb-7" style={{ fontFamily: clash }}>
                <span className="block text-[#F5F5F3]">Libère-toi de tes</span>
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
                  <Video size={15} className="text-[#FF5C1A]" /> Voir la démo
                </button>
              </div>

              <div className="flex items-center gap-5 text-[#F5F5F3]/20 text-xs">
                <span className="flex items-center gap-1.5"><Shield size={12} /> Sans carte bancaire</span>
                <span className="flex items-center gap-1.5"><Clock size={12} /> Setup 2 min</span>
                <span className="flex items-center gap-1.5"><Zap size={12} /> 14 jours gratuits</span>
              </div>
            </div>

            {/* RIGHT — Floating stats cards */}
            <div className="hidden lg:block flex-shrink-0 w-[340px] relative">
              <div className="relative space-y-4">
                {/* Card 1 — Clients */}
                <div className="rounded-2xl bg-[#0c0c0c] border border-white/[0.06] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.4)] animate-float">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#FF5C1A]/10 border border-[#FF5C1A]/10 flex items-center justify-center">
                        <Users size={16} className="text-[#FF5C1A]" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#F5F5F3]">Clients actifs</p>
                        <p className="text-[9px] text-[#F5F5F3]/25">Ce mois-ci</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">+5</span>
                  </div>
                  <p className="text-3xl font-bold text-[#F5F5F3]" style={{ fontFamily: clash }}>32</p>
                  <div className="flex items-end gap-0.5 h-8 mt-2">
                    {[20, 22, 23, 25, 24, 27, 26, 28, 30, 32].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#FF5C1A]/40 to-[#FF5C1A]/80" style={{ height: `${(h / 32) * 100}%` }} />
                    ))}
                  </div>
                </div>

                {/* Card 2 — Revenu */}
                <div className="rounded-2xl bg-[#0c0c0c] border border-white/[0.06] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.4)] animate-float-delayed ml-8">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/10 flex items-center justify-center">
                        <TrendingUp size={16} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#F5F5F3]">Revenu mensuel</p>
                        <p className="text-[9px] text-[#F5F5F3]/25">Avril 2026</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">+24%</span>
                  </div>
                  <p className="text-3xl font-bold text-[#F5F5F3]" style={{ fontFamily: clash }}>4 870€</p>
                </div>

                {/* Card 3 — Notification */}
                <div className="rounded-2xl bg-[#0c0c0c] border border-[#FF5C1A]/15 p-4 shadow-[0_8px_40px_rgba(0,0,0,0.4)] animate-float flex items-center gap-3 mr-4" style={{ animationDelay: '1s' }}>
                  <div className="w-8 h-8 rounded-lg bg-[#FF5C1A]/15 flex items-center justify-center flex-shrink-0">
                    <Bell size={14} className="text-[#FF5C1A]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#F5F5F3]">Nouveau paiement reçu</p>
                    <p className="text-[9px] text-[#F5F5F3]/25">Julie D. — Abonnement Pro · 49€</p>
                  </div>
                  <span className="text-[8px] text-[#F5F5F3]/15 flex-shrink-0">2 min</span>
                </div>
              </div>

              {/* Background glow */}
              <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#FF5C1A]/[0.04] blur-[120px]" />
            </div>
          </div>

          {/* FULL-WIDTH Browser mockup */}
          <div className="relative animate-float mx-auto max-w-5xl">
            {/* Floating badges around mockup */}
            <div className="hidden md:flex absolute -top-5 left-12 z-10 items-center gap-2 px-3.5 py-2 rounded-xl bg-[#111]/90 backdrop-blur-xl border border-white/[0.08] shadow-2xl animate-bounce-slow">
              <Users size={14} className="text-[#3B82F6]" />
              <span className="text-[11px] font-semibold text-[#F5F5F3]/70">32 clients actifs</span>
            </div>
            <div className="hidden md:flex absolute -bottom-4 right-12 z-10 items-center gap-2 px-3.5 py-2 rounded-xl bg-[#111]/90 backdrop-blur-xl border border-emerald-500/20 shadow-2xl animate-bounce-slow" style={{ animationDelay: '1.5s' }}>
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-[11px] font-semibold text-emerald-400">+24% ce mois</span>
            </div>
            <div className="hidden md:flex absolute top-1/2 -right-6 -translate-y-1/2 z-10 items-center gap-2 px-3.5 py-2 rounded-xl bg-[#111]/90 backdrop-blur-xl border border-[#FF5C1A]/20 shadow-2xl animate-bounce-slow" style={{ animationDelay: '3s' }}>
              <Sparkles size={14} className="text-[#FF5C1A]" />
              <span className="text-[11px] font-semibold text-[#FF5C1A]">5 nouveaux clients</span>
            </div>

            <div className="rounded-2xl md:rounded-3xl border border-white/[0.07] bg-[#0c0c0c] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.6)] relative" role="img" aria-label="Tableau de bord Zevo — logiciel coach sportif avec suivi clients, statistiques et revenus">
              {/* Gradient border glow */}
              <div className="absolute inset-0 rounded-2xl md:rounded-3xl bg-gradient-to-br from-[#FF5C1A]/10 via-transparent to-[#FF7A42]/5 pointer-events-none" />
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#111] border-b border-white/[0.04]">
                <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" /><div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" /><div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" /></div>
                <div className="flex-1 flex justify-center"><div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.03] text-[10px] text-[#F5F5F3]/20 font-mono"><Lock size={7} /> app.zevo.coach</div></div>
              </div>
              <div className="p-4 md:p-7">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF5C1A] to-[#FF7A42] flex items-center justify-center">
                      <Flame size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm md:text-base font-bold text-[#F5F5F3]" style={{ fontFamily: clash }}>Bonjour, Thomas</p>
                      <p className="text-[10px] text-[#F5F5F3]/25">4 séances prévues — Mercredi 9 Avril</p>
                    </div>
                  </div>
                  <div className="hidden md:flex gap-2">
                    <div className="px-3 py-1.5 rounded-lg bg-[#FF5C1A]/10 text-[10px] text-[#FF5C1A] font-bold flex items-center gap-1.5"><Sparkles size={10} /> 32 clients</div>
                    <div className="px-3 py-1.5 rounded-lg bg-red-500/10 text-[10px] text-red-400 font-bold flex items-center gap-1.5"><Bell size={10} /> 3 en attente</div>
                  </div>
                </div>
                {/* Stats cards row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
                  {[
                    { l: 'Clients actifs', v: '32', t: '+5', c: '#FF5C1A', ic: Users },
                    { l: 'Séances aujourd\'hui', v: '4', t: '', c: '#3B82F6', ic: CalendarDays },
                    { l: 'Prospects', v: '8', t: '+3', c: '#10B981', ic: Target },
                    { l: 'Revenus ce mois', v: '4 870\u20AC', t: '+24%', c: '#F59E0B', ic: CreditCard },
                  ].map((k, i) => (
                    <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 hover:border-white/[0.08] transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <k.ic size={13} style={{ color: k.c }} />
                        {k.t && <span className="text-[8px] text-emerald-400 font-bold">{k.t}</span>}
                      </div>
                      <p className="text-lg font-bold text-[#F5F5F3]">{k.v}</p>
                      <p className="text-[9px] text-[#F5F5F3]/25">{k.l}</p>
                    </div>
                  ))}
                </div>
                {/* Activité du jour */}
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3.5 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={11} className="text-[#FF5C1A]" />
                    <span className="text-[10px] font-semibold text-[#F5F5F3]/40">Activité du jour</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: '4', l: 'séances prévues', c: '#3B82F6', ic: Dumbbell },
                      { v: '2', l: 'événements', c: '#FF5C1A', ic: CalendarDays },
                      { v: '3', l: 'formulaires en attente', c: '#10B981', ic: ClipboardList },
                    ].map((a, i) => (
                      <div key={i} className="flex items-center gap-2.5 rounded-lg bg-white/[0.02] border-l-2 p-2.5" style={{ borderLeftColor: a.c }}>
                        <a.ic size={12} style={{ color: a.c }} />
                        <div>
                          <p className="text-sm font-bold text-[#F5F5F3]">{a.v}</p>
                          <p className="text-[8px] text-[#F5F5F3]/25">{a.l}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Charts row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="md:col-span-2 rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={11} className="text-[#FF5C1A]" />
                        <span className="text-[10px] font-semibold text-[#F5F5F3]/40">Suivi des Revenus</span>
                      </div>
                      <span className="text-[10px] font-semibold text-[#F5F5F3]/20">6 derniers mois — Total : 18 420€</span>
                    </div>
                    <div className="flex items-end gap-1 h-20">
                      {[
                        { h: 25, l: 'Nov' }, { h: 30, l: 'Déc' }, { h: 35, l: 'Janv' },
                        { h: 42, l: 'Fév' }, { h: 68, l: 'Mars' }, { h: 85, l: 'Avr' },
                      ].map((bar, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full rounded-t" style={{ height: `${bar.h}%`, background: i === 5 ? 'linear-gradient(to top, #FF5C1A, #FF7A42)' : `linear-gradient(to top, #FF5C1A40, #FF7A4230)` }} />
                          <span className="text-[7px] text-[#F5F5F3]/15">{bar.l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 space-y-2">
                    <span className="text-[10px] font-semibold text-[#F5F5F3]/30">Activité récente</span>
                    {[
                      { t: 'Sarah a validé sa séance', c: '#10B981', time: '14:32' },
                      { t: 'Paiement reçu 79€', c: '#F59E0B', time: '13:15' },
                      { t: 'Marc — bilan complété', c: '#3B82F6', time: '12:40' },
                      { t: 'Nouveau prospect inscrit', c: '#FF5C1A', time: '11:20' },
                      { t: 'Léa — objectif atteint !', c: '#10B981', time: '10:05' },
                    ].map((a, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.c }} />
                        <span className="text-[9px] text-[#F5F5F3]/35 truncate flex-1">{a.t}</span>
                        <span className="text-[7px] text-[#F5F5F3]/15 flex-shrink-0">{a.time}</span>
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

        <div className="py-8 border-b border-white/[0.03] overflow-hidden relative bg-[#050505]">
          <p className="text-center text-[9px] uppercase tracking-[0.25em] text-[#F5F5F3]/15 font-semibold mb-6" style={{ fontFamily: instrument }}>Déjà utilisé par des coachs en salle, en ligne, en studio</p>
          <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div className="flex gap-12 md:gap-16 animate-logo-scroll whitespace-nowrap">
              {[...Array(3)].flatMap((_, r) =>
                [
                  { name: 'keepcool', src: '/logos/keepcool.svg', alt: 'Keepcool', w: 'w-20 md:w-24' },
                  { name: 'orangebleue', src: '/logos/orangebleue.svg', alt: "L'Orange Bleue", w: 'w-10 md:w-12' },
                  { name: 'jims', src: '/logos/jims.svg', alt: 'JIMS', w: 'w-16 md:w-20' },
                  { name: 'neoness', src: '/logos/neoness.svg', alt: 'Neoness', w: 'w-16 md:w-20' },
                  { name: 'fitnesspark', src: '/logos/fitnesspark.svg', alt: 'Fitness Park', w: 'w-20 md:w-28' },
                  { name: 'gigafit', src: '/logos/gigafit.svg', alt: 'Gigafit', w: 'w-16 md:w-20' },
                  { name: 'basicfit', src: '/logos/basicfit.svg', alt: 'Basic-Fit', w: 'w-16 md:w-20' },
                  { name: 'onair', src: '/logos/onair.svg', alt: 'On Air', w: 'w-16 md:w-20' },
                ].map((brand) => (
                  <img
                    key={`${r}-${brand.name}`}
                    src={brand.src}
                    alt={brand.alt}
                    className={`${brand.w} h-6 md:h-8 object-contain opacity-[0.2] hover:opacity-[0.4] transition-opacity duration-300 select-none brightness-0 invert flex-shrink-0`}
                    draggable={false}
                  />
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
              { value: '98', suffix: '%', label: 'Taux de rétention client', icon: Trophy },
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

      {/* ══════════════════════ SANS / AVEC ZEVO ══════════════════════ */}
      <section className="py-24 md:py-36 px-5 md:px-8 relative">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#FF5C1A]/[0.02] blur-[150px]" />
        <div className="relative max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-12 lg:gap-20">

            {/* LEFT — Cards stack */}
            <div className="flex-1 w-full max-w-lg">
              <div className={`space-y-3 transition-all duration-500 ${compareMode === 'sans' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 absolute pointer-events-none'}`}>
                {[
                  { icon: '📊', app: 'Excel', desc: 'Des tableurs à rallonge et des données à mettre à jour manuellement, tous les jours.' },
                  { icon: '💳', app: 'Facturation manuelle', desc: 'Relances, oublis, erreurs… chaque encaissement devient une perte de temps.' },
                  { icon: '💬', app: 'WhatsApp', desc: '"Coach, c\'est quoi mon programme déjà ?" — des messages non-stop, impossible de tout suivre.' },
                  { icon: '📅', app: 'Organisation manuelle', desc: 'Tout planifier à la main, entre tes fichiers et tes notes, sans aucune automatisation.' },
                  { icon: '📝', app: 'Google Forms', desc: 'Des bilans éparpillés, jamais reliés aux fiches clients. Zéro suivi structuré.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 hover:bg-white/[0.05] transition-all" style={{ animationDelay: `${i * 80}ms` }}>
                    <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-[#F5F5F3] mb-0.5" style={{ fontFamily: clash }}>{item.app}</p>
                      <p className="text-xs text-[#F5F5F3]/30 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`space-y-3 transition-all duration-500 ${compareMode === 'avec' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 absolute pointer-events-none'}`}>
                {[
                  { icon: Users, label: 'Hub Client 360', desc: 'Chaque client, ses objectifs, ses mensurations et son score bien-être — en 3 secondes.' },
                  { icon: CreditCard, label: 'Paiement automatique', desc: 'Stripe connecté, tes clients paient en un clic. Zéro relance, zéro impayé.' },
                  { icon: MessageCircle, label: 'Messagerie intégrée', desc: 'Chat, audio, fichiers — tout dans Zevo. Fini WhatsApp pro.' },
                  { icon: CalendarDays, label: 'Calendrier intelligent', desc: 'Réservations en un clic, rappels automatiques, synchro agenda.' },
                  { icon: ClipboardList, label: 'Bilans automatisés', desc: 'Check-ins hebdo, bilans initiaux, satisfaction — reliés à chaque fiche client.' },
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="flex items-start gap-4 rounded-2xl bg-[#FF5C1A]/[0.04] border border-[#FF5C1A]/15 p-4 hover:bg-[#FF5C1A]/[0.06] transition-all" style={{ animationDelay: `${i * 80}ms` }}>
                      <div className="w-9 h-9 rounded-xl bg-[#FF5C1A]/15 border border-[#FF5C1A]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon size={16} className="text-[#FF5C1A]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#F5F5F3] mb-0.5" style={{ fontFamily: clash }}>{item.label}</p>
                        <p className="text-xs text-[#F5F5F3]/30 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* RIGHT — Title + Toggle + Pain points */}
            <div className="flex-1 max-w-lg">
              <h2 className="text-3xl md:text-[3.2rem] font-bold tracking-tight leading-[1.1] mb-6" style={{ fontFamily: clash }}>
                Une seule app pour tout{' '}
                <span className="bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] bg-clip-text text-transparent">centraliser.</span>
              </h2>

              {/* Toggle */}
              <div className="inline-flex items-center gap-0 p-1 rounded-full bg-white/[0.04] border border-white/[0.06] mb-8">
                <button
                  onClick={() => setCompareMode('sans')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                    compareMode === 'sans'
                      ? 'bg-white/[0.08] text-[#F5F5F3] shadow-lg'
                      : 'text-[#F5F5F3]/35 hover:text-[#F5F5F3]/50'
                  }`}
                >
                  <X size={14} /> Sans Zevo
                </button>
                <button
                  onClick={() => setCompareMode('avec')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                    compareMode === 'avec'
                      ? 'bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] text-white shadow-lg shadow-[#FF5C1A]/20'
                      : 'text-[#F5F5F3]/35 hover:text-[#F5F5F3]/50'
                  }`}
                >
                  <Check size={14} /> Avec Zevo
                </button>
              </div>

              {/* Description + bullet points */}
              <div className={`transition-all duration-500 ${compareMode === 'sans' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}>
                <p className="text-[#F5F5F3]/35 text-base mb-6">Un coaching dispersé, difficile à suivre et chronophage</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  {[
                    'Outils dispersés entre Excel, WhatsApp et PDF',
                    'Aucune vision claire sur la progression des clients',
                    'Paiements à relancer manuellement',
                    'Suivi flou, peu précis, parfois inexistant',
                    'Perte de professionnalisme perçue par les clients',
                    'Perte de temps sur des tâches répétitives',
                  ].map((point, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <X size={9} className="text-red-400" />
                      </div>
                      <span className="text-sm text-[#F5F5F3]/40">{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`transition-all duration-500 ${compareMode === 'avec' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}>
                <p className="text-[#F5F5F3]/35 text-base mb-6">Tout ton coaching dans une seule plateforme, automatisé et pro</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  {[
                    'Tout centralisé dans une seule app',
                    'Score bien-être et progression en temps réel',
                    'Paiements automatiques via Stripe',
                    'Suivi précis avec rapports PDF automatiques',
                    'App brandée à ton image — valeur perçue x2',
                    '5h gagnées par semaine en moyenne',
                  ].map((point, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={9} className="text-emerald-400" />
                      </div>
                      <span className="text-sm text-[#F5F5F3]/40">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FEATURES BENTO ══════════════════════ */}
      <section id="features" className="py-24 md:py-36 px-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Left-aligned header */}
          <div className="max-w-2xl mb-16 md:mb-20">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-[#F5F5F3]/35 font-medium mb-6">
              <Zap size={12} className="text-[#FF5C1A]" /> Fonctionnalités
            </div>
            <h2 className="text-3xl md:text-[3.5rem] font-bold tracking-tight leading-[1.1] mb-5" style={{ fontFamily: clash }}>
              12 outils réunis en un seul.
              <br /><span className="bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] bg-clip-text text-transparent">Zéro compromis.</span>
            </h2>
            <p className="text-[#F5F5F3]/30 text-lg">Chaque fonctionnalité te fait gagner du temps concret. Pas de gadget, que de l'essentiel pour ton activité de coaching.</p>
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
              <Target size={12} className="text-[#FF5C1A]" /> 3 étapes
            </div>
            <h2 className="text-3xl md:text-[3.5rem] font-bold tracking-tight leading-tight mb-5" style={{ fontFamily: clash }}>
              Ton logiciel coach sportif prêt en <span className="bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] bg-clip-text text-transparent">2 minutes</span>
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
                    <span className="text-[10px] font-bold text-[#FF5C1A]/30 uppercase tracking-widest" style={{ fontFamily: clash }}>Étape {s.num}</span>
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
              <Heart size={12} className="text-[#FF5C1A]" /> Témoignages
            </div>
            <h2 className="text-3xl md:text-[3.5rem] font-bold tracking-tight leading-tight mb-5" style={{ fontFamily: clash }}>
              500+ coachs ont <span className="bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] bg-clip-text text-transparent">automatisé</span>
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
              Rentabilisé dès <span className="bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] bg-clip-text text-transparent">le premier client</span>
            </h2>
            <p className="text-[#F5F5F3]/30 text-lg max-w-lg mx-auto mb-8">Moins cher qu'un café par jour. Chaque plan inclut tout ce dont un coach a besoin pour gérer et développer son activité.</p>
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
                    {billingYearly && <p className="text-[10px] text-emerald-400/60 font-medium mb-5">Économise {(plan.price.monthly - plan.price.yearly) * 12}{'\u20AC'}/an</p>}
                    {!billingYearly && <p className="text-[10px] text-[#F5F5F3]/15 mb-5">facturé mensuellement</p>}
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
          <p className="text-center text-[11px] text-[#F5F5F3]/15 mt-8">Facturation coach sportif sécurisée par Stripe · Sans engagement · Annulation en un clic</p>
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
              Questions fréquentes
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
                <p className="text-base font-semibold text-[#F5F5F3]" style={{ fontFamily: clash }}>Besoin d'un avis personnalisé ?</p>
                <p className="text-sm text-[#F5F5F3]/30">Réserve une démo gratuite de 15 min. On te montre le logiciel en live.</p>
              </div>
            </div>
            <button onClick={() => navigate('/demo')} className="relative z-[1] group w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[#FF5C1A]/25 transition-all flex items-center justify-center gap-2">
              <Video size={15} />
              Voir la démo
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
            <span className="block">Pendant que tu hésites,</span>
            <span className="block">
              <span className="hero-outline-text">d'autres coachs</span>{' '}
              <span className="bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] bg-clip-text text-transparent">automatisent.</span>
            </span>
          </h2>
          <p className="text-[#F5F5F3]/30 text-lg max-w-lg mx-auto mb-10 leading-relaxed">
            14 jours gratuits. Tout le logiciel coach sportif, sans carte bancaire. Ton espace est prêt en 30 secondes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/register')} className="group w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] text-white font-semibold text-base hover:shadow-2xl hover:shadow-[#FF5C1A]/30 transition-all duration-300 inline-flex items-center justify-center gap-2.5 relative overflow-hidden">
              <span className="relative z-10 flex items-center gap-2.5">Lancer mon essai gratuit <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.15] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
            <button onClick={() => navigate('/demo')} className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/[0.07] text-[#F5F5F3]/40 font-medium hover:bg-white/[0.03] hover:text-[#F5F5F3] transition-all flex items-center justify-center gap-2">
              <Video size={15} className="text-[#FF5C1A]" /> Voir la démo
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
              { title: 'Produit', links: ['Entraînement', 'Programmes', 'Nutrition', 'Calendrier', 'Tarifs'], paths: ['/features/entrainement', '/features/programmes', '/features/nutrition', '/features/calendrier', null], ids: [null, null, null, null, 'pricing'] },
              { title: 'Ressources', links: ['Centre d\'aide', 'Blog', 'Changelog', 'Contact'] },
              { title: 'Légal', links: ['Mentions légales', 'Confidentialité', 'CGV', 'Cookies'] },
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
            <p className="text-[10px] text-[#F5F5F3]/10">&copy; {new Date().getFullYear()} Zevo. Tous droits réservés.</p>
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

        @keyframes logo-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .animate-logo-scroll { animation: logo-scroll 25s linear infinite; }

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
