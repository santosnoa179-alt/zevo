import { useNavigate } from 'react-router-dom'
import {
  Dumbbell, ClipboardList, Utensils, CalendarDays, Users,
  MessageCircle, BookOpen, BarChart3, Paintbrush, CreditCard,
  UserPlus, ArrowRight, Zap
} from 'lucide-react'
import { ZevoLogo } from '../../components/ui/ZevoLogo'
import SEO from '../../components/SEO'

const FEATURES = [
  {
    icon: Users, title: 'Hub Client 360 — Suivi client coaching',
    desc: 'Centralise objectifs, mensurations, score bien-être et historique de chaque client dans une fiche unique. Repère un client en difficulté en 3 secondes.',
    path: '/features/hub-client',
  },
  {
    icon: Dumbbell, title: 'Programmes sport en ligne',
    desc: 'Crée des programmes multi-semaines en drag & drop. Tes clients suivent leurs séances avec vidéos démo et validation en temps réel.',
    path: '/features/programmes',
  },
  {
    icon: Utensils, title: 'Plans nutritionnels & macros',
    desc: 'Génère des plans alimentaires personnalisés avec calcul de macros automatique. Le suivi nutritionnel que tes clients attendent.',
    path: '/features/nutrition',
  },
  {
    icon: CalendarDays, title: 'Calendrier & réservations',
    desc: 'Tes clients réservent leurs créneaux en un clic. Synchronisation automatique, rappels et gestion des annulations.',
    path: '/features/calendrier',
  },
  {
    icon: MessageCircle, title: 'Messagerie intégrée',
    desc: 'Chat en temps réel avec envoi audio, photos et fichiers. Fini les conversations WhatsApp éparpillées.',
    path: '/features/messagerie',
  },
  {
    icon: CreditCard, title: 'Facturation coach sportif automatique',
    desc: 'Connecte Stripe en un clic. Crée tes offres, tes clients paient directement. Abonnements, factures et relances automatiques.',
    path: '/features/paiements',
  },
  {
    icon: Paintbrush, title: 'App Builder — Application coach sportif personnalisée',
    desc: 'Personnalise ton logo, tes couleurs, tes modules. Tes clients pensent utiliser ta propre application de coaching.',
    path: '/features/app-builder',
  },
  {
    icon: BarChart3, title: 'Statistiques & rapports PDF',
    desc: 'Dashboards clairs, graphiques automatiques, export PDF. Prouve l\'impact de ton coaching avec des chiffres concrets.',
    path: '/features/statistiques',
  },
  {
    icon: ClipboardList, title: 'Formulaires & bilans automatisés',
    desc: 'Check-in hebdomadaire, bilan initial, questionnaire satisfaction. Zéro paperasse, tout est automatisé.',
    path: '/features/formulaires',
  },
  {
    icon: BookOpen, title: 'Bibliothèque de ressources',
    desc: 'Partage vidéos, PDF et guides avec tes clients. Organise tes contenus par catégorie et contrôle les accès.',
    path: '/features/bibliotheque',
  },
  {
    icon: UserPlus, title: 'CRM prospects & pipeline',
    desc: 'Suis tes prospects du premier contact à la conversion. Pipeline visuel, relances automatiques, taux de conversion.',
    path: '/features/prospects',
  },
  {
    icon: Dumbbell, title: 'Suivi d\'entraînement en direct',
    desc: 'Tes clients valident leurs exercices en temps réel. Tu vois leur progression séance par séance, sans rien demander.',
    path: '/features/entrainement',
  },
]

export default function FonctionnalitesPage() {
  const navigate = useNavigate()
  const clash = "'Clash Display', 'Inter', sans-serif"
  const instrument = "'Instrument Sans', 'Inter', sans-serif"

  return (
    <div className="min-h-screen bg-[#060606] text-[#F5F5F3]" style={{ fontFamily: instrument }}>
      <SEO
        title="Fonctionnalités — Logiciel coach sportif"
        description="Découvre les 12 fonctionnalités du logiciel coach sportif Zevo : suivi client coaching, programmes sport en ligne, nutrition, facturation, messagerie et App Builder."
        url="/fonctionnalites"
      />

      {/* Nav simple */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#060606]/70 backdrop-blur-2xl border-b border-white/[0.06] py-3">
        <div className="max-w-6xl mx-auto px-5 md:px-8 flex items-center justify-between">
          <button onClick={() => navigate('/')}><ZevoLogo size="md" /></button>
          <button onClick={() => navigate('/register')} className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] text-white text-sm font-semibold">
            Essai gratuit
          </button>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="max-w-3xl mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-[#F5F5F3]/35 font-medium mb-6">
              <Zap size={12} className="text-[#FF5C1A]" /> 12 fonctionnalités
            </div>
            <h1 className="text-3xl md:text-[3.5rem] font-bold tracking-tight leading-[1.1] mb-6" style={{ fontFamily: clash }}>
              Tout ce dont un coach a besoin.{' '}
              <span className="bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] bg-clip-text text-transparent">Dans un seul logiciel.</span>
            </h1>
            <p className="text-lg text-[#F5F5F3]/35 max-w-2xl">
              Zevo réunit suivi client coaching, programmes sport en ligne, plans nutritionnels, facturation coach sportif et branding dans une seule plateforme coaching pensée pour les professionnels en France.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <button
                  key={i}
                  onClick={() => navigate(f.path)}
                  className="group text-left rounded-2xl border border-white/[0.06] p-6 hover:border-[#FF5C1A]/20 transition-all duration-300 bg-gradient-to-br from-white/[0.025] to-white/[0.008] backdrop-blur-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FF5C1A]/10 border border-[#FF5C1A]/10 flex items-center justify-center mb-4 group-hover:bg-[#FF5C1A]/15 group-hover:shadow-[0_0_20px_rgba(255,92,26,0.15)] transition-all">
                    <Icon size={18} className="text-[#FF5C1A]" />
                  </div>
                  <h2 className="text-sm font-semibold mb-2 text-[#F5F5F3] group-hover:text-white transition-colors" style={{ fontFamily: clash }}>{f.title}</h2>
                  <p className="text-xs text-[#F5F5F3]/30 leading-relaxed mb-3">{f.desc}</p>
                  <span className="text-[11px] text-[#FF5C1A] font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    En savoir plus <ArrowRight size={10} />
                  </span>
                </button>
              )
            })}
          </div>

          {/* CTA bottom */}
          <div className="text-center mt-16">
            <button onClick={() => navigate('/register')} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] text-white font-semibold text-base hover:shadow-2xl hover:shadow-[#FF5C1A]/30 transition-all inline-flex items-center gap-2.5">
              Tester gratuitement 14 jours <ArrowRight size={18} />
            </button>
            <p className="text-xs text-[#F5F5F3]/20 mt-4">Sans carte bancaire · Toutes les fonctionnalités incluses</p>
          </div>
        </div>
      </main>
    </div>
  )
}
