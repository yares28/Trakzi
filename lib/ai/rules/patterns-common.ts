// lib/ai/rules/patterns-common.ts
// Universal brand patterns (work across all languages)

import { MerchantPattern } from "./types";

/**
 * International brands and services that appear in multiple languages
 */
export const COMMON_PATTERNS: MerchantPattern[] = [
    // Tech & Software
    { pattern: /\b(APPLE|ITUNES|APP\s*STORE)\b/i, merchant: "Apple", category: "Subscriptions" },
    { pattern: /\bGOOGLE\b/i, merchant: "Google", category: "Subscriptions" },
    { pattern: /\bMICROSOFT\b/i, merchant: "Microsoft", category: "Subscriptions" },
    { pattern: /\bAMAZON\b/i, merchant: "Amazon", category: "Shopping" },

    // Entertainment
    { pattern: /\bSPOTIFY\b/i, merchant: "Spotify", category: "Subscriptions" },
    { pattern: /\bNETFLIX\b/i, merchant: "Netflix", category: "Subscriptions" },
    { pattern: /\bDISNEY[\s\+]*PLUS\b/i, merchant: "Disney+", category: "Subscriptions" },
    { pattern: /\bHBO\b/i, merchant: "HBO", category: "Subscriptions" },
    { pattern: /\bPRIME\s*VIDEO\b/i, merchant: "Prime Video", category: "Subscriptions" },
    { pattern: /\bYOUTUBE\s*PREMIUM\b/i, merchant: "YouTube Premium", category: "Subscriptions" },

    // Transportation
    { pattern: /\bUBER\b/i, merchant: "Uber", category: "Taxi/Rideshare" },
    { pattern: /\bBOLT\b/i, merchant: "Bolt", category: "Taxi/Rideshare" },
    { pattern: /\bCABIFY\b/i, merchant: "Cabify", category: "Taxi/Rideshare" },
    { pattern: /\bRYANAIR\b/i, merchant: "Ryanair", category: "Travel" },
    { pattern: /\bVUELING\b/i, merchant: "Vueling", category: "Travel" },
    { pattern: /\bBOOKING\.?COM\b/i, merchant: "Booking.com", category: "Travel" },
    { pattern: /\bAIRBNB\b/i, merchant: "Airbnb", category: "Travel" },

    // Food Delivery
    { pattern: /\bUBER\s*EATS\b/i, merchant: "Uber Eats", category: "Food Delivery" },
    { pattern: /\bGLOVO\b/i, merchant: "Glovo", category: "Food Delivery" },
    { pattern: /\bDELIVEROO\b/i, merchant: "Deliveroo", category: "Food Delivery" },
    { pattern: /\bJUST\s*EAT\b/i, merchant: "Just Eat", category: "Food Delivery" },

    // Payment Services
    { pattern: /\bPAYPAL\b/i, merchant: "PayPal", category: "Other" },
    { pattern: /\bREVOLUT\b/i, merchant: "Revolut", category: "Bank Fees" },
    { pattern: /\bWISE\b/i, merchant: "Wise", category: "Bank Fees" },
    { pattern: /\bSTRIPE\b/i, merchant: "Stripe", category: "Other" },

    // Social & Communication
    { pattern: /\bWHATSAPP\b/i, merchant: "WhatsApp", category: "Subscriptions" },
    { pattern: /\bTELEGRAM\b/i, merchant: "Telegram", category: "Subscriptions" },
    { pattern: /\bZOOM\b/i, merchant: "Zoom", category: "Subscriptions" },

    // Fitness & Health
    { pattern: /\bGYM\s*PASS\b/i, merchant: "GymPass", category: "Health & Fitness" },
    { pattern: /\bPELOTON\b/i, merchant: "Peloton", category: "Health & Fitness" },

    // Retail
    { pattern: /\bH&M\b/i, merchant: "H&M", category: "Shopping" },
    { pattern: /\bZARA\b/i, merchant: "Zara", category: "Shopping" },
    { pattern: /\bIKEA\b/i, merchant: "IKEA", category: "Shopping" },
    { pattern: /\bDECATHLON\b/i, merchant: "Decathlon", category: "Sports" },
];

/**
 * Generic operation patterns (language-agnostic)
 */
export const COMMON_OPERATIONS: MerchantPattern[] = [
    // ATM Withdrawals
    { pattern: /\b(ATM|CAJERO|DISTRIBUTEUR|GAB)\b/i, merchant: "ATM Withdrawal", category: "Bank Fees" },

    // Fees
    { pattern: /\b(FEE|COMISION|FRAIS|COMMISSION)\b/i, merchant: "Bank Fee", category: "Bank Fees" },
];
