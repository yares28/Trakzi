// lib/charts/pockets-aggregations.ts
import { neonQuery } from '@/lib/neonClient'
import type {
    CountryData,
    PocketsBundleResponse,
    PocketItemWithTotals,
    PocketItem,
    PocketMetadata,
    OwnedPropertyMetadata,
    TravelStats,
    GarageStats,
    PropertyStats,
    OtherStats,
} from '@/lib/types/pockets'

// ═══════════════════════════════════════════════════════
// TRAVEL (existing)
// ═══════════════════════════════════════════════════════

/**
 * Get aggregated country spending data for the pockets page
 * Returns country instances with total spending (expenses only)
 */
export async function getCountrySpending(userId: string): Promise<CountryData[]> {
    const rows = await neonQuery<{
        instance_id: number
        country_name: string
        label: string
        value: string
    }>(
        `SELECT
            ci.id AS instance_id,
            ci.country_name,
            ci.label,
            COALESCE(SUM(ABS(t.amount)), 0)::text AS value
        FROM country_instances ci
        LEFT JOIN transactions t ON t.country_instance_id = ci.id
            AND t.user_id = $1
            AND t.amount < 0
        WHERE ci.user_id = $1
        GROUP BY ci.id, ci.country_name, ci.label
        HAVING COALESCE(SUM(ABS(t.amount)), 0) > 0
        ORDER BY SUM(ABS(t.amount)) DESC`,
        [userId]
    )

    return rows.map(row => ({
        id: row.country_name,
        instance_id: row.instance_id,
        label: row.label,
        value: parseFloat(row.value) || 0
    }))
}

/**
 * Compute travel stats from country spending data
 */
function computeTravelStats(countries: CountryData[]): TravelStats {
    const totalCountries = countries.length
    const totalSpentAbroad = countries.reduce((sum, c) => sum + c.value, 0)

    const topCountry = countries.length > 0
        ? { name: countries[0].id, value: countries[0].value }
        : null

    return { totalCountries, totalSpentAbroad, topCountry }
}

// ═══════════════════════════════════════════════════════
// UNIFIED POCKETS (Vehicles, Properties, Other)
// ═══════════════════════════════════════════════════════

/**
 * Fetch all pockets for a user with aggregated tab totals.
 * Uses 2 indexed queries merged in-memory (no N+1).
 */
async function getPocketsWithTotals(userId: string): Promise<PocketItemWithTotals[]> {
    // Query 1: Get all pockets
    const pockets = await neonQuery<PocketItem>(
        `SELECT id, user_id, type, name, metadata, svg_path,
                created_at::text as created_at,
                updated_at::text as updated_at
         FROM pockets
         WHERE user_id = $1
         ORDER BY type, created_at DESC`,
        [userId]
    )

    if (pockets.length === 0) {
        return []
    }

    // Query 2: Get aggregated totals per pocket per tab
    const totals = await neonQuery<{
        pocket_id: number
        tab: string
        tx_count: string
        total: string
    }>(
        `SELECT
            pt.pocket_id,
            pt.tab,
            COUNT(*) as tx_count,
            COALESCE(SUM(ABS(t.amount)), 0) as total
         FROM pocket_transactions pt
         JOIN transactions t ON t.id = pt.transaction_id
         WHERE pt.user_id = $1
         GROUP BY pt.pocket_id, pt.tab`,
        [userId]
    )

    // Build totals lookup: pocket_id → { tabTotals, totalInvested, transactionCount }
    const totalsMap = new Map<number, {
        tabTotals: Record<string, number>
        totalInvested: number
        transactionCount: number
    }>()

    for (const row of totals) {
        const pocketId = row.pocket_id
        const tabTotal = parseFloat(row.total) || 0
        const txCount = parseInt(row.tx_count, 10) || 0

        if (!totalsMap.has(pocketId)) {
            totalsMap.set(pocketId, {
                tabTotals: {},
                totalInvested: 0,
                transactionCount: 0,
            })
        }

        const entry = totalsMap.get(pocketId)!
        entry.tabTotals[row.tab] = tabTotal
        entry.totalInvested += tabTotal
        entry.transactionCount += txCount
    }

    // Merge pockets with totals
    return pockets.map((pocket) => {
        const entry = totalsMap.get(pocket.id)
        return {
            id: pocket.id,
            type: pocket.type,
            name: pocket.name,
            metadata: pocket.metadata,
            svg_path: pocket.svg_path,
            created_at: pocket.created_at,
            totals: entry?.tabTotals ?? {},
            totalInvested: entry?.totalInvested ?? 0,
            transactionCount: entry?.transactionCount ?? 0,
        }
    })
}

