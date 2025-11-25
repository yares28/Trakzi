// lib/parsing/parseCsvToRows.ts
import Papa from "papaparse";
import { TxRow } from "../types/transactions";

export type CsvDiagnostics = {
    delimiter: string;
    headerRowIndex: number | null;
    availableColumns: string[];
    sampleRawRows: any[];
    totalRowsInFile: number;
    rowsAfterPreprocess: number;
    rowsAfterFiltering: number;
    invalidDateSamples: Array<{ index: number; value: string }>;
    filteredOutSamples: Array<{ index: number; reason: string; row: Partial<TxRow> }>;
    softValidatedCount: number;
    warnings: string[];
};

type ParseCsvOptions =
    | undefined
    | { returnDiagnostics?: false }
    | { returnDiagnostics: true };

type ParseCsvReturn<T extends ParseCsvOptions> = T extends { returnDiagnostics: true }
    ? { rows: TxRow[]; diagnostics: CsvDiagnostics }
    : TxRow[];

const HEADER_KEYWORDS = [
    "date", "description", "desc", "amount", "balance", "transaction",
    "transactions", "debit", "credit", "value", "montant", "solde",
    "libelle", "details", "memo", "note", "category", "categorie"
];

const DATE_COLUMN_NAMES = [
    "date", "Date", "DATE", "tx_date", "TxDate", "TX_DATE",
    "transaction_date", "TransactionDate", "TRANSACTION_DATE",
    "transaction date", "Transaction Date", "TRANSACTION DATE",
    "posted_date", "PostedDate", "POSTED_DATE",
    "value_date", "ValueDate", "VALUE_DATE",
    "booking_date", "BookingDate", "BOOKING_DATE"
];

const DESCRIPTION_REGEX = /description|desc|memo|note|details|narration|particulars|concept|libelle/i;
const AMOUNT_REGEX = /amount|amt|value|debit|credit|importe|montant/i;
const BALANCE_REGEX = /balance|bal|running.*balance|saldo|solde/i;

function excelSerialToDate(serial: number): string | null {
    if (!isFinite(serial) || serial <= 0) return null;
    const excelEpoch = Date.UTC(1899, 11, 30);
    const millis = Math.round(serial * 86400000);
    const date = new Date(excelEpoch + millis);
    if (isNaN(date.getTime())) return null;
    const year = date.getUTCFullYear();
    if (year < 1900 || year > 2100) return null;
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function looksLikeDate(value: string): boolean {
    return (
        /^\d{4}-\d{2}-\d{2}/.test(value) ||
        /^\d{4}\/\d{2}\/\d{2}/.test(value) ||
        /^\d{2}[\/-]\d{2}[\/-]\d{4}/.test(value) ||
        /^\d{1,2}\s[a-zA-Z]{3}\s\d{4}/.test(value) ||
        /^\d{8}$/.test(value)
    );
}

function normalizeDate(dateStr: string): string {
    if (dateStr == null) return "";
    const trimmed = String(dateStr).trim();
    if (trimmed === "") return "";

    if (/^\d+(\.\d+)?$/.test(trimmed) && Number(trimmed) > 31) {
        const excelDate = excelSerialToDate(Number(trimmed));
        if (excelDate) return excelDate;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
    }

    let datePart = trimmed;
    if (datePart.includes('|')) {
        datePart = datePart.split('|')[0].trim();
    }

    const isoDateMatch = datePart.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDateMatch) return isoDateMatch[1];

    if (/^\d{8}$/.test(datePart)) {
        const year = datePart.slice(0, 4);
        const month = datePart.slice(4, 6);
        const day = datePart.slice(6, 8);
        return `${year}-${month}-${day}`;
    }

    const slashMatch = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
        const [, part1, part2, year] = slashMatch;
        const num1 = parseInt(part1, 10);
        const num2 = parseInt(part2, 10);
        if (num1 > 12) {
            return `${year}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
        }
        if (num2 > 12) {
            return `${year}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
        }
        return `${year}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
    }

    const dotMatch = datePart.match(/^(\d{1,4})\.(\d{1,2})\.(\d{1,4})$/);
    if (dotMatch) {
        const [, a, b, c] = dotMatch;
        if (a.length === 4) {
            return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
        }
        return `${c.padStart(4, '0')}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    }

    try {
        const date = new Date(datePart);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            if (year >= 1900 && year <= 2100) {
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        }
    } catch {
        // ignore
    }

    return "";
}

