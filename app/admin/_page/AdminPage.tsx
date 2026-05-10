"use client"

import { useEffect, useRef, useState } from "react"
import { m, AnimatePresence } from "framer-motion"

// ─── Types ────────────────────────────────────────────────────────────────────

type SubscriptionRow = { plan: string; status: string; count: number }

interface AdminStats {
  users:         { total: number; new7d: number; new30d: number; today: number }
  subscriptions: SubscriptionRow[]
  lifetimeSubs:  number
  transactions:  { total: number; distinctUsers: number; last30d: number }
  receipts:      { total: number }
  statements:    { total: number }
  statementHealth: { failed: number; processing: number }
  aiChat:        { total: number; last30d: number }
  rooms:         { total: number }
  friendships:   { total: number }
  adoption: {
    bankAccountUsers: number
    savingsGoals:     number
    debtAccounts:     number
    chatHistories:    number
    challengeUsers:   number
  }
  storage:       { fileCount: number; totalBytes: number }
  webhookEvents: { eventId: string; eventType: string; status: string; createdAt: string }[]
  fetchedAt:     string
}

interface Props {
  env: "production" | "preview" | "development"
}

// ─── Palette ──────────────────────────────────────────────────────────────────
// Uses Trakzi's actual light-mode design tokens, hardcoded since this page
// forces its own aesthetic outside the app's dark-mode shell.

const C = {
  bg:         "#FAF9F5",
  text:       "#1F1E1D",
  textMid:    "#3D3D3A",
  textMuted:  "#73726C",
  textFaint:  "#999999",
  orange:     "#e78a53",
  border:     "#E0DDD6",
  borderMid:  "#C8C4BC",
  green:      "#2B6745",
  amber:      "#7A5200",
  red:        "#8F2020",
} as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string { return n.toLocaleString("en-US") }

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s    = Math.floor(diff / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function eventColor(type: string): string {
  if (/fail|dispute|fraud/.test(type))              return C.red
  if (/cancel|delet|refund|chargeback/.test(type))  return C.amber
  return C.green
}

function eventSymbol(type: string): string {
  return /fail|dispute/.test(type) ? "○" : "●"
}

// ─── useCountUp ───────────────────────────────────────────────────────────────

function useCountUp(target: number, delay = 0): number {
  const [value, setValue] = useState(0)
  const frameRef          = useRef<number | undefined>(undefined)
  const timerRef          = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setValue(0)
    if (target === 0) return

    timerRef.current = setTimeout(() => {
      const t0       = performance.now()
      const duration = Math.min(1200 + Math.log10(target + 1) * 100, 2000)

      function tick(now: number) {
        const p     = Math.min((now - t0) / duration, 1)
        const eased = 1 - Math.pow(1 - p, 4) // ease-out-quart
        setValue(Math.round(eased * target))
        if (p < 1) { frameRef.current = requestAnimationFrame(tick) }
        else        { setValue(target) }
      }

      frameRef.current = requestAnimationFrame(tick)
    }, delay)

    return () => {
      clearTimeout(timerRef.current)
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current)
    }
  }, [target, delay])

  return value
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function Bone({ w = "100%", h = "14px" }: { w?: string; h?: string }) {
  return (
    <span style={{
      display:        "inline-block",
      width:          w,
      height:         h,
      background:     `linear-gradient(90deg, ${C.border} 0%, #EDECE7 50%, ${C.border} 100%)`,
      backgroundSize: "200% 100%",
      animation:      "shimmer 1.4s infinite linear",
      borderRadius:   "2px",
    }} />
  )
}

// A single big numbered metric (owns its own count-up)
function BigNum({ value, label, accent = false, delay = 0, prefix = "" }: {
  value:   number
  label:   string
  accent?: boolean
  delay?:  number
  prefix?: string
}) {
  const counted = useCountUp(value, delay)
  return (
    <div>
      <div style={{
        fontSize:      "10px",
        fontWeight:    600,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color:         C.textMuted,
        marginBottom:  "6px",
      }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
        {prefix && (
          <span style={{ fontSize: "24px", color: C.textMuted, fontWeight: 300, lineHeight: 1 }}>
            {prefix}
          </span>
        )}
        <span style={{
          fontSize:           "38px",
          fontWeight:         700,
          letterSpacing:      "-0.03em",
          fontVariantNumeric: "tabular-nums",
          color:              accent ? C.orange : C.text,
          lineHeight:         1,
        }}>
          {fmt(counted)}
        </span>
      </div>
    </div>
  )
}

// An engagement row (label ←→ value, with optional annotation)
function Row({ label, value, detail, delay = 0, orange = false }: {
  label:   string
  value:   number
  detail?: string
  delay?:  number
  orange?: boolean
}) {
  const counted = useCountUp(value, delay)
  return (
    <m.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display:        "flex",
        alignItems:     "baseline",
        justifyContent: "space-between",
        borderBottom:   `1px solid ${C.border}`,
        padding:        "11px 0",
        gap:            "24px",
      }}
    >
      <span style={{ fontSize: "13px", color: C.textMid, letterSpacing: "-0.01em", flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ display: "flex", alignItems: "baseline", gap: "20px" }}>
        {detail && (
          <span style={{ fontSize: "11px", color: C.textFaint, letterSpacing: "-0.01em" }}>
            {detail}
          </span>
        )}
        <span style={{
          fontSize:           "18px",
          fontWeight:         600,
          fontVariantNumeric: "tabular-nums",
          letterSpacing:      "-0.02em",
          color:              orange ? C.orange : C.text,
          minWidth:           "80px",
          textAlign:          "right",
        }}>
          {fmt(counted)}
        </span>
      </span>
    </m.div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ children, delay = 0, right }: { children: React.ReactNode; delay?: number; right?: React.ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.35 }}
      style={{
        borderTop:      `2px solid ${C.text}`,
        paddingTop:     "9px",
        marginBottom:   "20px",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        gap:            "6px",
      }}
    >
      <span style={{
        display:       "flex",
        alignItems:    "center",
        gap:           "6px",
        fontSize:      "10px",
        fontWeight:    700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color:         C.text,
      }}>
        {children}
      </span>
      {right}
    </m.div>
  )
}

// ─── Env Badge ────────────────────────────────────────────────────────────────

