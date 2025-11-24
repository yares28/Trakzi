// app/api/statements/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { neonInsert } from "@/lib/neonClient";
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
    const [statement] = await neonInsert("statements", {
        user_id: userId,
        bank_name: statementMeta?.bankName ?? null,
        account_name: null,
        source_filename: statementMeta?.sourceFilename ?? null,
        raw_format: statementMeta?.rawFormat ?? "pdf",
        file_id: statementMeta?.fileId ?? null
    });

    const statementId = statement.id as number;

    // TODO: optionally map category names -> category_id by fetching/creating categories
    // For now, we insert with null category_id and keep the category text in raw_csv_row.

    // 3) Build transactions rows for Neon
    const txRows = rows.map((r) => ({
        user_id: userId,
        statement_id: statementId,
        tx_date: r.date,
        description: r.description,
        amount: r.amount,
        balance: r.balance,
        currency: "EUR",
        category_id: null,
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
