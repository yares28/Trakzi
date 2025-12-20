// lib/ai/categoriseTransactions.ts
import { TxRow } from "../types/transactions";
import { getSiteUrl, getSiteName } from '@/lib/env';
import { DEFAULT_CATEGORIES as MAIN_DEFAULT_CATEGORIES } from '@/lib/categories';
import { normalizeTransactionDescriptionKey } from "@/lib/transactions/transaction-category-preferences";

// Default categories - synced with lib/categories.ts
// These are the categories the AI can assign to transactions
const DEFAULT_CATEGORIES = MAIN_DEFAULT_CATEGORIES;
const AI_CATEGORY_MODEL = process.env.OPENROUTER_CATEGORY_MODEL || "anthropic/claude-3.5-sonnet";

// Common merchant patterns for smart summarization
type MerchantPattern = {
    pattern: RegExp;
    summary: string;
    category?: string;
    priority?: number;
};

type CategoryRule = {
    category: string;
    patterns: RegExp[];
    amountSign?: "positive" | "negative" | "any";
};

type CategoryKeywordRule = {
    keywords: string[];
    amountSign?: "positive" | "negative" | "any";
};

const CATEGORY_DEFINITIONS: Record<string, string> = {
    "Groceries": "Supermarkets and grocery stores.",
    "Restaurants": "Restaurants, cafes, and food delivery.",
    "Bars": "Bars, pubs, and nightlife.",
    "Rent": "Housing rent payments.",
    "Mortgage": "Mortgage and home loan payments.",
    "Utilities": "Electricity, water, gas, internet, and phone services.",
    "Fuel": "Gas stations and vehicle fuel.",
    "Transport": "Taxis, ride-hailing, public transport, parking, and tolls.",
    "Insurance": "Insurance premiums (health, auto, home).",
    "Taxes & Fees": "Taxes, government fees, bank fees, and card fees.",
    "Shopping": "Retail purchases, clothing, electronics, and household goods.",
    "Entertainment": "Cinema, concerts, events, and leisure.",
    "Education": "Schools, courses, tuition, and learning.",
    "Health & Fitness": "Pharmacy, clinics, medical, gyms, and fitness.",
    "Subscriptions": "Digital subscriptions and recurring services.",
    "Travel": "Flights, hotels, and travel agencies.",
    "Services": "Professional services, repairs, hairdressers, and laundry.",
    "Income": "Salary, pension, benefits, interest, or dividends.",
    "Transfers": "Bank transfers, P2P, Bizum, and PayPal.",
    "Refunds": "Refunds, chargebacks, and reversals.",
    "Savings": "Transfers to savings or investments.",
    "Other": "Only when ambiguous or unknown."
};

const CATEGORY_ALIASES: Record<string, string> = {
    "taxes": "Taxes & Fees",
    "tax": "Taxes & Fees",
    "fees": "Taxes & Fees",
    "taxes & fees": "Taxes & Fees",
    "taxes and fees": "Taxes & Fees",
    "transportation": "Transport",
    "transport": "Transport",
    "fuel": "Fuel",
    "groceries": "Groceries",
    "grocery": "Groceries",
    "restaurants": "Restaurants",
    "restaurant": "Restaurants",
    "bars": "Bars",
    "bar": "Bars",
    "utilities": "Utilities",
    "utility": "Utilities",
    "shopping": "Shopping",
    "entertainment": "Entertainment",
    "education": "Education",
    "health": "Health & Fitness",
    "health & fitness": "Health & Fitness",
    "fitness": "Health & Fitness",
    "subscriptions": "Subscriptions",
    "subscription": "Subscriptions",
    "travel": "Travel",
    "services": "Services",
    "service": "Services",
    "income": "Income",
    "transfers": "Transfers",
    "transfer": "Transfers",
    "refunds": "Refunds",
    "refund": "Refunds",
    "savings": "Savings",
    "saving": "Savings",
    "rent": "Rent",
    "mortgage": "Mortgage",
    "other": "Other"
};

