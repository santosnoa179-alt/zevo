import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import {
  Search, Filter, Plus, Apple, UtensilsCrossed,
  Loader2, MoreVertical, Trash2, Calendar,
  ChevronRight, X, Users, Edit3, UserPlus, Copy, Check
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

  // Assign modal
  const [assignPlan, setAssignPlan] = useState(null) // plan object to assign
  const [coachClients, setCoachClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Fetch clients
  useEffect(() => {
    if (!user) return
    const fetchClients = async () => {
      console.log('🔍 1. [NutritionPage] Tentative de récupération des clients...')

      // Test sans filtre pour voir ce qui existe dans profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('*')

      console.log('🛑 2. [NutritionPage] Résultat Supabase -> Data:', data, 'Erreur:', error)
      if (error) {
        console.error('Erreur fatale Supabase:', error)
        return
      }

      // Transform all profiles to match expected { id, profiles: { id, nom, prenom } }
      setCoachClients((data || []).map(p => ({ id: p.id, profiles: { id: p.id, nom: p.nom, prenom: p.prenom, email: p.email } })))
    }
    fetchClients()
  }, [user])

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
  const handleDelete = async (planId, e) => {
    e.stopPropagation()
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce plan ?')) return
    try {
      // 1. Trouver les repas du plan
      const { data: repas, error: fetchErr } = await supabase.from('plan_repas').select('id').eq('plan_id', planId)
      if (fetchErr) { console.error('Erreur 1 (Fetch Repas):', fetchErr); throw fetchErr }
      console.log('DEBUG DELETE - Repas trouvés:', repas?.length || 0)

      // 2. Supprimer les aliments liés à ces repas
      if (repas && repas.length > 0) {
        const repasIds = repas.map(r => r.id)
        const { error: alimErr } = await supabase.from('repas_aliments').delete().in('repas_id', repasIds)
        if (alimErr) { console.error('Erreur 2 (Delete Aliments):', alimErr); throw alimErr }
        console.log('DEBUG DELETE - Aliments supprimés pour', repasIds.length, 'repas')
      }

      // 3. Supprimer les repas
      const { error: repasErr } = await supabase.from('plan_repas').delete().eq('plan_id', planId)
      if (repasErr) { console.error('Erreur 3 (Delete Repas):', repasErr); throw repasErr }
      console.log('DEBUG DELETE - Repas supprimés')

      // 4. Supprimer le plan
      const { error: planErr } = await supabase.from('client_nutrition_plans').delete().eq('id', planId)
      if (planErr) { console.error('Erreur 4 (Delete Plan):', planErr); throw planErr }
      console.log('DEBUG DELETE - Plan supprimé:', planId)

      toast.success('Plan supprimé !')
      fetchPlans()
    } catch (error) {
      console.error('CRASH SUPPRESSION:', error)
      toast.error('Échec de la suppression. Regardez la console (F12).')
    }
    setActionMenu(null)
  }

  // Assign plan to client (copy)
  const handleAssign = async () => {
    if (!assignPlan || !selectedClient) return
    setAssigning(true)
    try {
      // Copy the plan with client_id
      const { data: newPlan, error } = await supabase
        .from('client_nutrition_plans')
        .insert({
          coach_id: user.id,
          client_id: selectedClient,
          nom: assignPlan.nom || 'Plan du jour',
          date_plan: new Date().toISOString().split('T')[0],
        })
        .select()
        .single()

      if (error) throw error

      // Copy repas if they exist
      const { data: repasData } = await supabase
        .from('plan_repas')
        .select('*, repas_aliments(*)')
        .eq('plan_id', assignPlan.id)

      if (repasData?.length > 0) {
        for (const repas of repasData) {
          const { data: newRepas } = await supabase
            .from('plan_repas')
            .insert({ plan_id: newPlan.id, type: repas.type, ordre: repas.ordre })
            .select().single()

          if (newRepas && repas.repas_aliments?.length > 0) {
            const alRows = repas.repas_aliments.map(a => ({
              repas_id: newRepas.id,
              aliment_id: a.aliment_id,
              quantite_g: a.quantite_g,
              ordre: a.ordre,
            }))
            await supabase.from('repas_aliments').insert(alRows)
          }
        }
      }

      const clientName = coachClients.find(c => c.profiles?.id === selectedClient)?.profiles?.nom || 'ce client'
      toast.success(`Plan assigné à ${clientName} !`)
      setAssignPlan(null)
      setSelectedClient('')
      fetchPlans()
    } catch (err) {
      console.error('[NutritionPage] Erreur assignation:', err)
      toast.error('Erreur : ' + (err.message || 'Assignation échouée'))
    }
    setAssigning(false)
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
              onClick={() => navigate(`/coach/nutrition/${plan.id}`)}
              className="grid grid-cols-12 gap-3 px-5 py-4 border-b border-[#27272a]/30 hover:bg-white/[0.02] transition-colors items-center group cursor-pointer">

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
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all">
                  <MoreVertical size={14} />
                </button>
                {actionMenu === plan.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActionMenu(null)} />
                    <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden">
                      <button onClick={e => { e.stopPropagation(); setActionMenu(null); navigate(`/coach/nutrition/${plan.id}`) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white/50 hover:bg-white/[0.03] transition-colors flex items-center gap-2">
                        <Edit3 size={13} /> Modifier
                      </button>
                      <button onClick={e => { e.stopPropagation(); setActionMenu(null); setAssignPlan(plan) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-[#FF6B2B] hover:bg-[#FF6B2B]/5 transition-colors flex items-center gap-2">
                        <UserPlus size={13} /> Assigner à un client
                      </button>
                      <div className="border-t border-[#27272a]" />
                      <button onClick={e => handleDelete(plan.id, e)}
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

      {/* ═══ Assign Modal ═══ */}
      {assignPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setAssignPlan(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[#1E1E1E] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="h-1 bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]" />

            <div className="px-6 pt-5 pb-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h2 className="text-[#F5F5F3] text-lg font-bold">Assigner le plan</h2>
                <p className="text-white/30 text-sm mt-0.5">{assignPlan.nom || 'Plan du jour'}</p>
              </div>
              <button onClick={() => setAssignPlan(null)}
                className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.06] transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-white/40 mb-2 font-medium">Sélectionner un client</label>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {coachClients.length === 0 ? (
                    <p className="text-white/20 text-xs text-center py-4">Aucun client actif</p>
                  ) : coachClients.map(c => {
                    const nom = [c.profiles?.prenom, c.profiles?.nom].filter(Boolean).join(' ') || 'Client'
                    const profileId = c.profiles?.id
                    const isSelected = selectedClient === profileId
                    const initials = nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    return (
                      <button key={c.id} onClick={() => setSelectedClient(profileId)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                          isSelected ? 'bg-[#FF6B2B]/10 border border-[#FF6B2B]/30' : 'hover:bg-white/[0.03] border border-transparent'
                        }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected ? 'bg-[#FF6B2B] text-white' : 'bg-[#2A2A2A] text-white/40'
                        }`}>{initials}</div>
                        <span className={`text-sm font-medium ${isSelected ? 'text-[#FF6B2B]' : 'text-[#F5F5F3]'}`}>{nom}</span>
                        {isSelected && <Check size={14} className="text-[#FF6B2B] ml-auto" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setAssignPlan(null)}
                className="flex-1 py-3 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/[0.04] transition-all border border-white/[0.04]">
                Annuler
              </button>
              <button onClick={handleAssign} disabled={!selectedClient || assigning}
                className="flex-1 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B2B]/20">
                {assigning ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                {assigning ? 'Assignation...' : 'Assigner le plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
