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
    duplicatesDetected: number;
    warnings: string[];
};

type ParseCsvOptions =
    | undefined
    | { returnDiagnostics?: false }
    | { returnDiagnostics: true };

type ParseCsvReturn<T extends ParseCsvOptions> = T extends { returnDiagnostics: true }
    ? { rows: TxRow[]; diagnostics: CsvDiagnostics }
    : TxRow[];

type ParsedRowWithMeta = TxRow & {
    __rowIndex: number;
    __dateValid: boolean;
    __amountMissing: boolean;
    __balanceMissing: boolean;
    __descriptionMissing: boolean;
};

const HEADER_KEYWORDS = [
    "date", "fecha", "data", "description", "descripcion", "desc", "concepto",
    "detail", "detalle", "details", "detalles", "amount", "importe", "monto",
    "balance", "saldo", "solde", "transaction", "transactions", "debit", "credit",
    "value", "valor", "montant", "libelle", "memo", "note", "category", "categorie",
    "categoria", "movement", "movimiento", "operation", "operacion"
];

const DELIMITER_CANDIDATES = [",", ";", "\t", "|"];

const DATE_COLUMN_NAMES = [
    "date", "Date", "DATE", "tx_date", "TxDate", "TX_DATE",
    "transaction_date", "TransactionDate", "TRANSACTION_DATE",
    "transaction date", "Transaction Date", "TRANSACTION DATE",
    "posted_date", "PostedDate", "POSTED_DATE",
    "value_date", "ValueDate", "VALUE_DATE",
    "booking_date", "BookingDate", "BOOKING_DATE",
    "fecha", "Fecha", "FECHA", "fecha_operacion", "fecha_valor"
];

const TIME_COLUMN_NAMES = [
    "time", "Time", "TIME", "tx_time", "TxTime", "TX_TIME",
    "transaction_time", "TransactionTime", "TRANSACTION_TIME",
    "transaction time", "Transaction Time", "TRANSACTION TIME",
    "posted_time", "PostedTime", "POSTED_TIME",
    "posting_time", "PostingTime", "POSTING_TIME",
    "hora", "Hora", "HORA"
];

const DESCRIPTION_REGEX = /description|desc|memo|note|details|narration|particulars|concept|concepto|detalle|detalles|descripcion|libelle|movement|movimiento|operation|operacion|merchant|payee/i;
const AMOUNT_REGEX = /amount|amt|value|importe|monto|montant|debit|credit|cargo|abono|haber|credito|debito/i;
const BALANCE_REGEX = /balance|bal|running.*balance|saldo|solde|available/i;
const DEBIT_REGEX = /\b(debit|debito|debe|cargo|dr)\b/i;
const CREDIT_REGEX = /\b(credit|credito|haber|abono|cr)\b/i;
const TYPE_REGEX = /\b(type|movement|movimiento|transaction type|debit\/credit|dr\/cr|dc)\b/i;

function normalizeHeaderText(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function includesHeaderKeyword(value: string, keywords: string[]): boolean {
    return keywords.some((keyword) => value.includes(keyword));
}

function findColumnByRegex(
    columns: string[],
    normalizedColumns: string[],
    regex: RegExp
): string | undefined {
    const index = normalizedColumns.findIndex((value) => regex.test(value));
    return index >= 0 ? columns[index] : undefined;
}

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
        /^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/.test(value) ||
        /^\d{4}\/\d{2}\/\d{2}/.test(value) ||
        /^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/.test(value) ||
        /^\d{1,2}\.\d{1,2}\.\d{2,4}/.test(value) ||
        /^\d{1,2}\s[a-zA-Z]{3}\s\d{4}/.test(value) ||
        /^\d{8}$/.test(value)
    );
}

type DateOrder = "dmy" | "mdy";

function inferDateOrder(samples: string[]): DateOrder | null {
    let dmyScore = 0;
    let mdyScore = 0;

    for (const sample of samples) {
        const trimmed = String(sample).trim();
        const match = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
        if (!match) continue;
        const part1 = parseInt(match[1], 10);
        const part2 = parseInt(match[2], 10);
        if (part1 > 12 && part2 <= 12) {
            dmyScore += 1;
        } else if (part2 > 12 && part1 <= 12) {
            mdyScore += 1;
        }
    }

    if (dmyScore > mdyScore) return "dmy";
    if (mdyScore > dmyScore) return "mdy";
    return null;
}

