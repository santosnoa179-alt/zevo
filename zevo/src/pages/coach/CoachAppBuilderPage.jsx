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
  CheckCircle, X, Trash2, Eye, Wifi, Battery, Signal
} from 'lucide-react'

// ── Couleurs predefinies ──
const PRESETS = ['#FF6B2B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#06B6D4', '#14B8A6', '#F97316']

// ── Modules configurables ──
const MODULES_CONFIG = [
  { key: 'habitudes', label: 'Habitudes', icon: CheckSquare, desc: 'Suivi des habitudes quotidiennes' },
  { key: 'objectifs', label: 'Objectifs', icon: Target, desc: 'Objectifs avec progression' },
  { key: 'sport', label: 'Sport', icon: Dumbbell, desc: 'Suivi activite physique' },
  { key: 'sommeil', label: 'Sommeil', icon: Moon, desc: 'Heures & qualite de sommeil' },
  { key: 'humeur', label: 'Humeur', icon: Heart, desc: 'Score humeur quotidien' },
  { key: 'routines', label: 'Routines', icon: RotateCcw, desc: 'Routines matin / soir' },
]

// ── Plans autorises pour l'App Builder ──
const PLANS_AUTORISES = ['pro', 'unlimited']

// ── Comparatif plans (pour le paywall) ──
const PLAN_FEATURES = [
  { label: 'Nombre de clients', starter: '5', pro: '20', unlimited: 'Illimite' },
  { label: 'App Builder / Marque Blanche', starter: false, pro: true, unlimited: true },
  { label: 'Logo & couleurs personnalises', starter: false, pro: true, unlimited: true },
  { label: 'Modules configurables', starter: false, pro: true, unlimited: true },
  { label: 'Nom d\'app personnalise', starter: false, pro: true, unlimited: true },
  { label: 'Support prioritaire', starter: false, pro: false, unlimited: true },
]

