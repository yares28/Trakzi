import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUserId } from "@/lib/auth"
import { getDebtAccountsSummary } from "@/lib/debts/server"
import { neonQuery } from "@/lib/neonClient"
import { GOAL_KINDS, GOAL_POCKET_TYPES, GOAL_STATUSES } from "@/lib/types/goals"

const CreateGoalSchema = z.object({
  goalKind: z.enum(GOAL_KINDS).default("savings_target"),
  category: z.string().min(1).max(100),
  targetAmount: z.number().min(0),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monthlyAllocation: z.number().min(0),
  label: z.string().max(200).optional().nullable(),
  priority: z.number().int().min(1).max(3).optional(),
  notes: z.string().max(500).optional().nullable(),
  linkedDebtAccountId: z.number().int().positive().optional().nullable(),
  linkedPocketId: z.number().int().positive().optional().nullable(),
  linkedPocketType: z.enum(GOAL_POCKET_TYPES).optional().nullable(),
  targetBalance: z.number().min(0).optional().nullable(),
  startingAmount: z.number().min(0).optional().nullable(),
  initialContribution: z.number().min(0).optional().nullable(),
})

const UpdateGoalSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(GOAL_STATUSES),
})

export async function GET() {
  try {
    const userId = await getCurrentUserId()

    const rows = await neonQuery(
      `SELECT
          sg.id,
          sg.user_id,
          sg.category,
          sg.label,
          sg.target_amount::text,
          sg.deadline::text,
          sg.monthly_allocation::text,
          sg.status,
          sg.created_at::text,
          COALESCE(sg.goal_kind, 'savings_target') AS goal_kind,
          COALESCE(sg.priority, 2) AS priority,
          sg.notes,
          sg.linked_debt_account_id,
          sg.linked_pocket_id,
          sg.linked_pocket_type,
          sg.archived_at::text,
          sg.updated_at::text,
          sg.completed_at::text,
          sg.target_balance::text,
          sg.starting_amount::text,
          COALESCE((
            SELECT SUM(
              CASE ge.entry_type
                WHEN 'contribution' THEN ge.amount
                WHEN 'withdrawal' THEN -ge.amount
                ELSE ge.amount
              END
            )
            FROM goal_entries ge
            WHERE ge.goal_id = sg.id
              AND ge.user_id = sg.user_id
          ), 0)::text AS manual_progress
       FROM savings_goals sg
       WHERE sg.user_id = $1
         AND sg.archived_at IS NULL
       ORDER BY
         CASE sg.status WHEN 'active' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END,
         sg.deadline ASC,
         sg.created_at DESC`,
      [userId]
    )

    return NextResponse.json({ goals: rows })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch goals"
    return NextResponse.json({ error: message }, { status: 500 })
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

    const {
      goalKind,
      category,
      targetAmount,
      deadline,
      monthlyAllocation,
      label,
      priority,
      notes,
      linkedDebtAccountId,
      linkedPocketId,
      linkedPocketType,
      targetBalance,
      startingAmount,
      initialContribution,
    } = parsed.data
    let resolvedTargetAmount = targetAmount
    let resolvedStartingAmount = startingAmount ?? null

    if (goalKind === "debt_payoff" && !linkedDebtAccountId) {
      return NextResponse.json({ error: "Select a debt account for payoff goals" }, { status: 400 })
    }

    if ((goalKind === "savings_target" || goalKind === "pocket_funding" || goalKind === "net_worth_target") && targetAmount <= 0) {
      return NextResponse.json({ error: "Target amount must be greater than 0" }, { status: 400 })
    }

    if (goalKind === "debt_payoff") {
      const debtAccounts = await getDebtAccountsSummary(userId)
      const linkedDebt = debtAccounts.find((debt) => debt.id === linkedDebtAccountId) ?? null

      if (!linkedDebt) {
        return NextResponse.json({ error: "The selected debt could not be found" }, { status: 404 })
      }

      if (linkedDebt.status === "archived" || linkedDebt.status === "paid_off") {
        return NextResponse.json({ error: "This debt is not available for a payoff goal" }, { status: 400 })
      }

      const currentDebtBalance = Math.max(0, linkedDebt.current_balance)
      if (currentDebtBalance <= 0) {
        return NextResponse.json({ error: "This debt is already at a zero balance" }, { status: 400 })
      }

      if ((targetBalance ?? 0) > currentDebtBalance) {
        return NextResponse.json(
          { error: "Target balance cannot be higher than the current debt balance" },
          { status: 400 }
        )
      }

      resolvedTargetAmount = currentDebtBalance
      resolvedStartingAmount = currentDebtBalance
    }

    if (goalKind === "pocket_funding" && (!linkedPocketId || !linkedPocketType)) {
      return NextResponse.json({ error: "Select a property or vehicle for pocket funding goals" }, { status: 400 })
    }

    const rows = await neonQuery<{ id: number }>(
      `INSERT INTO savings_goals (
          user_id,
          category,
          target_amount,
          deadline,
          monthly_allocation,
          label,
          goal_kind,
          priority,
          notes,
          linked_debt_account_id,
          linked_pocket_id,
          linked_pocket_type,
          target_balance,
          starting_amount,
          status,
          created_at,
          updated_at
       )
       VALUES (
          $1,
          $2,
          $3,
          $4::date,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          'active',
          NOW(),
          NOW()
       )
       RETURNING id`,
      [
        userId,
        category,
        resolvedTargetAmount,
        deadline,
        monthlyAllocation,
        label?.trim() || null,
        goalKind,
        priority ?? 2,
        notes?.trim() || null,
        linkedDebtAccountId ?? null,
        linkedPocketId ?? null,
        linkedPocketType ?? null,
        targetBalance ?? null,
        resolvedStartingAmount,
      ]
    )

    const id = rows[0]?.id
    if (!id) {
      return NextResponse.json({ error: "Failed to create goal" }, { status: 500 })
    }

    if ((goalKind === "savings_target" || goalKind === "pocket_funding") && (initialContribution ?? 0) > 0) {
      await neonQuery(
        `INSERT INTO goal_entries (
            goal_id,
            user_id,
            entry_type,
            amount,
            entry_date,
            note,
            created_at
         )
         VALUES ($1, $2, 'adjustment', $3, CURRENT_DATE, $4, NOW())`,
        [id, userId, initialContribution, "Starting amount"]
      )
    }

    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create goal"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const parsed = UpdateGoalSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      )
    }

    const { id, status } = parsed.data

    const rows = await neonQuery<{ id: number }>(
      `UPDATE savings_goals
       SET
         status = $1,
         completed_at = CASE WHEN $1 = 'completed' THEN COALESCE(completed_at, NOW()) WHEN $1 = 'active' THEN NULL ELSE completed_at END,
         archived_at = CASE WHEN $1 = 'archived' THEN COALESCE(archived_at, NOW()) WHEN $1 != 'archived' THEN NULL ELSE archived_at END,
         updated_at = NOW()
       WHERE id = $2
         AND user_id = $3
       RETURNING id`,
      [status, id, userId]
    )

    if (!rows[0]?.id) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update goal"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    const { id } = await req.json() as { id: number }
    await neonQuery(`DELETE FROM savings_goals WHERE id = $1 AND user_id = $2`, [id, userId])
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete goal"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
