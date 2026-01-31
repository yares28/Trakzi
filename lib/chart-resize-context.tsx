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
 * 2. After animation settles, a custom event 'chart-resize-resume' is dispatched
 * 3. Charts listen for this event and update dimensions once via RAF
 *
 * Key optimization: isPaused is NOT in context value, preventing re-render cascade.
 * Instead, charts use the synchronous isChartResizePaused() check and listen for
 * the resume event to know when to re-measure.
 */

interface ChartResizeContextValue {
  /** Pause chart dimension updates (call before sidebar toggle) */
  pauseResize: () => void
  /** Resume chart dimension updates after delay (call after sidebar toggle) */
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

// Track which source initiated the pause to prevent race conditions
let pauseSource: 'window' | 'sidebar' | null = null

/** Check if chart resizing is paused (synchronous, for use in callbacks) */
export function isChartResizePaused(): boolean {
  return globalIsPaused
}

/** Custom event name for chart resume notification */
const CHART_RESIZE_RESUME_EVENT = 'chart-resize-resume'

/** Dispatch the resume event so charts know to re-measure */
function dispatchResumeEvent() {
  window.dispatchEvent(new CustomEvent(CHART_RESIZE_RESUME_EVENT))
}

export function ChartResizeProvider({ children }: { children: React.ReactNode }) {
  // Use ref to track paused state synchronously (for ResizeObserver callbacks)
  const isPausedRef = React.useRef(false)
  const resumeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const globalIdCounter = React.useRef(0)

  // Pause chart updates (called before sidebar toggle or window resize)
  const pauseResize = React.useCallback((source: 'sidebar' | 'window' = 'sidebar') => {
    // If already paused by same source, don't reset
    if (globalIsPaused && pauseSource === source) return

    // Clear any pending resume from this source
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current)
      resumeTimeoutRef.current = null
    }

    globalIsPaused = true
    pauseSource = source
    isPausedRef.current = true
  }, [])

  // Resume chart updates after a delay (called after sidebar toggle or window resize stops)
  const resumeResize = React.useCallback((delay: number = 300) => {
    // Clear any pending resume
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current)
    }

    // Resume after animation completes
    resumeTimeoutRef.current = setTimeout(() => {
      globalIsPaused = false
      pauseSource = null
      isPausedRef.current = false
      frozenDimensions.clear()
      // Dispatch event so charts know to re-measure
      dispatchResumeEvent()
      resumeTimeoutRef.current = null
    }, delay)
  }, [])

  // Debounce window resize events
  React.useEffect(() => {
    let windowResizeTimeout: ReturnType<typeof setTimeout> | null = null

    const handleResizeStart = () => {
      // Don't interrupt sidebar animation with window resize
      if (pauseSource === 'sidebar') return

      pauseResize('window')

      // Clear any pending resume
      if (windowResizeTimeout) {
        clearTimeout(windowResizeTimeout)
      }

      // Resume quickly after resize stops - 100ms is snappy but still batches
      windowResizeTimeout = setTimeout(() => {
        // Only resume if still paused by window (not hijacked by sidebar)
        if (pauseSource === 'window') {
          globalIsPaused = false
          pauseSource = null
          isPausedRef.current = false
          frozenDimensions.clear()
          dispatchResumeEvent()
        }
        windowResizeTimeout = null
      }, 100)
    }

    window.addEventListener('resize', handleResizeStart, { passive: true })

    return () => {
      window.removeEventListener('resize', handleResizeStart)
      if (windowResizeTimeout) {
        clearTimeout(windowResizeTimeout)
      }
    }
  }, [pauseResize])

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

  // Cleanup on unmount - CRITICAL: reset global state to prevent permanent freeze
  React.useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current)
      }
      // Reset global state on unmount to prevent charts staying frozen after navigation
      globalIsPaused = false
      pauseSource = null
      frozenDimensions.clear()
    }
  }, [])

  // Memoize context value - NO isPaused here to prevent re-render cascade
  const value = React.useMemo(
    () => ({
      pauseResize: () => pauseResize('sidebar'),
      resumeResize,
      getDebouncedDimensions,
    }),
    [pauseResize, resumeResize, getDebouncedDimensions]
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
      pauseResize: () => {},
      resumeResize: () => {},
      getDebouncedDimensions: (w: number, h: number) => ({ width: w, height: h }),
    }
  }
  return context
}

/** Hook for charts to subscribe to resume events */
export function useChartResizeResume(onResume: () => void) {
  React.useEffect(() => {
    window.addEventListener(CHART_RESIZE_RESUME_EVENT, onResume)
    return () => window.removeEventListener(CHART_RESIZE_RESUME_EVENT, onResume)
  }, [onResume])
}
