import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, X,
  Coffee, UtensilsCrossed, Moon, Cookie,
  ChevronDown, Target, Flame, Layers, UserPlus, Check, Search
} from 'lucide-react'

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const REPAS_OPTIONS = [
  { type: 'petit_dej', label: 'Petit-déjeuner', icon: Coffee, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { type: 'dejeuner', label: 'Déjeuner', icon: UtensilsCrossed, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { type: 'collation', label: 'Collation', icon: Cookie, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { type: 'diner', label: 'Dîner', icon: Moon, color: 'text-blue-400', bg: 'bg-blue-500/10' },
]

function getRepasConfig(type) {
  return REPAS_OPTIONS.find(r => r.type === type) || REPAS_OPTIONS[0]
}

function calcCalories(p, g, l) {
  return Math.round((parseFloat(p) || 0) * 4 + (parseFloat(g) || 0) * 4 + (parseFloat(l) || 0) * 9)
}

// Create a blank day
function blankDay() {
  return { repas: [] }
}

// Create a blank repas
function blankRepas(type) {
  return {
    id: crypto.randomUUID(),
    type,
    titre: '',
    description: '',
    macros: { p: 0, g: 0, l: 0 },
  }
}

export default function NutritionBuilder() {
  const navigate = useNavigate()
  const { planId } = useParams()
  const { user } = useAuth()
  const toast = useToast()

  const [titre, setTitre] = useState('')
  const [objectif, setObjectif] = useState('')
  const [activeDay, setActiveDay] = useState(0)
  const [jours, setJours] = useState(JOURS.map(() => blankDay()))
  const [saving, setSaving] = useState(false)
  const [showRepasMenu, setShowRepasMenu] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [existingPlanId, setExistingPlanId] = useState(planId || null)

  // Save modal
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveMode, setSaveMode] = useState('template') // 'template' | 'client'
  const [saveClientId, setSaveClientId] = useState('')
  const [saveClientSearch, setSaveClientSearch] = useState('')
  const [coachClients, setCoachClients] = useState([])

  // Fetch clients
  useEffect(() => {
    if (!user) return
    const fetchClients = async () => {
      const { data: clientsData, error: err1 } = await supabase
        .from('clients')
        .select('id, profiles!inner(id, nom, prenom, email)')
        .eq('coach_id', user.id)
        .eq('actif', true)
      console.log('DEBUG CLIENTS [NutritionBuilder] via clients:', clientsData, 'Erreur:', err1)

      if (clientsData && clientsData.length > 0) {
        setCoachClients(clientsData)
        return
      }

      // Fallback: profiles direct
      const { data: profilesData, error: err2 } = await supabase
        .from('profiles')
        .select('id, nom, prenom, email')
        .eq('role', 'client')
      console.log('DEBUG CLIENTS [NutritionBuilder] via profiles:', profilesData, 'Erreur:', err2)
      setCoachClients((profilesData || []).map(p => ({ id: p.id, profiles: p })))
    }
    fetchClients()
  }, [user])

  // Load existing plan
  useEffect(() => {
    if (!planId || !user) return
    const load = async () => {
      setLoadingPlan(true)
      // Fetch plan
      const { data: plan } = await supabase
        .from('client_nutrition_plans')
        .select('*')
        .eq('id', planId)
        .single()

      if (plan) {
        setTitre(plan.nom || '')
        setExistingPlanId(plan.id)

        // Fetch repas + aliments
        const { data: repasData } = await supabase
          .from('plan_repas')
          .select('*, repas_aliments(*, aliments(*))')
          .eq('plan_id', plan.id)
          .order('ordre', { ascending: true })

        if (repasData?.length > 0) {
          // Rebuild jours from repas data
          // For now, put all repas in day 0 (Monday) since the old schema is date-based not day-based
          const newJours = JOURS.map(() => blankDay())
          const repasItems = repasData.map(r => ({
            id: r.id,
            type: r.type || 'dejeuner',
            titre: '',
            description: '',
            macros: (() => {
              let p = 0, g = 0, l = 0
              ;(r.repas_aliments || []).forEach(ra => {
                const a = ra.aliments
                if (!a) return
                const q = (ra.quantite_g || 100) / 100
                p += (a.proteines || 0) * q
                g += (a.glucides || 0) * q
                l += (a.lipides || 0) * q
              })
              return { p: Math.round(p), g: Math.round(g), l: Math.round(l) }
            })(),
          }))
          newJours[0] = { repas: repasItems }
          setJours(newJours)
        }
      }
      setLoadingPlan(false)
    }
    load()
  }, [planId, user])

  // Current day data
  const currentDay = jours[activeDay]

  // Add repas to current day
  const addRepas = (type) => {
    setJours(prev => prev.map((j, i) =>
      i === activeDay ? { ...j, repas: [...j.repas, blankRepas(type)] } : j
    ))
    setShowRepasMenu(false)
  }

  // Remove repas
  const removeRepas = (repasId) => {
    setJours(prev => prev.map((j, i) =>
      i === activeDay ? { ...j, repas: j.repas.filter(r => r.id !== repasId) } : j
    ))
  }

  // Update repas field
  const updateRepas = (repasId, field, value) => {
    setJours(prev => prev.map((j, i) =>
      i === activeDay ? {
        ...j,
        repas: j.repas.map(r => r.id === repasId ? { ...r, [field]: value } : r)
      } : j
    ))
  }

  // Update macro
  const updateMacro = (repasId, macro, value) => {
    setJours(prev => prev.map((j, i) =>
      i === activeDay ? {
        ...j,
        repas: j.repas.map(r =>
          r.id === repasId ? { ...r, macros: { ...r.macros, [macro]: parseFloat(value) || 0 } } : r
        )
      } : j
    ))
  }

  // Day totals
  const dayTotals = (dayIdx) => {
    const day = jours[dayIdx]
    let p = 0, g = 0, l = 0
    day.repas.forEach(r => {
      p += r.macros.p || 0
      g += r.macros.g || 0
      l += r.macros.l || 0
    })
    return { p, g, l, kcal: calcCalories(p, g, l) }
  }

  const currentTotals = dayTotals(activeDay)

  // Weekly average
  const weeklyAvg = (() => {
    const daysWithRepas = jours.filter(j => j.repas.length > 0)
    if (daysWithRepas.length === 0) return { p: 0, g: 0, l: 0, kcal: 0 }
    let tp = 0, tg = 0, tl = 0
    jours.forEach((_, i) => {
      const t = dayTotals(i)
      tp += t.p; tg += t.g; tl += t.l
    })
    const n = daysWithRepas.length
    return { p: Math.round(tp / n), g: Math.round(tg / n), l: Math.round(tl / n), kcal: Math.round(calcCalories(tp / n, tg / n, tl / n)) }
  })()

  // Save
  // Open save modal (or save directly if editing existing)
  const handleSaveClick = () => {
    if (!titre.trim()) {
      toast.error('Le titre du plan est requis')
      return
    }
    if (existingPlanId) {
      // Direct save for existing plan
      doSave(null, null)
    } else {
      setShowSaveModal(true)
    }
  }

  // Core save logic
  const doSave = async (isTemplate, clientId) => {
    setSaving(true)
    setShowSaveModal(false)
    try {
      let savedPlanId = existingPlanId

      if (savedPlanId) {
        // Update existing
        const updatePayload = { nom: titre.trim() }
        if (clientId) updatePayload.client_id = clientId
        const { error } = await supabase
          .from('client_nutrition_plans')
          .update(updatePayload)
          .eq('id', savedPlanId)
        if (error) throw error
      } else {
        // Insert new
        const insertPayload = {
          coach_id: user.id,
          nom: titre.trim(),
          date_plan: new Date().toISOString().split('T')[0],
        }
        if (clientId) insertPayload.client_id = clientId
        // client_id null = template

        const { data: plan, error } = await supabase
          .from('client_nutrition_plans')
          .insert(insertPayload)
          .select()
          .single()
        if (error) throw error
        savedPlanId = plan.id
        setExistingPlanId(savedPlanId)
      }

      // Delete old repas (cascade deletes repas_aliments)
      await supabase.from('plan_repas').delete().eq('plan_id', savedPlanId)

      // Insert new repas from all days
      for (let dayIdx = 0; dayIdx < jours.length; dayIdx++) {
        const day = jours[dayIdx]
        for (let rIdx = 0; rIdx < day.repas.length; rIdx++) {
          const repas = day.repas[rIdx]
          const { error: rErr } = await supabase
            .from('plan_repas')
            .insert({
              plan_id: savedPlanId,
              type: repas.type,
              ordre: dayIdx * 10 + rIdx,
            })

          if (rErr) {
            console.error('[NutritionBuilder] Erreur insert repas:', rErr)
          }
        }
      }

      const clientName = clientId ? (coachClients.find(c => c.profiles?.id === clientId)?.profiles?.nom || 'ce client') : null
      toast.success(clientName ? `Plan assigné à ${clientName} !` : (existingPlanId ? 'Plan mis à jour !' : 'Modèle créé !'))
      navigate('/coach/nutrition')
    } catch (err) {
      console.error('[NutritionBuilder] Erreur sauvegarde:', err)
      toast.error('Erreur : ' + (err.message || 'Sauvegarde échouée'))
    }
    setSaving(false)
  }

  if (loadingPlan) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0D0D0D]">
        <Loader2 className="animate-spin text-[#FF6B2B]" size={28} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#0D0D0D]">

      {/* ═══ Header ═══ */}
      <div className="px-4 md:px-6 py-4 border-b border-[#27272a] flex-shrink-0">
        <div className="flex items-center gap-4">

          {/* Back */}
          <button onClick={() => navigate('/coach/nutrition')}
            className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.06] transition-all shrink-0">
            <ArrowLeft size={18} />
          </button>

          {/* Title input */}
          <div className="flex-1 min-w-0">
            <input type="text" value={titre} onChange={e => setTitre(e.target.value)}
              placeholder="Nom du plan nutritionnel..."
              className="w-full bg-transparent text-[#F5F5F3] text-xl font-bold border-none focus:outline-none placeholder:text-white/15" />
          </div>

          {/* Objective */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Target size={14} className="text-white/20" />
            <input type="text" value={objectif} onChange={e => setObjectif(e.target.value)}
              placeholder="Objectif (ex: Perte de poids)"
              className="bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-white/50 text-xs w-48 focus:outline-none focus:border-[#FF6B2B]/40 transition-all placeholder:text-white/15" />
          </div>

          {/* Save */}
          <button onClick={handleSaveClick} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-50 shadow-lg shadow-[#FF6B2B]/20 shrink-0">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>

        {/* Weekly stats */}
        <div className="flex items-center gap-5 mt-3 pl-12">
          <div className="flex items-center gap-1.5">
            <Flame size={12} className="text-[#FF6B2B]" />
            <span className="text-white/20 text-[10px]">Moy. journalière :</span>
          </div>
          <span className="text-[#FF6B2B] text-xs font-bold">{weeklyAvg.kcal} kcal</span>
          <span className="text-blue-400 text-[10px] font-semibold">P {weeklyAvg.p}g</span>
          <span className="text-amber-400 text-[10px] font-semibold">G {weeklyAvg.g}g</span>
          <span className="text-rose-400 text-[10px] font-semibold">L {weeklyAvg.l}g</span>
        </div>
      </div>

      {/* ═══ Main — 2 columns ═══ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left sidebar: Days ── */}
        <div className="w-52 shrink-0 border-r border-[#27272a] overflow-y-auto py-4">
          <p className="text-white/15 text-[9px] uppercase tracking-wider font-bold px-4 mb-3">Jours de la semaine</p>
          {JOURS.map((jour, i) => {
            const t = dayTotals(i)
            const hasRepas = jours[i].repas.length > 0
            return (
              <button key={i} onClick={() => setActiveDay(i)}
                className={`w-full flex items-center justify-between px-4 py-3 transition-all ${
                  activeDay === i
                    ? 'bg-[#FF6B2B]/10 border-r-2 border-[#FF6B2B] text-[#FF6B2B]'
                    : 'text-white/35 hover:bg-white/[0.02] hover:text-white/60'
                }`}>
                <div className="flex items-center gap-2.5">
                  {hasRepas && <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B2B]" />}
                  <span className="text-sm font-medium">{jour}</span>
                </div>
                {hasRepas && (
                  <span className={`text-[9px] font-bold ${activeDay === i ? 'text-[#FF6B2B]' : 'text-white/15'}`}>
                    {t.kcal}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Right: Day content ── */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6">

          {/* Day header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[#F5F5F3] text-xl font-bold">{JOURS[activeDay]}</h2>
              <div className="flex items-center gap-4 mt-1.5">
                <span className="text-[#FF6B2B] text-sm font-bold">{currentTotals.kcal} kcal</span>
                <span className="text-blue-400 text-xs font-semibold">P {currentTotals.p}g</span>
                <span className="text-amber-400 text-xs font-semibold">G {currentTotals.g}g</span>
                <span className="text-rose-400 text-xs font-semibold">L {currentTotals.l}g</span>
              </div>
            </div>

            {/* Add repas */}
            <div className="relative">
              <button onClick={() => setShowRepasMenu(!showRepasMenu)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-lg shadow-[#FF6B2B]/20">
                <Plus size={14} /> Ajouter un repas <ChevronDown size={12} />
              </button>
              {showRepasMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowRepasMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-52 bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden">
                    {REPAS_OPTIONS.map(opt => {
                      const Icon = opt.icon
                      return (
                        <button key={opt.type} onClick={() => addRepas(opt.type)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors">
                          <div className={`w-8 h-8 rounded-lg ${opt.bg} flex items-center justify-center`}>
                            <Icon size={14} className={opt.color} />
                          </div>
                          <span className="text-[#F5F5F3] text-sm font-medium">{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Repas list */}
          {currentDay.repas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[#27272a] flex items-center justify-center mb-4">
                <UtensilsCrossed size={24} className="text-white/10" />
              </div>
              <p className="text-white/20 text-sm font-medium mb-1">Aucun repas pour {JOURS[activeDay]}</p>
              <p className="text-white/10 text-xs mb-5">Cliquez sur "Ajouter un repas" pour commencer</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-2xl">
              {currentDay.repas.map(repas => {
                const config = getRepasConfig(repas.type)
                const Icon = config.icon
                const kcal = calcCalories(repas.macros.p, repas.macros.g, repas.macros.l)

                return (
                  <div key={repas.id}
                    className="bg-[#1E1E1E] border border-white/[0.06] rounded-2xl overflow-hidden group hover:border-white/[0.1] transition-all">

                    {/* Repas header */}
                    <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                          <Icon size={14} className={config.color} />
                        </div>
                        <span className="text-white/30 text-xs font-semibold uppercase tracking-wider">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#FF6B2B] text-sm font-bold">{kcal} kcal</span>
                        <button onClick={() => removeRepas(repas.id)}
                          className="p-1.5 rounded-lg text-white/10 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Repas body */}
                    <div className="p-5 space-y-4">
                      {/* Title */}
                      <input type="text" value={repas.titre}
                        onChange={e => updateRepas(repas.id, 'titre', e.target.value)}
                        placeholder="Nom du repas (ex: Bowl Cake Avoine)"
                        className="w-full bg-transparent text-[#F5F5F3] text-base font-semibold border-none focus:outline-none placeholder:text-white/15" />

                      {/* Description */}
                      <textarea value={repas.description}
                        onChange={e => updateRepas(repas.id, 'description', e.target.value)}
                        placeholder="Ingrédients, instructions, notes..."
                        rows={2}
                        className="w-full bg-[#0D0D0D] border border-[#27272a] rounded-xl px-4 py-3 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/30 transition-all resize-none" />

                      {/* Macros */}
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-[#0D0D0D] border border-[#27272a] rounded-xl p-3 text-center">
                          <label className="text-blue-400 text-[9px] font-bold uppercase tracking-wider block mb-1.5">Protéines</label>
                          <div className="flex items-center justify-center gap-1">
                            <input type="number" min={0} value={repas.macros.p || ''}
                              onChange={e => updateMacro(repas.id, 'p', e.target.value)}
                              className="w-14 bg-transparent text-[#F5F5F3] text-lg font-bold text-center border-none focus:outline-none placeholder:text-white/10"
                              placeholder="0" />
                            <span className="text-white/15 text-xs">g</span>
                          </div>
                        </div>
                        <div className="bg-[#0D0D0D] border border-[#27272a] rounded-xl p-3 text-center">
                          <label className="text-amber-400 text-[9px] font-bold uppercase tracking-wider block mb-1.5">Glucides</label>
                          <div className="flex items-center justify-center gap-1">
                            <input type="number" min={0} value={repas.macros.g || ''}
                              onChange={e => updateMacro(repas.id, 'g', e.target.value)}
                              className="w-14 bg-transparent text-[#F5F5F3] text-lg font-bold text-center border-none focus:outline-none placeholder:text-white/10"
                              placeholder="0" />
                            <span className="text-white/15 text-xs">g</span>
                          </div>
                        </div>
                        <div className="bg-[#0D0D0D] border border-[#27272a] rounded-xl p-3 text-center">
                          <label className="text-rose-400 text-[9px] font-bold uppercase tracking-wider block mb-1.5">Lipides</label>
                          <div className="flex items-center justify-center gap-1">
                            <input type="number" min={0} value={repas.macros.l || ''}
                              onChange={e => updateMacro(repas.id, 'l', e.target.value)}
                              className="w-14 bg-transparent text-[#F5F5F3] text-lg font-bold text-center border-none focus:outline-none placeholder:text-white/10"
                              placeholder="0" />
                            <span className="text-white/15 text-xs">g</span>
                          </div>
                        </div>
                        <div className="bg-[#FF6B2B]/5 border border-[#FF6B2B]/10 rounded-xl p-3 text-center">
                          <label className="text-[#FF6B2B] text-[9px] font-bold uppercase tracking-wider block mb-1.5">Calories</label>
                          <p className="text-[#FF6B2B] text-lg font-bold">{kcal}</p>
                          <p className="text-white/10 text-[8px]">auto</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Save Modal ═══ */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowSaveModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[#1E1E1E] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="h-1 bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]" />

            <div className="px-6 pt-5 pb-4 border-b border-white/[0.06]">
              <h2 className="text-[#F5F5F3] text-lg font-bold">Sauvegarder le plan</h2>
              <p className="text-white/30 text-sm mt-0.5">Choisissez la destination</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Option A: Template */}
              <button onClick={() => setSaveMode('template')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                  saveMode === 'template'
                    ? 'bg-[#FF6B2B]/5 border-[#FF6B2B]/30'
                    : 'bg-[#0D0D0D] border-[#27272a] hover:border-white/[0.1]'
                }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  saveMode === 'template' ? 'bg-[#FF6B2B]/20' : 'bg-[#2A2A2A]'
                }`}>
                  <Layers size={18} className={saveMode === 'template' ? 'text-[#FF6B2B]' : 'text-white/30'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${saveMode === 'template' ? 'text-[#FF6B2B]' : 'text-[#F5F5F3]'}`}>
                    Sauvegarder comme Modèle
                  </p>
                  <p className="text-white/25 text-xs mt-0.5">Réutilisable pour plusieurs clients</p>
                </div>
                {saveMode === 'template' && <Check size={16} className="text-[#FF6B2B] shrink-0" />}
              </button>

              {/* Option B: Assign to client */}
              <button onClick={() => setSaveMode('client')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                  saveMode === 'client'
                    ? 'bg-[#FF6B2B]/5 border-[#FF6B2B]/30'
                    : 'bg-[#0D0D0D] border-[#27272a] hover:border-white/[0.1]'
                }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  saveMode === 'client' ? 'bg-[#FF6B2B]/20' : 'bg-[#2A2A2A]'
                }`}>
                  <UserPlus size={18} className={saveMode === 'client' ? 'text-[#FF6B2B]' : 'text-white/30'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${saveMode === 'client' ? 'text-[#FF6B2B]' : 'text-[#F5F5F3]'}`}>
                    Assigner à un client
                  </p>
                  <p className="text-white/25 text-xs mt-0.5">Plan personnalisé pour un client spécifique</p>
                </div>
                {saveMode === 'client' && <Check size={16} className="text-[#FF6B2B] shrink-0" />}
              </button>

              {/* Client selector (only when mode = client) */}
              {saveMode === 'client' && (
                <div className="space-y-2 pt-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                    <input type="text" value={saveClientSearch} onChange={e => setSaveClientSearch(e.target.value)}
                      placeholder="Rechercher un client..."
                      className="w-full bg-[#0D0D0D] border border-[#27272a] rounded-xl pl-9 pr-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/40 transition-all" />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {coachClients
                      .filter(c => {
                        const nom = [c.profiles?.prenom, c.profiles?.nom].filter(Boolean).join(' ')
                        return nom.toLowerCase().includes(saveClientSearch.toLowerCase())
                      })
                      .map(c => {
                        const nom = [c.profiles?.prenom, c.profiles?.nom].filter(Boolean).join(' ') || 'Client'
                        const profileId = c.profiles?.id
                        const isSelected = saveClientId === profileId
                        const initials = nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                        return (
                          <button key={c.id} onClick={() => setSaveClientId(profileId)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                              isSelected ? 'bg-[#FF6B2B]/10 border border-[#FF6B2B]/30' : 'hover:bg-white/[0.03] border border-transparent'
                            }`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isSelected ? 'bg-[#FF6B2B] text-white' : 'bg-[#2A2A2A] text-white/40'
                            }`}>{initials}</div>
                            <span className={`text-sm ${isSelected ? 'text-[#FF6B2B] font-semibold' : 'text-[#F5F5F3]'}`}>{nom}</span>
                            {isSelected && <Check size={13} className="text-[#FF6B2B] ml-auto" />}
                          </button>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowSaveModal(false)}
                className="flex-1 py-3 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/[0.04] transition-all border border-white/[0.04]">
                Annuler
              </button>
              <button
                onClick={() => doSave(saveMode === 'template', saveMode === 'client' ? saveClientId : null)}
                disabled={saving || (saveMode === 'client' && !saveClientId)}
                className="flex-1 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B2B]/20">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Sauvegarde...' : saveMode === 'template' ? 'Créer le modèle' : 'Assigner le plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
