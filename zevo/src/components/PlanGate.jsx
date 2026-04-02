import { usePlanLimits } from '../hooks/usePlanLimits'
import { UpgradeGate } from './ui/UpgradeGate'

// Wrapper qui vérifie si le coach a accès à une feature selon son plan.
// Usage : <PlanGate feature="rapports"><CoachRapportsPage /></PlanGate>
export function PlanGate({ feature, children }) {
  const { hasFeature, getMinPlan, getFeatureLabel, loading } = usePlanLimits()

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#FF6B2B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!hasFeature(feature)) {
    return (
      <UpgradeGate feature={getFeatureLabel(feature)} minPlan={getMinPlan(feature)}>
        {children}
      </UpgradeGate>
    )
  }

  return children
}
