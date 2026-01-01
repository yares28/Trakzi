// app/api/statements/parse/route.ts
import { NextRequest, NextResponse } from "next/server";
import { saveFileToNeon } from "@/lib/files/saveFileToNeon";
import { parseCsvToRows, type CsvDiagnostics, coerceNumber } from "@/lib/parsing/parseCsvToRows";
import { rowsToCanonicalCsv } from "@/lib/parsing/rowsToCanonicalCsv";
import { buildStatementParseQuality } from "@/lib/parsing/statement-parse-quality";
import { detectDocumentKindFromText } from "@/lib/parsing/detect-document-kind";
import { categoriseTransactions } from "@/lib/ai/categoriseTransactions";
import { TxRow } from "@/lib/types/transactions";
import { getSiteName, getSiteUrl } from "@/lib/env";
import { getCurrentUserId } from "@/lib/auth";
import { getTransactionCategoryPreferences } from "@/lib/transactions/transaction-category-preferences";
import { detectLanguageFromSamples } from "@/lib/language/language-detection";
import { extractTextFromImage } from "@/lib/receipts/ocr";
import Papa from "papaparse";
import * as XLSX from "xlsx";

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type AiParseHint = {
    delimiter: string | null;
    headerRowIndex: number | null;
    columnMap: {
        date: number | null;
        time?: number | null;
        description: number | null;
        amount: number | null;
        debit?: number | null;
        credit?: number | null;
        type?: number | null;
        balance?: number | null;
        category?: number | null;
    };
};

const AI_PARSE_MODEL = "google/gemini-2.0-flash-001";
const ALLOWED_DELIMITERS = new Set([",", ";", "\t", "|"]);
const PDF_MIN_TEXT_CHARS_TOTAL = 120;
const PDF_MIN_TEXT_CHARS_PER_PAGE = 60;
const PDF_OCR_SCALE = 2;
const AI_STATEMENT_MAX_CHARS = 4200;
const STATEMENT_COLUMNS = ["date", "time", "description", "amount", "balance", "category", "debit", "credit", "type"];
const GENERIC_PARSE_ERROR = "We couldn't parse this file. Try AI reparse or upload a CSV/XLSX.";

type StatementRow = {
    date?: string;
    time?: string;
    description?: string;
    amount?: string | number | null;
    balance?: string | number | null;
    category?: string | null;
    debit?: string | number | null;
    credit?: string | number | null;
    type?: string | null;
};

function logParseDiagnostics(params: {
    fileId: string | undefined;
    fileName: string;
    parseMode: string;
    source: string;
    diagnostics?: CsvDiagnostics | null;
    extra?: Record<string, unknown>;
}) {
    console.info("[Statements Parse] Diagnostics", {
        fileId: params.fileId,
        fileName: params.fileName,
        parseMode: params.parseMode,
        source: params.source,
        diagnostics: params.diagnostics,
        ...params.extra,
    });
}

function logParseFailure(params: {
    fileId: string | undefined;
    fileName: string;
    parseMode: string;
    source: string;
    error: unknown;
    diagnostics?: CsvDiagnostics | null;
    extra?: Record<string, unknown>;
}) {
    const message = params.error instanceof Error ? params.error.message : String(params.error);
    console.error("[Statements Parse] Failure", {
        fileId: params.fileId,
        fileName: params.fileName,
        parseMode: params.parseMode,
        source: params.source,
        error: message,
        diagnostics: params.diagnostics,
        ...params.extra,
    });
}

function normalizeDelimiter(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "tab" || trimmed === "\\t" || trimmed === "t") return "\t";
    if (ALLOWED_DELIMITERS.has(value)) return value;
    if (ALLOWED_DELIMITERS.has(trimmed)) return trimmed;
    return null;
}

function normalizeColumnIndex(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        return Math.floor(value);
    }
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    return null;
}

function parseCustomCategoriesHeader(value: string | null): { categories?: string[]; warning?: string } {
    if (!value) return {};
    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) {
            return { warning: "Custom categories header was not an array." };
        }
        const names: string[] = [];
        for (const entry of parsed) {
            if (typeof entry === "string") {
                names.push(entry);
                continue;
            }
            if (entry && typeof entry === "object") {
                const name = (entry as { name?: unknown }).name;
                if (typeof name === "string") {
                    names.push(name);
                }
            }
        }
        const cleaned = names
            .map((name) => name.trim())
            .filter((name) => name.length > 0);
        return cleaned.length > 0
            ? { categories: cleaned }
            : { warning: "Custom categories header had no valid names." };
    } catch {
        return { warning: "Custom categories header was not valid JSON." };
    }
}

function normalizeTypeValue(value: string): string {
    return value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function evaluateParseQuality(rows: TxRow[], diagnostics: CsvDiagnostics): { failed: boolean; reason?: string } {
    if (rows.length === 0) {
        return { failed: true, reason: "No rows were parsed from the CSV." };
    }

    const total = rows.length;
    const missingDateCount = rows.filter((row) => !row.date || row.date.trim() === "").length;
    const missingDescriptionCount = rows.filter((row) => !row.description || row.description.trim() === "").length;
    const missingDateRatio = missingDateCount / total;
    const missingDescriptionRatio = missingDescriptionCount / total;
    const coverageRatio = diagnostics.totalRowsInFile > 0
        ? diagnostics.rowsAfterFiltering / diagnostics.totalRowsInFile
        : 1;

    if (missingDateRatio > 0.4) {
        return { failed: true, reason: "Too many rows have empty dates after parsing." };
    }
    if (missingDescriptionRatio > 0.4) {
        return { failed: true, reason: "Too many rows have empty descriptions after parsing." };
    }
    if (coverageRatio < 0.5) {
        return { failed: true, reason: "Too many rows were filtered out during parsing." };
    }

    return { failed: false };
}

function assertParseQuality(rows: TxRow[], diagnostics: CsvDiagnostics): void {
    const quality = evaluateParseQuality(rows, diagnostics);
    if (quality.failed) {
        throw new Error(quality.reason || "Parsing quality is too low.");
    }
}

function normalizeStatementHeader(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function splitStatementColumns(line: string): string[] {
    if (!line) return [];
    if (line.includes("\t")) {
        return line.split(/\t+/).map((cell) => cell.trim()).filter(Boolean);
    }
    return line.split(/\s{2,}/).map((cell) => cell.trim()).filter(Boolean);
}

function looksLikeDate(value: string): boolean {
    if (!value) return false;
    const trimmed = value.trim();
    return (
        /^\d{4}-\d{2}-\d{2}/.test(trimmed) ||
        /^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/.test(trimmed) ||
        /^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/.test(trimmed) ||
        /^\d{1,2}\.\d{1,2}\.\d{2,4}/.test(trimmed) ||
        /^\d{1,2}\s[a-zA-Z]{3}\s\d{4}/.test(trimmed)
    );
}

function extractTimeToken(value: string): string | null {
    const match = value.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AaPp][Mm])?)/);
    if (!match) return null;
    return match[1];
}

