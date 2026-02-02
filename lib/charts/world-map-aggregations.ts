// lib/charts/world-map-aggregations.ts
import { neonQuery } from '@/lib/neonClient'
import type { CountryData, WorldMapStats, WorldMapBundleResponse } from '@/lib/types/world-map'

/**
 * Get aggregated country spending data for the world map
 * Returns countries with total spending (expenses only)
 */
export async function getCountrySpending(userId: string): Promise<CountryData[]> {
    const rows = await neonQuery<{ id: string; value: string }>(
        `SELECT
            country_name AS id,
            COALESCE(SUM(ABS(amount)), 0)::text AS value
        FROM transactions
        WHERE user_id = $1
            AND country_name IS NOT NULL
            AND amount < 0
        GROUP BY country_name
        ORDER BY SUM(ABS(amount)) DESC`,
        [userId]
    )

    return rows.map(row => ({
        id: row.id,
        value: parseFloat(row.value) || 0
    }))
}

/**
 * Compute stats from country spending data
 */
export function computeWorldMapStats(countries: CountryData[]): WorldMapStats {
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
 * Get the complete world map bundle (countries + stats)
 * This is cached at the API layer
 */
export async function getWorldMapBundle(userId: string): Promise<WorldMapBundleResponse> {
    const countries = await getCountrySpending(userId)
    const stats = computeWorldMapStats(countries)

    return {
        countries,
        stats
    }
}

/**
 * Get distinct countries the user has linked transactions to
 */
export async function getUserCountries(userId: string): Promise<string[]> {
    const rows = await neonQuery<{ country_name: string }>(
        `SELECT DISTINCT country_name
        FROM transactions
        WHERE user_id = $1 AND country_name IS NOT NULL
        ORDER BY country_name`,
        [userId]
    )

    return rows.map(row => row.country_name)
}
