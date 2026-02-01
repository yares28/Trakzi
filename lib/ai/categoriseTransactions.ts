// lib/ai/categoriseTransactions.ts
import { TxRow } from "../types/transactions";
import { DEFAULT_CATEGORIES as MAIN_DEFAULT_CATEGORIES } from '@/lib/categories';
import { normalizeTransactionDescriptionKey } from "@/lib/transactions/transaction-category-preferences";
import { detectLanguage, detectLanguageFromSamples, SupportedLocale, type LanguageDetection } from "@/lib/language/language-detection";
import { logAiCategoryFeedbackBatch } from "@/lib/ai/ai-category-feedback";
import { trackGeminiCall } from "@/lib/ai/posthog-gemini";

// Default categories - synced with lib/categories.ts
// These are the categories the AI can assign to transactions
const DEFAULT_CATEGORIES = MAIN_DEFAULT_CATEGORIES;
const AI_CATEGORY_MODEL = "gemini-2.0-flash";

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
    "Restaurants": "Restaurants and sit-down dining.",
    "Coffee": "Coffee shops and cafe drinks.",
    "Bars": "Bars, pubs, and nightlife.",
    "Takeaway/Delivery": "Food delivery and takeaway orders.",
    "Rent": "Housing rent payments.",
    "Mortgage": "Mortgage and home loan payments.",
    "Home Maintenance": "Home repairs, trades, and maintenance services.",
    "Home Supplies": "Hardware and home improvement supplies.",
    "Electricity": "Electric power bills.",
    "Gas": "Natural gas utility bills.",
    "Water": "Water utility bills.",
    "Internet": "Internet and broadband service.",
    "Mobile": "Mobile phone plans and service.",
    "Fuel": "Gas stations and vehicle fuel.",
    "Public Transport": "Bus, metro, train, and public transit fares.",
    "Taxi/Rideshare": "Taxis and ride-hailing services.",
    "Parking/Tolls": "Parking fees and road tolls.",
    "Car Maintenance": "Vehicle maintenance, repairs, and inspections.",
    "Pharmacy": "Pharmacies and drugstores.",
    "Medical/Healthcare": "Clinics, hospitals, doctors, medical and healthcare services.",
    "Fitness": "Gyms, fitness, and sports memberships.",
    "Clothing": "Clothing, shoes, and apparel.",
    "Electronics": "Electronics, gadgets, and tech retail.",
    "Home Goods": "Furniture, home goods, and decor.",
    "Gifts": "Gifts, presents, and celebrations.",
    "Bank Fees": "Bank fees, card fees, and account charges.",
    "Taxes & Fees": "Taxes, government fees, and penalties.",
    "Insurance": "Insurance premiums (health, auto, home).",
    "Salary": "Salary or payroll income.",
    "Bonus": "Bonus or incentive income.",
    "Freelance": "Freelance, contractor, or invoice income.",
    "Refunds": "Refunds, reimbursements, and chargebacks.",
    "Savings": "Transfers to savings.",
    "Investments": "Investments, brokerage, or portfolio transfers.",
    "Transfers": "Bank transfers, P2P, Bizum, and PayPal.",
    "Entertainment": "Cinema, concerts, events, and leisure.",
    "Education": "Schools, courses, tuition, and learning.",
    "Subscriptions": "Digital subscriptions and recurring services.",
    "Travel": "Flights, hotels, and travel agencies.",
    "Services": "Professional services, repairs, hairdressers, and laundry.",
    "Utilities": "Electricity, water, gas, internet, and phone services.",
    "Transport": "Taxis, ride-hailing, public transport, parking, and tolls.",
    "Shopping": "Retail purchases and household goods.",
    "Health & Fitness": "Pharmacy, clinics, medical, gyms, and fitness.",
    "Income": "Salary, pension, benefits, interest, or dividends.",
    "Refunds": "Refunds, chargebacks, and reversals.",
    "Other": "Only when ambiguous or unknown."
};

const CATEGORY_ALIASES: Record<string, string> = {
    "taxes": "Taxes & Fees",
    "tax": "Taxes & Fees",
    "taxes & fees": "Taxes & Fees",
    "taxes and fees": "Taxes & Fees",
    "bank fees": "Bank Fees",
    "bank fee": "Bank Fees",
    "insurance": "Insurance",
    "groceries": "Groceries",
    "grocery": "Groceries",
    "restaurants": "Restaurants",
    "restaurant": "Restaurants",
    "dining": "Restaurants",
    "coffee": "Coffee",
    "cafe": "Coffee",
    "cafeteria": "Coffee",
    "bars": "Bars",
    "bar": "Bars",
    "takeaway": "Takeaway/Delivery",
    "delivery": "Takeaway/Delivery",
    "food delivery": "Takeaway/Delivery",
    "takeout": "Takeaway/Delivery",
    "take out": "Takeaway/Delivery",
    "rent": "Rent",
    "mortgage": "Mortgage",
    "home maintenance": "Home Maintenance",
    "home repair": "Home Maintenance",
    "home supplies": "Home Supplies",
    "home improvement": "Home Supplies",
    "electricity": "Electricity",
    "gas": "Gas",
    "water": "Water",
    "internet": "Internet",
    "mobile": "Mobile",
    "cell": "Mobile",
    "public transport": "Public Transport",
    "public transportation": "Public Transport",
    "transit": "Public Transport",
    "public transit": "Public Transport",
    "taxi": "Taxi/Rideshare",
    "rideshare": "Taxi/Rideshare",
    "ride share": "Taxi/Rideshare",
    "parking": "Parking/Tolls",
    "toll": "Parking/Tolls",
    "tolls": "Parking/Tolls",
    "car maintenance": "Car Maintenance",
    "auto repair": "Car Maintenance",
    "pharmacy": "Pharmacy",
    "medical": "Medical/Healthcare",
    "healthcare": "Medical/Healthcare",
    "fitness": "Fitness",
    "clothing": "Clothing",
    "apparel": "Clothing",
    "electronics": "Electronics",
    "home goods": "Home Goods",
    "furniture": "Home Goods",
    "gifts": "Gifts",
    "gift": "Gifts",
    "salary": "Salary",
    "bonus": "Bonus",
    "freelance": "Freelance",
    "refunds": "Refunds",
    "refund": "Refunds",
    "reimbursement": "Refunds",
    "reimbursements": "Refunds",
    "savings": "Savings",
    "saving": "Savings",
    "investments": "Investments",
    "investment": "Investments",
    "transfers": "Transfers",
    "transfer": "Transfers",
    "entertainment": "Entertainment",
    "education": "Education",
    "subscriptions": "Subscriptions",
    "subscription": "Subscriptions",
    "travel": "Travel",
    "services": "Services",
    "service": "Services",
    "other": "Other"
};

const CATEGORY_STOPWORDS = new Set([
    "and",
    "or",
    "of",
    "the",
    "y",
    "e",
    "de",
    "del",
    "la",
    "las",
    "el",
    "los",
    "por",
    "para",
    "con",
    "da",
    "do",
    "das",
    "dos",
    "du",
    "des",
    "le",
    "les",
    "au",
    "aux",
    "et",
    "en",
    "und",
    "oder",
    "mit",
    "von",
    "der",
    "die",
    "das",
    "den",
    "dem",
    "im",
    "zum",
    "zur",
    "ein",
    "eine",
    "van",
    "het",
    "een",
]);

type CategoryResolver = (value: string | null | undefined) => string | null;

function normalizeCategoryKey(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/ß/g, "ss")
        .replace(/æ/g, "ae")
        .replace(/œ/g, "oe")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function stripCategoryStopwords(key: string): string {
    if (!key) return "";
    return key
        .split(" ")
        .filter((token) => token && !CATEGORY_STOPWORDS.has(token))
        .join(" ");
}

function singularizeToken(token: string): string {
    if (token.endsWith("ies") && token.length > 3) return `${token.slice(0, -3)}y`;
    if (token.endsWith("es") && token.length > 3) return token.slice(0, -2);
    if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
    return token;
}

function singularizeKey(key: string): string {
    if (!key) return "";
    return key
        .split(" ")
        .map((token) => singularizeToken(token))
        .join(" ");
}

function buildCategoryKeys(value: string): string[] {
    const base = normalizeCategoryKey(value);
    if (!base) return [];
    const noStop = stripCategoryStopwords(base);
    const singular = singularizeKey(base);
    const singularNoStop = singularizeKey(noStop);
    const keys = new Set<string>([base, noStop, singular, singularNoStop].filter(Boolean));
    return Array.from(keys);
}

function createCategoryResolver(categories: string[]): CategoryResolver {
    const normalizedToCategory = new Map<string, string>();
    const addKey = (key: string, category: string) => {
        if (!key) return;
        if (!normalizedToCategory.has(key)) {
            normalizedToCategory.set(key, category);
        }
    };
    const addKeysForLabel = (label: string, category: string) => {
        buildCategoryKeys(label).forEach((key) => addKey(key, category));
    };

    categories.forEach((category) => addKeysForLabel(category, category));
    Object.entries(CATEGORY_ALIASES).forEach(([alias, canonical]) => {
        if (!categories.some((category) => category.toLowerCase() === canonical.toLowerCase())) return;
        addKeysForLabel(alias, canonical);
    });

    return (value: string | null | undefined) => {
        if (!value || typeof value !== "string") return null;
        const key = normalizeCategoryKey(value);
        if (!key) return null;
        const direct = normalizedToCategory.get(key);
        if (direct) return direct;
        const noStop = stripCategoryStopwords(key);
        const noStopMatch = normalizedToCategory.get(noStop);
        if (noStopMatch) return noStopMatch;
        const singular = singularizeKey(key);
        const singularMatch = normalizedToCategory.get(singular);
        if (singularMatch) return singularMatch;
        const singularNoStop = singularizeKey(noStop);
        return normalizedToCategory.get(singularNoStop) ?? null;
    };
}

