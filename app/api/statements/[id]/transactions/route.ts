// app/api/statements/[id]/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { neonQuery } from "@/lib/neonClient";

export const GET = async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) => {
    try {
        const userId = await getCurrentUserId();
        const resolvedParams = await Promise.resolve(params);
        const statementId = parseInt(resolvedParams.id, 10);

        if (isNaN(statementId) || statementId <= 0) {
            return NextResponse.json(
                { error: "Invalid statement ID" },
                { status: 400 }
            );
        }

        // Fetch transactions for this statement
        const query = `
            SELECT 
                t.id, 
                t.tx_date, 
                t.description, 
                t.amount, 
                t.balance, 
                t.category_id, 
                t.raw_csv_row,
                c.name as category_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.statement_id = $1 AND t.user_id = $2
            ORDER BY t.tx_date DESC
        `;

        const transactions = await neonQuery<{
            id: number;
            tx_date: Date | string;
            description: string;
            amount: number;
            balance: number | null;
            category_id: number | null;
            raw_csv_row: string | null;
            category_name: string | null;
        }>(query, [statementId, userId]);

        // Format the transactions with proper category handling
        const formattedTransactions = transactions.map((tx) => {
            let category: string = "Other";
            
            // Priority 1: Use category name from categories table
            if (tx.category_name) {
                category = tx.category_name;
            }
            // Priority 2: Try to get category from raw_csv_row
            else if (tx.raw_csv_row) {
                try {
                    const parsed = JSON.parse(tx.raw_csv_row);
                    if (parsed.category) {
                        category = parsed.category;
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
            
            return {
                id: tx.id,
                date: typeof tx.tx_date === 'string' ? tx.tx_date : tx.tx_date.toISOString().split('T')[0],
                description: tx.description,
                amount: Number(tx.amount),
                balance: tx.balance ? Number(tx.balance) : null,
                category: category,
            };
        });

        return NextResponse.json(formattedTransactions);
    } catch (error: any) {
        console.error("[Get Statement Transactions API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch transactions" },
            { status: 500 }
        );
    }
};