function preprocessCsv(csv: string, delimiterHint?: string): { csv: string; delimiter: string; headerRowIndex: number | null } {
    const hasTabs = delimiterHint ? delimiterHint === '\t' : csv.includes('\t');
    const delimiter = delimiterHint ?? (hasTabs ? '\t' : ',');

    console.log(`[CSV Preprocess] Processing file (${hasTabs ? 'TAB' : 'COMMA'} delimiter hint)`);

    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length === 0) {
        return { csv, delimiter, headerRowIndex: null };
    }

    const rows: string[][] = [];
    for (const line of lines) {
        const parsed = Papa.parse(line, {
            header: false,
            delimiter
        });
        if (parsed.data.length > 0) {
            rows.push(parsed.data[0] as string[]);
        }
    }

    if (rows.length === 0) {
        return { csv, delimiter, headerRowIndex: null };
    }

    const maxCols = Math.max(...rows.map(r => r.length));
    let firstNonEmptyCol = -1;
    for (let col = 0; col < maxCols; col++) {
        let hasData = false;
        for (let row = 0; row < Math.min(10, rows.length); row++) {
            const value = rows[row]?.[col];
            if (value != null && String(value).trim() !== "") {
                hasData = true;
                break;
            }
        }
        if (hasData) {
            firstNonEmptyCol = col;
            break;
        }
    }

    if (firstNonEmptyCol > 0) {
        console.log(`[CSV Preprocess] Removing ${firstNonEmptyCol} leading empty columns`);
        for (let i = 0; i < rows.length; i++) {
            rows[i] = rows[i].slice(firstNonEmptyCol);
        }
    } else if (firstNonEmptyCol === -1) {
        console.warn("[CSV Preprocess] No data columns found, returning original CSV");
        return { csv, delimiter, headerRowIndex: null };
    }

    let headerRowIndex: number | null = null;
    for (let i = 0; i < Math.min(20, rows.length); i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const rowText = row.map(cell => String(cell || "").toLowerCase().trim()).join(" ");
        const matches = HEADER_KEYWORDS.filter(keyword => rowText.includes(keyword));
        if (matches.length >= 2) {
            headerRowIndex = i;
            console.log(`[CSV Preprocess] Found header row at line ${i + 1} with keywords: ${matches.join(", ")}`);
            break;
        }

        const hasDateHeader = row.some(cell => {
            const cellLower = String(cell || "").toLowerCase().trim();
            return /^date|transaction.*date|posted.*date|value.*date/i.test(cellLower);
        });
        const hasAmountHeader = row.some(cell => {
            const cellLower = String(cell || "").toLowerCase().trim();
            return /^amount|montant|value|debit|credit/i.test(cellLower);
        });
        const hasDescHeader = row.some(cell => {
            const cellLower = String(cell || "").toLowerCase().trim();
            return /^description|desc|details|libelle|memo|note|transaction/i.test(cellLower);
        });
        if (hasDateHeader && (hasAmountHeader || hasDescHeader)) {
            headerRowIndex = i;
            console.log(`[CSV Preprocess] Found header row at line ${i + 1} (date + amount/description headers detected)`);
            break;
        }
    }

    if (headerRowIndex && headerRowIndex > 0) {
        rows.splice(0, headerRowIndex);
    }

    const cleanedRows = rows
        .map(row => {
            const cleanedCells = row.map(cell => {
                const str = String(cell || "").trim();
                if (str.includes(delimiter) || str.includes('"') || str.includes("\n")) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            });
            return cleanedCells.join(delimiter);
        })
        .filter(row => row.split(delimiter).some(cell => cell.trim() !== ""));

    if (cleanedRows.length === 0) {
        console.warn("[CSV Preprocess] No rows remaining after cleaning, returning original CSV");
        return { csv, delimiter, headerRowIndex };
    }

    return { csv: cleanedRows.join("\n"), delimiter, headerRowIndex };
}