function EnvBadge({ env }: { env: Props["env"] }) {
  const cfg = {
    production:  { label: "PRODUCTION", color: C.red   },
    preview:     { label: "STAGING",    color: C.amber  },
    development: { label: "LOCAL",      color: C.green  },
  }
  const { label, color } = cfg[env]

  return (
    <span style={{
      display:       "inline-flex",
      alignItems:    "center",
      gap:           "5px",
      fontSize:      "10px",
      fontWeight:    700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color,
      border:        `1px solid ${color}`,
      padding:       "2px 7px 2px 6px",
    }}>
      <span style={{
        width:        "5px",
        height:       "5px",
        borderRadius: "50%",
        background:   color,
        display:      "inline-block",
        animation:    env === "production" ? "blink 2s ease-in-out infinite" : "none",
      }} />
      {label}
    </span>
  )
}

// ─── Live Clock ───────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState("")
  const [date, setDate] = useState("")

  useEffect(() => {
    function tick() {
      const now = new Date()
      setTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }))
      setDate(now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ textAlign: "right", lineHeight: 1.4 }}>
      <div style={{ fontSize: "13px", fontVariantNumeric: "tabular-nums", color: C.text, fontWeight: 500, letterSpacing: "-0.01em" }}>
        {time || "\u00A0"}
      </div>
      <div style={{ fontSize: "11px", color: C.textMuted }}>
        {date || "\u00A0"}
      </div>
    </div>
  )
}

// ─── Subscription Matrix ──────────────────────────────────────────────────────

const PLANS    = ["max", "pro", "free"]                                as const
const STATUSES = ["active", "canceled", "paused", "past_due", "disputed"] as const

function SubMatrix({ subs }: { subs: SubscriptionRow[] }) {
  const matrix: Record<string, Record<string, number>> = {}
  for (const plan of PLANS) {
    matrix[plan] = {}
    for (const s of STATUSES) matrix[plan][s] = 0
  }
  for (const row of subs) {
    if (matrix[row.plan]) matrix[row.plan][row.status] = row.count
  }

  const colTotals  = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = PLANS.reduce((sum, p) => sum + (matrix[p][s] ?? 0), 0)
    return acc
  }, {})
  const grandTotal = Object.values(colTotals).reduce((a, b) => a + b, 0)

  const tdStyle = (val: number, bold = false): React.CSSProperties => ({
    textAlign:          "right",
    fontVariantNumeric: "tabular-nums",
    fontSize:           "13px",
    fontWeight:         bold ? 700 : val > 0 ? 600 : 400,
    color:              val > 0 ? (bold ? C.text : C.textMid) : C.textFaint,
    padding:            "9px 10px",
    letterSpacing:      "-0.01em",
  })

  return (
    <m.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ overflowX: "auto" }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "0 0 8px", width: "60px" }} />
            {STATUSES.map(s => (
              <th key={s} style={{
                textAlign:     "right",
                fontSize:      "10px",
                fontWeight:    700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color:         C.textMuted,
                padding:       "0 10px 8px",
                borderBottom:  `1px solid ${C.borderMid}`,
                whiteSpace:    "nowrap",
              }}>
                {s.replace("_", "\u200B_")}
              </th>
            ))}
            <th style={{
              textAlign:     "right",
              fontSize:      "10px",
              fontWeight:    700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color:         C.text,
              padding:       "0 0 8px 10px",
              borderBottom:  `1px solid ${C.borderMid}`,
            }}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {PLANS.map(plan => {
            const planTotal = STATUSES.reduce((sum, s) => sum + (matrix[plan][s] ?? 0), 0)
            return (
              <tr key={plan} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{
                  fontSize:      "12px",
                  fontWeight:    700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color:         plan === "max" ? C.orange : C.text,
                  padding:       "9px 0",
                }}>
                  {plan}
                </td>
                {STATUSES.map(status => (
                  <td key={status} style={tdStyle(matrix[plan][status])}>
                    {matrix[plan][status] > 0 ? fmt(matrix[plan][status]) : "—"}
                  </td>
                ))}
                <td style={tdStyle(planTotal, true)}>
                  {fmt(planTotal)}
                </td>
              </tr>
            )
          })}
          <tr style={{ borderTop: `2px solid ${C.borderMid}` }}>
            <td style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.textMuted, padding: "8px 0" }}>
              Total
            </td>
            {STATUSES.map(s => (
              <td key={s} style={tdStyle(colTotals[s])}>
                {colTotals[s] > 0 ? fmt(colTotals[s]) : "—"}
              </td>
            ))}
            <td style={tdStyle(grandTotal, true)}>
              {fmt(grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </m.div>
  )
}

// ─── Registrations section ────────────────────────────────────────────────────
// Extracted as its own component so BigNum hooks always run unconditionally.

function RegistrationsSection({ stats, loading }: { stats: AdminStats | null; loading: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
      <div style={{ paddingRight: "20px" }}>
        {loading
          ? <><Bone w="60px" h="10px" /><div style={{ marginTop: "10px" }} /><Bone w="100px" h="38px" /></>
          : <BigNum label="Total Users"  value={stats?.users.total  ?? 0} accent delay={100} />
        }
      </div>
      <div style={{ paddingLeft: "20px", paddingRight: "20px", borderLeft: `1px solid ${C.border}` }}>
        {loading
          ? <><Bone w="40px" h="10px" /><div style={{ marginTop: "10px" }} /><Bone w="70px" h="38px" /></>
          : <BigNum label="Today"        value={stats?.users.today  ?? 0} prefix="+" delay={150} />
        }
      </div>
      <div style={{ paddingLeft: "20px", paddingRight: "20px", borderLeft: `1px solid ${C.border}` }}>
        {loading
          ? <><Bone w="60px" h="10px" /><div style={{ marginTop: "10px" }} /><Bone w="80px" h="38px" /></>
          : <BigNum label="This Week"    value={stats?.users.new7d  ?? 0} prefix="+" delay={200} />
        }
      </div>
      <div style={{ paddingLeft: "20px", borderLeft: `1px solid ${C.border}` }}>
        {loading
          ? <><Bone w="70px" h="10px" /><div style={{ marginTop: "10px" }} /><Bone w="80px" h="38px" /></>
          : <BigNum label="Last 30 Days" value={stats?.users.new30d ?? 0} prefix="+" delay={300} />
        }
      </div>
    </div>
  )
}

