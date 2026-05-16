import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUserId } from "@/lib/auth"
import { neonQuery, neonInsert } from "@/lib/neonClient"
import { checkRateLimit, createRateLimitResponse } from "@/lib/security/rate-limiter"

type SortOption = "top" | "new" | "trending"

type FeatureRow = {
    id: string
    title: string
    body: string | null
    score: number
    created_at: string
    author_id: string
    author_name: string | null
    my_vote: number
}

type InsertedFeature = {
    id: string
    user_id: string
    title: string
    body: string | null
    score: number
    created_at: string
    updated_at: string
}

type InsertFeatureInput = {
    id?: string
    user_id: string
    title: string
    body: string | null
    score?: number
    created_at?: string
    updated_at?: string
}

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 50
const DAILY_POST_CAP = 5

const postSchema = z.object({
    title: z
        .string()
        .min(3, "Title must be at least 3 characters")
        .max(100, "Title must be at most 100 characters"),
    body: z
        .string()
        .max(1000, "Description must be at most 1000 characters")
        .optional(),
})

export async function GET(req: NextRequest) {
    try {
        const userId = await getCurrentUserId()

        const { searchParams } = req.nextUrl
        const sort = (searchParams.get("sort") ?? "top") as SortOption
        const cursorParam = searchParams.get("cursor")
        const limitParam = searchParams.get("limit")

        const limit = Math.min(
            Math.max(1, parseInt(limitParam ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
            MAX_LIMIT
        )

        const offset = cursorParam
            ? parseInt(Buffer.from(cursorParam, "base64url").toString(), 10)
            : 0

        let rows: FeatureRow[]

        if (sort === "trending") {
            rows = await neonQuery<FeatureRow>(
                `SELECT f.id, f.title, f.body, f.score, f.created_at,
                        u.id AS author_id, u.name AS author_name,
                        COALESCE(v.value, 0) AS my_vote,
                        COALESCE(SUM(rv.value), 0) AS trending_score
                 FROM feedback_features f
                 JOIN users u ON u.id = f.user_id
                 LEFT JOIN feedback_votes v ON v.feature_id = f.id AND v.user_id = $1
                 LEFT JOIN feedback_votes rv ON rv.feature_id = f.id AND rv.created_at > NOW() - INTERVAL '7 days'
                 GROUP BY f.id, u.id, u.name, v.value
                 ORDER BY trending_score DESC, f.score DESC, f.created_at DESC, f.id DESC
                 LIMIT $2 OFFSET $3`,
                [userId, limit, offset]
            )
        } else if (sort === "new") {
            rows = await neonQuery<FeatureRow>(
                `SELECT f.id, f.title, f.body, f.score, f.created_at,
                        u.id AS author_id, u.name AS author_name,
                        COALESCE(v.value, 0) AS my_vote
                 FROM feedback_features f
                 JOIN users u ON u.id = f.user_id
                 LEFT JOIN feedback_votes v ON v.feature_id = f.id AND v.user_id = $1
                 ORDER BY f.created_at DESC, f.id DESC
                 LIMIT $2 OFFSET $3`,
                [userId, limit, offset]
            )
        } else {
            rows = await neonQuery<FeatureRow>(
                `SELECT f.id, f.title, f.body, f.score, f.created_at,
                        u.id AS author_id, u.name AS author_name,
                        COALESCE(v.value, 0) AS my_vote
                 FROM feedback_features f
                 JOIN users u ON u.id = f.user_id
                 LEFT JOIN feedback_votes v ON v.feature_id = f.id AND v.user_id = $1
                 ORDER BY f.score DESC, f.created_at DESC, f.id DESC
                 LIMIT $2 OFFSET $3`,
                [userId, limit, offset]
            )
        }

        const nextCursor =
            rows.length === limit
                ? Buffer.from(String(offset + limit)).toString("base64url")
                : null

        const items = rows.map((r) => ({
            id: r.id,
            title: r.title,
            body: r.body,
            score: r.score,
            created_at: r.created_at,
            author: { id: r.author_id, name: r.author_name },
            myVote: r.my_vote as -1 | 0 | 1,
        }))

        return NextResponse.json({ items, nextCursor })
    } catch (error: unknown) {
        const msg = String((error as Error)?.message ?? "")
        if (msg.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        console.error("[GET /api/feedback/features]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const userId = await getCurrentUserId()

        const rateLimit = await checkRateLimit(userId, "mutation")
        if (rateLimit.limited) {
            return createRateLimitResponse(rateLimit.resetIn)
        }

        const dailyCount = await neonQuery<{ count: string }>(
            `SELECT COUNT(*) AS count
             FROM feedback_features
             WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
            [userId]
        )
        if (parseInt(dailyCount[0]?.count ?? "0", 10) >= DAILY_POST_CAP) {
            return NextResponse.json(
                { error: "Daily post limit reached. You can submit up to 5 ideas per day." },
                { status: 429 }
            )
        }

        const body = await req.json()

        const parsed = postSchema.safeParse({
            title: typeof body?.title === "string" ? body.title.trim() : body?.title,
            body:
                typeof body?.body === "string"
                    ? body.body.trim() || undefined
                    : body?.body,
        })

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0]?.message ?? "Invalid input" },
                { status: 400 }
            )
        }

        const { title, body: description } = parsed.data

        const inserted = await neonInsert<InsertFeatureInput>("feedback_features", {
            user_id: userId,
            title,
            body: description ?? null,
        }) as InsertedFeature[]

        const feature = inserted[0]

        return NextResponse.json(
            {
                id: feature.id,
                title: feature.title,
                body: feature.body,
                score: feature.score ?? 0,
                created_at: feature.created_at,
                author: { id: userId, name: null },
                myVote: 0,
            },
            { status: 201 }
        )
    } catch (error: unknown) {
        const msg = String((error as Error)?.message ?? "")
        if (msg.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        console.error("[POST /api/feedback/features]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
