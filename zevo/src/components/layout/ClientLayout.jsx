import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Target, MessageSquare, User, LogOut,
  BookOpen, ClipboardList, CreditCard, Layers, Dumbbell,
  Calendar, Bell, CheckCircle, TrendingDown, Menu, X,
  ChevronDown, WifiOff,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useCoachTheme } from '../../hooks/useCoachTheme'
import { useOffline } from '../../hooks/useOffline'
import OnboardingFlow from '../OnboardingFlow'
import AppTutorial from '../AppTutorial'
import ThemeToggle from '../ui/ThemeToggle'
import { ZevoLogo } from '../ui/ZevoLogo'

// ── Navigation sections sidebar desktop ──────────────────────────────────
const NAV_SECTIONS = [
  {
    title: null,
    items: [
      { to: '/app/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
      { to: '/app/seances',   icon: Calendar,        label: 'Calendrier' },
      { to: '/app/programme', icon: Layers,           label: 'Programme' },
      { to: '/app/objectifs', icon: Target,           label: 'Objectifs' },
      { to: '/app/messages',  icon: MessageSquare,    label: 'Messages', msgBadge: true },
    ],
  },
  {
    title: 'CONTENU',
    items: [
      { to: '/app/habitudes',   icon: Dumbbell,      label: 'Habitudes' },
      { to: '/app/ressources',  icon: BookOpen,      label: 'Ressources' },
      { to: '/app/formulaires', icon: ClipboardList, label: 'Formulaires' },
    ],
  },
  {
    title: 'COMPTE',
    items: [
      { to: '/app/abonnement', icon: CreditCard, label: 'Abonnement' },
      { to: '/app/profil',     icon: User,       label: 'Profil' },
    ],
  },
]

// ── 5 onglets bottom nav mobile ───────────────────────────────────────────
const MAIN_NAV = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/app/seances',   icon: Calendar,        label: 'Séances' },
  { to: '/app/programme', icon: Layers,          label: 'Programme' },
  { to: '/app/objectifs', icon: Target,          label: 'Objectifs' },
  { to: '/app/messages',  icon: MessageSquare,   label: 'Messages' },
]

// ── Items du menu hamburger (mobile) ─────────────────────────────────────
const MENU_ITEMS = [
  { to: '/app/habitudes',   icon: Dumbbell,      label: 'Habitudes' },
  { to: '/app/ressources',  icon: BookOpen,      label: 'Ressources' },
  { to: '/app/formulaires', icon: ClipboardList, label: 'Formulaires' },
  { to: '/app/abonnement',  icon: CreditCard,    label: 'Abonnement' },
  { to: '/app/profil',      icon: User,          label: 'Profil' },
]

// Routes où la bottom nav est masquée (mode immersif)
const HIDDEN_NAV_ROUTES = ['/app/workout', '/app/messages']