// ─── Engagement section ───────────────────────────────────────────────────────

function EngagementSection({ stats, loading }: { stats: AdminStats | null; loading: boolean }) {
  if (loading) {
    return (
      <>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{ borderBottom: `1px solid ${C.border}`, padding: "12px 0", display: "flex", justifyContent: "space-between" }}>
            <Bone w="180px" h="13px" />
            <Bone w="70px"  h="13px" />
          </div>
        ))}
      </>
    )
  }
  return (
    <>
      {/* Core usage */}
      <Row label="Transactions imported"       value={stats?.transactions.total      ?? 0} detail={`${fmt(stats?.transactions.distinctUsers ?? 0)} importers`} delay={0.42} orange />
      <Row label="Transactions — last 30 days" value={stats?.transactions.last30d    ?? 0} delay={0.46} />
      <Row label="Bank statements uploaded"    value={stats?.statements.total        ?? 0} delay={0.50} />
      <Row label="Receipts scanned"            value={stats?.receipts.total          ?? 0} delay={0.54} />
      <Row label="AI conversations"            value={stats?.aiChat.total            ?? 0} detail={`${fmt(stats?.aiChat.last30d ?? 0)} last 30d`} delay={0.58} />
      <Row label="Shared rooms"                value={stats?.rooms.total             ?? 0} delay={0.62} />
      <Row label="Friendships"                 value={stats?.friendships.total       ?? 0} delay={0.66} />
      {/* Feature adoption */}
      <Row label="Bank accounts connected"     value={stats?.adoption.bankAccountUsers ?? 0} detail="distinct users" delay={0.70} />
      <Row label="Savings goals active"        value={stats?.adoption.savingsGoals    ?? 0} delay={0.74} />
      <Row label="Debt accounts tracked"       value={stats?.adoption.debtAccounts    ?? 0} delay={0.78} />
      <Row label="Chat threads saved"          value={stats?.adoption.chatHistories   ?? 0} delay={0.82} />
      <Row label="Challenge participants"      value={stats?.adoption.challengeUsers  ?? 0} detail="distinct users" delay={0.86} />
    </>
  )
}

// ─── Load Test ───────────────────────────────────────────────────────────────

const TEST_ENDPOINTS = [
  { label: "home-bundle",      path: "/api/charts/home-bundle" },
  { label: "analytics-bundle", path: "/api/charts/analytics-bundle" },
  { label: "fridge-bundle",    path: "/api/charts/fridge-bundle" },
  { label: "savings-bundle",   path: "/api/charts/savings-bundle" },
  { label: "dashboard-stats",  path: "/api/dashboard-stats" },
  { label: "admin/stats",      path: "/api/admin/stats" },
]

interface TestResult  { ms: number; status: number; ok: boolean }

interface TestSummary {
  total: number; success: number; failed: number
  totalSec: number; rps: number
  min: number; max: number; avg: number
  p50: number; p90: number; p99: number; p999: number
  buckets: { label: string; count: number; pct: number }[]
}

interface MultiRow {
  label:   string
  path:    string
  status:  "idle" | "running" | "done"
  summary: TestSummary | null
}

// Rating thresholds based on p99 and failure rate
const RATINGS = [
  { label: "Critical",   minP99: 2000, minFail: 0.10, color: "#8F2020" },
  { label: "Degraded",   minP99: 1000, minFail: 0.05, color: "#7A5200" },
  { label: "Acceptable", minP99:  500, minFail: 0.01, color: "#c07020" },
  { label: "Good",       minP99:  200, minFail: 0.00, color: "#2B6745" },
  { label: "Excellent",  minP99:    0, minFail: 0.00, color: "#1a5232" },
] as const

function getRating(s: TestSummary) {
  const failRate = s.total > 0 ? s.failed / s.total : 0
  for (const r of RATINGS) {
    if (s.p99 >= r.minP99 || failRate >= r.minFail) return r
  }
  return RATINGS[4]
}

// Score 0–100: penalises for high p99 and failures
function computeScore(s: TestSummary): number {
  let score = 100
  if      (s.p99 >= 2000) score -= 70
  else if (s.p99 >= 1000) score -= 50
  else if (s.p99 >=  500) score -= 30
  else if (s.p99 >=  200) score -= 15
  else if (s.p99 >=  100) score -= 5
  const failRate = s.total > 0 ? s.failed / s.total : 0
  if      (failRate >= 0.10) score -= 30
  else if (failRate >= 0.05) score -= 20
  else if (failRate >= 0.01) score -= 10
  else if (failRate  >    0) score -= 5
  return Math.max(0, Math.min(100, score))
}

function scoreColor(score: number): string {
  if (score >= 90) return RATINGS[4].color
  if (score >= 75) return RATINGS[3].color
  if (score >= 55) return RATINGS[2].color
  if (score >= 30) return RATINGS[1].color
  return RATINGS[0].color
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0
  return sorted[Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1)]
}

function summarise(results: TestResult[], totalMs: number): TestSummary {
  const sorted   = results.map(r => r.ms).sort((a, b) => a - b)
  const success  = results.filter(r => r.ok).length
  const totalSec = totalMs / 1000
  const BANDS    = [
    { label: "0–50 ms",    lo: 0,   hi: 50   },
    { label: "50–100 ms",  lo: 50,  hi: 100  },
    { label: "100–200 ms", lo: 100, hi: 200  },
    { label: "200–500 ms", lo: 200, hi: 500  },
    { label: "500 ms+",    lo: 500, hi: Infinity },
  ]
  const buckets = BANDS.map(b => {
    const count = sorted.filter(ms => ms > b.lo && ms <= b.hi).length
    return { label: b.label, count, pct: results.length ? (count / results.length) * 100 : 0 }
  })
  return {
    total: results.length, success, failed: results.length - success,
    totalSec, rps: results.length / totalSec,
    min: sorted[0] ?? 0, max: sorted[sorted.length - 1] ?? 0,
    avg: sorted.reduce((a, b) => a + b, 0) / (sorted.length || 1),
    p50:  percentile(sorted, 50),
    p90:  percentile(sorted, 90),
    p99:  percentile(sorted, 99),
    p999: percentile(sorted, 99.9),
    buckets,
  }
}

