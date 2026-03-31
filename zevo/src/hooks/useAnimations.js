import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Staggered entrance animation for list items
 * Returns array of style+className per item
 */
export function useStagger(count, { delay = 60, baseDelay = 100 } = {}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Small RAF delay to ensure DOM is ready
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return Array.from({ length: count }, (_, i) => ({
    className: `transition-all duration-500 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`,
    style: { transitionDelay: `${baseDelay + i * delay}ms` },
  }))
}

/**
 * Page entrance animation — fade + slide up
 * Resets on route change
 */
export function usePageTransition() {
  const location = useLocation()
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    setEntered(false)
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true))
    })
    return () => cancelAnimationFrame(raf)
  }, [location.pathname])

  return {
    className: `transition-all duration-500 ease-out ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`,
  }
}

/**
 * Pull-to-refresh hook for mobile
 * Returns { pullDistance, isRefreshing, handlers }
 */
export function usePullToRefresh(onRefresh, { threshold = 80, maxPull = 120 } = {}) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const pulling = useRef(false)
  const containerRef = useRef(null)

  const handleTouchStart = useCallback((e) => {
    // Only activate if scrolled to top
    const scrollTop = containerRef.current?.scrollTop ?? window.scrollY
    if (scrollTop > 5 || isRefreshing) return
    startY.current = e.touches[0].clientY
    pulling.current = true
  }, [isRefreshing])

  const handleTouchMove = useCallback((e) => {
    if (!pulling.current) return
    const diff = e.touches[0].clientY - startY.current
    if (diff < 0) { pulling.current = false; setPullDistance(0); return }
    // Diminishing pull (rubber band effect)
    const distance = Math.min(maxPull, diff * 0.5)
    setPullDistance(distance)
  }, [maxPull])

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return
    pulling.current = false

    if (pullDistance >= threshold && onRefresh) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    setPullDistance(0)
  }, [pullDistance, threshold, onRefresh])

  return {
    pullDistance,
    isRefreshing,
    containerRef,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}
