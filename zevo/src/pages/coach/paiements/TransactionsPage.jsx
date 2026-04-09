import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import {
  Search, Filter, CheckCircle, Clock, XCircle, RefreshCw,
  Download, MoreHorizontal
} from 'lucide-react'

const STATUT_CONFIG = {
  paye: { label: 'Payé', color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
  en_attente: { label: 'En attente', color: 'text-yellow-400', bg: 'bg-yellow-500/10', dot: 'bg-yellow-400' },
  echoue: { label: 'Échoué', color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400' },
  rembourse: { label: 'Remboursé', color: 'text-blue-400', bg: 'bg-blue-500/10', dot: 'bg-blue-400' },
}

export default function TransactionsPage() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtre, setFiltre] = useState('tous')

  useEffect(() => {
    if (!user) return
    loadTransactions()
  }, [user])

  const loadTransactions = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('paiements_clients')
      .select('*, clients(prenom, nom, email), offres_coaching(titre)')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
    setTransactions(data || [])
    if (error) console.warn('Erreur chargement transactions:', error)
    setLoading(false)
  }

  const filtered = transactions
    .filter(t => filtre === 'tous' || t.statut === filtre)
    .filter(t => {
      if (!search) return true
      const clientName = `${t.clients?.prenom || ''} ${t.clients?.nom || ''}`.toLowerCase()
      const offreName = (t.offres_coaching?.titre || '').toLowerCase()
      return clientName.includes(search.toLowerCase()) || offreName.includes(search.toLowerCase())
    })

  const totalFiltre = filtered.filter(t => t.statut === 'paye').reduce((s, t) => s + (t.montant || 0), 0)

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-5xl">
        <div className="skel-block h-8 w-48 rounded mb-4" />
        {[1,2,3,4].map(i => <div key={i} className="glass-card p-4 h-16 animate-pulse"><div className="skel-block h-4 w-full rounded" /></div>)}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Transactions</h2>
          <p className="text-xs text-[var(--text-muted)]">{filtered.length} transaction{filtered.length > 1 ? 's' : ''} · {(totalFiltre / 100).toLocaleString('fr-FR')} € encaissés</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un client ou produit..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#F59E0B]/40 focus:outline-none transition-all"
          />
        </div>
        <div className="flex gap-1 bg-[var(--bg-surface)] rounded-xl p-1 border border-[var(--border-base)]">
          {['tous', 'paye', 'en_attente', 'rembourse', 'echoue'].map(s => (
            <button key={s} onClick={() => setFiltre(s)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${filtre === s ? 'bg-[#F59E0B]/15 text-[#F59E0B]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
              {s === 'tous' ? 'Tous' : STATUT_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table desktop */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_100px_100px_100px_40px] gap-4 px-5 py-3 border-b border-[var(--border-base)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          <span>Client</span>
          <span>Produit</span>
          <span>Montant</span>
          <span>Date</span>
          <span>Statut</span>
          <span></span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Filter size={20} className="text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-[var(--text-muted)] text-sm">Aucune transaction trouvée</p>
          </div>
        ) : (
          filtered.map(t => {
            const cfg = STATUT_CONFIG[t.statut] || STATUT_CONFIG.en_attente
            const clientName = `${t.clients?.prenom || ''} ${t.clients?.nom || ''}`.trim() || '—'
            const clientEmail = t.clients?.email || ''
            return (
              <div key={t.id} className="grid grid-cols-[1fr_1fr_100px_100px_100px_40px] gap-4 px-5 py-3.5 border-b border-[var(--border-base)]/50 items-center hover:bg-[var(--bg-surface)]/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{clientName}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{clientEmail}</p>
                </div>
                <span className="text-[13px] text-[var(--text-secondary)] truncate">{t.offres_coaching?.titre || t.description || '—'}</span>
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">{(t.montant / 100).toFixed(2)} €</span>
                <span className="text-[12px] text-[var(--text-muted)]">
                  {t.date_paiement ? new Date(t.date_paiement).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg ${cfg.color} ${cfg.bg} w-fit`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
                <button className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors">
                  <MoreHorizontal size={14} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filtered.map(t => {
          const cfg = STATUT_CONFIG[t.statut] || STATUT_CONFIG.en_attente
          const clientName = `${t.clients?.prenom || ''} ${t.clients?.nom || ''}`.trim() || '—'
          return (
            <div key={t.id} className="glass-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{clientName}</p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">{t.offres_coaching?.titre || t.description || '—'}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-lg ${cfg.color} ${cfg.bg} shrink-0`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-base)]/50">
                <span className="text-sm font-bold text-[var(--text-primary)]">{(t.montant / 100).toFixed(2)} €</span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {t.date_paiement ? new Date(t.date_paiement).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
