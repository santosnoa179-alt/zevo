import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { supabase } from '../../lib/supabase'
import { usePageTransition } from '../../hooks/useAnimations'
import {
  Layers, ChevronRight, ChevronDown, Dumbbell, Apple,
  Loader2, CheckCircle2, Image as ImageIcon,
  BookOpen, FileText, Video, Link as LinkIcon, ExternalLink, Download,
  UtensilsCrossed, Flame, Droplets, Wheat, Trophy,
  Calendar, Check, Lock, Sun, Coffee, Cookie, Moon, Utensils,
  Target, Zap, Sparkles
} from 'lucide-react'

// ── Resource type config ──
const RESSOURCE_ICONS = {
  pdf: { icon: FileText, color: 'text-red-400', bg: 'bg-red-500/10', action: Download },
  video: { icon: Video, color: 'text-[var(--text-muted)]', bg: 'bg-[var(--bg-surface)]', action: ExternalLink },
  lien: { icon: LinkIcon, color: 'text-primary', bg: 'bg-primary/10', action: ExternalLink },
  image: { icon: ImageIcon, color: 'text-primary-light', bg: 'bg-primary-light/10', action: Download },
  guide: { icon: BookOpen, color: 'text-[var(--text-muted)]', bg: 'bg-[var(--bg-surface)]', action: ExternalLink },
}

// ── Meal labels & icons (no emojis) ──
const REPAS_LABELS = {
  petit_dej: 'Petit-dejeuner',
  dejeuner: 'Dejeuner',
  collation: 'Collation',
  diner: 'Diner',
}
const REPAS_ICON_MAP = {
  petit_dej: { icon: Sun, color: 'text-primary', bg: 'bg-primary/10' },
  dejeuner: { icon: Coffee, color: 'text-primary', bg: 'bg-primary/10' },
  collation: { icon: Cookie, color: 'text-primary-light', bg: 'bg-primary-light/10' },
  diner: { icon: Moon, color: 'text-[var(--text-muted)]', bg: 'bg-[var(--bg-surface)]' },
}

// ── Shared sub-components ──

function SectionLabel({ children, icon: Icon, iconColor = 'text-primary' }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon size={14} className={iconColor} />}
      <p className="text-[var(--text-secondary)] text-[11px] uppercase tracking-wider font-semibold">{children}</p>
    </div>
  )
}

function ProgressRing({ percent, size = 44, stroke = 3.5, color = 'var(--color-primary)' }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-base)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        className="transition-all duration-700 ease-out" />
    </svg>
  )
}

