# Fiche client coach structure Gymkee — Partie 1 (onglets + Fitness + Nutrition + Facturation + Santé)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner au coach, dans la fiche client (`CoachClientHub`), l'historique des séances avec détail objectif/résultat, l'historique nutrition journalier, un onglet Santé et un onglet Facturation — structure d'onglets calquée sur Gymkee.

**Architecture:** Le hub (`CoachClientHub.jsx`, 7 722 lignes) n'est modifié qu'à la marge (barre d'onglets + rendu) ; tout le nouveau code vit dans `src/pages/coach/client-hub/*.jsx`. Les données existent déjà en DB (`seances`, `seance_exercice_logs`, `nutrition_client_logs`, `paiements_clients`, `abonnements_clients`, `factures`, `suivi_poids`, `sommeil_log`, `humeur_log`, `sport_log`) sauf `seances.started_at` (1 migration). La partie Bilans fait l'objet d'un plan séparé (Partie 2).

**Tech Stack:** React 18 + Vite 6, Tailwind 4 (CSS vars thème), Supabase JS, Recharts, lucide-react.

**Spec:** `docs/superpowers/specs/2026-07-16-fiche-client-coach-gymkee-design.md`

**Pas de tests unitaires dans ce projet** (aucun runner installé). Vérification par tâche : `npm run build` (doit passer) + contrôle visuel en preview avec une session coach (méthode magiclink documentée dans `SESSION-README.md`).

**Conventions du projet à respecter :**
- Texte UI en français, code camelCase, tables/colonnes DB en français snake_case.
- Couleurs via CSS vars : `bg-[var(--bg-card)]`, `bg-[var(--bg-surface)]`, `text-[var(--text-primary)]`, `text-[var(--text-muted)]`, accent `#FF6B2B` (côté coach = orange Zevo, pas de white-label).
- Montants paiements stockés **en centimes**.
- `clients.id` = `profiles.id` (même uuid) — `selectedId` du hub marche pour les deux.
- Requêtes sur tables potentiellement absentes en prod : try/catch + fallback vide (pattern existant du hub).

---

### Task 1: Restructuration de la barre d'onglets

**Files:**
- Modify: `zevo/src/pages/coach/CoachClientHub.jsx:34-43`

- [ ] **Step 1: Remplacer les constantes TABS / HIDDEN_TABS**

Dans `CoachClientHub.jsx` lignes 34-43, remplacer :

```js
const TABS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: Eye },
  { id: 'calendar', label: 'Calendrier', icon: Calendar },
  { id: 'sport', label: 'Sport', icon: Dumbbell },
  { id: 'nutrition', label: 'Nutrition', icon: Apple },
  { id: 'habitudes', label: 'Habitudes', icon: Flame },
  { id: 'objectifs', label: 'Objectifs', icon: Target },
]
// Onglets cachés mais handlers conservés (accès via icônes header / deep-link)
const HIDDEN_TABS = ['infos', 'suivi', 'partage']
```

par :

```js
// Ordre Gymkee : Activité / Fitness / Nutrition / (Santé, Task 7) / Habitudes /
// Objectifs / Calendrier / Infos / (Facturation, Task 5)
const TABS = [
  { id: 'overview', label: 'Activité', icon: Eye },
  { id: 'sport', label: 'Fitness', icon: Dumbbell },
  { id: 'nutrition', label: 'Nutrition', icon: Apple },
  { id: 'habitudes', label: 'Habitudes', icon: Flame },
  { id: 'objectifs', label: 'Objectifs', icon: Target },
  { id: 'calendar', label: 'Calendrier', icon: Calendar },
  { id: 'infos', label: 'Infos personnelles', icon: User },
]
// Onglets cachés mais handlers conservés (accès via icônes header / deep-link)
const HIDDEN_TABS = ['suivi', 'partage']
```

Les ids ne changent pas (pas de casse des deep-links ni des `setActiveTab` existants). Le rendu `{activeTab === 'infos' && <InfosTab …/>}` existe déjà (ligne ~7613) — le sortir de HIDDEN_TABS suffit à l'afficher. `User` est déjà importé de lucide-react (ligne 17).

- [ ] **Step 2: Vérifier le build**

Run: `cd zevo && npm run build`
Expected: build OK sans erreur.

- [ ] **Step 3: Vérification preview**

Lancer le dev server (launch.json), session coach → Clients → ouvrir un client. La barre affiche : Activité, Fitness, Nutrition, Habitudes, Objectifs, Calendrier, Infos personnelles. Chaque onglet rend son contenu (Fitness = ancien contenu Sport, Infos = fiche infos).

- [ ] **Step 4: Commit**

```bash
git add zevo/src/pages/coach/CoachClientHub.jsx
git commit -m "feat(coach): fiche client — onglets ordre Gymkee, Infos visible"
```

---

### Task 2: Tracking durée de séance (started_at) côté client

**Files:**
- Create: `zevo/supabase/add-seances-started-at.sql`
- Modify: `zevo/src/pages/client/WorkoutTrackerPage.jsx` (imports ligne 1, states ~79, select ~126, update complétion ~369)

- [ ] **Step 1: Créer la migration**

Créer `zevo/supabase/add-seances-started-at.sql` :

```sql
-- Session 16 juillet 2026 — Historique Fitness fiche client coach.
-- Heure de lancement de la séance par le client (WorkoutTrackerPage).
-- Durée affichée coach = completed_at - started_at (ou metadata.duree_minutes).
ALTER TABLE seances ADD COLUMN IF NOT EXISTS started_at timestamptz;
COMMENT ON COLUMN seances.started_at IS 'Heure de lancement de la séance par le client. Durée = completed_at - started_at.';
```

- [ ] **Step 2: Appliquer la migration en prod**

Via Supabase Studio SQL Editor (ou la méthode API Management + token CLI documentée dans `SESSION-README.md`). Vérifier : `select column_name from information_schema.columns where table_name='seances' and column_name='started_at';` retourne 1 ligne.

- [ ] **Step 3: Enregistrer l'heure de début dans le tracker**

Dans `WorkoutTrackerPage.jsx` :

a) Ligne 1, ajouter `useRef` à l'import React s'il n'y est pas :
```js
import { useState, useEffect, useRef } from 'react'
```

b) Près des autres états du composant (~ligne 79), ajouter :
```js
// Heure de lancement de la séance — sert au calcul de durée côté coach
const startedAtRef = useRef(new Date())
```

c) Dans le select de chargement de la séance (~ligne 126), ajouter `metadata` :
```js
.select('id, titre, notes, is_completed, metadata')
```

- [ ] **Step 4: Écrire durée + calories à la complétion**

Dans le handler de complétion (~ligne 369), remplacer :

