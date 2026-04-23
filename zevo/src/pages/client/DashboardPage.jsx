import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { calculerScoreBienEtre, couleurScore, labelScore } from '../../utils/wellbeing'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  CheckCircle2, Circle, AlertTriangle, Flame, Layers, Dumbbell,
  ClipboardList, ChevronRight, Moon, Smile, Zap, User, TrendingUp,
  Play, Sparkles, Minus, Plus, Check, UtensilsCrossed, Trophy,
  ArrowUpRight, ArrowDownRight, CalendarDays, MessageCircle,
  Crown, Frown, Meh, SmilePlus, ThumbsUp, ThumbsDown, FileText, Star,
  Sunrise, Sun, Coffee, Heart, Activity
} from 'lucide-react'
import { Confetti, StreakMilestone } from '../../components/ui/Confetti'
import { usePageTransition, useStagger, usePullToRefresh } from '../../hooks/useAnimations'
import AnimatedNumber from '../../components/ui/AnimatedNumber'
import PullToRefreshIndicator from '../../components/ui/PullToRefresh'

// ── Jauge circulaire SVG — version redesign ──
function ScoreGauge({ score, couleur, size = 120 }) {
  const r = (size / 2) - 12
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const center = size / 2
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Ambient glow behind gauge */}
      <div className="absolute inset-0 rounded-full opacity-20 blur-xl" style={{ background: couleur }} />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative">
        {/* Track */}
        <circle cx={center} cy={center} r={r} fill="none" stroke="var(--border-base)" strokeWidth="8" opacity="0.5" />
        {/* Faint glow ring */}
        <circle cx={center} cy={center} r={r + 4} fill="none" stroke={couleur} strokeWidth="1" opacity="0.1" />
        {/* Active arc */}
        <circle
          cx={center} cy={center} r={r}
          fill="none"
          stroke={couleur}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
            filter: `drop-shadow(0 0 6px ${couleur}50)`,
          }}
        />
        <text x={center} y={center - 4} textAnchor="middle" fill="var(--text-primary)" fontSize="28" fontWeight="800" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
          {score}
        </text>
        <text x={center} y={center + 14} textAnchor="middle" fill="var(--text-muted)" fontSize="10" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
          sur 100
        </text>
      </svg>
    </div>
  )
}

// ── Tooltip custom pour le graphique ──
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl px-3.5 py-2.5 text-sm shadow-2xl backdrop-blur-md">
      <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-[var(--text-primary)] font-bold text-base">
        {payload[0].value}<span className="text-[var(--text-muted)] text-xs font-normal">/100</span>
      </p>
    </div>
  )
}

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const MILESTONES = [
  { days: 7, label: '1 sem' },
  { days: 14, label: '2 sem' },
  { days: 30, label: '1 mois' },
  { days: 60, label: '2 mois' },
  { days: 100, label: '100j' },
  { days: 365, label: '1 an' },
]

function getNextMilestone(streak) {
  for (const m of MILESTONES) {
    if (streak < m.days) return m
  }
  return { days: streak + 30, label: `${streak + 30}j` }
}

function getPrevMilestone(streak) {
  let prev = { days: 0, label: '0' }
  for (const m of MILESTONES) {
    if (streak >= m.days) prev = m
    else break
  }
  return prev
}

function getStreakMessage(streak) {
  if (streak >= 100) return 'Inarrêtable.'
  if (streak >= 60) return 'Discipline de fer.'
  if (streak >= 30) return 'Un mois complet !'
  if (streak >= 14) return 'Habitude installée.'
  if (streak >= 7) return 'Première semaine !'
  if (streak >= 3) return 'Beau début !'
  return 'Continue !'
}

