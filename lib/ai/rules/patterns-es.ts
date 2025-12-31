// lib/ai/rules/patterns-es.ts
// Spanish merchant and operation patterns (Spain & Latin America)

import { MerchantPattern, OperationPattern } from "./types";

/**
 * Spanish supermarkets and grocery stores
 */
export const ES_GROCERIES: MerchantPattern[] = [
    { pattern: /\bMERCADONA\b/i, merchant: "Mercadona", category: "Groceries" },
    { pattern: /\bCARREFOUR\b/i, merchant: "Carrefour", category: "Groceries" },
    { pattern: /\bALCAMPO\b/i, merchant: "Alcampo", category: "Groceries" },
    { pattern: /\bDIA\b/i, merchant: "Dia", category: "Groceries" },
    { pattern: /\bLIDL\b/i, merchant: "Lidl", category: "Groceries" },
    { pattern: /\bALDI\b/i, merchant: "Aldi", category: "Groceries" },
    { pattern: /\bEROS?KI\b/i, merchant: "Eroski", category: "Groceries" },
    { pattern: /\bHIPERCOR\b/i, merchant: "Hipercor", category: "Groceries" },
    { pattern: /\bCONSUM\b/i, merchant: "Consum", category: "Groceries" },
    { pattern: /\bBON\s*PREU\b/i, merchant: "Bon Preu", category: "Groceries" },
];

/**
 * Spanish utilities and services
 */
export const ES_UTILITIES: MerchantPattern[] = [
    { pattern: /\bENDESA\b/i, merchant: "Endesa", category: "Utilities" },
    { pattern: /\bIBERDROLA\b/i, merchant: "Iberdrola", category: "Utilities" },
    { pattern: /\bNATURALGY\b/i, merchant: "Naturalgy", category: "Utilities" },
    { pattern: /\bVODAFONE\b/i, merchant: "Vodafone", category: "Utilities" },
    { pattern: /\bMOVISTAR\b/i, merchant: "Movistar", category: "Utilities" },
    { pattern: /\bORANGE\b/i, merchant: "Orange", category: "Utilities" },
    { pattern: /\bYOIGO\b/i, merchant: "Yoigo", category: "Utilities" },
    { pattern: /\bAGUAS?\s*DE\b/i, merchant: "Aguas", category: "Utilities" },
];

/**
 * Spanish transportation
 */
export const ES_TRANSPORT: MerchantPattern[] = [
    { pattern: /\bRENFE\b/i, merchant: "Renfe", category: "Public Transport" },
    { pattern: /\bMETRO\s*(MADRID|BARCELONA|VALENCIA)?\b/i, merchant: "Metro", category: "Public Transport" },
    { pattern: /\bTMB\b/i, merchant: "TMB", category: "Public Transport" },
    { pattern: /\bEMT\b/i, merchant: "EMT", category: "Public Transport" },
    { pattern: /\b(REPSOL|CEPSA|BP|SHELL|GALP)\b/i, merchant: "Gas Station", category: "Gas" },
    { pattern: /\bPARKING\b/i, merchant: "Parking", category: "Parking" },
];

/**
 * Spanish restaurants and food
 */
export const ES_RESTAURANTS: MerchantPattern[] = [
    { pattern: /\b(MCDONALDS?|MC\s*DONALD)\b/i, merchant: "McDonald's", category: "Restaurants" },
    { pattern: /\b(BURGER\s*KING|BK)\b/i, merchant: "Burger King", category: "Restaurants" },
    { pattern: /\bKFC\b/i, merchant: "KFC", category: "Restaurants" },
    { pattern: /\bSTARBUCKS\b/i, merchant: "Starbucks", category: "Restaurants" },
    { pattern: /\bDOMINOS?\b/i, merchant: "Domino's", category: "Restaurants" },
    { pattern: /\bTELEPIZZA\b/i, merchant: "Telepizza", category: "Restaurants" },
    { pattern: /\bVIPS\b/i, merchant: "VIPS", category: "Restaurants" },
    { pattern: /\b100\s*MONTADITOS\b/i, merchant: "100 Montaditos", category: "Restaurants" },
    { pattern: /\bRODILLA\b/i, merchant: "Rodilla", category: "Restaurants" },
    { pattern: /\bRESTAURANTE\b/i, merchant: "Restaurant", category: "Restaurants" },
    { pattern: /\bBAR\b/i, merchant: "Bar", category: "Restaurants" },
    { pattern: /\bCAFETERIA\b/i, merchant: "Cafeteria", category: "Restaurants" },
];

/**
 * Spanish shopping and retail
 */
export const ES_SHOPPING: MerchantPattern[] = [
    { pattern: /\bEL\s*CORTE\s*INGLES\b/i, merchant: "El Corte Inglés", category: "Shopping" },
    { pattern: /\bPRIMARK\b/i, merchant: "Primark", category: "Shopping" },
    { pattern: /\bMEDIAMARKT\b/i, merchant: "MediaMarkt", category: "Shopping" },
    { pattern: /\bWORTEN\b/i, merchant: "Worten", category: "Shopping" },
    { pattern: /\bFNAC\b/i, merchant: "Fnac", category: "Shopping" },
    { pattern: /\bLEROY\s*MERLIN\b/i, merchant: "Leroy Merlin", category: "Shopping" },
    { pattern: /\bAKI\b/i, merchant: "AKI", category: "Shopping" },
];

/**
 * Spanish banking operations (labels, not merchants)
 */
export const ES_OPERATIONS: OperationPattern[] = [
    { pattern: /\b(TRANSFERENCIA|TRANSF)\b/i, label: "Transfer", category: "Transfers" },
    { pattern: /\bBIZUM\b/i, label: "Bizum", category: "Transfers" },
    { pattern: /\b(REEMBOLSO|DEVOLUCION)\b/i, label: "Refund", category: "Other" },
    { pattern: /\b(COMISION|COMISIONES)\b/i, label: "Bank Fee", category: "Bank Fees" },
    { pattern: /\b(CARGO|CARGOS)\b/i, label: "Charge", category: "Other" },
    { pattern: /\b(RECIBO|DOMICILIACION)\b/i, label: "Direct Debit", category: "Other" },
    { pattern: /\b(NOMINA|SALARIO)\b/i, label: "Salary", category: "Income" },
    { pattern: /\b(PENSION|PRESTACION)\b/i, label: "Pension", category: "Income" },
    { pattern: /\b(TARJETA|TPV)\b/i, label: "Card Payment", category: "Other" },
    { pattern: /\b(CAJERO|RETIRADA)\b/i, label: "ATM Withdrawal", category: "Bank Fees" },
    { pattern: /\b(COMPRA|PAGO)\b/i, label: "Purchase", category: "Other" },
];

/**
 * Spanish transfer patterns (extract name)
 */
export const ES_TRANSFER_PATTERNS: MerchantPattern[] = [
    {
        pattern: /\b(BIZUM|TRANSFERENCIA)\s+(A|DE|DESDE)?\s*(?:SR\.?|SRA\.?|D\.?|DN?A\.?)?\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/i,
        merchant: "Transfer",
        category: "Transfers",
        extractName: true
    },
];

/**
 * All Spanish patterns combined
 */
export const ES_ALL_PATTERNS: MerchantPattern[] = [
    ...ES_GROCERIES,
    ...ES_UTILITIES,
    ...ES_TRANSPORT,
    ...ES_RESTAURANTS,
    ...ES_SHOPPING,
    ...ES_TRANSFER_PATTERNS,
];
