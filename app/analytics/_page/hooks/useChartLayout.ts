import { useCallback, useEffect, useRef, useState } from "react"

import { useUserPreferences } from "@/components/user-preferences-provider"

import {
  DEFAULT_CHART_ORDER,
  DEFAULT_CHART_SIZES,
  DEFAULT_SIZES_VERSION,
} from "../constants"

type ChartSize = { w: number; h: number; x?: number; y?: number }

type UseChartLayoutOptions = {
  isDemoMode?: boolean
}

function cloneChartSizes(source: Record<string, ChartSize>) {
  return Object.fromEntries(
    Object.entries(source).map(([chartId, size]) => [chartId, { ...size }])
  ) as Record<string, ChartSize>
}

export function useChartLayout({ isDemoMode = false }: UseChartLayoutOptions = {}) {
  const { preferences, updatePagePreferences, isLoaded } = useUserPreferences()
  const analyticsPrefs = preferences.analytics

  // -----------------------------------------------------------------
  // Chart order
  // -----------------------------------------------------------------
  const [analyticsChartOrder, setAnalyticsChartOrder] =
    useState<string[]>(DEFAULT_CHART_ORDER)

  useEffect(() => {
    if (isDemoMode) {
      // Demo mode now uses the same default layout as new real users — no separate
      // DEMO_DEFAULT_CHART_ORDER. This keeps the demo and the real first-run UX in sync.
      setAnalyticsChartOrder([...DEFAULT_CHART_ORDER])
      return
    }

    const saved = analyticsPrefs?.order
    if (!saved || !Array.isArray(saved)) return

    // Filter out obsolete chart IDs that no longer exist in the default order
    const validCharts = saved.filter((id: string) =>
      DEFAULT_CHART_ORDER.includes(id)
    )
    // Add any new charts that aren't in the saved order
    const missingCharts = DEFAULT_CHART_ORDER.filter(
      (id) => !validCharts.includes(id)
    )
    const mergedOrder = [...validCharts, ...missingCharts]
    setAnalyticsChartOrder(mergedOrder)

    // Save the cleaned-up order if it changed
    if (mergedOrder.length !== saved.length) {
      updatePagePreferences("analytics", { order: mergedOrder })
    }
  }, [analyticsPrefs?.order, isDemoMode, updatePagePreferences])

  const handleChartOrderChange = useCallback(
    (newOrder: string[]) => {
      setAnalyticsChartOrder(newOrder)
      if (isDemoMode) return
      updatePagePreferences("analytics", { order: newOrder })
    },
    [isDemoMode, updatePagePreferences]
  )

  // -----------------------------------------------------------------
  // User-customised resize sizes (the "analytics-chart-sizes-user" key)
  // -----------------------------------------------------------------
  const [savedSizes, setSavedSizes] = useState<
    Record<string, { w: number; h: number }>
  >({})
  const savedSizesRef = useRef<Record<string, { w: number; h: number }>>({})

  useEffect(() => {
    if (isDemoMode) {
      // No demo-specific user_sizes — demo uses the same defaults as real users.
      setSavedSizes({})
      savedSizesRef.current = {}
      return
    }

    const s = analyticsPrefs?.user_sizes ?? {}
    setSavedSizes(s)
    savedSizesRef.current = s
  }, [analyticsPrefs?.user_sizes, isDemoMode])

  const handleChartResize = useCallback(
    (chartId: string, w: number, h: number) => {
      const next = { ...savedSizesRef.current, [chartId]: { w, h } }
      savedSizesRef.current = next
      setSavedSizes(next)
      if (isDemoMode) return
      updatePagePreferences("analytics", { user_sizes: next })
    },
    [isDemoMode, updatePagePreferences]
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
    if (isDemoMode) {
      // Demo uses the same DEFAULT_CHART_SIZES as new real users — no overlays.
      const demoSizes = cloneChartSizes(DEFAULT_CHART_SIZES)
      savedChartSizesRef.current = demoSizes
      setSavedChartSizes(demoSizes)
      setHasLoadedChartSizes(true)
      return
    }

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
  }, [analyticsPrefs?.sizes, analyticsPrefs?.sizes_version, isDemoMode, isLoaded, updatePagePreferences])

  const saveChartSizes = useCallback(
    (sizes: Record<string, ChartSize>) => {
      savedChartSizesRef.current = sizes
      setSavedChartSizes(sizes)
      if (isDemoMode) return
      updatePagePreferences("analytics", {
        sizes,
        sizes_version: DEFAULT_SIZES_VERSION,
      })
    },
    [isDemoMode, updatePagePreferences]
  )

  // -----------------------------------------------------------------
  // Reset to defaults — restores order, sizes, and clears user resizes.
  // -----------------------------------------------------------------
  const resetLayout = useCallback(() => {
    const defaultOrder = [...DEFAULT_CHART_ORDER]
    const defaultSizes = cloneChartSizes(DEFAULT_CHART_SIZES)

    setAnalyticsChartOrder(defaultOrder)
    setSavedSizes({})
    savedSizesRef.current = {}
    setSavedChartSizes(defaultSizes)
    savedChartSizesRef.current = defaultSizes

    if (isDemoMode) return
    updatePagePreferences("analytics", {
      order: defaultOrder,
      sizes: defaultSizes,
      sizes_version: DEFAULT_SIZES_VERSION,
      user_sizes: {},
    })
  }, [isDemoMode, updatePagePreferences])

  useEffect(() => {
    const handler = () => resetLayout()
    window.addEventListener("gridstack:reset", handler)
    return () => window.removeEventListener("gridstack:reset", handler)
  }, [resetLayout])

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
