import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, MessageSquare, Settings, LogOut, Layers, BookOpen } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ZevoLogo } from '../ui/ZevoLogo'

// Layout pour les coachs
const navItems = [
  { to: '/coach/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/coach/clients', icon: Users, label: 'Clients' },
  { to: '/coach/programmes', icon: Layers, label: 'Programmes' },
  { to: '/coach/bibliotheque', icon: BookOpen, label: 'Bibliothèque' },
  { to: '/coach/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/coach/parametres', icon: Settings, label: 'Paramètres' },
]

export function CoachLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex">
      {/* Sidebar desktop */}
      <aside className="w-56 flex-shrink-0 bg-[#1E1E1E] border-r border-white/[0.08] flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-white/[0.08]">
          <ZevoLogo size="md" />
          <p className="text-white/30 text-xs mt-1.5 pl-0.5">Espace coach</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => (
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

        {/* Déconnexion */}
        <div className="p-3 border-t border-white/[0.08]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors w-full"
          >
            <LogOut size={18} />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
