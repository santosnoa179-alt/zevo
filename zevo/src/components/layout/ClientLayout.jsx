import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Target, MessageSquare, User, LogOut, BookOpen, ClipboardList, CreditCard, Layers, Dumbbell, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useCoachTheme } from '../../hooks/useCoachTheme'
import { ZevoLogo } from '../ui/ZevoLogo'
import OnboardingFlow from '../OnboardingFlow'

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

// Routes où la bottom nav est masquée (mode immersif)
const HIDDEN_NAV_ROUTES = ['/app/workout']

export function ClientLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const { nomApp, logoUrl } = useCoachTheme()

  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  useEffect(() => {
    if (!user) return
    const checkOnboarding = async () => {
      const { data } = await supabase
        .from('clients')
        .select('onboarding_complete')
        .eq('id', user.id)
        .single()

      if (data && !data.onboarding_complete) {
        setShowOnboarding(true)
      }
      setOnboardingChecked(true)
    }
    checkOnboarding()
  }, [user])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Masquer la nav sur certaines routes (workout tracker)
  const hideBottomNav = HIDDEN_NAV_ROUTES.some(r => location.pathname.startsWith(r))

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col">
      {showOnboarding && onboardingChecked && (
        <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0D0D0D]/90 backdrop-blur-lg border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img src={logoUrl} alt={nomApp} className="w-7 h-7 rounded-lg object-cover" />
          ) : (
            <ZevoLogo size="sm" variant="icon" />
          )}
          <span className="font-bold tracking-tight text-[#F5F5F3] text-base">
            {nomApp}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="text-white/40 hover:text-white/70 transition-colors p-1.5"
          aria-label="Se déconnecter"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Main content — pb-28 pour laisser place à la floating nav */}
      <main className={`flex-1 overflow-auto ${hideBottomNav ? '' : 'pb-28'} md:pb-0 md:ml-56`}>
        <Outlet />
      </main>

      {/* ═══════ FLOATING BOTTOM NAV — iOS/Apple Fitness Style ═══════ */}
      {!hideBottomNav && (
        <nav className="fixed bottom-5 left-4 right-4 z-50 md:hidden">
          <div className="bg-black/80 backdrop-blur-xl border border-white/[0.10] rounded-3xl shadow-2xl shadow-black/50 px-2 py-2">
            <ul className="flex items-center justify-around">
              {MAIN_NAV.map(({ to, icon: Icon, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) => 'relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-300 ' + (
                      isActive
                        ? 'bg-[#FF6B2B]/10'
                        : 'hover:bg-white/[0.04]'
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={21}
                          className={`transition-colors duration-300 ${
                            isActive ? 'text-[#FF6B2B]' : 'text-white/35'
                          }`}
                          strokeWidth={isActive ? 2.3 : 1.8}
                        />
                        <span className={`text-[9px] font-semibold transition-colors duration-300 ${
                          isActive ? 'text-[#FF6B2B]' : 'text-white/30'
                        }`}>
                          {label}
                        </span>
                        {/* Active indicator dot */}
                        {isActive && (
                          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FF6B2B]" />
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}

      {/* Sidebar desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 bg-[#1E1E1E] border-r border-white/[0.08] flex-col pt-16">
        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {ALL_NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#FF6B2B]/10 text-[#FF6B2B]'
                        : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                    }`
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  )
}
