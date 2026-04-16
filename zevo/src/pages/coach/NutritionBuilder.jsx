import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, X,
  Coffee, UtensilsCrossed, Moon, Cookie,
  ChevronDown, Target, Flame, Layers, UserPlus, Check, Search,
  Minus, FileText, Upload, ExternalLink
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
    aliments: [], // [{aliment_id, nom, quantite_g, kcal_100g, proteines, glucides, lipides, categorie}]
  }
}

export default function NutritionBuilder() {
  const navigate = useNavigate()
  const { planId } = useParams()
  const [searchParams] = useSearchParams()
  const presetClientId = searchParams.get('clientId') || null
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
  const [isActive, setIsActive] = useState(false)

  // Aliment drawer
  const [alimentDrawer, setAlimentDrawer] = useState(null) // repasId to add to
  const [allAliments, setAllAliments] = useState([])
  const [alimentSearch, setAlimentSearch] = useState('')
  const [loadingAliments, setLoadingAliments] = useState(false)


  // Global document (PDF joint au plan)
  const [globalDoc, setGlobalDoc] = useState(null) // { nom, url }
  const [pendingGlobalFile, setPendingGlobalFile] = useState(null)
  const [uploadingGlobal, setUploadingGlobal] = useState(false)

  // Load aliments library
  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoadingAliments(true)
      const { data } = await supabase
        .from('aliments')
        .select('*')
        .or(`coach_id.is.null,coach_id.eq.${user.id}`)
        .order('categorie, nom')
      setAllAliments(data || [])
      setLoadingAliments(false)
    }
    load()
  }, [user])

  // Add aliment to a repas
  const addAlimentToRepas = (repasId, aliment) => {
    setJours(prev => prev.map((j, i) =>
      i === activeDay ? {
        ...j,
        repas: j.repas.map(r => {
          if (r.id !== repasId) return r
          const newAliment = {
            aliment_id: aliment.id,
            nom: aliment.nom,
            quantite_g: 100,
            kcal_100g: aliment.kcal_100g || 0,
            proteines: aliment.proteines || 0,
            glucides: aliment.glucides || 0,
            lipides: aliment.lipides || 0,
            categorie: aliment.categorie || '',
          }
          const newAliments = [...(r.aliments || []), newAliment]
          // Recalculate macros from aliments
          const macros = computeMacrosFromAliments(newAliments)
          return { ...r, aliments: newAliments, macros }
        })
      } : j
    ))
  }

  // Update aliment quantity
  const updateAlimentQty = (repasId, alimentIdx, newQty) => {
    setJours(prev => prev.map((j, i) =>
      i === activeDay ? {
        ...j,
        repas: j.repas.map(r => {
          if (r.id !== repasId) return r
          const newAliments = (r.aliments || []).map((a, idx) =>
            idx === alimentIdx ? { ...a, quantite_g: Math.max(0, newQty) } : a
          )
          const macros = computeMacrosFromAliments(newAliments)
          return { ...r, aliments: newAliments, macros }
        })
      } : j
    ))
  }

  // Remove aliment from repas
  const removeAlimentFromRepas = (repasId, alimentIdx) => {
    setJours(prev => prev.map((j, i) =>
      i === activeDay ? {
        ...j,
        repas: j.repas.map(r => {
          if (r.id !== repasId) return r
          const newAliments = (r.aliments || []).filter((_, idx) => idx !== alimentIdx)
          const macros = computeMacrosFromAliments(newAliments)
          return { ...r, aliments: newAliments, macros }
        })
      } : j
    ))
  }

  // Compute macros from aliments array
  const computeMacrosFromAliments = (aliments) => {
    let p = 0, g = 0, l = 0
    ;(aliments || []).forEach(a => {
      const ratio = (a.quantite_g || 0) / 100
      p += (a.proteines || 0) * ratio
      g += (a.glucides || 0) * ratio
      l += (a.lipides || 0) * ratio
    })
    return { p: Math.round(p * 10) / 10, g: Math.round(g * 10) / 10, l: Math.round(l * 10) / 10 }
  }

  // Filtered aliments for drawer
  const filteredAliments = allAliments.filter(a =>
    !alimentSearch.trim() || a.nom.toLowerCase().includes(alimentSearch.toLowerCase())
  )

  // Save modal
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveMode, setSaveMode] = useState(presetClientId ? 'client' : 'template')
  const [saveClientId, setSaveClientId] = useState(presetClientId || '')
  const [saveClientSearch, setSaveClientSearch] = useState('')
  const [coachClients, setCoachClients] = useState([])

  // Fetch clients
  useEffect(() => {
    if (!user) return
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, actif, profiles(id, nom, prenom, email)')
        .eq('coach_id', user.id)
        .eq('actif', true)

      if (error) {
        console.error('[NutritionBuilder] Erreur fetch clients:', error)
        return
      }
      const clients = (data || [])
        .filter(c => c.profiles)
        .map(c => ({ id: c.profiles.id, nom: c.profiles.nom, prenom: c.profiles.prenom, email: c.profiles.email }))
      setCoachClients(clients)
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
        setIsActive(plan.is_active || false)
        // Charger le document global s'il existe
        if (plan.document_url) {
          setGlobalDoc({ nom: plan.document_nom || 'Document', url: plan.document_url })
        }

        // Fetch repas + aliments
        const { data: repasData } = await supabase
          .from('plan_repas')
          .select('*, repas_aliments(*, aliments(*))')
          .eq('plan_id', plan.id)
          .order('ordre', { ascending: true })

        if (repasData?.length > 0) {
          // Rebuild jours from repas data using metadata
          const newJours = JOURS.map(() => blankDay())

          repasData.forEach(r => {
            const meta = r.metadata || {}
            const dayIdx = meta.day || 0

            // Rebuild aliments array from joined data
            const aliments = (r.repas_aliments || [])
              .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
              .map(ra => ({
                aliment_id: ra.aliment_id,
                nom: ra.aliments?.nom || '?',
                quantite_g: ra.quantite_g || 100,
                kcal_100g: ra.aliments?.kcal_100g || 0,
                proteines: ra.aliments?.proteines || 0,
                glucides: ra.aliments?.glucides || 0,
                lipides: ra.aliments?.lipides || 0,
                categorie: ra.aliments?.categorie || '',
              }))

            // Compute macros: prefer from aliments if they exist, else metadata
            let macros = meta.macros || { p: 0, g: 0, l: 0 }
            if (aliments.length > 0) {
              let p = 0, g = 0, l = 0
              aliments.forEach(a => {
                const q = (a.quantite_g || 0) / 100
                p += (a.proteines || 0) * q
                g += (a.glucides || 0) * q
                l += (a.lipides || 0) * q
              })
              macros = { p: Math.round(p * 10) / 10, g: Math.round(g * 10) / 10, l: Math.round(l * 10) / 10 }
            }

            const repasItem = {
              id: r.id,
              type: r.type || 'dejeuner',
              titre: meta.titre || '',
              description: meta.description || '',
              macros,
              aliments,
            }
            if (dayIdx >= 0 && dayIdx < newJours.length) {
              newJours[dayIdx].repas.push(repasItem)
            } else {
              newJours[0].repas.push(repasItem)
            }
          })
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

      const effectiveClientId = clientId || (existingPlanId ? null : null)

      if (savedPlanId) {
        // Update existing
        const updatePayload = { nom: titre.trim(), is_active: isActive }
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
          is_active: isActive,
        }
        if (clientId) insertPayload.client_id = clientId

        const { data: plan, error } = await supabase
          .from('client_nutrition_plans')
          .insert(insertPayload)
          .select()
          .single()
        if (error) throw error
        savedPlanId = plan.id
        setExistingPlanId(savedPlanId)
      }

      // If marking as active, deactivate all other plans for this client
      const targetClientId = clientId || effectiveClientId
      if (isActive && targetClientId) {
        await supabase
          .from('client_nutrition_plans')
          .update({ is_active: false })
          .eq('client_id', targetClientId)
          .eq('coach_id', user.id)
          .neq('id', savedPlanId)
      }

      // Delete old repas (cascade deletes repas_aliments)
      await supabase.from('plan_repas').delete().eq('plan_id', savedPlanId)

      // Insert new repas from all days (with metadata for macros/titre/description)
      let totalInserted = 0
      for (let dayIdx = 0; dayIdx < jours.length; dayIdx++) {
        const day = jours[dayIdx]
        for (let rIdx = 0; rIdx < day.repas.length; rIdx++) {
          const repas = day.repas[rIdx]
          const { data: newRepas, error: rErr } = await supabase
            .from('plan_repas')
            .insert({
              plan_id: savedPlanId,
              type: repas.type,
              ordre: dayIdx * 10 + rIdx,
              metadata: {
                titre: repas.titre || '',
                description: repas.description || '',
                macros: repas.macros || { p: 0, g: 0, l: 0 },
                day: dayIdx,
              },
            })
            .select()
            .single()

          if (rErr) {
            console.error('[NutritionBuilder] Erreur insert repas:', rErr)
          } else {
            totalInserted++
            // Insert repas_aliments if any
            if (newRepas && repas.aliments?.length > 0) {
              const alimentRows = repas.aliments.map((a, aIdx) => ({
                repas_id: newRepas.id,
                aliment_id: a.aliment_id,
                quantite_g: a.quantite_g || 100,
                ordre: aIdx,
              }))
              const { error: aErr } = await supabase.from('repas_aliments').insert(alimentRows)
              if (aErr) console.error('[NutritionBuilder] Erreur insert aliments:', aErr)
            }
          }
        }
      }
      console.log(`[NutritionBuilder] ${totalInserted} repas sauvegardés pour plan ${savedPlanId}`)

      // Upload le PDF global en attente
      if (pendingGlobalFile) {
        await uploadGlobalPdf(pendingGlobalFile, savedPlanId)
      }


      const cl = clientId ? coachClients.find(c => c.id === clientId) : null
      const clientName = cl ? ((cl.prenom && cl.nom) ? `${cl.prenom} ${cl.nom}` : (cl.prenom || cl.nom || cl.email || 'ce client')) : null
      toast.success(clientName ? `Plan assigné à ${clientName} !` : (existingPlanId ? 'Plan mis à jour !' : 'Modèle créé !'))
      navigate('/coach/nutrition')
    } catch (err) {
      console.error('[NutritionBuilder] Erreur sauvegarde:', err)
      toast.error('Erreur : ' + (err.message || 'Sauvegarde échouée'))
    }
    setSaving(false)
  }

  // ── Global PDF (document joint au plan entier) ──
  const triggerGlobalPdfUpload = () => {
    if (uploadingGlobal) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx'
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (existingPlanId) {
        uploadGlobalPdf(file, existingPlanId)
      } else {
        setPendingGlobalFile(file)
        toast.success('Fichier prêt — sera uploadé à la sauvegarde')
      }
    }
    input.click()
  }

  const uploadGlobalPdf = async (file, pid) => {
    if (!pid) return
    setUploadingGlobal(true)
    try {
      const filePath = `plan_global_docs/${pid}/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('plan-documents').upload(filePath, file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('plan-documents').getPublicUrl(filePath)
      const { error: dbErr } = await supabase.from('client_nutrition_plans').update({
        document_url: publicUrl,
        document_nom: file.name,
      }).eq('id', pid)
      if (dbErr) throw dbErr
      setGlobalDoc({ nom: file.name, url: publicUrl })
      setPendingGlobalFile(null)
      toast.success('PDF joint au plan !')
    } catch (err) {
      console.error('[NutritionBuilder] Erreur upload global doc:', err)
      toast.error('Erreur upload : ' + (err.message || 'inconnu'))
    } finally {
      setUploadingGlobal(false)
    }
  }

  const removeGlobalPdf = async () => {
    if (pendingGlobalFile) { setPendingGlobalFile(null); return }
    if (!existingPlanId || !globalDoc) return
    await supabase.from('client_nutrition_plans').update({ document_url: null, document_nom: null }).eq('id', existingPlanId)
    setGlobalDoc(null)
    toast.success('PDF retiré')
  }


  if (loadingPlan) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)]">
        <Loader2 className="animate-spin text-[#FF6B2B]" size={28} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-[var(--bg-base)]">

      {/* ═══ Header ═══ */}
      <div className="px-4 md:px-6 py-4 border-b border-[var(--border-base)] flex-shrink-0">
        <div className="flex items-center gap-4">

          {/* Back */}
          <button onClick={() => navigate('/coach/nutrition')}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all shrink-0">
            <ArrowLeft size={18} />
          </button>

          {/* Title input */}
          <div className="flex-1 min-w-0">
            <input type="text" value={titre} onChange={e => setTitre(e.target.value)}
              placeholder="Nom du plan nutritionnel..."
              className="w-full bg-transparent text-[var(--text-primary)] text-xl font-bold border-none focus:outline-none placeholder:text-[var(--text-muted)]" />
          </div>

          {/* Objective */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Target size={14} className="text-[var(--text-muted)]" />
            <input type="text" value={objectif} onChange={e => setObjectif(e.target.value)}
              placeholder="Objectif (ex: Perte de poids)"
              className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-3 py-2 text-[var(--text-secondary)] text-xs w-48 focus:outline-none focus:border-[#FF6B2B]/40 transition-all placeholder:text-[var(--text-muted)]" />
          </div>

          {/* Active toggle */}
          <button onClick={() => setIsActive(!isActive)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-[var(--bg-base)] text-[var(--text-muted)] border border-[var(--border-base)] hover:text-[var(--text-secondary)]'
            }`}>
            <div className={`w-8 h-4 rounded-full transition-all relative ${isActive ? 'bg-emerald-500' : 'bg-[var(--bg-surface)]'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isActive ? 'left-4.5 right-0.5' : 'left-0.5'}`}
                style={{ left: isActive ? '17px' : '2px' }} />
            </div>
            {isActive ? 'Plan actif' : 'Inactif'}
          </button>

          {/* Joindre PDF */}
          <button onClick={triggerGlobalPdfUpload} disabled={uploadingGlobal}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              uploadingGlobal ? 'bg-[var(--bg-surface)] text-[var(--text-muted)] cursor-wait'
              : globalDoc || pendingGlobalFile ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
              : 'bg-[#FF6B2B]/10 text-[#FF6B2B] hover:bg-[#FF6B2B]/20'
            }`}
            title="Joindre un PDF/fichier global au plan">
            {uploadingGlobal ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            {uploadingGlobal ? 'Upload...' : 'Joindre PDF'}
          </button>

          {/* Save */}
          <button onClick={handleSaveClick} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all active:scale-95 disabled:opacity-50 shrink-0">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>

        {/* Weekly stats — 3 tons orange (cohérent Hub Client nutrition) */}
        <div className="flex items-center gap-4 mt-3 pl-12 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Flame size={11} className="text-[var(--text-muted)]" strokeWidth={1.75} />
            <span className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-[0.12em]">Moy. journalière</span>
          </div>
          <span className="text-[var(--text-primary)] text-xs font-black tabular-nums">{weeklyAvg.kcal} <span className="text-[var(--text-muted)] font-semibold">kcal</span></span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums text-[var(--text-secondary)]">
            <span className="w-1.5 h-1.5 rounded-sm bg-[#FF6B2B]" /> P {weeklyAvg.p}g
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums text-[var(--text-secondary)]">
            <span className="w-1.5 h-1.5 rounded-sm bg-[#FF9A6C]" /> G {weeklyAvg.g}g
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums text-[var(--text-secondary)]">
            <span className="w-1.5 h-1.5 rounded-sm bg-[#FFCBA4]" /> L {weeklyAvg.l}g
          </span>
        </div>
      </div>

      {/* ═══ Global PDF banner ═══ */}
      {(globalDoc || pendingGlobalFile) && (
        <div className="px-4 md:px-6 py-2.5 border-b border-[var(--border-base)] bg-[var(--bg-card)]/50">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              pendingGlobalFile ? 'bg-[#FF6B2B]/10' : 'bg-emerald-500/10'
            }`}>
              <FileText size={16} className={pendingGlobalFile ? 'text-[#FF6B2B]' : 'text-emerald-400'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-primary)] text-xs font-semibold truncate">
                {pendingGlobalFile ? pendingGlobalFile.name : globalDoc?.nom}
              </p>
              <p className="text-[var(--text-muted)] text-[10px]">
                {pendingGlobalFile ? '⏳ En attente — sera uploadé à la sauvegarde' : '✓ PDF global joint au plan'}
              </p>
            </div>
            {globalDoc?.url && (
              <a href={globalDoc.url} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#FF6B2B] hover:bg-[#FF6B2B]/10 transition-all shrink-0">
                <ExternalLink size={14} />
              </a>
            )}
            <button onClick={removeGlobalPdf}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ═══ Main — 2 columns ═══ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left sidebar: Days ── */}
        <div className="w-52 shrink-0 border-r border-[var(--border-base)] overflow-y-auto py-4">
          <p className="text-[var(--text-muted)] text-[9px] uppercase tracking-wider font-bold px-4 mb-3">Jours de la semaine</p>
          {JOURS.map((jour, i) => {
            const t = dayTotals(i)
            const hasRepas = jours[i].repas.length > 0
            return (
              <button key={i} onClick={() => setActiveDay(i)}
                className={`w-full flex items-center justify-between px-4 py-3 transition-all ${
                  activeDay === i
                    ? 'bg-[#FF6B2B]/10 border-r-2 border-[#FF6B2B] text-[#FF6B2B]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-secondary)]'
                }`}>
                <div className="flex items-center gap-2.5">
                  {hasRepas && <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B2B]" />}
                  <span className="text-sm font-medium">{jour}</span>
                </div>
                {hasRepas && (
                  <span className={`text-[9px] font-bold ${activeDay === i ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'}`}>
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
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="text-[var(--text-primary)] text-xl font-bold tracking-tight">{JOURS[activeDay]}</h2>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <span className="text-[var(--text-primary)] text-sm font-black tabular-nums">{currentTotals.kcal} <span className="text-[var(--text-muted)] font-semibold text-xs">kcal</span></span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-[var(--text-secondary)]">
                  <span className="w-1.5 h-1.5 rounded-sm bg-[#FF6B2B]" /> P {currentTotals.p}g
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-[var(--text-secondary)]">
                  <span className="w-1.5 h-1.5 rounded-sm bg-[#FF9A6C]" /> G {currentTotals.g}g
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-[var(--text-secondary)]">
                  <span className="w-1.5 h-1.5 rounded-sm bg-[#FFCBA4]" /> L {currentTotals.l}g
                </span>
              </div>
            </div>

            {/* Add repas */}
            <div className="relative">
              <button onClick={() => setShowRepasMenu(!showRepasMenu)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all active:scale-95">
                <Plus size={14} /> Ajouter un repas <ChevronDown size={12} />
              </button>
              {showRepasMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowRepasMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-52 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl shadow-2xl overflow-hidden">
                    {REPAS_OPTIONS.map(opt => {
                      const Icon = opt.icon
                      return (
                        <button key={opt.type} onClick={() => addRepas(opt.type)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-surface)] transition-colors">
                          <div className={`w-8 h-8 rounded-lg ${opt.bg} flex items-center justify-center`}>
                            <Icon size={14} className={opt.color} />
                          </div>
                          <span className="text-[var(--text-primary)] text-sm font-medium">{opt.label}</span>
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
            <div className="flex flex-col items-center justify-center py-20 text-center animate-breathe">
              <UtensilsCrossed size={28} className="text-[var(--text-muted)] mb-4" strokeWidth={1.5} />
              <p className="text-[var(--text-primary)] text-sm font-bold mb-1 tracking-tight">Aucun repas pour {JOURS[activeDay]}</p>
              <p className="text-[var(--text-muted)] text-xs mb-5">Cliquez sur "Ajouter un repas" pour commencer</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-2xl">
              {currentDay.repas.map(repas => {
                const config = getRepasConfig(repas.type)
                const Icon = config.icon
                const kcal = calcCalories(repas.macros.p, repas.macros.g, repas.macros.l)

                return (
                  <div key={repas.id}
                    className="bg-[var(--bg-card)] border border-[var(--border-base)] rounded-2xl overflow-hidden group hover:border-[var(--border-base)] transition-all">

                    {/* Repas header */}
                    <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon size={14} className="text-[var(--text-muted)]" strokeWidth={1.75} />
                        <span className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-[0.14em]">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[var(--text-primary)] text-sm font-black tabular-nums">{kcal} <span className="text-[var(--text-muted)] font-semibold text-xs">kcal</span></span>
                        <button onClick={() => removeRepas(repas.id)}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
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
                        className="w-full bg-transparent text-[var(--text-primary)] text-base font-semibold border-none focus:outline-none placeholder:text-[var(--text-muted)]" />

                      {/* Description */}
                      <textarea value={repas.description}
                        onChange={e => updateRepas(repas.id, 'description', e.target.value)}
                        placeholder="Ingrédients, instructions, notes..."
                        rows={2}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/30 transition-all resize-none" />

                      {/* Macros — 3 tons orange (cohérent Hub Client nutrition) */}
                      <div className="grid grid-cols-4 gap-3">
                        <div className="relative bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl p-3 text-center overflow-hidden">
                          <span className="absolute top-0 left-3 right-3 h-[2px] rounded-b-full bg-[#FF6B2B]" />
                          <label className="text-[var(--text-muted)] text-[9px] font-bold uppercase tracking-[0.14em] block mb-1.5">Protéines</label>
                          <div className="flex items-center justify-center gap-1">
                            <input type="number" min={0} value={repas.macros.p || ''}
                              onChange={e => updateMacro(repas.id, 'p', e.target.value)}
                              className="w-14 bg-transparent text-[var(--text-primary)] text-lg font-black tabular-nums text-center border-none focus:outline-none placeholder:text-[var(--text-muted)]"
                              placeholder="0" />
                            <span className="text-[var(--text-muted)] text-xs">g</span>
                          </div>
                        </div>
                        <div className="relative bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl p-3 text-center overflow-hidden">
                          <span className="absolute top-0 left-3 right-3 h-[2px] rounded-b-full bg-[#FF9A6C]" />
                          <label className="text-[var(--text-muted)] text-[9px] font-bold uppercase tracking-[0.14em] block mb-1.5">Glucides</label>
                          <div className="flex items-center justify-center gap-1">
                            <input type="number" min={0} value={repas.macros.g || ''}
                              onChange={e => updateMacro(repas.id, 'g', e.target.value)}
                              className="w-14 bg-transparent text-[var(--text-primary)] text-lg font-black tabular-nums text-center border-none focus:outline-none placeholder:text-[var(--text-muted)]"
                              placeholder="0" />
                            <span className="text-[var(--text-muted)] text-xs">g</span>
                          </div>
                        </div>
                        <div className="relative bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl p-3 text-center overflow-hidden">
                          <span className="absolute top-0 left-3 right-3 h-[2px] rounded-b-full bg-[#FFCBA4]" />
                          <label className="text-[var(--text-muted)] text-[9px] font-bold uppercase tracking-[0.14em] block mb-1.5">Lipides</label>
                          <div className="flex items-center justify-center gap-1">
                            <input type="number" min={0} value={repas.macros.l || ''}
                              onChange={e => updateMacro(repas.id, 'l', e.target.value)}
                              className="w-14 bg-transparent text-[var(--text-primary)] text-lg font-black tabular-nums text-center border-none focus:outline-none placeholder:text-[var(--text-muted)]"
                              placeholder="0" />
                            <span className="text-[var(--text-muted)] text-xs">g</span>
                          </div>
                        </div>
                        <div className="bg-[#FF6B2B]/8 border border-[#FF6B2B]/20 rounded-xl p-3 text-center">
                          <label className="text-[#FF6B2B] text-[9px] font-bold uppercase tracking-[0.14em] block mb-1.5">Calories</label>
                          <p className="text-[#FF6B2B] text-lg font-black tabular-nums">{kcal}</p>
                          <p className="text-[var(--text-muted)] text-[8px]">auto</p>
                        </div>
                      </div>

                      {/* ── Aliments list ── */}
                      {(repas.aliments || []).length > 0 && (
                        <div className="space-y-1.5 mt-1">
                          <p className="text-[var(--text-muted)] text-[9px] font-bold uppercase tracking-wider">Aliments ajoutés</p>
                          {repas.aliments.map((a, aIdx) => {
                            const ratio = (a.quantite_g || 0) / 100
                            const aKcal = Math.round((a.kcal_100g || 0) * ratio)
                            return (
                              <div key={aIdx} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-[var(--bg-base)] group/alim">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[var(--text-primary)] text-xs font-medium truncate">{a.nom}</p>
                                  <p className="text-[var(--text-muted)] text-[10px]">{aKcal} kcal • P{Math.round((a.proteines || 0) * ratio)}g • G{Math.round((a.glucides || 0) * ratio)}g • L{Math.round((a.lipides || 0) * ratio)}g</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => updateAlimentQty(repas.id, aIdx, a.quantite_g - 25)}
                                    className="w-5 h-5 rounded bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                                    <Minus size={10} />
                                  </button>
                                  <span className="text-[var(--text-primary)] text-[10px] font-bold w-10 text-center">{a.quantite_g}g</span>
                                  <button onClick={() => updateAlimentQty(repas.id, aIdx, a.quantite_g + 25)}
                                    className="w-5 h-5 rounded bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                                    <Plus size={10} />
                                  </button>
                                </div>
                                <button onClick={() => removeAlimentFromRepas(repas.id, aIdx)}
                                  className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 transition-colors opacity-0 group-hover/alim:opacity-100">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Add aliment button */}
                      <button onClick={() => { setAlimentDrawer(repas.id); setAlimentSearch('') }}
                        className="w-full py-2.5 border border-dashed border-[var(--border-base)] rounded-xl text-[var(--text-muted)] text-xs hover:border-[#FF6B2B]/30 hover:text-[#FF6B2B]/50 hover:bg-[#FF6B2B]/[0.02] transition-all flex items-center justify-center gap-1.5">
                        <Plus size={12} /> Ajouter un aliment
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Aliment Drawer ═══ */}
      {alimentDrawer && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setAlimentDrawer(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[380px] bg-[var(--bg-elevated)] border-l border-[var(--border-base)] shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-[var(--border-base)] flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[var(--text-primary)] text-sm font-bold">Ajouter un aliment</h3>
                <button onClick={() => setAlimentDrawer(null)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all">
                  <X size={18} />
                </button>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input type="text" value={alimentSearch} onChange={e => setAlimentSearch(e.target.value)}
                  placeholder="Rechercher un aliment..." autoFocus
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl pl-9 pr-4 py-2.5 text-[var(--text-primary)] text-xs placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/50 transition-all" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
              {loadingAliments ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
                </div>
              ) : filteredAliments.length === 0 ? (
                <p className="text-[var(--text-muted)] text-xs text-center py-8">Aucun aliment trouvé</p>
              ) : (
                filteredAliments.map(aliment => (
                  <button key={aliment.id} onClick={() => { addAlimentToRepas(alimentDrawer, aliment); setAlimentDrawer(null) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-base)] transition-colors text-left group">
                    <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center shrink-0">
                      <UtensilsCrossed size={13} className="text-[#FF6B2B]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--text-primary)] text-xs font-medium truncate">{aliment.nom}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#FF6B2B] font-bold">{aliment.kcal_100g}kcal</span>
                        <span className="text-[10px] text-blue-400/60">P{aliment.proteines}</span>
                        <span className="text-[10px] text-amber-400/60">G{aliment.glucides}</span>
                        <span className="text-[10px] text-rose-400/60">L{aliment.lipides}</span>
                      </div>
                    </div>
                    <Plus size={14} className="text-[#FF6B2B] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}


      {/* ═══ Save Modal ═══ */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowSaveModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[var(--bg-card)] rounded-2xl border border-[var(--border-base)] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="h-1 bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]" />

            <div className="px-6 pt-5 pb-4 border-b border-[var(--border-base)]">
              <h2 className="text-[var(--text-primary)] text-lg font-bold">Sauvegarder le plan</h2>
              <p className="text-[var(--text-muted)] text-sm mt-0.5">Choisissez la destination</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Option A: Template */}
              <button onClick={() => setSaveMode('template')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                  saveMode === 'template'
                    ? 'bg-[#FF6B2B]/5 border-[#FF6B2B]/30'
                    : 'bg-[var(--bg-base)] border-[var(--border-base)] hover:border-[var(--border-base)]'
                }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  saveMode === 'template' ? 'bg-[#FF6B2B]/20' : 'bg-[var(--bg-surface)]'
                }`}>
                  <Layers size={18} className={saveMode === 'template' ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${saveMode === 'template' ? 'text-[#FF6B2B]' : 'text-[var(--text-primary)]'}`}>
                    Sauvegarder comme Modèle
                  </p>
                  <p className="text-[var(--text-muted)] text-xs mt-0.5">Réutilisable pour plusieurs clients</p>
                </div>
                {saveMode === 'template' && <Check size={16} className="text-[#FF6B2B] shrink-0" />}
              </button>

              {/* Option B: Assign to client */}
              <button onClick={() => setSaveMode('client')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                  saveMode === 'client'
                    ? 'bg-[#FF6B2B]/5 border-[#FF6B2B]/30'
                    : 'bg-[var(--bg-base)] border-[var(--border-base)] hover:border-[var(--border-base)]'
                }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  saveMode === 'client' ? 'bg-[#FF6B2B]/20' : 'bg-[var(--bg-surface)]'
                }`}>
                  <UserPlus size={18} className={saveMode === 'client' ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${saveMode === 'client' ? 'text-[#FF6B2B]' : 'text-[var(--text-primary)]'}`}>
                    Assigner à un client
                  </p>
                  <p className="text-[var(--text-muted)] text-xs mt-0.5">Plan personnalisé pour un client spécifique</p>
                </div>
                {saveMode === 'client' && <Check size={16} className="text-[#FF6B2B] shrink-0" />}
              </button>

              {/* Client selector (only when mode = client) */}
              {saveMode === 'client' && (
                <div className="space-y-2 pt-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input type="text" value={saveClientSearch} onChange={e => setSaveClientSearch(e.target.value)}
                      placeholder="Rechercher un client..."
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl pl-9 pr-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 transition-all" />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {coachClients
                      .filter(c => {
                        const searchable = [c.prenom, c.nom, c.email].filter(Boolean).join(' ')
                        return searchable.toLowerCase().includes(saveClientSearch.toLowerCase())
                      })
                      .map(c => {
                        const displayName = (c.prenom && c.nom) ? `${c.prenom} ${c.nom}` : (c.prenom || c.nom || c.email || 'Client sans nom')
                        const isSelected = saveClientId === c.id
                        const i1 = c.prenom ? c.prenom.charAt(0) : (c.email ? c.email.charAt(0) : '?')
                        const i2 = c.nom ? c.nom.charAt(0) : ''
                        const initials = `${i1}${i2}`.toUpperCase()
                        return (
                          <button key={c.id} onClick={() => setSaveClientId(c.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                              isSelected ? 'bg-[#FF6B2B]/10 border border-[#FF6B2B]/30' : 'hover:bg-[var(--bg-surface)] border border-transparent'
                            }`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 uppercase ${
                              isSelected ? 'bg-[#FF6B2B] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                            }`}>{initials}</div>
                            <span className={`text-sm ${isSelected ? 'text-[#FF6B2B] font-semibold' : 'text-[var(--text-primary)]'}`}>{displayName}</span>
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
                className="flex-1 py-3 rounded-xl text-sm text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all border border-[var(--border-subtle)]">
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