const MERCHANT_PATTERNS: MerchantPattern[] = [
    // Subscriptions (specific)
    { pattern: /amazon\s*prime|prime\s*video/i, summary: "Amazon Prime", category: "Subscriptions", priority: 90 },
    { pattern: /netflix/i, summary: "Netflix", category: "Subscriptions", priority: 85 },
    { pattern: /spotify/i, summary: "Spotify", category: "Subscriptions", priority: 85 },
    { pattern: /disney\+|disney\s*plus/i, summary: "Disney Plus", category: "Subscriptions", priority: 85 },
    { pattern: /hbo\s*max|hbomax/i, summary: "HBO Max", category: "Subscriptions", priority: 85 },
    { pattern: /youtube\s*premium/i, summary: "YouTube Premium", category: "Subscriptions", priority: 80 },
    { pattern: /google\s*play/i, summary: "Google Play", category: "Subscriptions", priority: 80 },
    { pattern: /apple\.com\/bill|apple\s*com\s*bill|itunes|app\s*store/i, summary: "Apple Services", category: "Subscriptions", priority: 85 },
    { pattern: /apple\s*music|apple\s*tv|apple\s*one|apple\s*arcade|icloud|apple\s*services|apple\s*play/i, summary: "Apple Services", category: "Subscriptions", priority: 85 },
    { pattern: /open\s*ai|openai|chatgpt/i, summary: "OpenAI", category: "Subscriptions", priority: 80 },
    { pattern: /adobe|canva|dropbox|notion|microsoft\s*365|office\s*365/i, summary: "Digital Subscription", category: "Subscriptions", priority: 75 },

    // Travel
    { pattern: /booking\.com|booking\b/i, summary: "Booking.com", category: "Travel", priority: 70 },
    { pattern: /airbnb/i, summary: "Airbnb", category: "Travel", priority: 70 },
    { pattern: /\bhotel\b/i, summary: "Hotel", category: "Travel", priority: 65 },
    { pattern: /expedia|skyscanner|edreams|logitravel|tripadvisor/i, summary: "Travel Booking", category: "Travel", priority: 65 },
    { pattern: /vueling|ryanair|iberia|air\s*europa|easyjet|klm|lufthansa|british\s*airways|tap\b/i, summary: "Airline", category: "Travel", priority: 65 },

    // Transport
    { pattern: /uber(?![\s_-]*eats)/i, summary: "Uber", category: "Taxi/Rideshare", priority: 60 },
    { pattern: /cabify/i, summary: "Cabify", category: "Taxi/Rideshare", priority: 60 },
    { pattern: /bolt/i, summary: "Bolt", category: "Taxi/Rideshare", priority: 60 },
    { pattern: /lyft/i, summary: "Lyft", category: "Taxi/Rideshare", priority: 60 },
    { pattern: /renfe|rodalies|cercanias/i, summary: "Renfe", category: "Public Transport", priority: 55 },
    { pattern: /metro|tmb|emt\b|fgc|tranvia|tram\b/i, summary: "Public Transport", category: "Public Transport", priority: 55 },
    { pattern: /\balsa\b|avanza/i, summary: "Bus", category: "Public Transport", priority: 50 },
    { pattern: /parking|aparcamiento|peaje|autopista/i, summary: "Parking/Tolls", category: "Parking/Tolls", priority: 50 },

    // Fuel (avoid clashing with utilities)
    { pattern: /repsol\s*(luz|electricidad|energia)/i, summary: "Repsol Energy", category: "Electricity", priority: 65 },
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
    { pattern: /uber[\s_-]*eats|ubereats/i, summary: "Uber Eats", category: "Takeaway/Delivery", priority: 65 },
    { pattern: /glovo/i, summary: "Glovo", category: "Takeaway/Delivery", priority: 65 },
    { pattern: /just\s*eat|justeat/i, summary: "Just Eat", category: "Takeaway/Delivery", priority: 65 },
    { pattern: /deliveroo/i, summary: "Deliveroo", category: "Takeaway/Delivery", priority: 65 },
    { pattern: /telepizza/i, summary: "Telepizza", category: "Takeaway/Delivery", priority: 60 },
    { pattern: /domino\s*s|domino\s*pizza|dominos|pizza\s*hut/i, summary: "Pizza", category: "Takeaway/Delivery", priority: 60 },
    { pattern: /mcdonalds|mcdonald/i, summary: "McDonalds", category: "Restaurants", priority: 60 },
    { pattern: /burger\s*king/i, summary: "Burger King", category: "Restaurants", priority: 60 },
    { pattern: /\bkfc\b/i, summary: "KFC", category: "Restaurants", priority: 60 },
    { pattern: /subway/i, summary: "Subway", category: "Restaurants", priority: 60 },
    { pattern: /starbucks/i, summary: "Starbucks", category: "Coffee", priority: 60 },
    { pattern: /vips|goiko|100\s*montaditos/i, summary: "Restaurant", category: "Restaurants", priority: 55 },

    // Shopping
    { pattern: /apple\s*store|apple\s*retail|apple\s*shop|store\.apple|apple\s*com\s*shop/i, summary: "Apple Store", category: "Electronics", priority: 45 },
    { pattern: /amazon|amzn/i, summary: "Amazon", category: "Shopping", priority: 40 },
    { pattern: /zalando|aliexpress|ebay|shein|asos/i, summary: "Online Retailer", category: "Clothing", priority: 40 },
    { pattern: /zara|bershka|pull\s*(?:and|&)?\s*bear|stradivarius|mango|massimo\s*dutti|oysho|lefties|primark|uniqlo|h\s*&\s*m|h\s*m|hm\b/i, summary: "Fashion Retailer", category: "Clothing", priority: 40 },
    { pattern: /fnac|mediamarkt|media\s*markt|pccomponentes/i, summary: "Electronics Retailer", category: "Electronics", priority: 40 },
    { pattern: /ikea/i, summary: "Ikea", category: "Home Goods", priority: 40 },
    { pattern: /leroy\s*merlin|bricomart|brico\s*depot/i, summary: "Home Supplies", category: "Home Supplies", priority: 40 },
    { pattern: /decathlon/i, summary: "Decathlon", category: "Clothing", priority: 40 },
    { pattern: /el\s*corte\s*ingles|corte\s*ingles/i, summary: "El Corte Ingles", category: "Home Goods", priority: 40 },

    // Utilities and telecom
    { pattern: /\b(movil|mobile|cell|telefono|linea)\b/i, summary: "Mobile", category: "Mobile", priority: 55 },
    { pattern: /movistar|telefonica|vodafone|orange|yoigo|digi\b|masmovil|jazztel|o2\b|pepephone|lowi|simyo/i, summary: "Telecom", category: "Internet", priority: 50 },
    { pattern: /iberdrola|endesa|edp\b|holaluz|repsol\s*(luz|electricidad|energia)/i, summary: "Electricity", category: "Electricity", priority: 50 },
    { pattern: /gas\s*natural|naturgy/i, summary: "Gas Utility", category: "Gas", priority: 50 },
    { pattern: /agbar|canal\s*isabel|aigues/i, summary: "Water Utility", category: "Water", priority: 50 },

    // Insurance
    { pattern: /mapfre|axa\b|allianz|sanitas|asisa|dkv|mutua|seguro|poliza/i, summary: "Insurance", category: "Insurance", priority: 45 },

    // Transfers and income
    { pattern: /bizum/i, summary: "Bizum", category: "Transfers", priority: 45 },
    { pattern: /paypal/i, summary: "PayPal", category: "Transfers", priority: 45 },
    { pattern: /revolut/i, summary: "Revolut", category: "Transfers", priority: 45 },
    { pattern: /transferencia|transfer\b|traspaso|sepa/i, summary: "Bank Transfer", category: "Transfers", priority: 40 },
    { pattern: /nomina|salario|sueldo|payroll|pension|prestacion|sepe/i, summary: "Income", category: "Income", priority: 40 },

    // Refunds and fees
    { pattern: /refund|reembolso|devolucion|abono|reintegro|chargeback/i, summary: "Refund", category: "Refunds", priority: 45 },
    { pattern: /hacienda|agencia\s*tributaria|seguridad\s*social|impuesto|iva|tasa|multa|comision|gastos\s*bancarios|cuota/i, summary: "Fees", category: "Taxes & Fees", priority: 35 },
];

