"use client"

import { memo, useState, type ReactNode } from "react"
import { TrendingUp, ChevronDown, ChevronUp, UserPlus, Lock, Shield, Trophy, PiggyBank, Heart, ShoppingBag, AlertCircle, Check, X, Clock } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useFriendsBundleData, useRefreshFriendsBundle } from "@/hooks/use-friends-bundle"
import { useCurrency } from "@/components/currency-provider"
import type { FriendScore } from "@/lib/charts/friends-aggregations"
import type { FriendWithBalance, FriendRequest } from "@/lib/types/friends"
import { AddFriendDialog } from "@/components/friends/add-friend-dialog"
import { ProfileModal } from "@/components/friends/profile-modal"
import type { ProfileModalUser } from "@/components/friends/profile-modal"
import { demoFetch } from "@/lib/demo/demo-fetch"

type RankingMetric = "overall" | "savings" | "health" | "fridge" | "frugality"

interface MetricConfig {
    key: RankingMetric
    label: string
    icon: ReactNode
    field: keyof FriendScore
    unit: string
    higherIsBetter: boolean
}



const METRICS: MetricConfig[] = [
    { key: "overall", label: "Overall", icon: <Trophy className="w-4 h-4" />, field: "overallScore", unit: "/100", higherIsBetter: true },
    { key: "savings", label: "Savings Rate", icon: <PiggyBank className="w-4 h-4" />, field: "savingsRate", unit: "%", higherIsBetter: true },
    { key: "health", label: "Financial Health", icon: <Heart className="w-4 h-4" />, field: "financialHealth", unit: "/100", higherIsBetter: true },
    { key: "fridge", label: "Healthy Fridge", icon: <TrendingUp className="w-4 h-4" />, field: "fridgeScore", unit: "/100", higherIsBetter: true },
    { key: "frugality", label: "Frugality", icon: <ShoppingBag className="w-4 h-4" />, field: "wantsPercent", unit: "%", higherIsBetter: false },
]

// ─── Relative time formatter ─────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
    if (!dateStr || dateStr === "Just now" || dateStr === "Never") return dateStr
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const now = Date.now()
    const diff = now - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

// ─── Crown SVG ───────────────────────────────────────────────────────────────

const Crown = ({ rank, className }: { rank: 1 | 2 | 3, className?: string }) => {
    const colors = {
        1: "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]",
        2: "text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.6)]",
        3: "text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.5)]"
    }
    return (
        <svg
            aria-hidden="true"
            className={cn("w-6 h-6", colors[rank], className)}
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
        </svg>
    )
}

// ─── Podium Slot Component ────────────────────────────────────────────────────

interface PodiumSlotProps {
    friend: FriendScore | undefined
    rank: 1 | 2 | 3
    score: number
    unitLabel: string
    userImageUrl?: string
}

