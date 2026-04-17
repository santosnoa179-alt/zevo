import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import {
  Save, Upload, Loader2, Check, Lock, Sparkles, Smartphone,
  LayoutDashboard, CheckSquare, Target, MessageSquare, User,
  Moon, Heart, Dumbbell, RotateCcw, Crown, ArrowRight,
  Palette, Type, Image, ToggleLeft, Zap, Star, Quote,
  CheckCircle, X, Trash2, Eye, Wifi, Battery, Signal,
  Layers, Wand2, Globe
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
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-8 w-48 skel-block rounded-lg" />
            <div className="h-4 w-64 skel-block rounded-lg" />
          </div>
          <div className="h-11 w-36 skel-block rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-5">
            <div className="h-80 skel-block rounded-2xl" />
            <div className="h-56 skel-block rounded-2xl" />
            <div className="h-44 skel-block rounded-2xl" />
          </div>
          <div className="hidden lg:block">
            <div className="h-[640px] w-[300px] skel-block rounded-[2.5rem] mx-auto" />
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
              <p className="text-xs text-[var(--text-muted)]">Personnalisez l'app de vos clients</p>
            </div>
          </div>
        </div>

        {/* ── Paywall card ── */}
        <div className="glass-card overflow-hidden relative">
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-[#FF6B2B]/8 rounded-full blur-3xl pointer-events-none" />

          <div className="relative p-6 md:p-10 text-center">
            {/* Lock icon */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B2B]/20 to-[#FF6B2B]/5 flex items-center justify-center mb-5 shadow-lg shadow-[#FF6B2B]/10">
              <Lock size={28} className="text-[#FF6B2B]" />
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#FF6B2B] bg-[#FF6B2B]/10 rounded-full px-3 py-1 mb-3">
              <Crown size={10} />
              FONCTIONNALITE PREMIUM
            </span>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Creez votre propre app</h2>
            <p className="text-[var(--text-muted)] text-sm max-w-lg mx-auto mb-8">
              Avec l'App Builder, personnalisez entierement l'experience de vos clients :
              logo, couleurs, modules, nom de l'app.
            </p>

            {/* Plans comparison */}
            <div className="max-w-2xl mx-auto">
              <div className="grid grid-cols-4 text-xs mb-4">
                <div />
                {['Starter', 'Pro', 'Unlimited'].map(p => (
                  <div key={p} className={`font-bold py-2.5 rounded-t-xl ${
                    p === 'Unlimited' ? 'text-[#FF6B2B] bg-[#FF6B2B]/5' :
                    p === 'Pro' ? 'text-[var(--text-muted)] bg-[var(--bg-surface)]' :
                    'text-[var(--text-muted)]'
                  }`}>{p}</div>
                ))}
              </div>
              <div className="space-y-0.5">
                {PLAN_FEATURES.map((f, i) => (
                  <div key={i} className="grid grid-cols-4 items-center text-xs py-3 px-3 rounded-lg odd:bg-[var(--bg-base)]">
                    <span className="text-left text-[var(--text-secondary)] font-medium">{f.label}</span>
                    {[f.starter, f.pro, f.unlimited].map((val, j) => (
                      <span key={j} className="text-center">
                        {typeof val === 'boolean'
                          ? val
                            ? <CheckCircle size={15} className="text-[#FF6B2B] mx-auto" />
                            : <X size={15} className="text-[var(--text-muted)]/30 mx-auto" />
                          : <span className="text-[var(--text-secondary)]">{val}</span>
                        }
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => navigate('/coach/parametres')}
              className="mt-8 inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white text-sm font-bold hover:shadow-lg hover:shadow-[#FF6B2B]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Sparkles size={16} />
              Passer a Pro
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Preview teaser */}
        <div className="mt-8 opacity-40 pointer-events-none select-none">
          <p className="text-center text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-widest mb-4">
            Apercu du builder
          </p>
          <div className="max-w-sm mx-auto">
            <div className="bg-black rounded-[2.5rem] p-3 shadow-2xl shadow-black/60">
              <div className="bg-[var(--bg-base)] rounded-[2rem] h-[400px] flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Lock size={24} className="text-[var(--text-muted)] mx-auto" />
                  <p className="text-[var(--text-muted)] text-xs">Preview disponible avec Pro</p>
                </div>
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
    <div className="p-4 md:p-6 w-full max-w-[1240px] animate-page-enter">

      {/* ══════════════════════════════════════ */}
      {/* HEADER                                 */}
      {/* ══════════════════════════════════════ */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center relative shrink-0"
            style={{ background: `linear-gradient(135deg, ${couleur}18, ${couleur}06)` }}>
            <Wand2 size={22} style={{ color: couleur }} />
            {/* Glow behind icon */}
            <div className="absolute inset-0 rounded-2xl blur-xl opacity-40"
              style={{ backgroundColor: `${couleur}20` }} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">App Builder</h1>
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border"
                style={{
                  backgroundColor: `${couleur}08`,
                  color: couleur,
                  borderColor: `${couleur}20`,
                }}>
                <Crown size={9} />
                {plan === 'unlimited' ? 'UNLIMITED' : 'PRO'}
              </span>
            </div>
            <p className="text-[var(--text-muted)] text-[13px] mt-0.5">Personnalisez l'experience de vos clients en temps reel</p>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-50 hover:scale-[1.03] active:scale-[0.97] shrink-0 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${couleur}, ${couleur}bb)`,
            boxShadow: `0 8px 32px ${couleur}25, 0 2px 8px ${couleur}15`,
          }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
          <span className="relative flex items-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
            <span className="hidden sm:inline">
              {saving ? 'Enregistrement...' : saved ? 'Enregistre !' : 'Sauvegarder'}
            </span>
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-10">

        {/* ══════════════════════════════════════ */}
        {/* COLONNE GAUCHE : Controles             */}
        {/* ══════════════════════════════════════ */}
        <div className="space-y-5">

          {/* ── Section 01 · Identite ── */}
          <div className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-card)] overflow-hidden relative group/section">
            {/* Top gradient accent */}
            <div className="h-[3px] transition-all duration-500"
              style={{ background: `linear-gradient(to right, ${couleur}, ${couleur}60, transparent)` }} />

            <div className="p-6 space-y-6">
              {/* Section header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center relative"
                  style={{ backgroundColor: `${couleur}10` }}>
                  <Palette size={18} style={{ color: couleur }} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md bg-[var(--bg-surface)] text-[var(--text-muted)]">01</span>
                    <h2 className="text-[var(--text-primary)] text-base font-bold">Identite de l'app</h2>
                  </div>
                  <p className="text-[var(--text-muted)] text-[11px] mt-0.5">Nom, logo et couleur de votre application</p>
                </div>
              </div>

              {/* Nom de l'app */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-semibold">
                  <Type size={13} className="opacity-50" />
                  Nom de l'app
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={nomApp}
                    onChange={(e) => setNomApp(e.target.value)}
                    placeholder="Ex : FitCoach, WellnessApp"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm font-medium placeholder:text-[var(--text-muted)] focus:outline-none transition-all duration-300"
                    onFocus={(e) => {
                      e.target.style.borderColor = `${couleur}50`
                      e.target.style.boxShadow = `0 0 0 3px ${couleur}10`
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = ''
                      e.target.style.boxShadow = ''
                    }}
                  />
                  {nomApp && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Check size={14} className="text-[#FF6B2B]" />
                    </div>
                  )}
                </div>
                <p className="text-[var(--text-muted)] text-[10px] pl-1">Vos clients verront ce nom au lieu de "Zevo"</p>
              </div>

              {/* Logo */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-semibold">
                  <Image size={13} className="opacity-50" />
                  Logo
                </label>
                <div className="flex items-center gap-5">
                  <div className="w-[72px] h-[72px] rounded-2xl bg-[var(--bg-base)] border border-[var(--border-base)] flex items-center justify-center overflow-hidden shrink-0 relative group/logo transition-all duration-300 hover:border-[var(--border-strong)]">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-black"
                        style={{ color: couleur, backgroundColor: `${couleur}08` }}>
                        {nomApp.charAt(0)}
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/[0.04]" />
                  </div>
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border-base)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] transition-all duration-200">
                        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        {uploading ? 'Upload...' : 'Changer le logo'}
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      {logoUrl && (
                        <button
                          onClick={handleDeleteLogo}
                          disabled={uploading}
                          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50"
                        >
                          <Trash2 size={13} />
                          <span className="hidden sm:inline">Supprimer</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[var(--text-muted)] text-[10px] pl-0.5">PNG, SVG ou JPG — 512x512px recommande</p>
                  </div>
                </div>
              </div>

              {/* Couleur primaire */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-semibold">
                  <Palette size={13} className="opacity-50" />
                  Couleur primaire
                </label>

                {/* Color swatches */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  {PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCouleur(c)}
                      className="relative w-10 h-10 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95"
                      style={{
                        backgroundColor: c,
                        boxShadow: couleur === c
                          ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${c}, 0 4px 20px ${c}30`
                          : `0 2px 8px ${c}20`,
                        transform: couleur === c ? 'scale(1.1)' : undefined,
                      }}
                    >
                      {couleur === c && (
                        <Check size={16} className="text-white absolute inset-0 m-auto drop-shadow-md" />
                      )}
                    </button>
                  ))}
                  <label className="relative cursor-pointer">
                    <div className="w-10 h-10 rounded-xl border-2 border-dashed border-[var(--border-base)] flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)] transition-all duration-200"
                      style={{
                        background: `conic-gradient(from 0deg, #FF6B2B20, #3B82F620, #10B98120, #8B5CF620, #EC489920, #FF6B2B20)`,
                      }}>
                      <span className="text-sm font-bold bg-[var(--bg-card)] rounded-lg w-6 h-6 flex items-center justify-center">+</span>
                    </div>
                    <input type="color" value={couleur} onChange={(e) => setCouleur(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </label>
                </div>

                {/* Active color indicator */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                  <div className="w-6 h-6 rounded-lg shadow-sm ring-1 ring-inset ring-white/10 transition-colors duration-300"
                    style={{ backgroundColor: couleur }} />
                  <span className="text-[var(--text-muted)] text-xs font-mono tracking-wider">{couleur.toUpperCase()}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="h-5 w-24 rounded-lg overflow-hidden">
                      <div className="h-full w-full" style={{ background: `linear-gradient(90deg, ${couleur}, ${couleur}15)` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 02 · Modules ── */}
          <div className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-card)] overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-[#FF6B2B]/60 via-[#FF9A6C]/20 to-transparent" />
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center">
                    <Layers size={18} className="text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md bg-[var(--bg-surface)] text-[var(--text-muted)]">02</span>
                      <h2 className="text-[var(--text-primary)] text-base font-bold">Modules visibles</h2>
                    </div>
                    <p className="text-[var(--text-muted)] text-[11px] mt-0.5">Activez ou desactivez les fonctionnalites</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div className="w-2 h-2 rounded-full bg-[#FF6B2B] animate-pulse" />
                  <span className="text-[var(--text-muted)] text-[11px] font-bold tabular-nums">
                    {activeModuleCount}/{MODULES_CONFIG.length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MODULES_CONFIG.map(({ key, label, icon: Icon, desc }) => {
                  const isActive = modules[key]
                  return (
                    <button
                      key={key}
                      onClick={() => toggleModule(key)}
                      className={`group flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all duration-300 ${
                        isActive
                          ? 'border-[var(--border-base)] bg-[var(--bg-base)] hover:border-[var(--border-strong)]'
                          : 'border-transparent bg-[var(--bg-surface)]/50 opacity-40 hover:opacity-60'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
                        style={{
                          backgroundColor: isActive ? `${couleur}12` : 'transparent',
                          border: isActive ? 'none' : '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <Icon size={18} style={{ color: isActive ? couleur : 'var(--text-muted)' }} className="transition-colors duration-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--text-primary)] text-[13px] font-semibold">{label}</p>
                        <p className="text-[var(--text-muted)] text-[10px] truncate mt-0.5">{desc}</p>
                      </div>
                      {/* Toggle switch */}
                      <div className={`w-11 h-6 rounded-full relative transition-all duration-300 shrink-0 ${
                        isActive ? '' : 'bg-white/8'
                      }`} style={{
                        backgroundColor: isActive ? couleur : undefined,
                        boxShadow: isActive ? `0 2px 12px ${couleur}30` : 'none',
                      }}>
                        <span className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-md transition-all duration-300 ${
                          isActive ? 'translate-x-[20px]' : 'translate-x-0'
                        }`} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Section 03 · Message de bienvenue ── */}
          <div className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-card)] overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-[#FF6B2B]/60 via-[#FF9A6C]/20 to-transparent" />
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center">
                  <Quote size={18} className="text-[var(--text-muted)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md bg-[var(--bg-surface)] text-[var(--text-muted)]">03</span>
                    <h2 className="text-[var(--text-primary)] text-base font-bold">Message de bienvenue</h2>
                  </div>
                  <p className="text-[var(--text-muted)] text-[11px] mt-0.5">Affiche au premier login de chaque nouveau client</p>
                </div>
              </div>
              <textarea
                value={messageBienvenue}
                onChange={(e) => setMessageBienvenue(e.target.value)}
                placeholder="Ex : Bienvenue dans ton espace coaching ! Je suis ravi de t'accompagner..."
                rows={3}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-3.5 text-[var(--text-primary)] text-sm leading-relaxed placeholder:text-[var(--text-muted)] focus:outline-none transition-all duration-300 resize-none"
                onFocus={(e) => {
                  e.target.style.borderColor = '#FF6B2B50'
                  e.target.style.boxShadow = '0 0 0 3px #FF6B2B10'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = ''
                  e.target.style.boxShadow = ''
                }}
              />
              {messageBienvenue && (
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] pl-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B2B]" />
                  {messageBienvenue.length} caracteres
                </div>
              )}
            </div>
          </div>

          {/* ── Save button mobile ── */}
          <div className="lg:hidden">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-50 active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${couleur}, ${couleur}bb)`,
                boxShadow: `0 8px 32px ${couleur}25`,
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
          <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-[0.2em] mb-4 text-center flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B2B] animate-pulse" />
            Apercu en temps reel
          </p>

          <div className="mx-auto w-[310px]">
            {/* Phone frame */}
            <div className="relative bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] rounded-[3rem] p-[11px] shadow-2xl shadow-black/70"
              style={{
                boxShadow: `0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.06)`,
              }}>
              {/* Device glow */}
              <div className="absolute -inset-2 rounded-[3.5rem] opacity-25 pointer-events-none blur-xl"
                style={{ background: `radial-gradient(ellipse at 50% 0%, ${couleur}20, transparent 60%)` }} />

              {/* Side buttons */}
              <div className="absolute left-[-2px] top-[100px] w-[3px] h-[30px] bg-[#2a2a2a] rounded-l-sm" />
              <div className="absolute left-[-2px] top-[145px] w-[3px] h-[50px] bg-[#2a2a2a] rounded-l-sm" />
              <div className="absolute left-[-2px] top-[200px] w-[3px] h-[50px] bg-[#2a2a2a] rounded-l-sm" />
              <div className="absolute right-[-2px] top-[130px] w-[3px] h-[65px] bg-[#2a2a2a] rounded-r-sm" />

              <div className="bg-[var(--bg-base)] rounded-[2.3rem] overflow-hidden relative" style={{ minHeight: 580 }}>

                {/* Dynamic Island */}
                <div className="flex justify-center pt-2.5 pb-1 relative z-10">
                  <div className="w-[100px] h-[28px] bg-black rounded-full flex items-center justify-center gap-2 shadow-lg">
                    <div className="w-[7px] h-[7px] rounded-full bg-[#1a1a2e] ring-1 ring-white/[0.08]" />
                  </div>
                </div>

                {/* Status bar */}
                <div className="flex items-center justify-between px-7 pb-1.5">
                  <span className="text-[var(--text-primary)] text-[10px] font-bold">9:41</span>
                  <div className="flex items-center gap-1">
                    <Signal size={10} className="text-[var(--text-primary)]" />
                    <Wifi size={10} className="text-[var(--text-primary)]" />
                    <Battery size={12} className="text-[var(--text-primary)]" />
                  </div>
                </div>

                {/* App header */}
                <div className="mx-3 px-3 py-3 flex items-center justify-between rounded-2xl mb-1"
                  style={{ backgroundColor: `${couleur}06` }}>
                  <div className="flex items-center gap-2.5">
                    {logoUrl ? (
                      <img src={logoUrl} alt="" className="w-8 h-8 rounded-xl object-cover shadow-sm" />
                    ) : (
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-black shadow-lg"
                        style={{ backgroundColor: couleur }}>
                        {nomApp.charAt(0)}
                      </div>
                    )}
                    <span className="text-[var(--text-primary)] text-[13px] font-bold">{nomApp || 'Mon App'}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/[0.06]">
                    <User size={13} className="text-[var(--text-muted)]" />
                  </div>
                </div>

                {/* Dashboard content */}
                <div className="px-4 py-2 space-y-3 pb-20">
                  <div className="px-1">
                    <p className="text-[var(--text-primary)] text-[13px] font-bold">Bonjour, Marie</p>
                    <p className="text-[var(--text-muted)] text-[10px]">Voici ton recap du jour</p>
                  </div>

                  {/* Score bien-etre */}
                  <div className="rounded-2xl p-4 relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${couleur}10, ${couleur}04)`,
                      border: `1px solid ${couleur}15`,
                    }}>
                    <div className="absolute top-0 left-0 right-0 h-[2px]"
                      style={{ background: `linear-gradient(to right, ${couleur}80, ${couleur}20, transparent)` }} />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[var(--text-muted)] text-[9px] font-semibold uppercase tracking-wider">Score bien-etre</p>
                        <p className="text-xl font-black mt-1" style={{ color: couleur }}>78%</p>
                      </div>
                      <div className="w-11 h-11 rounded-full flex items-center justify-center"
                        style={{
                          border: `2.5px solid ${couleur}`,
                          boxShadow: `0 0 20px ${couleur}20`,
                        }}>
                        <Zap size={16} style={{ color: couleur }} />
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--bg-surface)] rounded-full mt-3">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: '78%', backgroundColor: couleur, boxShadow: `0 0 12px ${couleur}40` }} />
                    </div>
                  </div>

                  {/* Habitudes */}
                  {modules.habitudes && (
                    <div className="bg-[var(--bg-card)] rounded-xl p-3.5 border border-[var(--border-subtle)]">
                      <p className="text-[var(--text-muted)] text-[8px] font-bold uppercase tracking-[0.15em] mb-2.5">Habitudes du jour</p>
                      <div className="space-y-2">
                        {['Meditation', 'Lecture 30min'].map((h, i) => (
                          <div key={h} className="flex items-center gap-2.5">
                            <div className={`w-4 h-4 rounded flex items-center justify-center ${
                              i === 0 ? '' : 'border border-white/10'
                            }`} style={i === 0 ? { backgroundColor: couleur } : {}}>
                              {i === 0 && <Check size={10} className="text-white" />}
                            </div>
                            <span className={`text-[11px] ${i === 0 ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Objectifs */}
                  {modules.objectifs && (
                    <div className="bg-[var(--bg-card)] rounded-xl p-3.5 border border-[var(--border-subtle)]">
                      <p className="text-[var(--text-muted)] text-[8px] font-bold uppercase tracking-[0.15em] mb-2">Objectif en cours</p>
                      <p className="text-[var(--text-primary)] text-[11px] font-semibold">Perdre 5kg</p>
                      <div className="flex items-center gap-2 mt-2.5">
                        <div className="flex-1 h-1.5 bg-[var(--bg-surface)] rounded-full">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: '60%', backgroundColor: couleur, boxShadow: `0 0 8px ${couleur}30` }} />
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: couleur }}>60%</span>
                      </div>
                    </div>
                  )}

                  {/* Humeur */}
                  {modules.humeur && (
                    <div className="bg-[var(--bg-card)] rounded-xl p-3.5 border border-[var(--border-subtle)] flex items-center justify-between">
                      <div>
                        <p className="text-[var(--text-muted)] text-[8px] font-bold uppercase tracking-[0.15em]">Humeur</p>
                        <p className="text-[var(--text-primary)] text-[11px] mt-1">Comment tu te sens ?</p>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div key={level}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold transition-all duration-300 ${
                              level === 4 ? 'scale-110 ring-2' : 'opacity-30'
                            }`}
                            style={{
                              backgroundColor: level === 4 ? `${couleur}20` : 'var(--bg-surface)',
                              color: level === 4 ? couleur : 'var(--text-muted)',
                              ringColor: level === 4 ? `${couleur}40` : 'transparent',
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
                          <p className="text-[var(--text-muted)] text-[8px] font-bold uppercase tracking-[0.15em]">Seance du jour</p>
                          <p className="text-[var(--text-primary)] text-[11px] font-semibold mt-1">Upper Body</p>
                        </div>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${couleur}12` }}>
                          <Dumbbell size={15} style={{ color: couleur }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom nav */}
                <div className="absolute bottom-0 left-0 right-0 bg-[var(--bg-card)]/95 backdrop-blur-md border-t border-[var(--border-base)] px-2">
                  <div className="flex items-center justify-around h-12">
                    {activeNavItems.slice(0, 5).map(({ icon: Icon, label }, i) => (
                      <div key={label} className="flex flex-col items-center gap-0.5 py-1 relative">
                        {i === 0 && (
                          <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full" style={{ backgroundColor: couleur }} />
                        )}
                        <Icon size={15} style={{ color: i === 0 ? couleur : 'var(--text-muted)' }} />
                        <span className="text-[7px] font-semibold" style={{ color: i === 0 ? couleur : 'var(--text-muted)' }}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center pb-1.5">
                    <div className="w-[100px] h-[4px] bg-white/15 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Message de bienvenue preview */}
          {messageBienvenue && (
            <div className="mt-5 rounded-2xl border border-[var(--border-base)] bg-[var(--bg-card)] overflow-hidden">
              <div className="h-[2px] bg-gradient-to-r from-[#FF6B2B]/40 via-[#FF9A6C]/15 to-transparent" />
              <div className="p-4">
                <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-[0.15em] mb-2.5 flex items-center gap-1.5">
                  <Quote size={10} className="text-[var(--text-muted)]" />
                  Message de bienvenue
                </p>
                <p className="text-[var(--text-primary)] text-xs leading-relaxed">{messageBienvenue}</p>
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="mt-4 flex items-center justify-center gap-5">
            <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
              <div className="w-2 h-2 rounded-full transition-colors duration-300" style={{ backgroundColor: couleur }} />
              <span className="font-semibold">{activeModuleCount} modules actifs</span>
            </div>
            <div className="w-px h-3 bg-[var(--border-subtle)]" />
            <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
              <div className="w-2 h-2 rounded-full bg-[#FF6B2B] animate-pulse" />
              <span className="font-semibold">Preview live</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
