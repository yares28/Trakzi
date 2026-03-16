import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { getUserPlan } from "@/lib/subscriptions"
import { getPlanLimits } from "@/lib/plan-limits"

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    const plan = await getUserPlan(userId)
    const limits = getPlanLimits(plan)

    const limit = limits.aiChatMessages

    // Rolling 7-day usage count
    const usageRows = await neonQuery<{ count: string; oldest: string | null }>(
      `SELECT COUNT(*) as count, MIN(created_at) as oldest
       FROM ai_chat_usage
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
      [userId]
    )

    const used = parseInt(usageRows[0]?.count || "0")
    const oldestInWindow = usageRows[0]?.oldest ?? null

    // Reset = when the oldest message in the window ages out (oldest + 7 days)
    const resetsAt = oldestInWindow
      ? new Date(new Date(oldestInWindow).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null

    return NextResponse.json({
      used,
      limit: limit === Infinity ? null : limit,
      remaining: limit === Infinity ? null : Math.max(0, limit - used),
      resetsAt,
      plan,
    })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
