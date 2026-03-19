// Skeleton loader — affichage pendant le chargement des données
export function Skeleton({ className = '' }) {
  return (
    <div
      className={`bg-[#2A2A2A] rounded-lg animate-pulse ${className}`}
    />
  )
}

// Skeleton pour une card complète
export function CardSkeleton() {
  return (
    <div className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-4 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-full" />
    </div>
  )
}
