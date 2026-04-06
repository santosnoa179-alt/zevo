import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, CalendarDays, Clock, Users, CheckCircle,
  Bell, Smartphone, Repeat, Shield, Zap, Globe,
  ChevronRight, Star, Video, CalendarCheck, Timer,
  CalendarRange, UserCheck, BarChart3
} from 'lucide-react'
import { ZevoLogo } from '../../../components/ui/ZevoLogo'

const FEATURES_DETAIL = [
  {
    icon: CalendarDays,
    title: 'Calendrier global',
    desc: 'Visualise toutes tes seances, rendez-vous et disponibilites en un coup d\'oeil. Vue jour, semaine ou mois avec code couleur par client.',
  },
  {
    icon: CalendarCheck,
    title: 'Reservation en ligne',
    desc: 'Tes clients reservent directement leurs creneaux depuis leur espace. Plus besoin de messages pour caler les horaires.',
  },
  {
    icon: Bell,
    title: 'Rappels automatiques',
    desc: 'Notifications push et email avant chaque seance. Reduis les no-shows de 80% sans lever le petit doigt.',
  },
  {
    icon: Repeat,
    title: 'Seances recurrentes',
    desc: 'Programme des sessions hebdomadaires ou bi-mensuelles. Le systeme cree automatiquement les prochaines occurrences.',
  },
  {
    icon: Timer,
    title: 'Gestion des durees',
    desc: 'Definis des durees par type de seance — 30 min, 1h, 1h30. Le calendrier s\'adapte automatiquement.',
  },
  {
    icon: Globe,
    title: 'Sync agenda externe',
    desc: 'Connecte Google Calendar ou Outlook. Tes dispos se mettent a jour en temps reel, zero conflit.',
  },
]

const STATS = [
  { value: '-80%', label: 'de no-shows' },
  { value: '2min', label: 'pour planifier 1 semaine' },
  { value: '24/7', label: 'reservation en ligne' },
]

const USE_CASES = [
  {
    title: 'Coaching individuel',
    desc: 'Gere tes creneaux 1-to-1 avec des plages de dispo personnalisees. Tes clients reservent en autonomie.',
    icon: UserCheck,
  },
  {
    title: 'Cours collectifs',
    desc: 'Cree des sessions avec places limitees. Inscriptions, liste d\'attente et rappels automatiques.',
    icon: Users,
  },
  {
    title: 'Suivi a distance',
    desc: 'Planifie des check-ins video ou des appels de suivi. Tout est trace dans l\'historique client.',
    icon: Video,
  },
]

