"use client"

import { memo, useEffect, useState } from "react"
import { WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Shows a non-intrusive banner when the browser is offline.
 * Charts remain visible from the IndexedDB cache — this indicator
 * signals to the user that they're viewing persisted data.
 */
export const OfflineIndicator = memo(function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)

    const handleOffline = () => setIsOffline(true)
    const handleOnline = () => setIsOffline(false)

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)
    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-2 px-4 py-2 rounded-full",
        "bg-amber-500/90 text-white text-sm font-medium shadow-lg backdrop-blur-sm",
        "animate-in fade-in slide-in-from-bottom-2 duration-300"
      )}
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Offline — showing cached data</span>
    </div>
  )
})

OfflineIndicator.displayName = "OfflineIndicator"
