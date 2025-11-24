// lib/types/transactions.ts
export type TxRow = {
    date: string;          // ISO: YYYY-MM-DD
    description: string;
    amount: number;
    balance: number | null;
    category?: string;
};
