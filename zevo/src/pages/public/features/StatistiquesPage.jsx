import {
  BarChart3, TrendingUp, FileText, LineChart, BellRing, SlidersHorizontal,
  Download, Activity, Users, DollarSign, CalendarDays, ArrowUpRight
} from 'lucide-react'
import FeaturePageLayout from '../../../components/FeaturePageLayout'

/* ── Mockup: Dashboard analytics ── */
function StatsMockup() {
  const metrics = [
    { label: 'Revenus', value: '4 850', unit: '\u20ac', change: '+12%', icon: DollarSign, color: '#FF6B2B' },
    { label: 'Clients actifs', value: '47', unit: '', change: '+3', icon: Users, color: '#22C55E' },
    { label: 'Retention', value: '94', unit: '%', change: '+2.1%', icon: Activity, color: '#A78BFA' },
    { label: 'Seances / mois', value: '186', unit: '', change: '+8%', icon: CalendarDays, color: '#38BDF8' },
  ]

  const barData = [65, 78, 52, 88, 95, 72, 84]
  const barLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const maxBar = Math.max(...barData)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#141414] to-[#0F0F0F] p-1 shadow-2xl shadow-black/40">
        <div className="rounded-xl bg-[#0C0C0C] p-5 md:p-7">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B2B]/20 to-[#FF6B2B]/5 border border-[#FF6B2B]/10 flex items-center justify-center">
                <BarChart3 size={14} className="text-[#FF6B2B]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#F5F5F3]/80">Vue d'ensemble</p>
                <p className="text-[10px] text-[#F5F5F3]/25">Avril 2026</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-[#FF6B2B]/10 border border-[#FF6B2B]/15 text-[9px] font-semibold text-[#FF6B2B]">Ce mois</span>
              <span className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-[9px] font-medium text-[#F5F5F3]/25">90 jours</span>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {metrics.map((m, i) => {
              const Icon = m.icon
              return (
                <div key={i} className="rounded-xl border border-white/[0.06] bg-[#141414] p-4 group hover:border-white/[0.1] transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${m.color}15`, border: `1px solid ${m.color}20` }}>
                      <Icon size={12} style={{ color: m.color }} />
                    </div>
                    <span className="flex items-center gap-0.5 text-[9px] font-semibold text-emerald-400">
                      <ArrowUpRight size={8} />
                      {m.change}
                    </span>
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-[#F5F5F3]/90">
                    {m.value}<span className="text-sm text-[#F5F5F3]/30 ml-0.5">{m.unit}</span>
                  </p>
                  <p className="text-[10px] text-[#F5F5F3]/25 mt-1">{m.label}</p>
                </div>
              )
            })}
          </div>

          {/* Mini bar chart */}
          <div className="rounded-xl border border-white/[0.06] bg-[#141414] p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-semibold text-[#F5F5F3]/50">Seances par jour</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E]" />
                <span className="text-[9px] text-[#F5F5F3]/20">Cette semaine</span>
              </div>
            </div>
            <div className="flex items-end justify-between gap-2 h-28">
              {barData.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full rounded-md relative overflow-hidden" style={{ height: `${(val / maxBar) * 100}%` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#FF6B2B] to-[#FF8F5E] opacity-80 rounded-md" />
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/[0.1] rounded-md" />
                  </div>
                  <span className="text-[8px] text-[#F5F5F3]/15">{barLabels[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StatistiquesPage() {
  return (
    <FeaturePageLayout
      badge="Statistiques & Rapports"
      badgeIcon={BarChart3}
      title="Mesure tout,"
      titleAccent="decide mieux"
      subtitle="Dashboards, graphiques et rapports PDF automatiques. Chaque decision s'appuie sur des donnees concretes."
      stats={[
        { value: '12+', label: 'metriques trackees' },
        { value: 'PDF', label: 'rapports auto' },
        { value: '100%', label: 'data-driven' },
      ]}
      mockup={<StatsMockup />}
      features={[
        { icon: BarChart3, title: 'Dashboards temps reel', desc: "Visualise l'activite de ton business en un coup d'oeil. Revenus, clients, seances — tout est la." },
        { icon: FileText, title: 'Rapports PDF auto', desc: "Genere des bilans PDF professionnels pour tes clients. Progression, metriques, recommandations." },
        { icon: LineChart, title: 'Graphiques progression', desc: "Courbes d'evolution pour chaque client. Poids, performances, adherence — tout est trace." },
        { icon: BellRing, title: 'Alertes desengagement', desc: "Detecte les clients qui decrochent avant qu'il ne soit trop tard. Notifications proactives." },
        { icon: SlidersHorizontal, title: 'Metriques personnalisees', desc: "Choisis les KPIs qui comptent pour toi. Cree tes propres tableaux de bord sur mesure." },
        { icon: Download, title: 'Export donnees', desc: "Exporte tes donnees en CSV ou PDF a tout moment. Tes donnees t'appartiennent." },
      ]}
      stepsTitle="De la donnee a la decision"
      steps={[
        { title: 'Connecte tes donnees', desc: "Tes seances, paiements et clients remontent automatiquement. Zero saisie manuelle." },
        { title: 'Visualise tes metriques', desc: "Dashboards clairs et intuitifs. Identifie les tendances et les opportunites en un instant." },
        { title: 'Genere tes rapports', desc: "Exporte des bilans PDF pour tes clients ou pour toi. Decisions basees sur des faits, pas des intuitions." },
      ]}
      ctaTitle="Pret a piloter ton business"
      ctaAccent="avec des donnees"
    />
  )
}
