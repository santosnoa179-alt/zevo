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
    <Modal isOpen onClose={onClose} title={formatDateFr(log.date_jour)} className="!max-w-[42rem] max-h-[85vh] overflow-y-auto">
      <div className="space-y-5">
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
