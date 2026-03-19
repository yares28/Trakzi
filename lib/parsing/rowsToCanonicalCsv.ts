// lib/parsing/rowsToCanonicalCsv.ts
import Papa from "papaparse";
import { TxRow } from "../types/transactions";

/**
 * Prevent CSV formula injection (Excel/Sheets executes cells starting with =, +, -, @).
 * Prefix those cells with a tab so spreadsheet apps treat them as plain text.
 */
function escapeCsvFormula(value: string | null | undefined): string {
    const str = String(value ?? "");
    return /^[=+\-@\t\r]/.test(str) ? `\t${str}` : str;
}

export function rowsToCanonicalCsv(rows: TxRow[]): string {
    // Ensure category and summary are always included, even if undefined
    const rowsWithCategories = rows.map(r => ({
        date: r.date,
        time: r.time ?? "",
        description: escapeCsvFormula(r.description),
        amount: r.amount,
        balance: r.balance,
        category: escapeCsvFormula(r.category || ""),
        summary: escapeCsvFormula(r.summary || ""),
        needs_review: r.needsReview ? "true" : "",
        review_reason: escapeCsvFormula(r.reviewReason || "")
    }));

    const csv = Papa.unparse(rowsWithCategories, {
        columns: [
            "date",
            "time",
            "description",
            "amount",
            "balance",
            "category",
            "summary",
            "needs_review",
            "review_reason"
        ]
    });

    // Verify category column is in the CSV
    const firstLine = csv.split('\n')[0];
    if (!firstLine.includes('category')) {
        console.error("[CSV] WARNING: Category column missing from CSV header!");
    }

    return csv;
}
