import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import {
  Users, UserPlus, TrendingUp, DollarSign, Calendar,
  ChevronRight, MoreHorizontal, Flame, Eye, Target,
  BarChart3, Clock, MessageCircle, Zap
} from 'lucide-react'

// Couleurs avatar tournantes
const COULEURS_AVATAR = ['#FF6B2B', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6']

// Initiales
function initialesFrom(nom) {
  const parts = (nom ?? '?').trim().split(' ')
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : (nom ?? '?')[0].toUpperCase()
}

// Mini bar chart SVG (revenus)
function RevenueChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1)
  const barW = 36
  const gap = 16
  const chartH = 120
  const totalW = data.length * (barW + gap) - gap

  return (
    <div className="flex flex-col items-center">
      <svg width={totalW} height={chartH + 30} className="overflow-visible">
        {/* Lignes horizontales */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <line
            key={i}
            x1={0} y1={chartH * (1 - pct)}
            x2={totalW} y2={chartH * (1 - pct)}
            stroke="rgba(255,255,255,0.04)" strokeWidth={1}
          />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * chartH
          const x = i * (barW + gap)
          return (
            <g key={i}>
              {/* Barre */}
              <rect
                x={x} y={chartH - h}
                width={barW} height={h}
                rx={6}
                fill={d.highlight ? '#FF6B2B' : 'rgba(255,107,43,0.25)'}
              />
              {/* Valeur */}
              {d.value > 0 && (
                <text
                  x={x + barW / 2} y={chartH - h - 6}
                  textAnchor="middle" fill="rgba(245,245,243,0.5)"
                  fontSize={10} fontWeight={600}
                >
                  {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}K` : d.value}
                </text>
              )}
              {/* Label */}
              <text
                x={x + barW / 2} y={chartH + 18}
                textAnchor="middle" fill="rgba(255,255,255,0.3)"
                fontSize={11}
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function CoachDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [coachProfile, setCoachProfile] = useState(null)
  const [clients, setClients] = useState([])
  const [stats, setStats] = useState({ actifs: 0, prospects: 0, mrr: 0, nouveaux: 0 })

  const chargerDonnees = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [coachRes, clientsRes, prospectsRes] = await Promise.all([
      supabase.from('coaches').select('prenom, nom, plan, abonnement_actif').eq('id', user.id).maybeSingle(),
      supabase.from('clients').select('id, created_at, actif, profiles(nom, email)').eq('coach_id', user.id).eq('actif', true).order('created_at', { ascending: false }),
      supabase.from('prospects').select('id, nom, status, montant').eq('coach_id', user.id),
    ])

    const coach = coachRes.data
    const clientsData = clientsRes.data ?? []
    const prospectsData = prospectsRes.data ?? []

    setCoachProfile(coach)
    setClients(clientsData)

    const planPrix = { starter: 49, pro: 99, unlimited: 149 }
    const plan = coach?.plan ?? 'starter'
    const actif = coach?.abonnement_actif ?? false

    const debutMois = new Date()
    debutMois.setDate(1)
    const nouveaux = clientsData.filter(c => new Date(c.created_at) >= debutMois).length

    setStats({
      actifs: clientsData.length,
      prospects: prospectsData.length,
      nouveaux,
      mrr: actif ? planPrix[plan] : 0,
    })

    setLoading(false)
  }, [user])

  useEffect(() => { chargerDonnees() }, [chargerDonnees])

  // Date du jour formatée
  const today = new Date()
  const jourSemaine = today.toLocaleDateString('fr-FR', { weekday: 'long' })
  const jourMois = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const dateAffichee = `${jourSemaine.charAt(0).toUpperCase() + jourSemaine.slice(1)} ${jourMois}`

  const prenom = coachProfile?.prenom ?? 'Coach'

  // Données fictives revenus
  const revenueData = [
    { label: 'Janv', value: 2400, highlight: false },
    { label: 'Fév', value: 5800, highlight: false },
    { label: 'Mars', value: 8200, highlight: true },
    { label: 'Avr', value: 3100, highlight: false },
  ]

  // Données fictives prospects
  const FAKE_PROSPECTS = [
    { nom: 'Noa Santos', status: 'Qualifié', montant: 99, color: '#22c55e' },
    { nom: 'Marie Senhois', status: 'Contact', montant: 49, color: '#f59e0b' },
    { nom: 'Monia Ulost', status: 'En cours', montant: 99, color: '#3b82f6' },
    { nom: 'Hicner Monmseties', status: 'Nouveau', montant: 149, color: '#a855f7' },
  ]

  // Planning fictif
  const FAKE_PLANNING = [
    { initials: 'NS', name: 'Noa SANTOS', time: '12:48', type: 'Suivi', color: '#FF6B2B' },
    { initials: 'ML', name: 'Marie LEFORT', time: '11:22', type: 'Programme', color: '#3b82f6' },
    { initials: 'TD', name: 'Thomas DUBOIS', time: 'Hier', type: 'Bilan', color: '#a855f7' },
  ]

  if (loading) {
    return (
      <div className="p-6 space-y-6 w-full animate-pulse">
        <div className="h-32 bg-[#27272a]/50 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-[#27272a]/50 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-64 bg-[#27272a]/50 rounded-xl" />
          <div className="h-64 bg-[#27272a]/50 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 w-full space-y-5 max-w-[1400px]">

      {/* ══════════════════════════════════════ */}
      {/* HERO BANNER                            */}
      {/* ══════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a2e] via-[#16162a] to-[#0f0f1a] border border-[#27272a] p-6 md:p-8">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6B2B]/8 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-purple-500/5 rounded-full blur-[60px] pointer-events-none" />

        <div className="relative flex items-center gap-5">
          {/* Mascotte / icône */}
          <div className="hidden md:flex w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B2B] to-[#FF9A6C] items-center justify-center flex-shrink-0 shadow-lg shadow-[#FF6B2B]/20">
            <Flame size={32} className="text-white" />
          </div>

          <div className="flex-1">
            <h1 className="text-[#F5F5F3] text-xl md:text-2xl font-bold">
              Bienvenue {prenom} <span className="inline-block">👋</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Voici votre planning pour aujourd'hui : {dateAffichee}.
            </p>
          </div>

          {/* Quick stat badge */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-[#27272a]">
            <Zap size={14} className="text-[#FF6B2B]" />
            <span className="text-[#F5F5F3] text-sm font-semibold">{stats.actifs}</span>
            <span className="text-white/30 text-xs">clients actifs</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* 4 STAT CARDS                           */}
      {/* ══════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Clients actifs', value: stats.actifs, icon: Users, iconColor: 'text-[#FF6B2B]', iconBg: 'bg-[#FF6B2B]/10' },
          { label: 'Prospects', value: stats.prospects, icon: Target, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10' },
          { label: 'Nouveaux ce mois', value: stats.nouveaux, icon: UserPlus, iconColor: 'text-green-400', iconBg: 'bg-green-500/10' },
          { label: 'MRR', value: stats.mrr > 0 ? `${stats.mrr}€` : '—', icon: DollarSign, iconColor: 'text-amber-400', iconBg: 'bg-amber-500/10', sub: '/mois' },
        ].map((s, i) => (
          <div key={i} className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 hover:border-[#27272a]/80 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.iconBg}`}>
                <s.icon size={16} className={s.iconColor} />
              </div>
              <div>
                <p className="text-white/35 text-[11px]">{s.label}</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-[#F5F5F3] text-xl font-bold">{s.value}</p>
                  {s.sub && <span className="text-white/20 text-[10px]">{s.sub}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════ */}
      {/* MAIN GRID : 2/3 + 1/3                 */}
      {/* ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">

        {/* ── COLONNE GAUCHE (2/3) ── */}
        <div className="lg:col-span-2 space-y-4 md:space-y-5">

          {/* Carte Votre activité */}
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[#F5F5F3] text-base font-semibold">Votre activité</h2>
              <button className="p-1.5 rounded-lg text-white/20 hover:text-white/40 hover:bg-white/[0.04] transition-colors">
                <MoreHorizontal size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Résumé clients */}
              <div className="flex items-center gap-4 bg-[#18181b] rounded-xl p-4 border border-[#27272a]/50">
                <div className="w-12 h-12 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center">
                  <Users size={22} className="text-[#FF6B2B]" />
                </div>
                <div>
                  <p className="text-[#F5F5F3] text-2xl font-bold">{stats.actifs}</p>
                  <p className="text-white/30 text-xs">clients à suivre</p>
                </div>
              </div>

              {/* Résumé prospects */}
              <div className="flex items-center gap-4 bg-[#18181b] rounded-xl p-4 border border-[#27272a]/50">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Target size={22} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-[#F5F5F3] text-2xl font-bold">{stats.prospects}</p>
                  <p className="text-white/30 text-xs">prospects actifs</p>
                </div>
              </div>

              {/* Séances du jour */}
              <div className="flex items-center gap-4 bg-[#18181b] rounded-xl p-4 border border-[#27272a]/50">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Calendar size={22} className="text-green-400" />
                </div>
                <div>
                  <p className="text-[#F5F5F3] text-2xl font-bold">3</p>
                  <p className="text-white/30 text-xs">séances aujourd'hui</p>
                </div>
              </div>
            </div>
          </div>

          {/* Carte Suivi des Revenus */}
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[#F5F5F3] text-base font-semibold">Suivi des Revenus</h2>
              <div className="flex items-center gap-2">
                <span className="text-white/20 text-xs">Derniers paiements</span>
                <button className="p-1.5 rounded-lg text-white/20 hover:text-white/40 hover:bg-white/[0.04] transition-colors">
                  <BarChart3 size={14} />
                </button>
              </div>
            </div>

            <div className="flex justify-center py-2 overflow-x-auto">
              <RevenueChart data={revenueData} />
            </div>
          </div>

          {/* Carte Vos prospects */}
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#F5F5F3] text-base font-semibold">Vos prospects</h2>
              <button
                onClick={() => navigate('/coach/prospects')}
                className="text-[#FF6B2B] text-xs font-medium hover:underline flex items-center gap-1"
              >
                Voir tout <ChevronRight size={12} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Summary */}
              <div className="space-y-2.5">
                <p className="text-white/25 text-[10px] uppercase tracking-wider font-semibold">Résumé</p>
                {FAKE_PROSPECTS.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-[#F5F5F3] text-sm flex-1 truncate">{p.nom}</span>
                    <span className="text-white/30 text-xs font-semibold">{p.montant}€</span>
                  </div>
                ))}
              </div>

              {/* Kanban mini */}
              <div className="space-y-2.5">
                <p className="text-white/25 text-[10px] uppercase tracking-wider font-semibold">Statuts</p>
                {FAKE_PROSPECTS.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-white/50 text-sm flex-1 truncate">{p.nom}</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: `${p.color}15`, color: p.color }}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── COLONNE DROITE (1/3) ── */}
        <div className="space-y-4 md:space-y-5">

          {/* Aujourd'hui — Planning */}
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#F5F5F3] text-base font-semibold">Aujourd'hui</h2>
              <button className="p-1.5 rounded-lg text-white/20 hover:text-white/40 hover:bg-white/[0.04] transition-colors">
                <MoreHorizontal size={16} />
              </button>
            </div>

            <div className="space-y-1">
              {FAKE_PLANNING.map((p, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.03] transition-colors text-left group"
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${p.color}20` }}
                  >
                    <span className="text-sm font-bold" style={{ color: p.color }}>{p.initials}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[#F5F5F3] text-sm font-medium truncate">{p.name}</p>
                    <p className="text-white/25 text-[11px] mt-0.5">{p.type}</p>
                  </div>

                  {/* Heure */}
                  <span className="text-white/30 text-xs font-medium flex-shrink-0">{p.time}</span>

                  {/* Actions au hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <div className="p-1 rounded-md hover:bg-white/[0.06]">
                      <Eye size={13} className="text-white/30" />
                    </div>
                    <div className="p-1 rounded-md hover:bg-white/[0.06]">
                      <MessageCircle size={13} className="text-white/30" />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Voir le calendrier */}
            <button
              onClick={() => navigate('/coach/calendar')}
              className="w-full mt-3 py-2.5 rounded-xl border border-[#27272a] text-white/30 text-xs font-medium hover:text-white/50 hover:border-[#27272a]/80 transition-colors flex items-center justify-center gap-2"
            >
              <Calendar size={13} />
              Voir le calendrier complet
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5">
            <h2 className="text-[#F5F5F3] text-base font-semibold mb-4">Actions rapides</h2>
            <div className="space-y-2">
              {[
                { label: 'Nouveau client', icon: UserPlus, action: () => navigate('/coach/client-hub'), color: '#FF6B2B' },
                { label: 'Créer un programme', icon: Calendar, action: () => navigate('/coach/programmes'), color: '#3b82f6' },
                { label: 'Voir les stats', icon: TrendingUp, action: () => navigate('/coach/statistiques'), color: '#22c55e' },
              ].map((a, i) => (
                <button
                  key={i}
                  onClick={a.action}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors text-left group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${a.color}15` }}
                  >
                    <a.icon size={15} style={{ color: a.color }} />
                  </div>
                  <span className="text-[#F5F5F3] text-sm font-medium flex-1">{a.label}</span>
                  <ChevronRight size={13} className="text-white/15 group-hover:text-white/30 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Derniers clients */}
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#F5F5F3] text-base font-semibold">Derniers clients</h2>
              <button
                onClick={() => navigate('/coach/client-hub')}
                className="text-[#FF6B2B] text-xs font-medium hover:underline"
              >
                Tous
              </button>
            </div>

            {clients.length === 0 ? (
              <div className="text-center py-6">
                <Users size={28} className="text-white/10 mx-auto mb-2" />
                <p className="text-white/25 text-xs">Aucun client</p>
              </div>
            ) : (
              <div className="space-y-1">
                {clients.slice(0, 5).map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/coach/clients/${c.id}`)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                      style={{ backgroundColor: COULEURS_AVATAR[i % COULEURS_AVATAR.length] }}
                    >
                      {initialesFrom(c.profiles?.nom)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#F5F5F3] text-sm font-medium truncate">
                        {c.profiles?.nom ?? c.profiles?.email}
                      </p>
                    </div>
                    <span className="text-white/20 text-[10px] flex-shrink-0">
                      {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