function WeekTracker({ totalWeeks, completedWeeks, isWeekCompleted, validateWeek, validatingWeek, progress, accentColor = 'var(--color-primary)', label = 'Suivi de progression' }) {
  return (
    <div className="glass-card overflow-hidden">
      {/* Header with ring */}
      <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center gap-4">
        <div className="relative flex items-center justify-center">
          <ProgressRing percent={progress} color={accentColor} />
          <span className="absolute text-[10px] font-bold" style={{ color: accentColor }}>{progress}%</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[var(--text-primary)] font-semibold text-sm">{label}</h3>
          <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
            {completedWeeks.length} / {totalWeeks} semaine{totalWeeks > 1 ? 's' : ''} validee{completedWeeks.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Weeks grid */}
      <div className="p-4">
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(weekNum => {
            const done = isWeekCompleted(weekNum)
            const isValidating = validatingWeek === weekNum
            const unlocked = weekNum === 1 || isWeekCompleted(weekNum - 1)

            return (
              <button
                key={weekNum}
                onClick={() => !done && unlocked && validateWeek(weekNum)}
                disabled={done || !unlocked || isValidating}
                className={`relative flex flex-col items-center justify-center py-3 rounded-xl border transition-all ${
                  done
                    ? 'bg-primary/10 border-primary/20'
                    : unlocked
                      ? 'border-[var(--border-base)] hover:border-[color:var(--accent)] active:scale-95 bg-[var(--bg-card)]'
                      : 'bg-[var(--bg-surface)]/50 border-transparent opacity-40'
                }`}
                style={{ '--accent': accentColor }}
              >
                {done ? (
                  <CheckCircle2 size={18} className="text-primary mb-0.5" />
                ) : isValidating ? (
                  <Loader2 size={16} className="animate-spin mb-0.5" style={{ color: accentColor }} />
                ) : unlocked ? (
                  <span className="text-sm font-bold mb-0.5" style={{ color: accentColor }}>{weekNum}</span>
                ) : (
                  <Lock size={13} className="text-[var(--text-muted)] mb-0.5" />
                )}
                <span className={`text-[9px] font-medium ${done ? 'text-primary' : 'text-[var(--text-muted)]'}`}>
                  Sem. {weekNum}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function ProgrammePage() {
  const { user } = useAuth()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(searchParams.get('tab') === 'nutrition' ? 'nutrition' : 'sport')

  // Sport
  const [assignation, setAssignation] = useState(null)
  const [phases, setPhases] = useState([])
  const [expandedPhase, setExpandedPhase] = useState(null)
  // Sport V3 Pro (sport_programmes)
  const [sportProAssigne, setSportProAssigne] = useState(null)
  const [sportProPhases, setSportProPhases] = useState([])
  const [sportProSeanceTypes, setSportProSeanceTypes] = useState([])  // [{id, phase_id, nom, duree_estimee_min, ...}]
  const [expandedSportPhase, setExpandedSportPhase] = useState(null)

  // Nutrition
  const [nutritionPlan, setNutritionPlan] = useState(null)
  const [repas, setRepas] = useState([])
  const [loadingNutrition, setLoadingNutrition] = useState(false)
  // Nutrition V2 Pro (nutrition_programmes)
  const [nutriProAssigne, setNutriProAssigne] = useState(null)
  const [nutriProPhases, setNutriProPhases] = useState([])
  const [nutriProJourTypes, setNutriProJourTypes] = useState([])  // { id, phase_id, nom, repas: [{type, titre, proteines_g, glucides_g, lipides_g, aliments}] }
  const [expandedNutriPhase, setExpandedNutriPhase] = useState(null)

  // Suivi semaines (sport)
  const [completedWeeks, setCompletedWeeks] = useState([])
  const [validatingWeek, setValidatingWeek] = useState(null)

  // Suivi semaines (nutrition)
  const [completedNutriWeeks, setCompletedNutriWeeks] = useState([])
  const [validatingNutriWeek, setValidatingNutriWeek] = useState(null)

  // Coach ID (pour notifications)
  const [coachId, setCoachId] = useState(null)

  // ── Charge le programme sport ──
  const loadSport = useCallback(async () => {
    if (!user) return

    // 1) Programme Pro V3 (sport_programmes) en priorité
    try {
      const { data: proProg } = await supabase
        .from('sport_programmes')
        .select('*')
        .eq('client_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (proProg) {
        setSportProAssigne(proProg)
        const { data: phasesData } = await supabase
          .from('sport_phases')
          .select('*')
          .eq('programme_id', proProg.id)
          .order('ordre')
        setSportProPhases(phasesData || [])
        const phaseIds = (phasesData || []).map(p => p.id)
        if (phaseIds.length > 0) {
          const { data: stData } = await supabase
            .from('sport_seance_types')
            .select('id, phase_id, nom, duree_estimee_min, focus, ordre')
            .in('phase_id', phaseIds)
            .order('ordre')
          setSportProSeanceTypes(stData || [])
        }
        if (phasesData && phasesData[0]) setExpandedSportPhase(phasesData[0].id)
      }
    } catch (e) {
      console.warn('[ProgrammePage] sport_programmes indisponible:', e?.message)
    }

    // 2) Legacy (programme_assignations) — fallback
    const { data: assign } = await supabase
      .from('programme_assignations')
      .select('*, programmes(*)')
      .eq('client_id', user.id)
      .eq('statut', 'en_cours')
      .limit(1)
      .maybeSingle()

    if (assign) {
      if (assign.programmes && !assign.programmes.document_url) {
        const { data: progDirect } = await supabase
          .from('programmes')
          .select('*')
          .eq('id', assign.programme_id)
          .single()
        if (progDirect?.document_url) {
          assign.programmes = { ...assign.programmes, ...progDirect }
        }
      }
      setAssignation(assign)
      const { data: phasesData } = await supabase
        .from('programme_phases')
        .select('*')
        .eq('programme_id', assign.programme_id)
        .order('ordre')
      setPhases(phasesData || [])
      if (phasesData?.length && assign.phase_actuelle) {
        const currentPhase = phasesData.find(p => p.ordre === assign.phase_actuelle)
        if (currentPhase) setExpandedPhase(currentPhase.id)
      }
    }
  }, [user])

  // ── Charge le plan nutrition ──
  const loadNutrition = useCallback(async () => {
    if (!user) return
    setLoadingNutrition(true)

    // 1) Programme Pro V2 (nutrition_programmes) en priorité
    try {
      const { data: proProg } = await supabase
        .from('nutrition_programmes')
        .select('*')
        .eq('client_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (proProg) {
        setNutriProAssigne(proProg)
        const { data: phasesData } = await supabase
          .from('nutrition_phases')
          .select('*')
          .eq('programme_id', proProg.id)
          .order('ordre')
        setNutriProPhases(phasesData || [])
        const phaseIds = (phasesData || []).map(p => p.id)
        if (phaseIds.length > 0) {
          // Fetch jour_types + repas (+ aliments) pour affichage détaillé
          const { data: jtData } = await supabase
            .from('nutrition_jour_types')
            .select('id, phase_id, nom, icon, ordre, notes')
            .in('phase_id', phaseIds)
            .order('ordre')
          const jtIds = (jtData || []).map(j => j.id)
          let repasMap = {}
          if (jtIds.length > 0) {
            const { data: repasData } = await supabase
              .from('nutrition_programme_repas')
              .select('id, jour_type_id, type, ordre, titre, description, proteines_g, glucides_g, lipides_g, nutrition_programme_repas_aliments(quantite_g, aliments(nom, kcal_100g, proteines, glucides, lipides))')
              .in('jour_type_id', jtIds)
              .order('ordre')
            ;(repasData || []).forEach(r => {
              if (!repasMap[r.jour_type_id]) repasMap[r.jour_type_id] = []
              repasMap[r.jour_type_id].push(r)
            })
          }
          const enrichedJt = (jtData || []).map(jt => ({ ...jt, repas: repasMap[jt.id] || [] }))
          setNutriProJourTypes(enrichedJt)
          // Pré-déplier phase 1
          if (phasesData && phasesData[0]) setExpandedNutriPhase(phasesData[0].id)
        }
      }
    } catch (e) {
      console.warn('[ProgrammePage] nutrition_programmes indisponible:', e?.message)
    }

    // 2) Legacy (client_nutrition_plans) — fallback
    const { data: plan } = await supabase
      .from('client_nutrition_plans')
      .select('*')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (plan) {
      setNutritionPlan(plan)
      const [repasRes, suiviRes] = await Promise.all([
        supabase
          .from('plan_repas')
          .select('*, repas_aliments(*, aliments(nom, kcal_100g, proteines, glucides, lipides))')
          .eq('plan_id', plan.id)
          .order('ordre'),
        supabase
          .from('suivi_nutrition')
          .select('numero_semaine, completed_at')
          .eq('client_id', user.id)
          .eq('plan_id', plan.id)
          .order('numero_semaine'),
      ])
      setRepas(repasRes.data || [])
      setCompletedNutriWeeks(suiviRes.data || [])
    }
    setLoadingNutrition(false)
  }, [user])

  // ── Charge le suivi des semaines ──
  const loadWeekProgress = useCallback(async (programmeId) => {
    if (!user || !programmeId) return
    const { data } = await supabase
      .from('suivi_programmes')
      .select('numero_semaine, completed_at')
      .eq('client_id', user.id)
      .eq('programme_id', programmeId)
      .order('numero_semaine')
    setCompletedWeeks(data || [])
  }, [user])

  // ── Valider une semaine (sport) ──
  const validateWeek = async (weekNum) => {
    if (!user || !assignation) return
    const programmeId = assignation.programme_id
    setValidatingWeek(weekNum)
    try {
      const { error } = await supabase.from('suivi_programmes').insert({
        client_id: user.id,
        programme_id: programmeId,
        numero_semaine: weekNum,
      })
      if (error) {
        if (error.code === '23505') {
          toast.error('Cette semaine est deja validee !')
        } else {
          throw error
        }
      } else {
        setCompletedWeeks(prev => [...prev, { numero_semaine: weekNum, completed_at: new Date().toISOString() }])
        toast.success('Super ! Semaine validee, ton coach est prevenu.')
        if (coachId) {
          await supabase.from('notifications').insert({
            coach_id: coachId,
            client_id: user.id,
            titre: 'Semaine validee',
            message: `Ton client a valide la semaine ${weekNum} de son programme sport.`,
            type: 'validation_semaine',
            destinataire: 'coach',
          }).then(({ error: nErr }) => { if (nErr) console.warn('[Notif]', nErr.message) })
        }
      }
    } catch (err) {
      console.error('[ProgrammePage] Erreur validation semaine:', err)
      toast.error('Erreur : ' + (err.message || 'Inconnu'))
    } finally {
      setValidatingWeek(null)
    }
  }

  // ── Valider une semaine (nutrition) ──
  const validateNutriWeek = async (weekNum) => {
    if (!user || !nutritionPlan) return
    setValidatingNutriWeek(weekNum)
    try {
      const { error } = await supabase.from('suivi_nutrition').insert({
        client_id: user.id,
        plan_id: nutritionPlan.id,
        numero_semaine: weekNum,
      })
      if (error) {
        if (error.code === '23505') {
          toast.error('Cette semaine est deja validee !')
        } else {
          throw error
        }
      } else {
        setCompletedNutriWeeks(prev => [...prev, { numero_semaine: weekNum, completed_at: new Date().toISOString() }])
        toast.success('Super ! Semaine nutritionnelle validee.')
        if (coachId) {
          await supabase.from('notifications').insert({
            coach_id: coachId,
            client_id: user.id,
            titre: 'Semaine validee',
            message: `Ton client a valide la semaine ${weekNum} de son plan nutrition.`,
            type: 'validation_semaine',
            destinataire: 'coach',
          }).then(({ error: nErr }) => { if (nErr) console.warn('[Notif]', nErr.message) })
        }
      }
    } catch (err) {
      console.error('[ProgrammePage] Erreur validation semaine nutri:', err)
      toast.error('Erreur : ' + (err.message || 'Inconnu'))
    } finally {
      setValidatingNutriWeek(null)
    }
  }

  useEffect(() => {
    if (!user) return
    const init = async () => {
      setLoading(true)
      const { data: clientData } = await supabase
        .from('clients')
        .select('coach_id')
        .eq('id', user.id)
        .maybeSingle()
      if (clientData?.coach_id) setCoachId(clientData.coach_id)
      await Promise.all([loadSport(), loadNutrition()])
      setLoading(false)
    }
    init()
  }, [user, loadSport, loadNutrition])

  useEffect(() => {
    if (assignation?.programme_id) loadWeekProgress(assignation.programme_id)
  }, [assignation?.programme_id, loadWeekProgress])

  const pageTransition = usePageTransition()

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-4">
        <div className="skel-block h-8 w-40" />
        <div className="skel-block h-12 w-full rounded-xl" />
        <div className="skel-block h-48 w-full rounded-2xl" />
        <div className="skel-block h-32 w-full rounded-2xl" />
        <div className="skel-block h-64 w-full rounded-2xl" />
      </div>
    )
  }

  const prog = assignation?.programmes
  const progressPercent = phases.length > 0 && assignation
    ? Math.round((assignation.phase_actuelle / phases.length) * 100)
    : 0

  const hasExercises = phases.some(p => (p.exercices?.length || 0) > 0)
  const isDocumentMode = !!prog?.document_url
  const totalWeeks = prog?.duree_semaines || 4
  const isWeekCompleted = (w) => completedWeeks.some(cw => cw.numero_semaine === w)
  const completedCount = completedWeeks.length
  const weekProgress = Math.round((completedCount / totalWeeks) * 100)

  const nutriTotalWeeks = nutritionPlan?.duree_semaines || prog?.duree_semaines || 4
  const isNutriWeekCompleted = (w) => completedNutriWeeks.some(cw => cw.numero_semaine === w)
  const completedNutriCount = completedNutriWeeks.length
  const nutriWeekProgress = Math.round((completedNutriCount / nutriTotalWeeks) * 100)

  const repasParJour = repas.reduce((acc, r) => {
    const jour = r.metadata?.day ?? 0
    if (!acc[jour]) acc[jour] = []
    acc[jour].push(r)
    return acc
  }, {})

  return (
    <div className={`p-4 max-w-4xl mx-auto space-y-5 ${pageTransition.className}`}>

      {/* ═══════════ HEADER ═══════════ */}
      <div className="pt-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-lg shadow-primary/20">
            <Layers size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[var(--text-primary)] text-xl font-bold leading-tight">Programme</h1>
            <p className="text-[var(--text-muted)] text-[11px]">Ton plan personnalise par ton coach</p>
          </div>
        </div>
      </div>

      {/* ═══════════ TABS ═══════════ */}
      <div className="glass-card p-1.5 flex gap-1.5">
        {[
          { key: 'sport', label: 'Sport', icon: Dumbbell, color: 'var(--color-primary)' },
          { key: 'nutrition', label: 'Nutrition', icon: UtensilsCrossed, color: 'var(--color-primary-light)' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              tab === t.key
                ? 'text-white shadow-lg'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
            }`}
            style={tab === t.key ? {
              background: `linear-gradient(135deg, ${t.color} 0%, color-mix(in srgb, ${t.color} 80%, transparent) 100%)`,
              boxShadow: `0 4px 16px color-mix(in srgb, ${t.color} 18.8%, transparent)`,
            } : undefined}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
           ONGLET SPORT
         ══════════════════════════════════════════════════════════════ */}
      {tab === 'sport' && (
        <>
          {/* ═══════════════════════════════════════════ */}
          {/* PROGRAMME PRO V3 (sport_programmes)        */}
          {/* ═══════════════════════════════════════════ */}
          {sportProAssigne && (
            <div className="space-y-4 mb-5">
              <div className="glass-card overflow-hidden relative">
                <div className="h-1 bg-gradient-to-r from-primary to-primary-light" />
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                      <Dumbbell size={22} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[var(--text-primary)] text-lg font-bold truncate">{sportProAssigne.nom}</h2>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">PRO</span>
                      </div>
                      <p className="text-[var(--text-muted)] text-xs mt-0.5">
                        {sportProAssigne.duree_semaines} semaines
                        {sportProAssigne.objectif ? ` · ${sportProAssigne.objectif}` : ''}
                        {sportProAssigne.frequence_hebdo ? ` · ${sportProAssigne.frequence_hebdo}/sem` : ''}
                      </p>
                    </div>
                  </div>

                  {sportProAssigne.description && (
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">{sportProAssigne.description}</p>
                  )}

                  {/* Phases dépliables avec séances types */}
                  {sportProPhases.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-bold mb-1">Phases du programme</p>
                      {sportProPhases.map((ph, idx) => {
                        const isExpanded = expandedSportPhase === ph.id
                        const phaseSeanceTypes = sportProSeanceTypes.filter(st => st.phase_id === ph.id)
                        return (
                          <div key={ph.id} className="bg-[var(--bg-base)] rounded-xl border border-[var(--border-base)] overflow-hidden">
                            <button
                              onClick={() => setExpandedSportPhase(isExpanded ? null : ph.id)}
                              className="w-full p-3 flex items-center gap-3 hover:bg-[var(--bg-surface)]/40 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                <span className="text-primary text-xs font-black tabular-nums">{idx + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-[var(--text-primary)] text-sm font-semibold truncate">{ph.nom}</p>
                                <p className="text-[var(--text-muted)] text-[10px] mt-0.5 tabular-nums">
                                  {ph.duree_semaines} sem.
                                  {ph.objectif ? ` · ${ph.objectif}` : ''}
                                  {phaseSeanceTypes.length > 0 ? ` · ${phaseSeanceTypes.length} séance${phaseSeanceTypes.length > 1 ? 's' : ''} type${phaseSeanceTypes.length > 1 ? 's' : ''}` : ''}
                                </p>
                              </div>
                              <ChevronDown size={16} className={`text-[var(--text-muted)] shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>

                            {isExpanded && (
                              <div className="px-3 pb-3 border-t border-[var(--border-base)] pt-3">
                                {phaseSeanceTypes.length > 0 ? (
                                  <div className="space-y-1.5">
                                    <p className="text-[var(--text-muted)] text-[9px] uppercase tracking-widest font-bold mb-1">Séances types</p>
                                    {phaseSeanceTypes.map(st => (
                                      <div key={st.id} className="flex items-center gap-2 bg-[var(--bg-surface)] rounded-md px-2.5 py-2 border border-[var(--border-base)]">
                                        <Dumbbell size={12} className="text-primary shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[var(--text-primary)] text-xs font-semibold truncate">{st.nom}</p>
                                          {st.focus && (
                                            <p className="text-[var(--text-muted)] text-[9px] truncate">{st.focus}</p>
                                          )}
                                        </div>
                                        {st.duree_estimee_min && (
                                          <span className="text-[var(--text-muted)] text-[10px] font-bold tabular-nums shrink-0">{st.duree_estimee_min} min</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[var(--text-muted)] text-[10px] italic">Ton coach n'a pas encore défini les séances types de cette phase</p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* CTA vers mes séances */}
                  <a href="/app/seances" className="mt-4 inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-lg shadow-primary/20">
                    <Calendar size={16} /> Voir mes séances
                  </a>
                </div>
              </div>
            </div>
          )}

          {!assignation && !sportProAssigne ? (
            /* ── Empty state ── */
            <div className="glass-card p-12 text-center">
              <div className="relative inline-flex items-center justify-center mb-5">
                <div className="absolute w-20 h-20 rounded-full bg-primary/5 animate-breathe" />
                <div className="relative w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Dumbbell size={24} className="text-primary" />
                </div>
              </div>
              <h2 className="text-[var(--text-primary)] font-semibold text-lg mb-2">Aucun programme sportif</h2>
              <p className="text-[var(--text-muted)] text-sm max-w-[260px] mx-auto">Ton coach n'a pas encore assigne de programme sportif.</p>
            </div>

          ) : !assignation ? null : isDocumentMode ? (
            /* ═══════════════════════════════════════════ */
            /* MODE DOCUMENT — PDF global                  */
            /* ═══════════════════════════════════════════ */
            <>
              {/* Programme title */}
              <div>
                <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-medium mb-1">Programme actif</p>
                <h2 className="text-[var(--text-primary)] text-lg font-bold">{prog?.titre}</h2>
                {prog?.description && <p className="text-[var(--text-muted)] text-sm mt-1 leading-relaxed">{prog.description}</p>}
              </div>

              {/* PDF Card — hero style */}
              <div className="glass-card overflow-hidden">
                {/* Gradient accent bar */}
                <div className="h-1 bg-gradient-to-r from-primary to-primary-light" />
                <div className="p-8 text-center">
                  <div className="relative inline-flex items-center justify-center mb-5">
                    <div className="absolute w-24 h-24 rounded-full bg-primary/5 animate-breathe" />
                    <div className="relative w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <FileText size={28} className="text-primary" />
                    </div>
                  </div>
                  <h2 className="text-[var(--text-primary)] text-lg font-bold mb-1.5">Ton programme PDF</h2>
                  <p className="text-[var(--text-muted)] mb-6 text-sm max-w-[280px] mx-auto">Consulte ton plan d'entrainement complet joint par ton coach.</p>
                  <a
                    href={prog.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 text-white font-bold px-7 py-3 rounded-xl transition-all active:scale-95 hover:shadow-xl"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
                      boxShadow: '0 4px 20px rgba(var(--color-primary-rgb),0.3)',
                    }}
                  >
                    Ouvrir le document
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>

              {/* Week tracker */}
              <WeekTracker
                totalWeeks={totalWeeks}
                completedWeeks={completedWeeks}
                isWeekCompleted={isWeekCompleted}
                validateWeek={validateWeek}
                validatingWeek={validatingWeek}
                progress={weekProgress}
              />
            </>

          ) : (
            /* ═══════════════════════════════════════════ */
            /* MODE CLASSIQUE — Phases + Exercices         */
            /* ═══════════════════════════════════════════ */
            <>
              {/* Programme title */}
              <div>
                <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-medium mb-1">Programme actif</p>
                <h2 className="text-[var(--text-primary)] text-lg font-bold">{prog?.titre}</h2>
                {prog?.description && <p className="text-[var(--text-muted)] text-sm mt-1 leading-relaxed">{prog.description}</p>}
              </div>

              {/* Progress hero card */}
              <div className="glass-card overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary to-primary-light" />
                <div className="p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative flex items-center justify-center">
                      <ProgressRing percent={progressPercent} size={56} stroke={4} />
                      <span className="absolute text-xs font-bold text-primary">{progressPercent}%</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[var(--text-primary)] text-sm font-semibold">Phase {assignation.phase_actuelle}/{phases.length}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {prog?.categorie && (
                          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold">
                            {prog.categorie}
                          </span>
                        )}
                        {prog?.duree_semaines && (
                          <span className="text-[var(--text-muted)] text-[10px]">{prog.duree_semaines} semaines</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Phase bar segments */}
                  <div className="flex gap-1">
                    {phases.map((ph, i) => (
                      <div key={ph.id}
                        className="h-2 rounded-full flex-1 transition-all duration-500"
                        style={{
                          background: i < assignation.phase_actuelle
                            ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))'
                            : 'var(--border-base)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Global document attached */}
              {prog?.document_url && (
                <a href={prog.document_url} target="_blank" rel="noopener noreferrer"
                  className="glass-card flex items-center gap-4 p-4 hover:border-primary/30 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-all">
                    <FileText size={22} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-sm font-semibold truncate">
                      {prog.document_nom || 'Programme PDF'}
                    </p>
                    <p className="text-[var(--text-muted)] text-xs mt-0.5">Fichier joint par ton coach</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary transition-all">
                    <Download size={16} className="text-primary group-hover:text-white transition-all" />
                  </div>
                </a>
              )}

              {/* ── Phases ── */}
              <div className="space-y-3">
                <SectionLabel icon={Zap}>Phases du programme</SectionLabel>
                {phases.map((phase, index) => {
                  const isCurrent = phase.ordre === assignation.phase_actuelle
                  const isDone = phase.ordre < assignation.phase_actuelle
                  const isExpanded = expandedPhase === phase.id

                  return (
                    <div key={phase.id}
                      className={`glass-card overflow-hidden transition-all ${
                        isCurrent ? '!border-primary/25' : ''
                      }`}
                      style={isCurrent ? { boxShadow: '0 0 24px rgba(var(--color-primary-rgb),0.08)' } : undefined}
                    >
                      {/* Phase header */}
                      <button onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-[var(--bg-surface)]/50 transition-colors">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                          isDone ? 'bg-primary/15' : isCurrent ? 'bg-primary/15' : 'bg-[var(--bg-surface)]'
                        }`}>
                          {isDone ? (
                            <CheckCircle2 size={16} className="text-primary" />
                          ) : (
                            <span className={`text-xs font-bold ${isCurrent ? 'text-primary' : 'text-[var(--text-muted)]'}`}>
                              {index + 1}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium truncate ${isCurrent ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                              {phase.titre}
                            </span>
                            {isCurrent && (
                              <span className="text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                                style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', color: 'white' }}>
                                En cours
                              </span>
                            )}
                          </div>
                          <span className="text-[var(--text-muted)] text-xs">{phase.duree_semaines} semaine{phase.duree_semaines > 1 ? 's' : ''}</span>
                        </div>
                        <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                          <ChevronRight size={16} className="text-[var(--text-muted)]" />
                        </div>
                      </button>

                      {/* Phase expanded content */}
                      {isExpanded && (
                        <div className="px-4 pb-5 space-y-5 border-t border-[var(--border-subtle)] pt-4">
                          {phase.description && (
                            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{phase.description}</p>
                          )}

                          {/* Exercices */}
                          {(phase.exercices?.length || 0) > 0 && (
                            <div>
                              <SectionLabel icon={Dumbbell}>Exercices ({phase.exercices.length})</SectionLabel>
                              <div className="space-y-2">
                                {phase.exercices.map((ex, ei) => (
                                  <div key={ei} className="flex items-center gap-3 bg-[var(--bg-base)] rounded-xl p-3 border border-[var(--border-subtle)]">
                                    {ex.image_url ? (
                                      <img
                                        src={ex.image_url}
                                        alt={ex.name}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                                        onError={(e) => {
                                          e.currentTarget.onerror = null
                                          e.currentTarget.replaceWith(
                                            Object.assign(document.createElement('div'), {
                                              className: 'w-14 h-14 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center flex-shrink-0',
                                              innerHTML: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:rgba(245,245,243,0.4)"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
                                            })
                                          )
                                        }}
                                      />
                                    ) : (
                                      <div className="w-14 h-14 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center flex-shrink-0">
                                        <ImageIcon size={18} className="text-[var(--text-muted)]" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[var(--text-primary)] text-sm font-medium">{ex.name}</p>
                                      <p className="text-[var(--text-muted)] text-xs">{ex.muscle_group}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <p className="text-primary text-sm font-bold">{ex.sets}x{ex.reps}</p>
                                      {ex.rest_seconds && <p className="text-[var(--text-muted)] text-[10px]">{ex.rest_seconds}s repos</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Nutrition dans la phase */}
                          {(phase.calories_objectif || phase.proteines_g || phase.consignes_nutrition) && (
                            <div>
                              <SectionLabel icon={Apple} iconColor="text-primary-light">Nutrition</SectionLabel>
                              {(phase.calories_objectif || phase.proteines_g) && (
                                <div className="grid grid-cols-4 gap-2 mb-3">
                                  {phase.calories_objectif && (
                                    <div className="bg-[var(--bg-base)] rounded-xl p-3 text-center border border-[var(--border-subtle)]">
                                      <p className="text-[var(--text-primary)] text-lg font-bold">{phase.calories_objectif}</p>
                                      <p className="text-[var(--text-muted)] text-[9px] uppercase">kcal</p>
                                    </div>
                                  )}
                                  {phase.proteines_g && (
                                    <div className="bg-[var(--bg-base)] rounded-xl p-3 text-center border border-[var(--border-subtle)]">
                                      <p className="text-primary text-lg font-bold">{phase.proteines_g}g</p>
                                      <p className="text-[var(--text-muted)] text-[9px] uppercase">Prot.</p>
                                    </div>
                                  )}
                                  {phase.glucides_g && (
                                    <div className="bg-[var(--bg-base)] rounded-xl p-3 text-center border border-[var(--border-subtle)]">
                                      <p className="text-primary-light text-lg font-bold">{phase.glucides_g}g</p>
                                      <p className="text-[var(--text-muted)] text-[9px] uppercase">Gluc.</p>
                                    </div>
                                  )}
                                  {phase.lipides_g && (
                                    <div className="bg-[var(--bg-base)] rounded-xl p-3 text-center border border-[var(--border-subtle)]">
                                      <p className="text-[var(--text-muted)] text-lg font-bold">{phase.lipides_g}g</p>
                                      <p className="text-[var(--text-muted)] text-[9px] uppercase">Lip.</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {phase.consignes_nutrition && (
                                <div className="bg-[var(--bg-base)] rounded-xl p-3.5 border border-[var(--border-subtle)]">
                                  <p className="text-[var(--text-secondary)] text-xs whitespace-pre-wrap leading-relaxed">{phase.consignes_nutrition}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Habitudes */}
                          {(phase.habitudes?.length || 0) > 0 && (
                            <div>
                              <SectionLabel icon={Sparkles} iconColor="text-primary-light">Habitudes</SectionLabel>
                              <div className="flex flex-wrap gap-2">
                                {phase.habitudes.map((h, hi) => (
                                  <span key={hi} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: h.couleur || 'var(--color-primary)' }} />
                                    {h.nom}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Objectifs */}
                          {(phase.objectifs?.length || 0) > 0 && (
                            <div>
                              <SectionLabel icon={Target} iconColor="text-primary">Objectifs</SectionLabel>
                              <div className="flex flex-wrap gap-2">
                                {phase.objectifs.map((o, oi) => (
                                  <span key={oi} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]">
                                    <Target size={11} className="text-primary" />
                                    {o.titre}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Ressources */}
                          {(phase.ressources_attachees?.length || 0) > 0 && (
                            <div>
                              <SectionLabel icon={BookOpen} iconColor="text-primary">
                                Ressources ({phase.ressources_attachees.length})
                              </SectionLabel>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {phase.ressources_attachees.map((res, ri) => {
                                  const typeInfo = RESSOURCE_ICONS[res.type] || RESSOURCE_ICONS.lien
                                  const Icon = typeInfo.icon
                                  const ActionIcon = typeInfo.action
                                  return (
                                    <a key={ri} href={res.url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-3 bg-[var(--bg-base)] rounded-xl p-3 border border-[var(--border-subtle)] hover:border-[var(--border-base)] transition-all group">
                                      <div className={`w-10 h-10 rounded-lg ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                                        <Icon size={16} className={typeInfo.color} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[var(--text-primary)] text-sm font-medium truncate group-hover:text-primary transition-colors">{res.titre}</p>
                                        <p className="text-[var(--text-muted)] text-[10px] capitalize mt-0.5">{res.type}{res.categorie ? ` · ${res.categorie}` : ''}</p>
                                      </div>
                                      <ActionIcon size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                                    </a>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* ── Week tracker (classic mode) ── */}
              {totalWeeks > 0 && (
                <WeekTracker
                  totalWeeks={totalWeeks}
                  completedWeeks={completedWeeks}
                  isWeekCompleted={isWeekCompleted}
                  validateWeek={validateWeek}
                  validatingWeek={validatingWeek}
                  progress={weekProgress}
                  label="Suivi hebdomadaire"
                />
              )}
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
           ONGLET NUTRITION
         ══════════════════════════════════════════════════════════════ */}
      {tab === 'nutrition' && (
        <>
          {/* ═══════════════════════════════════════════ */}
          {/* PROGRAMME PRO V2 (nutrition_programmes)    */}
          {/* ═══════════════════════════════════════════ */}
          {nutriProAssigne && (
            <div className="space-y-4 mb-5">
              <div className="glass-card overflow-hidden relative">
                <div className="h-1 bg-gradient-to-r from-primary to-primary-light" />
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                      <UtensilsCrossed size={22} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[var(--text-primary)] text-lg font-bold truncate">{nutriProAssigne.nom}</h2>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">PRO</span>
                      </div>
                      <p className="text-[var(--text-muted)] text-xs mt-0.5">
                        {nutriProAssigne.duree_semaines} semaines
                        {nutriProAssigne.objectif ? ` · ${nutriProAssigne.objectif}` : ''}
                      </p>
                    </div>
                  </div>

                  {nutriProAssigne.description && (
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">{nutriProAssigne.description}</p>
                  )}

                  {/* Phases avec macros + jours types dépliables */}
                  {nutriProPhases.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-bold mb-1">Phases du programme</p>
                      {nutriProPhases.map((ph, idx) => {
                        const isExpanded = expandedNutriPhase === ph.id
                        const phaseJourTypes = nutriProJourTypes.filter(jt => jt.phase_id === ph.id)
                        return (
                          <div key={ph.id} className="bg-[var(--bg-base)] rounded-xl border border-[var(--border-base)] overflow-hidden">
                            <button
                              onClick={() => setExpandedNutriPhase(isExpanded ? null : ph.id)}
                              className="w-full p-3 flex items-center gap-3 hover:bg-[var(--bg-surface)]/40 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                <span className="text-primary text-xs font-black tabular-nums">{idx + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-[var(--text-primary)] text-sm font-semibold truncate">{ph.nom}</p>
                                <p className="text-[var(--text-muted)] text-[10px] mt-0.5 tabular-nums">
                                  {ph.duree_semaines} sem.{phaseJourTypes.length > 0 ? ` · ${phaseJourTypes.length} jour${phaseJourTypes.length > 1 ? 's' : ''} type${phaseJourTypes.length > 1 ? 's' : ''}` : ''}
                                </p>
                              </div>
                              <ChevronDown size={16} className={`text-[var(--text-muted)] shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>

                            {isExpanded && (
                              <div className="px-3 pb-3 space-y-3 border-t border-[var(--border-base)] pt-3">
                                {/* Macros cibles */}
                                {(ph.kcal_cible || ph.proteines_cible_g) && (
                                  <div>
                                    <p className="text-[var(--text-muted)] text-[9px] uppercase tracking-widest font-bold mb-1.5">Macros cibles</p>
                                    <div className="grid grid-cols-4 gap-1.5">
                                      {ph.kcal_cible && (
                                        <div className="bg-[var(--bg-surface)] rounded-lg px-2 py-1.5 text-center border border-[var(--border-base)]">
                                          <p className="text-primary text-xs font-black tabular-nums">{ph.kcal_cible}</p>
                                          <p className="text-[var(--text-muted)] text-[8px] uppercase">kcal</p>
                                        </div>
                                      )}
                                      {ph.proteines_cible_g && (
                                        <div className="bg-[var(--bg-surface)] rounded-lg px-2 py-1.5 text-center border border-[var(--border-base)]">
                                          <p className="text-[var(--text-primary)] text-xs font-black tabular-nums">{ph.proteines_cible_g}g</p>
                                          <p className="text-[var(--text-muted)] text-[8px] uppercase">Prot.</p>
                                        </div>
                                      )}
                                      {ph.glucides_cible_g && (
                                        <div className="bg-[var(--bg-surface)] rounded-lg px-2 py-1.5 text-center border border-[var(--border-base)]">
                                          <p className="text-[var(--text-primary)] text-xs font-black tabular-nums">{ph.glucides_cible_g}g</p>
                                          <p className="text-[var(--text-muted)] text-[8px] uppercase">Gluc.</p>
                                        </div>
                                      )}
                                      {ph.lipides_cible_g && (
                                        <div className="bg-[var(--bg-surface)] rounded-lg px-2 py-1.5 text-center border border-[var(--border-base)]">
                                          <p className="text-[var(--text-primary)] text-xs font-black tabular-nums">{ph.lipides_cible_g}g</p>
                                          <p className="text-[var(--text-muted)] text-[8px] uppercase">Lip.</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Jours types + repas */}
                                {phaseJourTypes.length > 0 ? (
                                  <div className="space-y-2">
                                    <p className="text-[var(--text-muted)] text-[9px] uppercase tracking-widest font-bold">Jours types</p>
                                    {phaseJourTypes.map(jt => (
                                      <div key={jt.id} className="bg-[var(--bg-surface)] rounded-lg p-2.5 border border-[var(--border-base)]">
                                        <p className="text-[var(--text-primary)] text-xs font-bold mb-2">{jt.nom}</p>
                                        {jt.repas.length > 0 ? (
                                          <div className="space-y-1.5">
                                            {jt.repas.map(r => {
                                              let kcal = 0
                                              ;(r.nutrition_programme_repas_aliments || []).forEach(ra => {
                                                if (ra.aliments) kcal += Math.round((ra.aliments.kcal_100g || 0) * (ra.quantite_g || 0) / 100)
                                              })
                                              return (
                                                <div key={r.id} className="flex items-center gap-2 bg-[var(--bg-base)] rounded-md px-2 py-1.5">
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-[var(--text-primary)] text-[11px] font-semibold truncate">{r.titre || r.type?.replace('_', ' ')}</p>
                                                    {(r.nutrition_programme_repas_aliments || []).length > 0 && (
                                                      <p className="text-[var(--text-muted)] text-[9px] truncate">
                                                        {(r.nutrition_programme_repas_aliments || []).map(ra => ra.aliments?.nom).filter(Boolean).join(' · ')}
                                                      </p>
                                                    )}
                                                  </div>
                                                  {kcal > 0 && (
                                                    <span className="text-primary text-[10px] font-bold tabular-nums shrink-0">{kcal} kcal</span>
                                                  )}
                                                </div>
                                              )
                                            })}
                                          </div>
                                        ) : (
                                          <p className="text-[var(--text-muted)] text-[10px] italic">Aucun repas défini</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[var(--text-muted)] text-[10px] italic">Ton coach n'a pas encore défini les jours types de cette phase</p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {loadingNutrition ? (
            <div className="space-y-4">
              <div className="skel-block h-6 w-36" />
              <div className="skel-block h-40 w-full rounded-2xl" />
              <div className="skel-block h-28 w-full rounded-2xl" />
            </div>
          ) : !nutritionPlan && !nutriProAssigne ? (
            /* ── Empty state ── */
            <div className="glass-card p-12 text-center">
              <div className="relative inline-flex items-center justify-center mb-5">
                <div className="absolute w-20 h-20 rounded-full bg-primary-light/5 animate-breathe" />
                <div className="relative w-14 h-14 rounded-2xl bg-primary-light/10 flex items-center justify-center">
                  <UtensilsCrossed size={24} className="text-primary-light" />
                </div>
              </div>
              <h2 className="text-[var(--text-primary)] font-semibold text-lg mb-2">Aucun plan nutritionnel</h2>
              <p className="text-[var(--text-muted)] text-sm max-w-[260px] mx-auto">Ton coach n'a pas encore assigne de plan nutrition.</p>
            </div>
          ) : !nutritionPlan ? null : (
            <>
              {/* Nutrition Header */}
              <div>
                <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-medium mb-1">Plan nutritionnel</p>
                <h2 className="text-[var(--text-primary)] text-lg font-bold">{nutritionPlan.titre || nutritionPlan.nom || 'Mon plan nutrition'}</h2>
                {nutritionPlan.objectif && <p className="text-[var(--text-muted)] text-sm mt-1 leading-relaxed">{nutritionPlan.objectif}</p>}
              </div>

              {/* PDF card */}
              {nutritionPlan.document_url && (
                <a href={nutritionPlan.document_url} target="_blank" rel="noopener noreferrer"
                  className="glass-card flex items-center gap-4 p-4 hover:border-primary-light/30 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-primary-light/10 flex items-center justify-center shrink-0 group-hover:bg-primary-light/20 transition-all">
                    <FileText size={22} className="text-primary-light" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-sm font-semibold truncate">
                      {nutritionPlan.document_nom || 'Plan nutritionnel PDF'}
                    </p>
                    <p className="text-[var(--text-muted)] text-xs mt-0.5">Fichier joint par ton coach</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-primary-light/10 flex items-center justify-center shrink-0 group-hover:bg-primary-light transition-all">
                    <Download size={16} className="text-primary-light group-hover:text-white transition-all" />
                  </div>
                </a>
              )}

              {/* Macros card */}
              {(nutritionPlan.calories_cible || nutritionPlan.proteines_cible) && (
                <div className="glass-card overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-primary to-primary-light" />
                  <div className="p-5">
                    <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-medium mb-4">Objectifs journaliers</p>
                    <div className="grid grid-cols-4 gap-2">
                      {nutritionPlan.calories_cible && (
                        <div className="bg-[var(--bg-base)] rounded-xl p-3 text-center border border-[var(--border-subtle)]">
                          <Flame size={14} className="text-primary mx-auto mb-1.5" />
                          <p className="text-[var(--text-primary)] text-base font-bold">{nutritionPlan.calories_cible}</p>
                          <p className="text-[var(--text-muted)] text-[9px] uppercase">kcal</p>
                        </div>
                      )}
                      {nutritionPlan.proteines_cible && (
                        <div className="bg-[var(--bg-base)] rounded-xl p-3 text-center border border-[var(--border-subtle)]">
                          <Droplets size={14} className="text-primary mx-auto mb-1.5" />
                          <p className="text-primary text-base font-bold">{nutritionPlan.proteines_cible}g</p>
                          <p className="text-[var(--text-muted)] text-[9px] uppercase">Prot.</p>
                        </div>
                      )}
                      {nutritionPlan.glucides_cible && (
                        <div className="bg-[var(--bg-base)] rounded-xl p-3 text-center border border-[var(--border-subtle)]">
                          <Wheat size={14} className="text-primary-light mx-auto mb-1.5" />
                          <p className="text-primary-light text-base font-bold">{nutritionPlan.glucides_cible}g</p>
                          <p className="text-[var(--text-muted)] text-[9px] uppercase">Gluc.</p>
                        </div>
                      )}
                      {nutritionPlan.lipides_cible && (
                        <div className="bg-[var(--bg-base)] rounded-xl p-3 text-center border border-[var(--border-subtle)]">
                          <Droplets size={14} className="text-[var(--text-muted)] mx-auto mb-1.5" />
                          <p className="text-[var(--text-muted)] text-base font-bold">{nutritionPlan.lipides_cible}g</p>
                          <p className="text-[var(--text-muted)] text-[9px] uppercase">Lip.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Repas par jour */}
              {Object.keys(repasParJour).length > 0 && (
                <div className="space-y-5">
                  {Object.entries(repasParJour).sort(([a], [b]) => Number(a) - Number(b)).map(([jour, jourRepas]) => (
                    <div key={jour}>
                      <p className="text-[var(--text-secondary)] text-[11px] uppercase tracking-wider font-semibold mb-2.5">
                        {Number(jour) + 1 > 1 ? `Jour ${Number(jour) + 1}` : 'Repas du jour'}
                      </p>
                      <div className="space-y-2.5">
                        {jourRepas.map((r) => {
                          const titre = r.metadata?.titre || REPAS_LABELS[r.type] || r.type
                          const mealConfig = REPAS_ICON_MAP[r.type] || { icon: Utensils, color: 'text-[var(--text-muted)]', bg: 'bg-[var(--bg-surface)]' }
                          const MealIcon = mealConfig.icon
                          const aliments = r.repas_aliments || []
                          const totalKcal = Math.round(aliments.reduce((sum, a) => {
                            const kcal100 = a.aliments?.kcal_100g || 0
                            const qty = a.quantite_g || 100
                            return sum + (kcal100 * qty / 100)
                          }, 0))
                          const macros = r.metadata?.macros

                          return (
                            <div key={r.id} className="glass-card overflow-hidden">
                              <div className="px-4 py-3.5 flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl ${mealConfig.bg} flex items-center justify-center flex-shrink-0`}>
                                  <MealIcon size={16} className={mealConfig.color} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[var(--text-primary)] text-sm font-semibold">{titre}</p>
                                  {r.metadata?.description && (
                                    <p className="text-[var(--text-muted)] text-[10px] mt-0.5 truncate">{r.metadata.description}</p>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  {totalKcal > 0 && (
                                    <span className="text-primary text-xs font-bold">{totalKcal} kcal</span>
                                  )}
                                  {macros && (
                                    <p className="text-[var(--text-muted)] text-[9px] mt-0.5">
                                      P{macros.p} G{macros.g} L{macros.l}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {aliments.length > 0 && (
                                <div className="px-4 pb-3.5 space-y-2 border-t border-[var(--border-subtle)] pt-3">
                                  {aliments.map((a, ai) => {
                                    const kcal = Math.round((a.aliments?.kcal_100g || 0) * (a.quantite_g || 100) / 100)
                                    return (
                                      <div key={ai} className="flex items-center justify-between text-xs">
                                        <span className="text-[var(--text-secondary)] font-medium">{a.aliments?.nom || 'Aliment'}</span>
                                        <span className="text-[var(--text-muted)] tabular-nums">{a.quantite_g}g {kcal > 0 && `· ${kcal} kcal`}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No meals & no PDF */}
              {Object.keys(repasParJour).length === 0 && !nutritionPlan.document_url && (
                <div className="glass-card p-6 text-center">
                  <p className="text-[var(--text-muted)] text-sm">Pas de detail de repas pour ce plan.</p>
                  {nutritionPlan.notes && (
                    <div className="mt-3 bg-[var(--bg-base)] rounded-xl p-4 border border-[var(--border-subtle)]">
                      <p className="text-[var(--text-secondary)] text-xs whitespace-pre-wrap text-left leading-relaxed">{nutritionPlan.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Coach notes */}
              {nutritionPlan.notes && Object.keys(repasParJour).length > 0 && (
                <div className="glass-card overflow-hidden">
                  <div className="h-0.5 bg-gradient-to-r from-primary-light/50 to-transparent" />
                  <div className="p-5">
                    <SectionLabel icon={BookOpen} iconColor="text-primary-light">Notes du coach</SectionLabel>
                    <p className="text-[var(--text-secondary)] text-sm whitespace-pre-wrap leading-relaxed">{nutritionPlan.notes}</p>
                  </div>
                </div>
              )}

              {/* Week tracker */}
              {nutriTotalWeeks > 0 && (
                <WeekTracker
                  totalWeeks={nutriTotalWeeks}
                  completedWeeks={completedNutriWeeks}
                  isWeekCompleted={isNutriWeekCompleted}
                  validateWeek={validateNutriWeek}
                  validatingWeek={validatingNutriWeek}
                  progress={nutriWeekProgress}
                  accentColor="var(--color-primary-light)"
                  label="Suivi hebdomadaire"
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
