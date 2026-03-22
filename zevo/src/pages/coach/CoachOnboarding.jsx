import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import {
  ArrowRight, Check, Loader2, User, Briefcase, Target,
  Phone, ChevronRight
} from 'lucide-react'

// ── Données des étapes ──
const METIERS = [
  { id: 'coach_sportif', label: 'Coach sportif', emoji: '🏋️' },
  { id: 'nutritionniste', label: 'Nutritionniste', emoji: '🥗' },
  { id: 'preparateur_mental', label: 'Préparateur mental', emoji: '🧠' },
  { id: 'autre', label: 'Autre', emoji: '✨' },
]

const NB_CLIENTS = [
  { id: '0', label: '0', sub: 'Je démarre' },
  { id: '1-5', label: '1 à 5', sub: 'Petite activité' },
  { id: '5-20', label: '5 à 20', sub: 'En croissance' },
  { id: '20-50', label: '20 à 50', sub: 'Activité soutenue' },
  { id: '50+', label: 'Plus de 50', sub: 'Gros volume' },
]

const PRIORITES = [
  { id: 'gagner_temps', label: 'Gagner du temps', icon: '⚡' },
  { id: 'organiser_seances', label: 'Mieux organiser mes séances', icon: '📋' },
  { id: 'suivi_client', label: 'Améliorer le suivi client', icon: '📊' },
  { id: 'developper_activite', label: 'Développer mon activité', icon: '🚀' },
]

const MASCOT_MESSAGES = [
  'Salut ! Faisons connaissance pour personnaliser ton espace :)',
  'Super ! Ton parcours nous intéresse.',
  'Presque fini ! Cela m\'aidera à te proposer les meilleurs outils.',
]