const CATEGORY_RULES: CategoryRule[] = [
    { category: "Refunds", amountSign: "any", patterns: [/refund|reembolso|devolucion|abono|reintegro|chargeback|reimburse/] },
    {
        category: "Transfers", amountSign: "any", patterns: [
            /bizum|transferencia|transfer\b|traspaso|sepa|paypal|p2p/,
            /\btransfer\s+(to|from)\b/,
            /\btrf\b|\bxfer\b/,
            /\bwire\b|\bach\b/,
            /\bzelle\b|\bvenmo\b|\bcash\s*app\b/,
            /\brevolut\b/,
        ]
    },
    { category: "Salary", amountSign: "positive", patterns: [/nomina|salario|sueldo|payroll|salary|wage/] },
    { category: "Bonus", amountSign: "positive", patterns: [/bonus|incentive|incentivo/] },
    { category: "Freelance", amountSign: "positive", patterns: [/freelance|invoice|factura|honorarios|autonomo/] },
    { category: "Income", amountSign: "positive", patterns: [/pension|prestacion|sepe|dividend|interest|benefit/] },
    { category: "Bank Fees", amountSign: "negative", patterns: [/comision|fee\b|fees\b|bank\s*fee|cuota\s+(tarjeta|mantenimiento)|gastos\s*bancarios|maintenance\s*fee/] },
    { category: "Taxes & Fees", amountSign: "any", patterns: [/hacienda|agencia\s*tributaria|seguridad\s*social|impuesto|iva|tasa|multa/] },
    { category: "Insurance", amountSign: "negative", patterns: [/insurance|seguro|poliza|mapfre|axa\b|allianz|sanitas|asisa|dkv|mutua/] },
    { category: "Rent", amountSign: "negative", patterns: [/alquiler|rent\b|arrendamiento/] },
    { category: "Mortgage", amountSign: "negative", patterns: [/hipoteca|mortgage|prestamo\s*hipotecario/] },
    { category: "Electricity", amountSign: "negative", patterns: [/electric|electricity|luz|energia|iberdrola|endesa|edp\b|holaluz|repsol\s*(luz|electricidad|energia)/] },
    { category: "Gas", amountSign: "negative", patterns: [/gas\s*natural|natural\s*gas|naturgy/] },
    { category: "Water", amountSign: "negative", patterns: [/agua|water|agbar|aigues|canal\s*isabel/] },
    { category: "Internet", amountSign: "negative", patterns: [/internet|fibra|broadband|wifi|adsl/] },
    { category: "Mobile", amountSign: "negative", patterns: [/movil|mobile|cell|telefono|phone|linea/] },
    { category: "Utilities", amountSign: "negative", patterns: [/electric|luz|energia|gas\s*natural|agua|water|internet|fibra|telefono|movistar|vodafone|orange|yoigo|digi\b|masmovil|jazztel|o2\b|pepephone|lowi|simyo|iberdrola|endesa|naturgy|edp\b|holaluz|agbar|canal\s*isabel|aigues/] },
    { category: "Fuel", amountSign: "negative", patterns: [/repsol|cepsa|galp|bp\b|shell|petronor|gasolinera|combustible|gasoil|diesel|gasolina/] },
    { category: "Public Transport", amountSign: "negative", patterns: [/renfe|rodalies|cercanias|metro|emt\b|tmb\b|fgc|tram|tranvia|autobus|bus\b|alsa|avanza|rail/] },
    { category: "Taxi/Rideshare", amountSign: "negative", patterns: [/uber(?![\s_-]*eats)|cabify|bolt|lyft|taxi|rideshare/] },
    { category: "Parking/Tolls", amountSign: "negative", patterns: [/parking|aparcamiento|peaje|toll|autopista/] },
    { category: "Car Maintenance", amountSign: "negative", patterns: [/taller|mecanico|mecanica|itv|revision|car\s*service|oil\s*change|neumatico|tire/] },
    { category: "Transport", amountSign: "negative", patterns: [/renfe|rodalies|cercanias|metro|emt\b|tmb\b|fgc|tram|tranvia|autobus|bus\b|alsa|avanza|parking|aparcamiento|peaje|autopista|blablacar/] },
    { category: "Groceries", amountSign: "negative", patterns: [/supermercad|grocer|mercadona|carrefour|lidl|aldi|eroski|alcampo|hipercor|supercor|consum|bonpreu|condis|caprabo|ahorramas|froiz|gadis|hiperdino|coviran|spar|kaufland|auchan/] },
    { category: "Restaurants", amountSign: "negative", patterns: [/restaurante|restaurant|comida|diner|bistro|tapas|vips|goiko|100\s*montaditos/] },
    { category: "Coffee", amountSign: "negative", patterns: [/coffee|cafe|cafeteria|starbucks|espresso/] },
    { category: "Takeaway/Delivery", amountSign: "negative", patterns: [/delivery|takeaway|uber[\s_-]*eats|ubereats|glovo|just\s*eat|deliveroo|telepizza|domino\s*s|domino\s*pizza|dominos|pizza\s*hut/] },
    { category: "Bars", amountSign: "negative", patterns: [/\bbar\b|cerveceria|pub|discoteca|club|copas/] },
    { category: "Clothing", amountSign: "negative", patterns: [/clothing|ropa|calzado|shoes|zara|bershka|pull\s*(?:and|&)?\s*bear|stradivarius|mango|primark|h\s*&\s*m|h\s*m|hm\b|uniqlo|oysho|lefties|decathlon/] },
    { category: "Electronics", amountSign: "negative", patterns: [/electronics|electronica|mediamarkt|media\s*markt|fnac|pccomponentes|apple\s*store|apple\s*shop|store\.apple|apple\s*com\s*shop/] },
    { category: "Home Goods", amountSign: "negative", patterns: [/home\s*goods|furniture|muebles|ikea|corte\s*ingles|decor/] },
    { category: "Home Maintenance", amountSign: "negative", patterns: [/home\s*repair|reparacion|mantenimiento|plumber|fontanero|electricista|pintura|reforma/] },
    { category: "Home Supplies", amountSign: "negative", patterns: [/ferreteria|hardware|leroy\s*merlin|bricomart|brico\s*depot|home\s*improvement/] },
    { category: "Gifts", amountSign: "negative", patterns: [/gift|regalo|present/] },
    { category: "Shopping", amountSign: "negative", patterns: [/shopping|tienda|store|retail|amazon|amzn|zalando|aliexpress|ebay|shein|asos/] },
    { category: "Pharmacy", amountSign: "negative", patterns: [/farmacia|pharmacy|drugstore|botica/] },
    { category: "Medical/Healthcare", amountSign: "negative", patterns: [/hospital|clinic|clinica|dentist|dentista|doctor|medic|healthcare|health\s*care/] },
    { category: "Fitness", amountSign: "negative", patterns: [/gym|gimnasio|fitness|crossfit|pilates/] },
    { category: "Health & Fitness", amountSign: "negative", patterns: [/farmacia|pharmacy|hospital|clinica|clinic|dentist|dentista|gym|fitness|crossfit/] },
    { category: "Entertainment", amountSign: "negative", patterns: [/cine|teatro|concierto|festival|ticketmaster|entradas|museo|eventbrite|ocio/] },
    { category: "Education", amountSign: "negative", patterns: [/universidad|colegio|escuela|academia|curso|tuition|udemy|coursera|edx|masterclass/] },
    { category: "Subscriptions", amountSign: "negative", patterns: [/subscription|suscrip|netflix|spotify|disney|hbo\s*max|hbomax|prime\s*video|amazon\s*prime|apple\.com\/bill|apple\s*com\s*bill|itunes|app\s*store|google\s*play|youtube\s*premium|adobe|dropbox|microsoft\s*365|office\s*365|apple\s*music|apple\s*tv|apple\s*one|apple\s*arcade|icloud|apple\s*services|apple\s*play|open\s*ai|openai|chatgpt/] },
    { category: "Travel", amountSign: "negative", patterns: [/booking|airbnb|hotel|flight|airline|vueling|ryanair|iberia|air\s*europa|easyjet|expedia|skyscanner|tripadvisor|logitravel|edreams/] },
    { category: "Services", amountSign: "negative", patterns: [/peluqueria|barberia|lavanderia|limpieza|servicio\s*tecnico|gestoria|notaria|abogado|consultoria|mudanza/] },
    { category: "Savings", amountSign: "any", patterns: [/ahorro|savings|plan\s*ahorro/] },
    { category: "Investments", amountSign: "any", patterns: [/investment|invest|broker|acciones|bolsa|crypto|fondo/] },
];

const CATEGORY_CONFLICT_PRIORITIES: Record<string, number> = {
    "Takeaway/Delivery": 90,
    "Restaurants": 80,
    "Coffee": 70,
    "Bars": 60,
    "Groceries": 50,
};

const FOOD_CONFLICT_CATEGORIES = new Set(Object.keys(CATEGORY_CONFLICT_PRIORITIES));

function pickConflictWinner(matches: Array<{ category: string; score: number }>): string {
    let best = matches[0];
    let bestWeighted = best.score + (CATEGORY_CONFLICT_PRIORITIES[best.category] ?? 0) / 100;
    for (let i = 1; i < matches.length; i += 1) {
        const candidate = matches[i];
        const weighted = candidate.score + (CATEGORY_CONFLICT_PRIORITIES[candidate.category] ?? 0) / 100;
        if (weighted > bestWeighted) {
            best = candidate;
            bestWeighted = weighted;
        }
    }
    return best.category;
}