const MERCHANT_PATTERNS: MerchantPattern[] = [
    // Subscriptions (specific)
    { pattern: /amazon\s*prime|prime\s*video/i, summary: "Amazon Prime", category: "Subscriptions", priority: 90 },
    { pattern: /netflix/i, summary: "Netflix", category: "Subscriptions", priority: 85 },
    { pattern: /spotify/i, summary: "Spotify", category: "Subscriptions", priority: 85 },
    { pattern: /disney\+|disney\s*plus/i, summary: "Disney Plus", category: "Subscriptions", priority: 85 },
    { pattern: /hbo\s*max|hbomax/i, summary: "HBO Max", category: "Subscriptions", priority: 85 },
    { pattern: /youtube\s*premium/i, summary: "YouTube Premium", category: "Subscriptions", priority: 80 },
    { pattern: /google\s*play/i, summary: "Google Play", category: "Subscriptions", priority: 80 },
    { pattern: /apple\.com\/bill|itunes|app\s*store/i, summary: "Apple Services", category: "Subscriptions", priority: 85 },
    { pattern: /adobe|canva|dropbox|notion|microsoft\s*365|office\s*365/i, summary: "Digital Subscription", category: "Subscriptions", priority: 75 },

    // Travel
    { pattern: /booking\.com|booking\b/i, summary: "Booking.com", category: "Travel", priority: 70 },
    { pattern: /airbnb/i, summary: "Airbnb", category: "Travel", priority: 70 },
    { pattern: /\bhotel\b/i, summary: "Hotel", category: "Travel", priority: 65 },
    { pattern: /expedia|skyscanner|edreams|logitravel|tripadvisor/i, summary: "Travel Booking", category: "Travel", priority: 65 },
    { pattern: /vueling|ryanair|iberia|air\s*europa|easyjet|klm|lufthansa|british\s*airways|tap\b/i, summary: "Airline", category: "Travel", priority: 65 },

    // Transport
    { pattern: /uber(?!\s*eats)/i, summary: "Uber", category: "Transport", priority: 60 },
    { pattern: /cabify/i, summary: "Cabify", category: "Transport", priority: 60 },
    { pattern: /bolt/i, summary: "Bolt", category: "Transport", priority: 60 },
    { pattern: /lyft/i, summary: "Lyft", category: "Transport", priority: 60 },
    { pattern: /renfe|rodalies|cercanias/i, summary: "Renfe", category: "Transport", priority: 55 },
    { pattern: /metro|tmb|emt\b|fgc|tranvia|tram\b/i, summary: "Public Transport", category: "Transport", priority: 55 },
    { pattern: /\balsa\b|avanza/i, summary: "Bus", category: "Transport", priority: 50 },
    { pattern: /parking|aparcamiento|peaje|autopista/i, summary: "Transport Fees", category: "Transport", priority: 50 },

    // Fuel (avoid clashing with utilities)
    { pattern: /repsol\s*(luz|electricidad|energia)/i, summary: "Repsol Energy", category: "Utilities", priority: 65 },
    { pattern: /repsol/i, summary: "Repsol", category: "Fuel", priority: 55 },
    { pattern: /cepsa|galp|bp\b|shell|petronor|gasolinera|combustible|gasoil|diesel/i, summary: "Fuel", category: "Fuel", priority: 55 },

    // Groceries (Spain/Europe)
    { pattern: /mercadona/i, summary: "Mercadona", category: "Groceries", priority: 70 },
    { pattern: /carrefour/i, summary: "Carrefour", category: "Groceries", priority: 70 },
    { pattern: /lidl/i, summary: "Lidl", category: "Groceries", priority: 70 },
    { pattern: /aldi/i, summary: "Aldi", category: "Groceries", priority: 70 },
    { pattern: /eroski/i, summary: "Eroski", category: "Groceries", priority: 70 },
    { pattern: /\bdia\b/i, summary: "DIA", category: "Groceries", priority: 70 },
    { pattern: /alcampo|hipercor|supercor|consum|bonpreu|condis|caprabo|ahorramas|froiz|gadis|hiperdino|coviran/i, summary: "Supermarket", category: "Groceries", priority: 65 },

    // Food delivery and restaurants
    { pattern: /ubereats|uber\s*eats/i, summary: "Uber Eats", category: "Restaurants", priority: 65 },
    { pattern: /glovo/i, summary: "Glovo", category: "Restaurants", priority: 65 },
    { pattern: /just\s*eat|justeat/i, summary: "Just Eat", category: "Restaurants", priority: 65 },
    { pattern: /deliveroo/i, summary: "Deliveroo", category: "Restaurants", priority: 65 },
    { pattern: /telepizza/i, summary: "Telepizza", category: "Restaurants", priority: 60 },
    { pattern: /dominos|pizza\s*hut/i, summary: "Pizza", category: "Restaurants", priority: 60 },
    { pattern: /mcdonalds|mcdonald/i, summary: "McDonalds", category: "Restaurants", priority: 60 },
    { pattern: /burger\s*king/i, summary: "Burger King", category: "Restaurants", priority: 60 },
    { pattern: /\bkfc\b/i, summary: "KFC", category: "Restaurants", priority: 60 },
    { pattern: /subway/i, summary: "Subway", category: "Restaurants", priority: 60 },
    { pattern: /starbucks/i, summary: "Starbucks", category: "Restaurants", priority: 60 },
    { pattern: /vips|goiko|100\s*montaditos/i, summary: "Restaurant", category: "Restaurants", priority: 55 },

    // Shopping
    { pattern: /apple\s*store|apple\s*retail/i, summary: "Apple Store", category: "Shopping", priority: 45 },
    { pattern: /amazon|amzn/i, summary: "Amazon", category: "Shopping", priority: 40 },
    { pattern: /zalando|aliexpress|ebay|shein|asos/i, summary: "Online Retailer", category: "Shopping", priority: 40 },
    { pattern: /zara|bershka|pull\s*&\s*bear|stradivarius|mango|massimo\s*dutti|oysho|lefties|primark|uniqlo|h&m|hm\b/i, summary: "Fashion Retailer", category: "Shopping", priority: 40 },
    { pattern: /fnac|mediamarkt|media\s*markt|pccomponentes/i, summary: "Electronics Retailer", category: "Shopping", priority: 40 },
    { pattern: /ikea|leroy\s*merlin|decathlon/i, summary: "Retail Store", category: "Shopping", priority: 40 },
    { pattern: /el\s*corte\s*ingles|corte\s*ingles/i, summary: "El Corte Ingles", category: "Shopping", priority: 40 },

    // Utilities and telecom
    { pattern: /movistar|telefonica|vodafone|orange|yoigo|digi\b|masmovil|jazztel|o2\b|pepephone|lowi|simyo/i, summary: "Telecom", category: "Utilities", priority: 50 },
    { pattern: /iberdrola|endesa|naturgy|gas\s*natural|edp\b|holaluz|agbar|canal\s*isabel|aigues/i, summary: "Utilities", category: "Utilities", priority: 50 },

    // Insurance
    { pattern: /mapfre|axa\b|allianz|sanitas|asisa|dkv|mutua|seguro|poliza/i, summary: "Insurance", category: "Insurance", priority: 45 },

    // Transfers and income
    { pattern: /bizum/i, summary: "Bizum", category: "Transfers", priority: 45 },
    { pattern: /paypal/i, summary: "PayPal", category: "Transfers", priority: 45 },
    { pattern: /transferencia|transfer\b|traspaso|sepa/i, summary: "Bank Transfer", category: "Transfers", priority: 40 },
    { pattern: /nomina|salario|sueldo|payroll|pension|prestacion|sepe/i, summary: "Income", category: "Income", priority: 40 },

    // Refunds and fees
    { pattern: /refund|reembolso|devolucion|abono|reintegro|chargeback/i, summary: "Refund", category: "Refunds", priority: 45 },
    { pattern: /hacienda|agencia\s*tributaria|seguridad\s*social|impuesto|iva|tasa|multa|comision|gastos\s*bancarios|cuota/i, summary: "Fees", category: "Taxes & Fees", priority: 35 },
];

