// app/api/cache/invalidate/route.ts
// Endpoint to invalidate user cache (e.g. on logout or after code changes)

import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { invalidateUserCache, invalidateUserCachePrefix } from "@/lib/cache/upstash";

// POST /api/cache/invalidate
// Body: { prefix?: "analytics" | "fridge" | "home" | "trends" | "savings" | "categories" | "data-library" }
// If no prefix, invalidates ALL user cache
export async function POST(request: NextRequest) {
    try {
        const userId = await getCurrentUserId();
        
        let body: { prefix?: string } = {};
        try {
            body = await request.json();
        } catch {
            // No body provided, invalidate all
        }

        const { prefix } = body;

        if (prefix) {
            // Validate prefix
            const validPrefixes = ["analytics", "fridge", "home", "trends", "savings", "categories", "data-library", "pockets"] as const;
            if (!validPrefixes.includes(prefix as any)) {
                return NextResponse.json(
                    { error: `Invalid prefix. Valid options: ${validPrefixes.join(", ")}` },
                    { status: 400 }
                );
            }
            
            await invalidateUserCachePrefix(userId, prefix as any);
            
            return NextResponse.json({
                success: true,
                message: `Cache invalidated for prefix: ${prefix}`,
                userId: userId.substring(0, 8) + "...",
            });
        } else {
            // Invalidate all user cache (Redis)
            await invalidateUserCache(userId);

            // Revalidate Next/Vercel server cache for main routes so no stale data is served
            const paths = [
                "/", "/analytics", "/home", "/fridge", "/savings", "/trends",
                "/data-library", "/pockets", "/billing", "/testCharts",
            ];
            for (const path of paths) {
                revalidatePath(path);
            }

            return NextResponse.json({
                success: true,
                message: "All user cache invalidated",
                userId: userId.substring(0, 8) + "...",
            });
        }
    } catch (error: any) {
        if (error.message?.includes("sign in") || error.message?.includes("auth")) {
            return NextResponse.json(
                { error: "Please sign in to invalidate cache" },
                { status: 401 }
            );
        }
        
        console.error("[Cache Invalidate API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to invalidate cache" },
            { status: 500 }
        );
    }
}

// GET /api/cache/invalidate?prefix=analytics
// Quick way to invalidate via URL (useful for testing)
export async function GET(request: NextRequest) {
    try {
        const userId = await getCurrentUserId();
        const prefix = request.nextUrl.searchParams.get("prefix");
        const all = request.nextUrl.searchParams.get("all");

        if (all === "true") {
            await invalidateUserCache(userId);
            const paths = ["/", "/analytics", "/home", "/fridge", "/savings", "/trends", "/data-library", "/pockets", "/billing", "/testCharts"];
            for (const path of paths) revalidatePath(path);
            return NextResponse.json({
                success: true,
                message: "All user cache invalidated",
            });
        }

        if (prefix) {
            const validPrefixes = ["analytics", "fridge", "home", "trends", "savings", "categories", "data-library", "pockets"] as const;
            if (!validPrefixes.includes(prefix as any)) {
                return NextResponse.json(
                    { error: `Invalid prefix. Valid options: ${validPrefixes.join(", ")}` },
                    { status: 400 }
                );
            }
            
            await invalidateUserCachePrefix(userId, prefix as any);
            
            return NextResponse.json({
                success: true,
                message: `Cache invalidated for prefix: ${prefix}`,
            });
        }

        // No params - show usage
        return NextResponse.json({
            usage: {
                "GET /api/cache/invalidate?all=true": "Invalidate all user cache",
                "GET /api/cache/invalidate?prefix=analytics": "Invalidate analytics cache",
                "POST /api/cache/invalidate": "Invalidate all (or specify prefix in body)",
            },
            validPrefixes: ["analytics", "fridge", "home", "trends", "savings", "categories", "data-library", "pockets"],
        });
    } catch (error: any) {
        if (error.message?.includes("sign in") || error.message?.includes("auth")) {
            return NextResponse.json(
                { error: "Please sign in to invalidate cache" },
                { status: 401 }
            );
        }
        
        console.error("[Cache Invalidate API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to invalidate cache" },
            { status: 500 }
        );
    }
}
