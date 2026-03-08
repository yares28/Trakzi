"use client"

import { useState, type ReactNode } from "react"
import { UserPlus, UserCheck, ArrowRightLeft, Clock, Check, X, Wallet, Receipt, Home } from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { demoFetch } from "@/lib/demo/demo-fetch"
import { useFriendsBundleData, useRefreshFriendsBundle } from "@/hooks/use-friends-bundle"
import { useCurrency } from "@/components/currency-provider"
import { AddFriendDialog } from "@/components/friends/add-friend-dialog"
import { ProfileModal } from "@/components/friends/profile-modal"
import type { ProfileModalUser } from "@/components/friends/profile-modal"
import type { FriendWithBalance, FriendRequest, ActivityItem } from "@/lib/types/friends"
import type { FriendScore } from "@/lib/charts/friends-aggregations"

const ACTIVITY_ICONS: Record<ActivityItem["type"], ReactNode> = {
    split_created: <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />,
    split_settled: <Check className="w-4 h-4 text-emerald-500" />,
    room_joined: <Home className="w-4 h-4 text-muted-foreground" />,
    friend_added: <UserCheck className="w-4 h-4 text-muted-foreground" />,
    receipt_uploaded: <Receipt className="w-4 h-4 text-muted-foreground" />,
}

