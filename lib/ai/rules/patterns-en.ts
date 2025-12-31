// lib/ai/rules/patterns-en.ts
// English merchant and operation patterns (UK, US, Ireland, etc.)

import { MerchantPattern, OperationPattern } from "./types";

/**
 * English supermarkets and grocery stores
 */
export const EN_GROCERIES: MerchantPattern[] = [
    // UK
    { pattern: /\bTESCO\b/i, merchant: "Tesco", category: "Groceries" },
    { pattern: /\bSAINSBURY\b/i, merchant: "Sainsbury's", category: "Groceries" },
    { pattern: /\bASDEA\b/i, merchant: "ASDA", category: "Groceries" },
    { pattern: /\bMORRISONS?\b/i, merchant: "Morrisons", category: "Groceries" },
    { pattern: /\bWAITROSE\b/i, merchant: "Waitrose", category: "Groceries" },
    { pattern: /\bALDI\b/i, merchant: "Aldi", category: "Groceries" },
    { pattern: /\bLIDL\b/i, merchant: "Lidl", category: "Groceries" },
    { pattern: /\bICELAND\b/i, merchant: "Iceland", category: "Groceries" },
    { pattern: /\bCO-?OP\b/i, merchant: "Co-op", category: "Groceries" },
    { pattern: /\bM&S\b/i, merchant: "Marks & Spencer", category: "Groceries" },

    // US
    { pattern: /\bWALMART\b/i, merchant: "Walmart", category: "Groceries" },
    { pattern: /\bTARGET\b/i, merchant: "Target", category: "Groceries" },
    { pattern: /\bWHOLE\s*FOODS\b/i, merchant: "Whole Foods", category: "Groceries" },
    { pattern: /\bTRADER\s*JOES?\b/i, merchant: "Trader Joe's", category: "Groceries" },
    { pattern: /\bKROGER\b/i, merchant: "Kroger", category: "Groceries" },
    { pattern: /\bSAFEWAY\b/i, merchant: "Safeway", category: "Groceries" },
    { pattern: /\bCOSTCO\b/i, merchant: "Costco", category: "Groceries" },
];

/**
 * English utilities and services
 */
export const EN_UTILITIES: MerchantPattern[] = [
    // UK
    { pattern: /\bBRITISH\s*GAS\b/i, merchant: "British Gas", category: "Utilities" },
    { pattern: /\bEON\b/i, merchant: "E.ON", category: "Utilities" },
    { pattern: /\bEDF\s*ENERGY\b/i, merchant: "EDF Energy", category: "Utilities" },
    { pattern: /\bBULB\b/i, merchant: "Bulb", category: "Utilities" },
    { pattern: /\bOCTOPUS\s*ENERGY\b/i, merchant: "Octopus Energy", category: "Utilities" },
    { pattern: /\bVODAFONE\b/i, merchant: "Vodafone", category: "Utilities" },
    { pattern: /\bO2\b/i, merchant: "O2", category: "Utilities" },
    { pattern: /\bEE\b/i, merchant: "EE", category: "Utilities" },
    { pattern: /\bTHREE\b/i, merchant: "Three", category: "Utilities" },
    { pattern: /\bBT\b/i, merchant: "BT", category: "Utilities" },
    { pattern: /\bSKY\b/i, merchant: "Sky", category: "Subscriptions" },
    { pattern: /\bVIRGIN\s*MEDIA\b/i, merchant: "Virgin Media", category: "Utilities" },
    { pattern: /\bTHAMES\s*WATER\b/i, merchant: "Thames Water", category: "Utilities" },
];

/**
 * English transportation
 */
export const EN_TRANSPORT: MerchantPattern[] = [
    // UK
    { pattern: /\bTFL\b/i, merchant: "TfL", category: "Public Transport" },
    { pattern: /\bNATIONAL\s*RAIL\b/i, merchant: "National Rail", category: "Public Transport" },
    { pattern: /\bOYSTER\b/i, merchant: "Oyster", category: "Public Transport" },
    { pattern: /\bUBER\b/i, merchant: "Uber", category: "Taxi/Rideshare" },
    { pattern: /\bBOLT\b/i, merchant: "Bolt", category: "Taxi/Rideshare" },
    { pattern: /\b(SHELL|BP|ESSO|TEXACO)\b/i, merchant: "Gas Station", category: "Gas" },

    // General
    { pattern: /\bPARKING\b/i, merchant: "Parking", category: "Parking" },
    { pattern: /\bTOLL\b/i, merchant: "Toll", category: "Gas" },
];

/**
 * English restaurants and food
 */
