import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useCoachTheme } from '../hooks/useCoachTheme'
import { CheckSquare, Target, Sparkles, ArrowRight, Check, Loader2, Camera, User } from 'lucide-react'

// Onboarding en 4 étapes affiché au 1er login (onboarding_complete = false)
// Step 1 : Profil (prénom, nom, photo)
// Step 2 : Message de bienvenue du coach
// Step 3 : Habitudes pré-assignées par le coach
// Step 4 : Créer son premier objectif personnel
export default function OnboardingFlow({ onComplete }) {
  const { user } = useAuth()
  const { nomApp, messageBienvenue, couleur } = useCoachTheme()

  const [step, setStep] = useState(1)
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)

  const [habitudes, setHabitudes] = useState([])
  const [objectifTitre, setObjectifTitre] = useState('')
  const [loading, setLoading] = useState(true)
  const [finishing, setFinishing] = useState(false)

  // Charge les habitudes pré-assignées par le coach
  useEffect(() => {
    if (!user) return
    const loadHabitudes = async () => {
      const { data } = await supabase
        .from('habitudes')
        .select('id, nom, couleur')
        .eq('client_id', user.id)
        .not('assigned_by', 'is', null)

      setHabitudes(data || [])

      // Pré-remplir le nom depuis profiles si existant
      const { data: profile } = await supabase
        .from('profiles')
        .select('nom, prenom')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.nom) setNom(profile.nom)
      if (profile?.prenom) setPrenom(profile.prenom)

      setLoading(false)
    }
    loadHabitudes()
  }, [user])

  // Gère la sélection de photo
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  // Sauvegarde le profil (step 1 → step 2)
  const saveProfile = async () => {
    setUploadingAvatar(true)

    let avatar_url = null

    // Upload avatar si sélectionné
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })

      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        avatar_url = urlData.publicUrl
      }
    }

    // Mise à jour du profil
    const updates = {}
    if (prenom.trim()) updates.prenom = prenom.trim()
    if (nom.trim()) updates.nom = nom.trim()
    if (avatar_url) updates.avatar_url = avatar_url

    if (Object.keys(updates).length > 0) {
      await supabase.from('profiles').update(updates).eq('id', user.id)
    }

    setUploadingAvatar(false)
    setStep(2)
  }

  // Termine l'onboarding — crée l'objectif si renseigné + met à jour le flag
  const finish = async () => {
    setFinishing(true)

    // Crée l'objectif personnel si le titre est rempli
    if (objectifTitre.trim()) {
      await supabase.from('objectifs').insert({
        client_id: user.id,
        titre: objectifTitre.trim(),
        peut_supprimer: true,
      })
    }

    // Marque l'onboarding comme terminé
    await supabase
      .from('clients')
      .update({ onboarding_complete: true })
      .eq('id', user.id)

    setFinishing(false)
    onComplete()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0D0D0D]/95 backdrop-blur-sm flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} style={{ color: couleur }} />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0D0D0D]/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Indicateur de progression */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? 'w-10' : 'w-6'
              }`}
              style={{ backgroundColor: s <= step ? couleur : 'rgba(255,255,255,0.1)' }}
            />
          ))}
        </div>

        {/* ── Step 1 : Profil ── */}
        {step === 1 && (
          <div className="bg-[#1E1E1E] rounded-2xl p-8 space-y-6 animate-fade-in">
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${couleur}20` }}
              >
                <User size={24} style={{ color: couleur }} />
              </div>
              <h2 className="text-[#F5F5F3] text-xl font-bold mb-1">Ton profil</h2>
              <p className="text-white/40 text-sm">Dis-nous en un peu plus sur toi</p>
            </div>

            {/* Avatar */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-24 h-24 rounded-full overflow-hidden group"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#2A2A2A] flex items-center justify-center">
                    <User size={36} className="text-white/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Prénom & Nom */}
            <div className="space-y-3">
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Prénom"
                className="w-full bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-4 py-3 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary,#FF6B2B)]/50 transition-colors"
              />
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Nom"
                className="w-full bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-4 py-3 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary,#FF6B2B)]/50 transition-colors"
              />
            </div>

            <button
              onClick={saveProfile}
              disabled={uploadingAvatar}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: couleur }}
            >
              {uploadingAvatar ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowRight size={16} />
              )}
              {uploadingAvatar ? 'Enregistrement…' : 'Continuer'}
            </button>
          </div>
        )}

        {/* ── Step 2 : Bienvenue ── */}
        {step === 2 && (
          <div className="bg-[#1E1E1E] rounded-2xl p-8 text-center space-y-6 animate-fade-in">
            <div
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
              style={{ backgroundColor: `${couleur}20` }}
            >
              <Sparkles size={32} style={{ color: couleur }} />
            </div>

            <div>
              <h2 className="text-[#F5F5F3] text-xl font-bold mb-2">
                Bienvenue{prenom ? ` ${prenom}` : ''} sur {nomApp} !
              </h2>
              {messageBienvenue ? (
                <p className="text-white/60 text-sm leading-relaxed">
                  {messageBienvenue}
                </p>
              ) : (
                <p className="text-white/60 text-sm leading-relaxed">
                  Ton espace personnel est prêt. On va configurer les bases ensemble en quelques secondes.
                </p>
              )}
            </div>

            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: couleur }}
            >
              Commencer
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── Step 3 : Habitudes pré-assignées ── */}
        {step === 3 && (
          <div className="bg-[#1E1E1E] rounded-2xl p-8 space-y-6 animate-fade-in">
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${couleur}20` }}
              >
                <CheckSquare size={24} style={{ color: couleur }} />
              </div>
              <h2 className="text-[#F5F5F3] text-xl font-bold mb-1">Tes habitudes</h2>
              <p className="text-white/40 text-sm">
                {habitudes.length > 0
                  ? 'Ton coach t\'a déjà préparé ces habitudes :'
                  : 'Ton coach n\'a pas encore assigné d\'habitudes — tu pourras en créer toi-même !'
                }
              </p>
            </div>

            {habitudes.length > 0 && (
              <div className="space-y-2">
                {habitudes.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#2A2A2A]/50"
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: h.couleur || couleur }}
                    />
                    <span className="text-[#F5F5F3] text-sm">{h.nom}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setStep(4)}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: couleur }}
            >
              Continuer
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── Step 4 : Premier objectif ── */}
        {step === 4 && (
          <div className="bg-[#1E1E1E] rounded-2xl p-8 space-y-6 animate-fade-in">
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${couleur}20` }}
              >
                <Target size={24} style={{ color: couleur }} />
              </div>
              <h2 className="text-[#F5F5F3] text-xl font-bold mb-1">Ton premier objectif</h2>
              <p className="text-white/40 text-sm">
                Définis un objectif personnel que tu veux atteindre
              </p>
            </div>

            <input
              type="text"
              value={objectifTitre}
              onChange={(e) => setObjectifTitre(e.target.value)}
              placeholder="Ex : Perdre 5 kg, Méditer chaque jour, Courir un 10 km..."
              className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-4 py-3 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[var(--color-primary,#FF6B2B)]/50 transition-colors"
            />

            <div className="flex gap-3">
              <button
                onClick={finish}
                disabled={finishing}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: couleur }}
              >
                {finishing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {objectifTitre.trim() ? 'Valider et commencer' : 'Passer et commencer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
