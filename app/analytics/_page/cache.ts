import { ANALYTICS_CACHE_TTL_MS } from "./constants"
import type { AnalyticsCacheEntry } from "./types"

const analyticsDataCache = new Map<string, AnalyticsCacheEntry>()

export const getAnalyticsCacheKey = (filter?: string | null) => filter ?? "all"

export const getAnalyticsCacheEntry = (filter?: string | null) => {
  const cacheKey = getAnalyticsCacheKey(filter)
  return analyticsDataCache.get(cacheKey) || null
}

export const isAnalyticsCacheFresh = (entry: AnalyticsCacheEntry) =>
  Date.now() - entry.fetchedAt < ANALYTICS_CACHE_TTL_MS

export const setAnalyticsCacheEntry = (
  filter: string | null | undefined,
  entry: AnalyticsCacheEntry,
) => {
  const cacheKey = getAnalyticsCacheKey(filter)
  analyticsDataCache.set(cacheKey, entry)
}

export const clearAnalyticsCache = () => {
  analyticsDataCache.clear()
}
