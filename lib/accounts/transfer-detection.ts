// lib/accounts/transfer-detection.ts
// Detects likely transfers between bank accounts and records them in account_transfers.

import { neonQuery, neonInsert } from '@/lib/neonClient'

/**
 * A candidate transaction row for transfer matching.
 */
interface TxCandidate {
    id: number
    userId: string
    txDate: string       // ISO 'YYYY-MM-DD'
    amount: number       // negative = outflow, positive = inflow
    accountId: string | null
    description: string
}

/**
 * A detected transfer pair.
 */
export interface TransferPair {
    fromTxId: number  // outflow (negative amount)
    toTxId: number    // inflow (positive amount)
    amount: number    // absolute value
}

/**
 * Find transfer candidates for a set of newly imported transactions.
 * Looks at all unmatched transactions for the user within the date window
 * and returns pairs that look like internal transfers.
 *
 * @param userId - The user to scan
 * @param newTxIds - IDs of the newly imported transactions (to focus matching)
 * @param windowDays - Max calendar days between the two legs (default 5)
 */
export async function detectTransfers(
    userId: string,
    newTxIds: number[],
    windowDays = 5
): Promise<TransferPair[]> {
    if (newTxIds.length === 0) return []

    // Fetch the new transactions
    const placeholders = newTxIds.map((_, i) => `$${i + 2}`).join(', ')
    const newTxs = await neonQuery<TxCandidate>(
        `SELECT t.id, t.user_id AS "userId", t.tx_date AS "txDate",
                t.amount, t.account_id AS "accountId", t.description
         FROM transactions t
         WHERE t.user_id = $1
           AND t.id IN (${placeholders})
           AND t.tx_type NOT IN ('pending_transfer', 'transfer')
           AND t.account_id IS NOT NULL
         ORDER BY t.tx_date`,
        [userId, ...newTxIds]
    )

    if (newTxs.length === 0) return []

    // Determine date range to query existing candidates (newTx ± windowDays)
    const dates = newTxs.map(t => t.txDate).sort()
    const earliest = offsetDate(dates[0], -windowDays)
    const latest = offsetDate(dates[dates.length - 1], windowDays)

    // Fetch existing unmatched transactions in that window (excluding the new ones)
    const existingTxs = await neonQuery<TxCandidate>(
        `SELECT t.id, t.user_id AS "userId", t.tx_date AS "txDate",
                t.amount, t.account_id AS "accountId", t.description
         FROM transactions t
         WHERE t.user_id = $1
           AND t.tx_date BETWEEN $2 AND $3
           AND t.tx_type NOT IN ('pending_transfer', 'transfer')
           AND t.account_id IS NOT NULL
           AND t.id NOT IN (${placeholders})
           AND NOT EXISTS (
               SELECT 1 FROM account_transfers at2
               WHERE at2.user_id = $1
                 AND (at2.from_tx_id = t.id OR at2.to_tx_id = t.id)
           )
         ORDER BY t.tx_date`,
        [userId, earliest, latest, ...newTxIds]
    )

    // Also exclude already-matched new txs (in case two new txs pair with each other)
    const alreadyMatchedIds = new Set<number>()
    const pairs: TransferPair[] = []

    // Combine for intra-batch matching (new ↔ new)
    const intraBatchPairs = matchPairs(newTxs, newTxs, windowDays, alreadyMatchedIds, true)
    for (const p of intraBatchPairs) {
        alreadyMatchedIds.add(p.fromTxId)
        alreadyMatchedIds.add(p.toTxId)
        pairs.push(p)
    }

    // Cross-batch matching (new ↔ existing)
    const crossPairs = matchPairs(newTxs, existingTxs, windowDays, alreadyMatchedIds, false)
    for (const p of crossPairs) {
        alreadyMatchedIds.add(p.fromTxId)
        alreadyMatchedIds.add(p.toTxId)
        pairs.push(p)
    }

    return pairs
}

/**
 * Persist detected transfer pairs to account_transfers as 'pending' status,
 * and mark the transactions as 'pending_transfer' tx_type.
 */
export async function persistTransferPairs(
    userId: string,
    pairs: TransferPair[]
): Promise<void> {
    if (pairs.length === 0) return

    // Insert into account_transfers
    const transferRows = pairs.map(p => ({
        user_id: userId,
        from_tx_id: p.fromTxId,
        to_tx_id: p.toTxId,
        amount: p.amount,
        status: 'pending',
    }))
    await neonInsert('account_transfers', transferRows, { returnRepresentation: false })

    // Mark transactions as pending_transfer (quarantine from analytics)
    const allIds = pairs.flatMap(p => [p.fromTxId, p.toTxId])
    const idPlaceholders = allIds.map((_, i) => `$${i + 2}`).join(', ')
    await neonQuery(
        `UPDATE transactions
         SET tx_type = 'pending_transfer', updated_at = NOW()
         WHERE user_id = $1 AND id IN (${idPlaceholders})`,
        [userId, ...allIds]
    )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Match outflows from `candidates` against inflows from `pool`.
 * When selfMatch=true, a tx can only match another tx with a different id.
 */
function matchPairs(
    candidates: TxCandidate[],
    pool: TxCandidate[],
    windowDays: number,
    alreadyMatched: Set<number>,
    selfMatch: boolean
): TransferPair[] {
    const pairs: TransferPair[] = []
    const usedPool = new Set<number>()

    // Only match outflows (negative) from candidates against inflows (positive) from pool
    const outflows = candidates.filter(t => t.amount < 0 && !alreadyMatched.has(t.id))
    const inflows = pool.filter(t => t.amount > 0 && !alreadyMatched.has(t.id))

    for (const out of outflows) {
        if (alreadyMatched.has(out.id)) continue
        const absAmount = Math.abs(out.amount)

        for (const inf of inflows) {
            if (usedPool.has(inf.id)) continue
            if (alreadyMatched.has(inf.id)) continue
            // Skip same transaction when doing intra-batch
            if (selfMatch && out.id === inf.id) continue
            // Must be different accounts
            if (out.accountId && inf.accountId && out.accountId === inf.accountId) continue
            // Amount must match (within 0.01 tolerance)
            if (Math.abs(Math.abs(inf.amount) - absAmount) > 0.01) continue
            // Date must be within window
            if (daysBetween(out.txDate, inf.txDate) > windowDays) continue

            pairs.push({ fromTxId: out.id, toTxId: inf.id, amount: absAmount })
            usedPool.add(inf.id)
            alreadyMatched.add(out.id)
            alreadyMatched.add(inf.id)
            break
        }
    }

    return pairs
}

function offsetDate(iso: string, days: number): string {
    const d = new Date(iso + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
    const msPerDay = 86_400_000
    return Math.abs(new Date(a + 'T00:00:00Z').getTime() - new Date(b + 'T00:00:00Z').getTime()) / msPerDay
}
