// lib/ai/rules/patterns-fr.ts
// French merchant and operation patterns (France, Belgium, Switzerland)

import { MerchantPattern, OperationPattern } from "./types";

/**
 * French supermarkets and grocery stores
 */
export const FR_GROCERIES: MerchantPattern[] = [
    { pattern: /\bCARREFOUR\b/i, merchant: "Carrefour", category: "Groceries" },
    { pattern: /\bAUCHAN\b/i, merchant: "Auchan", category: "Groceries" },
    { pattern: /\bLECLERC\b/i, merchant: "Leclerc", category: "Groceries" },
    { pattern: /\bINTERMARCHE\b/i, merchant: "Intermarché", category: "Groceries" },
    { pattern: /\bLIDL\b/i, merchant: "Lidl", category: "Groceries" },
    { pattern: /\bALDI\b/i, merchant: "Aldi", category: "Groceries" },
    { pattern: /\bMONOPRIX\b/i, merchant: "Monoprix", category: "Groceries" },
    { pattern: /\bFRANCPRIX\b/i, merchant: "Franprix", category: "Groceries" },
    { pattern: /\bCASTORAMA\b/i, merchant: "Castorama", category: "Shopping" },
    { pattern: /\bCORA\b/i, merchant: "Cora", category: "Groceries" },
    { pattern: /\bU\s*EXPRESS\b/i, merchant: "U Express", category: "Groceries" },
    { pattern: /\bPIKARD\b/i, merchant: "Picard", category: "Groceries" },
];

/**
 * French utilities and services
 */
export const FR_UTILITIES: MerchantPattern[] = [
    { pattern: /\bEDF\b/i, merchant: "EDF", category: "Utilities" },
    { pattern: /\bENGIE\b/i, merchant: "Engie", category: "Utilities" },
    { pattern: /\bORANGE\b/i, merchant: "Orange", category: "Utilities" },
    { pattern: /\bSFR\b/i, merchant: "SFR", category: "Utilities" },
    { pattern: /\bBOUYGUES\b/i, merchant: "Bouygues", category: "Utilities" },
    { pattern: /\bFREE\b/i, merchant: "Free", category: "Utilities" },
    { pattern: /\bVEOLIA\b/i, merchant: "Veolia", category: "Utilities" },
    { pattern: /\bSUEZ\b/i, merchant: "Suez", category: "Utilities" },
];

/**
 * French transportation
 */
export const FR_TRANSPORT: MerchantPattern[] = [
    { pattern: /\bSNCF\b/i, merchant: "SNCF", category: "Public Transport" },
    { pattern: /\bRATP\b/i, merchant: "RATP", category: "Public Transport" },
    { pattern: /\bOUI\.?SNCF\b/i, merchant: "Oui.sncf", category: "Public Transport" },
    { pattern: /\b(METRO|RER|BUS)\b/i, merchant: "Public Transport", category: "Public Transport" },
    { pattern: /\b(TOTAL|ESSO|BP|SHELL)\b/i, merchant: "Gas Station", category: "Gas" },
    { pattern: /\bPARKING\b/i, merchant: "Parking", category: "Parking" },
    { pattern: /\bPEAGE\b/i, merchant: "Toll", category: "Gas" },
    { pattern: /\bVELIB\b/i, merchant: "Velib", category: "Public Transport" },
];

/**
 * French restaurants and food
 */
