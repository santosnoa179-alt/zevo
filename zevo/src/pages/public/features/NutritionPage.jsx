import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Utensils, Apple, Flame, Droplets,
  BarChart3, Target, CheckCircle, Clock, Zap, Shield,
  Video, Star, TrendingUp, RefreshCw, FileText,
  ChevronRight, Sparkles, Calculator, ShoppingCart, Leaf
} from 'lucide-react'
import { ZevoLogo } from '../../../components/ui/ZevoLogo'

const FEATURES_DETAIL = [
  {
    icon: Utensils,
    title: 'Plans alimentaires complets',
    desc: 'Cree des plans jour par jour avec petit-dejeuner, dejeuner, diner et collations. Chaque repas detail les aliments et quantites.',
  },
  {
    icon: Calculator,
    title: 'Calcul macros automatique',
    desc: 'Proteines, glucides, lipides et calories calcules automatiquement pour chaque repas et chaque journee.',
  },
  {
    icon: RefreshCw,
    title: 'Templates reutilisables',
    desc: 'Cree des plans types (prise de masse, seche, equilibre) et adapte-les en quelques clics pour chaque client.',
  },
  {
    icon: Target,
    title: 'Objectifs nutritionnels',
    desc: 'Definis des cibles caloriques et macro pour chaque client. Le systeme alerte quand les plans s\'ecartent des objectifs.',
  },
  {
    icon: Leaf,
    title: 'Regimes & allergies',
    desc: 'Vegan, sans gluten, sans lactose — filtre les aliments selon les restrictions de chaque client.',
  },
  {
    icon: ShoppingCart,
    title: 'Liste de courses',
    desc: 'Generation automatique de la liste de courses a partir du plan alimentaire. Tes clients savent exactement quoi acheter.',
  },
]

const STATS = [
  { value: '500+', label: 'aliments en base' },
  { value: '2min', label: 'pour creer un plan' },
  { value: '100%', label: 'macros calcules' },
]

const MACRO_PREVIEW = {
  total: { cal: 2450, prot: 185, carbs: 260, fat: 72 },
  meals: [
    { name: 'Petit-dejeuner', cal: 580, items: ['Flocons d\'avoine 80g', 'Whey 30g', 'Banane', 'Beurre de cacahuete 15g'] },
    { name: 'Dejeuner', cal: 720, items: ['Poulet grille 180g', 'Riz basmati 120g', 'Brocolis 150g', 'Huile d\'olive 10ml'] },
    { name: 'Collation', cal: 350, items: ['Fromage blanc 0% 200g', 'Amandes 20g', 'Myrtilles 100g'] },
    { name: 'Diner', cal: 650, items: ['Saumon 160g', 'Patates douces 150g', 'Salade verte', 'Avocat 1/2'] },
    { name: 'Pre-dodo', cal: 150, items: ['Caseine 30g', 'Lait d\'amande 200ml'] },
  ],
}

