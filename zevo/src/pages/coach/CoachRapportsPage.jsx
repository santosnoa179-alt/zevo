import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  FileText, Download, Send, Calendar, User, ChevronDown,
  BarChart3, TrendingUp, Moon, Smile, Target, CheckSquare
} from 'lucide-react'

// ── Types de rapports ──
const TYPES_RAPPORT = [
  {
    id: 'hebdomadaire',
    label: 'Rapport hebdomadaire',
    description: 'Score bien-être, habitudes, objectifs, sommeil, humeur de la semaine',
    icon: Calendar,
  },
  {
    id: 'mensuel',
    label: 'Rapport mensuel',
    description: 'Toutes les métriques sur 30 jours + comparaison mois précédent',
    icon: BarChart3,
  },
  {
    id: 'financier',
    label: 'Rapport financier',
    description: 'CA du mois, paiements reçus, MRR',
    icon: TrendingUp,
  },
]

export default function CoachRapportsPage() {
  const { user } = useAuth()

  // Sélection
  const [typeRapport, setTypeRapport] = useState('hebdomadaire')
  const [clientId, setClientId] = useState('')
  const [commentaire, setCommentaire] = useState('')

  // Données
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Prévisualisation
  const [preview, setPreview] = useState(null)
  const [coachInfo, setCoachInfo] = useState(null)

  // ── Charger les clients et infos coach ──
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [{ data: cl }, { data: coach }] = await Promise.all([
        supabase
          .from('clients')
          .select('id, actif, profiles(nom, email)')
          .eq('coach_id', user.id)
          .eq('actif', true),
        supabase
          .from('coaches')
          .select('nom_app, logo_url, couleur_primaire')
          .eq('id', user.id)
          .maybeSingle(),
      ])
      setClients(cl || [])
      setCoachInfo(coach)
      if (cl?.length > 0) setClientId(cl[0].id)
      setLoading(false)
    }
    load()
  }, [user])

  // ── Générer la prévisualisation ──
  const genererPreview = async () => {
    if (typeRapport === 'financier') {
      // Rapport financier — pas besoin de clientId
      setGenerating(true)
      const data = await chargerDonneesFinancieres()
      setPreview({ type: 'financier', data })
      setGenerating(false)
      return
    }

    if (!clientId) return
    setGenerating(true)

    const client = clients.find(c => c.id === clientId)
    const jours = typeRapport === 'mensuel' ? 30 : 7
    const data = await chargerDonneesClient(clientId, jours)

    setPreview({
      type: typeRapport,
      client,
      data,
      jours,
      commentaire,
    })
    setGenerating(false)
  }

  // ── Charger les données d'un client ──
  const chargerDonneesClient = async (cId, jours) => {
    const dateDebut = new Date()
    dateDebut.setDate(dateDebut.getDate() - jours)
    const dateStr = dateDebut.toISOString().split('T')[0]

    // Période précédente (pour comparaison mensuelle)
    const datePrecedente = new Date()
    datePrecedente.setDate(datePrecedente.getDate() - jours * 2)
    const datePrecStr = datePrecedente.toISOString().split('T')[0]

    const [habitudes, logs, objectifs, sommeil, humeur] = await Promise.all([
      supabase.from('habitudes').select('id, nom').eq('client_id', cId).eq('actif', true),
      supabase.from('habitudes_log').select('*').eq('client_id', cId).gte('date', dateStr),
      supabase.from('objectifs').select('*').eq('client_id', cId).eq('archive', false),
      supabase.from('sommeil_log').select('*').eq('client_id', cId).gte('date', dateStr).order('date'),
      supabase.from('humeur_log').select('*').eq('client_id', cId).gte('date', dateStr).order('date'),
    ])

    // Données période précédente (pour comparaison)
    let prevLogs = null, prevSommeil = null, prevHumeur = null
    if (jours === 30) {
      const [pl, ps, ph] = await Promise.all([
        supabase.from('habitudes_log').select('*').eq('client_id', cId).gte('date', datePrecStr).lt('date', dateStr),
        supabase.from('sommeil_log').select('*').eq('client_id', cId).gte('date', datePrecStr).lt('date', dateStr),
        supabase.from('humeur_log').select('*').eq('client_id', cId).gte('date', datePrecStr).lt('date', dateStr),
      ])
      prevLogs = pl.data
      prevSommeil = ps.data
      prevHumeur = ph.data
    }

    // Calculs
    const nbHabitudes = habitudes.data?.length || 0
    const nbLogsComplets = logs.data?.filter(l => l.complete).length || 0
    const tauxHabitudes = nbHabitudes > 0 ? Math.round((nbLogsComplets / (nbHabitudes * jours)) * 100) : 0

    const sommeilData = sommeil.data || []
    const moyenneSommeil = sommeilData.length > 0
      ? (sommeilData.reduce((s, d) => s + (d.heures || 0), 0) / sommeilData.length).toFixed(1)
      : '—'
    const moyenneQualite = sommeilData.length > 0
      ? (sommeilData.reduce((s, d) => s + (d.qualite || 0), 0) / sommeilData.length).toFixed(1)
      : '—'

    const humeurData = humeur.data || []
    const moyenneHumeur = humeurData.length > 0
      ? (humeurData.reduce((s, d) => s + d.score, 0) / humeurData.length).toFixed(1)
      : '—'

    // Comparaison mois précédent
    let comparaison = null
    if (jours === 30 && prevLogs) {
      const prevTaux = nbHabitudes > 0 ? Math.round(((prevLogs?.filter(l => l.complete).length || 0) / (nbHabitudes * jours)) * 100) : 0
      const prevMoySommeil = prevSommeil?.length > 0
        ? (prevSommeil.reduce((s, d) => s + (d.heures || 0), 0) / prevSommeil.length).toFixed(1)
        : null
      const prevMoyHumeur = prevHumeur?.length > 0
        ? (prevHumeur.reduce((s, d) => s + d.score, 0) / prevHumeur.length).toFixed(1)
        : null

      comparaison = {
        habitudes: tauxHabitudes - prevTaux,
        sommeil: prevMoySommeil ? (parseFloat(moyenneSommeil) - parseFloat(prevMoySommeil)).toFixed(1) : null,
        humeur: prevMoyHumeur ? (parseFloat(moyenneHumeur) - parseFloat(prevMoyHumeur)).toFixed(1) : null,
      }
    }

    return {
      habitudes: habitudes.data || [],
      tauxHabitudes,
      objectifs: objectifs.data || [],
      moyenneSommeil,
      moyenneQualite,
      moyenneHumeur,
      sommeilData,
      humeurData,
      comparaison,
    }
  }

  // ── Données financières ──
  const chargerDonneesFinancieres = async () => {
    // Compter les clients actifs
    const { count: nbClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', user.id)
      .eq('actif', true)

    // Essayer de charger les paiements (la table peut ne pas exister encore)
    let paiements = []
    try {
      const { data } = await supabase
        .from('paiements_clients')
        .select('*')
        .eq('coach_id', user.id)
        .eq('statut', 'paye')
      paiements = data || []
    } catch { /* table pas encore créée */ }

    const moisCourant = new Date().toISOString().slice(0, 7)
    const paiementsMois = paiements.filter(p => p.date_paiement?.startsWith(moisCourant))
    const caMois = paiementsMois.reduce((s, p) => s + (p.montant || 0), 0) / 100

    return {
      nbClients: nbClients || 0,
      caMois,
      nbPaiements: paiementsMois.length,
      totalPaiements: paiements.length,
    }
  }

  // ── Générer et télécharger le PDF (Premium + White-label) ──
  const telechargerPDF = async () => {
    if (!preview) return

    const { default: jsPDF } = await import('jspdf')

    const doc = new jsPDF('p', 'mm', 'a4')
    const couleur = coachInfo?.couleur_primaire || '#FF6B2B'
    const nomApp = coachInfo?.nom_app || 'Zevo'
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 20

    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return [r, g, b]
    }
    const [cr, cg, cb] = hexToRgb(couleur)

    const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    const typeLabel = TYPES_RAPPORT.find(t => t.id === preview.type)?.label || 'Rapport'

    // ── Helper : barre de progression ──
    const drawProgressBar = (x, yPos, w, percent, height = 4) => {
      doc.setFillColor(230, 230, 230)
      doc.roundedRect(x, yPos, w, height, height / 2, height / 2, 'F')
      if (percent > 0) {
        doc.setFillColor(cr, cg, cb)
        doc.roundedRect(x, yPos, Math.max(w * percent / 100, height), height, height / 2, height / 2, 'F')
      }
    }

    // ── Helper : section title avec pastille couleur ──
    const drawSectionTitle = (title, yPos) => {
      doc.setFillColor(cr, cg, cb)
      doc.circle(margin + 2, yPos - 1.5, 2, 'F')
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text(title, margin + 8, yPos)
      return yPos + 8
    }

    // ── Helper : stat card ──
    const drawStatCard = (x, yPos, w, h, label, value, unit = '') => {
      doc.setFillColor(248, 248, 248)
      doc.roundedRect(x, yPos, w, h, 3, 3, 'F')
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(cr, cg, cb)
      doc.text(`${value}`, x + w / 2, yPos + h / 2 - 1, { align: 'center' })
      if (unit) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text(unit, x + w / 2 + doc.getTextWidth(`${value}`) / 2 + 2, yPos + h / 2 - 1)
      }
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120, 120, 120)
      doc.text(label, x + w / 2, yPos + h / 2 + 7, { align: 'center' })
    }

    // ── Helper : variation badge ──
    const drawVariation = (x, yPos, val, suffix = '') => {
      if (val === null || val === undefined) return
      const n = parseFloat(val)
      const text = `${n >= 0 ? '+' : ''}${val}${suffix}`
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      if (n >= 0) {
        doc.setTextColor(34, 139, 34)
      } else {
        doc.setTextColor(220, 53, 69)
      }
      doc.text(text, x, yPos)
      doc.setTextColor(30, 30, 30)
    }

    let y = 0

    // ══════════════════════════════════════
    // HEADER — White background + logo + fine separator
    // ══════════════════════════════════════

    // Charger le logo du coach si disponible
    let logoImg = null
    if (coachInfo?.logo_url) {
      try {
        const response = await fetch(coachInfo.logo_url)
        const blob = await response.blob()
        const reader = new FileReader()
        logoImg = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(blob)
        })
      } catch { /* logo non chargeable, on continue sans */ }
    }

    y = 15
    if (logoImg) {
      try {
        doc.addImage(logoImg, 'PNG', margin, y, 0, 12)
        y += 16
      } catch {
        // Fallback : texte du nom si l'image ne charge pas
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(cr, cg, cb)
        doc.text(nomApp, margin, y + 8)
        y += 16
      }
    } else {
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(cr, cg, cb)
      doc.text(nomApp, margin, y + 8)
      y += 16
    }

    // Fine separator line
    doc.setDrawColor(cr, cg, cb)
    doc.setLineWidth(0.8)
    doc.line(margin, y, pageW - margin, y)
    y += 10

    // Titre du rapport
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text(typeLabel, margin, y)
    y += 7

    // Badge période
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(dateStr, margin, y)
    y += 12

    // ══════════════════════════════════════
    // BODY
    // ══════════════════════════════════════

    if (preview.type === 'financier') {
      y = drawSectionTitle('Vue financiere', y)
      const d = preview.data
      const cardW = (pageW - margin * 2 - 6) / 2
      drawStatCard(margin, y, cardW, 30, 'Clients actifs', d.nbClients)
      drawStatCard(margin + cardW + 6, y, cardW, 30, 'CA du mois', `${d.caMois.toFixed(2)}`, '\u20AC')
      y += 36
      drawStatCard(margin, y, cardW, 30, 'Paiements ce mois', d.nbPaiements)
      drawStatCard(margin + cardW + 6, y, cardW, 30, 'Total paiements', d.totalPaiements)
      y += 36
    } else {
      const nomClient = preview.client?.profiles?.nom || preview.client?.profiles?.email || 'Client'
      const d = preview.data

      // Client info
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text(`Client : ${nomClient}  |  Periode : ${preview.jours} jours`, margin, y)
      y += 12

      // ── Stats grid (4 colonnes) ──
      const cardW = (pageW - margin * 2 - 18) / 4
      drawStatCard(margin, y, cardW, 32, 'Habitudes', `${d.tauxHabitudes}%`)
      drawStatCard(margin + cardW + 6, y, cardW, 32, 'Sommeil', `${d.moyenneSommeil}`, 'h')
      drawStatCard(margin + (cardW + 6) * 2, y, cardW, 32, 'Qualite', `${d.moyenneQualite}`, '/5')
      drawStatCard(margin + (cardW + 6) * 3, y, cardW, 32, 'Humeur', `${d.moyenneHumeur}`, '/10')
      y += 38

      // Variations si mensuel
      if (d.comparaison) {
        drawVariation(margin + cardW / 2 - 8, y, d.comparaison.habitudes, '%')
        if (d.comparaison.sommeil) drawVariation(margin + cardW + 6 + cardW / 2 - 8, y, d.comparaison.sommeil, 'h')
        if (d.comparaison.humeur) drawVariation(margin + (cardW + 6) * 3 + cardW / 2 - 8, y, d.comparaison.humeur)
        y += 8
      }

      // ── Section Habitudes ──
      y = drawSectionTitle('Habitudes', y)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text(`Taux de completion : ${d.tauxHabitudes}%`, margin + 8, y)
      y += 5
      drawProgressBar(margin + 8, y, pageW - margin * 2 - 8, d.tauxHabitudes, 5)
      y += 10

      d.habitudes.forEach(h => {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        doc.text(`\u2022  ${h.nom}`, margin + 12, y)
        y += 5
      })
      y += 6

      // ── Section Objectifs ──
      y = drawSectionTitle('Objectifs', y)
      if (d.objectifs.length === 0) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(150, 150, 150)
        doc.text('Aucun objectif actif', margin + 8, y)
        y += 8
      } else {
        d.objectifs.forEach(o => {
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(50, 50, 50)
          doc.text(o.titre, margin + 8, y)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(cr, cg, cb)
          doc.text(`${o.score}%`, pageW - margin - 15, y, { align: 'right' })
          y += 4
          drawProgressBar(margin + 8, y, pageW - margin * 2 - 30, o.score, 3.5)
          y += 8
        })
      }
      y += 4

      // ── Section Sommeil ──
      y = drawSectionTitle('Sommeil', y)
      const sommeilW = (pageW - margin * 2 - 14) / 2
      drawStatCard(margin + 8, y, sommeilW, 26, 'Moyenne / nuit', d.moyenneSommeil, 'h')
      drawStatCard(margin + 8 + sommeilW + 6, y, sommeilW, 26, 'Qualite moyenne', d.moyenneQualite, '/5')
      y += 32

      // ── Section Humeur ──
      y = drawSectionTitle('Humeur', y)
      drawStatCard(margin + 8, y, sommeilW, 26, 'Score moyen', d.moyenneHumeur, '/10')
      y += 32

      // ── Commentaire du coach ──
      if (commentaire.trim()) {
        // Vérifier si on a assez de place, sinon nouvelle page
        if (y > pageH - 60) {
          doc.addPage()
          y = 20
        }
        y = drawSectionTitle('Commentaire du coach', y)
        doc.setFillColor(cr, cg, cb)
        doc.setGState(new doc.GState({ opacity: 0.08 }))
        doc.roundedRect(margin + 8, y - 3, pageW - margin * 2 - 8, 4 + commentaire.length * 0.15, 3, 3, 'F')
        doc.setGState(new doc.GState({ opacity: 1 }))

        doc.setDrawColor(cr, cg, cb)
        doc.setLineWidth(0.6)
        doc.line(margin + 8, y - 3, margin + 8, y + 3 + commentaire.length * 0.12)

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(50, 50, 50)
        const lines = doc.splitTextToSize(commentaire, pageW - margin * 2 - 20)
        doc.text(lines, margin + 14, y + 2)
        y += lines.length * 5 + 8
      }
    }

    // ══════════════════════════════════════
    // FOOTER — Professional styled
    // ══════════════════════════════════════
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.3)
    doc.line(margin, pageH - 20, pageW - margin, pageH - 20)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 150, 150)
    doc.text(`${nomApp}`, margin, pageH - 14)
    doc.text('Rapport genere automatiquement', margin, pageH - 10)
    doc.text(dateStr, pageW - margin, pageH - 14, { align: 'right' })
    doc.setTextColor(cr, cg, cb)
    doc.setFont('helvetica', 'bold')
    doc.text('Confidentiel', pageW - margin, pageH - 10, { align: 'right' })

    // Télécharger
    const nomFichier = preview.type === 'financier'
      ? `rapport-financier-${dateStr}.pdf`
      : `rapport-${preview.type}-${preview.client?.profiles?.nom || 'client'}-${dateStr}.pdf`

    doc.save(nomFichier.replace(/\s+/g, '-').toLowerCase())
  }

  // ── Indicateur de variation ──
  const Variation = ({ val, suffix = '' }) => {
    if (val === null || val === undefined) return null
    const n = parseFloat(val)
    return (
      <span className={`text-xs font-medium ml-2 ${n >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {n >= 0 ? '+' : ''}{val}{suffix}
      </span>
    )
  }

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════
  return (
    <div className="p-6 w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F5F5F3]">Rapports</h1>
        <p className="text-white/50 text-sm mt-1">Générez des rapports PDF professionnels pour vos clients</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Colonne gauche : configuration ── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Type de rapport */}
          <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-4">
            <label className="block text-white/50 text-xs mb-3 uppercase tracking-wider font-semibold">Type de rapport</label>
            <div className="space-y-2">
              {TYPES_RAPPORT.map(t => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => { setTypeRapport(t.id); setPreview(null) }}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                      typeRapport === t.id
                        ? 'bg-[#FF6B2B]/10 border border-[#FF6B2B]/30'
                        : 'border border-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  >
                    <Icon size={18} className={typeRapport === t.id ? 'text-[#FF6B2B]' : 'text-white/30'} />
                    <div>
                      <p className={`text-sm font-medium ${typeRapport === t.id ? 'text-[#F5F5F3]' : 'text-white/50'}`}>
                        {t.label}
                      </p>
                      <p className="text-white/25 text-xs mt-0.5">{t.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sélection du client (sauf rapport financier) */}
          {typeRapport !== 'financier' && (
            <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-4">
              <label className="block text-white/50 text-xs mb-2 uppercase tracking-wider font-semibold">Client</label>
              {loading ? (
                <div className="h-10 bg-[#2A2A2A] rounded-lg animate-pulse" />
              ) : clients.length === 0 ? (
                <p className="text-white/30 text-sm">Aucun client actif</p>
              ) : (
                <select
                  value={clientId}
                  onChange={(e) => { setClientId(e.target.value); setPreview(null) }}
                  className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-[#F5F5F3] focus:border-[#FF6B2B]/50 focus:outline-none transition-colors"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.profiles?.nom || c.profiles?.email || 'Client'}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Commentaire coach (sauf financier) */}
          {typeRapport !== 'financier' && (
            <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-4">
              <label className="block text-white/50 text-xs mb-2 uppercase tracking-wider font-semibold">
                Commentaire du coach
              </label>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Ajoutez un message personnalisé au rapport..."
                rows={3}
                className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-[#F5F5F3] placeholder-white/20 focus:border-[#FF6B2B]/50 focus:outline-none transition-colors resize-none"
              />
            </div>
          )}

          {/* Bouton générer */}
          <button
            onClick={genererPreview}
            disabled={generating || (typeRapport !== 'financier' && !clientId)}
            className="w-full flex items-center justify-center gap-2 bg-[#FF6B2B] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating ? (
              'Chargement des données...'
            ) : (
              <>
                <BarChart3 size={16} />
                Générer le rapport
              </>
            )}
          </button>
        </div>

        {/* ── Colonne droite : prévisualisation ── */}
        <div className="lg:col-span-2">
          {!preview ? (
            <div className="bg-[#1E1E1E] border border-dashed border-white/[0.08] rounded-xl p-12 flex flex-col items-center justify-center min-h-[500px]">
              <FileText size={48} className="text-white/10 mb-4" />
              <p className="text-white/30 text-sm">Sélectionnez un type et cliquez sur « Générer »</p>
              <p className="text-white/15 text-xs mt-1">La prévisualisation apparaîtra ici</p>
            </div>
          ) : (
            <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl overflow-hidden">
              {/* Header préview */}
              <div
                className="p-5 text-white"
                style={{ backgroundColor: coachInfo?.couleur_primaire || '#FF6B2B' }}
              >
                <p className="text-lg font-bold">{coachInfo?.nom_app || 'Zevo'}</p>
                <p className="text-white/80 text-xs mt-0.5">
                  {TYPES_RAPPORT.find(t => t.id === preview.type)?.label} — {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="p-5 space-y-6">
                {preview.type === 'financier' ? (
                  /* ── Preview financier ── */
                  <>
                    <h3 className="text-[#F5F5F3] font-semibold text-sm flex items-center gap-2">
                      <TrendingUp size={16} className="text-[#FF6B2B]" />
                      Données financières
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Clients actifs', val: preview.data.nbClients },
                        { label: 'CA du mois', val: `${preview.data.caMois.toFixed(2)} €` },
                        { label: 'Paiements ce mois', val: preview.data.nbPaiements },
                        { label: 'Total paiements', val: preview.data.totalPaiements },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-[#2A2A2A] rounded-lg p-3">
                          <p className="text-white/40 text-xs">{label}</p>
                          <p className="text-[#F5F5F3] text-lg font-bold mt-1">{val}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  /* ── Preview client ── */
                  <>
                    <div className="flex items-center gap-2 text-white/40 text-xs">
                      <User size={14} />
                      {preview.client?.profiles?.nom || preview.client?.profiles?.email}
                      <span className="text-white/20">•</span>
                      {preview.jours} derniers jours
                    </div>

                    {/* Habitudes */}
                    <div>
                      <h3 className="text-[#F5F5F3] font-semibold text-sm flex items-center gap-2 mb-3">
                        <CheckSquare size={16} className="text-[#FF6B2B]" />
                        Habitudes
                        <Variation val={preview.data.comparaison?.habitudes} suffix="%" />
                      </h3>
                      <div className="bg-[#2A2A2A] rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/40 text-xs">Taux de complétion</span>
                          <span className="text-[#F5F5F3] font-bold">{preview.data.tauxHabitudes}%</span>
                        </div>
                        <div className="h-2 bg-[#0D0D0D] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${preview.data.tauxHabitudes}%`,
                              backgroundColor: coachInfo?.couleur_primaire || '#FF6B2B'
                            }}
                          />
                        </div>
                        <div className="mt-2 space-y-1">
                          {preview.data.habitudes.map(h => (
                            <p key={h.id} className="text-white/30 text-xs">• {h.nom}</p>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Objectifs */}
                    <div>
                      <h3 className="text-[#F5F5F3] font-semibold text-sm flex items-center gap-2 mb-3">
                        <Target size={16} className="text-[#FF6B2B]" />
                        Objectifs
                      </h3>
                      {preview.data.objectifs.length === 0 ? (
                        <p className="text-white/20 text-xs">Aucun objectif actif</p>
                      ) : (
                        <div className="space-y-2">
                          {preview.data.objectifs.map(o => (
                            <div key={o.id} className="bg-[#2A2A2A] rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[#F5F5F3] text-sm">{o.titre}</span>
                                <span className="text-white/50 text-xs font-medium">{o.score}%</span>
                              </div>
                              <div className="h-1.5 bg-[#0D0D0D] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${o.score}%`,
                                    backgroundColor: coachInfo?.couleur_primaire || '#FF6B2B'
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Sommeil */}
                    <div>
                      <h3 className="text-[#F5F5F3] font-semibold text-sm flex items-center gap-2 mb-3">
                        <Moon size={16} className="text-[#FF6B2B]" />
                        Sommeil
                        <Variation val={preview.data.comparaison?.sommeil} suffix="h" />
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#2A2A2A] rounded-lg p-3">
                          <p className="text-white/40 text-xs">Moyenne</p>
                          <p className="text-[#F5F5F3] text-lg font-bold mt-1">{preview.data.moyenneSommeil}h</p>
                        </div>
                        <div className="bg-[#2A2A2A] rounded-lg p-3">
                          <p className="text-white/40 text-xs">Qualité</p>
                          <p className="text-[#F5F5F3] text-lg font-bold mt-1">{preview.data.moyenneQualite}/5</p>
                        </div>
                      </div>
                    </div>

                    {/* Humeur */}
                    <div>
                      <h3 className="text-[#F5F5F3] font-semibold text-sm flex items-center gap-2 mb-3">
                        <Smile size={16} className="text-[#FF6B2B]" />
                        Humeur
                        <Variation val={preview.data.comparaison?.humeur} />
                      </h3>
                      <div className="bg-[#2A2A2A] rounded-lg p-3">
                        <p className="text-white/40 text-xs">Score moyen</p>
                        <p className="text-[#F5F5F3] text-lg font-bold mt-1">{preview.data.moyenneHumeur}/10</p>
                      </div>
                    </div>

                    {/* Commentaire */}
                    {commentaire.trim() && (
                      <div className="bg-[#2A2A2A] border-l-2 rounded-lg p-4" style={{ borderColor: coachInfo?.couleur_primaire || '#FF6B2B' }}>
                        <p className="text-white/40 text-xs mb-1 font-semibold">Commentaire du coach</p>
                        <p className="text-[#F5F5F3] text-sm whitespace-pre-wrap">{commentaire}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="p-5 border-t border-white/[0.06] flex gap-3">
                <button
                  onClick={telechargerPDF}
                  className="flex items-center gap-2 bg-[#FF6B2B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e55e24] transition-colors"
                >
                  <Download size={16} />
                  Télécharger PDF
                </button>
                <button
                  onClick={genererPreview}
                  className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  Rafraîchir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
