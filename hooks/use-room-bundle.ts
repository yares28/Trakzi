import { useAuth } from "@clerk/nextjs"
import { useQuery } from "@tanstack/react-query"
import { demoFetch } from "@/lib/demo/demo-fetch"
import { useDemoMode } from "@/lib/demo/demo-context"

export interface RoomBundleData {
    room: {
        id: string
        name: string
        description: string | null
        invite_code: string
        currency: string
        is_archived: boolean
        created_at: string
    }
    members: {
        user_id: string
        display_name: string
        role: string
        joined_at: string
        avatar_url: string | null
    }[]
    balances: {
        user_id: string
        display_name: string
        net_balance: number
        total_paid: number
        total_owed: number
    }[]
    recentTransactions: {
        id: string
        description: string
        total_amount: number
        currency: string
        uploaded_by: string
        uploader_name: string
        split_type: string
        created_at: string
        transaction_date: string
        metadata?: Record<string, unknown>
        splits?: { user_id: string; amount: number; display_name: string; item_id?: string | null }[]
        items?: { id: string; name: string; amount: number; quantity: number; category: string | null }[]
        is_attributed?: boolean
        source_type?: string
    }[]
    activityFeed: {
        id: string
        type: string
        actor_name: string
        description: string
        amount: number | null
        currency: string | null
        room_name: string | null
        created_at: string
    }[]
    stats?: {
        total_transactions: number
        total_volume: number
        pending_splits: number
    }
    totalSpent?: number
    transactionCount?: number
    unattributedTotal?: number
    unattributedCount?: number
    myPendingSplits?: {
        id: string
        description: string
        amount: number
        currency: string
        from_name: string
        uploaded_by: string
        is_payer: boolean
    }[]
    sourceBreakdown?: {
        personal_import: { total: number; count: number }
        receipt: { total: number; count: number }
        statement: { total: number; count: number }
        manual: { total: number; count: number }
    }
}

async function fetchRoomBundle(roomId: string): Promise<RoomBundleData> {
    const res = await demoFetch(`/api/rooms/${roomId}/bundle`)
    if (!res.ok) throw new Error(`Failed to fetch room bundle: ${res.statusText}`)
    return res.json()
}

export function useRoomBundle(roomId: string) {
    const { userId } = useAuth()
    const { isDemoMode } = useDemoMode()

    return useQuery({
        queryKey: ["room-bundle", roomId, isDemoMode ? "demo" : (userId ?? "")],
        queryFn: () => fetchRoomBundle(roomId),
        enabled: (isDemoMode || !!userId) && !!roomId,
    })
}
