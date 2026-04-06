import {
  Utensils, Flame, Calculator, Copy, Target, ShieldCheck,
  ShoppingCart, Apple, Beef, Wheat, Droplets, CheckCircle, Clock
} from 'lucide-react'
import FeaturePageLayout from '../../../components/FeaturePageLayout'

/* ─── Mockup: Nutrition plan with macros ─── */
function NutritionMockup() {
  const macros = [
    { label: 'Calories', value: '2 450', unit: 'kcal', color: '#FF6B2B', icon: Flame, pct: null },
    { label: 'Proteines', value: '184', unit: 'g', color: '#3B82F6', icon: Beef, pct: '30%' },
    { label: 'Glucides', value: '276', unit: 'g', color: '#10B981', icon: Wheat, pct: '45%' },
    { label: 'Lipides', value: '68', unit: 'g', color: '#F59E0B', icon: Droplets, pct: '25%' },
  ]

  const meals = [
    {
      name: 'Petit-dejeuner',
      time: '07:30',
      cal: 580,
      items: ['Flocons d\'avoine 80g', 'Banane', 'Whey 30g', 'Beurre cacahuete 15g'],
      done: true,
    },
    {
      name: 'Dejeuner',
      time: '12:30',
      cal: 720,
      items: ['Poulet grille 180g', 'Riz basmati 120g', 'Brocolis 150g', 'Huile olive 10ml'],
      done: true,
    },
    {
      name: 'Collation',
      time: '16:00',
      cal: 350,
      items: ['Yaourt grec 200g', 'Amandes 20g', 'Miel 10g'],
      done: false,
    },
    {
      name: 'Diner',
      time: '20:00',
      cal: 650,
      items: ['Saumon 160g', 'Patate douce 200g', 'Salade mixte', 'Vinaigrette'],
      done: false,
    },
    {
      name: 'Pre-dodo',
      time: '22:00',
      cal: 150,
      items: ['Caseine 30g', 'Lait amande 200ml'],
      done: false,
    },
  ]

  return (
    <div className="relative max-w-4xl mx-auto">
      <div className="absolute -inset-4 bg-gradient-to-b from-[#FF6B2B]/[0.06] via-transparent to-transparent rounded-3xl blur-2xl pointer-events-none" />

      <div className="relative rounded-2xl border border-white/[0.08] bg-[#141414]/90 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#111111]/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center">
              <Utensils size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#F5F5F3]/80">Plan Prise de masse</p>
              <p className="text-[10px] text-[#F5F5F3]/25">Lucas M. - Mardi 15 avril</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-[#10B981]/10 border border-[#10B981]/20 text-[10px] font-medium text-[#10B981]">Jour d'entrainement</span>
          </div>
        </div>

        {/* Macro cards */}
        <div className="px-5 py-4 border-b border-white/[0.04]">
          <div className="grid grid-cols-4 gap-3">
            {macros.map((m, i) => {
              const Icon = m.icon
              return (
                <div key={i} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 relative overflow-hidden group hover:border-white/[0.08] transition-all duration-300">
                  <div className="absolute -top-8 -right-8 w-16 h-16 rounded-full blur-[30px] opacity-20 pointer-events-none" style={{ backgroundColor: m.color }} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${m.color}15`, border: `1px solid ${m.color}20` }}>
                        <Icon size={11} style={{ color: m.color }} />
                      </div>
                      {m.pct && <span className="text-[9px] font-semibold" style={{ color: m.color }}>{m.pct}</span>}
                    </div>
                    <p className="text-[16px] font-bold text-[#F5F5F3]/80">{m.value}</p>
                    <p className="text-[9px] text-[#F5F5F3]/20 mt-0.5">{m.unit} - {m.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Consumed progress */}
        <div className="px-5 py-2.5 bg-[#111111]/40 border-b border-white/[0.04]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-[#F5F5F3]/20">Consomme aujourd'hui</span>
            <span className="text-[9px] text-[#FF6B2B] font-medium">1 300 / 2 450 kcal</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E]" style={{ width: '53%' }} />
          </div>
        </div>

        {/* Meal list */}
        <div className="divide-y divide-white/[0.03]">
          {meals.map((meal, i) => (
            <div key={i} className={`px-5 py-3.5 ${meal.done ? 'bg-[#10B981]/[0.015]' : ''} hover:bg-white/[0.01] transition-colors`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${meal.done ? 'bg-[#10B981]/15' : 'bg-white/[0.04] border border-white/[0.06]'}`}>
                    {meal.done ? (
                      <CheckCircle size={12} className="text-[#10B981]" />
                    ) : (
                      <Apple size={10} className="text-[#F5F5F3]/20" />
                    )}
                  </div>
                  <div>
                    <p className={`text-[11px] font-semibold ${meal.done ? 'text-[#F5F5F3]/40' : 'text-[#F5F5F3]/70'}`}>{meal.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Clock size={9} className="text-[#F5F5F3]/15" />
                    <span className="text-[9px] text-[#F5F5F3]/20">{meal.time}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#FF6B2B]/60">{meal.cal} kcal</span>
                </div>
              </div>
              <div className="pl-9 flex flex-wrap gap-1.5">
                {meal.items.map((item, j) => (
                  <span key={j} className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.04] text-[8px] text-[#F5F5F3]/25">{item}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.04] bg-[#111111]/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShoppingCart size={10} className="text-[#FF6B2B]" />
            <span className="text-[9px] text-[#F5F5F3]/20">Liste de courses generee</span>
          </div>
          <span className="text-[9px] text-[#F5F5F3]/15">Eau : 2.5L / 3L</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Extra: Macro breakdown cards ─── */
function MacroBreakdownSection() {
  const macros = [
    {
      name: 'Proteines',
      pct: '30%',
      color: '#3B82F6',
      icon: Beef,
      desc: 'Essentielles pour la reparation et la croissance musculaire. Vise 1.6 a 2.2g par kilo de poids de corps pour tes clients en prise de masse.',
      sources: ['Poulet', 'Poisson', 'Oeufs', 'Whey', 'Tofu'],
    },
    {
      name: 'Glucides',
      pct: '45%',
      color: '#10B981',
      icon: Wheat,
      desc: 'Le carburant principal de l\'entrainement. Ajuste la quantite selon l\'intensite des seances : plus les jours d\'entrainement, moins les jours off.',
      sources: ['Riz', 'Patate douce', 'Avoine', 'Fruits', 'Pain complet'],
    },
    {
      name: 'Lipides',
      pct: '25%',
      color: '#F59E0B',
      icon: Droplets,
      desc: 'Indispensables pour les hormones et l\'absorption des vitamines. Privilegie les sources de qualite pour la sante et la performance.',
      sources: ['Avocat', 'Huile olive', 'Noix', 'Saumon', 'Graines'],
    },
  ]

  return (
    <section className="py-20 md:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0E0E0E] to-transparent pointer-events-none" />
      <div className="max-w-6xl mx-auto px-5 md:px-8 relative z-10">
        <div className="text-center mb-14">
          <p className="text-[11px] font-semibold text-[#FF6B2B] uppercase tracking-widest mb-3">Macronutriments</p>
          <h2 className="text-2xl md:text-4xl font-bold">Repartition intelligente</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {macros.map((m, i) => {
            const Icon = m.icon
            return (
              <div key={i} className="group rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#151515] to-[#111111] p-7 hover:border-white/[0.1] transition-all duration-500 relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ backgroundColor: `${m.color}15` }} />
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${m.color}15`, border: `1px solid ${m.color}15` }}>
                      <Icon size={20} style={{ color: m.color }} />
                    </div>
                    <span className="text-2xl font-bold" style={{ color: m.color }}>{m.pct}</span>
                  </div>

                  <h3 className="text-[15px] font-semibold mb-2 text-[#F5F5F3]/90">{m.name}</h3>
                  <p className="text-sm text-[#F5F5F3]/30 leading-relaxed mb-5">{m.desc}</p>

                  {/* Sources */}
                  <div>
                    <p className="text-[9px] uppercase font-semibold text-[#F5F5F3]/15 tracking-wider mb-2">Sources recommandees</p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.sources.map((s, si) => (
                        <span key={si} className="px-2.5 py-1 rounded-lg text-[10px] font-medium border" style={{ backgroundColor: `${m.color}08`, borderColor: `${m.color}15`, color: `${m.color}` }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─── Page ─── */
export default function NutritionPage() {
  return (
    <FeaturePageLayout
      badge="Nutrition & Plans alimentaires"
      badgeIcon={Utensils}
      title="La nutrition,"
      titleAccent="maitrisee"
      subtitle="Cree des plans alimentaires personnalises avec calcul automatique des macros. Tes clients savent exactement quoi manger, repas par repas."
      stats={[
        { value: '2 min', label: 'pour creer un plan' },
        { value: '100%', label: 'macros calculees auto' },
        { value: '+45%', label: 'd\'adherence nutritionnelle' },
      ]}
      mockup={<NutritionMockup />}
      features={[
        { icon: Utensils, title: 'Plans alimentaires', desc: 'Compose des plans repas complets avec petit-dejeuner, dejeuner, collations et diner. Jour par jour ou par cycle.' },
        { icon: Calculator, title: 'Calcul macros auto', desc: 'Les macronutriments sont calcules automatiquement en fonction des objectifs, du poids et du niveau d\'activite du client.' },
        { icon: Copy, title: 'Templates reutilisables', desc: 'Cree des templates de plans alimentaires et duplique-les pour gagner du temps avec chaque nouveau client.' },
        { icon: Target, title: 'Objectifs nutritionnels', desc: 'Definis des objectifs caloriques et macros adaptes : prise de masse, seche, maintien ou recomposition.' },
        { icon: ShieldCheck, title: 'Regimes & allergies', desc: 'Gere les restrictions alimentaires : vegetarien, vegan, sans gluten, sans lactose, allergies specifiques.' },
        { icon: ShoppingCart, title: 'Liste de courses', desc: 'Genere automatiquement une liste de courses a partir du plan alimentaire de la semaine. Pratique et precis.' },
      ]}
      stepsTitle="La nutrition simplifiee"
      steps={[
        { title: 'Definis les objectifs', desc: 'Configure les besoins caloriques et la repartition macro de ton client en fonction de son profil et ses objectifs.' },
        { title: 'Compose les repas', desc: 'Ajoute les aliments repas par repas avec les quantites. Les macros se calculent en temps reel au gramme pres.' },
        { title: 'Assigne au client', desc: 'Ton client recoit son plan, voit ses repas du jour et coche ce qu\'il a mange. Tu suis son adherence.' },
      ]}
      extraSection={<MacroBreakdownSection />}
      ctaTitle="Pret a transformer la nutrition de"
      ctaAccent="tes clients"
    />
  )
}