async function runTest(
  url: string, total: number, concurrency: number,
  onProgress: (done: number) => void, signal: AbortSignal,
): Promise<{ results: TestResult[]; totalMs: number }> {
  const results: TestResult[] = []
  let launched = 0
  const t0 = performance.now()
  async function worker(): Promise<void> {
    while (launched < total && !signal.aborted) {
      launched++
      const start = performance.now()
      try {
        const res = await fetch(url, { credentials: "include", signal })
        results.push({ ms: performance.now() - start, status: res.status, ok: res.ok })
      } catch {
        if (signal.aborted) return
        results.push({ ms: performance.now() - start, status: 0, ok: false })
      }
      onProgress(results.length)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return { results, totalMs: performance.now() - t0 }
}

// Shared helpers
const fmtMs = (v: number) =>
  `${v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : Math.round(v)}ms`

// ── Rating Spectrum Bar ──────────────────────────────────────────────────────

function RatingSpectrum({ summary }: { summary: TestSummary }) {
  const rating   = getRating(summary)
  const score    = computeScore(summary)
  const failRate = summary.total > 0 ? ((summary.failed / summary.total) * 100).toFixed(1) : "0"

  return (
    <m.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ borderTop: `2px solid ${rating.color}`, paddingTop: "12px", marginBottom: "24px" }}
    >
      {/* Score + label row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted }}>
            Score
          </span>
          {/* Big score number */}
          <span style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", color: scoreColor(score), lineHeight: 1 }}>
            {score}
          </span>
          <span style={{ fontSize: "16px", color: C.textFaint, fontWeight: 300 }}>/100</span>
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: rating.color }}>
            {rating.label}
          </span>
        </div>
        <span style={{ fontSize: "11px", color: C.textFaint, fontFamily: "var(--font-geist-mono)" }}>
          p99 {fmtMs(summary.p99)} · {failRate}% failed · {summary.rps.toFixed(1)} req/s
        </span>
      </div>

      {/* Score bar */}
      <div style={{ height: "4px", background: C.border, overflow: "hidden", borderRadius: "2px", marginBottom: "12px" }}>
        <m.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ height: "100%", background: scoreColor(score), borderRadius: "2px" }}
        />
      </div>

      {/* Spectrum segments */}
      <div style={{ display: "flex", gap: "3px" }}>
        {RATINGS.slice().reverse().map((r) => {
          const isActive = r.label === rating.label
          return (
            <div key={r.label} style={{ flex: 1 }}>
              <div style={{ height: "3px", background: isActive ? r.color : C.border, transition: "background 300ms ease", borderRadius: "1px" }} />
              <div style={{ fontSize: "9px", fontWeight: isActive ? 700 : 400, letterSpacing: "0.05em", textTransform: "uppercase", color: isActive ? r.color : C.textFaint, marginTop: "4px", textAlign: "center", transition: "all 300ms ease" }}>
                {r.label}
              </div>
            </div>
          )
        })}
      </div>
    </m.div>
  )
}

// ── Single-endpoint results ──────────────────────────────────────────────────

