"use client"

import { memo, useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import { ResponsiveBar } from "@nivo/bar"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/components/currency-provider"
import { useColorScheme } from "@/components/color-scheme-provider"

// ── Types ──────────────────────────────────────────────────────────────────

interface Split {
    user_id: string
    display_name: string
    amount: number | string
    item_id?: string | null
}

interface Transaction {
    id: string
    description: string
    total_amount: number | string
    transaction_date: string
    splits?: Split[]
    source_type?: string
    is_attributed?: boolean
    category?: string | null
}

interface Member {
    user_id: string
    display_name: string
    avatar_url: string | null
}

interface Balance {
    user_id: string
    net_balance: number | string
    total_paid?: number | string
    total_owed?: number | string
}

interface SourceBreakdown {
    personal_import: { total: number; count: number }
    receipt: { total: number; count: number }
    statement: { total: number; count: number }
    manual: { total: number; count: number }
}

interface RoomInsightsProps {
    transactions: Transaction[]
    members: Member[]
    balances: Balance[]
    sourceBreakdown: SourceBreakdown
    totalSpent: number
    unattributedTotal: number
    unattributedCount: number
    transactionCount: number
    currentUserId?: string
}

// ── Safe number helper (Neon can return numeric columns as strings) ─────────
const n = (v: number | string | undefined | null): number => {
    if (v === null || v === undefined) return 0
    const num = typeof v === "string" ? parseFloat(v) : v
    return isNaN(num) ? 0 : num
}

function getInitials(name: string) {
    const p = name.trim().split(" ")
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
}

// ── Nivo theme (auto dark/light) ───────────────────────────────────────────
function useNivoTheme(isDark: boolean) {
    const text = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)"
    const bg = isDark ? "#0f0f1a" : "#ffffff"
    const border = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"
    return {
        background: "transparent",
        text: { fill: text, fontSize: 11, fontFamily: "inherit" },
        axis: {
            ticks: { text: { fill: text, fontSize: 10 }, line: { stroke: "transparent" } },
            domain: { line: { stroke: "transparent" } },
        },
        grid: { line: { stroke: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", strokeWidth: 1 } },
        tooltip: {
            container: {
                background: bg, border: `1px solid ${border}`,
                borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                fontSize: 12, color: isDark ? "#e2e8f0" : "#1a202c", padding: "8px 12px",
            },
        },
        legends: { text: { fill: text, fontSize: 11 } },
    } as const
}

// ── Shared tooltip ─────────────────────────────────────────────────────────
function Tip({ color, label, value, isDark }: { color?: string; label: string; value: string; isDark: boolean }) {
    const bg = isDark ? "#0f0f1a" : "#ffffff"
    const border = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"
    const fg = isDark ? "#e2e8f0" : "#1a202c"
    return (
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "8px 12px", color: fg, fontSize: 12 }}>
            <div className="flex items-center gap-2 font-semibold">
                {color && <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />}
                {label}
            </div>
            <div className="mt-0.5 opacity-70">{value}</div>
        </div>
    )
}