function detectStatementHeader(lines: string[]) {
    for (let i = 0; i < Math.min(lines.length, 40); i += 1) {
        const line = lines[i];
        if (!line) continue;
        const columns = splitStatementColumns(line);
        if (columns.length < 2) continue;
        const normalized = columns.map(normalizeStatementHeader);
        const columnMap: Partial<Record<keyof StatementRow, number>> = {};

        normalized.forEach((token, idx) => {
            if (!token) return;
            if (/(date|fecha|data|posting date|value date|booking date)/.test(token)) {
                columnMap.date = idx;
            } else if (/(time|hora)/.test(token)) {
                columnMap.time = idx;
            } else if (/(description|descripcion|concepto|detalle|details|movement|operacion|operation|payee|merchant|libelle)/.test(token)) {
                columnMap.description = idx;
            } else if (/(amount|importe|monto|montant|valor|value)/.test(token)) {
                columnMap.amount = idx;
            } else if (/(debit|debito|cargo|dr)/.test(token)) {
                columnMap.debit = idx;
            } else if (/(credit|credito|abono|haber|cr)/.test(token)) {
                columnMap.credit = idx;
            } else if (/(balance|saldo|solde)/.test(token)) {
                columnMap.balance = idx;
            } else if (/(category|categoria|categorie)/.test(token)) {
                columnMap.category = idx;
            } else if (/(type|movement type|transaction type)/.test(token)) {
                columnMap.type = idx;
            }
        });

        const hasDate = columnMap.date != null;
        const hasDescription = columnMap.description != null;
        const hasAmount = columnMap.amount != null || (columnMap.debit != null && columnMap.credit != null);

        if (hasDate && hasDescription && hasAmount) {
            return { headerIndex: i, columnMap };
        }
    }

    return null;
}

function shouldSkipStatementLine(line: string): boolean {
    const normalized = normalizeStatementHeader(line);
    return (
        normalized.startsWith("page ") ||
        normalized.includes("page of") ||
        normalized.includes("saldo anterior") ||
        normalized.includes("balance forward")
    );
}

function extractStatementRowsFromText(text: string): StatementRow[] {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.replace(/\s+$/g, "").trim())
        .filter((line) => line.length > 0);

    const headerInfo = detectStatementHeader(lines);
    const rows: StatementRow[] = [];
    let activeRow: StatementRow | null = null;

    const pushRow = () => {
        if (!activeRow) return;
        if (!activeRow.description && !activeRow.amount && !activeRow.debit && !activeRow.credit) {
            return;
        }
        rows.push(activeRow);
        activeRow = null;
    };

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (shouldSkipStatementLine(line)) continue;
        if (headerInfo && i <= headerInfo.headerIndex) continue;

        const columns = splitStatementColumns(line);
        const dateFromLine = columns.find((value) => looksLikeDate(value)) ?? "";

        if (headerInfo) {
            const { columnMap } = headerInfo;
            const dateValue = columnMap.date != null ? columns[columnMap.date] : dateFromLine;
            if (!dateValue || !looksLikeDate(dateValue)) {
                if (activeRow) {
                    activeRow.description = [activeRow.description, line].filter(Boolean).join(" ").trim();
                }
                continue;
            }

            pushRow();

            const description = columnMap.description != null ? columns[columnMap.description] : "";
            const time = columnMap.time != null ? columns[columnMap.time] : extractTimeToken(line) ?? "";
            const amount = columnMap.amount != null ? columns[columnMap.amount] : "";
            const debit = columnMap.debit != null ? columns[columnMap.debit] : "";
            const credit = columnMap.credit != null ? columns[columnMap.credit] : "";
            const balance = columnMap.balance != null ? columns[columnMap.balance] : "";
            const category = columnMap.category != null ? columns[columnMap.category] : "";
            const type = columnMap.type != null ? columns[columnMap.type] : "";

            activeRow = {
                date: dateValue,
                time,
                description,
                amount,
                debit,
                credit,
                balance,
                category,
                type,
            };
            continue;
        }

        if (!dateFromLine) {
            if (activeRow) {
                activeRow.description = [activeRow.description, line].filter(Boolean).join(" ").trim();
            }
            continue;
        }

        pushRow();

        const time = extractTimeToken(line) ?? "";
        const numericColumns = columns
            .map((value) => ({ value, amount: coerceNumber(value) }))
            .filter((entry) => entry.amount != null);

        let amount: string | number | null = "";
        let balance: string | number | null = "";

        if (numericColumns.length >= 2) {
            amount = numericColumns[numericColumns.length - 2]?.value ?? "";
            balance = numericColumns[numericColumns.length - 1]?.value ?? "";
        } else if (numericColumns.length === 1) {
            amount = numericColumns[0]?.value ?? "";
        }

        const descriptionParts = columns.filter((value) => !looksLikeDate(value));
        const description = descriptionParts
            .filter((value) => value !== amount && value !== balance && !extractTimeToken(value))
            .join(" ")
            .trim();

        const fallbackDescription = !description && dateFromLine
            ? line
                .replace(dateFromLine, "")
                .replace(String(amount ?? ""), "")
                .replace(String(balance ?? ""), "")
                .trim()
            : description;

        activeRow = {
            date: dateFromLine,
            time,
            description: fallbackDescription,
            amount,
            balance,
        };
    }

    pushRow();
    return rows;
}

