import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Target, CheckSquare, MessageSquare, User, LogOut, BookOpen, ClipboardList } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useCoachTheme } from '../../hooks/useCoachTheme'
import { ZevoLogo } from '../ui/ZevoLogo'
import OnboardingFlow from '../OnboardingFlow'

// Tous les onglets possibles — filtrés selon les modules activés par le coach
const ALL_NAV_ITEMS = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard', alwaysVisible: true },
  { to: '/app/habitudes', icon: CheckSquare, label: 'Habitudes', alwaysVisible: true },
  { to: '/app/objectifs', icon: Target, label: 'Objectifs', alwaysVisible: true },
  { to: '/app/messages', icon: MessageSquare, label: 'Messages', alwaysVisible: true },
  { to: '/app/ressources', icon: BookOpen, label: 'Ressources', alwaysVisible: true },
  { to: '/app/formulaires', icon: ClipboardList, label: 'Formulaires', alwaysVisible: true },
  { to: '/app/profil', icon: User, label: 'Profil', alwaysVisible: true },
]

export function ClientLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Charge le thème du coach — retourne nom, logo, couleur, modules
  const { nomApp, logoUrl, couleur, modules, loading } = useCoachTheme()

  // Vérifie si l'onboarding a été complété
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

  // Filtre les items de navigation visibles
  const navItems = ALL_NAV_ITEMS.filter(item => item.alwaysVisible)

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col">
      {/* Overlay d'onboarding au premier login */}
      {showOnboarding && onboardingChecked && (
        <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Header — affiche le logo/nom du coach au lieu de Zevo par défaut */}
      <header className="sticky top-0 z-40 bg-[#0D0D0D] border-b border-white/[0.08] px-4 py-3 flex items-center justify-between">
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

      {/* Contenu principal — md:ml-56 compense la sidebar fixe desktop */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0 md:ml-56">
        <Outlet />
      </main>

      {/* Barre de navigation mobile (bottom nav) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#1E1E1E] border-t border-white/[0.08] md:hidden">
        <ul className="flex items-center justify-around h-16">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-3 py-2 transition-colors ${
                    isActive ? 'text-[var(--color-primary,#FF6B2B)]' : 'text-white/40 hover:text-white/70'
                  }`
                }
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 bg-[#1E1E1E] border-r border-white/[0.08] flex-col pt-16">
        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[var(--color-primary,#FF6B2B)]/10 text-[var(--color-primary,#FF6B2B)]'
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
