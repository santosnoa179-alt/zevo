import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import { FileText, Search, Download } from 'lucide-react'

const STATUT_CONFIG = {
  payee: { label: 'Payée', color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
  en_attente: { label: 'En attente', color: 'text-yellow-400', bg: 'bg-yellow-500/10', dot: 'bg-yellow-400' },
  annulee: { label: 'Annulée', color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400' },
}

export default function FacturesPage() {
  const { user } = useAuth()
  const [factures, setFactures] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) return
    loadFactures()
  }, [user])

  const loadFactures = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('factures')
      .select('*, clients(prenom, nom), offres_coaching(titre)')
      .eq('coach_id', user.id)
      .order('date_emission', { ascending: false })
    setFactures(data || [])
    setLoading(false)
  }

  const filtered = factures.filter(f => {
    if (!search) return true
    const name = `${f.clients?.prenom || ''} ${f.clients?.nom || ''}`.toLowerCase()
    return name.includes(search.toLowerCase()) || f.numero?.toLowerCase().includes(search.toLowerCase())
  })

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-5xl">
        <div className="skel-block h-8 w-32 rounded mb-4" />
        {[1,2,3].map(i => <div key={i} className="glass-card p-4 h-16 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">
      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Factures</h2>
        <p className="text-xs text-[var(--text-muted)]">{filtered.length} facture{filtered.length > 1 ? 's' : ''}</p>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par client ou numéro..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#F59E0B]/40 focus:outline-none transition-all" />
      </div>

      <div className="glass-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText size={20} className="text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-[var(--text-muted)] text-sm">Aucune facture</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-base)]/50">
            {filtered.map(f => {
              const cfg = STATUT_CONFIG[f.statut] || STATUT_CONFIG.en_attente
              const clientName = `${f.clients?.prenom || ''} ${f.clients?.nom || ''}`.trim() || '—'
              return (
                <div key={f.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--bg-surface)]/30 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={15} className="text-[#F59E0B]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-mono text-[#F59E0B]">{f.numero}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-lg ${cfg.color} ${cfg.bg}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[13px] font-medium text-[var(--text-primary)] truncate mt-0.5">{clientName}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{f.offres_coaching?.titre || '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-bold text-[var(--text-primary)]">{(f.montant / 100).toFixed(2)} €</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {f.date_emission ? new Date(f.date_emission).toLocaleDateString('fr-FR') : '—'}
                    </p>
                  </div>
                  <button className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-colors" title="Télécharger">
                    <Download size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
