// lib/data/country-codes.ts
// Maps GeoJSON country names to ISO 3166-1 alpha-2 codes for flag display

/**
 * Country name to ISO code mapping
 * Keys match world-countries.json properties.name exactly
 */
export const COUNTRY_CODES: Record<string, string> = {
    // A
    "Afghanistan": "AF",
    "Albania": "AL",
    "Algeria": "DZ",
    "Angola": "AO",
    "Antarctica": "AQ",
    "Argentina": "AR",
    "Armenia": "AM",
    "Australia": "AU",
    "Austria": "AT",
    "Azerbaijan": "AZ",

    // B
    "Bangladesh": "BD",
    "Belarus": "BY",
    "Belgium": "BE",
    "Belize": "BZ",
    "Benin": "BJ",
    "Bhutan": "BT",
    "Bolivia": "BO",
    "Bosnia and Herzegovina": "BA",
    "Botswana": "BW",
    "Brazil": "BR",
    "Brunei": "BN",
    "Bulgaria": "BG",
    "Burkina Faso": "BF",
    "Burundi": "BI",

    // C
    "Cambodia": "KH",
    "Cameroon": "CM",
    "Canada": "CA",
    "Central African Republic": "CF",
    "Chad": "TD",
    "Chile": "CL",
    "China": "CN",
    "Colombia": "CO",
    "Costa Rica": "CR",
    "Croatia": "HR",
    "Cuba": "CU",
    "Cyprus": "CY",
    "Czech Republic": "CZ",

    // D
    "Democratic Republic of the Congo": "CD",
    "Denmark": "DK",
    "Djibouti": "DJ",
    "Dominican Republic": "DO",

    // E
    "East Timor": "TL",
    "Ecuador": "EC",
    "Egypt": "EG",
    "El Salvador": "SV",
    "Equatorial Guinea": "GQ",
    "Eritrea": "ER",
    "Estonia": "EE",
    "Ethiopia": "ET",

    // F
    "Falkland Islands": "FK",
    "Fiji": "FJ",
    "Finland": "FI",
    "France": "FR",
    "French Southern and Antarctic Lands": "TF",

    // G
    "Gabon": "GA",
    "Gambia": "GM",
    "Georgia": "GE",
    "Germany": "DE",
    "Ghana": "GH",
    "Greece": "GR",
    "Greenland": "GL",
    "Guatemala": "GT",
    "Guinea": "GN",
    "Guinea Bissau": "GW",
    "Guyana": "GY",

    // H
    "Haiti": "HT",
    "Honduras": "HN",
    "Hungary": "HU",

    // I
    "Iceland": "IS",
    "India": "IN",
    "Indonesia": "ID",
    "Iran": "IR",
    "Iraq": "IQ",
    "Ireland": "IE",
    "Israel": "IL",
    "Italy": "IT",
    "Ivory Coast": "CI",

    // J
    "Jamaica": "JM",
    "Japan": "JP",
    "Jordan": "JO",

    // K
    "Kazakhstan": "KZ",
    "Kenya": "KE",
    "Korea": "KR",  // South Korea in GeoJSON
    "Kosovo": "XK",
    "Kuwait": "KW",
    "Kyrgyzstan": "KG",

    // L
    "Laos": "LA",
    "Latvia": "LV",
    "Lebanon": "LB",
    "Lesotho": "LS",
    "Liberia": "LR",
    "Libya": "LY",
    "Lithuania": "LT",
    "Luxembourg": "LU",

    // M
    "Macedonia": "MK",
    "Madagascar": "MG",
    "Malawi": "MW",
    "Malaysia": "MY",
    "Mali": "ML",
    "Mauritania": "MR",
    "Mexico": "MX",
    "Moldova": "MD",
    "Mongolia": "MN",
    "Montenegro": "ME",
    "Morocco": "MA",
    "Mozambique": "MZ",
    "Myanmar": "MM",

    // N
    "Namibia": "NA",
    "Nepal": "NP",
    "Netherlands": "NL",
    "New Caledonia": "NC",
    "New Zealand": "NZ",
    "Nicaragua": "NI",
    "Niger": "NE",
    "Nigeria": "NG",
    "Northern Cyprus": "CY",  // Uses Cyprus code
    "Norway": "NO",

    // O
    "Oman": "OM",

    // P
    "Pakistan": "PK",
    "Panama": "PA",
    "Papua New Guinea": "PG",
    "Paraguay": "PY",
    "Peru": "PE",
    "Philippines": "PH",
    "Poland": "PL",
    "Portugal": "PT",
    "Puerto Rico": "PR",

    // Q
    "Qatar": "QA",

    // R
    "Republic of the Congo": "CG",
    "Romania": "RO",
    "Russia": "RU",
    "Rwanda": "RW",

    // S
    "Saudi Arabia": "SA",
    "Senegal": "SN",
    "Serbia": "RS",
    "Sierra Leone": "SL",
    "Slovakia": "SK",
    "Slovenia": "SI",
    "Solomon Islands": "SB",
    "Somalia": "SO",
    "Somaliland": "SO",  // Uses Somalia code (not internationally recognized)
    "South Africa": "ZA",
    "South Sudan": "SS",
    "Spain": "ES",
    "Sri Lanka": "LK",
    "Sudan": "SD",
    "Suriname": "SR",
    "Swaziland": "SZ",  // Now Eswatini
    "Sweden": "SE",
    "Switzerland": "CH",
    "Syria": "SY",

    // T
    "Taiwan": "TW",
    "Tajikistan": "TJ",
    "Tanzania": "TZ",
    "Thailand": "TH",
    "The Bahamas": "BS",
    "Togo": "TG",
    "Trinidad and Tobago": "TT",
    "Tunisia": "TN",
    "Turkey": "TR",
    "Turkmenistan": "TM",

    // U
    "Uganda": "UG",
    "UK": "GB",
    "Ukraine": "UA",
    "United Arab Emirates": "AE",
    "Uruguay": "UY",
    "USA": "US",
    "Uzbekistan": "UZ",

    // V
    "Vanuatu": "VU",
    "Venezuela": "VE",
    "Vietnam": "VN",

    // W
    "West Bank": "PS",  // Palestinian territories
    "Western Sahara": "EH",

    // Y
    "Yemen": "YE",

    // Z
    "Zambia": "ZM",
    "Zimbabwe": "ZW",
}

/**
 * Get ISO country code from GeoJSON country name
 * @param countryName - Exact name from world-countries.json
 * @returns ISO 3166-1 alpha-2 code or undefined if not found
 */
export function getCountryCode(countryName: string): string | undefined {
    return COUNTRY_CODES[countryName]
}

/**
 * Get all valid country names (for validation)
 */
export function getValidCountryNames(): string[] {
    return Object.keys(COUNTRY_CODES)
}

/**
 * Check if a country name is valid (exists in GeoJSON)
 */
export function isValidCountryName(countryName: string): boolean {
    return countryName in COUNTRY_CODES
}

/**
 * Convert ISO code to flag emoji
 * @param countryCode - ISO 3166-1 alpha-2 code (e.g., "US", "FR")
 * @returns Flag emoji (e.g., "🇺🇸", "🇫🇷")
 */
export function getFlagEmoji(countryCode: string): string {
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
}

/**
 * Get flag emoji directly from country name
 * @param countryName - Exact name from world-countries.json
 * @returns Flag emoji or empty string if country not found
 */
export function getCountryFlag(countryName: string): string {
    const code = getCountryCode(countryName)
    return code ? getFlagEmoji(code) : ''
}
