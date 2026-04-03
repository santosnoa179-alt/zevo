import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, UserCheck, Euro, TrendingUp, Activity, Shield, RefreshCw } from 'lucide-react'

// Prix mensuels par plan (en euros)
const PLAN_PRICES = { starter: 29, pro: 49, unlimited: 79 }

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [coaches, setCoaches] = useState([])
  const [totalClients, setTotalClients] = useState(0)
  const [newCoachesThisMonth, setNewCoachesThisMonth] = useState(0)
  const [monthlyData, setMonthlyData] = useState([])

  useEffect(() => {
    chargerStats()
  }, [])

  const chargerStats = async () => {
    setLoading(true)

    const [coachesRes, clientsRes] = await Promise.all([
      supabase.from('coaches').select('id, plan, abonnement_actif, created_at, profiles(nom, email)'),
      supabase.from('clients').select('id', { count: 'exact', head: true }),
    ])

    const allCoaches = coachesRes.data || []
    setCoaches(allCoaches)
    setTotalClients(clientsRes.count || 0)

    // Nouveaux coachs ce mois
    const moisCourant = new Date().toISOString().slice(0, 7)
    const newThisMonth = allCoaches.filter(c => c.created_at?.startsWith(moisCourant)).length
    setNewCoachesThisMonth(newThisMonth)

    // Donnees mensuelles (6 derniers mois)
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString('fr-FR', { month: 'short' })
      const coachsMois = allCoaches.filter(c => c.created_at?.startsWith(key))
      months.push({
        mois: label,
        nouveaux: coachsMois.length,
      })
    }
    setMonthlyData(months)

    setLoading(false)
  }

  // Calculs
  const coachsActifs = coaches.filter(c => c.abonnement_actif)
  const mrr = coachsActifs.reduce((total, c) => total + (PLAN_PRICES[c.plan] || 0), 0)
  const arr = mrr * 12

  const statCards = [
    { label: 'MRR', value: `${mrr.toLocaleString('fr-FR')} €`, icon: Euro, color: '#FF6B2B' },
    { label: 'Coachs actifs', value: coachsActifs.length, icon: UserCheck, color: '#10B981' },
    { label: 'Clients total', value: totalClients, icon: Users, color: '#3B82F6' },
    { label: 'Nouveaux ce mois', value: newCoachesThisMonth, icon: TrendingUp, color: '#F59E0B' },
  ]

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="animate-page-enter p-4 sm:p-6 w-full max-w-[1400px] mx-auto">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="skel-block w-10 h-10 rounded-xl" />
            <div>
              <div className="skel-block h-7 w-40 rounded-lg mb-1.5" />
              <div className="skel-block h-4 w-56 rounded-md" />
            </div>
          </div>
          <div className="skel-block w-9 h-9 rounded-lg" />
        </div>

        {/* KPI skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card overflow-hidden">
              <div className="h-[2px] bg-[var(--bg-surface)]" />
              <div className="p-5">
                <div className="skel-block h-4 w-24 rounded mb-3" />
                <div className="skel-block h-8 w-32 rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* ARR + Plans skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="glass-card overflow-hidden">
            <div className="h-[2px] bg-[var(--bg-surface)]" />
            <div className="p-5">
              <div className="skel-block h-4 w-48 rounded mb-4" />
              <div className="skel-block h-10 w-40 rounded-lg" />
            </div>
          </div>
          <div className="glass-card overflow-hidden">
            <div className="h-[2px] bg-[var(--bg-surface)]" />
            <div className="p-5">
              <div className="skel-block h-4 w-40 rounded mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="skel-block h-6 w-full rounded" />)}
              </div>
            </div>
          </div>
        </div>

        {/* Chart skeleton */}
        <div className="glass-card overflow-hidden mb-6">
          <div className="h-[2px] bg-[var(--bg-surface)]" />
          <div className="p-5">
            <div className="skel-block h-4 w-48 rounded mb-4" />
            <div className="skel-block h-[200px] w-full rounded-lg" />
          </div>
        </div>

        {/* Table skeleton */}
        <div className="glass-card overflow-hidden">
          <div className="h-[2px] bg-[var(--bg-surface)]" />
          <div className="p-5">
            <div className="skel-block h-4 w-44 rounded mb-4" />
            {[1, 2, 3, 4].map(i => <div key={i} className="skel-block h-12 w-full rounded mb-2" />)}
          </div>
        </div>
      </div>
    )
  }

  /* ── Plan distribution data ── */
  const planColors = {
    starter: { from: '#3B82F6', to: '#60A5FA' },
    pro:     { from: '#FF6B2B', to: '#FF8F5E' },
    unlimited: { from: '#10B981', to: '#34D399' },
  }

  return (
    <div className="animate-page-enter p-4 sm:p-6 w-full max-w-[1400px] mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8F5E)' }}
          >
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[var(--text-primary)] text-xl sm:text-2xl font-bold">Super Admin</h1>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,107,43,0.15), rgba(255,143,94,0.10))',
                  color: '#FF6B2B',
                  border: '1px solid rgba(255,107,43,0.2)',
                }}
              >
                Admin
              </span>
            </div>
            <p className="text-[var(--text-muted)] text-sm mt-0.5">Vue globale de la plateforme Zevo</p>
          </div>
        </div>
        <button
          onClick={chargerStats}
          className="p-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-base)] hover:bg-[var(--bg-surface)] transition-all duration-200"
          title="Rafraichir les donnees"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card overflow-hidden">
            <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
            <div className="p-5 flex items-start gap-4">
              <div
                className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${color}12` }}
              >
                <Icon size={18} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold mb-1">{label}</p>
                <p className="text-[var(--text-primary)] text-2xl font-bold leading-tight">{value}</p>
              </div>
              {/* Colored left accent */}
              <div
                className="absolute left-0 top-[2px] bottom-0 w-[3px] rounded-r-full"
                style={{ backgroundColor: color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── ARR + Plan Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* ARR Card */}
        <div className="glass-card overflow-hidden relative">
          <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #FF6B2B, #FF8F5E)' }} />
          {/* Subtle glow */}
          <div
            className="absolute top-6 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(255,107,43,0.08) 0%, transparent 70%)',
            }}
          />
          <div className="p-5 relative">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={14} className="text-[var(--text-muted)]" />
              <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">
                Revenus annuels estimes (ARR)
              </p>
            </div>
            <p
              className="text-4xl sm:text-5xl font-extrabold bg-clip-text text-transparent leading-tight"
              style={{ backgroundImage: 'linear-gradient(135deg, #FF6B2B, #FF8F5E)' }}
            >
              {arr.toLocaleString('fr-FR')} <span className="text-3xl">EUR</span>
            </p>
            <p className="text-[var(--text-muted)] text-xs mt-2">
              Base sur {coachsActifs.length} coachs actifs &middot; MRR {mrr.toLocaleString('fr-FR')} EUR/mois
            </p>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="glass-card overflow-hidden">
          <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #3B82F6, #FF6B2B, #10B981)' }} />
          <div className="p-5">
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold mb-5">
              Repartition des plans
            </p>
            <div className="space-y-4">
              {['starter', 'pro', 'unlimited'].map(plan => {
                const count = coachsActifs.filter(c => c.plan === plan).length
                const pct = coachsActifs.length > 0 ? Math.round((count / coachsActifs.length) * 100) : 0
                const colors = planColors[plan]
                return (
                  <div key={plan}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[var(--text-primary)] text-sm font-medium capitalize">{plan}</span>
                      <span className="text-[var(--text-muted)] text-xs font-medium">{count} coachs ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${colors.from}, ${colors.to})`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart: Nouveaux coachs par mois ── */}
      <div className="glass-card overflow-hidden mb-6">
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #FF6B2B, #FF8F5E)' }} />
        <div className="p-5">
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold mb-4">
            Nouveaux coachs par mois
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF6B2B" />
                  <stop offset="100%" stopColor="#FF8F5E" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="mois"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-base)',
                  borderRadius: 10,
                  color: 'var(--text-primary)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                formatter={(v) => [v, 'Nouveaux']}
              />
              <Bar dataKey="nouveaux" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Recent Coachs Table ── */}
      <div className="glass-card overflow-hidden">
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #FF6B2B, #FF8F5E)' }} />
        <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">
            Derniers coachs inscrits
          </p>
        </div>

        {/* Desktop header row */}
        <div className="hidden sm:grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-2.5 border-b border-[var(--border-subtle)]">
          <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold">Coach</span>
          <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold w-24 text-center">Plan</span>
          <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold w-16 text-center">Statut</span>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          {coaches
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 8)
            .map(c => (
              <div
                key={c.id}
                className="px-5 py-3 flex items-center justify-between sm:grid sm:grid-cols-[1fr_auto_auto] sm:gap-4 hover:bg-[var(--bg-surface)] transition-colors duration-150"
              >
                <div className="min-w-0">
                  <p className="text-[var(--text-primary)] text-sm font-medium truncate">
                    {c.profiles?.nom || c.profiles?.email || '\u2014'}
                  </p>
                  <p className="text-[var(--text-muted)] text-xs truncate">{c.profiles?.email}</p>
                </div>
                <div className="flex items-center gap-3 sm:gap-0 shrink-0">
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-semibold capitalize w-24 text-center"
                    style={{
                      background:
                        c.plan === 'unlimited'
                          ? 'rgba(16,185,129,0.10)'
                          : c.plan === 'pro'
                            ? 'rgba(255,107,43,0.10)'
                            : 'rgba(59,130,246,0.10)',
                      color:
                        c.plan === 'unlimited'
                          ? '#34D399'
                          : c.plan === 'pro'
                            ? '#FF6B2B'
                            : '#60A5FA',
                    }}
                  >
                    {c.plan}
                  </span>
                </div>
                <div className="hidden sm:flex items-center justify-center w-16 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: c.abonnement_actif ? '#10B981' : '#EF4444',
                        boxShadow: c.abonnement_actif
                          ? '0 0 6px rgba(16,185,129,0.4)'
                          : '0 0 6px rgba(239,68,68,0.4)',
                      }}
                    />
                    <span className="text-[var(--text-muted)] text-[10px]">
                      {c.abonnement_actif ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
                {/* Mobile-only status dot */}
                <span
                  className="sm:hidden w-2 h-2 rounded-full shrink-0 ml-2"
                  style={{
                    backgroundColor: c.abonnement_actif ? '#10B981' : '#EF4444',
                    boxShadow: c.abonnement_actif
                      ? '0 0 6px rgba(16,185,129,0.4)'
                      : '0 0 6px rgba(239,68,68,0.4)',
                  }}
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