export default function CoachAppBuilderPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  // Etat coach
  const [plan, setPlan] = useState('starter')
  const [coachPrenom, setCoachPrenom] = useState('')
  const [loading, setLoading] = useState(true)

  // Etats du builder
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

  // Charger les donnees du coach
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
    toast.success('Logo mis a jour')
  }

  // Suppression du logo
  const handleDeleteLogo = async () => {
    if (!logoUrl || !user) return
    setUploading(true)
    try {
      const urlParts = logoUrl.split('/logos/')
      if (urlParts.length > 1) {
        const filePath = `logos/${urlParts[urlParts.length - 1].split('?')[0]}`
        await supabase.storage.from('logos').remove([filePath])
      }
      const { error } = await supabase.from('coaches').update({ logo_url: null }).eq('id', user.id)
      if (error) throw error
      setLogoUrl('')
      toast.success('Logo supprime avec succes.')
    } catch (err) {
      console.error('[AppBuilder] Erreur suppression logo:', err)
      toast.error('Erreur lors de la suppression du logo')
    }
    setUploading(false)
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
      toast.success('App Builder sauvegarde !')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  // ════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-[1200px] animate-page-enter">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-7 w-36 skel-block" />
            <div className="h-4 w-56 skel-block" />
          </div>
          <div className="h-10 w-32 skel-block rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-5">
            <div className="h-72 skel-block rounded-2xl" />
            <div className="h-56 skel-block rounded-2xl" />
            <div className="h-40 skel-block rounded-2xl" />
          </div>
          <div className="hidden lg:block">
            <div className="h-[620px] w-[300px] skel-block rounded-[2.5rem] mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════
  // PAYWALL — Plans non autorises (Starter, etc.)
  // ════════════════════════════════════════════════════════
  if (!hasAccess) {
    return (
      <div className="p-4 md:p-6 w-full max-w-5xl animate-page-enter">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center">
              <Smartphone size={20} className="text-[#FF6B2B]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">App Builder</h1>
              <p className="text-[var(--text-muted)] text-xs">Personnalisez l'application a vos couleurs</p>
            </div>
          </div>
        </div>

        {/* Preview floutee + Overlay */}
        <div className="relative rounded-2xl overflow-hidden">
          {/* Fausse interface en arriere-plan */}
          <div className="blur-[6px] pointer-events-none opacity-20 select-none">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-6 p-6">
              {/* Colonne controles */}
              <div className="space-y-5">
                <div className="glass-card p-5 space-y-4">
                  <div className="h-[2px] bg-gradient-to-r from-[#FF6B2B] via-[#FF8F5E]/40 to-transparent" />
                  <div className="h-5 w-32 bg-[var(--bg-surface)] rounded" />
                  <div className="h-10 w-full bg-[var(--bg-surface)] rounded-lg" />
                  <div className="flex gap-2">
                    {PRESETS.slice(0, 8).map(c => (
                      <div key={c} className="w-8 h-8 rounded-full" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-[var(--bg-surface)] rounded-xl" />
                    <div className="h-9 w-28 bg-[var(--bg-surface)] rounded-lg" />
                  </div>
                </div>
                <div className="glass-card p-5 space-y-3">
                  <div className="h-[2px] bg-gradient-to-r from-purple-500/60 via-purple-400/30 to-transparent" />
                  <div className="h-5 w-36 bg-[var(--bg-surface)] rounded" />
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="h-16 bg-[var(--bg-surface)] rounded-xl" />
                    ))}
                  </div>
                </div>
              </div>
              {/* Colonne preview mobile */}
              <div className="hidden md:flex flex-col items-center">
                <div className="w-[260px] h-[500px] bg-black rounded-[2.5rem] p-2">
                  <div className="bg-[var(--bg-base)] rounded-[2rem] h-full">
                    <div className="flex justify-center pt-3">
                      <div className="w-20 h-5 bg-black rounded-full" />
                    </div>
                    <div className="p-4 space-y-3 mt-2">
                      <div className="h-4 w-28 bg-[var(--bg-card)] rounded" />
                      <div className="h-20 bg-[var(--bg-card)] rounded-xl" />
                      <div className="h-16 bg-[var(--bg-card)] rounded-xl" />
                      <div className="h-16 bg-[var(--bg-card)] rounded-xl" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Overlay principal ── */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
            {/* Fond gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-base)]/60 via-[var(--bg-base)]/80 to-[var(--bg-base)]/95" />

            {/* Card centrale */}
            <div className="relative z-10 max-w-lg w-full">
              <div className="glass-card p-7 md:p-8 text-center shadow-2xl shadow-black/40">
                {/* Accent bar */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF6B2B] via-[#FF8F5E] to-transparent rounded-t-2xl" />

                {/* Glow */}
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-40 h-40 bg-[#FF6B2B]/12 rounded-full blur-[80px] pointer-events-none" />

                {/* Lock icon */}
                <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#FF6B2B]/25"
                  style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8F5E)' }}>
                  <Lock size={28} className="text-white" />
                </div>

                {/* Badge */}
                <span className="inline-flex items-center gap-1.5 bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-bold px-3 py-1 rounded-full mb-4">
                  <Crown size={11} />
                  Fonctionnalite Premium
                </span>

                {/* Titre */}
                <h2 className="text-[var(--text-primary)] text-xl md:text-2xl font-bold mb-2.5">
                  Passez en Marque Blanche
                </h2>

                {/* Sous-titre */}
                <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-6 max-w-sm mx-auto">
                  Personnalisez l'application a vos couleurs et avec votre logo pour offrir
                  une experience 100% premium a vos clients.
                </p>

                {/* Social proof */}
                <div className="glass-card p-4 mb-6 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Quote size={14} className="text-[#FF6B2B]" />
                    </div>
                    <div>
                      <p className="text-[var(--text-secondary)] text-xs italic leading-relaxed">
                        "Mes clients pensent que c'est ma propre application. Ca a completement
                        professionnalise mon image de coach."
                      </p>
                      <p className="text-[var(--text-muted)] text-[10px] mt-2 font-medium">-- Coach utilisant le plan Pro</p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={() => navigate('/pricing')}
                  className="w-full inline-flex items-center justify-center gap-2 text-white px-6 py-3.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-[#FF6B2B]/25 hover:shadow-[#FF6B2B]/35 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8F5E)' }}
                >
                  <Sparkles size={16} />
                  Decouvrir le plan Pro -- 59{'\u20AC'}/mois
                  <ArrowRight size={16} />
                </button>

                <p className="text-[var(--text-muted)] text-[11px] mt-3">
                  Votre plan actuel : <span className="capitalize text-[var(--text-secondary)] font-medium">{plan}</span>
                </p>
              </div>

              {/* ── Mini comparatif ── */}
              <div className="mt-5 glass-card p-5 md:p-6 shadow-xl shadow-black/20">
                <div className="h-[2px] bg-gradient-to-r from-amber-500/50 via-[#FF6B2B]/30 to-transparent absolute top-0 left-0 right-0" />
                <h3 className="text-[var(--text-primary)] text-sm font-semibold mb-4 text-center">Comparatif des plans</h3>

                <div className="space-y-0 overflow-x-auto">
                  {/* Header */}
                  <div className="grid grid-cols-4 gap-2 pb-3 border-b border-[var(--border-base)] min-w-[320px]">
                    <div />
                    <div className="text-center">
                      <p className="text-[var(--text-muted)] text-[10px] font-semibold uppercase">Starter</p>
                      <p className="text-[var(--text-muted)] text-[10px]">39{'\u20AC'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[#FF6B2B] text-[10px] font-bold uppercase">Pro</p>
                      <p className="text-[#FF6B2B]/60 text-[10px]">59{'\u20AC'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-amber-400 text-[10px] font-bold uppercase">Unlimited</p>
                      <p className="text-amber-400/60 text-[10px]">79{'\u20AC'}</p>
                    </div>
                  </div>

                  {/* Rows */}
                  {PLAN_FEATURES.map((f, i) => (
                    <div key={i} className={`grid grid-cols-4 gap-2 py-2.5 min-w-[320px] ${i < PLAN_FEATURES.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''}`}>
                      <p className="text-[var(--text-muted)] text-xs">{f.label}</p>
                      {['starter', 'pro', 'unlimited'].map(p => (
                        <div key={p} className="flex justify-center">
                          {typeof f[p] === 'boolean' ? (
                            f[p] ? (
                              <CheckCircle size={14} className={p === 'pro' ? 'text-[#FF6B2B]' : p === 'unlimited' ? 'text-amber-400' : 'text-green-400'} />
                            ) : (
                              <X size={14} className="text-[var(--text-muted)]" />
                            )
                          ) : (
                            <span className={`text-xs font-medium ${
                              p === 'pro' ? 'text-[#FF6B2B]' : p === 'unlimited' ? 'text-amber-400' : 'text-[var(--text-muted)]'
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

              {/* Apercu mockup avec nom du coach */}
              <div className="mt-5 glass-card p-5 shadow-xl shadow-black/20">
                <p className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-wider mb-3 text-center flex items-center justify-center gap-2">
                  <Eye size={11} />
                  Apercu de votre future app
                </p>
                <div className="mx-auto w-[200px]">
                  <div className="bg-black rounded-[1.5rem] p-1.5 shadow-xl shadow-black/40">
                    <div className="bg-[var(--bg-base)] rounded-[1.2rem] overflow-hidden relative" style={{ minHeight: 280 }}>
                      {/* Notch */}
                      <div className="flex justify-center pt-1.5 pb-1">
                        <div className="w-16 h-3.5 bg-black rounded-full" />
                      </div>
                      {/* Header avec le nom du coach */}
                      <div className="px-3 py-2 flex items-center gap-2 border-b border-[var(--border-base)]">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[8px] font-bold bg-[#FF6B2B]">
                          {(coachPrenom || 'Z')[0].toUpperCase()}
                        </div>
                        <span className="text-[var(--text-primary)] text-[10px] font-semibold">
                          {coachPrenom ? `${coachPrenom} Coaching` : 'Votre App'}
                        </span>
                      </div>
                      {/* Faux contenu */}
                      <div className="p-3 space-y-2">
                        <p className="text-[var(--text-primary)] text-[9px] font-semibold">Bonjour, Marie</p>
                        <div className="h-12 bg-[#FF6B2B]/10 rounded-lg border border-[#FF6B2B]/20 flex items-center justify-center">
                          <span className="text-[#FF6B2B] text-[9px] font-bold">Score : 78%</span>
                        </div>
                        <div className="h-8 bg-[var(--bg-card)] rounded-lg" />
                        <div className="h-8 bg-[var(--bg-card)] rounded-lg" />
                        <div className="h-8 bg-[var(--bg-card)] rounded-lg" />
                      </div>
                      {/* Nav bar */}
                      <div className="absolute bottom-0 left-0 right-0 bg-[var(--bg-card)] border-t border-[var(--border-base)] px-3 py-1.5">
                        <div className="flex justify-around">
                          {[LayoutDashboard, Dumbbell, Target, MessageSquare, User].map((Icon, i) => (
                            <Icon key={i} size={10} className={i === 0 ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-[var(--text-muted)] text-[10px] text-center mt-3">
                  Votre nom et couleurs seront appliques automatiquement
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

  const activeModuleCount = Object.values(modules).filter(Boolean).length

  return (
    <div className="p-4 md:p-6 w-full max-w-[1200px] animate-page-enter">

      {/* ══════════════════════════════════════ */}
      {/* HEADER                                 */}
      {/* ══════════════════════════════════════ */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg, ${couleur}20, ${couleur}08)` }}>
            <Smartphone size={20} style={{ color: couleur }} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-[var(--text-primary)]">App Builder</h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${couleur}15`, color: couleur }}>
                <Crown size={10} />
                {plan === 'unlimited' ? 'UNLIMITED' : 'PRO'}
              </span>
            </div>
            <p className="text-[var(--text-muted)] text-xs mt-0.5">Personnalisez l'app de vos clients en temps reel</p>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] shrink-0 shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${couleur}, ${couleur}cc)`,
            boxShadow: `0 8px 24px ${couleur}30`,
          }}
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
          <span className="hidden sm:inline">
            {saving ? 'Enregistrement...' : saved ? 'Enregistre' : 'Sauvegarder'}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8">

        {/* ══════════════════════════════════════ */}
        {/* COLONNE GAUCHE : Controles             */}
        {/* ══════════════════════════════════════ */}
        <div className="space-y-5">

          {/* ── Section Identite ── */}
          <div className="glass-card overflow-hidden">
            {/* Accent bar */}
            <div className="h-[2px]" style={{ background: `linear-gradient(to right, ${couleur}, ${couleur}50, transparent)` }} />
            <div className="p-5 md:p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${couleur}12` }}>
                  <Palette size={17} style={{ color: couleur }} />
                </div>
                <h2 className="text-[var(--text-primary)] text-[15px] font-semibold">Identite de l'app</h2>
              </div>

              {/* Nom de l'app */}
              <div>
                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium mb-2">
                  <Type size={13} />
                  Nom de l'app
                </label>
                <input
                  type="text"
                  value={nomApp}
                  onChange={(e) => setNomApp(e.target.value)}
                  placeholder="Ex : FitCoach, WellnessApp"
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none transition-colors"
                  style={{ borderColor: undefined }}
                  onFocus={(e) => e.target.style.borderColor = `${couleur}50`}
                  onBlur={(e) => e.target.style.borderColor = ''}
                />
                <p className="text-[var(--text-muted)] text-[10px] mt-1.5">Vos clients verront ce nom au lieu de "Zevo"</p>
              </div>

              {/* Logo */}
              <div>
                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium mb-2">
                  <Image size={13} />
                  Logo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-[var(--bg-base)] border border-[var(--border-base)] flex items-center justify-center overflow-hidden shrink-0 relative">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold"
                        style={{ color: couleur, backgroundColor: `${couleur}10` }}>
                        {nomApp.charAt(0)}
                      </div>
                    )}
                    {/* Subtle inner border */}
                    <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/[0.04]" />
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-base)] border border-[var(--border-base)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors">
                        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        {uploading ? 'Upload...' : 'Changer le logo'}
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      {logoUrl && (
                        <button
                          onClick={handleDeleteLogo}
                          disabled={uploading}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={13} />
                          <span className="hidden sm:inline">Supprimer</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[var(--text-muted)] text-[10px]">PNG, SVG ou JPG -- 512x512px recommande</p>
                  </div>
                </div>
              </div>

              {/* Couleur primaire */}
              <div>
                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium mb-2.5">
                  <Palette size={13} />
                  Couleur primaire
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCouleur(c)}
                      className={`w-9 h-9 rounded-full border-2 transition-all relative ${
                        couleur === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{
                        backgroundColor: c,
                        boxShadow: couleur === c ? `0 0 20px ${c}40, 0 0 0 2px ${c}` : 'none',
                      }}
                    >
                      {couleur === c && <Check size={14} className="text-white absolute inset-0 m-auto drop-shadow-sm" />}
                    </button>
                  ))}
                  <label className="relative cursor-pointer">
                    <div className="w-9 h-9 rounded-full border-2 border-dashed border-[var(--border-base)] flex items-center justify-center text-[var(--text-muted)] text-xs hover:border-[var(--border-strong)] transition-colors">
                      +
                    </div>
                    <input type="color" value={couleur} onChange={(e) => setCouleur(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </label>
                </div>
                {/* Current color indicator */}
                <div className="flex items-center gap-2.5 mt-3 px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                  <div className="w-5 h-5 rounded-md shadow-sm" style={{ backgroundColor: couleur }} />
                  <span className="text-[var(--text-muted)] text-xs font-mono">{couleur}</span>
                  <div className="ml-auto h-4 w-20 rounded-md" style={{ background: `linear-gradient(90deg, ${couleur}, ${couleur}20)` }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section Modules ── */}
          <div className="glass-card overflow-hidden">
            {/* Accent bar */}
            <div className="h-[2px] bg-gradient-to-r from-purple-500/60 via-purple-400/30 to-transparent" />
            <div className="p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <ToggleLeft size={17} className="text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-[var(--text-primary)] text-[15px] font-semibold">Modules visibles</h2>
                    <p className="text-[var(--text-muted)] text-[10px]">Activez/desactivez les modules de vos clients</p>
                  </div>
                </div>
                <span className="text-[var(--text-muted)] text-[10px] font-bold tabular-nums px-2 py-1 rounded-md bg-[var(--bg-surface)]">
                  {activeModuleCount}/{MODULES_CONFIG.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {MODULES_CONFIG.map(({ key, label, icon: Icon, desc }) => (
                  <button
                    key={key}
                    onClick={() => toggleModule(key)}
                    className={`group flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 ${
                      modules[key]
                        ? 'border-[var(--border-base)] bg-[var(--bg-base)]'
                        : 'border-[var(--border-subtle)] bg-transparent opacity-40 hover:opacity-60'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200"
                      style={{ backgroundColor: modules[key] ? `${couleur}12` : 'var(--bg-surface)' }}
                    >
                      <Icon size={17} style={{ color: modules[key] ? couleur : 'var(--text-muted)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--text-primary)] text-sm font-medium">{label}</p>
                      <p className="text-[var(--text-muted)] text-[10px] truncate">{desc}</p>
                    </div>
                    {/* Toggle switch */}
                    <div className={`w-10 h-[22px] rounded-full relative transition-colors duration-200 shrink-0 ${
                      modules[key] ? '' : 'bg-white/10'
                    }`} style={{ backgroundColor: modules[key] ? couleur : undefined }}>
                      <span className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        modules[key] ? 'translate-x-[18px]' : 'translate-x-0'
                      }`} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Section Message de bienvenue ── */}
          <div className="glass-card overflow-hidden">
            {/* Accent bar */}
            <div className="h-[2px] bg-gradient-to-r from-blue-500/60 via-blue-400/30 to-transparent" />
            <div className="p-5 md:p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <MessageSquare size={17} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-[var(--text-primary)] text-[15px] font-semibold">Message de bienvenue</h2>
                  <p className="text-[var(--text-muted)] text-[10px]">Affiche au premier login de chaque nouveau client</p>
                </div>
              </div>
              <textarea
                value={messageBienvenue}
                onChange={(e) => setMessageBienvenue(e.target.value)}
                placeholder="Ex : Bienvenue dans ton espace coaching ! Je suis ravi de t'accompagner..."
                rows={3}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none transition-colors resize-none"
                onFocus={(e) => e.target.style.borderColor = '#3b82f680'}
                onBlur={(e) => e.target.style.borderColor = ''}
              />
              {messageBienvenue && (
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                  <Check size={11} className="text-emerald-400" />
                  {messageBienvenue.length} caracteres
                </div>
              )}
            </div>
          </div>

          {/* ── Save button mobile (bas de page) ── */}
          <div className="lg:hidden">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${couleur}, ${couleur}cc)`,
                boxShadow: `0 8px 24px ${couleur}30`,
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
              {saving ? 'Enregistrement...' : saved ? 'Enregistre !' : 'Sauvegarder les modifications'}
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════ */}
        {/* COLONNE DROITE : Preview mobile live   */}
        {/* ══════════════════════════════════════ */}
        <div className="lg:sticky lg:top-6 self-start">
          <p className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-widest mb-3 text-center flex items-center justify-center gap-2">
            <Eye size={11} />
            Apercu en temps reel
          </p>

          <div className="mx-auto w-[300px]">
            {/* Frame smartphone */}
            <div className="relative bg-[#000] rounded-[2.8rem] p-[10px] shadow-2xl shadow-black/60 ring-1 ring-white/[0.06]">
              {/* Subtle device glow */}
              <div className="absolute -inset-1 rounded-[3rem] opacity-30 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 50% 0%, ${couleur}15, transparent 60%)` }} />

              <div className="bg-[var(--bg-base)] rounded-[2.2rem] overflow-hidden relative" style={{ minHeight: 560 }}>

                {/* Dynamic Island */}
                <div className="flex justify-center pt-2.5 pb-1 relative z-10">
                  <div className="w-[90px] h-[26px] bg-black rounded-full flex items-center justify-center gap-2">
                    <div className="w-[6px] h-[6px] rounded-full bg-[#1a1a2e] ring-1 ring-white/[0.06]" />
                  </div>
                </div>

                {/* Status bar */}
                <div className="flex items-center justify-between px-6 pb-1">
                  <span className="text-[var(--text-primary)] text-[10px] font-semibold">9:41</span>
                  <div className="flex items-center gap-1">
                    <Signal size={10} className="text-[var(--text-primary)]" />
                    <Wifi size={10} className="text-[var(--text-primary)]" />
                    <Battery size={12} className="text-[var(--text-primary)]" />
                  </div>
                </div>

                {/* Header app */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-base)]">
                  <div className="flex items-center gap-2.5">
                    {logoUrl ? (
                      <img src={logoUrl} alt="" className="w-7 h-7 rounded-lg object-cover shadow-sm" />
                    ) : (
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
                        style={{ backgroundColor: couleur }}>
                        {nomApp.charAt(0)}
                      </div>
                    )}
                    <span className="text-[var(--text-primary)] text-sm font-semibold">{nomApp || 'Mon App'}</span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
                    <User size={12} className="text-[var(--text-muted)]" />
                  </div>
                </div>

                {/* Contenu dashboard */}
                <div className="p-4 space-y-3 pb-16">
                  <div>
                    <p className="text-[var(--text-primary)] text-sm font-semibold">Bonjour, Marie</p>
                    <p className="text-[var(--text-muted)] text-[10px]">Voici ton recap du jour</p>
                  </div>

                  {/* Score bien-etre */}
                  <div className="rounded-xl p-3.5 border relative overflow-hidden"
                    style={{ borderColor: `${couleur}20`, backgroundColor: `${couleur}06` }}>
                    <div className="absolute top-0 left-0 right-0 h-[1.5px]"
                      style={{ background: `linear-gradient(to right, ${couleur}60, transparent)` }} />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[var(--text-muted)] text-[10px]">Score bien-etre</p>
                        <p className="text-lg font-bold mt-0.5" style={{ color: couleur }}>78%</p>
                      </div>
                      <div className="w-10 h-10 rounded-full border-[2.5px] flex items-center justify-center"
                        style={{ borderColor: couleur }}>
                        <Zap size={14} style={{ color: couleur }} />
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--bg-surface)] rounded-full mt-2.5">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: '78%', backgroundColor: couleur }} />
                    </div>
                  </div>

                  {/* Habitudes */}
                  {modules.habitudes && (
                    <div className="bg-[var(--bg-card)] rounded-xl p-3.5 border border-[var(--border-subtle)]">
                      <p className="text-[var(--text-muted)] text-[9px] font-semibold uppercase tracking-wider mb-2">Habitudes du jour</p>
                      <div className="space-y-2">
                        {['Meditation', 'Lecture 30min'].map((h, i) => (
                          <div key={h} className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded flex items-center justify-center ${
                              i === 0 ? '' : 'border border-white/10'
                            }`} style={i === 0 ? { backgroundColor: couleur } : {}}>
                              {i === 0 && <Check size={10} className="text-white" />}
                            </div>
                            <span className={`text-xs ${i === 0 ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Objectifs */}
                  {modules.objectifs && (
                    <div className="bg-[var(--bg-card)] rounded-xl p-3.5 border border-[var(--border-subtle)]">
                      <p className="text-[var(--text-muted)] text-[9px] font-semibold uppercase tracking-wider mb-2">Objectif en cours</p>
                      <p className="text-[var(--text-primary)] text-xs font-medium">Perdre 5kg</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-[var(--bg-surface)] rounded-full">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: '60%', backgroundColor: couleur }} />
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: couleur }}>60%</span>
                      </div>
                    </div>
                  )}

                  {/* Humeur */}
                  {modules.humeur && (
                    <div className="bg-[var(--bg-card)] rounded-xl p-3.5 border border-[var(--border-subtle)] flex items-center justify-between">
                      <div>
                        <p className="text-[var(--text-muted)] text-[9px] font-semibold uppercase tracking-wider">Humeur</p>
                        <p className="text-[var(--text-primary)] text-xs mt-0.5">Comment tu te sens ?</p>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div key={level}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold transition-all ${
                              level === 4 ? 'scale-110' : 'opacity-30'
                            }`}
                            style={{
                              backgroundColor: level === 4 ? `${couleur}20` : 'var(--bg-surface)',
                              color: level === 4 ? couleur : 'var(--text-muted)',
                            }}>
                            {level}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sport */}
                  {modules.sport && (
                    <div className="bg-[var(--bg-card)] rounded-xl p-3.5 border border-[var(--border-subtle)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[var(--text-muted)] text-[9px] font-semibold uppercase tracking-wider">Seance du jour</p>
                          <p className="text-[var(--text-primary)] text-xs font-medium mt-0.5">Upper Body</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${couleur}12` }}>
                          <Dumbbell size={14} style={{ color: couleur }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom nav */}
                <div className="absolute bottom-0 left-0 right-0 bg-[var(--bg-card)] border-t border-[var(--border-base)] px-2 safe-area-pb">
                  <div className="flex items-center justify-around h-12">
                    {activeNavItems.slice(0, 5).map(({ icon: Icon, label }, i) => (
                      <div key={label} className="flex flex-col items-center gap-0.5 py-1">
                        <Icon size={15} style={{ color: i === 0 ? couleur : 'var(--text-muted)' }} />
                        <span className="text-[7px] font-medium" style={{ color: i === 0 ? couleur : 'var(--text-muted)' }}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Home indicator */}
                  <div className="flex justify-center pb-1">
                    <div className="w-[100px] h-[4px] bg-white/15 rounded-full" />
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Message de bienvenue preview */}
          {messageBienvenue && (
            <div className="mt-4 glass-card overflow-hidden">
              <div className="h-[2px] bg-gradient-to-r from-blue-500/40 via-blue-400/20 to-transparent" />
              <div className="p-4">
                <p className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MessageSquare size={10} />
                  Message de bienvenue
                </p>
                <p className="text-[var(--text-primary)] text-xs leading-relaxed">{messageBienvenue}</p>
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="mt-3 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: couleur }} />
              {activeModuleCount} modules actifs
            </div>
            <div className="w-px h-3 bg-[var(--border-subtle)]" />
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              Preview live
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