function findDateColumn(row: Record<string, any>, columns: string[]): string | null {
    for (const colName of DATE_COLUMN_NAMES) {
        if (row[colName] != null && String(row[colName]).trim() !== "") {
            return colName;
        }
    }

    for (const col of columns) {
        const value = row[col];
        if (value != null) {
            const strValue = String(value).trim();
            if (looksLikeDate(strValue)) {
                return col;
            }
        }
    }

    return null;
}

function coerceNumber(value: any): number | null {
    if (value == null || value === "") return null;
    if (typeof value === "number") return value;
    if (typeof value !== "string") return null;

    let normalized = value.trim();
    if (normalized === "") return null;

    normalized = normalized
        .replace(/[\u2212\u2012\u2013\u2014]/g, "-") // normalize fancy minus
        .replace(/\s/g, "");

    const commaDecimal = /,\d{1,2}$/.test(normalized);
    if (commaDecimal) {
        normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
        normalized = normalized.replace(/,/g, "");
    }

    normalized = normalized.replace(/[^0-9.-]/g, "");
    if ((normalized.match(/\./g) || []).length > 1) {
        const lastDot = normalized.lastIndexOf(".");
        normalized = normalized.replace(/\./g, "");
        normalized = `${normalized.slice(0, lastDot)}.${normalized.slice(lastDot)}`;
    }

    const parsed = Number(normalized);
    return isNaN(parsed) ? null : parsed;
}

function mapArraysToObjects(rawParsed: Papa.ParseResult<any[]>): { rows: Record<string, any>[]; columns: string[] } {
    const rawRows = rawParsed.data as any[];
    if (rawRows.length === 0) {
        return { rows: [], columns: [] };
    }

    const maxColumns = Math.max(...rawRows.map(r => Array.isArray(r) ? r.length : 0));
    const columns = Array.from({ length: maxColumns }, (_, index) => `column_${index}`);

    const rows = rawRows.map((cells: any[]) => {
        const obj: Record<string, any> = {};
        for (let i = 0; i < maxColumns; i++) {
            obj[columns[i]] = cells?.[i] ?? "";
        }
        return obj;
    });

    return { rows, columns };
}

