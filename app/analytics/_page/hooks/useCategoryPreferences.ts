import { useCallback, useEffect, useRef } from "react"

type PreferenceEntry = { description: string; category: string }

export function useCategoryPreferences() {
  const preferenceUpdateTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingPreferenceEntriesRef = useRef<PreferenceEntry[]>([])

  const flushPreferenceUpdates = useCallback(async () => {
    const pending = pendingPreferenceEntriesRef.current
    if (pending.length === 0) return
    pendingPreferenceEntriesRef.current = []

    try {
      await fetch("/api/transactions/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: pending }),
      })
    } catch (error) {
      console.warn("[Analytics] Failed to store category preferences", error)
    }
  }, [])

  const schedulePreferenceUpdate = useCallback((entry: PreferenceEntry) => {
    pendingPreferenceEntriesRef.current.push(entry)
    if (preferenceUpdateTimerRef.current) {
      clearTimeout(preferenceUpdateTimerRef.current)
    }
    preferenceUpdateTimerRef.current = setTimeout(() => {
      void flushPreferenceUpdates()
    }, 800)
  }, [flushPreferenceUpdates])

  const resetPreferenceUpdates = useCallback(() => {
    pendingPreferenceEntriesRef.current = []
    if (preferenceUpdateTimerRef.current) {
      clearTimeout(preferenceUpdateTimerRef.current)
      preferenceUpdateTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (preferenceUpdateTimerRef.current) {
        clearTimeout(preferenceUpdateTimerRef.current)
      }
    }
  }, [])

  return {
    schedulePreferenceUpdate,
    resetPreferenceUpdates,
  }
}