export const FR_RESTAURANTS: MerchantPattern[] = [
    { pattern: /\b(MCDONALDS?|MC\s*DONALD)\b/i, merchant: "McDonald's", category: "Restaurants" },
    { pattern: /\b(BURGER\s*KING|BK)\b/i, merchant: "Burger King", category: "Restaurants" },
    { pattern: /\bKFC\b/i, merchant: "KFC", category: "Restaurants" },
    { pattern: /\bSTARBUCKS\b/i, merchant: "Starbucks", category: "Restaurants" },
    { pattern: /\bQUICK\b/i, merchant: "Quick", category: "Restaurants" },
    { pattern: /\bPAUL\b/i, merchant: "Paul", category: "Restaurants" },
    { pattern: /\bFLUNCH\b/i, merchant: "Flunch", category: "Restaurants" },
    { pattern: /\bBRIOCHE\s*DOREE\b/i, merchant: "Brioche Dorée", category: "Restaurants" },
    { pattern: /\bLE\s*PAIN\s*QUOTIDIEN\b/i, merchant: "Le Pain Quotidien", category: "Restaurants" },
    { pattern: /\bRESTAURANT\b/i, merchant: "Restaurant", category: "Restaurants" },
    { pattern: /\bBRASSERIE\b/i, merchant: "Brasserie", category: "Restaurants" },
    { pattern: /\bCAFE\b/i, merchant: "Café", category: "Restaurants" },
];

/**
 * French shopping and retail
 */
export const FR_SHOPPING: MerchantPattern[] = [
    { pattern: /\bFNAC\b/i, merchant: "Fnac", category: "Shopping" },
    { pattern: /\bDARTY\b/i, merchant: "Darty", category: "Shopping" },
    { pattern: /\bBOULANGER\b/i, merchant: "Boulanger", category: "Shopping" },
    { pattern: /\bLEROY\s*MERLIN\b/i, merchant: "Leroy Merlin", category: "Shopping" },
    { pattern: /\bGALERIES?\s*LAFAYETTE\b/i, merchant: "Galeries Lafayette", category: "Shopping" },
    { pattern: /\bPRINCIPS\b/i, merchant: "Printems", category: "Shopping" },
    { pattern: /\bSEPHORA\b/i, merchant: "Sephora", category: "Shopping" },
];

/**
 * French banking operations (labels, not merchants)
 */
export const FR_OPERATIONS: OperationPattern[] = [
    { pattern: /\b(VIREMENT|VIR|TRANSF)\b/i, label: "Transfer", category: "Transfers" },
    { pattern: /\b(REMBOURSEMENT|REMBOURS)\b/i, label: "Refund", category: "Other" },
    { pattern: /\b(FRAIS|COMMISSION)\b/i, label: "Bank Fee", category: "Bank Fees" },
    { pattern: /\b(PRELEVEMENT|PRLV)\b/i, label: "Direct Debit", category: "Other" },
    { pattern: /\b(SALAIRE|PAIE|VIREMENT\s*SALAIRE)\b/i, label: "Salary", category: "Income" },
    { pattern: /\b(RETRAITE|PENSION)\b/i, label: "Pension", category: "Income" },
    { pattern: /\b(CARTE|CB|PAIEMENT)\b/i, label: "Card Payment", category: "Other" },
    { pattern: /\b(RETRAIT|DAB|GAB)\b/i, label: "ATM Withdrawal", category: "Bank Fees" },
    { pattern: /\b(ACHAT|PAIEMENT)\b/i, label: "Purchase", category: "Other" },
    { pattern: /\bRECHARGE\b/i, label: "Top-up", category: "Other" },
];

/**
 * French transfer patterns (extract name)
 */
export const FR_TRANSFER_PATTERNS: MerchantPattern[] = [
    {
        pattern: /\b(VIREMENT|TRANSF)\s+(A|DE|VERS)?\s*(?:M\.?|MME\.?|MLLE\.?)?\s*([A-ZÀÂÄÇÈÉÊËÎÏÔÙÛÜ][a-zàâäçèéêëîïôùûü]+(?:\s+[A-ZÀÂÄÇÈÉÊËÎÏÔÙÛÜ][a-zàâäçèéêëîïôùûü]+)?)/i,
        merchant: "Transfer",
        category: "Transfers",
        extractName: true
    },
];

/**
 * All French patterns combined
 */
export const FR_ALL_PATTERNS: MerchantPattern[] = [
    ...FR_GROCERIES,
    ...FR_UTILITIES,
    ...FR_TRANSPORT,
    ...FR_RESTAURANTS,
    ...FR_SHOPPING,
    ...FR_TRANSFER_PATTERNS,
];
