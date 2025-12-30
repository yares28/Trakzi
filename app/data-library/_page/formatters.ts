import { formatDateForDisplay } from "@/lib/date"

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(value)
  )

export const formatFreshness = (input?: string | null) => {
  if (!input) return "Awaiting sync"
  const timestamp = new Date(input).getTime()
  if (Number.isNaN(timestamp)) return "Awaiting sync"
  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (diffMinutes < 1) return "Updated just now"
  if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `Updated ${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `Updated ${diffDays}d ago`
}

export const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const idx = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  )
  const value = bytes / Math.pow(1024, idx)
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[idx]}`
}

export const formatDateLabel = (input: string) =>
  formatDateForDisplay(input, [], {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
