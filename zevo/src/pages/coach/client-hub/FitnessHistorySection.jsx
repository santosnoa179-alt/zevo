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
