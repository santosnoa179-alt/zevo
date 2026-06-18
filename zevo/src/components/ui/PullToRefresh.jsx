import { Loader2 } from 'lucide-react'

/**
 * Pull-to-refresh visual indicator
 * Place at the top of a scrollable container
 */
export default function PullToRefreshIndicator({ pullDistance, isRefreshing, threshold = 80 }) {
  if (pullDistance <= 0 && !isRefreshing) return null

  const progress = Math.min(pullDistance / threshold, 1)
  const rotation = pullDistance * 3.6 // rotate as you pull
  const scale = 0.5 + progress * 0.5
  const opacity = Math.min(progress * 1.5, 1)
  const showReady = pullDistance >= threshold

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-all"
      style={{
        height: isRefreshing ? 56 : pullDistance,
        opacity: isRefreshing ? 1 : opacity,
      }}
    >
      <div
        className={`flex items-center justify-center transition-all duration-200 ${showReady && !isRefreshing ? 'text-primary' : 'text-[var(--text-muted)]'}`}
        style={{ transform: `scale(${isRefreshing ? 1 : scale}) rotate(${isRefreshing ? 0 : rotation}deg)` }}
      >
        {isRefreshing ? (
          <div className="flex items-center gap-2">
            <Loader2 size={18} className="animate-spin text-primary" />
            <span className="text-[var(--text-muted)] text-xs font-medium">Actualisation...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="transition-transform duration-200" style={{ transform: showReady ? 'rotate(180deg)' : '' }}>
              <path d="M12 5v14M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {showReady && <span className="text-[10px] font-bold text-primary">Relâcher</span>}
          </div>
        )}
      </div>
    </div>
  )
}
