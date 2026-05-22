// lib/friends/limits.ts
// Monthly limit enforcement for shared transactions and quick splits.

import { neonQuery } from '@/lib/neonClient'
import { getUserPlan } from '@/lib/subscriptions'
import { PLAN_LIMITS } from '@/lib/plan-limits'

/**
 * Check if the user can create another shared transaction this month.
 * Counts all shared_transactions uploaded by this user in the current calendar month.
 */
export async function checkSharedTxLimit(userId: string): Promise<{
    allowed: boolean
    current: number
    max: number
}> {
    const plan = await getUserPlan(userId)
    const max = PLAN_LIMITS[plan].sharedTxPerMonth

    if (max === Infinity) return { allowed: true, current: 0, max }

    const rows = await neonQuery<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM shared_transactions
         WHERE uploaded_by = $1
           AND created_at >= date_trunc('month', NOW())`,
        [userId]
    )
    const current = parseInt(rows[0]?.count ?? '0', 10)

    return { allowed: current < max, current, max }
}

/**
 * Check if the user can create another quick split this month.
 * Counts friendship-based shared_transactions (no room_id) uploaded by this user.
 */
export async function checkQuickSplitLimit(userId: string): Promise<{
    allowed: boolean
    current: number
    max: number
}> {
    const plan = await getUserPlan(userId)
    const max = PLAN_LIMITS[plan].quickSplitsPerMonth

    if (max === Infinity) return { allowed: true, current: 0, max }

    const rows = await neonQuery<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM shared_transactions
         WHERE uploaded_by = $1
           AND room_id IS NULL
           AND friendship_id IS NOT NULL
           AND created_at >= date_trunc('month', NOW())`,
        [userId]
    )
    const current = parseInt(rows[0]?.count ?? '0', 10)

    return { allowed: current < max, current, max }
}
