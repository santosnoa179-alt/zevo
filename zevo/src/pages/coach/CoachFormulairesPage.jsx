import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  Plus, ArrowLeft, Trash2, GripVertical, Send, Copy, Edit3,
  FileText, ClipboardCheck, Heart, Star, ChevronDown, ChevronUp, Eye,
  Search, Filter, ToggleLeft, ToggleRight, CheckCircle2, Circle,
  BarChart3, Clock, RefreshCw, X, Zap, GitBranch, Play,
  Calendar, Repeat, Users, Dumbbell
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
      { label: "Comment évaluez-vous votre niveau d'énergie actuel ?", type_champ: 'note_1_10', obligatoire: true },
      { label: 'Pratiquez-vous une activité sportive ?', type_champ: 'oui_non', obligatoire: true },
      { label: "Combien d'heures dormez-vous en moyenne ?", type_champ: 'nombre', obligatoire: false },
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
      { label: "Qu'est-ce qui a bien fonctionné ?", type_champ: 'texte', obligatoire: false },
      { label: "Qu'est-ce qui a été difficile ?", type_champ: 'texte', obligatoire: false },
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
      { label: "Nombre de séances de sport cette semaine", type_champ: 'nombre', obligatoire: false },
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
      { label: "Qu'appréciez-vous le plus ?", type_champ: 'texte', obligatoire: false },
      { label: 'Que pourrait-on améliorer ?', type_champ: 'texte', obligatoire: false },
      { label: 'Recommanderiez-vous ce coaching ?', type_champ: 'oui_non', obligatoire: true },
    ]
  },
]

const TYPE_LABELS = {
  texte: 'Texte libre',
  nombre: 'Nombre',
  note_1_10: 'Note 1-10',
  choix_multiple: 'Choix multiple',
  oui_non: 'Oui / Non',
  date: 'Date',
  custom: 'Personnalisé',
  bilan_initial: 'Bilan initial',
  check_in: 'Check-in',
  sante: 'Santé',
  satisfaction: 'Satisfaction',
}

// ── Helpers ──
function timeAgo(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `il y a ${days}j`
  return `il y a ${Math.floor(days / 30)}mois`
}

function computeScore(reponses, champs) {
  if (!reponses || !champs) return null
  const noteChamps = champs.filter(c => c.type_champ === 'note_1_10')
  if (noteChamps.length === 0) return null
  let total = 0, count = 0
  noteChamps.forEach(c => {
    const val = reponses[c.id]
    if (val != null && !isNaN(val)) {
      const poids = c.poids_score || 1
      total += Number(val) * poids
      count += poids
    }
  })
  return count > 0 ? Math.round((total / count) * 10) / 10 : null
}

function scoreColor(score) {
  if (score >= 7) return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' }
  if (score >= 4) return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' }
  return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' }
}

// ══════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════

