/**
 * Helpers for threading the sidebar account filter through chart aggregations.
 *
 * The filter is `string[] | null | undefined`:
 *   - undefined / null / [] → "all accounts" (no clause appended)
 *   - non-empty array       → restrict to those account IDs
 *
 * `account_id IS NULL` rows (legacy / orphaned) are never included when a
 * filter is active. Apply this consistently — analytics totals depend on it.
 */

export type AccountFilter = string[] | null | undefined

/**
 * Returns true when an account filter is active and should narrow the query.
 */
export function hasAccountFilter(accountIds: AccountFilter): boolean {
    return Array.isArray(accountIds) && accountIds.length > 0
}

/**
 * Build a SQL fragment that restricts a query by account IDs.
 *
 * Returns:
 *   - clause: " AND <alias>.account_id = ANY($N)"  (empty string when filter inactive)
 *   - nextOffset: paramOffset + (1 if active else 0)
 *   - params:    [accountIds] when active, [] otherwise
 *
 * Use ANY($N) (single param) instead of expanding into IN ($1,$2,…) so that
 * cardinality changes don't break param numbering at call sites.
 */
export function buildAccountFilterClause(
    accountIds: AccountFilter,
    paramOffset: number,
    alias: string = 't'
): { clause: string; nextOffset: number; params: string[][] } {
    if (!hasAccountFilter(accountIds)) {
        return { clause: '', nextOffset: paramOffset, params: [] }
    }
    const placeholder = `$${paramOffset + 1}`
    const prefix = alias ? `${alias}.` : ''
    return {
        clause: ` AND ${prefix}account_id = ANY(${placeholder})`,
        nextOffset: paramOffset + 1,
        params: [accountIds as string[]],
    }
}

/**
 * Append an account-filter clause directly to a query string and mutate the params array.
 *
 * Designed for the `let query = '...'; const params = [userId]; ...` pattern in
 * `lib/charts/*.ts`. Call BEFORE the `GROUP BY` is appended, so the WHERE chain
 * stays contiguous.
 */
export function appendAccountFilter(
    query: string,
    params: unknown[],
    accountIds: AccountFilter,
    alias: string = 't'
): string {
    if (!hasAccountFilter(accountIds)) return query
    params.push(accountIds as string[])
    const prefix = alias ? `${alias}.` : ''
    return query + ` AND ${prefix}account_id = ANY($${params.length})`
}

/**
 * Canonicalize a filter for cache-key stability:
 *   - dedup
 *   - sort ascending
 *   - empty → null
 *
 * Two clients selecting the same accounts in different click order will
 * produce the same cache key, avoiding gratuitous cache misses.
 */
export function canonicalizeAccountFilter(accountIds: AccountFilter): string[] | null {
    if (!Array.isArray(accountIds) || accountIds.length === 0) return null
    const unique = Array.from(new Set(accountIds.filter((id) => typeof id === 'string' && id.length > 0)))
    if (unique.length === 0) return null
    return unique.sort()
}

/**
 * Encode a filter into a cache-key fragment. Returns null when filter is inactive.
 */
export function accountFilterCacheToken(accountIds: AccountFilter): string | null {
    const canonical = canonicalizeAccountFilter(accountIds)
    if (!canonical) return null
    return `acc=${canonical.join(',')}`
}
