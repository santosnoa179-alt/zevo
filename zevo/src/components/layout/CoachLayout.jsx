import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserPlus, CalendarDays,
  Dumbbell, Apple, Activity, Video,
  Receipt, UsersRound, Zap, Bell, Lock, Trash2,
  Search, MessageCircle, Rocket, LogOut, Menu, X,
  Settings, ChevronDown, ChevronLeft, BookOpen, Layers, ClipboardList,
  FileText, BarChart3, CreditCard, Paintbrush, Send, Mic,
  CheckCircle, Flame, TrendingDown, FolderOpen, Trophy, UtensilsCrossed,
  Clock, Sparkles, Gauge, UserCheck, ListChecks, FileBarChart,
  TrendingUp, Palette, SlidersHorizontal, Wallet, Target,
  House, UserRound, CalendarRange, MessageSquareText, Magnet,
  Cherry, BookMarked, ClipboardCheck, ChartNoAxesCombined,
  ChartSpline, Landmark, Blocks, SlidersVertical
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

// Plus de color par item — tous les onglets utilisent l'orange Zevo (via fallback itemColor).
// Cohérence avec le langage Fitness OS : orange uniquement = état actif / signature brand.
const NAV_SECTIONS = [
  {
    title: null,
    items: [
      { to: '/coach/dashboard', icon: House, label: 'Tableau de bord' },
      { to: '/coach/client-hub', icon: UsersRound, label: 'Clients' },
      { to: '/coach/calendar', icon: CalendarRange, label: 'Calendrier' },
      { to: '/coach/messages', icon: MessageSquareText, label: 'Messages', msgBadge: true },
      { to: '/coach/prospects', icon: Magnet, label: 'Prospects', badge: 'Nouveau' },
    ],
  },
  {
    title: 'RESSOURCES',
    items: [
      { to: '/coach/sport', icon: Dumbbell, label: 'Sport' },
      { to: '/coach/exercices', icon: Target, label: 'Exercices' },
      { to: '/coach/nutrition', icon: Cherry, label: 'Nutrition' },
      { to: '/coach/bibliotheque', icon: BookMarked, label: 'Bibliothèque' },
      { to: '/coach/formulaires', icon: ClipboardCheck, label: 'Formulaires' },
      { to: '/coach/rapports', icon: ChartNoAxesCombined, label: 'Rapports', planRequired: 'pro' },
      { to: '/coach/statistiques', icon: ChartSpline, label: 'Statistiques', planRequired: 'pro' },
    ],
  },
  {
    title: 'GESTION',
    items: [
      { to: '/coach/abonnements', icon: Landmark, label: 'Paiements' },
      { to: '/coach/app-builder', icon: Blocks, label: 'App Builder', planRequired: 'pro' },
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
  '/coach/exercices': 'Exercices',
  '/coach/nutrition': 'Nutrition',
  '/coach/bibliotheque': 'Bibliothèque',
  '/coach/formulaires': 'Formulaires',
  '/coach/rapports': 'Rapports',
  '/coach/statistiques': 'Statistiques',
  '/coach/abonnements': 'Paiements',
  '/coach/abonnements/transactions': 'Transactions',
  '/coach/abonnements/solde': 'Solde',
  '/coach/abonnements/abonnements': 'Abonnements',
  '/coach/abonnements/factures': 'Factures',
  '/coach/abonnements/produits': 'Produits',
  '/coach/abonnements/liens': 'Liens de paiement',
  '/coach/abonnements/codes': 'Codes de réduction',
  '/coach/abonnements/parametres': 'Paramètres paiement',
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

  // Bloquer le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = `-${window.scrollY}px`
    } else {
      const scrollY = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
      if (scrollY) window.scrollTo(0, parseInt(scrollY || '0', 10) * -1)
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
    }
  }, [menuOpen])
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
        .select('prenom, nom, nom_app, logo_url, tutorial_coach_done, trial_ends_at, subscription_status, abonnement_actif')
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

  // ── Supprimer une notification ──
  const deleteNotif = async (id) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // ── Tout effacer ──
  const clearAllNotifs = async () => {
    if (!user || notifications.length === 0) return
    await supabase.from('notifications').delete().eq('coach_id', user.id)
    setNotifications([])
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
  const isSubscribed = coachProfile?.subscription_status === 'active' || coachProfile?.abonnement_actif === true
  const trialEndsAt = coachProfile?.trial_ends_at ? new Date(coachProfile.trial_ends_at) : null
  const now = new Date()
  const msRemaining = trialEndsAt ? trialEndsAt.getTime() - now.getTime() : 0
  const daysRemaining = trialEndsAt ? Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24))) : 0
  const trialExpired = trialEndsAt ? msRemaining <= 0 : false
  const accessDenied = coachProfile && !isSubscribed && trialExpired
  const showTrialBanner = coachProfile && !isSubscribed && !trialExpired && trialEndsAt
  const isOnAbonnementsPage = currentPath === '/coach/abonnements'

  // Bottom nav masquee uniquement quand on est DANS une conversation
  // (detecte via le query param ?client=XXX). Sur la liste des clients,
  // la bottom nav reste visible.
  const hideBottomNav =
    currentPath.startsWith('/coach/messages') &&
    !!new URLSearchParams(location.search).get('client')

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col md:flex-row">

      {/* ══════════════════════════════════════ */}
      {/* HEADER MOBILE                         */}
      {/* ══════════════════════════════════════ */}
      <header className="md:hidden sticky top-0 z-50 bg-[var(--bg-elevated)] border-b border-[var(--border-base)] px-4 pb-3 flex items-center justify-between" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
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
        <div className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-[var(--bg-elevated)] backdrop-blur-sm overflow-y-auto overscroll-contain" style={{ top: 'calc(53px + env(safe-area-inset-top, 0px))' }}>
          <nav className="p-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
            {NAV_SECTIONS.map((section, si) => (
              <div key={si} className={si > 0 ? 'mt-4' : ''}>
                {section.title && (
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold px-3 mb-2">
                    {section.title}
                  </p>
                )}
                <ul className="space-y-1">
                  {section.items.map(({ to, icon: Icon, label, planRequired, color }) => {
                    const isLocked = planRequired && (PLAN_RANK[coachPlan] || 1) < (PLAN_RANK[planRequired] || 1)
                    const itemColor = color || 'var(--color-primary)'
                    return (
                    <li key={to}>
                      <NavLink
                        to={to}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                            isActive
                              ? 'text-[var(--text-primary)]'
                              : isLocked
                              ? 'text-[var(--text-muted)] opacity-50'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: isActive ? `${itemColor}18` : 'transparent' }}
                            >
                              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} style={{ color: isActive ? itemColor : undefined }} className={isActive ? '' : 'text-[var(--text-muted)]'} />
                            </div>
                            <span className={`flex-1 ${isActive ? 'font-semibold' : ''}`}>{label}</span>
                            {isLocked && (
                              <span className="text-[9px] bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-base)] px-1.5 py-0.5 rounded-full font-bold uppercase">
                                {planRequired === 'unlimited' ? 'Unlimited' : 'Pro'}
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

        {/* Logo + Plan */}
        <div className="px-5 pt-5 pb-4 relative">
          <div className="flex items-center justify-between">
            <ZevoLogo size="md" className="text-[var(--text-primary)]" />
            <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/15">
              {coachPlan || 'Starter'}
            </span>
          </div>
          {/* Gradient separator */}
          <div className="absolute bottom-0 left-5 right-5 h-px bg-gradient-to-r from-primary/30 via-[var(--border-base)] to-transparent" />
        </div>

        {/* Navigation par sections */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-5 sidebar-nav">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si}>
              {section.title && (
                <div className="flex items-center gap-2 px-3 mb-2.5">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-bold whitespace-nowrap">
                    {section.title}
                  </p>
                  <div className="flex-1 h-px bg-[var(--border-base)]" />
                </div>
              )}
              <ul className="space-y-1">
                {section.items.map(({ to, icon: Icon, label, badge, msgBadge, planRequired, color }) => {
                  const isLocked = planRequired && (PLAN_RANK[coachPlan] || 1) < (PLAN_RANK[planRequired] || 1)
                  const itemColor = color || 'var(--color-primary)'
                  return (
                  <li key={to}>
                    <NavLink
                      to={to}
                      className={({ isActive }) =>
                        `relative flex items-center gap-3 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 group ${
                          isActive
                            ? 'text-[var(--text-primary)]'
                            : isLocked
                            ? 'text-[var(--text-muted)] opacity-40 hover:opacity-60'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]/40'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {/* Icon container — actif : halo orange subtil, inactif : transparent */}
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                              isActive ? '' : 'group-hover:scale-105'
                            }`}
                            style={{
                              backgroundColor: isActive ? `${itemColor}18` : 'transparent',
                              boxShadow: isActive ? `0 4px 12px ${itemColor}15` : 'none',
                            }}
                          >
                            <Icon
                              size={18}
                              strokeWidth={isActive ? 2.2 : 1.8}
                              style={{ color: isActive ? itemColor : undefined }}
                              className={`transition-all duration-200 ${isActive ? '' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`}
                            />
                          </div>
                          <span className={`flex-1 ${isActive ? 'font-semibold' : ''}`}>{label}</span>
                          {msgBadge && unreadMsgCount > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                              {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                            </span>
                          )}
                          {isLocked && (
                            <span className="text-[8px] bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-base)] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                              {planRequired === 'unlimited' ? 'Unlimited' : 'Pro'}
                            </span>
                          )}
                          {!isLocked && badge && (
                            <span className="text-[8px] bg-gradient-to-r from-primary to-primary-light text-white px-2 py-0.5 rounded-full font-bold shadow-sm shadow-primary/20">
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
        <div className="px-3 pb-4 space-y-2 relative">
          {/* Gradient separator */}
          <div className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[var(--border-base)] to-transparent" />

          <div className="pt-3">
            {/* Bouton Démarrage — uniquement si tutoriel pas encore fait */}
            {coachProfile && !coachProfile.tutorial_coach_done && (
              <button
                onClick={() => setShowTutorial(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mb-2 rounded-xl bg-gradient-to-r from-primary/10 to-primary-light/10 text-primary text-sm font-semibold hover:from-primary/15 hover:to-primary-light/15 transition-all border border-primary/10"
              >
                <Rocket size={15} />
                Démarrage
              </button>
            )}

            {/* Profil coach */}
            <button
              onClick={() => navigate('/coach/parametres')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-surface)]/70 transition-all duration-200 group"
            >
              {/* Avatar with gradient ring */}
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-light p-[2px]">
                  <div className="w-full h-full rounded-full bg-[var(--bg-elevated)] flex items-center justify-center">
                    <span className="text-primary text-[11px] font-bold">{coachInitials}</span>
                  </div>
                </div>
                {/* Online indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--bg-elevated)]" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[var(--text-primary)] text-[12px] font-semibold truncate">{coachName}</p>
                <p className="text-[var(--text-muted)] text-[10px] truncate">{user?.email}</p>
              </div>
              <LogOut
                size={14}
                className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:text-[var(--text-secondary)] transition-all flex-shrink-0 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); handleLogout() }}
              />
            </button>
          </div>
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
              onClick={() => navigate('/coach/pricing')}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-elevated)] text-xs font-semibold hover:opacity-80 transition-colors"
            >
              Mettre à niveau
            </button>

            {/* Theme toggle */}
            <ThemeToggle size="sm" />

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={`p-2 rounded-lg transition-colors relative ${
                  notifOpen ? 'text-primary bg-[var(--bg-surface)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
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
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                            {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {unreadCount > 0 && (
                          <button
                            className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            onClick={markAllAsRead}
                          >
                            Tout lire
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button
                            className="text-[11px] text-red-400 hover:text-red-300 transition-colors"
                            onClick={clearAllNotifs}
                          >
                            Tout effacer
                          </button>
                        )}
                      </div>
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
                            objectif: { icon: Flame, iconColor: 'text-primary', iconBg: 'bg-primary/10' },
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
                            <div
                              key={n.id}
                              onClick={() => { if (!n.is_read) markAsRead(n.id) }}
                              className={`group w-full flex items-start gap-3 px-5 py-4 hover:bg-[var(--border-subtle)] transition-colors text-left border-b border-[var(--border-subtle)] cursor-pointer ${!n.is_read ? 'bg-[var(--border-subtle)]' : ''}`}
                            >
                              <div className={`w-9 h-9 rounded-xl ${cfg.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                <IconComp size={16} className={cfg.iconColor} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-[var(--text-primary)] text-xs font-semibold">{n.titre}</p>
                                  {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                                </div>
                                {senderName && (
                                  <p className="text-primary text-[10px] font-semibold mt-0.5">{senderName}</p>
                                )}
                                <p className="text-[var(--text-secondary)] text-[11px] mt-0.5 leading-relaxed">{n.message}</p>
                                <p className="text-[var(--text-muted)] text-[10px] mt-1 font-medium">{timeLabel}</p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteNotif(n.id) }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0 mt-0.5"
                                title="Supprimer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
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
        <main
          className={`flex-1 overflow-auto bg-[var(--bg-base)] ${hideBottomNav ? '' : 'pb-20 md:pb-0'}`}
          style={hideBottomNav ? undefined : { paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* ── Banner essai gratuit ── */}
          {showTrialBanner && (
            <div className="mx-4 mt-4 md:mx-6 md:mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={16} className="text-primary" />
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
                onClick={() => navigate('/coach/pricing')}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
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
                <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-primary/20 blur-3xl" />

                <div className="relative">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-light/10 border border-primary/30 flex items-center justify-center mb-5 animate-breathe">
                    <Lock size={28} className="text-primary" />
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
                    className="w-full px-5 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/30"
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
      {!hideBottomNav && (
      <nav className={`${menuOpen ? 'hidden' : 'md:hidden'} fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-elevated)]/95 backdrop-blur-lg border-t border-[var(--border-base)]`} style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <ul className="flex items-center justify-around h-14">
          {MOBILE_NAV.map(({ to, icon: Icon, label }) => {
            const isMsgTab = to === '/coach/messages'
            const badgeCount = isMsgTab ? unreadMsgCount : 0
            return (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center gap-0.5 py-2 transition-colors relative ${
                      isActive ? 'text-primary' : 'text-[var(--text-muted)]'
                    }`
                  }
                >
                  <div className="relative">
                    <Icon size={20} />
                    {badgeCount > 0 && (
                      <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
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
      )}
    </div>
  )
}
