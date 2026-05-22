"use client"

import { useState } from "react"
import {
    Trophy, PiggyBank, Heart, ShoppingBag, TrendingUp,
    AlertCircle, Crown, ChevronDown
} from "lucide-react"
import { useUser } from "@clerk/nextjs"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { ChallengeMetric, ChallengeGroupMember } from "@/lib/types/challenges"
import { ScoreSparkline } from "./ScoreSparkline"
import { ProfileModal } from "@/components/friends/profile-modal"
import type { ProfileModalUser } from "@/components/friends/profile-modal"

const METRIC_CONFIG: Record<ChallengeMetric, { label: string; icon: React.ReactNode; unit: string; higherIsBetter: boolean }> = {
    savingsRate: { label: "Savings Rate", icon: <PiggyBank className="w-4 h-4" />, unit: "%", higherIsBetter: true },
    financialHealth: { label: "Financial Health", icon: <Heart className="w-4 h-4" />, unit: "/100", higherIsBetter: true },
    fridgeScore: { label: "Healthy Fridge", icon: <TrendingUp className="w-4 h-4" />, unit: "/100", higherIsBetter: true },
    wantsPercent: { label: "Frugality", icon: <ShoppingBag className="w-4 h-4" />, unit: "%", higherIsBetter: false },
}

const rankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-500"
    if (rank === 2) return "text-slate-400"
    if (rank === 3) return "text-amber-600"
    return "text-muted-foreground"
}

const pointsColor = (pts: number) => {
    if (pts >= 10) return "text-yellow-500 font-bold"
    if (pts >= 5) return "text-primary font-semibold"
    return "text-muted-foreground"
}

function getAvgScore(member: ChallengeGroupMember, metric: ChallengeMetric): number | null {
    const history = member.scoreHistory?.[metric]
    if (!history || history.length === 0) return null
    return history.reduce((sum, h) => sum + h.score, 0) / history.length
}

function MetricLeaderboard({
    metric,
    members,
    currentUserId,
}: {
    metric: ChallengeMetric
    members: ChallengeGroupMember[]
    currentUserId: string
}) {
    const cfg = METRIC_CONFIG[metric]
    const { user } = useUser()
    const [selectedUser, setSelectedUser] = useState<ProfileModalUser | null>(null)

    // Sort by all-time average score from history (falls back to current score if no history)
    const withScores = members.map(m => ({
        member: m,
        score: getAvgScore(m, metric) ?? (m.currentScores[metric] ?? null),
    })).filter(({ score }) => score !== null) as { member: ChallengeGroupMember; score: number }[]

    const sorted = withScores.sort((a, b) =>
        cfg.higherIsBetter ? b.score - a.score : a.score - b.score
    ).map(({ member, score }) => ({ ...member, allTimeScore: score }))

    const unranked = members.filter(m =>
        getAvgScore(m, metric) === null && (m.currentScores[metric] === null || m.currentScores[metric] === undefined)
    )

    const getAvatarUrl = (member: ChallengeGroupMember) => {
        if (member.user_id === currentUserId && user?.imageUrl) {
            return user.imageUrl
        }
        return member.avatar_url
    }

    return (
        <div className="space-y-1">
            {sorted.map((m, i) => {
                const rank = i + 1
                const isYou = m.user_id === currentUserId
                const displayScore = Math.round(m.allTimeScore * 10) / 10
                return (
                    <div
                        key={m.user_id}
                        className={cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors",
                            isYou ? "bg-primary/8" : "hover:bg-muted/10"
                        )}
                    >
                        <span className={cn("w-6 text-center font-bold text-sm", rankColor(rank))}>{rank}</span>
                        <button
                            onClick={() => setSelectedUser({
                                id: m.user_id,
                                name: m.display_name,
                                avatar: getAvatarUrl(m),
                            })}
                            className="shrink-0 hover:opacity-80 transition-opacity"
                        >
                            <Avatar className="w-8 h-8 border border-border/50">
                                <AvatarImage src={getAvatarUrl(m) || undefined} alt={m.display_name} />
                                <AvatarFallback className="text-[10px]">{m.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </button>
                        <span className="flex-1 text-sm font-medium">
                            {m.display_name}
                            {isYou && <span className="ml-1 text-xs text-primary">(You)</span>}
                        </span>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button className="hidden sm:block cursor-default p-1 hover:bg-muted/20 rounded transition-colors">
                                    <ScoreSparkline
                                        history={m.scoreHistory?.[metric] ?? []}
                                        currentScore={displayScore}
                                        lowerIsBetter={!cfg.higherIsBetter}
                                    />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="font-semibold">{m.display_name}</p>
                                <p className="text-xs text-muted-foreground">All-time avg: {displayScore}{cfg.unit}</p>
                            </TooltipContent>
                        </Tooltip>
                        <span className="text-sm font-bold tabular-nums">
                            {displayScore}{cfg.unit}
                        </span>
                        {rank <= 3 && (
                            <Badge className={cn(
                                "text-[10px] px-1.5 py-0 border-none",
                                rank === 1 ? "bg-yellow-500/20 text-yellow-600" :
                                    rank === 2 ? "bg-slate-400/20 text-slate-500" :
                                        "bg-amber-600/20 text-amber-700"
                            )}>
                                #{rank}
                            </Badge>
                        )}
                    </div>
                )
            })}

            {unranked.map(m => (
                <Tooltip key={m.user_id}>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl opacity-50 cursor-help">
                            <span className="w-6 text-center font-bold text-sm text-muted-foreground">—</span>
                            <button
                                onClick={() => setSelectedUser({
                                    id: m.user_id,
                                    name: m.display_name,
                                    avatar: getAvatarUrl(m),
                                })}
                                className="shrink-0 hover:opacity-80 transition-opacity"
                            >
                                <Avatar className="w-8 h-8 border border-border/50">
                                    <AvatarImage src={getAvatarUrl(m) || undefined} alt={m.display_name} />
                                    <AvatarFallback className="text-[10px]">{m.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </button>
                            <span className="flex-1 text-sm font-medium">{m.display_name}</span>
                            <Badge variant="outline" className="text-[10px] gap-1">
                                <AlertCircle className="w-2.5 h-2.5" /> No Data Yet
                            </Badge>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>No historical data yet for this metric</TooltipContent>
                </Tooltip>
            ))}

            <ProfileModal open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)} user={selectedUser} />
        </div>
    )
}

