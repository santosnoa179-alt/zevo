import {
  CreditCard, Zap, FileText, BarChart3, BellRing, Clock,
  DollarSign, CheckCircle, ArrowUpRight, Receipt, BadgeCheck, Repeat
} from 'lucide-react'
import FeaturePageLayout from '../../../components/FeaturePageLayout'

/* ── Mockup: Payments dashboard ── */
function PaiementsMockup() {
  const transactions = [
    { name: 'Lucas Martin', amount: '89', date: '6 avr.', status: 'Paye', statusColor: '#22C55E' },
    { name: 'Emma Dubois', amount: '129', date: '5 avr.', status: 'Paye', statusColor: '#22C55E' },
    { name: 'Hugo Bernard', amount: '89', date: '4 avr.', status: 'Paye', statusColor: '#22C55E' },
    { name: 'Lea Moreau', amount: '59', date: '3 avr.', status: 'En attente', statusColor: '#F59E0B' },
    { name: 'Thomas Petit', amount: '129', date: '2 avr.', status: 'Paye', statusColor: '#22C55E' },
  ]

  const offers = [
    { name: 'Coaching Premium', price: '129', interval: '/mois', clients: 18 },
    { name: 'Suivi Standard', price: '89', interval: '/mois', clients: 24 },
    { name: 'Seance Decouverte', price: '59', interval: 'unique', clients: 5 },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#141414] to-[#0F0F0F] p-1 shadow-2xl shadow-black/40">
        <div className="rounded-xl bg-[#0C0C0C] p-5 md:p-7">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B2B]/20 to-[#FF6B2B]/5 border border-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                <CreditCard size={14} className="text-[#FF6B2B]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#F5F5F3]/80">Paiements</p>
                <p className="text-[10px] text-[#F5F5F3]/25">Stripe Connect</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/15 flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-semibold text-emerald-400">Stripe actif</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Revenue card */}
            <div className="md:col-span-1 rounded-xl border border-white/[0.06] bg-gradient-to-br from-[#FF6B2B]/[0.06] to-[#141414] p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={12} className="text-[#FF6B2B]" />
                <span className="text-[9px] font-semibold text-[#F5F5F3]/30 uppercase tracking-wider">Revenus ce mois</span>
              </div>
              <p className="text-3xl font-bold text-[#F5F5F3]/90">4 850<span className="text-lg text-[#F5F5F3]/30 ml-1">\u20ac</span></p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight size={10} className="text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-400">+12% vs mars</span>
              </div>
            </div>

            {/* Offers */}
            <div className="md:col-span-2 rounded-xl border border-white/[0.06] bg-[#141414] p-4">
              <p className="text-[10px] font-semibold text-[#F5F5F3]/30 uppercase tracking-wider mb-3">Tes offres</p>
              <div className="space-y-2">
                {offers.map((o, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-[#FF6B2B]/10 border border-[#FF6B2B]/10 flex items-center justify-center">
                        <Receipt size={10} className="text-[#FF6B2B]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-[#F5F5F3]/60">{o.name}</p>
                        <p className="text-[8px] text-[#F5F5F3]/15">{o.clients} clients actifs</p>
                      </div>
                    </div>
                    <p className="text-[12px] font-bold text-[#F5F5F3]/70">{o.price}\u20ac<span className="text-[8px] font-normal text-[#F5F5F3]/20 ml-0.5">{o.interval}</span></p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div className="rounded-xl border border-white/[0.06] bg-[#141414] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-[#F5F5F3]/30 uppercase tracking-wider">Transactions recentes</p>
              <span className="text-[9px] text-[#FF6B2B] font-medium cursor-pointer">Voir tout</span>
            </div>
            <div className="space-y-1">
              {transactions.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.02] transition-colors gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-bold text-[#F5F5F3]/30">{t.name.charAt(0)}{t.name.split(' ')[1]?.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-[#F5F5F3]/60 truncate">{t.name}</p>
                      <p className="text-[8px] text-[#F5F5F3]/15">{t.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span className="text-[11px] font-semibold text-[#F5F5F3]/70">{t.amount}\u20ac</span>
                    <span className="px-2 py-0.5 rounded-md text-[8px] font-semibold" style={{ background: `${t.statusColor}15`, color: t.statusColor, border: `1px solid ${t.statusColor}20` }}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PaiementsPage() {
  return (
    <FeaturePageLayout
      badge="Paiements & Abonnements"
      badgeIcon={CreditCard}
      title="Encaisse"
      titleAccent="sans friction"
      subtitle="Connecte Stripe en un clic, cree tes offres, encaisse automatiquement. L'argent arrive directement sur ton compte."
      stats={[
        { value: '0%', label: 'commission Zevo' },
        { value: '1 clic', label: 'Stripe Connect' },
        { value: 'Auto', label: 'facturation' },
      ]}
      mockup={<PaiementsMockup />}
      features={[
        { icon: Zap, title: 'Stripe Connect', desc: "Connecte ton compte Stripe en un clic. Tes paiements arrivent directement sur ton compte, sans intermediaire." },
        { icon: Receipt, title: 'Offres personnalisees', desc: "Cree des abonnements mensuels, des packs ou des seances uniques. Fixe tes prix, Zevo gere le reste." },
        { icon: Repeat, title: 'Facturation automatique', desc: "Les abonnements se renouvellent tout seuls. Plus besoin de relancer manuellement chaque mois." },
        { icon: BarChart3, title: 'Tableau de bord revenus', desc: "Visualise tes revenus en temps reel. MRR, churn, croissance — pilote ton business comme un pro." },
        { icon: BellRing, title: 'Relances impayes', desc: "Un paiement echoue ? Le systeme relance automatiquement. Recupere ton argent sans effort." },
        { icon: Clock, title: 'Historique transactions', desc: "Chaque paiement est trace. Retrouve n'importe quelle transaction en quelques secondes." },
      ]}
      stepsTitle="Encaisse en 3 etapes"
      steps={[
        { title: 'Connecte Stripe', desc: "Un clic suffit. Ton compte Stripe est lie et pret a recevoir des paiements en quelques secondes." },
        { title: 'Cree tes offres', desc: "Definis tes tarifs et tes formules. Abonnement mensuel, pack de seances, essai gratuit — toi qui decides." },
        { title: 'Tes clients paient', desc: "Tes clients choisissent leur offre et paient en ligne. L'argent arrive directement chez toi, sans commission Zevo." },
      ]}
      ctaTitle="Pret a simplifier tes paiements"
      ctaAccent="et encaisser plus"
    />
  )
}
