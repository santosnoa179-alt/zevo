import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import { Modal } from '../../components/ui/Modal'
import { calculerScoreBienEtre, couleurScore } from '../../utils/wellbeing'
import {
  Search, MessageCircle, Settings, UserPlus, Mail,
  Target, Apple, Scale, Activity, Dumbbell,
  Calendar, Eye, Share2, ChevronRight, Loader2,
  User, Heart, Flame, BarChart3, Clock,
  Plus, X, Save, Trash2, Filter, Info, GripVertical,
  PlayCircle, ChevronLeft
} from 'lucide-react'

// ── Couleurs avatar ──
const AVATAR_COLORS = ['#FF6B2B', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6']

// ── Onglets internes ──
const TABS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: Eye },
  { id: 'infos', label: 'Informations', icon: User },
  { id: 'calendar', label: 'Calendrier', icon: Calendar },
  { id: 'sport', label: 'Sport', icon: Dumbbell },
  { id: 'nutrition', label: 'Nutrition', icon: Apple },
  { id: 'suivi', label: 'Suivi', icon: BarChart3 },
  { id: 'partage', label: 'Partage', icon: Share2 },
]

// ══════════════════════════════════════
// STAT CARD — Carte réutilisable
// ══════════════════════════════════════
function StatCard({ icon: Icon, label, value, sub, accent = false }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        accent ? 'bg-[#FF6B2B]/10' : 'bg-[#27272a]'
      }`}>
        <Icon size={15} className={accent ? 'text-[#FF6B2B]' : 'text-white/30'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/30 text-[11px]">{label}</p>
        <p className="text-[#F5F5F3] text-sm font-semibold">{value || '—'}</p>
      </div>
      {sub && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-semibold flex-shrink-0">
          {sub}
        </span>
      )}
    </div>
  )
}

// ══════════════════════════════════════
// BIBLIOTHÈQUE D'EXERCICES — Mock data
// ══════════════════════════════════════

const MUSCLE_GROUPS = ['Tous', 'Jambes', 'Pectoraux', 'Dos', 'Biceps', 'Épaules']

const EXERCISES_MOCK = [
  {
    id: 'ex1',
    nom: 'Squat',
    equipement: 'Barre',
    groupe: 'Jambes',
    muscles: ['Quadriceps', 'Fessiers', 'Ischio-jambiers'],
    description: 'Debout, pieds écartés à largeur d\'épaules, barre sur les trapèzes. Fléchir les genoux en poussant les hanches vers l\'arrière. Descendre jusqu\'à ce que les cuisses soient parallèles au sol, puis remonter en poussant sur les talons. Garder le dos droit et le regard devant.',
    couleur: '#22c55e',
  },
  {
    id: 'ex2',
    nom: 'Pompes',
    equipement: 'Poids du corps',
    groupe: 'Pectoraux',
    muscles: ['Pectoraux', 'Triceps', 'Deltoïdes ant.'],
    description: 'En position de planche, mains légèrement plus larges que les épaules. Descendre le corps en fléchissant les coudes jusqu\'à ce que la poitrine frôle le sol. Pousser vers le haut pour revenir en position initiale. Garder le corps gainé et aligné.',
    couleur: '#3b82f6',
  },
  {
    id: 'ex3',
    nom: 'Traction',
    equipement: 'Barre de traction',
    groupe: 'Dos',
    muscles: ['Grand dorsal', 'Biceps', 'Trapèzes'],
    description: 'Suspendu à la barre, prise pronation à largeur d\'épaules. Tirer le corps vers le haut en contractant le dos jusqu\'à ce que le menton dépasse la barre. Redescendre lentement en contrôlant le mouvement. Éviter de se balancer.',
    couleur: '#a855f7',
  },
  {
    id: 'ex4',
    nom: 'Curl Biceps',
    equipement: 'Haltère',
    groupe: 'Biceps',
    muscles: ['Biceps', 'Brachial ant.'],
    description: 'Debout, un haltère dans chaque main, bras le long du corps, paumes vers l\'avant. Fléchir les coudes en montant les haltères vers les épaules. Contracter les biceps en haut du mouvement, puis redescendre lentement.',
    couleur: '#f59e0b',
  },
  {
    id: 'ex5',
    nom: 'Développé couché',
    equipement: 'Barre + Banc',
    groupe: 'Pectoraux',
    muscles: ['Pectoraux', 'Triceps', 'Deltoïdes ant.'],
    description: 'Allongé sur un banc plat, pieds au sol. Saisir la barre à largeur d\'épaules. Descendre la barre vers le milieu de la poitrine en contrôlant, puis pousser vers le haut jusqu\'à l\'extension complète des bras.',
    couleur: '#ec4899',
  },
]

// ══════════════════════════════════════
// SPORT TAB — Éditeur de séances
// ══════════════════════════════════════

function SportTab({ clientName }) {
  const [searchExo, setSearchExo] = useState('')
  const [filtreGroupe, setFiltreGroupe] = useState('Tous')
  const [seanceNom, setSeanceNom] = useState(`Séance de ${clientName || 'remise en forme'}`)
  const [seanceExercices, setSeanceExercices] = useState([])
  const [drawerExercice, setDrawerExercice] = useState(null)
  const [saving, setSaving] = useState(false)

  // Filtrer la bibliothèque
  const exosFiltres = EXERCISES_MOCK.filter((ex) => {
    const matchSearch = ex.nom.toLowerCase().includes(searchExo.toLowerCase()) ||
      ex.equipement.toLowerCase().includes(searchExo.toLowerCase())
    const matchGroupe = filtreGroupe === 'Tous' || ex.groupe === filtreGroupe
    return matchSearch && matchGroupe
  })

  // Ajouter un exercice à la séance
  const ajouterExercice = (ex) => {
    const existe = seanceExercices.find(s => s.id === ex.id)
    if (existe) return
    setSeanceExercices(prev => [...prev, {
      ...ex,
      series: 3,
      repetitions: 12,
      poids: '',
      repos: 60,
    }])
  }

  // Supprimer un exercice de la séance
  const supprimerExercice = (exId) => {
    setSeanceExercices(prev => prev.filter(e => e.id !== exId))
  }

  // Modifier un champ d'exercice dans la séance
  const modifierExercice = (exId, champ, valeur) => {
    setSeanceExercices(prev => prev.map(e =>
      e.id === exId ? { ...e, [champ]: valeur } : e
    ))
  }

  // Sauvegarder (mock)
  const sauvegarder = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      console.log('Séance sauvegardée:', { nom: seanceNom, exercices: seanceExercices })
    }, 1200)
  }

  return (
    <div className="flex gap-0 h-[calc(100vh-16rem)] min-h-[500px]">

      {/* ════════════════════════════════════ */}
      {/* PANNEAU GAUCHE — Bibliothèque       */}
      {/* ════════════════════════════════════ */}
      <div className="w-1/3 flex-shrink-0 bg-[#18181b] border border-[#27272a] rounded-xl flex flex-col overflow-hidden">

        {/* Header bibliothèque */}
        <div className="p-4 border-b border-[#27272a]">
          <h3 className="text-[#F5F5F3] text-sm font-semibold flex items-center gap-2 mb-3">
            <Dumbbell size={14} className="text-[#FF6B2B]" />
            Bibliothèque d'exercices
          </h3>

          {/* Recherche */}
          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/15" />
            <input
              value={searchExo}
              onChange={(e) => setSearchExo(e.target.value)}
              placeholder="Rechercher un exercice..."
              className="w-full bg-[#09090b] border border-[#27272a] rounded-lg pl-8 pr-3 py-2 text-xs text-[#F5F5F3] placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
            />
          </div>

          {/* Filtres groupes musculaires */}
          <div className="flex gap-1.5 flex-wrap">
            {MUSCLE_GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => setFiltreGroupe(g)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                  filtreGroupe === g
                    ? 'bg-[#FF6B2B] text-white'
                    : 'bg-[#27272a] text-white/30 hover:text-white/50'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Liste des exercices */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {exosFiltres.length === 0 ? (
            <div className="text-center py-8">
              <Dumbbell size={24} className="text-white/10 mx-auto mb-2" />
              <p className="text-white/15 text-xs">Aucun exercice trouvé</p>
            </div>
          ) : (
            exosFiltres.map((ex) => {
              const dejaAjoute = seanceExercices.some(s => s.id === ex.id)
              return (
                <div
                  key={ex.id}
                  className="bg-[#27272a]/40 rounded-lg p-3 group hover:bg-[#27272a]/70 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* GIF placeholder */}
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${ex.couleur}15` }}
                    >
                      <Dumbbell size={18} style={{ color: ex.couleur }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Nom cliquable → ouvre le drawer */}
                      <button
                        onClick={() => setDrawerExercice(ex)}
                        className="text-[#F5F5F3] text-sm font-medium hover:text-[#FF6B2B] transition-colors text-left"
                      >
                        {ex.nom}
                      </button>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-white/20 text-[10px] bg-[#09090b] px-2 py-0.5 rounded">
                          {ex.equipement}
                        </span>
                        <span className="text-white/15 text-[10px]">
                          {ex.groupe}
                        </span>
                      </div>
                    </div>

                    {/* Bouton + */}
                    <button
                      onClick={() => ajouterExercice(ex)}
                      disabled={dejaAjoute}
                      className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
                        dejaAjoute
                          ? 'bg-green-500/10 text-green-400 cursor-default'
                          : 'bg-[#FF6B2B]/10 text-[#FF6B2B] hover:bg-[#FF6B2B]/20 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {dejaAjoute ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <Plus size={14} />
                      )}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ════════════════════════════════════ */}
      {/* PANNEAU CENTRAL — Éditeur de séance */}
      {/* ════════════════════════════════════ */}
      <div className="flex-1 flex flex-col ml-4 bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">

        {/* Header éditeur */}
        <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
              <Calendar size={15} className="text-[#FF6B2B]" />
            </div>
            <input
              value={seanceNom}
              onChange={(e) => setSeanceNom(e.target.value)}
              className="bg-transparent border-none text-[#F5F5F3] text-sm font-semibold focus:outline-none flex-1 min-w-0 placeholder:text-white/20"
              placeholder="Nom de la séance..."
            />
          </div>
          <button
            onClick={sauvegarder}
            disabled={saving || seanceExercices.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF6B2B] text-white text-xs font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Enregistrer la séance
          </button>
        </div>

        {/* Liste d'exercices ajoutés */}
        <div className="flex-1 overflow-y-auto p-4">
          {seanceExercices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-2xl bg-[#27272a]/40 flex items-center justify-center mb-4">
                <Plus size={28} className="text-white/10" />
              </div>
              <p className="text-white/20 text-sm font-medium mb-1">Aucun exercice ajouté</p>
              <p className="text-white/10 text-xs max-w-[250px] text-center">
                Cliquez sur le bouton <span className="text-[#FF6B2B]">+</span> dans la bibliothèque pour composer votre séance
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {seanceExercices.map((ex, index) => (
                <div
                  key={ex.id}
                  className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 group hover:border-[#FF6B2B]/20 transition-colors"
                >
                  {/* Ligne supérieure : numéro + nom + supprimer */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <GripVertical size={14} className="text-white/10" />
                      <span className="w-6 h-6 rounded-md bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${ex.couleur}15` }}
                      >
                        <Dumbbell size={14} style={{ color: ex.couleur }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#F5F5F3] text-sm font-medium truncate">{ex.nom}</p>
                        <p className="text-white/15 text-[10px]">{ex.equipement}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => supprimerExercice(ex.id)}
                      className="p-1.5 rounded-lg text-white/10 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Inputs : Séries / Répétitions / Poids / Repos */}
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-white/20 text-[10px] uppercase tracking-wider mb-1.5">Séries</label>
                      <input
                        type="number"
                        value={ex.series}
                        onChange={(e) => modifierExercice(ex.id, 'series', parseInt(e.target.value) || 0)}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-[#F5F5F3] text-sm text-center font-medium focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-white/20 text-[10px] uppercase tracking-wider mb-1.5">Répétitions</label>
                      <input
                        type="number"
                        value={ex.repetitions}
                        onChange={(e) => modifierExercice(ex.id, 'repetitions', parseInt(e.target.value) || 0)}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-[#F5F5F3] text-sm text-center font-medium focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-white/20 text-[10px] uppercase tracking-wider mb-1.5">Poids (kg)</label>
                      <input
                        type="number"
                        value={ex.poids}
                        onChange={(e) => modifierExercice(ex.id, 'poids', e.target.value)}
                        placeholder="—"
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-[#F5F5F3] text-sm text-center font-medium placeholder:text-white/10 focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-white/20 text-[10px] uppercase tracking-wider mb-1.5">Repos (s)</label>
                      <input
                        type="number"
                        value={ex.repos}
                        onChange={(e) => modifierExercice(ex.id, 'repos', parseInt(e.target.value) || 0)}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-[#F5F5F3] text-sm text-center font-medium focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Résumé en bas */}
              <div className="flex items-center justify-between py-3 px-4 bg-[#27272a]/30 rounded-lg mt-2">
                <span className="text-white/20 text-xs">
                  {seanceExercices.length} exercice{seanceExercices.length > 1 ? 's' : ''} · {seanceExercices.reduce((a, e) => a + (e.series || 0), 0)} séries au total
                </span>
                <span className="text-white/10 text-[10px]">
                  ~{Math.round(seanceExercices.reduce((a, e) => a + (e.series || 0) * ((e.repos || 60) + 40), 0) / 60)} min estimées
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════ */}
      {/* TIROIR DROIT — Détails exercice     */}
      {/* ════════════════════════════════════ */}

      {/* Overlay */}
      {drawerExercice && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setDrawerExercice(null)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-[400px] max-w-[90vw] bg-[#09090b] border-l border-[#27272a] flex flex-col transition-transform duration-300 ease-out ${
          drawerExercice ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {drawerExercice && (
          <>
            {/* Header du tiroir */}
            <div className="px-5 py-4 border-b border-[#27272a] flex items-center justify-between">
              <h3 className="text-[#F5F5F3] font-semibold text-base">Détails de l'exercice</h3>
              <button
                onClick={() => setDrawerExercice(null)}
                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenu */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Image / GIF placeholder */}
              <div
                className="w-full aspect-video rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${drawerExercice.couleur}10` }}
              >
                <div className="text-center">
                  <Dumbbell size={48} style={{ color: drawerExercice.couleur }} className="mx-auto mb-2 opacity-40" />
                  <p className="text-white/15 text-xs">Démonstration GIF</p>
                </div>
              </div>

              {/* Nom + équipement */}
              <div>
                <h4 className="text-[#F5F5F3] text-xl font-bold">{drawerExercice.nom}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-white/30 text-xs bg-[#27272a] px-2.5 py-1 rounded-md">
                    {drawerExercice.equipement}
                  </span>
                  <span className="text-white/15 text-xs">
                    {drawerExercice.groupe}
                  </span>
                </div>
              </div>

              {/* Muscles ciblés */}
              <div>
                <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-2">Muscles ciblés</p>
                <div className="flex flex-wrap gap-1.5">
                  {drawerExercice.muscles.map((m) => (
                    <span
                      key={m}
                      className="text-xs px-2.5 py-1 rounded-md bg-purple-500/15 text-purple-400 font-medium"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description / Consignes */}
              <div>
                <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-2">Consignes d'exécution</p>
                <p className="text-white/50 text-sm leading-relaxed">
                  {drawerExercice.description}
                </p>
              </div>

              {/* Bouton ajouter depuis le tiroir */}
              <button
                onClick={() => {
                  ajouterExercice(drawerExercice)
                  setDrawerExercice(null)
                }}
                disabled={seanceExercices.some(s => s.id === drawerExercice.id)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {seanceExercices.some(s => s.id === drawerExercice.id) ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Déjà dans la séance
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    Ajouter à la séance
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// CALENDAR TAB — Vue hebdomadaire
// ══════════════════════════════════════

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function getWeekDates(offset = 0) {
  const now = new Date()
  now.setDate(now.getDate() + offset * 7)
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function formatDateISO(d) {
  return d.toISOString().split('T')[0]
}

function CalendarTab({ clientId, clientName, coachId }) {
  const toast = useToast()
  const [weekOffset, setWeekOffset] = useState(0)
  const [seances, setSeances] = useState([])
  const [loadingSeances, setLoadingSeances] = useState(true)

  // Modale création de séance
  const [modalSeance, setModalSeance] = useState(false)
  const [modalDate, setModalDate] = useState(null)
  const [newSeanceTitre, setNewSeanceTitre] = useState('')
  const [newSeanceNotes, setNewSeanceNotes] = useState('')
  const [creatingSeance, setCreatingSeance] = useState(false)

  // Modale détail d'une séance
  const [detailSeance, setDetailSeance] = useState(null)
  const [detailExercices, setDetailExercices] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Éditeur de séance (modale plein écran)
  const [editingSeance, setEditingSeance] = useState(null)

  const weekDates = getWeekDates(weekOffset)
  const weekStart = formatDateISO(weekDates[0])
  const weekEnd = formatDateISO(weekDates[6])

  // Charger les séances de la semaine
  useEffect(() => {
    if (!clientId || !coachId) return
    const load = async () => {
      setLoadingSeances(true)
      const { data } = await supabase
        .from('seances')
        .select('id, titre, date_prevue, notes')
        .eq('coach_id', coachId)
        .eq('client_id', clientId)
        .gte('date_prevue', weekStart)
        .lte('date_prevue', weekEnd)
        .order('date_prevue')
      setSeances(data || [])
      setLoadingSeances(false)
    }
    load()
  }, [clientId, coachId, weekStart, weekEnd])

  // Créer une séance
  const creerSeance = async (e) => {
    e.preventDefault()
    if (!newSeanceTitre.trim()) return
    setCreatingSeance(true)
    const { data, error } = await supabase
      .from('seances')
      .insert({
        coach_id: coachId,
        client_id: clientId,
        titre: newSeanceTitre.trim(),
        date_prevue: modalDate,
        notes: newSeanceNotes.trim() || null,
      })
      .select()
      .single()
    if (error) {
      toast.error('Erreur lors de la création')
    } else {
      setSeances(prev => [...prev, data])
      toast.success('Séance créée !')
      setModalSeance(false)
      setNewSeanceTitre('')
      setNewSeanceNotes('')
    }
    setCreatingSeance(false)
  }

  // Supprimer une séance
  const supprimerSeance = async (id) => {
    const { error } = await supabase.from('seances').delete().eq('id', id)
    if (!error) {
      setSeances(prev => prev.filter(s => s.id !== id))
      setDetailSeance(null)
      toast.success('Séance supprimée')
    }
  }

  // Charger le détail d'une séance (exercices)
  const voirDetail = async (seance) => {
    setDetailSeance(seance)
    setLoadingDetail(true)
    const { data } = await supabase
      .from('seance_exercices')
      .select('*, exercices(nom, muscle_group, equipment)')
      .eq('seance_id', seance.id)
      .order('ordre')
    setDetailExercices(data || [])
    setLoadingDetail(false)
  }

  // Mois / année de la semaine
  const moisAnnee = weekDates[0].toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const today = formatDateISO(new Date())

  return (
    <div className="space-y-4">

      {/* ── Header semaine ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[#F5F5F3] text-lg font-bold capitalize">{moisAnnee}</h3>
          <p className="text-white/20 text-xs mt-0.5">Programmation hebdomadaire de {clientName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(0)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              weekOffset === 0
                ? 'bg-[#FF6B2B]/10 text-[#FF6B2B]'
                : 'bg-[#27272a] text-white/30 hover:text-white/50'
            }`}
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-2 rounded-lg bg-[#27272a] text-white/30 hover:text-white/60 transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-2 rounded-lg bg-[#27272a] text-white/30 hover:text-white/60 transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* ── Grille 7 jours ── */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date, i) => {
          const dateStr = formatDateISO(date)
          const isToday = dateStr === today
          const jourSeances = seances.filter(s => s.date_prevue === dateStr)

          return (
            <div
              key={i}
              className={`bg-[#18181b] border rounded-xl flex flex-col min-h-[280px] transition-colors ${
                isToday ? 'border-[#FF6B2B]/30' : 'border-[#27272a]'
              }`}
            >
              {/* En-tête du jour */}
              <div className={`px-3 py-2.5 border-b text-center ${
                isToday ? 'border-[#FF6B2B]/20 bg-[#FF6B2B]/5' : 'border-[#27272a]'
              }`}>
                <p className={`text-[10px] uppercase tracking-widest font-semibold ${
                  isToday ? 'text-[#FF6B2B]' : 'text-white/20'
                }`}>
                  {JOURS_COURTS[i]}
                </p>
                <p className={`text-lg font-bold ${isToday ? 'text-[#FF6B2B]' : 'text-[#F5F5F3]'}`}>
                  {date.getDate()}
                </p>
              </div>

              {/* Séances du jour */}
              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                {loadingSeances ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={14} className="animate-spin text-white/10" />
                  </div>
                ) : (
                  jourSeances.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => voirDetail(s)}
                      className="w-full text-left bg-[#FF6B2B]/10 border border-[#FF6B2B]/15 rounded-lg px-2.5 py-2 hover:bg-[#FF6B2B]/15 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <Dumbbell size={10} className="text-[#FF6B2B] flex-shrink-0" />
                        <p className="text-[#F5F5F3] text-[11px] font-medium truncate">{s.titre}</p>
                      </div>
                      {s.notes && (
                        <p className="text-white/15 text-[9px] truncate mt-0.5 ml-4">{s.notes}</p>
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Bouton ajouter */}
              <div className="px-2 pb-2">
                <button
                  onClick={() => { setModalDate(dateStr); setModalSeance(true) }}
                  className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-[#27272a] text-white/15 hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30 transition-colors text-[10px]"
                >
                  <Plus size={10} />
                  Ajouter
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ══════════════════════════════════════ */}
      {/* MODAL — Créer une séance              */}
      {/* ══════════════════════════════════════ */}
      <Modal isOpen={modalSeance} onClose={() => setModalSeance(false)} title="Nouvelle séance">
        <form onSubmit={creerSeance} className="space-y-4">
          <div>
            <label className="block text-sm text-white/50 mb-1.5">Titre de la séance</label>
            <input
              type="text"
              value={newSeanceTitre}
              onChange={(e) => setNewSeanceTitre(e.target.value)}
              placeholder="Ex: Upper Body Jour 1"
              autoFocus
              required
              className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-white/50 mb-1.5">Date</label>
            <input
              type="date"
              value={modalDate || ''}
              onChange={(e) => setModalDate(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-white/50 mb-1.5">Notes (optionnel)</label>
            <textarea
              value={newSeanceNotes}
              onChange={(e) => setNewSeanceNotes(e.target.value)}
              placeholder="Instructions spécifiques..."
              rows={3}
              className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModalSeance(false)}
              className="flex-1 py-2.5 rounded-xl text-sm text-white/40 bg-[#27272a] hover:bg-[#3f3f46] transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={creatingSeance}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40">
              {creatingSeance ? <Loader2 size={15} className="animate-spin" /> : <Calendar size={15} />}
              Créer la séance
            </button>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════ */}
      {/* MODAL — Détail d'une séance           */}
      {/* ══════════════════════════════════════ */}
      <Modal
        isOpen={!!detailSeance}
        onClose={() => setDetailSeance(null)}
        title={detailSeance?.titre || 'Séance'}
      >
        <div className="space-y-4">
          {/* Infos séance */}
          <div className="flex items-center gap-3 bg-[#09090b] rounded-lg p-3">
            <Calendar size={14} className="text-[#FF6B2B]" />
            <span className="text-[#F5F5F3] text-sm">
              {detailSeance?.date_prevue
                ? new Date(detailSeance.date_prevue + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                : ''}
            </span>
          </div>

          {detailSeance?.notes && (
            <p className="text-white/30 text-xs bg-[#09090b] rounded-lg p-3">{detailSeance.notes}</p>
          )}

          {/* Exercices de la séance */}
          <div>
            <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-2">
              Exercices ({detailExercices.length})
            </p>
            {loadingDetail ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={18} className="animate-spin text-white/10" />
              </div>
            ) : detailExercices.length === 0 ? (
              <div className="text-center py-6 bg-[#09090b] rounded-lg">
                <Dumbbell size={20} className="text-white/10 mx-auto mb-2" />
                <p className="text-white/15 text-xs">Aucun exercice ajouté</p>
                <p className="text-white/10 text-[10px] mt-1">Ouvrez l'onglet Sport pour composer la séance</p>
              </div>
            ) : (
              <div className="space-y-2">
                {detailExercices.map((ex, i) => (
                  <div key={ex.id} className="flex items-center gap-3 bg-[#09090b] rounded-lg p-3">
                    <span className="w-5 h-5 rounded bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#F5F5F3] text-sm font-medium truncate">{ex.exercices?.nom || 'Exercice'}</p>
                      <p className="text-white/20 text-[10px]">
                        {ex.series}×{ex.reps} {ex.poids ? `· ${ex.poids}kg` : ''} {ex.repos ? `· ${ex.repos}s repos` : ''}
                      </p>
                    </div>
                    {ex.exercices?.muscle_group && (
                      <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">
                        {ex.exercices.muscle_group}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => supprimerSeance(detailSeance?.id)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-red-400 bg-red-500/10 hover:bg-red-500/15 transition-colors"
            >
              <Trash2 size={14} />
              Supprimer
            </button>
            <button
              onClick={() => setDetailSeance(null)}
              className="flex-1 py-2.5 rounded-xl bg-[#27272a] text-white/40 text-sm hover:bg-[#3f3f46] transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ══════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════
export default function CoachClientHub() {
  const { user } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  // Stats du client sélectionné
  const [habitudes, setHabitudes] = useState([])
  const [objectifs, setObjectifs] = useState([])
  const [score, setScore] = useState(0)

  // Invitation modal
  const [modalInvit, setModalInvit] = useState(false)
  const [invitEmail, setInvitEmail] = useState('')
  const [invitPrenom, setInvitPrenom] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [invitSuccess, setInvitSuccess] = useState(null)
  const [invitError, setInvitError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  // ── Charger la liste des clients ──
  const chargerClients = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('clients')
      .select('id, created_at, actif, profiles(nom, prenom, email, avatar_url)')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })

    const cl = (data || []).map((c, i) => ({
      ...c,
      couleurAvatar: AVATAR_COLORS[i % AVATAR_COLORS.length],
    }))
    setClients(cl)
    if (cl.length > 0 && !selectedId) {
      setSelectedId(cl[0].id)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { chargerClients() }, [chargerClients])

  // ── Charger le profil détaillé du client sélectionné ──
  useEffect(() => {
    if (!selectedId) return
    const load = async () => {
      setLoadingProfile(true)

      const [profileRes, clientRes, habsRes, objsRes, logsRes, sommeilRes, humeurRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', selectedId).single(),
        supabase.from('clients').select('actif, created_at').eq('id', selectedId).single(),
        supabase.from('habitudes').select('id, nom, couleur').eq('client_id', selectedId).eq('actif', true),
        supabase.from('objectifs').select('*').eq('client_id', selectedId).eq('archive', false),
        supabase.from('habitudes_log').select('habitude_id').eq('client_id', selectedId).eq('date', today),
        supabase.from('sommeil_log').select('*').eq('client_id', selectedId).eq('date', today).maybeSingle(),
        supabase.from('humeur_log').select('*').eq('client_id', selectedId).eq('date', today).maybeSingle(),
      ])

      setSelectedProfile(profileRes.data)
      setSelectedClient(clientRes.data)

      const habs = habsRes.data || []
      const cochees = (logsRes.data || []).length
      setHabitudes(habs)
      setObjectifs(objsRes.data || [])

      const s = calculerScoreBienEtre({
        habitudes: { cochees, total: habs.length },
        sommeil: sommeilRes.data,
        humeur: humeurRes.data,
        sport: null,
      })
      setScore(s)
      setLoadingProfile(false)
    }
    load()
  }, [selectedId, today])

  // ── Invitation ──
  const envoyerInvitation = async (e) => {
    e.preventDefault()
    setEnvoi(true)
    setInvitError('')
    try {
      const { data, error } = await supabase
        .from('invitations')
        .insert({ coach_id: user.id, email: invitEmail.trim() })
        .select()
        .single()
      if (error) {
        setInvitError(error.message?.includes('duplicate')
          ? 'Une invitation a déjà été envoyée à cet email.'
          : 'Erreur lors de l\'invitation.')
        setEnvoi(false)
        return
      }
      if (data) {
        const lien = `${window.location.origin}/invite/${data.token}`
        setInvitSuccess({ email: invitEmail, lien, prenom: invitPrenom })
        setInvitEmail('')
        setInvitPrenom('')
      }
    } catch {
      setInvitError('Erreur réseau.')
    }
    setEnvoi(false)
  }

  // ── Helpers ──
  const clientsFiltres = clients.filter(c => {
    const q = recherche.toLowerCase()
    return (
      c.profiles?.nom?.toLowerCase().includes(q) ||
      c.profiles?.prenom?.toLowerCase().includes(q) ||
      c.profiles?.email?.toLowerCase().includes(q)
    )
  })

  const p = selectedProfile
  const fullName = p ? [p.prenom, p.nom].filter(Boolean).join(' ') || p.email : ''
  const initials = fullName ? fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'

  // IMC
  const imc = (p?.poids_actuel || p?.poids_depart) && p?.taille
    ? ((p.poids_actuel || p.poids_depart) / ((p.taille / 100) ** 2)).toFixed(1)
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-[#FF6B2B]" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">

      {/* ══════════════════════════════════════ */}
      {/* SIDEBAR — Liste des clients           */}
      {/* ══════════════════════════════════════ */}
      <div className="w-72 flex-shrink-0 bg-[#09090b] border-r border-[#27272a] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="p-4 border-b border-[#27272a]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[#F5F5F3] font-semibold text-sm">Clients</h2>
            <button
              onClick={() => { setModalInvit(true); setInvitSuccess(null); setInvitError('') }}
              className="p-1.5 rounded-lg bg-[#FF6B2B]/10 text-[#FF6B2B] hover:bg-[#FF6B2B]/20 transition-colors"
            >
              <UserPlus size={14} />
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/15" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un client..."
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-8 pr-3 py-2 text-xs text-[#F5F5F3] placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
            />
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {clientsFiltres.length === 0 ? (
            <div className="p-6 text-center">
              <User size={24} className="text-white/10 mx-auto mb-2" />
              <p className="text-white/20 text-xs">Aucun client</p>
            </div>
          ) : (
            clientsFiltres.map((c) => {
              const isSelected = selectedId === c.id
              const name = [c.profiles?.prenom, c.profiles?.nom].filter(Boolean).join(' ') || c.profiles?.email || '?'
              const ini = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

              return (
                <button
                  key={c.id}
                  onClick={() => { setSelectedId(c.id); setActiveTab('overview') }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                    isSelected
                      ? 'bg-[#18181b] border-l-2 border-[#FF6B2B]'
                      : 'border-l-2 border-transparent hover:bg-[#18181b]/50'
                  }`}
                >
                  {/* Avatar */}
                  {c.profiles?.avatar_url ? (
                    <img src={c.profiles.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                      style={{ backgroundColor: c.couleurAvatar }}>
                      {ini}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-[#F5F5F3]' : 'text-white/50'}`}>
                      {name}
                    </p>
                    <p className="text-white/20 text-[10px] truncate">{c.profiles?.email}</p>
                  </div>

                  {/* Pastille actif */}
                  {c.actif && (
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* ZONE PRINCIPALE — Dashboard client    */}
      {/* ══════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto bg-[#18181b]">
        {!selectedId || loadingProfile ? (
          <div className="flex items-center justify-center h-full">
            {loadingProfile ? (
              <Loader2 size={24} className="animate-spin text-[#FF6B2B]" />
            ) : (
              <div className="text-center">
                <User size={40} className="text-white/10 mx-auto mb-3" />
                <p className="text-white/20 text-sm">Sélectionnez un client</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-6">

            {/* ── En-tête client ── */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Gros avatar */}
                {p?.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[#FF6B2B] flex items-center justify-center">
                    <span className="text-white text-xl font-bold">{initials}</span>
                  </div>
                )}
                <div>
                  <h2 className="text-[#F5F5F3] text-2xl font-bold">{fullName}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    {/* Badge actif + toggle */}
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <div className={`w-2 h-2 rounded-full ${selectedClient?.actif ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={selectedClient?.actif ? 'text-green-400' : 'text-red-400'}>
                        {selectedClient?.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </span>
                    {/* Score */}
                    <span className="text-xs font-bold" style={{ color: couleurScore(score) }}>
                      {score}/100
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-[#27272a] transition-colors">
                  <MessageCircle size={17} />
                </button>
                <button className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-[#27272a] transition-colors">
                  <Settings size={17} />
                </button>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {TABS.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[#27272a] text-[#F5F5F3]'
                        : 'text-white/30 hover:text-white/50 hover:bg-[#27272a]/30'
                    }`}
                  >
                    <Icon size={13} />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* ── Contenu "Vue d'ensemble" ── */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Colonne gauche — Profil + Style de vie */}
                <div className="space-y-4">

                  {/* Carte Profil */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                    <h3 className="text-[#F5F5F3] text-sm font-semibold mb-4 flex items-center gap-2">
                      <User size={14} className="text-[#FF6B2B]" />
                      Profil
                    </h3>
                    <div className="space-y-1">
                      <StatCard icon={User} label="Genre" value={p?.genre || '—'} />
                      <StatCard icon={Calendar} label="Âge" value={p?.age ? `${p.age} ans` : '—'} />
                      <StatCard icon={Activity} label="Taille" value={p?.taille ? `${p.taille} cm` : '—'} />
                      <StatCard icon={Scale} label="Poids" value={
                        (p?.poids_actuel || p?.poids_depart) ? `${p.poids_actuel || p.poids_depart} kg` : '—'
                      } />
                      <StatCard
                        icon={Heart}
                        label="IMC"
                        value={imc || '—'}
                        sub={imc ? (imc < 18.5 ? 'Insuffisant' : imc < 25 ? 'Normal' : imc < 30 ? 'Surpoids' : 'Obésité') : null}
                        accent
                      />
                    </div>
                  </div>

                  {/* Carte Style de vie */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                    <h3 className="text-[#F5F5F3] text-sm font-semibold mb-4 flex items-center gap-2">
                      <Activity size={14} className="text-[#FF6B2B]" />
                      Style de vie
                    </h3>
                    <div className="space-y-1">
                      <StatCard icon={Flame} label="Niveau d'activité" value={p?.niveau_activite || '—'} />
                      <StatCard icon={Dumbbell} label="Niveau sportif" value={p?.niveau_sportif || '—'} />
                    </div>
                  </div>
                </div>

                {/* Colonne droite — Objectifs + Poids + Nutrition */}
                <div className="lg:col-span-2 space-y-4">

                  {/* Carte Objectifs */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                    <h3 className="text-[#F5F5F3] text-sm font-semibold mb-4 flex items-center gap-2">
                      <Target size={14} className="text-[#FF6B2B]" />
                      Objectifs
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-[#09090b] rounded-lg p-3.5">
                        <p className="text-white/25 text-[10px] uppercase tracking-wider mb-1">Type d'objectif</p>
                        <p className="text-[#F5F5F3] text-sm font-semibold">{p?.objectif_type || '—'}</p>
                        {p?.objectif_type && (
                          <span className="inline-block mt-1.5 text-[9px] px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-semibold">
                            Objectif
                          </span>
                        )}
                      </div>
                      <div className="bg-[#09090b] rounded-lg p-3.5">
                        <p className="text-white/25 text-[10px] uppercase tracking-wider mb-1">Début du coaching</p>
                        <p className="text-[#F5F5F3] text-sm font-semibold">
                          {p?.date_debut_coaching
                            ? new Date(p.date_debut_coaching).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                            : selectedClient?.created_at
                              ? new Date(selectedClient.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—'
                          }
                        </p>
                      </div>
                      <div className="bg-[#09090b] rounded-lg p-3.5">
                        <p className="text-white/25 text-[10px] uppercase tracking-wider mb-1">Échéance</p>
                        <p className="text-[#F5F5F3] text-sm font-semibold">
                          {p?.date_echeance
                            ? new Date(p.date_echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'
                          }
                        </p>
                      </div>
                    </div>

                    {/* Objectifs actifs */}
                    {objectifs.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {objectifs.slice(0, 3).map((o) => (
                          <div key={o.id} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-[#F5F5F3] text-xs font-medium truncate">{o.titre}</p>
                                <span className="text-white/30 text-[10px] font-medium ml-2">{o.score}%</span>
                              </div>
                              <div className="h-1 bg-[#27272a] rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#FF6B2B] transition-all" style={{ width: `${o.score}%` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Row : Poids + Nutrition */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* Carte Poids */}
                    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                      <h3 className="text-[#F5F5F3] text-sm font-semibold mb-4 flex items-center gap-2">
                        <Scale size={14} className="text-[#FF6B2B]" />
                        Poids
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <p className="text-white/25 text-[10px] uppercase tracking-wider">Départ</p>
                          <p className="text-[#F5F5F3] text-xl font-bold mt-1">
                            {p?.poids_depart ? `${p.poids_depart}` : '—'}
                          </p>
                          <p className="text-white/20 text-[10px]">kg</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-[2px] bg-[#27272a]" />
                          <ChevronRight size={14} className="text-[#FF6B2B]" />
                          <div className="w-8 h-[2px] bg-[#27272a]" />
                        </div>
                        <div className="text-center">
                          <p className="text-white/25 text-[10px] uppercase tracking-wider">Cible</p>
                          <p className="text-[#FF6B2B] text-xl font-bold mt-1">
                            {p?.poids_cible ? `${p.poids_cible}` : '—'}
                          </p>
                          <p className="text-white/20 text-[10px]">kg</p>
                        </div>
                      </div>
                      {p?.poids_depart && p?.poids_cible && (p?.poids_actuel || p?.poids_depart) && (
                        <div className="mt-4">
                          <div className="h-2 bg-[#27272a] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#FF6B2B] to-[#22c55e] transition-all"
                              style={{
                                width: `${Math.min(100, Math.max(0,
                                  ((p.poids_depart - (p.poids_actuel || p.poids_depart)) / (p.poids_depart - p.poids_cible)) * 100
                                ))}%`
                              }}
                            />
                          </div>
                          <p className="text-white/20 text-[10px] mt-1 text-right">
                            Actuel : {p.poids_actuel || p.poids_depart} kg
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Carte Nutrition */}
                    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                      <h3 className="text-[#F5F5F3] text-sm font-semibold mb-4 flex items-center gap-2">
                        <Apple size={14} className="text-[#FF6B2B]" />
                        Nutrition
                      </h3>
                      <div className="text-center mb-4">
                        <p className="text-[#F5F5F3] text-3xl font-bold">
                          {p?.calories_cibles || '—'}
                        </p>
                        <p className="text-white/25 text-xs mt-0.5">kcal / jour</p>
                        {p?.calories_cibles && (
                          <span className="inline-block mt-2 text-[9px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-semibold">
                            Objectif calorique
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-1.5 border-t border-[#27272a]">
                          <span className="text-white/30 text-xs">🌅 Petit-déjeuner</span>
                          <span className="text-[#F5F5F3] text-xs font-medium">
                            {p?.calories_cibles ? `~${Math.round(p.calories_cibles * 0.25)} kcal` : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 border-t border-[#27272a]">
                          <span className="text-white/30 text-xs">☀️ Déjeuner</span>
                          <span className="text-[#F5F5F3] text-xs font-medium">
                            {p?.calories_cibles ? `~${Math.round(p.calories_cibles * 0.35)} kcal` : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 border-t border-[#27272a]">
                          <span className="text-white/30 text-xs">🌙 Dîner</span>
                          <span className="text-[#F5F5F3] text-xs font-medium">
                            {p?.calories_cibles ? `~${Math.round(p.calories_cibles * 0.30)} kcal` : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 border-t border-[#27272a]">
                          <span className="text-white/30 text-xs">🍎 Collations</span>
                          <span className="text-[#F5F5F3] text-xs font-medium">
                            {p?.calories_cibles ? `~${Math.round(p.calories_cibles * 0.10)} kcal` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Carte Habitudes du jour */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                    <h3 className="text-[#F5F5F3] text-sm font-semibold mb-3 flex items-center gap-2">
                      <Flame size={14} className="text-[#FF6B2B]" />
                      Habitudes actives
                      <span className="text-white/20 text-xs ml-auto">{habitudes.length}</span>
                    </h3>
                    {habitudes.length === 0 ? (
                      <p className="text-white/15 text-xs text-center py-4">Aucune habitude active</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {habitudes.map((h) => (
                          <span
                            key={h.id}
                            className="text-xs px-3 py-1.5 rounded-lg border border-[#27272a] text-white/50"
                            style={{ borderColor: `${h.couleur}30`, color: h.couleur }}
                          >
                            {h.nom}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Onglet Calendrier — Vue hebdomadaire ── */}
            {activeTab === 'calendar' && (
              <CalendarTab clientId={selectedId} clientName={fullName} coachId={user?.id} />
            )}

            {/* ── Onglet Sport — Éditeur de séances ── */}
            {activeTab === 'sport' && (
              <SportTab clientName={fullName} />
            )}

            {/* ── Placeholder pour les autres onglets ── */}
            {activeTab !== 'overview' && activeTab !== 'sport' && activeTab !== 'calendar' && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <BarChart3 size={36} className="text-white/10 mx-auto mb-3" />
                  <p className="text-white/20 text-sm">
                    Onglet « {TABS.find(t => t.id === activeTab)?.label} » — bientôt disponible
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════ */}
      {/* MODAL INVITATION                      */}
      {/* ══════════════════════════════════════ */}
      <Modal isOpen={modalInvit} onClose={() => setModalInvit(false)} title="Inviter un client">
        {!invitSuccess ? (
          <form onSubmit={envoyerInvitation} className="space-y-4">
            <div>
              <label className="block text-sm text-white/50 mb-1.5">Prénom du client</label>
              <input type="text" value={invitPrenom} onChange={(e) => setInvitPrenom(e.target.value)}
                placeholder="Lucas" autoFocus
                className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1.5">Email</label>
              <input type="email" value={invitEmail} onChange={(e) => setInvitEmail(e.target.value)}
                placeholder="lucas@exemple.com" required
                className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B] transition-colors" />
            </div>
            {invitError && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{invitError}</p>
            )}
            <p className="text-white/20 text-xs">Un lien d'invitation valable 7 jours sera généré.</p>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setModalInvit(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-white/40 bg-[#27272a] hover:bg-[#3f3f46] transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={envoi}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40">
                {envoi ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                Générer le lien
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <p className="text-green-400 text-sm font-medium">✓ Invitation créée !</p>
              <p className="text-white/30 text-xs mt-1">Envoyez ce lien à {invitSuccess.prenom || invitSuccess.email} :</p>
            </div>
            <div className="bg-[#09090b] rounded-lg p-3">
              <p className="text-[#FF6B2B] text-xs font-mono break-all">{invitSuccess.lien}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(invitSuccess.lien); toast.success('Lien copie !') }}
              className="w-full py-2.5 rounded-xl text-sm text-white/40 bg-[#27272a] hover:bg-[#3f3f46] transition-colors">
              Copier le lien
            </button>
            <button onClick={() => { setModalInvit(false); setInvitSuccess(null) }}
              className="w-full py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors">
              Fermer
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