const PodiumSlot = memo(function PodiumSlot({ friend, rank, score, unitLabel, userImageUrl }: PodiumSlotProps) {
    const sizeClasses = rank === 1
        ? { outer: "w-20 h-20 sm:w-28 sm:h-28 p-1 sm:p-1.5", avatar: "border-2 sm:border-4", text: "text-xs sm:text-base font-bold mt-2 sm:mt-4", score: "text-xl sm:text-3xl font-black text-yellow-500 drop-shadow-sm", mb: "mb-3 sm:mb-6" }
        : rank === 2
            ? { outer: "w-16 h-16 sm:w-20 sm:h-20 p-0.5 sm:p-1", avatar: "border-2", text: "text-[10px] sm:text-sm font-semibold mt-1.5 sm:mt-3", score: "text-base sm:text-xl font-bold text-slate-300", mb: "mb-2 sm:mb-4" }
            : { outer: "w-12 h-12 sm:w-16 sm:h-16 p-0.5 sm:p-1", avatar: "border", text: "text-[10px] sm:text-xs font-semibold mt-1 sm:mt-2", score: "text-sm sm:text-lg font-bold text-amber-600", mb: "mb-1 sm:mb-2" }

    const gradient = rank === 1
        ? "bg-gradient-to-tr from-yellow-300 via-yellow-500 to-amber-600 shadow-[0_0_30px_rgba(250,204,21,0.5)]"
        : rank === 2
            ? "bg-gradient-to-tr from-slate-300 to-slate-500 shadow-[0_0_20px_rgba(203,213,225,0.4)]"
            : "bg-gradient-to-tr from-amber-600 to-amber-800 shadow-[0_0_15px_rgba(217,119,6,0.3)]"

    const badgeClass = rank === 1
        ? "bg-yellow-500 text-yellow-950 text-xs sm:text-base font-black px-2 sm:px-4 shadow-xl"
        : rank === 2
            ? "bg-slate-400 text-slate-900 font-bold px-1.5 sm:px-3 shadow-lg text-[10px] sm:text-sm"
            : "bg-amber-700 text-amber-50 font-bold px-1 sm:px-2 shadow-md text-[10px]"

    const labels = { 1: "1ST", 2: "2ND", 3: "3RD" }

    if (!friend) {
        return (
            <div className="flex flex-col items-center opacity-60">
                <div className={cn("relative", sizeClasses.mb)}>
                    <div className={cn(sizeClasses.outer, "rounded-full bg-muted/30")}>
                        <Avatar className={cn("w-full h-full border-dashed border-border/50 bg-transparent flex items-center justify-center", sizeClasses.avatar)}>
                            <UserPlus className="w-4 h-4 sm:w-6 sm:h-6 text-muted-foreground/40" />
                        </Avatar>
                    </div>
                    <Badge className={cn("absolute -bottom-2 left-1/2 -translate-x-1/2 border-none opacity-50", badgeClass)}>
                        {labels[rank]}
                    </Badge>
                </div>
                <span className={cn(sizeClasses.text, "text-muted-foreground")}>-</span>
            </div>
        )
    }

    return (
        <div className={cn("flex flex-col items-center", rank === 1 && "z-10")}>
            <div className={cn("relative", sizeClasses.mb)}>
                <Crown rank={rank} className={cn("absolute left-1/2 -translate-x-1/2", rank === 1 ? "-top-5 sm:-top-8 w-5 sm:w-8 h-5 sm:h-8" : rank === 2 ? "-top-3.5 sm:-top-6 w-4 sm:w-6 h-4 sm:h-6" : "-top-3 sm:-top-5 w-4 sm:w-5 h-4 sm:h-5")} />
                <div className={cn(sizeClasses.outer, "rounded-full", gradient)}>
                    <Avatar className={cn("w-full h-full border-background", sizeClasses.avatar)}>
                        <AvatarImage src={(friend.name === "You" ? userImageUrl : friend.avatar_url) || undefined} alt={friend.name} />
                        <AvatarFallback className="bg-muted text-sm sm:text-lg font-bold">{friend.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </div>
                <Badge className={cn("absolute -bottom-2 left-1/2 -translate-x-1/2 border-none", badgeClass)}>
                    {labels[rank]}
                </Badge>
            </div>
            <span className={cn(sizeClasses.text, "truncate max-w-[60px] sm:max-w-none")}>{friend.name === "You" ? "You" : friend.name.split(" ")[0]}</span>
            <span className={sizeClasses.score}>{score}</span>
        </div>
    )
})

PodiumSlot.displayName = "PodiumSlot"

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RankingsTab() {
    const [activeMetric, setActiveMetric] = useState<RankingMetric>("overall")
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [addFriendOpen, setAddFriendOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<ProfileModalUser | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const { data: bundleData, isLoading } = useFriendsBundleData()
    const { user } = useUser()
    const { formatCurrency } = useCurrency()
    const queryClient = useQueryClient()
    const refreshFriendsBundle = useRefreshFriendsBundle()

    const friendsList = (bundleData?.friendsList ?? []) as FriendWithBalance[]

    let friends = (bundleData?.friends || []) as FriendScore[]

    // Fallback: inject current user if no friends
    if (!isLoading && friends.length === 0) {
        friends = [{
            id: "self",
            friendUserId: user?.id || "you",
            name: user?.firstName || user?.fullName || "You",
            avatar_url: user?.imageUrl ?? null,
            savingsRate: 0,
            financialHealth: 0,
            consistencyScore: 0,
            fridgeScore: 0,
            wantsPercent: 0,
            overallScore: 0,
            isPrivate: false,
            isRanked: false,
        }]
    }

    const activeMetricConfig = METRICS.find(m => m.key === activeMetric)!

    const getScore = (friend: FriendScore): number =>
        friend[activeMetricConfig.field] as number

    // Sort: ranked first (by score), then unranked, then private
    const sortedFriends = [...friends].sort((a, b) => {
        if (a.isPrivate && !b.isPrivate) return 1
        if (!a.isPrivate && b.isPrivate) return -1
        if (!a.isRanked && b.isRanked) return 1
        if (a.isRanked && !b.isRanked) return -1
        // For frugality — lower is better
        if (!activeMetricConfig.higherIsBetter) return getScore(a) - getScore(b)
        return getScore(b) - getScore(a)
    })

    const topThree = sortedFriends.filter(f => !f.isPrivate && f.isRanked).slice(0, 3)

    // Friends list helper functions
    const getFriendStats = (userId: string) => {
        const score = friends.find(f => f.friendUserId === userId)
        if (!score || score.isPrivate) return undefined
        return {
            savingsRate: score.savingsRate,
            spendingRate: 100 - score.savingsRate,
            financialHealth: score.financialHealth,
            fridgeScore: score.fridgeScore,
            wantsPercent: score.wantsPercent,
            streak: 0,
        }
    }

    const handleAccept = async (friendshipId: string) => {
        setActionLoading(friendshipId)
        try {
            const res = await demoFetch(`/api/friends/requests/${friendshipId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'accept' }),
            })
            if (!res.ok) throw new Error('Failed to accept request')
            toast.success('Friend request accepted')
            refreshFriendsBundle()
        } catch {
            toast.error('Failed to accept friend request')
        } finally {
            setActionLoading(null)
        }
    }

    const handleDecline = async (friendshipId: string) => {
        setActionLoading(friendshipId)
        try {
            const res = await demoFetch(`/api/friends/requests/${friendshipId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'decline' }),
            })
            if (!res.ok) throw new Error('Failed to decline request')
            toast.success('Friend request declined')
            queryClient.invalidateQueries({ queryKey: ['friends-bundle'] })
        } catch {
            toast.error('Failed to decline friend request')
        } finally {
            setActionLoading(null)
        }
    }

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <TooltipProvider>
            <div className="w-full max-w-5xl mx-auto space-y-6">
                {/* Podium - Horizontal scroll on mobile */}
                <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="flex justify-center items-end gap-3 sm:gap-6 mt-6 sm:mt-8 h-[200px] sm:h-[220px] min-w-max px-2">
                        <PodiumSlot friend={topThree[1]} rank={2} score={topThree[1] ? getScore(topThree[1]) : 0} unitLabel={activeMetricConfig.unit} userImageUrl={user?.imageUrl} />
                        <PodiumSlot friend={topThree[0]} rank={1} score={topThree[0] ? getScore(topThree[0]) : 0} unitLabel={activeMetricConfig.unit} userImageUrl={user?.imageUrl} />
                        <PodiumSlot friend={topThree[2]} rank={3} score={topThree[2] ? getScore(topThree[2]) : 0} unitLabel={activeMetricConfig.unit} userImageUrl={user?.imageUrl} />
                    </div>
                </div>

                {/* List View */}
                <Card className="border-border/40 bg-white/5 dark:bg-black/20 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden mt-6 sm:mt-8">
                    {/* Metric Selector */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4 bg-muted/10 border-b border-border/40">
                        <h3 className="text-base sm:text-lg font-semibold">All-Time Rankings</h3>
                        <Select value={activeMetric} onValueChange={(v) => setActiveMetric(v as RankingMetric)}>
                            <SelectTrigger className="w-full sm:w-[190px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {METRICS.map(metric => (
                                    <SelectItem key={metric.key} value={metric.key}>
                                        <span className="flex items-center gap-2">
                                            {metric.icon}
                                            {metric.label}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <CardContent className="p-0">
                        {/* Header */}
                        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-muted/20 border-b border-border/40 text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                                <span className="w-6 sm:w-8 text-center shrink-0">Rank</span>
                                <span className="truncate">Friend</span>
                            </div>
                            <div className="flex items-center justify-end w-16 sm:w-1/2 pl-2 sm:pl-4 shrink-0">
                                <span>Score</span>
                            </div>
                        </div>

                        <div className="divide-y divide-border/30">
                            {sortedFriends.map((friend, index) => {
                                const rankedBeforeThis = sortedFriends.slice(0, index).filter(f => !f.isPrivate && f.isRanked && !f.isPrivate).length
                                const rank = rankedBeforeThis + 1
                                const isExpanded = expandedId === friend.id
                                const score = getScore(friend)
                                const isNotRanked = !friend.isRanked && !friend.isPrivate

                                return (
                                    <div key={friend.id} className={cn("group", isNotRanked && "opacity-60")}>
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setExpandedId(isExpanded ? null : friend.id)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(isExpanded ? null : friend.id) } }}
                                            aria-expanded={isExpanded}
                                            className={cn(
                                                "flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 cursor-pointer transition-colors hover:bg-muted/10",
                                                friend.name === "You" ? "bg-primary/5 hover:bg-primary/10" : ""
                                            )}
                                        >
                                            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                                                <span className="w-6 sm:w-8 text-center font-bold text-muted-foreground shrink-0">
                                                    {friend.isPrivate || isNotRanked ? "—" : rank}
                                                </span>
                                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                                    <button
                                                        className="shrink-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            const avatarUrl = friend.name === "You" ? (user?.imageUrl ?? null) : (friend.avatar_url ?? null)
                                                            setSelectedUser({
                                                                id: friend.friendUserId,
                                                                name: friend.name,
                                                                avatar: avatarUrl,
                                                                stats: friend.isPrivate ? undefined : {
                                                                    savingsRate: friend.savingsRate,
                                                                    spendingRate: 100 - friend.savingsRate,
                                                                    financialHealth: friend.financialHealth,
                                                                    fridgeScore: friend.fridgeScore,
                                                                    wantsPercent: friend.wantsPercent,
                                                                    streak: 0,
                                                                },
                                                                isPrivate: friend.isPrivate,
                                                            })
                                                        }}
                                                    >
                                                        <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border border-border/50 shrink-0">
                                                            <AvatarImage src={(friend.name === "You" ? user?.imageUrl : friend.avatar_url) || undefined} alt={friend.name} />
                                                            <AvatarFallback className="text-xs sm:text-base">{friend.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                    </button>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-semibold flex items-center gap-1.5 truncate">
                                                            {friend.name}
                                                            {friend.name === "You" && <span className="text-xs text-primary font-normal shrink-0">(You)</span>}
                                                            {friend.isPrivate && <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-2 sm:gap-4 w-16 sm:w-1/2 pl-2 sm:pl-4 shrink-0">
                                                {friend.isPrivate ? (
                                                    <Badge variant="secondary" className="text-[10px] sm:text-xs gap-1 px-1.5 sm:px-2">
                                                        <Shield className="w-3 h-3" /> <span className="hidden sm:inline">Private</span>
                                                    </Badge>
                                                ) : isNotRanked ? (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Badge variant="outline" className="text-[10px] sm:text-xs gap-1 text-muted-foreground border-muted-foreground/30 px-1.5 sm:px-2">
                                                                <AlertCircle className="w-3 h-3" /> <span className="hidden sm:inline">Not Ranked</span>
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Needs more data this month to be ranked</p>
                                                            <p className="text-xs text-muted-foreground mt-0.5">Min. 20 transactions or 2 receipts</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ) : (
                                                    <span className="font-bold text-sm sm:text-lg tabular-nums">
                                                        {score}<span className="text-xs sm:text-sm font-medium text-muted-foreground">{activeMetricConfig.unit}</span>
                                                    </span>
                                                )}
                                                {isExpanded ? (
                                                    <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded: all metrics breakdown */}
                                        {isExpanded && !friend.isPrivate && !isNotRanked && (
                                            <div className="px-3 sm:px-6 py-3 sm:py-4 bg-muted/5 animate-in slide-in-from-top-2 duration-200">
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                                    {METRICS.filter(m => m.key !== "overall").map(metric => {
                                                        const val = friend[metric.field] as number
                                                        return (
                                                            <div key={metric.key} className="space-y-1.5 sm:space-y-2">
                                                                <div className="flex justify-between text-xs sm:text-sm">
                                                                    <span className="text-muted-foreground flex items-center gap-1">{metric.icon} <span className="hidden sm:inline">{metric.label}</span></span>
                                                                    <span className="font-semibold">{val}{metric.unit}</span>
                                                                </div>
                                                                <Progress value={val} max={100} className="h-1.5" />
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {isExpanded && friend.isPrivate && (
                                            <div className="px-3 sm:px-6 py-4 sm:py-6 bg-muted/5 text-center text-xs sm:text-sm text-muted-foreground animate-in slide-in-from-top-2 duration-200">
                                                <Lock className="w-5 h-5 mx-auto mb-2 opacity-50" />
                                                This friend hasn&apos;t shared their metrics yet.
                                            </div>
                                        )}

                                        {isExpanded && isNotRanked && (
                                            <div className="px-3 sm:px-6 py-4 sm:py-6 bg-muted/5 text-center text-xs sm:text-sm text-muted-foreground animate-in slide-in-from-top-2 duration-200">
                                                <AlertCircle className="w-5 h-5 mx-auto mb-2 opacity-50" />
                                                Not enough activity this month to rank.
                                                <p className="text-[10px] sm:text-xs mt-1">Requires 20+ transactions (≥500 volume) or 2+ receipts (≥50 volume)</p>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Add Friends */}
                        <div className="p-3 sm:p-6 mt-2 bg-muted/5 flex justify-center items-center border-t border-border/30">
                            <Button className="gap-2 w-full sm:w-auto" onClick={() => setAddFriendOpen(true)}>
                                <UserPlus className="w-4 h-4" />
                                Add Friends
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <ProfileModal open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)} user={selectedUser} />
                <AddFriendDialog open={addFriendOpen} onOpenChange={setAddFriendOpen} />

                {/* Friends List Section - At the bottom of Rankings */}
                <Card className="border-border/40 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-3xl overflow-hidden">
                    <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-border/40 gap-2">
                        <h3 className="text-base sm:text-lg font-semibold">Friends ({friendsList.length})</h3>
                        <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => setAddFriendOpen(true)}>
                            <UserPlus className="w-4 h-4" /> <span className="hidden sm:inline">Add</span>
                        </Button>
                    </div>
                    <CardContent className="p-0 divide-y divide-border/30">
                        {friendsList.length === 0 ? (
                            <div className="text-center py-10 sm:py-12 text-muted-foreground px-4">
                                <UserPlus className="w-8 h-8 mx-auto mb-3 opacity-40" />
                                <p className="font-medium">No friends yet</p>
                                <p className="text-sm mt-1">Add friends to split expenses and compare progress.</p>
                                <Button size="sm" className="mt-4 gap-1.5" onClick={() => setAddFriendOpen(true)}>
                                    <UserPlus className="w-4 h-4" /> Add your first friend
                                </Button>
                            </div>
                        ) : friendsList.map(friend => (
                            <div
                                key={friend.friendship_id}
                                className="flex items-center justify-between px-3 sm:px-6 py-3 hover:bg-muted/10 transition-colors gap-2"
                            >
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                    <button
                                        className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                                        onClick={() => setSelectedUser({ id: friend.user_id || friend.friendship_id, name: friend.display_name, avatar: friend.avatar_url, stats: getFriendStats(friend.user_id), isPrivate: !getFriendStats(friend.user_id) })}
                                    >
                                        <Avatar className="w-9 h-9 sm:w-10 sm:h-10 border border-border/50">
                                            <AvatarImage src={friend.avatar_url || undefined} alt={friend.display_name} />
                                            <AvatarFallback className="text-xs sm:text-sm">{(friend.display_name ?? 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </button>
                                    <div className="min-w-0">
                                        <span className="font-semibold text-sm block truncate">{friend.display_name}</span>
                                        <div className={cn(
                                            "text-xs font-medium truncate",
                                            friend.net_balance > 0 ? "text-emerald-500" :
                                                friend.net_balance < 0 ? "text-rose-500" :
                                                    "text-muted-foreground"
                                        )}>
                                            {friend.net_balance > 0 ? `Owes you ${formatCurrency(friend.net_balance)}` :
                                                friend.net_balance < 0 ? `You owe ${formatCurrency(Math.abs(friend.net_balance))}` :
                                                    "Settled up"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Pending Requests Section */}
                {((bundleData?.pendingRequests?.incoming?.length ?? 0) > 0 || (bundleData?.pendingRequests?.outgoing?.length ?? 0) > 0) && (
                    <Card className="border-border/40 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-3xl overflow-hidden">
                        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-border/40">
                            <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                                <span className="hidden sm:inline">Pending Requests</span>
                                <span className="sm:hidden">Requests</span>
                                <Badge variant="secondary" className="ml-1 sm:ml-2 text-[10px] sm:text-xs">
                                    {(bundleData?.pendingRequests?.incoming?.length ?? 0) + (bundleData?.pendingRequests?.outgoing?.length ?? 0)}
                                </Badge>
                            </h3>
                        </div>
                        <CardContent className="p-0 divide-y divide-border/30">
                            {bundleData?.pendingRequests?.incoming?.map(req => (
                                <div key={req.friendship_id} className="flex items-center justify-between px-3 sm:px-6 py-3 gap-2 hover:bg-muted/10 transition-colors">
                                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                        <button
                                            className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                                            onClick={() => setSelectedUser({ id: req.user_id || req.friendship_id, name: req.display_name, avatar: req.avatar_url, stats: getFriendStats(req.user_id) || undefined, isPrivate: true })}
                                        >
                                            <Avatar className="w-8 h-8 sm:w-9 sm:h-9 border border-border/50">
                                                <AvatarImage src={req.avatar_url || undefined} alt={req.display_name} />
                                                <AvatarFallback className="text-[10px] sm:text-xs">{req.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        </button>
                                        <div className="min-w-0">
                                            <span className="font-semibold text-sm block truncate">{req.display_name}</span>
                                            <span className="text-xs text-muted-foreground block">Wants to be friends</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                        <Button size="sm" variant="default" className="h-8 gap-1 px-2 sm:px-3 text-[10px] sm:text-xs" onClick={() => handleAccept(req.friendship_id)} disabled={actionLoading === req.friendship_id}>
                                            <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">{actionLoading === req.friendship_id ? "..." : "Accept"}</span>
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-8 gap-1 text-muted-foreground px-1.5 sm:px-2" onClick={() => handleDecline(req.friendship_id)} disabled={actionLoading === req.friendship_id}>
                                            <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Decline</span>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {bundleData?.pendingRequests?.outgoing?.map(req => (
                                <div key={req.friendship_id} className="flex items-center justify-between px-3 sm:px-6 py-3 opacity-60 hover:bg-muted/10 transition-colors hover:opacity-100">
                                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                        <button
                                            className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                                            onClick={() => setSelectedUser({ id: req.user_id || req.friendship_id, name: req.display_name, avatar: req.avatar_url, stats: getFriendStats(req.user_id) || undefined, isPrivate: true })}
                                        >
                                            <Avatar className="w-8 h-8 sm:w-9 sm:h-9 border border-border/50">
                                                <AvatarImage src={req.avatar_url || undefined} alt={req.display_name} />
                                                <AvatarFallback className="text-[10px] sm:text-xs">{req.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        </button>
                                        <div className="min-w-0">
                                            <span className="font-semibold text-sm block truncate">{req.display_name}</span>
                                            <span className="text-xs text-muted-foreground block">Request sent</span>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">Pending</Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

            </div>
        </TooltipProvider>
    )
}