const CATEGORY_RULES: CategoryRule[] = [
    { category: "Refunds", amountSign: "any", patterns: [/refund|reembolso|devolucion|abono|reintegro|chargeback/] },
    { category: "Transfers", amountSign: "any", patterns: [/bizum|transferencia|transfer\b|traspaso|sepa|paypal/] },
    { category: "Income", amountSign: "positive", patterns: [/nomina|salario|sueldo|payroll|pension|prestacion|sepe|dividend|interest|salary/] },
    { category: "Taxes & Fees", amountSign: "any", patterns: [/hacienda|agencia\s*tributaria|seguridad\s*social|impuesto|iva|tasa|multa|comision|cuota\s+(tarjeta|mantenimiento)|gastos\s*bancarios|fee\b/] },
    { category: "Rent", amountSign: "negative", patterns: [/alquiler|rent\b|arrendamiento/] },
    { category: "Mortgage", amountSign: "negative", patterns: [/hipoteca|mortgage|prestamo\s*hipotecario/] },
    { category: "Utilities", amountSign: "negative", patterns: [/electric|luz|energia|gas\s*natural|agua|water|internet|fibra|telefono|movistar|vodafone|orange|yoigo|digi\b|masmovil|jazztel|o2\b|pepephone|lowi|simyo|iberdrola|endesa|naturgy|edp\b|holaluz|agbar|canal\s*isabel|aigues/] },
    { category: "Insurance", amountSign: "negative", patterns: [/insurance|seguro|poliza|mapfre|axa\b|allianz|sanitas|asisa|dkv|mutua/] },
    { category: "Subscriptions", amountSign: "negative", patterns: [/subscription|suscrip|netflix|spotify|disney|hbo\s*max|hbomax|prime\s*video|amazon\s*prime|apple\.com\/bill|itunes|app\s*store|google\s*play|youtube\s*premium|adobe|dropbox|microsoft\s*365|office\s*365/] },
    { category: "Fuel", amountSign: "negative", patterns: [/repsol|cepsa|galp|bp\b|shell|petronor|gasolinera|combustible|gasoil|diesel/] },
    { category: "Groceries", amountSign: "negative", patterns: [/supermercad|grocer|mercadona|carrefour|lidl|aldi|eroski|alcampo|hipercor|supercor|consum|bonpreu|condis|caprabo|ahorramas|froiz|gadis|hiperdino|coviran|spar|kaufland|auchan/] },
    { category: "Restaurants", amountSign: "negative", patterns: [/restaurante|restaurant|comida|cafe|pizza|burger|kebab|ubereats|glovo|just\s*eat|deliveroo|telepizza|dominos|kfc\b|mcdonald|starbucks|vips|goiko|subway/] },
    { category: "Bars", amountSign: "negative", patterns: [/\bbar\b|cerveceria|pub|discoteca|club|copas/] },
    { category: "Shopping", amountSign: "negative", patterns: [/shopping|amazon|amzn|zalando|aliexpress|ebay|shein|asos|zara|bershka|pull\s*&\s*bear|stradivarius|mango|primark|h&m|hm\b|uniqlo|fnac|mediamarkt|pccomponentes|ikea|leroy\s*merlin|decathlon|corte\s*ingles/] },
    { category: "Travel", amountSign: "negative", patterns: [/booking|airbnb|hotel|vueling|ryanair|iberia|air\s*europa|easyjet|expedia|skyscanner|tripadvisor|logitravel|edreams/] },
    { category: "Transport", amountSign: "negative", patterns: [/uber|cabify|bolt|lyft|taxi|renfe|rodalies|cercanias|metro|emt\b|tmb\b|fgc|tram|tranvia|autobus|bus\b|alsa|avanza|parking|aparcamiento|peaje|autopista|blablacar/] },
    { category: "Entertainment", amountSign: "negative", patterns: [/cine|teatro|concierto|festival|ticketmaster|entradas|museo|eventbrite|ocio/] },
    { category: "Education", amountSign: "negative", patterns: [/universidad|colegio|escuela|academia|curso|tuition|udemy|coursera|edx|masterclass/] },
    { category: "Health & Fitness", amountSign: "negative", patterns: [/farmacia|pharmacy|hospital|clinica|clinic|dentist|dentista|optica|medic|fisioterapia|gimnasio|gym|fitness|crossfit/] },
    { category: "Services", amountSign: "negative", patterns: [/peluqueria|barberia|lavanderia|limpieza|reparacion|taller|mecanico|servicio\s*tecnico|gestoria|notaria|abogado|consultoria|mudanza|pintura/] },
    { category: "Savings", amountSign: "any", patterns: [/ahorro|savings|plan\s*ahorro/] },
];