function normalizeStatementRows(rows: StatementRow[]): StatementRow[] {
    return rows
        .map((row) => {
            const amount = coerceNumber(row.amount ?? "");
            const debit = coerceNumber(row.debit ?? "");
            const credit = coerceNumber(row.credit ?? "");
            const typeValue = row.type ? String(row.type) : "";
            let normalizedAmount = amount;

            if ((normalizedAmount == null || normalizedAmount === 0) && (debit != null || credit != null)) {
                if (credit != null && debit != null) {
                    normalizedAmount = credit - Math.abs(debit);
                } else if (credit != null) {
                    normalizedAmount = credit;
                } else if (debit != null) {
                    normalizedAmount = -Math.abs(debit);
                }
            }

            if (normalizedAmount != null && typeValue) {
                const normalizedType = normalizeTypeValue(typeValue);
                if (/\b(debit|debito|cargo|dr)\b/i.test(normalizedType)) {
                    normalizedAmount = -Math.abs(normalizedAmount);
                } else if (/\b(credit|credito|abono|haber|cr)\b/i.test(normalizedType)) {
                    normalizedAmount = Math.abs(normalizedAmount);
                }
            }

            return {
                date: row.date ?? "",
                time: row.time ?? "",
                description: row.description ?? "",
                amount: normalizedAmount ?? "",
                balance: row.balance ?? "",
                category: row.category ?? "",
                debit: row.debit ?? "",
                credit: row.credit ?? "",
                type: row.type ?? "",
            };
        })
        .filter((row) => Object.values(row).some((value) => String(value ?? "").trim().length > 0));
}

type CsvTemplate = {
    id: string;
    match: (csv: string, bankName: string) => boolean;
    parse: (csv: string) => StatementRow[];
};

type PdfTemplate = {
    id: string;
    match: (text: string, bankName: string) => boolean;
    parse: (text: string) => StatementRow[];
};

const AMOUNT_TOKEN_REGEX = /\u20AC?\s*[-\u2212]?\d[\d.,]*[.,]\d{2}\s*\u20AC?/g;
const SANTANDER_DATE_LINE_REGEX = /^\d{1,2}\s+[A-Za-z]{3,4}\s+\d{4}$/;
const REVOLUT_ROW_REGEX = /^([A-Za-z]{3}\s+\d{1,2},\s+\d{4})\s+([A-Za-z]{3}\s+\d{1,2},\s+\d{4})\s+(.+)$/;

function normalizeBankName(value: string | null | undefined): string {
    if (!value) return "";
    const trimmed = value.trim().toLowerCase();
    return trimmed === "unknown" ? "" : trimmed;
}

function detectCsvDelimiter(csv: string): string {
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== "").slice(0, 10);
    if (lines.length === 0) return ",";

    let bestDelimiter = ",";
    let bestScore = 0;
    const candidates = [",", ";", "\t", "|"];

    for (const delimiter of candidates) {
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

function sliceCsvToHeader(csv: string, matcher: (line: string) => boolean): string {
    const lines = csv.split(/\r?\n/);
    const headerIndex = lines.findIndex((line) => matcher(line));
    if (headerIndex < 0) return csv;
    return lines.slice(headerIndex).join("\n");
}

function getRowValue(row: Record<string, unknown>, key: string): string {
    if (row[key] != null) return String(row[key]);
    const match = Object.keys(row).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
    return match ? String(row[match] ?? "") : "";
}

function extractAmountTokens(line: string): string[] {
    return line.match(AMOUNT_TOKEN_REGEX) ?? [];
}

function cleanAmountTokens(line: string): string {
    return line.replace(AMOUNT_TOKEN_REGEX, "").replace(/\s{2,}/g, " ").trim();
}

function parseSantanderCsvTemplate(csv: string): StatementRow[] {
    const trimmed = sliceCsvToHeader(csv, (line) => {
        const lower = line.toLowerCase();
        return lower.includes("transaction date") && lower.includes("description") && lower.includes("amount");
    });
    const delimiter = detectCsvDelimiter(trimmed);
    const parsed = Papa.parse(trimmed, {
        header: true,
        skipEmptyLines: true,
        delimiter,
    });

    return (parsed.data as Record<string, unknown>[])
        .map((row) => {
            const date = getRowValue(row, "Transaction date") || getRowValue(row, "Value date");
            const description = getRowValue(row, "Description");
            const amount = getRowValue(row, "Amount");
            const balance = getRowValue(row, "Balance");
            const currency = getRowValue(row, "Currency");
            if (!date && !description && !amount && !balance && !currency) return null;
            return {
                date,
                description,
                amount,
                balance,
            } as StatementRow;
        })
        .filter((row): row is StatementRow => row !== null);
}

function parseRevolutCsvTemplate(csv: string): StatementRow[] {
    const delimiter = detectCsvDelimiter(csv);
    const parsed = Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
        delimiter,
    });

    return (parsed.data as Record<string, unknown>[])
        .map((row) => {
            const completed = getRowValue(row, "Completed Date");
            const started = getRowValue(row, "Started Date");
            const date = completed || started;
            const description = getRowValue(row, "Description");
            const amount = getRowValue(row, "Amount");
            const balance = getRowValue(row, "Balance");
            const type = getRowValue(row, "Type");
            if (!date && !description && !amount && !balance && !type) return null;
            return {
                date,
                description,
                amount,
                balance,
                type,
            } as StatementRow;
        })
        .filter((row): row is StatementRow => row !== null);
}

function shouldSkipRevolutLine(line: string): boolean {
    const normalized = normalizeStatementHeader(line);
    const compact = line.replace(/\s+/g, "");
    if (/^[A-Z]{2}\d{2}[A-Z0-9]{10,}$/.test(compact)) return true;
    if (/^[A-Z0-9]{8,11}$/.test(compact)) return true;
    return (
        normalized.startsWith("eur statement") ||
        normalized.startsWith("generated on") ||
        normalized.startsWith("revolut bank") ||
        normalized.startsWith("page of") ||
        normalized.includes("report lost") ||
        normalized.includes("get help directly") ||
        normalized.includes("scan the qr") ||
        normalized.startsWith("balance summary") ||
        normalized.startsWith("product opening balance") ||
        normalized.startsWith("account transactions") ||
        normalized.startsWith("transaction date value date") ||
        normalized === "iban" ||
        normalized === "bic" ||
        normalized.startsWith("account current account") ||
        normalized.startsWith("deposit") ||
        normalized.startsWith("total")
    );
}

function applyRevolutAmountSign(amount: number, description: string): number {
    const normalized = description.toLowerCase();
    const incoming = /(transfer from|from:|refund|cashback|salary|interest|dividend|reversal|chargeback|top up|credit)/;
    const outgoing = /(transfer to|to:|card|payment|fee|withdrawal|atm|cash|charge|purchase)/;
    if (incoming.test(normalized)) {
        return Math.abs(amount);
    }
    if (outgoing.test(normalized)) {
        return -Math.abs(amount);
    }
    return -Math.abs(amount);
}

