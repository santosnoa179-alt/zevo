import {
  ClipboardList, Calendar, Layers, Copy, Users, TrendingUp,
  GripVertical, CheckCircle, Zap, Target, ChevronRight, BarChart3
} from 'lucide-react'
import FeaturePageLayout from '../../../components/FeaturePageLayout'

/* ─── Mockup: Program overview ─── */
function ProgramMockup() {
  const weeks = [
    {
      num: 1,
      focus: 'Adaptation',
      intensity: 60,
      sessions: 4,
      color: '#10B981',
      active: false,
      done: true,
    },
    {
      num: 2,
      focus: 'Volume',
      intensity: 70,
      sessions: 5,
      color: '#3B82F6',
      active: false,
      done: true,
    },
    {
      num: 3,
      focus: 'Intensification',
      intensity: 80,
      sessions: 5,
      color: '#FF6B2B',
      active: true,
      done: false,
    },
    {
      num: 4,
      focus: 'Pic',
      intensity: 90,
      sessions: 4,
      color: '#EF4444',
      active: false,
      done: false,
    },
    {
      num: 5,
      focus: 'Deload',
      intensity: 50,
      sessions: 3,
      color: '#8B5CF6',
      active: false,
      done: false,
    },
  ]

  const weekSessions = [
    { day: 'Lundi', name: 'Push - Pectoraux / Epaules', exercises: 6, duration: '55 min', done: true },
    { day: 'Mardi', name: 'Pull - Dos / Biceps', exercises: 7, duration: '60 min', done: true },
    { day: 'Jeudi', name: 'Legs - Quadriceps / Ischios', exercises: 6, duration: '50 min', done: false },
    { day: 'Vendredi', name: 'Upper - Full haut du corps', exercises: 8, duration: '65 min', done: false },
    { day: 'Samedi', name: 'Cardio HIIT + Core', exercises: 5, duration: '35 min', done: false },
  ]

  return (
    <div className="relative max-w-4xl mx-auto">
      <div className="absolute -inset-4 bg-gradient-to-b from-[#FF6B2B]/[0.06] via-transparent to-transparent rounded-3xl blur-2xl pointer-events-none" />

      <div className="relative rounded-2xl border border-white/[0.08] bg-[#141414]/90 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#111111]/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center">
              <ClipboardList size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#F5F5F3]/80">Programme Hypertrophie</p>
              <p className="text-[10px] text-[#F5F5F3]/25">Lucas M. - 5 semaines - Intermediaire</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 text-[10px] font-medium text-[#FF6B2B]">Semaine 3/5</span>
            <span className="px-2.5 py-1 rounded-md bg-[#10B981]/10 border border-[#10B981]/20 text-[10px] font-medium text-[#10B981]">En cours</span>
          </div>
        </div>

        {/* Global progress */}
        <div className="px-5 py-3 bg-[#111111]/40 border-b border-white/[0.04]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] text-[#F5F5F3]/20">Avancement global</span>
            <span className="text-[9px] text-[#FF6B2B] font-medium">52%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E]" style={{ width: '52%' }} />
          </div>
        </div>

        {/* Weeks timeline */}
        <div className="px-5 py-4 border-b border-white/[0.04]">
          <p className="text-[9px] uppercase font-semibold text-[#F5F5F3]/15 tracking-wider mb-3">Periodisation</p>
          <div className="flex gap-2">
            {weeks.map((w) => (
              <div
                key={w.num}
                className={`flex-1 rounded-xl p-3 border transition-all duration-300 ${
                  w.active
                    ? 'border-[#FF6B2B]/30 bg-[#FF6B2B]/[0.06]'
                    : 'border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[9px] font-bold ${w.active ? 'text-[#FF6B2B]' : 'text-[#F5F5F3]/30'}`}>S{w.num}</span>
                  {w.done && <CheckCircle size={10} className="text-[#10B981]" />}
                </div>
                <p className="text-[9px] font-medium text-[#F5F5F3]/50 mb-1.5">{w.focus}</p>
                {/* Intensity bar */}
                <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden mb-1.5">
                  <div className="h-full rounded-full" style={{ width: `${w.intensity}%`, backgroundColor: w.color }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-[#F5F5F3]/15">{w.intensity}%</span>
                  <span className="text-[8px] text-[#F5F5F3]/15">{w.sessions} sean.</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current week sessions */}
        <div className="px-5 py-4">
          <p className="text-[9px] uppercase font-semibold text-[#F5F5F3]/15 tracking-wider mb-3">Semaine 3 - Intensification</p>
          <div className="space-y-2">
            {weekSessions.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all duration-300 ${
                  s.done
                    ? 'border-[#10B981]/15 bg-[#10B981]/[0.03]'
                    : 'border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.03]'
                }`}
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0">
                  {s.done ? (
                    <CheckCircle size={14} className="text-[#10B981]" />
                  ) : (
                    <GripVertical size={12} className="text-[#F5F5F3]/10" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-[#FF6B2B]/60 w-14 flex-shrink-0">{s.day}</span>
                    <span className={`text-[11px] font-medium truncate ${s.done ? 'text-[#F5F5F3]/40 line-through' : 'text-[#F5F5F3]/70'}`}>{s.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[9px] text-[#F5F5F3]/15">{s.exercises} exos</span>
                  <span className="text-[9px] text-[#F5F5F3]/15">{s.duration}</span>
                  <ChevronRight size={12} className="text-[#F5F5F3]/10" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer stats */}
        <div className="px-5 py-3 border-t border-white/[0.04] bg-[#111111]/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Target size={10} className="text-[#FF6B2B]" />
              <span className="text-[9px] text-[#F5F5F3]/20">Objectif : +4kg de masse maigre</span>
            </div>
          </div>
          <span className="text-[9px] text-[#F5F5F3]/15">12 seances restantes</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Page ─── */
export default function ProgrammesPage() {
  return (
    <FeaturePageLayout
      badge="Programmes Sportifs"
      badgeIcon={ClipboardList}
      title="Des programmes"
      titleAccent="sur-mesure"
      subtitle="Cree des programmes d'entrainement multi-semaines avec periodisation, assigne-les a tes clients et suis leur avancement en temps reel."
      stats={[
        { value: '5 min', label: 'pour creer un programme' },
        { value: '12 sem.', label: 'de periodisation max' },
        { value: '100+', label: 'templates disponibles' },
      ]}
      mockup={<ProgramMockup />}
      features={[
        { icon: Calendar, title: 'Multi-semaines', desc: 'Structure tes programmes sur plusieurs semaines avec des phases distinctes : volume, intensite, deload.' },
        { icon: GripVertical, title: 'Drag & drop', desc: 'Reorganise les exercices et les seances par simple glisser-deposer. L\'interface la plus intuitive du marche.' },
        { icon: Copy, title: 'Templates & duplication', desc: 'Duplique un programme existant, cree des templates reutilisables et gagne du temps sur chaque nouveau client.' },
        { icon: Users, title: 'Assignation multi-clients', desc: 'Assigne le meme programme a plusieurs clients d\'un coup, puis personnalise les charges individuellement.' },
        { icon: BarChart3, title: 'Periodisation', desc: 'Definis l\'intensite, le volume et le focus de chaque semaine pour une progression optimale et structuree.' },
        { icon: TrendingUp, title: 'Suivi avancement', desc: 'Visualise en un coup d\'oeil ou en est chaque client dans son programme : seances faites, restantes, adherence.' },
      ]}
      stepsTitle="Cree un programme en 3 etapes"
      steps={[
        { title: 'Structure ton cycle', desc: 'Definis le nombre de semaines, les phases de periodisation et les objectifs de chaque bloc d\'entrainement.' },
        { title: 'Ajoute les exercices', desc: 'Compose chaque seance avec les exercices, series, reps et temps de repos. Utilise le drag & drop pour organiser.' },
        { title: 'Assigne et suis', desc: 'Attribue le programme a un ou plusieurs clients, puis suis leur avancement et leur adherence en direct.' },
      ]}
      ctaTitle="Pret a creer des"
      ctaAccent="programmes pro"
    />
  )
}
