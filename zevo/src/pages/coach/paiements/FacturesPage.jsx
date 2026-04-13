import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import {
  FileText, Search, Download, Plus, X, Loader2, Calendar, User, Package, Hash,
  Receipt, Euro, AlertCircle, Eye
} from 'lucide-react'
import jsPDF from 'jspdf'

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
  const [filtre, setFiltre] = useState('tous')
  const [coachInfo, setCoachInfo] = useState(null)

  // Create modal
  const [modalOpen, setModalOpen] = useState(false)
  const [clientsList, setClientsList] = useState([])
  const [offresList, setOffresList] = useState([])
  const [formClient, setFormClient] = useState('')
  const [formOffre, setFormOffre] = useState('')
  const [formMontant, setFormMontant] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formStatut, setFormStatut] = useState('en_attente')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  // Detail modal
  const [detailFacture, setDetailFacture] = useState(null)

  useEffect(() => {
    if (!user) return
    loadFactures()
    loadCoachInfo()
  }, [user])

  const loadCoachInfo = async () => {
    const [coachRes, profileRes] = await Promise.all([
      supabase.from('coaches').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('profiles').select('nom, email').eq('id', user.id).maybeSingle(),
    ])
    setCoachInfo({
      nom: profileRes.data?.nom || 'Coach',
      email: profileRes.data?.email || '',
      ...(coachRes.data || {}),
    })
  }

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
      setLoadError(String(e))
    }
    setLoading(false)
  }

  const openModal = async () => {
    setModalOpen(true)
    setFormError(null)
    try {
      const [clientsRes, offresRes] = await Promise.all([
        supabase.from('clients').select('id, profiles(nom, email)').eq('coach_id', user.id).eq('actif', true),
        supabase.from('offres_coaching').select('id, titre, prix').eq('coach_id', user.id).eq('actif', true),
      ])
      setClientsList(clientsRes.data || [])
      setOffresList(offresRes.data || [])
    } catch {}
  }

  const closeModal = () => {
    setModalOpen(false)
    setFormClient(''); setFormOffre(''); setFormMontant(''); setFormDescription(''); setFormStatut('en_attente'); setFormError(null)
  }

  const onSelectOffre = (offreId) => {
    setFormOffre(offreId)
    const o = offresList.find(x => x.id === offreId)
    if (o?.prix) setFormMontant((o.prix / 100).toFixed(2))
    if (o?.titre && !formDescription) setFormDescription(o.titre)
  }

  const createFacture = async () => {
    setFormError(null)
    if (!formClient) return setFormError('Sélectionne un client')
    const montantCents = Math.round(parseFloat(formMontant) * 100)
    if (!montantCents || isNaN(montantCents) || montantCents <= 0) return setFormError('Montant invalide')

    setSaving(true)
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('factures')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', user.id)
      .gte('date_emission', `${year}-01-01`)
      .lt('date_emission', `${year + 1}-01-01`)
    const numero = `FAC-${year}-${String((count || 0) + 1).padStart(4, '0')}`

    const { error } = await supabase.from('factures').insert({
      numero,
      coach_id: user.id,
      client_id: formClient,
      offre_id: formOffre || null,
      montant: montantCents,
      description: formDescription || null,
      statut: formStatut,
      date_emission: new Date().toISOString(),
    })
    setSaving(false)
    if (error) { setFormError(error.message); return }
    closeModal()
    loadFactures()
  }

  // ── PDF Generation ──
  const generatePDF = (f) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = 210, M = 20
    const clientName = f.clients?.profiles?.nom || '—'
    const clientEmail = f.clients?.profiles?.email || ''
    const description = f.description || f.offres_coaching?.titre || 'Prestation de coaching'
    const dateStr = f.date_emission
      ? new Date(f.date_emission).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : '—'
    const coachName = (coachInfo?.nom_entreprise || coachInfo?.nom || 'ZEVO').toUpperCase()

    // ── Header ──
    doc.setFillColor(15, 15, 15)
    doc.rect(0, 0, W, 50, 'F')

    // Left: coach
    doc.setTextColor(245, 158, 11)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(coachName, M, 22)

    doc.setTextColor(180, 180, 180)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    let headerY = 29
    if (coachInfo?.email) { doc.text(coachInfo.email, M, headerY); headerY += 5 }
    if (coachInfo?.telephone) { doc.text(coachInfo.telephone, M, headerY); headerY += 5 }
    if (coachInfo?.adresse) { doc.text(coachInfo.adresse, M, headerY) }

    // Right: FACTURE
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(32)
    doc.setFont('helvetica', 'bold')
    doc.text('FACTURE', W - M, 24, { align: 'right' })
    doc.setTextColor(245, 158, 11)
    doc.setFontSize(11)
    doc.text(f.numero || '', W - M, 33, { align: 'right' })
    doc.setTextColor(150, 150, 150)
    doc.setFontSize(9)
    doc.text(dateStr, W - M, 40, { align: 'right' })

    // ── Client info block ──
    let y = 64
    doc.setFillColor(248, 248, 248)
    doc.roundedRect(M, y - 6, W - M * 2, 28, 3, 3, 'F')

    doc.setTextColor(130, 130, 130)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('FACTURÉ À', M + 6, y)
    doc.text('DATE D\'ÉMISSION', W / 2 + 10, y)

    y += 7
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(clientName, M + 6, y)
    doc.setFont('helvetica', 'normal')
    doc.text(dateStr, W / 2 + 10, y)

    if (clientEmail) {
      y += 6
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(clientEmail, M + 6, y)
    }

    // ── Table ──
    y = 102

    // Table header
    doc.setFillColor(245, 158, 11)
    doc.roundedRect(M, y - 7, W - M * 2, 11, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('DESCRIPTION', M + 5, y)
    doc.text('QTÉ', W - M - 55, y, { align: 'center' })
    doc.text('MONTANT', W - M - 5, y, { align: 'right' })

    // Table row
    y += 14
    doc.setTextColor(50, 50, 50)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    const splitDesc = doc.splitTextToSize(description, W - M * 2 - 70)
    doc.text(splitDesc, M + 5, y)
    doc.setFontSize(10)
    doc.text('1', W - M - 55, y, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`${(f.montant / 100).toFixed(2)} €`, W - M - 5, y, { align: 'right' })

    // Divider
    y += Math.max(splitDesc.length * 6, 10) + 8
    doc.setDrawColor(230, 230, 230)
    doc.setLineWidth(0.3)
    doc.line(W / 2, y, W - M, y)

    // Subtotal
    y += 8
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Sous-total HT', W - M - 55, y)
    doc.setTextColor(50, 50, 50)
    doc.text(`${(f.montant / 100).toFixed(2)} €`, W - M - 5, y, { align: 'right' })

    y += 7
    doc.setTextColor(100, 100, 100)
    doc.text('TVA (0%)', W - M - 55, y)
    doc.setTextColor(50, 50, 50)
    doc.text('0.00 €', W - M - 5, y, { align: 'right' })

    // Total
    y += 10
    doc.setFillColor(15, 15, 15)
    doc.roundedRect(W / 2 - 5, y - 7, W / 2 - M + 5, 14, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL', W - M - 55, y + 1)
    doc.setTextColor(245, 158, 11)
    doc.setFontSize(14)
    doc.text(`${(f.montant / 100).toFixed(2)} €`, W - M - 5, y + 1, { align: 'right' })

    // ── Status + notes ──
    y += 24
    const statutLabel = (STATUT_CONFIG[f.statut] || STATUT_CONFIG.en_attente).label
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Statut : ${statutLabel}`, M, y)

    if (f.statut === 'payee') {
      doc.setTextColor(34, 197, 94)
      doc.setFont('helvetica', 'bold')
      doc.text('✓ PAYÉE', M + 40, y)
    }

    // ── Footer ──
    doc.setDrawColor(230, 230, 230)
    doc.line(M, 272, W - M, 272)
    doc.setTextColor(170, 170, 170)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text('Facture générée par Zevo — La plateforme tout-en-un pour coachs sportifs', W / 2, 278, { align: 'center' })
    doc.text('www.zevo-one.vercel.app', W / 2, 283, { align: 'center' })

    doc.save(`${f.numero || 'facture'}.pdf`)
  }

  // ── Filters & computed ──
  const filtered = factures
    .filter(f => filtre === 'tous' || f.statut === filtre)
    .filter(f => {
      if (!search) return true
      const name = (f.clients?.profiles?.nom || '').toLowerCase()
      return name.includes(search.toLowerCase()) || f.numero?.toLowerCase().includes(search.toLowerCase())
    })

  const totalPayees = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + (f.montant || 0), 0)
  const enAttente = factures.filter(f => f.statut === 'en_attente').length

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-5xl">
        <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="glass-card p-4 h-20 animate-pulse" />)}</div>
        {[1,2,3].map(i => <div key={i} className="glass-card p-4 h-16 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Factures</h2>
          <p className="text-xs text-[var(--text-muted)]">{filtered.length} facture{filtered.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)' }}
        >
          <Plus size={14} />
          Nouvelle facture
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
              <Receipt size={13} className="text-[#F59E0B]" />
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">Total factures</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{factures.length}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Euro size={13} className="text-emerald-400" />
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">Encaissé</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{(totalPayees / 100).toLocaleString('fr-FR')} €</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <AlertCircle size={13} className="text-yellow-400" />
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">En attente</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{enAttente}</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par client ou numéro..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#F59E0B]/40 focus:outline-none transition-all" />
        </div>
        <div className="flex gap-1 bg-[var(--bg-surface)] rounded-xl p-1 border border-[var(--border-base)]">
          {['tous', 'payee', 'en_attente', 'annulee'].map(s => (
            <button key={s} onClick={() => setFiltre(s)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${filtre === s ? 'bg-[#F59E0B]/15 text-[#F59E0B]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
              {s === 'tous' ? 'Toutes' : STATUT_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="glass-card p-4 border border-red-500/30 bg-red-500/5">
          <p className="text-[13px] font-semibold text-red-400">Erreur de chargement</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">{loadError}</p>
        </div>
      )}

      {/* ── Factures list ── */}
      {factures.length === 0 && !loadError ? (
        <div className="glass-card border-dashed p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#F59E0B]/8 flex items-center justify-center mx-auto mb-4">
            <FileText size={26} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-[15px] font-semibold text-[var(--text-primary)]">Aucune facture émise</p>
          <p className="text-[12px] text-[var(--text-muted)] mt-1.5 max-w-sm mx-auto leading-relaxed">
            Les factures sont générées automatiquement à chaque paiement. Vous pouvez aussi en créer manuellement.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block glass-card overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_100px_100px_80px_40px] gap-3 px-5 py-3 border-b border-[var(--border-base)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <span>Numéro</span>
              <span>Client</span>
              <span>Montant</span>
              <span>Date</span>
              <span>Statut</span>
              <span></span>
            </div>

            {filtered.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Search size={18} className="text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-[var(--text-muted)] text-sm">Aucune facture ne correspond</p>
              </div>
            ) : (
              filtered.map(f => {
                const cfg = STATUT_CONFIG[f.statut] || STATUT_CONFIG.en_attente
                const clientName = f.clients?.profiles?.nom || '—'
                return (
                  <div
                    key={f.id}
                    onClick={() => setDetailFacture(f)}
                    className="grid grid-cols-[1fr_1fr_100px_100px_80px_40px] gap-3 px-5 py-3.5 border-b border-[var(--border-base)]/50 items-center hover:bg-[var(--bg-surface)]/30 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-[#F59E0B]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-mono font-bold text-[#F59E0B] truncate">{f.numero}</p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">{f.description || f.offres_coaching?.titre || '—'}</p>
                      </div>
                    </div>
                    <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{clientName}</p>
                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">{(f.montant / 100).toFixed(2)} €</p>
                    <span className="text-[12px] text-[var(--text-muted)]">
                      {f.date_emission ? new Date(f.date_emission).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-lg ${cfg.color} ${cfg.bg} w-fit`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); generatePDF(f) }}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Télécharger PDF"
                    >
                      <Download size={13} />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map(f => {
              const cfg = STATUT_CONFIG[f.statut] || STATUT_CONFIG.en_attente
              const clientName = f.clients?.profiles?.nom || '—'
              return (
                <div key={f.id} onClick={() => setDetailFacture(f)} className="glass-card p-4 active:scale-[0.99] transition-transform cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-[#F59E0B]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[12px] font-mono font-bold text-[#F59E0B]">{f.numero}</p>
                          <span className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-md ${cfg.color} ${cfg.bg}`}>
                            <div className={`w-1 h-1 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{clientName}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); generatePDF(f) }}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-colors shrink-0"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-base)]/50 ml-12">
                    <span className="text-sm font-bold text-[var(--text-primary)]">{(f.montant / 100).toFixed(2)} €</span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {f.date_emission ? new Date(f.date_emission).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Modal : Nouvelle facture ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="glass-card relative w-full md:max-w-md md:rounded-2xl rounded-t-2xl rounded-b-none md:rounded-b-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }} />
            <div className="p-4 md:p-5 border-b border-[var(--border-base)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                  <FileText size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] font-semibold">Nouvelle facture</h3>
                  <p className="text-[var(--text-muted)] text-[11px]">Numéro auto-généré</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 md:p-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {formError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-400">{formError}</p>
                </div>
              )}
              <div>
                <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Client *</label>
                <select value={formClient} onChange={e => setFormClient(e.target.value)} className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[#F59E0B]/50 focus:outline-none transition-all">
                  <option value="">-- Sélectionner --</option>
                  {clientsList.map(c => (
                    <option key={c.id} value={c.id}>{c.profiles?.nom || 'Sans nom'} {c.profiles?.email ? `· ${c.profiles.email}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Produit (optionnel)</label>
                <select value={formOffre} onChange={e => onSelectOffre(e.target.value)} className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[#F59E0B]/50 focus:outline-none transition-all">
                  <option value="">-- Aucun --</option>
                  {offresList.map(o => (
                    <option key={o.id} value={o.id}>{o.titre} · {(o.prix / 100).toFixed(2)} €</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Montant (€) *</label>
                  <input type="number" step="0.01" min="0" value={formMontant} onChange={e => setFormMontant(e.target.value)} placeholder="0.00" className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#F59E0B]/50 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Statut</label>
                  <select value={formStatut} onChange={e => setFormStatut(e.target.value)} className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[#F59E0B]/50 focus:outline-none transition-all">
                    <option value="payee">Payée</option>
                    <option value="en_attente">En attente</option>
                    <option value="annulee">Annulée</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Description</label>
                <input type="text" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Prestation de coaching..." className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#F59E0B]/50 focus:outline-none transition-all" />
              </div>
            </div>
            <div className="p-4 md:p-5 border-t border-[var(--border-base)] flex gap-3 justify-end">
              <button onClick={closeModal} className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-all">Annuler</button>
              <button onClick={createFacture} disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 active:scale-95" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : 'Créer la facture'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal : Détail facture ── */}
      {detailFacture && (() => {
        const f = detailFacture
        const cfg = STATUT_CONFIG[f.statut] || STATUT_CONFIG.en_attente
        const clientName = f.clients?.profiles?.nom || '—'
        const clientEmail = f.clients?.profiles?.email || ''
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setDetailFacture(null)}>
            <div className="glass-card relative w-full md:max-w-md md:rounded-2xl rounded-t-2xl rounded-b-none md:rounded-b-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }} />

              {/* Header */}
              <div className="p-5 border-b border-[var(--border-base)]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
                      <FileText size={20} className="text-[#F59E0B]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-mono font-bold text-[#F59E0B]">{f.numero}</p>
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-lg mt-1 ${cfg.color} ${cfg.bg}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setDetailFacture(null)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors">
                    <X size={18} />
                  </button>
                </div>

                {/* Montant */}
                <div className="mt-5 text-center py-6 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)]">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1">Montant total</p>
                  <p className="text-4xl font-bold text-[var(--text-primary)]">
                    {(f.montant / 100).toFixed(2)} <span className="text-lg text-[var(--text-muted)]">€</span>
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-surface)]">
                  <User size={14} className="text-[var(--text-muted)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[var(--text-muted)] font-medium">Client</p>
                    <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{clientName}</p>
                    {clientEmail && <p className="text-[10px] text-[var(--text-muted)] truncate">{clientEmail}</p>}
                  </div>
                </div>

                {(f.description || f.offres_coaching?.titre) && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-surface)]">
                    <Package size={14} className="text-[var(--text-muted)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[var(--text-muted)] font-medium">Prestation</p>
                      <p className="text-[13px] font-semibold text-[var(--text-primary)]">{f.description || f.offres_coaching?.titre}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-surface)]">
                    <Calendar size={14} className="text-[var(--text-muted)] shrink-0" />
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] font-medium">Émission</p>
                      <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                        {f.date_emission ? new Date(f.date_emission).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-surface)]">
                    <Hash size={14} className="text-[var(--text-muted)] shrink-0" />
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] font-medium">Identifiant</p>
                      <p className="text-[11px] font-mono font-semibold text-[var(--text-secondary)]">{f.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-[var(--border-base)] flex gap-3">
                <button onClick={() => setDetailFacture(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-all">
                  Fermer
                </button>
                <button
                  onClick={() => generatePDF(f)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
                >
                  <Download size={14} />
                  Télécharger PDF
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
