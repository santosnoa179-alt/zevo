import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import {
  Save, Upload, Loader2, Check, Lock, Sparkles, Smartphone,
  LayoutDashboard, CheckSquare, Target, MessageSquare, User,
  Moon, Heart, Dumbbell, RotateCcw, Crown, ArrowRight,
  Palette, Type, Image, ToggleLeft, Zap, Star, Quote,
  CheckCircle, X
} from 'lucide-react'

// ── Couleurs prédéfinies ──
const PRESETS = ['#FF6B2B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#06B6D4', '#14B8A6', '#F97316']

// ── Modules configurables ──
const MODULES_CONFIG = [
  { key: 'habitudes', label: 'Habitudes', icon: CheckSquare, desc: 'Suivi des habitudes quotidiennes' },
  { key: 'objectifs', label: 'Objectifs', icon: Target, desc: 'Objectifs avec progression' },
  { key: 'sport', label: 'Sport', icon: Dumbbell, desc: 'Suivi activité physique' },
  { key: 'sommeil', label: 'Sommeil', icon: Moon, desc: 'Heures & qualité de sommeil' },
  { key: 'humeur', label: 'Humeur', icon: Heart, desc: 'Score humeur quotidien' },
  { key: 'routines', label: 'Routines', icon: RotateCcw, desc: 'Routines matin / soir' },
]

// ── Plans autorisés pour l'App Builder ──
const PLANS_AUTORISES = ['pro', 'unlimited']

// ── Comparatif plans (pour le paywall) ──
const PLAN_FEATURES = [
  { label: 'Nombre de clients', starter: '5', pro: '20', unlimited: 'Illimité' },
  { label: 'App Builder / Marque Blanche', starter: false, pro: true, unlimited: true },
  { label: 'Logo & couleurs personnalisés', starter: false, pro: true, unlimited: true },
  { label: 'Modules configurables', starter: false, pro: true, unlimited: true },
  { label: 'Nom d\'app personnalisé', starter: false, pro: true, unlimited: true },
  { label: 'Support prioritaire', starter: false, pro: false, unlimited: true },
]

