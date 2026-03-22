import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { calculerScoreBienEtre, couleurScore, labelScore } from '../../utils/wellbeing'
import { Card, CardBody } from '../../components/ui/Card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { CheckCircle2, Circle, AlertTriangle, Flame, Layers, Dumbbell, Check } from 'lucide-react'
import { Confetti, StreakMilestone } from '../../components/ui/Confetti'

// ── Jauge circulaire SVG pour le score bien-être ──
function ScoreGauge({ score, couleur }) {
  const r = 42
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" className="flex-shrink-0">
      <circle cx="55" cy="55" r={r} fill="none" stroke="#2A2A2A" strokeWidth="10" />
      <circle
        cx="55" cy="55" r={r}
        fill="none"
        stroke={couleur}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 55 55)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="55" y="51" textAnchor="middle" fill="#F5F5F3" fontSize="24" fontWeight="bold" fontFamily="-apple-system,sans-serif">{score}</text>
      <text x="55" y="66" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="-apple-system,sans-serif">/100</text>
    </svg>
  )
}

// ── Tooltip custom pour le graphique ──
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-3 py-2 text-sm">
      <p className="text-white/50 text-xs mb-0.5">{label}</p>
      <p className="text-[#F5F5F3] font-semibold">{payload[0].value}/100</p>
    </div>
  )
}

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export default function DashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [profil, setProfil] = useState(null)
  const [habitudes, setHabitudes] = useState([])
  const [logAujourdhui, setLogAujourdhui] = useState([])
  const [tachesUrgentes, setTachesUrgentes] = useState([])
  const [tachesProgramme, setTachesProgramme] = useState([])
  const [sommeil, setSommeil] = useState(null)
  const [humeur, setHumeur] = useState(null)
  const [sport, setSport] = useState(null)
  const [weekData, setWeekData] = useState([])
  const [toggling, setToggling] = useState(null)

  const [streak, setStreak] = useState(0)
  const [showAllDoneConfetti, setShowAllDoneConfetti] = useState(false)

  // Programme en cours
  const [programme, setProgramme] = useState(null)
  const [programmePhases, setProgrammePhases] = useState([])

  const today = new Date().toISOString().split('T')[0]

  // Charge les scores des 7 derniers jours pour le graphique
  const chargerComparatif = useCallback(async (clientId, totalHab) => {
    const il7jours = new Date()
    il7jours.setDate(il7jours.getDate() - 6)
    const dateMin = il7jours.toISOString().split('T')[0]

    const [logRes, sommeilRes, humeurRes, sportRes] = await Promise.all([
      supabase.from('habitudes_log').select('date').eq('client_id', clientId).gte('date', dateMin),
      supabase.from('sommeil_log').select('date, qualite').eq('client_id', clientId).gte('date', dateMin),
      supabase.from('humeur_log').select('date, score').eq('client_id', clientId).gte('date', dateMin),
      supabase.from('sport_log').select('date, intensite').eq('client_id', clientId).gte('date', dateMin),
    ])

    const logs = logRes.data ?? []
    const data = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const cochees = logs.filter(l => l.date === dateStr).length
      const score = calculerScoreBienEtre({
        habitudes: { cochees, total: totalHab },
        sommeil: (sommeilRes.data ?? []).find(s => s.date === dateStr) ?? null,
        humeur: (humeurRes.data ?? []).find(h => h.date === dateStr) ?? null,
        sport: (sportRes.data ?? []).find(s => s.date === dateStr) ?? null,
      })
      data.push({ jour: JOURS[d.getDay()], score })
    }
    setWeekData(data)
  }, [])

  // Charge toutes les données du dashboard
  const chargerDonnees = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [profilRes, habsRes, logRes, tachesRes, sommeilRes, humeurRes, sportRes] = await Promise.all([
      supabase.from('profiles').select('nom').eq('id', user.id).single(),
      supabase.from('habitudes').select('id, nom, couleur, assigned_by').eq('client_id', user.id).eq('actif', true).order('created_at'),
      supabase.from('habitudes_log').select('habitude_id').eq('client_id', user.id).eq('date', today),
      supabase.from('taches').select('*').eq('client_id', user.id).eq('statut', 'en_cours').eq('priorite', 'urgent').order('echeance', { ascending: true }),
      supabase.from('sommeil_log').select('*').eq('client_id', user.id).eq('date', today).maybeSingle(),
      supabase.from('humeur_log').select('*').eq('client_id', user.id).eq('date', today).maybeSingle(),
      supabase.from('sport_log').select('*').eq('client_id', user.id).eq('date', today).maybeSingle(),
    ])

    const habs = habsRes.data ?? []
    setProfil(profilRes.data)
    setHabitudes(habs)
    setLogAujourdhui((logRes.data ?? []).map(l => l.habitude_id))
    setTachesUrgentes(tachesRes.data ?? [])

    // Charger les tâches du programme (exercices générés automatiquement)
    const { data: tachesProgData } = await supabase
      .from('taches')
      .select('*')
      .eq('client_id', user.id)
      .eq('statut', 'en_cours')
      .not('programme_id', 'is', null)
      .order('created_at')
    setTachesProgramme(tachesProgData ?? [])
    setSommeil(sommeilRes.data ?? null)
    setHumeur(humeurRes.data ?? null)
    setSport(sportRes.data ?? null)

    await chargerComparatif(user.id, habs.length)

    // Calcule le streak (jours consécutifs avec au moins 1 habitude cochée)
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
        else if (i === 0) { continue } // aujourd'hui pas encore rempli = ok
        else { break }
      }
      setStreak(s)
    }

    // Charge le programme en cours
    const { data: assignData } = await supabase
      .from('programme_assignations')
      .select('*, programmes(titre, duree_semaines)')
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
    }

    setLoading(false)
  }, [user, today, chargerComparatif])

  useEffect(() => { chargerDonnees() }, [chargerDonnees])

  // Coche ou décoche une habitude pour aujourd'hui
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
        // Confetti si toutes les habitudes sont cochées !
        if (next.length === habitudes.length && habitudes.length > 0) {
          setShowAllDoneConfetti(false)
          setTimeout(() => setShowAllDoneConfetti(true), 50)
        }
        return next
      })
    }
    setToggling(null)
  }

  const cochees = logAujourdhui.length
  const totalHab = habitudes.length
  const score = calculerScoreBienEtre({ habitudes: { cochees, total: totalHab }, sommeil, humeur, sport })
  const couleur = couleurScore(score)
  const label = labelScore(score)

  // ── Skeleton de chargement ──
  if (loading) {
    return (
      <div className="p-4 space-y-4 max-w-2xl animate-pulse">
        <div className="pt-4 space-y-2">
          <div className="h-7 w-52 bg-[#2A2A2A] rounded-lg" />
          <div className="h-4 w-40 bg-[#2A2A2A] rounded" />
        </div>
        <div className="h-36 bg-[#2A2A2A] rounded-xl" />
        <div className="h-52 bg-[#2A2A2A] rounded-xl" />
        <div className="h-40 bg-[#2A2A2A] rounded-xl" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <Confetti active={showAllDoneConfetti} />
      <StreakMilestone streak={streak} />

      {/* ── En-tête ── */}
      <div className="pt-4">
        <h1 className="text-[#F5F5F3] text-xl font-bold">
          Bonjour {profil?.nom ?? ''} 👋
        </h1>
        <p className="text-white/40 text-sm mt-0.5 capitalize">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* ── Score bien-être ── */}
      <Card>
        <CardBody className="flex items-center gap-5">
          <ScoreGauge score={score} couleur={couleur} />
          <div className="flex-1 min-w-0">
            <p className="text-white/40 text-[11px] uppercase tracking-wider">Score bien-être</p>
            <p className="text-2xl font-bold mt-0.5" style={{ color: couleur }}>{label}</p>
            <div className="mt-2 space-y-1">
              <p className="text-white/30 text-xs">🏃 {cochees}/{totalHab} habitudes</p>
              <p className="text-white/30 text-xs">
                🌙 {sommeil ? `${sommeil.heures}h · qualité ${sommeil.qualite}/5` : 'Sommeil non renseigné'}
              </p>
              <p className="text-white/30 text-xs">
                💭 Humeur {humeur ? `${humeur.score}/10` : 'non renseignée'}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Habitudes du jour ── */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/40 text-[11px] uppercase tracking-wider">Habitudes du jour</p>
            <div className="flex items-center gap-1.5">
              {cochees > 0 && cochees === totalHab && <Flame size={13} className="text-[#FF6B2B]" />}
              <span className="text-[#FF6B2B] text-xs font-semibold">{cochees}/{totalHab}</span>
            </div>
          </div>

          {habitudes.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">Aucune habitude assignée pour l'instant.</p>
          ) : (
            <ul className="space-y-1">
              {habitudes.map((h) => {
                const fait = logAujourdhui.includes(h.id)
                return (
                  <li key={h.id}>
                    <button
                      onClick={() => toggleHabitude(h.id)}
                      disabled={toggling === h.id}
                      className="flex items-center gap-3 w-full text-left py-2 px-1 rounded-lg hover:bg-white/[0.03] transition-colors group disabled:opacity-50"
                    >
                      {fait
                        ? <CheckCircle2 size={19} style={{ color: h.couleur ?? '#FF6B2B' }} className="flex-shrink-0" />
                        : <Circle size={19} className="text-white/20 group-hover:text-white/40 flex-shrink-0 transition-colors" />
                      }
                      <span className={`text-sm flex-1 ${fait ? 'text-white/35 line-through' : 'text-[#F5F5F3]'}`}>
                        {h.nom}
                      </span>
                      {h.assigned_by && (
                        <span className="text-[10px] text-[#FF6B2B]/70 bg-[#FF6B2B]/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          Coach
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Barre de progression globale */}
          {totalHab > 0 && (
            <div className="mt-3 h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.round((cochees / totalHab) * 100)}%`,
                  backgroundColor: couleurScore(Math.round((cochees / totalHab) * 100)),
                }}
              />
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── Tâches urgentes ── */}
      {tachesUrgentes.length > 0 && (
        <Card className="border-red-500/20">
          <CardBody>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={13} className="text-red-400" />
              <p className="text-red-400 text-[11px] uppercase tracking-wider font-semibold">
                {tachesUrgentes.length} tâche{tachesUrgentes.length > 1 ? 's' : ''} urgente{tachesUrgentes.length > 1 ? 's' : ''}
              </p>
            </div>
            <ul className="space-y-2">
              {tachesUrgentes.map((t) => (
                <li key={t.id} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-[#F5F5F3] text-sm">{t.titre}</p>
                    {t.echeance && (
                      <p className="text-white/30 text-xs mt-0.5">
                        Échéance : {new Date(t.echeance).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* ── Exercices du programme ── */}
      {tachesProgramme.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell size={13} className="text-[#FF6B2B]" />
              <p className="text-white/40 text-[11px] uppercase tracking-wider">
                Exercices du programme
              </p>
              <span className="text-[#FF6B2B] text-xs font-semibold ml-auto">
                {tachesProgramme.length}
              </span>
            </div>
            <ul className="space-y-1.5">
              {tachesProgramme.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-1.5 px-1 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <div className="w-5 h-5 rounded-md bg-[#FF6B2B]/10 flex items-center justify-center flex-shrink-0">
                    <Dumbbell size={11} className="text-[#FF6B2B]" />
                  </div>
                  <span className="text-[#F5F5F3] text-sm flex-1">{t.titre}</span>
                  <span className="text-[10px] text-[#FF6B2B]/70 bg-[#FF6B2B]/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    Programme
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* ── Mon programme ── */}
      {programme && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-2 mb-3">
              <Layers size={14} className="text-[#FF6B2B]" />
              <p className="text-white/40 text-[11px] uppercase tracking-wider">Mon programme</p>
            </div>
            <p className="text-[#F5F5F3] font-semibold text-sm mb-1">{programme.programmes?.titre}</p>
            <p className="text-white/30 text-xs mb-3">
              Phase {programme.phase_actuelle}/{programmePhases.length}
              {programmePhases[programme.phase_actuelle - 1] && (
                <> — {programmePhases[programme.phase_actuelle - 1].titre}</>
              )}
            </p>
            {/* Barre de progression des phases */}
            <div className="flex gap-1">
              {programmePhases.map((ph, i) => (
                <div
                  key={ph.id}
                  className="h-2 rounded-full flex-1 transition-all"
                  style={{
                    backgroundColor: i < programme.phase_actuelle ? '#FF6B2B' : 'rgba(255,255,255,0.08)',
                  }}
                />
              ))}
            </div>
            <p className="text-white/20 text-xs mt-2">
              {Math.round((programme.phase_actuelle / programmePhases.length) * 100)}% du programme complété
            </p>
          </CardBody>
        </Card>
      )}

      {/* ── Graphique 7 jours ── */}
      <Card>
        <CardBody>
          <p className="text-white/40 text-[11px] uppercase tracking-wider mb-4">Évolution 7 jours</p>
          {weekData.some(d => d.score > 0) ? (
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={weekData} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                <XAxis dataKey="jour" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} ticks={[0, 50, 100]} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="score" fill="#FF6B2B" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-white/30 text-sm py-6 text-center">
              Commence à renseigner tes données pour voir l'évolution ✨
            </p>
          )}
        </CardBody>
      </Card>

    </div>
  )
}
