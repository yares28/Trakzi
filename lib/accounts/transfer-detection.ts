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
    accountCurrency: string | null
    description: string
}

/**
 * A detected transfer pair.
 *
 * status:
 *   'pending'   = single high-confidence candidate; tx_type is flipped to
 *                 'pending_transfer' so analytics excludes the legs immediately.
 *   'suggested' = 2+ plausible counterparts; tx_type stays as expense/income so
 *                 totals are not silently depressed while the user picks.
 */
export interface TransferPair {
    fromTxId: number  // outflow (negative amount)
    toTxId: number    // inflow (positive amount)
    amount: number    // absolute value
    status: 'pending' | 'suggested'
    needsReview?: boolean  // true for cross-currency pairs that require user confirmation
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

    // Fetch the new transactions.
    // Excludes settlements (room repayments) and any tx already shared with a room —
    // pairing those as transfers would silently break analytics + roommate balances.
    const placeholders = newTxIds.map((_, i) => `$${i + 2}`).join(', ')
    // Second query has 3 fixed params before newTxIds ($1=userId, $2=earliest, $3=latest)
    const existingPlaceholders = newTxIds.map((_, i) => `$${i + 4}`).join(', ')
    const newTxsRaw = await neonQuery<TxCandidate>(
        `SELECT t.id, t.user_id AS "userId", t.tx_date AS "txDate",
                t.amount, t.account_id AS "accountId",
                a.currency AS "accountCurrency", t.description
         FROM transactions t
         JOIN bank_accounts a ON a.id = t.account_id
         WHERE t.user_id = $1
           AND t.id IN (${placeholders})
           AND (t.tx_type IS NULL OR t.tx_type NOT IN (
               'pending_transfer', 'transfer',
               'settlement_sent', 'settlement_received'
           ))
           AND t.account_id IS NOT NULL
           AND NOT EXISTS (
               SELECT 1 FROM shared_transactions st
               WHERE st.original_tx_id = t.id
           )
         ORDER BY t.tx_date`,
        [userId, ...newTxIds]
    )
    const newTxs = newTxsRaw.map(t => ({
        ...t,
        txDate: (t.txDate as unknown) instanceof Date
            ? (t.txDate as unknown as Date).toISOString().slice(0, 10)
            : String(t.txDate).slice(0, 10),
    }))

    if (newTxs.length === 0) return []

    // Determine date range to query existing candidates (newTx ± windowDays)
    const dates = newTxs.map(t => t.txDate).sort()
    const earliest = offsetDate(dates[0], -windowDays)
    const latest = offsetDate(dates[dates.length - 1], windowDays)

