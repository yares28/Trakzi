// app/api/transactions/years/route.ts
import { NextResponse } from "next/server";
import { neonQuery } from "@/lib/neonClient";
import { getCurrentUserId } from "@/lib/auth";

export const GET = async () => {
    try {
        let userId: string;
        try {
            userId = await getCurrentUserId();
        } catch (authError: any) {
            console.warn("Auth error in transactions years API:", authError.message);
            return NextResponse.json([]);
        }
        
        // Get distinct years from transactions
        const years = await neonQuery<{ year: number }>(
            `SELECT DISTINCT EXTRACT(YEAR FROM tx_date)::int as year 
             FROM transactions 
             WHERE user_id = $1 
             ORDER BY year DESC`,
            [userId]
        );
        
        return NextResponse.json(years.map(y => y.year));
    } catch (error: any) {
        console.error("Transactions years API error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch years" },
            { status: 500 }
        );
    }
};










































