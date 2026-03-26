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

  // ── Générer et télécharger le PDF — Premium Fitness Editorial ──
  const telechargerPDF = async () => {
    if (!preview) return

    const { default: jsPDF } = await import('jspdf')

    const doc = new jsPDF('p', 'mm', 'a4')
    const nomApp = coachInfo?.nom_app || 'Zevo'
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const M = 22 // marge généreuse

    // ── Palette Premium ──
    const ANTHRACITE = [24, 24, 27]      // #18181B
    const GREY_MED = [113, 113, 122]     // #71717A
    const GREY_LIGHT = [228, 228, 231]   // #E4E4E7
    const GREY_BG = [250, 250, 250]      // #FAFAFA
    const ACCENT = [255, 107, 43]        // #FF6B2B
    const WHITE = [255, 255, 255]

    const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    const typeLabel = TYPES_RAPPORT.find(t => t.id === preview.type)?.label?.toUpperCase() || 'RAPPORT'

    // ── Helper : ensure page space ──
    const ensureSpace = (needed) => {
      if (y > pageH - needed) { doc.addPage(); y = 22 }
    }

    // ── Helper : barre de progression fine ──
    const drawBar = (x, yPos, w, pct, h = 3) => {
      doc.setFillColor(...GREY_LIGHT)
      doc.roundedRect(x, yPos, w, h, h / 2, h / 2, 'F')
      if (pct > 0) {
        doc.setFillColor(...ACCENT)
        doc.roundedRect(x, yPos, Math.max(w * Math.min(pct, 100) / 100, h), h, h / 2, h / 2, 'F')
      }
    }

    // ── Helper : section header (majuscules, tracking large, filet) ──
    const drawSection = (title, yPos) => {
      ensureSpace(30)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...GREY_MED)
      doc.text(title.toUpperCase(), M, yPos)
      doc.setDrawColor(...GREY_LIGHT)
      doc.setLineWidth(0.3)
      doc.line(M, yPos + 2, pageW - M, yPos + 2)
      return yPos + 10
    }

    // ── Helper : KPI card minimaliste ──
    const drawKPI = (x, yPos, w, h, value, label, unit = '') => {
      // Fond ultra-léger + bordure fine
      doc.setFillColor(...GREY_BG)
      doc.setDrawColor(...GREY_LIGHT)
      doc.setLineWidth(0.25)
      doc.roundedRect(x, yPos, w, h, 2.5, 2.5, 'FD')

      // Valeur grande en orange
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...ACCENT)
      const valText = `${value}`
      doc.text(valText, x + w / 2, yPos + h / 2 - 2, { align: 'center' })

      // Unité à droite de la valeur
      if (unit) {
        const valW = doc.getTextWidth(valText)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...GREY_MED)
        doc.text(unit, x + w / 2 + valW / 2 + 1.5, yPos + h / 2 - 2)
      }

      // Label en dessous
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GREY_MED)
      doc.text(label.toUpperCase(), x + w / 2, yPos + h / 2 + 6.5, { align: 'center' })
    }

    // ── Helper : variation ──
    const drawDelta = (x, yPos, val, suffix = '') => {
      if (val === null || val === undefined) return
      const n = parseFloat(val)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(n >= 0 ? 34 : 220, n >= 0 ? 139 : 53, n >= 0 ? 34 : 69)
      doc.text(`${n >= 0 ? '\u25B2' : '\u25BC'} ${n >= 0 ? '+' : ''}${val}${suffix}`, x, yPos)
    }

    let y = 0

    // ══════════════════════════════════════
    // HEADER — Logo / Titre / Date / Filet
    // ══════════════════════════════════════

    let logoImg = null
    if (coachInfo?.logo_url) {
      try {
        const response = await fetch(coachInfo.logo_url)
        const blob = await response.blob()
        const reader = new FileReader()
        logoImg = await new Promise((resolve) => { reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob) })
      } catch { /* continue sans logo */ }
    }

    y = 18
    // Logo ou nom de l'app (aligné à gauche)
    if (logoImg) {
      try { doc.addImage(logoImg, 'PNG', M, y - 5, 0, 10); } catch {
        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...ACCENT); doc.text(nomApp.toUpperCase(), M, y)
      }
    } else {
      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...ACCENT); doc.text(nomApp.toUpperCase(), M, y)
    }

    // Date (alignée à droite)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY_MED)
    doc.text(dateStr, pageW - M, y, { align: 'right' })
    y += 6

    // Filet fin
    doc.setDrawColor(...GREY_LIGHT); doc.setLineWidth(0.4)
    doc.line(M, y, pageW - M, y)
    y += 10

    // Titre du rapport — majuscules, large, tracking
    doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...ANTHRACITE)
    doc.text(typeLabel, M, y)
    y += 5
    // Sous-titre
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY_MED)
    doc.text(preview.type === 'financier' ? 'Synthese financiere' : `Synthese de progression`, M, y)
    y += 12

    // ══════════════════════════════════════
    // BODY
    // ══════════════════════════════════════

    if (preview.type === 'financier') {
      y = drawSection('Indicateurs financiers', y)
      const d = preview.data
      const cw = (pageW - M * 2 - 8) / 2
      drawKPI(M, y, cw, 34, d.nbClients, 'Clients actifs')
      drawKPI(M + cw + 8, y, cw, 34, `${d.caMois.toFixed(0)}`, 'CA du mois', '\u20AC')
      y += 42
      drawKPI(M, y, cw, 34, d.nbPaiements, 'Paiements ce mois')
      drawKPI(M + cw + 8, y, cw, 34, d.totalPaiements, 'Total paiements')
      y += 42
    } else {
      const nomClient = preview.client?.profiles?.nom || preview.client?.profiles?.email || 'Client'
      const d = preview.data

      // Bandeau client
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY_MED)
      doc.text(`${nomClient}`, M, y)
      doc.setFontSize(8)
      doc.text(`  \u2014  ${preview.jours} derniers jours`, M + doc.getTextWidth(`${nomClient}  `), y)
      y += 12

      // ── KPI Grid (4 colonnes) ──
      const gap = 6
      const cw = (pageW - M * 2 - gap * 3) / 4
      drawKPI(M, y, cw, 36, `${d.tauxHabitudes}`, 'Habitudes', '%')
      drawKPI(M + cw + gap, y, cw, 36, `${d.moyenneSommeil}`, 'Sommeil', 'h')
      drawKPI(M + (cw + gap) * 2, y, cw, 36, `${d.moyenneQualite}`, 'Qualite', '/5')
      drawKPI(M + (cw + gap) * 3, y, cw, 36, `${d.moyenneHumeur}`, 'Humeur', '/10')
      y += 42

      // Variations (mensuel)
      if (d.comparaison) {
        drawDelta(M + cw / 2 - 6, y, d.comparaison.habitudes, '%')
        if (d.comparaison.sommeil) drawDelta(M + cw + gap + cw / 2 - 6, y, d.comparaison.sommeil, 'h')
        if (d.comparaison.humeur) drawDelta(M + (cw + gap) * 3 + cw / 2 - 6, y, d.comparaison.humeur)
        y += 8
      }

      // ── HABITUDES ──
      y = drawSection('Habitudes', y)
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...ANTHRACITE)
      doc.text(`Taux de completion`, M, y)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...ACCENT)
      doc.text(`${d.tauxHabitudes}%`, M + doc.getTextWidth('Taux de completion  '), y)
      y += 5
      drawBar(M, y, pageW - M * 2, d.tauxHabitudes, 3)
      y += 9

      d.habitudes.forEach(h => {
        ensureSpace(8)
        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...ANTHRACITE)
        doc.text(`\u2022  ${h.nom}`, M + 4, y)
        y += 5
      })
      y += 6

      // ── OBJECTIFS ──
      y = drawSection('Objectifs', y)
      if (d.objectifs.length === 0) {
        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY_MED)
        doc.text('Aucun objectif actif', M, y)
        y += 8
      } else {
        d.objectifs.forEach(o => {
          ensureSpace(14)
          // Titre + score aligné à droite
          doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...ANTHRACITE)
          doc.text(o.titre, M, y)
          doc.setFont('helvetica', 'bold'); doc.setTextColor(...ACCENT)
          doc.text(`${o.score || 0}%`, pageW - M, y, { align: 'right' })
          y += 4.5
          drawBar(M, y, pageW - M * 2, o.score || 0, 2.5)
          y += 8
        })
      }
      y += 4

      // ── SOMMEIL ──
      y = drawSection('Sommeil', y)
      const halfW = (pageW - M * 2 - 8) / 2
      drawKPI(M, y, halfW, 28, `${d.moyenneSommeil}`, 'Moyenne / nuit', 'h')
      drawKPI(M + halfW + 8, y, halfW, 28, `${d.moyenneQualite}`, 'Qualite moyenne', '/5')
      y += 36

      // ── HUMEUR ──
      y = drawSection('Humeur', y)
      drawKPI(M, y, halfW, 28, `${d.moyenneHumeur}`, 'Score moyen', '/10')
      y += 36

      // ── COMMENTAIRE ──
      if (commentaire.trim()) {
        ensureSpace(40)
        y = drawSection('Mot du coach', y)

        // Bande latérale orange + fond léger
        const lines = doc.splitTextToSize(commentaire, pageW - M * 2 - 14)
        const blockH = lines.length * 4.5 + 6

        doc.setFillColor(255, 107, 43); doc.setGState(new doc.GState({ opacity: 0.06 }))
        doc.roundedRect(M, y - 2, pageW - M * 2, blockH, 2, 2, 'F')
        doc.setGState(new doc.GState({ opacity: 1 }))

        // Barre latérale orange
        doc.setFillColor(...ACCENT)
        doc.roundedRect(M, y - 2, 1.8, blockH, 0.9, 0.9, 'F')

        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...ANTHRACITE)
        doc.text(lines, M + 8, y + 3)
        y += blockH + 6
      }
    }

    // ══════════════════════════════════════
    // FOOTER — Filet + mentions discrètes
    // ══════════════════════════════════════
    doc.setDrawColor(...GREY_LIGHT); doc.setLineWidth(0.25)
    doc.line(M, pageH - 18, pageW - M, pageH - 18)

    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY_MED)
    doc.text(nomApp, M, pageH - 12)
    doc.text(`Genere le ${dateStr}`, M, pageH - 8)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...ACCENT)
    doc.text('CONFIDENTIEL', pageW - M, pageH - 10, { align: 'right' })

    // ── Télécharger ──
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
            <div className="bg-white rounded-xl overflow-hidden border border-[#E4E4E7] shadow-sm">
              {/* ── Header éditorial (fond blanc) ── */}
              <div className="px-6 pt-6 pb-4 border-b border-[#E4E4E7]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#FF6B2B] text-xs font-bold tracking-widest uppercase">
                    {coachInfo?.nom_app || 'Zevo'}
                  </span>
                  <span className="text-[#71717A] text-[10px]">
                    {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <h2 className="text-[#18181B] text-lg font-bold tracking-tight">
                  {TYPES_RAPPORT.find(t => t.id === preview.type)?.label?.toUpperCase()}
                </h2>
                <p className="text-[#71717A] text-xs mt-0.5">
                  {preview.type === 'financier' ? 'Synthèse financière' : 'Synthèse de progression'}
                </p>
              </div>

              <div className="p-6 space-y-6 bg-white">
                {preview.type === 'financier' ? (
                  /* ── Preview financier ── */
                  <>
                    <p className="text-[#71717A] text-[10px] font-semibold tracking-widest uppercase">Indicateurs financiers</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'CLIENTS ACTIFS', val: preview.data.nbClients },
                        { label: 'CA DU MOIS', val: `${preview.data.caMois.toFixed(0)} €` },
                        { label: 'PAIEMENTS CE MOIS', val: preview.data.nbPaiements },
                        { label: 'TOTAL PAIEMENTS', val: preview.data.totalPaiements },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg p-4">
                          <p className="text-[#71717A] text-[9px] tracking-wider font-medium">{label}</p>
                          <p className="text-[#FF6B2B] text-2xl font-bold mt-1 tabular-nums">{val}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  /* ── Preview client ── */
                  <>
                    <div className="flex items-center gap-2 text-[#71717A] text-xs">
                      <User size={13} />
                      <span className="text-[#18181B] font-medium">{preview.client?.profiles?.nom || preview.client?.profiles?.email}</span>
                      <span className="text-[#D4D4D8]">—</span>
                      {preview.jours} derniers jours
                    </div>

                    {/* KPIs grid */}
                    <div className="grid grid-cols-4 gap-2.5">
                      {[
                        { label: 'HABITUDES', val: `${preview.data.tauxHabitudes}%`, delta: preview.data.comparaison?.habitudes, deltaSuffix: '%' },
                        { label: 'SOMMEIL', val: `${preview.data.moyenneSommeil}h`, delta: preview.data.comparaison?.sommeil, deltaSuffix: 'h' },
                        { label: 'QUALITÉ', val: `${preview.data.moyenneQualite}/5` },
                        { label: 'HUMEUR', val: `${preview.data.moyenneHumeur}/10`, delta: preview.data.comparaison?.humeur },
                      ].map(k => (
                        <div key={k.label} className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg p-3 text-center">
                          <p className="text-[#FF6B2B] text-xl font-bold tabular-nums">{k.val}</p>
                          <p className="text-[#71717A] text-[8px] tracking-wider font-medium mt-1">{k.label}</p>
                          {k.delta !== undefined && k.delta !== null && (
                            <p className={`text-[9px] font-bold mt-0.5 ${parseFloat(k.delta) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {parseFloat(k.delta) >= 0 ? '+' : ''}{k.delta}{k.deltaSuffix || ''}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Habitudes */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[#71717A] text-[10px] font-semibold tracking-widest uppercase">Habitudes</p>
                        <span className="text-[#FF6B2B] text-sm font-bold tabular-nums">{preview.data.tauxHabitudes}%</span>
                      </div>
                      <div className="h-[6px] bg-[#F4F4F5] rounded-full overflow-hidden mb-3">
                        <div className="h-full rounded-full bg-[#FF6B2B] transition-all" style={{ width: `${preview.data.tauxHabitudes}%` }} />
                      </div>
                      <div className="space-y-1">
                        {preview.data.habitudes.map(h => (
                          <p key={h.id} className="text-[#71717A] text-[11px]">• {h.nom}</p>
                        ))}
                      </div>
                    </div>

                    {/* Objectifs */}
                    <div>
                      <p className="text-[#71717A] text-[10px] font-semibold tracking-widest uppercase mb-3">Objectifs</p>
                      {preview.data.objectifs.length === 0 ? (
                        <p className="text-[#A1A1AA] text-xs italic">Aucun objectif actif</p>
                      ) : (
                        <div className="space-y-3">
                          {preview.data.objectifs.map(o => (
                            <div key={o.id}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[#18181B] text-xs font-medium">{o.titre}</span>
                                <span className="text-[#FF6B2B] text-xs font-bold tabular-nums">{o.score || 0}%</span>
                              </div>
                              <div className="h-[5px] bg-[#F4F4F5] rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#FF6B2B]" style={{ width: `${o.score || 0}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Sommeil */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-[#71717A] text-[10px] font-semibold tracking-widest uppercase">Sommeil</p>
                        <Variation val={preview.data.comparaison?.sommeil} suffix="h" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg p-3">
                          <p className="text-[#71717A] text-[9px] tracking-wider font-medium">MOYENNE</p>
                          <p className="text-[#FF6B2B] text-xl font-bold mt-1">{preview.data.moyenneSommeil}h</p>
                        </div>
                        <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg p-3">
                          <p className="text-[#71717A] text-[9px] tracking-wider font-medium">QUALITÉ</p>
                          <p className="text-[#FF6B2B] text-xl font-bold mt-1">{preview.data.moyenneQualite}/5</p>
                        </div>
                      </div>
                    </div>

                    {/* Humeur */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-[#71717A] text-[10px] font-semibold tracking-widest uppercase">Humeur</p>
                        <Variation val={preview.data.comparaison?.humeur} />
                      </div>
                      <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg p-3">
                        <p className="text-[#71717A] text-[9px] tracking-wider font-medium">SCORE MOYEN</p>
                        <p className="text-[#FF6B2B] text-xl font-bold mt-1">{preview.data.moyenneHumeur}/10</p>
                      </div>
                    </div>

                    {/* Commentaire */}
                    {commentaire.trim() && (
                      <div className="border-l-[3px] border-[#FF6B2B] bg-[#FFF7ED] rounded-r-lg p-4">
                        <p className="text-[#71717A] text-[9px] font-semibold tracking-wider uppercase mb-1">Mot du coach</p>
                        <p className="text-[#18181B] text-sm leading-relaxed whitespace-pre-wrap">{commentaire}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 py-4 border-t border-[#E4E4E7] bg-[#FAFAFA] flex gap-3">
                <button
                  onClick={telechargerPDF}
                  className="flex items-center gap-2 bg-[#FF6B2B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e55e24] transition-colors"
                >
                  <Download size={16} />
                  Télécharger PDF
                </button>
                <button
                  onClick={genererPreview}
                  className="px-4 py-2.5 rounded-xl text-sm text-[#71717A] hover:text-[#18181B] hover:bg-[#E4E4E7] transition-colors"
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
