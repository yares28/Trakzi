// lib/rooms/permissions.ts
// Permission checks for room operations.

import { neonQuery } from '@/lib/neonClient'
import type { RoomRole } from '@/lib/types/rooms'

type MembershipCheck = {
    isMember: boolean
    role: RoomRole | null
}

/**
 * Check if a user is a member of a room and return their role.
 */
export async function getRoomMembership(
    roomId: string,
    userId: string
): Promise<MembershipCheck> {
    const rows = await neonQuery<{ role: RoomRole }>(
        `SELECT role FROM room_members WHERE room_id = $1 AND user_id = $2`,
        [roomId, userId]
    )
    if (rows.length === 0) {
        return { isMember: false, role: null }
    }
    return { isMember: true, role: rows[0].role }
}

/**
 * Verify user is a room member. Throws-free — returns boolean.
 */
export async function verifyRoomMember(
    roomId: string,
    userId: string
): Promise<boolean> {
    const { isMember } = await getRoomMembership(roomId, userId)
    return isMember
}

/**
 * Verify user is a room admin or owner.
 */
export async function verifyRoomAdmin(
    roomId: string,
    userId: string
): Promise<boolean> {
    const { role } = await getRoomMembership(roomId, userId)
    return role === 'admin' || role === 'owner'
}

/**
 * Verify user is the room owner.
 */
export async function verifyRoomOwner(
    roomId: string,
    userId: string
): Promise<boolean> {
    const { role } = await getRoomMembership(roomId, userId)
    return role === 'owner'
}

/**
 * Get the member count for a room.
 */
export async function getRoomMemberCount(roomId: string): Promise<number> {
    const rows = await neonQuery<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM room_members WHERE room_id = $1`,
        [roomId]
    )
    return parseInt(rows[0]?.count ?? '0', 10)
}
