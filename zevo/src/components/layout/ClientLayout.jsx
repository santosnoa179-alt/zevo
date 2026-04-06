import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Target, MessageSquare, User, LogOut, BookOpen, ClipboardList, CreditCard, Layers, Dumbbell, Calendar, Bell, CheckCircle, TrendingDown, Menu, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useCoachTheme } from '../../hooks/useCoachTheme'
import OnboardingFlow from '../OnboardingFlow'
import AppTutorial from '../AppTutorial'
import ThemeToggle from '../ui/ThemeToggle'
import { ZevoLogo } from '../ui/ZevoLogo'

// ── 5 onglets principaux (bottom nav flottante) ──
const MAIN_NAV = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/app/seances', icon: Calendar, label: 'Calendrier' },
  { to: '/app/programme', icon: Layers, label: 'Programme' },
  { to: '/app/objectifs', icon: Target, label: 'Objectifs' },
  { to: '/app/messages', icon: MessageSquare, label: 'Messages' },
]

// ── Sidebar desktop : tous les onglets ──
const ALL_NAV_ITEMS = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/seances', icon: Calendar, label: 'Calendrier' },
  { to: '/app/programme', icon: Layers, label: 'Programme' },
  { to: '/app/objectifs', icon: Target, label: 'Objectifs' },
  { to: '/app/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/app/habitudes', icon: Dumbbell, label: 'Habitudes' },
  { to: '/app/ressources', icon: BookOpen, label: 'Ressources' },
  { to: '/app/formulaires', icon: ClipboardList, label: 'Formulaires' },
  { to: '/app/abonnement', icon: CreditCard, label: 'Abonnement' },
  { to: '/app/profil', icon: User, label: 'Profil' },
]

// ── Items du menu hamburger mobile (pages non présentes dans la bottom nav) ──
const MENU_ITEMS = [
  { to: '/app/habitudes', icon: Dumbbell, label: 'Habitudes' },
  { to: '/app/ressources', icon: BookOpen, label: 'Ressources' },
  { to: '/app/formulaires', icon: ClipboardList, label: 'Formulaires' },
  { to: '/app/abonnement', icon: CreditCard, label: 'Abonnement' },
  { to: '/app/profil', icon: User, label: 'Profil' },
]

// Routes où la bottom nav est masquée (mode immersif)
const HIDDEN_NAV_ROUTES = ['/app/workout', '/app/messages']

