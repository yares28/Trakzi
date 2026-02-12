// lib/types/pockets.ts

// ═══════════════════════════════════════════════════════
// TRAVEL (Country Instances) — existing, unchanged
// ═══════════════════════════════════════════════════════

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
 * Country data for pockets (world map) visualization
 * id must match GeoJSON properties.name exactly
 */
export interface CountryData {
    id: string         // country_name (matches GeoJSON properties.name) - for map matching
    instance_id: number // country_instances.id - unique identifier for this instance
    label: string      // Custom label for display (e.g., "Japan Trip 1")
    value: number      // total spent (absolute value of expenses)
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
 * Response from GET /api/pockets/transactions
 */
export interface CountryTransactionsResponse {
    country: string      // country_name (GeoJSON name)
    label: string       // Custom label for display
    instance_id: number // country_instances.id
    transactions: CountryTransaction[]
    total: number
}

/**
 * Response from GET /api/pockets/instances
 */
export interface CountryInstancesResponse {
    instances: CountryInstance[]
}

/**
 * Response from POST /api/pockets/instances
 */
export interface CreateCountryInstanceResponse {
    instance: CountryInstance
}

/**
 * Response from GET /api/pockets/unlinked-transactions
 */
export interface UnlinkedTransactionsResponse {
    transactions: CountryTransaction[]
    total: number
}

// ═══════════════════════════════════════════════════════
// UNIFIED POCKETS (Vehicles, Properties, Other)
// ═══════════════════════════════════════════════════════

// ─── Core types ─────────────────────────────────────────

export type PocketType = "vehicle" | "property" | "other"

export type VehicleTypeOption =
    | "Car"
    | "SUV"
    | "Truck"
    | "Van"
    | "Motorcycle"
    | "Other"

// ─── Tab types (sub-sections within each pocket card) ───

export type VehicleTab = "fuel" | "maintenance" | "insurance" | "certificate" | "financing" | "parking"
export type OwnedPropertyTab = "mortgage" | "maintenance" | "insurance" | "taxes"
export type RentedPropertyTab = "rent" | "utilities" | "deposit" | "fees"
export type OtherTab = "general"
export type PocketTab = VehicleTab | OwnedPropertyTab | RentedPropertyTab | OtherTab

// ─── Metadata schemas (JSONB in DB, typed in TS) ────────

export interface VehicleMetadata {
    brand: string
    vehicleType: VehicleTypeOption
    year: number
    priceBought: number
    licensePlate?: string
    fuelType?: "Gasoline" | "Diesel" | "Electric" | "Hybrid" | "LPG"
    tankSizeL?: number
    // Reminder dates (ISO date strings, e.g., "2026-06-15")
    nextMaintenanceDate?: string
    certificateEndDate?: string
    insuranceRenewalDate?: string
    // Financing (optional — only if user has a loan)
    financing?: {
        upfrontPaid: number
        annualInterestRate: number
        loanRemaining: number
    }
}

export interface OwnedPropertyMetadata {
    propertyType: "owned"
    estimatedValue: number
    mortgage?: {
        originalAmount: number     // Original loan amount
        interestRate: number       // Annual interest rate (%)
        loanYears: number          // Total loan term in years
        yearsPaid: number          // Years already paid
    }
}

export interface RentedPropertyMetadata {
    propertyType: "rented"
    monthlyRent?: number
}

export interface OtherPocketMetadata {
    // Intentionally empty — name is sufficient
}

export type PocketMetadata =
    | VehicleMetadata
    | OwnedPropertyMetadata
    | RentedPropertyMetadata
    | OtherPocketMetadata

// ─── Pocket item (DB row) ───────────────────────────────

export interface PocketItem {
    id: number
    user_id: string
    type: PocketType
    name: string
    metadata: PocketMetadata
    svg_path: string | null
    created_at: string
    updated_at: string
}

/** Pocket item enriched with aggregated totals from pocket_transactions */
export interface PocketItemWithTotals {
    id: number
    type: PocketType
    name: string
    metadata: PocketMetadata
    svg_path: string | null
    created_at: string
    totals: Record<string, number>      // e.g., { fuel: 1200, maintenance: 450 }
    totalInvested: number               // Sum of all tab totals
    transactionCount: number            // Total linked transactions
}

// ─── Transaction row for pocket detail sheets ───────────

export interface PocketLinkedTransaction {
    id: number
    tx_date: string
    description: string
    amount: number
    category_name: string | null
}

// ─── API request/response types ─────────────────────────

export interface CreatePocketRequest {
    type: PocketType
    name: string
    metadata: PocketMetadata
    svg_path?: string
}

export interface UpdatePocketRequest {
    name?: string
    metadata?: Partial<PocketMetadata>
    svg_path?: string
}

export interface PocketLinkRequest {
    pocket_id: number
    tab: string
    transaction_ids: number[]
}

export interface PocketUnlinkRequest {
    pocket_id: number
    transaction_ids: number[]
}

export interface PocketTransactionsResponse {
    pocket_id: number
    tab: string
    transactions: PocketLinkedTransaction[]
    total: number
}

export interface PocketUnlinkedResponse {
    transactions: PocketLinkedTransaction[]
    total: number
}

// ─── Category → Tab mapping ─────────────────────────────
// Maps each pocket tab to the category name(s) used to filter available transactions.
// Empty array = no filter (show all categories).

export const POCKET_TAB_CATEGORIES: Record<string, string[]> = {
    // Vehicle tabs
    fuel: ["Fuel"],
    maintenance_vehicle: ["Car Maintenance"],
    insurance_vehicle: ["Insurance", "Taxes & Fees"],
    certificate: ["Car Certificate"],
    financing: ["Car Loan"],
    parking: ["Parking/Tolls"],
    // Owned property tabs
    mortgage: ["Mortgage"],
    maintenance_property: ["Home Maintenance"],
    insurance_property: ["Insurance"],
    taxes: ["Taxes & Fees"],
    // Rented property tabs
    rent: ["Rent"],
    utilities: ["Utilities"],
    deposit: ["Deposit"],
    fees: ["Taxes & Fees"],
    // Other
    general: [],  // Empty = all categories (no filter)
}

/**
 * Resolves the category mapping key for a given pocket type and tab.
 * Handles ambiguous tab names like "maintenance" and "insurance" that differ
 * between vehicles and properties.
 */
export function resolveCategoryKey(pocketType: PocketType, tab: string): string {
    if (tab === "maintenance") {
        return pocketType === "vehicle" ? "maintenance_vehicle" : "maintenance_property"
    }
    if (tab === "insurance") {
        return pocketType === "vehicle" ? "insurance_vehicle" : "insurance_property"
    }
    return tab
}

// ─── Stats types (per tab in bundle response) ───────────

export interface TravelStats {
    totalCountries: number
    totalSpentAbroad: number
    topCountry: { name: string; value: number } | null
}

export interface GarageStats {
    totalVehicles: number
    totalInvested: number
    topVehicle: { name: string; value: number } | null
}

export interface PropertyStats {
    totalProperties: number
    totalValue: number
    totalEquity: number
    topProperty: { name: string; value: number } | null
}

export interface OtherStats {
    totalItems: number
    totalSpent: number
    topItem: { name: string; value: number } | null
}

// ─── Bundle API response ────────────────────────────────

export interface PocketsBundleResponse {
    // Travel (existing)
    countries: CountryData[]
    // Garage, Property, Other (new)
    vehicles: PocketItemWithTotals[]
    properties: PocketItemWithTotals[]
    otherPockets: PocketItemWithTotals[]
    // Stats per tab (always from DB, never mock)
    stats: {
        travel: TravelStats
        garage: GarageStats
        property: PropertyStats
        other: OtherStats
    }
}

// ═══════════════════════════════════════════════════════
// LEGACY (kept for backward compatibility during migration)
// Remove these once all UI components are wired to new types
// ═══════════════════════════════════════════════════════

/** @deprecated Use PocketsBundleResponse.stats.travel instead */
export type PocketsStats = TravelStats

/** @deprecated Migrate to VehicleMetadata.financing */
export interface VehicleFinancing {
    upfrontPaid: number
    annualInterestRate?: number
    loanRemaining: number
}

/** @deprecated Migrate to VehicleMetadata.fuelType + tankSizeL */
export interface VehicleFuelInfo {
    tankSizeL?: number
    fuelType?: string
    linkedTransactionIds: number[]
}

/**
 * @deprecated Use PocketItemWithTotals + VehicleMetadata instead.
 * This is the old client-side vehicle type used by mock data.
 * Will be removed once VehicleCardsGrid and related components are wired to DB.
 */
export interface VehicleData {
    id: string
    name: string
    brand: string
    vehicleType: VehicleTypeOption
    year: number
    priceBought: number
    licensePlate: string
    svgPath: string
    fuel: VehicleFuelInfo
    maintenanceTransactionIds: number[]
    insuranceTransactionIds: number[]
    certificateTransactionIds: number[]
    parkingTransactionIds: number[]
    fuelTotal?: number
    maintenanceTotal?: number
    insuranceTotal?: number
    certificateTotal?: number
    parkingTotal?: number
    financing?: VehicleFinancing
    // Reminder dates (added for legacy compat)
    nextMaintenanceDate?: string
    certificateEndDate?: string
    insuranceRenewalDate?: string
}

/** @deprecated Use PocketLinkedTransaction instead */
export interface VehicleLinkedTransaction {
    id: number
    date: string
    description: string
    amount: number
    category: string
}
