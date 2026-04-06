import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, CalendarDays, Clock, Users, CheckCircle,
  Star, Shield, Zap, Video, MessageCircle, Sparkles,
  ChevronRight, Play, Heart
} from 'lucide-react'
import { ZevoLogo } from '../../components/ui/ZevoLogo'

const CAL_EMBED_URL = 'https://cal.com/zevo-app/demo-zevo'

const DEMO_BENEFITS = [
  { icon: Video, text: 'Demo personnalisee de 20 min en visio' },
  { icon: Users, text: 'On repond a toutes tes questions' },
  { icon: Zap, text: 'On configure ton espace ensemble si tu veux' },
  { icon: Shield, text: 'Zero engagement, zero pression' },
]

const QUICK_ANSWERS = [
  { q: 'Combien de temps dure la demo ?', a: '20 minutes. On va droit au but.' },
  { q: 'C\'est vraiment gratuit ?', a: 'Oui, 100% gratuit et sans engagement.' },
  { q: 'Je dois preparer quelque chose ?', a: 'Non, viens comme tu es. On s\'adapte a tes besoins.' },
]

export default function DemoPage() {
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F3]">

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0D0D0D]/70 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-3.5 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 text-[#F5F5F3]/50 hover:text-[#F5F5F3] transition-colors">
            <ArrowLeft size={16} />
            <ZevoLogo size="sm" />
          </button>
          <button
            onClick={() => navigate('/register')}
            className="px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.06] text-xs font-medium text-[#F5F5F3]/60 hover:bg-white/[0.08] hover:text-[#F5F5F3] transition-all"
          >
            Essai gratuit
          </button>
        </div>
      </header>

      <div className="pt-20 pb-20">
        <div className="max-w-6xl mx-auto px-5 md:px-8">

          {/* ── Hero ── */}
          <div className="text-center mb-12 md:mb-16 pt-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 mb-6">
              <CalendarDays size={14} className="text-[#FF6B2B]" />
              <span className="text-xs font-semibold text-[#FF6B2B]">Demo gratuite · 20 min</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
              Decouvre Zevo en{' '}
              <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">live</span>
            </h1>
            <p className="text-[#F5F5F3]/35 text-lg max-w-xl mx-auto leading-relaxed">
              Reserve un creneau et on te montre comment Zevo peut transformer ton coaching. Personnalise selon tes besoins.
            </p>
          </div>

          {/* ── Main content : 2 colonnes ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

            {/* Left — Infos + benefits */}
            <div className="lg:col-span-2 space-y-6">

              {/* Benefits card */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#141414] p-6">
                <h3 className="text-sm font-semibold text-[#F5F5F3] mb-5 flex items-center gap-2">
                  <Sparkles size={14} className="text-[#FF6B2B]" />
                  Ce qui t'attend
                </h3>
                <ul className="space-y-4">
                  {DEMO_BENEFITS.map((b, i) => {
                    const Icon = b.icon
                    return (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/10 border border-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon size={15} className="text-[#FF6B2B]" />
                        </div>
                        <span className="text-sm text-[#F5F5F3]/50 leading-relaxed">{b.text}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>

              {/* Quick Q&A */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#141414] p-6">
                <h3 className="text-sm font-semibold text-[#F5F5F3] mb-4">Questions rapides</h3>
                <div className="space-y-3">
                  {QUICK_ANSWERS.map((qa, i) => (
                    <div key={i} className="rounded-xl bg-white/[0.025] border border-white/[0.04] p-3.5">
                      <p className="text-xs font-medium text-[#F5F5F3]/60 mb-1">{qa.q}</p>
                      <p className="text-xs text-[#F5F5F3]/30">{qa.a}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social proof */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#141414] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {['#FF6B2B', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'].map((c, i) => (
                      <div key={i} className="w-7 h-7 rounded-full border-2 border-[#141414] flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: c, zIndex: 5 - i }}>
                        {['A', 'S', 'T', 'M', 'L'][i]}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex gap-0.5 mb-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} size={9} className="text-[#FF6B2B] fill-[#FF6B2B]" />)}
                    </div>
                    <p className="text-[10px] text-[#F5F5F3]/25">500+ coachs nous font confiance</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — Cal.com embed */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-white/[0.06] bg-[#141414] overflow-hidden relative">
                {/* Gradient accent */}
                <div className="h-1 bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E]" />

                {/* Header */}
                <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center">
                      <CalendarDays size={16} className="text-[#FF6B2B]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#F5F5F3]">Reserve ta demo</p>
                      <p className="text-[10px] text-[#F5F5F3]/25">Choisis le creneau qui t'arrange</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-medium">Creneaux dispo</span>
                  </div>
                </div>

                {/* Cal.com iframe */}
                <div className="relative min-h-[600px]">
                  {!loaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#141414]">
                      <div className="text-center space-y-3">
                        <div className="w-10 h-10 border-2 border-[#FF6B2B] border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-xs text-[#F5F5F3]/25">Chargement du calendrier...</p>
                      </div>
                    </div>
                  )}
                  <iframe
                    src={`${CAL_EMBED_URL}?embed=true&theme=dark&hideEventTypeDetails=false`}
                    className="w-full min-h-[600px] border-0"
                    onLoad={() => setLoaded(true)}
                    title="Reserver une demo Zevo"
                    allow="camera;microphone"
                  />
                </div>
              </div>

              {/* Trust bar */}
              <div className="flex items-center justify-center gap-6 mt-5 text-[#F5F5F3]/15 text-[10px]">
                <span className="flex items-center gap-1.5"><Shield size={10} /> Donnees securisees</span>
                <span className="flex items-center gap-1.5"><Clock size={10} /> 20 min max</span>
                <span className="flex items-center gap-1.5"><Heart size={10} /> Sans engagement</span>
              </div>
            </div>
          </div>

          {/* ── Alternative CTA ── */}
          <div className="mt-16 text-center">
            <div className="rounded-2xl border border-white/[0.05] bg-[#141414]/50 p-8 max-w-2xl mx-auto">
              <p className="text-sm text-[#F5F5F3]/40 mb-4">Tu preferes essayer par toi-meme ?</p>
              <button
                onClick={() => navigate('/register')}
                className="group px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[#FF6B2B]/25 transition-all inline-flex items-center gap-2"
              >
                Essai gratuit 14 jours
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
              <p className="text-[10px] text-[#F5F5F3]/15 mt-3">Sans carte bancaire · Toutes les fonctionnalites</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
