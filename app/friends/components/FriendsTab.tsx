"use client"

import { useState, type ReactNode } from "react"
import { UserPlus, UserCheck, ArrowRightLeft, Clock, Check, X, Wallet, Receipt, Home } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { demoFetch } from "@/lib/demo/demo-fetch"
import { useFriendsBundleData } from "@/hooks/use-friends-bundle"
import { useCurrency } from "@/components/currency-provider"
import { AddFriendDialog } from "@/components/friends/add-friend-dialog"
import { QuickSplitDialog } from "@/components/friends/quick-split-dialog"
import type { FriendWithBalance, FriendRequest, ActivityItem } from "@/lib/types/friends"

const ACTIVITY_ICONS: Record<ActivityItem["type"], ReactNode> = {
    split_created: <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />,
    split_settled: <Check className="w-4 h-4 text-emerald-500" />,
    room_joined: <Home className="w-4 h-4 text-muted-foreground" />,
    friend_added: <UserCheck className="w-4 h-4 text-muted-foreground" />,
    receipt_uploaded: <Receipt className="w-4 h-4 text-muted-foreground" />,
}

export default function FriendsTab() {
    const { data: bundleData, isLoading, refetch } = useFriendsBundleData()
    const [addFriendOpen, setAddFriendOpen] = useState(false)
    const [splitFriend, setSplitFriend] = useState<FriendWithBalance | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const router = useRouter()
    const { formatCurrency } = useCurrency()

    const friendsList = (bundleData?.friendsList ?? []) as FriendWithBalance[]
    const pending = bundleData?.pendingRequests ?? { incoming: [] as FriendRequest[], outgoing: [] as FriendRequest[] }
    const activityFeed = (bundleData?.activityFeed ?? []) as ActivityItem[]
    const netBalance = bundleData?.netBalance ?? { totalOwedToYou: 0, totalYouOwe: 0 }

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
            refetch()
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
            refetch()
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
        <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="relative group overflow-hidden h-[7rem] py-4 bg-card/60 backdrop-blur-sm border-border/50 shadow-sm">
                    <CardHeader className="pb-2 pt-[5px] flex-1 min-h-0">
                        <CardDescription className="text-xs mb-1 truncate">Net balance</CardDescription>
                        <CardTitle className={cn(
                            "text-2xl font-semibold tabular-nums md:text-3xl truncate",
                            netTotal > 0 ? "text-emerald-500" : netTotal < 0 ? "text-rose-500" : ""
                        )}>
                            {formatCurrency(netTotal, { showSign: true })}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card className="relative group overflow-hidden h-[7rem] py-4 bg-card/60 backdrop-blur-sm border-border/50 shadow-sm">
                    <CardHeader className="pb-2 pt-[5px] flex-1 min-h-0">
                        <CardDescription className="text-xs mb-1 truncate">Owed to you</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums md:text-3xl truncate text-emerald-500">
                            {formatCurrency(netBalance.totalOwedToYou)}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card className="relative group overflow-hidden h-[7rem] py-4 bg-card/60 backdrop-blur-sm border-border/50 shadow-sm">
                    <CardHeader className="pb-2 pt-[5px] flex-1 min-h-0">
                        <CardDescription className="text-xs mb-1 truncate">You owe</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums md:text-3xl truncate text-rose-500">
                            {formatCurrency(netBalance.totalYouOwe)}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Pending Requests */}
            {(pending.incoming.length > 0 || pending.outgoing.length > 0) && (
                <Card className="border-border/40 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-3xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-border/40">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Clock className="w-5 h-5 text-muted-foreground" />
                            Pending Requests
                            <Badge variant="secondary" className="ml-2">{pending.incoming.length + pending.outgoing.length}</Badge>
                        </h3>
                    </div>
                    <CardContent className="p-0 divide-y divide-border/30">
                        {pending.incoming.map(req => (
                            <div key={req.friendship_id} className="flex items-center justify-between px-6 py-3">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-9 h-9 border border-border/50">
                                        <AvatarFallback className="text-xs">{req.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <span className="font-semibold text-sm">{req.display_name}</span>
                                        <span className="text-xs text-muted-foreground block">Wants to be friends</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="default" className="h-8 gap-1" onClick={() => handleAccept(req.friendship_id)} disabled={actionLoading === req.friendship_id}>
                                        <Check className="w-3.5 h-3.5" /> {actionLoading === req.friendship_id ? "..." : "Accept"}
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 gap-1 text-muted-foreground" onClick={() => handleDecline(req.friendship_id)} disabled={actionLoading === req.friendship_id}>
                                        <X className="w-3.5 h-3.5" /> Decline
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {pending.outgoing.map(req => (
                            <div key={req.friendship_id} className="flex items-center justify-between px-6 py-3 opacity-60">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-9 h-9 border border-border/50">
                                        <AvatarFallback className="text-xs">{req.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <span className="font-semibold text-sm">{req.display_name}</span>
                                        <span className="text-xs text-muted-foreground block">Request sent</span>
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-xs">Pending</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Friends List */}
            <Card className="border-border/40 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-3xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
                    <h3 className="text-lg font-semibold">Friends ({friendsList.length})</h3>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAddFriendOpen(true)}>
                        <UserPlus className="w-4 h-4" /> Add
                    </Button>
                </div>
                <CardContent className="p-0 divide-y divide-border/30">
                    {friendsList.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
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
                            className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/10 transition-colors cursor-pointer"
                            onClick={() => router.push(`/friends/${friend.friendship_id}`)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/friends/${friend.friendship_id}`) } }}
                        >
                            <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10 border border-border/50">
                                    <AvatarFallback>{(friend.display_name ?? 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <span className="font-semibold text-sm">{friend.display_name}</span>
                                    <div className={cn(
                                        "text-xs font-medium",
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
                            <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1.5 text-xs"
                                onClick={(e) => { e.stopPropagation(); setSplitFriend(friend) }}
                            >
                                <ArrowRightLeft className="w-3.5 h-3.5" /> Split
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Activity Feed */}
            {activityFeed.length > 0 && (
                <Card className="border-border/40 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-3xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-border/40">
                        <h3 className="text-lg font-semibold">Recent Activity</h3>
                    </div>
                    <CardContent className="p-0 divide-y divide-border/30">
                        {activityFeed.map(item => (
                            <div key={item.id} className="flex items-start gap-3 px-6 py-3.5">
                                <div className="mt-0.5">
                                    {ACTIVITY_ICONS[item.type] ?? <Wallet className="w-4 h-4 text-muted-foreground" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm">
                                        <span className="font-semibold">{item.actor_name}</span>{" "}
                                        {item.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {item.room_name && (
                                            <Badge variant="outline" className="text-[10px] h-5">{item.room_name}</Badge>
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
            <QuickSplitDialog
                friend={splitFriend}
                open={!!splitFriend}
                onOpenChange={(open) => { if (!open) setSplitFriend(null) }}
            />
        </div>
    )
}
