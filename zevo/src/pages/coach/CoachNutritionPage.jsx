import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import {
  Search, Plus, UtensilsCrossed, Layers, Send,
  Loader2, Trash2, Calendar,
  X, Edit3, UserPlus, Copy, Check
} from 'lucide-react'

export default function CoachNutritionPage() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [plans, setPlans] = useState([])
  const [suiviData, setSuiviData] = useState({}) // { plan_id_client_id: [{ numero_semaine }] }
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState('assigned')
  const [searchTerm, setSearchTerm] = useState('')

  // Assign modal
  const [assignPlan, setAssignPlan] = useState(null) // plan object to assign
  const [coachClients, setCoachClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Fetch clients
  useEffect(() => {
    if (!user) return
    const fetchClients = async () => {
      // Via clients table (filtered by coach_id)
      const { data, error } = await supabase
        .from('clients')
        .select('id, actif, profiles(id, nom, prenom, email)')
        .eq('coach_id', user.id)
        .eq('actif', true)

      if (error) {
        console.error('[NutritionPage] Erreur fetch clients:', error)
        return
      }
      // Flatten: extract profile data, use profiles.id as the client identifier
      const clients = (data || [])
        .filter(c => c.profiles)
        .map(c => ({ id: c.profiles.id, nom: c.profiles.nom, prenom: c.profiles.prenom, email: c.profiles.email }))
      setCoachClients(clients)
    }
    fetchClients()
  }, [user])

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    if (!user) return
    setIsLoading(true)

    // Try with explicit FK hint first (client_id -> profiles)
    let { data, error } = await supabase
      .from('client_nutrition_plans')
      .select('*, profiles:client_id(id, nom, prenom)')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })

    // If the FK hint fails (400 error), fallback without join
    if (error) {
      console.warn('[NutritionPage] Join FK échouée, fallback sans join:', error.message)
      const res = await supabase
        .from('client_nutrition_plans')
        .select('*')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })
      data = res.data
      error = res.error
    }


    if (error) console.error('[NutritionPage] Erreur fetch:', error)
    setPlans(data || [])

    // Récupérer le suivi de progression nutrition via SECURITY DEFINER (bypass RLS)
    try {
      const { data: suivis, error: suiviErr } = await supabase
        .rpc('get_coach_suivi_nutrition', { coach_uid: user.id })

      if (suiviErr) {
        console.warn('[NutritionPage] suivi RPC error:', suiviErr.message)
      }

      const suiviMap = {}
      ;(suivis || []).forEach(s => {
        const key = `${s.plan_id}_${s.client_id}`
        if (!suiviMap[key]) suiviMap[key] = []
        suiviMap[key].push(s)
      })
      setSuiviData(suiviMap)
    } catch (suiviCatchErr) {
      console.warn('[NutritionPage] suivi fetch crashed:', suiviCatchErr)
    }

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


      // 2. Supprimer les aliments liés à ces repas
      if (repas && repas.length > 0) {
        const repasIds = repas.map(r => r.id)
        const { error: alimErr } = await supabase.from('repas_aliments').delete().in('repas_id', repasIds)
        if (alimErr) { console.error('Erreur 2 (Delete Aliments):', alimErr); throw alimErr }

      }

      // 3. Supprimer les repas
      const { error: repasErr } = await supabase.from('plan_repas').delete().eq('plan_id', planId)
      if (repasErr) { console.error('Erreur 3 (Delete Repas):', repasErr); throw repasErr }


      // 4. Supprimer le plan
      const { error: planErr } = await supabase.from('client_nutrition_plans').delete().eq('id', planId)
      if (planErr) { console.error('Erreur 4 (Delete Plan):', planErr); throw planErr }


      toast.success('Plan supprimé !')
      fetchPlans()
    } catch (error) {
      console.error('CRASH SUPPRESSION:', error)
      toast.error('Échec de la suppression. Regardez la console (F12).')
    }
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

      const cl = coachClients.find(c => c.id === selectedClient)
      const clientName = cl ? [cl.prenom, cl.nom].filter(Boolean).join(' ') : 'ce client'
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

  // ═══════════════════════════════════════
  // Helpers & filtres
  // ═══════════════════════════════════════

  const assignedPlans = plans.filter(p => p.client_id)
  const templatePlans = plans.filter(p => !p.client_id)

  const getClientName = (plan) => {
    if (plan.profiles?.nom) return [plan.profiles.prenom, plan.profiles.nom].filter(Boolean).join(' ')
    if (plan.client_id) {
      const cl = coachClients.find(c => c.id === plan.client_id)
      if (cl) return [cl.prenom, cl.nom].filter(Boolean).join(' ')
      return 'Client assigné'
    }
    return null
  }

  const getInitials = (plan) => {
    const name = getClientName(plan)
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  const term = searchTerm.toLowerCase()
  const filteredAssigned = assignedPlans.filter(p => {
    if (!term) return true
    const nom = (p.nom || '').toLowerCase()
    const clientNom = getClientName(p)?.toLowerCase() || ''
    return nom.includes(term) || clientNom.includes(term)
  })
  const filteredTemplates = templatePlans.filter(p => {
    if (!term) return true
    return (p.nom || '').toLowerCase().includes(term)
  })

  // ═══════════════════════════════════════
  // Render
  // ═══════════════════════════════════════

  return (
    <div className="p-4 md:p-8 w-full max-w-5xl mx-auto space-y-8">

      {/* ═══ Header ═══ */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[var(--text-primary)] text-3xl font-bold tracking-tight">Plans Nutrition</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1.5">Plans nutritionnels, macros et suivi client</p>
        </div>
        <button onClick={() => navigate('/coach/nutrition/new')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-xl shadow-[#FF6B2B]/25 shrink-0">
          <Plus size={16} /> Créer un plan
        </button>
      </div>

      {/* ═══ Tabs + Search ═══ */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-[var(--bg-card)] rounded-2xl p-1 border border-[var(--border-base)]">
          {[
            { key: 'assigned', label: 'Assignés', count: assignedPlans.length },
            { key: 'templates', label: 'Modèles', count: templatePlans.length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`py-2.5 px-5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                tab === t.key
                  ? 'bg-[#FF6B2B] text-white shadow-lg shadow-[#FF6B2B]/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}>
              {t.label}
              <span className={`ml-1.5 text-xs ${tab === t.key ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher..."
            className="w-56 bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl pl-10 pr-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 focus:ring-1 focus:ring-[#FF6B2B]/10 transition-all" />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-[#FF6B2B]" size={24} />
          <span className="text-[var(--text-muted)] text-sm">Chargement des plans...</span>
        </div>
      )}

      {/* ═══════ ONGLET : PLANS ASSIGNÉS ═══════ */}
      {!isLoading && tab === 'assigned' && (
        <>
          {filteredAssigned.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-base)] p-16 text-center">
              <div className="w-16 h-16 bg-[#FF6B2B]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Send size={28} className="text-[#FF6B2B]" />
              </div>
              <h3 className="text-[var(--text-primary)] font-bold text-lg mb-2">
                {searchTerm ? 'Aucun résultat' : 'Aucun plan assigné'}
              </h3>
              <p className="text-[var(--text-muted)] text-sm mb-6 max-w-sm mx-auto">
                {searchTerm ? `Aucun résultat pour "${searchTerm}"` : 'Crée un modèle puis assigne-le à un client.'}
              </p>
              {!searchTerm && (
                <button onClick={() => setTab('templates')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-surface)] transition-all">
                  <Layers size={14} /> Voir les modèles
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssigned.map(plan => {
                const clientName = getClientName(plan) || 'Client'
                const initials = getInitials(plan)

                const totalWeeks = plan.duree_semaines || 4
                const suiviKey = `${plan.id}_${plan.client_id}`
                const weeksDone = (suiviData[suiviKey] || []).length
                const progressPct = Math.min(100, Math.round((weeksDone / totalWeeks) * 100))
                const isComplete = progressPct >= 100

                return (
                  <div key={plan.id}
                    onClick={() => navigate(`/coach/nutrition/${plan.id}`)}
                    className="group bg-[var(--bg-card)] rounded-2xl border border-[var(--border-base)] p-5 md:p-6 hover:border-[var(--border-base)] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 transition-all duration-300 cursor-pointer">

                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold shrink-0 uppercase ${
                        isComplete ? 'bg-emerald-500/15 text-emerald-400 ring-2 ring-emerald-500/20' : 'bg-[#FF6B2B]/15 text-[#FF6B2B] ring-2 ring-[#FF6B2B]/10'
                      }`}>
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                          <h3 className="text-[var(--text-primary)] font-bold text-sm">{clientName}</h3>
                          <span className="w-1 h-1 rounded-full bg-white/15" />
                          <span className="text-[var(--text-muted)] text-sm truncate">{plan.nom || 'Plan du jour'}</span>
                        </div>

                        <div className="flex items-center gap-2 mb-3.5">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                            plan.is_active
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                              : 'text-[var(--text-muted)] bg-white/5 border-white/10'
                          }`}>
                            {plan.is_active ? 'Actif' : 'Inactif'}
                          </span>
                          {plan.date_plan && (
                            <span className="text-[var(--text-muted)] text-xs">
                              Depuis le {new Date(plan.date_plan).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ease-out ${
                                isComplete
                                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                  : 'bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold shrink-0 tabular-nums ${isComplete ? 'text-emerald-400' : 'text-[#FF6B2B]'}`}>
                            {weeksDone}/{totalWeeks} sem.
                          </span>
                        </div>
                      </div>

                      <button onClick={e => { e.stopPropagation(); handleDelete(plan.id, e) }}
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                        title="Supprimer le plan assigné">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════ ONGLET : MODÈLES ═══════ */}
      {!isLoading && tab === 'templates' && (
        <>
          {filteredTemplates.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-base)] p-20 text-center">
              <div className="w-20 h-20 bg-[#FF6B2B]/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <UtensilsCrossed size={32} className="text-[#FF6B2B]" />
              </div>
              <h3 className="text-[var(--text-primary)] font-bold text-xl mb-2">
                {searchTerm ? 'Aucun résultat' : 'Aucun plan nutritionnel'}
              </h3>
              <p className="text-[var(--text-muted)] text-sm mb-8 max-w-md mx-auto">
                {searchTerm ? `Aucun modèle pour "${searchTerm}"` : 'Crée ton premier plan nutritionnel pour commencer.'}
              </p>
              {!searchTerm && (
                <button onClick={() => navigate('/coach/nutrition/new')}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-xl shadow-[#FF6B2B]/25">
                  <Plus size={16} /> Créer un plan
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTemplates.map(plan => (
                <div key={plan.id}
                  className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-base)] overflow-hidden hover:border-[var(--border-base)] hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 transition-all duration-300 group">

                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6B2B] to-[#FF9A6C] flex items-center justify-center shrink-0 shadow-lg shadow-[#FF6B2B]/20">
                        <UtensilsCrossed size={20} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[var(--text-primary)] font-bold text-base leading-tight truncate">{plan.nom || 'Plan du jour'}</h3>
                        <p className="text-[var(--text-muted)] text-sm mt-1">
                          Créé le {new Date(plan.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); handleDelete(plan.id, e) }}
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-6">
                      <span className="inline-flex items-center gap-1.5 bg-[var(--bg-base)] px-3 py-1.5 rounded-xl text-xs text-[var(--text-muted)] font-medium border border-[var(--border-subtle)]">
                        <Calendar size={12} /> {plan.duree_semaines || 4} sem.
                      </span>
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                        plan.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                          : 'bg-white/5 text-[var(--text-muted)] border-[var(--border-subtle)]'
                      }`}>
                        {plan.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => navigate(`/coach/nutrition/${plan.id}`)}
                        className="py-2.5 rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-surface)] hover:text-white transition-all flex items-center justify-center gap-2 border border-[var(--border-subtle)]">
                        <Edit3 size={14} /> Modifier
                      </button>
                      <button onClick={() => setAssignPlan(plan)}
                        className="py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B2B]/20">
                        <UserPlus size={14} /> Assigner
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ Assign Modal ═══ */}
      {assignPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setAssignPlan(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[var(--bg-card)] rounded-2xl border border-[var(--border-base)] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="h-1 bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]" />

            <div className="px-6 pt-5 pb-4 border-b border-[var(--border-base)] flex items-center justify-between">
              <div>
                <h2 className="text-[var(--text-primary)] text-lg font-bold">Assigner le plan</h2>
                <p className="text-[var(--text-muted)] text-sm mt-0.5">{assignPlan.nom || 'Plan du jour'}</p>
              </div>
              <button onClick={() => setAssignPlan(null)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-2 font-medium">
                  Sélectionner un client <span className="text-[var(--text-muted)]">({coachClients.length} trouvé{coachClients.length > 1 ? 's' : ''})</span>
                </label>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {coachClients.length === 0 ? (
                    <p className="text-[var(--text-muted)] text-xs text-center py-4">Aucun client trouvé</p>
                  ) : coachClients.map(c => {
                    const displayName = (c.prenom && c.nom) ? `${c.prenom} ${c.nom}` : (c.prenom || c.nom || c.email || 'Client sans nom')
                    const isSelected = selectedClient === c.id
                    const i1 = c.prenom ? c.prenom.charAt(0) : (c.email ? c.email.charAt(0) : '?')
                    const i2 = c.nom ? c.nom.charAt(0) : ''
                    const initials = `${i1}${i2}`.toUpperCase()
                    return (
                      <button key={c.id} onClick={() => setSelectedClient(c.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                          isSelected ? 'bg-[#FF6B2B]/10 border border-[#FF6B2B]/30' : 'hover:bg-[var(--bg-surface)] border border-transparent'
                        }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected ? 'bg-[#FF6B2B] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                        }`}>{initials}</div>
                        <span className={`text-sm font-medium ${isSelected ? 'text-[#FF6B2B]' : 'text-[var(--text-primary)]'}`}>{displayName}</span>
                        {isSelected && <Check size={14} className="text-[#FF6B2B] ml-auto" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setAssignPlan(null)}
                className="flex-1 py-3 rounded-xl text-sm text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all border border-[var(--border-subtle)]">
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
