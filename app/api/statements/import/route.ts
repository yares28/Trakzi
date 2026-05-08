// app/api/statements/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createHash } from "crypto";
import Papa from "papaparse";
import { neonInsert, neonQuery } from "@/lib/neonClient";
import { getCurrentUserId } from "@/lib/auth";
import { detectTransfers, persistTransferPairs } from "@/lib/accounts/transfer-detection";
import { TxRow } from "@/lib/types/transactions";
import { checkRateLimit, createRateLimitResponse } from "@/lib/security/rate-limiter";
import { invalidateUserCache, invalidateExactKeys, buildCacheKey } from "@/lib/cache/upstash";
import { fetchRatesForBase, convertWithRates } from "@/lib/fx/converter";
import {
    assertCapacityOrExplain,
    getRemainingCapacity,
    calculatePartialImportSize,
    LimitExceededResponse
} from "@/lib/limits/transactions-cap";

type ImportBody = {
    csv: string;
    statementMeta?: {
        bankName?: string;
        sourceFilename?: string;
        rawFormat?: "pdf" | "csv" | "xlsx" | "xls" | "other";
        fileId?: string | null;
    };
    // Required: bank account to associate this import with. Every CSV must
    // be tied to an account so transfer detection runs and currency is correct.
    accountId: string;
    // Optional: allow partial import if over cap
    allowPartialImport?: boolean;
    // Optional: filter by date range
    dateFrom?: string;
    dateTo?: string;
    // Optional: skip the duplicate-fingerprint check (user confirmed re-import)
    force?: boolean;
};

type ImportResponse = {
    statementId: number;
    inserted: number;
    skipped?: number;
    duplicatesSkipped?: number;
    skippedInvalidDates?: number;
    fxConverted?: number;
    partialImport?: boolean;
    reachedCap?: boolean;
    capacity?: {
        plan: string;
        cap: number;
        used: number;
        remaining: number;
    };
};

let ensureTransactionsTimeColumnPromise: Promise<void> | null = null;

