"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"

const defaultNormalizeCategory = (value?: string | null) => {
  const trimmed = (value ?? "").trim()
  return trimmed || "Other"
}

interface UseChartCategoryVisibilityOptions {
  chartId: string
  storageScope?: string
  normalizeCategory?: (value: string) => string
}

interface BuildCategoryControlsOptions {
  title?: string
  description?: string
  emptyState?: string
}

export function useChartCategoryVisibility({
  chartId,
  storageScope = "global",
  normalizeCategory = defaultNormalizeCategory,
}: UseChartCategoryVisibilityOptions) {
  const storageKey = `${storageScope}:chartHiddenCategories:${chartId}`
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([])
  const normalizeRef = useRef(normalizeCategory)

  // Keep ref in sync with normalizeCategory
  useEffect(() => {
    normalizeRef.current = normalizeCategory
  }, [normalizeCategory])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((category) => normalizeRef.current(category))
            .filter((category) => category && category.length > 0)
          setHiddenCategories(normalized)
        }
      }
    } catch (error) {
      console.warn(`[useChartCategoryVisibility] Failed to parse storage for ${storageKey}`, error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]) // Only depend on storageKey, not normalizeCategory

  const persistHiddenCategories = useCallback(
    (next: string[]) => {
      if (typeof window === "undefined") return
      if (next.length === 0) {
        window.localStorage.removeItem(storageKey)
      } else {
        window.localStorage.setItem(storageKey, JSON.stringify(next))
      }
    },
    [storageKey]
  )

  const toggleHiddenCategory = useCallback(
    (category: string) => {
      const normalized = normalizeCategory(category)
      if (!normalized) return
      setHiddenCategories((prev) => {
        const exists = prev.includes(normalized)
        const next = exists ? prev.filter((item) => item !== normalized) : [...prev, normalized]
        persistHiddenCategories(next)
        return next
      })
    },
    [normalizeCategory, persistHiddenCategories]
  )

  const clearHiddenCategories = useCallback(() => {
    setHiddenCategories([])
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  const hiddenCategorySet = useMemo(() => {
    return new Set(hiddenCategories.map((category) => normalizeCategory(category)))
  }, [hiddenCategories, normalizeCategory])

  const buildCategoryControls = useCallback(
    (
      categories: string[],
      overrides?: BuildCategoryControlsOptions
    ): ChartInfoPopoverCategoryControls | undefined => {
      if (!categories || categories.length === 0) {
        return undefined
      }

      const normalizedCategories = Array.from(
        new Set(
          categories
            .map((category) => {
              const cleaned = (category ?? "").trim()
              return cleaned || "Other"
            })
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b))

      if (!normalizedCategories.length) {
        return undefined
      }

      return {
        title: overrides?.title ?? "Category visibility",
        description:
          overrides?.description ?? "Toggle a category to hide it in this chart only.",
        categories: normalizedCategories,
        hiddenCategories,
        onToggle: toggleHiddenCategory,
        onClear: hiddenCategories.length ? clearHiddenCategories : undefined,
        emptyState: overrides?.emptyState ?? "No categories available yet.",
        normalizeCategory,
      }
    },
    [hiddenCategories, toggleHiddenCategory, clearHiddenCategories, normalizeCategory]
  )

  return {
    hiddenCategories,
    hiddenCategorySet,
    buildCategoryControls,
  }
}

