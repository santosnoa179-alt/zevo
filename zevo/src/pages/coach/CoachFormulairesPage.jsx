import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  Plus, ArrowLeft, Trash2, GripVertical, Send, Copy,
  FileText, ClipboardCheck, Heart, Star, ChevronDown, ChevronUp, Eye
} from 'lucide-react'

// ── Templates prédéfinis ──
const TEMPLATES = [
  {
    type: 'bilan_initial',
    titre: 'Bilan initial',
    description: 'Questionnaire de démarrage pour mieux connaître votre client',
    icon: FileText,
    champs: [
      { label: 'Quel est votre objectif principal ?', type_champ: 'texte', obligatoire: true },
      { label: 'Comment évaluez-vous votre niveau d\'énergie actuel ?', type_champ: 'note_1_10', obligatoire: true },
      { label: 'Pratiquez-vous une activité sportive ?', type_champ: 'oui_non', obligatoire: true },
      { label: 'Combien d\'heures dormez-vous en moyenne ?', type_champ: 'nombre', obligatoire: false },
      { label: 'Quels domaines souhaitez-vous améliorer ?', type_champ: 'choix_multiple', obligatoire: true, options: ['Sommeil', 'Sport', 'Alimentation', 'Stress', 'Organisation', 'Confiance en soi'] },
      { label: 'Avez-vous des contraintes particulières ?', type_champ: 'texte', obligatoire: false },
    ]
  },
  {
    type: 'check_in',
    titre: 'Check-in hebdomadaire',
    description: 'Suivi rapide en début de semaine',
    icon: ClipboardCheck,
    champs: [
      { label: 'Comment vous sentez-vous cette semaine ?', type_champ: 'note_1_10', obligatoire: true },
      { label: 'Avez-vous atteint vos objectifs de la semaine dernière ?', type_champ: 'oui_non', obligatoire: true },
      { label: 'Qu\'est-ce qui a bien fonctionné ?', type_champ: 'texte', obligatoire: false },
      { label: 'Qu\'est-ce qui a été difficile ?', type_champ: 'texte', obligatoire: false },
      { label: 'Votre priorité pour cette semaine ?', type_champ: 'texte', obligatoire: true },
    ]
  },
  {
    type: 'sante',
    titre: 'Questionnaire santé',
    description: 'Évaluation complète du bien-être physique et mental',
    icon: Heart,
    champs: [
      { label: 'Qualité de sommeil cette semaine', type_champ: 'note_1_10', obligatoire: true },
      { label: 'Niveau de stress', type_champ: 'note_1_10', obligatoire: true },
      { label: 'Nombre de séances de sport cette semaine', type_champ: 'nombre', obligatoire: false },
      { label: 'Avez-vous des douleurs physiques ?', type_champ: 'oui_non', obligatoire: true },
      { label: 'Comment décrivez-vous votre alimentation ?', type_champ: 'choix_multiple', obligatoire: false, options: ['Équilibrée', 'Trop riche', 'Pas assez', 'Irrégulière'] },
      { label: 'Remarques ou symptômes à signaler', type_champ: 'texte', obligatoire: false },
    ]
  },
  {
    type: 'satisfaction',
    titre: 'Satisfaction coaching',
    description: 'Recueillez les retours de vos clients',
    icon: Star,
    champs: [
      { label: 'Satisfaction globale du coaching', type_champ: 'note_1_10', obligatoire: true },
      { label: 'Les séances répondent-elles à vos attentes ?', type_champ: 'oui_non', obligatoire: true },
      { label: 'Qu\'appréciez-vous le plus ?', type_champ: 'texte', obligatoire: false },
      { label: 'Que pourrait-on améliorer ?', type_champ: 'texte', obligatoire: false },
      { label: 'Recommanderiez-vous ce coaching ?', type_champ: 'oui_non', obligatoire: true },
    ]
  },
]

// ── Labels des types de champs ──
const TYPE_LABELS = {
  texte: 'Texte libre',
  nombre: 'Nombre',
  note_1_10: 'Note 1-10',
  choix_multiple: 'Choix multiple',
  oui_non: 'Oui / Non',
  date: 'Date',
}

