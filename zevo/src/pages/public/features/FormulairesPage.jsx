import FeaturePageLayout from '../../../components/FeaturePageLayout'
import {
  ClipboardList, GripVertical, LayoutTemplate, Send, FolderOpen,
  BarChart3, FileDown, Type, SlidersHorizontal, CircleDot, ListChecks,
  Star, Plus, Eye, Copy, Trash2, ChevronDown, CheckCircle, Hash, AlignLeft
} from 'lucide-react'

/* ── Mockup: Form builder ── */
function FormBuilderMockup() {
  const questions = [
    { type: 'text', label: 'Comment te sens-tu cette semaine ?', icon: AlignLeft, required: true },
    { type: 'scale', label: 'Niveau d\'energie (1-10)', icon: SlidersHorizontal, value: 7, required: true },
    { type: 'choice', label: 'As-tu respecte ton plan nutrition ?', icon: CircleDot, options: ['Oui completement', 'Partiellement', 'Non pas du tout'], selected: 0, required: false },
    { type: 'number', label: 'Nombre de seances cette semaine', icon: Hash, required: true },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-2xl border border-white/[0.06] bg-[#141414] overflow-hidden shadow-2xl shadow-black/40">

        {/* Top bar */}
        <div className="px-5 py-3.5 border-b border-white/[0.06] bg-[#111111] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B2B]/20 to-[#FF8F5E]/10 border border-[#FF6B2B]/15 flex items-center justify-center">
              <ClipboardList size={14} className="text-[#FF6B2B]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#F5F5F3]/80">Bilan Hebdomadaire</p>
              <p className="text-[10px] text-[#F5F5F3]/25">4 questions  -  Brouillon</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-colors">
              <Eye size={11} className="text-[#F5F5F3]/25" />
              <span className="text-[10px] text-[#F5F5F3]/25">Apercu</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] cursor-pointer">
              <Send size={11} className="text-white" />
              <span className="text-[10px] text-white font-semibold">Envoyer</span>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Left: Question types sidebar */}
          <div className="w-48 border-r border-white/[0.04] p-3.5 hidden md:block bg-[#0F0F0F]/50">
            <p className="text-[9px] font-semibold text-[#F5F5F3]/20 uppercase tracking-wider mb-3 px-2">Types de question</p>
            <div className="space-y-1">
              {[
                { icon: AlignLeft, label: 'Texte libre', active: false },
                { icon: SlidersHorizontal, label: 'Echelle 1-10', active: true },
                { icon: CircleDot, label: 'Choix multiple', active: false },
                { icon: Hash, label: 'Nombre', active: false },
                { icon: ListChecks, label: 'Cases a cocher', active: false },
                { icon: Star, label: 'Notation etoiles', active: false },
              ].map((qt, i) => {
                const Icon = qt.icon
                return (
                  <div key={i} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all ${qt.active ? 'bg-[#FF6B2B]/[0.08] border border-[#FF6B2B]/10' : 'border border-transparent hover:bg-white/[0.02]'}`}>
                    <Icon size={13} className={qt.active ? 'text-[#FF6B2B]' : 'text-[#F5F5F3]/20'} />
                    <span className={`text-[10px] font-medium ${qt.active ? 'text-[#F5F5F3]/70' : 'text-[#F5F5F3]/30'}`}>{qt.label}</span>
                  </div>
                )
              })}
            </div>

            {/* Templates */}
            <p className="text-[9px] font-semibold text-[#F5F5F3]/20 uppercase tracking-wider mt-5 mb-3 px-2">Templates</p>
            <div className="space-y-1">
              {['Bilan hebdo', 'Bilan mensuel', 'Onboarding', 'Satisfaction'].map((t, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/[0.02] cursor-pointer transition-all border border-transparent">
                  <LayoutTemplate size={11} className="text-[#F5F5F3]/15" />
                  <span className="text-[10px] text-[#F5F5F3]/25">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Main: Form builder */}
          <div className="flex-1 p-4">
            <div className="space-y-3">
              {questions.map((q, i) => {
                const QIcon = q.icon
                return (
                  <div key={i} className={`group rounded-xl border p-4 transition-all ${i === 1 ? 'border-[#FF6B2B]/15 bg-[#FF6B2B]/[0.03]' : 'border-white/[0.06] bg-[#0F0F0F] hover:border-white/[0.08]'}`}>
                    <div className="flex items-start gap-3">
                      {/* Drag handle */}
                      <div className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                        <GripVertical size={14} className="text-[#F5F5F3]/15" />
                      </div>

                      <div className="flex-1">
                        {/* Question header */}
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${i === 1 ? 'bg-[#FF6B2B]/15' : 'bg-white/[0.04]'}`}>
                            <QIcon size={12} className={i === 1 ? 'text-[#FF6B2B]' : 'text-[#F5F5F3]/25'} />
                          </div>
                          <span className="text-[11px] font-medium text-[#F5F5F3]/70 flex-1">{q.label}</span>
                          {q.required && (
                            <span className="text-[8px] font-semibold text-[#FF6B2B]/60 px-1.5 py-0.5 rounded bg-[#FF6B2B]/[0.06]">Requis</span>
                          )}
                        </div>

                        {/* Question preview */}
                        {q.type === 'text' && (
                          <div className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <span className="text-[10px] text-[#F5F5F3]/12">Le client ecrira sa reponse ici...</span>
                          </div>
                        )}
                        {q.type === 'scale' && (
                          <div className="flex items-center gap-1.5">
                            {[1,2,3,4,5,6,7,8,9,10].map(n => (
                              <div key={n} className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-semibold border transition-all ${n <= q.value ? 'bg-gradient-to-br from-[#FF6B2B]/20 to-[#FF8F5E]/10 border-[#FF6B2B]/15 text-[#FF6B2B]' : 'bg-white/[0.02] border-white/[0.04] text-[#F5F5F3]/15'}`}>
                                {n}
                              </div>
                            ))}
                          </div>
                        )}
                        {q.type === 'choice' && (
                          <div className="space-y-1.5">
                            {q.options.map((opt, j) => (
                              <div key={j} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${j === q.selected ? 'bg-[#FF6B2B]/[0.04] border-[#FF6B2B]/10' : 'bg-white/[0.015] border-white/[0.04]'}`}>
                                <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${j === q.selected ? 'border-[#FF6B2B]' : 'border-white/[0.1]'}`}>
                                  {j === q.selected && <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B2B]" />}
                                </div>
                                <span className={`text-[10px] ${j === q.selected ? 'text-[#F5F5F3]/60 font-medium' : 'text-[#F5F5F3]/25'}`}>{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {q.type === 'number' && (
                          <div className="w-24 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                            <span className="text-sm font-semibold text-[#F5F5F3]/15">0</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Copy size={12} className="text-[#F5F5F3]/15 hover:text-[#FF6B2B] cursor-pointer transition-colors" />
                        <Trash2 size={12} className="text-[#F5F5F3]/15 hover:text-red-400 cursor-pointer transition-colors" />
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Add question button */}
              <div className="flex items-center justify-center py-3 rounded-xl border border-dashed border-white/[0.06] hover:border-[#FF6B2B]/15 cursor-pointer transition-all group">
                <div className="flex items-center gap-2">
                  <Plus size={14} className="text-[#F5F5F3]/15 group-hover:text-[#FF6B2B] transition-colors" />
                  <span className="text-[10px] text-[#F5F5F3]/20 group-hover:text-[#F5F5F3]/40 font-medium transition-colors">Ajouter une question</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FormulairesPage() {
  return (
    <FeaturePageLayout
      badge="Formulaires & Bilans"
      badgeIcon={ClipboardList}
      title="Des bilans"
      titleAccent="automatises"
      subtitle="Cree des questionnaires personnalises, envoie-les a tes clients et recupere les reponses automatiquement."
      stats={[
        { value: '6', label: 'TYPES DE QUESTIONS' },
        { value: '4', label: 'TEMPLATES INCLUS' },
        { value: '< 30s', label: 'POUR CREER UN BILAN' },
      ]}
      mockup={<FormBuilderMockup />}
      features={[
        { icon: GripVertical, title: 'Builder drag & drop', desc: 'Construis tes formulaires visuellement. Glisse les questions, reorganise, personnalise sans coder.' },
        { icon: LayoutTemplate, title: 'Templates de bilans', desc: 'Bilan hebdo, mensuel, onboarding, satisfaction : des modeles prets a l\'emploi et modifiables.' },
        { icon: Send, title: 'Envoi automatique', desc: 'Programme l\'envoi de tes bilans a des dates precises. Le client recoit et repond depuis son espace.' },
        { icon: FolderOpen, title: 'Reponses centralisees', desc: 'Toutes les reponses de tes clients reunies au meme endroit. Filtres par client, date ou formulaire.' },
        { icon: BarChart3, title: 'Scoring automatique', desc: 'Les echelles et notations sont calculees automatiquement. Visualise les tendances en un clin d\'oeil.' },
        { icon: FileDown, title: 'Export PDF', desc: 'Exporte les bilans en PDF propre pour tes archives ou pour les partager avec le client.' },
      ]}
      stepsTitle="Automatise tes bilans"
      steps={[
        { title: 'Cree ton formulaire', desc: 'Choisis tes types de questions, personnalise le contenu et l\'ordre. Utilise un template ou pars de zero.' },
        { title: 'Envoie a tes clients', desc: 'Selectionne les clients ou programme un envoi automatique. Ils recoivent le bilan dans leur espace.' },
        { title: 'Analyse les reponses', desc: 'Les reponses arrivent en temps reel. Scores calcules, tendances visibles, donnees exploitables immediatement.' },
      ]}
      ctaTitle="Pret a automatiser"
      ctaAccent="tes bilans"
    />
  )
}