export function ClientLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const { nomApp, logoUrl } = useCoachTheme()

  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [clientActif, setClientActif] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)

  const unreadCount = notifications.filter(n => !n.is_read).length
  const unreadMsgCount = notifications.filter(n => !n.is_read && n.type === 'message').length

  const [coachName, setCoachName] = useState('')

  // ── Charge les notifications client ──
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

      // Résoudre le nom du coach
      const coachId = data?.[0]?.coach_id
      if (coachId) {
        const { data: coach } = await supabase.from('coaches').select('prenom, nom').eq('id', coachId).maybeSingle()
        if (coach) setCoachName(coach.prenom || coach.nom || 'Coach')
      }
    }
    loadNotifs()

    const channel = supabase
      .channel(`client-notifs-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `client_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new.destinataire === 'client') {
          setNotifications(prev => [payload.new, ...prev])
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `client_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  useEffect(() => {
    if (!user) return
    const checkOnboarding = async () => {
      const { data } = await supabase
        .from('clients')
        .select('onboarding_complete, actif')
        .eq('id', user.id)
        .single()

      if (data && !data.onboarding_complete) {
        setShowOnboarding(true)
      }
      if (data) {
        setClientActif(data.actif === true)
      }
      setOnboardingChecked(true)
    }
    checkOnboarding()
  }, [user])

  // Vérifier si le tutoriel interactif a été vu
  useEffect(() => {
    if (!user || showOnboarding) return
    const checkTutorial = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('tutorial_seen')
        .eq('id', user.id)
        .single()
      if (data && !data.tutorial_seen) {
        setShowTutorial(true)
      }
    }
    checkTutorial()
  }, [user, showOnboarding])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Masquer la nav sur certaines routes (workout tracker)
  const hideBottomNav = HIDDEN_NAV_ROUTES.some(r => location.pathname.startsWith(r))

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col">
      {showOnboarding && onboardingChecked && (
        <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
      )}

      {showTutorial && !showOnboarding && (
        <AppTutorial onComplete={() => setShowTutorial(false)} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-base)]/90 backdrop-blur-lg border-b border-[var(--border-base)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <>
              <img src={logoUrl} alt={nomApp} className="w-7 h-7 rounded-lg object-cover" />
              <span className="font-bold tracking-tight text-[var(--text-primary)] text-base">
                {nomApp}
              </span>
            </>
          ) : (
            <ZevoLogo size="sm" className="text-[var(--text-primary)]" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <ThemeToggle size="sm" />

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className={`p-2 rounded-lg transition-colors relative ${
                notifOpen ? 'text-[#FF6B2B] bg-[var(--bg-surface)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#FF6B2B] text-white text-[9px] font-bold flex items-center justify-center animate-pulse-glow">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl shadow-2xl overflow-hidden animate-scale-in">
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
                      <button className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" onClick={markAllAsRead}>
                        Tout lire
                      </button>
                    )}
                  </div>

                  {/* Liste */}
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <Bell size={20} className="text-[var(--text-muted)] mx-auto mb-2" />
                        <p className="text-[var(--text-muted)] text-xs">Aucune notification</p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const typeConfig = {
                          message: { icon: MessageSquare, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10' },
                          validation_semaine: { icon: CheckCircle, iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10' },
                          mensuration: { icon: TrendingDown, iconColor: 'text-purple-400', iconBg: 'bg-purple-500/10' },
                          calendrier: { icon: Calendar, iconColor: 'text-orange-400', iconBg: 'bg-orange-500/10' },
                        }
                        const cfg = typeConfig[n.type] || { icon: Bell, iconColor: 'text-[var(--text-muted)]', iconBg: 'bg-[var(--border-base)]' }
                        const IconComp = cfg.icon

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
                            onClick={() => {
                              if (!n.is_read) markAsRead(n.id)
                              if (n.type === 'message') { navigate('/app/messages'); setNotifOpen(false) }
                              if (n.type === 'calendrier') { navigate('/app/seances'); setNotifOpen(false) }
                            }}
                            className={`w-full flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--border-subtle)] transition-colors text-left border-b border-[var(--border-subtle)] ${!n.is_read ? 'bg-[var(--border-subtle)]' : ''}`}
                          >
                            <div className={`w-8 h-8 rounded-xl ${cfg.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                              <IconComp size={14} className={cfg.iconColor} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[var(--text-primary)] text-xs font-semibold">{n.titre}</p>
                                {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B2B] flex-shrink-0" />}
                              </div>
                              {coachName && (
                                <p className="text-[#FF6B2B] text-[10px] font-semibold mt-0.5">{coachName}</p>
                              )}
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

          {/* Menu hamburger (mobile only) */}
          <div className="relative md:hidden">
            <button
              onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false) }}
              className={`p-2 rounded-lg transition-colors ${
                menuOpen ? 'text-[#FF6B2B] bg-[var(--bg-surface)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
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
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                            isActive
                              ? 'text-[#FF6B2B] bg-[#FF6B2B]/5'
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
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-colors"
                    >
                      <LogOut size={16} />
                      Déconnexion
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Logout desktop only */}
          <button
            onClick={handleLogout}
            className="hidden md:block text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors p-1.5"
            aria-label="Se déconnecter"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main content — pb-28 pour laisser place à la floating nav */}
      <main className={`flex-1 overflow-auto ${hideBottomNav ? '' : 'pb-28'} md:pb-0 md:ml-56`}>
        {!clientActif && location.pathname !== '/app/abonnement' ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#FF6B2B]/10 flex items-center justify-center mb-5">
              <CreditCard size={28} className="text-[#FF6B2B]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Abonnement requis</h2>
            <p className="text-[var(--text-muted)] text-sm max-w-sm mb-6">
              Pour accéder à tes programmes, séances et contenus, souscris à une offre de ton coach.
            </p>
            <button
              onClick={() => navigate('/app/abonnement')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Voir les offres
            </button>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      {/* ═══════ FLOATING BOTTOM NAV — iOS/Apple Fitness Style ═══════ */}
      {!hideBottomNav && (
        <nav className="fixed bottom-5 left-4 right-4 z-50 md:hidden">
          <div className="bg-[var(--bg-elevated)]/90 backdrop-blur-xl border border-[var(--border-base)] rounded-3xl shadow-2xl shadow-black/20 px-2 py-2">
            <ul className="flex items-center justify-around">
              {MAIN_NAV.map(({ to, icon: Icon, label }) => {
                const isMsgTab = to === '/app/messages'
                const badgeCount = isMsgTab ? unreadMsgCount : 0
                return (
                  <li key={to}>
                    <NavLink
                      to={to}
                      className={({ isActive }) => 'relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-300 ' + (
                        isActive
                          ? 'bg-[#FF6B2B]/10'
                          : 'hover:bg-[var(--border-subtle)]'
                      )}
                    >
                      {({ isActive }) => (
                        <>
                          <div className="relative">
                            <Icon
                              size={21}
                              className={`transition-colors duration-300 ${
                                isActive ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'
                              }`}
                              strokeWidth={isActive ? 2.3 : 1.8}
                            />
                            {badgeCount > 0 && (
                              <span className="absolute -top-1.5 -right-2.5 min-w-[14px] h-3.5 px-1 rounded-full bg-[#FF6B2B] text-white text-[8px] font-bold flex items-center justify-center">
                                {badgeCount > 9 ? '9+' : badgeCount}
                              </span>
                            )}
                          </div>
                          <span className={`text-[9px] font-semibold transition-colors duration-300 ${
                            isActive ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'
                          }`}>
                            {label}
                          </span>
                          {isActive && (
                            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FF6B2B]" />
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>
      )}

      {/* Sidebar desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 bg-[var(--bg-card)] border-r border-[var(--border-base)] flex-col pt-16">
        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {ALL_NAV_ITEMS.map(({ to, icon: Icon, label }) => {
              const isMsgTab = to === '/app/messages'
              const badgeCount = isMsgTab ? unreadMsgCount : 0
              return (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#FF6B2B]/10 text-[#FF6B2B]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]'
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span className="flex-1">{label}</span>
                    {badgeCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF6B2B] text-white text-[9px] font-bold flex items-center justify-center">
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </div>
  )
}