const CATEGORY_KEYWORDS: Record<string, CategoryKeywordRule> = {
    "Groceries": {
        amountSign: "negative",
        keywords: ["grocery", "groceries", "supermarket", "supermercado", "market", "mercado", "alimentacion", "fruteria", "carniceria", "panaderia", "bakery", "deli", "hiper"]
    },
    "Restaurants": {
        amountSign: "negative",
        keywords: ["restaurant", "restaurante", "cafe", "cafeteria", "bistro", "tapas", "diner", "burger", "pizzeria", "pizza", "kebab", "sushi", "delivery", "takeaway", "comida"]
    },
    "Bars": {
        amountSign: "negative",
        keywords: ["bar", "pub", "club", "discoteca", "copas", "cocktail", "cerveceria"]
    },
    "Rent": { amountSign: "negative", keywords: ["rent", "alquiler", "arrendamiento"] },
    "Mortgage": { amountSign: "negative", keywords: ["mortgage", "hipoteca"] },
    "Utilities": {
        amountSign: "negative",
        keywords: ["utility", "utilities", "electric", "electricity", "luz", "energia", "gas", "agua", "water", "internet", "fibra", "telefono", "phone", "telecom", "broadband"]
    },
    "Fuel": { amountSign: "negative", keywords: ["fuel", "gasolinera", "gasolina", "diesel", "gasoil", "petrol"] },
    "Transport": {
        amountSign: "negative",
        keywords: ["transport", "transit", "bus", "train", "metro", "subway", "taxi", "cab", "parking", "toll", "peaje", "autopista", "uber", "cabify", "bolt", "lyft", "renfe"]
    },
    "Insurance": { amountSign: "negative", keywords: ["insurance", "seguro", "poliza", "policy"] },
    "Taxes & Fees": {
        amountSign: "negative",
        keywords: ["tax", "taxes", "impuesto", "iva", "fee", "fees", "comision", "commission", "multa", "cuota", "charge", "maintenance"]
    },
    "Shopping": {
        amountSign: "negative",
        keywords: ["shopping", "tienda", "store", "retail", "clothes", "clothing", "ropa", "shoes", "calzado", "electronics", "electronica", "gadget", "furniture", "muebles", "home", "hogar"]
    },
    "Entertainment": {
        amountSign: "negative",
        keywords: ["entertainment", "ocio", "cinema", "cine", "concert", "concierto", "festival", "event", "ticket", "gaming", "game"]
    },
    "Education": {
        amountSign: "negative",
        keywords: ["education", "escuela", "colegio", "universidad", "curso", "class", "tuition", "academia"]
    },
    "Health & Fitness": {
        amountSign: "negative",
        keywords: ["health", "medical", "doctor", "hospital", "clinic", "clinica", "dentist", "dentista", "pharmacy", "farmacia", "gym", "gimnasio", "fitness"]
    },
    "Subscriptions": {
        amountSign: "negative",
        keywords: ["subscription", "suscripcion", "membership", "streaming", "prime", "netflix", "spotify", "disney"]
    },
    "Travel": {
        amountSign: "negative",
        keywords: ["travel", "hotel", "hostel", "vuelo", "flight", "airline", "aeropuerto", "booking", "airbnb", "trip", "vacation", "turismo"]
    },
    "Services": {
        amountSign: "negative",
        keywords: ["service", "servicio", "repair", "reparacion", "taller", "peluqueria", "barberia", "laundry", "lavanderia", "cleaning", "limpieza", "plumber", "electricista", "gestoria", "notaria", "abogado", "consultoria"]
    },
    "Income": {
        amountSign: "positive",
        keywords: ["salary", "payroll", "nomina", "sueldo", "income", "pension", "dividend", "interest"]
    },
    "Transfers": {
        amountSign: "any",
        keywords: ["transfer", "transferencia", "bizum", "paypal", "sepa", "p2p", "trf"]
    },
    "Refunds": {
        amountSign: "positive",
        keywords: ["refund", "reembolso", "devolucion", "chargeback", "reintegro"]
    },
    "Savings": {
        amountSign: "any",
        keywords: ["savings", "ahorro", "deposit", "investment", "fondo"]
    },
};