export const EN_RESTAURANTS: MerchantPattern[] = [
    { pattern: /\b(MCDONALDS?|MC\s*DONALD)\b/i, merchant: "McDonald's", category: "Restaurants" },
    { pattern: /\b(BURGER\s*KING|BK)\b/i, merchant: "Burger King", category: "Restaurants" },
    { pattern: /\bKFC\b/i, merchant: "KFC", category: "Restaurants" },
    { pattern: /\bSTARBUCKS\b/i, merchant: "Starbucks", category: "Restaurants" },
    { pattern: /\bSUBWAY\b/i, merchant: "Subway", category: "Restaurants" },
    { pattern: /\bPRET\s*A\s*MANGER\b/i, merchant: "Pret", category: "Restaurants" },
    { pattern: /\bGREGGS\b/i, merchant: "Greggs", category: "Restaurants" },
    { pattern: /\bNANDOS?\b/i, merchant: "Nando's", category: "Restaurants" },
    { pattern: /\bWAGAMAMA\b/i, merchant: "Wagamama", category: "Restaurants" },
    { pattern: /\bPIZZA\s*EXPRESS\b/i, merchant: "Pizza Express", category: "Restaurants" },
    { pattern: /\bCHICHILOS\b/i, merchant: "Chipotle", category: "Restaurants" },
    { pattern: /\bPANERA\b/i, merchant: "Panera", category: "Restaurants" },
];

/**
 * English shopping and retail
 */
export const EN_SHOPPING: MerchantPattern[] = [
    { pattern: /\bAMAZON\b/i, merchant: "Amazon", category: "Shopping" },
    { pattern: /\bARGOS\b/i, merchant: "Argos", category: "Shopping" },
    { pattern: /\bJOHN\s*LEWIS\b/i, merchant: "John Lewis", category: "Shopping" },
    { pattern: /\bCURRYS\b/i, merchant: "Currys", category: "Shopping" },
    { pattern: /\bB&Q\b/i, merchant: "B&Q", category: "Shopping" },
    { pattern: /\bHOMEBASE\b/i, merchant: "Homebase", category: "Shopping" },
    { pattern: /\bNEXT\b/i, merchant: "Next", category: "Shopping" },
    { pattern: /\bDEBENHAMS\b/i, merchant: "Debenhams", category: "Shopping" },
    { pattern: /\bBEST\s*BUY\b/i, merchant: "Best Buy", category: "Shopping" },
];

/**
 * English banking operations (labels, not merchants)
 */
export const EN_OPERATIONS: OperationPattern[] = [
    { pattern: /\b(TRANSFER|BANK\s*TRANSFER)\b/i, label: "Transfer", category: "Transfers" },
    { pattern: /\bREFUND\b/i, label: "Refund", category: "Other" },
    { pattern: /\b(FEE|CHARGE|COMMISSION)\b/i, label: "Bank Fee", category: "Bank Fees" },
    { pattern: /\b(DIRECT\s*DEBIT|DD)\b/i, label: "Direct Debit", category: "Other" },
    { pattern: /\b(SALARY|WAGE|PAYROLL)\b/i, label: "Salary", category: "Income" },
    { pattern: /\b(PENSION|BENEFIT)\b/i, label: "Pension", category: "Income" },
    { pattern: /\b(CARD\s*PAYMENT|DEBIT\s*CARD)\b/i, label: "Card Payment", category: "Other" },
    { pattern: /\b(ATM|WITHDRAWAL|CASH\s*WITHDRAWAL)\b/i, label: "ATM Withdrawal", category: "Bank Fees" },
    { pattern: /\bPURCHASE\b/i, label: "Purchase", category: "Other" },
    { pattern: /\bTOP\s*UP\b/i, label: "Top-up", category: "Other" },
    { pattern: /\bSTANDING\s*ORDER\b/i, label: "Standing Order", category: "Transfers" },
];

/**
 * English transfer patterns (extract name)
 */
export const EN_TRANSFER_PATTERNS: MerchantPattern[] = [
    {
        pattern: /\b(TRANSFER|PAYMENT)\s+(TO|FROM|FOR)?\s*(?:MR\.?|MRS\.?|MS\.?|MISS\.?)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
        merchant: "Transfer",
        category: "Transfers",
        extractName: true
    },
];

/**
 * All English patterns combined
 */
export const EN_ALL_PATTERNS: MerchantPattern[] = [
    ...EN_GROCERIES,
    ...EN_UTILITIES,
    ...EN_TRANSPORT,
    ...EN_RESTAURANTS,
    ...EN_SHOPPING,
    ...EN_TRANSFER_PATTERNS,
];
