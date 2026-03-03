import { NextRequest, NextResponse } from "next/server"
import { MOCK_ROOMS } from "@/lib/demo/mock-data"
import type { RoomBundleData } from "@/hooks/use-room-bundle"

const MOCK_ROOM_BUNDLES: Record<string, RoomBundleData> = {
    "room-1": {
        room: {
            id: "room-1",
            name: "Apartment 4B",
            description: "Rent, utilities, and internet",
            invite_code: "APT-4B2",
            currency: "EUR",
            is_archived: false,
            created_at: "2025-09-01T10:00:00Z",
        },
        members: [
            { user_id: "user_alice", display_name: "Alice C.", role: "admin", joined_at: "2025-09-01T10:00:00Z" },
            { user_id: "user_bob", display_name: "Bob S.", role: "member", joined_at: "2025-09-02T14:00:00Z" },
            { user_id: "user_demo", display_name: "You", role: "member", joined_at: "2025-09-01T10:01:00Z" },
        ],
        balances: [
            { user_id: "user_alice", display_name: "Alice C.", net_balance: 85.25, total_paid: 1200, total_owed: 1114.75 },
            { user_id: "user_bob", display_name: "Bob S.", net_balance: 65.25, total_paid: 1100, total_owed: 1034.75 },
            { user_id: "user_demo", display_name: "You", net_balance: -150.50, total_paid: 900, total_owed: 1050.50 },
        ],
        recentTransactions: [
            { id: "tx-1", description: "February rent", total_amount: 1500, currency: "EUR", uploaded_by: "user_alice", uploader_name: "Alice C.", split_type: "equal", created_at: "2026-02-01T10:00:00Z" },
            { id: "tx-2", description: "Electricity bill", total_amount: 85.40, currency: "EUR", uploaded_by: "user_demo", uploader_name: "You", split_type: "equal", created_at: "2026-02-15T18:30:00Z" },
            { id: "tx-3", description: "Internet - March", total_amount: 45.00, currency: "EUR", uploaded_by: "user_bob", uploader_name: "Bob S.", split_type: "equal", created_at: "2026-03-01T09:00:00Z" },
        ],
        stats: { total_transactions: 12, total_volume: 3200, pending_splits: 1 },
    },
    "room-2": {
        room: {
            id: "room-2",
            name: "Weekend Getaway",
            description: "Flights, Airbnb, and drinks",
            invite_code: "WKD-G3T",
            currency: "EUR",
            is_archived: false,
            created_at: "2026-01-15T12:00:00Z",
        },
        members: [
            { user_id: "user_charlie", display_name: "Charlie D.", role: "admin", joined_at: "2026-01-15T12:00:00Z" },
            { user_id: "user_diana", display_name: "Diana P.", role: "member", joined_at: "2026-01-15T12:05:00Z" },
            { user_id: "user_ethan", display_name: "Ethan H.", role: "member", joined_at: "2026-01-15T12:10:00Z" },
            { user_id: "user_demo", display_name: "You", role: "member", joined_at: "2026-01-15T12:01:00Z" },
        ],
        balances: [
            { user_id: "user_charlie", display_name: "Charlie D.", net_balance: -120, total_paid: 400, total_owed: 520 },
            { user_id: "user_diana", display_name: "Diana P.", net_balance: 30, total_paid: 500, total_owed: 470 },
            { user_id: "user_ethan", display_name: "Ethan H.", net_balance: 45, total_paid: 520, total_owed: 475 },
            { user_id: "user_demo", display_name: "You", net_balance: 45, total_paid: 430, total_owed: 385 },
        ],
        recentTransactions: [
            { id: "tx-4", description: "Airbnb booking", total_amount: 800, currency: "EUR", uploaded_by: "user_charlie", uploader_name: "Charlie D.", split_type: "equal", created_at: "2026-02-20T10:00:00Z" },
            { id: "tx-5", description: "Dinner at the beach", total_amount: 120, currency: "EUR", uploaded_by: "user_demo", uploader_name: "You", split_type: "equal", created_at: "2026-02-22T20:00:00Z" },
            { id: "tx-6", description: "Taxi to airport", total_amount: 55, currency: "EUR", uploaded_by: "user_diana", uploader_name: "Diana P.", split_type: "equal", created_at: "2026-02-23T06:00:00Z" },
        ],
        stats: { total_transactions: 8, total_volume: 1850, pending_splits: 0 },
    },
    "room-3": {
        room: {
            id: "room-3",
            name: "Groceries & Co.",
            description: "Weekly supermarket runs",
            invite_code: "GRC-C03",
            currency: "EUR",
            is_archived: false,
            created_at: "2026-01-01T08:00:00Z",
        },
        members: [
            { user_id: "user_fiona", display_name: "Fiona G.", role: "admin", joined_at: "2026-01-01T08:00:00Z" },
            { user_id: "user_demo", display_name: "You", role: "member", joined_at: "2026-01-01T08:01:00Z" },
        ],
        balances: [
            { user_id: "user_fiona", display_name: "Fiona G.", net_balance: 0, total_paid: 210.38, total_owed: 210.38 },
            { user_id: "user_demo", display_name: "You", net_balance: 0, total_paid: 210.37, total_owed: 210.37 },
        ],
        recentTransactions: [
            { id: "tx-7", description: "Lidl weekly shop", total_amount: 62.30, currency: "EUR", uploaded_by: "user_fiona", uploader_name: "Fiona G.", split_type: "equal", created_at: "2026-02-25T11:00:00Z" },
            { id: "tx-8", description: "Aldi run", total_amount: 48.50, currency: "EUR", uploaded_by: "user_demo", uploader_name: "You", split_type: "equal", created_at: "2026-02-28T15:00:00Z" },
        ],
        stats: { total_transactions: 6, total_volume: 420.75, pending_splits: 0 },
    },
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    const { roomId } = await params

    const bundle = MOCK_ROOM_BUNDLES[roomId]
    if (!bundle) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    return NextResponse.json(bundle)
}