// ── Streak Badge — Redesign Premium ──
function StreakBadge({ streak, staggerClass, staggerStyle }) {
  const next = getNextMilestone(streak)
  const prev = getPrevMilestone(streak)
  const progressInSegment = ((streak - prev.days) / (next.days - prev.days)) * 100
  const msg = getStreakMessage(streak)

  const today = new Date()
  const days7 = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dow = d.getDay()
    const labels = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
    days7.push({ label: labels[dow], done: streak > i, isToday: i === 0 })
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-[#FF6B2B]/12 ${staggerClass}`}
      style={{ ...staggerStyle, background: 'linear-gradient(135deg, rgba(255,107,43,0.06) 0%, var(--bg-card) 60%)' }}>
      {/* Ambient corner glow */}
      <div className="absolute -top-10 -left-10 w-28 h-28 rounded-full bg-[#FF6B2B]/8 blur-2xl pointer-events-none animate-breathe" />

      <div className="relative px-4 pt-4 pb-3.5">
        {/* Row 1: Flame + Count + Milestone */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6B2B] to-[#FF9A6C] flex items-center justify-center shadow-lg shadow-[#FF6B2B]/20">
              <Flame size={20} className="text-white animate-streak-pulse" />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#FF9A6C] shadow-lg shadow-[#FF9A6C]/40 animate-streak-glow" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[var(--text-primary)] text-[26px] font-black leading-none tracking-tight">
                  <AnimatedNumber value={streak} duration={600} />
                </span>
                <span className="text-[var(--text-muted)] text-xs font-medium">jours</span>
              </div>
              <p className="text-[#FF6B2B] text-[11px] font-semibold mt-0.5 tracking-tight">{msg}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)]">
            <Trophy size={11} className="text-[#FF6B2B]/70" />
            <span className="text-[var(--text-muted)] text-[10px] font-bold tabular-nums">{next.label}</span>
          </div>
        </div>

        {/* Row 2: 7-day dots */}
        <div className="flex items-center justify-between mb-3 px-0.5">
          {days7.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className={`text-[9px] font-semibold tracking-wide ${d.isToday ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'}`}>
                {d.label}
              </span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${
                d.done
                  ? 'bg-[#FF6B2B] shadow-sm shadow-[#FF6B2B]/20'
                  : d.isToday
                    ? 'bg-[#FF6B2B]/10 ring-1.5 ring-[#FF6B2B]/30'
                    : 'bg-[var(--bg-surface)]'
              }`}>
                {d.done && <Check size={13} className="text-white" strokeWidth={2.5} />}
                {!d.done && d.isToday && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B2B] animate-pulse" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Row 3: Progress bar */}
        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-[5px] rounded-full bg-[var(--bg-surface)] overflow-hidden relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C] transition-all duration-1000 ease-out relative"
              style={{ width: `${Math.min(100, progressInSegment)}%` }}
            >
              {/* Shimmer on progress */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" style={{ animation: 'shimmer-bar 2s ease-in-out infinite' }} />
            </div>
          </div>
          <span className="text-[var(--text-muted)] text-[10px] font-bold flex-shrink-0 tabular-nums">
            {streak}/{next.days}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Section Header helper ──
function SectionLabel({ icon: Icon, label, color = 'var(--color-primary, #FF6B2B)', children }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon size={13} style={{ color }} />
        <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-bold">{label}</p>
      </div>
      {children}
    </div>
  )
}


export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [profil, setProfil] = useState(null)
  const [habitudes, setHabitudes] = useState([])
  const [logAujourdhui, setLogAujourdhui] = useState([])
  const [sommeil, setSommeil] = useState(null)
  const [humeur, setHumeur] = useState(null)
  const [sport, setSport] = useState(null)
  const [weekData, setWeekData] = useState([])
  const [toggling, setToggling] = useState(null)

  const [streak, setStreak] = useState(0)
  const [showAllDoneConfetti, setShowAllDoneConfetti] = useState(false)

  const [seanceDuJour, setSeanceDuJour] = useState(null)
  const [seanceExos, setSeanceExos] = useState([])

  const [formsPending, setFormsPending] = useState([])

  const [programme, setProgramme] = useState(null)
  const [programmePhases, setProgrammePhases] = useState([])
  const [progSeances, setProgSeances] = useState({ total: 0, done: 0 })

  const [nutritionPlan, setNutritionPlan] = useState(null)
  const [nutriRepasCount, setNutriRepasCount] = useState(0)
  const [nutriWeeksDone, setNutriWeeksDone] = useState(0)
  const [nutriRepas, setNutriRepas] = useState([])

  const [seanceDemain, setSeanceDemain] = useState(null)
  const [unreadMessages, setUnreadMessages] = useState(0)

  const [prevWeekAvg, setPrevWeekAvg] = useState(null)

  const [sommeilInput, setSommeilInput] = useState(7)
  const [sommeilSaved, setSommeilSaved] = useState(false)
  const [sommeilSaving, setSommeilSaving] = useState(false)
  const [humeurInput, setHumeurInput] = useState(null)
  const [humeurSaved, setHumeurSaved] = useState(false)
  const [humeurSaving, setHumeurSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  // ── Charge toutes les données du dashboard (2 vagues parallèles) ──
  const chargerDonnees = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      const demain = new Date()
      demain.setDate(demain.getDate() + 1)
      const demainStr = demain.toISOString().split('T')[0]

      const il14jours = new Date()
      il14jours.setDate(il14jours.getDate() - 13)
      const dateMin14 = il14jours.toISOString().split('T')[0]
      const dateMin120 = new Date(Date.now() - 120 * 86400000).toISOString().split('T')[0]

      // ── Vague 1 : TOUTES les requêtes indépendantes en parallèle ─────────
      const [
        profilRes, clientRes, habsRes, logRes, sommeilRes, humeurRes, sportRes,
        seancesAujRes, formsRes,
        compLogRes, compSommeilRes, compHumeurRes, compSportRes,
        streakLogsRes,
        proSportRes, legacyProgrammeRes,
        proNutriRes, legacyNutriRes,
        seanceDemainRes, msgCountRes,
      ] = await Promise.all([
        // Profil & habitudes
        supabase.from('profiles').select('nom, avatar_url').eq('id', user.id).single(),
        supabase.from('clients').select('prenom').eq('id', user.id).maybeSingle(),
        supabase.from('habitudes').select('id, nom, couleur, assigned_by').eq('client_id', user.id).eq('actif', true).order('created_at'),
        supabase.from('habitudes_log').select('habitude_id').eq('client_id', user.id).eq('date', today),
        supabase.from('sommeil_log').select('*').eq('client_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('humeur_log').select('*').eq('client_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('sport_log').select('*').eq('client_id', user.id).eq('date', today).maybeSingle(),
        // Séance du jour
        supabase.from('seances')
          .select('id, titre, date_prevue, notes, is_completed, is_template')
          .eq('client_id', user.id).eq('date_prevue', today).eq('is_template', false)
          .order('is_completed', { ascending: true }).order('created_at', { ascending: true }).limit(1),
        // Formulaires en attente
        supabase.from('formulaire_reponses')
          .select('id, created_at, formulaire_id, formulaires(titre, description, type)')
          .eq('client_id', user.id).eq('complete', false),
        // Données comparatif 14 jours (pour graphe bien-être)
        supabase.from('habitudes_log').select('date').eq('client_id', user.id).gte('date', dateMin14),
        supabase.from('sommeil_log').select('date, qualite').eq('client_id', user.id).gte('date', dateMin14),
        supabase.from('humeur_log').select('date, score').eq('client_id', user.id).gte('date', dateMin14),
        supabase.from('sport_log').select('date, intensite').eq('client_id', user.id).gte('date', dateMin14),
        // Streak 120 jours
        supabase.from('habitudes_log').select('date').eq('client_id', user.id).gte('date', dateMin120).order('date', { ascending: false }),
        // Programmes sport (pro + legacy en parallèle)
        supabase.from('sport_programmes')
          .select('id, nom, duree_semaines, objectif, frequence_hebdo, description')
          .eq('client_id', user.id).eq('is_active', true)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('programme_assignations')
          .select('*, programmes(id, titre, duree_semaines)')
          .eq('client_id', user.id).eq('statut', 'en_cours').limit(1).maybeSingle(),
        // Nutrition (pro + legacy en parallèle)
        supabase.from('nutrition_programmes')
          .select('id, nom, duree_semaines')
          .eq('client_id', user.id).eq('is_active', true)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('client_nutrition_plans')
          .select('id, nom, duree_semaines')
          .eq('client_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        // Séance demain + messages non lus
        supabase.from('seances')
          .select('id, titre, date_prevue').eq('client_id', user.id)
          .eq('date_prevue', demainStr).eq('is_template', false).eq('is_completed', false)
          .limit(1).maybeSingle(),
        supabase.from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('destinataire_id', user.id).eq('lu', false),
      ])

      // ── Traitement vague 1 ────────────────────────────────────────────────
      const habs = habsRes.data ?? []
      setProfil({ ...profilRes.data, prenom: clientRes.data?.prenom ?? null })
      setHabitudes(habs)
      setLogAujourdhui((logRes.data ?? []).map(l => l.habitude_id))

      const sommeilData = sommeilRes.data ?? null
      const humeurData = humeurRes.data ?? null
      setSommeil(sommeilData)
      setHumeur(humeurData)
      setSport(sportRes.data ?? null)
      if (sommeilData) { setSommeilInput(sommeilData.heures || 7); setSommeilSaved(true) }
      if (humeurData) { setHumeurInput(humeurData.score || null); setHumeurSaved(true) }

      const seance = seancesAujRes.data?.[0] ?? null
      setSeanceDuJour(seance)
      setFormsPending(formsRes.data ?? [])
      setSeanceDemain(seanceDemainRes.data ?? null)
      setUnreadMessages(msgCountRes.count ?? 0)

      // Comparatif bien-être (calcul local — pas de requête supplémentaire)
      {
        const compLogs = compLogRes.data ?? []
        const computeScore = (dateStr) => {
          const cochees = compLogs.filter(l => l.date === dateStr).length
          return calculerScoreBienEtre({
            habitudes: { cochees, total: habs.length },
            sommeil: (compSommeilRes.data ?? []).find(s => s.date === dateStr) ?? null,
            humeur: (compHumeurRes.data ?? []).find(h => h.date === dateStr) ?? null,
            sport: (compSportRes.data ?? []).find(s => s.date === dateStr) ?? null,
          })
        }
        const data = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const dateStr = d.toISOString().split('T')[0]
          data.push({ jour: JOURS[d.getDay()], score: computeScore(dateStr) })
        }
        setWeekData(data)

        const prevScores = []
        for (let i = 13; i >= 7; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          prevScores.push(computeScore(d.toISOString().split('T')[0]))
        }
        const prevActive = prevScores.filter(s => s > 0)
        setPrevWeekAvg(prevActive.length > 0 ? Math.round(prevActive.reduce((a, b) => a + b, 0) / prevActive.length) : null)
      }

      // Streak (calcul local)
      if (habs.length > 0) {
        const dates = [...new Set((streakLogsRes.data || []).map(l => l.date))].sort().reverse()
        let s = 0
        for (let i = 0; i < 120; i++) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const ds = d.toISOString().split('T')[0]
          if (dates.includes(ds)) { s++ }
          else if (i === 0) { continue }
          else { break }
        }
        setStreak(s)
      }

      // Choix programme actif (pro prioritaire sur legacy)
      const proSport = proSportRes.data ?? null
      const assignData = !proSport ? (legacyProgrammeRes.data ?? null) : null

      // Choix nutrition active (pro prioritaire sur legacy)
      const proNutri = proNutriRes.data ?? null
      const nutPlan = proNutri
        ? { ...proNutri, __pro: true }
        : (legacyNutriRes.data ?? null)

      // ── Vague 2 : requêtes dépendantes, toutes en parallèle ──────────────
      const [
        exosRes,
        sportProgTotalRes, sportProgDoneRes,
        phasesRes, progSeancesRes,
        repasCountRes, suiviRes, repasDetailRes,
      ] = await Promise.all([
        // Exercices de la séance du jour (dépend de seance.id)
        seance
          ? supabase.from('exercices').select('id, nom, series, repetitions, poids, ordre').eq('seance_id', seance.id).order('ordre')
          : Promise.resolve({ data: [] }),
        // Compteurs séances sport_programme (dépend de proSport.id)
        proSport
          ? supabase.from('seances').select('id', { count: 'exact', head: true }).eq('sport_programme_id', proSport.id)
          : Promise.resolve({ count: 0 }),
        proSport
          ? supabase.from('seances').select('id', { count: 'exact', head: true }).eq('sport_programme_id', proSport.id).eq('is_completed', true)
          : Promise.resolve({ count: 0 }),
        // Phases + séances programme legacy (dépend de assignData)
        assignData
          ? supabase.from('programme_phases').select('id, titre, ordre').eq('programme_id', assignData.programme_id).order('ordre')
          : Promise.resolve({ data: [] }),
        assignData
          ? supabase.from('seances').select('id, is_completed').eq('client_id', user.id).eq('is_template', false)
              .like('notes', `programme:${assignData.programmes?.id || assignData.programme_id}%`)
          : Promise.resolve({ data: [] }),
        // Repas nutrition legacy (dépend de nutPlan.id et !nutPlan.__pro)
        nutPlan && !nutPlan.__pro
          ? supabase.from('plan_repas').select('id', { count: 'exact', head: true }).eq('plan_id', nutPlan.id)
          : Promise.resolve({ count: 0 }),
        nutPlan && !nutPlan.__pro
          ? supabase.from('suivi_nutrition').select('id').eq('plan_id', nutPlan.id).eq('client_id', user.id)
          : Promise.resolve({ data: [] }),
        nutPlan && !nutPlan.__pro
          ? supabase.from('plan_repas')
              .select('id, type, ordre, repas_aliments(quantite_g, aliments(nom, kcal_100g, proteines, glucides, lipides))')
              .eq('plan_id', nutPlan.id).order('ordre')
          : Promise.resolve({ data: [] }),
      ])

      // ── Traitement vague 2 ────────────────────────────────────────────────
      setSeanceExos(exosRes.data ?? [])

      if (proSport) {
        setProgramme({
          programmes: { id: proSport.id, titre: proSport.nom, duree_semaines: proSport.duree_semaines },
          phase_actuelle: 1,
          __pro: true,
        })
        setProgSeances({ total: sportProgTotalRes.count || 0, done: sportProgDoneRes.count || 0 })
      } else if (assignData) {
        setProgramme(assignData)
        setProgrammePhases(phasesRes.data || [])
        const total = progSeancesRes.data?.length ?? 0
        const done = progSeancesRes.data?.filter(s => s.is_completed)?.length ?? 0
        setProgSeances({ total, done })
      }

      if (nutPlan) {
        setNutritionPlan(nutPlan)
        if (nutPlan.__pro) {
          setNutriRepasCount(0)
          setNutriWeeksDone(0)
          setNutriRepas([])
        } else {
          setNutriRepasCount(repasCountRes.count ?? 0)
          setNutriWeeksDone(suiviRes.data?.length ?? 0)
          setNutriRepas(repasDetailRes.data ?? [])
        }
      } else {
        setNutritionPlan(null)
        setNutriRepas([])
      }

    } catch (err) {
      console.error('[Dashboard] erreur globale:', err)
    }

    setLoading(false)
  }, [user, today])

  useEffect(() => { chargerDonnees() }, [chargerDonnees, location.key])

  const pageTransition = usePageTransition()

  // ── Toggle habitude ──
  const toggleHabitude = async (habitudeId) => {
    setToggling(habitudeId)
    const dejaFait = logAujourdhui.includes(habitudeId)
    if (dejaFait) {
      await supabase.from('habitudes_log')
        .delete()
        .eq('habitude_id', habitudeId)
        .eq('client_id', user.id)
        .eq('date', today)
      setLogAujourdhui(prev => prev.filter(id => id !== habitudeId))
    } else {
      await supabase.from('habitudes_log')
        .insert({ habitude_id: habitudeId, client_id: user.id, date: today })
      setLogAujourdhui(prev => {
        const next = [...prev, habitudeId]
        if (next.length === habitudes.length && habitudes.length > 0) {
          setShowAllDoneConfetti(false)
          setTimeout(() => setShowAllDoneConfetti(true), 50)
        }
        return next
      })
    }
    setToggling(null)
  }

  // ── Save sommeil check-in ──
  const saveSommeil = async () => {
    if (!user || sommeilSaving) return
    setSommeilSaving(true)
    try {
      if (sommeil) {
        await supabase.from('sommeil_log').update({ heures: sommeilInput, qualite: Math.min(5, Math.max(1, Math.round(sommeilInput / 2))) }).eq('id', sommeil.id)
      } else {
        await supabase.from('sommeil_log').insert({ client_id: user.id, date: today, heures: sommeilInput, qualite: Math.min(5, Math.max(1, Math.round(sommeilInput / 2))) })
      }
      setSommeil({ ...(sommeil || {}), heures: sommeilInput })
      setSommeilSaved(true)
    } catch (err) {
      console.error('[Dashboard] Erreur save sommeil:', err)
    }
    setSommeilSaving(false)
  }

  // ── Save humeur check-in ──
  const saveHumeur = async (score) => {
    if (!user || humeurSaving) return
    setHumeurInput(score)
    setHumeurSaving(true)
    try {
      if (humeur) {
        await supabase.from('humeur_log').update({ score }).eq('id', humeur.id)
      } else {
        await supabase.from('humeur_log').insert({ client_id: user.id, date: today, score })
      }
      setHumeur({ ...(humeur || {}), score })
      setHumeurSaved(true)
    } catch (err) {
      console.error('[Dashboard] Erreur save humeur:', err)
    }
    setHumeurSaving(false)
  }

  const cochees = logAujourdhui.length
  const totalHab = habitudes.length
  const score = calculerScoreBienEtre({ habitudes: { cochees, total: totalHab }, sommeil, humeur, sport })
  const couleur = couleurScore(score)
  const label = labelScore(score)
  const rawPrenom = profil?.prenom || profil?.nom?.split(' ')[0] || 'Sportif'
  const prenom = rawPrenom.charAt(0).toUpperCase() + rawPrenom.slice(1).toLowerCase()

  const hour = new Date().getHours()
  const allHabsDone = totalHab > 0 && cochees === totalHab
  const seanceFaite = seanceDuJour?.is_completed
  const toutFait = allHabsDone && seanceFaite && sommeilSaved && humeurSaved

  const getGreeting = () => {
    if (toutFait) return { text: `Journée parfaite, ${prenom}`, icon: Crown }
    if (streak >= 7) return { text: `${streak} jours d'affilée`, icon: Flame }
    if (seanceDuJour && !seanceFaite) return { text: `Ta séance t'attend`, icon: Dumbbell }
    if (hour < 12) return { text: `Bonjour ${prenom}`, icon: Sparkles }
    if (hour < 18) return { text: `Bon après-midi ${prenom}`, icon: Zap }
    return { text: `Bonsoir ${prenom}`, icon: Moon }
  }
  const greeting = getGreeting()
  const GreetingIcon = greeting.icon

  // ── Macros nutrition du jour ──
  const nutriMacros = (() => {
    if (!nutriRepas.length) return null
    let kcal = 0, prot = 0, gluc = 0, lip = 0
    nutriRepas.forEach(repas => {
      (repas.repas_aliments || []).forEach(ra => {
        const a = ra.aliments
        const q = (ra.quantite_g || 100) / 100
        if (a) {
          kcal += (a.kcal_100g || 0) * q
          prot += (a.proteines || 0) * q
          gluc += (a.glucides || 0) * q
          lip += (a.lipides || 0) * q
        }
      })
    })
    return { kcal: Math.round(kcal), prot: Math.round(prot), gluc: Math.round(gluc), lip: Math.round(lip) }
  })()

  const currentWeekActive = weekData.filter(d => d.score > 0)
  const currentWeekAvg = currentWeekActive.length > 0
    ? Math.round(currentWeekActive.reduce((a, b) => a + b.score, 0) / currentWeekActive.length)
    : null
  const trendDiff = (currentWeekAvg !== null && prevWeekAvg !== null) ? currentWeekAvg - prevWeekAvg : null

  const getNextStep = () => {
    if (seanceDuJour && !seanceFaite) return { type: 'seance', label: 'Lance ta séance', sub: seanceDuJour.titre, icon: Play, color: '#FF6B2B', action: () => navigate(`/app/workout/${seanceDuJour.id}`) }
    if (!sommeilSaved || !humeurSaved) return { type: 'checkin', label: 'Fais ton check-in', sub: !sommeilSaved ? 'Sommeil non renseigné' : 'Humeur non renseignée', icon: Moon, color: '#FF9A6C' }
    if (totalHab > 0 && !allHabsDone) return { type: 'habits', label: 'Habitudes en cours', sub: `${cochees}/${totalHab} complétées`, icon: Flame, color: '#FF6B2B' }
    if (unreadMessages > 0) return { type: 'messages', label: 'Message non lu', sub: `${unreadMessages} message${unreadMessages > 1 ? 's' : ''} de ton coach`, icon: MessageCircle, color: '#FF6B2B', action: () => navigate('/app/messages') }
    if (seanceDemain) return { type: 'demain', label: 'Demain', sub: seanceDemain.titre, icon: CalendarDays, color: '#FF9A6C' }
    return null
  }
  const nextStep = getNextStep()

  const sectionCount = 12
  const stagger = useStagger(sectionCount)

  const { pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh(chargerDonnees)

  // ══════════════════════════════════════════════════════════
  //  SKELETON — Refined loading state
  // ══════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="p-5 pb-28 space-y-4 max-w-6xl mx-auto">
        {/* Header skeleton */}
        <div className="pt-2 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-52 skel-block" />
            <div className="h-3.5 w-32 skel-block" />
          </div>
          <div className="w-11 h-11 rounded-full skel-block" />
        </div>
        {/* Streak skeleton */}
        <div className="h-36 skel-block rounded-2xl" />
        {/* Check-in skeleton */}
        <div className="grid grid-cols-2 gap-3">
          <div className="h-40 skel-block rounded-2xl" />
          <div className="h-40 skel-block rounded-2xl" />
        </div>
        {/* Seance skeleton */}
        <div className="h-48 skel-block rounded-2xl" />
        {/* Score skeleton */}
        <div className="h-36 skel-block rounded-2xl" />
        {/* Chart skeleton */}
        <div className="h-52 skel-block rounded-2xl" />
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className={`px-5 md:px-8 pb-28 md:pb-10 max-w-6xl mx-auto ${pageTransition.className}`} {...pullHandlers}>
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      <Confetti active={showAllDoneConfetti} />
      <StreakMilestone streak={streak} />

      {/* ═══════════════ HEADER ═══════════════ */}
      <div className={`pt-5 flex items-start justify-between ${stagger[0].className}`} style={stagger[0].style}>
        <div className="flex-1 min-w-0">
          <h1 className="text-[var(--text-primary)] text-[26px] font-extrabold tracking-tight leading-tight flex items-center gap-2.5">
            <span className="truncate">{greeting.text}</span>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(255,107,43,0.12), rgba(255,107,43,0.04))' }}>
              <GreetingIcon size={18} className="text-[#FF6B2B]" />
            </span>
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-[var(--text-muted)] text-sm capitalize">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {score > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
                <span className="text-xs font-semibold" style={{ color: couleur }}>{score}/100</span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => navigate('/app/profil')}
          className="relative active:scale-95 transition-transform ml-3"
        >
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center ring-2 ring-offset-2 ring-offset-[var(--bg-base)] ring-[#FF6B2B]/20 overflow-hidden"
            style={{ background: profil?.avatar_url ? 'transparent' : 'linear-gradient(135deg, #FF6B2B, #FF9A6C)' }}
          >
            {profil?.avatar_url ? (
              <img
                src={profil.avatar_url}
                alt=""
                decoding="async"
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  const parent = e.currentTarget.parentElement
                  if (parent) parent.style.background = 'linear-gradient(135deg, #FF6B2B, #FF9A6C)'
                  e.currentTarget.replaceWith(
                    Object.assign(document.createElement('div'), {
                      innerHTML: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
                    })
                  )
                }}
              />
            ) : (
              <User size={18} className="text-white" />
            )}
          </div>
        </button>
      </div>

      {/* ═══════════════ GRILLE 2 COLONNES (desktop) ═══════════════ */}
      <div className="md:grid md:grid-cols-2 md:gap-6 md:items-start space-y-4 md:space-y-0 mt-4">

        {/* ── COLONNE GAUCHE : prochaine action · streak · séance · habitudes · programmes ── */}
        <div className="space-y-4">

          {/* ═══════════════ PROCHAINE ETAPE (CTA contextuel) ═══════════════ */}
          {nextStep && (
            <button
              onClick={nextStep.action || undefined}
              className={`group w-full rounded-2xl border p-3.5 text-left active:scale-[0.98] transition-all ${stagger[1].className}`}
              style={{
                ...stagger[1].style,
                background: `linear-gradient(135deg, ${nextStep.color}0A, transparent)`,
                borderColor: `${nextStep.color}15`,
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${nextStep.color}12` }}>
                  <nextStep.icon size={18} style={{ color: nextStep.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] uppercase tracking-widest font-bold mb-0.5" style={{ color: `${nextStep.color}80` }}>
                    Prochaine action
                  </p>
                  <p className="text-[var(--text-primary)] text-sm font-bold leading-snug">{nextStep.label}</p>
                </div>
                <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          )}

          {/* ═══════════════ STREAK ═══════════════ */}
          {streak > 0 && (
            <StreakBadge streak={streak} staggerClass={stagger[2].className} staggerStyle={stagger[2].style} />
          )}

          {/* ═══════════════ SÉANCE DU JOUR ═══════════════ */}
          {seanceDuJour ? (
            <div className={`relative overflow-hidden rounded-2xl border ${
              seanceDuJour.is_completed
                ? 'border-[#FF9A6C]/12'
                : 'border-[var(--color-primary,#FF6B2B)]/15'
            } ${stagger[5].className}`}
              style={{
                ...stagger[5].style,
                background: seanceDuJour.is_completed
                  ? 'linear-gradient(135deg, rgba(255,154,108,0.06), var(--bg-card) 60%)'
                  : 'linear-gradient(135deg, rgba(255,107,43,0.08), var(--bg-card) 60%)',
              }}
            >
              <div className={`absolute top-0 right-0 w-36 h-36 rounded-full -translate-y-10 translate-x-10 blur-3xl pointer-events-none ${
                seanceDuJour.is_completed ? 'bg-[#FF9A6C]/4' : 'bg-[var(--color-primary,#FF6B2B)]/4'
              }`} />

              <div className="relative p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Dumbbell size={13} className={seanceDuJour.is_completed ? 'text-[#FF9A6C]' : 'text-[var(--color-primary,#FF6B2B)]'} />
                    <p className={`text-[10px] uppercase tracking-widest font-bold ${
                      seanceDuJour.is_completed ? 'text-[#FF9A6C]/70' : 'text-[var(--color-primary,#FF6B2B)]/70'
                    }`}>
                      Séance du jour
                    </p>
                  </div>
                  {seanceDuJour.is_completed && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FF9A6C]/10 text-[#FF9A6C] text-[10px] font-bold">
                      <Check size={10} strokeWidth={3} />
                      Terminée
                    </span>
                  )}
                </div>

                <h2 className="text-[var(--text-primary)] text-lg font-bold mb-1 leading-snug">{seanceDuJour.titre}</h2>

                {seanceExos.length > 0 && (
                  <p className="text-[var(--text-muted)] text-xs mb-4">
                    {seanceExos.length} exercice{seanceExos.length > 1 ? 's' : ''}
                  </p>
                )}

                {seanceExos.length > 0 && !seanceDuJour.is_completed && (
                  <div className="space-y-1.5 mb-5">
                    {seanceExos.slice(0, 3).map((exo) => (
                      <div key={exo.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-[var(--bg-surface)]/60 border border-[var(--border-subtle)]">
                        <div className="w-7 h-7 rounded-lg bg-[var(--color-primary,#FF6B2B)]/8 flex items-center justify-center flex-shrink-0">
                          <Dumbbell size={13} className="text-[var(--color-primary,#FF6B2B)]/70" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--text-primary)] text-[13px] font-medium truncate">{exo.nom}</p>
                          <p className="text-[var(--text-muted)] text-[10px]">
                            {exo.series && `${exo.series}x`}{exo.repetitions && `${exo.repetitions}`}
                            {exo.poids ? ` · ${exo.poids}kg` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                    {seanceExos.length > 3 && (
                      <p className="text-[var(--text-muted)] text-[11px] text-center pt-1">
                        +{seanceExos.length - 3} autre{seanceExos.length - 3 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )}

                {seanceDuJour.is_completed ? (
                  <button
                    onClick={() => navigate(`/app/workout/${seanceDuJour.id}`)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-[13px] tracking-wide text-[#FF9A6C] bg-[#FF9A6C]/8 border border-[#FF9A6C]/12 hover:bg-[#FF9A6C]/12 active:scale-[0.98] transition-all"
                  >
                    <CheckCircle2 size={15} />
                    VOIR LE RÉSUMÉ
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/app/workout/${seanceDuJour.id}`)}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl font-bold text-[13px] tracking-wide text-white active:scale-95 transition-all"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-primary, #FF6B2B), #FF9A6C)',
                      boxShadow: '0 4px 24px rgba(255,107,43,0.3), 0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  >
                    <Play size={15} className="fill-white" />
                    COMMENCER L'ENTRAÎNEMENT
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className={`rounded-2xl bg-[var(--bg-card)] border border-dashed border-[var(--border-base)] p-5 ${stagger[5].className}`} style={stagger[5].style}>
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center flex-shrink-0">
                  <Dumbbell size={20} className="text-[var(--text-muted)]" />
                </div>
                <div>
                  <p className="text-[var(--text-secondary)] text-sm font-medium">Pas de séance aujourd'hui</p>
                  <p className="text-[var(--text-muted)] text-xs mt-0.5">Profite de ta journée de repos</p>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ HABITUDES DU JOUR ═══════════════ */}
          <div className={`glass-card p-5 ${stagger[7].className}`} style={stagger[7].style}>
            <div className="relative">
              <SectionLabel icon={Sparkles} label="Habitudes du jour">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)]">
                  {allHabsDone && <Flame size={11} className="text-[var(--color-primary,#FF6B2B)]" />}
                  <span className="text-[var(--color-primary,#FF6B2B)] text-[11px] font-bold tabular-nums">
                    <AnimatedNumber value={cochees} duration={400} />/{totalHab}
                  </span>
                </div>
              </SectionLabel>

              {habitudes.length === 0 ? (
                <p className="text-[var(--text-muted)] text-sm text-center py-6">Aucune habitude assignée pour l'instant.</p>
              ) : (
                <div className="space-y-2">
                  {habitudes.map((h) => {
                    const fait = logAujourdhui.includes(h.id)
                    const accentColor = h.couleur ?? 'var(--color-primary, #FF6B2B)'
                    return (
                      <button
                        key={h.id}
                        onClick={() => toggleHabitude(h.id)}
                        disabled={toggling === h.id}
                        className={`flex items-center gap-3 w-full text-left py-3 px-3.5 rounded-xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50 ${
                          fait
                            ? 'bg-[var(--bg-surface)]/50'
                            : 'bg-[var(--bg-surface)]/80 hover:bg-[var(--bg-surface)]'
                        }`}
                        style={fait ? { borderLeft: `2px solid ${accentColor}30` } : { borderLeft: '2px solid transparent' }}
                      >
                        {fait ? (
                          <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                               style={{ backgroundColor: `${accentColor}15` }}>
                            <CheckCircle2 size={16} style={{ color: accentColor }} />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-[var(--bg-card)] border border-[var(--border-base)] flex items-center justify-center flex-shrink-0">
                            <Circle size={14} className="text-[var(--text-muted)]" />
                          </div>
                        )}
                        <span className={`text-[13px] font-medium flex-1 transition-colors ${fait ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                          {h.nom}
                        </span>
                        {h.assigned_by && (
                          <span className="text-[8px] text-[var(--color-primary,#FF6B2B)]/60 bg-[var(--color-primary,#FF6B2B)]/8 px-2 py-0.5 rounded-md flex-shrink-0 font-bold uppercase tracking-wider">
                            Coach
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {totalHab > 0 && (
                <div className="mt-3.5 h-1 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.round((cochees / totalHab) * 100)}%`,
                      background: allHabsDone
                        ? 'linear-gradient(90deg, #FF6B2B, #FF9A6C)'
                        : `linear-gradient(90deg, var(--color-primary, #FF6B2B), #FF9A6C)`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════ MES PROGRAMMES ═══════════════ */}
          {(programme || nutritionPlan) && (
            <div className={`space-y-3 ${stagger[8].className}`} style={stagger[8].style}>
              <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-bold px-1">Mes programmes</p>

              <div className={`grid gap-3 ${programme && nutritionPlan ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {/* ── Programme Sport ── */}
                {programme && (
                  <button
                    onClick={() => navigate('/app/programme')}
                    className="glass-card p-4 text-left active:scale-[0.98] transition-transform"
                  >
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[var(--color-primary,#FF6B2B)] via-[#FF9A6C]/50 to-transparent" />

                    <div className="relative">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[var(--color-primary,#FF6B2B)]/10 flex items-center justify-center">
                          <Trophy size={14} className="text-[var(--color-primary,#FF6B2B)]" />
                        </div>
                        <ChevronRight size={14} className="text-[var(--text-muted)]" />
                      </div>

                      <p className="text-[var(--text-muted)] text-[9px] uppercase tracking-widest font-bold mb-1">Sport</p>
                      <p className="text-[var(--text-primary)] font-bold text-sm mb-1 truncate">{programme.programmes?.titre}</p>
                      <p className="text-[var(--text-muted)] text-[11px] mb-3">
                        Phase {programme.phase_actuelle}/{programmePhases.length}
                      </p>

                      {programmePhases.length > 0 && (
                        <div className="flex gap-1 mb-2.5">
                          {programmePhases.map((ph, i) => (
                            <div
                              key={ph.id}
                              className="h-1.5 rounded-full flex-1 transition-all"
                              style={{
                                backgroundColor: i < programme.phase_actuelle
                                  ? 'var(--color-primary, #FF6B2B)'
                                  : 'var(--border-base)',
                              }}
                            />
                          ))}
                        </div>
                      )}

                      {progSeances.total > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.round((progSeances.done / progSeances.total) * 100)}%`,
                                background: 'linear-gradient(90deg, var(--color-primary, #FF6B2B), #FF9A6C)',
                              }}
                            />
                          </div>
                          <span className="text-[var(--text-muted)] text-[9px] font-medium flex-shrink-0 tabular-nums">
                            {progSeances.done}/{progSeances.total}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                )}

                {/* ── Plan Nutrition ── */}
                {nutritionPlan && (
                  <button
                    onClick={() => navigate('/app/programme?tab=nutrition')}
                    className="glass-card p-4 text-left active:scale-[0.98] transition-transform"
                  >
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#FF9A6C] via-[#FFB894]/50 to-transparent" />

                    <div className="relative">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#FF9A6C]/10 flex items-center justify-center">
                          <UtensilsCrossed size={14} className="text-[#FF9A6C]" />
                        </div>
                        <ChevronRight size={14} className="text-[var(--text-muted)]" />
                      </div>

                      <p className="text-[var(--text-muted)] text-[9px] uppercase tracking-widest font-bold mb-1">Nutrition</p>
                      <p className="text-[var(--text-primary)] font-bold text-sm mb-1 truncate">{nutritionPlan.nom}</p>
                      <p className="text-[var(--text-muted)] text-[11px] mb-3">
                        {nutriRepasCount} repas{nutritionPlan.duree_semaines ? ` · ${nutritionPlan.duree_semaines} sem.` : ''}
                      </p>

                      {nutritionPlan.duree_semaines > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.round((nutriWeeksDone / nutritionPlan.duree_semaines) * 100)}%`,
                                background: 'linear-gradient(90deg, #FF9A6C, #FFB894)',
                              }}
                            />
                          </div>
                          <span className="text-[var(--text-muted)] text-[9px] font-medium flex-shrink-0 tabular-nums">
                            {nutriWeeksDone}/{nutritionPlan.duree_semaines}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

        </div>{/* fin colonne gauche */}

        {/* ── COLONNE DROITE : check-in · formulaires · score · nutrition · chart ── */}
        <div className="space-y-4">

          {/* ═══════════════ CHECK-IN QUOTIDIEN ═══════════════ */}
          {(!sommeilSaved || !humeurSaved) && (
            <div className={`glass-card p-4 ${stagger[3].className}`} style={stagger[3].style}>
              <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
                style={{ background: 'linear-gradient(90deg, #FF6B2B, #FF9A6C, transparent)' }} />

              <div className="relative">
                <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-bold mb-3.5">
                  Check-in du jour
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {/* ── Widget Sommeil ── */}
                  <div className={`rounded-xl p-3.5 transition-all duration-500 ${
                    sommeilSaved
                      ? 'bg-[#FF9A6C]/[0.06] ring-1 ring-[#FF9A6C]/15'
                      : 'bg-[var(--bg-surface)]/50'
                  }`}>
                    {sommeilSaved ? (
                      <div className="text-center py-1">
                        <div className="w-9 h-9 rounded-lg bg-[#FF9A6C]/10 flex items-center justify-center mx-auto mb-2">
                          <Moon size={16} className="text-[#FF9A6C]" />
                        </div>
                        <p className="text-[#FF9A6C] text-lg font-black leading-none">{sommeilInput}h</p>
                        <p className="text-[#FF9A6C]/40 text-[9px] mt-1 font-medium">Enregistré</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 mb-3">
                          <Moon size={12} className="text-[#FF9A6C]" />
                          <p className="text-[var(--text-muted)] text-[9px] uppercase tracking-wider font-bold">Sommeil</p>
                        </div>
                        <div className="flex items-center justify-center gap-2.5 mb-3">
                          <button
                            onClick={() => setSommeilInput(v => Math.max(0, +(v - 0.5).toFixed(1)))}
                            className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-base)] flex items-center justify-center text-[var(--text-muted)] hover:text-[#FF9A6C] transition-all active:scale-90"
                          >
                            <Minus size={14} />
                          </button>
                          <div className="text-center min-w-[44px]">
                            <p className="text-[var(--text-primary)] text-2xl font-black leading-none tabular-nums">{sommeilInput}</p>
                            <p className="text-[var(--text-muted)] text-[8px] mt-0.5 font-medium">heures</p>
                          </div>
                          <button
                            onClick={() => setSommeilInput(v => Math.min(14, +(v + 0.5).toFixed(1)))}
                            className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-base)] flex items-center justify-center text-[var(--text-muted)] hover:text-[#FF9A6C] transition-all active:scale-90"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          onClick={saveSommeil}
                          disabled={sommeilSaving}
                          className="w-full py-2 rounded-lg bg-[#FF9A6C]/15 text-[#FF9A6C] text-[11px] font-bold hover:bg-[#FF9A6C]/25 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {sommeilSaving ? '...' : 'Valider'}
                        </button>
                      </>
                    )}
                  </div>

                  {/* ── Widget Humeur ── */}
                  <div className={`rounded-xl p-3.5 transition-all duration-500 ${
                    humeurSaved
                      ? 'bg-[#FF6B2B]/[0.06] ring-1 ring-[#FF6B2B]/15'
                      : 'bg-[var(--bg-surface)]/50'
                  }`}>
                    {humeurSaved ? (
                      <div className="text-center py-1">
                        <div className="w-9 h-9 rounded-lg bg-[#FF6B2B]/10 flex items-center justify-center mx-auto mb-2">
                          <Smile size={16} className="text-[#FF6B2B]" />
                        </div>
                        <p className="text-[#FF6B2B] text-sm font-black leading-none">
                          {['Mal', 'Bof', 'Ok', 'Bien', 'Top'][Math.min(4, Math.max(0, Math.round((humeurInput || 5) / 2) - 1))]}
                        </p>
                        <p className="text-[#FF6B2B]/40 text-[9px] mt-1 font-medium">Enregistré</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 mb-3">
                          <Smile size={12} className="text-[#FF6B2B]" />
                          <p className="text-[var(--text-muted)] text-[9px] uppercase tracking-wider font-bold">Humeur</p>
                        </div>
                        <div className="flex items-center justify-between mb-1">
                          {[
                            { icon: Frown, score: 2, label: 'Mal', color: '#7A7A78' },
                            { icon: Meh, score: 4, label: 'Bof', color: '#C94A15' },
                            { icon: Minus, score: 6, label: 'Ok', color: '#E85A1F' },
                            { icon: Smile, score: 8, label: 'Bien', color: '#FF6B2B' },
                            { icon: Sparkles, score: 10, label: 'Top', color: '#FF9A6C' },
                          ].map(({ icon: MoodIcon, score, label, color }) => (
                            <button
                              key={score}
                              onClick={() => saveHumeur(score)}
                              disabled={humeurSaving}
                              className="flex flex-col items-center gap-0.5 transition-all active:scale-90"
                            >
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                                style={{
                                  background: humeurInput === score ? `${color}18` : 'var(--bg-card)',
                                  border: humeurInput === score ? `1.5px solid ${color}35` : '1.5px solid var(--border-base)',
                                  transform: humeurInput === score ? 'scale(1.1)' : 'scale(1)',
                                }}
                              >
                                <MoodIcon size={13} style={{ color: humeurInput === score ? color : 'var(--text-muted)' }} />
                              </div>
                              <span className="text-[7px] font-bold leading-none mt-0.5" style={{ color: humeurInput === score ? color : 'var(--text-muted)' }}>
                                {label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ FORMULAIRES EN ATTENTE ═══════════════ */}
          {formsPending.length > 0 && formsPending.map((form, idx) => {
            const formInfo = form.formulaires || {}
            const typeIcons = { bilan: ClipboardList, satisfaction: Star, evaluation: TrendingUp, feedback: MessageCircle }
            const typeLabels = { bilan: 'Bilan', satisfaction: 'Satisfaction', evaluation: 'Évaluation', feedback: 'Feedback' }
            const FormIcon = typeIcons[formInfo.type] || ClipboardList
            const typeLabel = typeLabels[formInfo.type] || 'Formulaire'
            const daysAgo = Math.floor((Date.now() - new Date(form.created_at).getTime()) / 86400000)
            const dateLabel = daysAgo === 0 ? "Aujourd'hui" : daysAgo === 1 ? 'Hier' : `Il y a ${daysAgo}j`

            return (
              <button
                key={form.id}
                onClick={() => navigate('/app/formulaires')}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border border-[#FF9A6C]/12 active:scale-[0.98] transition-all ${stagger[4].className}`}
                style={{
                  ...stagger[4].style,
                  animationDelay: `${(stagger[4].style?.animationDelay ? parseInt(stagger[4].style.animationDelay) : 0) + idx * 60}ms`,
                  background: 'linear-gradient(135deg, rgba(255,154,108,0.06), transparent)',
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-[#FF9A6C]/10 flex items-center justify-center flex-shrink-0 relative">
                  <FormIcon size={18} className="text-[#FF9A6C]" />
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#FF6B2B] rounded-full ring-2 ring-[var(--bg-card)]" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[var(--text-primary)] font-semibold text-sm truncate">
                    {formInfo.titre || 'Formulaire à remplir'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[#FF9A6C]/60 text-[11px] font-medium">{typeLabel}</span>
                    <span className="text-[var(--text-muted)] text-[11px]">{dateLabel}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-[#FF9A6C]/10 px-2.5 py-1.5 rounded-lg flex-shrink-0">
                  <span className="text-[#FF9A6C] text-[11px] font-semibold">Remplir</span>
                  <ChevronRight size={12} className="text-[#FF9A6C]/50" />
                </div>
              </button>
            )
          })}

          {/* ═══════════════ SCORE BIEN-ÊTRE ═══════════════ */}
          <div className={`glass-card p-5 ${stagger[6].className}`} style={stagger[6].style}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: couleur }} />

            <div className="relative">
              <SectionLabel icon={Activity} label="Bien-être" color={couleur}>
                {trendDiff !== null && trendDiff !== 0 && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${
                    trendDiff > 0
                      ? 'bg-[#FF6B2B]/8 text-[#FF6B2B]'
                      : 'bg-red-500/8 text-red-400'
                  }`}>
                    {trendDiff > 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                    {trendDiff > 0 ? '+' : ''}{trendDiff}
                  </div>
                )}
              </SectionLabel>

              <div className="flex items-center gap-5">
                <ScoreGauge score={score} couleur={couleur} size={110} />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xl font-extrabold leading-none mb-3" style={{ color: couleur }}>{label}</p>
                  {[
                    { icon: Moon, color: '#FF9A6C', text: sommeil ? `${sommeil.heures}h de sommeil` : 'Sommeil non renseigné' },
                    { icon: Smile, color: '#FF6B2B', text: humeur ? `Humeur ${humeur.score}/10` : 'Humeur non renseignée' },
                    { icon: Zap, color: '#FF6B2B', text: sport ? `Intensité ${sport.intensite}/5` : 'Pas d\'activité' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <item.icon size={12} style={{ color: item.color }} className="flex-shrink-0 opacity-70" />
                      <span className="text-[var(--text-muted)] text-[11px] leading-snug">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════ NUTRITION DU JOUR ═══════════════ */}
          {nutriMacros && nutriRepas.length > 0 && (
            <div className={`glass-card p-5 ${stagger[9].className}`} style={stagger[9].style}>
              <div className="relative">
                <SectionLabel icon={UtensilsCrossed} label="Nutrition du jour" color="#FF9A6C">
                  <button
                    onClick={() => navigate('/app/programme')}
                    className="text-[#FF9A6C]/50 text-[10px] font-semibold hover:text-[#FF9A6C] transition-colors"
                  >
                    Voir le plan
                  </button>
                </SectionLabel>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: 'Calories', value: nutriMacros.kcal, unit: 'kcal', color: '#FF6B2B' },
                    { label: 'Protéines', value: nutriMacros.prot, unit: 'g', color: '#FF6B2B' },
                    { label: 'Glucides', value: nutriMacros.gluc, unit: 'g', color: '#FF9A6C' },
                    { label: 'Lipides', value: nutriMacros.lip, unit: 'g', color: '#FFB894' },
                  ].map((m, i) => (
                    <div key={i} className="text-center py-2.5 px-1 rounded-xl bg-[var(--bg-surface)]/60" style={{ borderTop: `2px solid ${m.color}25` }}>
                      <p className="text-[var(--text-primary)] text-sm font-bold leading-none tabular-nums">{m.value}</p>
                      <p className="text-[9px] font-medium mt-0.5" style={{ color: `${m.color}70` }}>{m.unit}</p>
                      <p className="text-[var(--text-muted)] text-[8px] mt-0.5">{m.label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  {(() => {
                    const typeLabels = { petit_dej: 'Petit-déjeuner', dejeuner: 'Déjeuner', diner: 'Dîner', collation: 'Collation' }
                    const typeIcons = { petit_dej: Sunrise, dejeuner: Sun, diner: Moon, collation: Coffee }
                    const typeColors = { petit_dej: '#FF9A6C', dejeuner: '#FF6B2B', diner: '#7A7A78', collation: '#FFB894' }
                    return nutriRepas.map((repas, i) => {
                      const nbAliments = repas.repas_aliments?.length || 0
                      const RepasIcon = typeIcons[repas.type] || UtensilsCrossed
                      const repasColor = typeColors[repas.type] || '#FF6B2B'
                      return (
                        <div key={repas.id || i} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-[var(--bg-surface)]/50"
                          style={{ borderLeft: `2px solid ${repasColor}30` }}>
                          <RepasIcon size={15} style={{ color: repasColor }} className="flex-shrink-0 opacity-70" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[var(--text-primary)] text-[13px] font-medium">{typeLabels[repas.type] || repas.type}</p>
                            <p className="text-[var(--text-muted)] text-[10px]">{nbAliments} aliment{nbAliments > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ GRAPHIQUE 7 JOURS ═══════════════ */}
          <div className={`glass-card p-5 ${stagger[10].className}`} style={stagger[10].style}>
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <TrendingUp size={13} className="text-[var(--color-primary,#FF6B2B)]" />
                  <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-bold">Score 7 jours</p>
                </div>
                {currentWeekAvg !== null && (
                  <span className="text-[var(--text-muted)] text-[10px] font-bold tabular-nums">
                    Moy. {currentWeekAvg}
                  </span>
                )}
              </div>

              <p className="text-[var(--text-muted)] text-[11px] mb-4">
                Évolution de ton bien-être sur la semaine
              </p>

              {weekData.some(d => d.score > 0) ? (
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={weekData} margin={{ top: 5, right: 0, left: -28, bottom: 0 }}>
                    <XAxis
                      dataKey="jour"
                      tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      ticks={[0, 50, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border-base)', radius: 8 }} />
                    <Bar dataKey="score" radius={[6, 6, 2, 2]} maxBarSize={30}>
                      {weekData.map((entry, index) => {
                        const isToday = index === weekData.length - 1
                        return (
                          <Cell
                            key={index}
                            fill="var(--color-primary, #FF6B2B)"
                            fillOpacity={isToday ? 1 : 0.35}
                          />
                        )
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-8 text-center">
                  <Sparkles size={22} className="text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
                  <p className="text-[var(--text-muted)] text-sm">
                    Commence à renseigner tes données pour voir l'évolution
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>{/* fin colonne droite */}

      </div>{/* fin grille */}

    </div>
  )
}
