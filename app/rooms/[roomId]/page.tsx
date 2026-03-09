"use client"

import { use, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"
import { FriendsLayout } from "@/app/friends/components/FriendsLayout"
import { useRoomBundle } from "@/hooks/use-room-bundle"
import { RoomHeader } from "./_page/components/RoomHeader"
import { RoomBalances } from "./_page/components/RoomBalances"
import { RoomAttributionList } from "./_page/components/RoomAttributionList"
import { RoomMembers } from "./_page/components/RoomMembers"
import { RoomTransactionEditSheet } from "./_page/components/RoomTransactionEditSheet"
import { AddToRoomDialog } from "@/components/rooms/add-to-room-dialog"

export default function RoomDetailPage({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = use(params)
    const { data, isLoading, error } = useRoomBundle(roomId)
    const router = useRouter()
    const { userId } = useAuth()

    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [editTxId, setEditTxId] = useState<string | null>(null)

    const editTx = editTxId ? data?.recentTransactions?.find(tx => tx.id === editTxId) ?? null : null

    return (
        <FriendsLayout>
            <div className="max-w-5xl mx-auto font-mono font-medium space-y-6 px-3 sm:px-0">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => router.push('/friends?tab=groups')}
                >
                    <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back to Groups</span>
                </Button>

                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                )}

                {error && (
                    <div className="text-center py-20 text-muted-foreground">
                        <p>Failed to load room. You may not have access.</p>
                        <Button variant="outline" className="mt-4" onClick={() => router.push('/friends?tab=groups')}>
                            Go Back
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
                        />
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
                        <RoomMembers members={data.members} />

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