const CATEGORY_KEYWORDS: Record<string, CategoryKeywordRule> = {
    "Groceries": {
        amountSign: "negative",
        keywords: ["grocery", "groceries", "supermarket", "supermercado", "market", "mercado", "alimentacion", "fruteria", "carniceria", "panaderia", "bakery", "deli", "hiper"]
    },
    "Restaurants": {
        amountSign: "negative",
        keywords: ["restaurant", "restaurante", "bistro", "tapas", "diner", "burger", "pizzeria", "pizza", "kebab", "sushi", "comida"]
    },
    "Coffee": {
        amountSign: "negative",
        keywords: ["coffee", "cafe", "cafeteria", "espresso", "latte", "starbucks"]
    },
    "Bars": {
        amountSign: "negative",
        keywords: ["bar", "pub", "club", "discoteca", "copas", "cocktail", "cerveceria"]
    },
    "Takeaway/Delivery": {
        amountSign: "negative",
        keywords: ["delivery", "takeaway", "ubereats", "uber eats", "glovo", "just eat", "justeat", "deliveroo", "to go", "telepizza", "dominos", "domino s", "domino pizza", "pizza hut"]
    },
    "Rent": { amountSign: "negative", keywords: ["rent", "alquiler", "arrendamiento"] },
    "Mortgage": { amountSign: "negative", keywords: ["mortgage", "hipoteca"] },
    "Home Maintenance": {
        amountSign: "negative",
        keywords: ["home repair", "repair", "reparacion", "mantenimiento", "plumber", "fontanero", "electricista", "pintura", "reforma"]
    },
    "Home Supplies": {
        amountSign: "negative",
        keywords: ["hardware", "ferreteria", "home improvement", "leroy merlin", "bricomart", "brico depot"]
    },
    "Electricity": {
        amountSign: "negative",
        keywords: ["electricity", "electric", "luz", "energia", "iberdrola", "endesa", "edp", "holaluz"]
    },
    "Gas": {
        amountSign: "negative",
        keywords: ["gas natural", "natural gas", "naturgy"]
    },
    "Water": {
        amountSign: "negative",
        keywords: ["water", "agua", "agbar", "aigues", "canal isabel"]
    },
    "Internet": {
        amountSign: "negative",
        keywords: ["internet", "fibra", "broadband", "wifi", "adsl"]
    },
    "Mobile": {
        amountSign: "negative",
        keywords: ["mobile", "movil", "cell", "telefono", "phone", "linea"]
    },
    "Fuel": { amountSign: "negative", keywords: ["fuel", "gasolinera", "gasolina", "diesel", "gasoil", "petrol"] },
    "Public Transport": {
        amountSign: "negative",
        keywords: ["metro", "bus", "train", "tram", "subway", "renfe", "cercanias", "rodalies"]
    },
    "Taxi/Rideshare": {
        amountSign: "negative",
        keywords: ["taxi", "uber", "cabify", "bolt", "lyft"]
    },
    "Parking/Tolls": {
        amountSign: "negative",
        keywords: ["parking", "aparcamiento", "toll", "peaje", "autopista"]
    },
    "Car Maintenance": {
        amountSign: "negative",
        keywords: ["car maintenance", "taller", "mecanico", "itv", "revision", "oil change", "neumatico"]
    },
    "Pharmacy": { amountSign: "negative", keywords: ["pharmacy", "farmacia", "drugstore", "botica"] },
    "Medical/Healthcare": { amountSign: "negative", keywords: ["medical", "healthcare", "clinic", "clinica", "hospital", "doctor", "dentist"] },
    "Fitness": { amountSign: "negative", keywords: ["gym", "gimnasio", "fitness", "crossfit", "pilates"] },
    "Clothing": {
        amountSign: "negative",
        keywords: ["clothing", "ropa", "shoes", "calzado", "zara", "bershka", "pull and bear", "pull bear", "stradivarius", "mango", "primark", "h m", "hm", "uniqlo", "oysho", "lefties", "decathlon"]
    },
    "Electronics": {
        amountSign: "negative",
        keywords: ["electronics", "electronica", "gadget", "mediamarkt", "fnac", "apple store", "apple shop", "apple retail", "store apple", "pccomponentes"]
    },
    "Home Goods": {
        amountSign: "negative",
        keywords: ["home goods", "furniture", "muebles", "ikea", "decor", "hogar", "corte ingles"]
    },
    "Gifts": { amountSign: "negative", keywords: ["gift", "gifts", "regalo", "present"] },
    "Bank Fees": {
        amountSign: "negative",
        keywords: ["bank fee", "bank fees", "fee", "fees", "comision", "gastos bancarios", "cuota"]
    },
    "Taxes & Fees": {
        amountSign: "negative",
        keywords: ["tax", "taxes", "impuesto", "iva", "multa", "tasa"]
    },
    "Insurance": { amountSign: "negative", keywords: ["insurance", "seguro", "poliza", "policy"] },
    "Salary": { amountSign: "positive", keywords: ["salary", "payroll", "nomina", "sueldo"] },
    "Bonus": { amountSign: "positive", keywords: ["bonus", "incentive", "incentivo"] },
    "Freelance": { amountSign: "positive", keywords: ["freelance", "invoice", "factura", "honorarios"] },
    "Refunds": {
        amountSign: "any",
        keywords: ["refund", "reembolso", "devolucion", "chargeback", "reintegro", "reimburse"]
    },
    "Savings": { amountSign: "any", keywords: ["savings", "ahorro", "deposit"] },
    "Investments": { amountSign: "any", keywords: ["investment", "invest", "broker", "acciones", "bolsa", "crypto", "fondo"] },
    "Transfers": {
        amountSign: "any",
        keywords: ["transfer", "transfer to", "transfer from", "transferencia", "bizum", "paypal", "sepa", "p2p", "trf", "xfer", "wire", "ach", "zelle", "venmo", "cash app", "revolut", "sent", "received", "incoming", "outgoing"]
    },
    "Entertainment": {
        amountSign: "negative",
        keywords: ["entertainment", "ocio", "cinema", "cine", "concert", "concierto", "festival", "event", "ticket", "gaming", "game"]
    },
    "Education": {
        amountSign: "negative",
        keywords: ["education", "escuela", "colegio", "universidad", "curso", "class", "tuition", "academia"]
    },
    "Subscriptions": {
        amountSign: "negative",
        keywords: ["subscription", "suscripcion", "membership", "streaming", "prime", "netflix", "spotify", "disney", "hbo", "prime video", "apple music", "apple tv", "apple one", "apple arcade", "icloud", "itunes", "app store", "apple services", "openai", "open ai", "chatgpt", "google play", "youtube premium"]
    },
    "Travel": {
        amountSign: "negative",
        keywords: ["travel", "hotel", "hostel", "vuelo", "flight", "airline", "aeropuerto", "booking", "airbnb", "trip", "vacation", "turismo"]
    },
    "Services": {
        amountSign: "negative",
        keywords: ["service", "servicio", "hairdresser", "peluqueria", "barberia", "laundry", "lavanderia", "cleaning", "limpieza", "consulting", "consultoria", "lawyer", "abogado", "notaria", "gestoria"]
    },
    "Utilities": {
        amountSign: "negative",
        keywords: ["utility", "utilities", "electric", "electricity", "luz", "energia", "gas", "agua", "water", "internet", "fibra", "telefono", "phone", "telecom", "broadband"]
    },
    "Transport": {
        amountSign: "negative",
        keywords: ["transport", "transit", "bus", "train", "metro", "subway", "parking", "toll", "peaje", "autopista", "renfe"]
    },
    "Shopping": {
        amountSign: "negative",
        keywords: ["shopping", "tienda", "store", "retail", "amazon", "amzn", "electronics", "electronica", "gadget", "furniture", "muebles", "home", "hogar"]
    },
    "Health & Fitness": {
        amountSign: "negative",
        keywords: ["health", "medical", "doctor", "hospital", "clinic", "clinica", "dentist", "dentista", "pharmacy", "farmacia", "gym", "gimnasio", "fitness"]
    },
    "Income": {
        amountSign: "positive",
        keywords: ["salary", "payroll", "nomina", "sueldo", "income", "pension", "dividend", "interest"]
    },
    "Refunds": {
        amountSign: "any",
        keywords: ["refund", "reembolso", "devolucion", "chargeback", "reintegro"]
    },
};

