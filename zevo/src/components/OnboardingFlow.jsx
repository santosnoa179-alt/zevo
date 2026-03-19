import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useCoachTheme } from '../hooks/useCoachTheme'
import { CheckSquare, Target, Sparkles, ArrowRight, Check, Loader2 } from 'lucide-react'

// Onboarding en 3 étapes affiché au 1er login (onboarding_complete = false)
// Step 1 : Message de bienvenue du coach
// Step 2 : Habitudes pré-assignées par le coach
// Step 3 : Créer son premier objectif personnel
export default function OnboardingFlow({ onComplete }) {
  const { user } = useAuth()
  const { nomApp, messageBienvenue, couleur } = useCoachTheme()

  const [step, setStep] = useState(1)
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
      setLoading(false)
    }
    loadHabitudes()
  }, [user])

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
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? 'w-10' : 'w-6'
              }`}
              style={{ backgroundColor: s <= step ? couleur : 'rgba(255,255,255,0.1)' }}
            />
          ))}
        </div>

        {/* ── Step 1 : Bienvenue ── */}
        {step === 1 && (
          <div className="bg-[#1E1E1E] rounded-2xl p-8 text-center space-y-6 animate-fade-in">
            <div
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
              style={{ backgroundColor: `${couleur}20` }}
            >
              <Sparkles size={32} style={{ color: couleur }} />
            </div>

            <div>
              <h2 className="text-[#F5F5F3] text-xl font-bold mb-2">
                Bienvenue sur {nomApp} !
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
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: couleur }}
            >
              Commencer
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── Step 2 : Habitudes pré-assignées ── */}
        {step === 2 && (
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
              onClick={() => setStep(3)}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: couleur }}
            >
              Continuer
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── Step 3 : Premier objectif ── */}
        {step === 3 && (
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