export default function CoachFormulairesPage() {
  const { user } = useAuth()

  // Vue
  const [vue, setVue] = useState('liste')
  const [formulaires, setFormulaires] = useState([])
  const [loading, setLoading] = useState(true)

  // Liste — filtres (#4)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Éditeur
  const [formId, setFormId] = useState(null)
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [typeForm, setTypeForm] = useState('custom')
  const [champs, setChamps] = useState([])
  const [saving, setSaving] = useState(false)
  const [formStatut, setFormStatut] = useState('actif') // #5

  // Récurrence (#11)
  const [recurrenceActif, setRecurrenceActif] = useState(false)
  const [recurrenceInterval, setRecurrenceInterval] = useState('hebdomadaire')
  const [recurrenceJour, setRecurrenceJour] = useState(1)
  const [recurrenceHeure, setRecurrenceHeure] = useState('08:00')

  // Envoi
  const [modalEnvoi, setModalEnvoi] = useState(false)
  const [formEnvoi, setFormEnvoi] = useState(null)
  const [clients, setClients] = useState([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [selectedClients, setSelectedClients] = useState(new Set()) // #7

  // Preview (#8)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Réponses
  const [reponses, setReponses] = useState([])
  const [repFormulaire, setRepFormulaire] = useState(null)
  const [repChamps, setRepChamps] = useState([])

  // Dernières réponses (#6)
  const [lastResponseDates, setLastResponseDates] = useState({})

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

    const forms = data || []
    setFormulaires(forms)

    // Fetch last response dates (#6)
    if (forms.length > 0) {
      const ids = forms.map(f => f.id)
      const { data: lastReps } = await supabase
        .from('formulaire_reponses')
        .select('formulaire_id, created_at')
        .in('formulaire_id', ids)
        .order('created_at', { ascending: false })

      const dateMap = {}
      ;(lastReps || []).forEach(r => {
        if (!dateMap[r.formulaire_id]) dateMap[r.formulaire_id] = r.created_at
      })
      setLastResponseDates(dateMap)
    }

    setLoading(false)
  }

  // ── Filtrage de la liste (#4) ──
  const filteredFormulaires = useMemo(() => {
    let list = formulaires
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(f => f.titre?.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q))
    }
    if (filterType) list = list.filter(f => f.type === filterType)
    if (filterStatus) list = list.filter(f => (f.statut || 'actif') === filterStatus)
    return list
  }, [formulaires, searchQuery, filterType, filterStatus])

  // ── Créer depuis un template ──
  const creerDepuisTemplate = (template) => {
    setFormId(null)
    setTitre(template.titre)
    setDescription(template.description)
    setTypeForm(template.type)
    setFormStatut('actif')
    setRecurrenceActif(false)
    setChamps(template.champs.map((c, i) => ({
      ...c, id: crypto.randomUUID(), ordre: i + 1,
      options: c.options || null, condition_affichage: null, poids_score: null,
    })))
    setVue('editeur')
  }

  const creerVide = () => {
    setFormId(null); setTitre(''); setDescription(''); setTypeForm('custom')
    setFormStatut('actif'); setRecurrenceActif(false); setChamps([])
    setVue('editeur')
  }

  const editerFormulaire = async (form) => {
    setFormId(form.id)
    setTitre(form.titre)
    setDescription(form.description || '')
    setTypeForm(form.type)
    setFormStatut(form.statut || 'actif')
    const rec = form.recurrence
    if (rec?.actif) {
      setRecurrenceActif(true)
      setRecurrenceInterval(rec.intervalle || 'hebdomadaire')
      setRecurrenceJour(rec.jour || 1)
      setRecurrenceHeure(rec.heure || '08:00')
    } else {
      setRecurrenceActif(false)
    }

    const { data } = await supabase
      .from('formulaire_champs').select('*').eq('formulaire_id', form.id).order('ordre')
    setChamps((data || []).map(c => ({ ...c })))
    setVue('editeur')
  }

  // ── Champs CRUD ──
  const ajouterChamp = (type_champ = 'texte') => {
    setChamps(prev => [...prev, {
      id: crypto.randomUUID(), label: '', type_champ,
      options: type_champ === 'choix_multiple' ? ['Option 1', 'Option 2'] : null,
      obligatoire: false, ordre: prev.length + 1,
      condition_affichage: null, poids_score: null,
    }])
  }
  const supprimerChamp = (idx) => setChamps(prev => prev.filter((_, i) => i !== idx).map((c, i) => ({ ...c, ordre: i + 1 })))
  const modifierChamp = (idx, key, val) => setChamps(prev => prev.map((c, i) => i === idx ? { ...c, [key]: val } : c))
  const deplacerChamp = (idx, direction) => {
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= champs.length) return
    const arr = [...champs]
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    setChamps(arr.map((c, i) => ({ ...c, ordre: i + 1 })))
  }
  const modifierOption = (champIdx, optIdx, val) => {
    setChamps(prev => prev.map((c, i) => {
      if (i !== champIdx) return c
      const opts = [...(c.options || [])]; opts[optIdx] = val
      return { ...c, options: opts }
    }))
  }
  const ajouterOption = (champIdx) => {
    setChamps(prev => prev.map((c, i) => i !== champIdx ? c : { ...c, options: [...(c.options || []), `Option ${(c.options?.length || 0) + 1}`] }))
  }
  const supprimerOption = (champIdx, optIdx) => {
    setChamps(prev => prev.map((c, i) => i !== champIdx ? c : { ...c, options: (c.options || []).filter((_, j) => j !== optIdx) }))
  }

  // ── Sauvegarder ──
  const sauvegarder = async () => {
    if (!titre.trim() || champs.length === 0) return
    setSaving(true)
    try {
      let fId = formId
      const recurrence = recurrenceActif
        ? { intervalle: recurrenceInterval, jour: recurrenceJour, heure: recurrenceHeure, actif: true }
        : null

      if (formId) {
        await supabase.from('formulaires')
          .update({ titre, description, type: typeForm, statut: formStatut, recurrence })
          .eq('id', formId)
        await supabase.from('formulaire_champs').delete().eq('formulaire_id', formId)
      } else {
        const { data } = await supabase.from('formulaires')
          .insert({ coach_id: user.id, titre, description, type: typeForm, statut: formStatut, recurrence })
          .select().single()
        fId = data.id
      }

      if (champs.length > 0) {
        await supabase.from('formulaire_champs').insert(champs.map((c, i) => ({
          formulaire_id: fId, label: c.label, type_champ: c.type_champ,
          options: c.options, obligatoire: c.obligatoire, ordre: i + 1,
          condition_affichage: c.condition_affichage || null,
          poids_score: c.type_champ === 'note_1_10' ? (c.poids_score || 1) : null,
        })))
      }
      await chargerFormulaires()
      setVue('liste')
    } finally { setSaving(false) }
  }

  // ── Supprimer / Dupliquer ──
  const supprimerFormulaire = async (id) => {
    if (!confirm('Supprimer ce formulaire et toutes ses réponses ?')) return
    await supabase.from('formulaires').delete().eq('id', id)
    await chargerFormulaires()
  }

  const dupliquerFormulaire = async (form) => {
    const { data: champsOrig } = await supabase
      .from('formulaire_champs').select('*').eq('formulaire_id', form.id).order('ordre')
    const { data: newForm } = await supabase.from('formulaires')
      .insert({ coach_id: user.id, titre: `${form.titre} (copie)`, description: form.description, type: form.type, statut: 'brouillon' })
      .select().single()
    if (newForm && champsOrig?.length > 0) {
      await supabase.from('formulaire_champs').insert(champsOrig.map(c => ({
        formulaire_id: newForm.id, label: c.label, type_champ: c.type_champ,
        options: c.options, obligatoire: c.obligatoire, ordre: c.ordre,
        condition_affichage: c.condition_affichage, poids_score: c.poids_score,
      })))
    }
    await chargerFormulaires()
  }

  // ── Toggle statut (#5) ──
  const toggleStatut = async (form) => {
    const newStatut = (form.statut || 'actif') === 'actif' ? 'brouillon' : 'actif'
    await supabase.from('formulaires').update({ statut: newStatut }).eq('id', form.id)
    setFormulaires(prev => prev.map(f => f.id === form.id ? { ...f, statut: newStatut } : f))
  }

  // ── Envoi (#7 — bulk + relance) ──
  const ouvrirEnvoi = async (form) => {
    setFormEnvoi(form)
    setLoadingClients(true)
    setSelectedClients(new Set())
    setModalEnvoi(true)

    const [{ data: cl }, { data: existingReps }] = await Promise.all([
      supabase.from('clients').select('id, profiles(nom, email)').eq('coach_id', user.id).eq('actif', true),
      supabase.from('formulaire_reponses').select('client_id, complete').eq('formulaire_id', form.id),
    ])

    const repsMap = {}
    ;(existingReps || []).forEach(r => {
      if (!repsMap[r.client_id] || r.complete) repsMap[r.client_id] = r.complete ? 'complete' : 'pending'
    })

    setClients((cl || []).map(c => ({ ...c, repStatus: repsMap[c.id] || null })))
    setLoadingClients(false)
  }

  const envoyerAuClient = async (clientId) => {
    if (!formEnvoi) return
    await supabase.from('formulaire_reponses').insert({
      formulaire_id: formEnvoi.id, client_id: clientId, reponses: {}, complete: false,
    })
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, repStatus: 'pending' } : c))
  }

  const envoyerBulk = async () => {
    if (!formEnvoi || selectedClients.size === 0) return
    const toSend = [...selectedClients].filter(id => {
      const c = clients.find(cl => cl.id === id)
      return !c?.repStatus
    })
    if (toSend.length === 0) return
    await supabase.from('formulaire_reponses').insert(
      toSend.map(id => ({ formulaire_id: formEnvoi.id, client_id: id, reponses: {}, complete: false }))
    )
    setClients(prev => prev.map(c => toSend.includes(c.id) ? { ...c, repStatus: 'pending' } : c))
    setSelectedClients(new Set())
  }

  const envoyerATous = async () => {
    if (!formEnvoi) return
    const toSend = clients.filter(c => !c.repStatus).map(c => c.id)
    if (toSend.length === 0) return
    await supabase.from('formulaire_reponses').insert(
      toSend.map(id => ({ formulaire_id: formEnvoi.id, client_id: id, reponses: {}, complete: false }))
    )
    setClients(prev => prev.map(c => toSend.includes(c.id) ? { ...c, repStatus: 'pending' } : c))
  }

  const relancerClient = async (clientId) => {
    // Re-create a pending response = relance
    if (!formEnvoi) return
    await supabase.from('formulaire_reponses').insert({
      formulaire_id: formEnvoi.id, client_id: clientId, reponses: {}, complete: false,
    })
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, repStatus: 'relanced' } : c))
  }

  const toggleSelectClient = (id) => {
    setSelectedClients(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Voir les réponses ──
  const voirReponses = async (form) => {
    setRepFormulaire(form)
    const [{ data: ch }, { data: rep }] = await Promise.all([
      supabase.from('formulaire_champs').select('*').eq('formulaire_id', form.id).order('ordre'),
      supabase.from('formulaire_reponses').select('*, clients(profiles(nom, email))')
        .eq('formulaire_id', form.id).order('created_at', { ascending: false }),
    ])
    setRepChamps(ch || [])
    setReponses(rep || [])
    setVue('reponses')
  }

  // ── Stats pour les réponses (#2 + #10) ──
  const repStats = useMemo(() => {
    if (!reponses.length || !repChamps.length) return null
    const completed = reponses.filter(r => r.complete)
    const pending = reponses.filter(r => !r.complete)

    // Score moyen (#10)
    const scores = completed.map(r => computeScore(r.reponses, repChamps)).filter(s => s !== null)
    const avgScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null

    // Stats par champ
    const champStats = repChamps.map(ch => {
      const vals = completed.map(r => r.reponses?.[ch.id]).filter(v => v != null)
      if (ch.type_champ === 'note_1_10') {
        const nums = vals.map(Number).filter(n => !isNaN(n))
        return { ...ch, moyenne: nums.length > 0 ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null, count: nums.length }
      }
      if (ch.type_champ === 'oui_non') {
        const oui = vals.filter(v => v === true || v === 'true' || v === 'Oui').length
        return { ...ch, oui, non: vals.length - oui, count: vals.length }
      }
      if (ch.type_champ === 'choix_multiple') {
        const freq = {}
        vals.forEach(v => (Array.isArray(v) ? v : [v]).forEach(opt => { freq[opt] = (freq[opt] || 0) + 1 }))
        return { ...ch, freq, count: vals.length }
      }
      return { ...ch, count: vals.length }
    })

    return { completed: completed.length, pending: pending.length, avgScore, champStats }
  }, [reponses, repChamps])

  // ══════════════════════════════════════════
  // RENDER — Vue liste
  // ══════════════════════════════════════════
  if (vue === 'liste') {
    return (
      <div className="p-6 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Formulaires</h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">Créez et envoyez des questionnaires à vos clients</p>
          </div>
          <button onClick={creerVide}
            className="flex items-center gap-2 bg-[#FF6B2B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e55e24] transition-all duration-200 hover:shadow-lg hover:shadow-[#FF6B2B]/20">
            <Plus size={18} /> Nouveau formulaire
          </button>
        </div>

        {/* Templates (#1 — cartes premium) */}
        <div className="mb-10">
          <h2 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.15em] mb-4">Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TEMPLATES.map(t => {
              const Icon = t.icon
              return (
                <button key={t.type} onClick={() => creerDepuisTemplate(t)}
                  className="group relative bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-2xl p-5 text-left transition-all duration-200 hover:border-[#FF6B2B]/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#FF6B2B]/[0.06]">
                  <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center mb-3">
                    <Icon size={20} className="text-[#FF6B2B]" />
                  </div>
                  <p className="text-[var(--text-primary)] font-semibold text-sm">{t.titre}</p>
                  <p className="text-[var(--text-secondary)] text-xs mt-1.5 leading-relaxed line-clamp-2">{t.description}</p>
                  <p className="text-[#FF6B2B] text-[11px] font-medium mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    Utiliser ce template
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Filters bar (#4) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <h2 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.15em]">Mes formulaires</h2>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors w-40"
              />
            </div>
            {/* Type filter */}
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors cursor-pointer">
              <option value="">Tous types</option>
              {Object.entries(TYPE_LABELS).filter(([k]) => !['texte','nombre','note_1_10','choix_multiple','oui_non','date'].includes(k)).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            {/* Status filter (#5) */}
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/40 transition-colors cursor-pointer">
              <option value="">Tous statuts</option>
              <option value="actif">Actifs</option>
              <option value="brouillon">Brouillons</option>
            </select>
          </div>
        </div>

        {/* Liste (#2, #3, #5, #6) */}
        {loading ? (
          <div className="bg-[var(--bg-card)]/40 border border-[var(--border-base)] rounded-2xl overflow-hidden">
            {[1, 2, 3].map(i => (
              <div key={i} className="px-5 py-4 border-b border-[var(--border-base)] last:border-b-0">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-[var(--bg-surface)] rounded animate-pulse" />
                    <div className="h-3 w-64 bg-[var(--bg-surface)] rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredFormulaires.length === 0 ? (
          /* Empty state (#3) */
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-dashed border-[var(--border-base)] p-14 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#FF6B2B]/[0.06] flex items-center justify-center mx-auto mb-5">
              <FileText size={28} className="text-[#FF6B2B]/40" />
            </div>
            <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">
              {formulaires.length === 0 ? 'Aucun formulaire créé' : 'Aucun résultat'}
            </p>
            <p className="text-[var(--text-muted)] text-xs mb-5">
              {formulaires.length === 0 ? 'Commencez avec un template ou créez-en un de zéro' : 'Essayez de modifier vos filtres'}
            </p>
            {formulaires.length === 0 && (
              <button onClick={creerVide}
                className="inline-flex items-center gap-2 bg-[#FF6B2B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e55e24] transition-colors">
                <Plus size={16} /> Créer mon premier formulaire
              </button>
            )}
          </div>
        ) : (
          <div className="bg-[var(--bg-card)]/40 border border-[var(--border-base)] rounded-2xl overflow-hidden">
            {filteredFormulaires.map((f, idx) => {
              const nbRep = f.formulaire_reponses?.[0]?.count || 0
              const isActif = (f.statut || 'actif') === 'actif'
              const lastDate = lastResponseDates[f.id]
              const hasRecurrence = f.recurrence?.actif

              return (
                <div key={f.id}
                  className={`group flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-[var(--bg-surface)] ${
                    idx < filteredFormulaires.length - 1 ? 'border-b border-[var(--border-base)]' : ''
                  }`}>

                  {/* Status dot + icon */}
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center">
                      <FileText size={16} className="text-[#FF6B2B]" />
                    </div>
                    {/* Status dot */}
                    <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1E1E1E] ${
                      isActif ? 'bg-green-400' : 'bg-[var(--text-muted)]'
                    }`} />
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[var(--text-primary)] font-medium text-sm truncate">{f.titre}</p>
                      {!isActif && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)] font-medium uppercase">Brouillon</span>
                      )}
                      {hasRecurrence && (
                        f.recurrence?.intervalle === 'post_seance'
                          ? <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-[#FF6B2B]/10 text-[#FF6B2B]/70 font-semibold flex-shrink-0"><Dumbbell size={10} />Post-séance</span>
                          : <Repeat size={12} className="text-[#FF6B2B]/60 flex-shrink-0" />
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)] flex-shrink-0 font-medium">
                        {TYPE_LABELS[f.type] || f.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {f.description && <p className="text-[var(--text-muted)] text-xs truncate max-w-sm">{f.description}</p>}
                      {lastDate && <span className="text-[var(--text-muted)] text-[10px] flex-shrink-0">{timeAgo(lastDate)}</span>}
                    </div>
                  </div>

                  {/* Badge réponses (#3) */}
                  <div className="flex-shrink-0">
                    {nbRep === 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)] font-medium">
                        0 réponse
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/20 font-semibold">
                        {nbRep} réponse{nbRep !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Actions (#4 hover colors) */}
                  <div className="flex items-center gap-1 ml-1 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity duration-150">
                    <button onClick={() => voirReponses(f)} title="Voir les réponses"
                      className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[#FF6B2B] hover:bg-[#FF6B2B]/10 transition-colors"><Eye size={18} /></button>
                    <button onClick={() => ouvrirEnvoi(f)} title="Envoyer"
                      className={`p-2 rounded-lg transition-colors ${isActif ? 'text-[var(--text-secondary)] hover:text-[#FF6B2B] hover:bg-[#FF6B2B]/10' : 'text-[var(--text-muted)] cursor-not-allowed'}`}
                      disabled={!isActif}><Send size={18} /></button>
                    <button onClick={() => dupliquerFormulaire(f)} title="Dupliquer"
                      className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"><Copy size={18} /></button>
                    <button onClick={() => editerFormulaire(f)} title="Éditer"
                      className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[#FF6B2B] hover:bg-[#FF6B2B]/10 transition-colors"><Edit3 size={18} /></button>
                    <button onClick={() => toggleStatut(f)} title={isActif ? 'Mettre en brouillon' : 'Activer'}
                      className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors">
                      {isActif ? <ToggleRight size={18} className="text-green-400" /> : <ToggleLeft size={18} />}
                    </button>
                    <button onClick={() => supprimerFormulaire(f.id)} title="Supprimer"
                      className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Modal envoi (#7 — bulk + relance) ── */}
        {modalEnvoi && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => { setModalEnvoi(false); setFormEnvoi(null) }} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="px-5 py-4 border-b border-[var(--border-base)] flex items-center justify-between">
                  <div>
                    <h3 className="text-[var(--text-primary)] font-semibold text-sm">Envoyer « {formEnvoi?.titre} »</h3>
                    <p className="text-[var(--text-muted)] text-xs mt-0.5">Sélectionnez les destinataires</p>
                  </div>
                  <button onClick={() => { setModalEnvoi(false); setFormEnvoi(null) }}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"><X size={18} /></button>
                </div>

                {/* Bulk actions */}
                {!loadingClients && clients.length > 0 && (
                  <div className="px-5 py-3 border-b border-[var(--border-base)] flex items-center gap-2">
                    <button onClick={envoyerATous}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B2B] text-white text-xs font-semibold hover:bg-[#e55e24] transition-colors">
                      <Users size={12} /> Envoyer à tous
                    </button>
                    {selectedClients.size > 0 && (
                      <button onClick={envoyerBulk}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-medium hover:bg-[var(--border-base)] transition-colors">
                        <Send size={12} /> Envoyer ({selectedClients.size})
                      </button>
                    )}
                    <span className="text-[var(--text-muted)] text-[10px] ml-auto">
                      {clients.filter(c => !c.repStatus).length} non envoyé(s)
                    </span>
                  </div>
                )}

                {/* Client list */}
                <div className="p-4 overflow-y-auto max-h-[50vh]">
                  {loadingClients ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <div key={i} className="h-14 bg-[var(--bg-surface)] rounded-xl animate-pulse" />)}
                    </div>
                  ) : clients.length === 0 ? (
                    <p className="text-[var(--text-muted)] text-sm text-center py-8">Aucun client actif</p>
                  ) : (
                    <div className="space-y-1.5">
                      {clients.map(c => {
                        const nom = c.profiles?.nom || c.profiles?.email || 'Client'
                        return (
                          <div key={c.id}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-surface)] transition-colors">
                            {/* Checkbox for bulk */}
                            {!c.repStatus && (
                              <button onClick={() => toggleSelectClient(c.id)} className="flex-shrink-0">
                                {selectedClients.has(c.id)
                                  ? <CheckCircle2 size={18} className="text-[#FF6B2B]" />
                                  : <Circle size={18} className="text-[var(--text-muted)]" />
                                }
                              </button>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[var(--text-primary)] text-sm font-medium truncate">{nom}</p>
                              <p className="text-[var(--text-muted)] text-[11px]">{c.profiles?.email}</p>
                            </div>
                            {c.repStatus === 'complete' ? (
                              <span className="text-[11px] text-green-400 font-medium flex items-center gap-1">
                                <CheckCircle2 size={12} /> Complété
                              </span>
                            ) : c.repStatus === 'pending' ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-yellow-400/70">En attente</span>
                                <button onClick={() => relancerClient(c.id)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)] text-[10px] hover:text-[#FF6B2B] hover:bg-[#FF6B2B]/10 transition-colors">
                                  <RefreshCw size={10} /> Relancer
                                </button>
                              </div>
                            ) : c.repStatus === 'relanced' ? (
                              <span className="text-[11px] text-[#FF6B2B] font-medium">Relancé</span>
                            ) : (
                              <button onClick={() => envoyerAuClient(c.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B2B] text-white text-xs font-semibold hover:bg-[#e55e24] transition-colors">
                                <Send size={12} /> Envoyer
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="px-5 py-3 border-t border-[var(--border-base)]">
                  <button onClick={() => { setModalEnvoi(false); setFormEnvoi(null) }}
                    className="w-full py-2 rounded-xl text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors">Fermer</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════
  // RENDER — Vue réponses (#2, #10)
  // ══════════════════════════════════════════
  if (vue === 'reponses') {
    return (
      <div className="p-6 w-full max-w-4xl">
        <button onClick={() => setVue('liste')}
          className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm mb-6 transition-colors">
          <ArrowLeft size={16} /> Retour aux formulaires
        </button>

        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1 tracking-tight">Réponses — {repFormulaire?.titre}</h1>
        <p className="text-[var(--text-secondary)] text-sm mb-6">{reponses.length} réponse{reponses.length !== 1 ? 's' : ''}</p>

        {/* Stats summary (#2, #10) */}
        {repStats && reponses.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl p-4">
              <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Complétées</p>
              <p className="text-xl font-bold text-green-400 mt-1">{repStats.completed}</p>
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl p-4">
              <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">En attente</p>
              <p className="text-xl font-bold text-yellow-400 mt-1">{repStats.pending}</p>
            </div>
            {repStats.avgScore !== null && (() => {
              const sc = scoreColor(repStats.avgScore)
              return (
                <div className={`${sc.bg} border ${sc.border} rounded-xl p-4`}>
                  <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-semibold flex items-center gap-1">
                    <Zap size={10} /> Score moyen
                  </p>
                  <p className={`text-xl font-bold ${sc.text} mt-1`}>{repStats.avgScore}/10</p>
                </div>
              )
            })()}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl p-4">
              <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Taux complétion</p>
              <p className="text-xl font-bold text-[#FF6B2B] mt-1">
                {reponses.length > 0 ? Math.round((repStats.completed / reponses.length) * 100) : 0}%
              </p>
            </div>
          </div>
        )}

        {/* Per-field stats (#2) */}
        {repStats?.champStats && repStats.completed > 0 && (
          <div className="bg-[var(--bg-card)]/40 border border-[var(--border-base)] rounded-2xl p-5 mb-8">
            <h3 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.15em] mb-4">Synthèse par question</h3>
            <div className="space-y-4">
              {repStats.champStats.filter(cs => cs.count > 0).map(cs => (
                <div key={cs.id}>
                  <p className="text-xs text-[var(--text-secondary)] mb-1.5">{cs.label}</p>

                  {cs.type_champ === 'note_1_10' && cs.moyenne !== null && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${cs.moyenne * 10}%`, backgroundColor: cs.moyenne >= 7 ? '#22c55e' : cs.moyenne >= 4 ? '#eab308' : '#ef4444' }} />
                      </div>
                      <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums w-12 text-right">{cs.moyenne}/10</span>
                    </div>
                  )}

                  {cs.type_champ === 'oui_non' && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
                        Oui {cs.oui}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">
                        Non {cs.non}
                      </span>
                      {cs.count > 0 && (
                        <div className="flex-1 h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden ml-2">
                          <div className="h-full rounded-full bg-green-400" style={{ width: `${(cs.oui / cs.count) * 100}%` }} />
                        </div>
                      )}
                    </div>
                  )}

                  {cs.type_champ === 'choix_multiple' && cs.freq && (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(cs.freq).sort((a, b) => b[1] - a[1]).map(([opt, count]) => (
                        <span key={opt} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/15 font-medium">
                          {opt} <span className="text-[#FF6B2B]/60">{count}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual responses */}
        {reponses.length === 0 ? (
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-dashed border-[var(--border-base)] p-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck size={24} className="text-[var(--text-muted)]" />
            </div>
            <p className="text-[var(--text-muted)] text-sm font-medium">Aucune réponse pour ce formulaire</p>
            <p className="text-[var(--text-muted)] text-xs mt-1">Envoyez-le à vos clients pour commencer</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reponses.map(r => {
              const nom = r.clients?.profiles?.nom || r.clients?.profiles?.email || 'Client'
              const score = r.complete ? computeScore(r.reponses, repChamps) : null

              return (
                <div key={r.id} className="bg-[var(--bg-card)]/40 border border-[var(--border-base)] rounded-2xl overflow-hidden">
                  {/* Response header */}
                  <div className="px-5 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#FF6B2B]/10 flex items-center justify-center text-[#FF6B2B] text-xs font-bold flex-shrink-0">
                      {nom.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--text-primary)] font-semibold text-sm">{nom}</p>
                      <p className="text-[var(--text-muted)] text-[11px]">
                        {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {score !== null && (() => {
                      const sc = scoreColor(score)
                      return (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${sc.bg} ${sc.text} border ${sc.border}`}>
                          {score}/10
                        </span>
                      )
                    })()}
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                      r.complete ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {r.complete ? 'Complété' : 'En attente'}
                    </span>
                  </div>

                  {/* Response details — data viz (#2) */}
                  {r.complete && repChamps.length > 0 && (
                    <div className="px-5 pb-5 space-y-3 border-t border-[var(--border-subtle)] pt-4">
                      {repChamps.map(ch => {
                        const val = r.reponses?.[ch.id]
                        const isEmpty = val === undefined || val === null || val === ''

                        return (
                          <div key={ch.id} className="flex flex-col gap-1">
                            <p className="text-[var(--text-secondary)] text-[11px]">{ch.label}</p>

                            {isEmpty ? (
                              <p className="text-[var(--text-muted)] text-sm italic">--</p>
                            ) : ch.type_champ === 'note_1_10' ? (
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden max-w-[200px]">
                                  <div className="h-full rounded-full transition-all" style={{
                                    width: `${Number(val) * 10}%`,
                                    backgroundColor: Number(val) >= 7 ? '#22c55e' : Number(val) >= 4 ? '#eab308' : '#ef4444',
                                  }} />
                                </div>
                                <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{val}/10</span>
                              </div>
                            ) : ch.type_champ === 'oui_non' ? (
                              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium w-fit ${
                                (val === true || val === 'true' || val === 'Oui')
                                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {(val === true || val === 'true' || val === 'Oui') ? 'Oui' : 'Non'}
                              </span>
                            ) : ch.type_champ === 'choix_multiple' && Array.isArray(val) ? (
                              <div className="flex flex-wrap gap-1.5">
                                {val.map((opt, i) => (
                                  <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/15 font-medium">
                                    {opt}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[var(--text-primary)] text-sm">{String(val)}</p>
                            )}
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

  // ══════════════════════════════════════════
  // RENDER — Vue éditeur (#1, #8, #9, #11)
  // ══════════════════════════════════════════
  return (
    <div className="p-6 w-full max-w-4xl">
      <button onClick={() => setVue('liste')}
        className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> Retour
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          {formId ? 'Modifier le formulaire' : 'Nouveau formulaire'}
        </h1>
        <div className="flex items-center gap-2">
          {/* Preview button (#8) */}
          {champs.length > 0 && (
            <button onClick={() => setPreviewOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-base)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors">
              <Play size={14} /> Aperçu
            </button>
          )}
          {/* Status toggle (#5) */}
          <button onClick={() => setFormStatut(s => s === 'actif' ? 'brouillon' : 'actif')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              formStatut === 'actif'
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-base)]'
            }`}>
            {formStatut === 'actif' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            {formStatut === 'actif' ? 'Actif' : 'Brouillon'}
          </button>
        </div>
      </div>

      {/* Infos */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold mb-1.5">Titre *</label>
            <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex : Bilan de démarrage"
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FF6B2B]/50 focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold mb-1.5">Type</label>
            <select value={typeForm} onChange={(e) => setTypeForm(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[#FF6B2B]/50 focus:outline-none transition-colors">
              <option value="custom">Personnalisé</option>
              <option value="bilan_initial">Bilan initial</option>
              <option value="check_in">Check-in hebdo</option>
              <option value="sante">Santé</option>
              <option value="satisfaction">Satisfaction</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold mb-1.5">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description visible par le client..." rows={2}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FF6B2B]/50 focus:outline-none transition-colors resize-none" />
        </div>
      </div>

      {/* Récurrence (#11) */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Repeat size={16} className={recurrenceActif ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'} />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Envoi récurrent</h3>
          </div>
          <button onClick={() => setRecurrenceActif(!recurrenceActif)}
            className={`p-1.5 rounded-lg transition-colors ${recurrenceActif ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'}`}>
            {recurrenceActif ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
          </button>
        </div>
        {recurrenceActif && (
          <div className="mt-3 pt-3 border-t border-[var(--border-base)]">
            <div className={`grid gap-3 ${recurrenceInterval === 'post_seance' ? 'grid-cols-1' : 'grid-cols-3'}`}>
              <div>
                <label className="block text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold mb-1.5">Fréquence</label>
                <select value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors">
                  <option value="hebdomadaire">Hebdomadaire</option>
                  <option value="mensuel">Mensuel</option>
                  <option value="post_seance">Après chaque séance</option>
                </select>
              </div>
              {recurrenceInterval !== 'post_seance' && (
                <>
                  <div>
                    <label className="block text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold mb-1.5">
                      {recurrenceInterval === 'hebdomadaire' ? 'Jour' : 'Jour du mois'}
                    </label>
                    {recurrenceInterval === 'hebdomadaire' ? (
                      <select value={recurrenceJour} onChange={(e) => setRecurrenceJour(Number(e.target.value))}
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors">
                        {['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'].map((j, i) => (
                          <option key={i} value={i + 1}>{j}</option>
                        ))}
                      </select>
                    ) : (
                      <input type="number" min="1" max="28" value={recurrenceJour} onChange={(e) => setRecurrenceJour(Number(e.target.value))}
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors" />
                    )}
                  </div>
                  <div>
                    <label className="block text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold mb-1.5">Heure</label>
                    <input type="time" value={recurrenceHeure} onChange={(e) => setRecurrenceHeure(e.target.value)}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors" />
                  </div>
                </>
              )}
            </div>
            {recurrenceInterval === 'post_seance' && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FF6B2B]/5 border border-[#FF6B2B]/10">
                <Dumbbell size={14} className="text-[#FF6B2B] flex-shrink-0" />
                <p className="text-[#FF6B2B]/70 text-xs">Ce formulaire sera envoyé automatiquement au client dès qu'il termine une séance.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Champs (#1 — numéros, #9 — conditions) ── */}
      <h2 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.15em] mb-4">
        Questions ({champs.length})
      </h2>

      <div className="space-y-3 mb-5">
        {champs.map((champ, idx) => (
          <div key={champ.id} className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-2xl p-4 hover:border-[var(--border-base)] transition-colors">
            <div className="flex items-start gap-3">
              {/* Number + reorder (#1) */}
              <div className="flex flex-col items-center gap-0.5 pt-0.5 flex-shrink-0">
                <button onClick={() => deplacerChamp(idx, -1)} disabled={idx === 0}
                  className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors disabled:opacity-30"><ChevronUp size={14} /></button>
                <div className="w-7 h-7 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center">
                  <span className="text-[#FF6B2B] text-xs font-bold">{idx + 1}</span>
                </div>
                <button onClick={() => deplacerChamp(idx, 1)} disabled={idx === champs.length - 1}
                  className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors disabled:opacity-30"><ChevronDown size={14} /></button>
              </div>

              {/* Field content */}
              <div className="flex-1 space-y-3">
                <div className="flex gap-3">
                  <input type="text" value={champ.label} onChange={(e) => modifierChamp(idx, 'label', e.target.value)}
                    placeholder="Intitulé de la question..."
                    className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FF6B2B]/50 focus:outline-none transition-colors" />
                  <select value={champ.type_champ} onChange={(e) => modifierChamp(idx, 'type_champ', e.target.value)}
                    className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl px-3 py-2.5 text-xs text-[var(--text-primary)] focus:border-[#FF6B2B]/50 focus:outline-none transition-colors">
                    {Object.entries(TYPE_LABELS).filter(([k]) => ['texte','nombre','note_1_10','choix_multiple','oui_non','date'].includes(k)).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Options (choix multiple) */}
                {champ.type_champ === 'choix_multiple' && (
                  <div className="pl-2 space-y-2">
                    {(champ.options || []).map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm border border-white/20 flex-shrink-0" />
                        <input type="text" value={opt} onChange={(e) => modifierOption(idx, optIdx, e.target.value)}
                          className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[#FF6B2B]/50 focus:outline-none transition-colors" />
                        <button onClick={() => supprimerOption(idx, optIdx)}
                          className="text-[var(--text-muted)] hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                      </div>
                    ))}
                    <button onClick={() => ajouterOption(idx)}
                      className="text-[#FF6B2B] text-xs hover:underline">+ Ajouter une option</button>
                  </div>
                )}

                {/* Scoring weight for note_1_10 (#10) */}
                {champ.type_champ === 'note_1_10' && (
                  <div className="flex items-center gap-2">
                    <Zap size={12} className="text-yellow-400/60" />
                    <label className="text-[var(--text-muted)] text-[11px]">Poids dans le score :</label>
                    <input type="number" min="1" max="10" value={champ.poids_score || 1}
                      onChange={(e) => modifierChamp(idx, 'poids_score', Number(e.target.value))}
                      className="w-14 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] text-center focus:border-[#FF6B2B]/50 focus:outline-none transition-colors" />
                  </div>
                )}

                {/* Condition d'affichage (#9) */}
                {idx > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <GitBranch size={12} className="text-purple-400/60 flex-shrink-0" />
                    <label className="text-[var(--text-muted)] text-[11px] flex-shrink-0">Afficher si :</label>
                    <select
                      value={champ.condition_affichage?.champ_id || ''}
                      onChange={(e) => {
                        if (!e.target.value) return modifierChamp(idx, 'condition_affichage', null)
                        modifierChamp(idx, 'condition_affichage', {
                          ...(champ.condition_affichage || {}), champ_id: e.target.value, operateur: 'equals', valeur: '',
                        })
                      }}
                      className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg px-2 py-1 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors">
                      <option value="">Toujours visible</option>
                      {champs.slice(0, idx).map(c => (
                        <option key={c.id} value={c.id}>Q{champs.indexOf(c) + 1}: {c.label?.substring(0, 30) || 'Sans titre'}...</option>
                      ))}
                    </select>
                    {champ.condition_affichage?.champ_id && (() => {
                      const parentChamp = champs.find(c => c.id === champ.condition_affichage.champ_id)
                      if (!parentChamp) return null
                      if (parentChamp.type_champ === 'oui_non') {
                        return (
                          <select
                            value={champ.condition_affichage.valeur || ''}
                            onChange={(e) => modifierChamp(idx, 'condition_affichage', { ...champ.condition_affichage, valeur: e.target.value })}
                            className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg px-2 py-1 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors">
                            <option value="">= ?</option>
                            <option value="true">= Oui</option>
                            <option value="false">= Non</option>
                          </select>
                        )
                      }
                      if (parentChamp.type_champ === 'choix_multiple') {
                        return (
                          <select
                            value={champ.condition_affichage.valeur || ''}
                            onChange={(e) => modifierChamp(idx, 'condition_affichage', { ...champ.condition_affichage, valeur: e.target.value })}
                            className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg px-2 py-1 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors">
                            <option value="">= ?</option>
                            {(parentChamp.options || []).map(o => <option key={o} value={o}>contient "{o}"</option>)}
                          </select>
                        )
                      }
                      return (
                        <input type="text" placeholder="= valeur" value={champ.condition_affichage.valeur || ''}
                          onChange={(e) => modifierChamp(idx, 'condition_affichage', { ...champ.condition_affichage, valeur: e.target.value })}
                          className="w-24 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg px-2 py-1 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2B]/50 transition-colors" />
                      )
                    })()}
                  </div>
                )}

                {/* Obligatoire toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={champ.obligatoire} onChange={(e) => modifierChamp(idx, 'obligatoire', e.target.checked)}
                    className="accent-[#FF6B2B] w-3.5 h-3.5" />
                  <span className="text-[var(--text-muted)] text-xs">Obligatoire</span>
                </label>
              </div>

              {/* Delete */}
              <button onClick={() => supprimerChamp(idx)}
                className="p-1.5 text-[var(--text-muted)] hover:text-red-400 transition-colors flex-shrink-0"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Add field buttons */}
      <div className="flex flex-wrap gap-2 mb-8">
        {Object.entries(TYPE_LABELS).filter(([k]) => ['texte','nombre','note_1_10','choix_multiple','oui_non','date'].includes(k)).map(([key, label]) => (
          <button key={key} onClick={() => ajouterChamp(key)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-[var(--border-base)] text-[var(--text-muted)] text-xs hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30 transition-colors">
            <Plus size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={sauvegarder} disabled={saving || !titre.trim() || champs.length === 0}
          className="flex items-center gap-2 bg-[#FF6B2B] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e55e24] transition-all hover:shadow-lg hover:shadow-[#FF6B2B]/20 disabled:opacity-40 disabled:cursor-not-allowed">
          {saving ? 'Enregistrement...' : formId ? 'Mettre à jour' : 'Créer le formulaire'}
        </button>
        <button onClick={() => setVue('liste')}
          className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors">Annuler</button>
      </div>

      {/* ── Modal preview (#8) ── */}
      {previewOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setPreviewOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl">
              {/* Phone-like header */}
              <div className="bg-[#FF6B2B] px-6 py-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[var(--text-secondary)] text-[10px] font-semibold uppercase tracking-wider">Aperçu client</span>
                  <button onClick={() => setPreviewOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={18} /></button>
                </div>
                <h3 className="text-[var(--text-primary)] text-lg font-bold">{titre || 'Sans titre'}</h3>
                {description && <p className="text-[var(--text-secondary)] text-sm mt-1">{description}</p>}
              </div>

              {/* Form preview */}
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">
                {champs.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Aucune question ajoutée</p>
                ) : champs.map((champ, idx) => {
                  // Show condition badge (#9)
                  const hasCondition = champ.condition_affichage?.champ_id
                  return (
                    <div key={champ.id} className="space-y-2">
                      {hasCondition && (
                        <div className="flex items-center gap-1 text-purple-500 text-[10px]">
                          <GitBranch size={10} /> Conditionnel
                        </div>
                      )}
                      <label className="block text-gray-800 text-sm font-medium">
                        {champ.label || `Question ${idx + 1}`}
                        {champ.obligatoire && <span className="text-[#FF6B2B] ml-1">*</span>}
                      </label>

                      {champ.type_champ === 'texte' && (
                        <div className="w-full h-10 bg-gray-100 border border-gray-200 rounded-xl px-3 flex items-center">
                          <span className="text-gray-300 text-sm">Votre réponse...</span>
                        </div>
                      )}
                      {champ.type_champ === 'nombre' && (
                        <div className="w-24 h-10 bg-gray-100 border border-gray-200 rounded-xl px-3 flex items-center">
                          <span className="text-gray-300 text-sm">0</span>
                        </div>
                      )}
                      {champ.type_champ === 'note_1_10' && (
                        <div className="flex gap-1.5">
                          {Array.from({ length: 10 }, (_, i) => (
                            <div key={i} className={`w-8 h-8 rounded-lg border text-xs font-bold flex items-center justify-center ${
                              i === 6 ? 'bg-[#FF6B2B] text-white border-[#FF6B2B]' : 'bg-gray-50 text-gray-400 border-gray-200'
                            }`}>{i + 1}</div>
                          ))}
                        </div>
                      )}
                      {champ.type_champ === 'oui_non' && (
                        <div className="flex gap-2">
                          <div className="px-5 py-2 rounded-xl bg-[#FF6B2B]/10 text-[#FF6B2B] text-sm font-medium border border-[#FF6B2B]/20">Oui</div>
                          <div className="px-5 py-2 rounded-xl bg-gray-100 text-gray-400 text-sm border border-gray-200">Non</div>
                        </div>
                      )}
                      {champ.type_champ === 'choix_multiple' && (
                        <div className="space-y-2">
                          {(champ.options || []).map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded border flex-shrink-0 ${i === 0 ? 'bg-[#FF6B2B] border-[#FF6B2B]' : 'border-gray-300'}`} />
                              <span className="text-gray-600 text-sm">{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {champ.type_champ === 'date' && (
                        <div className="w-40 h-10 bg-gray-100 border border-gray-200 rounded-xl px-3 flex items-center">
                          <span className="text-gray-300 text-sm">JJ/MM/AAAA</span>
                        </div>
                      )}
                    </div>
                  )
                })}

                {champs.length > 0 && (
                  <button className="w-full py-3 rounded-xl bg-[#FF6B2B] text-white font-semibold text-sm mt-4" disabled>
                    Envoyer mes réponses
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
