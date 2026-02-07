import { useCallback, useEffect, useRef, useState } from "react"

import { useUserPreferences } from "@/components/user-preferences-provider"

import {
  DEFAULT_CHART_ORDER,
  DEFAULT_CHART_SIZES,
  DEFAULT_SIZES_VERSION,
} from "../constants"

type ChartSize = { w: number; h: number; x?: number; y?: number }

export function useChartLayout() {
  const { preferences, updatePagePreferences, isLoaded } = useUserPreferences()
  const analyticsPrefs = preferences.analytics

  // -----------------------------------------------------------------
  // Chart order
  // -----------------------------------------------------------------
  const [analyticsChartOrder, setAnalyticsChartOrder] =
    useState<string[]>(DEFAULT_CHART_ORDER)

  useEffect(() => {
    const saved = analyticsPrefs?.order
    if (saved && Array.isArray(saved) && saved.length === DEFAULT_CHART_ORDER.length) {
      setAnalyticsChartOrder(saved)
    }
  }, [analyticsPrefs?.order])

  const handleChartOrderChange = useCallback(
    (newOrder: string[]) => {
      setAnalyticsChartOrder(newOrder)
      updatePagePreferences("analytics", { order: newOrder })
    },
    [updatePagePreferences]
  )

  // -----------------------------------------------------------------
  // User-customised resize sizes (the "analytics-chart-sizes-user" key)
  // -----------------------------------------------------------------
  const [savedSizes, setSavedSizes] = useState<
    Record<string, { w: number; h: number }>
  >({})
  const savedSizesRef = useRef<Record<string, { w: number; h: number }>>({})

  useEffect(() => {
    const s = analyticsPrefs?.user_sizes ?? {}
    setSavedSizes(s)
    savedSizesRef.current = s
  }, [analyticsPrefs?.user_sizes])

  const handleChartResize = useCallback(
    (chartId: string, w: number, h: number) => {
      const next = { ...savedSizesRef.current, [chartId]: { w, h } }
      savedSizesRef.current = next
      setSavedSizes(next)
      updatePagePreferences("analytics", { user_sizes: next })
    },
    [updatePagePreferences]
  )

  // -----------------------------------------------------------------
  // Snap-to-grid utility (pure function, no dependencies)
  // -----------------------------------------------------------------
  const snapToAllowedSize = useCallback((w: number, h: number) => {
    const widthDistanceToSmall = Math.abs(w - 6)
    const widthDistanceToLarge = Math.abs(w - 12)
    const snappedWidth = widthDistanceToSmall <= widthDistanceToLarge ? 6 : 12
    const clampedHeight = Math.max(4, Math.min(20, h))
    return { w: snappedWidth, h: clampedHeight }
  }, [])

  // -----------------------------------------------------------------
  // Layout chart sizes with version tracking
  // -----------------------------------------------------------------
  const [savedChartSizes, setSavedChartSizes] = useState<
    Record<string, ChartSize>
  >({})
  const savedChartSizesRef = useRef<Record<string, ChartSize>>({})
  const [hasLoadedChartSizes, setHasLoadedChartSizes] = useState(false)

  // Compute sizes from preferences (with version-reset logic).
  useEffect(() => {
    if (!isLoaded) return

    const storedSizes = analyticsPrefs?.sizes ?? {}
    const storedVersion = analyticsPrefs?.sizes_version

    const needsUpdate = storedVersion !== DEFAULT_SIZES_VERSION

    const result: Record<string, ChartSize> = {}
    let hasChanges = false

    Object.keys(DEFAULT_CHART_SIZES).forEach((chartId) => {
      const defaultSize = DEFAULT_CHART_SIZES[chartId]
      const savedSize = storedSizes[chartId]

      const finalSize =
        needsUpdate || !savedSize
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

      if (
        needsUpdate &&
        (!savedSize ||
          savedSize.w !== defaultSize.w ||
          savedSize.h !== defaultSize.h)
      ) {
        hasChanges = true
      }
    })

    if (needsUpdate || hasChanges) {
      updatePagePreferences("analytics", {
        sizes: result,
        sizes_version: DEFAULT_SIZES_VERSION,
      })
    }

    savedChartSizesRef.current = result
    setSavedChartSizes(result)
    setHasLoadedChartSizes(true)
  }, [isLoaded, analyticsPrefs?.sizes, analyticsPrefs?.sizes_version, updatePagePreferences])

  const saveChartSizes = useCallback(
    (sizes: Record<string, ChartSize>) => {
      savedChartSizesRef.current = sizes
      setSavedChartSizes(sizes)
      updatePagePreferences("analytics", {
        sizes,
        sizes_version: DEFAULT_SIZES_VERSION,
      })
    },
    [updatePagePreferences]
  )

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
