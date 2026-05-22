import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { GOAL_ENTRY_TYPES } from "@/lib/types/goals"

const CreateGoalEntrySchema = z.object({
  entryType: z.enum(GOAL_ENTRY_TYPES),
  amount: z.number().positive(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(400).optional().nullable(),
  transactionId: z.number().int().positive().optional().nullable(),
})

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const userId = await getCurrentUserId()
    const params = await context.params
    const goalId = Number.parseInt(params.id, 10)

    if (!Number.isFinite(goalId)) {
      return NextResponse.json({ error: "Invalid goal id" }, { status: 400 })
    }

    const rows = await neonQuery(
      `SELECT
          id,
          goal_id,
          user_id,
          entry_type,
          amount::text,
          entry_date::text,
          transaction_id,
          debt_entry_id,
          note,
          created_at::text
       FROM goal_entries
       WHERE user_id = $1
         AND goal_id = $2
       ORDER BY entry_date DESC, created_at DESC`,
      [userId, goalId]
    )

    return NextResponse.json({ entries: rows })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch goal entries"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getCurrentUserId()
    const params = await context.params
    const goalId = Number.parseInt(params.id, 10)

    if (!Number.isFinite(goalId)) {
      return NextResponse.json({ error: "Invalid goal id" }, { status: 400 })
    }

    const body = await request.json()
    const parsed = CreateGoalEntrySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid goal entry" },
        { status: 400 }
      )
    }

    const goalRows = await neonQuery<{ goal_kind: string }>(
      `SELECT goal_kind
       FROM savings_goals
       WHERE id = $1
         AND user_id = $2`,
      [goalId, userId]
    )

    const goal = goalRows[0]
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    if (goal.goal_kind === "debt_payoff" || goal.goal_kind === "net_worth_target") {
      return NextResponse.json({ error: "This goal derives progress from linked data instead of manual entries" }, { status: 400 })
    }

    const { entryType, amount, entryDate, note, transactionId } = parsed.data

    if (transactionId != null) {
      const transactionRows = await neonQuery<{ id: number }>(
        `SELECT id
         FROM transactions
         WHERE id = $1
           AND user_id = $2
         LIMIT 1`,
        [transactionId, userId]
      )

      if (!transactionRows[0]?.id) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
      }

      const duplicateRows = await neonQuery<{ id: number }>(
        `SELECT id
         FROM goal_entries
         WHERE goal_id = $1
           AND user_id = $2
           AND transaction_id = $3
         LIMIT 1`,
        [goalId, userId, transactionId]
      )

      if (duplicateRows[0]?.id) {
        return NextResponse.json({ error: "This transaction is already linked to the goal" }, { status: 409 })
      }
    }

    await neonQuery(
      `INSERT INTO goal_entries (
          goal_id,
          user_id,
          entry_type,
          amount,
          entry_date,
          transaction_id,
          note,
          created_at
       )
       VALUES ($1, $2, $3, $4, $5::date, $6, $7, NOW())`,
      [goalId, userId, entryType, amount, entryDate, transactionId ?? null, note?.trim() || null]
    )

    await neonQuery(
      `UPDATE savings_goals
       SET updated_at = NOW()
       WHERE id = $1
         AND user_id = $2`,
      [goalId, userId]
    )

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save goal entry"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
