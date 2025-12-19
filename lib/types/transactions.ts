// lib/types/transactions.ts
export type TxRow = {
    date: string;          // ISO: YYYY-MM-DD
    time?: string;         // Optional time in HH:MM or HH:MM:SS format
    description: string;
    amount: number;
    balance: number | null;
    category?: string;
    summary?: string;       // Clean merchant/description name (e.g., "Amazon" instead of "COMPRA WWW.AMAZON.* CW4WE8Q35")
};
