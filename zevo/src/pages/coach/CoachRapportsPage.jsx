import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  FileText, Download, Calendar, User,
  BarChart3, TrendingUp, Target, CheckSquare, Dumbbell, Scale
} from 'lucide-react'

// ── Helpers ──
function calcProgress(depart, actuelle, cible) {
  if (depart == null || cible == null) return 0
  const current = actuelle ?? depart
  const totalDelta = cible - depart
  if (totalDelta === 0) return current === cible ? 100 : 0
  const currentDelta = current - depart
  return Math.max(0, Math.min(100, Math.round((currentDelta / totalDelta) * 100)))
}

// ── Types de rapports ──
const TYPES_RAPPORT = [
  {
    id: 'hebdomadaire',
    label: 'Rapport hebdomadaire',
    description: 'Habitudes, séances, poids — 7 derniers jours',
    icon: Calendar,
  },
  {
    id: 'mensuel',
    label: 'Rapport mensuel',
    description: 'Progression complète sur 30 jours + comparaison',
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

  const [typeRapport, setTypeRapport] = useState('hebdomadaire')
  const [clientId, setClientId] = useState('')
  const [commentaire, setCommentaire] = useState('')

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const [preview, setPreview] = useState(null)
  const [coachInfo, setCoachInfo] = useState(null)

  // ── Charger les clients et infos coach ──
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [{ data: cl }, { data: coach }] = await Promise.all([
        supabase.from('clients').select('id, actif, profiles(nom, email)').eq('coach_id', user.id).eq('actif', true),
        supabase.from('coaches').select('nom_app, logo_url, couleur_primaire').eq('id', user.id).maybeSingle(),
      ])
      setClients(cl || [])
      setCoachInfo(coach)
      if (cl?.length > 0) setClientId(cl[0].id)
      setLoading(false)
    }
    load()
  }, [user])

  // ══════════════════════════════════════
  // DATA FETCHING — vraies données Supabase
  // ══════════════════════════════════════

  const chargerDonneesClient = async (cId, jours) => {
    const now = new Date()
    const dateDebut = new Date(now)
    dateDebut.setDate(dateDebut.getDate() - jours)
    const dateStr = dateDebut.toISOString().split('T')[0]
    const todayStr = now.toISOString().split('T')[0]

    // Période précédente (pour comparaison mensuelle)
    const datePrev = new Date(dateDebut)
    datePrev.setDate(datePrev.getDate() - jours)
    const datePrevStr = datePrev.toISOString().split('T')[0]

    // ── Fetch toutes les données en parallèle ──
    const [habitudes, logs, objectifs, seances, poids, prevLogsRes, prevSeancesRes] = await Promise.all([
      supabase.from('habitudes').select('id, nom, icone').eq('client_id', cId).eq('actif', true),
      supabase.from('habitudes_log').select('habitude_id, date, complete').eq('client_id', cId).gte('date', dateStr),
      supabase.from('objectifs').select('*').eq('client_id', cId).order('created_at', { ascending: false }),
      supabase.from('seances').select('id, titre, date_prevue, is_completed, is_template').eq('client_id', cId).eq('is_template', false).gte('date_prevue', dateStr).lte('date_prevue', todayStr).order('date_prevue'),
      supabase.from('suivi_poids').select('poids, date_pesee').eq('client_id', cId).order('date_pesee', { ascending: true }),
      // Données période précédente
      jours === 30
        ? supabase.from('habitudes_log').select('habitude_id, date, complete').eq('client_id', cId).gte('date', datePrevStr).lt('date', dateStr)
        : Promise.resolve({ data: null }),
      jours === 30
        ? supabase.from('seances').select('id, is_completed, is_template').eq('client_id', cId).eq('is_template', false).gte('date_prevue', datePrevStr).lt('date_prevue', dateStr)
        : Promise.resolve({ data: null }),
    ])

    const habData = habitudes.data || []
    const logData = logs.data || []
    const seanceData = seances.data || []
    const poidsData = poids.data || []
    const objData = (objectifs.data || []).filter(o => !o.archive)

    // ── Calculs Habitudes ──
    const nbHabitudes = habData.length
    const nbLogsComplets = logData.filter(l => l.complete).length
    const tauxHabitudes = nbHabitudes > 0 ? Math.round((nbLogsComplets / (nbHabitudes * jours)) * 100) : 0

    // Taux par habitude individuelle
    const habitudesDetail = habData.map(h => {
      const logsH = logData.filter(l => l.habitude_id === h.id && l.complete)
      const taux = Math.round((logsH.length / jours) * 100)
      return { ...h, taux, nbComplete: logsH.length, nbJours: jours }
    })

    // ── Calculs Séances ──
    const seancesTotal = seanceData.length
    const seancesCompleted = seanceData.filter(s => s.is_completed).length
    const tauxSeances = seancesTotal > 0 ? Math.round((seancesCompleted / seancesTotal) * 100) : 0

    // ── Calculs Poids ──
    // Filtrer les pesées de la période
    const poidsInPeriod = poidsData.filter(p => p.date_pesee >= dateStr)
    const premierPoids = poidsInPeriod.length > 0 ? poidsInPeriod[0] : (poidsData.length > 0 ? poidsData[poidsData.length - 1] : null)
    const dernierPoids = poidsInPeriod.length > 0 ? poidsInPeriod[poidsInPeriod.length - 1] : premierPoids
    const deltaPoids = (premierPoids && dernierPoids) ? (dernierPoids.poids - premierPoids.poids).toFixed(1) : null

    // Objectif poids
    const objPoids = objData.find(o => o.type_objectif === 'poids' && o.statut === 'en_cours')

    // ── Calculs Objectifs (hors poids, pour section dédiée) ──
    const objectifsDetail = objData.map(o => ({
      ...o,
      progression: calcProgress(o.valeur_depart, o.valeur_actuelle, o.valeur_cible),
    }))

    // ── Comparaison mois précédent ──
    let comparaison = null
    if (jours === 30) {
      const prevLogs = prevLogsRes.data || []
      const prevSeances = prevSeancesRes.data || []

      const prevTaux = nbHabitudes > 0 ? Math.round(((prevLogs.filter(l => l.complete).length) / (nbHabitudes * jours)) * 100) : 0
      const prevSeancesTotal = prevSeances.length
      const prevSeancesCompleted = prevSeances.filter(s => s.is_completed).length
      const prevTauxSeances = prevSeancesTotal > 0 ? Math.round((prevSeancesCompleted / prevSeancesTotal) * 100) : 0

      comparaison = {
        habitudes: tauxHabitudes - prevTaux,
        seances: tauxSeances - prevTauxSeances,
      }
    }

    return {
      habitudesDetail,
      tauxHabitudes,
      seanceData,
      seancesTotal,
      seancesCompleted,
      tauxSeances,
      deltaPoids,
      poidsActuel: dernierPoids?.poids ?? null,
      poidsDepart: premierPoids?.poids ?? null,
      poidsData: poidsInPeriod,
      allPoidsData: poidsData,
      objPoids,
      objectifsDetail,
      comparaison,
    }
  }

  // ── Données financières ──
  const chargerDonneesFinancieres = async () => {
    const { count: nbClients } = await supabase
      .from('clients').select('*', { count: 'exact', head: true }).eq('coach_id', user.id).eq('actif', true)

    let paiements = []
    try {
      const { data } = await supabase.from('paiements_clients').select('*').eq('coach_id', user.id).eq('statut', 'paye')
      paiements = data || []
    } catch { /* table pas encore créée */ }

    const moisCourant = new Date().toISOString().slice(0, 7)
    const paiementsMois = paiements.filter(p => p.date_paiement?.startsWith(moisCourant))
    const caMois = paiementsMois.reduce((s, p) => s + (p.montant || 0), 0) / 100

    return { nbClients: nbClients || 0, caMois, nbPaiements: paiementsMois.length, totalPaiements: paiements.length }
  }

  // ── Générer la prévisualisation ──
  const genererPreview = async () => {
    if (typeRapport === 'financier') {
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

    setPreview({ type: typeRapport, client, data, jours, commentaire })
    setGenerating(false)
  }

  // ══════════════════════════════════════
  // PDF GENERATION — Premium Fitness Editorial
  // ══════════════════════════════════════

  const telechargerPDF = async () => {
    if (!preview) return
    const { default: jsPDF } = await import('jspdf')

    const doc = new jsPDF('p', 'mm', 'a4')
    const nomApp = coachInfo?.nom_app || 'Zevo'
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const M = 22

    // Palette
    const INK = [24, 24, 27]
    const MED = [113, 113, 122]
    const LT = [228, 228, 231]
    const BG = [250, 250, 250]
    const OG = [255, 107, 43]

    const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    const typeLabel = TYPES_RAPPORT.find(t => t.id === preview.type)?.label?.toUpperCase() || 'RAPPORT'

    let y = 0
    // Marge basse : on garde 24mm pour le footer
    const FOOTER_H = 24
    const ensureSpace = (n) => { if (y > pageH - FOOTER_H - n) { doc.addPage(); y = 22 } }

    // ── Helpers ──
    const drawBar = (x, yp, w, pct, h = 3) => {
      doc.setFillColor(...LT); doc.roundedRect(x, yp, w, h, h / 2, h / 2, 'F')
      if (pct > 0) { doc.setFillColor(...OG); doc.roundedRect(x, yp, Math.max(w * Math.min(pct, 100) / 100, h), h, h / 2, h / 2, 'F') }
    }

    const drawSection = (title, yp) => {
      ensureSpace(18)
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...MED)
      doc.text(title.toUpperCase(), M, yp)
      doc.setDrawColor(...LT); doc.setLineWidth(0.3); doc.line(M, yp + 2, pageW - M, yp + 2)
      return yp + 8
    }

    const drawKPI = (x, yp, w, h, value, label, unit = '') => {
      doc.setFillColor(...BG); doc.setDrawColor(...LT); doc.setLineWidth(0.25)
      doc.roundedRect(x, yp, w, h, 2.5, 2.5, 'FD')
      doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(...OG)
      const vt = `${value}`
      // Mesurer la largeur du texte AVANT de changer de taille de police
      const vtWidth = doc.getTextWidth(vt)
      doc.text(vt, x + w / 2, yp + h / 2 - 2, { align: 'center' })
      if (unit) {
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MED)
        doc.text(unit, x + w / 2 + vtWidth / 2 + 2, yp + h / 2 - 2)
      }
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MED)
      doc.text(label.toUpperCase(), x + w / 2, yp + h / 2 + 6.5, { align: 'center' })
    }

    const drawDelta = (x, yp, val, suffix = '') => {
      if (val == null) return
      const n = parseFloat(val)
      doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
      doc.setTextColor(n >= 0 ? 34 : 220, n >= 0 ? 139 : 53, n >= 0 ? 34 : 69)
      doc.text(`${n >= 0 ? '+' : ''}${val}${suffix}`, x, yp)
    }

    // ══════════ HEADER ══════════
    let logoImg = null
    if (coachInfo?.logo_url) {
      try {
        const r = await fetch(coachInfo.logo_url); const b = await r.blob(); const rd = new FileReader()
        logoImg = await new Promise((res) => { rd.onload = () => res(rd.result); rd.readAsDataURL(b) })
      } catch {}
    }

    y = 18
    if (logoImg) { try { doc.addImage(logoImg, 'PNG', M, y - 5, 0, 10) } catch { doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...OG); doc.text(nomApp.toUpperCase(), M, y) } }
    else { doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...OG); doc.text(nomApp.toUpperCase(), M, y) }

    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MED)
    doc.text(dateStr, pageW - M, y, { align: 'right' })
    y += 6
    doc.setDrawColor(...LT); doc.setLineWidth(0.4); doc.line(M, y, pageW - M, y)
    y += 10

    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...INK)
    doc.text(typeLabel, M, y); y += 5
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MED)
    doc.text(preview.type === 'financier' ? 'Synthese financiere' : 'Synthese de progression', M, y)
    y += 10

    // ══════════ BODY ══════════

    if (preview.type === 'financier') {
      y = drawSection('Indicateurs financiers', y)
      const d = preview.data; const cw = (pageW - M * 2 - 8) / 2
      drawKPI(M, y, cw, 34, d.nbClients, 'Clients actifs'); drawKPI(M + cw + 8, y, cw, 34, `${d.caMois.toFixed(0)}`, 'CA du mois', '\u20AC'); y += 42
      drawKPI(M, y, cw, 34, d.nbPaiements, 'Paiements ce mois'); drawKPI(M + cw + 8, y, cw, 34, d.totalPaiements, 'Total paiements'); y += 42
    } else {
      const nom = preview.client?.profiles?.nom || preview.client?.profiles?.email || 'Client'
      const d = preview.data

      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MED)
      doc.text(`${nom}  \u2014  ${preview.jours} derniers jours`, M, y); y += 12

      // ── 3 KPIs principaux ──
      const gap = 6; const cw = (pageW - M * 2 - gap * 2) / 3
      drawKPI(M, y, cw, 34, `${d.tauxHabitudes}`, 'Habitudes', '%')
      drawKPI(M + cw + gap, y, cw, 34, `${d.seancesCompleted}/${d.seancesTotal}`, 'Seances')
      const poidsLabel = d.deltaPoids !== null ? `${parseFloat(d.deltaPoids) > 0 ? '+' : ''}${d.deltaPoids}` : '--'
      drawKPI(M + (cw + gap) * 2, y, cw, 34, poidsLabel, 'Evol. poids', d.deltaPoids !== null ? 'kg' : '')
      y += 40

      // Deltas (mensuel)
      if (d.comparaison) {
        drawDelta(M + cw / 2 - 6, y, d.comparaison.habitudes, '%')
        drawDelta(M + cw + gap + cw / 2 - 6, y, d.comparaison.seances, '%')
        y += 6
      }

      // ── HABITUDES (détail) ──
      y = drawSection('Habitudes', y)
      if (d.habitudesDetail.length === 0) {
        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MED)
        doc.text('Aucune habitude active', M, y); y += 6
      } else {
        d.habitudesDetail.forEach(h => {
          ensureSpace(10)
          doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...INK)
          doc.text(h.nom, M, y)
          doc.setFont('helvetica', 'bold'); doc.setTextColor(...OG)
          doc.text(`${h.taux}%`, pageW - M, y, { align: 'right' })
          y += 3.5
          drawBar(M, y, pageW - M * 2, h.taux, 2)
          y += 5.5
        })
      }
      y += 2

      // ── ENTRAÎNEMENTS ──
      y = drawSection('Entrainements', y)
      if (d.seanceData.length === 0) {
        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MED)
        doc.text('Aucune seance sur cette periode', M, y); y += 6
      } else {
        // Tableau simplifié
        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...MED)
        doc.text('DATE', M, y); doc.text('SEANCE', M + 25, y); doc.text('STATUT', pageW - M, y, { align: 'right' })
        y += 2
        doc.setDrawColor(...LT); doc.setLineWidth(0.2); doc.line(M, y, pageW - M, y)
        y += 4

        d.seanceData.forEach(s => {
          ensureSpace(6)
          const dateS = new Date(s.date_prevue).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
          doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MED)
          doc.text(dateS, M, y)
          doc.setTextColor(...INK)
          const titre = (s.titre || 'Seance').substring(0, 40)
          doc.text(titre, M + 25, y)
          if (s.is_completed) {
            doc.setFont('helvetica', 'bold'); doc.setTextColor(...OG)
            doc.text('Fait', pageW - M, y, { align: 'right' })
          } else {
            doc.setFont('helvetica', 'normal'); doc.setTextColor(180, 180, 180)
            doc.text('Manque', pageW - M, y, { align: 'right' })
          }
          y += 5
        })
      }
      y += 2

      // ── ÉVOLUTION POIDS ──
      if (d.poidsActuel !== null || d.objPoids) {
        y = drawSection('Evolution corporelle', y)
        const halfW = (pageW - M * 2 - 6) / 2

        // Poids actuel + delta
        if (d.poidsActuel !== null) {
          drawKPI(M, y, halfW, 26, `${d.poidsActuel}`, 'Poids actuel', 'kg')
          if (d.deltaPoids !== null) {
            drawKPI(M + halfW + 6, y, halfW, 26, `${parseFloat(d.deltaPoids) > 0 ? '+' : ''}${d.deltaPoids}`, 'Variation', 'kg')
          }
          y += 32
        }

        // Mini courbe de poids (SVG-like avec jsPDF lines)
        if (d.allPoidsData.length >= 2) {
          ensureSpace(28)
          const chartX = M + 12; const chartY = y; const chartW = pageW - M * 2 - 12; const chartH = 20
          const pts = d.allPoidsData.slice(-20) // 20 dernières pesées max
          const minP = Math.min(...pts.map(p => p.poids)) - 0.5
          const maxP = Math.max(...pts.map(p => p.poids)) + 0.5
          const rangeP = maxP - minP || 1

          // Axes légers
          doc.setDrawColor(...LT); doc.setLineWidth(0.15)
          doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH)

          // Labels min/max
          doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MED)
          doc.text(`${maxP.toFixed(1)}`, chartX - 2, chartY + 2, { align: 'right' })
          doc.text(`${minP.toFixed(1)}`, chartX - 2, chartY + chartH, { align: 'right' })

          // Ligne de la courbe
          doc.setDrawColor(...OG); doc.setLineWidth(0.5)
          for (let i = 1; i < pts.length; i++) {
            const x1 = chartX + ((i - 1) / (pts.length - 1)) * chartW
            const y1 = chartY + chartH - ((pts[i - 1].poids - minP) / rangeP) * chartH
            const x2 = chartX + (i / (pts.length - 1)) * chartW
            const y2 = chartY + chartH - ((pts[i].poids - minP) / rangeP) * chartH
            doc.line(x1, y1, x2, y2)
          }

          // Points
          pts.forEach((p, i) => {
            const px = chartX + (i / (pts.length - 1)) * chartW
            const py = chartY + chartH - ((p.poids - minP) / rangeP) * chartH
            doc.setFillColor(...OG); doc.circle(px, py, 0.7, 'F')
          })

          y += chartH + 6
        }

        // Objectif poids — format propre sans caractère unicode
        if (d.objPoids) {
          ensureSpace(12)
          const dep = d.objPoids.valeur_depart != null ? Number(d.objPoids.valeur_depart) : null
          const cib = d.objPoids.valeur_cible != null ? Number(d.objPoids.valeur_cible) : null
          const act = d.objPoids.valeur_actuelle != null ? Number(d.objPoids.valeur_actuelle) : dep
          const pct = calcProgress(dep, act, cib)

          doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...INK)
          const objLabel = dep != null && cib != null
            ? `Depart : ${dep} kg  |  Objectif : ${cib} kg`
            : 'Objectif poids'
          doc.text(objLabel, M, y)
          doc.setFont('helvetica', 'bold'); doc.setTextColor(...OG)
          doc.text(`${pct}%`, pageW - M, y, { align: 'right' })
          y += 4
          drawBar(M, y, pageW - M * 2, pct, 2.5)
          y += 7
        }
      }
      y += 2

      // ── OBJECTIFS (tous) ──
      const autresObj = d.objectifsDetail.filter(o => o.statut === 'en_cours')
      if (autresObj.length > 0) {
        y = drawSection('Objectifs', y)
        autresObj.forEach(o => {
          ensureSpace(11)
          const typeLabel = o.type_objectif === 'poids' ? 'Poids' : o.type_objectif === 'mensuration' ? 'Mensuration' : o.type_objectif === 'performance' ? 'Performance' : 'Objectif'
          const act = o.valeur_actuelle ?? o.valeur_depart
          const cib = o.valeur_cible
          const unite = o.unite || ''

          doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...INK)
          doc.text(o.titre || typeLabel, M, y)
          doc.setFont('helvetica', 'bold'); doc.setTextColor(...OG); doc.setFontSize(8.5)
          doc.text(`${o.progression}%`, pageW - M, y, { align: 'right' })

          // Sous-texte : "Poids - 82 / 75 kg"
          doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MED)
          const subText = act != null && cib != null
            ? `${typeLabel} - ${act} / ${cib} ${unite}`.trim()
            : typeLabel
          doc.text(subText, M, y + 3.5)
          y += 5
          drawBar(M, y, pageW - M * 2, o.progression, 2)
          y += 7
        })
      }
      y += 1

      // ── COMMENTAIRE ──
      if (commentaire.trim()) {
        const lines = doc.splitTextToSize(commentaire, pageW - M * 2 - 14)
        const blockH = lines.length * 4 + 6
        ensureSpace(blockH + 14)
        y = drawSection('Mot du coach', y)
        doc.setFillColor(255, 107, 43); doc.setGState(new doc.GState({ opacity: 0.06 }))
        doc.roundedRect(M, y - 2, pageW - M * 2, blockH, 2, 2, 'F')
        doc.setGState(new doc.GState({ opacity: 1 }))
        doc.setFillColor(...OG); doc.roundedRect(M, y - 2, 1.8, blockH, 0.9, 0.9, 'F')
        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...INK)
        doc.text(lines, M + 8, y + 3)
        y += blockH + 4
      }
    }

    // ══════════ FOOTER (sur toutes les pages) ══════════
    const totalPages = doc.internal.getNumberOfPages()
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p)
      doc.setDrawColor(...LT); doc.setLineWidth(0.25); doc.line(M, pageH - 18, pageW - M, pageH - 18)
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MED)
      doc.text(nomApp, M, pageH - 12)
      doc.text(`Genere le ${dateStr}`, M, pageH - 8)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...OG)
      doc.text('CONFIDENTIEL', pageW - M, pageH - 10, { align: 'right' })
      if (totalPages > 1) {
        doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MED)
        doc.text(`${p}/${totalPages}`, pageW / 2, pageH - 8, { align: 'center' })
      }
    }

    const nomFichier = preview.type === 'financier'
      ? `rapport-financier-${dateStr}.pdf`
      : `rapport-${preview.type}-${preview.client?.profiles?.nom || 'client'}-${dateStr}.pdf`
    doc.save(nomFichier.replace(/\s+/g, '-').toLowerCase())
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
                      typeRapport === t.id ? 'bg-[#FF6B2B]/10 border border-[#FF6B2B]/30' : 'border border-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  >
                    <Icon size={18} className={typeRapport === t.id ? 'text-[#FF6B2B]' : 'text-white/30'} />
                    <div>
                      <p className={`text-sm font-medium ${typeRapport === t.id ? 'text-[#F5F5F3]' : 'text-white/50'}`}>{t.label}</p>
                      <p className="text-white/25 text-xs mt-0.5">{t.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

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
                    <option key={c.id} value={c.id}>{c.profiles?.nom || c.profiles?.email || 'Client'}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {typeRapport !== 'financier' && (
            <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-4">
              <label className="block text-white/50 text-xs mb-2 uppercase tracking-wider font-semibold">Commentaire du coach</label>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Ajoutez un message personnalisé au rapport..."
                rows={3}
                className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-[#F5F5F3] placeholder-white/20 focus:border-[#FF6B2B]/50 focus:outline-none transition-colors resize-none"
              />
            </div>
          )}

          <button
            onClick={genererPreview}
            disabled={generating || (typeRapport !== 'financier' && !clientId)}
            className="w-full flex items-center justify-center gap-2 bg-[#FF6B2B] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating ? 'Chargement des données...' : (<><BarChart3 size={16} /> Générer le rapport</>)}
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
              {/* Header éditorial */}
              <div className="px-6 pt-6 pb-4 border-b border-[#E4E4E7]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#FF6B2B] text-xs font-bold tracking-widest uppercase">{coachInfo?.nom_app || 'Zevo'}</span>
                  <span className="text-[#71717A] text-[10px]">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <h2 className="text-[#18181B] text-lg font-bold tracking-tight">{TYPES_RAPPORT.find(t => t.id === preview.type)?.label?.toUpperCase()}</h2>
                <p className="text-[#71717A] text-xs mt-0.5">{preview.type === 'financier' ? 'Synthèse financière' : 'Synthèse de progression'}</p>
              </div>

              <div className="p-6 space-y-6 bg-white">
                {preview.type === 'financier' ? (
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
                  <>
                    {/* Client info */}
                    <div className="flex items-center gap-2 text-[#71717A] text-xs">
                      <User size={13} />
                      <span className="text-[#18181B] font-medium">{preview.client?.profiles?.nom || preview.client?.profiles?.email}</span>
                      <span className="text-[#D4D4D8]">—</span>
                      {preview.jours} derniers jours
                    </div>

                    {/* 3 KPIs */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1"><CheckSquare size={12} className="text-[#FF6B2B]" /></div>
                        <p className="text-[#FF6B2B] text-xl font-bold tabular-nums">{preview.data.tauxHabitudes}%</p>
                        <p className="text-[#71717A] text-[8px] tracking-wider font-medium mt-0.5">HABITUDES</p>
                        {preview.data.comparaison?.habitudes != null && (
                          <p className={`text-[9px] font-bold mt-0.5 ${preview.data.comparaison.habitudes >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {preview.data.comparaison.habitudes >= 0 ? '+' : ''}{preview.data.comparaison.habitudes}%
                          </p>
                        )}
                      </div>
                      <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1"><Dumbbell size={12} className="text-[#FF6B2B]" /></div>
                        <p className="text-[#FF6B2B] text-xl font-bold tabular-nums">{preview.data.seancesCompleted}/{preview.data.seancesTotal}</p>
                        <p className="text-[#71717A] text-[8px] tracking-wider font-medium mt-0.5">SÉANCES</p>
                        {preview.data.comparaison?.seances != null && (
                          <p className={`text-[9px] font-bold mt-0.5 ${preview.data.comparaison.seances >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {preview.data.comparaison.seances >= 0 ? '+' : ''}{preview.data.comparaison.seances}%
                          </p>
                        )}
                      </div>
                      <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1"><Scale size={12} className="text-[#FF6B2B]" /></div>
                        <p className="text-[#FF6B2B] text-xl font-bold tabular-nums">
                          {preview.data.deltaPoids !== null ? `${parseFloat(preview.data.deltaPoids) > 0 ? '+' : ''}${preview.data.deltaPoids}` : '—'}
                        </p>
                        <p className="text-[#71717A] text-[8px] tracking-wider font-medium mt-0.5">ÉVOL. POIDS (KG)</p>
                      </div>
                    </div>

                    {/* Habitudes détail */}
                    <div>
                      <p className="text-[#71717A] text-[10px] font-semibold tracking-widest uppercase mb-3">Habitudes</p>
                      {preview.data.habitudesDetail.length === 0 ? (
                        <p className="text-[#A1A1AA] text-xs italic">Aucune habitude active</p>
                      ) : (
                        <div className="space-y-2.5">
                          {preview.data.habitudesDetail.map(h => (
                            <div key={h.id}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[#18181B] text-xs font-medium">{h.nom}</span>
                                <span className="text-[#FF6B2B] text-xs font-bold tabular-nums">{h.taux}%</span>
                              </div>
                              <div className="h-[5px] bg-[#F4F4F5] rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#FF6B2B]" style={{ width: `${h.taux}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Entraînements */}
                    <div>
                      <p className="text-[#71717A] text-[10px] font-semibold tracking-widest uppercase mb-3">Entraînements</p>
                      {preview.data.seanceData.length === 0 ? (
                        <p className="text-[#A1A1AA] text-xs italic">Aucune séance sur cette période</p>
                      ) : (
                        <div className="border border-[#E4E4E7] rounded-lg overflow-hidden">
                          <div className="grid grid-cols-[60px_1fr_70px] text-[9px] font-semibold text-[#71717A] tracking-wider uppercase bg-[#FAFAFA] px-3 py-2 border-b border-[#E4E4E7]">
                            <span>Date</span><span>Séance</span><span className="text-right">Statut</span>
                          </div>
                          {preview.data.seanceData.map(s => (
                            <div key={s.id} className="grid grid-cols-[60px_1fr_70px] items-center px-3 py-2 border-b border-[#F4F4F5] last:border-0 text-xs">
                              <span className="text-[#71717A] tabular-nums">{new Date(s.date_prevue).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
                              <span className="text-[#18181B] font-medium truncate">{s.titre || 'Séance'}</span>
                              {s.is_completed ? (
                                <span className="text-right text-[#FF6B2B] font-bold text-[10px]">✓ Fait</span>
                              ) : (
                                <span className="text-right text-[#D4D4D8] text-[10px]">— Manqué</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Évolution corporelle */}
                    {(preview.data.poidsActuel !== null || preview.data.objPoids) && (
                      <div>
                        <p className="text-[#71717A] text-[10px] font-semibold tracking-widest uppercase mb-3">Évolution corporelle</p>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          {preview.data.poidsActuel !== null && (
                            <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg p-3">
                              <p className="text-[#71717A] text-[9px] tracking-wider font-medium">POIDS ACTUEL</p>
                              <p className="text-[#FF6B2B] text-xl font-bold mt-1">{preview.data.poidsActuel} kg</p>
                            </div>
                          )}
                          {preview.data.deltaPoids !== null && (
                            <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg p-3">
                              <p className="text-[#71717A] text-[9px] tracking-wider font-medium">VARIATION</p>
                              <p className={`text-xl font-bold mt-1 ${parseFloat(preview.data.deltaPoids) <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {parseFloat(preview.data.deltaPoids) > 0 ? '+' : ''}{preview.data.deltaPoids} kg
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Objectif poids */}
                        {preview.data.objPoids && (() => {
                          const op = preview.data.objPoids
                          const pct = calcProgress(op.valeur_depart, op.valeur_actuelle, op.valeur_cible)
                          return (
                            <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[#18181B] text-xs font-medium">Départ : {op.valeur_depart} kg | Objectif : {op.valeur_cible} kg</span>
                                <span className="text-[#FF6B2B] text-xs font-bold">{pct}%</span>
                              </div>
                              <div className="h-[5px] bg-[#E4E4E7] rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#FF6B2B]" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}

                    {/* Objectifs */}
                    {preview.data.objectifsDetail.filter(o => o.statut === 'en_cours').length > 0 && (
                      <div>
                        <p className="text-[#71717A] text-[10px] font-semibold tracking-widest uppercase mb-3">Objectifs</p>
                        <div className="space-y-3">
                          {preview.data.objectifsDetail.filter(o => o.statut === 'en_cours').map(o => (
                            <div key={o.id}>
                              <div className="flex items-center justify-between mb-1">
                                <div>
                                  <span className="text-[#18181B] text-xs font-medium">{o.titre}</span>
                                  <span className="text-[#A1A1AA] text-[10px] ml-2">{o.valeur_actuelle ?? o.valeur_depart}/{o.valeur_cible} {o.unite || ''}</span>
                                </div>
                                <span className="text-[#FF6B2B] text-xs font-bold tabular-nums">{o.progression}%</span>
                              </div>
                              <div className="h-[5px] bg-[#F4F4F5] rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#FF6B2B]" style={{ width: `${o.progression}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
                <button onClick={telechargerPDF} className="flex items-center gap-2 bg-[#FF6B2B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e55e24] transition-colors">
                  <Download size={16} /> Télécharger PDF
                </button>
                <button onClick={genererPreview} className="px-4 py-2.5 rounded-xl text-sm text-[#71717A] hover:text-[#18181B] hover:bg-[#E4E4E7] transition-colors">
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
