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
    { day: 'Lundi', name: 'Push - Pectoraux / Épaules', exercises: 6, duration: '55 min', done: true },
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#111111]/80 gap-2 sm:gap-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center flex-shrink-0">
              <ClipboardList size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#F5F5F3]/80">Programme Hypertrophie</p>
              <p className="text-[10px] text-[#F5F5F3]/25">Lucas M. - 5 semaines - Intermédiaire</p>
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
          <p className="text-[9px] uppercase font-semibold text-[#F5F5F3]/15 tracking-wider mb-3">Périodisation</p>
          <div className="overflow-x-auto -mx-5 px-5">
          <div className="flex gap-2 min-w-[500px]">
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
                <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                  <span className="text-[9px] text-[#F5F5F3]/15">{s.exercises} exos</span>
                  <span className="text-[9px] text-[#F5F5F3]/15">{s.duration}</span>
                  <ChevronRight size={12} className="text-[#F5F5F3]/10" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer stats */}
        <div className="px-5 py-3 border-t border-white/[0.04] bg-[#111111]/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Target size={10} className="text-[#FF6B2B]" />
              <span className="text-[9px] text-[#F5F5F3]/20">Objectif : +4kg de masse maigre</span>
            </div>
          </div>
          <span className="text-[9px] text-[#F5F5F3]/15">12 séances restantes</span>
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
      subtitle="Crée des programmes d'entraînement multi-semaines avec périodisation, assigne-les à tes clients et suis leur avancement en temps réel."
      stats={[
        { value: '5 min', label: 'pour créer un programme' },
        { value: '12 sem.', label: 'de périodisation max' },
        { value: '100+', label: 'templates disponibles' },
      ]}
      mockup={<ProgramMockup />}
      features={[
        { icon: Calendar, title: 'Multi-semaines', desc: 'Structure tes programmes sur plusieurs semaines avec des phases distinctes : volume, intensité, deload.' },
        { icon: GripVertical, title: 'Drag & drop', desc: 'Réorganise les exercices et les séances par simple glisser-déposer. L\'interface la plus intuitive du marché.' },
        { icon: Copy, title: 'Templates & duplication', desc: 'Duplique un programme existant, crée des templates réutilisables et gagne du temps sur chaque nouveau client.' },
        { icon: Users, title: 'Assignation multi-clients', desc: 'Assigne le même programme à plusieurs clients d\'un coup, puis personnalise les charges individuellement.' },
        { icon: BarChart3, title: 'Périodisation', desc: 'Définis l\'intensité, le volume et le focus de chaque semaine pour une progression optimale et structurée.' },
        { icon: TrendingUp, title: 'Suivi avancement', desc: 'Visualise en un coup d\'œil où en est chaque client dans son programme : séances faites, restantes, adhérence.' },
      ]}
      stepsTitle="Crée un programme en 3 étapes"
      steps={[
        { title: 'Structure ton cycle', desc: 'Définis le nombre de semaines, les phases de périodisation et les objectifs de chaque bloc d\'entraînement.' },
        { title: 'Ajoute les exercices', desc: 'Compose chaque séance avec les exercices, séries, reps et temps de repos. Utilise le drag & drop pour organiser.' },
        { title: 'Assigne et suis', desc: 'Attribue le programme à un ou plusieurs clients, puis suis leur avancement et leur adhérence en direct.' },
      ]}
      ctaTitle="Prêt à créer des"
      ctaAccent="programmes pro"
    />
  )
}