async function ensureTransactionsTimeColumn(): Promise<void> {
    if (ensureTransactionsTimeColumnPromise) return ensureTransactionsTimeColumnPromise;

    ensureTransactionsTimeColumnPromise = (async () => {
        await neonQuery(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tx_time TIME`);
    })().catch((error) => {
        ensureTransactionsTimeColumnPromise = null;
        throw error;
    });

    return ensureTransactionsTimeColumnPromise;
}

let ensureNormalisationColumnsPromise: Promise<void> | null = null;

async function ensureNormalisationColumns(): Promise<void> {
    if (ensureNormalisationColumnsPromise) return ensureNormalisationColumnsPromise;

    ensureNormalisationColumnsPromise = (async () => {
        await neonQuery(`
            ALTER TABLE transactions
              ADD COLUMN IF NOT EXISTS simplified_description TEXT,
              ADD COLUMN IF NOT EXISTS categorisation_source TEXT
                CHECK (categorisation_source IN
                  ('preference','statement','pattern','keyword','ai','fallback','manual')),
              ADD COLUMN IF NOT EXISTS categorisation_confidence NUMERIC(4,3)
        `);
    })().catch((error) => {
        ensureNormalisationColumnsPromise = null;
        throw error;
    });

    return ensureNormalisationColumnsPromise;
}

let ensureFxColumnsPromise: Promise<void> | null = null;

async function ensureFxColumns(): Promise<void> {
    if (ensureFxColumnsPromise) return ensureFxColumnsPromise;

    ensureFxColumnsPromise = (async () => {
        await neonQuery(`
            ALTER TABLE transactions
              ADD COLUMN IF NOT EXISTS original_amount NUMERIC,
              ADD COLUMN IF NOT EXISTS original_currency CHAR(3)
        `);
    })().catch((error) => {
        ensureFxColumnsPromise = null;
        throw error;
    });

    return ensureFxColumnsPromise;
}

let ensureFingerprintColumnPromise: Promise<void> | null = null;

async function ensureFingerprintColumn(): Promise<void> {
    if (ensureFingerprintColumnPromise) return ensureFingerprintColumnPromise;

    ensureFingerprintColumnPromise = (async () => {
        await neonQuery(`ALTER TABLE statements ADD COLUMN IF NOT EXISTS fingerprint text`);
    })().catch((error) => {
        ensureFingerprintColumnPromise = null;
        throw error;
    });

    return ensureFingerprintColumnPromise;
}

// Stable SHA-256 fingerprint of the row set — used to detect re-imports.
// Rows are sorted before hashing so row order doesn't matter.
function computeFingerprint(rows: Array<{ date: string; amount: number; description?: string }>): string {
    const normalized = rows
        .map(r => `${r.date}|${r.amount}|${(r.description ?? '').trim().toLowerCase()}`)
        .sort()
        .join('\n');
    return createHash('sha256').update(normalized).digest('hex');
}

function isValidIsoDate(value: string | null | undefined): boolean {
    if (!value) return false;
    const trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
    const [year, month, day] = trimmed.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
        Number.isFinite(date.getTime()) &&
        date.getUTCFullYear() === year &&
        date.getUTCMonth() + 1 === month &&
        date.getUTCDate() === day
    );
}

export const POST = async (req: NextRequest) => {
    try {
        const contentType = req.headers.get("content-type") ?? ""
        let csv: string | null = null
        let statementMeta: ImportBody["statementMeta"] | undefined
        let accountId: string | undefined
        let allowPartialImport: boolean | undefined
        let dateFrom: string | undefined
        let dateTo: string | undefined
        let force: boolean | undefined

        // URL query param takes precedence — more reliable than body field for boolean flags
        const forceFromUrl = req.nextUrl.searchParams.get("force") === "true"

        if (contentType.includes("multipart/form-data")) {
            // Large CSV sent as FormData blob — bypasses JSON serialization and body size limits
            const fd = await req.formData()
            const csvField = fd.get("csv")
            csv = csvField instanceof File ? await csvField.text() : typeof csvField === "string" ? csvField : null
            accountId = (fd.get("accountId") as string | null) ?? undefined
            force = forceFromUrl || fd.get("force") === "true"
            allowPartialImport = fd.get("allowPartialImport") === "true"
            dateFrom = (fd.get("dateFrom") as string | null) ?? undefined
            dateTo = (fd.get("dateTo") as string | null) ?? undefined
            const metaRaw = fd.get("statementMeta") as string | null
            if (metaRaw) {
                try { statementMeta = JSON.parse(metaRaw) } catch { /* ignore malformed meta */ }
            }
        } else {
            // Legacy JSON body (small imports, direct API calls)
            const body = (await req.json()) as ImportBody
            ;({ csv, statementMeta, accountId, allowPartialImport, dateFrom, dateTo, force } = body)
            force = forceFromUrl || force
        }

        if (!csv) {
            return NextResponse.json({ error: "Missing CSV" }, { status: 400 });
        }

        const userId = await getCurrentUserId();

        // accountId is required — the import flow must be tied to an account so
        // transfer detection runs and the row currency matches the account.
        if (!accountId) {
            return NextResponse.json(
                { error: "Account is required. Pick an account before importing." },
                { status: 400 }
            );
        }

        const [account] = await neonQuery<{ id: string; currency: string }>(
            `SELECT id, currency FROM bank_accounts WHERE id = $1 AND user_id = $2 AND is_active = true`,
            [accountId, userId]
        );
        if (!account) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }
        const resolvedAccountId: string = account.id;
        const resolvedCurrency: string = account.currency;

        // Rate limit - bulk imports are expensive (DB writes + parsing)
        const rateLimitResult = await checkRateLimit(userId, 'mutation');
        if (rateLimitResult.limited) {
            return createRateLimitResponse(rateLimitResult.resetIn);
        }

        await Promise.all([ensureTransactionsTimeColumn(), ensureNormalisationColumns(), ensureFxColumns()]);

        // 1) Parse CSV into TxRow[]
        const parsed = Papa.parse(csv, {
            header: true,
            skipEmptyLines: true
        });

        if (parsed.errors.length) {
            console.warn("Import CSV parse errors:", parsed.errors);
        }

        const VALID_CAT_SOURCES = new Set([
            'preference', 'statement', 'pattern', 'keyword', 'ai', 'fallback', 'manual'
        ]);
        let rows: TxRow[] = (parsed.data as any[]).map((r) => {
            const catSource = r.categorisation_source ? String(r.categorisation_source).trim() : undefined;
            const catConfRaw = r.categorisation_confidence ? Number(r.categorisation_confidence) : undefined;
            return {
                date: String(r.date),
                time: r.time ? String(r.time) : null,
                description: String(r.description),
                amount: Number(r.amount),
                balance: r.balance != null ? Number(r.balance) : null,
                category: r.category ? String(r.category) : undefined,
                summary: r.summary ? String(r.summary) : undefined,
                categorisationSource: catSource && VALID_CAT_SOURCES.has(catSource)
                    ? catSource as TxRow['categorisationSource']
                    : undefined,
                categorisationConfidence: catConfRaw != null && !isNaN(catConfRaw) ? catConfRaw : undefined,
            };
        });

        if (rows.length === 0) {
            return NextResponse.json({ error: "No rows in CSV" }, { status: 400 });
        }

        const invalidDateCount = rows.filter((row) => !isValidIsoDate(row.date)).length;
        if (invalidDateCount > 0) {
            rows = rows.filter((row) => isValidIsoDate(row.date));
            if (rows.length === 0) {
                return NextResponse.json(
                    { error: "All transactions are missing valid dates. Please fix the Date column." },
                    { status: 400 }
                );
            }
        }

        // Apply date filter if provided
        if (dateFrom || dateTo) {
            rows = rows.filter(row => {
                const rowDate = row.date;
                if (dateFrom && rowDate < dateFrom) return false;
                if (dateTo && rowDate > dateTo) return false;
                return true;
            });

            if (rows.length === 0) {
                return NextResponse.json({
                    error: "No transactions match the selected date range"
                }, { status: 400 });
            }
        }

        // Extract date range for UI hints
        const dates = rows.map(r => r.date).filter(Boolean).sort();
        const dateMin = dates[0] || undefined;
        const dateMax = dates[dates.length - 1] || undefined;

        // 2) Check capacity
        const capacityCheck = await assertCapacityOrExplain({
            userId,
            incomingCount: rows.length,
            dateMin,
            dateMax,
        });

        if (!capacityCheck.ok) {
            // If partial import is allowed and there's remaining capacity, proceed
            if (allowPartialImport && capacityCheck.limitExceeded.remaining > 0) {
                // Will handle partial import below
            } else {
                // Return structured LIMIT_EXCEEDED response
                return NextResponse.json(capacityCheck.limitExceeded, { status: 403 });
            }
        }

        // 3) Calculate how many rows to insert
        const capacity = capacityCheck.ok ? capacityCheck.capacity : await getRemainingCapacity(userId);
        const { allowedCount, skippedCount } = calculatePartialImportSize(rows.length, capacity.remaining);

        if (allowedCount === 0) {
            // Edge case: no capacity at all
            const limitExceeded: LimitExceededResponse = {
                code: 'LIMIT_EXCEEDED',
                plan: capacity.plan,
                cap: capacity.cap,
                used: capacity.used,
                remaining: 0,
                incomingCount: rows.length,
                dateMin,
                dateMax,
                suggestedActions: ['UPGRADE', 'DELETE_EXISTING'],
                upgradePlans: capacity.plan === 'free' ? ['pro', 'max'] : capacity.plan === 'pro' ? ['max'] : [],
            };
            return NextResponse.json(limitExceeded, { status: 403 });
        }

        // Sort rows by date (most recent first) for partial import determinism
        rows.sort((a, b) => b.date.localeCompare(a.date));

        // Take only the allowed count if doing partial import
        const rowsToInsert = allowPartialImport && skippedCount > 0
            ? rows.slice(0, allowedCount)
            : rows.slice(0, allowedCount);

        // 4a) Fingerprint check — soft-dedup: warn the user if the same set of rows
        //     was imported before. Running ensureFingerprintColumn in parallel with
        //     the dedup query is safe because the lazy migration is idempotent.
        await ensureFingerprintColumn();
        const fingerprint = computeFingerprint(rowsToInsert);

        if (!force) {
            const dupRows = await neonQuery<{ id: number }>(
                `SELECT id FROM statements WHERE user_id = $1 AND fingerprint = $2 LIMIT 1`,
                [userId, fingerprint]
            );
            if (dupRows.length > 0) {
                return NextResponse.json({
                    duplicate: true,
                    existingStatementId: dupRows[0].id,
                    message: 'This statement appears to have been imported before.',
                }, { status: 409 });
            }
        }

        // 4) Insert statement
        const [statement] = await neonInsert<{
            user_id: string;
            file_name: string;
            status: string;
            row_count: number;
            imported_count: number;
            account_id?: string | null;
            fingerprint?: string;
            id?: number;
        }>("statements", {
            user_id: userId,
            file_name: statementMeta?.sourceFilename ?? "imported_csv.csv",
            status: "completed",
            row_count: rowsToInsert.length,
            imported_count: rowsToInsert.length,
            account_id: resolvedAccountId,
            fingerprint,
        }) as Array<{
            id: number;
            user_id: string;
            file_name: string;
            status: string;
            row_count: number;
            account_id?: string | null;
            imported_count: number;
        }>;

        const statementId = statement.id;

        // 5) Map category names to category_id by fetching/creating categories
        const categoryNameToId = new Map<string, number | null>();

        // Extract unique category names from rows (excluding undefined/null/empty)
        const uniqueCategoryNames = Array.from(
            new Set(
                rowsToInsert
                    .map(r => r.category)
                    .filter((cat): cat is string => typeof cat === 'string' && cat.trim().length > 0)
            )
        );

        if (uniqueCategoryNames.length > 0) {
            // Fetch existing categories - use IN clause with placeholders
            const placeholders = uniqueCategoryNames.map((_, i) => `$${i + 2}`).join(', ');
            const existingCategoriesQuery = `
                SELECT id, name 
                FROM categories 
                WHERE user_id = $1 AND name IN (${placeholders})
            `;
            const existingCategories = await neonQuery<{ id: number; name: string }>(
                existingCategoriesQuery,
                [userId, ...uniqueCategoryNames]
            );

            // Map existing categories
            existingCategories.forEach(cat => {
                categoryNameToId.set(cat.name, cat.id);
            });

            // Create missing categories
            const missingCategories = uniqueCategoryNames.filter(
                name => !categoryNameToId.has(name)
            );

            if (missingCategories.length > 0) {
                const newCategoryRows = missingCategories.map(name => ({
                    user_id: userId,
                    name: name.trim(),
                    color: null
                }));

                const insertedCategories = await neonInsert<{ user_id: string; name: string; color: null; id?: number }>(
                    "categories",
                    newCategoryRows,
                    { returnRepresentation: true }
                ) as Array<{ id: number; name: string; user_id: string; color: string | null }>;

                // Map newly created categories
                insertedCategories.forEach(cat => {
                    categoryNameToId.set(cat.name, cat.id);
                });
            }
        }

        // 5b) Deduplicate — filter out rows flagged as duplicates within this import batch
        const dedupedRows = rowsToInsert.filter(r => !r.isDuplicate);
        const duplicatesSkipped = rowsToInsert.length - dedupedRows.length;

        // 6) FX conversion — fetch rates once for all source currencies that differ from account currency
        const sourceCurrencies = [
            ...new Set(
                dedupedRows
                    .map(r => r.currency?.toUpperCase())
                    .filter((c): c is string => !!c && c !== resolvedCurrency.toUpperCase())
            )
        ];
        let fxRates: Record<string, number> = {};
        if (sourceCurrencies.length > 0) {
            try {
                fxRates = await fetchRatesForBase(resolvedCurrency, sourceCurrencies);
            } catch (fxError: any) {
                return NextResponse.json(
                    { error: `FX conversion failed: ${fxError.message}` },
                    { status: 502 }
                );
            }
        }

        // 7) Build transactions rows for Neon with proper category_id and FX conversion
        const VALID_IMPORT_TX_TYPES = new Set(['expense', 'income', 'transfer'])
        const timestamp = new Date().toISOString();
        const txRows = dedupedRows.map((r) => {
            const rowCurrency = r.currency?.toUpperCase() ?? resolvedCurrency.toUpperCase();
            const needsConversion = rowCurrency !== resolvedCurrency.toUpperCase() && fxRates[rowCurrency];
            const convertedAmount = needsConversion
                ? convertWithRates(r.amount, rowCurrency, resolvedCurrency, fxRates)
                : r.amount;
            const convertedBalance = (needsConversion && r.balance != null)
                ? convertWithRates(r.balance, rowCurrency, resolvedCurrency, fxRates)
                : r.balance;

            const safeAmount = Number.isFinite(convertedAmount) ? convertedAmount : 0;
            const safeBalance = convertedBalance != null && Number.isFinite(convertedBalance) ? convertedBalance : null;

            return {
                user_id: userId,
                statement_id: statementId,
                account_id: resolvedAccountId,
                tx_date: r.date,
                tx_time: r.time ?? null,
                description: r.description,
                simplified_description: r.summary ?? null,
                amount: safeAmount,
                balance: safeBalance,
                currency: resolvedCurrency,
                original_amount: needsConversion && Number.isFinite(r.amount) ? r.amount : null,
                original_currency: needsConversion ? rowCurrency : null,
                tx_type: r.tx_type && VALID_IMPORT_TX_TYPES.has(r.tx_type) ? r.tx_type : 'expense',
                category_id: r.category && categoryNameToId.has(r.category)
                    ? categoryNameToId.get(r.category)!
                    : null,
                categorisation_source: r.categorisationSource && VALID_CAT_SOURCES.has(r.categorisationSource)
                    ? r.categorisationSource
                    : null,
                categorisation_confidence: typeof r.categorisationConfidence === 'number'
                    ? r.categorisationConfidence
                    : null,
                raw_csv_row: JSON.stringify({
                    date: r.date,
                    time: r.time ?? null,
                    description: r.description,
                    amount: Number.isFinite(r.amount) ? r.amount : null,
                    balance: r.balance != null && Number.isFinite(r.balance) ? r.balance : null,
                    category: r.category ?? null,
                    currency: r.currency ?? null,
                    tx_type: r.tx_type ?? null,
                }),
                created_at: timestamp,
                updated_at: timestamp,
            };
        });

        // Account is always set, so transfer detection always runs.
        type TxInsertRow = typeof txRows[number];
        const insertedTxs = await neonInsert<TxInsertRow>(
            "transactions", txRows, { returnRepresentation: true }
        ) as Array<TxInsertRow & { id: number }>;
        const newIds = insertedTxs.map(t => t.id);
        const pairs = await detectTransfers(userId, newIds);
        await persistTransferPairs(userId, pairs);
        const detectedTransferCount = pairs.length;

        // Build response
        const response: ImportResponse & { detectedTransfers?: number; duplicatesSkipped?: number } = {
            statementId,
            inserted: dedupedRows.length,
            capacity: {
                plan: capacity.plan,
                cap: capacity.cap,
                used: capacity.used + dedupedRows.length,
                remaining: capacity.remaining - dedupedRows.length,
            },
        };

        if (detectedTransferCount > 0) {
            (response as any).detectedTransfers = detectedTransferCount;
        }

        if (duplicatesSkipped > 0) {
            response.duplicatesSkipped = duplicatesSkipped;
        }

        if (sourceCurrencies.length > 0) {
            const fxConvertedCount = txRows.filter(r => r.original_currency != null).length;
            if (fxConvertedCount > 0) response.fxConverted = fxConvertedCount;
        }

        if (invalidDateCount > 0) {
            response.skippedInvalidDates = invalidDateCount;
        }

        if (skippedCount > 0) {
            response.skipped = skippedCount;
            response.partialImport = true;
            response.reachedCap = true;
        }

        // Invalidate ALL cache to ensure UI updates instantly across all pages.
        // Exact-key DEL for data-library runs alongside the broad SCAN as a belt-and-suspenders
        // guarantee — SCAN can miss keys in the same iteration window.
        await Promise.all([
            invalidateUserCache(userId),
            invalidateExactKeys(buildCacheKey('data-library', userId, null, 'bundle')),
        ]);
        revalidatePath('/data-library');
        revalidatePath('/home');
        revalidatePath('/analytics');
        revalidatePath('/fridge');
        revalidatePath('/trends');
        revalidatePath('/savings');
        revalidatePath('/pockets');

        return NextResponse.json(response, { status: 201 });
    } catch (error: any) {
        const message = String(error?.message || "Failed to import transactions");
        console.error("[Import] Error:", error);
        if (message.toLowerCase().includes("unauthorized")) {
            return NextResponse.json({ error: "Please sign in to import transactions." }, { status: 401 });
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
};
