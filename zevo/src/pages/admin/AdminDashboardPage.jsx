import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, CardBody } from '../../components/ui/Card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, UserCheck, DollarSign, TrendingUp, Activity } from 'lucide-react'

// Prix mensuels par plan (en €)
const PLAN_PRICES = { starter: 39, pro: 59, unlimited: 79 }

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

    // Données mensuelles (6 derniers mois)
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
    { label: 'MRR', value: `${mrr.toLocaleString('fr-FR')} €`, icon: DollarSign, color: '#FF6B2B' },
    { label: 'Coachs actifs', value: coachsActifs.length, icon: UserCheck, color: '#10B981' },
    { label: 'Clients total', value: totalClients, icon: Users, color: '#3B82F6' },
    { label: 'Nouveaux ce mois', value: newCoachesThisMonth, icon: TrendingUp, color: '#F59E0B' },
  ]

  if (loading) {
    return (
      <div className="p-6 w-full">
        <div className="h-8 w-48 bg-[#2A2A2A] rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-[#1E1E1E] rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 w-full">
      <div className="mb-8">
        <h1 className="text-[#F5F5F3] text-2xl font-bold">Super Admin</h1>
        <p className="text-white/40 text-sm mt-0.5">Vue globale de la plateforme Zevo</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/40 text-xs uppercase tracking-wider font-semibold">{label}</p>
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <p className="text-[#F5F5F3] text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── ARR ── */}
        <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-5">
          <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-2">Revenus annuels estimés (ARR)</p>
          <p className="text-3xl font-bold text-[#FF6B2B]">{arr.toLocaleString('fr-FR')} €</p>
          <p className="text-white/30 text-xs mt-1">Basé sur {coachsActifs.length} coachs actifs</p>
        </div>

        {/* ── Répartition des plans ── */}
        <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-5">
          <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-4">Répartition des plans</p>
          <div className="space-y-3">
            {['starter', 'pro', 'unlimited'].map(plan => {
              const count = coachsActifs.filter(c => c.plan === plan).length
              const pct = coachsActifs.length > 0 ? Math.round((count / coachsActifs.length) * 100) : 0
              return (
                <div key={plan} className="flex items-center gap-3">
                  <span className="text-[#F5F5F3] text-sm font-medium capitalize w-20">{plan}</span>
                  <div className="flex-1 h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: plan === 'starter' ? '#3B82F6' : plan === 'pro' ? '#FF6B2B' : '#10B981',
                      }}
                    />
                  </div>
                  <span className="text-white/40 text-xs w-16 text-right">{count} ({pct}%)</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Graphique nouveaux coachs par mois ── */}
      <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-5 mt-6">
        <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-4">Nouveaux coachs par mois</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="mois" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#1E1E1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#F5F5F3' }}
              formatter={(v) => [v, 'Nouveaux']}
            />
            <Bar dataKey="nouveaux" fill="#FF6B2B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Derniers coachs inscrits ── */}
      <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl mt-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <p className="text-white/40 text-xs uppercase tracking-wider font-semibold">Derniers coachs inscrits</p>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {coaches
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 8)
            .map(c => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02]">
                <div>
                  <p className="text-[#F5F5F3] text-sm font-medium">{c.profiles?.nom || c.profiles?.email || '—'}</p>
                  <p className="text-white/30 text-xs">{c.profiles?.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                    c.plan === 'unlimited' ? 'bg-green-500/10 text-green-400'
                      : c.plan === 'pro' ? 'bg-[#FF6B2B]/10 text-[#FF6B2B]'
                      : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {c.plan}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${c.abonnement_actif ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
