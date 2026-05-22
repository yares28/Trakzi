import { NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { checkRateLimit, createRateLimitResponse } from "@/lib/security/rate-limiter"

const voteSchema = z.object({
    value: z.union([z.literal(1), z.literal(-1)]),
})

type VoteResult = {
    score: number
    my_vote: number
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getCurrentUserId()

        const rateLimit = await checkRateLimit(userId, "mutation")
        if (rateLimit.limited) {
            return createRateLimitResponse(rateLimit.resetIn)
        }

        const body = await req.json()
        const parsed = voteSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0]?.message ?? "Invalid input" },
                { status: 400 }
            )
        }

        const { value } = parsed.data
        const { id: featureId } = await params

        const rows = await neonQuery<VoteResult>(
            `WITH prior AS (
               DELETE FROM feedback_votes
               WHERE feature_id = $1 AND user_id = $2
               RETURNING value
             ),
             inserted AS (
               INSERT INTO feedback_votes (feature_id, user_id, value)
               SELECT $1, $2, $3
               WHERE NOT EXISTS (SELECT 1 FROM prior WHERE value = $3)
               RETURNING value
             ),
             updated AS (
               UPDATE feedback_features
               SET
                 upvotes_count   = upvotes_count
                                 + (CASE WHEN (SELECT value FROM inserted) =  1 THEN 1 ELSE 0 END)
                                 - (CASE WHEN (SELECT value FROM prior)    =  1 THEN 1 ELSE 0 END),
                 downvotes_count = downvotes_count
                                 + (CASE WHEN (SELECT value FROM inserted) = -1 THEN 1 ELSE 0 END)
                                 - (CASE WHEN (SELECT value FROM prior)    = -1 THEN 1 ELSE 0 END),
                 updated_at      = NOW()
               WHERE id = $1
               RETURNING score
             )
             SELECT u.score, COALESCE(i.value, 0) AS my_vote
             FROM updated u
             LEFT JOIN inserted i ON true`,
            [featureId, userId, value]
        )

        if (rows.length === 0) {
            return NextResponse.json({ error: "Feature not found" }, { status: 404 })
        }

        const row = rows[0]

        return NextResponse.json({ score: row.score, myVote: row.my_vote })
    } catch (error: unknown) {
        const msg = String((error as Error)?.message ?? "")
        if (msg.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        console.error("[POST /api/feedback/features/[id]/vote]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
