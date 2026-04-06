import {
  UserPlus, Columns3, FileUser, MessageSquare, BellRing, Radar,
  TrendingUp, ArrowRight, Phone, Mail, Instagram, Clock, Star
} from 'lucide-react'
import FeaturePageLayout from '../../../components/FeaturePageLayout'

/* ── Mockup: Kanban pipeline ── */
function ProspectsMockup() {
  const columns = [
    {
      title: 'Nouveau',
      color: '#38BDF8',
      count: 4,
      cards: [
        { name: 'Julie Lefevre', source: 'Instagram', date: '6 avr.', icon: Instagram },
        { name: 'Marc Fontaine', source: 'Bouche a oreille', date: '5 avr.', icon: Star },
        { name: 'Sarah Nguyen', source: 'Site web', date: '4 avr.', icon: Radar },
      ],
    },
    {
      title: 'En discussion',
      color: '#F59E0B',
      count: 3,
      cards: [
        { name: 'Romain Girard', source: 'Appel planifie', date: '5 avr.', icon: Phone },
        { name: 'Camille Roux', source: 'Email envoye', date: '3 avr.', icon: Mail },
      ],
    },
    {
      title: 'Converti',
      color: '#22C55E',
      count: 8,
      cards: [
        { name: 'Antoine Mercier', source: 'Pack Premium', date: '2 avr.', icon: Star },
        { name: 'Clara Dumont', source: 'Suivi Standard', date: '1 avr.', icon: Star },
      ],
    },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#141414] to-[#0F0F0F] p-1 shadow-2xl shadow-black/40">
        <div className="rounded-xl bg-[#0C0C0C] p-5 md:p-7">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B2B]/20 to-[#FF6B2B]/5 border border-[#FF6B2B]/10 flex items-center justify-center">
                <UserPlus size={14} className="text-[#FF6B2B]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#F5F5F3]/80">Pipeline CRM</p>
                <p className="text-[10px] text-[#F5F5F3]/25">15 prospects actifs</p>
              </div>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white text-[9px] font-semibold">
              <UserPlus size={10} /> Ajouter
            </button>
          </div>

          {/* Kanban columns */}
          <div className="overflow-x-auto -mx-5 md:mx-0 px-5 md:px-0">
          <div className="grid grid-cols-3 gap-3 min-w-[600px]">
            {columns.map((col, ci) => (
              <div key={ci} className="rounded-xl border border-white/[0.05] bg-[#111111] p-3">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                    <span className="text-[10px] font-semibold text-[#F5F5F3]/50">{col.title}</span>
                  </div>
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold" style={{ background: `${col.color}15`, color: col.color }}>
                    {col.count}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {col.cards.map((card, i) => {
                    const Icon = card.icon
                    return (
                      <div key={i} className="rounded-lg border border-white/[0.06] bg-[#181818] p-3 hover:border-white/[0.1] transition-colors group cursor-pointer">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                              <span className="text-[8px] font-bold text-[#F5F5F3]/30">{card.name.charAt(0)}{card.name.split(' ')[1]?.charAt(0)}</span>
                            </div>
                            <p className="text-[10px] font-semibold text-[#F5F5F3]/60 group-hover:text-[#F5F5F3]/80 transition-colors">{card.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Icon size={8} className="text-[#F5F5F3]/15" />
                            <span className="text-[8px] text-[#F5F5F3]/20">{card.source}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={7} className="text-[#F5F5F3]/10" />
                            <span className="text-[7px] text-[#F5F5F3]/10">{card.date}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          </div>

          {/* Bottom stats bar */}
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 px-3 py-3 rounded-xl border border-white/[0.04] bg-[#111111]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={10} className="text-emerald-400" />
                <span className="text-[9px] font-medium text-emerald-400">42% taux conversion</span>
              </div>
              <div className="w-px h-3 bg-white/[0.06]" />
              <span className="text-[9px] text-[#F5F5F3]/20">Temps moyen: <span className="text-[#F5F5F3]/40 font-medium">6 jours</span></span>
            </div>
            <span className="text-[9px] text-[#FF6B2B] font-medium flex items-center gap-1">
              Voir analytics <ArrowRight size={8} />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProspectsPage() {
  return (
    <FeaturePageLayout
      badge="CRM Prospects"
      badgeIcon={UserPlus}
      title="Convertis plus,"
      titleAccent="prospecte mieux"
      subtitle="Un pipeline commercial visuel pour suivre chaque prospect du premier contact a la signature."
      stats={[
        { value: '+40%', label: 'taux de conversion' },
        { value: 'Pipeline', label: 'visuel' },
        { value: '0', label: 'prospect oublie' },
      ]}
      mockup={<ProspectsMockup />}
      features={[
        { icon: Columns3, title: 'Pipeline visuel', desc: "Kanban drag & drop pour suivre chaque prospect. De 'Nouveau' a 'Converti' en un coup d'oeil." },
        { icon: FileUser, title: 'Fiches prospects', desc: "Toutes les infos en un endroit : coordonnees, notes, historique. Ne perds jamais le fil." },
        { icon: MessageSquare, title: 'Historique interactions', desc: "Chaque appel, email, message est trace. Reprends la conversation la ou tu l'as laissee." },
        { icon: BellRing, title: 'Relances automatiques', desc: "Un prospect n'a pas repondu ? Le systeme te rappelle de le relancer au bon moment." },
        { icon: Radar, title: 'Sources tracking', desc: "Sais d'ou viennent tes prospects : Instagram, bouche a oreille, site web. Investis la ou ca marche." },
        { icon: TrendingUp, title: 'Conversion analytics', desc: "Taux de conversion, temps moyen, sources performantes. Optimise ton tunnel de vente." },
      ]}
      stepsTitle="Du prospect au client"
      steps={[
        { title: 'Ajoute un prospect', desc: "Nouveau contact ? Ajoute-le en 2 clics avec sa source d'acquisition. Il entre dans ton pipeline." },
        { title: 'Suis ton pipeline', desc: "Deplace tes prospects dans le kanban au fil des echanges. Nouveau, En discussion, Converti — rien n'echappe." },
        { title: 'Convertis en client', desc: "Le prospect signe ? Transforme-le en client en un clic. Il recoit son invitation et commence son coaching." },
      ]}
      ctaTitle="Pret a ne plus perdre de prospects"
      ctaAccent="et convertir plus"
    />
  )
}
