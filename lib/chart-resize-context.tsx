"use client"

import * as React from "react"

/**
 * Chart Resize Context
 *
 * This context provides debounced resize handling for charts to prevent
 * expensive re-renders during window resize operations.
 *
 * How it works:
 * 1. When window resize starts, charts freeze at current dimensions
 * 2. After resize settles (100ms debounce), charts update to new dimensions
 * 3. This batches multiple resize events into a single update
 *
 * Note: Sidebar now uses GPU-accelerated transforms and no longer needs
 * to pause chart resizing during transitions.
 */

interface ChartResizeContextValue {
  /** Whether chart resizing is currently paused (during window resize) */
  isPaused: boolean
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

export function ChartResizeProvider({ children }: { children: React.ReactNode }) {
  const [isPaused, setIsPaused] = React.useState(false)
  const windowResizeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const globalIdCounter = React.useRef(0)

  // Debounce window resize events - short delay for snappy feel
  React.useEffect(() => {
    let isResizing = false

    const handleResizeStart = () => {
      if (!isResizing) {
        isResizing = true
        setIsPaused(true)
      }

      // Clear any pending resume
      if (windowResizeTimeoutRef.current) {
        clearTimeout(windowResizeTimeoutRef.current)
      }

      // Resume quickly after resize stops - 100ms is snappy but still batches
      windowResizeTimeoutRef.current = setTimeout(() => {
        isResizing = false
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

      if (isPaused) {
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
    [isPaused]
  )

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (windowResizeTimeoutRef.current) {
        clearTimeout(windowResizeTimeoutRef.current)
      }
    }
  }, [])

  const value = React.useMemo(
    () => ({
      isPaused,
      getDebouncedDimensions,
    }),
    [isPaused, getDebouncedDimensions]
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
      getDebouncedDimensions: (w: number, h: number) => ({ width: w, height: h }),
    }
  }
  return context
}
