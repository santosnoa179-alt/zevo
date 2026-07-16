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
