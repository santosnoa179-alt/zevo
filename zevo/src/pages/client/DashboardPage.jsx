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
  ArrowUpRight, ArrowDownRight, CalendarDays, MessageCircle
} from 'lucide-react'
import { Confetti, StreakMilestone } from '../../components/ui/Confetti'
import { usePageTransition, useStagger, usePullToRefresh } from '../../hooks/useAnimations'
import AnimatedNumber from '../../components/ui/AnimatedNumber'
import PullToRefreshIndicator from '../../components/ui/PullToRefresh'

// ── Jauge circulaire SVG premium ──
function ScoreGauge({ score, couleur }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <div className="relative">
      <svg width="130" height="130" viewBox="0 0 130 130" className="flex-shrink-0 drop-shadow-lg">
        {/* Track */}
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        {/* Glow effect */}
        <circle
          cx="65" cy="65" r={r}
          fill="none"
          stroke={couleur}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)', filter: `drop-shadow(0 0 8px ${couleur}40)` }}
        />
        <text x="65" y="60" textAnchor="middle" fill="#F5F5F3" fontSize="30" fontWeight="800" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif">{score}</text>
        <text x="65" y="78" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="11" fontFamily="-apple-system,sans-serif">/100</text>
      </svg>
    </div>
  )
}

// ── Tooltip custom pour le graphique ──
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1E1E1E] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm shadow-xl backdrop-blur-sm">
      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-[#F5F5F3] font-bold text-base">{payload[0].value}<span className="text-white/30 text-xs font-normal">/100</span></p>
    </div>
  )
}

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

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

  // Séance du jour
  const [seanceDuJour, setSeanceDuJour] = useState(null)
  const [seanceExos, setSeanceExos] = useState([])

  // Formulaires en attente
  const [formsPending, setFormsPending] = useState(0)

  // Programme sport en cours
  const [programme, setProgramme] = useState(null)
  const [programmePhases, setProgrammePhases] = useState([])
  const [progSeances, setProgSeances] = useState({ total: 0, done: 0 })

  // Plan nutrition en cours
  const [nutritionPlan, setNutritionPlan] = useState(null)
  const [nutriRepasCount, setNutriRepasCount] = useState(0)
  const [nutriWeeksDone, setNutriWeeksDone] = useState(0)
  const [nutriRepas, setNutriRepas] = useState([])  // repas du jour pour la carte nutrition

  // Prochaine étape
  const [seanceDemain, setSeanceDemain] = useState(null)
  const [unreadMessages, setUnreadMessages] = useState(0)

  // Scores semaine précédente (pour tendance)
  const [prevWeekAvg, setPrevWeekAvg] = useState(null)

  // Check-in widgets state
  const [sommeilInput, setSommeilInput] = useState(7)
  const [sommeilSaved, setSommeilSaved] = useState(false)
  const [sommeilSaving, setSommeilSaving] = useState(false)
  const [humeurInput, setHumeurInput] = useState(null)
  const [humeurSaved, setHumeurSaved] = useState(false)
  const [humeurSaving, setHumeurSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  // ── Charge les scores des 7 derniers jours + semaine précédente pour tendance ──
  const chargerComparatif = useCallback(async (clientId, totalHab) => {
    // On fetch 14 jours pour calculer la tendance
    const il14jours = new Date()
    il14jours.setDate(il14jours.getDate() - 13)
    const dateMin14 = il14jours.toISOString().split('T')[0]

    const [logRes, sommeilRes, humeurRes, sportRes] = await Promise.all([
      supabase.from('habitudes_log').select('date').eq('client_id', clientId).gte('date', dateMin14),
      supabase.from('sommeil_log').select('date, qualite').eq('client_id', clientId).gte('date', dateMin14),
      supabase.from('humeur_log').select('date, score').eq('client_id', clientId).gte('date', dateMin14),
      supabase.from('sport_log').select('date, intensite').eq('client_id', clientId).gte('date', dateMin14),
    ])

    const logs = logRes.data ?? []

    const computeScore = (dateStr) => {
      const cochees = logs.filter(l => l.date === dateStr).length
      return calculerScoreBienEtre({
        habitudes: { cochees, total: totalHab },
        sommeil: (sommeilRes.data ?? []).find(s => s.date === dateStr) ?? null,
        humeur: (humeurRes.data ?? []).find(h => h.date === dateStr) ?? null,
        sport: (sportRes.data ?? []).find(s => s.date === dateStr) ?? null,
      })
    }

    // Semaine actuelle (7 derniers jours)
    const data = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      data.push({ jour: JOURS[d.getDay()], score: computeScore(dateStr) })
    }
    setWeekData(data)

    // Semaine précédente (jours 7 à 13) pour calculer la tendance
    const prevScores = []
    for (let i = 13; i >= 7; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      prevScores.push(computeScore(d.toISOString().split('T')[0]))
    }
    const prevActive = prevScores.filter(s => s > 0)
    setPrevWeekAvg(prevActive.length > 0 ? Math.round(prevActive.reduce((a, b) => a + b, 0) / prevActive.length) : null)
  }, [])

  // ── Charge toutes les données du dashboard ──
  const chargerDonnees = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      const [profilRes, clientRes, habsRes, logRes, sommeilRes, humeurRes, sportRes] = await Promise.all([
        supabase.from('profiles').select('nom, avatar_url').eq('id', user.id).single(),
        supabase.from('clients').select('prenom').eq('id', user.id).maybeSingle(),
        supabase.from('habitudes').select('id, nom, couleur, assigned_by').eq('client_id', user.id).eq('actif', true).order('created_at'),
        supabase.from('habitudes_log').select('habitude_id').eq('client_id', user.id).eq('date', today),
        supabase.from('sommeil_log').select('*').eq('client_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('humeur_log').select('*').eq('client_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('sport_log').select('*').eq('client_id', user.id).eq('date', today).maybeSingle(),
      ])

      const habs = habsRes.data ?? []
      setProfil({ ...profilRes.data, prenom: clientRes.data?.prenom ?? null })
      setHabitudes(habs)
      setLogAujourdhui((logRes.data ?? []).map(l => l.habitude_id))
      const sommeilData = sommeilRes.data ?? null
      const humeurData = humeurRes.data ?? null
      setSommeil(sommeilData)
      setHumeur(humeurData)
      setSport(sportRes.data ?? null)

      // Init check-in widgets
      if (sommeilData) { setSommeilInput(sommeilData.heures || 7); setSommeilSaved(true) }
      if (humeurData) { setHumeurInput(humeurData.score || null); setHumeurSaved(true) }

      // ── Séance du jour (toutes, pas filtrées par is_completed) ──
      const { data: seancesAuj, error: seancesErr } = await supabase
        .from('seances')
        .select('id, titre, date_prevue, notes, is_completed, is_template')
        .eq('client_id', user.id)
        .eq('date_prevue', today)
        .eq('is_template', false)
        .order('is_completed', { ascending: true }) // non-terminées d'abord
        .order('created_at', { ascending: true })
        .limit(1)

      if (seancesErr) console.error('[Dashboard] séances:', seancesErr.message)

      const seance = seancesAuj?.[0] ?? null
      setSeanceDuJour(seance)

      // Charger les exercices de la séance
      if (seance) {
        const { data: exos } = await supabase
          .from('exercices')
          .select('id, nom, series, repetitions, poids, ordre')
          .eq('seance_id', seance.id)
          .order('ordre')
        setSeanceExos(exos ?? [])
      } else {
        setSeanceExos([])
      }

      // ── Formulaires en attente ──
      const { data: formsData, error: formsErr } = await supabase
        .from('formulaire_reponses')
        .select('id')
        .eq('client_id', user.id)
        .eq('statut', 'en_attente')

      if (formsErr) console.error('[Dashboard] formulaires:', formsErr.message)
      setFormsPending(formsData?.length ?? 0)

      // ── Comparatif 7 jours ──
      await chargerComparatif(user.id, habs.length)

      // ── Streak ──
      if (habs.length > 0) {
        const { data: streakLogs } = await supabase
          .from('habitudes_log')
          .select('date')
          .eq('client_id', user.id)
          .gte('date', new Date(Date.now() - 120 * 86400000).toISOString().split('T')[0])
          .order('date', { ascending: false })
        const dates = [...new Set((streakLogs || []).map(l => l.date))].sort().reverse()
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

      // ── Programme en cours ──
      const { data: assignData } = await supabase
        .from('programme_assignations')
        .select('*, programmes(id, titre, duree_semaines)')
        .eq('client_id', user.id)
        .eq('statut', 'en_cours')
        .limit(1)
        .maybeSingle()

      if (assignData) {
        setProgramme(assignData)
        const { data: phasesData } = await supabase
          .from('programme_phases')
          .select('id, titre, ordre')
          .eq('programme_id', assignData.programme_id)
          .order('ordre')
        setProgrammePhases(phasesData || [])

        // Séances du programme — progression
        const progId = assignData.programmes?.id || assignData.programme_id
        const { data: progSeancesData } = await supabase
          .from('seances')
          .select('id, is_completed')
          .eq('client_id', user.id)
          .eq('is_template', false)
          .like('notes', `programme:${progId}%`)

        const total = progSeancesData?.length ?? 0
        const done = progSeancesData?.filter(s => s.is_completed)?.length ?? 0
        setProgSeances({ total, done })
      }

      // ── Plan nutrition en cours ──
      const { data: nutPlan } = await supabase
        .from('client_nutrition_plans')
        .select('id, nom, duree_semaines')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (nutPlan) {
        setNutritionPlan(nutPlan)
        // Compter les repas et les semaines validées
        const [repasRes, suiviRes, repasDetailRes] = await Promise.all([
          supabase.from('plan_repas').select('id', { count: 'exact', head: true }).eq('plan_id', nutPlan.id),
          supabase.from('suivi_nutrition').select('id').eq('plan_id', nutPlan.id).eq('client_id', user.id),
          supabase.from('plan_repas')
            .select('id, type, ordre, repas_aliments(quantite_g, aliments(nom, kcal_100g, proteines, glucides, lipides))')
            .eq('plan_id', nutPlan.id)
            .order('ordre'),
        ])
        setNutriRepasCount(repasRes.count ?? 0)
        setNutriWeeksDone(suiviRes.data?.length ?? 0)
        setNutriRepas(repasDetailRes.data ?? [])
      } else {
        setNutritionPlan(null)
        setNutriRepas([])
      }

      // ── Séance de demain (pour "Prochaine étape") ──
      const demain = new Date()
      demain.setDate(demain.getDate() + 1)
      const demainStr = demain.toISOString().split('T')[0]
      const { data: seanceDemainData } = await supabase
        .from('seances')
        .select('id, titre, date_prevue')
        .eq('client_id', user.id)
        .eq('date_prevue', demainStr)
        .eq('is_template', false)
        .eq('is_completed', false)
        .limit(1)
        .maybeSingle()
      setSeanceDemain(seanceDemainData ?? null)

      // ── Messages non lus ──
      const { count: msgCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('destinataire_id', user.id)
        .eq('lu', false)
      setUnreadMessages(msgCount ?? 0)

    } catch (err) {
      console.error('[Dashboard] erreur globale:', err)
    }

    setLoading(false)
  }, [user, today, chargerComparatif])

  // Recharge à chaque navigation vers le dashboard (ex: retour après workout)
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
  // Prénom en priorité (table clients), sinon premier mot du nom (table profiles), sinon fallback
  const rawPrenom = profil?.prenom || profil?.nom?.split(' ')[0] || 'Sportif'
  const prenom = rawPrenom.charAt(0).toUpperCase() + rawPrenom.slice(1).toLowerCase()

  // ── Message contextuel intelligent ──
  const hour = new Date().getHours()
  const allHabsDone = totalHab > 0 && cochees === totalHab
  const seanceFaite = seanceDuJour?.is_completed
  const toutFait = allHabsDone && seanceFaite && sommeilSaved && humeurSaved

  const getGreeting = () => {
    if (toutFait) return { text: `Journée parfaite, ${prenom}`, emoji: '👑' }
    if (streak >= 7) return { text: `${streak} jours d'affilée`, emoji: '🔥' }
    if (seanceDuJour && !seanceFaite) return { text: `Ta séance t'attend, ${prenom}`, emoji: '💪' }
    if (hour < 12) return { text: `Bonjour ${prenom}`, emoji: '☀️' }
    if (hour < 18) return { text: `Bon après-midi ${prenom}`, emoji: '💪' }
    return { text: `Bonsoir ${prenom}`, emoji: '🌙' }
  }
  const greeting = getGreeting()

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

  // ── Tendance semaine ──
  const currentWeekActive = weekData.filter(d => d.score > 0)
  const currentWeekAvg = currentWeekActive.length > 0
    ? Math.round(currentWeekActive.reduce((a, b) => a + b.score, 0) / currentWeekActive.length)
    : null
  const trendDiff = (currentWeekAvg !== null && prevWeekAvg !== null) ? currentWeekAvg - prevWeekAvg : null

  // ── "Prochaine étape" — quoi montrer ──
  const getNextStep = () => {
    if (seanceDuJour && !seanceFaite) return { type: 'seance', label: 'Lance ta séance', sub: seanceDuJour.titre, icon: Play, color: '#FF6B2B', action: () => navigate(`/app/workout/${seanceDuJour.id}`) }
    if (!sommeilSaved || !humeurSaved) return { type: 'checkin', label: 'Fais ton check-in', sub: !sommeilSaved ? 'Sommeil non renseigné' : 'Humeur non renseignée', icon: Moon, color: '#818cf8' }
    if (totalHab > 0 && !allHabsDone) return { type: 'habits', label: 'Habitudes en cours', sub: `${cochees}/${totalHab} complétées`, icon: Flame, color: '#FF6B2B' }
    if (unreadMessages > 0) return { type: 'messages', label: 'Message non lu', sub: `${unreadMessages} message${unreadMessages > 1 ? 's' : ''} de ton coach`, icon: MessageCircle, color: '#3b82f6', action: () => navigate('/app/messages') }
    if (seanceDemain) return { type: 'demain', label: 'Demain', sub: seanceDemain.titre, icon: CalendarDays, color: '#a855f7' }
    return null
  }
  const nextStep = getNextStep()

  const sectionCount = 12
  const stagger = useStagger(sectionCount)

  const { pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh(chargerDonnees)

  // ── Skeleton premium ──
  if (loading) {
    return (
      <div className="p-5 pb-28 space-y-5 max-w-lg mx-auto animate-pulse">
        <div className="pt-2 space-y-2">
          <div className="h-9 w-56 bg-white/[0.06] rounded-xl" />
          <div className="h-4 w-36 bg-white/[0.04] rounded-lg" />
        </div>
        <div className="h-44 bg-white/[0.06] rounded-2xl" />
        <div className="h-56 bg-white/[0.06] rounded-2xl" />
        <div className="h-36 bg-white/[0.06] rounded-2xl" />
        <div className="h-48 bg-white/[0.06] rounded-2xl" />
      </div>
    )
  }

  return (
    <div className={`p-5 pb-28 space-y-5 max-w-lg mx-auto ${pageTransition.className}`} {...pullHandlers}>
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      <Confetti active={showAllDoneConfetti} />
      <StreakMilestone streak={streak} />

      {/* ═══════════════ HEADER CONTEXTUEL ═══════════════ */}
      <div className={`pt-2 flex items-start justify-between ${stagger[0].className}`} style={stagger[0].style}>
        <div>
          <h1 className="text-[#F5F5F3] text-[26px] font-extrabold tracking-tight leading-tight">
            {greeting.text} {greeting.emoji}
          </h1>
          <p className="text-white/35 text-sm mt-1 capitalize">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {/* Avatar avec glow */}
        <button
          onClick={() => navigate('/app/profil')}
          className="relative active:scale-95 transition-transform"
        >
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--color-primary,#FF6B2B)] to-[#FF9A6C] flex items-center justify-center shadow-lg"
               style={{ boxShadow: '0 0 20px rgba(255,107,43,0.3)' }}>
            {profil?.avatar_url ? (
              <img src={profil.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User size={20} className="text-white" />
            )}
          </div>
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full border-2 border-[var(--color-primary,#FF6B2B)]/30 animate-pulse" />
        </button>
      </div>

      {/* ═══════════════ STREAK BADGE ═══════════════ */}
      {streak > 1 && (
        <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B2B]/10 to-transparent border border-[#FF6B2B]/20 active:scale-[0.98] transition-transform ${stagger[1].className}`} style={stagger[1].style}>
          <Flame size={18} className="text-[#FF6B2B]" />
          <span className="text-[#FF6B2B] font-bold text-sm"><AnimatedNumber value={streak} duration={600} /> jours</span>
          <span className="text-white/40 text-xs">de suite — Continue comme ça !</span>
        </div>
      )}

      {/* ═══════════════ CHECK-IN QUOTIDIEN ═══════════════ */}
      {(!sommeilSaved || !humeurSaved) && (
        <div className={`space-y-3 ${stagger[2].className}`} style={stagger[2].style}>
          <p className="text-white/30 text-[10px] uppercase tracking-widest font-bold px-1">Check-in du jour</p>

          <div className="grid grid-cols-2 gap-3">
            {/* ── Widget Sommeil ── */}
            <div className={`rounded-2xl border p-4 transition-all duration-500 ${
              sommeilSaved
                ? 'bg-indigo-500/5 border-indigo-500/20'
                : 'bg-[#1E1E1E] border-white/[0.06]'
            }`}>
              {sommeilSaved ? (
                <div className="text-center py-2">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-2">
                    <Check size={20} className="text-indigo-400" />
                  </div>
                  <p className="text-indigo-300 text-sm font-bold">{sommeilInput}h</p>
                  <p className="text-indigo-300/50 text-[10px] mt-0.5">Sommeil enregistré</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Moon size={14} className="text-indigo-400" />
                    <p className="text-white/40 text-[10px] uppercase tracking-wider font-bold">Sommeil</p>
                  </div>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <button
                      onClick={() => setSommeilInput(v => Math.max(0, +(v - 0.5).toFixed(1)))}
                      className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.1] transition-all active:scale-90"
                    >
                      <Minus size={16} />
                    </button>
                    <div className="text-center min-w-[50px]">
                      <p className="text-[#F5F5F3] text-2xl font-black leading-none">{sommeilInput}</p>
                      <p className="text-white/25 text-[9px] mt-0.5">heures</p>
                    </div>
                    <button
                      onClick={() => setSommeilInput(v => Math.min(14, +(v + 0.5).toFixed(1)))}
                      className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.1] transition-all active:scale-90"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <button
                    onClick={saveSommeil}
                    disabled={sommeilSaving}
                    className="w-full py-2 rounded-xl bg-indigo-500/20 text-indigo-300 text-xs font-bold hover:bg-indigo-500/30 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {sommeilSaving ? '...' : 'Valider'}
                  </button>
                </>
              )}
            </div>

            {/* ── Widget Humeur ── */}
            <div className={`rounded-2xl border p-4 transition-all duration-500 ${
              humeurSaved
                ? 'bg-yellow-500/5 border-yellow-500/20'
                : 'bg-[#1E1E1E] border-white/[0.06]'
            }`}>
              {humeurSaved ? (
                <div className="text-center py-2">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-2">
                    <Check size={20} className="text-yellow-400" />
                  </div>
                  <p className="text-yellow-300 text-sm font-bold">
                    {['😞', '😕', '😐', '🙂', '😄'][Math.min(4, Math.max(0, Math.round((humeurInput || 5) / 2) - 1))]}
                  </p>
                  <p className="text-yellow-300/50 text-[10px] mt-0.5">Humeur enregistrée</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Smile size={14} className="text-yellow-400" />
                    <p className="text-white/40 text-[10px] uppercase tracking-wider font-bold">Humeur</p>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mb-3">
                    {[
                      { emoji: '😞', score: 2, label: 'Mal' },
                      { emoji: '😕', score: 4, label: 'Bof' },
                      { emoji: '😐', score: 6, label: 'Ok' },
                      { emoji: '🙂', score: 8, label: 'Bien' },
                      { emoji: '😄', score: 10, label: 'Top' },
                    ].map(({ emoji, score, label }) => (
                      <button
                        key={score}
                        onClick={() => saveHumeur(score)}
                        disabled={humeurSaving}
                        className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all active:scale-90 ${
                          humeurInput === score
                            ? 'bg-yellow-500/20 scale-110'
                            : 'hover:bg-white/[0.06]'
                        }`}
                      >
                        <span className="text-xl leading-none">{emoji}</span>
                        <span className="text-[8px] text-white/25 font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ ALERTE FORMULAIRE ═══════════════ */}
      {formsPending > 0 && (
        <button
          onClick={() => navigate('/app/formulaires')}
          className={`w-full flex items-center gap-3.5 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-amber-600/5 border border-amber-500/20 active:scale-[0.98] transition-transform ${stagger[3].className}`}
          style={stagger[3].style}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 relative">
            <ClipboardList size={20} className="text-amber-400" />
            {/* Pulse indicator */}
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-amber-300 font-semibold text-sm">
              <AnimatedNumber value={formsPending} duration={400} /> bilan{formsPending > 1 ? 's' : ''} en attente
            </p>
            <p className="text-amber-300/50 text-xs mt-0.5">
              Ton coach a besoin de ton retour
            </p>
          </div>
          <ChevronRight size={18} className="text-amber-400/50" />
        </button>
      )}

      {/* ═══════════════ SÉANCE DU JOUR ═══════════════ */}
      {seanceDuJour ? (
        <div className={`relative overflow-hidden rounded-2xl border ${
          seanceDuJour.is_completed
            ? 'bg-gradient-to-br from-emerald-500/10 via-[#1E1E1E] to-[#1E1E1E] border-emerald-500/15'
            : 'bg-gradient-to-br from-[var(--color-primary,#FF6B2B)]/15 via-[#1E1E1E] to-[#1E1E1E] border-[var(--color-primary,#FF6B2B)]/20'
        } ${stagger[4].className}`} style={stagger[4].style}>
          {/* Background decoration */}
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-8 translate-x-8 blur-2xl ${
            seanceDuJour.is_completed ? 'bg-emerald-500/5' : 'bg-[var(--color-primary,#FF6B2B)]/5'
          }`} />

          <div className="relative p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Dumbbell size={14} className={seanceDuJour.is_completed ? 'text-emerald-400' : 'text-[var(--color-primary,#FF6B2B)]'} />
                <p className={`text-[11px] uppercase tracking-widest font-bold ${
                  seanceDuJour.is_completed ? 'text-emerald-400' : 'text-[var(--color-primary,#FF6B2B)]'
                }`}>
                  Séance du jour
                </p>
              </div>
              {seanceDuJour.is_completed && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                  <Check size={10} strokeWidth={3} />
                  Terminée
                </span>
              )}
            </div>

            <h2 className="text-[#F5F5F3] text-xl font-bold mb-1">{seanceDuJour.titre}</h2>

            {seanceExos.length > 0 && (
              <p className="text-white/30 text-xs mb-4">
                {seanceExos.length} exercice{seanceExos.length > 1 ? 's' : ''}
              </p>
            )}

            {/* Liste exercices (max 3 preview) */}
            {seanceExos.length > 0 && !seanceDuJour.is_completed && (
              <div className="space-y-2 mb-5">
                {seanceExos.slice(0, 3).map((exo) => (
                  <div key={exo.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-white/[0.04]">
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-primary,#FF6B2B)]/10 flex items-center justify-center flex-shrink-0">
                      <Dumbbell size={14} className="text-[var(--color-primary,#FF6B2B)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#F5F5F3] text-sm font-medium truncate">{exo.nom}</p>
                      <p className="text-white/30 text-[11px]">
                        {exo.series && `${exo.series}×`}{exo.repetitions && `${exo.repetitions}`}
                        {exo.poids ? ` · ${exo.poids}kg` : ''}
                      </p>
                    </div>
                  </div>
                ))}
                {seanceExos.length > 3 && (
                  <p className="text-white/25 text-xs text-center">
                    +{seanceExos.length - 3} autre{seanceExos.length - 3 > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {/* CTA Button — conditionnel selon l'état */}
            {seanceDuJour.is_completed ? (
              <button
                onClick={() => navigate(`/app/workout/${seanceDuJour.id}`)}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 hover:bg-emerald-500/15 active:scale-[0.98] transition-all duration-200"
              >
                <CheckCircle2 size={16} />
                SÉANCE TERMINÉE — VOIR LE RÉSUMÉ
              </button>
            ) : (
              <button
                onClick={() => navigate(`/app/workout/${seanceDuJour.id}`)}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide text-white active:scale-95 transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary, #FF6B2B), #FF9A6C)',
                  boxShadow: '0 4px 20px rgba(255,107,43,0.35)',
                }}
              >
                <Play size={16} className="fill-white" />
                COMMENCER L'ENTRAÎNEMENT
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`rounded-2xl bg-[#1E1E1E] border border-white/[0.06] p-5 text-center ${stagger[4].className}`} style={stagger[4].style}>
          <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
            <Dumbbell size={22} className="text-white/20" />
          </div>
          <p className="text-white/40 text-sm font-medium">Pas de séance aujourd'hui</p>
          <p className="text-white/20 text-xs mt-1">Profite de ta journée de repos 💪</p>
        </div>
      )}

      {/* ═══════════════ SCORE BIEN-ÊTRE ═══════════════ */}
      <div className={`rounded-2xl bg-[#1E1E1E] border border-white/[0.06] p-5 ${stagger[5].className}`} style={stagger[5].style}>
        <div className="flex items-center gap-5">
          <ScoreGauge score={score} couleur={couleur} />
          <div className="flex-1 min-w-0">
            <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-1">Score bien-être</p>
            <p className="text-2xl font-extrabold" style={{ color: couleur }}>{label}</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Moon size={13} className="text-indigo-400 flex-shrink-0" />
                <span className="text-white/35 text-xs">
                  {sommeil ? `${sommeil.heures}h · qualité ${sommeil.qualite}/5` : 'Non renseigné'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Smile size={13} className="text-yellow-400 flex-shrink-0" />
                <span className="text-white/35 text-xs">
                  Humeur {humeur ? `${humeur.score}/10` : 'non renseignée'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={13} className="text-green-400 flex-shrink-0" />
                <span className="text-white/35 text-xs">
                  {sport ? `Activité · intensité ${sport.intensite}/5` : 'Pas d\'activité'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ HABITUDES DU JOUR ═══════════════ */}
      <div className={`rounded-2xl bg-[#1E1E1E] border border-white/[0.06] p-5 ${stagger[6].className}`} style={stagger[6].style}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[var(--color-primary,#FF6B2B)]" />
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
              Habitudes du jour
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04]">
            {cochees > 0 && cochees === totalHab && <Flame size={12} className="text-[var(--color-primary,#FF6B2B)]" />}
            <span className="text-[var(--color-primary,#FF6B2B)] text-xs font-bold"><AnimatedNumber value={cochees} duration={400} />/{totalHab}</span>
          </div>
        </div>

        {habitudes.length === 0 ? (
          <p className="text-white/25 text-sm text-center py-6">Aucune habitude assignée pour l'instant.</p>
        ) : (
          <div className="space-y-2.5">
            {habitudes.map((h) => {
              const fait = logAujourdhui.includes(h.id)
              const accentColor = h.couleur ?? 'var(--color-primary, #FF6B2B)'
              return (
                <button
                  key={h.id}
                  onClick={() => toggleHabitude(h.id)}
                  disabled={toggling === h.id}
                  className={`flex items-center gap-3.5 w-full text-left py-3.5 px-4 rounded-xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50 border ${
                    fait
                      ? 'bg-white/[0.03] border-white/[0.06]'
                      : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'
                  }`}
                >
                  {fait ? (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                         style={{ backgroundColor: `${accentColor}20` }}>
                      <CheckCircle2 size={18} style={{ color: accentColor }} />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                      <Circle size={18} className="text-white/20" />
                    </div>
                  )}
                  <span className={`text-sm font-medium flex-1 ${fait ? 'text-white/30 line-through' : 'text-[#F5F5F3]'}`}>
                    {h.nom}
                  </span>
                  {h.assigned_by && (
                    <span className="text-[9px] text-[var(--color-primary,#FF6B2B)]/70 bg-[var(--color-primary,#FF6B2B)]/10 px-2 py-0.5 rounded-full flex-shrink-0 font-semibold uppercase tracking-wider">
                      Coach
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Progress bar */}
        {totalHab > 0 && (
          <div className="mt-4 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.round((cochees / totalHab) * 100)}%`,
                background: `linear-gradient(90deg, ${couleurScore(Math.round((cochees / totalHab) * 100))}, ${couleurScore(Math.round((cochees / totalHab) * 100))}90)`,
              }}
            />
          </div>
        )}
      </div>

      {/* ═══════════════ MES PROGRAMMES (Sport + Nutrition) ═══════════════ */}
      {(programme || nutritionPlan) && (
        <div className={`space-y-3 ${stagger[7].className}`} style={stagger[7].style}>
          <p className="text-white/30 text-[10px] uppercase tracking-widest font-bold px-1">Mes programmes</p>

          <div className={`grid gap-3 ${programme && nutritionPlan ? 'grid-cols-1' : 'grid-cols-1'}`}>

            {/* ── Carte Programme Sport ── */}
            {programme && (
              <button
                onClick={() => navigate('/app/programme')}
                className="w-full rounded-2xl bg-[#1E1E1E] border border-white/[0.06] p-5 text-left active:scale-[0.98] transition-transform relative overflow-hidden"
              >
                {/* Gradient accent */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[var(--color-primary,#FF6B2B)] via-[#FF9A6C] to-transparent" />

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[var(--color-primary,#FF6B2B)]/10 flex items-center justify-center flex-shrink-0">
                      <Trophy size={16} className="text-[var(--color-primary,#FF6B2B)]" />
                    </div>
                    <div>
                      <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Programme Sport</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-white/20" />
                </div>

                <p className="text-[#F5F5F3] font-bold text-base mb-1">{programme.programmes?.titre}</p>
                <p className="text-white/30 text-xs mb-3">
                  Phase {programme.phase_actuelle}/{programmePhases.length}
                  {programmePhases[programme.phase_actuelle - 1] && (
                    <> — {programmePhases[programme.phase_actuelle - 1].titre}</>
                  )}
                </p>

                {/* Phase indicators */}
                {programmePhases.length > 0 && (
                  <div className="flex gap-1.5 mb-3">
                    {programmePhases.map((ph, i) => (
                      <div
                        key={ph.id}
                        className="h-2 rounded-full flex-1 transition-all"
                        style={{
                          backgroundColor: i < programme.phase_actuelle
                            ? 'var(--color-primary, #FF6B2B)'
                            : 'rgba(255,255,255,0.06)',
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Séances progression */}
                {progSeances.total > 0 && (
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.round((progSeances.done / progSeances.total) * 100)}%`,
                          background: 'linear-gradient(90deg, var(--color-primary, #FF6B2B), #FF9A6C)',
                        }}
                      />
                    </div>
                    <span className="text-white/30 text-[10px] font-medium flex-shrink-0">
                      {progSeances.done}/{progSeances.total} séances
                    </span>
                  </div>
                )}
              </button>
            )}

            {/* ── Carte Plan Nutrition ── */}
            {nutritionPlan && (
              <button
                onClick={() => navigate('/app/programme')}
                className="w-full rounded-2xl bg-[#1E1E1E] border border-white/[0.06] p-5 text-left active:scale-[0.98] transition-transform relative overflow-hidden"
              >
                {/* Gradient accent vert */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 via-emerald-400 to-transparent" />

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed size={16} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Plan Nutrition</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-white/20" />
                </div>

                <p className="text-[#F5F5F3] font-bold text-base mb-1">{nutritionPlan.nom}</p>
                <p className="text-white/30 text-xs mb-3">
                  {nutriRepasCount} repas{nutriRepasCount > 1 ? '' : ''}
                  {nutritionPlan.duree_semaines && ` · ${nutritionPlan.duree_semaines} semaines`}
                </p>

                {/* Semaines progression */}
                {nutritionPlan.duree_semaines > 0 && (
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.round((nutriWeeksDone / nutritionPlan.duree_semaines) * 100)}%`,
                          background: 'linear-gradient(90deg, #22c55e, #4ADE80)',
                        }}
                      />
                    </div>
                    <span className="text-white/30 text-[10px] font-medium flex-shrink-0">
                      {nutriWeeksDone}/{nutritionPlan.duree_semaines} sem.
                    </span>
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ NUTRITION DU JOUR ═══════════════ */}
      {nutriMacros && nutriRepas.length > 0 && (
        <div className={`rounded-2xl bg-[#1E1E1E] border border-white/[0.06] p-5 ${stagger[8].className}`} style={stagger[8].style}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UtensilsCrossed size={14} className="text-emerald-400" />
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Nutrition du jour</p>
            </div>
            <button
              onClick={() => navigate('/app/programme')}
              className="text-emerald-400/60 text-[10px] font-semibold hover:text-emerald-400 transition-colors"
            >
              Voir le plan →
            </button>
          </div>

          {/* Macros résumé */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Calories', value: nutriMacros.kcal, unit: 'kcal', color: '#FF6B2B' },
              { label: 'Protéines', value: nutriMacros.prot, unit: 'g', color: '#3b82f6' },
              { label: 'Glucides', value: nutriMacros.gluc, unit: 'g', color: '#f59e0b' },
              { label: 'Lipides', value: nutriMacros.lip, unit: 'g', color: '#22c55e' },
            ].map((m, i) => (
              <div key={i} className="text-center py-2.5 px-1 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                <p className="text-[#F5F5F3] text-sm font-bold leading-none">{m.value}</p>
                <p className="text-[9px] font-medium mt-0.5" style={{ color: `${m.color}90` }}>{m.unit}</p>
                <p className="text-white/20 text-[8px] mt-1">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Liste des repas */}
          <div className="space-y-2">
            {(() => {
              const typeLabels = { petit_dej: 'Petit-déjeuner', dejeuner: 'Déjeuner', diner: 'Dîner', collation: 'Collation' }
              const typeEmojis = { petit_dej: '🌅', dejeuner: '☀️', diner: '🌙', collation: '🍎' }
              return nutriRepas.map((repas, i) => {
                const nbAliments = repas.repas_aliments?.length || 0
                return (
                  <div key={repas.id || i} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-base">{typeEmojis[repas.type] || '🍽️'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#F5F5F3] text-sm font-medium">{typeLabels[repas.type] || repas.type}</p>
                      <p className="text-white/25 text-[11px]">{nbAliments} aliment{nbAliments > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* ═══════════════ GRAPHIQUE 7 JOURS — REFONDU ═══════════════ */}
      <div className={`rounded-2xl bg-[#1E1E1E] border border-white/[0.06] p-5 ${stagger[9].className}`} style={stagger[9].style}>
        {/* Header avec tendance */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-[var(--color-primary,#FF6B2B)]" />
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Score bien-être</p>
          </div>
          {trendDiff !== null && trendDiff !== 0 && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
              trendDiff > 0
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            }`}>
              {trendDiff > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {trendDiff > 0 ? '+' : ''}{trendDiff} pts
            </div>
          )}
        </div>

        {/* Sous-titre */}
        <p className="text-white/20 text-[11px] mb-4">
          Évolution sur les 7 derniers jours
          {currentWeekAvg !== null && <> · Moy. <span className="text-white/40 font-semibold">{currentWeekAvg}/100</span></>}
        </p>

        {weekData.some(d => d.score > 0) ? (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={weekData} margin={{ top: 5, right: 0, left: -28, bottom: 0 }}>
              <XAxis
                dataKey="jour"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'rgba(255,255,255,0.15)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                ticks={[0, 50, 100]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)', radius: 8 }} />
              <Bar
                dataKey="score"
                radius={[8, 8, 2, 2]}
                maxBarSize={34}
              >
                {weekData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill="var(--color-primary, #FF6B2B)"
                    fillOpacity={index === weekData.length - 1 ? 1 : 0.45}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="py-8 text-center">
            <Sparkles size={24} className="text-white/10 mx-auto mb-2" />
            <p className="text-white/25 text-sm">
              Commence à renseigner tes données pour voir l'évolution
            </p>
          </div>
        )}
      </div>

      {/* ═══════════════ PROCHAINE ÉTAPE ═══════════════ */}
      {nextStep && (
        <button
          onClick={nextStep.action || undefined}
          className={`w-full rounded-2xl border p-4 text-left active:scale-[0.98] transition-all ${stagger[10].className}`}
          style={{
            ...stagger[10].style,
            background: `linear-gradient(135deg, ${nextStep.color}08, ${nextStep.color}03)`,
            borderColor: `${nextStep.color}18`,
          }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${nextStep.color}15` }}
            >
              <nextStep.icon size={20} style={{ color: nextStep.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color: `${nextStep.color}90` }}>
                Prochaine étape
              </p>
              <p className="text-[#F5F5F3] text-sm font-bold">{nextStep.label}</p>
              <p className="text-white/30 text-xs mt-0.5 truncate">{nextStep.sub}</p>
            </div>
            <ChevronRight size={16} style={{ color: `${nextStep.color}50` }} />
          </div>
        </button>
      )}

    </div>
  )
}
