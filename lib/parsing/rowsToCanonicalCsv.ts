// lib/parsing/rowsToCanonicalCsv.ts
import Papa from "papaparse";
import { TxRow } from "../types/transactions";

export function rowsToCanonicalCsv(rows: TxRow[]): string {
    // Ensure category and summary are always included, even if undefined
    const rowsWithCategories = rows.map(r => ({
        date: r.date,
        time: r.time ?? "",
        description: r.description,
        amount: r.amount,
        balance: r.balance,
        category: r.category || "", // Use empty string instead of undefined
        summary: r.summary || ""    // Clean merchant name
    }));

    const csv = Papa.unparse(rowsWithCategories, {
        columns: ["date", "time", "description", "amount", "balance", "category", "summary"]
    });

    // Verify category column is in the CSV
    const firstLine = csv.split('\n')[0];
    if (!firstLine.includes('category')) {
        console.error("[CSV] WARNING: Category column missing from CSV header!");
    }

    return csv;
}