export default function CoachOnboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 1
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')

  // Step 2
  const [metier, setMetier] = useState('')
  const [nbClients, setNbClients] = useState('')

  // Step 3
  const [priorites, setPriorites] = useState([])

  const togglePriorite = (id) => {
    setPriorites(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const canNext = () => {
    if (step === 0) return prenom.trim() && nom.trim()
    if (step === 1) return metier && nbClients
    if (step === 2) return priorites.length > 0
    return false
  }

  const handleNext = async () => {
    if (step < 2) {
      setStep(step + 1)
      return
    }

    // Dernière étape → sauvegarder
    setSaving(true)
    try {
      const { error } = await supabase
        .from('coaches')
        .update({
          prenom: prenom.trim(),
          nom: nom.trim(),
          telephone: telephone.trim() || null,
          metier,
          nb_clients_moyen: nbClients,
          priorites,
          onboarding_complete: true,
        })
        .eq('id', user.id)

      if (error) throw error

      // Mettre aussi à jour le profil
      await supabase
        .from('profiles')
        .update({
          prenom: prenom.trim(),
          nom: nom.trim(),
        })
        .eq('id', user.id)

      toast.success('Bienvenue sur Zevo ! Ton espace est prêt.')
      navigate('/coach/dashboard')
    } catch (err) {
      console.error('Erreur onboarding:', err)
      toast.error('Erreur lors de la sauvegarde. Réessaye.')
    }
    setSaving(false)
  }

  const progress = ((step + 1) / 3) * 100

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">

      {/* ══════════════════════════════════════ */}
      {/* GAUCHE — Formulaire                   */}
      {/* ══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Barre de progression orange */}
        <div className="h-1 bg-[#1a1a1a]">
          <div
            className="h-full bg-[#FF6B2B] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Contenu centré */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-8">

            {/* Indicateur d'étapes */}
            <div className="flex items-center gap-3">
              {[0, 1, 2].map((s) => (
                <div key={s} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      s < step
                        ? 'bg-[#FF6B2B] text-white'
                        : s === step
                          ? 'bg-[#FF6B2B]/20 text-[#FF6B2B] ring-2 ring-[#FF6B2B]/40'
                          : 'bg-[#1a1a1a] text-white/20'
                    }`}
                  >
                    {s < step ? <Check size={14} /> : s + 1}
                  </div>
                  {s < 2 && (
                    <div className={`w-12 h-[2px] rounded-full transition-colors duration-300 ${
                      s < step ? 'bg-[#FF6B2B]' : 'bg-[#1a1a1a]'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* ── STEP 1 : Faisons connaissance ── */}
            {step === 0 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <p className="text-[#FF6B2B] text-sm font-semibold uppercase tracking-wider mb-2">Étape 1 / 3</p>
                  <h1 className="text-[#F5F5F3] text-2xl font-bold">
                    Faisons connaissance, vous êtes :
                  </h1>
                </div>

                <div className="space-y-4">
                  {/* Prénom */}
                  <div>
                    <label className="block text-sm text-white/50 mb-1.5 font-medium">Prénom *</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                      <input
                        type="text"
                        value={prenom}
                        onChange={(e) => setPrenom(e.target.value)}
                        placeholder="Votre prénom"
                        autoFocus
                        className="w-full bg-[#141414] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] focus:ring-1 focus:ring-[#FF6B2B]/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Nom */}
                  <div>
                    <label className="block text-sm text-white/50 mb-1.5 font-medium">Nom *</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                      <input
                        type="text"
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                        placeholder="Votre nom"
                        className="w-full bg-[#141414] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] focus:ring-1 focus:ring-[#FF6B2B]/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Téléphone */}
                  <div>
                    <label className="block text-sm text-white/50 mb-1.5 font-medium">Téléphone</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                      <input
                        type="tel"
                        value={telephone}
                        onChange={(e) => setTelephone(e.target.value)}
                        placeholder="+33 6 12 34 56 78"
                        className="w-full bg-[#141414] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] focus:ring-1 focus:ring-[#FF6B2B]/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2 : Votre activité ── */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <p className="text-[#FF6B2B] text-sm font-semibold uppercase tracking-wider mb-2">Étape 2 / 3</p>
                  <h1 className="text-[#F5F5F3] text-2xl font-bold">
                    Parlons de votre activité professionnelle :
                  </h1>
                </div>

                {/* Métier — cartes cliquables */}
                <div>
                  <label className="block text-sm text-white/50 mb-3 font-medium">Votre métier</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {METIERS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMetier(m.id)}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                          metier === m.id
                            ? 'bg-[#FF6B2B]/10 border-[#FF6B2B]/50 ring-1 ring-[#FF6B2B]/20'
                            : 'bg-[#141414] border-white/[0.06] hover:border-white/[0.12]'
                        }`}
                      >
                        <span className="text-xl">{m.emoji}</span>
                        <span className={`text-sm font-medium ${metier === m.id ? 'text-[#FF6B2B]' : 'text-white/60'}`}>
                          {m.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nombre de clients */}
                <div>
                  <label className="block text-sm text-white/50 mb-3 font-medium">Nombre moyen de clients</label>
                  <div className="space-y-2">
                    {NB_CLIENTS.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => setNbClients(n.id)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                          nbClients === n.id
                            ? 'bg-[#FF6B2B]/10 border-[#FF6B2B]/50 ring-1 ring-[#FF6B2B]/20'
                            : 'bg-[#141414] border-white/[0.06] hover:border-white/[0.12]'
                        }`}
                      >
                        <div>
                          <span className={`text-sm font-semibold ${nbClients === n.id ? 'text-[#FF6B2B]' : 'text-[#F5F5F3]'}`}>
                            {n.label}
                          </span>
                          <span className="text-white/25 text-xs ml-2">{n.sub}</span>
                        </div>
                        {nbClients === n.id && (
                          <div className="w-5 h-5 rounded-full bg-[#FF6B2B] flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3 : Vos besoins ── */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <p className="text-[#FF6B2B] text-sm font-semibold uppercase tracking-wider mb-2">Étape 3 / 3</p>
                  <h1 className="text-[#F5F5F3] text-2xl font-bold">
                    Quelles sont vos priorités ?
                  </h1>
                  <p className="text-white/30 text-sm mt-1">Sélectionnez une ou plusieurs options</p>
                </div>

                <div className="space-y-2.5">
                  {PRIORITES.map((p) => {
                    const selected = priorites.includes(p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePriorite(p.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                          selected
                            ? 'bg-[#FF6B2B]/10 border-[#FF6B2B]/50 ring-1 ring-[#FF6B2B]/20'
                            : 'bg-[#141414] border-white/[0.06] hover:border-white/[0.12]'
                        }`}
                      >
                        {/* Checkbox custom */}
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          selected
                            ? 'bg-[#FF6B2B] border-[#FF6B2B]'
                            : 'border-white/20'
                        }`}>
                          {selected && <Check size={12} className="text-white" />}
                        </div>
                        <span className="text-lg">{p.icon}</span>
                        <span className={`text-sm font-medium ${selected ? 'text-[#F5F5F3]' : 'text-white/50'}`}>
                          {p.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Boutons navigation ── */}
            <div className="flex items-center gap-3 pt-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-5 py-3 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all"
                >
                  Retour
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!canNext() || saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enregistrement...
                  </>
                ) : step === 2 ? (
                  <>
                    <Check size={16} />
                    Terminer
                  </>
                ) : (
                  <>
                    Suivant
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* DROITE — Branding + Mascotte          */}
      {/* ══════════════════════════════════════ */}
      <div className="hidden lg:flex w-[45%] bg-[#0d0d0d] flex-col items-center justify-center relative overflow-hidden">

        {/* Gradient décoratif */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF6B2B]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FF6B2B]/3 rounded-full blur-[100px]" />

        <div className="relative z-10 flex flex-col items-center gap-8 px-12">

          {/* Logo Zevo */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FF6B2B] flex items-center justify-center">
              <span className="text-white text-xl font-black">Z</span>
            </div>
            <span className="text-[#F5F5F3] text-2xl font-bold tracking-tight">Zevo</span>
          </div>

          {/* Bulle de BD dynamique */}
          <div className="relative max-w-xs">
            <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-2xl px-6 py-5 shadow-xl shadow-black/20">
              <p className="text-[#F5F5F3] text-sm leading-relaxed font-medium text-center">
                {MASCOT_MESSAGES[step]}
              </p>
            </div>
            {/* Triangle de la bulle */}
            <div className="flex justify-center -mb-1">
              <div className="w-4 h-4 bg-[#1a1a1a] border-r border-b border-white/[0.08] rotate-45 -translate-y-2" />
            </div>
          </div>

          {/* Mascotte — Renard géant */}
          <div className="relative">
            <div className="text-[120px] leading-none select-none drop-shadow-[0_0_40px_rgba(255,107,43,0.15)]">
              🦊
            </div>
            {/* Halo lumineux sous la mascotte */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#FF6B2B]/10 rounded-full blur-xl" />
          </div>

          {/* Texte d'accroche */}
          <p className="text-white/20 text-xs text-center max-w-[220px] mt-2">
            Personnalisons votre espace de travail Zevo 🚀
          </p>
        </div>
      </div>
    </div>
  )
}
