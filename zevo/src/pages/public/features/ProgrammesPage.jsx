import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, ClipboardList, Calendar, Layers, Copy,
  Dumbbell, Users, BarChart3, Zap, Target, CheckCircle,
  Video, Star, TrendingUp, GripVertical, Plus,
  ChevronRight, Clock, Repeat, Sparkles
} from 'lucide-react'
import { ZevoLogo } from '../../../components/ui/ZevoLogo'

const FEATURES_DETAIL = [
  {
    icon: Layers,
    title: 'Multi-semaines',
    desc: 'Cree des programmes sur 4, 8 ou 12 semaines avec periodisation integree. Chaque semaine peut etre unique.',
  },
  {
    icon: GripVertical,
    title: 'Drag & Drop',
    desc: 'Reorganise exercices, jours et semaines par simple glisser-deposer. Construire un programme n\'a jamais ete aussi fluide.',
  },
  {
    icon: Copy,
    title: 'Templates & duplication',
    desc: 'Cree des templates reutilisables. Duplique un programme, ajuste les charges, assigne a un nouveau client en 30 secondes.',
  },
  {
    icon: Users,
    title: 'Assignation multi-clients',
    desc: 'Un meme programme peut etre assigne a plusieurs clients avec des variations individuelles de charges et volumes.',
  },
  {
    icon: Target,
    title: 'Periodisation intelligente',
    desc: 'Deload automatique, phases de force/hypertrophie/endurance. Le systeme t\'aide a structurer la progression.',
  },
  {
    icon: BarChart3,
    title: 'Suivi d\'avancement',
    desc: 'Vois en un coup d\'oeil ou en est chaque client dans son programme. Taux de completion, seances manquees, progression.',
  },
]

const STATS = [
  { value: '30s', label: 'pour dupliquer un programme' },
  { value: '12', label: 'semaines max par cycle' },
  { value: '100%', label: 'personnalisable' },
]

const PROGRAM_PREVIEW_WEEKS = [
  { week: 'Semaine 1', focus: 'Adaptation', sessions: 4, intensity: 'Moderee' },
  { week: 'Semaine 2', focus: 'Adaptation', sessions: 4, intensity: 'Moderee' },
  { week: 'Semaine 3', focus: 'Intensification', sessions: 5, intensity: 'Haute' },
  { week: 'Semaine 4', focus: 'Intensification', sessions: 5, intensity: 'Haute' },
  { week: 'Semaine 5', focus: 'Deload', sessions: 3, intensity: 'Basse' },
]

export default function ProgrammesPage() {
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#FF6B2B]/[0.04] rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-5 md:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 mb-6">
            <ClipboardList size={14} className="text-[#FF6B2B]" />
            <span className="text-xs font-semibold text-[#FF6B2B]">Programmes Sportifs</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Des programmes{' '}
            <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">
              sur-mesure
            </span>
          </h1>
          <p className="text-lg md:text-xl text-[#F5F5F3]/35 max-w-2xl mx-auto leading-relaxed mb-10">
            Construis des programmes multi-semaines en quelques clics. Drag & drop, templates, periodisation — tout est la pour que tu crees des programmes que tes clients adorent.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-14 mb-14">
            {STATS.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">{s.value}</p>
                <p className="text-xs text-[#F5F5F3]/25 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Programme mockup */}
          <div className="max-w-3xl mx-auto rounded-2xl border border-white/[0.06] bg-[#141414] overflow-hidden shadow-2xl shadow-black/40">
            <div className="h-1 bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E]" />
            <div className="p-4 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center">
                  <ClipboardList size={16} className="text-[#FF6B2B]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Programme — Force & Hypertrophie</p>
                  <p className="text-[10px] text-[#F5F5F3]/25">5 semaines · 21 seances · 3 clients</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.06] text-[10px] text-[#F5F5F3]/30 flex items-center gap-1">
                  <Copy size={10} /> Dupliquer
                </button>
              </div>
            </div>
            <div className="p-4">
              {/* Week overview */}
              <div className="space-y-2">
                {PROGRAM_PREVIEW_WEEKS.map((w, i) => (
                  <div key={i} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${i === 2 ? 'bg-[#FF6B2B]/[0.05] border-[#FF6B2B]/15' : 'bg-white/[0.015] border-white/[0.04]'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${i === 2 ? 'bg-[#FF6B2B]/20 text-[#FF6B2B]' : 'bg-white/[0.05] text-[#F5F5F3]/30'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#F5F5F3]/60">{w.week}</p>
                      <p className="text-[9px] text-[#F5F5F3]/20">{w.focus}</p>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-4">
                      <div>
                        <p className="text-[10px] text-[#F5F5F3]/30">{w.sessions} seances</p>
                      </div>
                      <div className={`px-2 py-0.5 rounded-md text-[9px] font-medium ${
                        w.intensity === 'Haute' ? 'bg-red-500/10 text-red-400' :
                        w.intensity === 'Basse' ? 'bg-emerald-500/10 text-emerald-400' :
                        'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {w.intensity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Add week button */}
              <button className="w-full mt-3 py-2.5 rounded-xl border border-dashed border-white/[0.06] text-[10px] text-[#F5F5F3]/15 hover:text-[#F5F5F3]/30 hover:border-white/[0.1] transition-all flex items-center justify-center gap-1">
                <Plus size={10} /> Ajouter une semaine
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="py-20 relative">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">Des outils de creation puissants</h2>
            <p className="text-[#F5F5F3]/30 max-w-xl mx-auto">Tout ce qu'il faut pour creer, organiser et suivre des programmes d'entrainement professionnels.</p>
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

      {/* ── Workflow ── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-14">Cree un programme en 3 etapes</h2>
          <div className="space-y-0">
            {[
              { num: '01', title: 'Structure ton cycle', desc: 'Choisis le nombre de semaines, le split (PPL, upper/lower, full body) et la logique de periodisation. Ou pars d\'un template.' },
              { num: '02', title: 'Ajoute tes exercices', desc: 'Drag & drop depuis ta bibliotheque. Definis series, reps, charges cibles, tempo et temps de repos. Videos demo incluses.' },
              { num: '03', title: 'Assigne & suis', desc: 'Assigne a un ou plusieurs clients. Suis leur avancement en temps reel. Ajuste au besoin sans tout reconstruire.' },
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
            Pret a creer des programmes{' '}
            <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">pro</span> ?
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