// ─── Stats computation ────────────────────────────────

function computeGarageStats(vehicles: PocketItemWithTotals[]): GarageStats {
    const totalVehicles = vehicles.length
    const totalInvested = vehicles.reduce((sum, v) => sum + v.totalInvested, 0)

    let topVehicle: { name: string; value: number } | null = null
    if (vehicles.length > 0) {
        const sorted = [...vehicles].sort((a, b) => b.totalInvested - a.totalInvested)
        topVehicle = { name: sorted[0].name, value: sorted[0].totalInvested }
    }

    return { totalVehicles, totalInvested, topVehicle }
}

function computePropertyStats(properties: PocketItemWithTotals[]): PropertyStats {
    const totalProperties = properties.length

    // Sum estimatedValue from owned properties
    let totalValue = 0
    let totalEquity = 0

    for (const prop of properties) {
        const meta = prop.metadata as PocketMetadata
        if ('propertyType' in meta && (meta as OwnedPropertyMetadata).propertyType === 'owned') {
            const owned = meta as OwnedPropertyMetadata
            totalValue += owned.estimatedValue || 0

            // Equity = estimatedValue - remaining mortgage
            if (owned.mortgage) {
                const { originalAmount, loanYears, yearsPaid } = owned.mortgage
                const fractionPaid = loanYears > 0 ? Math.min(yearsPaid / loanYears, 1) : 1
                const principalPaid = originalAmount * fractionPaid
                const remaining = originalAmount - principalPaid
                totalEquity += (owned.estimatedValue || 0) - remaining
            } else {
                // No mortgage = fully owned
                totalEquity += owned.estimatedValue || 0
            }
        }
    }

    let topProperty: { name: string; value: number } | null = null
    if (properties.length > 0) {
        const sorted = [...properties].sort((a, b) => b.totalInvested - a.totalInvested)
        topProperty = { name: sorted[0].name, value: sorted[0].totalInvested }
    }

    return { totalProperties, totalValue, totalEquity, topProperty }
}

function computeOtherStats(otherPockets: PocketItemWithTotals[]): OtherStats {
    const totalItems = otherPockets.length
    const totalSpent = otherPockets.reduce((sum, p) => sum + p.totalInvested, 0)

    let topItem: { name: string; value: number } | null = null
    if (otherPockets.length > 0) {
        const sorted = [...otherPockets].sort((a, b) => b.totalInvested - a.totalInvested)
        topItem = { name: sorted[0].name, value: sorted[0].totalInvested }
    }

    return { totalItems, totalSpent, topItem }
}

// ═══════════════════════════════════════════════════════
// BUNDLE
// ═══════════════════════════════════════════════════════

/**
 * Get the complete pockets bundle (countries + all pocket types + stats).
 * Cached at the API layer via getCachedOrCompute().
 *
 * Uses 3 indexed queries total:
 * 1. Country spending (existing travel)
 * 2. All pockets
 * 3. Aggregated pocket totals
 */
export async function getPocketsBundle(userId: string): Promise<PocketsBundleResponse> {
    // Run travel + pockets queries in parallel
    const [countries, allPockets] = await Promise.all([
        getCountrySpending(userId),
        getPocketsWithTotals(userId),
    ])

    // Partition pockets by type
    const vehicles = allPockets.filter(p => p.type === 'vehicle')
    const properties = allPockets.filter(p => p.type === 'property')
    const otherPockets = allPockets.filter(p => p.type === 'other')

    // Compute stats (always from DB, never mock)
    const stats = {
        travel: computeTravelStats(countries),
        garage: computeGarageStats(vehicles),
        property: computePropertyStats(properties),
        other: computeOtherStats(otherPockets),
    }

    return {
        countries,
        vehicles,
        properties,
        otherPockets,
        stats,
    }
}

/**
 * Get distinct countries the user has linked transactions to
 * Returns country names (not instance labels) for compatibility
 */
export async function getUserCountries(userId: string): Promise<string[]> {
    const rows = await neonQuery<{ country_name: string }>(
        `SELECT DISTINCT ci.country_name
        FROM country_instances ci
        INNER JOIN transactions t ON t.country_instance_id = ci.id
        WHERE ci.user_id = $1
        ORDER BY ci.country_name`,
        [userId]
    )

    return rows.map(row => row.country_name)
}