function AllTimeLeaderboard({ members, currentUserId }: { members: ChallengeGroupMember[]; currentUserId: string }) {
    const { user } = useUser()
    const [selectedUser, setSelectedUser] = useState<ProfileModalUser | null>(null)

    const sorted = [...members].sort((a, b) => b.total_points - a.total_points)
    const topThree = sorted.slice(0, 3)
    const rest = sorted.slice(3)

    const podiumOrder = [topThree[1], topThree[0], topThree[2]]

    const getAvatarUrl = (member: ChallengeGroupMember) => {
        if (member.user_id === currentUserId && user?.imageUrl) {
            return user.imageUrl
        }
        return member.avatar_url
    }

    return (
        <div className="space-y-4">
            {topThree.length > 0 && (
                <div className="flex justify-center items-end gap-4 py-4">
                    {podiumOrder.map((member, i) => {
                        if (!member) return <div key={i} className="w-16" />
                        const rank = sorted.findIndex(m => m.user_id === member.user_id) + 1
                        const isYou = member.user_id === currentUserId
                        const heights = ["h-16", "h-20", "h-12"]
                        const podiumColors = ["bg-slate-400/20", "bg-yellow-500/20", "bg-amber-600/20"]
                        const crownColors = ["text-slate-400", "text-yellow-500", "text-amber-600"]

                        return (
                            <Tooltip key={member.user_id}>
                                <TooltipTrigger asChild>
                                    <div className="flex flex-col items-center gap-1 cursor-pointer">
                                        <Crown className={cn("w-4 h-4", crownColors[i])} />
                                        <button
                                            onClick={() => setSelectedUser({
                                                id: member.user_id,
                                                name: member.display_name,
                                                avatar: getAvatarUrl(member),
                                            })}
                                            className="hover:opacity-80 transition-opacity"
                                        >
                                            <Avatar className="w-10 h-10 border-2 border-border/50">
                                                <AvatarImage src={getAvatarUrl(member) || undefined} alt={member.display_name} />
                                                <AvatarFallback className="text-xs font-bold">{member.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        </button>
                                        <span className="text-xs font-semibold text-center max-w-[60px] truncate">
                                            {isYou ? "You" : member.display_name.split(" ")[0]}
                                        </span>
                                        <div className={cn("w-14 rounded-t-lg flex items-end justify-center pb-1", heights[i], podiumColors[i])}>
                                            <span className={cn("text-xs font-bold", crownColors[i])}>{member.total_points}pts</span>
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-semibold">{member.display_name}</p>
                                    <p className="text-xs text-muted-foreground">{member.total_points} total points</p>
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}
                </div>
            )}

            {rest.map((m, i) => {
                const rank = i + 4
                const isYou = m.user_id === currentUserId
                return (
                    <Tooltip key={m.user_id}>
                        <TooltipTrigger asChild>
                            <div className={cn("flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer", isYou && "bg-primary/5")}>
                                <span className="w-6 text-center text-sm font-bold text-muted-foreground">{rank}</span>
                                <button
                                    onClick={() => setSelectedUser({
                                        id: m.user_id,
                                        name: m.display_name,
                                        avatar: getAvatarUrl(m),
                                    })}
                                    className="hover:opacity-80 transition-opacity shrink-0"
                                >
                                    <Avatar className="w-8 h-8 border border-border/50">
                                        <AvatarImage src={getAvatarUrl(m) || undefined} alt={m.display_name} />
                                        <AvatarFallback className="text-[10px]">{m.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                </button>
                                <span className="flex-1 text-sm font-medium">
                                    {m.display_name}
                                    {isYou && <span className="ml-1 text-xs text-primary">(You)</span>}
                                </span>
                                <span className={cn("text-sm tabular-nums", pointsColor(m.total_points))}>
                                    {m.total_points} pts
                                </span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-semibold">{m.display_name}</p>
                            <p className="text-xs text-muted-foreground">{m.total_points} total points</p>
                        </TooltipContent>
                    </Tooltip>
                )
            })}

            {sorted.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">No points earned yet. Start competing to appear on the all-time leaderboard!</p>
            )}

            <ProfileModal open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)} user={selectedUser} />
        </div>
    )
}

interface ChallengeLeaderboardsProps {
    metrics: ChallengeMetric[]
    members: ChallengeGroupMember[]
    currentUserId: string
    hideAllTime?: boolean
    allTimeOnly?: boolean
}

export function ChallengeLeaderboards({ metrics, members, currentUserId, hideAllTime, allTimeOnly }: ChallengeLeaderboardsProps) {
    const [activeTab, setActiveTab] = useState<ChallengeMetric | "allTime">(metrics[0] ?? "allTime")

    if (allTimeOnly) {
        return (
            <TooltipProvider>
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold px-1">All-Time Rankings</h2>
                    <Card className="border-border/40 bg-card/60 backdrop-blur-sm rounded-3xl overflow-hidden">
                        <CardContent className="px-2 py-4">
                            <AllTimeLeaderboard members={members} currentUserId={currentUserId} />
                        </CardContent>
                    </Card>
                </div>
            </TooltipProvider>
        )
    }

    const allOptions: Array<{ key: ChallengeMetric | "allTime"; label: string; icon: React.ReactNode }> = [
        ...metrics.map(m => ({ key: m as ChallengeMetric | "allTime", label: METRIC_CONFIG[m].label, icon: METRIC_CONFIG[m].icon })),
        ...(!hideAllTime ? [{ key: "allTime" as const, label: "All-Time", icon: <Trophy className="w-3.5 h-3.5" /> }] : []),
    ]

    const activeOption = allOptions.find(o => o.key === activeTab)

    return (
        <TooltipProvider>
            <div className="space-y-3">
                <h2 className="text-lg font-semibold px-1">Rankings</h2>
                <Card className="border-border/40 bg-card/60 backdrop-blur-sm rounded-3xl overflow-hidden">
                    {/* Popover filter */}
                    <div className="flex items-center justify-between px-6 pt-4 pb-2">
                        <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground transition-all hover:opacity-90"
                                >
                                    {activeOption?.icon}
                                    {activeOption?.label}
                                    <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-auto p-1.5 rounded-2xl">
                                <div className="flex flex-col gap-0.5">
                                    {allOptions.map(opt => (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => setActiveTab(opt.key)}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left w-full",
                                                activeTab === opt.key
                                                    ? "bg-primary text-primary-foreground"
                                                    : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {opt.icon}
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                        <span className="text-[11px] text-muted-foreground">All-time avg</span>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <CardContent className="px-2 pb-4">
                        {activeTab === "allTime" ? (
                            <AllTimeLeaderboard members={members} currentUserId={currentUserId} />
                        ) : (
                            <MetricLeaderboard
                                metric={activeTab as ChallengeMetric}
                                members={members}
                                currentUserId={currentUserId}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    )
}