const LOCALE_CATEGORY_KEYWORDS: Partial<Record<SupportedLocale, Record<string, CategoryKeywordRule>>> = {
    pt: {
        "Groceries": { keywords: ["supermercado", "mercearia", "mercado", "hipermercado", "talho", "padaria"] },
        "Restaurants": { keywords: ["restaurante", "lanchonete", "pastelaria", "churrascaria"] },
        "Coffee": { keywords: ["cafe"] },
        "Takeaway/Delivery": { keywords: ["entrega", "delivery", "takeaway", "para levar"] },
        "Fuel": { keywords: ["gasolina", "combustivel", "gasoleo"] },
        "Public Transport": { keywords: ["metro", "autocarro", "comboio", "onibus"] },
        "Taxi/Rideshare": { keywords: ["taxi", "uber"] },
        "Parking/Tolls": { keywords: ["parque", "estacionamento", "portagem"] },
        "Electricity": { keywords: ["eletricidade", "luz"] },
        "Water": { keywords: ["agua"] },
        "Internet": { keywords: ["internet", "fibra", "banda larga"] },
        "Mobile": { keywords: ["movel", "telemovel", "celular"] },
        "Pharmacy": { keywords: ["farmacia"] },
        "Medical/Healthcare": { keywords: ["clinica", "medico", "hospital"] },
        "Fitness": { keywords: ["ginasio"] },
        "Subscriptions": { keywords: ["assinatura"] },
        "Salary": { keywords: ["salario", "ordenado"] },
        "Transfers": { keywords: ["transferencia", "pix"] },
        "Clothing": { keywords: ["roupa", "vestuario"] },
        "Electronics": { keywords: ["eletronica"] },
        "Home Goods": { keywords: ["moveis"] },
        "Bank Fees": { keywords: ["comissao", "tarifa"] },
        "Shopping": { keywords: ["loja", "magazine"] },
    },
    fr: {
        "Groceries": { keywords: ["supermarche", "epicerie", "boulangerie", "boucherie"] },
        "Restaurants": { keywords: ["restaurant", "brasserie", "bistrot", "cafe"] },
        "Coffee": { keywords: ["cafe"] },
        "Takeaway/Delivery": { keywords: ["livraison", "a emporter", "emporter"] },
        "Fuel": { keywords: ["essence", "carburant"] },
        "Public Transport": { keywords: ["metro", "tram", "bus", "train"] },
        "Taxi/Rideshare": { keywords: ["taxi", "uber"] },
        "Parking/Tolls": { keywords: ["parking", "peage"] },
        "Electricity": { keywords: ["electricite"] },
        "Gas": { keywords: ["gaz"] },
        "Water": { keywords: ["eau"] },
        "Internet": { keywords: ["internet", "fibre", "adsl"] },
        "Mobile": { keywords: ["mobile", "telephone"] },
        "Pharmacy": { keywords: ["pharmacie"] },
        "Medical/Healthcare": { keywords: ["clinique", "medecin", "hopital"] },
        "Fitness": { keywords: ["fitness"] },
        "Subscriptions": { keywords: ["abonnement"] },
        "Salary": { keywords: ["salaire"] },
        "Transfers": { keywords: ["virement"] },
        "Clothing": { keywords: ["vetement", "mode"] },
        "Electronics": { keywords: ["electronique"] },
        "Home Goods": { keywords: ["meuble"] },
        "Bank Fees": { keywords: ["frais", "commission"] },
        "Shopping": { keywords: ["magasin"] },
    },
    it: {
        "Groceries": { keywords: ["supermercato", "alimentari", "panetteria", "macelleria"] },
        "Restaurants": { keywords: ["ristorante", "trattoria", "pizzeria", "bar"] },
        "Coffee": { keywords: ["caffe"] },
        "Takeaway/Delivery": { keywords: ["consegna", "delivery", "asporto"] },
        "Fuel": { keywords: ["benzina", "carburante"] },
        "Public Transport": { keywords: ["metro", "tram", "bus", "treno"] },
        "Taxi/Rideshare": { keywords: ["taxi", "uber"] },
        "Parking/Tolls": { keywords: ["parcheggio", "pedaggio"] },
        "Electricity": { keywords: ["elettricita"] },
        "Gas": { keywords: ["gas"] },
        "Water": { keywords: ["acqua"] },
        "Internet": { keywords: ["internet", "fibra", "adsl"] },
        "Mobile": { keywords: ["mobile", "telefono"] },
        "Pharmacy": { keywords: ["farmacia"] },
        "Medical/Healthcare": { keywords: ["clinica", "medico", "ospedale"] },
        "Fitness": { keywords: ["palestra", "fitness"] },
        "Subscriptions": { keywords: ["abbonamento"] },
        "Salary": { keywords: ["stipendio"] },
        "Transfers": { keywords: ["bonifico"] },
        "Clothing": { keywords: ["abbigliamento", "vestiti"] },
        "Electronics": { keywords: ["elettronica"] },
        "Home Goods": { keywords: ["mobili"] },
        "Bank Fees": { keywords: ["commissione", "spese"] },
        "Shopping": { keywords: ["negozio"] },
    },
    de: {
        "Groceries": { keywords: ["supermarkt", "lebensmittel", "markt", "backerei", "baeckerei"] },
        "Restaurants": { keywords: ["restaurant", "gaststatte", "imbiss", "bistro"] },
        "Coffee": { keywords: ["kaffee", "cafe"] },
        "Takeaway/Delivery": { keywords: ["lieferung", "lieferservice", "takeaway", "mitnehmen", "to go"] },
        "Fuel": { keywords: ["tankstelle", "benzin", "diesel"] },
        "Public Transport": { keywords: ["bahn", "zug", "u bahn", "s bahn", "bus", "tram"] },
        "Taxi/Rideshare": { keywords: ["taxi", "uber"] },
        "Parking/Tolls": { keywords: ["parkhaus", "parken", "maut"] },
        "Electricity": { keywords: ["strom", "elektrizitat"] },
        "Gas": { keywords: ["gas"] },
        "Water": { keywords: ["wasser"] },
        "Internet": { keywords: ["internet", "dsl", "glasfaser"] },
        "Mobile": { keywords: ["handy", "mobil", "telefon"] },
        "Pharmacy": { keywords: ["apotheke"] },
        "Medical/Healthcare": { keywords: ["klinik", "arzt", "krankenhaus"] },
        "Fitness": { keywords: ["fitness", "studio", "gym"] },
        "Subscriptions": { keywords: ["abo", "abonnement"] },
        "Salary": { keywords: ["gehalt", "lohn"] },
        "Transfers": { keywords: ["uberweisung", "sepa"] },
        "Clothing": { keywords: ["kleidung", "mode"] },
        "Electronics": { keywords: ["elektronik"] },
        "Home Goods": { keywords: ["mobel"] },
        "Bank Fees": { keywords: ["gebuhr", "gebuehr"] },
        "Shopping": { keywords: ["laden", "einkauf"] },
    },
    nl: {
        "Groceries": { keywords: ["supermarkt", "markt", "winkel", "kruideniers"] },
        "Restaurants": { keywords: ["restaurant", "eetcafe", "bistro"] },
        "Coffee": { keywords: ["koffie", "cafe"] },
        "Takeaway/Delivery": { keywords: ["bezorg", "afhaal", "takeaway", "thuisbezorgd"] },
        "Fuel": { keywords: ["tankstation", "benzine", "diesel"] },
        "Public Transport": { keywords: ["trein", "tram", "metro", "bus"] },
        "Taxi/Rideshare": { keywords: ["taxi", "uber"] },
        "Parking/Tolls": { keywords: ["parkeren", "parkeer", "tol"] },
        "Electricity": { keywords: ["stroom", "elektriciteit"] },
        "Gas": { keywords: ["gas"] },
        "Water": { keywords: ["water"] },
        "Internet": { keywords: ["internet", "glasvezel"] },
        "Mobile": { keywords: ["mobiel", "telefoon"] },
        "Pharmacy": { keywords: ["apotheek"] },
        "Medical/Healthcare": { keywords: ["kliniek", "ziekenhuis", "arts"] },
        "Fitness": { keywords: ["sportschool", "fitness"] },
        "Subscriptions": { keywords: ["abonnement"] },
        "Salary": { keywords: ["salaris", "loon"] },
        "Transfers": { keywords: ["overboeking", "tikkie"] },
        "Clothing": { keywords: ["kleding", "mode"] },
        "Electronics": { keywords: ["elektronica"] },
        "Home Goods": { keywords: ["meubels"] },
        "Bank Fees": { keywords: ["kosten", "tarief", "commissie"] },
        "Shopping": { keywords: ["winkel", "webshop"] },
    },
    ca: {
        "Groceries": { keywords: ["supermercat", "mercat", "alimentacio", "fruiteria"] },
        "Restaurants": { keywords: ["restaurant", "menjar", "tapes", "bistro"] },
        "Coffee": { keywords: ["cafe"] },
        "Takeaway/Delivery": { keywords: ["emportar", "delivery", "domicili"] },
        "Fuel": { keywords: ["benzina", "gasolinera", "diesel"] },
        "Public Transport": { keywords: ["metro", "tren", "tram", "bus"] },
        "Taxi/Rideshare": { keywords: ["taxi", "uber"] },
        "Parking/Tolls": { keywords: ["aparcament", "peatge"] },
        "Electricity": { keywords: ["llum", "electricitat"] },
        "Gas": { keywords: ["gas"] },
        "Water": { keywords: ["aigua"] },
        "Internet": { keywords: ["internet", "fibra"] },
        "Mobile": { keywords: ["mobil", "telefon"] },
        "Pharmacy": { keywords: ["farmacia"] },
        "Medical/Healthcare": { keywords: ["hospital", "clinica", "metge"] },
        "Fitness": { keywords: ["gimnas", "fitness"] },
        "Subscriptions": { keywords: ["subscripcio"] },
        "Salary": { keywords: ["sou", "salari"] },
        "Transfers": { keywords: ["transferencia", "bizum"] },
        "Clothing": { keywords: ["roba"] },
        "Electronics": { keywords: ["electronica"] },
        "Home Goods": { keywords: ["mobles"] },
        "Bank Fees": { keywords: ["comissio", "tarifa"] },
        "Shopping": { keywords: ["botiga"] },
    },
};

