"use client"

import * as React from "react"

/**
 * Chart Resize Context
 * 
 * This context provides a way to pause chart resizing during layout transitions
 * (e.g., sidebar open/close) to prevent expensive re-renders of all charts.
 * 
 * How it works:
 * 1. When sidebar starts transitioning, call `pauseResize()`
 * 2. Charts will freeze at their current dimensions
 * 3. After transition completes (300ms), call `resumeResize()`
 * 4. Charts will then update to their new dimensions
 */

interface ChartResizeContextValue {
  /** Whether chart resizing is currently paused */
  isPaused: boolean
  /** Pause chart resizing (call when starting transition) */
  pauseResize: () => void
  /** Resume chart resizing (call after transition completes) */
  resumeResize: () => void
  /** Get debounced dimensions - returns frozen dimensions while paused */
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
  const windowResizeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const globalIdCounter = React.useRef(0)

  const pauseResize = React.useCallback(() => {
    setIsPaused(true)
  }, [])

  const resumeResize = React.useCallback(() => {
    // Immediate resume - use RAF for next frame
    requestAnimationFrame(() => {
      setIsPaused(false)
      frozenDimensions.clear()
    })
  }, [])

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

/**
 * Hook to automatically pause/resume resize during sidebar transitions
 */
export function useSidebarTransitionResize() {
  const { pauseResize, resumeResize } = useChartResize()
  
  return React.useMemo(
    () => ({
      onTransitionStart: pauseResize,
      onTransitionEnd: resumeResize,
    }),
    [pauseResize, resumeResize]
  )
}
