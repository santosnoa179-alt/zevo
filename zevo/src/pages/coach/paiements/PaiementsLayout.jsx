import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, RefreshCw,
  FileText, Package, Link2, TicketPercent, Settings, Wallet, ExternalLink
} from 'lucide-react'

const SUB_NAV = [
  { to: '/coach/abonnements', icon: LayoutDashboard, label: 'Business', end: true },
  { to: '/coach/abonnements/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/coach/abonnements/abonnements', icon: RefreshCw, label: 'Abonnements' },
  { to: '/coach/abonnements/factures', icon: FileText, label: 'Factures' },
  { to: '/coach/abonnements/produits', icon: Package, label: 'Produits' },
  { to: '/coach/abonnements/liens', icon: Link2, label: 'Liens de paiement' },
  { to: '/coach/abonnements/codes', icon: TicketPercent, label: 'Codes de réduction' },
  { to: '/coach/abonnements/parametres', icon: Settings, label: 'Paramètres' },
]

export default function PaiementsLayout() {
  const location = useLocation()

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
      {/* ── Sidebar desktop ── */}
      <aside className="hidden lg:flex flex-col w-[220px] shrink-0 border-r border-[var(--border-base)] bg-[var(--bg-elevated)]">
        {/* Header */}
        <div className="p-4 pb-3 border-b border-[var(--border-base)]">
          <div className="flex items-center gap-2.5">
            <Wallet size={16} className="text-[var(--text-muted)]" strokeWidth={1.75} />
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">Paiements</h2>
              <p className="text-[10px] text-[var(--text-muted)]">Gérez vos revenus</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {SUB_NAV.map(item => {
            const Icon = item.icon
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to)

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group ${
                  isActive
                    ? 'bg-[#FF6B2B]/10 text-[#FF6B2B]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                  isActive ? 'bg-[#FF6B2B]/20' : 'bg-transparent group-hover:bg-[var(--bg-surface)]'
                }`}>
                  <Icon size={14} className={isActive ? 'text-[#FF6B2B]' : ''} />
                </div>
                {item.label}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FF6B2B]" />
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom info — lien direct vers Stripe */}
        <div className="p-3 border-t border-[var(--border-base)]">
          <a
            href="https://dashboard.stripe.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--bg-surface)] hover:bg-[#635BFF]/10 border border-[var(--border-base)] hover:border-[#635BFF]/30 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#635BFF]/10 flex items-center justify-center shrink-0">
              <Wallet size={14} className="text-[#635BFF]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[var(--text-primary)]">Mon solde Stripe</p>
              <p className="text-[10px] text-[var(--text-muted)]">Voir dans Stripe</p>
            </div>
            <ExternalLink size={11} className="text-[var(--text-muted)] group-hover:text-[#635BFF] shrink-0" />
          </a>
        </div>
      </aside>

      {/* ── Mobile tabs ── */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="lg:hidden border-b border-[var(--border-base)] bg-[var(--bg-elevated)]">
          <div className="flex overflow-x-auto no-scrollbar px-2 py-2 gap-1">
            {SUB_NAV.map(item => {
              const Icon = item.icon
              const isActive = item.end
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to)

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                    isActive
                      ? 'bg-[#FF6B2B]/10 text-[#FF6B2B]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon size={13} />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        </div>

        {/* ── Page content ── */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
