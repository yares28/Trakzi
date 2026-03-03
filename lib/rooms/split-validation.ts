// lib/rooms/split-validation.ts
// Validates split amounts against the transaction total.

import type { SplitType } from '@/lib/types/rooms'

export type SplitInput = {
    user_id: string
    amount?: number
    percentage?: number
    item_ids?: string[]
}

/**
 * Validate and compute split amounts based on split type.
 * Returns the resolved amounts per user, or throws on validation error.
 */
export function validateSplits(
    splitType: SplitType,
    totalAmount: number,
    memberUserIds: string[],
    splits: SplitInput[]
): { user_id: string; amount: number }[] {
    if (splits.length === 0) {
        throw new Error('At least one split is required')
    }

    // Verify all split users are valid members
    const memberSet = new Set(memberUserIds)
    for (const split of splits) {
        if (!memberSet.has(split.user_id)) {
            throw new Error(`User ${split.user_id} is not a member`)
        }
    }

    // Check for duplicate users
    const userIds = splits.map(s => s.user_id)
    if (new Set(userIds).size !== userIds.length) {
        throw new Error('Duplicate user in splits')
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
            // Item-level splits are handled separately via receipt_items
            // For now, just pass through the custom amounts
            return splits.map(split => ({
                user_id: split.user_id,
                amount: Math.round((split.amount ?? 0) * 100) / 100,
            }))
        }

        default:
            throw new Error(`Unknown split type: ${splitType}`)
    }
}
