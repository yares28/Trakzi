"use client"

import { use, useState } from "react"
import { ArrowLeft, Wallet, ArrowRightLeft, Check, Home, UserCheck, Receipt } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FriendsLayout } from "@/app/friends/components/FriendsLayout"
import { useRoomBundle } from "@/hooks/use-room-bundle"
import { RoomHeader } from "./_page/components/RoomHeader"
import { RoomBalances } from "./_page/components/RoomBalances"
import { RoomAttributionList } from "./_page/components/RoomAttributionList"
import { RoomMembers } from "./_page/components/RoomMembers"
import { RoomTransactionEditSheet } from "./_page/components/RoomTransactionEditSheet"
import { AddToRoomDialog } from "@/components/rooms/add-to-room-dialog"
import { SettleUpDialog } from "@/components/rooms/settle-up-dialog"
import { RoomInsights } from "./_page/components/RoomInsights"
import { demoFetch } from "@/lib/demo/demo-fetch"
import { cn } from "@/lib/utils"

type RoomTab = "expenses" | "insight" | "about"

export default function RoomDetailPage({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = use(params)
    const { data, isLoading, error } = useRoomBundle(roomId)
    const router = useRouter()
    const { userId } = useAuth()
    const queryClient = useQueryClient()

    const [tab, setTab] = useState<RoomTab>("expenses")
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [editTxId, setEditTxId] = useState<string | null>(null)
    const [settleDialogOpen, setSettleDialogOpen] = useState(false)

    const editTx = editTxId ? data?.recentTransactions?.find(tx => tx.id === editTxId) ?? null : null

    const currentMember = userId && data ? data.members.find(m => m.user_id === userId) : null
    const currentUserRole = currentMember?.role ?? "member"
    const isOwner = currentUserRole === "owner"

    const handleDeleteRoom = async () => {
        if (!confirm("Are you sure you want to delete this room? This action cannot be undone.")) return
        try {
            const res = await demoFetch(`/api/rooms/${roomId}`, { method: "DELETE" })
            if (!res.ok) {
                const json = await res.json()
                toast.error(json.error ?? "Failed to delete room")
                return
            }
            toast.success("Room deleted")
            router.push("/friends?tab=groups")
        } catch {
            toast.error("Failed to delete room")
        }
    }

    return (
        <FriendsLayout>
            <div className="max-w-5xl mx-auto font-mono font-medium space-y-6 px-3 sm:px-0">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => router.push('/friends?tab=groups')}
                    >
                        <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back to Rooms</span>
                    </Button>
                </div>

                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                )}

                {error && (
                    <div className="text-center py-20 text-muted-foreground">
                        <p>Failed to load room. You may not have access.</p>
                        <Button variant="outline" className="mt-4" onClick={() => router.push('/friends?tab=groups')}>
                            Back to Rooms
                        </Button>
                    </div>
                )}

                {data && (
                    <div className="space-y-6">
                        <RoomHeader
                            name={data.room.name}
                            description={data.room.description}
                            inviteCode={data.room.invite_code}
                            memberCount={data.members.length}
                            roomId={roomId}
                            isAdmin={currentUserRole === "owner" || currentUserRole === "admin"}
                            onDescriptionUpdated={() => queryClient.invalidateQueries({ queryKey: ["room-bundle", roomId] })}
                        />

                        {/* Tab switch */}
                        <div className="flex justify-center">
                            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/50 border w-max min-w-0 h-auto">
                                {([
                                    { id: "expenses", label: "Expenses" },
                                    { id: "insight", label: "Insight" },
                                    { id: "about", label: "About" },
                                ] as { id: RoomTab; label: string }[]).map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setTab(t.id)}
                                        className={cn(
                                            "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                                            tab === t.id
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Expenses tab: Balances + full transaction list */}
                        {tab === "expenses" && (
                            <div className="space-y-6">
                                {/* Settle Up banner — only shown when the user has pending splits */}
                                {(data.myPendingSplits?.length ?? 0) > 0 && (
                                    <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                                        <div className="flex items-center gap-2">
                                            <Wallet className="w-4 h-4 text-amber-500 shrink-0" />
                                            <p className="text-sm font-medium">
                                                {data.myPendingSplits!.length} pending settlement{data.myPendingSplits!.length !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="h-8 gap-1.5 text-xs"
                                            onClick={() => setSettleDialogOpen(true)}
                                        >
                                            <Wallet className="w-3.5 h-3.5" />
                                            Settle Up
                                        </Button>
                                    </div>
                                )}
                                <RoomBalances
                                    balances={data.balances.map(b => ({
                                        ...b,
                                        avatar_url: data.members.find(m => m.user_id === b.user_id)?.avatar_url ?? null,
                                    }))}
                                    unattributedTotal={data.unattributedTotal}
                                    unattributedCount={data.unattributedCount}
                                    sourceBreakdown={data.sourceBreakdown}
                                    onAttributeClick={() => setAddDialogOpen(true)}
                                />
                                <RoomAttributionList
                                    transactions={data.recentTransactions}
                                    onEditSplits={(txId) => setEditTxId(txId)}
                                    onAddTransactions={() => setAddDialogOpen(true)}
                                />
                            </div>
                        )}

                        {/* Insight tab: Room analytics */}
                        {tab === "insight" && (
                            <RoomInsights
                                transactions={data.recentTransactions as any}
                                members={data.members}
                                balances={data.balances as any}
                                sourceBreakdown={data.sourceBreakdown ?? { personal_import: { total: 0, count: 0 }, receipt: { total: 0, count: 0 }, statement: { total: 0, count: 0 }, manual: { total: 0, count: 0 } }}
                                totalSpent={data.totalSpent ?? data.stats?.total_volume ?? 0}
                                unattributedTotal={data.unattributedTotal ?? 0}
                                unattributedCount={data.unattributedCount ?? 0}
                                transactionCount={data.transactionCount ?? data.stats?.total_transactions ?? 0}
                                currentUserId={userId ?? undefined}
                            />
                        )}

                        {/* About tab: Members + Activity Feed + Danger Zone */}
                        {tab === "about" && (
                            <div className="space-y-6">
                                <RoomMembers
                                    members={data.members}
                                    balances={data.balances}
                                    currentUserId={userId ?? undefined}
                                    currentUserRole={currentUserRole}
                                    roomId={roomId}
                                    onMemberUpdated={() => queryClient.invalidateQueries({ queryKey: ["room-bundle", roomId] })}
                                />
                                
                                {/* Activity Feed Section for this room */}
                                {data.activityFeed && data.activityFeed.length > 0 && (
                                    <Card className="border-border/40 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-3xl overflow-hidden">
                                        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-border/40">
                                            <h3 className="text-base sm:text-lg font-semibold">Recent Activity</h3>
                                        </div>
                                        <CardContent className="p-0 divide-y divide-border/30">
                                            {data.activityFeed.map(item => (
                                                <div key={item.id} className="flex items-start gap-2 sm:gap-3 px-3 sm:px-6 py-3">
                                                    <div className="mt-0.5 shrink-0">
                                                        {item.type === 'split_created' && <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />}
                                                        {item.type === 'split_settled' && <Check className="w-4 h-4 text-emerald-500" />}
                                                        {item.type === 'room_joined' && <Home className="w-4 h-4 text-muted-foreground" />}
                                                        {item.type === 'friend_added' && <UserCheck className="w-4 h-4 text-muted-foreground" />}
                                                        {item.type === 'receipt_uploaded' && <Receipt className="w-4 h-4 text-muted-foreground" />}
                                                        {!item.type && <Wallet className="w-4 h-4 text-muted-foreground" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm">
                                                            <span className="font-semibold truncate block">{item.actor_name}</span>{" "}
                                                            <span className="text-muted-foreground">{item.description}</span>
                                                        </p>
                                                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                                                            {(item.amount ?? 0) > 0 && (
                                                                <span className="text-xs font-medium">
                                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'USD' }).format(item.amount ?? 0)}
                                                                </span>
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

                                {isOwner && (
                                    <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 px-6 py-5 space-y-3">
                                        <div>
                                            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Danger Zone</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Permanently delete this room and all its transactions. This cannot be undone.
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 border-rose-500/40 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/60"
                                            onClick={handleDeleteRoom}
                                        >
                                            Delete Room
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Settle Up Dialog */}
                        {(data.myPendingSplits?.length ?? 0) > 0 && (
                            <SettleUpDialog
                                open={settleDialogOpen}
                                onOpenChange={setSettleDialogOpen}
                                splits={data.myPendingSplits!}
                                roomId={roomId}
                            />
                        )}

                        {/* Add to Room Dialog */}
                        {userId && (
                            <AddToRoomDialog
                                open={addDialogOpen}
                                onOpenChange={setAddDialogOpen}
                                roomId={roomId}
                                members={data.members.map(m => ({
                                    user_id: m.user_id,
                                    display_name: m.display_name,
                                    avatar_url: m.avatar_url,
                                }))}
                                currentUserId={userId}
                            />
                        )}

                        {/* Edit Attribution Sheet */}
                        {userId && (
                            <RoomTransactionEditSheet
                                open={editTxId !== null}
                                onOpenChange={(v) => { if (!v) setEditTxId(null) }}
                                transaction={editTx as any}
                                members={data.members.map(m => ({
                                    user_id: m.user_id,
                                    display_name: m.display_name,
                                    avatar_url: m.avatar_url,
                                }))}
                                currentUserId={userId}
                                roomId={roomId}
                            />
                        )}
                    </div>
                )}
            </div>
        </FriendsLayout>
    )
}
