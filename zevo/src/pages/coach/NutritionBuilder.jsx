import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, X,
  Coffee, UtensilsCrossed, Moon, Cookie,
  ChevronDown, Target, Flame
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
  const { user } = useAuth()
  const toast = useToast()

  const [titre, setTitre] = useState('')
  const [objectif, setObjectif] = useState('')
  const [activeDay, setActiveDay] = useState(0)
  const [jours, setJours] = useState(JOURS.map(() => blankDay()))
  const [saving, setSaving] = useState(false)
  const [showRepasMenu, setShowRepasMenu] = useState(false)

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
  const handleSave = async () => {
    if (!titre.trim()) {
      toast.error('Le titre du plan est requis')
      return
    }
    setSaving(true)
    try {
      // Insert plan
      const { data: plan, error } = await supabase
        .from('client_nutrition_plans')
        .insert({
          coach_id: user.id,
          nom: titre.trim(),
          date_plan: new Date().toISOString().split('T')[0],
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Plan nutritionnel créé !')
      navigate('/coach/nutrition')
    } catch (err) {
      console.error('[NutritionBuilder] Erreur sauvegarde:', err)
      toast.error('Erreur : ' + (err.message || 'Sauvegarde échouée'))
    }
    setSaving(false)
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
          <button onClick={handleSave} disabled={saving}
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
    </div>
  )
}
