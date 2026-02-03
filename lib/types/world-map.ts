// lib/types/world-map.ts

/**
 * Country instance - represents a user's custom labeled country tracking
 */
export interface CountryInstance {
    id: number
    user_id: string
    country_name: string  // GeoJSON country name (e.g., "Japan")
    label: string         // Custom display label (e.g., "Japan Trip 1")
    created_at: string
    updated_at: string
}

/**
 * Country data for world map visualization
 * id must match GeoJSON properties.name exactly
 */
export interface CountryData {
    id: string         // country_name (matches GeoJSON properties.name) - for map matching
    instance_id: number // country_instances.id - unique identifier for this instance
    label: string      // Custom label for display (e.g., "Japan Trip 1")
    value: number      // total spent (absolute value of expenses)
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
 * Request body for linking transactions to a country instance
 */
export interface LinkTransactionsRequest {
    country_instance_id: number  // ID of the country instance to link to
    transaction_ids: number[]
}

/**
 * Request body for creating a new country instance
 */
export interface CreateCountryInstanceRequest {
    country_name: string  // GeoJSON country name
    label: string         // Custom label (e.g., "Japan Trip 1")
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
    country: string      // country_name (GeoJSON name)
    label: string       // Custom label for display
    instance_id: number // country_instances.id
    transactions: CountryTransaction[]
    total: number
}

/**
 * Response from GET /api/world-map/instances
 */
export interface CountryInstancesResponse {
    instances: CountryInstance[]
}

/**
 * Response from POST /api/world-map/instances
 */
export interface CreateCountryInstanceResponse {
    instance: CountryInstance
}

/**
 * Response from GET /api/world-map/unlinked-transactions
 */
export interface UnlinkedTransactionsResponse {
    transactions: CountryTransaction[]
    total: number
}