function parseSantanderPdfTemplate(text: string): StatementRow[] {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    const rows: StatementRow[] = [];
    let activeRow: StatementRow | null = null;
    let descriptionParts: string[] = [];
    let pendingAmount: number | null = null;
    let pendingBalance: number | null = null;

    const pushRow = () => {
        if (!activeRow) return;
        const description = descriptionParts.join(" ").trim();
        if (!description && pendingAmount == null) return;
        activeRow.description = description;
        if (pendingAmount != null) activeRow.amount = pendingAmount;
        if (pendingBalance != null) activeRow.balance = pendingBalance;
        rows.push(activeRow);
        activeRow = null;
        descriptionParts = [];
        pendingAmount = null;
        pendingBalance = null;
    };

    for (const line of lines) {
        if (shouldSkipStatementLine(line)) continue;
        if (SANTANDER_DATE_LINE_REGEX.test(line)) {
            pushRow();
            activeRow = { date: line };
            continue;
        }

        if (!activeRow) continue;
        const lower = line.toLowerCase();
        if (lower.startsWith("value date")) {
            continue;
        }

        const tokens = extractAmountTokens(line);
        if (tokens.length > 0) {
            const cleaned = cleanAmountTokens(line);
            if (cleaned) {
                descriptionParts.push(cleaned);
            }
            const numbers = tokens
                .map((token) => coerceNumber(token))
                .filter((value): value is number => value != null);
            if (numbers.length >= 2) {
                pendingAmount = numbers[numbers.length - 2];
                pendingBalance = numbers[numbers.length - 1];
            } else if (numbers.length === 1) {
                pendingAmount = numbers[0];
            }
            continue;
        }

        descriptionParts.push(line);
    }

    pushRow();
    return rows;
}

function parseRevolutPdfTemplate(text: string): StatementRow[] {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    const rows: StatementRow[] = [];
    let activeRow: StatementRow | null = null;
    let descriptionParts: string[] = [];
    let pendingAmount: number | null = null;
    let pendingBalance: number | null = null;
    let pendingNeedsSign = false;

    const pushRow = () => {
        if (!activeRow) return;
        const description = descriptionParts.join(" ").trim();
        if (!description && pendingAmount == null) return;
        let amount = pendingAmount;
        if (amount != null && pendingNeedsSign) {
            amount = applyRevolutAmountSign(amount, description);
        }
        activeRow.description = description;
        if (amount != null) activeRow.amount = amount;
        if (pendingBalance != null) activeRow.balance = pendingBalance;
        rows.push(activeRow);
        activeRow = null;
        descriptionParts = [];
        pendingAmount = null;
        pendingBalance = null;
        pendingNeedsSign = false;
    };

    for (const line of lines) {
        if (shouldSkipRevolutLine(line)) continue;
        const match = line.match(REVOLUT_ROW_REGEX);
        if (match) {
            pushRow();
            const dateValue = match[1];
            const remainder = match[3];
            const tokens = extractAmountTokens(remainder);
            const cleaned = cleanAmountTokens(remainder);
            descriptionParts = cleaned ? [cleaned] : [];
            const numbers = tokens
                .map((token) => coerceNumber(token))
                .filter((value): value is number => value != null);

            pendingAmount = null;
            pendingBalance = null;
            pendingNeedsSign = false;

            if (numbers.length >= 3) {
                const moneyOut = numbers[numbers.length - 3];
                const moneyIn = numbers[numbers.length - 2];
                pendingBalance = numbers[numbers.length - 1];
                pendingAmount = moneyIn - Math.abs(moneyOut);
            } else if (numbers.length >= 2) {
                pendingAmount = numbers[numbers.length - 2];
                pendingBalance = numbers[numbers.length - 1];
                pendingNeedsSign = true;
            } else if (numbers.length === 1) {
                pendingAmount = numbers[0];
            }

            activeRow = { date: dateValue };
            continue;
        }

        if (!activeRow) continue;
        descriptionParts.push(line);
    }

    pushRow();
    return rows;
}

const CSV_TEMPLATES: CsvTemplate[] = [
    {
        id: "santander",
        match: (csv, bankName) => {
            const normalizedBank = normalizeBankName(bankName);
            if (normalizedBank.includes("santander")) return true;
            const sample = csv.split(/\r?\n/).slice(0, 20).join("\n").toLowerCase();
            return sample.includes("santander") ||
                (sample.includes("transaction date") && sample.includes("value date") && sample.includes("currency"));
        },
        parse: parseSantanderCsvTemplate,
    },
    {
        id: "revolut",
        match: (csv, bankName) => {
            const normalizedBank = normalizeBankName(bankName);
            if (normalizedBank.includes("revolut")) return true;
            const sample = csv.split(/\r?\n/).slice(0, 10).join("\n").toLowerCase();
            return sample.includes("started date") && sample.includes("completed date") && sample.includes("fee");
        },
        parse: parseRevolutCsvTemplate,
    },
];

const PDF_TEMPLATES: PdfTemplate[] = [
    {
        id: "santander",
        match: (text, bankName) => {
            const normalizedBank = normalizeBankName(bankName);
            if (normalizedBank.includes("santander")) return true;
            const sample = text.slice(0, 2000).toLowerCase();
            return (sample.includes("your account activity") && sample.includes("value date")) ||
                (sample.includes("account es") && sample.includes("value date"));
        },
        parse: parseSantanderPdfTemplate,
    },
    {
        id: "revolut",
        match: (text, bankName) => {
            const normalizedBank = normalizeBankName(bankName);
            if (normalizedBank.includes("revolut")) return true;
            return /revolut/i.test(text);
        },
        parse: parseRevolutPdfTemplate,
    },
];

function detectCsvTemplate(csv: string, bankName: string): CsvTemplate | null {
    return CSV_TEMPLATES.find((template) => template.match(csv, bankName)) ?? null;
}

function detectPdfTemplate(text: string, bankName: string): PdfTemplate | null {
    return PDF_TEMPLATES.find((template) => template.match(text, bankName)) ?? null;
}

function parseCsvWithTemplate(
    csvContent: string,
    template: CsvTemplate
): { rows: TxRow[]; diagnostics: CsvDiagnostics } {
    const templateRows = normalizeStatementRows(template.parse(csvContent));
    if (templateRows.length === 0) {
        throw new Error(`Template ${template.id} produced no rows.`);
    }
    const csv = buildCanonicalCsvFromStatementRows(templateRows);
    return parseCsvToRows(csv, { returnDiagnostics: true });
}