```js
      const { error } = await supabase
        .from('seances')
        .update({ is_completed: true })
        .eq('id', seance.id)
```

par :

```js
      const completedAt = new Date()
      const dureeMin = Math.max(1, Math.round((completedAt - startedAtRef.current) / 60000))
      const { error } = await supabase
        .from('seances')
        .update({
          is_completed: true,
          started_at: startedAtRef.current.toISOString(),
          completed_at: completedAt.toISOString(),
          // ~7 kcal/min (musculation, intensité modérée) — estimation sans wearable
          metadata: {
            ...(seance?.metadata || {}),
            duree_minutes: dureeMin,
            calories_estimees: Math.round(dureeMin * 7),
          },
        })
        .eq('id', seance.id)
```

Le fallback hors-ligne (`savePendingSeance`) reste inchangé : les séances synchronisées plus tard n'auront pas de durée, l'UI coach affiche « — » dans ce cas.

- [ ] **Step 5: Build + vérification preview**

Run: `cd zevo && npm run build` → OK.
Preview session client : lancer une séance, la compléter. En DB : `select started_at, completed_at, metadata from seances where id='<id>';` → les 3 renseignés.

- [ ] **Step 6: Commit**

```bash
git add zevo/supabase/add-seances-started-at.sql zevo/src/pages/client/WorkoutTrackerPage.jsx
git commit -m "feat(client): tracking durée séance (started_at/completed_at + calories estimées)"
```

---

### Task 3: Historique des séances — onglet Fitness

**Files:**
- Create: `zevo/src/pages/coach/client-hub/FitnessHistorySection.jsx`
- Modify: `zevo/src/pages/coach/CoachClientHub.jsx` (import en tête + rendu onglet sport ~7585)

- [ ] **Step 1: Créer le composant FitnessHistorySection**

Créer `zevo/src/pages/coach/client-hub/FitnessHistorySection.jsx` :

```jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { Modal } from '../../../components/ui/Modal'
import {
  Loader2, Search, ChevronLeft, ChevronRight, Dumbbell,
  CheckCircle2, Clock, Flame, MessageSquare, ClipboardList,
} from 'lucide-react'

const PAGE_SIZE = 20

const STATUTS = {
  completee: { label: 'Complétée', cls: 'bg-emerald-500/10 text-emerald-400' },
  manquee:   { label: 'Manquée',   cls: 'bg-red-500/10 text-red-400' },
  avenir:    { label: 'À venir',   cls: 'bg-[var(--bg-surface)] text-[var(--text-muted)]' },
}

const FILTRES = [
  { id: 'tous', label: 'Tous' },
  { id: 'completee', label: 'Complétées' },
  { id: 'manquee', label: 'Manquées' },
  { id: 'avenir', label: 'À venir' },
]

function statutSeance(s) {
  if (s.is_completed) return 'completee'
  const today = new Date().toISOString().slice(0, 10)
  return s.date_prevue < today ? 'manquee' : 'avenir'
}

function formatDuree(s) {
  const min = s.metadata?.duree_minutes
    ?? (s.started_at && s.completed_at
      ? Math.round((new Date(s.completed_at) - new Date(s.started_at)) / 60000)
      : null)
  if (!min) return '—'
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min} min`
}