export default function NutritionPage() {
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
            <Utensils size={14} className="text-[#FF6B2B]" />
            <span className="text-xs font-semibold text-[#FF6B2B]">Nutrition & Plans alimentaires</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            La nutrition,{' '}
            <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">
              maitrisee
            </span>
          </h1>
          <p className="text-lg md:text-xl text-[#F5F5F3]/35 max-w-2xl mx-auto leading-relaxed mb-10">
            Cree des plans alimentaires personnalises avec calcul automatique des macros. Tes clients savent exactement quoi manger, quand et combien.
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

          {/* Nutrition plan mockup */}
          <div className="max-w-3xl mx-auto rounded-2xl border border-white/[0.06] bg-[#141414] overflow-hidden shadow-2xl shadow-black/40">
            <div className="h-1 bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E]" />
            <div className="p-4 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center">
                  <Utensils size={16} className="text-[#FF6B2B]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Plan — Prise de masse propre</p>
                  <p className="text-[10px] text-[#F5F5F3]/25">Lucas M. · Objectif : 2500 kcal</p>
                </div>
              </div>
            </div>
            {/* Macros summary */}
            <div className="px-4 pt-4 pb-2">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Calories', value: `${MACRO_PREVIEW.total.cal}`, unit: 'kcal', color: '#FF6B2B' },
                  { label: 'Proteines', value: `${MACRO_PREVIEW.total.prot}`, unit: 'g', color: '#3B82F6' },
                  { label: 'Glucides', value: `${MACRO_PREVIEW.total.carbs}`, unit: 'g', color: '#10B981' },
                  { label: 'Lipides', value: `${MACRO_PREVIEW.total.fat}`, unit: 'g', color: '#F59E0B' },
                ].map((m, i) => (
                  <div key={i} className="rounded-xl bg-white/[0.025] border border-white/[0.04] p-3 text-center">
                    <p className="text-[9px] text-[#F5F5F3]/20 mb-1">{m.label}</p>
                    <p className="text-lg font-bold" style={{ color: m.color }}>{m.value}</p>
                    <p className="text-[8px] text-[#F5F5F3]/15">{m.unit}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Meals */}
            <div className="p-4 space-y-2">
              {MACRO_PREVIEW.meals.map((meal, i) => (
                <div key={i} className="rounded-xl bg-white/[0.015] border border-white/[0.04] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-[#F5F5F3]/50">{meal.name}</p>
                    <span className="text-[10px] text-[#FF6B2B] font-medium">{meal.cal} kcal</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {meal.items.map((item, j) => (
                      <span key={j} className="px-2 py-0.5 rounded-md bg-white/[0.03] text-[9px] text-[#F5F5F3]/25">{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="py-20 relative">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">Un outil nutritionnel complet</h2>
            <p className="text-[#F5F5F3]/30 max-w-xl mx-auto">De la creation du plan a la liste de courses, tout est automatise pour toi et tes clients.</p>
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

      {/* ── How it works ── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-14">Cree un plan en 3 etapes</h2>
          <div className="space-y-0">
            {[
              { num: '01', title: 'Definis les objectifs', desc: 'Calories cibles, ratio macros, restrictions alimentaires. Le systeme calcule tout automatiquement.' },
              { num: '02', title: 'Compose les repas', desc: 'Choisis les aliments depuis la base de donnees, ajuste les quantites. Les macros se mettent a jour en temps reel.' },
              { num: '03', title: 'Assigne au client', desc: 'Le client recoit son plan dans son espace. Il peut consulter chaque repas, generer sa liste de courses et suivre ses macros.' },
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

      {/* ── Macro breakdown visual ── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">Chaque macro, chaque calorie</h2>
            <p className="text-[#F5F5F3]/30 max-w-xl mx-auto">Tes clients visualisent leurs macros en un coup d'oeil. Tout est clair, precis et motivant.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Proteines', value: '30%', detail: '185g / jour', color: '#3B82F6', desc: 'Pour la construction musculaire et la recuperation' },
              { label: 'Glucides', value: '45%', detail: '260g / jour', color: '#10B981', desc: 'Pour l\'energie et la performance a l\'entrainement' },
              { label: 'Lipides', value: '25%', detail: '72g / jour', color: '#F59E0B', desc: 'Pour les hormones et les fonctions vitales' },
            ].map((m, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.06] bg-[#141414] p-7 text-center">
                <p className="text-4xl font-bold mb-1" style={{ color: m.color }}>{m.value}</p>
                <p className="text-sm font-semibold text-[#F5F5F3]/60 mb-1">{m.label}</p>
                <p className="text-xs text-[#F5F5F3]/25 mb-3">{m.detail}</p>
                <p className="text-[11px] text-[#F5F5F3]/20 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-2xl mx-auto px-5 md:px-8 text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-4">
            Pret a transformer la{' '}
            <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">nutrition</span>{' '}
            de tes clients ?
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