export function ClientLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { nomApp, logoUrl } = useCoachTheme()
  const isOffline = useOffline()

  const [showOnboarding, setShowOnboarding]   = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [clientActif, setClientActif]         = useState(true)
  const [notifications, setNotifications]     = useState([])
  const [notifOpen, setNotifOpen]             = useState(false)
  const [menuOpen, setMenuOpen]               = useState(false)
  const [showTutorial, setShowTutorial]       = useState(false)
  const [clientProfile, setClientProfile]     = useState(null)

  const unreadCount    = notifications.filter(n => !n.is_read).length
  const unreadMsgCount = notifications.filter(n => !n.is_read && n.type === 'message').length
  const [coachName, setCoachName] = useState('')

  // ── Charge le profil client (avatar + nom pour sidebar) ──────────────
  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('prenom, nom, avatar_url')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setClientProfile(data) })
  }, [user])

  // ── Notifications ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const loadNotifs = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('client_id', user.id)
        .eq('destinataire', 'client')
        .order('created_at', { ascending: false })
        .limit(20)
      setNotifications(data || [])

      const coachId = data?.[0]?.coach_id
      if (coachId) {
        const { data: coach } = await supabase
          .from('coaches')
          .select('prenom, nom')
          .eq('id', coachId)
          .maybeSingle()
        if (coach) setCoachName(coach.prenom || coach.nom || 'Coach')
      }
    }
    loadNotifs()

    const channel = supabase
      .channel(`client-notifs-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `client_id=eq.${user.id}` },
        (payload) => { if (payload.new.destinataire === 'client') setNotifications(prev => [payload.new, ...prev]) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `client_id=eq.${user.id}` },
        (payload) => { setNotifications(prev => prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n)) })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }
  const markAllAsRead = async () => {
    const ids = notifications.filter(n => !n.is_read).map(n => n.id)
    if (!ids.length) return
    await supabase.from('notifications').update({ is_read: true }).in('id', ids)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  // ── Onboarding + Tutorial ────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    // maybeSingle : un user sans row clients (ex: coach égaré sur /app)
    // ne doit pas déclencher un 406 PostgREST.
    supabase.from('clients').select('onboarding_complete, actif').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data && !data.onboarding_complete) setShowOnboarding(true)
        if (data) setClientActif(data.actif === true)
        setOnboardingChecked(true)
      })
  }, [user])

  useEffect(() => {
    if (!user || showOnboarding) return
    supabase.from('profiles').select('tutorial_seen').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (data && !data.tutorial_seen) setShowTutorial(true) })
  }, [user, showOnboarding])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const hideBottomNav = HIDDEN_NAV_ROUTES.some(r => location.pathname.startsWith(r))

  // ── Nom affiché ──────────────────────────────────────────────────────
  const displayName = clientProfile
    ? [clientProfile.prenom, clientProfile.nom].filter(Boolean).join(' ') || user?.email
    : user?.email

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex">

      {showOnboarding && onboardingChecked && (
        <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
      )}
      {showTutorial && !showOnboarding && (
        <AppTutorial onComplete={() => setShowTutorial(false)} />
      )}

      {/* ══════════ SIDEBAR DESKTOP ══════════ */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-[var(--bg-card)] border-r border-[var(--border-base)] flex-col z-30 select-none">

        {/* Logo / Branding */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--border-base)] h-[60px]">
          {logoUrl ? (
            <>
              <img
                src={logoUrl}
                alt={nomApp}
                decoding="async"
                className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none' }}
              />
              <span className="font-bold tracking-tight text-[var(--text-primary)] text-sm truncate">{nomApp}</span>
            </>
          ) : nomApp && nomApp !== 'Zevo' ? (
            <span className="font-bold tracking-tight text-[var(--text-primary)] text-sm truncate">{nomApp}</span>
          ) : (
            <ZevoLogo size="sm" className="text-[var(--text-primary)]" />
          )}
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si}>
              {section.title && (
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-2 mb-1.5">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map(({ to, icon: Icon, label, msgBadge }) => {
                  const badge = msgBadge ? unreadMsgCount : 0
                  return (
                    <li key={to}>
                      <NavLink
                        to={to}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]'
                          }`
                        }
                        style={{ touchAction: 'manipulation' }}
                      >
                        <Icon size={17} className="flex-shrink-0" />
                        <span className="flex-1 truncate">{label}</span>
                        {badge > 0 && (
                          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                            {badge > 9 ? '9+' : badge}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Profil + Déconnexion */}
        <div className="border-t border-[var(--border-base)] p-3 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {clientProfile?.avatar_url
                ? <img
                    src={clientProfile.avatar_url}
                    alt=""
                    decoding="async"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none' }}
                  />
                : <User size={14} className="text-primary" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{displayName}</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email}</p>
            </div>
            <ThemeToggle size="sm" />
          </div>
          <button
            onClick={handleLogout}
            style={{ touchAction: 'manipulation' }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/5 transition-all duration-150 active:scale-[0.98]"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ══════════ ZONE PRINCIPALE ══════════ */}
      <div className="flex-1 flex flex-col md:ml-64 min-h-screen overflow-hidden">

        {/* Header */}
        <header
          className="sticky top-0 z-40 bg-[var(--bg-base)]/90 backdrop-blur-lg border-b border-[var(--border-base)] px-4 pb-3 flex items-center justify-between"
          style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
        >
          {/* Logo mobile */}
          <div className="flex items-center gap-2.5 md:hidden">
            {logoUrl ? (
              <>
                <img
                  src={logoUrl}
                  alt={nomApp}
                  decoding="async"
                  className="w-7 h-7 rounded-lg object-cover"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none' }}
                />
                <span className="font-bold tracking-tight text-[var(--text-primary)] text-base">{nomApp}</span>
              </>
            ) : nomApp && nomApp !== 'Zevo' ? (
              <span className="font-bold tracking-tight text-[var(--text-primary)] text-base">{nomApp}</span>
            ) : (
              <ZevoLogo size="sm" className="text-[var(--text-primary)]" />
            )}
          </div>

          {/* Desktop : titre de page */}
          <div className="hidden md:block" />

          <div className="flex items-center gap-1">
            <ThemeToggle size="sm" />

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                style={{ touchAction: 'manipulation' }}
                className={`p-2 rounded-lg transition-colors relative active:scale-95 ${
                  notifOpen ? 'text-primary bg-[var(--bg-surface)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center animate-pulse-glow">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                    <div className="px-5 py-3.5 border-b border-[var(--border-base)] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-[var(--text-primary)] text-sm font-bold">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                            {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" onClick={markAllAsRead}>
                          Tout lire
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                          <Bell size={20} className="text-[var(--text-muted)] mx-auto mb-2" />
                          <p className="text-[var(--text-muted)] text-xs">Aucune notification</p>
                        </div>
                      ) : (
                        notifications.map((n) => {
                          const typeConfig = {
                            message:           { icon: MessageSquare, iconColor: 'text-blue-400',    iconBg: 'bg-blue-500/10' },
                            validation_semaine:{ icon: CheckCircle,   iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10' },
                            mensuration:       { icon: TrendingDown,  iconColor: 'text-purple-400',  iconBg: 'bg-purple-500/10' },
                            calendrier:        { icon: Calendar,      iconColor: 'text-orange-400',  iconBg: 'bg-orange-500/10' },
                          }
                          const cfg = typeConfig[n.type] || { icon: Bell, iconColor: 'text-[var(--text-muted)]', iconBg: 'bg-[var(--border-base)]' }
                          const IconComp = cfg.icon
                          const diff = Date.now() - new Date(n.created_at).getTime()
                          const mins  = Math.floor(diff / 60000)
                          const hours = Math.floor(mins / 60)
                          const days  = Math.floor(hours / 24)
                          const timeLabel = mins < 1 ? 'À l\'instant'
                            : mins < 60  ? `Il y a ${mins} min`
                            : hours < 24 ? `Il y a ${hours}h`
                            : days < 7   ? `Il y a ${days}j`
                            : new Date(n.created_at).toLocaleDateString('fr-FR')

                          return (
                            <button
                              key={n.id}
                              style={{ touchAction: 'manipulation' }}
                              onClick={() => {
                                if (!n.is_read) markAsRead(n.id)
                                if (n.type === 'message')    { navigate('/app/messages'); setNotifOpen(false) }
                                if (n.type === 'calendrier') { navigate('/app/seances'); setNotifOpen(false) }
                              }}
                              className={`w-full flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--border-subtle)] active:bg-[var(--border-base)] transition-colors text-left border-b border-[var(--border-subtle)] ${!n.is_read ? 'bg-[var(--border-subtle)]' : ''}`}
                            >
                              <div className={`w-8 h-8 rounded-xl ${cfg.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                <IconComp size={14} className={cfg.iconColor} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-[var(--text-primary)] text-xs font-semibold">{n.titre}</p>
                                  {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                                </div>
                                {coachName && <p className="text-primary text-[10px] font-semibold mt-0.5">{coachName}</p>}
                                <p className="text-[var(--text-secondary)] text-[11px] mt-0.5 leading-relaxed truncate">{n.message}</p>
                                <p className="text-[var(--text-muted)] text-[10px] mt-0.5 font-medium">{timeLabel}</p>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Menu hamburger mobile only */}
            <div className="relative md:hidden">
              <button
                onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false) }}
                style={{ touchAction: 'manipulation' }}
                className={`p-2 rounded-lg transition-colors active:scale-95 ${
                  menuOpen ? 'text-primary bg-[var(--bg-surface)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
                aria-label="Menu"
              >
                {menuOpen ? <X size={17} /> : <Menu size={17} />}
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl shadow-2xl overflow-hidden animate-slide-down">
                    <div className="py-1.5">
                      {MENU_ITEMS.map(({ to, icon: Icon, label }) => (
                        <NavLink
                          key={to}
                          to={to}
                          onClick={() => setMenuOpen(false)}
                          style={{ touchAction: 'manipulation' }}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors active:bg-[var(--border-base)] ${
                              isActive
                                ? 'text-primary bg-primary/5'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]'
                            }`
                          }
                        >
                          <Icon size={16} />
                          {label}
                        </NavLink>
                      ))}
                    </div>
                    <div className="border-t border-[var(--border-base)] py-1.5">
                      <button
                        onClick={() => { setMenuOpen(false); handleLogout() }}
                        style={{ touchAction: 'manipulation' }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/5 active:bg-red-500/10 transition-colors"
                      >
                        <LogOut size={16} />
                        Déconnexion
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Contenu principal */}
        <main
          className={`flex-1 overflow-auto ${hideBottomNav ? '' : 'pb-20 md:pb-0'}`}
          style={hideBottomNav ? undefined : { paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {!clientActif && location.pathname !== '/app/abonnement' ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <CreditCard size={28} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Abonnement requis</h2>
              <p className="text-[var(--text-muted)] text-sm max-w-sm mb-6">
                Pour accéder à tes programmes, séances et contenus, souscris à une offre de ton coach.
              </p>
              <button
                onClick={() => navigate('/app/abonnement')}
                style={{ touchAction: 'manipulation' }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-semibold text-sm hover:opacity-90 active:scale-[0.97] transition-all"
              >
                Voir les offres
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* ══════════ BOTTOM NAV MOBILE — style coach (bar pleine largeur) ══════════ */}
      {!hideBottomNav && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-elevated)]/95 backdrop-blur-lg border-t border-[var(--border-base)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <ul className="flex items-center justify-around h-14">
            {MAIN_NAV.map(({ to, icon: Icon, label }) => {
              const isMsgTab = to === '/app/messages'
              const badgeCount = isMsgTab ? unreadMsgCount : 0
              return (
                <li key={to} className="flex-1">
                  <NavLink
                    to={to}
                    style={{ touchAction: 'manipulation' }}
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

      {/* ══════════ OFFLINE BANNER ══════════ */}
      {isOffline && (
        <div
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold"
          style={{ background: 'rgba(30,30,30,0.97)', color: 'rgba(245,245,243,0.75)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <WifiOff size={12} />
          <span>Mode hors ligne — les données affichées sont les dernières chargées</span>
        </div>
      )}
    </div>
  )
}