function buildCanonicalCsvFromStatementRows(rows: StatementRow[]): string {
    return Papa.unparse(rows, { columns: STATEMENT_COLUMNS });
}

function analyzePdfText(pages: string[]) {
    const pageCount = pages.length > 0 ? pages.length : 1;
    const combined = pages.join("\n");
    const charCount = combined.replace(/\s+/g, "").length;
    const charsPerPage = pageCount > 0 ? charCount / pageCount : charCount;
    const lowTextDensity = charCount < PDF_MIN_TEXT_CHARS_TOTAL || charsPerPage < PDF_MIN_TEXT_CHARS_PER_PAGE;
    return { pageCount, charCount, charsPerPage, lowTextDensity };
}

function extractCsvFromSpreadsheet(data: Uint8Array) {
    const workbook = XLSX.read(data, { type: "array", cellDates: true });
    const sheetNames = workbook.SheetNames || [];

    for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;
        const csv = XLSX.utils.sheet_to_csv(sheet, {
            FS: ",",
            RS: "\n",
            blankrows: false,
        });
        if (csv && csv.trim().length > 0) {
            return { csv, sheetName };
        }
    }

    throw new Error("Spreadsheet did not contain any data rows.");
}

function chunkStatementText(text: string, maxChars: number): string[] {
    if (!text) return [];
    const lines = text.split(/\r?\n/);
    const chunks: string[] = [];
    let buffer: string[] = [];
    let length = 0;

    for (const line of lines) {
        const nextLength = length + line.length + 1;
        if (nextLength > maxChars && buffer.length > 0) {
            chunks.push(buffer.join("\n"));
            buffer = [];
            length = 0;
        }
        buffer.push(line);
        length += line.length + 1;
    }
    if (buffer.length > 0) {
        chunks.push(buffer.join("\n"));
    }
    return chunks;
}

async function extractStatementTextFromPdf(data: Uint8Array) {
    const { extractText } = await import("unpdf");
    const result = await extractText(data);
    const pages = Array.isArray(result.text)
        ? result.text
        : typeof result.text === "string"
            ? [result.text]
            : [];
    const text = pages.join("\n");
    const metrics = analyzePdfText(pages);

    if (!metrics.lowTextDensity) {
        return {
            text,
            pages,
            source: "pdf_text" as const,
            metrics,
            ocrUsed: false,
            ocrRetryUsed: false,
        };
    }

    try {
        const { definePDFJSModule, renderPageAsImage } = await import("unpdf");
        await definePDFJSModule(() => import("pdfjs-dist"));

        const pageLimit = Math.max(1, metrics.pageCount);
        const ocrPages: string[] = [];
        let ocrRetryUsed = false;

        for (let page = 1; page <= pageLimit; page += 1) {
            const buffer = await renderPageAsImage(data, page, {
                canvasImport: () => import("@napi-rs/canvas"),
                scale: PDF_OCR_SCALE,
            });
            const imageData = new Uint8Array(buffer);
            const ocrResult = await extractTextFromImage({
                data: imageData,
                mimeType: "image/png",
                retryOnLowText: true,
            });
            ocrPages.push(ocrResult.text);
            if (ocrResult.retryUsed) {
                ocrRetryUsed = true;
            }
        }

        const ocrText = ocrPages.join("\n").trim();
        if (ocrText.length > text.length) {
            return {
                text: ocrText,
                pages: ocrPages,
                source: "pdf_ocr" as const,
                metrics: analyzePdfText(ocrPages),
                ocrUsed: true,
                ocrRetryUsed,
            };
        }

        return {
            text,
            pages,
            source: "pdf_text" as const,
            metrics,
            ocrUsed: ocrText.length > 0,
            ocrRetryUsed,
        };
    } catch (error) {
        console.warn("[Statements PDF] OCR fallback failed:", error);
        return {
            text,
            pages,
            source: "pdf_text" as const,
            metrics,
            ocrUsed: false,
            ocrRetryUsed: false,
        };
    }
}

async function extractStatementRowsWithAI(params: {
    pages: string[];
    context: string | null;
    bankName: string;
    languageHint?: string | null;
}) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error("AI parsing is not configured.");
    }

    const systemPrompt = `
You extract transaction rows from bank statement text.
Return ONLY valid JSON in this shape:
{
  "rows": [
    { "date": "...", "time": "...", "description": "...", "amount": "...", "debit": "...", "credit": "...", "balance": "...", "category": "...", "type": "..." }
  ]
}

Rules:
- Use ISO date (YYYY-MM-DD) when possible; otherwise keep the original date string.
- amount must be signed (negative for debits, positive for credits).
- If debit/credit columns exist, populate them and still provide amount.
- Use "." as the decimal separator.
- Keep descriptions on a single line.
- Omit headers, footers, totals, and page numbers.
`.trim();

    const rows: StatementRow[] = [];
    for (let index = 0; index < params.pages.length; index += 1) {
        const pageText = params.pages[index]?.trim();
        if (!pageText) continue;

        const chunks = chunkStatementText(pageText, AI_STATEMENT_MAX_CHARS);
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
            const chunk = chunks[chunkIndex];
            const userPrompt = [
                `Bank: ${params.bankName}`,
                params.context ? `Context: ${params.context}` : "Context: none",
                params.languageHint ? `Likely language: ${params.languageHint}` : "Likely language: unknown",
                `Page ${index + 1}.${chunkIndex + 1}`,
                "",
                chunk,
            ].join("\n");

            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": getSiteUrl(),
                    "X-Title": getSiteName(),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: AI_PARSE_MODEL,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    response_format: { type: "json_object" },
                    provider: { sort: "throughput" }
                })
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`AI statement parse failed (${res.status}): ${errorText.substring(0, 200)}`);
            }

            const json = await res.json();
            const content = json.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error("AI statement parse response was empty.");
            }

            let parsed: { rows?: StatementRow[] } | StatementRow[];
            try {
                parsed = JSON.parse(content);
            } catch {
                throw new Error("AI statement parse response was not valid JSON.");
            }

            const extractedRows = Array.isArray(parsed)
                ? parsed
                : Array.isArray(parsed?.rows)
                    ? parsed.rows
                    : [];

            rows.push(...extractedRows);
        }
    }

    return normalizeStatementRows(rows);
}

