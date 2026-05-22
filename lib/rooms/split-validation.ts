// lib/rooms/split-validation.ts
// Validates split amounts against the transaction total.

import type { SplitType } from '@/lib/types/rooms'

export type SplitInput = {
    user_id: string
    amount?: number
    percentage?: number
    item_id?: string
}

export type ResolvedSplit = {
    user_id: string
    amount: number
    item_id?: string
}

/**
 * Validate and compute split amounts based on split type.
 * Returns the resolved amounts per user, or throws on validation error.
 *
 * For item_level splits, duplicate user_ids are allowed (one entry per item).
 */
export function validateSplits(
    splitType: SplitType,
    totalAmount: number,
    memberUserIds: string[],
    splits: SplitInput[]
): ResolvedSplit[] {
    if (splits.length === 0) {
        return [] // Unattributed — no splits assigned yet
    }

    // Verify all split users are valid members
    const memberSet = new Set(memberUserIds)
    for (const split of splits) {
        if (!memberSet.has(split.user_id)) {
            throw new Error(`User ${split.user_id} is not a member`)
        }
    }

    // Duplicate user check only applies to non-item_level splits
    // (item_level allows the same user to appear multiple times, once per item)
    if (splitType !== 'item_level') {
        const userIds = splits.map(s => s.user_id)
        if (new Set(userIds).size !== userIds.length) {
            throw new Error('Duplicate user in splits')
        }
    }

    switch (splitType) {
        case 'equal': {
            const perPerson = Math.round((totalAmount / splits.length) * 100) / 100
            const remainder = Math.round((totalAmount - perPerson * splits.length) * 100) / 100

            return splits.map((split, i) => ({
                user_id: split.user_id,
                // First person absorbs any rounding remainder
                amount: i === 0 ? perPerson + remainder : perPerson,
            }))
        }

        case 'percentage': {
            const totalPct = splits.reduce((sum, s) => sum + (s.percentage ?? 0), 0)
            if (Math.abs(totalPct - 100) > 0.01) {
                throw new Error(`Percentages must sum to 100% (got ${totalPct}%)`)
            }

            return splits.map(split => ({
                user_id: split.user_id,
                amount: Math.round(((split.percentage ?? 0) / 100 * totalAmount) * 100) / 100,
            }))
        }

        case 'custom': {
            const totalSplit = splits.reduce((sum, s) => sum + (s.amount ?? 0), 0)
            // Allow ±$0.01 tolerance for rounding
            if (Math.abs(totalSplit - totalAmount) > 0.01) {
                throw new Error(
                    `Split amounts must sum to ${totalAmount} (got ${totalSplit})`
                )
            }

            return splits.map(split => ({
                user_id: split.user_id,
                amount: Math.round((split.amount ?? 0) * 100) / 100,
            }))
        }

        case 'item_level': {
            // Each entry represents one item assigned to a user.
            // Pass item_id through so callers can link splits to receipt_items.
            return splits.map(split => ({
                user_id: split.user_id,
                amount: Math.round((split.amount ?? 0) * 100) / 100,
                item_id: split.item_id,
            }))
        }

        default:
            throw new Error(`Unknown split type: ${splitType}`)
    }
}
