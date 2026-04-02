// Skeleton loader — affichage pendant le chargement des données (theme-aware)
export function Skeleton({ className = '' }) {
  return (
    <div
      className={`bg-[var(--bg-surface)] rounded-lg animate-pulse ${className}`}
    />
  )
}

// Skeleton pour une card complète
export function CardSkeleton() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl p-4 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-full" />
    </div>
  )
}
