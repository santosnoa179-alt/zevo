import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { calculerScoreBienEtre, couleurScore } from '../../utils/wellbeing'
import { Card, CardBody } from '../../components/ui/Card'
import { AlertTriangle, Users, TrendingDown, UserPlus, MessageSquare, ChevronRight } from 'lucide-react'

// Initiales d'un nom (ex: "Lucas Martin" → "LM")
function Initiales({ nom, couleur }) {
  const parts = (nom ?? '?').trim().split(' ')
  const initiales = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : (nom ?? '?')[0]
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
      style={{ backgroundColor: couleur ?? '#FF6B2B' }}
    >
      {initiales.toUpperCase()}
    </div>
  )
}

// Mini barre de score colorée
function ScoreBarre({ score }) {
  const couleur = couleurScore(score)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: couleur }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right" style={{ color: couleur }}>{score}</span>
    </div>
  )
}

// Calcule si un client est en décrochage (aucune activité depuis 3 jours)
function estEnDecrochage(logs, clientId) {
  const maintenant = new Date()
  for (let i = 1; i <= 3; i++) {
    const d = new Date(maintenant)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    if (logs.some(l => l.client_id === clientId && l.date === dateStr)) return false
  }
  return true
}

const COULEURS_AVATAR = ['#FF6B2B', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6']

export default function CoachDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState([])
  const [stats, setStats] = useState({ actifs: 0, decrochage: 0, nouveaux: 0, mrr: 0 })

  const chargerDonnees = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Charge les clients du coach avec leur profil
    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, created_at, actif, profiles(nom, email)')
      .eq('coach_id', user.id)
      .eq('actif', true)
      .order('created_at', { ascending: false })

    if (!clientsData?.length) {
      setLoading(false)
      return
    }

    const clientIds = clientsData.map(c => c.id)

    // Charge les 7 derniers jours de logs pour tous les clients
    const il7j = new Date()
    il7j.setDate(il7j.getDate() - 7)
    const dateMin = il7j.toISOString().split('T')[0]

    const [logsRes, habsRes, sommeilRes, humeurRes, sportRes, coachRes] = await Promise.all([
      supabase.from('habitudes_log').select('client_id, date').in('client_id', clientIds).gte('date', dateMin),
      supabase.from('habitudes').select('id, client_id').in('client_id', clientIds).eq('actif', true),
      supabase.from('sommeil_log').select('client_id, date, qualite').in('client_id', clientIds).gte('date', dateMin),
      supabase.from('humeur_log').select('client_id, date, score').in('client_id', clientIds).gte('date', dateMin),
      supabase.from('sport_log').select('client_id, date, intensite').in('client_id', clientIds).gte('date', dateMin),
      supabase.from('coaches').select('plan, abonnement_actif').eq('id', user.id).single(),
    ])

    const logs = logsRes.data ?? []
    const habs = habsRes.data ?? []
    const sommeils = sommeilRes.data ?? []
    const humeurs = humeurRes.data ?? []
    const sports = sportRes.data ?? []
    const today = new Date().toISOString().split('T')[0]

    // Calcule le score bien-être du jour pour chaque client
    const enrichis = clientsData.map((c, idx) => {
      const clientHabs = habs.filter(h => h.client_id === c.id)
      const cochees = logs.filter(l => l.client_id === c.id && l.date === today).length
      const sommeil = sommeils.find(s => s.client_id === c.id && s.date === today) ?? null
      const humeur = humeurs.find(h => h.client_id === c.id && h.date === today) ?? null
      const sport = sports.find(s => s.client_id === c.id && s.date === today) ?? null

      const score = calculerScoreBienEtre({
        habitudes: { cochees, total: clientHabs.length },
        sommeil,
        humeur,
        sport,
      })

      // Dernière activité = dernier log disponible
      const logsClient = logs.filter(l => l.client_id === c.id).sort((a, b) => b.date.localeCompare(a.date))
      const derniereActivite = logsClient[0]?.date ?? null

      // Streak actuel (jours consécutifs)
      let streak = 0
      for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const ds = d.toISOString().split('T')[0]
        if (logs.some(l => l.client_id === c.id && l.date === ds)) { streak++ }
        else if (i === 0) { continue }
        else { break }
      }

      return {
        ...c,
        score,
        streak,
        derniereActivite,
        decrochage: estEnDecrochage(logs, c.id),
        couleurAvatar: COULEURS_AVATAR[idx % COULEURS_AVATAR.length],
      }
    })

    // Trie : décrochage en premier, puis par score asc
    enrichis.sort((a, b) => {
      if (a.decrochage && !b.decrochage) return -1
      if (!a.decrochage && b.decrochage) return 1
      return a.score - b.score
    })

    setClients(enrichis)

    // Calcul stats MRR selon plan
    const planPrix = { starter: 49, pro: 99, unlimited: 149 }
    const plan = coachRes.data?.plan ?? 'starter'
    const actif = coachRes.data?.abonnement_actif ?? false

    // Nouveaux clients ce mois
    const debutMois = new Date()
    debutMois.setDate(1)
    const nouveaux = clientsData.filter(c => new Date(c.created_at) >= debutMois).length
    const decrochage = enrichis.filter(c => c.decrochage).length

    setStats({
      actifs: clientsData.length,
      decrochage,
      nouveaux,
      mrr: actif ? planPrix[plan] : 0,
    })

    setLoading(false)
  }, [user])

  useEffect(() => { chargerDonnees() }, [chargerDonnees])

  const envoyerMessage = (clientId, e) => {
    e.stopPropagation()
    navigate(`/coach/messages?client=${clientId}`)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl animate-pulse">
        <div className="h-8 w-48 bg-[#2A2A2A] rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-[#2A2A2A] rounded-xl" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-[#2A2A2A] rounded-xl" />)}
        </div>
      </div>
    )
  }

  const alertes = clients.filter(c => c.decrochage)

  return (
    <div className="p-6 max-w-5xl space-y-6">

      {/* ── En-tête ── */}
      <div>
        <h1 className="text-[#F5F5F3] text-2xl font-bold">Dashboard</h1>
        <p className="text-white/40 text-sm mt-0.5">Vue d'ensemble de tes clients</p>
      </div>

      {/* ── 4 cartes stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex items-start gap-3">
            <div className="p-2 bg-[#FF6B2B]/10 rounded-lg">
              <Users size={16} className="text-[#FF6B2B]" />
            </div>
            <div>
              <p className="text-white/40 text-xs">Clients actifs</p>
              <p className="text-[#F5F5F3] text-2xl font-bold mt-0.5">{stats.actifs}</p>
            </div>
          </CardBody>
        </Card>

        <Card className={stats.decrochage > 0 ? 'border-red-500/30' : ''}>
          <CardBody className="flex items-start gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <TrendingDown size={16} className="text-red-400" />
            </div>
            <div>
              <p className="text-white/40 text-xs">En décrochage</p>
              <p className={`text-2xl font-bold mt-0.5 ${stats.decrochage > 0 ? 'text-red-400' : 'text-[#F5F5F3]'}`}>
                {stats.decrochage}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-start gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <UserPlus size={16} className="text-green-400" />
            </div>
            <div>
              <p className="text-white/40 text-xs">Nouveaux ce mois</p>
              <p className="text-[#F5F5F3] text-2xl font-bold mt-0.5">{stats.nouveaux}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-white/40 text-xs">MRR</p>
            <p className="text-[#F5F5F3] text-2xl font-bold mt-0.5">
              {stats.mrr > 0 ? `${stats.mrr}€` : '—'}
            </p>
            <p className="text-white/25 text-xs mt-1">mensuel</p>
          </CardBody>
        </Card>
      </div>

      {/* ── Alertes décrochage ── */}
      {alertes.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-white/50 text-xs uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle size={12} className="text-red-400" />
            Alertes décrochage
          </h2>
          {alertes.map((c) => (
            <Card key={c.id} className="border-red-500/20">
              <CardBody className="flex items-center gap-3 py-3">
                <Initiales nom={c.profiles?.nom} couleur={c.couleurAvatar} />
                <div className="flex-1 min-w-0">
                  <p className="text-[#F5F5F3] text-sm font-medium truncate">
                    {c.profiles?.nom ?? c.profiles?.email}
                  </p>
                  <p className="text-red-400/70 text-xs mt-0.5">
                    Aucune activité depuis 3+ jours · Score {c.score}/100
                  </p>
                </div>
                <button
                  onClick={(e) => envoyerMessage(c.id, e)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B2B]/10 text-[#FF6B2B] text-xs rounded-lg hover:bg-[#FF6B2B]/20 transition-colors flex-shrink-0"
                >
                  <MessageSquare size={12} />
                  Message
                </button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* ── Liste clients ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-white/50 text-xs uppercase tracking-wider">Tous les clients</h2>
          <button
            onClick={() => navigate('/coach/clients')}
            className="text-[#FF6B2B] text-xs hover:underline"
          >
            Voir tout →
          </button>
        </div>

        {clients.length === 0 ? (
          <Card>
            <CardBody className="text-center py-10">
              <Users size={32} className="text-white/15 mx-auto mb-3" />
              <p className="text-white/30 text-sm">Aucun client pour l'instant.</p>
              <button
                onClick={() => navigate('/coach/clients')}
                className="mt-3 text-[#FF6B2B] text-sm font-medium hover:underline"
              >
                + Inviter mon premier client
              </button>
            </CardBody>
          </Card>
        ) : (
          clients.slice(0, 8).map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:border-white/[0.14] transition-colors"
              onClick={() => navigate(`/coach/clients/${c.id}`)}
            >
              <CardBody className="flex items-center gap-3 py-3">
                <Initiales nom={c.profiles?.nom} couleur={c.couleurAvatar} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[#F5F5F3] text-sm font-medium truncate">
                      {c.profiles?.nom ?? c.profiles?.email}
                    </p>
                    {c.decrochage && (
                      <span className="text-[10px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        décrochage
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5">
                    <ScoreBarre score={c.score} />
                  </div>
                </div>

                {/* Streak + dernière activité */}
                <div className="text-right flex-shrink-0 space-y-1">
                  {c.streak > 0 && (
                    <p className="text-[#FF6B2B] text-xs font-semibold">🔥 {c.streak}j</p>
                  )}
                  <p className="text-white/25 text-[10px]">
                    {c.derniereActivite
                      ? new Date(c.derniereActivite).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                      : 'jamais'
                    }
                  </p>
                </div>

                <ChevronRight size={14} className="text-white/20 flex-shrink-0" />
              </CardBody>
            </Card>
          ))
        )}
      </div>

    </div>
  )
}
