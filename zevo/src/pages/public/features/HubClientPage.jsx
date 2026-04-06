import FeaturePageLayout from '../../../components/FeaturePageLayout'
import {
  Users, User, Target, Activity, TrendingUp, AlertTriangle,
  History, Ruler, BarChart3, Heart, Calendar, ChevronRight,
  ArrowUp, ArrowDown, Minus, Star, MessageCircle, Dumbbell
} from 'lucide-react'

/* ── Mockup: Client profile card 360 ── */
function ClientProfileMockup() {
  const recentSessions = [
    { name: 'Upper Body Force', date: '3 jan', status: 'done' },
    { name: 'HIIT Cardio 30min', date: '1 jan', status: 'done' },
    { name: 'Lower Body Hyper', date: '29 dec', status: 'missed' },
  ]

  const measurements = [
    { label: 'Poids', value: '74.2 kg', trend: 'down', delta: '-1.3' },
    { label: 'Tour de taille', value: '82 cm', trend: 'down', delta: '-2.0' },
    { label: 'Masse muscu.', value: '38.1 kg', trend: 'up', delta: '+0.8' },
    { label: 'Masse grasse', value: '16.4%', trend: 'down', delta: '-1.1' },
  ]

  const objectives = [
    { label: 'Perte de gras', progress: 72 },
    { label: 'Squat 100kg', progress: 85 },
    { label: 'Regularity 4x/sem', progress: 60 },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-2xl border border-white/[0.06] bg-[#141414] overflow-hidden shadow-2xl shadow-black/40">

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] bg-[#111111] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B2B]/20 to-[#FF8F5E]/10 border border-[#FF6B2B]/15 flex items-center justify-center">
              <Users size={14} className="text-[#FF6B2B]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#F5F5F3]/80">Fiche Client</p>
              <p className="text-[10px] text-[#F5F5F3]/25">Vue complete 360</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-lg bg-green-500/[0.08] border border-green-500/15">
              <span className="text-[9px] font-semibold text-green-400">Actif</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <span className="text-[9px] text-[#F5F5F3]/25">Depuis 6 mois</span>
            </div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Left: Avatar & info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Profile card */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0F0F0F] p-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#FF6B2B]/15">
                <span className="text-lg font-bold text-white">ML</span>
              </div>
              <p className="text-sm font-semibold text-[#F5F5F3]/80">Marie Lefevre</p>
              <p className="text-[10px] text-[#F5F5F3]/25 mt-0.5">marie.lefevre@email.com</p>
              <div className="flex items-center justify-center gap-3 mt-3">
                <div className="flex items-center gap-1">
                  <Calendar size={10} className="text-[#F5F5F3]/20" />
                  <span className="text-[9px] text-[#F5F5F3]/20">28 ans</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target size={10} className="text-[#F5F5F3]/20" />
                  <span className="text-[9px] text-[#F5F5F3]/20">Recomposition</span>
                </div>
              </div>
            </div>

            {/* Wellbeing score */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0F0F0F] p-4">
              <p className="text-[10px] text-[#F5F5F3]/25 font-medium mb-3">Score bien-etre</p>
              <div className="flex items-center justify-center">
                <div className="relative w-24 h-24">
                  {/* Circular progress background */}
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="url(#scoreGradient)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${78 * 2.64} ${100 * 2.64}`} />
                    <defs>
                      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FF6B2B" />
                        <stop offset="100%" stopColor="#FFB088" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold bg-gradient-to-br from-[#FF6B2B] to-[#FFB088] bg-clip-text text-transparent">78</span>
                    <span className="text-[8px] text-[#F5F5F3]/20">/100</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1 mt-2">
                <ArrowUp size={10} className="text-green-400" />
                <span className="text-[9px] text-green-400 font-medium">+5 pts cette semaine</span>
              </div>
            </div>
          </div>

          {/* Right: Details */}
          <div className="lg:col-span-2 space-y-4">

            {/* Objectives */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0F0F0F] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-[#F5F5F3]/25 font-medium">Objectifs en cours</p>
                <Target size={12} className="text-[#FF6B2B]/40" />
              </div>
              <div className="space-y-3">
                {objectives.map((obj, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-[#F5F5F3]/60 font-medium">{obj.label}</span>
                      <span className="text-[10px] text-[#FF6B2B] font-semibold">{obj.progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] transition-all" style={{ width: `${obj.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Measurements grid */}
            <div className="grid grid-cols-2 gap-2 overflow-hidden">
              {measurements.map((m, i) => {
                const TrendIcon = m.trend === 'up' ? ArrowUp : m.trend === 'down' ? ArrowDown : Minus
                const trendColor = m.label === 'Masse muscu.' ? (m.trend === 'up' ? 'text-green-400' : 'text-red-400') : (m.trend === 'down' ? 'text-green-400' : 'text-red-400')
                return (
                  <div key={i} className="rounded-xl border border-white/[0.06] bg-[#0F0F0F] p-3">
                    <p className="text-[9px] text-[#F5F5F3]/20 font-medium">{m.label}</p>
                    <div className="flex items-end justify-between mt-1">
                      <p className="text-sm font-bold text-[#F5F5F3]/70">{m.value}</p>
                      <div className="flex items-center gap-0.5">
                        <TrendIcon size={9} className={trendColor} />
                        <span className={`text-[9px] font-medium ${trendColor}`}>{m.delta}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Recent sessions */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0F0F0F] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-[#F5F5F3]/25 font-medium">Seances recentes</p>
                <History size={12} className="text-[#F5F5F3]/15" />
              </div>
              <div className="space-y-2">
                {recentSessions.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.03]">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${s.status === 'done' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <Dumbbell size={11} className={s.status === 'done' ? 'text-green-400' : 'text-red-400/60'} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] text-[#F5F5F3]/60 font-medium">{s.name}</p>
                    </div>
                    <span className="text-[9px] text-[#F5F5F3]/15">{s.date}</span>
                    <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded ${s.status === 'done' ? 'text-green-400 bg-green-500/[0.06]' : 'text-red-400/60 bg-red-500/[0.06]'}`}>
                      {s.status === 'done' ? 'Complete' : 'Manquee'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HubClientPage() {
  return (
    <FeaturePageLayout
      badge="Hub Client 360"
      badgeIcon={Users}
      title="Chaque client,"
      titleAccent="une attention sur-mesure"
      subtitle="Objectifs, mensurations, score bien-etre, historique. Tout est centralise dans une fiche client unique."
      stats={[
        { value: '360\u00b0', label: 'VUE COMPLETE' },
        { value: '< 5s', label: 'ACCES FICHE CLIENT' },
        { value: '100%', label: 'DONNEES CENTRALISEES' },
      ]}
      mockup={<ClientProfileMockup />}
      features={[
        { icon: User, title: 'Fiche unifiee', desc: 'Toutes les informations d\'un client reunies sur une seule page. Plus besoin de chercher dans 5 outils differents.' },
        { icon: Heart, title: 'Score bien-etre auto', desc: 'Un score calcule automatiquement a partir de l\'activite, du sommeil et des retours client.' },
        { icon: AlertTriangle, title: 'Alertes desengagement', desc: 'Recois une alerte des qu\'un client commence a decrocher. Agis avant qu\'il ne parte.' },
        { icon: History, title: 'Historique complet', desc: 'Retrouve chaque seance, chaque message, chaque bilan depuis le premier jour.' },
        { icon: Ruler, title: 'Mensurations', desc: 'Suis l\'evolution du poids, des tours, de la masse grasse et musculaire au fil du temps.' },
        { icon: Target, title: 'Objectifs tracking', desc: 'Definis des objectifs clairs et suis la progression de chaque client en temps reel.' },
      ]}
      stepsTitle="Connais chaque client en 3 etapes"
      steps={[
        { title: 'Invite ton client', desc: 'Envoie un lien d\'invitation. Ton client cree son compte et sa fiche se genere automatiquement.' },
        { title: 'La fiche se remplit', desc: 'Au fil des seances, bilans et echanges, la fiche client se complete toute seule avec les donnees pertinentes.' },
        { title: 'Suis tout en un coup d\'oeil', desc: 'Score bien-etre, objectifs, mensurations, historique : tout est la, sur une seule page.' },
      ]}
      ctaTitle="Pret a vraiment connaitre"
      ctaAccent="tes clients"
    />
  )
}