export default function CoachFormulairesPage() {
  const { user } = useAuth()

  // État principal : liste ou éditeur
  const [vue, setVue] = useState('liste') // 'liste' | 'editeur' | 'reponses'
  const [formulaires, setFormulaires] = useState([])
  const [loading, setLoading] = useState(true)

  // Éditeur
  const [formId, setFormId] = useState(null)
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [typeForm, setTypeForm] = useState('custom')
  const [champs, setChamps] = useState([])
  const [saving, setSaving] = useState(false)

  // Envoi
  const [modalEnvoi, setModalEnvoi] = useState(false)
  const [formEnvoi, setFormEnvoi] = useState(null)
  const [clients, setClients] = useState([])
  const [loadingClients, setLoadingClients] = useState(false)

  // Réponses
  const [reponses, setReponses] = useState([])
  const [repFormulaire, setRepFormulaire] = useState(null)
  const [repChamps, setRepChamps] = useState([])

  // ── Charger les formulaires ──
  useEffect(() => {
    if (!user) return
    chargerFormulaires()
  }, [user])

  const chargerFormulaires = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('formulaires')
      .select('*, formulaire_reponses(count)')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })

    setFormulaires(data || [])
    setLoading(false)
  }

  // ── Créer depuis un template ──
  const creerDepuisTemplate = (template) => {
    setFormId(null)
    setTitre(template.titre)
    setDescription(template.description)
    setTypeForm(template.type)
    setChamps(template.champs.map((c, i) => ({
      ...c,
      id: crypto.randomUUID(),
      ordre: i + 1,
      options: c.options || null,
    })))
    setVue('editeur')
  }

  // ── Créer un formulaire vide ──
  const creerVide = () => {
    setFormId(null)
    setTitre('')
    setDescription('')
    setTypeForm('custom')
    setChamps([])
    setVue('editeur')
  }

  // ── Éditer un formulaire existant ──
  const editerFormulaire = async (form) => {
    setFormId(form.id)
    setTitre(form.titre)
    setDescription(form.description || '')
    setTypeForm(form.type)

    // Charger les champs
    const { data } = await supabase
      .from('formulaire_champs')
      .select('*')
      .eq('formulaire_id', form.id)
      .order('ordre')

    setChamps((data || []).map(c => ({ ...c })))
    setVue('editeur')
  }

  // ── Ajouter un champ ──
  const ajouterChamp = (type_champ = 'texte') => {
    setChamps(prev => [...prev, {
      id: crypto.randomUUID(),
      label: '',
      type_champ,
      options: type_champ === 'choix_multiple' ? ['Option 1', 'Option 2'] : null,
      obligatoire: false,
      ordre: prev.length + 1,
    }])
  }

  // ── Supprimer un champ ──
  const supprimerChamp = (idx) => {
    setChamps(prev => prev.filter((_, i) => i !== idx).map((c, i) => ({ ...c, ordre: i + 1 })))
  }

  // ── Modifier un champ ──
  const modifierChamp = (idx, key, val) => {
    setChamps(prev => prev.map((c, i) => i === idx ? { ...c, [key]: val } : c))
  }

  // ── Déplacer un champ ──
  const deplacerChamp = (idx, direction) => {
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= champs.length) return
    const arr = [...champs]
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    setChamps(arr.map((c, i) => ({ ...c, ordre: i + 1 })))
  }

  // ── Modifier une option de choix multiple ──
  const modifierOption = (champIdx, optIdx, val) => {
    setChamps(prev => prev.map((c, i) => {
      if (i !== champIdx) return c
      const opts = [...(c.options || [])]
      opts[optIdx] = val
      return { ...c, options: opts }
    }))
  }

  const ajouterOption = (champIdx) => {
    setChamps(prev => prev.map((c, i) => {
      if (i !== champIdx) return c
      return { ...c, options: [...(c.options || []), `Option ${(c.options?.length || 0) + 1}`] }
    }))
  }

  const supprimerOption = (champIdx, optIdx) => {
    setChamps(prev => prev.map((c, i) => {
      if (i !== champIdx) return c
      return { ...c, options: (c.options || []).filter((_, j) => j !== optIdx) }
    }))
  }

  // ── Sauvegarder le formulaire ──
  const sauvegarder = async () => {
    if (!titre.trim() || champs.length === 0) return
    setSaving(true)

    try {
      let fId = formId

      if (formId) {
        // Mise à jour du formulaire existant
        await supabase
          .from('formulaires')
          .update({ titre, description, type: typeForm })
          .eq('id', formId)

        // Supprimer tous les anciens champs et recréer
        await supabase
          .from('formulaire_champs')
          .delete()
          .eq('formulaire_id', formId)
      } else {
        // Nouveau formulaire
        const { data } = await supabase
          .from('formulaires')
          .insert({ coach_id: user.id, titre, description, type: typeForm })
          .select()
          .single()

        fId = data.id
      }

      // Insérer les champs
      if (champs.length > 0) {
        await supabase
          .from('formulaire_champs')
          .insert(champs.map((c, i) => ({
            formulaire_id: fId,
            label: c.label,
            type_champ: c.type_champ,
            options: c.options,
            obligatoire: c.obligatoire,
            ordre: i + 1,
          })))
      }

      await chargerFormulaires()
      setVue('liste')
    } finally {
      setSaving(false)
    }
  }

  // ── Supprimer un formulaire ──
  const supprimerFormulaire = async (id) => {
    if (!confirm('Supprimer ce formulaire et toutes ses réponses ?')) return
    await supabase.from('formulaires').delete().eq('id', id)
    await chargerFormulaires()
  }

  // ── Dupliquer un formulaire ──
  const dupliquerFormulaire = async (form) => {
    // Charger les champs de l'original
    const { data: champsOrig } = await supabase
      .from('formulaire_champs')
      .select('*')
      .eq('formulaire_id', form.id)
      .order('ordre')

    // Créer la copie
    const { data: newForm } = await supabase
      .from('formulaires')
      .insert({
        coach_id: user.id,
        titre: `${form.titre} (copie)`,
        description: form.description,
        type: form.type,
      })
      .select()
      .single()

    if (newForm && champsOrig?.length > 0) {
      await supabase
        .from('formulaire_champs')
        .insert(champsOrig.map(c => ({
          formulaire_id: newForm.id,
          label: c.label,
          type_champ: c.type_champ,
          options: c.options,
          obligatoire: c.obligatoire,
          ordre: c.ordre,
        })))
    }

    await chargerFormulaires()
  }

  // ── Ouvrir la modal d'envoi ──
  const ouvrirEnvoi = async (form) => {
    setFormEnvoi(form)
    setLoadingClients(true)
    setModalEnvoi(true)

    const { data } = await supabase
      .from('clients')
      .select('id, profiles(nom, email)')
      .eq('coach_id', user.id)
      .eq('actif', true)

    setClients(data || [])
    setLoadingClients(false)
  }

  // ── Envoyer le formulaire à un client ──
  const envoyerAuClient = async (clientId) => {
    if (!formEnvoi) return

    // Créer une réponse vide (en attente de complétion par le client)
    await supabase
      .from('formulaire_reponses')
      .insert({
        formulaire_id: formEnvoi.id,
        client_id: clientId,
        reponses: {},
        complete: false,
      })

    // Feedback visuel
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, envoye: true } : c
    ))
  }

  // ── Voir les réponses d'un formulaire ──
  const voirReponses = async (form) => {
    setRepFormulaire(form)

    // Charger les champs
    const { data: ch } = await supabase
      .from('formulaire_champs')
      .select('*')
      .eq('formulaire_id', form.id)
      .order('ordre')
    setRepChamps(ch || [])

    // Charger les réponses avec le profil du client
    const { data: rep } = await supabase
      .from('formulaire_reponses')
      .select('*, clients(profiles(nom, email))')
      .eq('formulaire_id', form.id)
      .order('created_at', { ascending: false })

    setReponses(rep || [])
    setVue('reponses')
  }

  // ═══════════════════════════════════════
  // RENDER — Vue liste
  // ═══════════════════════════════════════
  if (vue === 'liste') {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F5F3]">Formulaires</h1>
            <p className="text-white/50 text-sm mt-1">Créez et envoyez des questionnaires à vos clients</p>
          </div>
          <button
            onClick={creerVide}
            className="flex items-center gap-2 bg-[#FF6B2B] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e55e24] transition-colors"
          >
            <Plus size={18} />
            Nouveau formulaire
          </button>
        </div>

        {/* Templates prédéfinis */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TEMPLATES.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.type}
                  onClick={() => creerDepuisTemplate(t)}
                  className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-4 text-left hover:border-[#FF6B2B]/30 transition-colors group"
                >
                  <Icon size={20} className="text-[#FF6B2B] mb-2" />
                  <p className="text-[#F5F5F3] font-medium text-sm">{t.titre}</p>
                  <p className="text-white/40 text-xs mt-1 line-clamp-2">{t.description}</p>
                  <p className="text-[#FF6B2B] text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    Utiliser ce template →
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Liste des formulaires créés */}
        <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Mes formulaires</h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#1E1E1E] rounded-xl h-20 animate-pulse" />
            ))}
          </div>
        ) : formulaires.length === 0 ? (
          <div className="bg-[#1E1E1E] rounded-xl border border-dashed border-white/[0.08] p-12 text-center">
            <FileText size={32} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Aucun formulaire créé</p>
            <p className="text-white/25 text-xs mt-1">Utilisez un template ou créez-en un de zéro</p>
          </div>
        ) : (
          <div className="space-y-3">
            {formulaires.map(f => {
              const nbRep = f.formulaire_reponses?.[0]?.count || 0
              return (
                <div
                  key={f.id}
                  className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[#F5F5F3] font-medium truncate">{f.titre}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40 flex-shrink-0">
                        {TYPE_LABELS[f.type] || f.type}
                      </span>
                    </div>
                    {f.description && (
                      <p className="text-white/40 text-xs mt-1 truncate">{f.description}</p>
                    )}
                    <p className="text-white/30 text-xs mt-1">{nbRep} réponse{nbRep !== 1 ? 's' : ''}</p>
                  </div>

                  <div className="flex items-center gap-1.5 ml-4 flex-shrink-0">
                    <button
                      onClick={() => voirReponses(f)}
                      className="p-2 rounded-lg text-white/30 hover:text-[#FF6B2B] hover:bg-white/[0.04] transition-colors"
                      title="Voir les réponses"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => ouvrirEnvoi(f)}
                      className="p-2 rounded-lg text-white/30 hover:text-[#FF6B2B] hover:bg-white/[0.04] transition-colors"
                      title="Envoyer à un client"
                    >
                      <Send size={16} />
                    </button>
                    <button
                      onClick={() => dupliquerFormulaire(f)}
                      className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
                      title="Dupliquer"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => editerFormulaire(f)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      Éditer
                    </button>
                    <button
                      onClick={() => supprimerFormulaire(f.id)}
                      className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/[0.04] transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Modal envoi ── */}
        {modalEnvoi && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
              <div className="p-5 border-b border-white/[0.08]">
                <h3 className="text-[#F5F5F3] font-semibold">Envoyer « {formEnvoi?.titre} »</h3>
                <p className="text-white/40 text-xs mt-1">Sélectionnez les clients qui recevront ce formulaire</p>
              </div>

              <div className="p-4 overflow-y-auto max-h-[50vh]">
                {loadingClients ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-[#2A2A2A] rounded-lg animate-pulse" />)}
                  </div>
                ) : clients.length === 0 ? (
                  <p className="text-white/30 text-sm text-center py-8">Aucun client actif</p>
                ) : (
                  <div className="space-y-2">
                    {clients.map(c => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#2A2A2A] border border-white/[0.06]"
                      >
                        <div>
                          <p className="text-[#F5F5F3] text-sm font-medium">
                            {c.profiles?.nom || c.profiles?.email || 'Client'}
                          </p>
                          <p className="text-white/30 text-xs">{c.profiles?.email}</p>
                        </div>
                        {c.envoye ? (
                          <span className="text-xs text-green-400 font-medium">Envoyé ✓</span>
                        ) : (
                          <button
                            onClick={() => envoyerAuClient(c.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B2B] text-white text-xs font-semibold hover:bg-[#e55e24] transition-colors"
                          >
                            <Send size={12} />
                            Envoyer
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-white/[0.08]">
                <button
                  onClick={() => { setModalEnvoi(false); setFormEnvoi(null) }}
                  className="w-full py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════
  // RENDER — Vue réponses
  // ═══════════════════════════════════════
  if (vue === 'reponses') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button
          onClick={() => setVue('liste')}
          className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Retour aux formulaires
        </button>

        <h1 className="text-2xl font-bold text-[#F5F5F3] mb-1">Réponses — {repFormulaire?.titre}</h1>
        <p className="text-white/40 text-sm mb-8">{reponses.length} réponse{reponses.length !== 1 ? 's' : ''}</p>

        {reponses.length === 0 ? (
          <div className="bg-[#1E1E1E] rounded-xl border border-dashed border-white/[0.08] p-12 text-center">
            <ClipboardCheck size={32} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Aucune réponse pour ce formulaire</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reponses.map(r => {
              const nom = r.clients?.profiles?.nom || r.clients?.profiles?.email || 'Client'
              return (
                <div key={r.id} className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[#F5F5F3] font-medium">{nom}</p>
                      <p className="text-white/30 text-xs">
                        {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      r.complete
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {r.complete ? 'Complété' : 'En attente'}
                    </span>
                  </div>

                  {r.complete && repChamps.length > 0 && (
                    <div className="space-y-3 border-t border-white/[0.06] pt-4">
                      {repChamps.map(ch => {
                        const val = r.reponses?.[ch.id]
                        return (
                          <div key={ch.id}>
                            <p className="text-white/40 text-xs mb-0.5">{ch.label}</p>
                            <p className="text-[#F5F5F3] text-sm">
                              {val === undefined || val === null || val === ''
                                ? '—'
                                : ch.type_champ === 'oui_non'
                                  ? (val ? 'Oui' : 'Non')
                                  : ch.type_champ === 'note_1_10'
                                    ? `${val}/10`
                                    : ch.type_champ === 'choix_multiple' && Array.isArray(val)
                                      ? val.join(', ')
                                      : String(val)
                              }
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════
  // RENDER — Vue éditeur (builder)
  // ═══════════════════════════════════════
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => setVue('liste')}
        className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <h1 className="text-2xl font-bold text-[#F5F5F3] mb-6">
        {formId ? 'Modifier le formulaire' : 'Nouveau formulaire'}
      </h1>

      {/* Infos du formulaire */}
      <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs mb-1.5">Titre *</label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex : Bilan de démarrage"
              className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-[#F5F5F3] placeholder-white/20 focus:border-[#FF6B2B]/50 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs mb-1.5">Type</label>
            <select
              value={typeForm}
              onChange={(e) => setTypeForm(e.target.value)}
              className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-[#F5F5F3] focus:border-[#FF6B2B]/50 focus:outline-none transition-colors"
            >
              <option value="custom">Personnalisé</option>
              <option value="bilan_initial">Bilan initial</option>
              <option value="check_in">Check-in hebdo</option>
              <option value="sante">Santé</option>
              <option value="satisfaction">Satisfaction</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-white/50 text-xs mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description visible par le client..."
            rows={2}
            className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-[#F5F5F3] placeholder-white/20 focus:border-[#FF6B2B]/50 focus:outline-none transition-colors resize-none"
          />
        </div>
      </div>

      {/* ── Champs du formulaire ── */}
      <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">
        Champs ({champs.length})
      </h2>

      <div className="space-y-3 mb-4">
        {champs.map((champ, idx) => (
          <div
            key={champ.id}
            className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              {/* Grip + réordonnement */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <button
                  onClick={() => deplacerChamp(idx, -1)}
                  className="text-white/20 hover:text-white/60 transition-colors"
                  disabled={idx === 0}
                >
                  <ChevronUp size={14} />
                </button>
                <GripVertical size={14} className="text-white/15" />
                <button
                  onClick={() => deplacerChamp(idx, 1)}
                  className="text-white/20 hover:text-white/60 transition-colors"
                  disabled={idx === champs.length - 1}
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Contenu du champ */}
              <div className="flex-1 space-y-3">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={champ.label}
                    onChange={(e) => modifierChamp(idx, 'label', e.target.value)}
                    placeholder="Intitulé de la question..."
                    className="flex-1 bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F5F5F3] placeholder-white/20 focus:border-[#FF6B2B]/50 focus:outline-none transition-colors"
                  />
                  <select
                    value={champ.type_champ}
                    onChange={(e) => modifierChamp(idx, 'type_champ', e.target.value)}
                    className="bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F5F5F3] focus:border-[#FF6B2B]/50 focus:outline-none transition-colors"
                  >
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Options pour choix multiple */}
                {champ.type_champ === 'choix_multiple' && (
                  <div className="pl-2 space-y-2">
                    {(champ.options || []).map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm border border-white/20 flex-shrink-0" />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => modifierOption(idx, optIdx, e.target.value)}
                          className="flex-1 bg-[#2A2A2A] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F3] focus:border-[#FF6B2B]/50 focus:outline-none transition-colors"
                        />
                        <button
                          onClick={() => supprimerOption(idx, optIdx)}
                          className="text-white/20 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => ajouterOption(idx)}
                      className="text-[#FF6B2B] text-xs hover:underline"
                    >
                      + Ajouter une option
                    </button>
                  </div>
                )}

                {/* Toggle obligatoire */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={champ.obligatoire}
                    onChange={(e) => modifierChamp(idx, 'obligatoire', e.target.checked)}
                    className="accent-[#FF6B2B] w-3.5 h-3.5"
                  />
                  <span className="text-white/40 text-xs">Obligatoire</span>
                </label>
              </div>

              {/* Bouton supprimer */}
              <button
                onClick={() => supprimerChamp(idx)}
                className="p-1.5 text-white/20 hover:text-red-400 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Ajouter un champ */}
      <div className="flex flex-wrap gap-2 mb-8">
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => ajouterChamp(key)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-white/[0.1] text-white/40 text-xs hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30 transition-colors"
          >
            <Plus size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={sauvegarder}
          disabled={saving || !titre.trim() || champs.length === 0}
          className="flex items-center gap-2 bg-[#FF6B2B] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Enregistrement...' : formId ? 'Mettre à jour' : 'Créer le formulaire'}
        </button>
        <button
          onClick={() => setVue('liste')}
          className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