function normalizeDate(dateStr: string, dateOrder?: DateOrder | null): string {
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

    const isoSlashMatch = datePart.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (isoSlashMatch) {
        const [, year, month, day] = isoSlashMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    if (/^\d{8}$/.test(datePart)) {
        const year = datePart.slice(0, 4);
        const month = datePart.slice(4, 6);
        const day = datePart.slice(6, 8);
        return `${year}-${month}-${day}`;
    }

    const slashMatch = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (slashMatch) {
        const [, part1, part2, year] = slashMatch;
        const num1 = parseInt(part1, 10);
        const num2 = parseInt(part2, 10);
        const fullYear = year.length === 2 ? `20${year}` : year;
        if (num1 > 12) {
            return `${fullYear}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
        }
        if (num2 > 12) {
            return `${fullYear}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
        }
        if (dateOrder === "mdy") {
            return `${fullYear}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
        }
        return `${fullYear}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
    }

    const dotMatch = datePart.match(/^(\d{1,4})\.(\d{1,2})\.(\d{1,4})$/);
    if (dotMatch) {
        const [, a, b, c] = dotMatch;
        if (a.length === 4) {
            return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
        }
        const fullYear = c.length === 2 ? `20${c}` : c.padStart(4, '0');
        return `${fullYear}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    }

    const dashMatch = datePart.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})/);
    if (dashMatch) {
        const [, part1, part2, year] = dashMatch;
        const num1 = parseInt(part1, 10);
        const num2 = parseInt(part2, 10);
        const fullYear = year.length === 2 ? `20${year}` : year;
        if (num1 > 12) {
            return `${fullYear}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
        }
        if (num2 > 12) {
            return `${fullYear}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
        }
        if (dateOrder === "mdy") {
            return `${fullYear}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
        }
        return `${fullYear}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
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

function normalizeTime(timeStr: string): string | null {
    if (timeStr == null) return null;
    const trimmed = String(timeStr).trim();
    if (trimmed === "") return null;

    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?$/);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = match[3] ? parseInt(match[3], 10) : 0;
    const meridiem = match[4]?.toLowerCase();

    if (minutes > 59 || seconds > 59) return null;

    if (meridiem) {
        if (hours < 1 || hours > 12) return null;
        if (meridiem === "am") {
            hours = hours === 12 ? 0 : hours;
        } else {
            hours = hours === 12 ? 12 : hours + 12;
        }
    } else if (hours > 23) {
        return null;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function extractTime(value: string): string | null {
    if (value == null) return null;
    const trimmed = String(value).trim();
    if (trimmed === "") return null;
    const match = trimmed.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AaPp][Mm])?)/);
    if (!match) return null;
    return normalizeTime(match[1]);
}

function detectDelimiter(csv: string): string {
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== "").slice(0, 10);
    if (lines.length === 0) return ",";

    let bestDelimiter = ",";
    let bestScore = 0;

    for (const delimiter of DELIMITER_CANDIDATES) {
        let totalSeparators = 0;
        let matchedLines = 0;

        for (const line of lines) {
            const count = line.split(delimiter).length - 1;
            if (count > 0) {
                totalSeparators += count;
                matchedLines += 1;
            }
        }

        if (matchedLines === 0) continue;

        const avgSeparators = totalSeparators / matchedLines;
        const coverageBonus = matchedLines / lines.length;
        const score = avgSeparators + coverageBonus;

        if (score > bestScore) {
            bestScore = score;
            bestDelimiter = delimiter;
        }
    }

    return bestDelimiter;
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
        const rowText = row.map(cell => normalizeHeaderText(String(cell || ""))).join(" ");
        const matches = HEADER_KEYWORDS.filter(keyword => rowText.includes(keyword));
        if (matches.length >= 2) {
            headerRowIndex = i;
            console.log(`[CSV Preprocess] Found header row at line ${i + 1} with keywords: ${matches.join(", ")}`);
            break;
        }

        const hasDateHeader = row.some(cell => {
            const cellLower = normalizeHeaderText(String(cell || ""));
            return includesHeaderKeyword(cellLower, [
                "date",
                "fecha",
                "transaction date",
                "posted date",
                "value date",
                "booking date"
            ]);
        });
        const hasAmountHeader = row.some(cell => {
            const cellLower = normalizeHeaderText(String(cell || ""));
            return includesHeaderKeyword(cellLower, ["amount", "importe", "monto", "montant", "debit", "credit"]);
        });
        const hasDescHeader = row.some(cell => {
            const cellLower = normalizeHeaderText(String(cell || ""));
            return includesHeaderKeyword(cellLower, [
                "description",
                "desc",
                "details",
                "detalle",
                "libelle",
                "memo",
                "note",
                "concepto",
                "transaction"
            ]);
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

export function coerceNumber(value: any): number | null {
    if (value == null || value === "") return null;
    if (typeof value === "number") return value;
    if (typeof value !== "string") return null;

    let normalized = value.trim();
    if (normalized === "") return null;

    // Extract and preserve the sign FIRST (before any processing)
    let isNegative = false;
    let forcedPositive = false;

    const trimmedForSign = normalized.trim();
    if (trimmedForSign.startsWith("(") && trimmedForSign.endsWith(")")) {
        isNegative = true;
        normalized = trimmedForSign.slice(1, -1);
    }

    const prefixMatch = normalized.match(/^(CR|DR)\s+/i);
    if (prefixMatch) {
        const prefix = prefixMatch[1].toUpperCase();
        if (prefix === "DR") {
            isNegative = true;
        } else if (prefix === "CR") {
            forcedPositive = true;
        }
        normalized = normalized.replace(/^(CR|DR)\s+/i, "");
    }

    const suffixMatch = normalized.match(/\s+(CR|DR)\s*$/i);
    if (suffixMatch) {
        const suffix = suffixMatch[1].toUpperCase();
        if (suffix === "DR") {
            isNegative = true;
        } else if (suffix === "CR") {
            forcedPositive = true;
        }
        normalized = normalized.replace(/\s+(CR|DR)\s*$/i, "");
    }

    if (!forcedPositive) {
        const shortSuffixMatch = normalized.match(/\s+([CD])\s*$/i);
        if (shortSuffixMatch) {
            const shortSuffix = shortSuffixMatch[1].toUpperCase();
            if (shortSuffix === "D") {
                isNegative = true;
            }
            normalized = normalized.replace(/\s+[CD]\s*$/i, "");
        }
    }
    // Check for leading/trailing sign markers (common in some exports)
    const signMatch = normalized.match(/^[+\-\u2212\u2012\u2013\u2014\uFE63\uFF0D]/);
    if (signMatch) {
        if (signMatch[0] !== "+") {
            isNegative = true;
        }
        normalized = normalized.slice(1);
    }
    const trailingSignMatch = normalized.match(/[+\-\u2212\u2012\u2013\u2014\uFE63\uFF0D]$/);
    if (trailingSignMatch) {
        if (trailingSignMatch[0] !== "+") {
            isNegative = true;
        }
        normalized = normalized.slice(0, -1);
    }
    // Normalize unicode minus-like characters
    normalized = normalized.replace(/[\u2212\u2012\u2013\u2014\uFE63\uFF0D]/g, "-");
    // If there's a minus anywhere now, it's negative
    if (normalized.includes("-")) {
        isNegative = true;
        normalized = normalized.replace(/-/g, "");
    }

    // Remove currency symbols and whitespace
    normalized = normalized
        .replace(/[^\d,.\s]/g, "")
        .replace(/\s/g, "");
    if (normalized === "") return null;

    // Handle European number format: "1.234,56" or "912,00" -> "1234.56" or "912.00"
    // Check if comma is used as decimal separator (European format)
    const hasComma = normalized.includes(',');
    const hasDot = normalized.includes('.');

    if (hasComma && hasDot) {
        // Both present - determine which is decimal separator
        const lastComma = normalized.lastIndexOf(',');
        const lastDot = normalized.lastIndexOf('.');
        if (lastComma > lastDot) {
            // Comma is decimal: "1.234,56" -> "1234.56"
            normalized = normalized.replace(/\./g, "").replace(",", ".");
        } else {
            // Dot is decimal: "1,234.56" -> "1234.56"
            normalized = normalized.replace(/,/g, "");
        }
    } else if (hasComma) {
        // Only comma - check if it's decimal separator (1-2 digits after comma)
        const commaIndex = normalized.lastIndexOf(',');
        const afterComma = normalized.slice(commaIndex + 1);
        if (afterComma.length <= 2 && /^\d{1,2}$/.test(afterComma)) {
            // European format: "912,00" -> "912.00"
            normalized = normalized.replace(",", ".");
        } else {
            // Thousands separator: "1,234" -> "1234"
            normalized = normalized.replace(/,/g, "");
        }
    } else if (hasDot) {
        // Only dot - check if it's thousands separator or decimal
        const dotCount = (normalized.match(/\./g) || []).length;
        if (dotCount > 1) {
            // Multiple dots = thousands separators: "1.234.567" -> "1234567"
            normalized = normalized.replace(/\./g, "");
        } else {
            // Single dot - check if decimal (1-2 digits after) or thousands (3 digits after)
            const dotIndex = normalized.lastIndexOf('.');
            const afterDot = normalized.slice(dotIndex + 1);
            if (afterDot.length === 3 && /^\d{3}$/.test(afterDot)) {
                // Likely thousands: "1.234" -> "1234"
                normalized = normalized.replace(/\./g, "");
            }
            // Otherwise keep as decimal separator
        }
    }

    // Remove any remaining non-numeric characters except dot
    normalized = normalized.replace(/[^0-9.]/g, "");

    // Handle multiple dots (shouldn't happen after above logic, but safety check)
    if ((normalized.match(/\./g) || []).length > 1) {
        const lastDot = normalized.lastIndexOf(".");
        normalized = normalized.replace(/\./g, "");
        normalized = `${normalized.slice(0, lastDot)}.${normalized.slice(lastDot)}`;
    }

    // Add minus sign at the beginning if negative
    if (forcedPositive) {
        isNegative = false;
    }

    if (isNegative && normalized) {
        normalized = "-" + normalized;
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

function mergeMultilineRows(rows: ParsedRowWithMeta[], diagnostics: CsvDiagnostics): ParsedRowWithMeta[] {
    const merged: ParsedRowWithMeta[] = [];
    let pending: ParsedRowWithMeta | null = null;
    let mergedCount = 0;
    let mergedAmountCount = 0;

    const appendDescription = (target: ParsedRowWithMeta, extra: string) => {
        const base = target.description?.trim() ?? "";
        const addition = extra?.trim() ?? "";
        if (!addition) return;
        target.description = base ? `${base} ${addition}` : addition;
        target.__descriptionMissing = target.description.trim().length === 0;
    };

    for (const row of rows) {
        const hasDate = row.__dateValid;
        const hasDescription = !row.__descriptionMissing;
        const hasAmount = !row.__amountMissing;
        const hasBalance = !row.__balanceMissing;

        if (!hasDate && pending) {
            const isDescriptionOnly = hasDescription && !hasAmount && !hasBalance;
            const isAmountOnly = !hasDescription && (hasAmount || hasBalance);
            const canFillAmounts = (pending.__amountMissing || pending.__balanceMissing) && (hasAmount || hasBalance);

            if (isDescriptionOnly) {
                appendDescription(pending, row.description);
                mergedCount += 1;
                continue;
            }

            if (isAmountOnly || canFillAmounts) {
                if (hasAmount && pending.__amountMissing) {
                    pending.amount = row.amount;
                    pending.__amountMissing = false;
                    mergedAmountCount += 1;
                }
                if (hasBalance && pending.__balanceMissing) {
                    pending.balance = row.balance;
                    pending.__balanceMissing = false;
                    mergedAmountCount += 1;
                }
                if (hasDescription) {
                    appendDescription(pending, row.description);
                }
                mergedCount += 1;
                continue;
            }
        }

        if (pending) {
            merged.push(pending);
        }
        pending = row;
    }

    if (pending) {
        merged.push(pending);
    }

    if (mergedCount > 0) {
        diagnostics.warnings.push(`${mergedCount} continuation line(s) merged into previous rows.`);
    }
    if (mergedAmountCount > 0) {
        diagnostics.warnings.push(`${mergedAmountCount} continuation line(s) supplied missing amounts/balances.`);
    }

    return merged;
}

export function parseCsvToRows(csv: string): TxRow[];
export function parseCsvToRows(csv: string, options: { returnDiagnostics: true }): { rows: TxRow[]; diagnostics: CsvDiagnostics };
export function parseCsvToRows<T extends ParseCsvOptions>(csv: string, options?: T): ParseCsvReturn<T> {
    // Handle empty or whitespace-only input
    if (!csv || csv.trim().length === 0) {
        throw new Error("Empty file: The CSV file contains no data.");
    }

    const detectedDelimiter = detectDelimiter(csv);
    const delimiterLabel = detectedDelimiter === "\t"
        ? "TAB"
        : detectedDelimiter === ";"
            ? "SEMICOLON"
            : detectedDelimiter === "|"
                ? "PIPE"
                : "COMMA";

    console.log(`[CSV Parser] Delimiter: ${delimiterLabel}, Length: ${csv.length}`);

    const { csv: cleanedCsv, delimiter, headerRowIndex } = preprocessCsv(csv, detectedDelimiter);
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
        const rawParsed = Papa.parse<any[]>(cleanedCsv, {
            header: false,
            skipEmptyLines: true,
            delimiter
        });
        const mapped = mapArraysToObjects(rawParsed);
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
        duplicatesDetected: 0,
        warnings: []
    };

    const normalizedColumns = columns.map(normalizeHeaderText);
    const descriptionHeaderColumn = findColumnByRegex(columns, normalizedColumns, DESCRIPTION_REGEX);
    const amountHeaderColumn = findColumnByRegex(columns, normalizedColumns, AMOUNT_REGEX);
    const balanceHeaderColumn = findColumnByRegex(columns, normalizedColumns, BALANCE_REGEX);
    const debitHeaderColumn = findColumnByRegex(columns, normalizedColumns, DEBIT_REGEX);
    const creditHeaderColumn = findColumnByRegex(columns, normalizedColumns, CREDIT_REGEX);
    const typeHeaderColumn = findColumnByRegex(columns, normalizedColumns, TYPE_REGEX);

    const dateSamples: string[] = [];
    for (let i = 0; i < Math.min(rowsData.length, 120); i++) {
        const row = rowsData[i];
        for (const col of columns) {
            const value = row?.[col];
            if (value == null) continue;
            const strValue = String(value).trim();
            if (!strValue) continue;
            if (looksLikeDate(strValue)) {
                dateSamples.push(strValue);
                if (dateSamples.length >= 40) break;
            }
        }
        if (dateSamples.length >= 40) break;
    }
    const inferredDateOrder = inferDateOrder(dateSamples);

    // Helper function to find numeric columns (excluding dates)
    function findNumericColumn(row: Record<string, any>, columns: string[], excludeColumns: string[] = []): string | undefined {
        for (const col of columns) {
            if (excludeColumns.includes(col)) continue;
            const value = row[col];
            if (value != null && value !== "") {
                const strValue = String(value).trim();
                // Check if it looks like a number (has digits and possibly comma/dot/currency)
                if (/[\d,.\-€$£¥]/.test(strValue) && !looksLikeDate(strValue)) {
                    // Try to parse it - if it's a valid number, this is likely an amount/balance
                    // NOTE: We now accept 0 amounts (fee reversals, adjustments)
                    const testNum = coerceNumber(strValue);
                    if (testNum !== null) {
                        return col;
                    }
                }
            }
        }
        return undefined;
    }

    const rows = rowsData.map((r, index): ParsedRowWithMeta => {
        // Find all date columns first (there might be multiple)
        const dateColumns: string[] = [];
        for (const colName of DATE_COLUMN_NAMES) {
            if (r[colName] != null && String(r[colName]).trim() !== "") {
                dateColumns.push(colName);
            }
        }
        for (const col of columns) {
            if (!dateColumns.includes(col)) {
                const value = r[col];
                if (value != null) {
                    const strValue = String(value).trim();
                    if (looksLikeDate(strValue)) {
                        dateColumns.push(col);
                    }
                }
            }
        }

        // Use the first date column found
        let rawDate = "";
        if (dateColumns.length > 0) {
            rawDate = String(r[dateColumns[0]] ?? "");
        }

        // Find time column (if separate) or extract from date string
        let rawTime = "";
        let timeColumn: string | undefined;
        for (const colName of TIME_COLUMN_NAMES) {
            if (r[colName] != null && String(r[colName]).trim() !== "") {
                timeColumn = colName;
                break;
            }
        }
        if (!timeColumn) {
            for (const col of columns) {
                if (dateColumns.includes(col)) continue;
                const value = r[col];
                if (value != null && String(value).trim() !== "") {
                    if (normalizeTime(String(value))) {
                        timeColumn = col;
                        break;
                    }
                }
            }
        }
        if (timeColumn) {
            rawTime = String(r[timeColumn] ?? "");
        }

        const normalizedDate = normalizeDate(rawDate, inferredDateOrder);
        const normalizedTime = normalizeTime(rawTime) ?? extractTime(rawDate);
        if (!normalizedDate && rawDate && diagnostics.invalidDateSamples.length < 5) {
            diagnostics.invalidDateSamples.push({ index, value: rawDate });
        }

        // Find description column - exclude date columns
        let descColumn = descriptionHeaderColumn;
        if (!descColumn) {
            descColumn = columns.find((col, colIndex) =>
                !dateColumns.includes(col) &&
                col !== timeColumn &&
                DESCRIPTION_REGEX.test(normalizedColumns[colIndex] || "")
            );
        }
        if (!descColumn) {
            // Try to find a column with text (not date, not number)
            for (const col of columns) {
                if (dateColumns.includes(col) || col === timeColumn) continue;
                const value = r[col];
                if (value != null) {
                    const strValue = String(value).trim();
                    if (strValue.length > 10 && !looksLikeDate(strValue) && !/^[\d,.\-€$£¥\s]+$/.test(strValue)) {
                        descColumn = col;
                        break;
                    }
                }
            }
        }
        const rawDescription = descColumn ? (r[descColumn] ?? "") : (r.description ?? r.Description ?? r.DESCRIPTION ?? "");
        const normalizedDescription = String(rawDescription ?? "").trim();

        // Find amount column - exclude date columns and description column
        let amountColumn = amountHeaderColumn;
        if (!amountColumn) {
            amountColumn = columns.find((col, colIndex) =>
                !dateColumns.includes(col) &&
                col !== descColumn &&
                col !== timeColumn &&
                AMOUNT_REGEX.test(normalizedColumns[colIndex] || "")
            );
        }
        if (!amountColumn) {
            // Try to find numeric column (excluding dates and description)
            const excludeCols = [...dateColumns, descColumn, timeColumn].filter(
                (col): col is string => Boolean(col)
            );
            amountColumn = findNumericColumn(r, columns, excludeCols);
        }
        if (!amountColumn) {
            // Fallback to named columns
            amountColumn = "amount";
        }
        const rawAmount = amountColumn && r[amountColumn] != null ? r[amountColumn] : (r.amount ?? r.Amount ?? r.AMOUNT ?? 0);
        const rawAmountString = String(rawAmount ?? "").trim();

        // Find balance column - exclude date columns, description, and amount columns
        let balanceColumn = balanceHeaderColumn;
        if (!balanceColumn) {
            balanceColumn = columns.find((col, colIndex) =>
                !dateColumns.includes(col) &&
                col !== descColumn &&
                col !== amountColumn &&
                col !== timeColumn &&
                BALANCE_REGEX.test(normalizedColumns[colIndex] || "")
            );
        }
        if (!balanceColumn) {
            // Try to find another numeric column
            const excludeCols = [...dateColumns, descColumn, amountColumn, timeColumn].filter(
                (col): col is string => Boolean(col)
            );
            balanceColumn = findNumericColumn(r, columns, excludeCols);
        }
        const rawBalance = balanceColumn && r[balanceColumn] != null ? r[balanceColumn] : (r.balance ?? r.Balance ?? r.BALANCE);
        const rawBalanceString = String(rawBalance ?? "").trim();

        let parsedAmount = coerceNumber(rawAmount);
        const debitValue = debitHeaderColumn ? coerceNumber(r[debitHeaderColumn]) : null;
        const creditValue = creditHeaderColumn ? coerceNumber(r[creditHeaderColumn]) : null;
        const rawTypeValue = typeHeaderColumn ? String(r[typeHeaderColumn] ?? "") : "";
        const normalizedTypeValue = normalizeHeaderText(rawTypeValue);

        if (
            (parsedAmount == null || parsedAmount === 0) &&
            (debitValue != null || creditValue != null)
        ) {
            if (creditValue != null && debitValue != null) {
                parsedAmount = creditValue - Math.abs(debitValue);
            } else if (creditValue != null) {
                parsedAmount = creditValue;
            } else if (debitValue != null) {
                parsedAmount = -Math.abs(debitValue);
            }
        }

        if (parsedAmount != null && rawTypeValue) {
            if (/\b(debit|debito|cargo|dr)\b/i.test(normalizedTypeValue)) {
                parsedAmount = -Math.abs(parsedAmount);
            } else if (/\b(credit|credito|abono|haber|cr)\b/i.test(normalizedTypeValue)) {
                parsedAmount = Math.abs(parsedAmount);
            }
        }
        const parsedBalance = coerceNumber(rawBalance);
        const amountMissing =
            parsedAmount == null &&
            debitValue == null &&
            creditValue == null &&
            rawAmountString === "";
        const balanceMissing = parsedBalance == null && rawBalanceString === "";
        const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(normalizedDate);
        const descriptionMissing = normalizedDescription.length === 0;

        return {
            date: normalizedDate || "",
            time: normalizedTime ?? null,
            description: normalizedDescription,
            amount: parsedAmount ?? 0,
            balance: parsedBalance ?? null,
            category: (r.category ?? r.Category ?? r.CATEGORY ?? "").trim() || undefined,
            __rowIndex: index,
            __dateValid: dateValid,
            __amountMissing: amountMissing,
            __balanceMissing: balanceMissing,
            __descriptionMissing: descriptionMissing,
        };
    });

    const mergedRows = mergeMultilineRows(rows, diagnostics);
    diagnostics.rowsAfterPreprocess = mergedRows.length;

    const validRows = mergedRows.filter((row, index) => {
        const dateStr = row.date?.trim() ?? "";
        const isDateValid = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
        const hasDescription = !!(row.description && row.description.trim().length > 0);
        // NOTE: We now accept amount=0 (fee reversals, adjustments)
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
                diagnostics.warnings.push(`Row ${index + 1}: Kept with missing/invalid date.`);
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

    // Detect duplicates (same date, description, amount)
    const seen = new Set<string>();
    for (const row of validRows) {
        const key = `${row.date}|${row.description}|${row.amount}`;
        if (seen.has(key)) {
            diagnostics.duplicatesDetected++;
        } else {
            seen.add(key);
        }
    }
    if (diagnostics.duplicatesDetected > 0) {
        diagnostics.warnings.push(`${diagnostics.duplicatesDetected} potential duplicate transaction(s) detected.`);
    }

    diagnostics.rowsAfterFiltering = validRows.length;

    if (validRows.length === 0) {
        console.error(`[CSV Parser] No valid rows found. Columns:`, columns);
        if (rows.length > 0) {
            console.error(`[CSV Parser] First raw row:`, rowsData[0]);
        }
        throw new Error("No valid transactions found in the CSV. Please check that the file has Date, Description, and Amount columns.");
    }

    if (options?.returnDiagnostics) {
        return {
            rows: validRows as TxRow[],
            diagnostics
        } as ParseCsvReturn<T>;
    }

    return validRows as unknown as ParseCsvReturn<T>;
}