// ── Chart card wrapper ─────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, className }: {
    title: string; subtitle?: string; children: React.ReactNode; className?: string
}) {
    return (
        <Card className={cn("border-border/40 bg-card/60 backdrop-blur-xl rounded-3xl overflow-hidden", className)}>
            <CardHeader className="pb-1 pt-5 px-6">
                <CardTitle className="text-sm font-semibold">{title}</CardTitle>
                {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </CardHeader>
            <CardContent className="pb-5 px-6">{children}</CardContent>
        </Card>
    )
}

function Empty({ msg = "Not enough data yet." }: { msg?: string }) {
    return (
        <div className="flex items-center justify-center min-h-[160px]">
            <p className="text-sm text-muted-foreground text-center">{msg}</p>
        </div>
    )
}

// ── Chart 1 — Who Spent the Most ──────────────────────────────────────────
function MemberPieChart({ transactions, members, currentUserId, isDark, palette }: {
    transactions: Transaction[]; members: Member[]; currentUserId?: string; isDark: boolean; palette: string[]
}) {
    const { formatCurrency } = useCurrency()
    const theme = useNivoTheme(isDark)

    const data = useMemo(() => {
        // Sum ALL splits per user (both top-level and item-level)
        const totals: Record<string, number> = {}
        for (const tx of transactions) {
            if (!tx.splits?.length) continue
            for (const s of tx.splits) {
                totals[s.user_id] = (totals[s.user_id] ?? 0) + n(s.amount)
            }
        }
        return members
            .filter(m => (totals[m.user_id] ?? 0) > 0)
            .map((m, i) => ({
                id: m.user_id,
                label: m.user_id === currentUserId ? "You" : m.display_name.split(" ")[0],
                value: Math.round(totals[m.user_id] * 100) / 100,
                color: palette[i % palette.length],
                avatar_url: m.avatar_url,
                display_name: m.display_name,
            }))
            .sort((a, b) => b.value - a.value)
    }, [transactions, members, currentUserId, palette])

    if (!data.length) return <Empty msg="No attributed transactions yet." />

    const total = data.reduce((s, d) => s + d.value, 0)

    return (
        <div className="flex items-center gap-4">
            <div style={{ height: 180, width: 180, flexShrink: 0 }}>
                <ResponsivePie
                    data={data} colors={d => d.data.color}
                    innerRadius={0.55} padAngle={2} cornerRadius={4}
                    sortByValue enableArcLabels={false} enableArcLinkLabels={false}
                    theme={theme}
                    tooltip={({ datum }) => <Tip color={datum.color} label={datum.label as string} value={formatCurrency(datum.value)} isDark={isDark} />}
                />
            </div>
            <div className="flex-1 space-y-2.5 min-w-0">
                {data.map((d) => {
                    const m = members.find(x => x.user_id === d.id)
                    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
                    return (
                        <div key={d.id} className="flex items-center gap-2">
                            <Avatar className="w-6 h-6 shrink-0">
                                <AvatarImage src={m?.avatar_url || undefined} />
                                <AvatarFallback className="text-[8px] font-bold" style={{ background: d.color + "25", color: d.color }}>
                                    {getInitials(m?.display_name ?? d.label)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-xs font-medium truncate">{d.label}</span>
                                    <span className="text-xs font-bold tabular-nums ml-2 shrink-0">{formatCurrency(d.value)}</span>
                                </div>
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>
                                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: d.color }} />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ── Chart 2 — Spending by Category ────────────────────────────────────────
function CategoryPieChart({ transactions, isDark, palette }: { transactions: Transaction[]; isDark: boolean; palette: string[] }) {
    const { formatCurrency } = useCurrency()
    const theme = useNivoTheme(isDark)

    const data = useMemo(() => {
        const totals: Record<string, number> = {}
        for (const tx of transactions) {
            const cat = tx.category && tx.category !== "null" ? tx.category
                : tx.source_type === "personal_import" ? "Imported"
                : tx.source_type === "receipt" ? "Receipt"
                : tx.source_type === "statement" ? "Statement"
                : "Other"
            totals[cat] = (totals[cat] ?? 0) + n(tx.total_amount)
        }
        return Object.entries(totals)
            .filter(([, v]) => v > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([label, value], i) => ({
                id: label, label, value: Math.round(value * 100) / 100,
                color: palette[i % palette.length],
            }))
    }, [transactions, palette])

    if (!data.length) return <Empty />

    return (
        <div className="flex flex-col gap-3">
            <div style={{ height: 190 }}>
                <ResponsivePie
                    data={data} colors={d => d.data.color}
                    innerRadius={0.5} padAngle={1.5} cornerRadius={4}
                    sortByValue enableArcLabels={false} enableArcLinkLabels={false}
                    theme={theme}
                    tooltip={({ datum }) => <Tip color={datum.color} label={datum.label as string} value={formatCurrency(datum.value)} isDark={isDark} />}
                />
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {data.slice(0, 8).map(d => (
                    <div key={d.id} className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-[10px] text-muted-foreground truncate">{d.label}</span>
                        <span className="text-[10px] font-semibold tabular-nums ml-auto shrink-0">{formatCurrency(d.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Chart 3 — Spending Over Time (all-time) ────────────────────────────────
function MonthlyBarChart({ transactions, isDark, palette }: { transactions: Transaction[]; isDark: boolean; palette: string[] }) {
    const { formatCurrency } = useCurrency()
    const theme = useNivoTheme(isDark)

    const data = useMemo(() => {
        const byMonth: Record<string, number> = {}
        for (const tx of transactions) {
            // Handle ISO datetime or plain date string
            const raw = String(tx.transaction_date ?? "")
            const month = raw.slice(0, 7) // → "YYYY-MM"
            if (!month || month.length < 7 || !/^\d{4}-\d{2}$/.test(month)) continue
            byMonth[month] = (byMonth[month] ?? 0) + n(tx.total_amount)
        }
        return Object.entries(byMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            // All time — no slice limit
            .map(([month, amount]) => ({
                month: new Date(month + "-02").toLocaleDateString("en", { month: "short", year: "2-digit" }),
                amount: Math.round(amount * 100) / 100,
            }))
    }, [transactions])

    if (!data.length) return <Empty />

    return (
        <div style={{ height: 200 }}>
            <ResponsiveBar
                data={data} keys={["amount"]} indexBy="month"
                colors={[palette[0] ?? "#6366f1"]}
                borderRadius={6} padding={0.35}
                enableLabel={false}
                axisTop={null} axisRight={null}
                axisBottom={{ tickSize: 0, tickPadding: 10 }}
                axisLeft={null} enableGridY={false}
                theme={theme}
                tooltip={({ value, indexValue }) => <Tip label={String(indexValue)} value={formatCurrency(value as number)} isDark={isDark} />}
                motionConfig="gentle"
            />
        </div>
    )
}

// ── Chart 4 — Member Balances (Paid vs Owed) ──────────────────────────────
function BalancesChart({ balances, members, currentUserId, isDark, palette }: {
    balances: Balance[]; members: Member[]; currentUserId?: string; isDark: boolean; palette: string[]
}) {
    const { formatCurrency } = useCurrency()
    const theme = useNivoTheme(isDark)

    const data = useMemo(() =>
        balances.map(b => {
            const m = members.find(x => x.user_id === b.user_id)
            const name = b.user_id === currentUserId ? "You" : (m?.display_name.split(" ")[0] ?? b.user_id.slice(0, 6))
            return {
                member: name,
                Paid: Math.round(n(b.total_paid) * 100) / 100,
                Owed: Math.round(n(b.total_owed) * 100) / 100,
            }
        }).filter(d => d.Paid > 0 || d.Owed > 0)
    , [balances, members, currentUserId])

    if (!data.length) return <Empty msg="No balance data yet." />

    return (
        <div style={{ height: 200 }}>
            <ResponsiveBar
                data={data} keys={["Paid", "Owed"]} indexBy="member"
                colors={[palette[0] ?? "#6366f1", palette[2] ?? "#8b5cf6"]}
                groupMode="grouped" borderRadius={5}
                padding={0.3} innerPadding={3}
                enableLabel={false}
                axisTop={null} axisRight={null}
                axisBottom={{ tickSize: 0, tickPadding: 10 }}
                axisLeft={null} enableGridY={false}
                theme={theme}
                legends={[{
                    dataFrom: "keys", anchor: "top-right", direction: "row",
                    itemWidth: 48, itemHeight: 14, itemsSpacing: 8,
                    symbolSize: 8, symbolShape: "circle",
                }]}
                tooltip={({ id, value, indexValue, color }) => (
                    <Tip color={color} label={`${indexValue} — ${id}`} value={formatCurrency(value as number)} isDark={isDark} />
                )}
                motionConfig="gentle"
            />
        </div>
    )
}

// ── Chart 5 — Top Transactions ─────────────────────────────────────────────
function TopTransactionsChart({ transactions, palette }: { transactions: Transaction[]; palette: string[] }) {
    const { formatCurrency } = useCurrency()

    const data = useMemo(() =>
        [...transactions]
            .sort((a, b) => n(b.total_amount) - n(a.total_amount))
            .slice(0, 6)
            .map(tx => ({
                name: tx.description.length > 30 ? tx.description.slice(0, 30) + "…" : tx.description,
                amount: n(tx.total_amount),
                date: String(tx.transaction_date ?? "").slice(0, 10),
            }))
    , [transactions])

    if (!data.length) return <Empty />

    const max = data[0]?.amount ?? 1

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
            {data.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-mono w-4 shrink-0 text-right opacity-60">{i + 1}</span>
                    <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-medium truncate">{d.name}</span>
                            <span className="text-sm font-bold tabular-nums shrink-0">{formatCurrency(d.amount)}</span>
                        </div>
                        <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "rgba(99,102,241,0.12)" }}>
                            <div
                                className="absolute inset-y-0 left-0 rounded-full"
                                style={{
                                    width: `${(d.amount / max) * 100}%`,
                                    background: `linear-gradient(90deg, ${palette[i % palette.length] ?? "#6366f1"}, ${palette[(i + 2) % palette.length] ?? "#8b5cf6"})`,
                                }}
                            />
                        </div>
                        {d.date && <span className="text-[10px] text-muted-foreground/55">{d.date}</span>}
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Main ───────────────────────────────────────────────────────────────────

export const RoomInsights = memo(function RoomInsights({
    transactions,
    members,
    balances,
    totalSpent,
    unattributedTotal,
    unattributedCount,
    transactionCount,
    currentUserId,
}: RoomInsightsProps) {
    const { formatCurrency } = useCurrency()
    const { resolvedTheme } = useTheme()
    const { getShuffledPalette } = useColorScheme()
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const isDark = resolvedTheme === "dark"
    const palette = getShuffledPalette()
    const attributedCount = transactionCount - unattributedCount
    const attributionPct = transactionCount > 0 ? Math.round((attributedCount / transactionCount) * 100) : 0

    if (!mounted) return null

    return (
        <div className="space-y-4">
            {/* ── KPI strip (3 cards — Members removed) ── */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: "Total Spent", value: formatCurrency(n(totalSpent)), accent: false },
                    { label: "Transactions", value: String(transactionCount), accent: false },
                    { label: "Attribution", value: `${attributionPct}%`, accent: attributionPct < 100 && transactionCount > 0 },
                ].map((kpi, i) => (
                    <Card key={i} className="rounded-2xl border-border/40 bg-card/60 backdrop-blur-xl">
                        <CardContent className="px-4 py-3">
                            <p className="text-[11px] text-muted-foreground font-medium">{kpi.label}</p>
                            <p className={cn("text-xl font-bold tabular-nums mt-0.5", kpi.accent && "text-amber-500")}>
                                {kpi.value}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Row 1: Who Spent Most + Categories ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ChartCard title="Who Spent the Most" subtitle="Based on attributed splits">
                    <MemberPieChart transactions={transactions} members={members} currentUserId={currentUserId} isDark={isDark} palette={palette} />
                </ChartCard>
                <ChartCard title="Spending by Category" subtitle="All room transactions">
                    <CategoryPieChart transactions={transactions} isDark={isDark} palette={palette} />
                </ChartCard>
            </div>

            {/* ── Row 2: Monthly + Balances ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ChartCard title="Spending Over Time" subtitle="All time, grouped by month">
                    <MonthlyBarChart transactions={transactions} isDark={isDark} palette={palette} />
                </ChartCard>
                <ChartCard title="Member Balances" subtitle="What each member paid vs owes">
                    <BalancesChart balances={balances} members={members} currentUserId={currentUserId} isDark={isDark} palette={palette} />
                </ChartCard>
            </div>

            {/* ── Row 3: Top Transactions ── */}
            <ChartCard title="Top Transactions" subtitle="Largest individual expenses">
                <TopTransactionsChart transactions={transactions} palette={palette} />
            </ChartCard>
        </div>
    )
})

RoomInsights.displayName = "RoomInsights"
