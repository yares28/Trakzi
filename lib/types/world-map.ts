// lib/types/world-map.ts

/**
 * Country data for world map visualization
 * id must match GeoJSON properties.name exactly
 */
export interface CountryData {
    id: string    // country_name (matches GeoJSON properties.name)
    value: number // total spent (absolute value of expenses)
}

/**
 * Stats computed from country spending data
 */
export interface WorldMapStats {
    totalCountries: number
    totalSpentAbroad: number
    topCountry: { name: string; value: number } | null
}

/**
 * Bundle API response for world map page
 */
export interface WorldMapBundleResponse {
    countries: CountryData[]
    stats: WorldMapStats
}

/**
 * Extended country data with ISO code for flags
 */
export interface CountryCardData extends CountryData {
    countryCode: string  // ISO 3166-1 alpha-2 code (e.g., "FR", "US")
}

/**
 * Request body for linking transactions to a country
 */
export interface LinkTransactionsRequest {
    country_name: string
    transaction_ids: number[]
}

/**
 * Request body for unlinking transactions from countries
 */
export interface UnlinkTransactionsRequest {
    transaction_ids: number[]
}

/**
 * Transaction data returned by country transactions API
 */
export interface CountryTransaction {
    id: number
    tx_date: string
    description: string
    amount: number
    category_id: number | null
    category_name?: string | null
}

/**
 * Response from GET /api/world-map/transactions
 */
export interface CountryTransactionsResponse {
    country: string
    transactions: CountryTransaction[]
    total: number
}

/**
 * Response from GET /api/world-map/unlinked-transactions
 */
export interface UnlinkedTransactionsResponse {
    transactions: CountryTransaction[]
    total: number
}
