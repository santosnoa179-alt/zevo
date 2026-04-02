import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, Users, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ZevoLogo } from '../ui/ZevoLogo'

// Layout pour le Super Admin (Noa)
const navItems = [
  { to: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
  { to: '/admin/coachs', icon: Users, label: 'Coachs' },
]

export function AdminLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex">
      <aside className="w-56 flex-shrink-0 bg-[var(--bg-card)] border-r border-[var(--border-base)] flex flex-col">
        <div className="p-4 border-b border-[var(--border-base)]">
          <ZevoLogo size="md" />
          <p className="text-[var(--text-muted)] text-xs mt-1.5 pl-0.5">Super Admin</p>
        </div>

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
                        : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-surface)]'
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

        <div className="p-3 border-t border-[var(--border-base)]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors w-full"
          >
            <LogOut size={18} />
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