function normalizeText(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function normalizeCategoryName(value: string | null | undefined, categories: string[]): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const lowered = trimmed.toLowerCase();
    const alias = CATEGORY_ALIASES[lowered] ?? trimmed;
    const direct = categories.find((c) => c.toLowerCase() === alias.toLowerCase());
    return direct ?? null;
}

function matchMerchantPattern(description: string): MerchantPattern | null {
    let best: MerchantPattern | null = null;
    for (const pattern of MERCHANT_PATTERNS) {
        if (!pattern.pattern.test(description)) continue;
        if (!best || (pattern.priority ?? 0) > (best.priority ?? 0)) {
            best = pattern;
        }
    }
    return best;
}
/**
 * Extract a clean summary from a raw bank transaction description
 */
function extractSummary(description: string): string {
    const desc = description.trim();
    const normalized = normalizeText(desc);

    // Check against known merchant patterns first
    const matched = matchMerchantPattern(normalized);
    if (matched) {
        return matched.summary;
    }

    // Remove common prefixes (Spanish bank formats)
    let cleaned = desc
        .replace(/^(COMPRA|PAGO|RECIBO|TRANSFERENCIA|BIZUM|CARGO|ABONO|INGRESO|TARJETA|TPV|POS)\s+/i, "")
        .replace(/^(EN|DE|A|DESDE|HACIA)\s+/i, "")
        .replace(/^WWW\./i, "")
        .replace(/^HTTP[S]?:\/\//i, "");

    // Remove trailing reference numbers and codes
    cleaned = cleaned
        .replace(/\s+[A-Z0-9]{6,}$/i, "")  // Remove trailing codes like "CW4WE8Q35"
        .replace(/\s+REF[:\s]*[\w-]+$/i, "")  // Remove REF: XXX
        .replace(/\s+Nº?\s*RECIBO[\s:\d]+$/i, "")  // Remove receipt numbers
        .replace(/\s+DEL\s+\d{2}\d{2}\d{4}\s+AL\s+\d{2}\d{2}\d{4}/i, "")  // Remove date ranges
        .replace(/\s+NIF[:\s]*[A-Z0-9]+$/i, "")  // Remove NIF
        .replace(/\s+POLIZA[:\s]*[\d]+$/i, "")  // Remove policy numbers
        .replace(/\s+\*+\d+$/i, "")  // Remove masked card numbers
        .replace(/\s+\d{2}\/\d{2}\/\d{2,4}$/i, "")  // Remove trailing dates
        .replace(/\s+\d+[.,]\d{2}\s*(EUR|€)?$/i, "");  // Remove amounts

    cleaned = cleaned.replace(/\b(TPV|POS|TARJETA|CARD)\b/gi, "").trim();

    // Extract domain name if it looks like a website
    const domainMatch = cleaned.match(/([a-zA-Z0-9-]+)\.(com|es|net|org|eu|co)/i);
    if (domainMatch) {
        cleaned = domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1).toLowerCase();
    }

    // Clean up and capitalize
    cleaned = cleaned
        .replace(/[*]+/g, " ")  // Replace asterisks with spaces
        .replace(/\s+/g, " ")   // Normalize whitespace
        .trim();

    // If still too long or messy, take first meaningful words
    if (cleaned.length > 30) {
        const words = cleaned.split(" ").slice(0, 3);
        cleaned = words.join(" ");
    }

    // Capitalize first letter of each word for clean display
    if (cleaned.length > 0) {
        cleaned = cleaned
            .toLowerCase()
            .split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }

    return cleaned || description.substring(0, 30);
}

