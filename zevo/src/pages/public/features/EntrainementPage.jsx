import {
  Dumbbell, Timer, History, PlayCircle, Target, TrendingUp,
  CheckCircle, Clock, Flame, Zap, BarChart3, XCircle
} from 'lucide-react'
import FeaturePageLayout from '../../../components/FeaturePageLayout'

/* ─── Mockup: Workout tracker ─── */
function WorkoutMockup() {
  const exercises = [
    {
      name: 'Developpe couche',
      muscle: 'Pectoraux',
      sets: [
        { set: 1, reps: 10, weight: 80, rpe: 7, done: true },
        { set: 2, reps: 8, weight: 85, rpe: 8, done: true },
        { set: 3, reps: 8, weight: 85, rpe: 9, done: true },
        { set: 4, reps: 6, weight: 90, rpe: 10, done: false },
      ],
    },
    {
      name: 'Rowing barre',
      muscle: 'Dos',
      sets: [
        { set: 1, reps: 12, weight: 60, rpe: 6, done: true },
        { set: 2, reps: 10, weight: 65, rpe: 7, done: true },
        { set: 3, reps: 10, weight: 65, rpe: 8, done: false },
      ],
    },
    {
      name: 'Squat bulgare',
      muscle: 'Jambes',
      sets: [
        { set: 1, reps: 10, weight: 24, rpe: 7, done: false },
        { set: 2, reps: 10, weight: 24, rpe: null, done: false },
        { set: 3, reps: 10, weight: 24, rpe: null, done: false },
      ],
    },
  ]

  const rpeColor = (rpe) => {
    if (!rpe) return 'text-[#F5F5F3]/15'
    if (rpe <= 7) return 'text-[#10B981]'
    if (rpe <= 8) return 'text-[#F59E0B]'
    return 'text-[#EF4444]'
  }

  return (
    <div className="relative max-w-4xl mx-auto">
      <div className="absolute -inset-4 bg-gradient-to-b from-[#FF6B2B]/[0.06] via-transparent to-transparent rounded-3xl blur-2xl pointer-events-none" />

      <div className="relative rounded-2xl border border-white/[0.08] bg-[#141414]/90 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#111111]/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center">
              <Dumbbell size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#F5F5F3]/80">Seance Push/Pull/Legs</p>
              <p className="text-[10px] text-[#F5F5F3]/25">Lucas M. - Mardi 15 avril</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FF6B2B]/10 border border-[#FF6B2B]/20">
              <Clock size={10} className="text-[#FF6B2B]" />
              <span className="text-[10px] font-medium text-[#FF6B2B]">47:23</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06]">
              <Flame size={10} className="text-[#F59E0B]" />
              <span className="text-[10px] text-[#F5F5F3]/40">342 kcal</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-5 py-2 bg-[#111111]/40 border-b border-white/[0.04]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-[#F5F5F3]/20">Progression</span>
            <span className="text-[9px] text-[#FF6B2B] font-medium">6/10 series</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] transition-all duration-500" style={{ width: '60%' }} />
          </div>
        </div>

        {/* Exercises */}
        <div className="divide-y divide-white/[0.03]">
          {exercises.map((ex, ei) => {
            const completedSets = ex.sets.filter(s => s.done).length
            const isActive = ei === 0
            return (
              <div key={ei} className={`px-5 py-4 ${isActive ? 'bg-[#FF6B2B]/[0.02]' : ''}`}>
                {/* Exercise header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${completedSets === ex.sets.length ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/20' : 'bg-white/[0.04] text-[#F5F5F3]/30 border border-white/[0.06]'}`}>
                      {completedSets === ex.sets.length ? <CheckCircle size={12} /> : `${ei + 1}`}
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-[#F5F5F3]/80">{ex.name}</p>
                      <p className="text-[9px] text-[#F5F5F3]/20">{ex.muscle} - {ex.sets.length} series</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="w-6 h-6 rounded-md bg-white/[0.03] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.06] transition-colors">
                      <PlayCircle size={10} className="text-[#F5F5F3]/25" />
                    </button>
                    <button className="w-6 h-6 rounded-md bg-white/[0.03] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.06] transition-colors">
                      <History size={10} className="text-[#F5F5F3]/25" />
                    </button>
                  </div>
                </div>

                {/* Sets table */}
                <div className="rounded-xl border border-white/[0.04] overflow-hidden">
                  <div className="grid grid-cols-5 gap-0 px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.03]">
                    {['Serie', 'Reps', 'Charge', 'RPE', ''].map((h, hi) => (
                      <p key={hi} className={`text-[8px] uppercase font-semibold text-[#F5F5F3]/15 tracking-wider ${hi === 4 ? 'text-right' : ''}`}>{h}</p>
                    ))}
                  </div>
                  {ex.sets.map((s, si) => (
                    <div key={si} className={`grid grid-cols-5 gap-0 px-3 py-2 items-center ${s.done ? 'bg-[#10B981]/[0.02]' : ''} ${si < ex.sets.length - 1 ? 'border-b border-white/[0.02]' : ''}`}>
                      <p className="text-[10px] text-[#F5F5F3]/30 font-medium">{s.set}</p>
                      <p className="text-[10px] text-[#F5F5F3]/60 font-semibold">{s.reps}</p>
                      <p className="text-[10px] text-[#F5F5F3]/60 font-semibold">{s.weight} kg</p>
                      <p className={`text-[10px] font-semibold ${rpeColor(s.rpe)}`}>{s.rpe ? `@${s.rpe}` : '-'}</p>
                      <div className="flex justify-end">
                        {s.done ? (
                          <div className="w-5 h-5 rounded-md bg-[#10B981]/15 flex items-center justify-center">
                            <CheckCircle size={10} className="text-[#10B981]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border border-white/[0.08] bg-white/[0.02]" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Rest timer */}
        <div className="px-5 py-3 border-t border-white/[0.06] bg-[#111111]/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer size={12} className="text-[#FF6B2B]" />
            <span className="text-[10px] text-[#F5F5F3]/30">Repos entre series</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-md bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 text-[11px] font-bold text-[#FF6B2B]">1:32</span>
            <span className="text-[9px] text-[#F5F5F3]/15">/ 2:00</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Extra: Before / After comparison ─── */
function ComparisonSection() {
  const sans = [
    { icon: XCircle, text: 'Notes papier ou Google Sheets' },
    { icon: XCircle, text: 'Pas de suivi des charges' },
    { icon: XCircle, text: 'Aucun historique de progression' },
    { icon: XCircle, text: 'Chrono repos sur le telephone' },
    { icon: XCircle, text: 'Le client oublie son programme' },
    { icon: XCircle, text: 'Aucune donnee exploitable' },
  ]

  const avec = [
    { icon: CheckCircle, text: 'Tout centralise dans l\'app' },
    { icon: CheckCircle, text: 'Suivi charge, reps, RPE en direct' },
    { icon: CheckCircle, text: 'Graphiques de progression auto' },
    { icon: CheckCircle, text: 'Chrono repos integre et configurable' },
    { icon: CheckCircle, text: 'Programme accessible partout' },
    { icon: CheckCircle, text: 'Rapports detailles par client' },
  ]

  return (
    <section className="py-20 md:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0E0E0E] to-transparent pointer-events-none" />
      <div className="max-w-5xl mx-auto px-5 md:px-8 relative z-10">
        <div className="text-center mb-14">
          <p className="text-[11px] font-semibold text-[#FF6B2B] uppercase tracking-widest mb-3">Comparaison</p>
          <h2 className="text-2xl md:text-4xl font-bold">Avant vs Apres Zevo</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Sans Zevo */}
          <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#151515] to-[#111111] p-7">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/15 flex items-center justify-center">
                <XCircle size={14} className="text-[#EF4444]/60" />
              </div>
              <p className="text-[13px] font-semibold text-[#F5F5F3]/50">Sans Zevo</p>
            </div>
            <div className="space-y-3">
              {sans.map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={i} className="flex items-center gap-3">
                    <Icon size={14} className="text-[#EF4444]/30 flex-shrink-0" />
                    <p className="text-[12px] text-[#F5F5F3]/25">{item.text}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Avec Zevo */}
          <div className="rounded-2xl border border-[#FF6B2B]/15 bg-gradient-to-br from-[#FF6B2B]/[0.04] to-[#151515] p-7 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-[#FF6B2B]/[0.06] blur-[60px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 border border-[#10B981]/20 flex items-center justify-center">
                  <CheckCircle size={14} className="text-[#10B981]" />
                </div>
                <p className="text-[13px] font-semibold text-[#F5F5F3]/80">Avec Zevo</p>
              </div>
              <div className="space-y-3">
                {avec.map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <Icon size={14} className="text-[#10B981] flex-shrink-0" />
                      <p className="text-[12px] text-[#F5F5F3]/60">{item.text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Page ─── */
export default function EntrainementPage() {
  return (
    <FeaturePageLayout
      badge="Entrainement & Suivi"
      badgeIcon={Dumbbell}
      title="L'entrainement"
      titleAccent="reinvente"
      subtitle="Suis chaque serie, chaque rep, chaque charge en temps reel. Tes clients executent leur programme et tu gardes un oeil sur tout, meme a distance."
      stats={[
        { value: '100%', label: 'des seances tracees' },
        { value: '+34%', label: 'de progression moyenne' },
        { value: '< 2s', label: 'pour logger une serie' },
      ]}
      mockup={<WorkoutMockup />}
      features={[
        { icon: Zap, title: 'Suivi temps reel', desc: 'Vois chaque serie se completer en direct. Les donnees se synchronisent instantanement entre coach et client.' },
        { icon: Timer, title: 'Chrono repos integre', desc: 'Timer de repos configurable par exercice. Le client sait exactement quand reprendre sa prochaine serie.' },
        { icon: History, title: 'Historique performances', desc: 'Retrouve toutes les seances passees avec charges, reps et RPE. Analyse la progression sur des semaines ou des mois.' },
        { icon: PlayCircle, title: 'Videos demo', desc: 'Associe une video de demonstration a chaque exercice pour que le client execute le mouvement parfaitement.' },
        { icon: Target, title: 'Objectifs exercice', desc: 'Definis des objectifs de charge ou de reps pour chaque exercice et suis l\'atteinte en temps reel.' },
        { icon: TrendingUp, title: 'Progression automatique', desc: 'Suggestions intelligentes d\'augmentation de charge basees sur les performances passees du client.' },
      ]}
      stepsTitle="Du programme a l'execution"
      steps={[
        { title: 'Programme la seance', desc: 'Choisis les exercices, le nombre de series, les charges cibles et les temps de repos pour chaque client.' },
        { title: 'Le client execute', desc: 'Ton client ouvre l\'app, lance sa seance et valide chaque serie avec la charge reelle et le RPE ressenti.' },
        { title: 'Tu suis en direct', desc: 'Visualise la progression en temps reel, envoie des encouragements ou ajuste le programme a la volee.' },
      ]}
      extraSection={<ComparisonSection />}
      ctaTitle="Pret a passer au"
      ctaAccent="niveau superieur"
    />
  )
}
