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
  const resumeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const windowResizeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const globalIdCounter = React.useRef(0)

  const pauseResize = React.useCallback(() => {
    // Clear any pending resume
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current)
      resumeTimeoutRef.current = null
    }
    setIsPaused(true)
  }, [])

  const resumeResize = React.useCallback(() => {
    // Delay resume to let the transition complete smoothly
    resumeTimeoutRef.current = setTimeout(() => {
      setIsPaused(false)
      // Clear frozen dimensions after a small delay to allow smooth update
      setTimeout(() => {
        frozenDimensions.clear()
      }, 50)
    }, 50) // Small delay after transition
  }, [])

  // Debounce window resize events to prevent chart re-renders during resize
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
      
      // Resume after resize stops
      windowResizeTimeoutRef.current = setTimeout(() => {
        isResizing = false
        setIsPaused(false)
        // Clear frozen dimensions
        setTimeout(() => {
          frozenDimensions.clear()
        }, 50)
      }, 200) // Wait 200ms after last resize event
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
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current)
      }
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
