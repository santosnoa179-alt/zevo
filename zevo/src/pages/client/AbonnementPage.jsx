import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { usePageTransition, useStagger } from '../../hooks/useAnimations'
import { CreditCard, CheckCircle, Clock, ExternalLink, Package, Loader2, FileText, Download } from 'lucide-react'
import jsPDF from 'jspdf'

const FREQ_LABELS = {
  unique: 'Paiement unique',
  mensuel: '/ mois',
  trimestriel: '/ trimestre',
  annuel: '/ an',
}

export default function AbonnementPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [offres, setOffres] = useState([])
  const [paiements, setPaiements] = useState([])
  const [factures, setFactures] = useState([])
  const [coachInfo, setCoachInfo] = useState(null)
  const [clientInfo, setClientInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)

  // Verifier si succes de paiement (retour Stripe)
  const params = new URLSearchParams(window.location.search)
  const paiementSuccess = params.get('paiement') === 'success'

  useEffect(() => {
    if (!user) return

    const init = async () => {
      // Si retour Stripe success, marquer le dernier paiement en_attente comme paye
      if (paiementSuccess) {
        await supabase
          .from('paiements_clients')
          .update({ statut: 'paye', date_paiement: new Date().toISOString() })
          .eq('client_id', user.id)
          .eq('statut', 'en_attente')
          .order('created_at', { ascending: false })
          .limit(1)
        // Nettoyer l'URL
        window.history.replaceState({}, '', '/app/abonnement')
      }
      chargerDonnees()
    }
    init()
  }, [user])

  const chargerDonnees = async () => {
    setLoading(true)

    // Recuperer le coach_id du client
    const { data: client } = await supabase
      .from('clients')
      .select('coach_id')
      .eq('id', user.id)
      .single()

    if (!client) { setLoading(false); return }

    // Charger les offres actives du coach
    const { data: offresData } = await supabase
      .from('offres_coaching')
      .select('*')
      .eq('coach_id', client.coach_id)
      .eq('actif', true)
      .order('prix')

    // Charger les paiements sans join (evite les problemes RLS)
    const { data: paiementsData } = await supabase
      .from('paiements_clients')
      .select('*')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })

    // Charger les factures du client (générées par le coach)
    const { data: facturesData, error: facturesErr } = await supabase
      .from('factures')
      .select('*, offres_coaching(titre)')
      .eq('client_id', user.id)
      .order('date_emission', { ascending: false })
    if (facturesErr) console.warn('[AbonnementPage] factures:', facturesErr.message)

    // Infos coach pour PDF
    const { data: coachProfile } = await supabase
      .from('profiles')
      .select('nom, email')
      .eq('id', client.coach_id)
      .maybeSingle()
    const { data: coachData } = await supabase
      .from('coaches')
      .select('*')
      .eq('id', client.coach_id)
      .maybeSingle()
    setCoachInfo({
      nom: coachProfile?.nom || 'Coach',
      email: coachProfile?.email || '',
      ...(coachData || {}),
    })

    // Infos client pour PDF
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('nom, email')
      .eq('id', user.id)
      .maybeSingle()
    setClientInfo(myProfile)

    // Enrichir les paiements avec le titre de l'offre
    const offresMap = {}
    ;(offresData || []).forEach(o => { offresMap[o.id] = o.titre })
    const paiementsEnrichis = (paiementsData || []).map(p => ({
      ...p,
      offre_titre: offresMap[p.offre_id] || 'Paiement',
    }))

    setOffres(offresData || [])
    setPaiements(paiementsEnrichis)
    setFactures(facturesData || [])
    setLoading(false)
  }

  const STATUT_LABELS = {
    payee: { label: 'Payée', color: 'text-green-400', bg: 'bg-green-500/10' },
    en_attente: { label: 'En attente', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    annulee: { label: 'Annulée', color: 'text-red-400', bg: 'bg-red-500/10' },
  }

  const telechargerFacture = (f) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = 210
    const margin = 15

    doc.setFillColor(13, 13, 13)
    doc.rect(0, 0, pageW, 40, 'F')

    doc.setTextColor(245, 158, 11)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text((coachInfo?.nom_entreprise || coachInfo?.nom || 'ZEVO').toUpperCase(), margin, 20)

    doc.setTextColor(200, 200, 200)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    if (coachInfo?.email) doc.text(coachInfo.email, margin, 27)

    doc.setTextColor(245, 158, 11)
    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    doc.text('FACTURE', pageW - margin, 22, { align: 'right' })
    doc.setTextColor(200, 200, 200)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(f.numero || '', pageW - margin, 30, { align: 'right' })

    let y = 55
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('FACTURÉ À', margin, y)
    doc.text('DATE D\'ÉMISSION', pageW - margin - 60, y)

    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(clientInfo?.nom || '—', margin, y)
    const dateStr = f.date_emission
      ? new Date(f.date_emission).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : '—'
    doc.text(dateStr, pageW - margin - 60, y)

    if (clientInfo?.email) {
      y += 5
      doc.setFontSize(9)
      doc.setTextColor(120, 120, 120)
      doc.text(clientInfo.email, margin, y)
    }

    y += 12
    doc.setDrawColor(220, 220, 220)
    doc.line(margin, y, pageW - margin, y)

    y += 10
    doc.setFillColor(245, 158, 11)
    doc.rect(margin, y - 6, pageW - margin * 2, 9, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('DESCRIPTION', margin + 3, y)
    doc.text('MONTANT', pageW - margin - 3, y, { align: 'right' })

    y += 12
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    const description = f.description || f.offres_coaching?.titre || 'Prestation de coaching'
    const splitDesc = doc.splitTextToSize(description, pageW - margin * 2 - 40)
    doc.text(splitDesc, margin + 3, y)
    doc.text(`${(f.montant / 100).toFixed(2)} €`, pageW - margin - 3, y, { align: 'right' })

    y += Math.max(splitDesc.length * 5, 10) + 10
    doc.setDrawColor(220, 220, 220)
    doc.line(pageW - margin - 80, y - 5, pageW - margin, y - 5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Total', pageW - margin - 80, y)
    doc.setTextColor(245, 158, 11)
    doc.setFontSize(16)
    doc.text(`${(f.montant / 100).toFixed(2)} €`, pageW - margin, y, { align: 'right' })

    y += 15
    const statutLabel = (STATUT_LABELS[f.statut] || STATUT_LABELS.en_attente).label
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Statut : ${statutLabel}`, margin, y)

    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('Facture générée par Zevo — La plateforme tout-en-un pour coachs.', pageW / 2, 285, { align: 'center' })

    doc.save(`${f.numero || 'facture'}.pdf`)
  }

  // ── Payer une offre via Stripe Connect ──
  const payer = async (offre) => {
    setProcessing(offre.id)

    try {
      // Appel à l'API Vercel pour créer une session Stripe Connect
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res = await fetch('/api/client-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession?.access_token}`,
        },
        body: JSON.stringify({ offreId: offre.id, clientId: user.id }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')

      // Redirection vers Stripe Checkout (sur le compte Connect du coach)
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Erreur paiement:', err)
      toast.error(err.message || 'Erreur lors de la redirection vers le paiement.')
      setProcessing(null)
    }
  }

  const pageTransition = usePageTransition()
  const stagger = useStagger(offres.length + paiements.length + 2) // +2 for headers

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="h-8 w-48 bg-[var(--bg-card)] rounded-lg animate-pulse mb-8" />
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-32 bg-[var(--bg-card)] rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className={`p-6 max-w-2xl mx-auto ${pageTransition.className}`}>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Mon abonnement</h1>
      <p className="text-[var(--text-muted)] text-sm mb-8">Offres de coaching et historique de paiements</p>

      {/* Message de succès */}
      {paiementSuccess && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
          <p className="text-green-400 text-sm">Paiement effectué avec succès ! Merci.</p>
        </div>
      )}

      {/* ── Offres disponibles ── */}
      {offres.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Offres disponibles</h2>
          <div className="space-y-4">
            {offres.map((o, i) => {
              const si = stagger[i] || {}
              return (
              <div
                key={o.id}
                className={`bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl p-5 flex items-center justify-between ${si.className || ''}`}
                style={si.style}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <Package size={18} className="text-[#FF6B2B]" />
                    <h3 className="text-[var(--text-primary)] font-semibold">{o.titre}</h3>
                  </div>
                  {o.description && (
                    <p className="text-[var(--text-muted)] text-sm ml-[30px] mb-2">{o.description}</p>
                  )}
                  <p className="text-[var(--text-muted)] text-xs ml-[30px]">{FREQ_LABELS[o.frequence]}</p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <p className="text-[var(--text-primary)] text-2xl font-bold">{(o.prix / 100).toFixed(0)}€</p>
                    <p className="text-[var(--text-muted)] text-xs">{FREQ_LABELS[o.frequence]}</p>
                  </div>
                  <button
                    onClick={() => payer(o)}
                    disabled={processing === o.id}
                    className="flex items-center gap-2 bg-[#FF6B2B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-50"
                  >
                    {processing === o.id ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Paiement en cours...
                      </>
                    ) : (
                      <>
                        <CreditCard size={16} />
                        Payer
                      </>
                    )}
                  </button>
                </div>
              </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Historique de paiements ── */}
      <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Historique</h2>

      {paiements.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-dashed border-[var(--border-base)] p-10 text-center">
          <CreditCard size={28} className="text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-[var(--text-muted)] text-sm">Aucun paiement effectué</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paiements.map((p, i) => {
            const si = stagger[offres.length + i] || {}
            return (
            <div
              key={p.id}
              className={`bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl p-4 flex items-center justify-between ${si.className || ''}`}
              style={si.style}
            >
              <div>
                <p className="text-[var(--text-primary)] text-sm font-medium">
                  {p.offre_titre || 'Paiement'}
                </p>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">
                  {p.date_paiement
                    ? new Date(p.date_paiement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'En attente'
                  }
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-[var(--text-primary)] font-bold">{(p.montant / 100).toFixed(2)} €</p>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  p.statut === 'paye' ? 'bg-green-500/10 text-green-400'
                    : p.statut === 'en_attente' ? 'bg-yellow-500/10 text-yellow-400'
                    : p.statut === 'echoue' ? 'bg-red-500/10 text-red-400'
                    : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {p.statut === 'paye' ? 'Payé' : p.statut === 'en_attente' ? 'En attente' : p.statut === 'echoue' ? 'Échoué' : 'Remboursé'}
                </span>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* ── Factures ── */}
      {factures.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Mes factures</h2>
          <div className="space-y-3">
            {factures.map(f => {
              const cfg = STATUT_LABELS[f.statut] || STATUT_LABELS.en_attente
              return (
                <div
                  key={f.id}
                  className="bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={17} className="text-[#FF6B2B]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[12px] font-mono text-[#FF6B2B]">{f.numero}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.color} ${cfg.bg}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[13px] font-medium text-[var(--text-primary)] mt-0.5 truncate">
                      {f.description || f.offres_coaching?.titre || 'Prestation'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {f.date_emission ? new Date(f.date_emission).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[14px] font-bold text-[var(--text-primary)]">{(f.montant / 100).toFixed(2)} €</p>
                  </div>
                  <button
                    onClick={() => telechargerFacture(f)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold text-[#FF6B2B] bg-[#FF6B2B]/10 hover:bg-[#FF6B2B]/15 transition-colors"
                    title="Télécharger le PDF"
                  >
                    <Download size={13} />
                    PDF
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