export default function CalendrierPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F3]">

      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0D0D0D]/70 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-3.5 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 text-[#F5F5F3]/50 hover:text-[#F5F5F3] transition-colors">
            <ArrowLeft size={16} />
            <ZevoLogo size="sm" />
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/demo')} className="hidden md:flex px-4 py-2 rounded-lg text-xs font-medium text-[#F5F5F3]/40 hover:text-[#F5F5F3] transition-colors items-center gap-2">
              <Video size={13} className="text-[#FF6B2B]" /> Demo
            </button>
            <button onClick={() => navigate('/register')} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white text-xs font-semibold hover:shadow-lg hover:shadow-[#FF6B2B]/25 transition-all">
              Essai gratuit
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#FF6B2B]/[0.04] rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-5 md:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 mb-6">
            <CalendarDays size={14} className="text-[#FF6B2B]" />
            <span className="text-xs font-semibold text-[#FF6B2B]">Calendrier & Reservations</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Ton planning,{' '}
            <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">
              simplifie
            </span>
          </h1>
          <p className="text-lg md:text-xl text-[#F5F5F3]/35 max-w-2xl mx-auto leading-relaxed mb-10">
            Fini les echanges de messages pour fixer un creneau. Tes clients reservent en ligne, tu geres tout depuis un calendrier intelligent.
          </p>

          {/* Stats bar */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-14 mb-14">
            {STATS.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">{s.value}</p>
                <p className="text-xs text-[#F5F5F3]/25 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Calendar mockup */}
          <div className="max-w-3xl mx-auto rounded-2xl border border-white/[0.06] bg-[#141414] overflow-hidden shadow-2xl shadow-black/40">
            <div className="h-1 bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E]" />
            <div className="p-4 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarDays size={16} className="text-[#FF6B2B]" />
                <span className="text-sm font-semibold">Semaine du 7 avril</span>
              </div>
              <div className="flex gap-2">
                {['Jour', 'Semaine', 'Mois'].map((v, i) => (
                  <button key={v} className={`px-3 py-1 rounded-lg text-[10px] font-medium ${i === 1 ? 'bg-[#FF6B2B]/15 text-[#FF6B2B]' : 'text-[#F5F5F3]/25 hover:text-[#F5F5F3]/40'} transition-colors`}>{v}</button>
                ))}
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-7 gap-2 mb-3">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                  <div key={d} className="text-center text-[9px] text-[#F5F5F3]/20 font-medium">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }, (_, i) => {
                  const slots = [
                    i === 0 ? [{ time: '9h', name: 'Lucas M.', color: '#FF6B2B' }, { time: '14h', name: 'Sarah K.', color: '#3B82F6' }] : null,
                    i === 1 ? [{ time: '10h', name: 'Cours collectif', color: '#10B981' }] : null,
                    i === 2 ? [{ time: '8h', name: 'Thomas R.', color: '#F59E0B' }, { time: '11h', name: 'Marie P.', color: '#8B5CF6' }, { time: '16h', name: 'Kevin T.', color: '#FF6B2B' }] : null,
                    i === 3 ? [{ time: '9h', name: 'Check-in video', color: '#3B82F6' }] : null,
                    i === 4 ? [{ time: '10h', name: 'Lucas M.', color: '#FF6B2B' }, { time: '15h', name: 'Collectif x8', color: '#10B981' }] : null,
                    i === 5 ? [{ time: '9h', name: 'Session VIP', color: '#F59E0B' }] : null,
                    i === 6 ? [] : null,
                  ][i]
                  return (
                    <div key={i} className="min-h-[100px] rounded-xl bg-white/[0.02] border border-white/[0.04] p-2">
                      <p className="text-[10px] text-[#F5F5F3]/20 mb-1.5">{7 + i}</p>
                      <div className="space-y-1">
                        {slots?.map((s, j) => (
                          <div key={j} className="px-1.5 py-1 rounded-md text-[8px] font-medium truncate" style={{ backgroundColor: s.color + '15', color: s.color, borderLeft: `2px solid ${s.color}` }}>
                            {s.time} — {s.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="py-20 relative">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">Tout ce dont tu as besoin</h2>
            <p className="text-[#F5F5F3]/30 max-w-xl mx-auto">Un systeme de reservation complet, concu pour les coachs qui veulent optimiser leur temps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES_DETAIL.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="group rounded-2xl border border-white/[0.06] bg-[#141414] p-6 hover:border-[#FF6B2B]/20 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B2B]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <div className="w-11 h-11 rounded-xl bg-[#FF6B2B]/10 border border-[#FF6B2B]/10 flex items-center justify-center mb-4">
                      <Icon size={20} className="text-[#FF6B2B]" />
                    </div>
                    <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                    <p className="text-sm text-[#F5F5F3]/30 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Use cases ── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">Adapte a chaque type de coaching</h2>
            <p className="text-[#F5F5F3]/30 max-w-xl mx-auto">Que tu fasses du 1-to-1, du collectif ou du suivi a distance, le calendrier s'adapte.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {USE_CASES.map((uc, i) => {
              const Icon = uc.icon
              return (
                <div key={i} className="rounded-2xl border border-white/[0.06] bg-[#141414] p-7 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#FF6B2B]/10 border border-[#FF6B2B]/10 flex items-center justify-center mx-auto mb-5">
                    <Icon size={24} className="text-[#FF6B2B]" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{uc.title}</h3>
                  <p className="text-sm text-[#F5F5F3]/30 leading-relaxed">{uc.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 border-t border-white/[0.04] relative">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-14">Comment ca marche</h2>
          <div className="space-y-0">
            {[
              { num: '01', title: 'Definis tes disponibilites', desc: 'Choisis tes jours, heures et durees de seance. Le systeme bloque automatiquement tes creneaux occupes.' },
              { num: '02', title: 'Tes clients reservent', desc: 'Depuis leur espace, ils voient tes dispos en temps reel et reservent en un clic. Rappels automatiques envoyes.' },
              { num: '03', title: 'Gere tout au meme endroit', desc: 'Vue globale de ta semaine, stats de frequentation, no-shows trackes. Tu optimises ton temps comme un pro.' },
            ].map((step, i) => (
              <div key={i} className="flex gap-6 items-start py-8 border-b border-white/[0.04] last:border-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-white">{step.num}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-[#F5F5F3]/30 leading-relaxed max-w-lg">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-2xl mx-auto px-5 md:px-8 text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-4">
            Pret a simplifier ta{' '}
            <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">planification</span> ?
          </h2>
          <p className="text-[#F5F5F3]/30 mb-8 max-w-md mx-auto">14 jours gratuits. Toutes les fonctionnalites. Sans carte bancaire.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/register')} className="group px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white font-semibold hover:shadow-lg hover:shadow-[#FF6B2B]/25 transition-all inline-flex items-center gap-2">
              Commencer gratuitement <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button onClick={() => navigate('/demo')} className="px-6 py-3.5 rounded-xl border border-white/[0.07] text-[#F5F5F3]/40 font-medium hover:bg-white/[0.03] hover:text-[#F5F5F3] transition-all flex items-center gap-2">
              <Video size={14} className="text-[#FF6B2B]" /> Voir une demo
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer mini ── */}
      <footer className="border-t border-white/[0.04] py-8">
        <div className="max-w-5xl mx-auto px-5 md:px-8 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#F5F5F3]/20 hover:text-[#F5F5F3]/40 transition-colors">
            <ZevoLogo size="sm" />
          </button>
          <p className="text-[10px] text-[#F5F5F3]/10">&copy; {new Date().getFullYear()} Zevo</p>
        </div>
      </footer>
    </div>
  )
}