function mergeKeywordRules(
    base: Record<string, CategoryKeywordRule>,
    extras?: Record<string, CategoryKeywordRule>
): Record<string, CategoryKeywordRule> {
    if (!extras) return base;
    const merged: Record<string, CategoryKeywordRule> = {};
    const categories = new Set([...Object.keys(base), ...Object.keys(extras)]);

    categories.forEach((category) => {
        const baseRule = base[category];
        const extraRule = extras[category];
        const keywords = new Set<string>();
        if (baseRule?.keywords) {
            baseRule.keywords.forEach((keyword) => keywords.add(keyword));
        }
        if (extraRule?.keywords) {
            extraRule.keywords.forEach((keyword) => keywords.add(keyword));
        }
        merged[category] = {
            amountSign: extraRule?.amountSign ?? baseRule?.amountSign,
            keywords: Array.from(keywords),
        };
    });

    return merged;
}

const PREFERENCE_TOKEN_BLOCKLIST = new Set([
    "compra",
    "pago",
    "payment",
    "purchase",
    "tarjeta",
    "card",
    "credito",
    "debito",
    "debit",
    "credit",
    "transfer",
    "transferencia",
    "bizum",
    "pos",
    "tpv",
    "online",
    "web",
    "merchant",
    "transaction",
    "movimiento",
    "operacion",
    "cargo",
    "abono",
    "ingreso",
    "comision",
    "fee",
]);

function buildPreferenceKeywordRules(
    preferencesByKey: Map<string, string> | undefined,
    resolveCategory: CategoryResolver
): Record<string, CategoryKeywordRule> {
    if (!preferencesByKey || preferencesByKey.size === 0) return {};

    const tokensByCategory = new Map<string, Set<string>>();
    const MAX_KEYWORDS_PER_CATEGORY = 30;

    for (const [descriptionKey, categoryName] of preferencesByKey.entries()) {
        const normalizedCategory = resolveCategoryName(categoryName, resolveCategory);
        if (!normalizedCategory || normalizedCategory.toLowerCase() === "other") continue;

        const tokens = descriptionKey
            .split(" ")
            .map((token) => token.trim())
            .filter((token) => token.length >= 3)
            .filter((token) => !CATEGORY_STOPWORDS.has(token))
            .filter((token) => !PREFERENCE_TOKEN_BLOCKLIST.has(token))
            .filter((token) => !/^\d+$/.test(token));

        if (tokens.length === 0) continue;

        const set = tokensByCategory.get(normalizedCategory) ?? new Set<string>();
        for (const token of tokens) {
            if (set.size >= MAX_KEYWORDS_PER_CATEGORY) break;
            set.add(token);
        }
        tokensByCategory.set(normalizedCategory, set);
    }

    const rules: Record<string, CategoryKeywordRule> = {};
    tokensByCategory.forEach((tokens, category) => {
        if (tokens.size > 0) {
            rules[category] = { keywords: Array.from(tokens) };
        }
    });

    return rules;
}

function buildCustomCategoryKeywordRules(categories: string[]): Record<string, CategoryKeywordRule> {
    const rules: Record<string, CategoryKeywordRule> = {};

    for (const category of categories) {
        const normalized = normalizeCategoryKey(category);
        if (!normalized || normalized === "other") continue;
        const hasBaseRule = Object.keys(CATEGORY_KEYWORDS).some(
            (key) => key.toLowerCase() === category.toLowerCase()
        );
        if (hasBaseRule) continue;

        const tokens = normalized
            .split(" ")
            .map((token) => token.trim())
            .filter((token) => token.length >= 3 && !CATEGORY_STOPWORDS.has(token));

        if (tokens.length > 0) {
            rules[category] = { keywords: tokens };
        }
    }

    return rules;
}

function buildPromptGlossary(rules: Record<string, CategoryKeywordRule>): string {
    const MAX_KEYWORDS_PER_CATEGORY = 8;
    const MAX_CATEGORIES = 24;
    const entries = Object.entries(rules)
        .filter(([, rule]) => Array.isArray(rule.keywords) && rule.keywords.length > 0)
        .sort((a, b) => b[1].keywords.length - a[1].keywords.length)
        .slice(0, MAX_CATEGORIES);

    return entries
        .map(([category, rule]) => {
            const keywords = rule.keywords.slice(0, MAX_KEYWORDS_PER_CATEGORY);
            return `- ${category}: ${keywords.join(", ")}`;
        })
        .join("\n");
}

function getKeywordRulesForLocale(
    locale: SupportedLocale,
    customRules?: Record<string, CategoryKeywordRule>
): Record<string, CategoryKeywordRule> {
    const base = locale && locale !== "unknown"
        ? mergeKeywordRules(CATEGORY_KEYWORDS, LOCALE_CATEGORY_KEYWORDS[locale])
        : CATEGORY_KEYWORDS;
    return customRules ? mergeKeywordRules(base, customRules) : base;
}