/**
 * Get category suggestion from known patterns
 */
function getCategoryFromPattern(description: string, categories: string[]): string | null {
    const normalized = normalizeText(description);
    const matched = matchMerchantPattern(normalized);
    if (!matched || !matched.category) return null;
    return normalizeCategoryName(matched.category, categories);
}

function getCategoryFromKeywords(description: string, categories: string[], amount: number): string | null {
    const normalized = normalizeText(description);
    let bestMatch: { category: string; score: number } | null = null;

    for (const [category, rule] of Object.entries(CATEGORY_KEYWORDS)) {
        const normalizedCategory = normalizeCategoryName(category, categories);
        if (!normalizedCategory) continue;

        const sign = rule.amountSign ?? "any";
        if (sign === "positive" && amount <= 0) continue;
        if (sign === "negative" && amount >= 0) continue;

        let score = 0;
        for (const keyword of rule.keywords) {
            if (!keyword) continue;
            if (normalized.includes(keyword)) {
                score += keyword.length >= 6 ? 2 : 1;
            }
        }

        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { category: normalizedCategory, score };
        }
    }

    return bestMatch ? bestMatch.category : null;
}

export async function categoriseTransactions(
    rows: TxRow[],
    customCategories?: string[],
    options?: { preferencesByKey?: Map<string, string> }
): Promise<TxRow[]> {
    if (rows.length === 0) return rows;

    // Use custom categories if provided, otherwise use defaults
    const CATEGORIES = customCategories && customCategories.length > 0 ? customCategories : DEFAULT_CATEGORIES;
    const preferencesByKey = options?.preferencesByKey;

    // First pass: extract summaries and apply pattern-based categories
    const enrichedRows = rows.map((r, idx) => {
        const summary = extractSummary(r.description);
        const preferenceKey = normalizeTransactionDescriptionKey(r.description);
        const preferenceCategory = preferenceKey ? preferencesByKey?.get(preferenceKey) ?? null : null;
        const normalizedPreference = preferenceCategory ? normalizeCategoryName(preferenceCategory, CATEGORIES) : null;
        const patternCategory = getCategoryFromPattern(r.description, CATEGORIES);
        return {
            ...r,
            summary,
            _preferenceCategory: normalizedPreference,
            _patternCategory: patternCategory,
            _index: idx
        };
    });

    // Find rows that still need AI categorization (no pattern match)
    const rowsNeedingAI = enrichedRows.filter(r => !r._preferenceCategory && !r._patternCategory);

    // Build a compact payload for the LLM (only rows without pattern-based categories)
    const items = rowsNeedingAI.map(r => ({
        index: r._index,
        description: r.summary || r.description.substring(0, 100),
        raw: r.description.substring(0, 200),
        amount: r.amount
    }));

    let aiMapping = new Map<number, string>();

    if (items.length > 0) {
        const categoryGuidance = CATEGORIES
            .map((category) => `- ${category}: ${CATEGORY_DEFINITIONS[category] ?? "Use the closest match based on the name."}`)
            .join("\n");
        const spainHints = [
            "Spain hints:",
            "- Groceries: Mercadona, Carrefour, DIA, Lidl, Aldi, Eroski, Alcampo, Consum.",
            "- Fuel: Repsol, Cepsa, Galp, BP, Shell.",
            "- Utilities/Telecom: Iberdrola, Endesa, Naturgy, Movistar, Vodafone, Orange, Yoigo, MasMovil.",
            "- Transport: Renfe, Metro, EMT, TMB, Cabify, Bolt.",
            "- Travel: Vueling, Iberia, Ryanair, Air Europa, Booking, Airbnb.",
            "- Food delivery: Glovo, Just Eat, Deliveroo, Uber Eats."
        ].join("\n");
        const globalHints = [
            "Global hints:",
            "- Amazon, Zara, Ikea, MediaMarkt -> Shopping.",
            "- Netflix, Spotify, Disney Plus -> Subscriptions.",
            "- Uber, Lyft, Bolt -> Transport."
        ].join("\n");
        const systemPrompt = `
You are an expert financial transaction classifier. Analyze each transaction and assign the most appropriate category.

AVAILABLE CATEGORIES:
${CATEGORIES.join(", ")}

CATEGORY GUIDANCE:
${categoryGuidance}

INPUT FIELDS:
- description: cleaned merchant summary
- raw: original transaction description
- amount: signed amount

CLASSIFICATION RULES:
1. Use ONLY the categories listed above.
2. Positive amounts are usually Income, Transfers, or Refunds.
3. Use Refunds for chargebacks, reversals, and refunds.
4. Use Transfers for bank transfers, P2P, Bizum, and PayPal.
5. Use Subscriptions for streaming or digital SaaS; Utilities for electricity, water, gas, internet, and phone.
6. Use Fuel for gas stations; Transport for taxis/ride-hailing/public transit/parking/tolls; Travel for flights/hotels/booking.
7. Bars are for bars/pubs/nightlife; Restaurants for restaurants/cafes/delivery.
8. If ambiguous, choose the closest category; use Other only if there is truly no signal.

${spainHints}

${globalHints}

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "map": [
    {"index": 0, "category": "CategoryName"},
    {"index": 1, "category": "CategoryName"}
  ]
}

You MUST include ALL ${items.length} transactions. Each entry needs:
- "index": exact index from input (0, 1, 2, ...)
- "category": one of the exact categories listed above
`.trim();

        const userPrompt = JSON.stringify(items);

        // Using OpenRouter API
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        const SITE_URL = getSiteUrl();
        const SITE_NAME = getSiteName();

        if (!OPENROUTER_API_KEY) {
            console.warn("[AI] No OpenRouter API key found, using pattern-based categorization only");
        } else {
            try {
                const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                        "HTTP-Referer": SITE_URL,
                        "X-Title": SITE_NAME,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: AI_CATEGORY_MODEL,
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt }
                        ],
                        temperature: 0.1,
                        response_format: { type: "json_object" },
                        provider: {
                            sort: "throughput"
                        }
                    })
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    console.error("[AI] OpenRouter API error:", res.status, errorText.substring(0, 200));
                } else {
                    const json = await res.json();
                    const content = json.choices[0]?.message?.content;

                    if (content) {
                        try {
                            const parsed = JSON.parse(content);
                            const mapping = parsed.map || parsed.categories || parsed.results ||
                                (Array.isArray(parsed) ? parsed : []);

                            for (const m of mapping) {
                                const idx = m.index ?? m.i ?? m.id;
                                const cat = m.category ?? m.cat ?? m.c;

                                if (typeof idx === "number" && typeof cat === "string") {
                                    const normalizedCat = normalizeCategoryName(cat, CATEGORIES);
                                    if (normalizedCat) {
                                        aiMapping.set(idx, normalizedCat);
                                    }
                                }
                            }
                            console.log(`[AI] Successfully categorized ${aiMapping.size}/${items.length} transactions`);
                        } catch (parseErr) {
                            console.error("[AI] Failed to parse response:", parseErr);
                        }
                    }
                }
            } catch (fetchErr) {
                console.error("[AI] Fetch error:", fetchErr);
            }
        }
    }

    // Helper function for fallback categorization
    const applyFallbackCategory = (row: TxRow): string => {
        const desc = normalizeText(row.description);
        for (const rule of CATEGORY_RULES) {
            if (rule.amountSign === "positive" && row.amount <= 0) continue;
            if (rule.amountSign === "negative" && row.amount >= 0) continue;
            if (rule.patterns.some((pattern) => pattern.test(desc))) {
                const normalized = normalizeCategoryName(rule.category, CATEGORIES);
                if (normalized) return normalized;
            }
        }
        const keywordCategory = getCategoryFromKeywords(`${row.summary ?? ""} ${row.description}`, CATEGORIES, row.amount);
        if (keywordCategory) return keywordCategory;
        return normalizeCategoryName("Other", CATEGORIES) || CATEGORIES[CATEGORIES.length - 1] || "Other";
    };

    // Combine all categorization sources
    const result = enrichedRows.map(r => {
        // Priority: 1) Pattern match, 2) AI, 3) Fallback
        const hasPreference = Boolean(r._preferenceCategory);
        const hasPattern = Boolean(r._patternCategory);
        const aiCategory = aiMapping.get(r._index);
        let category = r._preferenceCategory || r._patternCategory || aiCategory || applyFallbackCategory(r);
        let normalizedCategory = normalizeCategoryName(category, CATEGORIES);

        if (!hasPreference && !hasPattern && normalizedCategory === "Other") {
            const keywordCategory = getCategoryFromKeywords(`${r.summary ?? ""} ${r.description}`, CATEGORIES, r.amount);
            if (keywordCategory) {
                normalizedCategory = keywordCategory;
                category = keywordCategory;
            }
        }

        if (normalizedCategory) {
            category = normalizedCategory;
        } else {
            category = applyFallbackCategory(r);
        }

        return {
            date: r.date,
            time: r.time ?? null,
            description: r.description,
            amount: r.amount,
            balance: r.balance,
            category,
            summary: r.summary
        } as TxRow;
    });

    const categorizedCount = result.filter(r => r.category && r.category !== "Other").length;
    const preferenceMatched = enrichedRows.filter(r => r._preferenceCategory).length;
    const patternMatched = enrichedRows.filter(r => r._patternCategory).length;
    console.log(`[AI] Final: ${categorizedCount}/${result.length} categorized (${preferenceMatched} from preferences, ${patternMatched} from patterns, ${aiMapping.size} from AI)`);

    return result;
}
