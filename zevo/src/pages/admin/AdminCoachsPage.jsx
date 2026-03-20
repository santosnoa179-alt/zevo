import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Search, UserCheck, UserX, Users, ArrowUpDown,
  CheckCircle, XCircle, Filter
} from 'lucide-react'

const PLAN_PRICES = { starter: 39, pro: 59, unlimited: 79 }

export default function AdminCoachsPage() {
  const [loading, setLoading] = useState(true)
  const [coaches, setCoaches] = useState([])
  const [clientCounts, setClientCounts] = useState({})
  const [search, setSearch] = useState('')
  const [filtrePlan, setFiltrePlan] = useState('tous')
  const [filtreActif, setFiltreActif] = useState('tous')
  const [sortBy, setSortBy] = useState('date') // date | clients | plan
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    chargerCoachs()
  }, [])

  const chargerCoachs = async () => {
    setLoading(true)

    const { data: coachsData } = await supabase
      .from('coaches')
      .select('id, plan, abonnement_actif, stripe_customer_id, created_at, profiles(nom, email)')
      .order('created_at', { ascending: false })

    const allCoaches = coachsData || []
    setCoaches(allCoaches)

    // Compter les clients par coach
    const { data: clientsData } = await supabase
      .from('clients')
      .select('coach_id')

    const counts = {}
    ;(clientsData || []).forEach(c => {
      counts[c.coach_id] = (counts[c.coach_id] || 0) + 1
    })
    setClientCounts(counts)

    setLoading(false)
  }

  // ── Actions admin ──
  const toggleAbonnement = async (coachId, actif) => {
    setActionLoading(coachId)
    await supabase
      .from('coaches')
      .update({ abonnement_actif: !actif })
      .eq('id', coachId)
    setCoaches(prev =>
      prev.map(c => c.id === coachId ? { ...c, abonnement_actif: !actif } : c)
    )
    setActionLoading(null)
  }

  const changerPlan = async (coachId, nouveauPlan) => {
    setActionLoading(coachId)
    await supabase
      .from('coaches')
      .update({ plan: nouveauPlan })
      .eq('id', coachId)
    setCoaches(prev =>
      prev.map(c => c.id === coachId ? { ...c, plan: nouveauPlan } : c)
    )
    setActionLoading(null)
  }

  // ── Filtrage & tri ──
  let coachsFiltres = coaches

  if (search.trim()) {
    const q = search.toLowerCase()
    coachsFiltres = coachsFiltres.filter(c =>
      c.profiles?.nom?.toLowerCase().includes(q) ||
      c.profiles?.email?.toLowerCase().includes(q)
    )
  }

  if (filtrePlan !== 'tous') {
    coachsFiltres = coachsFiltres.filter(c => c.plan === filtrePlan)
  }

  if (filtreActif !== 'tous') {
    coachsFiltres = coachsFiltres.filter(c =>
      filtreActif === 'actif' ? c.abonnement_actif : !c.abonnement_actif
    )
  }

  coachsFiltres = [...coachsFiltres].sort((a, b) => {
    if (sortBy === 'clients') return (clientCounts[b.id] || 0) - (clientCounts[a.id] || 0)
    if (sortBy === 'plan') {
      const order = { unlimited: 3, pro: 2, starter: 1 }
      return (order[b.plan] || 0) - (order[a.plan] || 0)
    }
    return new Date(b.created_at) - new Date(a.created_at)
  })

  if (loading) {
    return (
      <div className="p-6 w-full">
        <div className="h-8 w-36 bg-[#2A2A2A] rounded animate-pulse mb-8" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-[#1E1E1E] rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[#F5F5F3] text-2xl font-bold">Coachs</h1>
          <p className="text-white/40 text-sm mt-0.5">{coaches.length} comptes — {coaches.filter(c => c.abonnement_actif).length} actifs</p>
        </div>
      </div>

      {/* ── Barre de recherche + filtres ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un coach..."
            className="w-full bg-[#1E1E1E] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#F5F5F3] placeholder-white/20 focus:border-[#FF6B2B]/50 focus:outline-none transition-colors"
          />
        </div>

        <select
          value={filtrePlan}
          onChange={(e) => setFiltrePlan(e.target.value)}
          className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-[#F5F5F3] focus:outline-none"
        >
          <option value="tous">Tous les plans</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="unlimited">Unlimited</option>
        </select>

        <select
          value={filtreActif}
          onChange={(e) => setFiltreActif(e.target.value)}
          className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-[#F5F5F3] focus:outline-none"
        >
          <option value="tous">Tous statuts</option>
          <option value="actif">Actifs</option>
          <option value="inactif">Inactifs</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-[#F5F5F3] focus:outline-none"
        >
          <option value="date">Trier par date</option>
          <option value="clients">Trier par nb clients</option>
          <option value="plan">Trier par plan</option>
        </select>
      </div>

      {/* ── Tableau des coachs ── */}
      <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-6 gap-4 px-5 py-3 border-b border-white/[0.06] text-white/30 text-xs font-semibold uppercase tracking-wider">
          <span className="col-span-2">Coach</span>
          <span>Plan</span>
          <span>Clients</span>
          <span>Statut</span>
          <span>Actions</span>
        </div>

        {coachsFiltres.length === 0 ? (
          <div className="p-10 text-center text-white/30 text-sm">Aucun coach trouvé</div>
        ) : (
          coachsFiltres.map(c => (
            <div
              key={c.id}
              className="grid grid-cols-6 gap-4 px-5 py-4 border-b border-white/[0.04] items-center hover:bg-white/[0.02] transition-colors"
            >
              {/* Nom + email */}
              <div className="col-span-2">
                <p className="text-[#F5F5F3] text-sm font-medium truncate">
                  {c.profiles?.nom || '—'}
                </p>
                <p className="text-white/30 text-xs truncate">{c.profiles?.email}</p>
                <p className="text-white/20 text-[10px] mt-0.5">
                  Inscrit le {new Date(c.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>

              {/* Plan (modifiable) */}
              <div>
                <select
                  value={c.plan || 'starter'}
                  onChange={(e) => changerPlan(c.id, e.target.value)}
                  disabled={actionLoading === c.id}
                  className={`bg-transparent border rounded-lg px-2 py-1 text-xs font-medium cursor-pointer focus:outline-none disabled:opacity-40 ${
                    c.plan === 'unlimited' ? 'border-green-500/30 text-green-400'
                      : c.plan === 'pro' ? 'border-[#FF6B2B]/30 text-[#FF6B2B]'
                      : 'border-blue-500/30 text-blue-400'
                  }`}
                >
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="unlimited">Unlimited</option>
                </select>
              </div>

              {/* Nb clients */}
              <div className="flex items-center gap-1.5">
                <Users size={14} className="text-white/25" />
                <span className="text-[#F5F5F3] text-sm font-medium">{clientCounts[c.id] || 0}</span>
              </div>

              {/* Statut */}
              <div>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                  c.abonnement_actif
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {c.abonnement_actif ? <CheckCircle size={10} /> : <XCircle size={10} />}
                  {c.abonnement_actif ? 'Actif' : 'Inactif'}
                </span>
              </div>

              {/* Actions */}
              <div>
                <button
                  onClick={() => toggleAbonnement(c.id, c.abonnement_actif)}
                  disabled={actionLoading === c.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${
                    c.abonnement_actif
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-green-400 hover:bg-green-500/10'
                  }`}
                >
                  {c.abonnement_actif ? <UserX size={12} /> : <UserCheck size={12} />}
                  {c.abonnement_actif ? 'Suspendre' : 'Activer'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
