// lib/charts/pockets-aggregations.ts
import { neonQuery } from '@/lib/neonClient'
import type { CountryData, PocketsStats, PocketsBundleResponse } from '@/lib/types/pockets'

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
        id: row.country_name,      // For map matching (GeoJSON)
        instance_id: row.instance_id,
        label: row.label,           // Custom label for display
        value: parseFloat(row.value) || 0
    }))
}

/**
 * Compute stats from country spending data
 */
export function computePocketsStats(countries: CountryData[]): PocketsStats {
    const totalCountries = countries.length
    const totalSpentAbroad = countries.reduce((sum, c) => sum + c.value, 0)

    const topCountry = countries.length > 0
        ? { name: countries[0].id, value: countries[0].value }
        : null

    return {
        totalCountries,
        totalSpentAbroad,
        topCountry
    }
}

/**
 * Get the complete pockets bundle (countries + stats)
 * This is cached at the API layer
 */
export async function getPocketsBundle(userId: string): Promise<PocketsBundleResponse> {
    const countries = await getCountrySpending(userId)
    const stats = computePocketsStats(countries)

    return {
        countries,
        stats
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
