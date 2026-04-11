import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import {
  TrendingUp, Plus, Link2, TicketPercent,
  Package, Users, RefreshCw, Calendar,
  CreditCard, ShoppingBag, ArrowDownRight
} from 'lucide-react'

export default function BusinessPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [period, setPeriod] = useState('semaine')
  const [loading, setLoading] = useState(true)

  const [totalMois, setTotalMois] = useState(0)
  const [total7j, setTotal7j] = useState(0)
  const [clientsActifs, setClientsActifs] = useState(0)
  const [clientsPayants, setClientsPayants] = useState(0)
  const [abosActifs, setAbosActifs] = useState(0)
  const [recentEvents, setRecentEvents] = useState([])
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user, period])

  const loadData = async () => {
    setLoading(true)

    // ── Revenus du mois ──
    const debutMois = new Date()
    debutMois.setDate(1)
    debutMois.setHours(0, 0, 0, 0)
    const { data: paiementsMois, error: errPaie } = await supabase
      .from('paiements_clients')
      .select('montant, statut')
      .eq('coach_id', user.id)
      .eq('statut', 'paye')
      .gte('date_paiement', debutMois.toISOString())
    if (errPaie) console.warn('[BusinessPage] paiements mois:', errPaie.message)
    setTotalMois((paiementsMois || []).reduce((s, p) => s + (p.montant || 0), 0))

    // ── Revenus 7 derniers jours ──
    const debut7j = new Date()
    debut7j.setDate(debut7j.getDate() - 7)
    debut7j.setHours(0, 0, 0, 0)
    const { data: paiements7j } = await supabase
      .from('paiements_clients')
      .select('montant')
      .eq('coach_id', user.id)
      .eq('statut', 'paye')
      .gte('date_paiement', debut7j.toISOString())
    setTotal7j((paiements7j || []).reduce((s, p) => s + (p.montant || 0), 0))

    // ── Clients (total + payants) ──
    const { count: nbClients } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', user.id)
    setClientsActifs(nbClients || 0)

    // Clients payants : ceux qui ont au moins un paiement payé
    const { data: clientsAvecPaiement } = await supabase
      .from('paiements_clients')
      .select('client_id')
      .eq('coach_id', user.id)
      .eq('statut', 'paye')
    const uniqueClients = new Set((clientsAvecPaiement || []).map(p => p.client_id))
    setClientsPayants(uniqueClients.size)

    // ── Abonnements actifs (essaie la nouvelle table, sinon compte les paiements récurrents) ──
    try {
      const { count: nbAbos, error } = await supabase
        .from('abonnements_clients')
        .select('id', { count: 'exact', head: true })
        .eq('coach_id', user.id)
        .eq('statut', 'actif')
      if (error) throw error
      setAbosActifs(nbAbos || 0)
    } catch {
      // Fallback : compter les offres actives
      const { count } = await supabase
        .from('offres_coaching')
        .select('id', { count: 'exact', head: true })
        .eq('coach_id', user.id)
        .eq('actif', true)
      setAbosActifs(count || 0)
    }

    // ── Derniers événements (paiements récents) ──
    const { data: derniersPaiements } = await supabase
      .from('paiements_clients')
      .select('id, montant, statut, date_paiement, created_at, clients(profiles(nom)), offres_coaching(titre)')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    setRecentEvents(derniersPaiements || [])

    // ── Données graphique ──
    await loadChartData()
    setLoading(false)
  }

  const loadChartData = async () => {
    const now = new Date()
    let startDate, labels, groupBy

    if (period === 'semaine') {
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 6)
      labels = []
      const jours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate)
        d.setDate(d.getDate() + i)
        labels.push({ label: jours[d.getDay()], date: d.toISOString().slice(0, 10) })
      }
      groupBy = 'day'
    } else if (period === 'mois') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      labels = [
        { label: 'S1', from: 1, to: 7 },
        { label: 'S2', from: 8, to: 14 },
        { label: 'S3', from: 15, to: 21 },
        { label: 'S4', from: 22, to: 31 },
      ]
      groupBy = 'week'
    } else {
      startDate = new Date(now.getFullYear(), 0, 1)
      const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
      labels = moisNoms.map((label, i) => ({ label, month: i }))
      groupBy = 'month'
    }

    const { data: paiements } = await supabase
      .from('paiements_clients')
      .select('montant, date_paiement')
      .eq('coach_id', user.id)
      .eq('statut', 'paye')
      .gte('date_paiement', startDate.toISOString())

    const items = paiements || []

    if (groupBy === 'day') {
      setChartData(labels.map(l => ({
        label: l.label,
        value: items.filter(p => p.date_paiement?.slice(0, 10) === l.date).reduce((s, p) => s + (p.montant || 0), 0) / 100
      })))
    } else if (groupBy === 'week') {
      setChartData(labels.map(l => ({
        label: l.label,
        value: items.filter(p => { const day = new Date(p.date_paiement).getDate(); return day >= l.from && day <= l.to }).reduce((s, p) => s + (p.montant || 0), 0) / 100
      })))
    } else {
      setChartData(labels.map(l => ({
        label: l.label,
        value: items.filter(p => new Date(p.date_paiement).getMonth() === l.month).reduce((s, p) => s + (p.montant || 0), 0) / 100
      })))
    }
  }

  const maxValue = Math.max(...chartData.map(d => d.value), 1)
  const totalPeriod = chartData.reduce((s, d) => s + d.value, 0)

  const QUICK_ACTIONS = [
    { icon: Package, label: 'Créer un produit', desc: 'Offre ou programme', path: '/coach/abonnements/produits', color: '#8B5CF6' },
    { icon: Link2, label: 'Créer un lien', desc: 'Lien de paiement', path: '/coach/abonnements/liens', color: '#3B82F6' },
    { icon: TicketPercent, label: 'Créer un code', desc: 'Code de réduction', path: '/coach/abonnements/codes', color: '#F59E0B' },
  ]

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-5xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="glass-card p-4 h-24 animate-pulse"><div className="skel-block h-4 w-16 rounded mb-3" /><div className="skel-block h-6 w-20 rounded" /></div>)}
        </div>
        <div className="glass-card p-5 h-64 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Revenus ce mois', value: `${(totalMois / 100).toLocaleString('fr-FR')} €`, icon: TrendingUp, color: '#22C55E' },
          { label: '7 derniers jours', value: `${(total7j / 100).toLocaleString('fr-FR')} €`, icon: Calendar, color: '#F59E0B' },
          { label: 'Clients payants', value: `${clientsPayants}/${clientsActifs}`, icon: Users, color: '#3B82F6' },
          { label: 'Abonnements actifs', value: abosActifs.toString(), icon: RefreshCw, color: '#8B5CF6' },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="glass-card p-4 relative overflow-hidden">
              <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full opacity-[0.04]" style={{ backgroundColor: stat.color }} />
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                  <Icon size={15} style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-lg font-bold text-[var(--text-primary)]">{stat.value}</p>
              <p className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Revenue chart + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Revenus</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {totalPeriod.toLocaleString('fr-FR')} € {period === 'semaine' ? 'cette semaine' : period === 'mois' ? 'ce mois' : 'cette année'}
              </p>
            </div>
            <div className="flex gap-1 bg-[var(--bg-surface)] rounded-lg p-0.5">
              {['semaine', 'mois', 'annee'].map(p => (
                <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${period === p ? 'bg-[#F59E0B]/15 text-[#F59E0B]' : 'text-[var(--text-muted)]'}`}>
                  {p === 'semaine' ? 'Semaine' : p === 'mois' ? 'Mois' : 'Année'}
                </button>
              ))}
            </div>
          </div>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-[var(--text-muted)] text-sm">Aucune donnée</div>
          ) : (
            <div className="flex items-end gap-2 h-44">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">{d.value > 0 ? `${d.value}€` : ''}</span>
                  <div className="w-full relative" style={{ height: '140px' }}>
                    <div className="absolute bottom-0 w-full rounded-t-md transition-all duration-500" style={{ height: `${Math.max((d.value / maxValue) * 100, 2)}%`, background: d.value > 0 ? 'linear-gradient(180deg, #F59E0B, #F59E0B80)' : 'var(--bg-surface)' }} />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card p-5 flex flex-col">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Actions rapides</h3>
          <p className="text-[11px] text-[var(--text-muted)] mb-4">Créez en un clic</p>
          <div className="space-y-2 flex-1">
            {QUICK_ACTIONS.map((action, i) => {
              const Icon = action.icon
              return (
                <button key={i} onClick={() => navigate(action.path)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-surface)]/50 border border-[var(--border-base)] hover:border-[var(--text-muted)]/15 hover:bg-[var(--bg-surface)] transition-all group text-left">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${action.color}15` }}>
                    <Icon size={16} style={{ color: action.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">{action.label}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{action.desc}</p>
                  </div>
                  <Plus size={14} className="text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent events */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-base)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Derniers événements</h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Activité récente de paiement</p>
          </div>
          <button onClick={() => navigate('/coach/abonnements/transactions')} className="text-[11px] text-[#F59E0B] font-semibold hover:underline">Voir tout</button>
        </div>
        {recentEvents.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <CreditCard size={20} className="text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-[var(--text-muted)] text-sm">Aucun paiement pour le moment</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-base)]">
            {recentEvents.map(event => {
              const clientName = event.clients?.profiles?.nom || 'Client'
              const offreName = event.offres_coaching?.titre || ''
              const isPositive = event.statut === 'paye'
              const color = isPositive ? '#22C55E' : event.statut === 'rembourse' ? '#EF4444' : '#F59E0B'
              const EventIcon = isPositive ? CreditCard : event.statut === 'rembourse' ? ArrowDownRight : ShoppingBag
              const diff = Date.now() - new Date(event.created_at).getTime()
              const mins = Math.floor(diff / 60000)
              const hours = Math.floor(mins / 60)
              const days = Math.floor(hours / 24)
              const timeLabel = mins < 60 ? `Il y a ${mins} min` : hours < 24 ? `Il y a ${hours}h` : `Il y a ${days}j`

              return (
                <div key={event.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--bg-surface)]/30 transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}12` }}>
                    <EventIcon size={15} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--text-primary)]">
                      {event.statut === 'paye' ? 'Paiement reçu' : event.statut === 'rembourse' ? 'Remboursement' : 'En attente'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">{clientName}{offreName ? ` — ${offreName}` : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[13px] font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : '-'}{(event.montant / 100).toFixed(2)} €
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">{timeLabel}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
