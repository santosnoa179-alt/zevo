import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Save, Upload, ExternalLink, Loader2, Check, Link2, CheckCircle } from 'lucide-react'

// Couleurs prédéfinies proposées au coach
const PRESETS = ['#FF6B2B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#06B6D4']

// Modules activables par le coach (budget supprimé)
const MODULES_CONFIG = [
  { key: 'sport',    label: 'Sport',    desc: 'Suivi activité physique' },
  { key: 'sommeil',  label: 'Sommeil',  desc: 'Heures & qualité de sommeil' },
  { key: 'humeur',   label: 'Humeur',   desc: 'Score humeur quotidien' },
  { key: 'routines', label: 'Routines', desc: 'Routines matin / soir' },
]

export default function CoachParametresPage() {
  const { user } = useAuth()

  // État du formulaire
  const [nomApp, setNomApp] = useState('Zevo')
  const [logoUrl, setLogoUrl] = useState('')
  const [couleur, setCouleur] = useState('#FF6B2B')
  const [messageBienvenue, setMessageBienvenue] = useState('')
  const [modules, setModules] = useState({ sport: true, sommeil: true, humeur: true, routines: true })
  const [plan, setPlan] = useState('starter')

  const [stripeCustomerId, setStripeCustomerId] = useState(null)
  const [stripeAccountId, setStripeAccountId] = useState(null)
  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState(false)
  const [connectLoading, setConnectLoading] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  // Charge les paramètres actuels du coach
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await supabase
        .from('coaches')
        .select('nom_app, logo_url, couleur_primaire, message_bienvenue, modules, plan, stripe_customer_id, stripe_account_id, stripe_onboarding_complete')
        .eq('id', user.id)
        .single()

      if (data) {
        setNomApp(data.nom_app || 'Zevo')
        setLogoUrl(data.logo_url || '')
        setCouleur(data.couleur_primaire || '#FF6B2B')
        setMessageBienvenue(data.message_bienvenue || '')
        setPlan(data.plan || 'starter')
        setStripeCustomerId(data.stripe_customer_id || null)
        setStripeAccountId(data.stripe_account_id || null)
        setStripeOnboardingComplete(data.stripe_onboarding_complete || false)
        if (data.modules) {
          // Fusion pour garantir toutes les clés
          setModules(prev => ({ ...prev, ...data.modules }))
        }
      }
      setLoading(false)
    }
    load()
  }, [user])

  // Upload du logo vers Supabase Storage
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `logos/${user.id}.${ext}`

    // Upload dans le bucket "logos"
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      console.error('Erreur upload logo:', uploadError)
      setUploading(false)
      return
    }

    // Récupère l'URL publique
    const { data: urlData } = supabase.storage
      .from('logos')
      .getPublicUrl(path)

    setLogoUrl(urlData.publicUrl)
    setUploading(false)
  }

  // Toggle un module
  const toggleModule = (key) => {
    setModules(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Sauvegarde dans Supabase
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

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  // Ouvre le Stripe Customer Portal pour gérer l'abonnement
  const handleOpenPortal = async () => {
    if (!stripeCustomerId) return
    setPortalLoading(true)
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: stripeCustomerId }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (err) {
      console.error('Erreur Customer Portal:', err)
      setPortalLoading(false)
    }
  }

  // Vérifie le retour d'onboarding Stripe Connect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('stripe_connect') === 'success') {
      setStripeOnboardingComplete(true)
      // Nettoyer l'URL
      window.history.replaceState({}, '', '/coach/parametres')
    }
  }, [])

  // Lancer l'onboarding Stripe Connect
  const handleConnectStripe = async () => {
    setConnectLoading(true)
    try {
      const res = await fetch('/api/connect-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: user.id }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (err) {
      console.error('Erreur Stripe Connect:', err)
      setConnectLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#FF6B2B]" size={32} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      {/* Titre */}
      <div>
        <h1 className="text-[#F5F5F3] text-2xl font-bold mb-1">Paramètres</h1>
        <p className="text-white/40 text-sm">Personnalise ton app et gère ton abonnement</p>
      </div>

      {/* ── Section Identité ── */}
      <section className="bg-[#1E1E1E] rounded-2xl p-6 space-y-6">
        <h2 className="text-[#F5F5F3] font-semibold text-lg">Identité de l'app</h2>

        {/* Nom de l'app */}
        <div>
          <label className="block text-sm text-white/60 mb-1.5">Nom de l'app</label>
          <input
            type="text"
            value={nomApp}
            onChange={(e) => setNomApp(e.target.value)}
            placeholder="Ex : FitCoach, WellnessApp"
            className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
          />
          <p className="text-white/30 text-xs mt-1">Vos clients verront ce nom au lieu de "Zevo"</p>
        </div>

        {/* Logo */}
        <div>
          <label className="block text-sm text-white/60 mb-1.5">Logo</label>
          <div className="flex items-center gap-4">
            {/* Aperçu du logo */}
            <div className="w-16 h-16 rounded-xl bg-[#2A2A2A] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white/20 text-xs text-center">Aucun logo</span>
              )}
            </div>

            {/* Bouton upload */}
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2A2A2A] border border-white/[0.08] text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? 'Upload...' : 'Changer le logo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Couleur primaire */}
        <div>
          <label className="block text-sm text-white/60 mb-1.5">Couleur primaire</label>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Presets */}
            {PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => setCouleur(c)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  couleur === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Couleur ${c}`}
              />
            ))}

            {/* Color picker natif */}
            <label className="relative cursor-pointer">
              <div
                className="w-8 h-8 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-white/30 text-xs hover:border-white/40 transition-colors"
                title="Choisir une couleur personnalisée"
              >
                +
              </div>
              <input
                type="color"
                value={couleur}
                onChange={(e) => setCouleur(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          </div>

          {/* Aperçu couleur sélectionnée */}
          <div className="flex items-center gap-2 mt-3">
            <div className="w-5 h-5 rounded" style={{ backgroundColor: couleur }} />
            <span className="text-white/40 text-xs font-mono">{couleur}</span>
          </div>
        </div>
      </section>

      {/* ── Section Message de bienvenue ── */}
      <section className="bg-[#1E1E1E] rounded-2xl p-6 space-y-4">
        <h2 className="text-[#F5F5F3] font-semibold text-lg">Message de bienvenue</h2>
        <p className="text-white/40 text-sm -mt-2">Affiché au 1er login de chaque nouveau client</p>
        <textarea
          value={messageBienvenue}
          onChange={(e) => setMessageBienvenue(e.target.value)}
          placeholder="Ex : Bienvenue dans ton espace coaching ! Je suis ravi de t'accompagner..."
          rows={4}
          className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-4 py-3 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors resize-none"
        />
      </section>

      {/* ── Section Modules ── */}
      <section className="bg-[#1E1E1E] rounded-2xl p-6 space-y-4">
        <h2 className="text-[#F5F5F3] font-semibold text-lg">Modules activés</h2>
        <p className="text-white/40 text-sm -mt-2">Active ou désactive les modules visibles par tes clients</p>

        <div className="space-y-3">
          {MODULES_CONFIG.map(({ key, label, desc }) => (
            <div
              key={key}
              className="flex items-center justify-between py-3 px-4 rounded-xl bg-[#2A2A2A]/50"
            >
              <div>
                <p className="text-[#F5F5F3] text-sm font-medium">{label}</p>
                <p className="text-white/30 text-xs">{desc}</p>
              </div>
              {/* Toggle switch */}
              <button
                onClick={() => toggleModule(key)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  modules[key] ? 'bg-[#FF6B2B]' : 'bg-white/10'
                }`}
                role="switch"
                aria-checked={modules[key]}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    modules[key] ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section Paiements en ligne (Stripe Connect) ── */}
      <section className="bg-[#1E1E1E] rounded-2xl p-6 space-y-4">
        <h2 className="text-[#F5F5F3] font-semibold text-lg">Paiements en ligne</h2>
        <p className="text-white/40 text-sm -mt-2">Connectez votre compte Stripe pour recevoir les paiements de vos clients</p>

        {stripeOnboardingComplete ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
            <div>
              <p className="text-green-400 text-sm font-medium">Paiements activés</p>
              <p className="text-green-400/60 text-xs">Votre compte Stripe est connecté. Vos clients peuvent payer en ligne.</p>
            </div>
          </div>
        ) : (
          <button
            onClick={handleConnectStripe}
            disabled={connectLoading}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#635BFF] text-white text-sm font-semibold hover:bg-[#5851e6] transition-colors disabled:opacity-50"
          >
            {connectLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Link2 size={16} />
            )}
            {connectLoading ? 'Redirection...' : 'Connecter mon compte Stripe'}
          </button>
        )}
      </section>

      {/* ── Section Abonnement ── */}
      <section className="bg-[#1E1E1E] rounded-2xl p-6 space-y-4">
        <h2 className="text-[#F5F5F3] font-semibold text-lg">Abonnement</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#F5F5F3] text-sm font-medium capitalize">Plan {plan}</p>
            <p className="text-white/30 text-xs">
              {plan === 'starter' && '39€/mois · 5 clients'}
              {plan === 'pro' && '59€/mois · 20 clients'}
              {plan === 'unlimited' && '79€/mois · Illimité'}
            </p>
          </div>
          <button
            onClick={handleOpenPortal}
            disabled={portalLoading || !stripeCustomerId}
            className="inline-flex items-center gap-1.5 text-sm text-[#FF6B2B] hover:text-[#FF9A6C] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {portalLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ExternalLink size={14} />
            )}
            Gérer l'abonnement
          </button>
        </div>
      </section>

      {/* ── Bouton Sauvegarder ── */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ backgroundColor: couleur }}
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : saved ? (
            <Check size={16} />
          ) : (
            <Save size={16} />
          )}
          {saving ? 'Enregistrement...' : saved ? 'Enregistré ✓' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}
