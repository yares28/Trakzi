import { useCallback, useEffect, useRef, useState } from "react"

import { useUserPreferences } from "@/components/user-preferences-provider"

import {
  DEFAULT_CHART_ORDER,
  DEFAULT_CHART_SIZES,
  DEFAULT_SIZES_VERSION,
} from "../constants"
import type { FridgeChartId } from "../types"

type ChartSize = { w: number; h: number; x?: number; y?: number }

function snapToAllowedSize(w: number, h: number) {
  const snappedWidth = Math.abs(w - 6) <= Math.abs(w - 12) ? 6 : 12
  const clampedHeight = Math.max(4, Math.min(20, h))
  return { w: snappedWidth, h: clampedHeight }
}

export function useChartLayout() {
  const { preferences, updatePagePreferences, isLoaded } = useUserPreferences()
  const fridgePrefs = preferences.fridge

  // -----------------------------------------------------------------
  // Chart order
  // -----------------------------------------------------------------
  const [chartOrder, setChartOrder] =
    useState<FridgeChartId[]>(DEFAULT_CHART_ORDER)

  useEffect(() => {
    const saved = fridgePrefs?.order
    if (!saved || !Array.isArray(saved)) return

    // Filter out obsolete chart IDs that no longer exist in the default order
    const validCharts = saved.filter((id): id is FridgeChartId =>
      DEFAULT_CHART_ORDER.includes(id as FridgeChartId)
    )
    // Add any new charts that aren't in the saved order
    const missingCharts = DEFAULT_CHART_ORDER.filter(
      (id) => !validCharts.includes(id)
    )
    const mergedOrder = [...validCharts, ...missingCharts]
    setChartOrder(mergedOrder)

    // Save the cleaned-up order if it changed
    if (mergedOrder.length !== saved.length) {
      updatePagePreferences("fridge", { order: mergedOrder })
    }
  }, [fridgePrefs?.order, updatePagePreferences])

  const handleChartOrderChange = useCallback(
    (newOrder: FridgeChartId[]) => {
      setChartOrder(newOrder)
      updatePagePreferences("fridge", { order: newOrder })
    },
    [updatePagePreferences]
  )

  // -----------------------------------------------------------------
  // Layout chart sizes with version tracking
  // -----------------------------------------------------------------
  const [savedChartSizes, setSavedChartSizes] =
    useState<Record<FridgeChartId, ChartSize>>(DEFAULT_CHART_SIZES)
  const savedChartSizesRef = useRef<Record<FridgeChartId, ChartSize>>(
    DEFAULT_CHART_SIZES
  )
  const [hasLoadedChartSizes, setHasLoadedChartSizes] = useState(false)

  useEffect(() => {
    if (!isLoaded) return

    const storedSizes = (fridgePrefs?.sizes ?? {}) as Record<string, ChartSize>
    const storedVersion = fridgePrefs?.sizes_version

    const needsUpdate = storedVersion !== DEFAULT_SIZES_VERSION

    const result = {} as Record<FridgeChartId, ChartSize>
    let hasChanges = false

    Object.keys(DEFAULT_CHART_SIZES).forEach((chartId) => {
      const id = chartId as FridgeChartId
      const defaultSize = DEFAULT_CHART_SIZES[id]
      const savedSize = storedSizes[id]

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

      result[id] = finalSize

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
      updatePagePreferences("fridge", {
        sizes: result,
        sizes_version: DEFAULT_SIZES_VERSION,
      })
    }

    savedChartSizesRef.current = result
    setSavedChartSizes(result)
    setHasLoadedChartSizes(true)
  }, [isLoaded, fridgePrefs?.sizes, fridgePrefs?.sizes_version, updatePagePreferences])

  const saveChartSizes = useCallback(
    (sizes: Record<FridgeChartId, ChartSize>) => {
      savedChartSizesRef.current = sizes
      setSavedChartSizes(sizes)
      updatePagePreferences("fridge", {
        sizes,
        sizes_version: DEFAULT_SIZES_VERSION,
      })
    },
    [updatePagePreferences]
  )

  const handleChartResize = useCallback(
    (chartId: FridgeChartId, w: number, h: number) => {
      const snapped = snapToAllowedSize(w, h)
      const next = { ...savedChartSizesRef.current, [chartId]: snapped }
      saveChartSizes(next)
    },
    [saveChartSizes]
  )

  return {
    chartOrder,
    handleChartOrderChange,
    savedChartSizes,
    handleChartResize,
    hasLoadedChartSizes,
  }
}