export function parseCsvToRows(csv: string): TxRow[];
export function parseCsvToRows(csv: string, options: { returnDiagnostics: true }): { rows: TxRow[]; diagnostics: CsvDiagnostics };
export function parseCsvToRows<T extends ParseCsvOptions>(csv: string, options?: T): ParseCsvReturn<T> {
    const hasTabs = csv.includes('\t');
    const initialDelimiter = hasTabs ? '\t' : ',';

    console.log(`[CLIENT] CSV delimiter detected: ${hasTabs ? 'TAB' : 'COMMA'}`);
    console.log(`[CLIENT] CSV length: ${csv.length}, first 500 chars:`, csv.substring(0, 500));

    const { csv: cleanedCsv, delimiter, headerRowIndex } = preprocessCsv(csv, initialDelimiter);
    console.log(`[CLIENT] Cleaned CSV length: ${cleanedCsv.length}, first 500 chars:`, cleanedCsv.substring(0, 500));

    let parsed = Papa.parse(cleanedCsv, {
        header: true,
        skipEmptyLines: true,
        delimiter
    });

    let columns = parsed.meta?.fields?.filter(Boolean) ?? [];
    let rowsData = parsed.data as any[];

    if (columns.length === 0 && rowsData.length > 0) {
        console.warn("[CLIENT] No headers detected, trying to parse without headers");
        const rawParsed = Papa.parse(cleanedCsv, {
            header: false,
            skipEmptyLines: true,
            delimiter
        });
        const mapped = mapArraysToObjects(rawParsed as Papa.ParseResult<any[]>);
        rowsData = mapped.rows;
        columns = mapped.columns;
    }

    if (parsed.errors.length) {
        console.warn("[CLIENT] CSV parse errors:", parsed.errors);
    }

    const diagnostics: CsvDiagnostics = {
        delimiter,
        headerRowIndex,
        availableColumns: columns,
        sampleRawRows: rowsData.slice(0, 5),
        totalRowsInFile: rowsData.length,
        rowsAfterPreprocess: rowsData.length,
        rowsAfterFiltering: 0,
        invalidDateSamples: [],
        filteredOutSamples: [],
        softValidatedCount: 0,
        warnings: []
    };

    const rows = rowsData.map((r, index) => {
        const dateColumn = findDateColumn(r, columns);
        let rawDate = "";
        if (dateColumn) {
            rawDate = String(r[dateColumn] ?? "");
        }

        if (!rawDate) {
            for (const col of columns) {
                const value = r[col];
                if (value != null) {
                    const strValue = String(value).trim();
                    if (looksLikeDate(strValue)) {
                        rawDate = String(value);
                        break;
                    }
                }
            }
        }

        const normalizedDate = normalizeDate(rawDate);
        if (!normalizedDate && rawDate && diagnostics.invalidDateSamples.length < 5) {
            diagnostics.invalidDateSamples.push({ index, value: rawDate });
        }

        const descColumn = columns.find(col => DESCRIPTION_REGEX.test(col)) || "description";
        const rawDescription = r[descColumn] ?? r.description ?? r.Description ?? r.DESCRIPTION ?? "";

        const amountColumn = columns.find(col => AMOUNT_REGEX.test(col)) || "amount";
        const rawAmount = r[amountColumn] ?? r.amount ?? r.Amount ?? r.AMOUNT ?? 0;

        const balanceColumn = columns.find(col => BALANCE_REGEX.test(col));
        const rawBalance = balanceColumn ? r[balanceColumn] : (r.balance ?? r.Balance ?? r.BALANCE);

        const parsedAmount = coerceNumber(rawAmount);
        const parsedBalance = coerceNumber(rawBalance);

        return {
            date: normalizedDate || "",
            description: String(rawDescription ?? "").trim(),
            amount: parsedAmount ?? 0,
            balance: parsedBalance ?? null,
            category: (r.category ?? r.Category ?? r.CATEGORY ?? "").trim() || undefined
        };
    });

    const validRows = rows.filter((row, index) => {
        const dateStr = row.date?.trim() ?? "";
        const isDateValid = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
        const hasDescription = !!(row.description && row.description.trim().length > 0);
        const hasAmount = typeof row.amount === "number" && !isNaN(row.amount);
        const hasBalance = typeof row.balance === "number" && !isNaN(row.balance);

        const strictValid = isDateValid && (hasDescription || hasAmount || hasBalance);
        if (strictValid) {
            return true;
        }

        const softValid = hasDescription || hasAmount || hasBalance;
        if (softValid) {
            diagnostics.softValidatedCount++;
            if (!isDateValid && diagnostics.warnings.length < 5) {
                diagnostics.warnings.push(`Row ${index} kept with missing/invalid date but has data.`);
            }
            return true;
        }

        if (diagnostics.filteredOutSamples.length < 5) {
            diagnostics.filteredOutSamples.push({
                index,
                reason: "Missing date/description/amount",
                row: {
                    date: row.date,
                    description: row.description,
                    amount: row.amount,
                    balance: row.balance
                }
            });
        }

        return false;
    });

    diagnostics.rowsAfterFiltering = validRows.length;

    if (validRows.length === 0) {
        console.error(`[CLIENT] ERROR: No valid rows found. Columns:`, columns);
        if (rows.length > 0) {
            console.error(`[CLIENT] First raw row sample:`, rowsData[0]);
        }
    }

    if (options?.returnDiagnostics) {
        return {
            rows: validRows,
            diagnostics
        } as ParseCsvReturn<T>;
    }

    return validRows as ParseCsvReturn<T>;
}