function normalizeText(value: string): string {
    return value
        .normalize("NFD")
        .replace(/ß/g, "ss")
        .replace(/æ/g, "ae")
        .replace(/œ/g, "oe")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function normalizeKeywordText(value: string): string {
    return value
        .normalize("NFD")
        .replace(/ß/g, "ss")
        .replace(/æ/g, "ae")
        .replace(/œ/g, "oe")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function resolveCategoryName(value: string | null | undefined, resolver: CategoryResolver): string | null {
    return resolver(value);
}

function parseJsonPayload(content: string): any | null {
    if (!content) return null;
    try {
        return JSON.parse(content);
    } catch {
        const start = content.indexOf("{");
        const end = content.lastIndexOf("}");
        if (start >= 0 && end > start) {
            try {
                return JSON.parse(content.slice(start, end + 1));
            } catch {
                return null;
            }
        }
    }
    return null;
}

function extractAffordableTokens(errorText: string): number | null {
    if (!errorText) return null;
    const match = errorText.match(/can only afford\s+(\d+)/i);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
}

function matchMerchantPattern(description: string, alternate?: string): MerchantPattern | null {
    let best: MerchantPattern | null = null;
    for (const pattern of MERCHANT_PATTERNS) {
        const matchesPrimary = pattern.pattern.test(description);
        const matchesAlternate = alternate ? pattern.pattern.test(alternate) : false;
        if (!matchesPrimary && !matchesAlternate) continue;
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
    const normalizedKeyword = normalizeKeywordText(desc);

    // Check against known merchant patterns first
    const matched = matchMerchantPattern(normalized, normalizedKeyword);
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
function getCategoryFromPattern(description: string, resolveCategory: CategoryResolver): string | null {
    const normalized = normalizeText(description);
    const normalizedKeyword = normalizeKeywordText(description);
    const matched = matchMerchantPattern(normalized, normalizedKeyword);
    if (!matched || !matched.category) return null;
    return resolveCategoryName(matched.category, resolveCategory);
}

function getCategoryFromKeywords(
    description: string,
    amount: number,
    locale: SupportedLocale | undefined,
    resolveCategory: CategoryResolver,
    customRules?: Record<string, CategoryKeywordRule>
): { category: string; score: number } | null {
    const normalized = normalizeKeywordText(description);
    const keywordRules = getKeywordRulesForLocale(locale ?? "unknown", customRules);
    let bestMatch: { category: string; score: number; weightedScore: number } | null = null;

    for (const [category, rule] of Object.entries(keywordRules)) {
        const normalizedCategory = resolveCategoryName(category, resolveCategory);
        if (!normalizedCategory) continue;

        const sign = rule.amountSign ?? "any";
        if (sign === "positive" && amount <= 0) continue;
        if (sign === "negative" && amount >= 0) continue;

        let score = 0;
        for (const keyword of rule.keywords) {
            const normalizedKeyword = normalizeKeywordText(keyword);
            if (!normalizedKeyword) continue;
            if (normalized.includes(normalizedKeyword)) {
                score += normalizedKeyword.length >= 6 ? 2 : 1;
            }
        }

        if (score > 0) {
            const priorityBoost = (CATEGORY_CONFLICT_PRIORITIES[normalizedCategory] ?? 0) / 100;
            const weightedScore = score + priorityBoost;
            if (!bestMatch || weightedScore > bestMatch.weightedScore) {
                bestMatch = { category: normalizedCategory, score, weightedScore };
            }
        }
    }

    return bestMatch ? { category: bestMatch.category, score: bestMatch.score } : null;
}

export async function categoriseTransactions(
    rows: TxRow[],
    customCategories?: string[],
    options?: { preferencesByKey?: Map<string, string>; userId?: string }
): Promise<TxRow[]> {
    if (rows.length === 0) return rows;

    const sanitizedCustomCategories = Array.isArray(customCategories)
        ? customCategories
            .filter((category): category is string => typeof category === "string")
            .map((category) => category.trim())
            .filter((category) => category.length > 0)
        : [];

    // Use custom categories if provided, otherwise use defaults
    const CATEGORIES = sanitizedCustomCategories.length > 0 ? sanitizedCustomCategories : DEFAULT_CATEGORIES;
    const resolveCategory = createCategoryResolver(CATEGORIES);
    const preferencesByKey = options?.preferencesByKey;
    const preferenceKeywordRules = buildPreferenceKeywordRules(preferencesByKey, resolveCategory);
    const customKeywordRules = mergeKeywordRules(
        buildCustomCategoryKeywordRules(CATEGORIES),
        preferenceKeywordRules
    );
    const languageHint = detectLanguageFromSamples(rows.map((row) => row.description));
    const useGlobalLocale =
        languageHint.locale !== "unknown" &&
        languageHint.score >= 0.4 &&
        languageHint.confidence >= 0.1;
    const localeByIndex = new Map<number, SupportedLocale>();
    const localeSourceByIndex = new Map<number, LanguageDetection["source"]>();

    const getLocaleForRow = (row: TxRow, index: number): SupportedLocale => {
        if (useGlobalLocale) {
            localeSourceByIndex.set(index, languageHint.source ?? "unknown");
            return languageHint.locale;
        }
        if (localeByIndex.has(index)) {
            return localeByIndex.get(index) ?? "unknown";
        }
        const detection = detectLanguage(row.description, {
            minLength: 12,
            minScore: 0.3,
            minDelta: 0.08,
        });
        localeByIndex.set(index, detection.locale);
        localeSourceByIndex.set(index, detection.source ?? "unknown");
        return detection.locale;
    };

    const transportCategoryOverrides = new Set([
        "Transport",
        "Transportation",
        "Taxi/Rideshare",
        "Public Transport",
        "Parking/Tolls",
        "Car Maintenance",
    ]);

    // First pass: extract summaries and apply pattern-based categories
    const enrichedRows = rows.map((r, idx) => {
        const summary = extractSummary(r.description);
        const preferenceKey = normalizeTransactionDescriptionKey(r.description);
        const preferenceCategory = preferenceKey ? preferencesByKey?.get(preferenceKey) ?? null : null;
        const normalizedPreference = preferenceCategory ? resolveCategoryName(preferenceCategory, resolveCategory) : null;
        const patternCategory = getCategoryFromPattern(r.description, resolveCategory);
        const locale = getLocaleForRow(r, idx);
        const localeSource = localeSourceByIndex.get(idx) ?? languageHint.source ?? "unknown";
        const rawCategory = typeof r.category === "string" ? r.category.trim() : "";
        const rawCategoryKey = rawCategory.toLowerCase();
        const statementKeywordMatch = getCategoryFromKeywords(
            rawCategory,
            r.amount,
            locale,
            resolveCategory,
            customKeywordRules
        );
        let statementCategory =
            rawCategory && rawCategoryKey !== "other" && rawCategoryKey !== "uncategorized"
                ? resolveCategoryName(rawCategory, resolveCategory)
                ?? statementKeywordMatch?.category
                ?? null
                : null;
        if (
            statementCategory &&
            patternCategory === "Takeaway/Delivery" &&
            transportCategoryOverrides.has(statementCategory)
        ) {
            statementCategory = null;
        }
        return {
            ...r,
            summary,
            _preferenceCategory: normalizedPreference,
            _statementCategory: statementCategory,
            _patternCategory: patternCategory,
            _locale: locale,
            _localeSource: localeSource,
            _index: idx
        };
    });

    // Find rows that still need AI categorization (no preference/category match)
    const rowsNeedingAI = enrichedRows.filter(
        r => !r._preferenceCategory && !r._statementCategory && !r._patternCategory
    );
    const aiCandidates = rowsNeedingAI.filter((r) => {
        const keywordMatch = getCategoryFromKeywords(
            `${r.summary ?? ""} ${r.description}`,
            r.amount,
            r._locale,
            resolveCategory,
            customKeywordRules
        );
        return !keywordMatch;
    });

    // Build a compact payload for the LLM (only rows without pattern/keyword categories)
    const items = aiCandidates.map(r => ({
        index: r._index,
        description: r.summary || r.description.substring(0, 100),
        raw: r.description.substring(0, 200),
        amount: r.amount
    }));

    const MAX_AI_ITEMS = Math.max(0, Number(process.env.GEMINI_CATEGORY_MAX_ITEMS ?? "120"));
    const configuredBatchSize = Math.max(1, Number(process.env.GEMINI_CATEGORY_BATCH_SIZE ?? "60"));
    const AI_BATCH_SIZE = MAX_AI_ITEMS > 0 ? Math.min(configuredBatchSize, MAX_AI_ITEMS) : 0;
    const AI_MAX_TOKENS = Math.max(128, Number(process.env.GEMINI_CATEGORY_MAX_TOKENS ?? "700"));

    const aiItems = MAX_AI_ITEMS > 0 ? items.slice(0, MAX_AI_ITEMS) : [];
    if (items.length > aiItems.length) {
        console.warn(`[AI] Limiting AI categorization to ${aiItems.length}/${items.length} rows`);
    }

    const itemByIndex = new Map<number, { raw: string; description: string }>();
    if (options?.userId) {
        aiItems.forEach((item) => {
            itemByIndex.set(item.index, { raw: item.raw, description: item.description });
        });
    }

    let aiMapping = new Map<number, string>();
    const feedbackEntries: Array<{
        userId: string;
        scope: "transaction";
        inputText?: string | null;
        rawCategory?: string | null;
        normalizedCategory?: string | null;
        locale?: string | null;
    }> = [];
    const feedbackLimit = 40;

    if (aiItems.length > 0) {
        const categoryGuidance = CATEGORIES
            .map((category) => `- ${category}: ${CATEGORY_DEFINITIONS[category] ?? "Use the closest match based on the name."}`)
            .join("\n");
        const spainHints = [
            "Spain hints:",
            "- Groceries: Mercadona, Carrefour, DIA, Lidl, Aldi, Eroski, Alcampo, Consum.",
            "- Fuel: Repsol, Cepsa, Galp, BP, Shell.",
            "- Electricity/Gas: Iberdrola, Endesa, Naturgy, EDP, Holaluz.",
            "- Internet/Mobile: Movistar, Vodafone, Orange, Yoigo, MasMovil, Digi.",
            "- Public Transport: Renfe, Metro, EMT, TMB.",
            "- Taxi/Rideshare: Cabify, Bolt, Uber.",
            "- Travel: Vueling, Iberia, Ryanair, Air Europa, Booking, Airbnb.",
            "- Takeaway/Delivery: Glovo, Just Eat, Deliveroo, Uber Eats."
        ].join("\n");
        const globalHints = [
            "Global hints:",
            "- Amazon -> Shopping; Ikea -> Home Goods.",
            "- Zara, H&M, Pull and Bear, Decathlon -> Clothing.",
            "- MediaMarkt, Apple Store -> Electronics.",
            "- Netflix, Spotify, Disney Plus, Apple Music, iCloud, OpenAI -> Subscriptions.",
            "- Uber, Lyft, Bolt -> Taxi/Rideshare.",
            "- Revolut -> Transfers.",
            "- Dominos, Pizza Hut -> Takeaway/Delivery."
        ].join("\n");
        const languageHints = [
            "Language hints:",
            "- Descriptions may be in Spanish, English, Portuguese, French, Italian, German, Dutch, or Catalan.",
            "- Output category names EXACTLY as listed above (case-sensitive).",
            languageHint.locale !== "unknown"
                ? `- Likely language: ${languageHint.locale}.`
                : "- Language is unknown; infer from the text."
        ].join("\n");
        const customGlossary = buildPromptGlossary(customKeywordRules);
        const customGlossaryBlock = customGlossary
            ? `\nCUSTOM CATEGORY GLOSSARY:\n${customGlossary}\n`
            : "";
        // Using Gemini API
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            console.warn("[AI] No Gemini API key found, using pattern-based categorization only");
        } else {
            let aiDisabled = false;
            for (let start = 0, batchIndex = 1; start < aiItems.length; start += AI_BATCH_SIZE, batchIndex += 1) {
                if (aiDisabled) break;
                const batch = aiItems.slice(start, start + AI_BATCH_SIZE);
                if (batch.length === 0) break;

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
5. Use Subscriptions for streaming or digital SaaS; use Electricity/Gas/Water/Internet/Mobile for utility bills.
6. Use Fuel for gas stations; use Taxi/Rideshare, Public Transport, Parking/Tolls, and Car Maintenance for transport spend; Travel for flights/hotels/booking.
7. Bars are for bars/pubs/nightlife; Restaurants for sit-down dining; Takeaway/Delivery for food delivery; Coffee for coffee shops.
8. If ambiguous, choose the closest category; use Other only if there is truly no signal.
9. Prefer a best-fit category over Other when any clue exists.
10. Normalize singular/plural and "&" vs "and" to match the listed categories.

${spainHints}

${globalHints}

${languageHints}
${customGlossaryBlock}

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "map": [
    {"index": 0, "category": "CategoryName"},
    {"index": 1, "category": "CategoryName"}
  ]
}

You MUST include ALL ${batch.length} transactions. Each entry needs:
- "index": exact index from input (0, 1, 2, ...)
- "category": one of the exact categories listed above
`.trim();

                const userPrompt = JSON.stringify(batch);

                let maxTokensForBatch = AI_MAX_TOKENS;
                let retriedForBatch = false;
                const inputPrompt = systemPrompt + "\n\n" + userPrompt;
                while (true) {
                    const startTime = Date.now();
                    try {
                        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${AI_CATEGORY_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                contents: [
                                    { role: "user", parts: [{ text: inputPrompt }] }
                                ],
                                generationConfig: {
                                    temperature: 0.1,
                                    maxOutputTokens: maxTokensForBatch,
                                    responseMimeType: "application/json"
                                }
                            })
                        });

                        const latencyMs = Date.now() - startTime;

                        if (!res.ok) {
                            const errorText = await res.text();
                            console.error("[AI] Gemini API error:", res.status, errorText.substring(0, 200));
                            
                            // Track failed call to PostHog
                            await trackGeminiCall({
                                model: AI_CATEGORY_MODEL,
                                inputText: inputPrompt,
                                outputText: "",
                                latencyMs,
                                error: `HTTP ${res.status}: ${errorText.substring(0, 100)}`,
                                httpStatus: res.status,
                                feature: "transaction_categorization",
                                distinctId: options?.userId,
                                properties: {
                                    batch_index: batchIndex,
                                    batch_size: batch.length,
                                    total_transactions: aiItems.length
                                },
                                privacyMode: true // Don't log transaction data
                            });
                            
                            if (res.status === 429) {
                                aiDisabled = true;
                                console.warn("[AI] Disabling further AI calls due to rate limit");
                            }
                        } else {
                            const json = await res.json();
                            const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
                            const inputTokens = json.usageMetadata?.promptTokenCount;
                            const outputTokens = json.usageMetadata?.candidatesTokenCount;
                            const parsed = content ? parseJsonPayload(content) : null;
                            
                            // Track successful call to PostHog
                            await trackGeminiCall({
                                model: AI_CATEGORY_MODEL,
                                inputText: inputPrompt,
                                outputText: content || "",
                                inputTokens,
                                outputTokens,
                                latencyMs,
                                httpStatus: 200,
                                feature: "transaction_categorization",
                                distinctId: options?.userId,
                                properties: {
                                    batch_index: batchIndex,
                                    batch_size: batch.length,
                                    total_transactions: aiItems.length,
                                    parse_success: !!parsed
                                },
                                privacyMode: true // Don't log transaction data
                            });
                            
                            if (!parsed) {
                                console.error("[AI] Failed to parse response payload");
                            } else {
                                const mapping = parsed.map || parsed.categories || parsed.results ||
                                    (Array.isArray(parsed) ? parsed : []);

                                for (const m of mapping) {
                                    const idx = m.index ?? m.i ?? m.id;
                                    const cat = m.category ?? m.cat ?? m.c;

                                    if (typeof idx === "number" && typeof cat === "string") {
                                        const normalizedCat = resolveCategoryName(cat, resolveCategory);
                                        if (normalizedCat) {
                                            aiMapping.set(idx, normalizedCat);
                                        } else if (options?.userId && feedbackEntries.length < feedbackLimit) {
                                            const item = itemByIndex.get(idx);
                                            const locale = localeByIndex.get(idx) ?? languageHint.locale ?? "unknown";
                                            feedbackEntries.push({
                                                userId: options.userId,
                                                scope: "transaction",
                                                inputText: item?.raw ?? item?.description ?? null,
                                                rawCategory: cat,
                                                normalizedCategory: null,
                                                locale
                                            });
                                        }
                                    }
                                }
                                console.log(`[AI] Successfully categorized ${aiMapping.size}/${aiItems.length} transactions (batch ${batchIndex})`);
                            }
                        }
                    } catch (fetchErr) {
                        const latencyMs = Date.now() - startTime;
                        const errorMessage = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
                        console.error("[AI] Fetch error:", fetchErr);
                        
                        // Track error to PostHog
                        await trackGeminiCall({
                            model: AI_CATEGORY_MODEL,
                            inputText: inputPrompt,
                            outputText: "",
                            latencyMs,
                            error: errorMessage,
                            feature: "transaction_categorization",
                            distinctId: options?.userId,
                            properties: {
                                batch_index: batchIndex,
                                batch_size: batch.length
                            },
                            privacyMode: true
                        });
                    }
                    break;
                }
            }
        }
    }
    if (feedbackEntries.length > 0) {
        await logAiCategoryFeedbackBatch(feedbackEntries);
    }

    // Helper function for fallback categorization
    const resolveFallbackDefaultCategory = (row: TxRow): string | null => {
        const positiveDefault =
            resolveCategoryName("Transfers", resolveCategory) ??
            resolveCategoryName("Income", resolveCategory) ??
            resolveCategoryName("Refunds", resolveCategory) ??
            null;
        const negativeDefault =
            resolveCategoryName("Shopping", resolveCategory) ??
            resolveCategoryName("Services", resolveCategory) ??
            resolveCategoryName("Home Goods", resolveCategory) ??
            null;
        if (row.amount >= 0) return positiveDefault;
        return negativeDefault;
    };

    const applyFallbackCategory = (row: TxRow, locale?: SupportedLocale): { category: string; source: "fallback_pattern" | "fallback_keyword" | "fallback_default" | "fallback_other" } => {
        const desc = normalizeKeywordText(row.description);
        const conflictMatches: Array<{ category: string; score: number }> = [];
        for (const rule of CATEGORY_RULES) {
            if (rule.amountSign === "positive" && row.amount <= 0) continue;
            if (rule.amountSign === "negative" && row.amount >= 0) continue;
            const matchCount = rule.patterns.filter((pattern) => pattern.test(desc)).length;
            if (matchCount > 0) {
                const normalized = resolveCategoryName(rule.category, resolveCategory);
                if (!normalized) continue;
                if (FOOD_CONFLICT_CATEGORIES.has(normalized)) {
                    conflictMatches.push({ category: normalized, score: matchCount });
                    continue;
                }
                return { category: normalized, source: "fallback_pattern" };
            }
        }
        if (conflictMatches.length > 0) {
            return { category: pickConflictWinner(conflictMatches), source: "fallback_pattern" };
        }
        const keywordMatch = getCategoryFromKeywords(
            `${row.summary ?? ""} ${row.description}`,
            row.amount,
            locale,
            resolveCategory,
            customKeywordRules
        );
        if (keywordMatch) {
            return { category: keywordMatch.category, source: "fallback_keyword" };
        }
        const defaultCategory = resolveFallbackDefaultCategory(row);
        if (defaultCategory) {
            return { category: defaultCategory, source: "fallback_default" };
        }
        return {
            category: resolveCategoryName("Other", resolveCategory) || CATEGORIES[CATEGORIES.length - 1] || "Other",
            source: "fallback_other"
        };
    };

    // Combine all categorization sources
    const result = enrichedRows.map(r => {
        // Priority: 1) Preferences, 2) Statement category, 3) Pattern match, 4) AI, 5) Fallback
        const hasPreference = Boolean(r._preferenceCategory);
        const hasStatement = Boolean(r._statementCategory);
        const hasPattern = Boolean(r._patternCategory);
        const aiCategory = aiMapping.get(r._index);
        const effectiveAiCategory =
            aiCategory && aiCategory.toLowerCase() !== "other" ? aiCategory : null;

        let categorySource:
            | "preference"
            | "statement"
            | "pattern"
            | "ai"
            | "fallback_pattern"
            | "fallback_keyword"
            | "fallback_default"
            | "fallback_other"
            | "keyword" = "fallback_other";
        let category: string;

        if (r._preferenceCategory) {
            category = r._preferenceCategory;
            categorySource = "preference";
        } else if (r._statementCategory) {
            category = r._statementCategory;
            categorySource = "statement";
        } else if (r._patternCategory) {
            category = r._patternCategory;
            categorySource = "pattern";
        } else if (effectiveAiCategory) {
            category = effectiveAiCategory;
            categorySource = "ai";
        } else {
            const fallback = applyFallbackCategory(r, r._locale);
            category = fallback.category;
            categorySource = fallback.source;
        }

        let normalizedCategory = resolveCategoryName(category, resolveCategory);

        if (!hasPreference && !hasStatement && !hasPattern && normalizedCategory === "Other") {
            const keywordMatch = getCategoryFromKeywords(
                `${r.summary ?? ""} ${r.description}`,
                r.amount,
                r._locale,
                resolveCategory,
                customKeywordRules
            );
            if (keywordMatch) {
                normalizedCategory = keywordMatch.category;
                category = keywordMatch.category;
                categorySource = "keyword";
            }
        }

        if (normalizedCategory) {
            category = normalizedCategory;
        } else {
            const fallback = applyFallbackCategory(r, r._locale);
            category = fallback.category;
            categorySource = fallback.source;
        }

        const localeSource = r._localeSource ?? "unknown";
        const reviewFromFallback =
            categorySource === "keyword" ||
            categorySource === "fallback_keyword" ||
            categorySource === "fallback_default" ||
            categorySource === "fallback_other";
        const reviewFromLanguageRules =
            (localeSource === "rules" || localeSource === "hybrid") && reviewFromFallback;
        const needsReview = reviewFromFallback || reviewFromLanguageRules;
        const reviewReason = needsReview
            ? (reviewFromLanguageRules ? "Language-based rule match" : "Heuristic category fallback")
            : null;

        return {
            date: r.date,
            time: r.time ?? null,
            description: r.description,
            amount: r.amount,
            balance: r.balance,
            category,
            summary: r.summary,
            needsReview,
            reviewReason
        } as TxRow;
    });

    const categorizedCount = result.filter(r => r.category && r.category !== "Other").length;
    const preferenceMatched = enrichedRows.filter(r => r._preferenceCategory).length;
    const statementMatched = enrichedRows.filter(r => r._statementCategory).length;
    const patternMatched = enrichedRows.filter(r => r._patternCategory).length;
    console.log(`[AI] Final: ${categorizedCount}/${result.length} categorized (${preferenceMatched} from preferences, ${statementMatched} from statement categories, ${patternMatched} from patterns, ${aiMapping.size} from AI)`);

    return result;
}
