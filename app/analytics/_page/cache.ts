import { ANALYTICS_CACHE_TTL_MS } from "./constants"
import type { AnalyticsCacheEntry } from "./types"

const analyticsDataCache = new Map<string, AnalyticsCacheEntry>()

export const getAnalyticsCacheKey = (userId: string | undefined, filter?: string | null) =>
  [userId ?? "", filter ?? "all"].join(":")

export const getAnalyticsCacheEntry = (userId: string | undefined, filter?: string | null) => {
  const cacheKey = getAnalyticsCacheKey(userId, filter)
  return analyticsDataCache.get(cacheKey) || null
}

export const isAnalyticsCacheFresh = (entry: AnalyticsCacheEntry) =>
  Date.now() - entry.fetchedAt < ANALYTICS_CACHE_TTL_MS

export const setAnalyticsCacheEntry = (
  userId: string | undefined,
  filter: string | null | undefined,
  entry: AnalyticsCacheEntry,
) => {
  const cacheKey = getAnalyticsCacheKey(userId, filter)
  analyticsDataCache.set(cacheKey, entry)
}

export const clearAnalyticsCache = () => {
  analyticsDataCache.clear()
}
