import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import Ring from '../../components/ui/Ring'
import {
  Search, Plus, UtensilsCrossed, Layers, Send,
  Loader2, Trash2, Calendar, Users, CheckCircle, Activity,
  X, Edit3, UserPlus, Copy, Check
} from 'lucide-react'

// Palette avatar atténuée — cohérence Fitness OS
const AVATAR_COLORS = ['#FF6B2B', '#64748b', '#475569', '#9ca3af', '#334155', '#7c7c7c', '#FF9A6C']

export default function CoachNutritionPage() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [plans, setPlans] = useState([])
  const [programmes, setProgrammes] = useState([])
  const [suiviData, setSuiviData] = useState({}) // { plan_id_client_id: [{ numero_semaine }] }
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState('assigned')
  const [searchTerm, setSearchTerm] = useState('')

  // Assign modal
  const [assignPlan, setAssignPlan] = useState(null) // plan object to assign (legacy)
  // Assignation programme Pro (nutrition_programmes)
  const [proAssignId, setProAssignId] = useState(null)
  const [proAssignClientId, setProAssignClientId] = useState('')
  const [assigningPro, setAssigningPro] = useState(false)
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

    // Fetch programmes multi-semaines (V1) — table séparée des plans simples
    try {
      const { data: progs, error: progsErr } = await supabase
        .from('nutrition_programmes')
        .select('*, profiles:client_id(id, nom, prenom)')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })
      if (progsErr) console.warn('[NutritionPage] fetch programmes err:', progsErr.message)
      setProgrammes(progs || [])
    } catch (e) {
      console.warn('[NutritionPage] programmes table absente (run schema SQL ?)', e)
      setProgrammes([])
    }

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
  // ── Assigner un programme Pro nutrition = clone complet pour le client ──
  const handleAssignProNutrition = async () => {
    if (!proAssignId || !proAssignClientId) return
    setAssigningPro(true)
    try {
      // 1. Fetch source programme + tout l'arbre
      const [srcProgRes, srcPhasesRes, srcJourTypesRes, srcPhaseJoursRes, srcRepasRes, srcAlimentsRes] = await Promise.all([
        supabase.from('nutrition_programmes').select('*').eq('id', proAssignId).single(),
        supabase.from('nutrition_phases').select('*').eq('programme_id', proAssignId).order('ordre'),
        supabase.from('nutrition_jour_types').select('*').order('ordre'),
        supabase.from('nutrition_phase_jours').select('*'),
        supabase.from('nutrition_programme_repas').select('*').order('ordre'),
        supabase.from('nutrition_programme_repas_aliments').select('*'),
      ])
      const srcProg = srcProgRes.data
      if (!srcProg) throw new Error('Programme introuvable')

      const phaseIds = (srcPhasesRes.data || []).map(p => p.id)
      const jourTypes = (srcJourTypesRes.data || []).filter(jt => phaseIds.includes(jt.phase_id))
      const phaseJours = (srcPhaseJoursRes.data || []).filter(pj => phaseIds.includes(pj.phase_id))
      const jtIds = jourTypes.map(jt => jt.id)
      const repas = (srcRepasRes.data || []).filter(r => jtIds.includes(r.jour_type_id))
      const repasIds = repas.map(r => r.id)
      const aliments = (srcAlimentsRes.data || []).filter(a => repasIds.includes(a.repas_id))

      // 2. Créer nouveau programme assigné au client
      const { data: newProg, error: newProgErr } = await supabase.from('nutrition_programmes').insert({
        coach_id: user.id,
        client_id: proAssignClientId,
        nom: srcProg.nom,
        description: srcProg.description,
        objectif: srcProg.objectif,
        duree_semaines: srcProg.duree_semaines,
        is_template: false,
        is_active: true,
        date_debut: new Date().toISOString().slice(0, 10),
      }).select().single()
      if (newProgErr) throw newProgErr

      // 3. Dupliquer phases + mapping IDs
      const phaseIdMap = {}
      for (const ph of srcPhasesRes.data || []) {
        const { data: newPh, error } = await supabase.from('nutrition_phases').insert({
          programme_id: newProg.id,
          nom: ph.nom, ordre: ph.ordre,
          semaine_debut: ph.semaine_debut, duree_semaines: ph.duree_semaines,
          kcal_cible: ph.kcal_cible,
          proteines_cible_g: ph.proteines_cible_g,
          glucides_cible_g: ph.glucides_cible_g,
          lipides_cible_g: ph.lipides_cible_g,
          notes: ph.notes,
        }).select().single()
        if (error) throw error
        phaseIdMap[ph.id] = newPh.id
      }

      // 4. Dupliquer jour_types + mapping
      const jtIdMap = {}
      for (const jt of jourTypes) {
        const { data: newJt, error } = await supabase.from('nutrition_jour_types').insert({
          phase_id: phaseIdMap[jt.phase_id],
          nom: jt.nom, icon: jt.icon, ordre: jt.ordre, notes: jt.notes,
        }).select().single()
        if (error) throw error
        jtIdMap[jt.id] = newJt.id
      }

      // 5. Dupliquer repas + mapping
      const repasIdMap = {}
      for (const r of repas) {
        const { data: newR, error } = await supabase.from('nutrition_programme_repas').insert({
          jour_type_id: jtIdMap[r.jour_type_id],
          type: r.type, ordre: r.ordre, titre: r.titre, description: r.description,
          proteines_g: r.proteines_g, glucides_g: r.glucides_g, lipides_g: r.lipides_g,
        }).select().single()
        if (error) throw error
        repasIdMap[r.id] = newR.id
      }

      // 6. Dupliquer aliments des repas
      if (aliments.length) {
        const alimRows = aliments.map(a => ({
          repas_id: repasIdMap[a.repas_id],
          aliment_id: a.aliment_id,
          quantite_g: a.quantite_g,
          ordre: a.ordre,
        })).filter(a => a.repas_id)
        if (alimRows.length) {
          const { error: alErr } = await supabase.from('nutrition_programme_repas_aliments').insert(alimRows)
          if (alErr) throw alErr
        }
      }

      // 7. Dupliquer phase_jours
      if (phaseJours.length) {
        const pjRows = phaseJours.map(pj => ({
          phase_id: phaseIdMap[pj.phase_id],
          jour_semaine: pj.jour_semaine,
          jour_type_id: pj.jour_type_id ? jtIdMap[pj.jour_type_id] : null,
        })).filter(pj => pj.phase_id)
        if (pjRows.length) {
          const { error: pjErr } = await supabase.from('nutrition_phase_jours').insert(pjRows)
          if (pjErr) throw pjErr
        }
      }

      toast.success('Programme assigné au client !')
      setProAssignId(null)
      setProAssignClientId('')
      fetchPlans()
    } catch (err) {
      console.error('[handleAssignProNutrition]', err)
      toast.error('Erreur : ' + (err.message || err))
    }
    setAssigningPro(false)
  }

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

  // Stats overview
  const totalAssigned = assignedPlans.length
  const activeAssigned = assignedPlans.filter(p => p.is_active).length
  const totalProgressPct = (() => {
    if (assignedPlans.length === 0) return 0
    let total = 0
    assignedPlans.forEach(p => {
      const weeks = p.duree_semaines || 4
      const done = (suiviData[`${p.id}_${p.client_id}`] || []).length
      total += Math.min(100, Math.round((done / weeks) * 100))
    })
    return Math.round(total / assignedPlans.length)
  })()
  const completedCount = assignedPlans.filter(p => {
    const weeks = p.duree_semaines || 4
    const done = (suiviData[`${p.id}_${p.client_id}`] || []).length
    return done >= weeks
  }).length

  return (
    <div className="p-4 md:p-6 w-full max-w-[1400px] mx-auto space-y-5 md:space-y-6">

      {/* ═══ Header ═══ */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[var(--text-primary)] text-2xl md:text-3xl font-bold tracking-tight">Nutrition</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1.5">Programmes multi-phases avec journées types et bibliothèque de repas</p>
        </div>
        <button onClick={() => navigate('/coach/nutrition/programme/new')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all active:scale-95 shrink-0">
          <Plus size={15} /> Créer un programme
        </button>
      </div>

      {/* ═══ Stats overview — metric-card ═══ */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Plans assignés', value: totalAssigned, icon: Users, ringValue: totalAssigned, ringMax: Math.max(1, totalAssigned) },
            { label: 'Actifs', value: activeAssigned, icon: Activity, ringValue: activeAssigned, ringMax: Math.max(1, totalAssigned) },
            { label: 'Progression moy.', value: `${totalProgressPct}%`, icon: Send, ringValue: totalProgressPct, ringMax: 100 },
            { label: 'Terminés', value: completedCount, icon: CheckCircle, ringValue: completedCount, ringMax: Math.max(1, totalAssigned) },
          ].map((s, i) => (
            <div key={i} className="metric-card p-3 md:p-4">
              <div className="relative z-[1] flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <s.icon size={11} className="text-[var(--text-muted)]" />
                    <p className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-[0.14em] truncate">{s.label}</p>
                  </div>
                  <p className="text-[var(--text-primary)] text-[22px] md:text-[24px] font-black tabular-nums tracking-tight leading-none">{s.value}</p>
                </div>
                <Ring
                  value={s.ringValue}
                  max={s.ringMax}
                  size={40}
                  thickness={3.5}
                  color="#FF6B2B"
                  trackColor="var(--ring-track)"
                  className="shrink-0"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Tabs + Search ═══ */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl p-1">
          {[
            { key: 'assigned', label: 'Assignés', count: assignedPlans.length + programmes.filter(p => p.client_id).length },
            { key: 'templates', label: 'Modèles', count: templatePlans.length + programmes.filter(p => !p.client_id).length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`py-2 px-4 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                tab === t.key
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-base)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent'
              }`}>
              {t.label}
              <span className={`ml-1.5 text-[10px] font-bold tabular-nums ${tab === t.key ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 md:flex-none max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher..."
            className="w-full md:w-56 bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl pl-9 pr-3 py-2 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 focus:ring-1 focus:ring-[#FF6B2B]/10 transition-all" />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-[#FF6B2B]" size={20} />
          <span className="text-[var(--text-muted)] text-sm">Chargement des plans...</span>
        </div>
      )}

      {/* ═══════ ONGLET : PLANS ASSIGNÉS ═══════ */}
      {!isLoading && tab === 'assigned' && (
        <>
          {filteredAssigned.length === 0 && programmes.filter(p => p.client_id).length === 0 ? (
            <div className="hero-card p-12 text-center">
              <Send size={28} className="text-[var(--text-muted)] mx-auto mb-4 animate-breathe" strokeWidth={1.5} />
              <h3 className="text-[var(--text-primary)] font-bold text-base mb-2 tracking-tight">
                {searchTerm ? 'Aucun résultat' : 'Aucun plan assigné'}
              </h3>
              <p className="text-[var(--text-muted)] text-sm mb-5 max-w-sm mx-auto">
                {searchTerm ? `Aucun résultat pour "${searchTerm}"` : 'Crée un modèle puis assigne-le à un client.'}
              </p>
              {!searchTerm && (
                <button onClick={() => setTab('templates')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs font-semibold hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] transition-all">
                  <Layers size={13} /> Voir les modèles
                </button>
              )}
            </div>
          ) : (
            /* Grid responsive — scale avec beaucoup de clients (1 / 2 / 3 colonnes) */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredAssigned.map((plan, idx) => {
                const clientName = getClientName(plan) || 'Client'
                const initials = getInitials(plan)
                const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length]

                const totalWeeks = plan.duree_semaines || 4
                const suiviKey = `${plan.id}_${plan.client_id}`
                const weeksDone = (suiviData[suiviKey] || []).length
                const progressPct = Math.min(100, Math.round((weeksDone / totalWeeks) * 100))
                const isComplete = progressPct >= 100

                return (
                  <div key={plan.id}
                    onClick={() => navigate(`/coach/nutrition/${plan.id}`)}
                    className="group hero-card p-4 hover:border-[#FF6B2B]/30 transition-all cursor-pointer">

                    <div className="flex items-start gap-3">
                      {/* Avatar palette atténuée */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 uppercase"
                        style={{ backgroundColor: avatarColor }}>
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-[var(--text-primary)] font-bold text-sm leading-tight truncate">{clientName}</h3>
                        <p className="text-[var(--text-muted)] text-xs truncate mt-0.5">{plan.nom || 'Plan du jour'}</p>

                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                            plan.is_active ? 'text-emerald-400' : 'text-[var(--text-muted)]'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${plan.is_active ? 'bg-emerald-400' : 'bg-[var(--text-muted)]'}`} />
                            {plan.is_active ? 'Actif' : 'Inactif'}
                          </span>
                          {plan.date_plan && (
                            <>
                              <span className="text-[var(--text-muted)] text-[10px]">·</span>
                              <span className="text-[var(--text-muted)] text-[10px]">
                                {new Date(plan.date_plan).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Mini-ring progression (langage Fitness OS) */}
                      <Ring
                        value={weeksDone}
                        max={totalWeeks}
                        size={42}
                        thickness={3.5}
                        color={isComplete ? '#22c55e' : '#FF6B2B'}
                        trackColor="var(--ring-track)"
                        className="shrink-0"
                      >
                        <span className={`text-[9px] font-black tabular-nums ${isComplete ? 'text-emerald-400' : 'text-[var(--text-primary)]'}`}>{weeksDone}/{totalWeeks}</span>
                      </Ring>

                      <button onClick={e => { e.stopPropagation(); handleDelete(plan.id, e) }}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                        title="Supprimer le plan assigné">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* ── Programmes Pro assignés (nutrition_programmes) ── */}
              {programmes
                .filter(p => p.client_id && (!searchTerm || (p.nom || '').toLowerCase().includes(searchTerm.toLowerCase())))
                .map((prog, idx) => {
                  const clientName = prog.profiles ? [prog.profiles.prenom, prog.profiles.nom].filter(Boolean).join(' ') : 'Client'
                  const avatarColor = AVATAR_COLORS[(filteredAssigned.length + idx) % AVATAR_COLORS.length]
                  const initials = clientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <div key={`nutri-pro-${prog.id}`}
                      onClick={() => navigate(`/coach/nutrition/programme/${prog.id}`)}
                      className="group hero-card p-4 hover:border-[#FF6B2B]/30 transition-all cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 uppercase"
                          style={{ backgroundColor: avatarColor }}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[var(--text-primary)] font-bold text-sm leading-tight truncate">{clientName}</h3>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/20 shrink-0">PRO</span>
                          </div>
                          <p className="text-[var(--text-muted)] text-xs truncate mt-0.5">{prog.nom}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${prog.is_active ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${prog.is_active ? 'bg-emerald-400' : 'bg-[var(--text-muted)]'}`} />
                              {prog.is_active ? 'Actif' : 'Inactif'}
                            </span>
                            <span className="text-[var(--text-muted)] text-[10px]">·</span>
                            <span className="text-[var(--text-muted)] text-[10px] tabular-nums">{prog.duree_semaines} sem.</span>
                            {prog.objectif && (
                              <>
                                <span className="text-[var(--text-muted)] text-[10px]">·</span>
                                <span className="text-[var(--text-muted)] text-[10px] capitalize">{prog.objectif}</span>
                              </>
                            )}
                          </div>
                        </div>
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
          {filteredTemplates.length === 0 && programmes.filter(p => !p.client_id).length === 0 ? (
            <div className="hero-card p-16 text-center">
              <UtensilsCrossed size={32} className="text-[var(--text-muted)] mx-auto mb-4 animate-breathe" strokeWidth={1.5} />
              <h3 className="text-[var(--text-primary)] font-bold text-lg mb-2 tracking-tight">
                {searchTerm ? 'Aucun résultat' : 'Aucun programme nutritionnel'}
              </h3>
              <p className="text-[var(--text-muted)] text-sm mb-6 max-w-md mx-auto">
                {searchTerm ? `Aucun modèle pour "${searchTerm}"` : 'Crée ton premier programme de coaching nutrition.'}
              </p>
              {!searchTerm && (
                <button onClick={() => navigate('/coach/nutrition/programme/new')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all active:scale-95">
                  <Plus size={15} /> Créer un programme
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredTemplates.map(plan => (
                <div key={plan.id}
                  className="hero-card p-4 hover:border-[#FF6B2B]/30 transition-all group">

                  <div className="flex items-start gap-3 mb-4">
                    <UtensilsCrossed size={16} className="text-[var(--text-muted)] shrink-0 mt-0.5" strokeWidth={1.75} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[var(--text-primary)] font-bold text-sm leading-tight truncate">{plan.nom || 'Plan du jour'}</h3>
                      <p className="text-[var(--text-muted)] text-[11px] mt-0.5">
                        Créé le {new Date(plan.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleDelete(plan.id, e) }}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    <span className="inline-flex items-center gap-1 bg-[var(--bg-base)] px-2 py-1 rounded-md text-[10px] text-[var(--text-muted)] font-semibold border border-[var(--border-subtle)] tabular-nums">
                      <Calendar size={11} /> {plan.duree_semaines || 4} sem.
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold ${
                      plan.is_active
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : 'text-[var(--text-muted)] bg-[var(--bg-surface)]'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${plan.is_active ? 'bg-emerald-400' : 'bg-[var(--text-muted)]'}`} />
                      {plan.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => navigate(`/coach/nutrition/${plan.id}`)}
                      className="py-2 rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs font-semibold hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-1.5 border border-[var(--border-subtle)]">
                      <Edit3 size={12} /> Modifier
                    </button>
                    <button onClick={() => setAssignPlan(plan)}
                      className="py-2 rounded-lg bg-[#FF6B2B] text-white text-xs font-semibold hover:bg-[#FF6B2B]/90 transition-all flex items-center justify-center gap-1.5 active:scale-95">
                      <UserPlus size={12} /> Assigner
                    </button>
                  </div>
                </div>
              ))}

              {/* ── Programmes Pro modèles (nutrition_programmes) ── */}
              {programmes
                .filter(p => !p.client_id && (!searchTerm || (p.nom || '').toLowerCase().includes(searchTerm.toLowerCase())))
                .map(prog => (
                  <div key={`nutri-pro-${prog.id}`}
                    className="hero-card p-4 hover:border-[#FF6B2B]/30 transition-all group">
                    <div className="flex items-start gap-3 mb-3 cursor-pointer"
                      onClick={() => navigate(`/coach/nutrition/programme/${prog.id}`)}>
                      <Layers size={16} className="text-[var(--text-muted)] shrink-0 mt-0.5" strokeWidth={1.75} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[var(--text-primary)] font-bold text-sm leading-tight truncate">{prog.nom || 'Programme'}</h3>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/20 shrink-0">PRO</span>
                        </div>
                        {prog.description && (
                          <p className="text-[var(--text-muted)] text-[11px] mt-0.5 line-clamp-2">{prog.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className="inline-flex items-center gap-1 bg-[var(--bg-base)] px-2 py-1 rounded-md text-[10px] text-[var(--text-muted)] font-semibold border border-[var(--border-subtle)] tabular-nums">
                        <Calendar size={11} /> {prog.duree_semaines || 4} sem.
                      </span>
                      {prog.objectif && (
                        <span className="px-2 py-1 rounded-md bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-semibold capitalize">
                          {prog.objectif}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => navigate(`/coach/nutrition/programme/${prog.id}`)}
                        className="py-2 rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs font-semibold hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-1.5 border border-[var(--border-subtle)]">
                        <Edit3 size={12} /> Modifier
                      </button>
                      <button onClick={() => { setProAssignId(prog.id); setProAssignClientId('') }}
                        className="py-2 rounded-lg bg-[#FF6B2B] text-white text-xs font-semibold hover:bg-[#FF6B2B]/90 transition-all flex items-center justify-center gap-1.5 active:scale-95">
                        <UserPlus size={12} /> Assigner
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {/* ══ Modal Assigner programme Pro nutrition ══ */}
      {proAssignId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setProAssignId(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md hero-card shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-4 border-b border-[var(--border-base)] flex items-center justify-between">
              <div>
                <h2 className="text-[var(--text-primary)] text-lg font-bold tracking-tight">Assigner le programme</h2>
                <p className="text-[var(--text-muted)] text-sm mt-0.5">Le programme sera cloné pour le client sélectionné</p>
              </div>
              <button onClick={() => setProAssignId(null)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-2 font-semibold uppercase tracking-wider">
                  Client <span className="text-[var(--text-muted)] normal-case tracking-normal">({coachClients.length} trouvé{coachClients.length > 1 ? 's' : ''})</span>
                </label>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {coachClients.length === 0 ? (
                    <p className="text-[var(--text-muted)] text-xs text-center py-4">Aucun client actif</p>
                  ) : coachClients.map(c => {
                    const displayName = (c.prenom && c.nom) ? `${c.prenom} ${c.nom}` : (c.prenom || c.nom || c.email || 'Client')
                    const isSelected = proAssignClientId === c.id
                    const initials = `${c.prenom ? c.prenom[0] : (c.email ? c.email[0] : '?')}${c.nom ? c.nom[0] : ''}`.toUpperCase()
                    return (
                      <button key={c.id} onClick={() => setProAssignClientId(c.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                          isSelected ? 'bg-[#FF6B2B]/10 border border-[#FF6B2B]/30' : 'hover:bg-[var(--bg-surface)] border border-transparent'
                        }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected ? 'bg-[#FF6B2B] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                        }`}>{initials}</div>
                        <span className={`text-sm font-medium flex-1 truncate ${isSelected ? 'text-[#FF6B2B]' : 'text-[var(--text-primary)]'}`}>{displayName}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setProAssignId(null)}
                className="flex-1 py-3 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all border border-[var(--border-subtle)]">
                Annuler
              </button>
              <button onClick={handleAssignProNutrition} disabled={!proAssignClientId || assigningPro}
                className="flex-1 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95">
                {assigningPro ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                {assigningPro ? 'Assignation...' : 'Assigner'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Assign Modal ═══ */}
      {assignPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setAssignPlan(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md hero-card shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
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
                className="flex-1 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95">
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
