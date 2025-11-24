// lib/parsing/parseExcelToRows.ts
import * as XLSX from "xlsx";
import { TxRow } from "../types/transactions";

export function parseExcelToRows(buffer: Buffer): TxRow[] {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

    // Expect columns like: Date, Description, Amount, Balance (case-insensitive)
    return rows.map((r) => {
        const keys = Object.keys(r);
        const get = (name: string) =>
            r[keys.find(k => k.toLowerCase().includes(name.toLowerCase())) ?? ""];

        const rawDate = get("date");
        const rawDesc = get("description") ?? "";
        const rawAmount = get("amount");
        const rawBalance = get("balance");

        const dateIso = typeof rawDate === "string"
            ? rawDate
            : XLSX.SSF.format("yyyy-mm-dd", rawDate);

        return {
            date: dateIso,
            description: String(rawDesc),
            amount: Number(rawAmount),
            balance: rawBalance != null ? Number(rawBalance) : null
        } as TxRow;
    });
}