async function parseStatementText(params: {
    text: string;
    pages: string[];
    context: string | null;
    bankName: string;
    forceAi?: boolean;
}): Promise<{ rows: TxRow[]; diagnostics: CsvDiagnostics; parseMode: "auto" | "ai" }> {
    const languageDetection = detectLanguageFromSamples(params.pages.slice(0, 6));
    const languageHint = languageDetection.locale !== "unknown" ? languageDetection.locale : null;

    if (!params.forceAi) {
        const pdfTemplate = detectPdfTemplate(params.text, params.bankName);
        if (pdfTemplate) {
            try {
                const extractedRows = normalizeStatementRows(pdfTemplate.parse(params.text));
                if (extractedRows.length > 0) {
                    const csv = buildCanonicalCsvFromStatementRows(extractedRows);
                    const parsed = parseCsvToRows(csv, { returnDiagnostics: true });
                    assertParseQuality(parsed.rows, parsed.diagnostics);
                    return { rows: parsed.rows, diagnostics: parsed.diagnostics, parseMode: "auto" };
                }
            } catch (error) {
                console.warn(`[Statements PDF] Template ${pdfTemplate.id} failed, falling back.`, error);
            }
        }
        try {
            const extractedRows = normalizeStatementRows(extractStatementRowsFromText(params.text));
            if (extractedRows.length === 0) {
                throw new Error("No rows detected in statement text.");
            }
            const csv = buildCanonicalCsvFromStatementRows(extractedRows);
            const parsed = parseCsvToRows(csv, { returnDiagnostics: true });
            assertParseQuality(parsed.rows, parsed.diagnostics);
            return { rows: parsed.rows, diagnostics: parsed.diagnostics, parseMode: "auto" };
        } catch {
            // Fall back to AI parsing below.
        }
    }

    const aiRows = await extractStatementRowsWithAI({
        pages: params.pages,
        context: params.context,
        bankName: params.bankName,
        languageHint,
    });
    if (aiRows.length === 0) {
        throw new Error("AI statement extraction returned no rows.");
    }
    const aiCsv = buildCanonicalCsvFromStatementRows(aiRows);
    const parsed = parseCsvToRows(aiCsv, { returnDiagnostics: true });
    assertParseQuality(parsed.rows, parsed.diagnostics);
    return { rows: parsed.rows, diagnostics: parsed.diagnostics, parseMode: "ai" };
}

