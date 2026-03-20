import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, MessageSquare, Settings, LogOut, Layers, BookOpen, ClipboardList, FileText, BarChart3, CreditCard, Paintbrush, Menu, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ZevoLogo } from '../ui/ZevoLogo'

// Layout pour les coachs
const navItems = [
  { to: '/coach/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/coach/clients', icon: Users, label: 'Clients' },
  { to: '/coach/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/coach/programmes', icon: Layers, label: 'Programmes' },
  { to: '/coach/bibliotheque', icon: BookOpen, label: 'Bibliothèque' },
  { to: '/coach/formulaires', icon: ClipboardList, label: 'Formulaires' },
  { to: '/coach/rapports', icon: FileText, label: 'Rapports' },
  { to: '/coach/statistiques', icon: BarChart3, label: 'Statistiques' },
  { to: '/coach/abonnements', icon: CreditCard, label: 'Abonnements' },
  { to: '/coach/app-builder', icon: Paintbrush, label: 'App Builder' },
  { to: '/coach/parametres', icon: Settings, label: 'Paramètres' },
]

// Items prioritaires affichés dans la bottom nav mobile (max 5)
const mobileNavItems = navItems.slice(0, 4).concat(navItems.find(n => n.to === '/coach/parametres'))

export function CoachLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col md:flex-row">

      {/* ── Header mobile ── */}
      <header className="md:hidden sticky top-0 z-50 bg-[#0D0D0D] border-b border-white/[0.08] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ZevoLogo size="sm" variant="icon" />
          <span className="font-bold tracking-tight text-[#F5F5F3] text-base">Zevo</span>
        </div>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-white/50 hover:text-white p-1.5 transition-colors"
          aria-label="Menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* ── Menu mobile déroulant (overlay) ── */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-[53px] z-40 bg-[#0D0D0D]/95 backdrop-blur-sm overflow-auto">
          <nav className="p-4">
            <ul className="space-y-1">
              {navItems.map(({ to, icon: Icon, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
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
            <div className="mt-4 pt-4 border-t border-white/[0.08]">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors w-full"
              >
                <LogOut size={18} />
                Se déconnecter
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* ── Sidebar desktop (hidden on mobile) ── */}
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-[#1E1E1E] border-r border-white/[0.08] flex-col sticky top-0 h-screen">
        {/* Logo */}
        <div className="p-4 border-b border-white/[0.08]">
          <ZevoLogo size="md" />
          <p className="text-white/30 text-xs mt-1.5 pl-0.5">Espace coach</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
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

      {/* ── Contenu principal ── */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* ── Bottom nav mobile (5 items prioritaires) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1E1E1E] border-t border-white/[0.08]">
        <ul className="flex items-center justify-around h-14">
          {mobileNavItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-2 py-1.5 transition-colors ${
                    isActive ? 'text-[#FF6B2B]' : 'text-white/35'
                  }`
                }
              >
                <Icon size={18} />
                <span className="text-[9px] font-medium">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
