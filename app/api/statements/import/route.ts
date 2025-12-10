// app/api/statements/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { neonInsert, neonQuery } from "@/lib/neonClient";
import { getCurrentUserId } from "@/lib/auth";
import { TxRow } from "@/lib/types/transactions";

type ImportBody = {
    csv: string;
    statementMeta?: {
        bankName?: string;
        sourceFilename?: string;
        rawFormat?: "pdf" | "csv" | "xlsx" | "xls" | "other";
        fileId?: string | null;
    };
};

export const POST = async (req: NextRequest) => {
    const body = (await req.json()) as ImportBody;
    const { csv, statementMeta } = body;
    if (!csv) {
        return NextResponse.json({ error: "Missing CSV" }, { status: 400 });
    }

    const userId = await getCurrentUserId();

    // 1) Parse CSV into TxRow[]
    const parsed = Papa.parse(csv, {
        header: true,
        skipEmptyLines: true
    });

    if (parsed.errors.length) {
        console.warn("Import CSV parse errors:", parsed.errors);
    }

    const rows: TxRow[] = (parsed.data as any[]).map((r) => ({
        date: String(r.date),
        description: String(r.description),
        amount: Number(r.amount),
        balance: r.balance != null ? Number(r.balance) : null,
        category: r.category ? String(r.category) : undefined
    }));

    if (rows.length === 0) {
        return NextResponse.json({ error: "No rows in CSV" }, { status: 400 });
    }

    // 2) Insert statement
    const [statement] = await neonInsert<{ 
        user_id: string; 
        bank_name: string | null; 
        account_name: string | null; 
        source_filename: string | null; 
        raw_format: string; 
        file_id: number | null;
        id?: number;
    }>(
        "statements",
        {
            user_id: userId,
            bank_name: statementMeta?.bankName ?? null,
            account_name: null,
            source_filename: statementMeta?.sourceFilename ?? null,
            raw_format: statementMeta?.rawFormat ?? "pdf",
            file_id: statementMeta?.fileId ?? null
        }
    ) as Array<{ id: number; user_id: string; bank_name: string | null; account_name: string | null; source_filename: string | null; raw_format: string; file_id: number | null }>;

    const statementId = statement.id;

    // 3) Map category names to category_id by fetching/creating categories
    const categoryNameToId = new Map<string, number | null>();
    
    // Extract unique category names from rows (excluding undefined/null/empty)
    const uniqueCategoryNames = Array.from(
        new Set(
            rows
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

            const insertedCategories = await neonInsert<{ user_id: string; name: string; color: string | null; id?: number }>(
                "categories",
                newCategoryRows,
                { returnRepresentation: true }
            ) as Array<{ id: number; user_id: string; name: string; color: string | null }>;

            // Map newly created categories
            insertedCategories.forEach(cat => {
                categoryNameToId.set(cat.name, cat.id);
            });
        }
    }

    // 4) Build transactions rows for Neon with proper category_id
    const txRows = rows.map((r) => ({
        user_id: userId,
        statement_id: statementId,
        tx_date: r.date,
        description: r.description,
        amount: r.amount,
        balance: r.balance,
        currency: "EUR",
        category_id: r.category && categoryNameToId.has(r.category) 
            ? categoryNameToId.get(r.category)! 
            : null,
        raw_csv_row: JSON.stringify(r)
    }));

    const insertedTx = await neonInsert("transactions", txRows, {
        returnRepresentation: false
    });

    return NextResponse.json(
        {
            statementId,
            inserted: rows.length
        },
        { status: 201 }
    );
};