async function inferCsvSchemaWithAI(
    sample: string,
    context: string | null,
    languageHint?: string | null
): Promise<AiParseHint> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error("AI parsing is not configured.");
    }

    const systemPrompt = `
You infer CSV parsing schemas.
Return ONLY valid JSON with:
{
  "delimiter": "," | ";" | "\\t" | "|",
  "headerRowIndex": number | null,
  "columnMap": {
    "date": number | null,
    "time": number | null,
    "description": number | null,
    "amount": number | null,
    "debit": number | null,
    "credit": number | null,
    "type": number | null,
    "balance": number | null,
    "category": number | null
  }
}

Rules:
- Use 0-based column indexes.
- headerRowIndex is the row (0-based) that contains column headers, or null if none.
- If date+time are in the same column, set "time" to null.
- If a column is missing, set it to null.
- If there is no single amount column but there are debit/credit columns, set "amount" to null and map debit/credit.
- Date formats may be DD/MM/YYYY in Spanish/Portuguese/French/Italian exports and MM/DD/YYYY in English exports.
`.trim();

    const userPrompt = [
        context ? `Context: ${context}` : "Context: none",
        languageHint ? `Likely language: ${languageHint}` : "Likely language: unknown",
        "",
        "CSV sample (first lines):",
        sample
    ].join("\n");

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": getSiteUrl(),
            "X-Title": getSiteName(),
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: AI_PARSE_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            provider: { sort: "throughput" }
        })
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`AI parsing request failed (${res.status}): ${errorText.substring(0, 200)}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error("AI parsing response was empty.");
    }

    let parsed: AiParseHint;
    try {
        parsed = JSON.parse(content) as AiParseHint;
    } catch (error) {
        throw new Error("AI parsing response was not valid JSON.");
    }

    return parsed;
}

async function parseCsvWithAiFallback(params: { csvContent: string; context: string | null }): Promise<{ rows: TxRow[]; diagnostics: CsvDiagnostics }> {
    const lines = params.csvContent.split(/\r?\n/).filter(line => line.trim() !== "");
    const sample = lines.slice(0, 30).join("\n");
    const languageDetection = detectLanguageFromSamples(lines.slice(0, 60));
    const languageHint = languageDetection.locale !== "unknown" ? languageDetection.locale : null;
    const hint = await inferCsvSchemaWithAI(sample, params.context, languageHint);

    const delimiter = normalizeDelimiter(hint.delimiter) ?? ",";
    const parsed = Papa.parse(params.csvContent, {
        header: false,
        skipEmptyLines: true,
        delimiter
    });

    const rowsData = (parsed.data as unknown[]).map((row) => Array.isArray(row) ? row : []);
    const headerRowIndex = typeof hint.headerRowIndex === "number" && hint.headerRowIndex >= 0
        ? hint.headerRowIndex
        : null;

    const startIndex = headerRowIndex !== null && headerRowIndex + 1 < rowsData.length
        ? headerRowIndex + 1
        : 0;

    const dateIndex = normalizeColumnIndex(hint.columnMap?.date);
    const timeIndex = normalizeColumnIndex(hint.columnMap?.time);
    const descriptionIndex = normalizeColumnIndex(hint.columnMap?.description);
    const amountIndex = normalizeColumnIndex(hint.columnMap?.amount);
    const debitIndex = normalizeColumnIndex(hint.columnMap?.debit);
    const creditIndex = normalizeColumnIndex(hint.columnMap?.credit);
    const typeIndex = normalizeColumnIndex(hint.columnMap?.type);
    const balanceIndex = normalizeColumnIndex(hint.columnMap?.balance);
    const categoryIndex = normalizeColumnIndex(hint.columnMap?.category);

    if (dateIndex === null || descriptionIndex === null || (amountIndex === null && debitIndex === null && creditIndex === null)) {
        throw new Error("AI parsing did not return required column indexes.");
    }

    const headerLabels = new Set([
        "date",
        "time",
        "description",
        "amount",
        "balance",
        "category",
        "debit",
        "credit",
        "type",
    ]);
    const mappedRows = rowsData
        .slice(startIndex)
        .filter((cells) => {
            const candidates = [dateIndex, descriptionIndex, amountIndex].filter((idx): idx is number => idx !== null);
            let headerHits = 0;
            for (const idx of candidates) {
                const value = String(cells[idx] ?? "").toLowerCase().trim();
                if (headerLabels.has(value)) {
                    headerHits += 1;
                }
            }
            return headerHits < 2;
        })
        .map((cells) => {
            const rawAmount = amountIndex !== null ? cells[amountIndex] : "";
            let amountValue = coerceNumber(rawAmount);
            const debitValue = debitIndex !== null ? coerceNumber(cells[debitIndex]) : null;
            const creditValue = creditIndex !== null ? coerceNumber(cells[creditIndex]) : null;
            const typeValue = typeIndex !== null ? String(cells[typeIndex] ?? "") : "";
            const typeNormalized = normalizeTypeValue(typeValue);

            if ((amountValue == null || amountValue === 0) && (debitValue != null || creditValue != null)) {
                if (creditValue != null && debitValue != null) {
                    amountValue = creditValue - Math.abs(debitValue);
                } else if (creditValue != null) {
                    amountValue = creditValue;
                } else if (debitValue != null) {
                    amountValue = -Math.abs(debitValue);
                }
            }

            if (amountValue != null && typeValue) {
                if (/\b(debit|debito|cargo|dr)\b/i.test(typeNormalized)) {
                    amountValue = -Math.abs(amountValue);
                } else if (/\b(credit|credito|abono|haber|cr)\b/i.test(typeNormalized)) {
                    amountValue = Math.abs(amountValue);
                }
            }

            return {
                date: String(cells[dateIndex] ?? "").trim(),
                time: timeIndex !== null ? String(cells[timeIndex] ?? "").trim() : "",
                description: String(cells[descriptionIndex] ?? "").trim(),
                amount: amountValue != null ? String(amountValue) : "",
                balance: balanceIndex !== null ? String(cells[balanceIndex] ?? "").trim() : "",
                category: categoryIndex !== null ? String(cells[categoryIndex] ?? "").trim() : ""
            };
        })
        .filter((row) => Object.values(row).some((value) => value !== ""));

    if (mappedRows.length === 0) {
        throw new Error("AI parsing did not produce any rows.");
    }

    const canonicalCsv = Papa.unparse(mappedRows, {
        columns: ["date", "time", "description", "amount", "balance", "category"]
    });

    return parseCsvToRows(canonicalCsv, { returnDiagnostics: true });
}

export const POST = async (req: NextRequest) => {
    const formData = await req.formData();
    const file = formData.get("file");
    const bankName = String(formData.get("bankName") ?? "Unknown");

    if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
            { error: "File too large. Maximum size is 10MB." },
            { status: 400 }
        );
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

    const mimeType = (file.type || "").toLowerCase();
    const isCsv = extension === "csv" || mimeType.includes("text/csv");
    const isExcel =
        extension === "xls" ||
        extension === "xlsx" ||
        mimeType.includes("spreadsheet") ||
        mimeType.includes("ms-excel");
    const isPdf = extension === "pdf" || mimeType === "application/pdf";

    // Only accept CSV or PDF files
    if (!isCsv && !isPdf && !isExcel) {
        return NextResponse.json(
            { error: `Only CSV, XLS/XLSX, or PDF files are supported. Received: .${extension}` },
            { status: 400 }
        );
    }

    try {
        // 1) Save file in user_files
        let savedFile;
        try {
            savedFile = await saveFileToNeon({
                file,
                source: "statement-upload"
            });
        } catch (err: any) {
            console.error("Error saving file:", err);
            if (err.message?.includes("DEMO_USER_ID") || err.message?.includes("user auth")) {
                return NextResponse.json({
                    error: "Authentication not configured. Please set DEMO_USER_ID in your environment variables."
                }, { status: 500 });
            }
            throw new Error(`Failed to save file: ${err.message}`);
        }

        // 2) Parse CSV to rows
        const buffer = Buffer.from(await file.arrayBuffer());
        let rows: TxRow[] = [];
        let diagnostics: CsvDiagnostics | null = null;
        let parseModeUsed: "auto" | "ai" = "auto";
        const sourceLabel = isCsv ? "csv" : isExcel ? "xlsx" : "pdf";
        let sheetName: string | null = null;
        let templateUsed: string | null = null;

        const parseMode = String(formData.get("parseMode") ?? "auto").toLowerCase();
        const aiContextValue = formData.get("aiContext");
        const aiContext = typeof aiContextValue === "string" ? aiContextValue.trim() : null;

        if (isCsv || isExcel) {
            let csvContent = "";
            let csvContentReady = false;
            try {
                if (isExcel) {
                    const result = extractCsvFromSpreadsheet(new Uint8Array(buffer));
                    csvContent = result.csv;
                    sheetName = result.sheetName;
                } else {
                    csvContent = buffer.toString("utf-8");
                }

                csvContentReady = true;
                if (csvContent.charCodeAt(0) === 0xFEFF) {
                    csvContent = csvContent.slice(1);
                }

                if (parseMode !== "ai") {
                    const csvTemplate = detectCsvTemplate(csvContent, bankName);
                    if (csvTemplate) {
                        try {
                            const templateResult = parseCsvWithTemplate(csvContent, csvTemplate);
                            rows = templateResult.rows;
                            diagnostics = templateResult.diagnostics;
                            templateUsed = csvTemplate.id;
                            assertParseQuality(rows, diagnostics);
                        } catch (templateError) {
                            console.warn(`[Statements CSV] Template ${csvTemplate.id} failed, falling back.`, templateError);
                            rows = [];
                            diagnostics = null;
                            templateUsed = null;
                        }
                    }
                }

                if (rows.length === 0) {
                    if (parseMode === "ai") {
                        const aiResult = await parseCsvWithAiFallback({ csvContent, context: aiContext });
                        rows = aiResult.rows;
                        diagnostics = aiResult.diagnostics;
                        parseModeUsed = "ai";
                        assertParseQuality(rows, diagnostics);
                    } else {
                        const parsed = parseCsvToRows(csvContent, { returnDiagnostics: true });
                        rows = parsed.rows;
                        diagnostics = parsed.diagnostics;
                        assertParseQuality(rows, diagnostics);
                    }
                }
            } catch (parseErr: any) {
                if (parseMode !== "ai" && csvContentReady) {
                    try {
                        const aiResult = await parseCsvWithAiFallback({ csvContent, context: aiContext });
                        rows = aiResult.rows;
                        diagnostics = aiResult.diagnostics;
                        parseModeUsed = "ai";
                        assertParseQuality(rows, diagnostics);
                    } catch (aiErr: any) {
                        logParseFailure({
                            fileId: savedFile?.id,
                            fileName: file.name,
                            parseMode,
                            source: sourceLabel,
                            error: aiErr,
                            diagnostics,
                            extra: { sheetName, templateUsed, originalError: parseErr?.message ?? String(parseErr) },
                        });
                        return NextResponse.json({
                            error: GENERIC_PARSE_ERROR
                        }, { status: 400 });
                    }
                } else {
                    logParseFailure({
                        fileId: savedFile?.id,
                        fileName: file.name,
                        parseMode,
                        source: sourceLabel,
                        error: parseErr,
                        diagnostics,
                        extra: { sheetName, templateUsed },
                    });
                    return NextResponse.json({
                        error: GENERIC_PARSE_ERROR
                    }, { status: 400 });
                }
            }
        } else if (isPdf) {
            try {
                const pdfTextResult = await extractStatementTextFromPdf(new Uint8Array(buffer));
                const docKind = detectDocumentKindFromText(pdfTextResult.text);
                if (docKind.kind === "receipt") {
                    return NextResponse.json({
                        error: "This file looks like a receipt, not a bank statement. Please upload it to the Fridge page.",
                        code: "NOT_A_STATEMENT"
                    }, { status: 400 });
                }
                const pdfParsed = await parseStatementText({
                    text: pdfTextResult.text,
                    pages: pdfTextResult.pages,
                    context: aiContext,
                    bankName,
                    forceAi: parseMode === "ai",
                });
                rows = pdfParsed.rows;
                diagnostics = pdfParsed.diagnostics;
                parseModeUsed = pdfParsed.parseMode;
            } catch (parseErr: any) {
                logParseFailure({
                    fileId: savedFile?.id,
                    fileName: file.name,
                    parseMode,
                    source: sourceLabel,
                    error: parseErr,
                    diagnostics,
                });
                return NextResponse.json({
                    error: GENERIC_PARSE_ERROR
                }, { status: 400 });
            }
        }

        if (rows.length === 0) {
            logParseFailure({
                fileId: savedFile?.id,
                fileName: file.name,
                parseMode: parseModeUsed,
                source: sourceLabel,
                error: "No transactions found after parsing.",
                diagnostics,
                extra: sheetName ? { sheetName } : undefined,
            });
            return NextResponse.json({
                error: GENERIC_PARSE_ERROR
            }, { status: 400 });
        }

        logParseDiagnostics({
            fileId: savedFile?.id,
            fileName: file.name,
            parseMode: parseModeUsed,
            source: sourceLabel,
            diagnostics,
            extra: sheetName || templateUsed ? { sheetName, templateUsed } : undefined,
        });

        // 3) AI categorisation
        console.log(`[PARSE API] Starting categorization for ${rows.length} transactions`);
        let withCategories: TxRow[];
        let categorizationError: string | null = null;
        try {
            // Get custom categories from request if provided (from frontend localStorage)
            const customCategoriesHeader = req.headers.get("X-Custom-Categories");
            const { categories: customCategories, warning: customCategoriesWarning } =
                parseCustomCategoriesHeader(customCategoriesHeader);
            if (customCategoriesWarning) {
                console.warn("[PARSE API] Ignoring custom categories header:", customCategoriesWarning);
            }
            const categorySet = new Set(
                Array.isArray(customCategories)
                    ? customCategories.map((category) => String(category).toLowerCase())
                    : []
            );

            let preferencesByKey: Map<string, string> | undefined;
            let userId: string | null = null;
            try {
                userId = await getCurrentUserId();
                const preferenceRows = await getTransactionCategoryPreferences({ userId }).catch(() => []);
                if (preferenceRows.length > 0) {
                    const filtered = preferenceRows
                        .filter((row) => row.category_name)
                        .filter((row) => categorySet.size === 0 || categorySet.has(String(row.category_name).toLowerCase()));
                    preferencesByKey = new Map(filtered.map((row) => [row.description_key, String(row.category_name)]));
                }
            } catch (preferenceError) {
                console.warn("[PARSE API] Failed to load category preferences:", preferenceError);
            }

            console.log(`[PARSE API] Calling categoriseTransactions with ${rows.length} rows`);
            withCategories = await categoriseTransactions(rows, customCategories, {
                preferencesByKey,
                userId: userId ?? undefined,
            });
            const categorizedCount = withCategories.filter(r => r.category && r.category !== "Other").length;
            console.log(`[PARSE API] Categorization complete: ${categorizedCount}/${withCategories.length} have non-Other categories`);
            console.log(`[PARSE API] Sample categories:`, withCategories.slice(0, 5).map(r => ({ desc: r.description.substring(0, 30), cat: r.category })));
        } catch (aiErr: any) {
            const errorMessage = aiErr?.message || String(aiErr) || "Unknown AI categorization error";
            console.error("[PARSE API] AI categorization error:", errorMessage);
            console.error("[PARSE API] Full error:", aiErr);
            // Continue without categories if AI fails
            withCategories = rows.map(r => ({ ...r, category: "Other" }));
            categorizationError = errorMessage;
        }

        const parseQuality = buildStatementParseQuality({
            rows: withCategories,
            diagnostics,
            parseMode: parseModeUsed,
        });

        // 4) Build canonical CSV
        console.log(`[PARSE API] Building CSV from ${withCategories.length} rows`);
        const csv = rowsToCanonicalCsv(withCategories);
        console.log(`[PARSE API] CSV length: ${csv.length} chars`);
        console.log(`[PARSE API] CSV first 500 chars:`, csv.substring(0, 500));

        const headers: Record<string, string> = {
            "Content-Type": "text/csv",
            "X-File-Id": String(savedFile.id),
            "X-Parse-Mode": parseModeUsed
        };

        headers["X-Parse-Quality"] = parseQuality.level;
        headers["X-Parse-Quality-Score"] = String(parseQuality.score);
        headers["X-Parse-Quality-Reasons"] = encodeURIComponent(JSON.stringify(parseQuality.reasons));

        // Add warning header if categorization failed
        if (categorizationError) {
            headers["X-Categorization-Error"] = encodeURIComponent(categorizationError);
            headers["X-Categorization-Warning"] = "true";
        }

        return new NextResponse(csv, {
            status: 200,
            headers
        });
    } catch (err: any) {
        console.error("Unexpected error:", err);
        return NextResponse.json({ error: "An unexpected error occurred while processing the file" }, { status: 500 });
    }
};