export default function FriendsTab() {
    const { data: bundleData, isLoading } = useFriendsBundleData()
    const queryClient = useQueryClient()
    const [addFriendOpen, setAddFriendOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<ProfileModalUser | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const { formatCurrency } = useCurrency()
    const refreshFriendsBundle = useRefreshFriendsBundle()

    const friendsList = (bundleData?.friendsList ?? []) as FriendWithBalance[]
    const friendScores = (bundleData?.friends ?? []) as FriendScore[]
    const pending = bundleData?.pendingRequests ?? { incoming: [] as FriendRequest[], outgoing: [] as FriendRequest[] }
    const activityFeed = (bundleData?.activityFeed ?? []) as ActivityItem[]
    const netBalance = bundleData?.netBalance ?? { totalOwedToYou: 0, totalYouOwe: 0 }

    /** Look up a friend's ranking metrics by user_id */
    const getFriendStats = (userId: string) => {
        const score = friendScores.find(f => f.friendUserId === userId)
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

    const netTotal = netBalance.totalOwedToYou - netBalance.totalYouOwe

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

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card className="relative group overflow-hidden h-[5.5rem] sm:h-[7rem] py-3 sm:py-4 bg-card/60 backdrop-blur-sm border-border/50 shadow-sm">
                    <CardHeader className="pb-1 sm:pb-2 pt-2 sm:pt-[5px] flex-1 min-h-0">
                        <CardDescription className="text-[10px] sm:text-xs mb-0.5 sm:mb-1 truncate">Net balance</CardDescription>
                        <CardTitle className={cn(
                            "text-lg sm:text-2xl font-semibold tabular-nums md:text-3xl truncate",
                            netTotal > 0 ? "text-emerald-500" : netTotal < 0 ? "text-rose-500" : ""
                        )}>
                            {formatCurrency(netTotal, { showSign: true })}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card className="relative group overflow-hidden h-[5.5rem] sm:h-[7rem] py-3 sm:py-4 bg-card/60 backdrop-blur-sm border-border/50 shadow-sm">
                    <CardHeader className="pb-1 sm:pb-2 pt-2 sm:pt-[5px] flex-1 min-h-0">
                        <CardDescription className="text-[10px] sm:text-xs mb-0.5 sm:mb-1 truncate">Owed to you</CardDescription>
                        <CardTitle className="text-lg sm:text-2xl font-semibold tabular-nums md:text-3xl truncate text-emerald-500">
                            {formatCurrency(netBalance.totalOwedToYou)}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card className="relative group overflow-hidden h-[5.5rem] sm:h-[7rem] py-3 sm:py-4 bg-card/60 backdrop-blur-sm border-border/50 shadow-sm">
                    <CardHeader className="pb-1 sm:pb-2 pt-2 sm:pt-[5px] flex-1 min-h-0">
                        <CardDescription className="text-[10px] sm:text-xs mb-0.5 sm:mb-1 truncate">You owe</CardDescription>
                        <CardTitle className="text-lg sm:text-2xl font-semibold tabular-nums md:text-3xl truncate text-rose-500">
                            {formatCurrency(netBalance.totalYouOwe)}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Pending Requests */}
            {(pending.incoming.length > 0 || pending.outgoing.length > 0) && (
                <Card className="border-border/40 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-3xl overflow-hidden">
                    <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-border/40">
                        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                            <span className="hidden sm:inline">Pending Requests</span>
                            <span className="sm:hidden">Requests</span>
                            <Badge variant="secondary" className="ml-1 sm:ml-2 text-[10px] sm:text-xs">{pending.incoming.length + pending.outgoing.length}</Badge>
                        </h3>
                    </div>
                    <CardContent className="p-0 divide-y divide-border/30">
                        {pending.incoming.map(req => (
                            <div key={req.friendship_id} className="flex items-center justify-between px-3 sm:px-6 py-3 gap-2 hover:bg-muted/10 transition-colors cursor-pointer"
                                onClick={() => setSelectedUser({ id: req.user_id || req.friendship_id, name: req.display_name, avatar: req.avatar_url, stats: getFriendStats(req.user_id) || undefined, isPrivate: true })}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedUser({ id: req.user_id || req.friendship_id, name: req.display_name, avatar: req.avatar_url, stats: getFriendStats(req.user_id) || undefined, isPrivate: true }) } }}
                            >
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                    <Avatar className="w-8 h-8 sm:w-9 sm:h-9 border border-border/50 shrink-0">
                                        <AvatarImage src={req.avatar_url || undefined} alt={req.display_name} />
                                        <AvatarFallback className="text-[10px] sm:text-xs">{req.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
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
                        {pending.outgoing.map(req => (
                            <div key={req.friendship_id} className="flex items-center justify-between px-3 sm:px-6 py-3 opacity-60 hover:bg-muted/10 transition-colors cursor-pointer hover:opacity-100"
                                onClick={() => setSelectedUser({ id: req.user_id || req.friendship_id, name: req.display_name, avatar: req.avatar_url, stats: getFriendStats(req.user_id) || undefined, isPrivate: true })}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedUser({ id: req.user_id || req.friendship_id, name: req.display_name, avatar: req.avatar_url, stats: getFriendStats(req.user_id) || undefined, isPrivate: true }) } }}
                            >
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                    <Avatar className="w-8 h-8 sm:w-9 sm:h-9 border border-border/50 shrink-0">
                                        <AvatarImage src={req.avatar_url || undefined} alt={req.display_name} />
                                        <AvatarFallback className="text-[10px] sm:text-xs">{req.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
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

            {/* Friends List */}
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
                            role="button"
                            tabIndex={0}
                            className="flex items-center justify-between px-3 sm:px-6 py-3 hover:bg-muted/10 transition-colors cursor-pointer gap-2"
                            onClick={() => setSelectedUser({ id: friend.user_id || friend.friendship_id, name: friend.display_name, avatar: friend.avatar_url, stats: getFriendStats(friend.user_id), isPrivate: !getFriendStats(friend.user_id) })}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedUser({ id: friend.user_id || friend.friendship_id, name: friend.display_name, avatar: friend.avatar_url, stats: getFriendStats(friend.user_id), isPrivate: !getFriendStats(friend.user_id) }) } }}
                        >
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                <Avatar className="w-9 h-9 sm:w-10 sm:h-10 border border-border/50 shrink-0">
                                    <AvatarImage src={friend.avatar_url || undefined} alt={friend.display_name} />
                                    <AvatarFallback className="text-xs sm:text-sm">{(friend.display_name ?? 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
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

            {/* Activity Feed */}
            {activityFeed.length > 0 && (
                <Card className="border-border/40 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-3xl overflow-hidden">
                    <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-border/40">
                        <h3 className="text-base sm:text-lg font-semibold">Recent Activity</h3>
                    </div>
                    <CardContent className="p-0 divide-y divide-border/30">
                        {activityFeed.map(item => (
                            <div key={item.id} className="flex items-start gap-2 sm:gap-3 px-3 sm:px-6 py-3">
                                <div className="mt-0.5 shrink-0">
                                    {ACTIVITY_ICONS[item.type] ?? <Wallet className="w-4 h-4 text-muted-foreground" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm">
                                        <span className="font-semibold truncate block">{item.actor_name}</span>{" "}
                                        <span className="text-muted-foreground">{item.description}</span>
                                    </p>
                                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                                        {item.room_name && (
                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5">{item.room_name}</Badge>
                                        )}
                                        {(item.amount ?? 0) > 0 && (
                                            <span className="text-xs font-medium">{formatCurrency(item.amount ?? 0)}</span>
                                        )}
                                        <span className="text-[10px] text-muted-foreground">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <AddFriendDialog open={addFriendOpen} onOpenChange={setAddFriendOpen} />
            <ProfileModal open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)} user={selectedUser} />
        </div>
    )
}
