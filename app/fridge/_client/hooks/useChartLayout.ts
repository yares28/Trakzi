import { useCallback, useEffect, useRef, useState } from "react"

import {
  CHART_ORDER_STORAGE_KEY,
  CHART_SIZES_STORAGE_KEY,
  CHART_SIZES_VERSION_KEY,
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
  const [chartOrder, setChartOrder] = useState<FridgeChartId[]>(DEFAULT_CHART_ORDER)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHART_ORDER_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as FridgeChartId[]
        if (Array.isArray(parsed) && parsed.length === DEFAULT_CHART_ORDER.length) {
          setChartOrder(parsed)
        }
      }
    } catch (error) {
      console.error("Failed to load chart order:", error)
    }
  }, [])

  const handleChartOrderChange = useCallback((newOrder: FridgeChartId[]) => {
    setChartOrder(newOrder)
    try {
      localStorage.setItem(CHART_ORDER_STORAGE_KEY, JSON.stringify(newOrder))
    } catch (error) {
      console.error("Failed to save chart order:", error)
    }
  }, [])

  const loadChartSizes = useCallback((): Record<FridgeChartId, ChartSize> => {
    if (typeof window === "undefined") return {} as Record<FridgeChartId, ChartSize>

    try {
      const saved = localStorage.getItem(CHART_SIZES_STORAGE_KEY)
      const savedSizes = saved ? (JSON.parse(saved) as Record<string, ChartSize>) : {}
      const savedVersion = localStorage.getItem(CHART_SIZES_VERSION_KEY)
      const needsUpdate = savedVersion !== DEFAULT_SIZES_VERSION

      const result = {} as Record<FridgeChartId, ChartSize>
      let hasChanges = false

      Object.keys(DEFAULT_CHART_SIZES).forEach((chartId) => {
        const id = chartId as FridgeChartId
        const defaultSize = DEFAULT_CHART_SIZES[id]
        const savedSize = savedSizes[id]

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

        result[id] = finalSize

        if (needsUpdate && (!savedSize || savedSize.w !== defaultSize.w || savedSize.h !== defaultSize.h)) {
          hasChanges = true
        }
      })

      if (needsUpdate || hasChanges) {
        localStorage.setItem(CHART_SIZES_STORAGE_KEY, JSON.stringify(result))
        localStorage.setItem(CHART_SIZES_VERSION_KEY, DEFAULT_SIZES_VERSION)
      }

      return result
    } catch (error) {
      console.error("Failed to load chart sizes from localStorage:", error)
    }

    return {} as Record<FridgeChartId, ChartSize>
  }, [])

  const [savedChartSizes, setSavedChartSizes] = useState<Record<FridgeChartId, ChartSize>>(DEFAULT_CHART_SIZES)
  const savedChartSizesRef = useRef<Record<FridgeChartId, ChartSize>>(DEFAULT_CHART_SIZES)
  const [hasLoadedChartSizes, setHasLoadedChartSizes] = useState(false)

  const saveChartSizes = useCallback((sizes: Record<FridgeChartId, ChartSize>) => {
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

  useEffect(() => {
    const loaded = loadChartSizes()
    savedChartSizesRef.current = loaded
    setSavedChartSizes(loaded)
    setHasLoadedChartSizes(true)
  }, [loadChartSizes])

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
