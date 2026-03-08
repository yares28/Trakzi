"use client"

import { memo, useMemo, useState, useEffect, Fragment } from "react"
import { useTheme } from "next-themes"
import { ResponsiveLine } from "@nivo/line"
import { PiggyBank, Heart, TrendingUp, ShoppingBag, Trophy } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useColorScheme } from "@/components/color-scheme-provider"
import type { ChallengeMetric, ChallengeGroupMember, MonthlyScore } from "@/lib/types/challenges"
import { ProfileModal } from "@/components/friends/profile-modal"
import type { ProfileModalUser } from "@/components/friends/profile-modal"

const MAX_LINES = 7

const METRIC_LABELS: Record<ChallengeMetric, { label: string; icon: React.ReactNode }> = {
    savingsRate: { label: "Savings Rate", icon: <PiggyBank className="w-3.5 h-3.5" /> },
    financialHealth: { label: "Health", icon: <Heart className="w-3.5 h-3.5" /> },
    fridgeScore: { label: "Fridge", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    wantsPercent: { label: "Frugality", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
}

type ViewMode = "overall" | ChallengeMetric

interface ChallengeScoreChartProps {
    members: ChallengeGroupMember[]
    metrics: ChallengeMetric[]
    currentUserId: string
}

/** Sort members by relevance and take top N */
function topMembers(
    members: ChallengeGroupMember[],
    mode: ViewMode,
    limit: number
): ChallengeGroupMember[] {
    const sorted = [...members].sort((a, b) => {
        if (mode === "overall") return b.total_points - a.total_points
        const aScore = a.scoreHistory?.[mode]?.at(-1)?.score ?? 0
        const bScore = b.scoreHistory?.[mode]?.at(-1)?.score ?? 0
        return bScore - aScore
    })
    return sorted.slice(0, limit)
}

function buildSeriesForMetric(
    members: ChallengeGroupMember[],
    metric: ChallengeMetric,
    currentUserId: string,
    palette: string[]
) {
    const allMonths = new Set<string>()

    for (const member of members) {
        const scores = member.scoreHistory?.[metric]
        if (scores) {
            for (const s of scores) allMonths.add(s.month)
        }
    }

    if (allMonths.size === 0) return []

    const sortedMonths = Array.from(allMonths).sort()

    return members
        .filter(m => {
            const scores = m.scoreHistory?.[metric]
            return scores && scores.length > 0
        })
        .map((m, i) => {
            const scores = m.scoreHistory![metric]!
            const scoreMap = new Map(scores.map(s => [s.month, s.score]))
            const isYou = m.user_id === currentUserId

            return {
                id: isYou ? `${m.display_name} (You)` : m.display_name,
                color: palette[i % palette.length],
                data: sortedMonths.map(month => ({
                    x: month,
                    y: scoreMap.get(month) ?? 0,
                })),
            }
        })
}

function buildSeriesOverall(
    members: ChallengeGroupMember[],
    currentUserId: string,
    palette: string[]
) {
    const userMonthlyPoints = new Map<string, Map<string, number>>()

    for (const member of members) {
        const monthPoints = new Map<string, number>()

        if (member.scoreHistory) {
            for (const scores of Object.values(member.scoreHistory)) {
                if (!scores) continue
                for (const s of scores as MonthlyScore[]) {
                    monthPoints.set(s.month, (monthPoints.get(s.month) || 0) + s.points)
                }
            }
        }

        if (monthPoints.size > 0) {
            userMonthlyPoints.set(member.user_id, monthPoints)
        }
    }

    const allMonths = new Set<string>()
    for (const mp of userMonthlyPoints.values()) {
        for (const month of mp.keys()) allMonths.add(month)
    }

    const now = new Date()
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const hasAnyHistory = allMonths.size > 0
    const hasAnyPoints = members.some(m => m.total_points > 0)

    if (!hasAnyHistory && !hasAnyPoints) return []

    const sortedMonths = Array.from(allMonths).sort()
    if (!allMonths.has(currentMonthKey)) {
        sortedMonths.push(currentMonthKey)
    }

    return members
        .filter(m => userMonthlyPoints.has(m.user_id) || m.total_points > 0)
        .map((m, i) => {
            const monthPoints = userMonthlyPoints.get(m.user_id)
            const isYou = m.user_id === currentUserId

            if (monthPoints && monthPoints.size > 0) {
                let cumulative = 0
                return {
                    id: isYou ? `${m.display_name} (You)` : m.display_name,
                    color: palette[i % palette.length],
                    data: sortedMonths.map(month => {
                        cumulative += monthPoints.get(month) || 0
                        if (month === currentMonthKey) {
                            return { x: month, y: m.total_points }
                        }
                        return { x: month, y: cumulative }
                    }),
                }
            }

            return {
                id: isYou ? `${m.display_name} (You)` : m.display_name,
                color: palette[i % palette.length],
                data: sortedMonths.map(month => ({
                    x: month,
                    y: month === currentMonthKey ? m.total_points : 0,
                })),
            }
        })
}

export const ChallengeScoreChart = memo(function ChallengeScoreChart({
    members,
    metrics,
    currentUserId,
}: ChallengeScoreChartProps) {
    const { resolvedTheme } = useTheme()
    const { getShuffledPalette } = useColorScheme()
    const [mounted, setMounted] = useState(false)
    const [viewMode, setViewMode] = useState<ViewMode>("overall")
    const [selectedUser, setSelectedUser] = useState<ProfileModalUser | null>(null)
    const { user } = useUser()

    useEffect(() => { setMounted(true) }, [])

    const palette = useMemo(() => getShuffledPalette(), [getShuffledPalette])
    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)"
    const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"

    const filteredMembers = useMemo(
        () => topMembers(members, viewMode, MAX_LINES),
        [members, viewMode]
    )

    const chartData = useMemo(() => {
        if (viewMode === "overall") {
            return buildSeriesOverall(filteredMembers, currentUserId, palette)
        }
        return buildSeriesForMetric(filteredMembers, viewMode, currentUserId, palette)
    }, [filteredMembers, currentUserId, viewMode, palette])

    const isScoreView = viewMode !== "overall"

    const getMemberByDisplayName = (displayName: string): ChallengeGroupMember | undefined => {
        const cleanName = displayName.replace(" (You)", "")
        return members.find(m => m.display_name === cleanName || m.display_name === "You" && displayName.includes("(You)"))
    }

    const getAvatarUrl = (member: ChallengeGroupMember | undefined) => {
        if (!member) return null
        if (member.user_id === currentUserId && user?.imageUrl) {
            return user.imageUrl
        }
        return member.avatar_url
    }

    const getInitials = (name: string) => {
        return name.replace(" (You)", "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    }


    if (!mounted) return null

    if (chartData.length === 0) {
        return (
            <Card className="border-border/40 bg-card/60 backdrop-blur-sm rounded-3xl overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                    <h3 className="text-sm font-semibold mb-3">Score Progression</h3>
                    <div className="flex items-center justify-center h-[120px] text-sm text-muted-foreground">
                        Score history will appear as members earn points.
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card className="border-border/40 bg-card/60 backdrop-blur-sm rounded-3xl">
                <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold">Score Progression</h3>
                    </div>

                    {/* Metric tabs */}
                    <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                        <button
                            type="button"
                            onClick={() => setViewMode("overall")}
                            className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap",
                                viewMode === "overall"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted/40 text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Trophy className="w-3 h-3" />
                            Overall
                        </button>
                        {metrics.map(m => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setViewMode(m)}
                                className={cn(
                                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap",
                                    viewMode === m
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted/40 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {METRIC_LABELS[m].icon}
                                {METRIC_LABELS[m].label}
                            </button>
                        ))}
                    </div>

                    <div className="h-[220px] sm:h-[260px]">
                        <ResponsiveLine
                            data={chartData}
                            margin={{ top: 10, right: 20, bottom: 30, left: 40 }}
                            xScale={{ type: "point" }}
                            yScale={{ type: "linear", min: 0, max: "auto" }}
                            curve="monotoneX"
                            colors={({ color }) => color ?? "#888"}
                            lineWidth={2.5}
                            pointSize={8}
                            pointColor={{ theme: "background" }}
                            pointBorderWidth={2}
                            pointBorderColor={{ from: "serieColor" }}
                            enablePoints={true}
                            enableArea={false}
                            enableGridX={false}
                            enableGridY={true}
                            gridYValues={4}
                            axisBottom={{
                                tickSize: 0,
                                tickPadding: 8,
                                format: (v: string) => {
                                    const parts = v.split("-")
                                    if (parts.length === 2) {
                                        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                                        const idx = parseInt(parts[1], 10) - 1
                                        return monthNames[idx] ?? v
                                    }
                                    return v
                                },
                            }}
                            axisLeft={{
                                tickSize: 0,
                                tickPadding: 8,
                                tickValues: 4,
                                format: (v: number) => `${v}`,
                            }}
                            theme={{
                                text: { fill: textColor, fontSize: 11 },
                                axis: { ticks: { text: { fill: textColor } } },
                                grid: { line: { stroke: gridColor, strokeDasharray: "4 4" } },
                            }}
                            tooltip={({ point }) => {
                                const member = getMemberByDisplayName(point.seriesId as string)
                                const avatarUrl = getAvatarUrl(member)
                                return (
                                    <div className="relative flex items-center justify-center pointer-events-none group">
                                        {/* Floating Label (AnimatedTooltip style) */}
                                        <div
                                            className="absolute -top-[52px] left-1/2 -translate-x-1/2 flex text-xs flex-col items-center justify-center rounded-md bg-foreground z-50 shadow-xl px-4 py-2"
                                            style={{ whiteSpace: "nowrap" }}
                                        >
                                            <div className="absolute inset-x-10 z-30 w-[20%] -bottom-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent h-px" />
                                            <div className="absolute left-10 w-[40%] z-30 -bottom-px bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px" />
                                            <div className="font-bold text-background relative z-30 text-base" style={{ color: point.seriesColor }}>
                                                {point.seriesId}
                                            </div>
                                            <div className="text-background/70 text-xs font-semibold mt-0.5 relative z-30">
                                                {point.data.yFormatted} {isScoreView ? "" : "pts"}
                                            </div>
                                        </div>

                                        {/* Avatar Circle */}
                                        <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-background shadow-md relative z-40 transition-transform duration-300">
                                            <AvatarImage src={avatarUrl || undefined} className="object-cover object-top" />
                                            <AvatarFallback className="text-[10px] sm:text-xs font-bold" style={{ backgroundColor: point.seriesColor, color: '#fff' }}>
                                                {getInitials(point.seriesId as string)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                )
                            }}
                            useMesh={true}
                            animate
                            motionConfig="gentle"
                            onClick={(node) => {
                                if (!("seriesId" in node)) return
                                const member = getMemberByDisplayName(node.seriesId as string)
                                const avatarUrl = getAvatarUrl(member)
                                setSelectedUser({
                                    id: member?.user_id || (node.seriesId as string),
                                    name: (node.seriesId as string).replace(" (You)", ""),
                                    avatar: avatarUrl,
                                })
                            }}
                        />
                    </div>

                    {/* Custom HTML legend — dynamic width per name */}
                    <div className="flex items-center justify-center gap-x-4 gap-y-1.5 flex-wrap pt-2 text-xs">
                        {chartData.map(series => {
                            const member = getMemberByDisplayName(series.id)
                            const avatarUrl = getAvatarUrl(member)
                            return (
                                <button
                                    key={series.id}
                                    type="button"
                                    onClick={() => setSelectedUser({
                                        id: member?.user_id || series.id,
                                        name: series.id.replace(" (You)", ""),
                                        avatar: avatarUrl,
                                    })}
                                    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
                                >
                                    <span
                                        className="h-2.5 w-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: series.color }}
                                    />
                                    <span style={{ color: textColor }}>{series.id}</span>
                                </button>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            <ProfileModal open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)} user={selectedUser} />
        </>
    )
})
