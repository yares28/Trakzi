/**
 * Client-side cache clear on logout.
 * Call before signOut() to clear localStorage and trigger server cache invalidation.
 */

const CACHE_INVALIDATE_API = "/api/cache/invalidate"

/**
 * Clear all app caches when the user logs out.
 * 1. Calls API to clear Redis (Upstash) and trigger Next/Vercel revalidation.
 * 2. Clears localStorage (chart layouts, favorites, date filter, etc.).
 */
export async function clearAllCachesOnLogout(): Promise<void> {
  try {
    await fetch(CACHE_INVALIDATE_API, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
  } catch {
    // Ignore network errors; sign out should still proceed
  }

  if (typeof window === "undefined") return

  try {
    localStorage.clear()
  } catch {
    // Ignore quota / private mode errors
  }
}
