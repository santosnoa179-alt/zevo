import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import {
  Search, Filter, Plus, Apple, UtensilsCrossed,
  Loader2, MoreVertical, Trash2, Calendar,
  ChevronRight, X, Users
} from 'lucide-react'

const TABS = [
  { id: 'all', label: 'Tous les plans' },
  { id: 'assigned', label: 'Assignés' },
  { id: 'templates', label: 'Modèles' },
]

export default function CoachNutritionPage() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [plans, setPlans] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [filterStatus, setFilterStatus] = useState('tous')
  const [actionMenu, setActionMenu] = useState(null)

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    if (!user) return
    setIsLoading(true)

    const { data, error } = await supabase
      .from('client_nutrition_plans')
      .select('*, profiles:client_id(nom, prenom)')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[NutritionPage] Erreur fetch:', error)
    }
    console.log('[NutritionPage] Plans récupérés:', data)
    setPlans(data || [])
    setIsLoading(false)
  }, [user])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  // Delete plan
  const handleDelete = async (planId) => {
    if (!confirm('Supprimer ce plan nutritionnel ? Cette action est irréversible.')) return
    const { error } = await supabase.from('client_nutrition_plans').delete().eq('id', planId)
    if (error) {
      toast.error('Erreur lors de la suppression')
    } else {
      toast.success('Plan supprimé')
      fetchPlans()
    }
    setActionMenu(null)
  }

  // Filter logic
  const filteredPlans = plans.filter(p => {
    // Tab filter
    if (activeTab === 'assigned' && !p.client_id) return false
    if (activeTab === 'templates' && p.client_id) return false

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const nom = p.nom?.toLowerCase() || ''
      const clientNom = p.profiles?.nom?.toLowerCase() || ''
      if (!nom.includes(term) && !clientNom.includes(term)) return false
    }

    return true
  })

  // Tab counts
  const counts = {
    all: plans.length,
    assigned: plans.filter(p => p.client_id).length,
    templates: plans.filter(p => !p.client_id).length,
  }

  // Client name helper
  const getClientName = (plan) => {
    if (!plan.profiles) return null
    const p = plan.profiles
    return [p.prenom, p.nom].filter(Boolean).join(' ') || null
  }

  const getInitials = (plan) => {
    const name = getClientName(plan)
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div className="p-4 md:p-6 w-full space-y-6">

      {/* ═══ Header ═══ */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[#F5F5F3] text-2xl font-bold">Gestion Nutrition</h1>
          <p className="text-white/25 text-sm mt-1">Plans nutritionnels, macros et bibliothèque d'aliments</p>
        </div>
        <button
          onClick={() => navigate('/coach/nutrition/new')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-lg shadow-[#FF6B2B]/20 shrink-0">
          <Plus size={16} /> Créer un plan
        </button>
      </div>

      {/* ═══ Tabs ═══ */}
      <div className="flex items-center gap-3">
        <div className="bg-[#18181b] p-1 flex rounded-xl w-fit">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#27272a] text-white shadow-sm'
                  : 'text-white/35 hover:text-white/60'
              }`}>
              {tab.label}
              <span className={`ml-1.5 text-xs ${activeTab === tab.id ? 'text-[#FF6B2B]' : 'text-white/15'}`}>
                ({counts[tab.id]})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Toolbar ═══ */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher un plan..."
            className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-9 pr-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/40 transition-all" />
        </div>
        <div className="relative">
          <button onClick={() => setShowFilter(!showFilter)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white/40 text-sm hover:text-white/60 transition-all">
            <Filter size={14} /> Filtrer
          </button>
          {showFilter && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowFilter(false)} />
              <div className="absolute left-0 top-full mt-2 z-50 w-44 bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden">
                {['tous', 'récent', 'ancien'].map(f => (
                  <button key={f} onClick={() => { setFilterStatus(f); setShowFilter(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-all ${
                      filterStatus === f ? 'text-[#FF6B2B] bg-[#FF6B2B]/5' : 'text-white/40 hover:bg-white/[0.03]'
                    }`}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══ Table ═══ */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-[#27272a] text-[10px] uppercase tracking-wider text-white/20 font-bold">
          <div className="col-span-4">Titre</div>
          <div className="col-span-2">Client</div>
          <div className="col-span-2">Calories</div>
          <div className="col-span-2">Créé le</div>
          <div className="col-span-1">Statut</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="animate-spin text-[#FF6B2B]" size={20} />
            <span className="text-white/25 text-sm">Chargement des plans...</span>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredPlans.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-[#FF6B2B]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed size={24} className="text-[#FF6B2B]" />
            </div>
            <h3 className="text-[#F5F5F3] font-semibold mb-1">Aucun plan nutritionnel</h3>
            <p className="text-white/25 text-sm mb-6 max-w-xs mx-auto">
              {searchTerm ? `Aucun résultat pour "${searchTerm}"` : 'Créez votre premier plan pour commencer'}
            </p>
            {!searchTerm && (
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-lg shadow-[#FF6B2B]/20">
                <Plus size={14} /> Créer un plan
              </button>
            )}
          </div>
        )}

        {/* Rows */}
        {!isLoading && filteredPlans.map(plan => {
          const clientName = getClientName(plan)
          const initials = getInitials(plan)

          return (
            <div key={plan.id}
              className="grid grid-cols-12 gap-3 px-5 py-4 border-b border-[#27272a]/30 hover:bg-white/[0.02] transition-colors items-center group">

              {/* Titre */}
              <div className="col-span-4 flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center shrink-0">
                  <UtensilsCrossed size={15} className="text-[#FF6B2B]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[#F5F5F3] text-sm font-semibold truncate">{plan.nom || 'Plan du jour'}</p>
                  <p className="text-white/20 text-[10px] mt-0.5">
                    {plan.date_plan ? new Date(plan.date_plan).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '—'}
                  </p>
                </div>
              </div>

              {/* Client */}
              <div className="col-span-2">
                {clientName ? (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#27272a] flex items-center justify-center shrink-0" title={clientName}>
                      <span className="text-[10px] text-white/50 font-bold">{initials}</span>
                    </div>
                    <span className="text-white/50 text-xs truncate">{clientName}</span>
                  </div>
                ) : (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">Modèle</span>
                )}
              </div>

              {/* Calories */}
              <div className="col-span-2">
                <span className="text-white/40 text-sm">—</span>
              </div>

              {/* Créé le */}
              <div className="col-span-2">
                <span className="text-white/30 text-xs">
                  {new Date(plan.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              {/* Statut */}
              <div className="col-span-1">
                <span className="text-[9px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">
                  Actif
                </span>
              </div>

              {/* Actions */}
              <div className="col-span-1 flex justify-end relative">
                <button onClick={e => { e.stopPropagation(); setActionMenu(actionMenu === plan.id ? null : plan.id) }}
                  className="p-1.5 rounded-lg text-white/15 hover:text-white/40 hover:bg-white/[0.04] transition-all opacity-0 group-hover:opacity-100">
                  <MoreVertical size={14} />
                </button>
                {actionMenu === plan.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActionMenu(null)} />
                    <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden">
                      <button onClick={() => handleDelete(plan.id)}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                        <Trash2 size={13} /> Supprimer
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
