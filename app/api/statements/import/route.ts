// app/api/statements/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { neonInsert, neonQuery } from "@/lib/neonClient";
import { getCurrentUserId } from "@/lib/auth";
import { TxRow } from "@/lib/types/transactions";
import { invalidateUserCachePrefix } from "@/lib/cache/upstash";
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
    // Optional: allow partial import if over cap
    allowPartialImport?: boolean;
    // Optional: filter by date range
    dateFrom?: string;
    dateTo?: string;
};

type ImportResponse = {
    statementId: number;
    inserted: number;
    skipped?: number;
    duplicatesSkipped?: number;
    skippedInvalidDates?: number;
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
        const body = (await req.json()) as ImportBody;
        const { csv, statementMeta, allowPartialImport, dateFrom, dateTo } = body;
        if (!csv) {
            return NextResponse.json({ error: "Missing CSV" }, { status: 400 });
        }

        const userId = await getCurrentUserId();
        await ensureTransactionsTimeColumn();

        // 1) Parse CSV into TxRow[]
        const parsed = Papa.parse(csv, {
            header: true,
            skipEmptyLines: true
        });

        if (parsed.errors.length) {
            console.warn("Import CSV parse errors:", parsed.errors);
        }

        let rows: TxRow[] = (parsed.data as any[]).map((r) => ({
            date: String(r.date),
            time: r.time ? String(r.time) : null,
            description: String(r.description),
            amount: Number(r.amount),
            balance: r.balance != null ? Number(r.balance) : null,
            category: r.category ? String(r.category) : undefined
        }));

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

        // 4) Insert statement
        const [statement] = await neonInsert<{
            user_id: string;
            file_name: string;
            status: string;
            row_count: number;
            imported_count: number;
            id?: number;
        }>("statements", {
            user_id: userId,
            file_name: statementMeta?.sourceFilename ?? "imported_csv.csv",
            status: "completed",
            row_count: rowsToInsert.length,
            imported_count: rowsToInsert.length,
        }) as Array<{
            id: number;
            user_id: string;
            file_name: string;
            status: string;
            row_count: number;
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

        // 6) Build transactions rows for Neon with proper category_id
        const timestamp = new Date().toISOString();
        const txRows = rowsToInsert.map((r) => {
            // Build v2 metadata (if available from _metadata property)
            const hasV2Metadata = (r as any)._metadata;
            const metadata = hasV2Metadata ? (r as any)._metadata : {
                // Legacy structure for v1 imports
                date: r.date,
                time: r.time,
                description: r.description,
                amount: r.amount,
                balance: r.balance,
                category: r.category
            };

            return {
                user_id: userId,
                statement_id: statementId,
                tx_date: r.date,
                tx_time: r.time ?? null,
                description: r.description,
                simplified_description: r.simplifiedDescription ?? null, // NEW: v2 pipeline
                amount: r.amount,
                balance: r.balance,
                currency: "EUR",
                category_id: r.category && categoryNameToId.has(r.category)
                    ? categoryNameToId.get(r.category)!
                    : null,
                raw_csv_row: JSON.stringify(metadata), // v2 metadata or legacy
                created_at: timestamp,
                updated_at: timestamp
            };
        });

        await neonInsert("transactions", txRows, {
            returnRepresentation: false
        });

        // Build response
        const response: ImportResponse = {
            statementId,
            inserted: rowsToInsert.length,
            capacity: {
                plan: capacity.plan,
                cap: capacity.cap,
                used: capacity.used + rowsToInsert.length,
                remaining: capacity.remaining - rowsToInsert.length,
            },
        };

        if (invalidDateCount > 0) {
            response.skippedInvalidDates = invalidDateCount;
        }

        if (skippedCount > 0) {
            response.skipped = skippedCount;
            response.partialImport = true;
            response.reachedCap = true;
        }

        // Invalidate cache to ensure UI updates instantly
        await invalidateUserCachePrefix(userId, 'data-library');
        revalidatePath('/data-library');

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
