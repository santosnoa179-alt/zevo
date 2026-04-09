import {
  Paintbrush, Palette, ToggleRight, Eye, Crown, Globe,
  UserCheck, Smartphone, ArrowRight, Image, Layers, Sparkles
} from 'lucide-react'
import FeaturePageLayout from '../../../components/FeaturePageLayout'

/* ── Mockup: Phone with branded app ── */
function AppBuilderMockup() {
  const brandColor = '#10B981'
  const modules = [
    { label: 'Entraînement', active: true },
    { label: 'Nutrition', active: true },
    { label: 'Messagerie', active: true },
    { label: 'Calendrier', active: false },
    { label: 'Bibliothèque', active: true },
    { label: 'Progression', active: false },
  ]

  return (
    <div className="max-w-sm mx-auto">
      {/* Phone frame */}
      <div className="relative mx-auto w-[260px] md:w-[280px]">
        <div className="rounded-[2.2rem] border-[3px] border-white/[0.08] bg-[#0A0A0A] p-2 shadow-2xl shadow-black/60">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-[#0A0A0A] rounded-b-2xl z-20" />

          <div className="rounded-[1.8rem] overflow-hidden bg-[#0C0C0C]">
            {/* Status bar */}
            <div className="h-10 flex items-end justify-between px-6 pb-1">
              <span className="text-[8px] text-[#F5F5F3]/20">9:41</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1.5 rounded-sm bg-[#F5F5F3]/15" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#F5F5F3]/15" />
              </div>
            </div>

            {/* App header */}
            <div className="px-5 pt-3 pb-4" style={{ background: `linear-gradient(135deg, ${brandColor}15, transparent)` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: `${brandColor}20`, borderColor: `${brandColor}30` }}>
                  <Crown size={14} style={{ color: brandColor }} />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[#F5F5F3]/90">FitPro Studio</p>
                  <p className="text-[8px] text-[#F5F5F3]/25">Coach Marine D.</p>
                </div>
              </div>
              <p className="text-[10px] text-[#F5F5F3]/40">Bonjour <span className="text-[#F5F5F3]/60 font-medium">Lucas</span>, prêt pour ta séance ?</p>
            </div>

            {/* Quick actions */}
            <div className="px-5 py-4">
              <p className="text-[9px] font-semibold text-[#F5F5F3]/30 uppercase tracking-wider mb-3">Aujourd'hui</p>
              <div className="space-y-2">
                <div className="rounded-xl border border-white/[0.06] bg-[#141414] p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${brandColor}15`, border: `1px solid ${brandColor}20` }}>
                    <Layers size={12} style={{ color: brandColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-[#F5F5F3]/70">Push / Épaules</p>
                    <p className="text-[8px] text-[#F5F5F3]/20">6 exercices - 55 min</p>
                  </div>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: brandColor }}>
                    <ArrowRight size={10} className="text-white" />
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-[#141414] p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#A78BFA]/15 border border-[#A78BFA]/20 flex items-center justify-center">
                    <Sparkles size={12} className="text-[#A78BFA]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-[#F5F5F3]/70">Plan nutrition</p>
                    <p className="text-[8px] text-[#F5F5F3]/20">2 450 kcal - Jour 12</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modules toggle preview */}
            <div className="px-5 pb-5">
              <p className="text-[9px] font-semibold text-[#F5F5F3]/30 uppercase tracking-wider mb-2.5">Modules actifs</p>
              <div className="grid grid-cols-2 gap-1.5">
                {modules.map((m, i) => (
                  <div key={i} className={`rounded-lg px-2.5 py-2 text-[8px] font-medium border ${m.active ? 'border-white/[0.08] bg-[#181818] text-[#F5F5F3]/50' : 'border-white/[0.03] bg-[#0F0F0F] text-[#F5F5F3]/15'}`}>
                    <div className="flex items-center justify-between">
                      <span>{m.label}</span>
                      <div className={`w-5 h-3 rounded-full ${m.active ? '' : 'bg-white/[0.06]'}`} style={m.active ? { background: brandColor } : {}}>
                        <div className={`w-2 h-2 rounded-full bg-white mt-0.5 transition-all ${m.active ? 'ml-2.5' : 'ml-0.5'}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom nav */}
            <div className="border-t border-white/[0.04] px-5 py-3 flex items-center justify-around">
              {['Accueil', 'Séances', 'Chat', 'Profil'].map((tab, i) => (
                <span key={i} className={`text-[8px] ${i === 0 ? 'font-semibold' : 'font-normal'}`} style={{ color: i === 0 ? brandColor : 'rgba(245,245,243,0.15)' }}>{tab}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Extra: Before / After ── */
function BeforeAfterSection() {
  return (
    <section className="py-20 md:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0E0E0E] to-transparent pointer-events-none" />
      <div className="max-w-5xl mx-auto px-5 md:px-8 relative z-10">
        <div className="text-center mb-14">
          <p className="text-[11px] font-semibold text-[#FF6B2B] uppercase tracking-widest mb-3">Transformation</p>
          <h2 className="text-2xl md:text-4xl font-bold">Avant / Après</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Before - Generic */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#141414] p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[9px] font-semibold text-[#F5F5F3]/20">Générique</span>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#333] border border-white/[0.08] flex items-center justify-center">
                <Smartphone size={16} className="text-[#F5F5F3]/20" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#F5F5F3]/30">App Coach</p>
                <p className="text-[9px] text-[#F5F5F3]/10">Sans personnalisation</p>
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="h-8 rounded-lg bg-[#222] border border-white/[0.04]" />
              <div className="h-8 rounded-lg bg-[#222] border border-white/[0.04]" />
              <div className="h-8 rounded-lg bg-[#222] border border-white/[0.04]" />
            </div>
            <div className="mt-5 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#333]" />
              <div className="h-3 w-20 rounded bg-[#222]" />
            </div>
            {/* Desaturated overlay */}
            <div className="absolute inset-0 bg-[#141414]/30 pointer-events-none" />
          </div>

          {/* After - Branded */}
          <div className="rounded-2xl border border-[#10B981]/20 bg-gradient-to-br from-[#10B981]/[0.06] to-[#141414] p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="px-2.5 py-1 rounded-md bg-[#10B981]/15 border border-[#10B981]/20 text-[9px] font-semibold text-[#10B981]">Ta marque</span>
            </div>
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[#10B981]/[0.06] blur-[60px] pointer-events-none" />
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/20 border border-[#10B981]/25 flex items-center justify-center">
                <Crown size={16} className="text-[#10B981]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#F5F5F3]/80">FitPro Studio</p>
                <p className="text-[9px] text-[#10B981]/60">Ton branding, ton app</p>
              </div>
            </div>
            <div className="space-y-2.5 relative z-10">
              <div className="h-8 rounded-lg bg-[#10B981]/10 border border-[#10B981]/15 flex items-center px-3">
                <span className="text-[9px] font-medium text-[#10B981]/70">Séance du jour</span>
              </div>
              <div className="h-8 rounded-lg bg-[#10B981]/[0.06] border border-[#10B981]/10 flex items-center px-3">
                <span className="text-[9px] font-medium text-[#10B981]/50">Plan nutrition</span>
              </div>
              <div className="h-8 rounded-lg bg-[#10B981]/[0.04] border border-[#10B981]/[0.08] flex items-center px-3">
                <span className="text-[9px] font-medium text-[#10B981]/40">Messages (2)</span>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 relative z-10">
              <div className="w-6 h-6 rounded-full bg-[#10B981]/20 border border-[#10B981]/25" />
              <span className="text-[10px] font-medium text-[#F5F5F3]/40">Lucas M.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function AppBuilderPage() {
  return (
    <FeaturePageLayout
      badge="App Builder"
      badgeIcon={Paintbrush}
      title="Ton app,"
      titleAccent="a ton image"
      subtitle="Logo, couleurs, modules — personnalise tout. Tes clients pensent qu'ils utilisent TA propre application."
      stats={[
        { value: '100%', label: 'personnalisable' },
        { value: '0', label: 'code requis' },
        { value: 'Premium', label: 'experience client' },
      ]}
      mockup={<AppBuilderMockup />}
      features={[
        { icon: Image, title: 'Branding logo & couleurs', desc: "Upload ton logo, choisis ta couleur primaire. Ton identite visuelle partout dans l'app." },
        { icon: ToggleRight, title: 'Modules au choix', desc: "Active ou désactive chaque module selon ton offre. Entraînement, nutrition, messagerie — à toi de composer." },
        { icon: Eye, title: 'Preview live', desc: "Vois les changements en temps réel avant de publier. Ce que tu vois, c'est ce que tes clients verront." },
        { icon: Crown, title: 'Expérience premium', desc: "Tes clients découvrent une app professionnelle à ton image. Ils pensent que c'est la tienne." },
        { icon: Globe, title: 'Domaine personnalisé', desc: "Connecte ton propre domaine pour une expérience 100% branded. moncoaching.com — c'est toi." },
        { icon: UserCheck, title: 'Onboarding à ta marque', desc: "Accueil personnalisé pour chaque nouveau client. Première impression parfaite, à ton image." },
      ]}
      stepsTitle="Personnalise en 3 clics"
      steps={[
        { title: 'Uploade ton logo', desc: "Ajoute ton logo et ton nom de marque. L'app s'adapte instantanement a ton identite." },
        { title: 'Choisis tes couleurs', desc: "Sélectionne ta couleur primaire. Boutons, accents, icônes — tout s'harmonise automatiquement." },
        { title: 'Active tes modules', desc: "Coche les fonctionnalités que tu veux proposer. Publie et tes clients voient le changement immédiatement." },
      ]}
      extraSection={<BeforeAfterSection />}
      ctaTitle="Prêt à créer ton app"
      ctaAccent="à ton image"
    />
  )
}
