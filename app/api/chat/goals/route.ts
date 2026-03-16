// app/api/chat/goals/route.ts
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"

const CreateGoalSchema = z.object({
  category: z.string().min(1).max(100),
  target_amount: z.number().positive(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  monthly_allocation: z.number().positive(),
  label: z.string().max(200).optional(),
})

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    const rows = await neonQuery<{
      id: number
      category: string
      label: string | null
      target_amount: string
      deadline: string
      monthly_allocation: string
      status: string
      created_at: string
    }>(
      `SELECT id, category, label, target_amount, deadline, monthly_allocation, status, created_at
       FROM savings_goals
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    )
    return NextResponse.json({ goals: rows })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const parsed = CreateGoalSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      )
    }

    const { category, target_amount, deadline, monthly_allocation, label } = parsed.data

    const rows = await neonQuery<{ id: number }>(
      `INSERT INTO savings_goals (user_id, category, target_amount, deadline, monthly_allocation, label)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, category, target_amount, deadline, monthly_allocation, label ?? null]
    )

    const id = rows[0]?.id
    if (!id) {
      return NextResponse.json({ error: "Failed to create goal" }, { status: 500 })
    }

    return NextResponse.json({ id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    const { id } = await req.json() as { id: number }
    await neonQuery(`DELETE FROM savings_goals WHERE id = $1 AND user_id = $2`, [id, userId])
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
