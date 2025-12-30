import { useCallback, useEffect, useRef, useState } from "react"

import {
  CHART_ORDER_STORAGE_KEY,
  CHART_SIZES_STORAGE_KEY,
  CHART_SIZES_VERSION_KEY,
  DEFAULT_CHART_ORDER,
  DEFAULT_CHART_SIZES,
  DEFAULT_SIZES_VERSION,
} from "../constants"

type ChartSize = { w: number; h: number; x?: number; y?: number }

export function useChartLayout() {
  // @dnd-kit: Chart order state with persistence (replaces GridStack refs)
  const [analyticsChartOrder, setAnalyticsChartOrder] = useState<string[]>(DEFAULT_CHART_ORDER)

  // Load chart order from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHART_ORDER_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === DEFAULT_CHART_ORDER.length) {
          setAnalyticsChartOrder(parsed)
        }
      }
    } catch (e) {
      console.error("Failed to load chart order:", e)
    }
  }, [])

  // Handle chart order change from drag-and-drop
  const handleChartOrderChange = useCallback((newOrder: string[]) => {
    setAnalyticsChartOrder(newOrder)
    try {
      localStorage.setItem(CHART_ORDER_STORAGE_KEY, JSON.stringify(newOrder))
    } catch (e) {
      console.error("Failed to save chart order:", e)
    }
  }, [])

  // Handle chart resize from drag
  const [savedSizes, setSavedSizes] = useState<Record<string, { w: number; h: number }>>({})

  const handleChartResize = useCallback((chartId: string, w: number, h: number) => {
    setSavedSizes(prev => {
      const next = { ...prev, [chartId]: { w, h } }
      try {
        localStorage.setItem("analytics-chart-sizes-user", JSON.stringify(next))
      } catch (e) {
        console.error("Failed to save chart size:", e)
      }
      return next
    })
  }, [])

  // Load saved sizes on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("analytics-chart-sizes-user")
      if (saved) {
        setSavedSizes(JSON.parse(saved))
      }
    } catch {
      // Ignore
    }
  }, [])

  // Default chart sizes and positions - these are the initial sizes for new users
  // Update these values to match your current chart layout
  // Note: GridStack uses grid units (not pixels)
  // w = width in grid units (6 or 12 columns), h = height in grid units (4-20)
  // x = x position in grid units (0-11), y = y position in grid units (stacks vertically)
  // Snap to nearest allowed size (snap width, keep height as-is)
  const snapToAllowedSize = useCallback((w: number, h: number) => {
    // Snap width to nearest allowed size (6 or 12)
    // Keep height as-is (user can resize vertically freely)
    const widthDistanceToSmall = Math.abs(w - 6)
    const widthDistanceToLarge = Math.abs(w - 12)

    const snappedWidth = widthDistanceToSmall <= widthDistanceToLarge ? 6 : 12

    // Clamp height to valid range
    const clampedHeight = Math.max(4, Math.min(20, h))

    return { w: snappedWidth, h: clampedHeight }
  }, [])

  // localStorage key for chart sizes and positions
  // Load saved chart sizes and positions from localStorage
  const loadChartSizes = useCallback((): Record<string, ChartSize> => {
    if (typeof window === "undefined") return {}
    try {
      const saved = localStorage.getItem(CHART_SIZES_STORAGE_KEY)
      const savedSizes = saved ? JSON.parse(saved) : {}
      const savedVersion = localStorage.getItem(CHART_SIZES_VERSION_KEY)

      // Check if version changed or if we need to update sizes
      const needsUpdate = savedVersion !== DEFAULT_SIZES_VERSION

      // Start with defaults, then merge in saved positions (x, y) if they exist
      // This preserves user's manual positioning while applying new default sizes
      const result: Record<string, ChartSize> = {}
      let hasChanges = false

      Object.keys(DEFAULT_CHART_SIZES).forEach(chartId => {
        const defaultSize = DEFAULT_CHART_SIZES[chartId]
        const savedSize = savedSizes[chartId]

        // If version changed, always use new defaults for w and h
        // Otherwise, use saved size if it exists, otherwise use default
        const finalSize = needsUpdate || !savedSize
          ? {
            w: defaultSize.w,
            h: defaultSize.h,
            x: savedSize?.x ?? defaultSize.x,
            y: savedSize?.y ?? defaultSize.y,
          }
          : {
            w: savedSize.w,
            h: savedSize.h,
            x: savedSize.x ?? defaultSize.x,
            y: savedSize.y ?? defaultSize.y,
          }

        result[chartId] = finalSize

        // Check if this chart's size changed
        if (needsUpdate && (!savedSize || savedSize.w !== defaultSize.w || savedSize.h !== defaultSize.h)) {
          hasChanges = true
        }
      })

      // Save updated sizes if version changed or if we detected changes
      if (needsUpdate || hasChanges) {
        localStorage.setItem(CHART_SIZES_STORAGE_KEY, JSON.stringify(result))
        localStorage.setItem(CHART_SIZES_VERSION_KEY, DEFAULT_SIZES_VERSION)
      }

      return result
    } catch (error) {
      console.error("Failed to load chart sizes from localStorage:", error)
    }
    return {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DEFAULT_SIZES_VERSION])

  const [savedChartSizes, setSavedChartSizes] = useState<Record<string, ChartSize>>({})
  const savedChartSizesRef = useRef<Record<string, ChartSize>>({})
  const [hasLoadedChartSizes, setHasLoadedChartSizes] = useState(false)

  // Save chart sizes and positions to localStorage AND React state
  const saveChartSizes = useCallback((sizes: Record<string, ChartSize>) => {
    // Update in-memory state so components like Money Flow can react immediately.
    savedChartSizesRef.current = sizes
    setSavedChartSizes(sizes)

    if (typeof window === "undefined") return
    try {
      localStorage.setItem(CHART_SIZES_STORAGE_KEY, JSON.stringify(sizes))
      localStorage.setItem(CHART_SIZES_VERSION_KEY, DEFAULT_SIZES_VERSION)
    } catch (error) {
      console.error("Failed to save chart sizes to localStorage:", error)
    }
  }, [])

  // Load saved sizes after mount (client-side only)
  useEffect(() => {
    const loaded = loadChartSizes()
    savedChartSizesRef.current = loaded
    setSavedChartSizes(loaded)
    setHasLoadedChartSizes(true)
  }, [loadChartSizes])

  return {
    analyticsChartOrder,
    handleChartOrderChange,
    savedSizes,
    handleChartResize,
    snapToAllowedSize,
    savedChartSizes,
    saveChartSizes,
    hasLoadedChartSizes,
  }
}
