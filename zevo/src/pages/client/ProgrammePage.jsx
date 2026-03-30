import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { supabase } from '../../lib/supabase'
import { Card, CardBody } from '../../components/ui/Card'
import {
  Layers, ChevronRight, ChevronDown, Dumbbell, Apple,
  Loader2, CheckCircle2, Image as ImageIcon,
  BookOpen, FileText, Video, Link as LinkIcon, ExternalLink, Download,
  UtensilsCrossed, Flame, Droplets, Wheat, Trophy,
  Calendar, Check, Lock
} from 'lucide-react'

const RESSOURCE_ICONS = {
  pdf: { icon: FileText, color: 'text-red-400', bg: 'bg-red-500/10', action: Download },
  video: { icon: Video, color: 'text-purple-400', bg: 'bg-purple-500/10', action: ExternalLink },
  lien: { icon: LinkIcon, color: 'text-blue-400', bg: 'bg-blue-500/10', action: ExternalLink },
  image: { icon: ImageIcon, color: 'text-green-400', bg: 'bg-green-500/10', action: Download },
  guide: { icon: BookOpen, color: 'text-yellow-400', bg: 'bg-yellow-500/10', action: ExternalLink },
}

const REPAS_LABELS = {
  petit_dej: 'Petit-déjeuner',
  dejeuner: 'Déjeuner',
  collation: 'Collation',
  diner: 'Dîner',
}
const REPAS_ICONS = {
  petit_dej: '🌅',
  dejeuner: '☀️',
  collation: '🍎',
  diner: '🌙',
}

