// lib/chat/weekly-digest.ts
// Detects whether the weekly digest should auto-trigger on first chat open

const DIGEST_KEY = "trakzi.chat.weekDigest"

/** Returns the ISO year-week string for a given date (e.g. "2026-W11") */
function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7 // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
}

/** Returns true if the digest has NOT been shown for the current ISO week */
export function shouldShowWeeklyDigest(): boolean {
  if (typeof window === "undefined") return false
  try {
    const lastShown = localStorage.getItem(DIGEST_KEY)
    const thisWeek = getISOWeek(new Date())
    return lastShown !== thisWeek
  } catch {
    return false
  }
}

/** Call this after the digest has been triggered to suppress re-triggers this week */
export function markWeeklyDigestShown(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(DIGEST_KEY, getISOWeek(new Date()))
  } catch { /* ignore */ }
}

/** The auto-trigger prompt sent as a user message */
export const WEEKLY_DIGEST_PROMPT =
  "Give me a weekly financial digest: summarize my top 3 spending categories from last week, my current savings rate, and give me 1 concrete actionable tip to improve this week."
