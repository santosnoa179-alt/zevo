import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Users, TrendingUp, TrendingDown, Target, Award,
  Calendar, DollarSign, Activity, Save, ChevronRight
} from 'lucide-react'

// ── Périodes de filtre ──
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

  // Données brutes
  const [clients, setClients] = useState([])
  const [paiements, setPaiements] = useState([])
  const [bienEtreData, setBienEtreData] = useState([])

  // Objectifs business
  const [objectifs, setObjectifs] = useState({ clients_cible: 20, ca_mensuel_cible: 2000, retention_cible: 85 })
  const [editObjectifs, setEditObjectifs] = useState(false)
  const [savingObj, setSavingObj] = useState(false)

  const joursFiltre = PERIODES.find(p => p.id === periode)?.jours || 30

  // ── Charger toutes les données ──
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

    // Charger scores bien-être moyens sur 30j pour tous les clients actifs
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

  // ── KPIs calculés ──
  const kpis = useMemo(() => {
    const now = new Date()
    const dateFiltre = new Date()
    dateFiltre.setDate(dateFiltre.getDate() - joursFiltre)

    const clientsActifs = clients.filter(c => c.actif)
    const clientsInactifs = clients.filter(c => !c.actif)
    const nouveaux = clients.filter(c => new Date(c.created_at) >= dateFiltre)

    // Taux de rétention : actifs / total
    const tauxRetention = clients.length > 0
      ? Math.round((clientsActifs.length / clients.length) * 100)
      : 100

    // Churn = clients devenus inactifs sur la période
    const churn = clientsInactifs.length

    // CA et paiements
    const paiementsPeriode = paiements.filter(p =>
      p.statut === 'paye' && new Date(p.date_paiement) >= dateFiltre
    )
    const ca = paiementsPeriode.reduce((s, p) => s + (p.montant || 0), 0) / 100
    const revenuMoyen = clientsActifs.length > 0 ? (ca / clientsActifs.length).toFixed(0) : 0

    // MRR projeté (si paiements mensuels)
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

  // ── Données pour BarChart (nouveaux clients par mois) ──
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

  // ── Données pour LineChart CA (12 mois) ──
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

  // ── Données PieChart (si on a des offres) ──
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
    if (nouveauxParMois <= 0) return 'Pas assez de données'
    const moisRestants = Math.ceil((objectifs.clients_cible - kpis.clientsActifs) / nouveauxParMois)
    const dateProjection = new Date()
    dateProjection.setMonth(dateProjection.getMonth() + moisRestants)
    return `À ce rythme, objectif atteint en ${dateProjection.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
  }

  // ── Custom tooltip ──
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-[#1E1E1E] border border-white/[0.1] rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="text-white/50 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-[#F5F5F3] font-medium">
            {p.name} : {typeof p.value === 'number' && p.name?.includes('CA') ? `${p.value.toFixed(0)}€` : p.value}
          </p>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 w-full">
        <div className="h-8 w-48 bg-[#1E1E1E] rounded-lg animate-pulse mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-[#1E1E1E] rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-[#1E1E1E] rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 w-full">
      {/* Header + filtres */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F3]">Statistiques</h1>
          <p className="text-white/50 text-sm mt-1">Vue d'ensemble de votre activité</p>
        </div>
        <div className="flex bg-[#1E1E1E] rounded-xl p-1 border border-white/[0.08]">
          {PERIODES.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriode(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                periode === p.id
                  ? 'bg-[#FF6B2B] text-white'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Clients actifs"
          value={kpis.clientsActifs}
          icon={Users}
          color="#FF6B2B"
        />
        <KpiCard
          label="Nouveaux"
          value={kpis.nouveaux}
          icon={TrendingUp}
          color="#22c55e"
          suffix={`/ ${joursFiltre}j`}
        />
        <KpiCard
          label="Taux rétention"
          value={`${kpis.tauxRetention}%`}
          icon={Activity}
          color={kpis.tauxRetention >= 80 ? '#22c55e' : kpis.tauxRetention >= 60 ? '#eab308' : '#ef4444'}
        />
        <KpiCard
          label="CA période"
          value={`${kpis.ca.toFixed(0)}€`}
          icon={DollarSign}
          color="#FF6B2B"
        />
      </div>

      {/* Ligne 2 : KPIs secondaires */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-4">
          <p className="text-white/40 text-xs">Churn</p>
          <p className="text-[#F5F5F3] text-xl font-bold mt-1">{kpis.churn}</p>
        </div>
        <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-4">
          <p className="text-white/40 text-xs">Revenu moyen / client</p>
          <p className="text-[#F5F5F3] text-xl font-bold mt-1">{kpis.revenuMoyen}€</p>
        </div>
        <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-4">
          <p className="text-white/40 text-xs">MRR projeté</p>
          <p className="text-[#F5F5F3] text-xl font-bold mt-1">{kpis.mrr.toFixed(0)}€</p>
        </div>
      </div>

      {/* ── Graphiques ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* LineChart — Évolution CA */}
        <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-5">
          <h3 className="text-[#F5F5F3] font-semibold text-sm mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-[#FF6B2B]" />
            Évolution CA (12 mois)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={caParMois}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mois" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="ca" name="CA" stroke="#FF6B2B" strokeWidth={2} dot={{ fill: '#FF6B2B', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* BarChart — Nouveaux clients par mois */}
        <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-5">
          <h3 className="text-[#F5F5F3] font-semibold text-sm mb-4 flex items-center gap-2">
            <Users size={16} className="text-[#FF6B2B]" />
            Nouveaux clients par mois
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={clientsParMois}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mois" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Nouveaux" fill="#FF6B2B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PieChart — Répartition CA */}
        <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-5">
          <h3 className="text-[#F5F5F3] font-semibold text-sm mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-[#FF6B2B]" />
            Répartition CA par offre
          </h3>
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
                formatter={(val) => <span className="text-white/50 text-xs">{val}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* LineChart — Score bien-être moyen clients (30j) */}
        <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-5">
          <h3 className="text-[#F5F5F3] font-semibold text-sm mb-4 flex items-center gap-2">
            <Activity size={16} className="text-[#FF6B2B]" />
            Humeur moyenne clients (30j)
          </h3>
          {bienEtreData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-white/20 text-sm">
              Pas assez de données
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={bienEtreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="score" name="Score" stroke="#FF9A6C" strokeWidth={2} dot={{ fill: '#FF9A6C', r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Section Objectifs Coach ── */}
      <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[#F5F5F3] font-semibold flex items-center gap-2">
            <Target size={18} className="text-[#FF6B2B]" />
            Mes objectifs business
          </h3>
          {!editObjectifs ? (
            <button
              onClick={() => setEditObjectifs(true)}
              className="text-xs text-white/40 hover:text-[#FF6B2B] transition-colors"
            >
              Modifier
            </button>
          ) : (
            <button
              onClick={sauvegarderObjectifs}
              disabled={savingObj}
              className="flex items-center gap-1.5 text-xs bg-[#FF6B2B] text-white px-3 py-1.5 rounded-lg font-medium hover:bg-[#e55e24] transition-colors"
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

          {/* Objectif rétention */}
          <ObjectifBar
            label="Taux de rétention"
            current={kpis.tauxRetention}
            cible={objectifs.retention_cible}
            suffix="%"
            editing={editObjectifs}
            onChangeCible={(v) => setObjectifs(prev => ({ ...prev, retention_cible: parseInt(v) || 0 }))}
          />
        </div>

        {/* Projection */}
        <div className="mt-6 bg-[#2A2A2A] rounded-lg p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
            <ChevronRight size={16} className="text-[#FF6B2B]" />
          </div>
          <p className="text-white/50 text-sm">
            <span className="text-[#F5F5F3] font-medium">Projection : </span>
            {projectionClients()}
          </p>
        </div>
      </div>

      {/* ── Tableau performances ── */}
      <div className="mt-6 bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-5">
        <h3 className="text-[#F5F5F3] font-semibold flex items-center gap-2 mb-4">
          <Award size={18} className="text-[#FF6B2B]" />
          Performances
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#2A2A2A] rounded-lg p-4">
            <p className="text-white/40 text-xs mb-1">Client le plus engagé</p>
            <p className="text-[#F5F5F3] font-medium text-sm">
              {clients.filter(c => c.actif)[0]?.profiles?.nom || '—'}
            </p>
          </div>
          <div className="bg-[#2A2A2A] rounded-lg p-4">
            <p className="text-white/40 text-xs mb-1">Meilleur mois (nouveaux clients)</p>
            <p className="text-[#F5F5F3] font-medium text-sm">
              {(() => {
                const best = clientsParMois.reduce((max, m) => m.count > max.count ? m : max, { mois: '—', count: 0 })
                return best.count > 0 ? `${best.mois} (${best.count})` : '—'
              })()}
            </p>
          </div>
          <div className="bg-[#2A2A2A] rounded-lg p-4">
            <p className="text-white/40 text-xs mb-1">Total clients historique</p>
            <p className="text-[#F5F5F3] font-medium text-sm">{clients.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// Composants utilitaires
// ══════════════════════════════════════

function KpiCard({ label, value, icon: Icon, color, suffix }) {
  return (
    <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/40 text-xs">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <p className="text-[#F5F5F3] text-2xl font-bold">
        {value}
        {suffix && <span className="text-white/30 text-xs font-normal ml-1">{suffix}</span>}
      </p>
    </div>
  )
}

function ObjectifBar({ label, current, cible, suffix = '', editing, onChangeCible }) {
  const pct = cible > 0 ? Math.min(Math.round((current / cible) * 100), 100) : 0
  const atteint = current >= cible

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/50 text-sm">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[#F5F5F3] font-bold text-sm">
            {typeof current === 'number' ? current.toFixed(current % 1 === 0 ? 0 : 0) : current}{suffix}
          </span>
          <span className="text-white/25 text-xs">/</span>
          {editing ? (
            <input
              type="number"
              value={cible}
              onChange={(e) => onChangeCible(e.target.value)}
              className="w-20 bg-[#2A2A2A] border border-white/[0.1] rounded px-2 py-1 text-xs text-[#F5F5F3] focus:border-[#FF6B2B]/50 focus:outline-none"
            />
          ) : (
            <span className="text-white/30 text-sm">{cible}{suffix}</span>
          )}
          <span className={`text-xs font-medium ${atteint ? 'text-green-400' : 'text-white/30'}`}>
            ({pct}%)
          </span>
        </div>
      </div>
      <div className="h-2.5 bg-[#2A2A2A] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: atteint ? '#22c55e' : '#FF6B2B',
          }}
        />
      </div>
    </div>
  )
}
