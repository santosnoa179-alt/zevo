import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  ArrowLeft, ArrowRight, CheckCircle, Video, ChevronDown,
  Dumbbell, Utensils, CalendarDays, BookOpen, MessageCircle,
  Users, ClipboardList, BarChart3, Paintbrush, CreditCard,
  UserPlus, Target
} from 'lucide-react'
import { ZevoLogo } from './ui/ZevoLogo'

// ── Dropdown data (shared across all feature pages) ──
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

export default function FeaturePageLayout({
  badge,
  badgeIcon: BadgeIcon,
  title,
  titleAccent,
  subtitle,
  stats = [],
  mockup,
  features = [],
  stepsTitle,
  steps = [],
  extraSection,
  ctaTitle,
  ctaAccent,
}) {
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F3] relative">

      {/* ── Watermark logo ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 88 88"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-[0.025]"
        >
          <defs>
            <clipPath id="wm-clip">
              <polygon points="0,0 88,0 88,61.6 61.6,88 0,88"/>
            </clipPath>
          </defs>
          <rect width="88" height="88" rx="18" fill="#FF6B2B" clipPath="url(#wm-clip)"/>
          <rect x="12" y="12" width="64" height="11" fill="white"/>
          <polygon points="71,23 76,12 17,44 12,44" fill="white"/>
          <rect x="12" y="44" width="64" height="11" fill="white"/>
          <polygon points="12,55 17,44 76,75 71,75" fill="white"/>
          <rect x="12" y="65" width="64" height="11" fill="white"/>
        </svg>
      </div>

      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/60 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
            <ZevoLogo size="sm" />
          </button>

          <div className="hidden lg:flex items-center gap-6">
            {/* Fonctionnalites dropdown */}
            <div className="relative"
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <button className="flex items-center gap-1.5 text-[13px] text-[#F5F5F3]/50 hover:text-[#F5F5F3] transition-colors font-medium py-2">
                Fonctionnalites <ChevronDown size={12} className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Mega dropdown */}
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

            <button onClick={() => navigate('/pricing')} className="text-[13px] text-[#F5F5F3]/50 hover:text-[#F5F5F3] transition-colors font-medium">Tarifs</button>
            <button onClick={() => navigate('/demo')} className="text-[13px] text-[#F5F5F3]/50 hover:text-[#F5F5F3] transition-colors font-medium">Demo</button>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-medium text-[#F5F5F3]/50 hover:text-[#F5F5F3] transition-colors">Connexion</button>
            <button onClick={() => navigate('/register')} className="group px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white text-xs font-semibold hover:shadow-lg hover:shadow-[#FF6B2B]/25 transition-all flex items-center gap-2">
              Essai gratuit <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Mobile */}
          <button onClick={() => navigate('/')} className="md:hidden p-2">
            <ArrowLeft size={18} className="text-[#F5F5F3]/50" />
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 relative overflow-hidden">
        {/* BG layers */}
        <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full blur-[180px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,107,43,0.08) 0%, rgba(255,143,94,0.03) 50%, transparent 70%)' }} />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[#FF8F5E]/[0.03] blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_60%_40%_at_50%_30%,black,transparent)] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-5 md:px-8 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#FF6B2B]/15 to-[#FF8F5E]/10 border border-[#FF6B2B]/20 mb-7">
            {BadgeIcon && <BadgeIcon size={13} className="text-[#FF6B2B]" />}
            <span className="text-xs font-semibold text-[#FF6B2B]">{badge}</span>
          </div>

          <h1 className="text-4xl md:text-[3.5rem] lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            {title}{' '}
            <span className="bg-gradient-to-r from-[#FF6B2B] via-[#FF8F5E] to-[#FFB088] bg-clip-text text-transparent">
              {titleAccent}
            </span>
          </h1>

          <p className="text-base md:text-lg text-[#F5F5F3]/40 max-w-2xl mx-auto leading-relaxed mb-10">
            {subtitle}
          </p>

          {/* Stats */}
          {stats.length > 0 && (
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 mb-14">
              {stats.map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-[#FF6B2B] to-[#FFB088] bg-clip-text text-transparent">{s.value}</p>
                  <p className="text-[11px] text-[#F5F5F3]/25 mt-1.5 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            <button onClick={() => navigate('/register')} className="group px-7 py-3 rounded-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white text-sm font-semibold hover:shadow-xl hover:shadow-[#FF6B2B]/25 transition-all inline-flex items-center gap-2 relative overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">Essayer gratuitement <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" /></span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
            <button onClick={() => navigate('/demo')} className="px-6 py-3 rounded-xl border border-white/[0.08] text-[#F5F5F3]/40 text-sm font-medium hover:bg-white/[0.03] hover:text-[#F5F5F3] hover:border-white/[0.12] transition-all flex items-center gap-2">
              <Video size={14} className="text-[#FF6B2B]" /> Voir la demo
            </button>
          </div>

          {/* Mockup */}
          {mockup}
        </div>
      </section>

      {/* ── Features grid ── */}
      {features.length > 0 && (
        <section className="py-20 md:py-28 relative">
          {/* Subtle gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0F0F0F] to-transparent pointer-events-none" />
          <div className="max-w-6xl mx-auto px-5 md:px-8 relative z-10">
            <div className="text-center mb-16">
              <p className="text-[11px] font-semibold text-[#FF6B2B] uppercase tracking-widest mb-3">Fonctionnalites</p>
              <h2 className="text-2xl md:text-4xl font-bold">Tout ce dont tu as besoin</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {features.map((f, i) => {
                const Icon = f.icon
                return (
                  <div key={i} className="group rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#151515] to-[#111111] p-6 md:p-7 hover:border-[#FF6B2B]/20 hover:from-[#171717] hover:to-[#131313] transition-all duration-500 relative overflow-hidden">
                    {/* Glow on hover */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-[#FF6B2B]/[0.04] blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6B2B]/15 to-[#FF6B2B]/5 border border-[#FF6B2B]/10 flex items-center justify-center mb-5 group-hover:from-[#FF6B2B]/20 group-hover:to-[#FF6B2B]/10 transition-all duration-500">
                        <Icon size={20} className="text-[#FF6B2B]" />
                      </div>
                      <h3 className="text-[15px] font-semibold mb-2 text-[#F5F5F3]/90">{f.title}</h3>
                      <p className="text-sm text-[#F5F5F3]/30 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Steps ── */}
      {steps.length > 0 && (
        <section className="py-20 md:py-28 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0E0E0E] to-transparent pointer-events-none" />
          <div className="max-w-4xl mx-auto px-5 md:px-8 relative z-10">
            <div className="text-center mb-16">
              <p className="text-[11px] font-semibold text-[#FF6B2B] uppercase tracking-widest mb-3">Comment ca marche</p>
              <h2 className="text-2xl md:text-4xl font-bold">{stepsTitle || 'Simple comme 1, 2, 3'}</h2>
            </div>
            <div className="space-y-4">
              {steps.map((step, i) => (
                <div key={i} className="group flex gap-5 md:gap-7 items-start p-5 md:p-7 rounded-2xl border border-white/[0.05] bg-gradient-to-r from-[#131313] to-[#0F0F0F] hover:border-[#FF6B2B]/15 hover:from-[#151515] hover:to-[#111111] transition-all duration-500">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#FF6B2B]/15">
                    <span className="text-sm font-bold text-white">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-semibold mb-1.5 text-[#F5F5F3]/90">{step.title}</h3>
                    <p className="text-sm text-[#F5F5F3]/30 leading-relaxed max-w-lg">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Extra section (custom per page) ── */}
      {extraSection}

      {/* ── CTA Final ── */}
      <section className="py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0F0F0F] to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center relative z-10">
          <div className="rounded-3xl border border-white/[0.06] bg-gradient-to-br from-[#151515] to-[#0F0F0F] p-10 md:p-14 relative overflow-hidden">
            {/* Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] bg-[#FF6B2B]/[0.06] rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-4xl font-bold mb-4">
                {ctaTitle || 'Pret a passer au'}{' '}
                <span className="bg-gradient-to-r from-[#FF6B2B] via-[#FF8F5E] to-[#FFB088] bg-clip-text text-transparent">
                  {ctaAccent || 'niveau superieur'}
                </span>{' '}
                ?
              </h2>
              <p className="text-[#F5F5F3]/30 mb-8 max-w-md mx-auto text-sm">14 jours gratuits. Toutes les fonctionnalites. Sans carte bancaire.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={() => navigate('/register')} className="group px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white font-semibold hover:shadow-xl hover:shadow-[#FF6B2B]/25 transition-all inline-flex items-center gap-2 relative overflow-hidden">
                  <span className="relative z-10 flex items-center gap-2">Commencer gratuitement <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" /></span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </button>
                <button onClick={() => navigate('/demo')} className="px-6 py-3.5 rounded-xl border border-white/[0.07] text-[#F5F5F3]/40 font-medium hover:bg-white/[0.03] hover:text-[#F5F5F3] transition-all flex items-center gap-2">
                  <Video size={14} className="text-[#FF6B2B]" /> Voir une demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] py-8">
        <div className="max-w-6xl mx-auto px-5 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <ZevoLogo size="sm" />
          </button>
          <div className="flex items-center gap-6">
            {['Tarifs', 'Demo', 'Connexion'].map((l, i) => (
              <button key={l} onClick={() => navigate(['pricing', 'demo', 'login'].map(p => '/' + p)[i])} className="text-[11px] text-[#F5F5F3]/15 hover:text-[#F5F5F3]/30 transition-colors">{l}</button>
            ))}
          </div>
          <p className="text-[10px] text-[#F5F5F3]/10">&copy; {new Date().getFullYear()} Zevo</p>
        </div>
      </footer>
    </div>
  )
}
