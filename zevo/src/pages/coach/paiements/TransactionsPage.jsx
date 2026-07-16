import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import {
  Search, Filter, MoreHorizontal, Package, Link2, ArrowRight,
  CreditCard, Plus, X, Banknote, AlertCircle, ChevronDown, Check
} from 'lucide-react'

const STATUT_CONFIG = {
  paye: { label: 'Payé', color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
  en_attente: { label: 'En attente', color: 'text-[#FF6B2B]', bg: 'bg-[#FF6B2B]/10', dot: 'bg-[#FF6B2B]' },
  echoue: { label: 'Échoué', color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400' },
  rembourse: { label: 'Remboursé', color: 'text-slate-400', bg: 'bg-slate-500/10', dot: 'bg-slate-400' },
}

const STATUTS_LIST = ['paye', 'en_attente', 'echoue', 'rembourse']

const METHODES = [
  { value: 'especes', label: 'Espèces' },
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'autre', label: 'Autre' },
]

export default function TransactionsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [search, setSearch] = useState('')
  const [filtre, setFiltre] = useState('tous')

  // Modal transaction manuelle
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState(null)
  const [clientsList, setClientsList] = useState([])
  const [form, setForm] = useState({
    clientId: '',
    montant: '',
    methode: 'especes',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    statut: 'paye',
    genererFacture: true,
  })

  // Dropdown menu statut
  const [menuOpen, setMenuOpen] = useState(null)

  useEffect(() => {
    if (!user) return
    loadTransactions()
    loadClients()
  }, [user])

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

  // Fermer le menu si on clique ailleurs
  useEffect(() => {
    if (!menuOpen) return
    const handleClick = () => setMenuOpen(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [menuOpen])

  const updateStatut = async (transactionId, newStatut) => {
    setMenuOpen(null)
    const updateData = { statut: newStatut }
    if (newStatut === 'paye') {
      updateData.date_paiement = new Date().toISOString()
    }
    await supabase
      .from('paiements_clients')
      .update(updateData)
      .eq('id', transactionId)
      .eq('coach_id', user.id)
    await loadTransactions()
  }

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, profiles(nom, prenom, email)')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
    setClientsList(data || [])
  }

  const loadTransactions = async () => {
    setLoading(true)
    setLoadError(null)
    const { data, error } = await supabase
      .from('paiements_clients')
      .select('*, clients(profiles(nom, prenom, email)), offres_coaching(titre)')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[TransactionsPage] load error:', error)
      setLoadError(error.message)
    }
    setTransactions(data || [])
    setLoading(false)
  }

  const creerTransactionManuelle = async () => {
    setModalError(null)
    if (!form.clientId) { setModalError('Sélectionnez un client'); return }
    const montantNum = parseFloat(form.montant)
    if (!Number.isFinite(montantNum) || montantNum <= 0) {
      setModalError('Montant invalide')
      return
    }

    setSaving(true)
    try {
      const montantCents = Math.round(montantNum * 100)
      const dateISO = new Date(form.date).toISOString()

      // 1) Insérer le paiement manuel
      const { data: paiement, error: payErr } = await supabase
        .from('paiements_clients')
        .insert({
          client_id: form.clientId,
          coach_id: user.id,
          offre_id: null,
          montant: montantCents,
          statut: form.statut,
          methode_paiement: form.methode,
          description: form.description || null,
          date_paiement: form.statut === 'paye' ? dateISO : null,
          source: 'manuel',
        })
        .select('id')
        .single()

      if (payErr) {
        setModalError(payErr.message)
        setSaving(false)
        return
      }

      // 2) Générer une facture si demandé
      if (form.genererFacture && form.statut === 'paye') {
        const year = new Date(form.date).getFullYear()
        const { count } = await supabase
          .from('factures')
          .select('id', { count: 'exact', head: true })
          .eq('coach_id', user.id)
          .gte('date_emission', `${year}-01-01`)
          .lt('date_emission', `${year + 1}-01-01`)
        const numero = `FAC-${year}-${String((count || 0) + 1).padStart(4, '0')}`

        await supabase.from('factures').insert({
          numero,
          coach_id: user.id,
          client_id: form.clientId,
          paiement_id: paiement.id,
          montant: montantCents,
          statut: 'payee',
          date_emission: dateISO,
        })
      }

      setShowModal(false)
      setForm({
        clientId: '',
        montant: '',
        methode: 'especes',
        description: '',
        date: new Date().toISOString().slice(0, 10),
        statut: 'paye',
        genererFacture: true,
      })
      await loadTransactions()
    } catch (e) {
      setModalError(e.message || 'Erreur')
    }
    setSaving(false)
  }

  const filtered = transactions
    .filter(t => filtre === 'tous' || t.statut === filtre)
    .filter(t => {
      if (!search) return true
      const clientName = ([t.clients?.profiles?.prenom, t.clients?.profiles?.nom].filter(Boolean).join(' ')).toLowerCase()
      const clientEmail = (t.clients?.profiles?.email || '').toLowerCase()
      const offreName = (t.offres_coaching?.titre || '').toLowerCase()
      const q = search.toLowerCase()
      return clientName.includes(q) || clientEmail.includes(q) || offreName.includes(q)
    })

  const totalFiltre = filtered.filter(t => t.statut === 'paye').reduce((s, t) => s + (t.montant || 0), 0)

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-5xl">
        <div className="skel-block h-8 w-48 rounded mb-4" />
        {[1,2,3,4].map(i => <div key={i} className="hero-card p-4 h-16 animate-pulse"><div className="skel-block h-4 w-full rounded" /></div>)}
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
        <button
          onClick={() => { setModalError(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95 self-start sm:self-auto"
          style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF6B2BD0)', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)' }}
        >
          <Plus size={14} />
          Nouvelle transaction
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un client ou produit..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FF6B2B]/40 focus:outline-none transition-all"
          />
        </div>
        <div className="flex gap-1 bg-[var(--bg-surface)] rounded-xl p-1 border border-[var(--border-base)]">
          {['tous', 'paye', 'en_attente', 'rembourse', 'echoue'].map(s => (
            <button key={s} onClick={() => setFiltre(s)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${filtre === s ? 'bg-[#FF6B2B]/15 text-[#FF6B2B]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
              {s === 'tous' ? 'Tous' : STATUT_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {loadError && (
        <div className="hero-card p-4 border border-red-500/30 bg-red-500/5">
          <p className="text-[13px] font-semibold text-red-400">Erreur de chargement</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">{loadError}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Vérifie que le script <code className="text-[var(--text-secondary)]">fix-grants-paiements.sql</code> a bien été exécuté dans Supabase.</p>
        </div>
      )}

      {/* Empty state onboarding — visible uniquement quand 0 transactions au total */}
      {transactions.length === 0 && !loadError && (
        <div className="hero-card p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center">
              <CreditCard size={20} className="text-[#FF6B2B]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Aucune transaction encore</h3>
              <p className="text-[12px] text-[var(--text-muted)]">Voici les 3 étapes pour recevoir ton premier paiement :</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { num: 1, icon: Package, label: 'Crée un produit', desc: 'Offre, programme, abonnement', path: '/coach/abonnements/produits', color: '#64748b' },
              { num: 2, icon: Link2, label: 'Génère un lien', desc: 'Lien de paiement Stripe', path: '/coach/abonnements/liens', color: '#64748b' },
              { num: 3, icon: ArrowRight, label: 'Partage à ton client', desc: 'Email, WhatsApp, SMS', path: '/coach/abonnements/liens', color: '#22C55E' },
            ].map(step => {
              const Icon = step.icon
              return (
                <button
                  key={step.num}
                  onClick={() => navigate(step.path)}
                  className="relative p-4 rounded-xl bg-[var(--bg-surface)]/50 border border-[var(--border-base)] hover:border-[var(--text-muted)]/20 hover:bg-[var(--bg-surface)] transition-all text-left group"
                >
                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center" style={{ backgroundColor: step.color, color: '#0a0a0a' }}>
                    {step.num}
                  </div>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${step.color}15` }}>
                    <Icon size={16} style={{ color: step.color }} />
                  </div>
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">{step.label}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{step.desc}</p>
                </button>
              )
            })}
          </div>

          <p className="text-[11px] text-[var(--text-muted)] mt-5 pt-4 border-t border-[var(--border-base)]/50">
            💡 Les transactions s'affichent ici automatiquement dès qu'un client paie via un de tes liens.
          </p>
        </div>
      )}

      {/* Table desktop */}
      {transactions.length > 0 && (
      <div className="hidden md:block hero-card overflow-visible">
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
            <p className="text-[var(--text-muted)] text-sm">Aucune transaction ne correspond aux filtres</p>
          </div>
        ) : (
          filtered.map(t => {
            const cfg = STATUT_CONFIG[t.statut] || STATUT_CONFIG.en_attente
            const clientName = [t.clients?.profiles?.prenom, t.clients?.profiles?.nom].filter(Boolean).join(' ') || '—'
            const clientEmail = t.clients?.profiles?.email || ''
            return (
              <div key={t.id} className="grid grid-cols-[1fr_1fr_100px_100px_100px_40px] gap-4 px-5 py-3.5 border-b border-[var(--border-base)]/50 items-center hover:bg-[var(--bg-surface)]/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{clientName}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{clientEmail}</p>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] text-[var(--text-secondary)] truncate">{t.offres_coaching?.titre || t.description || '—'}</span>
                  {t.source === 'manuel' && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FF6B2B]/10 text-[#FF6B2B] shrink-0" title={`Méthode : ${t.methode_paiement || '—'}`}>
                      <Banknote size={9} />
                      MANUEL
                    </span>
                  )}
                </div>
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">{(t.montant / 100).toFixed(2)} €</span>
                <span className="text-[12px] text-[var(--text-muted)]">
                  {t.date_paiement ? new Date(t.date_paiement).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg ${cfg.color} ${cfg.bg} w-fit`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === t.id ? null : t.id) }}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                  {menuOpen === t.id && (
                    <div className="absolute right-0 top-full mt-1 z-50 w-44 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-base)] shadow-xl shadow-black/30" onClick={e => e.stopPropagation()}>
                      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Changer le statut</p>
                      {STATUTS_LIST.map(s => {
                        const sc = STATUT_CONFIG[s]
                        const isActive = t.statut === s
                        return (
                          <button
                            key={s}
                            onClick={() => updateStatut(t.id, s)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] transition-colors ${isActive ? 'bg-[var(--bg-surface)]' : 'hover:bg-[var(--bg-surface)]/60'}`}
                          >
                            <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
                            <span className={`flex-1 font-medium ${isActive ? sc.color : 'text-[var(--text-secondary)]'}`}>{sc.label}</span>
                            {isActive && <Check size={12} className={sc.color} />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
      )}

      {/* Mobile cards */}
      {transactions.length > 0 && (
      <div className="md:hidden space-y-2">
        {filtered.map(t => {
          const cfg = STATUT_CONFIG[t.statut] || STATUT_CONFIG.en_attente
          const clientName = [t.clients?.profiles?.prenom, t.clients?.profiles?.nom].filter(Boolean).join(' ') || '—'
          return (
            <div key={t.id} className="hero-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{clientName}</p>
                    {t.source === 'manuel' && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FF6B2B]/10 text-[#FF6B2B] shrink-0">
                        <Banknote size={9} />
                        MANUEL
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">{t.offres_coaching?.titre || t.description || '—'}</p>
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === t.id ? null : t.id) }}
                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg ${cfg.color} ${cfg.bg} shrink-0 transition-colors`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                    <ChevronDown size={10} className="ml-0.5 opacity-50" />
                  </button>
                  {menuOpen === t.id && (
                    <div className="absolute right-0 top-full mt-1 z-50 w-40 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-base)] shadow-xl shadow-black/30" onClick={e => e.stopPropagation()}>
                      {STATUTS_LIST.map(s => {
                        const sc = STATUT_CONFIG[s]
                        const isActive = t.statut === s
                        return (
                          <button
                            key={s}
                            onClick={() => updateStatut(t.id, s)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] transition-colors ${isActive ? 'bg-[var(--bg-surface)]' : 'hover:bg-[var(--bg-surface)]/60'}`}
                          >
                            <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
                            <span className={`flex-1 font-medium ${isActive ? sc.color : 'text-[var(--text-secondary)]'}`}>{sc.label}</span>
                            {isActive && <Check size={11} className={sc.color} />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
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
      )}

      {/* ── Modal Nouvelle transaction manuelle ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="hero-card relative w-full md:max-w-md md:rounded-2xl rounded-t-2xl rounded-b-none md:rounded-b-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF6B2BD0)' }} />
            <div className="p-4 md:p-5 border-b border-[var(--border-base)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF6B2BD0)' }}>
                  <Banknote size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] font-semibold">Nouvelle transaction</h3>
                  <p className="text-[var(--text-muted)] text-[11px]">Paiement hors-Stripe (espèces, virement, chèque)</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 md:p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {modalError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-400">{modalError}</p>
                </div>
              )}

              <div>
                <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Client *</label>
                <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[#FF6B2B]/50 focus:outline-none transition-all">
                  <option value="">-- Sélectionner un client --</option>
                  {clientsList.map(c => (
                    <option key={c.id} value={c.id}>
                      {[c.profiles?.prenom, c.profiles?.nom].filter(Boolean).join(' ') || 'Sans nom'} {c.profiles?.email ? `· ${c.profiles.email}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Montant (€) *</label>
                  <input type="number" min="0" step="0.01" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} placeholder="50.00" className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FF6B2B]/50 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Méthode</label>
                  <select value={form.methode} onChange={e => setForm({ ...form, methode: e.target.value })} className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[#FF6B2B]/50 focus:outline-none transition-all">
                    {METHODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[#FF6B2B]/50 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Statut</label>
                  <select value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })} className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[#FF6B2B]/50 focus:outline-none transition-all">
                    <option value="paye">Payé</option>
                    <option value="en_attente">En attente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Description</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ex : Séance coaching du 10/04" className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FF6B2B]/50 focus:outline-none transition-all" />
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)] cursor-pointer">
                <input type="checkbox" checked={form.genererFacture} onChange={e => setForm({ ...form, genererFacture: e.target.checked })} className="w-4 h-4 accent-[#FF6B2B]" />
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-[var(--text-primary)]">Générer une facture</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Uniquement si statut = Payé</p>
                </div>
              </label>
            </div>
            <div className="p-4 md:p-5 border-t border-[var(--border-base)] flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-all">Annuler</button>
              <button onClick={creerTransactionManuelle} disabled={saving || !form.clientId || !form.montant} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 active:scale-95" style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF6B2BD0)' }}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