export default function CoachAppBuilderPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  // État coach
  const [plan, setPlan] = useState('starter')
  const [coachPrenom, setCoachPrenom] = useState('')
  const [loading, setLoading] = useState(true)

  // États du builder
  const [nomApp, setNomApp] = useState('Zevo')
  const [logoUrl, setLogoUrl] = useState('')
  const [couleur, setCouleur] = useState('#FF6B2B')
  const [messageBienvenue, setMessageBienvenue] = useState('')
  const [modules, setModules] = useState({
    habitudes: true, objectifs: true, sport: true,
    sommeil: true, humeur: true, routines: true,
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  const hasAccess = PLANS_AUTORISES.includes(plan)

  // Charger les données du coach
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await supabase
        .from('coaches')
        .select('prenom, nom_app, logo_url, couleur_primaire, message_bienvenue, modules, plan')
        .eq('id', user.id)
        .single()

      if (data) {
        setCoachPrenom(data.prenom || 'Coach')
        setNomApp(data.nom_app || 'Zevo')
        setLogoUrl(data.logo_url || '')
        setCouleur(data.couleur_primaire || '#FF6B2B')
        setMessageBienvenue(data.message_bienvenue || '')
        setPlan(data.plan || 'starter')
        if (data.modules) setModules(prev => ({ ...prev, ...data.modules }))
      }
      setLoading(false)
    }
    load()
  }, [user])

  // Upload du logo
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `logos/${user.id}.${ext}`
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (error) {
      toast.error('Erreur upload logo')
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
    setLogoUrl(urlData.publicUrl)
    setUploading(false)
    toast.success('Logo mis à jour')
  }

  // Toggle module
  const toggleModule = (key) => {
    setModules(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Sauvegarder
  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    const { error } = await supabase
      .from('coaches')
      .update({
        nom_app: nomApp,
        logo_url: logoUrl,
        couleur_primaire: couleur,
        message_bienvenue: messageBienvenue,
        modules,
      })
      .eq('id', user.id)

    if (error) {
      toast.error(`Erreur : ${error.message}`)
    } else {
      toast.success('App Builder sauvegardé !')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#FF6B2B]" size={32} />
      </div>
    )
  }

  // ════════════════════════════════════════════════════════
  // PAYWALL — Plans non autorisés (Starter, etc.)
  // ════════════════════════════════════════════════════════
  if (!hasAccess) {
    return (
      <div className="p-4 md:p-6 w-full max-w-5xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F3]">App Builder</h1>
          <p className="text-white/40 text-sm mt-1">Personnalisez l'application à vos couleurs</p>
        </div>

        {/* Preview floutée + Overlay */}
        <div className="relative rounded-2xl overflow-hidden">
          {/* Fausse interface en arrière-plan — plus réaliste */}
          <div className="blur-[6px] pointer-events-none opacity-30 select-none">
            <div className="grid grid-cols-[1fr_340px] gap-6 p-6">
              {/* Colonne contrôles */}
              <div className="space-y-5">
                <div className="bg-[#1E1E1E] rounded-xl p-5 space-y-4">
                  <div className="h-5 w-32 bg-[#2A2A2A] rounded" />
                  <div className="h-10 w-full bg-[#2A2A2A] rounded-lg" />
                  <div className="flex gap-2">
                    {PRESETS.slice(0, 8).map(c => (
                      <div key={c} className="w-8 h-8 rounded-full" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-[#2A2A2A] rounded-xl" />
                    <div className="h-9 w-28 bg-[#2A2A2A] rounded-lg" />
                  </div>
                </div>
                <div className="bg-[#1E1E1E] rounded-xl p-5 space-y-3">
                  <div className="h-5 w-36 bg-[#2A2A2A] rounded" />
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="h-16 bg-[#2A2A2A] rounded-xl" />
                    ))}
                  </div>
                </div>
              </div>
              {/* Colonne preview mobile */}
              <div className="flex flex-col items-center">
                <div className="w-[260px] h-[500px] bg-black rounded-[2.5rem] p-2">
                  <div className="bg-[#0D0D0D] rounded-[2rem] h-full">
                    <div className="flex justify-center pt-3">
                      <div className="w-20 h-5 bg-black rounded-full" />
                    </div>
                    <div className="p-4 space-y-3 mt-2">
                      <div className="h-4 w-28 bg-[#1E1E1E] rounded" />
                      <div className="h-20 bg-[#1E1E1E] rounded-xl" />
                      <div className="h-16 bg-[#1E1E1E] rounded-xl" />
                      <div className="h-16 bg-[#1E1E1E] rounded-xl" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Overlay principal ── */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Fond gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0D0D0D]/70 via-[#0D0D0D]/80 to-[#0D0D0D]/90" />

            {/* Card centrale */}
            <div className="relative z-10 max-w-lg w-full">
              <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-8 text-center shadow-2xl shadow-black/40">
                {/* Glow */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#FF6B2B]/15 rounded-full blur-[60px] pointer-events-none" />

                {/* Lock icon */}
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B2B] to-[#FF9A6C] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#FF6B2B]/25">
                  <Lock size={30} className="text-white" />
                </div>

                {/* Badge */}
                <span className="inline-flex items-center gap-1.5 bg-[#FF6B2B]/10 text-[#FF6B2B] text-xs font-bold px-3 py-1 rounded-full mb-4">
                  <Crown size={12} />
                  Fonctionnalité Premium
                </span>

                {/* Titre */}
                <h2 className="text-[#F5F5F3] text-2xl font-bold mb-3">
                  Passez en Marque Blanche
                </h2>

                {/* Sous-titre */}
                <p className="text-white/45 text-sm leading-relaxed mb-6 max-w-sm mx-auto">
                  Personnalisez l'application à vos couleurs et avec votre logo pour offrir
                  une expérience 100% premium à vos clients.
                </p>

                {/* Social proof */}
                <div className="bg-[#0D0D0D] rounded-xl p-4 mb-6 border border-[#27272a]">
                  <div className="flex items-start gap-3">
                    <Quote size={16} className="text-[#FF6B2B] flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="text-white/50 text-xs italic leading-relaxed">
                        "Mes clients pensent que c'est ma propre application. Ça a complètement
                        professionnalisé mon image de coach."
                      </p>
                      <p className="text-white/25 text-[10px] mt-2 font-medium">— Coach utilisant le plan Pro</p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={() => navigate('/pricing')}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white px-6 py-3.5 rounded-xl text-sm font-bold hover:from-[#e55e24] hover:to-[#e57d4a] transition-all shadow-lg shadow-[#FF6B2B]/20"
                >
                  <Sparkles size={16} />
                  Découvrir le plan Pro — 59€/mois
                  <ArrowRight size={16} />
                </button>

                <p className="text-white/20 text-[11px] mt-3">
                  Votre plan actuel : <span className="capitalize text-white/30">{plan}</span>
                </p>
              </div>

              {/* ── Mini comparatif ── */}
              <div className="mt-6 bg-[#18181b] border border-[#27272a] rounded-2xl p-6 shadow-xl shadow-black/30">
                <h3 className="text-[#F5F5F3] text-sm font-semibold mb-4 text-center">Comparatif des plans</h3>

                <div className="space-y-0">
                  {/* Header */}
                  <div className="grid grid-cols-4 gap-2 pb-3 border-b border-[#27272a]">
                    <div />
                    <div className="text-center">
                      <p className="text-white/30 text-[10px] font-semibold uppercase">Starter</p>
                      <p className="text-white/20 text-[10px]">39€</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[#FF6B2B] text-[10px] font-bold uppercase">Pro</p>
                      <p className="text-[#FF6B2B]/60 text-[10px]">59€</p>
                    </div>
                    <div className="text-center">
                      <p className="text-amber-400 text-[10px] font-bold uppercase">Unlimited</p>
                      <p className="text-amber-400/60 text-[10px]">79€</p>
                    </div>
                  </div>

                  {/* Rows */}
                  {PLAN_FEATURES.map((f, i) => (
                    <div key={i} className={`grid grid-cols-4 gap-2 py-2.5 ${i < PLAN_FEATURES.length - 1 ? 'border-b border-[#27272a]/50' : ''}`}>
                      <p className="text-white/40 text-xs">{f.label}</p>
                      {['starter', 'pro', 'unlimited'].map(p => (
                        <div key={p} className="flex justify-center">
                          {typeof f[p] === 'boolean' ? (
                            f[p] ? (
                              <CheckCircle size={14} className={p === 'pro' ? 'text-[#FF6B2B]' : p === 'unlimited' ? 'text-amber-400' : 'text-green-400'} />
                            ) : (
                              <X size={14} className="text-white/10" />
                            )
                          ) : (
                            <span className={`text-xs font-medium ${
                              p === 'pro' ? 'text-[#FF6B2B]' : p === 'unlimited' ? 'text-amber-400' : 'text-white/30'
                            }`}>
                              {f[p]}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Aperçu mockup avec nom du coach */}
              <div className="mt-6 bg-[#18181b] border border-[#27272a] rounded-2xl p-5 shadow-xl shadow-black/30">
                <p className="text-white/25 text-[10px] font-semibold uppercase tracking-wider mb-3 text-center">
                  Aperçu de votre future app
                </p>
                <div className="mx-auto w-[200px]">
                  <div className="bg-black rounded-[1.5rem] p-1.5">
                    <div className="bg-[#0D0D0D] rounded-[1.2rem] overflow-hidden" style={{ minHeight: 280 }}>
                      {/* Notch */}
                      <div className="flex justify-center pt-1.5 pb-1">
                        <div className="w-16 h-3.5 bg-black rounded-full" />
                      </div>
                      {/* Header avec le nom du coach */}
                      <div className="px-3 py-2 flex items-center gap-2 border-b border-white/[0.06]">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[8px] font-bold bg-[#FF6B2B]">
                          {(coachPrenom || 'Z')[0].toUpperCase()}
                        </div>
                        <span className="text-[#F5F5F3] text-[10px] font-semibold">
                          {coachPrenom ? `${coachPrenom} Coaching` : 'Votre App'}
                        </span>
                      </div>
                      {/* Faux contenu */}
                      <div className="p-3 space-y-2">
                        <p className="text-[#F5F5F3] text-[9px] font-semibold">Bonjour, Marie 👋</p>
                        <div className="h-12 bg-[#FF6B2B]/10 rounded-lg border border-[#FF6B2B]/20 flex items-center justify-center">
                          <span className="text-[#FF6B2B] text-[9px] font-bold">Score : 78%</span>
                        </div>
                        <div className="h-8 bg-[#1E1E1E] rounded-lg" />
                        <div className="h-8 bg-[#1E1E1E] rounded-lg" />
                        <div className="h-8 bg-[#1E1E1E] rounded-lg" />
                      </div>
                      {/* Nav bar */}
                      <div className="absolute bottom-0 left-0 right-0 bg-[#1E1E1E] border-t border-white/[0.06] px-2 py-1.5">
                        <div className="flex justify-around">
                          {['🏠', '💪', '📊', '💬', '👤'].map((e, i) => (
                            <span key={i} className={`text-[10px] ${i === 0 ? '' : 'opacity-30'}`}>{e}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-white/15 text-[10px] text-center mt-3">
                  Votre nom et couleurs seront appliqués automatiquement
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════
  // APP BUILDER — Plans Pro / Unlimited
  // ════════════════════════════════════════════════════════
  const activeNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', visible: true },
    ...MODULES_CONFIG
      .filter(m => modules[m.key])
      .map(m => ({ icon: m.icon, label: m.label, visible: true })),
    { icon: MessageSquare, label: 'Messages', visible: true },
    { icon: User, label: 'Profil', visible: true },
  ]

  return (
    <div className="p-4 md:p-6 w-full max-w-[1200px]">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#F5F5F3]">App Builder</h1>
            <span className="inline-flex items-center gap-1 bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-bold px-2 py-0.5 rounded-full">
              <Crown size={10} />
              {plan === 'unlimited' ? 'UNLIMITED' : 'PRO'}
            </span>
          </div>
          <p className="text-white/40 text-sm mt-1">Personnalisez l'app de vos clients en temps réel</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 hover:opacity-90"
          style={{ backgroundColor: couleur }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
          {saving ? 'Enregistrement...' : saved ? 'Enregistré ✓' : 'Sauvegarder'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        {/* ── Colonne gauche : Contrôles ── */}
        <div className="space-y-5">

          {/* Section Identité */}
          <section className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#FF6B2B]/10">
                <Palette size={18} className="text-[#FF6B2B]" />
              </div>
              <h2 className="text-[#F5F5F3] font-semibold">Identité de l'app</h2>
            </div>

            {/* Nom de l'app */}
            <div>
              <label className="flex items-center gap-2 text-sm text-white/50 mb-1.5">
                <Type size={14} />
                Nom de l'app
              </label>
              <input
                type="text"
                value={nomApp}
                onChange={(e) => setNomApp(e.target.value)}
                placeholder="Ex : FitCoach, WellnessApp"
                className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
              />
              <p className="text-white/20 text-xs mt-1">Vos clients verront ce nom au lieu de "Zevo"</p>
            </div>

            {/* Logo */}
            <div>
              <label className="flex items-center gap-2 text-sm text-white/50 mb-1.5">
                <Image size={14} />
                Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-[#09090b] border border-[#27272a] flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold" style={{ color: couleur, backgroundColor: `${couleur}10` }}>
                      {nomApp.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#09090b] border border-[#27272a] text-sm text-white/50 hover:text-white hover:border-[#3f3f46] transition-colors">
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploading ? 'Upload...' : 'Changer le logo'}
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  <p className="text-white/15 text-[10px]">PNG, SVG ou JPG · 512×512px recommandé</p>
                </div>
              </div>
            </div>

            {/* Couleur primaire */}
            <div>
              <label className="flex items-center gap-2 text-sm text-white/50 mb-2">
                <Palette size={14} />
                Couleur primaire
              </label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCouleur(c)}
                    className={`w-9 h-9 rounded-full border-2 transition-all relative ${
                      couleur === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c, boxShadow: couleur === c ? `0 0 20px ${c}40` : 'none' }}
                  >
                    {couleur === c && <Check size={14} className="text-white absolute inset-0 m-auto" />}
                  </button>
                ))}
                <label className="relative cursor-pointer">
                  <div className="w-9 h-9 rounded-full border-2 border-dashed border-[#27272a] flex items-center justify-center text-white/30 text-xs hover:border-[#3f3f46] transition-colors">
                    +
                  </div>
                  <input type="color" value={couleur} onChange={(e) => setCouleur(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                </label>
              </div>
              <div className="flex items-center gap-2 mt-2.5">
                <div className="w-5 h-5 rounded" style={{ backgroundColor: couleur }} />
                <span className="text-white/30 text-xs font-mono">{couleur}</span>
                <div className="ml-2 h-5 w-24 rounded" style={{ background: `linear-gradient(90deg, ${couleur}, ${couleur}40)` }} />
              </div>
            </div>
          </section>

          {/* Section Modules */}
          <section className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <ToggleLeft size={18} className="text-purple-400" />
              </div>
              <div>
                <h2 className="text-[#F5F5F3] font-semibold">Modules visibles</h2>
                <p className="text-white/30 text-xs">Activez ou désactivez les modules que vos clients voient</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODULES_CONFIG.map(({ key, label, icon: Icon, desc }) => (
                <button
                  key={key}
                  onClick={() => toggleModule(key)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    modules[key]
                      ? 'border-white/[0.08] bg-white/[0.02]'
                      : 'border-[#27272a] bg-transparent opacity-40'
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: modules[key] ? `${couleur}15` : 'transparent' }}
                  >
                    <Icon size={18} style={{ color: modules[key] ? couleur : 'rgba(255,255,255,0.2)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#F5F5F3] text-sm font-medium">{label}</p>
                    <p className="text-white/25 text-xs truncate">{desc}</p>
                  </div>
                  <div className={`w-10 h-[22px] rounded-full relative transition-colors ${
                    modules[key] ? '' : 'bg-white/10'
                  }`} style={{ backgroundColor: modules[key] ? couleur : undefined }}>
                    <span className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white transition-transform ${
                      modules[key] ? 'translate-x-[18px]' : 'translate-x-0'
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Section Message de bienvenue */}
          <section className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <MessageSquare size={18} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-[#F5F5F3] font-semibold">Message de bienvenue</h2>
                <p className="text-white/30 text-xs">Affiché au premier login de chaque nouveau client</p>
              </div>
            </div>
            <textarea
              value={messageBienvenue}
              onChange={(e) => setMessageBienvenue(e.target.value)}
              placeholder="Ex : Bienvenue dans ton espace coaching ! Je suis ravi de t'accompagner..."
              rows={3}
              className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-4 py-3 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors resize-none"
            />
          </section>
        </div>

        {/* ── Colonne droite : Preview mobile live ── */}
        <div className="lg:sticky lg:top-6 self-start">
          <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-3 text-center flex items-center justify-center gap-2">
            <Smartphone size={12} />
            Aperçu en temps réel
          </p>

          <div className="mx-auto w-[300px]">
            {/* Frame smartphone */}
            <div className="bg-[#000] rounded-[2.5rem] p-2 shadow-2xl shadow-black/50 ring-1 ring-white/[0.06]">
              <div className="bg-[#0D0D0D] rounded-[2rem] overflow-hidden relative" style={{ minHeight: 560 }}>

                {/* Notch */}
                <div className="flex justify-center pt-2 pb-1">
                  <div className="w-24 h-5 bg-black rounded-full" />
                </div>

                {/* Header app */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    {logoUrl ? (
                      <img src={logoUrl} alt="" className="w-6 h-6 rounded-md object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: couleur }}>
                        {nomApp.charAt(0)}
                      </div>
                    )}
                    <span className="text-[#F5F5F3] text-sm font-semibold">{nomApp || 'Mon App'}</span>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-white/10" />
                </div>

                {/* Contenu dashboard */}
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-[#F5F5F3] text-sm font-semibold">Bonjour, Marie 👋</p>
                    <p className="text-white/30 text-[10px]">Voici ton récap du jour</p>
                  </div>

                  {/* Score bien-être */}
                  <div className="rounded-xl p-3 border border-white/[0.06]" style={{ backgroundColor: `${couleur}08` }}>
                    <div className="flex items-center justify-between">
                      <p className="text-white/40 text-[10px]">Score bien-être</p>
                      <p className="text-lg font-bold" style={{ color: couleur }}>78%</p>
                    </div>
                    <div className="w-full h-1.5 bg-white/[0.06] rounded-full mt-2">
                      <div className="h-full rounded-full transition-colors" style={{ width: '78%', backgroundColor: couleur }} />
                    </div>
                  </div>

                  {/* Habitudes */}
                  {modules.habitudes && (
                    <div className="bg-[#1E1E1E] rounded-xl p-3">
                      <p className="text-white/40 text-[10px] font-semibold mb-2">HABITUDES DU JOUR</p>
                      <div className="space-y-2">
                        {['Méditation', 'Lecture 30min'].map((h, i) => (
                          <div key={h} className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              i === 0 ? '' : 'border-white/10'
                            }`} style={i === 0 ? { backgroundColor: couleur, borderColor: couleur } : {}}>
                              {i === 0 && <Check size={10} className="text-white" />}
                            </div>
                            <span className={`text-xs ${i === 0 ? 'text-white/30 line-through' : 'text-[#F5F5F3]'}`}>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Objectifs */}
                  {modules.objectifs && (
                    <div className="bg-[#1E1E1E] rounded-xl p-3">
                      <p className="text-white/40 text-[10px] font-semibold mb-2">OBJECTIF EN COURS</p>
                      <p className="text-[#F5F5F3] text-xs">Perdre 5kg</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full">
                          <div className="h-full rounded-full transition-colors" style={{ width: '60%', backgroundColor: couleur }} />
                        </div>
                        <span className="text-[10px]" style={{ color: couleur }}>60%</span>
                      </div>
                    </div>
                  )}

                  {/* Humeur */}
                  {modules.humeur && (
                    <div className="bg-[#1E1E1E] rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-white/40 text-[10px] font-semibold">HUMEUR</p>
                        <p className="text-[#F5F5F3] text-xs mt-0.5">Comment tu te sens ?</p>
                      </div>
                      <div className="flex gap-1.5">
                        {['😴', '😐', '😊', '😄', '🤩'].map((e, i) => (
                          <span key={e} className={`text-sm cursor-pointer ${i === 3 ? 'scale-125' : 'opacity-40'}`}>{e}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom nav */}
                <div className="absolute bottom-0 left-0 right-0 bg-[#1E1E1E] border-t border-white/[0.06] px-2">
                  <div className="flex items-center justify-around h-12">
                    {activeNavItems.slice(0, 5).map(({ icon: Icon, label }, i) => (
                      <div key={label} className="flex flex-col items-center gap-0.5">
                        <Icon size={14} style={{ color: i === 0 ? couleur : 'rgba(255,255,255,0.3)' }} />
                        <span className="text-[8px]" style={{ color: i === 0 ? couleur : 'rgba(255,255,255,0.3)' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Message de bienvenue preview */}
          {messageBienvenue && (
            <div className="mt-4 bg-[#18181b] border border-[#27272a] rounded-xl p-4">
              <p className="text-white/30 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Message de bienvenue</p>
              <p className="text-[#F5F5F3] text-xs leading-relaxed">{messageBienvenue}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
