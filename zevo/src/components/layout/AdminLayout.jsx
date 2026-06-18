import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, Users, CreditCard, LogOut, Shield, Menu, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ZevoLogo } from '../ui/ZevoLogo'

// Layout pour le Super Admin (Noa)
const navItems = [
  { to: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
  { to: '/admin/coachs', icon: Users, label: 'Coachs' },
  { to: '/admin/abonnements', icon: CreditCard, label: 'Abonnements' },
]

export function AdminLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col md:flex-row">

      {/* ── Mobile header bar ── */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[var(--bg-card)] border-b border-[var(--border-base)]">
        <div className="flex items-center gap-3">
          <ZevoLogo size="sm" />
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
            <Shield size={12} />
            Super Admin
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* ── Mobile slide-down nav ── */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[var(--bg-card)] border-b border-[var(--border-base)] px-4 pb-4 animate-page-enter">
          <nav>
            <ul className="space-y-1">
              {navItems.map(({ to, icon: Icon, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary border-l-2 border-primary'
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
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors w-full"
            >
              <LogOut size={18} />
              Se deconnecter
            </button>
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-60 flex-shrink-0 bg-[var(--bg-card)] border-r border-[var(--border-base)] flex-col">

        {/* Logo area with subtle gradient glow */}
        <div className="relative p-5 border-b border-[var(--border-base)]">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <ZevoLogo size="md" />
          </div>
          <div className="relative mt-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider border border-primary/20">
              <Shield size={12} />
              Super Admin
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5">
          <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Navigation
          </p>
          <ul className="space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-surface)]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active gradient left border accent */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-primary to-primary-light" />
                      )}
                      <Icon size={18} className={isActive ? 'text-primary' : 'text-[var(--text-muted)] group-hover:text-white transition-colors'} />
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-[var(--border-subtle)]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors w-full"
          >
            <LogOut size={18} />
            Se deconnecter
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <main className="flex-1 overflow-auto">
        <div className="animate-page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