function formatDateFr(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// ══════════════════════════════════════
// Modal détail d'une séance (objectif vs résultat par set)
// ══════════════════════════════════════
function SeanceDetailModal({ seance, onClose }) {
  const [loading, setLoading] = useState(true)
  const [exos, setExos] = useState([])
  const [logsByExo, setLogsByExo] = useState({})
  const [formReponses, setFormReponses] = useState([])
  const [champLabels, setChampLabels] = useState({})

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data: exosData } = await supabase
        .from('seance_exercices')
        .select(`id, series, reps, reps_cible, poids, repos, ordre,
                 exercices(nom, muscle_group, gif_url),
                 sport_seance_exercices(exercice_nom_custom)`)
        .eq('seance_id', seance.id)
        .order('ordre', { ascending: true })
      const exosList = exosData || []
      setExos(exosList)

      // Logs réels par set (table potentiellement absente → fallback objectifs seuls)
      try {
        const ids = exosList.map(e => e.id)
        if (ids.length > 0) {
          const { data: logs } = await supabase
            .from('seance_exercice_logs')
            .select('seance_exercice_id, set_number, charge_kg_reel, reps_reel, rpe_percu, notes_client')
            .in('seance_exercice_id', ids)
            .order('set_number', { ascending: true })
          const map = {}
          for (const l of (logs || [])) {
            if (!map[l.seance_exercice_id]) map[l.seance_exercice_id] = []
            map[l.seance_exercice_id].push(l)
          }
          setLogsByExo(map)
        }
      } catch (e) {
        console.warn('[FitnessHistory] seance_exercice_logs indisponible:', e?.message)
      }

      // Formulaire de fin de séance (réponses post-séance rattachées)
      try {
        const { data: reponses } = await supabase
          .from('formulaire_reponses')
          .select('id, reponses, created_at, formulaire_id, formulaires(titre)')
          .eq('seance_id', seance.id)
        setFormReponses(reponses || [])
        const formIds = [...new Set((reponses || []).map(r => r.formulaire_id).filter(Boolean))]
        if (formIds.length > 0) {
          const { data: champs } = await supabase
            .from('formulaire_champs')
            .select('id, label, type_champ')
            .in('formulaire_id', formIds)
          const labels = {}
          for (const c of (champs || [])) labels[c.id] = c
          setChampLabels(labels)
        }
      } catch (e) {
        console.warn('[FitnessHistory] formulaire_reponses indisponible:', e?.message)
      }

      setLoading(false)
    }
    load()
  }, [seance.id])

  const st = STATUTS[statutSeance(seance)]
  const kcal = seance.metadata?.calories_estimees

  return (
    <Modal isOpen onClose={onClose} title={seance.titre} className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <div className="p-5 space-y-5">
        {/* En-tête stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: ClipboardList, label: 'Date', value: formatDateFr(seance.date_prevue) },
            { icon: Clock, label: 'Durée', value: formatDuree(seance) },
            { icon: Dumbbell, label: 'Exercices', value: String(exos.length || '—') },
            { icon: Flame, label: 'Calories est.', value: kcal ? `${kcal} kcal` : '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-[var(--bg-surface)] rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[11px] mb-1">
                <Icon size={12} /> {label}
              </div>
              <p className="text-[var(--text-primary)] text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-semibold ${st.cls}`}>
          {st.label}
        </span>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#FF6B2B]" size={22} /></div>
        ) : (
          <>
            {/* Formulaire de fin de séance */}
            {formReponses.length > 0 && (
              <div>
                <h4 className="text-[var(--text-primary)] text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-[#FF6B2B]" /> Formulaire de fin de séance
                </h4>
                <div className="space-y-2">
                  {formReponses.map(r => (
                    <div key={r.id} className="bg-[var(--bg-surface)] rounded-xl p-3 space-y-1.5">
                      {r.formulaires?.titre && (
                        <p className="text-[var(--text-muted)] text-[11px]">{r.formulaires.titre}</p>
                      )}
                      {Object.entries(r.reponses || {}).map(([champId, valeur]) => (
                        <div key={champId} className="flex items-center justify-between gap-3">
                          <span className="text-[var(--text-muted)] text-xs">
                            {champLabels[champId]?.label || 'Question'}
                          </span>
                          <span className="text-[var(--text-primary)] text-xs font-semibold">
                            {champLabels[champId]?.type_champ === 'note_1_10' ? `${valeur}/10` : String(valeur)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exercices : objectif vs résultat */}
            <div>
              <h4 className="text-[var(--text-primary)] text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Dumbbell size={14} className="text-[#FF6B2B]" /> Exercices
              </h4>
              {exos.length === 0 ? (
                <p className="text-[var(--text-muted)] text-xs">Aucun exercice dans cette séance.</p>
              ) : (
                <div className="space-y-2">
                  {exos.map(exo => {
                    const nom = exo.sport_seance_exercices?.exercice_nom_custom || exo.exercices?.nom || 'Exercice'
                    const logs = logsByExo[exo.id] || []
                    const objectif = `${exo.series || '—'} × ${exo.reps_cible || exo.reps || '—'}${exo.poids ? ` · ${exo.poids} kg` : ''}`
                    return (
                      <div key={exo.id} className="bg-[var(--bg-surface)] rounded-xl p-3">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <p className="text-[var(--text-primary)] text-sm font-semibold truncate">{nom}</p>
                          {logs.length > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold flex-shrink-0">
                              ✓ {logs.length}/{exo.series || logs.length}
                            </span>
                          )}
                        </div>
                        <p className="text-[var(--text-muted)] text-[11px] mb-1.5">Objectif : {objectif}</p>
                        {logs.length === 0 ? (
                          <p className="text-[var(--text-muted)] text-[11px] italic">Résultats non renseignés</p>
                        ) : (
                          <div className="space-y-1">
                            {logs.map(l => (
                              <div key={`${exo.id}-${l.set_number}`}
                                   className="flex items-center gap-2 text-xs bg-emerald-500/5 rounded-lg px-2 py-1">
                                <span className="text-[var(--text-muted)] w-10 flex-shrink-0">Set {l.set_number}</span>
                                <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                                <span className="text-[var(--text-primary)] font-semibold">
                                  {l.charge_kg_reel != null ? `${l.charge_kg_reel} kg` : ''}
                                  {l.charge_kg_reel != null && l.reps_reel != null ? ' × ' : ''}
                                  {l.reps_reel != null ? `${l.reps_reel} reps` : ''}
                                </span>
                                {l.rpe_percu != null && (
                                  <span className="text-[var(--text-muted)] ml-auto">RPE {l.rpe_percu}</span>
                                )}
                              </div>
                            ))}
                            {logs.some(l => l.notes_client) && (
                              <p className="text-[var(--text-muted)] text-[11px] italic mt-1">
                                {logs.filter(l => l.notes_client).map(l => l.notes_client).join(' · ')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════
// Section historique des séances (liste + filtres + pagination)
// ══════════════════════════════════════
export default function FitnessHistorySection({ coachId, clientId }) {
  const [loading, setLoading] = useState(true)
  const [seances, setSeances] = useState([])
  const [filtre, setFiltre] = useState('tous')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    if (!coachId || !clientId) return
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('seances')
        .select(`id, titre, date_prevue, is_completed, started_at, completed_at, metadata,
                 sport_programmes(nom), seance_exercices(count)`)
        .eq('coach_id', coachId)
        .eq('client_id', clientId)
        .eq('is_template', false)
        .order('date_prevue', { ascending: false })
        .limit(500)
      setSeances(data || [])
      setLoading(false)
    }
    load()
  }, [coachId, clientId])

  const filtered = seances.filter(s => {
    if (filtre !== 'tous' && statutSeance(s) !== filtre) return false
    if (search && !s.titre?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="bg-[var(--bg-card)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 sm:p-5 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <h3 className="text-[var(--text-primary)] font-semibold text-sm flex items-center gap-2 flex-1">
          <Dumbbell size={15} className="text-[#FF6B2B]" /> Historique des séances
        </h3>
        <div className="flex items-center gap-2">
          {FILTRES.map(f => (
            <button key={f.id}
              onClick={() => { setFiltre(f.id); setPage(0) }}
              className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition-colors ${
                filtre === f.id
                  ? 'bg-[#FF6B2B]/10 text-[#FF6B2B]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Rechercher"
            className="bg-[var(--bg-surface)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none w-40" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#FF6B2B]" size={22} /></div>
      ) : pageItems.length === 0 ? (
        <p className="text-[var(--text-muted)] text-xs text-center py-6">Aucune séance.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[var(--text-muted)] text-[11px]">
                <th className="pb-2 pr-3 font-medium">Date</th>
                <th className="pb-2 pr-3 font-medium">Durée</th>
                <th className="pb-2 pr-3 font-medium">Nom</th>
                <th className="pb-2 pr-3 font-medium hidden sm:table-cell">Programme</th>
                <th className="pb-2 pr-3 font-medium">Exos</th>
                <th className="pb-2 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(s => {
                const st = STATUTS[statutSeance(s)]
                return (
                  <tr key={s.id}
                    onClick={() => setDetail(s)}
                    className="border-t border-[rgba(255,255,255,0.06)] cursor-pointer hover:bg-[var(--bg-surface)] transition-colors">
                    <td className="py-2.5 pr-3 text-xs whitespace-nowrap tabular-nums">
                      <span className="text-[var(--text-primary)]">{formatDateFr(s.date_prevue)}</span>
                      {s.started_at && s.completed_at && (
                        <span className="block text-[10px] text-[var(--text-muted)]">
                          {new Date(s.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {' → '}
                          {new Date(s.completed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-[var(--text-muted)] whitespace-nowrap tabular-nums">
                      {formatDuree(s)}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-[var(--text-primary)] font-medium max-w-[200px] truncate">
                      {s.titre}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-[var(--text-muted)] hidden sm:table-cell max-w-[160px] truncate">
                      {s.sport_programmes?.nom || '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-[var(--text-muted)] tabular-nums">
                      {s.seance_exercices?.[0]?.count ?? '—'}
                    </td>
                    <td className="py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-3">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="p-1.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] disabled:opacity-40">
            <ChevronLeft size={14} />
          </button>
          <span className="text-[11px] text-[var(--text-muted)] tabular-nums">{page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
            className="p-1.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] disabled:opacity-40">
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {detail && <SeanceDetailModal seance={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
```

Signature vérifiée du composant `Modal` (`src/components/ui/Modal.jsx`) : `{ isOpen, onClose, title, children, className }` — `max-w-md` par défaut, d'où le `className="max-w-2xl max-h-[85vh] overflow-y-auto"` passé ici. Les children ne sont pas wrappés avec du padding par le Modal → le `p-5` est sur le conteneur interne.

- [ ] **Step 2: Intégrer dans l'onglet Fitness du hub**

Dans `CoachClientHub.jsx` :

a) En tête de fichier (après l'import de `SessionEditorModal`, ligne 12) :
```js
import FitnessHistorySection from './client-hub/FitnessHistorySection'
```

b) Dans le rendu de l'onglet sport (~ligne 7585), remplacer :
```jsx
            {activeTab === 'sport' && (
              openProgramme ? (
                <ProgramBuilder
                  programme={openProgramme}
                  onBack={() => { setOpenProgramme(null); setActiveTab('overview') }}
                />
              ) : (
                <SportTab
                  clientName={fullName}
                  coachId={user?.id}
                  clientId={selectedId}
                  onOpenCalendar={() => setActiveTab('calendar')}
                  onOpenProgramme={(p) => setOpenProgramme(p)}
                />
              )
            )}
```
par :
```jsx
            {activeTab === 'sport' && (
              openProgramme ? (
                <ProgramBuilder
                  programme={openProgramme}
                  onBack={() => { setOpenProgramme(null); setActiveTab('overview') }}
                />
              ) : (
                <>
                  <SportTab
                    clientName={fullName}
                    coachId={user?.id}
                    clientId={selectedId}
                    onOpenCalendar={() => setActiveTab('calendar')}
                    onOpenProgramme={(p) => setOpenProgramme(p)}
                  />
                  <FitnessHistorySection coachId={user?.id} clientId={selectedId} />
                </>
              )
            )}
```

- [ ] **Step 3: Build + vérification preview**

Run: `cd zevo && npm run build` → OK.
Preview session coach : onglet Fitness → la section « Historique des séances » liste les séances avec statuts ; cliquer une séance complétée → modal avec durée, exercices, sets objectif/résultat, formulaire de fin si présent. Filtres et recherche fonctionnent.

- [ ] **Step 4: Commit**

```bash
git add zevo/src/pages/coach/client-hub/FitnessHistorySection.jsx zevo/src/pages/coach/CoachClientHub.jsx
git commit -m "feat(coach): historique des séances avec détail objectif/résultat (onglet Fitness)"
```

---

### Task 4: Historique nutrition journalier — onglet Nutrition

**Files:**
- Create: `zevo/src/pages/coach/client-hub/NutritionHistorySection.jsx`
- Modify: `zevo/src/pages/coach/CoachClientHub.jsx` (import + rendu onglet nutrition ~7602)

- [ ] **Step 1: Créer le composant NutritionHistorySection**

Créer `zevo/src/pages/coach/client-hub/NutritionHistorySection.jsx` :

```jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { Modal } from '../../../components/ui/Modal'
import { Loader2, Apple, ChevronLeft, ChevronRight, UtensilsCrossed, CheckCircle2 } from 'lucide-react'

const PAGE_SIZE = 20

const MACROS = [
  { key: 'kcal', reel: 'kcal_reel', cible: 'kcal_cible', label: 'Calories', unite: 'cal', bar: 'bg-[#FF6B2B]' },
  { key: 'glucides', reel: 'glucides_reel_g', cible: 'glucides_cible_g', label: 'Glucides', unite: 'g', bar: 'bg-teal-400' },
  { key: 'proteines', reel: 'proteines_reel_g', cible: 'proteines_cible_g', label: 'Protéines', unite: 'g', bar: 'bg-purple-400' },
  { key: 'lipides', reel: 'lipides_reel_g', cible: 'lipides_cible_g', label: 'Lipides', unite: 'g', bar: 'bg-red-400' },
]

function formatDateFr(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function MacroBar({ reel, cible, bar }) {
  const pct = cible > 0 ? Math.min(100, Math.round((reel / cible) * 100)) : 0
  return (
    <div className="h-1.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
      <div className={`h-full rounded-full ${bar}`} style={{ width: `${cible > 0 ? pct : reel > 0 ? 100 : 0}%` }} />
    </div>
  )
}

// ══════════════════════════════════════
// Modal détail d'un jour
// ══════════════════════════════════════
function NutritionDayModal({ log, onClose }) {
  const cibles = log.nutrition_phases || {}
  const repas = Array.isArray(log.repas_detail) ? log.repas_detail : []
  const ecart = cibles.kcal_cible ? (log.kcal_reel || 0) - cibles.kcal_cible : null

  return (
    <Modal isOpen onClose={onClose} title={formatDateFr(log.date_jour)} className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <div className="p-5 space-y-5">
        {log.nutrition_programmes?.nom && (
          <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-semibold">
            {log.nutrition_programmes.nom}
          </span>
        )}

        {/* Résumé kcal */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--bg-surface)] rounded-xl p-3 text-center">
            <p className="text-[var(--text-muted)] text-[11px] mb-1">Objectif</p>
            <p className="text-[var(--text-primary)] text-lg font-bold tabular-nums">
              {cibles.kcal_cible ? `${cibles.kcal_cible} kcal` : '—'}
            </p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-xl p-3 text-center">
            <p className="text-[var(--text-muted)] text-[11px] mb-1">Consommé</p>
            <p className="text-[var(--text-primary)] text-lg font-bold tabular-nums">
              {log.kcal_reel != null ? `${log.kcal_reel} kcal` : '—'}
            </p>
            {ecart != null && (
              <span className={`text-[10px] font-semibold ${ecart <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {ecart > 0 ? '+' : ''}{ecart} kcal
              </span>
            )}
          </div>
        </div>

        {/* Macros */}
        <div className="space-y-2.5">
          {MACROS.filter(m => m.key !== 'kcal').map(m => (
            <div key={m.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[var(--text-muted)]">{m.label}</span>
                <span className="text-[var(--text-primary)] font-semibold tabular-nums">
                  {log[m.reel] != null ? `${log[m.reel]} g` : '—'}
                  {cibles[m.cible] ? ` / ${cibles[m.cible]} g` : ''}
                </span>
              </div>
              <MacroBar reel={log[m.reel] || 0} cible={cibles[m.cible] || 0} bar={m.bar} />
            </div>
          ))}
        </div>

        {/* Détail des repas */}
        <div>
          <h4 className="text-[var(--text-primary)] text-sm font-semibold mb-2 flex items-center gap-1.5">
            <UtensilsCrossed size={14} className="text-[#FF6B2B]" /> Détail des repas
            <span className="text-[var(--text-muted)] text-[11px] font-normal ml-auto">{repas.length} repas</span>
          </h4>
          {repas.length === 0 ? (
            <p className="text-[var(--text-muted)] text-xs">Aucun repas détaillé ce jour.</p>
          ) : (
            <div className="space-y-2">
              {repas.map((r, i) => (
                <div key={i} className="bg-[var(--bg-surface)] rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                    <p className="text-[var(--text-primary)] text-sm font-semibold flex-1 truncate">
                      {r.titre || r.type || `Repas ${i + 1}`}
                    </p>
                    {r.kcal != null && (
                      <span className="text-[var(--text-muted)] text-xs tabular-nums">{r.kcal} kcal</span>
                    )}
                  </div>
                  {(r.p != null || r.g != null || r.l != null) && (
                    <p className="text-[var(--text-muted)] text-[11px] tabular-nums">
                      P {r.p ?? '—'} g · G {r.g ?? '—'} g · L {r.l ?? '—'} g
                    </p>
                  )}
                  {Array.isArray(r.ingredients) && r.ingredients.length > 0 && (
                    <p className="text-[var(--text-muted)] text-[11px] mt-1 truncate">
                      {r.ingredients.map(ing => typeof ing === 'string' ? ing : ing?.nom).filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ressenti + notes */}
        {(log.ressenti || log.notes_client) && (
          <div className="bg-[var(--bg-surface)] rounded-xl p-3">
            {log.ressenti && (
              <p className="text-xs text-[var(--text-primary)] mb-1">
                Ressenti : <span className="font-semibold capitalize">{log.ressenti}</span>
              </p>
            )}
            {log.notes_client && (
              <p className="text-[var(--text-muted)] text-xs italic">{log.notes_client}</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════
// Section historique nutrition (liste des jours)
// ══════════════════════════════════════
export default function NutritionHistorySection({ clientId }) {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [page, setPage] = useState(0)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    if (!clientId) return
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('nutrition_client_logs')
          .select(`id, date_jour, kcal_reel, proteines_reel_g, glucides_reel_g, lipides_reel_g,
                   ressenti, notes_client, repas_detail,
                   nutrition_programmes(nom),
                   nutrition_phases(kcal_cible, proteines_cible_g, glucides_cible_g, lipides_cible_g)`)
          .eq('client_id', clientId)
          .order('date_jour', { ascending: false })
          .limit(365)
        setLogs(data || [])
      } catch (e) {
        console.warn('[NutritionHistory] nutrition_client_logs indisponible:', e?.message)
        setLogs([])
      }
      setLoading(false)
    }
    load()
  }, [clientId])

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE))
  const pageItems = logs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="bg-[var(--bg-card)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 sm:p-5 mt-4">
      <h3 className="text-[var(--text-primary)] font-semibold text-sm flex items-center gap-2 mb-4">
        <Apple size={15} className="text-[#FF6B2B]" /> Historique nutrition
      </h3>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#FF6B2B]" size={22} /></div>
      ) : pageItems.length === 0 ? (
        <p className="text-[var(--text-muted)] text-xs text-center py-6">
          Aucun jour loggé par ce client pour le moment.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[var(--text-muted)] text-[11px]">
                <th className="pb-2 pr-3 font-medium">Date</th>
                <th className="pb-2 pr-3 font-medium hidden sm:table-cell">Plan</th>
                {MACROS.map(m => (
                  <th key={m.key} className="pb-2 pr-3 font-medium">{m.label}</th>
                ))}
                <th className="pb-2 font-medium">Repas</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(log => {
                const cibles = log.nutrition_phases || {}
                const nbRepas = Array.isArray(log.repas_detail) ? log.repas_detail.length : 0
                return (
                  <tr key={log.id}
                    onClick={() => setDetail(log)}
                    className="border-t border-[rgba(255,255,255,0.06)] cursor-pointer hover:bg-[var(--bg-surface)] transition-colors">
                    <td className="py-2.5 pr-3 text-xs text-[var(--text-primary)] whitespace-nowrap tabular-nums">
                      {formatDateFr(log.date_jour)}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-[var(--text-muted)] hidden sm:table-cell max-w-[150px] truncate">
                      {log.nutrition_programmes?.nom || '—'}
                    </td>
                    {MACROS.map(m => (
                      <td key={m.key} className="py-2.5 pr-3 min-w-[90px]">
                        <MacroBar reel={log[m.reel] || 0} cible={cibles[m.cible] || 0} bar={m.bar} />
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 tabular-nums whitespace-nowrap">
                          {log[m.reel] ?? '—'}{cibles[m.cible] ? `/${cibles[m.cible]}` : ''} {m.unite}
                        </p>
                      </td>
                    ))}
                    <td className="py-2.5">
                      <span className="text-emerald-400 text-xs tracking-widest">
                        {'•'.repeat(Math.min(nbRepas, 6))}
                      </span>
                      <span className="text-[var(--text-muted)] text-[10px] ml-1 tabular-nums">{nbRepas}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-3">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="p-1.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] disabled:opacity-40">
            <ChevronLeft size={14} />
          </button>
          <span className="text-[11px] text-[var(--text-muted)] tabular-nums">{page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
            className="p-1.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] disabled:opacity-40">
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {detail && <NutritionDayModal log={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
```

Décision assumée vs spec : le filtre « Passé / Aujourd'hui / Tout » est omis — les logs nutrition sont par nature passés ou du jour (contrainte `UNIQUE(client_id, date_jour)`, pas de logs futurs), le tri par date décroissante suffit.

- [ ] **Step 2: Intégrer dans l'onglet Nutrition du hub**

Dans `CoachClientHub.jsx` :

a) Import en tête (à côté de celui de FitnessHistorySection) :
```js
import NutritionHistorySection from './client-hub/NutritionHistorySection'
```

b) Rendu onglet nutrition (~ligne 7602), remplacer :
```jsx
            {activeTab === 'nutrition' && (
              <NutritionTab
                coachId={user?.id}
                clientId={selectedId}
                clientName={(() => {
                  const c = clients.find(c => c.profiles?.id === selectedId)
                  return c?.profiles?.nom || 'Client'
                })()}
              />
            )}
```
par :
```jsx
            {activeTab === 'nutrition' && (
              <>
                <NutritionTab
                  coachId={user?.id}
                  clientId={selectedId}
                  clientName={(() => {
                    const c = clients.find(c => c.profiles?.id === selectedId)
                    return c?.profiles?.nom || 'Client'
                  })()}
                />
                <NutritionHistorySection clientId={selectedId} />
              </>
            )}
```

- [ ] **Step 3: Build + vérification preview**

Run: `cd zevo && npm run build` → OK.
Preview session coach : onglet Nutrition → section « Historique nutrition » avec barres kcal/macros par jour, clic → modal détail repas. Si le client n'a rien loggé : message vide propre.

- [ ] **Step 4: Commit**

```bash
git add zevo/src/pages/coach/client-hub/NutritionHistorySection.jsx zevo/src/pages/coach/CoachClientHub.jsx
git commit -m "feat(coach): historique nutrition journalier avec détail repas (onglet Nutrition)"
```

---

### Task 5: Onglet Facturation

**Files:**
- Create: `zevo/src/pages/coach/client-hub/FacturationTab.jsx`
- Modify: `zevo/src/pages/coach/CoachClientHub.jsx` (import lucide `CreditCard`, entrée TABS, rendu)

- [ ] **Step 1: Créer le composant FacturationTab**

Créer `zevo/src/pages/coach/client-hub/FacturationTab.jsx` :

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import {
  Loader2, Banknote, CalendarClock, Repeat, Plus, FileText, Download,
} from 'lucide-react'

const STATUT_PAIEMENT = {
  paye: { label: 'Réussi', cls: 'bg-emerald-500/10 text-emerald-400' },
  en_attente: { label: 'En attente', cls: 'bg-[#FF6B2B]/10 text-[#FF6B2B]' },
  echoue: { label: 'Échoué', cls: 'bg-red-500/10 text-red-400' },
  rembourse: { label: 'Remboursé', cls: 'bg-slate-500/10 text-slate-400' },
}
const STATUT_ABO = {
  actif: { label: 'Actif', cls: 'bg-emerald-500/10 text-emerald-400' },
  en_pause: { label: 'En pause', cls: 'bg-[#FF6B2B]/10 text-[#FF6B2B]' },
  annule: { label: 'Annulé', cls: 'bg-red-500/10 text-red-400' },
  expire: { label: 'Expiré', cls: 'bg-slate-500/10 text-slate-400' },
}
const STATUT_FACTURE = {
  payee: { label: 'Payée', cls: 'bg-emerald-500/10 text-emerald-400' },
  en_attente: { label: 'En attente', cls: 'bg-[#FF6B2B]/10 text-[#FF6B2B]' },
  annulee: { label: 'Annulée', cls: 'bg-slate-500/10 text-slate-400' },
}

const FREQ_LABEL = { unique: '', mensuel: '/mois', trimestriel: '/trim.', annuel: '/an' }

function euros(centimes) {
  if (centimes == null) return '—'
  return (centimes / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'
}
function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Badge({ config, statut }) {
  const c = config[statut] || { label: statut || '—', cls: 'bg-[var(--bg-surface)] text-[var(--text-muted)]' }
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${c.cls}`}>{c.label}</span>
}

export default function FacturationTab({ coachId, clientId }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [paiements, setPaiements] = useState([])
  const [abonnements, setAbonnements] = useState([])
  const [factures, setFactures] = useState([])

  useEffect(() => {
    if (!coachId || !clientId) return
    const load = async () => {
      setLoading(true)
      const [pRes, aRes, fRes] = await Promise.all([
        supabase.from('paiements_clients')
          .select('id, montant, statut, methode_paiement, date_paiement, created_at, offres_coaching(titre)')
          .eq('coach_id', coachId).eq('client_id', clientId)
          .order('created_at', { ascending: false }).limit(100),
        supabase.from('abonnements_clients')
          .select('id, montant, frequence, statut, date_debut, date_prochaine_echeance, offres_coaching(titre)')
          .eq('coach_id', coachId).eq('client_id', clientId)
          .order('date_debut', { ascending: false }),
        supabase.from('factures')
          .select('id, numero, montant, statut, date_emission')
          .eq('coach_id', coachId).eq('client_id', clientId)
          .order('date_emission', { ascending: false }).limit(100),
      ])
      setPaiements(pRes.data || [])
      setAbonnements(aRes.data || [])
      setFactures(fRes.data || [])
      setLoading(false)
    }
    load()
  }, [coachId, clientId])

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#FF6B2B]" size={24} /></div>
  }

  const totalDepense = paiements.filter(p => p.statut === 'paye').reduce((sum, p) => sum + (p.montant || 0), 0)
  const aboActif = abonnements.find(a => a.statut === 'actif')
  const prochainPaiement = aboActif?.date_prochaine_echeance

  return (
    <div className="space-y-5">
      {/* Cartes résumé */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Banknote, label: 'Total dépensé', value: euros(totalDepense) },
          {
            icon: Repeat, label: 'Abonnement actif',
            value: aboActif ? `${euros(aboActif.montant)}${FREQ_LABEL[aboActif.frequence] || ''}` : 'Aucun',
            sub: aboActif?.offres_coaching?.titre,
          },
          { icon: CalendarClock, label: 'Prochain paiement', value: formatDate(prochainPaiement) },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="bg-[var(--bg-card)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[11px] mb-2">
              <Icon size={13} /> {label}
            </div>
            <p className="text-[var(--text-primary)] text-xl font-bold tabular-nums">{value}</p>
            {sub && <p className="text-[var(--text-muted)] text-[11px] mt-0.5 truncate">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Actions (deep-links vers l'espace Paiements global) */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => navigate(`/coach/paiements/transactions?client=${clientId}&nouveau=1`)}
          className="flex items-center gap-1.5 bg-[#FF6B2B] text-white text-xs font-semibold px-3.5 py-2 rounded-xl hover:opacity-90 transition-opacity">
          <Plus size={14} /> Créer un paiement
        </button>
        <button
          onClick={() => navigate('/coach/paiements/factures')}
          className="flex items-center gap-1.5 bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-semibold px-3.5 py-2 rounded-xl hover:bg-[var(--bg-card)] transition-colors border border-[rgba(255,255,255,0.08)]">
          <FileText size={14} /> Factures
        </button>
        <button
          onClick={() => navigate('/coach/paiements/abonnements')}
          className="flex items-center gap-1.5 bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-semibold px-3.5 py-2 rounded-xl hover:bg-[var(--bg-card)] transition-colors border border-[rgba(255,255,255,0.08)]">
          <Repeat size={14} /> Abonnements
        </button>
      </div>

      {/* Abonnements */}
      <div className="bg-[var(--bg-card)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 sm:p-5">
        <h3 className="text-[var(--text-primary)] font-semibold text-sm mb-3">Abonnements</h3>
        {abonnements.length === 0 ? (
          <p className="text-[var(--text-muted)] text-xs">Aucun abonnement pour ce client.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[var(--text-muted)] text-[11px]">
                  <th className="pb-2 pr-3 font-medium">Produit</th>
                  <th className="pb-2 pr-3 font-medium">Statut</th>
                  <th className="pb-2 pr-3 font-medium">Montant</th>
                  <th className="pb-2 pr-3 font-medium">Prochaine facturation</th>
                  <th className="pb-2 font-medium">Démarré</th>
                </tr>
              </thead>
              <tbody>
                {abonnements.map(a => (
                  <tr key={a.id} className="border-t border-[rgba(255,255,255,0.06)]">
                    <td className="py-2.5 pr-3 text-xs text-[var(--text-primary)] font-medium">
                      {a.offres_coaching?.titre || 'Abonnement'}
                    </td>
                    <td className="py-2.5 pr-3"><Badge config={STATUT_ABO} statut={a.statut} /></td>
                    <td className="py-2.5 pr-3 text-xs text-[var(--text-primary)] tabular-nums whitespace-nowrap">
                      {euros(a.montant)}{FREQ_LABEL[a.frequence] || ''}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-[var(--text-muted)] tabular-nums">{formatDate(a.date_prochaine_echeance)}</td>
                    <td className="py-2.5 text-xs text-[var(--text-muted)] tabular-nums">{formatDate(a.date_debut)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="bg-[var(--bg-card)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 sm:p-5">
        <h3 className="text-[var(--text-primary)] font-semibold text-sm mb-3">Transactions</h3>
        {paiements.length === 0 ? (
          <p className="text-[var(--text-muted)] text-xs">Aucune transaction pour ce client.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[var(--text-muted)] text-[11px]">
                  <th className="pb-2 pr-3 font-medium">Montant</th>
                  <th className="pb-2 pr-3 font-medium">Statut</th>
                  <th className="pb-2 pr-3 font-medium">Description</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {paiements.map(p => (
                  <tr key={p.id} className="border-t border-[rgba(255,255,255,0.06)]">
                    <td className="py-2.5 pr-3 text-xs text-[var(--text-primary)] font-semibold tabular-nums">{euros(p.montant)}</td>
                    <td className="py-2.5 pr-3"><Badge config={STATUT_PAIEMENT} statut={p.statut} /></td>
                    <td className="py-2.5 pr-3 text-xs text-[var(--text-muted)] max-w-[200px] truncate">
                      {p.offres_coaching?.titre || p.methode_paiement || '—'}
                    </td>
                    <td className="py-2.5 text-xs text-[var(--text-muted)] tabular-nums">{formatDate(p.date_paiement || p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Factures */}
      <div className="bg-[var(--bg-card)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 sm:p-5">
        <h3 className="text-[var(--text-primary)] font-semibold text-sm mb-3">Factures</h3>
        {factures.length === 0 ? (
          <p className="text-[var(--text-muted)] text-xs">Aucune facture pour ce client.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[var(--text-muted)] text-[11px]">
                  <th className="pb-2 pr-3 font-medium">Numéro</th>
                  <th className="pb-2 pr-3 font-medium">Montant</th>
                  <th className="pb-2 pr-3 font-medium">Statut</th>
                  <th className="pb-2 pr-3 font-medium">Émise le</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {factures.map(f => (
                  <tr key={f.id} className="border-t border-[rgba(255,255,255,0.06)]">
                    <td className="py-2.5 pr-3 text-xs text-[var(--text-primary)] font-medium">{f.numero}</td>
                    <td className="py-2.5 pr-3 text-xs text-[var(--text-primary)] tabular-nums">{euros(f.montant)}</td>
                    <td className="py-2.5 pr-3"><Badge config={STATUT_FACTURE} statut={f.statut} /></td>
                    <td className="py-2.5 pr-3 text-xs text-[var(--text-muted)] tabular-nums">{formatDate(f.date_emission)}</td>
                    <td className="py-2.5">
                      <button
                        onClick={() => navigate('/coach/paiements/factures')}
                        title="Voir dans Factures"
                        className="p-1.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                        <Download size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Ajouter l'onglet au hub**

Dans `CoachClientHub.jsx` :

a) Ajouter `CreditCard` à l'import lucide-react (bloc lignes 13-27).

b) Import du composant :
```js
import FacturationTab from './client-hub/FacturationTab'
```

c) Ajouter l'entrée en fin de TABS (après infos) :
```js
  { id: 'facturation', label: 'Facturation', icon: CreditCard },
```

d) Ajouter le rendu à côté des autres blocs `activeTab` (~après le bloc objectifs, ligne ~7633) :
```jsx
            {activeTab === 'facturation' && (
              <FacturationTab coachId={user?.id} clientId={selectedId} />
            )}
```

- [ ] **Step 3: Build + vérification preview**

Run: `cd zevo && npm run build` → OK.
Preview session coach : onglet Facturation → cartes Total dépensé / Abonnement actif / Prochain paiement + les 3 tableaux. « Créer un paiement » ouvre `/coach/paiements/transactions?client=<id>&nouveau=1`.

- [ ] **Step 4: Commit**

```bash
git add zevo/src/pages/coach/client-hub/FacturationTab.jsx zevo/src/pages/coach/CoachClientHub.jsx
git commit -m "feat(coach): onglet Facturation par client (total, abonnements, transactions, factures)"
```

---

### Task 6: Pré-remplissage du modal paiement (deep-link depuis la fiche)

**Files:**
- Modify: `zevo/src/pages/coach/paiements/TransactionsPage.jsx` (import ligne 2, états ~36, effet au montage)

- [ ] **Step 1: Lire les query params et ouvrir le modal pré-rempli**

Dans `TransactionsPage.jsx` :

a) Ligne 2, remplacer :
```js
import { useNavigate } from 'react-router-dom'
```
par :
```js
import { useNavigate, useSearchParams } from 'react-router-dom'
```

b) Après `const navigate = useNavigate()` (~ligne 28), ajouter :
```js
const [searchParams, setSearchParams] = useSearchParams()
```

c) Après le `useEffect` de chargement initial (~ligne 54-58), ajouter :
```js
  // Deep-link depuis la fiche client : ?client=<id>&nouveau=1 → modal pré-rempli
  useEffect(() => {
    if (searchParams.get('nouveau') === '1') {
      const clientId = searchParams.get('client') || ''
      setForm(f => ({ ...f, clientId }))
      setShowModal(true)
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

- [ ] **Step 2: Build + vérification preview**

Run: `cd zevo && npm run build` → OK.
Preview session coach : fiche client → Facturation → « Créer un paiement » → la page Transactions s'ouvre avec le modal « transaction manuelle » déjà ouvert et le client pré-sélectionné dans le select.

- [ ] **Step 3: Commit**

```bash
git add zevo/src/pages/coach/paiements/TransactionsPage.jsx
git commit -m "feat(coach): deep-link fiche client vers création de paiement pré-rempli"
```

---

### Task 7: Onglet Santé

**Files:**
- Create: `zevo/src/pages/coach/client-hub/SanteTab.jsx`
- Modify: `zevo/src/pages/coach/CoachClientHub.jsx` (entrée TABS après nutrition + import + rendu)

- [ ] **Step 1: Créer le composant SanteTab**

Créer `zevo/src/pages/coach/client-hub/SanteTab.jsx` :

```jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Loader2, Scale, Moon, Smile, Activity } from 'lucide-react'

const PERIODES = [
  { id: 30, label: '30 j' },
  { id: 90, label: '90 j' },
]

function fmtDateCourt(iso) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function ChartCard({ icon: Icon, title, data, dataKey, unite, color = '#FF6B2B', domain }) {
  const last = data.length > 0 ? data[data.length - 1][dataKey] : null
  return (
    <div className="bg-[var(--bg-card)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[var(--text-primary)] font-semibold text-sm flex items-center gap-2">
          <Icon size={15} className="text-[#FF6B2B]" /> {title}
        </h3>
        <span className="text-[var(--text-primary)] text-sm font-bold tabular-nums">
          {last != null ? `${last} ${unite}` : '—'}
        </span>
      </div>
      {data.length === 0 ? (
        <p className="text-[var(--text-muted)] text-xs py-8 text-center">Aucune donnée sur la période.</p>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                   axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                   axisLine={false} tickLine={false} domain={domain || ['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, fontSize: 12,
              }}
              labelStyle={{ color: 'var(--text-muted)' }}
              formatter={(v) => [`${v} ${unite}`, title]} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
                  dot={data.length <= 31} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default function SanteTab({ clientId }) {
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState(30)
  const [poids, setPoids] = useState([])
  const [sommeil, setSommeil] = useState([])
  const [humeur, setHumeur] = useState([])
  const [sport, setSport] = useState([])

  useEffect(() => {
    if (!clientId) return
    const load = async () => {
      setLoading(true)
      const dateMin = new Date(Date.now() - periode * 86400000).toISOString().slice(0, 10)
      const [poidsRes, sommeilRes, humeurRes, sportRes] = await Promise.all([
        supabase.from('suivi_poids').select('date_pesee, poids')
          .eq('client_id', clientId).gte('date_pesee', dateMin).order('date_pesee'),
        supabase.from('sommeil_log').select('date, heures, qualite')
          .eq('client_id', clientId).gte('date', dateMin).order('date'),
        supabase.from('humeur_log').select('date, score')
          .eq('client_id', clientId).gte('date', dateMin).order('date'),
        supabase.from('sport_log').select('date, duree_minutes, intensite, type_activite')
          .eq('client_id', clientId).gte('date', dateMin).order('date'),
      ])
      setPoids((poidsRes.data || []).map(r => ({ label: fmtDateCourt(r.date_pesee), poids: r.poids })))
      setSommeil((sommeilRes.data || []).map(r => ({ label: fmtDateCourt(r.date), heures: r.heures })))
      setHumeur((humeurRes.data || []).map(r => ({ label: fmtDateCourt(r.date), score: r.score })))
      setSport((sportRes.data || []).map(r => ({ label: fmtDateCourt(r.date), minutes: r.duree_minutes || 0 })))
      setLoading(false)
    }
    load()
  }, [clientId, periode])

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#FF6B2B]" size={24} /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {PERIODES.map(p => (
          <button key={p.id} onClick={() => setPeriode(p.id)}
            className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition-colors ${
              periode === p.id
                ? 'bg-[#FF6B2B]/10 text-[#FF6B2B]'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard icon={Scale} title="Poids" data={poids} dataKey="poids" unite="kg" />
        <ChartCard icon={Moon} title="Sommeil" data={sommeil} dataKey="heures" unite="h" color="#818cf8" domain={[0, 12]} />
        <ChartCard icon={Smile} title="Humeur" data={humeur} dataKey="score" unite="/10" color="#34d399" domain={[0, 10]} />
        <ChartCard icon={Activity} title="Activité" data={sport} dataKey="minutes" unite="min" color="#f472b6" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Ajouter l'onglet au hub**

Dans `CoachClientHub.jsx` :

a) Import :
```js
import SanteTab from './client-hub/SanteTab'
```

b) Dans TABS, insérer après l'entrée nutrition :
```js
  { id: 'sante', label: 'Santé', icon: Heart },
```
(`Heart` est déjà importé, ligne 17.)

c) Rendu (à côté des autres blocs) :
```jsx
            {activeTab === 'sante' && (
              <SanteTab clientId={selectedId} />
            )}
```

- [ ] **Step 3: Build + vérification preview**

Run: `cd zevo && npm run build` → OK.
Preview session coach : onglet Santé → 4 graphiques (Poids, Sommeil, Humeur, Activité), toggle 30/90 jours, dernière valeur affichée en haut de chaque carte, message propre si aucune donnée.

- [ ] **Step 4: Commit**

```bash
git add zevo/src/pages/coach/client-hub/SanteTab.jsx zevo/src/pages/coach/CoachClientHub.jsx
git commit -m "feat(coach): onglet Santé (poids, sommeil, humeur, activité)"
```

---

### Task 8: Vérification de bout en bout + journal de session

**Files:**
- Modify: `SESSION-README.md` (ajouter l'entrée du jour)

- [ ] **Step 1: Parcours complet en preview**

1. Session client : lancer une séance → compléter avec des poids/reps → logger un jour nutrition.
2. Session coach : fiche du client → vérifier chaque onglet dans l'ordre : Activité, Fitness (historique + détail avec les résultats saisis à l'instant), Nutrition (le jour loggé apparaît), Santé, Habitudes, Objectifs, Calendrier, Infos personnelles, Facturation (+ deep-link paiement).
3. Vérifier la console navigateur : aucune erreur rouge.

- [ ] **Step 2: Mettre à jour le journal de session**

Ajouter dans `SESSION-README.md` (section du jour) : refonte fiche client partie 1 livrée (onglets Gymkee, historique Fitness/Nutrition, Santé, Facturation, tracking durée séance), avec la liste des commits. Mentionner que la Partie 2 (Bilans) reste à faire — plan séparé.

- [ ] **Step 3: Commit final**

```bash
git add SESSION-README.md
git commit -m "docs(session): fiche client coach structure Gymkee — partie 1 livrée"
```

---

## Hors périmètre de ce plan (→ Partie 2)

L'onglet **Bilans** (modèles personnalisables, planification récurrente, remplissage client/coach avec photos, comparaison avant/après) : 4 nouvelles tables + bucket Storage + page client. Plan séparé à écrire une fois la Partie 1 mergée, pour référencer l'état réel du hub.