export default function ProgrammePage() {
  const { user } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('sport')

  // Sport
  const [assignation, setAssignation] = useState(null)
  const [phases, setPhases] = useState([])
  const [expandedPhase, setExpandedPhase] = useState(null)

  // Nutrition
  const [nutritionPlan, setNutritionPlan] = useState(null)
  const [repas, setRepas] = useState([])
  const [loadingNutrition, setLoadingNutrition] = useState(false)

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

    // 1. Récupère l'assignation avec le programme nested
    const { data: assign } = await supabase
      .from('programme_assignations')
      .select('*, programmes(*)')
      .eq('client_id', user.id)
      .eq('statut', 'en_cours')
      .limit(1)
      .maybeSingle()

    if (assign) {

      // Fallback : si le nested select ne ramène pas document_url (RLS),
      // tente un fetch direct
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

      // 2. Phases
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

    // Plan nutrition actif assigné au client
    const { data: plan } = await supabase
      .from('client_nutrition_plans')
      .select('*')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (plan) {
      setNutritionPlan(plan)

      // Charger les repas et suivi semaines en parallèle
      const [repasRes, suiviRes] = await Promise.all([
        supabase
          .from('plan_repas')
          .select('*, repas_aliments(*, aliments(nom, kcal_100g, proteines, glucides, lipides))')
          .eq('plan_id', plan.id)
          .order('ordre'),
        supabase
          .from('suivi_programmes')
          .select('numero_semaine, completed_at')
          .eq('client_id', user.id)
          .eq('programme_id', plan.id)
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
          toast.error('Cette semaine est déjà validée !')
        } else {
          throw error
        }
      } else {
        setCompletedWeeks(prev => [...prev, { numero_semaine: weekNum, completed_at: new Date().toISOString() }])
        toast.success('Super ! Semaine validée, ton coach est prévenu.')
        // Notification au coach
        if (coachId) {
          await supabase.from('notifications').insert({
            coach_id: coachId,
            client_id: user.id,
            titre: 'Semaine validée ! 🎉',
            message: `Ton client a validé la semaine ${weekNum} de son programme sport.`,
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
      const { error } = await supabase.from('suivi_programmes').insert({
        client_id: user.id,
        programme_id: nutritionPlan.id,
        numero_semaine: weekNum,
      })
      if (error) {
        if (error.code === '23505') {
          toast.error('Cette semaine est déjà validée !')
        } else {
          throw error
        }
      } else {
        setCompletedNutriWeeks(prev => [...prev, { numero_semaine: weekNum, completed_at: new Date().toISOString() }])
        toast.success('Super ! Semaine nutritionnelle validée.')
        // Notification au coach
        if (coachId) {
          await supabase.from('notifications').insert({
            coach_id: coachId,
            client_id: user.id,
            titre: 'Semaine validée ! 🎉',
            message: `Ton client a validé la semaine ${weekNum} de son plan nutrition.`,
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
      // Récupère le coach_id pour les notifications
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

  // Load week progress once assignation is set
  useEffect(() => {
    if (assignation?.programme_id) loadWeekProgress(assignation.programme_id)
  }, [assignation?.programme_id, loadWeekProgress])

  // ── Loading ──
  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#FF6B2B]" size={32} />
      </div>
    )
  }

  const prog = assignation?.programmes
  const progressPercent = phases.length > 0 && assignation
    ? Math.round((assignation.phase_actuelle / phases.length) * 100)
    : 0

  // Mode Document : dès qu'un document_url existe, on affiche la carte PDF
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

  // Grouper les repas par jour (le jour est stocké dans metadata.day)
  const repasParJour = repas.reduce((acc, r) => {
    const jour = r.metadata?.day ?? 0
    if (!acc[jour]) acc[jour] = []
    acc[jour].push(r)
    return acc
  }, {})

  return (
    <div className="p-4 max-w-2xl space-y-5">

      {/* ── Header + Tabs ── */}
      <div className="pt-2">
        <h1 className="text-[#F5F5F3] text-xl font-bold flex items-center gap-2">
          <Layers size={20} className="text-[#FF6B2B]" />
          Programme
        </h1>
        <p className="text-white/40 text-sm mt-0.5">Ton plan personnalisé par ton coach</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#1E1E1E] border border-white/[0.06] rounded-xl p-1 gap-1">
        <button
          onClick={() => setTab('sport')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tab === 'sport'
              ? 'bg-[#FF6B2B] text-white shadow-lg shadow-[#FF6B2B]/20'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          <Dumbbell size={15} />
          Sport
        </button>
        <button
          onClick={() => setTab('nutrition')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tab === 'nutrition'
              ? 'bg-[#22c55e] text-white shadow-lg shadow-[#22c55e]/20'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          <UtensilsCrossed size={15} />
          Nutrition
        </button>
      </div>

      {/* ══════════ ONGLET SPORT ══════════ */}
      {tab === 'sport' && (
        <>
          {/* DEBUG : log prog dans la console */}

          {!assignation ? (
            <div className="bg-[#1E1E1E] rounded-2xl border border-white/[0.06] p-12 text-center">
              <div className="w-14 h-14 bg-[#FF6B2B]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Dumbbell size={24} className="text-[#FF6B2B]" />
              </div>
              <h2 className="text-[#F5F5F3] font-semibold text-lg mb-2">Aucun programme sportif</h2>
              <p className="text-white/40 text-sm">Ton coach n'a pas encore assigné de programme sportif.</p>
            </div>
          ) : isDocumentMode ? (
            /* ═══════════════════════════════════════════ */
            /* MODE DOCUMENT — PDF global                  */
            /* ═══════════════════════════════════════════ */
            <>
              {/* Programme Header */}
              <div>
                <p className="text-white/40 text-[11px] uppercase tracking-wider mb-1">Programme actif</p>
                <h2 className="text-[#F5F5F3] text-lg font-bold">{prog?.titre}</h2>
                {prog?.description && <p className="text-white/40 text-sm mt-1">{prog.description}</p>}
              </div>

              {/* Grande carte PDF premium */}
              <div className="bg-[#1E1E1E] rounded-2xl p-8 text-center shadow-xl border border-[#27272a] my-2">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-[#FF6B2B]/10 rounded-full">
                    <svg className="w-12 h-12 text-[#FF6B2B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Ton programme PDF</h2>
                <p className="text-white/40 mb-6 text-sm">Consulte ton plan d'entraînement complet joint par ton coach.</p>
                <a
                  href={prog.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#FF6B2B] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#FF6B2B]/90 transition-all shadow-lg shadow-[#FF6B2B]/20"
                >
                  Ouvrir le document
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              {/* ── Suivi de progression — Semaines ── */}
              <div className="bg-[#1E1E1E] rounded-2xl border border-white/[0.06] overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-white/[0.04]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={15} className="text-[#FF6B2B]" />
                      <h3 className="text-[#F5F5F3] font-semibold text-sm">Suivi de progression</h3>
                    </div>
                    <span className="text-[#FF6B2B] text-xs font-bold">{weekProgress}%</span>
                  </div>
                  {/* Progress bar global */}
                  <div className="h-2 bg-[#27272a] rounded-full overflow-hidden">
                    <div className="h-full bg-[#FF6B2B] rounded-full transition-all duration-500"
                      style={{ width: `${weekProgress}%` }} />
                  </div>
                  <p className="text-white/25 text-[10px] mt-2">
                    {completedCount} / {totalWeeks} semaine{totalWeeks > 1 ? 's' : ''} validée{completedCount > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Weeks list */}
                <div className="divide-y divide-white/[0.04]">
                  {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(weekNum => {
                    const done = isWeekCompleted(weekNum)
                    const isValidating = validatingWeek === weekNum
                    // Semaine déverrouillée si : semaine 1, ou semaine précédente complétée
                    const unlocked = weekNum === 1 || isWeekCompleted(weekNum - 1)

                    return (
                      <div key={weekNum} className={`flex items-center gap-3 px-5 py-3.5 transition-all ${
                        done ? 'bg-emerald-500/[0.03]' : ''
                      }`}>
                        {/* Status icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          done
                            ? 'bg-emerald-500/15'
                            : unlocked
                              ? 'bg-[#FF6B2B]/10'
                              : 'bg-[#27272a]'
                        }`}>
                          {done ? (
                            <CheckCircle2 size={16} className="text-emerald-400" />
                          ) : unlocked ? (
                            <span className="text-[#FF6B2B] text-xs font-bold">{weekNum}</span>
                          ) : (
                            <Lock size={13} className="text-white/15" />
                          )}
                        </div>

                        {/* Week label */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${done ? 'text-emerald-400' : unlocked ? 'text-[#F5F5F3]' : 'text-white/25'}`}>
                            Semaine {weekNum}
                          </p>
                          {done && (
                            <p className="text-white/20 text-[10px]">
                              Validée le {new Date(completedWeeks.find(cw => cw.numero_semaine === weekNum)?.completed_at).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>

                        {/* Action button */}
                        {done ? (
                          <span className="text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">Terminée</span>
                        ) : unlocked ? (
                          <button onClick={() => validateWeek(weekNum)}
                            disabled={isValidating}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B2B]/10 text-[#FF6B2B] text-xs font-semibold hover:bg-[#FF6B2B]/20 transition-all disabled:opacity-50">
                            {isValidating ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Check size={12} />
                            )}
                            {isValidating ? 'Validation...' : 'Valider'}
                          </button>
                        ) : (
                          <span className="text-white/10 text-[10px]">Verrouillée</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            /* ═══════════════════════════════════════════ */
            /* MODE CLASSIQUE — Phases + Exercices         */
            /* ═══════════════════════════════════════════ */
            <>
              {/* Programme Header */}
              <div>
                <p className="text-white/40 text-[11px] uppercase tracking-wider mb-1">Programme actif</p>
                <h2 className="text-[#F5F5F3] text-lg font-bold">{prog?.titre}</h2>
                {prog?.description && <p className="text-white/40 text-sm mt-1">{prog.description}</p>}
              </div>

              {/* Progress Card */}
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/40 text-[11px] uppercase tracking-wider">Progression</p>
                    <span className="text-[#FF6B2B] text-sm font-bold">{progressPercent}%</span>
                  </div>
                  <div className="flex gap-1 mb-3">
                    {phases.map((ph, i) => (
                      <div key={ph.id}
                        className="h-2.5 rounded-full flex-1 transition-all"
                        style={{
                          backgroundColor: i < assignation.phase_actuelle ? '#FF6B2B' : 'rgba(255,255,255,0.06)',
                        }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span>Phase {assignation.phase_actuelle}/{phases.length}</span>
                    {prog?.categorie && (
                      <span className="px-2 py-0.5 rounded-md bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px]">
                        {prog.categorie}
                      </span>
                    )}
                    <span>{prog?.duree_semaines} semaines</span>
                  </div>
                </CardBody>
              </Card>

              {/* Global document attached to programme */}
              {prog?.document_url && (
                <a href={prog.document_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-[#1E1E1E] rounded-2xl border border-[#FF6B2B]/20 hover:border-[#FF6B2B]/40 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center shrink-0 group-hover:bg-[#FF6B2B]/20 transition-all">
                    <FileText size={22} className="text-[#FF6B2B]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#F5F5F3] text-sm font-semibold truncate">
                      {prog.document_nom || 'Programme PDF'}
                    </p>
                    <p className="text-white/30 text-xs mt-0.5">Fichier joint par ton coach • Appuie pour ouvrir</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center shrink-0 group-hover:bg-[#FF6B2B] group-hover:text-white transition-all">
                    <Download size={16} className="text-[#FF6B2B] group-hover:text-white transition-all" />
                  </div>
                </a>
              )}

              {/* Phases */}
              <div className="space-y-3">
                <h2 className="text-[#F5F5F3] font-semibold text-base">Phases du programme</h2>
                {phases.map((phase, index) => {
                  const isCurrent = phase.ordre === assignation.phase_actuelle
                  const isDone = phase.ordre < assignation.phase_actuelle
                  const isExpanded = expandedPhase === phase.id

                  return (
                    <div key={phase.id}
                      className={`bg-[#1E1E1E] rounded-2xl border overflow-hidden transition-all ${
                        isCurrent ? 'border-[#FF6B2B]/30 shadow-lg shadow-[#FF6B2B]/10' : 'border-white/[0.06]'
                      }`}>
                      <button onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-white/[0.02] transition-colors">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isDone ? 'bg-green-500/20' : isCurrent ? 'bg-[#FF6B2B]/20' : 'bg-[#2A2A2A]'
                        }`}>
                          {isDone ? (
                            <CheckCircle2 size={16} className="text-green-400" />
                          ) : (
                            <span className={`text-xs font-bold ${isCurrent ? 'text-[#FF6B2B]' : 'text-white/30'}`}>
                              {index + 1}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium truncate ${isCurrent ? 'text-[#F5F5F3]' : 'text-white/50'}`}>
                              {phase.titre}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] bg-[#FF6B2B] text-white px-2 py-0.5 rounded-full font-bold uppercase">
                                En cours
                              </span>
                            )}
                          </div>
                          <span className="text-white/25 text-xs">{phase.duree_semaines} semaine{phase.duree_semaines > 1 ? 's' : ''}</span>
                        </div>
                        {isExpanded ? <ChevronDown size={16} className="text-white/30" /> : <ChevronRight size={16} className="text-white/30" />}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-4 border-t border-white/[0.04] pt-4">
                          {phase.description && <p className="text-white/40 text-sm">{phase.description}</p>}

                          {/* Exercices */}
                          {(phase.exercices?.length || 0) > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <Dumbbell size={14} className="text-[#FF6B2B]" />
                                <p className="text-white/50 text-[11px] uppercase tracking-wider font-semibold">
                                  Exercices ({phase.exercices.length})
                                </p>
                              </div>
                              <div className="space-y-2">
                                {phase.exercices.map((ex, ei) => (
                                  <div key={ei} className="flex items-center gap-3 bg-[#0D0D0D] rounded-xl p-3">
                                    {ex.image_url ? (
                                      <img src={ex.image_url} alt={ex.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                                    ) : (
                                      <div className="w-14 h-14 rounded-lg bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                                        <ImageIcon size={18} className="text-white/20" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[#F5F5F3] text-sm font-medium">{ex.name}</p>
                                      <p className="text-white/30 text-xs">{ex.muscle_group}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <p className="text-[#FF6B2B] text-sm font-bold">{ex.sets}×{ex.reps}</p>
                                      {ex.rest_seconds && <p className="text-white/25 text-[10px]">{ex.rest_seconds}s repos</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Nutrition dans la phase */}
                          {(phase.calories_objectif || phase.proteines_g || phase.consignes_nutrition) && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <Apple size={14} className="text-green-400" />
                                <p className="text-white/50 text-[11px] uppercase tracking-wider font-semibold">Nutrition</p>
                              </div>
                              {(phase.calories_objectif || phase.proteines_g) && (
                                <div className="grid grid-cols-4 gap-2 mb-3">
                                  {phase.calories_objectif && (
                                    <div className="bg-[#0D0D0D] rounded-xl p-3 text-center">
                                      <p className="text-[#F5F5F3] text-lg font-bold">{phase.calories_objectif}</p>
                                      <p className="text-white/30 text-[10px] uppercase">kcal</p>
                                    </div>
                                  )}
                                  {phase.proteines_g && (
                                    <div className="bg-[#0D0D0D] rounded-xl p-3 text-center">
                                      <p className="text-blue-400 text-lg font-bold">{phase.proteines_g}g</p>
                                      <p className="text-white/30 text-[10px] uppercase">Protéines</p>
                                    </div>
                                  )}
                                  {phase.glucides_g && (
                                    <div className="bg-[#0D0D0D] rounded-xl p-3 text-center">
                                      <p className="text-yellow-400 text-lg font-bold">{phase.glucides_g}g</p>
                                      <p className="text-white/30 text-[10px] uppercase">Glucides</p>
                                    </div>
                                  )}
                                  {phase.lipides_g && (
                                    <div className="bg-[#0D0D0D] rounded-xl p-3 text-center">
                                      <p className="text-purple-400 text-lg font-bold">{phase.lipides_g}g</p>
                                      <p className="text-white/30 text-[10px] uppercase">Lipides</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {phase.consignes_nutrition && (
                                <div className="bg-[#0D0D0D] rounded-xl p-3">
                                  <p className="text-white/50 text-xs whitespace-pre-wrap">{phase.consignes_nutrition}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Habitudes */}
                          {(phase.habitudes?.length || 0) > 0 && (
                            <div>
                              <p className="text-white/50 text-[11px] uppercase tracking-wider font-semibold mb-2">Habitudes</p>
                              <div className="flex flex-wrap gap-2">
                                {phase.habitudes.map((h, hi) => (
                                  <span key={hi} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D0D0D] border border-white/[0.06] text-xs text-[#F5F5F3]">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: h.couleur || '#FF6B2B' }} />
                                    {h.nom}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Objectifs */}
                          {(phase.objectifs?.length || 0) > 0 && (
                            <div>
                              <p className="text-white/50 text-[11px] uppercase tracking-wider font-semibold mb-2">Objectifs</p>
                              <div className="flex flex-wrap gap-2">
                                {phase.objectifs.map((o, oi) => (
                                  <span key={oi} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D0D0D] border border-white/[0.06] text-xs text-[#F5F5F3]">
                                    🎯 {o.titre}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Ressources */}
                          {(phase.ressources_attachees?.length || 0) > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <BookOpen size={14} className="text-blue-400" />
                                <p className="text-white/50 text-[11px] uppercase tracking-wider font-semibold">
                                  Ressources ({phase.ressources_attachees.length})
                                </p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {phase.ressources_attachees.map((res, ri) => {
                                  const typeInfo = RESSOURCE_ICONS[res.type] || RESSOURCE_ICONS.lien
                                  const Icon = typeInfo.icon
                                  const ActionIcon = typeInfo.action
                                  return (
                                    <a key={ri} href={res.url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-3 bg-[#0D0D0D] rounded-xl p-3 border border-white/[0.04] hover:border-white/[0.12] transition-all group">
                                      <div className={`w-10 h-10 rounded-lg ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                                        <Icon size={16} className={typeInfo.color} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[#F5F5F3] text-sm font-medium truncate group-hover:text-blue-400 transition-colors">{res.titre}</p>
                                        <p className="text-white/25 text-[10px] capitalize mt-0.5">{res.type}{res.categorie ? ` · ${res.categorie}` : ''}</p>
                                      </div>
                                      <ActionIcon size={14} className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
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

              {/* ── Suivi semaines (mode classique aussi) ── */}
              {totalWeeks > 0 && (
                <div className="bg-[#1E1E1E] rounded-2xl border border-white/[0.06] overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/[0.04]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={15} className="text-[#FF6B2B]" />
                        <h3 className="text-[#F5F5F3] font-semibold text-sm">Suivi hebdomadaire</h3>
                      </div>
                      <span className="text-[#FF6B2B] text-xs font-bold">{completedCount}/{totalWeeks}</span>
                    </div>
                    <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF6B2B] rounded-full transition-all duration-500"
                        style={{ width: `${weekProgress}%` }} />
                    </div>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(weekNum => {
                      const done = isWeekCompleted(weekNum)
                      const isValidating = validatingWeek === weekNum
                      const unlocked = weekNum === 1 || isWeekCompleted(weekNum - 1)
                      return (
                        <div key={weekNum} className={`flex items-center gap-3 px-5 py-3 ${done ? 'bg-emerald-500/[0.03]' : ''}`}>
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            done ? 'bg-emerald-500/15' : unlocked ? 'bg-[#FF6B2B]/10' : 'bg-[#27272a]'
                          }`}>
                            {done ? <CheckCircle2 size={14} className="text-emerald-400" /> :
                             unlocked ? <span className="text-[#FF6B2B] text-[10px] font-bold">{weekNum}</span> :
                             <Lock size={11} className="text-white/15" />}
                          </div>
                          <span className={`flex-1 text-xs font-medium ${done ? 'text-emerald-400' : unlocked ? 'text-[#F5F5F3]' : 'text-white/25'}`}>
                            Sem. {weekNum}
                          </span>
                          {done ? (
                            <span className="text-emerald-400/60 text-[9px]">OK</span>
                          ) : unlocked ? (
                            <button onClick={() => validateWeek(weekNum)} disabled={isValidating}
                              className="px-3 py-1.5 rounded-lg bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-semibold hover:bg-[#FF6B2B]/20 transition-all disabled:opacity-50">
                              {isValidating ? '...' : 'Valider'}
                            </button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ══════════ ONGLET NUTRITION ══════════ */}
      {tab === 'nutrition' && (
        <>
          {loadingNutrition ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-[#22c55e]" size={28} />
            </div>
          ) : !nutritionPlan ? (
            <div className="bg-[#1E1E1E] rounded-2xl border border-white/[0.06] p-12 text-center">
              <div className="w-14 h-14 bg-[#22c55e]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UtensilsCrossed size={24} className="text-[#22c55e]" />
              </div>
              <h2 className="text-[#F5F5F3] font-semibold text-lg mb-2">Aucun plan nutritionnel</h2>
              <p className="text-white/40 text-sm">Ton coach n'a pas encore assigné de plan nutrition.</p>
            </div>
          ) : (
            <>
              {/* Nutrition Header */}
              <div>
                <p className="text-white/40 text-[11px] uppercase tracking-wider mb-1">Plan nutritionnel</p>
                <h2 className="text-[#F5F5F3] text-lg font-bold">{nutritionPlan.titre || nutritionPlan.nom || 'Mon plan nutrition'}</h2>
                {nutritionPlan.objectif && <p className="text-white/40 text-sm mt-1">{nutritionPlan.objectif}</p>}
              </div>

              {/* Carte PDF compacte (si document_url existe) */}
              {nutritionPlan.document_url && (
                <a href={nutritionPlan.document_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-[#1E1E1E] rounded-2xl border border-[#FF6B2B]/20 hover:border-[#FF6B2B]/40 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center shrink-0 group-hover:bg-[#FF6B2B]/20 transition-all">
                    <svg className="w-6 h-6 text-[#FF6B2B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#F5F5F3] text-sm font-semibold truncate">
                      {nutritionPlan.document_nom || 'Plan nutritionnel PDF'}
                    </p>
                    <p className="text-white/30 text-xs mt-0.5">Fichier joint par ton coach • Appuie pour ouvrir</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center shrink-0 group-hover:bg-[#FF6B2B] transition-all">
                    <Download size={16} className="text-[#FF6B2B] group-hover:text-white transition-all" />
                  </div>
                </a>
              )}

              {/* Macros globaux si disponibles */}
              {(nutritionPlan.calories_cible || nutritionPlan.proteines_cible) && (
                <Card>
                  <CardBody>
                    <p className="text-white/40 text-[11px] uppercase tracking-wider mb-3">Objectifs journaliers</p>
                    <div className="grid grid-cols-4 gap-2">
                      {nutritionPlan.calories_cible && (
                        <div className="bg-[#0D0D0D] rounded-xl p-3 text-center">
                          <Flame size={14} className="text-[#FF6B2B] mx-auto mb-1" />
                          <p className="text-[#F5F5F3] text-base font-bold">{nutritionPlan.calories_cible}</p>
                          <p className="text-white/30 text-[9px] uppercase">kcal</p>
                        </div>
                      )}
                      {nutritionPlan.proteines_cible && (
                        <div className="bg-[#0D0D0D] rounded-xl p-3 text-center">
                          <Droplets size={14} className="text-blue-400 mx-auto mb-1" />
                          <p className="text-blue-400 text-base font-bold">{nutritionPlan.proteines_cible}g</p>
                          <p className="text-white/30 text-[9px] uppercase">Prot.</p>
                        </div>
                      )}
                      {nutritionPlan.glucides_cible && (
                        <div className="bg-[#0D0D0D] rounded-xl p-3 text-center">
                          <Wheat size={14} className="text-yellow-400 mx-auto mb-1" />
                          <p className="text-yellow-400 text-base font-bold">{nutritionPlan.glucides_cible}g</p>
                          <p className="text-white/30 text-[9px] uppercase">Gluc.</p>
                        </div>
                      )}
                      {nutritionPlan.lipides_cible && (
                        <div className="bg-[#0D0D0D] rounded-xl p-3 text-center">
                          <Droplets size={14} className="text-purple-400 mx-auto mb-1" />
                          <p className="text-purple-400 text-base font-bold">{nutritionPlan.lipides_cible}g</p>
                          <p className="text-white/30 text-[9px] uppercase">Lip.</p>
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Repas par jour */}
              {Object.keys(repasParJour).length > 0 && (
                <div className="space-y-4">
                  {Object.entries(repasParJour).sort(([a], [b]) => Number(a) - Number(b)).map(([jour, jourRepas]) => (
                    <div key={jour}>
                      <p className="text-white/50 text-[11px] uppercase tracking-wider font-semibold mb-2">
                        Jour {Number(jour) + 1 > 1 ? `Jour ${Number(jour) + 1}` : 'Repas du jour'}
                      </p>
                      <div className="space-y-2">
                        {jourRepas.map((r) => {
                          const titre = r.metadata?.titre || REPAS_LABELS[r.type] || r.type
                          const emoji = REPAS_ICONS[r.type] || '🍽️'
                          const aliments = r.repas_aliments || []
                          const totalKcal = Math.round(aliments.reduce((sum, a) => {
                            const kcal100 = a.aliments?.kcal_100g || 0
                            const qty = a.quantite_g || 100
                            return sum + (kcal100 * qty / 100)
                          }, 0))
                          const macros = r.metadata?.macros

                          return (
                            <div key={r.id} className="bg-[#1E1E1E] rounded-xl border border-white/[0.06] overflow-hidden">
                              <div className="px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{emoji}</span>
                                  <div>
                                    <p className="text-[#F5F5F3] text-sm font-medium">{titre}</p>
                                    {r.metadata?.description && (
                                      <p className="text-white/30 text-[10px] mt-0.5">{r.metadata.description}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {totalKcal > 0 && (
                                    <span className="text-[#FF6B2B] text-xs font-bold">{totalKcal} kcal</span>
                                  )}
                                  {macros && (
                                    <span className="text-white/20 text-[9px]">
                                      P{macros.p} G{macros.g} L{macros.l}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {aliments.length > 0 && (
                                <div className="px-4 pb-3 space-y-1.5">
                                  {aliments.map((a, ai) => {
                                    const kcal = Math.round((a.aliments?.kcal_100g || 0) * (a.quantite_g || 100) / 100)
                                    return (
                                      <div key={ai} className="flex items-center justify-between text-xs">
                                        <span className="text-white/50">{a.aliments?.nom || 'Aliment'}</span>
                                        <span className="text-white/25">{a.quantite_g}g {kcal > 0 && `• ${kcal} kcal`}</span>
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

              {/* Message si pas de repas ET pas de PDF */}
              {Object.keys(repasParJour).length === 0 && !nutritionPlan.document_url && (
                <div className="bg-[#1E1E1E] rounded-xl border border-white/[0.06] p-6 text-center">
                  <p className="text-white/30 text-sm">Pas de détail de repas pour ce plan.</p>
                  {nutritionPlan.notes && (
                    <div className="mt-3 bg-[#0D0D0D] rounded-xl p-4">
                      <p className="text-white/50 text-xs whitespace-pre-wrap text-left">{nutritionPlan.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes globales du plan */}
              {nutritionPlan.notes && Object.keys(repasParJour).length > 0 && (
                <Card>
                  <CardBody>
                    <p className="text-white/40 text-[11px] uppercase tracking-wider mb-2">Notes du coach</p>
                    <p className="text-white/50 text-sm whitespace-pre-wrap">{nutritionPlan.notes}</p>
                  </CardBody>
                </Card>
              )}

              {/* ── Suivi semaines ── */}
              {nutriTotalWeeks > 0 && (
                <div className="bg-[#1E1E1E] rounded-2xl border border-white/[0.06] overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/[0.04]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={15} className="text-[#FF6B2B]" />
                        <h3 className="text-[#F5F5F3] font-semibold text-sm">Suivi hebdomadaire</h3>
                      </div>
                      <span className="text-[#FF6B2B] text-xs font-bold">{completedNutriCount}/{nutriTotalWeeks}</span>
                    </div>
                    <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF6B2B] rounded-full transition-all duration-500"
                        style={{ width: `${nutriWeekProgress}%` }} />
                    </div>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {Array.from({ length: nutriTotalWeeks }, (_, i) => i + 1).map(weekNum => {
                      const done = isNutriWeekCompleted(weekNum)
                      const isValidating = validatingNutriWeek === weekNum
                      const unlocked = weekNum === 1 || isNutriWeekCompleted(weekNum - 1)
                      return (
                        <div key={weekNum} className={`flex items-center gap-3 px-5 py-3 ${done ? 'bg-emerald-500/[0.03]' : ''}`}>
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            done ? 'bg-emerald-500/15' : unlocked ? 'bg-[#FF6B2B]/10' : 'bg-[#27272a]'
                          }`}>
                            {done ? <CheckCircle2 size={14} className="text-emerald-400" /> :
                             unlocked ? <span className="text-[#FF6B2B] text-[10px] font-bold">{weekNum}</span> :
                             <Lock size={11} className="text-white/15" />}
                          </div>
                          <span className={`flex-1 text-xs font-medium ${done ? 'text-emerald-400' : unlocked ? 'text-[#F5F5F3]' : 'text-white/25'}`}>
                            Sem. {weekNum}
                          </span>
                          {done ? (
                            <span className="text-emerald-400/60 text-[9px]">OK</span>
                          ) : unlocked ? (
                            <button onClick={() => validateNutriWeek(weekNum)} disabled={isValidating}
                              className="px-3 py-1.5 rounded-lg bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-semibold hover:bg-[#FF6B2B]/20 transition-all disabled:opacity-50">
                              {isValidating ? '...' : 'Valider'}
                            </button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
