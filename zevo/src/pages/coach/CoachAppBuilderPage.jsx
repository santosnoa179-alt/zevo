import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  Save, Upload, Loader2, Check, Lock, Sparkles, Smartphone,
  LayoutDashboard, CheckSquare, Target, MessageSquare, User,
  Moon, Sun, Activity, Heart, Dumbbell, RotateCcw
} from 'lucide-react'

// Couleurs prédéfinies
const PRESETS = ['#FF6B2B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#06B6D4']

// Modules configurables
const MODULES_CONFIG = [
  { key: 'habitudes', label: 'Habitudes', icon: CheckSquare, desc: 'Suivi des habitudes quotidiennes' },
  { key: 'objectifs', label: 'Objectifs', icon: Target, desc: 'Objectifs avec progression' },
  { key: 'sport', label: 'Sport', icon: Dumbbell, desc: 'Suivi activité physique' },
  { key: 'sommeil', label: 'Sommeil', icon: Moon, desc: 'Heures & qualité de sommeil' },
  { key: 'humeur', label: 'Humeur', icon: Heart, desc: 'Score humeur quotidien' },
  { key: 'routines', label: 'Routines', icon: RotateCcw, desc: 'Routines matin / soir' },
]

export default function CoachAppBuilderPage() {
  const { user } = useAuth()

  // État coach
  const [plan, setPlan] = useState('starter')
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

  const isUnlimited = plan === 'unlimited'

  // Charger les données du coach
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await supabase
        .from('coaches')
        .select('nom_app, logo_url, couleur_primaire, message_bienvenue, modules, plan')
        .eq('id', user.id)
        .single()

      if (data) {
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
    await supabase.storage.from('logos').upload(path, file, { upsert: true })
    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
    setLogoUrl(urlData.publicUrl)
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
    await supabase
      .from('coaches')
      .update({
        nom_app: nomApp,
        logo_url: logoUrl,
        couleur_primaire: couleur,
        message_bienvenue: messageBienvenue,
        modules,
      })
      .eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#FF6B2B]" size={32} />
      </div>
    )
  }

  // ── UPSELL : plan inférieur ──
  if (!isUnlimited) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#F5F5F3]">App Builder</h1>
          <p className="text-white/50 text-sm mt-1">Personnalisez l'app de vos clients en détail</p>
        </div>

        {/* Aperçu floutée */}
        <div className="relative rounded-2xl overflow-hidden">
          {/* Fausse interface en arrière-plan */}
          <div className="blur-sm pointer-events-none opacity-40">
            <div className="grid grid-cols-2 gap-6 p-6">
              <div className="space-y-4">
                <div className="bg-[#1E1E1E] rounded-xl p-5 h-24" />
                <div className="bg-[#1E1E1E] rounded-xl p-5 h-32" />
                <div className="bg-[#1E1E1E] rounded-xl p-5 h-40" />
              </div>
              <div className="bg-[#1E1E1E] rounded-xl p-5 h-[420px] flex items-center justify-center">
                <div className="w-48 h-80 bg-[#2A2A2A] rounded-3xl" />
              </div>
            </div>
          </div>

          {/* Overlay lock */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D0D0D]/60 backdrop-blur-[2px]">
            <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-2xl p-8 text-center max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-[#FF6B2B]/10 flex items-center justify-center mx-auto mb-4">
                <Lock size={28} className="text-[#FF6B2B]" />
              </div>
              <span className="inline-flex items-center gap-1.5 bg-[#FF6B2B]/10 text-[#FF6B2B] text-xs font-bold px-3 py-1 rounded-full mb-4">
                <Sparkles size={12} />
                Plan Unlimited
              </span>
              <h2 className="text-[#F5F5F3] text-xl font-bold mb-2">
                Personnalisez l'app de vos clients
              </h2>
              <p className="text-white/40 text-sm mb-6">
                L'App Builder vous donne un contrôle total sur l'apparence et les fonctionnalités
                de l'application que vos clients utilisent. Prévisualisez les changements en temps réel.
              </p>
              <button
                onClick={() => window.location.href = '/pricing'}
                className="inline-flex items-center gap-2 bg-[#FF6B2B] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#e55e24] transition-colors"
              >
                <Sparkles size={16} />
                Passer à Unlimited — 79€/mois
              </button>
              <p className="text-white/20 text-xs mt-3">
                Votre plan actuel : <span className="capitalize">{plan}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── APP BUILDER (plan Unlimited) ──
  // Liste des items de navigation visibles dans le preview
  const activeNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', visible: true },
    ...MODULES_CONFIG
      .filter(m => modules[m.key])
      .map(m => ({ icon: m.icon, label: m.label, visible: true })),
    { icon: MessageSquare, label: 'Messages', visible: true },
    { icon: User, label: 'Profil', visible: true },
  ]

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F3]">App Builder</h1>
          <p className="text-white/50 text-sm mt-1">Personnalisez l'app de vos clients en temps réel</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ backgroundColor: couleur }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
          {saving ? 'Enregistrement...' : saved ? 'Enregistré ✓' : 'Sauvegarder'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        {/* ── Colonne gauche : Contrôles ── */}
        <div className="space-y-6">

          {/* Section Identité */}
          <section className="bg-[#1E1E1E] rounded-2xl p-6 space-y-5">
            <h2 className="text-[#F5F5F3] font-semibold">Identité de l'app</h2>

            <div>
              <label className="block text-sm text-white/50 mb-1.5">Nom de l'app</label>
              <input
                type="text"
                value={nomApp}
                onChange={(e) => setNomApp(e.target.value)}
                placeholder="Ex : FitCoach, WellnessApp"
                className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-white/50 mb-1.5">Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#2A2A2A] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white/20 text-[10px] text-center">Logo</span>
                  )}
                </div>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2A2A2A] border border-white/[0.08] text-sm text-white/50 hover:text-white hover:border-white/20 transition-colors">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploading ? 'Upload...' : 'Changer'}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/50 mb-1.5">Couleur primaire</label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCouleur(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      couleur === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <label className="relative cursor-pointer">
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-white/30 text-xs hover:border-white/40 transition-colors">
                    +
                  </div>
                  <input type="color" value={couleur} onChange={(e) => setCouleur(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                </label>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: couleur }} />
                <span className="text-white/30 text-xs font-mono">{couleur}</span>
              </div>
            </div>
          </section>

          {/* Section Modules */}
          <section className="bg-[#1E1E1E] rounded-2xl p-6 space-y-4">
            <h2 className="text-[#F5F5F3] font-semibold">Modules visibles</h2>
            <p className="text-white/30 text-xs -mt-2">Active ou désactive les modules visibles par tes clients</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODULES_CONFIG.map(({ key, label, icon: Icon, desc }) => (
                <button
                  key={key}
                  onClick={() => toggleModule(key)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    modules[key]
                      ? 'border-white/[0.12] bg-white/[0.03]'
                      : 'border-white/[0.04] bg-transparent opacity-40'
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
                  <div className={`w-10 h-5.5 rounded-full relative transition-colors ${
                    modules[key] ? '' : 'bg-white/10'
                  }`} style={{ backgroundColor: modules[key] ? couleur : undefined }}>
                    <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                      modules[key] ? 'translate-x-[18px]' : 'translate-x-0'
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Section Message */}
          <section className="bg-[#1E1E1E] rounded-2xl p-6 space-y-3">
            <h2 className="text-[#F5F5F3] font-semibold">Message de bienvenue</h2>
            <p className="text-white/30 text-xs -mt-1">Affiché au premier login de chaque nouveau client</p>
            <textarea
              value={messageBienvenue}
              onChange={(e) => setMessageBienvenue(e.target.value)}
              placeholder="Ex : Bienvenue dans ton espace coaching !"
              rows={3}
              className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-4 py-3 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors resize-none"
            />
          </section>
        </div>

        {/* ── Colonne droite : Prévisualisation mobile ── */}
        <div className="lg:sticky lg:top-6 self-start">
          <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-3 text-center">Aperçu mobile</p>

          <div className="mx-auto w-[300px]">
            {/* Frame smartphone */}
            <div className="bg-[#000] rounded-[2.5rem] p-2 shadow-2xl shadow-black/50">
              <div className="bg-[#0D0D0D] rounded-[2rem] overflow-hidden" style={{ minHeight: 560 }}>

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
                  {/* Salutation */}
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
                      <div className="h-full rounded-full" style={{ width: '78%', backgroundColor: couleur }} />
                    </div>
                  </div>

                  {/* Cards habitudes */}
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
                          <div className="h-full rounded-full" style={{ width: '60%', backgroundColor: couleur }} />
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
            <div className="mt-4 bg-[#1E1E1E] rounded-xl p-4 border border-white/[0.06]">
              <p className="text-white/30 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Message de bienvenue</p>
              <p className="text-[#F5F5F3] text-xs leading-relaxed">{messageBienvenue}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
