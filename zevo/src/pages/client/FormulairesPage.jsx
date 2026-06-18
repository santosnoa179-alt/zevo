import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { usePageTransition } from '../../hooks/useAnimations'
import { ClipboardCheck, ArrowLeft, ArrowRight, Check } from 'lucide-react'

export default function FormulairesPage() {
  const { user } = useAuth()
  const [formulaires, setFormulaires] = useState([])
  const [loading, setLoading] = useState(true)

  // Formulaire en cours de complétion
  const [activeForm, setActiveForm] = useState(null)
  const [champs, setChamps] = useState([])
  const [currentStep, setCurrentStep] = useState(0)
  const [reponses, setReponses] = useState({})
  const [reponseId, setReponseId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const pageTransition = usePageTransition()

  // ── Charger les formulaires en attente ──
  useEffect(() => {
    if (!user) return
    chargerFormulaires()
  }, [user])

  const chargerFormulaires = async () => {
    setLoading(true)

    // Récupérer les réponses du client (complètes ou non)
    const { data } = await supabase
      .from('formulaire_reponses')
      .select('*, formulaires(titre, description, type)')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })

    setFormulaires(data || [])
    setLoading(false)
  }

  // ── Ouvrir un formulaire pour le remplir ──
  const ouvrirFormulaire = async (rep) => {
    setReponseId(rep.id)
    setActiveForm(rep.formulaires)
    setReponses(rep.reponses || {})
    setCurrentStep(0)
    setSubmitted(false)

    // Charger les champs
    const { data } = await supabase
      .from('formulaire_champs')
      .select('*')
      .eq('formulaire_id', rep.formulaire_id)
      .order('ordre')

    setChamps(data || [])
  }

  // ── Modifier la réponse à un champ ──
  const setReponse = (champId, value) => {
    setReponses(prev => ({ ...prev, [champId]: value }))
  }

  // ── Toggle choix multiple ──
  const toggleChoix = (champId, option) => {
    setReponses(prev => {
      const current = prev[champId] || []
      const updated = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option]
      return { ...prev, [champId]: updated }
    })
  }

  // ── Vérifier si le champ actuel est rempli (si obligatoire) ──
  const champValide = () => {
    if (champs.length === 0) return true
    const champ = champs[currentStep]
    if (!champ?.obligatoire) return true

    const val = reponses[champ.id]
    if (val === undefined || val === null || val === '') return false
    if (Array.isArray(val) && val.length === 0) return false
    return true
  }

  // ── Soumettre le formulaire ──
  const soumettre = async () => {
    setSubmitting(true)

    await supabase
      .from('formulaire_reponses')
      .update({ reponses, complete: true })
      .eq('id', reponseId)

    setSubmitting(false)
    setSubmitted(true)

    // Rafraîchir la liste
    await chargerFormulaires()
  }

  // ── Retour à la liste ──
  const retourListe = () => {
    setActiveForm(null)
    setChamps([])
    setReponses({})
    setReponseId(null)
  }

  // ═══════════════════════════════════════
  // RENDER — Formulaire en cours
  // ═══════════════════════════════════════
  if (activeForm) {
    // Écran de succès après soumission
    if (submitted) {
      return (
        <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Check size={32} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Formulaire envoyé !</h2>
          <p className="text-[var(--text-muted)] text-sm text-center mb-6">
            Vos réponses ont été transmises à votre coach. Merci !
          </p>
          <button
            onClick={retourListe}
            className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors"
          >
            Retour aux formulaires
          </button>
        </div>
      )
    }

    const champ = champs[currentStep]
    const progress = champs.length > 0 ? ((currentStep + 1) / champs.length) * 100 : 0

    return (
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <button
          onClick={retourListe}
          className="flex items-center gap-2 text-[var(--text-muted)] hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Retour
        </button>

        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">{activeForm.titre}</h1>
        {activeForm.description && (
          <p className="text-[var(--text-muted)] text-sm mb-6">{activeForm.description}</p>
        )}

        {/* Barre de progression */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--text-muted)] text-xs">Question {currentStep + 1} / {champs.length}</span>
            <span className="text-[var(--text-muted)] text-xs">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Champ actuel */}
        {champ && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl p-6 mb-6">
            <p className="text-[var(--text-primary)] font-medium mb-1">
              {champ.label}
              {champ.obligatoire && <span className="text-primary ml-1">*</span>}
            </p>
            <p className="text-[var(--text-muted)] text-xs mb-4">{TYPE_LABEL_CLIENT[champ.type_champ]}</p>

            {/* ── Texte libre ── */}
            {champ.type_champ === 'texte' && (
              <textarea
                value={reponses[champ.id] || ''}
                onChange={(e) => setReponse(champ.id, e.target.value)}
                placeholder="Votre réponse..."
                rows={4}
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-primary/50 focus:outline-none transition-colors resize-none"
              />
            )}

            {/* ── Nombre ── */}
            {champ.type_champ === 'nombre' && (
              <input
                type="number"
                value={reponses[champ.id] || ''}
                onChange={(e) => setReponse(champ.id, e.target.value)}
                placeholder="0"
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-primary/50 focus:outline-none transition-colors"
              />
            )}

            {/* ── Note 1-10 ── */}
            {champ.type_champ === 'note_1_10' && (
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setReponse(champ.id, n)}
                    className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${
                      reponses[champ.id] === n
                        ? 'bg-primary text-white scale-110'
                        : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)]/80'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}

            {/* ── Oui / Non ── */}
            {champ.type_champ === 'oui_non' && (
              <div className="flex gap-3">
                {[
                  { val: true, label: 'Oui' },
                  { val: false, label: 'Non' },
                ].map(({ val, label }) => (
                  <button
                    key={label}
                    onClick={() => setReponse(champ.id, val)}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                      reponses[champ.id] === val
                        ? 'bg-primary text-white'
                        : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Choix multiple ── */}
            {champ.type_champ === 'choix_multiple' && (
              <div className="space-y-2">
                {(champ.options || []).map((opt, i) => {
                  const selected = (reponses[champ.id] || []).includes(opt)
                  return (
                    <button
                      key={i}
                      onClick={() => toggleChoix(champ.id, opt)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all ${
                        selected
                          ? 'bg-primary/10 border border-primary/30 text-[var(--text-primary)]'
                          : 'bg-[var(--bg-surface)] border border-[var(--border-base)] text-[var(--text-secondary)] hover:text-white'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center ${
                        selected ? 'bg-primary' : 'border border-white/20'
                      }`}>
                        {selected && <Check size={10} className="text-white" />}
                      </div>
                      {opt}
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── Date ── */}
            {champ.type_champ === 'date' && (
              <input
                type="date"
                value={reponses[champ.id] || ''}
                onChange={(e) => setReponse(champ.id, e.target.value)}
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-primary/50 focus:outline-none transition-colors"
              />
            )}
          </div>
        )}

        {/* Navigation entre les questions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={16} />
            Précédent
          </button>

          {currentStep < champs.length - 1 ? (
            <button
              onClick={() => setCurrentStep(s => s + 1)}
              disabled={!champValide()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-[#e55e24] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Suivant
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={soumettre}
              disabled={submitting || !champValide()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-[#e55e24] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Envoi...' : 'Envoyer'}
              <Check size={16} />
            </button>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // RENDER — Liste des formulaires
  // ═══════════════════════════════════════
  const enAttente = formulaires.filter(f => !f.complete)
  const completes = formulaires.filter(f => f.complete)

  return (
    <div className={`p-6 max-w-4xl mx-auto ${pageTransition.className}`}>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Formulaires</h1>
      <p className="text-[var(--text-muted)] text-sm mb-8">Questionnaires envoyés par votre coach</p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="bg-[var(--bg-card)] rounded-xl h-20 animate-pulse" />)}
        </div>
      ) : formulaires.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-dashed border-[var(--border-base)] p-12 text-center">
          <ClipboardCheck size={32} className="text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)] text-sm">Aucun formulaire pour le moment</p>
          <p className="text-[var(--text-muted)] text-xs mt-1">Votre coach vous en enverra bientôt</p>
        </div>
      ) : (
        <>
          {/* En attente */}
          {enAttente.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                À compléter
                <span className="bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {enAttente.length}
                </span>
              </h2>
              <div className="space-y-3">
                {enAttente.map(f => (
                  <button
                    key={f.id}
                    onClick={() => ouvrirFormulaire(f)}
                    className="w-full bg-[var(--bg-card)] border border-primary/20 rounded-xl p-4 text-left hover:border-primary/40 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[var(--text-primary)] font-medium">{f.formulaires?.titre}</p>
                        {f.formulaires?.description && (
                          <p className="text-[var(--text-muted)] text-xs mt-1">{f.formulaires.description}</p>
                        )}
                        <p className="text-[var(--text-muted)] text-xs mt-1">
                          Reçu le {new Date(f.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                      <span className="text-primary text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Remplir →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Complétés */}
          {completes.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Complétés
              </h2>
              <div className="space-y-3">
                {completes.map(f => (
                  <div
                    key={f.id}
                    className="bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[var(--text-primary)] font-medium">{f.formulaires?.titre}</p>
                        <p className="text-[var(--text-muted)] text-xs mt-1">
                          Complété le {new Date(f.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                      <span className="text-xs text-primary font-medium flex items-center gap-1">
                        <Check size={12} />
                        Envoyé
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Labels pour l'indication sous chaque question
const TYPE_LABEL_CLIENT = {
  texte: 'Répondez librement',
  nombre: 'Entrez un nombre',
  note_1_10: 'Sélectionnez une note de 1 à 10',
  choix_multiple: 'Sélectionnez une ou plusieurs réponses',
  oui_non: 'Choisissez oui ou non',
  date: 'Sélectionnez une date',
}
