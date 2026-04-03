import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Users, TrendingUp, TrendingDown, Target, Award,
  Calendar, Euro, Activity, Save, ChevronRight,
  BarChart3, PieChart as PieChartIcon, Heart, Zap
} from 'lucide-react'

// ── Periodes de filtre ──
const PERIODES = [
  { id: 'semaine', label: '7j', jours: 7 },
  { id: 'mois', label: '30j', jours: 30 },
  { id: 'trimestre', label: '90j', jours: 90 },
  { id: 'annee', label: '12m', jours: 365 },
]

// Couleurs pour le PieChart
const PIE_COLORS = ['#FF6B2B', '#FF9A6C', '#FFB899', '#FFD5C2']

export default function CoachStatistiquesPage() {
  const { user } = useAuth()
  const [periode, setPeriode] = useState('mois')
  const [loading, setLoading] = useState(true)

  // Donnees brutes
  const [clients, setClients] = useState([])
  const [paiements, setPaiements] = useState([])
  const [bienEtreData, setBienEtreData] = useState([])

  // Objectifs business
  const [objectifs, setObjectifs] = useState({ clients_cible: 20, ca_mensuel_cible: 2000, retention_cible: 85 })
  const [editObjectifs, setEditObjectifs] = useState(false)
  const [savingObj, setSavingObj] = useState(false)

  const joursFiltre = PERIODES.find(p => p.id === periode)?.jours || 30

  // ── Charger toutes les donnees ──
  useEffect(() => {
    if (!user) return
    chargerDonnees()
  }, [user])

  const chargerDonnees = async () => {
    setLoading(true)

    const [clientsRes, coachRes] = await Promise.all([
      supabase
        .from('clients')
        .select('id, actif, created_at, profiles(nom, email)')
        .eq('coach_id', user.id),
      supabase
        .from('coaches')
        .select('objectifs_business')
        .eq('id', user.id)
        .maybeSingle(),
    ])

    const allClients = clientsRes.data || []
    setClients(allClients)

    if (coachRes.data?.objectifs_business) {
      setObjectifs(coachRes.data.objectifs_business)
    }

    // Charger les paiements (table peut ne pas exister)
    try {
      const { data } = await supabase
        .from('paiements_clients')
        .select('*')
        .eq('coach_id', user.id)
      setPaiements(data || [])
    } catch { setPaiements([]) }

    // Charger scores bien-etre moyens sur 30j pour tous les clients actifs
    const activeIds = allClients.filter(c => c.actif).map(c => c.id)
    if (activeIds.length > 0) {
      const date30j = new Date()
      date30j.setDate(date30j.getDate() - 30)
      const dateStr = date30j.toISOString().split('T')[0]

      const { data: humeurLogs } = await supabase
        .from('humeur_log')
        .select('client_id, date, score')
        .in('client_id', activeIds)
        .gte('date', dateStr)
        .order('date')

      // Grouper par date → moyenne
      const parDate = {}
      ;(humeurLogs || []).forEach(l => {
        if (!parDate[l.date]) parDate[l.date] = []
        parDate[l.date].push(l.score)
      })

      const chartData = Object.entries(parDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, scores]) => ({
          date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          score: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length * 10) / 10,
        }))

      setBienEtreData(chartData)
    }

    setLoading(false)
  }

  // ── KPIs calcules ──
  const kpis = useMemo(() => {
    const now = new Date()
    const dateFiltre = new Date()
    dateFiltre.setDate(dateFiltre.getDate() - joursFiltre)

    const clientsActifs = clients.filter(c => c.actif)
    const clientsInactifs = clients.filter(c => !c.actif)
    const nouveaux = clients.filter(c => new Date(c.created_at) >= dateFiltre)

    // Taux de retention : actifs / total
    const tauxRetention = clients.length > 0
      ? Math.round((clientsActifs.length / clients.length) * 100)
      : 100

    // Churn = clients devenus inactifs sur la periode
    const churn = clientsInactifs.length

    // CA et paiements
    const paiementsPeriode = paiements.filter(p =>
      p.statut === 'paye' && new Date(p.date_paiement) >= dateFiltre
    )
    const ca = paiementsPeriode.reduce((s, p) => s + (p.montant || 0), 0) / 100
    const revenuMoyen = clientsActifs.length > 0 ? (ca / clientsActifs.length).toFixed(0) : 0

    // MRR projete (si paiements mensuels)
    const moisCourant = now.toISOString().slice(0, 7)
    const paiementsMois = paiements.filter(p =>
      p.statut === 'paye' && p.date_paiement?.startsWith(moisCourant)
    )
    const mrr = paiementsMois.reduce((s, p) => s + (p.montant || 0), 0) / 100

    return {
      clientsActifs: clientsActifs.length,
      nouveaux: nouveaux.length,
      churn,
      tauxRetention,
      ca,
      revenuMoyen: parseFloat(revenuMoyen),
      mrr,
    }
  }, [clients, paiements, joursFiltre])

  // ── Donnees pour BarChart (nouveaux clients par mois) ──
  const clientsParMois = useMemo(() => {
    const mois = {}
    const now = new Date()
    // 12 derniers mois
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString('fr-FR', { month: 'short' })
      mois[key] = { mois: label, count: 0 }
    }
    clients.forEach(c => {
      const key = c.created_at?.slice(0, 7)
      if (key && mois[key]) mois[key].count++
    })
    return Object.values(mois)
  }, [clients])

  // ── Donnees pour LineChart CA (12 mois) ──
  const caParMois = useMemo(() => {
    const mois = {}
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString('fr-FR', { month: 'short' })
      mois[key] = { mois: label, ca: 0 }
    }
    paiements.filter(p => p.statut === 'paye').forEach(p => {
      const key = p.date_paiement?.slice(0, 7)
      if (key && mois[key]) mois[key].ca += (p.montant || 0) / 100
    })
    return Object.values(mois)
  }, [paiements])

  // ── Donnees PieChart (si on a des offres) ──
  const repartitionCA = useMemo(() => {
    // Grouper par offre_id
    const parOffre = {}
    paiements.filter(p => p.statut === 'paye').forEach(p => {
      const key = p.offre_id || 'direct'
      if (!parOffre[key]) parOffre[key] = { name: key === 'direct' ? 'Paiement direct' : `Offre`, value: 0 }
      parOffre[key].value += (p.montant || 0) / 100
    })
    const result = Object.values(parOffre)
    return result.length > 0 ? result : [{ name: 'Aucun paiement', value: 0 }]
  }, [paiements])

  // ── Sauvegarder les objectifs ──
  const sauvegarderObjectifs = async () => {
    setSavingObj(true)
    await supabase
      .from('coaches')
      .update({ objectifs_business: objectifs })
      .eq('id', user.id)
    setSavingObj(false)
    setEditObjectifs(false)
  }

  // ── Projection texte ──
  const projectionClients = () => {
    if (kpis.clientsActifs >= objectifs.clients_cible) return 'Objectif atteint !'
    const nouveauxParMois = clientsParMois.slice(-3).reduce((s, m) => s + m.count, 0) / 3
    if (nouveauxParMois <= 0) return 'Pas assez de donnees'
    const moisRestants = Math.ceil((objectifs.clients_cible - kpis.clientsActifs) / nouveauxParMois)
    const dateProjection = new Date()
    dateProjection.setMonth(dateProjection.getMonth() + moisRestants)
    return `A ce rythme, objectif atteint en ${dateProjection.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
  }

  // ── Custom tooltip ──
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="glass-card px-3 py-2 text-xs shadow-xl !rounded-lg">
        <p className="text-[var(--text-secondary)] mb-1 relative z-10">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-[var(--text-primary)] font-medium relative z-10">
            {p.name} : {typeof p.value === 'number' && p.name?.includes('CA') ? `${p.value.toFixed(0)}€` : p.value}
          </p>
        ))}
      </div>
    )
  }

  // ══════════════════════════════════════
  // LOADING SKELETON
  // ══════════════════════════════════════
  if (loading) {
    return (
      <div className="p-4 md:p-6 w-full max-w-[1200px] mx-auto">
        {/* Header skeleton */}
        <div className="glass-card p-4 md:p-5 mb-4 md:mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl skel-block" />
              <div>
                <div className="h-5 w-32 skel-block mb-2" />
                <div className="h-3 w-48 skel-block" />
              </div>
            </div>
            <div className="h-8 w-36 skel-block hidden md:block" />
          </div>
        </div>
        {/* KPI skeletons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-4">
              <div className="h-2 w-full skel-block rounded-full mb-4" />
              <div className="flex items-center justify-between mb-3">
                <div className="h-3 w-16 skel-block" />
                <div className="w-10 h-10 rounded-xl skel-block" />
              </div>
              <div className="h-7 w-20 skel-block" />
            </div>
          ))}
        </div>
        {/* Chart skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-4 md:p-5">
              <div className="h-2 w-full skel-block rounded-full mb-4" />
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg skel-block" />
                <div className="h-4 w-36 skel-block" />
              </div>
              <div className="h-[200px] skel-block" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════
  // MAIN RENDER
  // ══════════════════════════════════════
  return (
    <div className="p-4 md:p-6 w-full max-w-[1200px] mx-auto space-y-4 md:space-y-6">

      {/* ── Header + Period Toggle ── */}
      <div className="glass-card p-4 md:p-5">
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E]" />

        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center flex-shrink-0">
              <BarChart3 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-[var(--text-primary)]">Statistiques</h1>
              <p className="text-[var(--text-secondary)] text-xs mt-0.5">Vue d'ensemble de votre activite</p>
            </div>
          </div>

          {/* Period toggle pills */}
          <div className="flex bg-[var(--bg-surface)] rounded-xl p-1 border border-[var(--border-subtle)] self-start md:self-auto">
            {PERIODES.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriode(p.id)}
                className={`px-3 py-2 md:py-1.5 rounded-lg text-xs font-medium transition-all min-w-[40px] ${
                  periode === p.id
                    ? 'bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white shadow-lg shadow-[#FF6B2B]/20'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          label="Clients actifs"
          value={kpis.clientsActifs}
          icon={Users}
          color="#FF6B2B"
          gradientTo="#FF8F5E"
        />
        <KpiCard
          label="Nouveaux"
          value={kpis.nouveaux}
          icon={TrendingUp}
          color="#22c55e"
          gradientTo="#4ade80"
          suffix={`/ ${joursFiltre}j`}
        />
        <KpiCard
          label="Taux retention"
          value={`${kpis.tauxRetention}%`}
          icon={Activity}
          color={kpis.tauxRetention >= 80 ? '#22c55e' : kpis.tauxRetention >= 60 ? '#eab308' : '#ef4444'}
          gradientTo={kpis.tauxRetention >= 80 ? '#4ade80' : kpis.tauxRetention >= 60 ? '#facc15' : '#f87171'}
        />
        <KpiCard
          label="CA periode"
          value={`${kpis.ca.toFixed(0)}€`}
          icon={Euro}
          color="#FF6B2B"
          gradientTo="#FF8F5E"
        />
      </div>

      {/* ── Secondary KPIs Row ── */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <SecondaryKpi label="Churn" value={kpis.churn} dotColor="#ef4444" />
        <SecondaryKpi label="Rev. moyen / client" value={`${kpis.revenuMoyen}€`} dotColor="#FF6B2B" />
        <SecondaryKpi label="MRR projete" value={`${kpis.mrr.toFixed(0)}€`} dotColor="#22c55e" />
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">

        {/* LineChart -- Evolution CA */}
        <ChartCard icon={TrendingUp} title="Evolution CA (12 mois)" accentColor="#FF6B2B">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={caParMois}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-base)" />
              <XAxis dataKey="mois" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="ca" name="CA" stroke="#FF6B2B" strokeWidth={2} dot={{ fill: '#FF6B2B', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* BarChart -- Nouveaux clients par mois */}
        <ChartCard icon={Users} title="Nouveaux clients par mois" accentColor="#FF8F5E">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={clientsParMois}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-base)" />
              <XAxis dataKey="mois" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Nouveaux" fill="#FF6B2B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* PieChart -- Repartition CA */}
        <ChartCard icon={PieChartIcon} title="Repartition CA par offre" accentColor="#FF9A6C">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={repartitionCA}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {repartitionCA.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(val) => <span className="text-[var(--text-secondary)] text-xs">{val}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* LineChart -- Score bien-etre moyen clients (30j) */}
        <ChartCard icon={Heart} title="Humeur moyenne clients (30j)" accentColor="#FF9A6C">
          {bienEtreData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[220px] gap-3 animate-breathe">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center">
                <Heart size={20} className="text-[var(--text-muted)]" />
              </div>
              <p className="text-[var(--text-muted)] text-sm">Pas assez de donnees</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={bienEtreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-base)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="score" name="Score" stroke="#FF9A6C" strokeWidth={2} dot={{ fill: '#FF9A6C', r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Section Objectifs Coach ── */}
      <div className="glass-card p-4 md:p-5">
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E]" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5 md:mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B2B]/15 to-[#FF8F5E]/10 flex items-center justify-center">
                <Target size={16} className="text-[#FF6B2B]" />
              </div>
              <h3 className="text-[var(--text-primary)] font-semibold text-sm md:text-base">
                Mes objectifs business
              </h3>
            </div>
            {!editObjectifs ? (
              <button
                onClick={() => setEditObjectifs(true)}
                className="text-xs text-[var(--text-muted)] hover:text-[#FF6B2B] transition-colors p-2 -m-2"
              >
                Modifier
              </button>
            ) : (
              <button
                onClick={sauvegarderObjectifs}
                disabled={savingObj}
                className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white px-3 py-2 rounded-lg font-medium hover:shadow-lg hover:shadow-[#FF6B2B]/20 transition-all active:scale-95"
              >
                <Save size={12} />
                {savingObj ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            )}
          </div>

          <div className="space-y-5">
            {/* Objectif clients */}
            <ObjectifBar
              label="Clients actifs"
              current={kpis.clientsActifs}
              cible={objectifs.clients_cible}
              editing={editObjectifs}
              onChangeCible={(v) => setObjectifs(prev => ({ ...prev, clients_cible: parseInt(v) || 0 }))}
            />

            {/* Objectif CA */}
            <ObjectifBar
              label="CA mensuel"
              current={kpis.mrr}
              cible={objectifs.ca_mensuel_cible}
              suffix="€"
              editing={editObjectifs}
              onChangeCible={(v) => setObjectifs(prev => ({ ...prev, ca_mensuel_cible: parseInt(v) || 0 }))}
            />

            {/* Objectif retention */}
            <ObjectifBar
              label="Taux de retention"
              current={kpis.tauxRetention}
              cible={objectifs.retention_cible}
              suffix="%"
              editing={editObjectifs}
              onChangeCible={(v) => setObjectifs(prev => ({ ...prev, retention_cible: parseInt(v) || 0 }))}
            />
          </div>

          {/* Projection */}
          <div className="mt-5 md:mt-6 glass-card !rounded-xl border-l-2 !border-l-[#FF6B2B] p-3.5 md:p-4 flex items-center gap-3">
            <div className="relative z-10 flex items-center gap-3 w-full">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B2B]/15 to-[#FF8F5E]/10 flex items-center justify-center flex-shrink-0">
                <Zap size={14} className="text-[#FF6B2B]" />
              </div>
              <p className="text-[var(--text-secondary)] text-xs md:text-sm">
                <span className="text-[var(--text-primary)] font-medium">Projection : </span>
                {projectionClients()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tableau Performances ── */}
      <div className="glass-card p-4 md:p-5">
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E]" />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B2B]/15 to-[#FF8F5E]/10 flex items-center justify-center">
              <Award size={16} className="text-[#FF6B2B]" />
            </div>
            <h3 className="text-[var(--text-primary)] font-semibold text-sm md:text-base">
              Performances
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <PerfCell
              label="Client le plus engage"
              value={clients.filter(c => c.actif)[0]?.profiles?.nom || '--'}
            />
            <PerfCell
              label="Meilleur mois (nouveaux clients)"
              value={(() => {
                const best = clientsParMois.reduce((max, m) => m.count > max.count ? m : max, { mois: '--', count: 0 })
                return best.count > 0 ? `${best.mois} (${best.count})` : '--'
              })()}
            />
            <PerfCell
              label="Total clients historique"
              value={clients.length}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// Composants utilitaires
// ══════════════════════════════════════

function KpiCard({ label, value, icon: Icon, color, gradientTo, suffix }) {
  return (
    <div className="glass-card p-4">
      {/* Gradient accent bar at top */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(to right, ${color}, ${gradientTo || color})` }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[var(--text-muted)] text-[11px] md:text-xs leading-tight">{label}</span>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
          >
            <Icon size={18} style={{ color }} />
          </div>
        </div>
        <p className="text-[var(--text-primary)] text-xl md:text-2xl font-bold tracking-tight">
          {value}
          {suffix && <span className="text-[var(--text-muted)] text-[10px] md:text-xs font-normal ml-1">{suffix}</span>}
        </p>
      </div>
    </div>
  )
}

function SecondaryKpi({ label, value, dotColor }) {
  return (
    <div className="glass-card p-3 md:p-4">
      <div className="relative z-10">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
          <p className="text-[var(--text-muted)] text-[10px] md:text-xs truncate">{label}</p>
        </div>
        <p className="text-[var(--text-primary)] text-lg md:text-xl font-bold">{value}</p>
      </div>
    </div>
  )
}

function ChartCard({ icon: Icon, title, accentColor, children }) {
  return (
    <div className="glass-card p-4 md:p-5">
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(to right, ${accentColor}, ${accentColor}88)` }}
      />

      <div className="relative z-10">
        <h3 className="text-[var(--text-primary)] font-semibold text-xs md:text-sm mb-4 flex items-center gap-2">
          <div
            className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)` }}
          >
            <Icon size={14} style={{ color: accentColor }} />
          </div>
          {title}
        </h3>
        {children}
      </div>
    </div>
  )
}

function PerfCell({ label, value }) {
  return (
    <div className="glass-card !rounded-xl p-3.5 md:p-4">
      <div className="relative z-10">
        <p className="text-[var(--text-muted)] text-[10px] md:text-xs mb-1.5">{label}</p>
        <p className="text-[var(--text-primary)] font-medium text-sm">{value}</p>
      </div>
    </div>
  )
}

function ObjectifBar({ label, current, cible, suffix = '', editing, onChangeCible }) {
  const pct = cible > 0 ? Math.min(Math.round((current / cible) * 100), 100) : 0
  const atteint = current >= cible

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[var(--text-secondary)] text-xs md:text-sm">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-primary)] font-bold text-xs md:text-sm">
            {typeof current === 'number' ? current.toFixed(current % 1 === 0 ? 0 : 0) : current}{suffix}
          </span>
          <span className="text-[var(--text-muted)] text-xs">/</span>
          {editing ? (
            <input
              type="number"
              value={cible}
              onChange={(e) => onChangeCible(e.target.value)}
              className="w-20 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] focus:border-[#FF6B2B]/50 focus:outline-none transition-colors"
            />
          ) : (
            <span className="text-[var(--text-muted)] text-xs md:text-sm">{cible}{suffix}</span>
          )}
          <span className={`text-xs font-medium ${atteint ? 'text-green-400' : 'text-[var(--text-muted)]'}`}>
            ({pct}%)
          </span>
        </div>
      </div>
      <div className="h-2.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: atteint
              ? 'linear-gradient(to right, #22c55e, #4ade80)'
              : 'linear-gradient(to right, #FF6B2B, #FF8F5E)',
          }}
        />
      </div>
    </div>
  )
}
