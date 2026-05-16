/**
 * Helpers for threading the sidebar account filter through chart aggregations.
 *
 * The filter is `string[] | null | undefined`:
 *   - undefined / null / [] → "all accounts" (no clause appended)
 *   - non-empty array       → restrict to those account IDs
 *
 * UNASSIGNED_SENTINEL may appear in the array to opt-in to including
 * `account_id IS NULL` rows even when a specific account filter is active.
 * All helpers strip the sentinel before building SQL params.
 */

export const UNASSIGNED_SENTINEL = '__unassigned__'

export type AccountFilter = string[] | null | undefined

/** Returns true when a real (non-sentinel) account filter is active. */
export function hasAccountFilter(accountIds: AccountFilter): boolean {
    if (!Array.isArray(accountIds)) return false
    return accountIds.some(id => id !== UNASSIGNED_SENTINEL)
}

/**
 * Build a SQL fragment that restricts a query by account IDs.
 * When UNASSIGNED_SENTINEL is present, also includes `account_id IS NULL` rows.
 */
export function buildAccountFilterClause(
    accountIds: AccountFilter,
    paramOffset: number,
    alias: string = 't'
): { clause: string; nextOffset: number; params: string[][] } {
    if (!hasAccountFilter(accountIds)) {
        return { clause: '', nextOffset: paramOffset, params: [] }
    }
    const includeUnassigned = accountIds?.includes(UNASSIGNED_SENTINEL) ?? false
    const realIds = (accountIds as string[]).filter(id => id !== UNASSIGNED_SENTINEL)
    const placeholder = `$${paramOffset + 1}`
    const prefix = alias ? `${alias}.` : ''
    const clause = includeUnassigned
        ? ` AND (${prefix}account_id = ANY(${placeholder}) OR ${prefix}account_id IS NULL)`
        : ` AND ${prefix}account_id = ANY(${placeholder})`
    return {
        clause,
        nextOffset: paramOffset + 1,
        params: [realIds],
    }
}

/**
 * Append an account-filter clause directly to a query string and mutate the params array.
 * When UNASSIGNED_SENTINEL is present, appends `OR account_id IS NULL`.
 */
export function appendAccountFilter(
    query: string,
    params: unknown[],
    accountIds: AccountFilter,
    alias: string = 't'
): string {
    if (!hasAccountFilter(accountIds)) return query
    const includeUnassigned = accountIds?.includes(UNASSIGNED_SENTINEL) ?? false
    const realIds = (accountIds as string[]).filter(id => id !== UNASSIGNED_SENTINEL)
    params.push(realIds)
    const prefix = alias ? `${alias}.` : ''
    const clause = includeUnassigned
        ? ` AND (${prefix}account_id = ANY($${params.length}) OR ${prefix}account_id IS NULL)`
        : ` AND ${prefix}account_id = ANY($${params.length})`
    return query + clause
}

/**
 * Canonicalize a filter for cache-key stability:
 *   - dedup real IDs, sort ascending
 *   - preserve UNASSIGNED_SENTINEL if present (appended after sorted IDs)
 *   - empty → null
 */
export function canonicalizeAccountFilter(accountIds: AccountFilter): string[] | null {
    if (!Array.isArray(accountIds) || accountIds.length === 0) return null
    const hasUnassigned = accountIds.includes(UNASSIGNED_SENTINEL)
    const unique = Array.from(new Set(
        accountIds.filter(id => typeof id === 'string' && id.length > 0 && id !== UNASSIGNED_SENTINEL)
    ))
    if (unique.length === 0) return null
    const sorted = unique.sort()
    return hasUnassigned ? [...sorted, UNASSIGNED_SENTINEL] : sorted
}

/** Encode a filter into a cache-key fragment. Returns null when filter is inactive. */
export function accountFilterCacheToken(accountIds: AccountFilter): string | null {
    const canonical = canonicalizeAccountFilter(accountIds)
    if (!canonical) return null
    return `acc=${canonical.join(',')}`
}
