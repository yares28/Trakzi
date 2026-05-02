// lib/types/transactions.ts
export type TxRow = {
    date: string;          // ISO: YYYY-MM-DD
    time?: string | null;  // Optional time (HH:MM[:SS]) from CSV import
    description: string;
    amount: number;
    balance: number | null;
    category?: string;
    summary?: string;       // Clean merchant/description name (e.g., "Amazon" instead of "COMPRA WWW.AMAZON.* CW4WE8Q35")
    needsReview?: boolean;
    reviewReason?: string | null;
    tx_type?: string;      // 'expense' | 'income' | 'transfer' — set by heuristics during import
    currency?: string;     // ISO 4217 code from CSV currency column (e.g., "USD"); absent means use account currency
    originalAmount?: number;   // Pre-conversion amount when currency differs from account currency
    originalCurrency?: string; // ISO 4217 code of the original row currency before FX conversion
};
