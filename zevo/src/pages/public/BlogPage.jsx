import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Clock } from 'lucide-react'
import { ZevoLogo } from '../../components/ui/ZevoLogo'
import SEO from '../../components/SEO'

const ARTICLES = [
  {
    title: 'Comment choisir son logiciel coach sportif en 2026',
    excerpt: 'Comparatif des criteres essentiels pour selectionner la bonne plateforme coaching : fonctionnalites, prix, ergonomie et support.',
    category: 'Guide',
    readTime: '8 min',
    date: '9 avril 2026',
  },
  {
    title: '5 erreurs qui font fuir les clients d\'un coach sportif',
    excerpt: 'Les erreurs les plus courantes dans le suivi client coaching et comment les eviter pour ameliorer ta retention.',
    category: 'Business',
    readTime: '5 min',
    date: '5 avril 2026',
  },
  {
    title: 'Programmes sport en ligne : comment augmenter le taux de completion',
    excerpt: 'Les techniques pour creer des programmes que tes clients terminent vraiment. UX, gamification et relances automatiques.',
    category: 'Coaching',
    readTime: '6 min',
    date: '1 avril 2026',
  },
  {
    title: 'Facturation coach sportif : automatise et arrete de perdre du temps',
    excerpt: 'Comment passer de la facturation manuelle a l\'encaissement automatique avec Stripe. Tutoriel pas a pas.',
    category: 'Tutoriel',
    readTime: '4 min',
    date: '28 mars 2026',
  },
  {
    title: 'App coach bien-etre : pourquoi tes clients veulent une experience brandee',
    excerpt: 'L\'impact du branding sur la perception de valeur et comment augmenter tes tarifs de 40% grace a une app personnalisee.',
    category: 'Business',
    readTime: '7 min',
    date: '22 mars 2026',
  },
  {
    title: 'Le guide complet du suivi nutritionnel pour coachs',
    excerpt: 'Comment integrer la nutrition dans ton offre coaching. Macros, plans alimentaires et outils pour automatiser le suivi.',
    category: 'Coaching',
    readTime: '10 min',
    date: '15 mars 2026',
  },
]

const CATEGORY_COLORS = {
  Guide: '#3B82F6',
  Business: '#FF5C1A',
  Coaching: '#10B981',
  Tutoriel: '#F59E0B',
}

export default function BlogPage() {
  const navigate = useNavigate()
  const clash = "'Clash Display', 'Inter', sans-serif"
  const instrument = "'Instrument Sans', 'Inter', sans-serif"

  return (
    <div className="min-h-screen bg-[#060606] text-[#F5F5F3]" style={{ fontFamily: instrument }}>
      <SEO
        title="Blog — Conseils pour coachs sportifs"
        description="Articles, guides et tutoriels pour les coachs sportifs : logiciel de gestion coaching, programmes sport en ligne, facturation, nutrition et marketing."
        url="/blog"
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-[#F5F5F3]/35 font-medium mb-6">
              <BookOpen size={12} className="text-[#FF5C1A]" /> Blog Zevo
            </div>
            <h1 className="text-3xl md:text-[3rem] font-bold tracking-tight leading-[1.1] mb-5" style={{ fontFamily: clash }}>
              Ressources pour coachs{' '}
              <span className="bg-gradient-to-r from-[#FF5C1A] to-[#FF7A42] bg-clip-text text-transparent">ambitieux</span>
            </h1>
            <p className="text-lg text-[#F5F5F3]/35 max-w-xl">
              Guides pratiques, tutoriels et conseils pour developper ton activite de coaching sportif et bien-etre.
            </p>
          </div>

          {/* Articles */}
          <div className="space-y-4">
            {ARTICLES.map((article, i) => (
              <article
                key={i}
                className="group rounded-2xl border border-white/[0.06] p-6 hover:border-[#FF5C1A]/20 transition-all duration-300 cursor-pointer bg-gradient-to-br from-white/[0.025] to-white/[0.008]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ color: CATEGORY_COLORS[article.category], background: `${CATEGORY_COLORS[article.category]}15` }}>
                        {article.category}
                      </span>
                      <span className="text-[11px] text-[#F5F5F3]/20 flex items-center gap-1"><Clock size={10} /> {article.readTime}</span>
                      <span className="text-[11px] text-[#F5F5F3]/15">{article.date}</span>
                    </div>
                    <h2 className="text-base md:text-lg font-semibold mb-2 text-[#F5F5F3] group-hover:text-white transition-colors" style={{ fontFamily: clash }}>
                      {article.title}
                    </h2>
                    <p className="text-sm text-[#F5F5F3]/30 leading-relaxed">{article.excerpt}</p>
                  </div>
                  <ArrowRight size={16} className="text-[#F5F5F3]/10 group-hover:text-[#FF5C1A] transition-colors mt-2 flex-shrink-0" />
                </div>
              </article>
            ))}
          </div>

          {/* Coming soon */}
          <div className="text-center mt-12 py-8 rounded-2xl border border-dashed border-white/[0.06]">
            <p className="text-sm text-[#F5F5F3]/25">D'autres articles arrivent bientot.</p>
            <p className="text-xs text-[#F5F5F3]/15 mt-1">Le blog est en cours de creation. Reviens vite !</p>
          </div>
        </div>
      </main>
    </div>
  )
}