    // Fetch existing unmatched transactions in that window (excluding the new ones)
    const existingTxsRaw = await neonQuery<TxCandidate>(
        `SELECT t.id, t.user_id AS "userId", t.tx_date AS "txDate",
                t.amount, t.account_id AS "accountId",
                a.currency AS "accountCurrency", t.description
         FROM transactions t
         JOIN bank_accounts a ON a.id = t.account_id
         WHERE t.user_id = $1
           AND t.tx_date BETWEEN $2 AND $3
           AND (t.tx_type IS NULL OR t.tx_type NOT IN (
               'pending_transfer', 'transfer',
               'settlement_sent', 'settlement_received'
           ))
           AND t.account_id IS NOT NULL
           AND t.id NOT IN (${existingPlaceholders})
           AND NOT EXISTS (
               SELECT 1 FROM account_transfers at2
               WHERE at2.user_id = $1
                 AND (at2.from_tx_id = t.id OR at2.to_tx_id = t.id)
           )
           AND NOT EXISTS (
               SELECT 1 FROM shared_transactions st
               WHERE st.original_tx_id = t.id
           )
         ORDER BY t.tx_date`,
        [userId, earliest, latest, ...newTxIds]
    )
    const existingTxs = existingTxsRaw.map(t => ({
        ...t,
        txDate: (t.txDate as unknown) instanceof Date
            ? (t.txDate as unknown as Date).toISOString().slice(0, 10)
            : String(t.txDate).slice(0, 10),
    }))

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
 * Persist detected transfer pairs to account_transfers.
 *
 * 'pending' rows quarantine both legs from analytics (tx_type → pending_transfer).
 * 'suggested' rows are surfaced for review without touching tx_type — the user
 * confirms before we hide the spend.
 */
export async function persistTransferPairs(
    userId: string,
    pairs: TransferPair[]
): Promise<void> {
    if (pairs.length === 0) return

    const transferRows = pairs.map(p => ({
        user_id: userId,
        from_tx_id: p.fromTxId,
        to_tx_id: p.toTxId,
        amount: p.amount,
        status: p.status,
    }))
    await neonInsert('account_transfers', transferRows, { returnRepresentation: false })

    const pendingIds = pairs
        .filter(p => p.status === 'pending')
        .flatMap(p => [p.fromTxId, p.toTxId])

    if (pendingIds.length > 0) {
        const idPlaceholders = pendingIds.map((_, i) => `$${i + 2}`).join(', ')
        await neonQuery(
            `UPDATE transactions
             SET tx_type = 'pending_transfer', updated_at = NOW()
             WHERE user_id = $1 AND id IN (${idPlaceholders})`,
            [userId, ...pendingIds]
        )
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Smaller-than-this amounts require an exact-day match — coincidental same-amount
 * transactions across two accounts in the same week are common at the small end.
 */
const EXACT_DAY_THRESHOLD = 100

/**
 * Description-similarity floor (0..1, normalized Levenshtein).
 * Falls back to a transfer-keyword check when descriptions differ stylistically
 * (e.g. "TFR TO 1234" ↔ "FROM ACCT 5678").
 */
const DESCRIPTION_SIMILARITY_FLOOR = 0.5

const TRANSFER_KEYWORDS = /\b(transfer|tfer|tfr|t\/f|to\s+acct|from\s+acct|wire|withdrawal\s+to|deposit\s+from|inter[- ]?account)\b/i

/**
 * Match outflows from `candidates` against inflows from `pool`.
 *
 * For each outflow, collect every inflow that passes amount/date/currency/account
 * and the description-similarity floor. Then:
 *   - exactly 1 candidate → 'pending' (auto-quarantine)
 *   - 2+ candidates       → 'suggested' (best by similarity, no quarantine)
 *
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

    const outflows = candidates.filter(t => t.amount < 0 && !alreadyMatched.has(t.id))
    const inflows = pool.filter(t => t.amount > 0 && !alreadyMatched.has(t.id))

    for (const out of outflows) {
        if (alreadyMatched.has(out.id)) continue
        const absAmount = Math.abs(out.amount)
        const requireExactDay = absAmount < EXACT_DAY_THRESHOLD

        const matches: { inf: TxCandidate; similarity: number; dateDelta: number; isCrossCurrency: boolean }[] = []

        for (const inf of inflows) {
            if (usedPool.has(inf.id)) continue
            if (alreadyMatched.has(inf.id)) continue
            if (selfMatch && out.id === inf.id) continue
            if (out.accountId && inf.accountId && out.accountId === inf.accountId) continue
            const isCrossCurrency = !!out.accountCurrency && !!inf.accountCurrency
                && out.accountCurrency !== inf.accountCurrency
            const tolerance = isCrossCurrency ? 0.05 : 0.001  // 5% for FX, 0.1% for same-currency rounding
            const amountDiff = Math.abs(Math.abs(inf.amount) - absAmount)
            if (amountDiff / absAmount > tolerance) continue
            const dateDelta = daysBetween(out.txDate, inf.txDate)
            if (dateDelta > windowDays) continue
            if (requireExactDay && dateDelta > 0) continue

            const similarity = normalizedSimilarity(out.description, inf.description)
            const passesDescription =
                similarity >= DESCRIPTION_SIMILARITY_FLOOR
                || TRANSFER_KEYWORDS.test(out.description)
                || TRANSFER_KEYWORDS.test(inf.description)
            if (!passesDescription) continue

            matches.push({ inf, similarity, dateDelta, isCrossCurrency })
        }

        if (matches.length === 0) continue

        // Best = highest similarity, then closest date.
        matches.sort((a, b) => b.similarity - a.similarity || a.dateDelta - b.dateDelta)
        const best = matches[0]
        // Cross-currency pairs are always 'suggested' so the user confirms before analytics excludes them
        const status: 'pending' | 'suggested' = (matches.length === 1 && !best.isCrossCurrency) ? 'pending' : 'suggested'

        pairs.push({
            fromTxId: out.id,
            toTxId: best.inf.id,
            amount: absAmount,
            status,
            needsReview: best.isCrossCurrency ? true : undefined,
        })
        usedPool.add(best.inf.id)
        alreadyMatched.add(out.id)
        alreadyMatched.add(best.inf.id)
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

/**
 * Normalized similarity in [0, 1]. Empty strings on both sides return 0
 * (no signal — let the keyword fallback decide).
 */
function normalizedSimilarity(a: string, b: string): number {
    const A = (a ?? '').toLowerCase().trim().slice(0, 200)
    const B = (b ?? '').toLowerCase().trim().slice(0, 200)
    if (!A || !B) return 0
    const maxLen = Math.max(A.length, B.length)
    return 1 - levenshtein(A, B) / maxLen
}

/**
 * Iterative two-row Levenshtein. O(min(m,n)) memory, O(m·n) time.
 * Inputs capped to 200 chars in normalizedSimilarity, so worst-case ≤ 40k ops.
 */
function levenshtein(a: string, b: string): number {
    if (a === b) return 0
    const m = a.length
    const n = b.length
    if (m === 0) return n
    if (n === 0) return m

    let prev = new Array<number>(n + 1)
    let curr = new Array<number>(n + 1)
    for (let j = 0; j <= n; j++) prev[j] = j

    for (let i = 1; i <= m; i++) {
        curr[0] = i
        for (let j = 1; j <= n; j++) {
            const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
            curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
        }
        const tmp = prev
        prev = curr
        curr = tmp
    }
    return prev[n]
}
