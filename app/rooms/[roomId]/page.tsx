"use client"

import { use } from "react"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { FriendsLayout } from "@/app/friends/components/FriendsLayout"
import { useRoomBundle } from "@/hooks/use-room-bundle"
import { RoomHeader } from "./_page/components/RoomHeader"
import { RoomBalances } from "./_page/components/RoomBalances"
import { RoomTransactions } from "./_page/components/RoomTransactions"
import { RoomMembers } from "./_page/components/RoomMembers"

export default function RoomDetailPage({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = use(params)
    const { data, isLoading, error } = useRoomBundle(roomId)
    const router = useRouter()

    return (
        <FriendsLayout>
            <div className="max-w-5xl mx-auto font-mono font-medium space-y-6 px-3 sm:px-0">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => router.push('/friends')}
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
                        <Button variant="outline" className="mt-4" onClick={() => router.push('/friends')}>
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
                        <RoomBalances balances={data.balances} />
                        <RoomTransactions transactions={data.recentTransactions} />
                        <RoomMembers members={data.members} />
                    </div>
                )}
            </div>
        </FriendsLayout>
    )
}
