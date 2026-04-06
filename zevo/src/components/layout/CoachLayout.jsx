import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserPlus, CalendarDays,
  Dumbbell, Apple, Activity, Video,
  Receipt, UsersRound, Zap, Bell, Lock,
  Search, MessageCircle, Rocket, LogOut, Menu, X,
  Settings, ChevronDown, ChevronLeft, BookOpen, Layers, ClipboardList,
  FileText, BarChart3, CreditCard, Paintbrush, Send, Mic,
  CheckCircle, Flame, TrendingDown, FolderOpen, Trophy, UtensilsCrossed,
  Clock, Sparkles
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { usePlanLimits } from '../../hooks/usePlanLimits'
import { supabase } from '../../lib/supabase'
import CoachTutorial from '../CoachTutorial'
import ThemeToggle from '../ui/ThemeToggle'
import { ZevoLogo } from '../ui/ZevoLogo'

// ══════════════════════════════════════
// SIDEBAR NAV — Structure par sections
// ══════════════════════════════════════

const NAV_SECTIONS = [
  {
    title: null,
    items: [
      { to: '/coach/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
      { to: '/coach/client-hub', icon: Users, label: 'Clients' },
      { to: '/coach/calendar', icon: CalendarDays, label: 'Calendrier' },
      { to: '/coach/messages', icon: MessageCircle, label: 'Messages', msgBadge: true },
      { to: '/coach/prospects', icon: UserPlus, label: 'Prospects', badge: 'Nouveau' },
    ],
  },
  {
    title: 'RESSOURCES',
    items: [
      { to: '/coach/sport', icon: Trophy, label: 'Sport' },
      { to: '/coach/nutrition', icon: UtensilsCrossed, label: 'Nutrition' },
      { to: '/coach/bibliotheque', icon: BookOpen, label: 'Bibliothèque' },
      { to: '/coach/formulaires', icon: ClipboardList, label: 'Formulaires' },
      { to: '/coach/rapports', icon: FileText, label: 'Rapports', planRequired: 'pro' },
      { to: '/coach/statistiques', icon: BarChart3, label: 'Statistiques', planRequired: 'pro' },
    ],
  },
  {
    title: 'GESTION',
    items: [
      { to: '/coach/abonnements', icon: CreditCard, label: 'Abonnements' },
      { to: '/coach/app-builder', icon: Paintbrush, label: 'App Builder', planRequired: 'pro' },
      { to: '/coach/parametres', icon: Settings, label: 'Paramètres' },
    ],
  },
]

// Items pour la bottom nav mobile — Messages redirige vers la vraie page
const MOBILE_NAV = [
  { to: '/coach/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/coach/client-hub', icon: Users, label: 'Clients' },
  { to: '/coach/programmes', icon: Layers, label: 'Programme' },
  { to: '/coach/messages', icon: MessageCircle, label: 'Messages' },
  { to: '/coach/parametres', icon: Settings, label: 'Plus' },
]

// Titres de pages dynamiques
const PAGE_TITLES = {
  '/coach/dashboard': 'Tableau de bord',
  '/coach/clients': 'Clients',
  '/coach/client-hub': 'Hub Client 360°',
  '/coach/prospects': 'Prospects',
  '/coach/sport': 'Sport',
  '/coach/nutrition': 'Nutrition',
  '/coach/bibliotheque': 'Bibliothèque',
  '/coach/formulaires': 'Formulaires',
  '/coach/rapports': 'Rapports',
  '/coach/statistiques': 'Statistiques',
  '/coach/abonnements': 'Abonnements',
  '/coach/app-builder': 'App Builder',
  '/coach/parametres': 'Paramètres',
  '/coach/calendar': 'Calendrier',
  '/coach/messages': 'Messages',
}

// ══════════════════════════════════════
// MAIN LAYOUT
// ══════════════════════════════════════

// Mapping planRequired → plan hierarchy
const PLAN_RANK = { starter: 1, pro: 2, unlimited: 3 }

export function CoachLayout() {
  const { user, logout } = useAuth()
  const { plan: coachPlan } = usePlanLimits()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [coachProfile, setCoachProfile] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)

  const unreadCount = notifications.filter(n => !n.is_read).length
  const unreadMsgCount = notifications.filter(n => !n.is_read && n.type === 'message').length

  // Charge le profil coach pour afficher nom + avatar
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await supabase
        .from('coaches')
        .select('prenom, nom, nom_app, logo_url, tutorial_coach_done, trial_ends_at, subscription_status')
        .eq('id', user.id)
        .maybeSingle()
      if (data) {
        setCoachProfile(data)
        // Afficher le tutoriel si pas encore fait
        if (!data.tutorial_coach_done) setShowTutorial(true)
      }
    }
    load()
  }, [user])

  // Cache des noms clients { id: 'Prénom' }
  const [clientNames, setClientNames] = useState({})

  // ── Charge les notifications ──
  useEffect(() => {
    if (!user) return
    const loadNotifs = async () => {
      setLoadingNotifs(true)
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('coach_id', user.id)
        .eq('destinataire', 'coach')
        .order('created_at', { ascending: false })
        .limit(20)
      setNotifications(data || [])
      setLoadingNotifs(false)

      // Résoudre les prénoms des clients
      const clientIds = [...new Set((data || []).map(n => n.client_id).filter(Boolean))]
      if (clientIds.length > 0) {
        const { data: profiles } = await supabase
          .from('clients')
          .select('id, prenom, nom')
          .in('id', clientIds)
        if (profiles) {
          const map = {}
          profiles.forEach(p => { map[p.id] = p.prenom || p.nom || 'Client' })
          setClientNames(prev => ({ ...prev, ...map }))
        }
      }
    }
    loadNotifs()

    // Realtime : écouter les nouvelles notifications
    const channel = supabase
      .channel(`coach-notifs-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `coach_id=eq.${user.id}`,
      }, async (payload) => {
        if (payload.new.destinataire === 'coach') {
          setNotifications(prev => [payload.new, ...prev])
          // Résoudre le prénom si pas en cache
          const cid = payload.new.client_id
          if (cid && !clientNames[cid]) {
            const { data: p } = await supabase.from('clients').select('prenom, nom').eq('id', cid).maybeSingle()
            if (p) setClientNames(prev => ({ ...prev, [cid]: p.prenom || p.nom || 'Client' }))
          }
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `coach_id=eq.${user.id}`,
      }, (payload) => {
        // Mettre à jour le is_read dans le state local
        setNotifications(prev => prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  // ── Marquer une notification comme lue ──
  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  // ── Tout marquer comme lu ──
  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Titre de page dynamique
  const currentPath = location.pathname
  const pageTitle = PAGE_TITLES[currentPath]
    || (currentPath.startsWith('/coach/clients/') ? 'Fiche client' : 'Coach')

  const coachName = coachProfile
    ? [coachProfile.prenom, coachProfile.nom].filter(Boolean).join(' ') || 'Coach'
    : 'Coach'
  const coachInitials = coachName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  // ══════════════════════════════════════
  // TRIAL / PAYWALL LOGIC
  // ══════════════════════════════════════
  const isSubscribed = coachProfile?.subscription_status === 'active'
  const trialEndsAt = coachProfile?.trial_ends_at ? new Date(coachProfile.trial_ends_at) : null
  const now = new Date()
  const msRemaining = trialEndsAt ? trialEndsAt.getTime() - now.getTime() : 0
  const daysRemaining = trialEndsAt ? Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24))) : 0
  const trialExpired = trialEndsAt ? msRemaining <= 0 : false
  const accessDenied = coachProfile && !isSubscribed && trialExpired
  const showTrialBanner = coachProfile && !isSubscribed && !trialExpired && trialEndsAt
  const isOnAbonnementsPage = currentPath === '/coach/abonnements'

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col md:flex-row">

      {/* ══════════════════════════════════════ */}
      {/* HEADER MOBILE                         */}
      {/* ══════════════════════════════════════ */}
      <header className="md:hidden sticky top-0 z-50 bg-[var(--bg-elevated)] border-b border-[var(--border-base)] px-4 py-3 flex items-center justify-between">
        <ZevoLogo size="sm" className="text-[var(--text-primary)]" />
        <div className="flex items-center gap-2">
          <ThemeToggle size="sm" />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 transition-colors"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* ── Menu mobile overlay ── */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-[53px] z-40 bg-[var(--bg-elevated)]/95 backdrop-blur-sm overflow-auto">
          <nav className="p-4">
            {NAV_SECTIONS.map((section, si) => (
              <div key={si} className={si > 0 ? 'mt-4' : ''}>
                {section.title && (
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold px-3 mb-2">
                    {section.title}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {section.items.map(({ to, icon: Icon, label, planRequired }) => {
                    const isLocked = planRequired && (PLAN_RANK[coachPlan] || 1) < (PLAN_RANK[planRequired] || 1)
                    return (
                    <li key={to}>
                      <NavLink
                        to={to}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-[#FF6B2B]/10 text-[#FF6B2B]'
                              : isLocked
                              ? 'text-[var(--text-muted)] opacity-50'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]'
                          }`
                        }
                      >
                        <Icon size={18} />
                        <span className="flex-1">{label}</span>
                        {isLocked && (
                          <span className="text-[9px] bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-base)] px-1.5 py-0.5 rounded-full font-bold uppercase">
                            {planRequired === 'unlimited' ? 'Unlimited' : 'Pro'}
                          </span>
                        )}
                      </NavLink>
                    </li>
                    )
                  })}
                </ul>
              </div>
            ))}
            <div className="mt-4 pt-4 border-t border-[var(--border-base)]">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors w-full"
              >
                <LogOut size={18} />
                Se déconnecter
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* SIDEBAR DESKTOP                       */}
      {/* ══════════════════════════════════════ */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-[var(--bg-elevated)] border-r border-[var(--border-base)] flex-col sticky top-0 h-screen">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-[var(--border-base)]">
          <ZevoLogo size="md" className="text-[var(--text-primary)]" />
          <p className="text-[var(--text-muted)] text-[10px] font-medium mt-1.5 tracking-wide">Espace coach</p>
        </div>

        {/* Navigation par sections */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si}>
              {section.title && (
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold px-3 mb-2">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map(({ to, icon: Icon, label, badge, msgBadge, planRequired }) => {
                  const isLocked = planRequired && (PLAN_RANK[coachPlan] || 1) < (PLAN_RANK[planRequired] || 1)
                  return (
                  <li key={to}>
                    <NavLink
                      to={to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group ${
                          isActive
                            ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                            : isLocked
                            ? 'text-[var(--text-muted)] opacity-50 hover:opacity-70 hover:bg-[var(--bg-surface)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon size={17} className={`flex-shrink-0 transition-colors ${isActive ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`} />
                          <span className="flex-1">{label}</span>
                          {msgBadge && unreadMsgCount > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF6B2B] text-white text-[9px] font-bold flex items-center justify-center">
                              {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                            </span>
                          )}
                          {isLocked && (
                            <span className="text-[9px] bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-base)] px-1.5 py-0.5 rounded-full font-bold uppercase">
                              {planRequired === 'unlimited' ? 'Unlimited' : 'Pro'}
                            </span>
                          )}
                          {!isLocked && badge && (
                            <span className="text-[9px] bg-[#FF6B2B] text-white px-1.5 py-0.5 rounded-full font-bold">
                              {badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bas de sidebar */}
        <div className="px-3 pb-4 space-y-2 border-t border-[var(--border-base)] pt-3">
          {/* Bouton Démarrage — TODO: remettre la condition après tests */}
          <button
            onClick={() => setShowTutorial(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#FF6B2B]/10 text-[#FF6B2B] text-sm font-semibold hover:bg-[#FF6B2B]/15 transition-colors"
          >
            <Rocket size={15} />
            Démarrage
          </button>

          {/* Profil coach */}
          <button
            onClick={() => navigate('/coach/parametres')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-surface)] transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-[#FF6B2B]/15 flex items-center justify-center flex-shrink-0">
              <span className="text-[#FF6B2B] text-xs font-bold">{coachInitials}</span>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[var(--text-primary)] text-xs font-medium truncate">{coachName}</p>
              <p className="text-[var(--text-muted)] text-[10px] truncate">{user?.email}</p>
            </div>
            <LogOut
              size={14}
              className="text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors flex-shrink-0 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); handleLogout() }}
            />
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════ */}
      {/* CONTENU PRINCIPAL (Header + Outlet)   */}
      {/* ══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Header desktop */}
        <header className="hidden md:flex h-14 items-center justify-between px-6 bg-[var(--bg-elevated)] border-b border-[var(--border-base)] flex-shrink-0">
          {/* Titre de page dynamique */}
          <h1 className="text-[var(--text-primary)] text-lg font-semibold">{pageTitle}</h1>

          {/* Actions header */}
          <div className="flex items-center gap-2">
            {/* Bouton upgrade */}
            <button
              onClick={() => navigate('/pricing')}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-elevated)] text-xs font-semibold hover:opacity-80 transition-colors"
            >
              Mettre à niveau
            </button>

            {/* Theme toggle */}
            <ThemeToggle size="sm" />

            {/* Recherche */}
            <button className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors">
              <Search size={17} />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={`p-2 rounded-lg transition-colors relative ${
                  notifOpen ? 'text-[#FF6B2B] bg-[var(--bg-surface)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#FF6B2B] text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown notifications */}
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="px-5 py-3.5 border-b border-[var(--border-base)] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-[var(--text-primary)] text-sm font-bold">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-bold">
                            {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                          onClick={markAllAsRead}
                        >
                          Tout marquer comme lu
                        </button>
                      )}
                    </div>

                    {/* Liste */}
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                          <Bell size={20} className="text-[var(--text-muted)] mx-auto mb-2" />
                          <p className="text-[var(--text-muted)] text-xs">Aucune notification pour le moment</p>
                        </div>
                      ) : (
                        notifications.map((n) => {
                          const typeConfig = {
                            validation_semaine: { icon: CheckCircle, iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10' },
                            mensuration: { icon: TrendingDown, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10' },
                            message: { icon: MessageCircle, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10' },
                            objectif: { icon: Flame, iconColor: 'text-[#FF6B2B]', iconBg: 'bg-[#FF6B2B]/10' },
                          }
                          const cfg = typeConfig[n.type] || { icon: Bell, iconColor: 'text-[var(--text-muted)]', iconBg: 'bg-[var(--border-base)]' }
                          const IconComp = cfg.icon
                          const senderName = n.client_id ? clientNames[n.client_id] : null

                          // Formatage du temps relatif
                          const diff = Date.now() - new Date(n.created_at).getTime()
                          const mins = Math.floor(diff / 60000)
                          const hours = Math.floor(mins / 60)
                          const days = Math.floor(hours / 24)
                          const timeLabel = mins < 1 ? 'À l\'instant'
                            : mins < 60 ? `Il y a ${mins} min`
                            : hours < 24 ? `Il y a ${hours}h`
                            : days < 7 ? `Il y a ${days}j`
                            : new Date(n.created_at).toLocaleDateString('fr-FR')

                          return (
                            <button
                              key={n.id}
                              onClick={() => { if (!n.is_read) markAsRead(n.id) }}
                              className={`w-full flex items-start gap-3 px-5 py-4 hover:bg-[var(--border-subtle)] transition-colors text-left border-b border-[var(--border-subtle)] ${!n.is_read ? 'bg-[var(--border-subtle)]' : ''}`}
                            >
                              <div className={`w-9 h-9 rounded-xl ${cfg.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                <IconComp size={16} className={cfg.iconColor} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-[var(--text-primary)] text-xs font-semibold">{n.titre}</p>
                                  {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B2B] flex-shrink-0" />}
                                </div>
                                {senderName && (
                                  <p className="text-[#FF6B2B] text-[10px] font-semibold mt-0.5">{senderName}</p>
                                )}
                                <p className="text-[var(--text-secondary)] text-[11px] mt-0.5 leading-relaxed">{n.message}</p>
                                <p className="text-[var(--text-muted)] text-[10px] mt-1 font-medium">{timeLabel}</p>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="px-5 py-3 border-t border-[var(--border-base)]">
                        <p className="text-[var(--text-muted)] text-[10px] text-center">
                          {notifications.length} notification{notifications.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

          </div>
        </header>

        {/* Zone de contenu */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0 bg-[var(--bg-base)]">
          {/* ── Banner essai gratuit ── */}
          {showTrialBanner && (
            <div className="mx-4 mt-4 md:mx-6 md:mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-[#FF6B2B]/25 bg-gradient-to-r from-[#FF6B2B]/10 via-[#FF6B2B]/5 to-transparent px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF6B2B]/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={16} className="text-[#FF6B2B]" />
                </div>
                <div>
                  <p className="text-[var(--text-primary)] text-sm font-semibold">
                    Essai gratuit&nbsp;: {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
                  </p>
                  <p className="text-[var(--text-muted)] text-xs">
                    Choisis un plan pour continuer à utiliser Zevo sans interruption.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/pricing')}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-lg shadow-[#FF6B2B]/20"
              >
                Choisir un plan
              </button>
            </div>
          )}

          {/* ── Paywall (essai expiré) ── */}
          {accessDenied && !isOnAbonnementsPage ? (
            <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-10">
              <div className="glass-card relative w-full max-w-md rounded-3xl p-8 text-center overflow-hidden">
                {/* Glow orange */}
                <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-[#FF6B2B]/20 blur-3xl" />

                <div className="relative">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B2B]/20 to-[#FF8F5E]/10 border border-[#FF6B2B]/30 flex items-center justify-center mb-5 animate-breathe">
                    <Lock size={28} className="text-[#FF6B2B]" />
                  </div>
                  <h2 className="text-[var(--text-primary)] text-2xl font-bold mb-2">
                    Votre période d'essai est terminée
                  </h2>
                  <p className="text-[var(--text-muted)] text-sm mb-6 leading-relaxed">
                    Ton essai gratuit de 14 jours est arrivé à son terme. Choisis un plan pour retrouver l'accès à ton espace coach et continuer à accompagner tes clients.
                  </p>

                  <div className="flex items-center justify-center gap-2 mb-6 text-xs text-[var(--text-muted)]">
                    <Clock size={13} />
                    <span>Accès bloqué jusqu'à l'activation d'un abonnement</span>
                  </div>

                  <button
                    onClick={() => navigate('/coach/abonnements')}
                    className="w-full px-5 py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-[#FF6B2B]/30"
                  >
                    Choisir un plan
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* COACH TUTORIAL OVERLAY                */}
      {/* ══════════════════════════════════════ */}
      {showTutorial && (
        <CoachTutorial
          coachName={coachProfile?.prenom || coachName}
          onComplete={() => {
            setShowTutorial(false)
            setCoachProfile(prev => prev ? { ...prev, tutorial_coach_done: true } : prev)
          }}
        />
      )}

      {/* ══════════════════════════════════════ */}
      {/* BOTTOM NAV MOBILE                     */}
      {/* ══════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-elevated)] border-t border-[var(--border-base)]">
        <ul className="flex items-center justify-around h-14">
          {MOBILE_NAV.map(({ to, icon: Icon, label }) => {
            const isMsgTab = to === '/coach/messages'
            const badgeCount = isMsgTab ? unreadMsgCount : 0
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-0.5 px-2 py-1.5 transition-colors relative ${
                      isActive ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'
                    }`
                  }
                >
                  <div className="relative">
                    <Icon size={18} />
                    {badgeCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-1 rounded-full bg-[#FF6B2B] text-white text-[8px] font-bold flex items-center justify-center">
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-medium">{label}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
