import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import { FileText, Search, Download, Plus, X, Loader2 } from 'lucide-react'

const STATUT_CONFIG = {
  payee: { label: 'Payée', color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
  en_attente: { label: 'En attente', color: 'text-yellow-400', bg: 'bg-yellow-500/10', dot: 'bg-yellow-400' },
  annulee: { label: 'Annulée', color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400' },
}

export default function FacturesPage() {
  const { user } = useAuth()
  const [factures, setFactures] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [search, setSearch] = useState('')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [clientsList, setClientsList] = useState([])
  const [offresList, setOffresList] = useState([])
  const [formClient, setFormClient] = useState('')
  const [formOffre, setFormOffre] = useState('')
  const [formMontant, setFormMontant] = useState('')
  const [formStatut, setFormStatut] = useState('en_attente')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (!user) return
    loadFactures()
  }, [user])

  const loadFactures = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data, error } = await supabase
        .from('factures')
        .select('*, clients(profiles(nom, email)), offres_coaching(titre)')
        .eq('coach_id', user.id)
        .order('date_emission', { ascending: false })
      if (error) {
        console.error('[FacturesPage] load error:', error)
        setLoadError(error.message)
      } else {
        setFactures(data || [])
      }
    } catch (e) {
      console.error('[FacturesPage] fetch failed:', e)
      setLoadError(String(e))
    }
    setLoading(false)
  }

  const openModal = async () => {
    setModalOpen(true)
    setFormError(null)
    // Load clients + offres for the dropdowns
    try {
      const [clientsRes, offresRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id, profiles(nom, email)')
          .eq('coach_id', user.id)
          .eq('actif', true),
        supabase
          .from('offres_coaching')
          .select('id, titre, prix')
          .eq('coach_id', user.id)
          .eq('actif', true),
      ])
      setClientsList(clientsRes.data || [])
      setOffresList(offresRes.data || [])
    } catch (e) {
      console.error('[FacturesPage] modal load:', e)
    }
  }

  const closeModal = () => {
    setModalOpen(false)
    setFormClient('')
    setFormOffre('')
    setFormMontant('')
    setFormStatut('en_attente')
    setFormError(null)
  }

  const onSelectOffre = (offreId) => {
    setFormOffre(offreId)
    const o = offresList.find(x => x.id === offreId)
    if (o?.prix) setFormMontant((o.prix / 100).toFixed(2))
  }

  const generateNumero = () => {
    const year = new Date().getFullYear()
    const rand = Math.floor(Math.random() * 9000) + 1000
    return `FAC-${year}-${rand}`
  }

  const createFacture = async () => {
    setFormError(null)
    if (!formClient) return setFormError('Sélectionne un client')
    const montantCents = Math.round(parseFloat(formMontant) * 100)
    if (!montantCents || isNaN(montantCents) || montantCents <= 0) return setFormError('Montant invalide')

    setSaving(true)
    const payload = {
      numero: generateNumero(),
      coach_id: user.id,
      client_id: formClient,
      offre_id: formOffre || null,
      montant: montantCents,
      statut: formStatut,
      date_emission: new Date().toISOString(),
    }
    const { error } = await supabase.from('factures').insert(payload)
    setSaving(false)
    if (error) {
      console.error('[FacturesPage] insert error:', error)
      setFormError(error.message)
      return
    }
    closeModal()
    loadFactures()
  }

  const filtered = factures.filter(f => {
    if (!search) return true
    const name = (f.clients?.profiles?.nom || '').toLowerCase()
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Factures</h2>
          <p className="text-xs text-[var(--text-muted)]">{filtered.length} facture{filtered.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-[#0a0a0a] bg-[#F59E0B] hover:bg-[#F59E0B]/90 transition-colors"
        >
          <Plus size={14} />
          Nouvelle facture
        </button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par client ou numéro..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#F59E0B]/40 focus:outline-none transition-all" />
      </div>

      {loadError && (
        <div className="glass-card p-4 border border-red-500/30 bg-red-500/5">
          <p className="text-[13px] font-semibold text-red-400">Erreur de chargement</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">{loadError}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">La table <code className="text-[var(--text-secondary)]">factures</code> existe-t-elle ? Exécute <code className="text-[var(--text-secondary)]">schema-paiements-complet.sql</code> + <code className="text-[var(--text-secondary)]">fix-grants-paiements.sql</code>.</p>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        {factures.length === 0 && !loadError ? (
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-4">
              <FileText size={22} className="text-[#F59E0B]" />
            </div>
            <p className="text-[14px] font-semibold text-[var(--text-primary)]">Aucune facture émise</p>
            <p className="text-[12px] text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
              Les factures sont générées automatiquement à chaque paiement encaissé. Elles apparaîtront ici.
            </p>
          </div>
        ) : filtered.length === 0 && factures.length > 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText size={20} className="text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-[var(--text-muted)] text-sm">Aucune facture ne correspond à la recherche</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-base)]/50">
            {filtered.map(f => {
              const cfg = STATUT_CONFIG[f.statut] || STATUT_CONFIG.en_attente
              const clientName = f.clients?.profiles?.nom || '—'
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

      {/* Modal : Nouvelle facture */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeModal}>
          <div className="glass-card w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Nouvelle facture</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Génère une facture manuelle</p>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)]">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Client */}
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Client</label>
                <select
                  value={formClient}
                  onChange={e => setFormClient(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] focus:border-[#F59E0B]/40 focus:outline-none"
                >
                  <option value="">— Sélectionner —</option>
                  {clientsList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.profiles?.nom || c.profiles?.email || c.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
                {clientsList.length === 0 && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Aucun client actif trouvé</p>
                )}
              </div>

              {/* Produit */}
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Produit (optionnel)</label>
                <select
                  value={formOffre}
                  onChange={e => onSelectOffre(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] focus:border-[#F59E0B]/40 focus:outline-none"
                >
                  <option value="">— Aucun —</option>
                  {offresList.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.titre} · {(o.prix / 100).toFixed(2)} €
                    </option>
                  ))}
                </select>
              </div>

              {/* Montant */}
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Montant (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formMontant}
                  onChange={e => setFormMontant(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] focus:border-[#F59E0B]/40 focus:outline-none"
                />
              </div>

              {/* Statut */}
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Statut</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {['en_attente', 'payee', 'annulee'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormStatut(s)}
                      className={`px-2 py-2 rounded-lg text-[11px] font-medium transition-all ${formStatut === s ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30' : 'bg-[var(--bg-surface)] border border-[var(--border-base)] text-[var(--text-muted)]'}`}
                    >
                      {STATUT_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-[11px] text-red-400">{formError}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-base)] hover:bg-[var(--bg-surface)]/70 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={createFacture}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-[#0a0a0a] bg-[#F59E0B] hover:bg-[#F59E0B]/90 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Créer la facture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
