// app/api/limits/status/route.ts
// Returns the user's current transaction limits and usage

import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getRemainingCapacity, TransactionCapacity } from "@/lib/limits/transactions-cap";
import { getPlanLimits, getUpgradePlans, getPlanDisplayName } from "@/lib/plan-limits";

export interface LimitsStatusResponse {
    plan: string;
    planDisplayName: string;
    transactions: {
        cap: number;
        used: number;
        remaining: number;
        bankTransactions: number;
        receiptTrips: number;
        percentUsed: number;
    };
    upgradePlans: Array<{
        plan: string;
        displayName: string;
        cap: number;
    }>;
}

export const GET = async () => {
    try {
        const userId = await getCurrentUserId();
        const capacity = await getRemainingCapacity(userId);
        const upgradePlansList = getUpgradePlans(capacity.plan);

        const percentUsed = capacity.cap === Infinity
            ? 0
            : Math.round((capacity.used / capacity.cap) * 100);

        const response: LimitsStatusResponse = {
            plan: capacity.plan,
            planDisplayName: getPlanDisplayName(capacity.plan),
            transactions: {
                cap: capacity.cap,
                used: capacity.used,
                remaining: capacity.remaining,
                bankTransactions: capacity.bankTransactions,
                receiptTrips: capacity.receiptTrips,
                percentUsed,
            },
            upgradePlans: upgradePlansList.map(plan => ({
                plan,
                displayName: getPlanDisplayName(plan),
                cap: getPlanLimits(plan).maxTotalTransactions,
            })),
        };

        return NextResponse.json(response, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error: any) {
        const message = String(error?.message || "");
        if (message.includes("Unauthorized")) {
            return NextResponse.json(
                { error: "Please sign in to access limits." },
                { status: 401 }
            );
        }

        console.error("[Limits Status API] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch limits status" },
            { status: 500 }
        );
    }
};
