"use client"

import * as React from "react"

/**
 * Chart Resize Context
 *
 * This context provides debounced resize handling for charts to prevent
 * expensive re-renders during window resize and sidebar toggle operations.
 *
 * How it works:
 * 1. When resize/sidebar animation starts, charts freeze at current dimensions
 * 2. After animation settles, charts update to new dimensions
 * 3. This batches resize events into a single update
 *
 * Key insight: Sidebar toggle causes instant margin change → layout recalc →
 * ResizeObserver fires on all charts. Without pausing, charts re-render during
 * the CSS animation causing frame drops.
 */

interface ChartResizeContextValue {
  /** Whether chart resizing is currently paused (during resize/sidebar animation) */
  isPaused: boolean
  /** Pause chart dimension updates (call before sidebar toggle) */
  pauseResize: () => void
  /** Resume chart dimension updates (call after sidebar animation) */
  resumeResize: (delay?: number) => void
  /** Get debounced dimensions - returns frozen dimensions while resizing */
  getDebouncedDimensions: (
    currentWidth: number,
    currentHeight: number,
    chartId?: string
  ) => { width: number; height: number }
}

const ChartResizeContext = React.createContext<ChartResizeContextValue | null>(null)

// Store frozen dimensions per chart
const frozenDimensions = new Map<string, { width: number; height: number }>()

// Module-level flag for synchronous pause checking (avoids closure issues in ResizeObserver)
let globalIsPaused = false

/** Check if chart resizing is paused (synchronous, for use in callbacks) */
export function isChartResizePaused(): boolean {
  return globalIsPaused
}

export function ChartResizeProvider({ children }: { children: React.ReactNode }) {
  const [isPaused, setIsPaused] = React.useState(false)
  // Use ref to track paused state synchronously (for ResizeObserver callbacks)
  const isPausedRef = React.useRef(false)
  const windowResizeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const sidebarResumeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const globalIdCounter = React.useRef(0)

  // Pause chart updates (called before sidebar toggle)
  const pauseResize = React.useCallback(() => {
    globalIsPaused = true  // Set module-level flag synchronously
    isPausedRef.current = true
    setIsPaused(true)
  }, [])

  // Resume chart updates after a delay (called after sidebar toggle)
  const resumeResize = React.useCallback((delay: number = 350) => {
    // Clear any pending resume
    if (sidebarResumeTimeoutRef.current) {
      clearTimeout(sidebarResumeTimeoutRef.current)
    }

    // Resume after animation completes
    sidebarResumeTimeoutRef.current = setTimeout(() => {
      globalIsPaused = false  // Clear module-level flag
      isPausedRef.current = false
      setIsPaused(false)
      frozenDimensions.clear()
    }, delay)
  }, [])

  // Debounce window resize events - short delay for snappy feel
  React.useEffect(() => {
    let isResizing = false

    const handleResizeStart = () => {
      if (!isResizing) {
        isResizing = true
        globalIsPaused = true  // Set module-level flag synchronously
        isPausedRef.current = true
        setIsPaused(true)
      }

      // Clear any pending resume
      if (windowResizeTimeoutRef.current) {
        clearTimeout(windowResizeTimeoutRef.current)
      }

      // Resume quickly after resize stops - 100ms is snappy but still batches
      windowResizeTimeoutRef.current = setTimeout(() => {
        isResizing = false
        globalIsPaused = false  // Clear module-level flag
        isPausedRef.current = false
        setIsPaused(false)
        frozenDimensions.clear()
      }, 100)
    }

    window.addEventListener('resize', handleResizeStart, { passive: true })

    return () => {
      window.removeEventListener('resize', handleResizeStart)
      if (windowResizeTimeoutRef.current) {
        clearTimeout(windowResizeTimeoutRef.current)
      }
    }
  }, [])

  const getDebouncedDimensions = React.useCallback(
    (currentWidth: number, currentHeight: number, chartId?: string) => {
      const id = chartId || `chart-${globalIdCounter.current++}`

      // Use ref for synchronous check (more reliable in callbacks)
      if (isPausedRef.current) {
        // Return frozen dimensions if we have them, otherwise freeze current
        const frozen = frozenDimensions.get(id)
        if (frozen) {
          return frozen
        }
        // Freeze current dimensions
        frozenDimensions.set(id, { width: currentWidth, height: currentHeight })
        return { width: currentWidth, height: currentHeight }
      }

      // Not paused - update frozen dimensions and return current
      frozenDimensions.set(id, { width: currentWidth, height: currentHeight })
      return { width: currentWidth, height: currentHeight }
    },
    [] // No dependencies - uses ref for synchronous access
  )

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (windowResizeTimeoutRef.current) {
        clearTimeout(windowResizeTimeoutRef.current)
      }
      if (sidebarResumeTimeoutRef.current) {
        clearTimeout(sidebarResumeTimeoutRef.current)
      }
    }
  }, [])

  const value = React.useMemo(
    () => ({
      isPaused,
      pauseResize,
      resumeResize,
      getDebouncedDimensions,
    }),
    [isPaused, pauseResize, resumeResize, getDebouncedDimensions]
  )

  return (
    <ChartResizeContext.Provider value={value}>
      {children}
    </ChartResizeContext.Provider>
  )
}

export function useChartResize() {
  const context = React.useContext(ChartResizeContext)
  if (!context) {
    // Return a no-op version if not in provider
    return {
      isPaused: false,
      pauseResize: () => {},
      resumeResize: () => {},
      getDebouncedDimensions: (w: number, h: number) => ({ width: w, height: h }),
    }
  }
  return context
}