function SingleResults({ summary }: { summary: TestSummary }) {
  return (
    <m.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <RatingSpectrum summary={summary} />

      {/* 4 top-line numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: `1px solid ${C.border}`, marginBottom: "20px", paddingBottom: "20px" }}>
        {[
          { label: "Requests/sec", value: summary.rps.toFixed(1),              color: C.orange },
          { label: "Successful",   value: String(summary.success),              color: C.green  },
          { label: "Failed",       value: String(summary.failed),               color: summary.failed > 0 ? C.red : C.textFaint },
          { label: "Total time",   value: `${summary.totalSec.toFixed(2)}s`,    color: C.text   },
        ].map((s, i) => (
          <div key={s.label} style={{ paddingLeft: i > 0 ? "20px" : "0", paddingRight: i < 3 ? "20px" : "0", borderLeft: i > 0 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: C.textMuted, marginBottom: "6px" }}>
              {s.label}
            </div>
            <div style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", color: s.color, lineHeight: 1 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Latency + Distribution */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
        <div>
          <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textMuted, marginBottom: "10px" }}>Latency</div>
          {([ ["p50 (median)", summary.p50], ["p90", summary.p90], ["p99", summary.p99], ["p999", summary.p999], ["min", summary.min], ["max", summary.max], ["avg", summary.avg] ] as [string, number][]).map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `1px solid ${C.border}`, padding: "7px 0", gap: "12px" }}>
              <span style={{ fontSize: "12px", color: C.textMuted, fontFamily: "var(--font-geist-mono)" }}>{label}</span>
              <span style={{
                fontSize: "14px", fontWeight: 600, fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-geist-mono)",
                color: label.startsWith("p99") && val > 500 ? C.red : label.startsWith("p99") && val > 200 ? C.amber : C.text,
              }}>
                {fmtMs(val)}
              </span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textMuted, marginBottom: "10px" }}>Distribution</div>
          {summary.buckets.map(b => (
            <div key={b.label} style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "11px", color: C.textMuted, fontFamily: "var(--font-geist-mono)" }}>{b.label}</span>
                <span style={{ fontSize: "11px", fontVariantNumeric: "tabular-nums", color: C.textMid, fontFamily: "var(--font-geist-mono)" }}>{b.count} ({b.pct.toFixed(0)}%)</span>
              </div>
              <div style={{ height: "4px", background: C.border, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${b.pct}%`, background: b.pct > 50 ? C.orange : C.textMuted, transition: "width 400ms ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </m.div>
  )
}

// ── Run-all results table + fleet score ─────────────────────────────────────

function MultiResults({ rows }: { rows: MultiRow[] }) {
  const done = rows.filter(r => r.status === "done" && r.summary)
  const thStyle: React.CSSProperties = {
    textAlign: "right", fontSize: "10px", fontWeight: 700,
    letterSpacing: "0.07em", textTransform: "uppercase", color: C.textMuted,
    padding: "0 10px 8px", borderBottom: `1px solid ${C.borderMid}`,
  }

  // Aggregate stats from completed rows
  const agg = done.length > 0 ? (() => {
    const summaries = done.map(r => r.summary!)
    const avg = (fn: (s: TestSummary) => number) =>
      summaries.reduce((acc, s) => acc + fn(s), 0) / summaries.length
    const totalFailed = summaries.reduce((acc, s) => acc + s.failed, 0)
    const scores      = summaries.map(computeScore)
    const fleetScore  = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    return {
      avgP50:     avg(s => s.p50),
      avgP90:     avg(s => s.p90),
      avgP99:     avg(s => s.p99),
      avgRps:     avg(s => s.rps),
      totalFailed,
      scores,
      fleetScore,
    }
  })() : null

  return (
    <m.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* ── Per-endpoint table ── */}
      <div style={{ overflowX: "auto", marginBottom: "24px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-geist-mono)", fontSize: "12px" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left", padding: "0 0 8px" }}>Endpoint</th>
              <th style={{ ...thStyle, textAlign: "left", padding: "0 10px 8px" }}>Rating</th>
              <th style={{ ...thStyle, textAlign: "right", padding: "0 10px 8px" }}>Score</th>
              <th style={thStyle}>p50</th>
              <th style={thStyle}>p90</th>
              <th style={thStyle}>p99</th>
              <th style={thStyle}>req/s</th>
              <th style={thStyle}>failed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const s      = row.summary
              const rating = s ? getRating(s) : null
              const score  = s ? computeScore(s) : null
              return (
                <tr key={row.path} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "9px 0", color: row.status === "running" ? C.orange : C.textMid, fontWeight: row.status === "running" ? 700 : 400 }}>
                    {row.status === "running" ? "▶ " : ""}{row.label}
                  </td>
                  <td style={{ padding: "9px 10px" }}>
                    {row.status === "running" && <span style={{ fontSize: "10px", color: C.orange, letterSpacing: "0.05em" }}>TESTING…</span>}
                    {row.status === "idle"    && <span style={{ fontSize: "10px", color: C.textFaint }}>—</span>}
                    {row.status === "done" && rating && (
                      <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: rating.color }}>
                        {rating.label}
                      </span>
                    )}
                  </td>
                  {/* Score */}
                  <td style={{ textAlign: "right", padding: "9px 10px", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: score !== null ? scoreColor(score) : C.textFaint }}>
                    {score !== null ? score : "—"}
                  </td>
                  {s ? (
                    <>
                      <td style={{ textAlign: "right", padding: "9px 10px", color: C.textMid, fontVariantNumeric: "tabular-nums" }}>{fmtMs(s.p50)}</td>
                      <td style={{ textAlign: "right", padding: "9px 10px", color: C.textMid, fontVariantNumeric: "tabular-nums" }}>{fmtMs(s.p90)}</td>
                      <td style={{ textAlign: "right", padding: "9px 10px", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: s.p99 > 500 ? C.red : s.p99 > 200 ? C.amber : C.green }}>{fmtMs(s.p99)}</td>
                      <td style={{ textAlign: "right", padding: "9px 10px", color: C.orange, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{s.rps.toFixed(1)}</td>
                      <td style={{ textAlign: "right", padding: "9px 10px", color: s.failed > 0 ? C.red : C.textFaint, fontVariantNumeric: "tabular-nums" }}>{s.failed}</td>
                    </>
                  ) : (
                    <td colSpan={5} style={{ textAlign: "right", padding: "9px 10px", color: C.textFaint }}>
                      {row.status === "running" ? "…" : "—"}
                    </td>
                  )}
                </tr>
              )
            })}

            {/* Aggregate row */}
            {agg && (
              <tr style={{ borderTop: `2px solid ${C.borderMid}` }}>
                <td style={{ padding: "9px 0", fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.textMuted }}>
                  Average
                </td>
                <td style={{ padding: "9px 10px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: scoreColor(agg.fleetScore) }}>
                    {getRating({ p99: agg.avgP99, failed: agg.totalFailed, total: done.reduce((a, r) => a + r.summary!.total, 0), success: 0, totalSec: 0, rps: 0, min: 0, max: 0, avg: 0, p50: 0, p90: 0, p999: 0, buckets: [] }).label}
                  </span>
                </td>
                <td style={{ textAlign: "right", padding: "9px 10px", fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: "13px", color: scoreColor(agg.fleetScore) }}>
                  {agg.fleetScore}
                </td>
                <td style={{ textAlign: "right", padding: "9px 10px", color: C.textMid, fontVariantNumeric: "tabular-nums" }}>{fmtMs(agg.avgP50)}</td>
                <td style={{ textAlign: "right", padding: "9px 10px", color: C.textMid, fontVariantNumeric: "tabular-nums" }}>{fmtMs(agg.avgP90)}</td>
                <td style={{ textAlign: "right", padding: "9px 10px", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: agg.avgP99 > 500 ? C.red : agg.avgP99 > 200 ? C.amber : C.green }}>{fmtMs(agg.avgP99)}</td>
                <td style={{ textAlign: "right", padding: "9px 10px", color: C.orange, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{agg.avgRps.toFixed(1)}</td>
                <td style={{ textAlign: "right", padding: "9px 10px", color: agg.totalFailed > 0 ? C.red : C.textFaint, fontVariantNumeric: "tabular-nums" }}>{agg.totalFailed}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Fleet Score card ── */}
      {agg && (
        <m.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          style={{ borderTop: `2px solid ${scoreColor(agg.fleetScore)}`, paddingTop: "14px" }}
        >
          {/* Headline */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted }}>
                Fleet Score
              </span>
              <span style={{ fontSize: "44px", fontWeight: 700, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", color: scoreColor(agg.fleetScore), lineHeight: 1 }}>
                {agg.fleetScore}
              </span>
              <span style={{ fontSize: "18px", color: C.textFaint, fontWeight: 300 }}>/100</span>
              <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: scoreColor(agg.fleetScore) }}>
                {getRating({ p99: agg.avgP99, failed: agg.totalFailed, total: done.reduce((a, r) => a + r.summary!.total, 0), success: 0, totalSec: 0, rps: 0, min: 0, max: 0, avg: 0, p50: 0, p90: 0, p999: 0, buckets: [] }).label}
              </span>
            </div>
            <div style={{ textAlign: "right", fontSize: "11px", color: C.textFaint, fontFamily: "var(--font-geist-mono)", lineHeight: 1.6 }}>
              <div>avg p99 {fmtMs(agg.avgP99)}</div>
              <div>{agg.totalFailed} total failed</div>
            </div>
          </div>

          {/* Overall score bar */}
          <div style={{ height: "6px", background: C.border, overflow: "hidden", borderRadius: "2px", marginBottom: "20px" }}>
            <m.div
              initial={{ width: 0 }}
              animate={{ width: `${agg.fleetScore}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: "100%", background: scoreColor(agg.fleetScore), borderRadius: "2px" }}
            />
          </div>

          {/* Per-endpoint score bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {rows.filter(r => r.status === "done" && r.summary).map((row, i) => {
              const sc = computeScore(row.summary!)
              return (
                <div key={row.path} style={{ display: "grid", gridTemplateColumns: "140px 32px 1fr 60px", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "11px", color: C.textMid, fontFamily: "var(--font-geist-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.label}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: scoreColor(sc), textAlign: "right", fontFamily: "var(--font-geist-mono)" }}>
                    {sc}
                  </span>
                  <div style={{ height: "3px", background: C.border, overflow: "hidden", borderRadius: "2px" }}>
                    <m.div
                      initial={{ width: 0 }}
                      animate={{ width: `${sc}%` }}
                      transition={{ delay: 0.15 + i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      style={{ height: "100%", background: scoreColor(sc), borderRadius: "2px" }}
                    />
                  </div>
                  <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: scoreColor(sc), textAlign: "right" }}>
                    {getRating(row.summary!).label}
                  </span>
                </div>
              )
            })}
          </div>
        </m.div>
      )}
    </m.div>
  )
}

// ── Metric Glossary ──────────────────────────────────────────────────────────

const GLOSSARY: { term: string; def: string }[] = [
  { term: "Requests",    def: "Total number of HTTP requests fired during the test. Higher values give more statistically reliable results." },
  { term: "Concurrency", def: "How many requests run in parallel at the same time, simulating simultaneous users hitting the endpoint." },
  { term: "p50 (median)",def: "50% of requests completed faster than this. A good baseline for typical user experience." },
  { term: "p90",         def: "90% of requests finished within this time. The slowest 10% were slower — the start of the tail." },
  { term: "p99",         def: "99% of requests finished within this time. The most important SLA threshold — 1 in 100 users experienced this or worse." },
  { term: "p999",        def: "99.9th percentile: the worst 1-in-1000 latency. Useful for catching rare but severe spikes." },
  { term: "req/s",       def: "Throughput: how many requests the server handled per second over the full test duration." },
  { term: "Failed",      def: "Requests that returned a non-2xx HTTP status or threw a network error. Any non-zero value warrants investigation." },
  { term: "Rating",      def: "Derived from p99 and failure rate. Excellent: p99<200ms & 0 failures. Good: p99<500ms. Acceptable: p99<1000ms. Degraded: p99<2000ms or >5% failures. Critical: p99≥2000ms or >10% failures." },
]

function LoadTestGlossary({ onClose }: { onClose: () => void }) {
  return (
    <m.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        border:       `1px solid ${C.borderMid}`,
        background:   "#F5F4F0",
        padding:      "16px 20px 12px",
        marginBottom: "20px",
        position:     "relative",
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: "10px", right: "12px",
          background: "transparent", border: "none", cursor: "pointer",
          fontSize: "14px", color: C.textMuted, lineHeight: 1, padding: "2px 4px",
        }}
        aria-label="Close glossary"
      >
        ✕
      </button>

      <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, marginBottom: "12px" }}>
        Metric Reference
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "0" }}>
        {GLOSSARY.map((item, i) => (
          <div
            key={item.term}
            style={{
              display:     "grid",
              gridTemplateColumns: "130px 1fr",
              gap:         "12px",
              padding:     "8px 0",
              borderBottom: i < GLOSSARY.length - 1 ? `1px solid ${C.border}` : "none",
            }}
          >
            <span style={{
              fontSize:      "11px",
              fontWeight:    700,
              fontFamily:    "var(--font-geist-mono)",
              color:         C.text,
              letterSpacing: "-0.01em",
              paddingTop:    "1px",
            }}>
              {item.term}
            </span>
            <span style={{ fontSize: "11px", color: C.textMid, lineHeight: 1.55, letterSpacing: "-0.01em" }}>
              {item.def}
            </span>
          </div>
        ))}
      </div>
    </m.div>
  )
}

// ── LoadTestSection ──────────────────────────────────────────────────────────

function LoadTestSection() {
  const [endpointIdx, setEndpointIdx] = useState(0)
  const [requests,    setRequests]    = useState(50)
  const [concurrency, setConcurrency] = useState(10)
  const [running,     setRunning]     = useState(false)
  const [runningAll,  setRunningAll]  = useState(false)
  const [done,        setDone]        = useState(0)
  const [summary,     setSummary]     = useState<TestSummary | null>(null)
  const [multiRows,   setMultiRows]   = useState<MultiRow[]>([])
  const [showInfo,    setShowInfo]    = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const busy = running || runningAll

  async function start() {
    setSummary(null)
    setMultiRows([])
    setDone(0)
    setRunning(true)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const { results, totalMs } = await runTest(TEST_ENDPOINTS[endpointIdx].path, requests, concurrency, setDone, ctrl.signal)
    if (!ctrl.signal.aborted) setSummary(summarise(results, totalMs))
    setRunning(false)
  }

  async function startAll() {
    setSummary(null)
    setRunningAll(true)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const rows: MultiRow[] = TEST_ENDPOINTS.map(ep => ({ label: ep.label, path: ep.path, status: "idle", summary: null }))
    setMultiRows([...rows])

    for (let i = 0; i < rows.length; i++) {
      if (ctrl.signal.aborted) break
      rows[i] = { ...rows[i], status: "running" }
      setMultiRows([...rows])
      const { results, totalMs } = await runTest(rows[i].path, requests, concurrency, () => {}, ctrl.signal)
      rows[i] = { ...rows[i], status: "done", summary: ctrl.signal.aborted ? null : summarise(results, totalMs) }
      setMultiRows([...rows])
    }
    setRunningAll(false)
  }

  function stop() {
    abortRef.current?.abort()
    setRunning(false)
    setRunningAll(false)
  }

  const progress = running ? done / requests : 1

  const inputStyle: React.CSSProperties = {
    width: "60px", background: "transparent",
    border: `1px solid ${C.border}`, color: C.text,
    fontSize: "12px", fontFamily: "var(--font-geist-mono)",
    padding: "3px 6px", outline: "none", textAlign: "right",
  }

  return (
    <m.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.75, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: "52px" }}
    >
      <SectionHeader
        delay={0.73}
        right={
          <button
            onClick={() => setShowInfo(v => !v)}
            title="Explain metrics"
            style={{
              display:       "inline-flex",
              alignItems:    "center",
              justifyContent:"center",
              width:         "18px",
              height:        "18px",
              borderRadius:  "50%",
              border:        `1px solid ${showInfo ? C.text : C.borderMid}`,
              background:    showInfo ? C.text : "transparent",
              color:         showInfo ? C.bg : C.textMuted,
              fontSize:      "10px",
              fontWeight:    700,
              cursor:        "pointer",
              flexShrink:    0,
              transition:    "all 150ms ease",
              fontFamily:    "var(--font-geist-sans)",
              lineHeight:    1,
            }}
          >
            ?
          </button>
        }
      >
        Load Test
      </SectionHeader>

      <AnimatePresence>
        {showInfo && <LoadTestGlossary key="glossary" onClose={() => setShowInfo(false)} />}
      </AnimatePresence>

      {/* ── Config ── */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "20px", flexWrap: "wrap", marginBottom: "20px" }}>

        {/* Endpoint selector */}
        <div>
          <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: C.textMuted, marginBottom: "6px" }}>
            Endpoint
          </div>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {TEST_ENDPOINTS.map((ep, i) => (
              <button
                key={ep.path}
                onClick={() => { if (!busy) setEndpointIdx(i) }}
                style={{
                  fontSize: "11px", fontWeight: endpointIdx === i ? 700 : 400,
                  fontFamily: "var(--font-geist-mono)", letterSpacing: "-0.01em",
                  color:      endpointIdx === i ? C.bg : C.textMuted,
                  background: endpointIdx === i ? C.text : "transparent",
                  border:     `1px solid ${endpointIdx === i ? C.text : C.border}`,
                  padding:    "3px 8px", cursor: busy ? "not-allowed" : "pointer", transition: "all 150ms ease",
                }}
              >
                {ep.label}
              </button>
            ))}
          </div>
        </div>

        <span style={{ width: "1px", height: "32px", background: C.border, flexShrink: 0, alignSelf: "flex-end", marginBottom: "1px" }} />

        {/* Requests */}
        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: C.textMuted }}>
            Requests
          </span>
          <input type="number" min={1} max={500} value={requests} disabled={busy}
            onChange={e => setRequests(Math.max(1, Math.min(500, Number(e.target.value))))}
            style={inputStyle}
          />
        </label>

        {/* Concurrency */}
        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: C.textMuted }}>
            Concurrency
          </span>
          <input type="number" min={1} max={50} value={concurrency} disabled={busy}
            onChange={e => setConcurrency(Math.max(1, Math.min(50, Number(e.target.value))))}
            style={inputStyle}
          />
        </label>

        <span style={{ width: "1px", height: "32px", background: C.border, flexShrink: 0, alignSelf: "flex-end", marginBottom: "1px" }} />

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "6px", alignSelf: "flex-end" }}>
          {busy ? (
            <button onClick={stop} style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.red, background: "transparent", border: `1px solid ${C.red}`, padding: "4px 14px", cursor: "pointer" }}>
              ■ STOP
            </button>
          ) : (
            <>
              <button onClick={start} style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.bg, background: C.orange, border: `1px solid ${C.orange}`, padding: "4px 14px", cursor: "pointer", transition: "all 150ms ease" }}>
                ▶ RUN
              </button>
              <button onClick={startAll} style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.text, background: "transparent", border: `1px solid ${C.borderMid}`, padding: "4px 14px", cursor: "pointer", transition: "all 150ms ease" }}>
                ▶▶ ALL
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Single test progress ── */}
      {running && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ height: "2px", background: C.border, overflow: "hidden", marginBottom: "6px" }}>
            <div style={{ height: "100%", background: C.orange, width: `${Math.round(progress * 100)}%`, transition: "width 100ms linear" }} />
          </div>
          <span style={{ fontSize: "11px", color: C.textFaint, fontFamily: "var(--font-geist-mono)" }}>
            {done} / {requests} requests · {TEST_ENDPOINTS[endpointIdx].label}
          </span>
        </div>
      )}

      {/* ── Run-all progress (show current endpoint) ── */}
      {runningAll && (() => {
        const current = multiRows.find(r => r.status === "running")
        const done2   = multiRows.filter(r => r.status === "done").length
        return (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ height: "2px", background: C.border, overflow: "hidden", marginBottom: "6px" }}>
              <div style={{ height: "100%", background: C.orange, width: `${(done2 / TEST_ENDPOINTS.length) * 100}%`, transition: "width 300ms ease" }} />
            </div>
            <span style={{ fontSize: "11px", color: C.textFaint, fontFamily: "var(--font-geist-mono)" }}>
              {done2}/{TEST_ENDPOINTS.length} endpoints{current ? ` · testing ${current.label}…` : ""}
            </span>
          </div>
        )
      })()}

      {/* ── Single results ── */}
      {summary && !running && multiRows.length === 0 && (
        <SingleResults summary={summary} />
      )}

      {/* ── Run-all results table ── */}
      {multiRows.length > 0 && (
        <MultiResults rows={multiRows} />
      )}
    </m.section>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPage({ env }: Props) {
  const [stats,   setStats]   = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<AdminStats>
      })
      .then(data => { setStats(data); setLoading(false) })
      .catch(err  => { setError(String(err.message)); setLoading(false) })
  }, [])

  const paidActive = stats?.subscriptions
    .filter(s => s.plan !== "free" && s.status === "active")
    .reduce((sum, s) => sum + s.count, 0) ?? 0

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }
      `}</style>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "clamp(28px, 5vw, 56px) clamp(20px, 4vw, 40px) 80px" }}>

        {/* ─── Masthead ─── */}
        <m.header
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.text }}>
              Trakzi
            </span>
            <span style={{ width: "1px", height: "12px", background: C.borderMid }} />
            <span style={{ fontSize: "13px", color: C.textMuted }}>
              Internal Operations
            </span>
            <EnvBadge env={env} />
          </div>
          <LiveClock />
        </m.header>

        {/* Expanding rule */}
        <m.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          style={{ transformOrigin: "left" }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{ height: "2px", background: C.text, marginBottom: "40px" }} />
        </m.div>

        {error && (
          <div style={{ fontSize: "13px", color: C.red, padding: "20px 0", borderTop: `1px solid ${C.red}` }}>
            Failed to load — {error}
          </div>
        )}

        {/* ─── REGISTRATIONS ─── */}
        <m.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: "52px" }}
        >
          <SectionHeader delay={0.18}>Registrations</SectionHeader>
          <RegistrationsSection stats={stats} loading={loading} />
        </m.section>

        {/* ─── SUBSCRIPTIONS ─── */}
        <m.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: "52px" }}
        >
          <SectionHeader delay={0.28}>
            Subscriptions
            {!loading && paidActive > 0 && (
              <span style={{ fontSize: "10px", fontWeight: 400, letterSpacing: "0", color: C.textMuted }}>
                · {fmt(paidActive)} paid active
              </span>
            )}
            {!loading && (stats?.lifetimeSubs ?? 0) > 0 && (
              <span style={{ fontSize: "10px", fontWeight: 400, letterSpacing: "0", color: C.orange }}>
                · {fmt(stats!.lifetimeSubs)} lifetime
              </span>
            )}
          </SectionHeader>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Bone w="100%" h="14px" />
              {[0, 1, 2].map(i => <Bone key={i} w="100%" h="32px" />)}
            </div>
          ) : (
            <SubMatrix subs={stats?.subscriptions ?? []} />
          )}
        </m.section>

        {/* ─── ENGAGEMENT ─── */}
        <m.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: "52px" }}
        >
          <SectionHeader delay={0.38}>Engagement</SectionHeader>
          <EngagementSection stats={stats} loading={loading} />
        </m.section>

        {/* ─── INFRASTRUCTURE ─── */}
        <m.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: "52px" }}
        >
          <SectionHeader delay={0.53}>Infrastructure</SectionHeader>

          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ borderBottom: `1px solid ${C.border}`, padding: "12px 0", display: "flex", justifyContent: "space-between" }}>
                <Bone w="180px" h="13px" />
                <Bone w="70px"  h="13px" />
              </div>
            ))
          ) : (
            <>
              <Row
                label="File storage"
                value={stats?.storage.fileCount ?? 0}
                detail={stats ? `${(stats.storage.totalBytes / 1_048_576).toFixed(1)} MB` : undefined}
                delay={0.56}
              />
              <Row
                label="Statements failed"
                value={stats?.statementHealth.failed ?? 0}
                delay={0.60}
                orange={(stats?.statementHealth.failed ?? 0) > 0}
              />
              <Row
                label="Statements processing"
                value={stats?.statementHealth.processing ?? 0}
                delay={0.64}
              />
            </>
          )}
        </m.section>

        {/* ─── STRIPE EVENTS ─── */}
        <m.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: "52px" }}
        >
          <SectionHeader delay={0.63}>
            Stripe Events
            {!loading && (
              <span style={{ fontSize: "10px", fontWeight: 400, letterSpacing: "0", color: C.textMuted }}>
                · last {stats?.webhookEvents.length ?? 0}
              </span>
            )}
          </SectionHeader>

          <div style={{ fontFamily: "var(--font-geist-mono), 'Courier New', monospace", fontSize: "12px" }}>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ borderBottom: `1px solid ${C.border}`, padding: "10px 0", display: "flex", justifyContent: "space-between", gap: "16px" }}>
                  <Bone w="200px" h="12px" />
                  <Bone w="55px"  h="12px" />
                  <Bone w="45px"  h="12px" />
                </div>
              ))
            ) : (stats?.webhookEvents ?? []).length === 0 ? (
              <div style={{ color: C.textFaint, padding: "16px 0" }}>No events recorded.</div>
            ) : (
              (stats?.webhookEvents ?? []).map((evt, i) => {
                const color    = eventColor(evt.eventType)
                const sym      = eventSymbol(evt.eventType)
                const isRecent = Date.now() - new Date(evt.createdAt).getTime() < 90_000

                return (
                  <m.div
                    key={evt.eventId}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x:  0 }}
                    transition={{ delay: 0.52 + i * 0.025, duration: 0.2 }}
                    style={{
                      display:             "grid",
                      gridTemplateColumns: "14px 1fr auto auto",
                      gap:                 "10px",
                      alignItems:          "center",
                      borderBottom:        `1px solid ${C.border}`,
                      padding:             "8px 0",
                    }}
                  >
                    {/* status dot */}
                    <span style={{
                      color,
                      fontSize:  "9px",
                      animation: isRecent ? "pulse-dot 1.8s ease-in-out infinite" : "none",
                    }}>
                      {sym}
                    </span>

                    {/* event type */}
                    <span style={{ color: C.textMid, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {evt.eventType}
                    </span>

                    {/* status label */}
                    <span style={{
                      fontSize:      "10px",
                      color,
                      fontWeight:    600,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      minWidth:      "68px",
                      textAlign:     "right",
                    }}>
                      {evt.status}
                    </span>

                    {/* relative time */}
                    <span style={{ color: C.textFaint, minWidth: "56px", textAlign: "right" }}>
                      {relativeTime(evt.createdAt)}
                    </span>
                  </m.div>
                )
              })
            )}
          </div>
        </m.section>

        {/* ─── LOAD TEST ─── */}
        <LoadTestSection />

        {/* ─── Footer ─── */}
        <m.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.3 }}
          style={{
            borderTop:      `1px solid ${C.borderMid}`,
            paddingTop:     "14px",
            display:        "flex",
            justifyContent: "space-between",
            alignItems:     "center",
            flexWrap:       "wrap",
            gap:            "8px",
          }}
        >
          <span style={{ fontSize: "11px", color: C.textFaint }}>
            {stats?.fetchedAt
              ? `data as of ${new Date(stats.fetchedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}`
              : loading ? "loading…" : ""
            }
          </span>
          <span style={{ fontSize: "11px", color: C.textFaint, fontFamily: "var(--font-geist-mono)", letterSpacing: "-0.01em" }}>
            trakzi · internal · restricted
          </span>
        </m.footer>

      </div>
    </div>
  )
}
