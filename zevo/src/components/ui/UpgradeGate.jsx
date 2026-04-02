import { Lock, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Bloque l'accès à une feature et affiche un CTA upgrade
export function UpgradeGate({ feature, minPlan, children }) {
  const navigate = useNavigate()

  return (
    <div className="relative">
      {/* Contenu flouté en arrière-plan */}
      <div className="blur-[2px] opacity-30 pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {/* Overlay upgrade */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-[var(--bg-card)] border border-[var(--border-base)] rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center mx-auto mb-4">
            <Lock size={22} className="text-[#FF6B2B]" />
          </div>
          <h3 className="text-[var(--text-primary)] font-bold text-lg mb-2">
            Fonctionnalité {minPlan === 'unlimited' ? 'Unlimited' : 'Pro'}
          </h3>
          <p className="text-[var(--text-muted)] text-sm mb-5">
            {feature} est disponible à partir du plan{' '}
            <span className="text-[#FF6B2B] font-semibold capitalize">{minPlan}</span>.
            Passez au niveau supérieur pour débloquer cette fonctionnalité.
          </p>
          <button
            onClick={() => navigate('/pricing')}
            className="inline-flex items-center gap-2 bg-[#FF6B2B] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e55e24] transition-colors"
          >
            <ArrowUpRight size={16} />
            Voir les plans
          </button>
        </div>
      </div>
    </div>
  )
}
