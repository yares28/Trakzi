import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUserId } from "@/lib/auth"
import { getDebtEntries } from "@/lib/debts/server"
import { neonQuery } from "@/lib/neonClient"
import { DEBT_ENTRY_TYPES } from "@/lib/types/debts"

const EntrySchema = z.object({
  entryType: z.enum(DEBT_ENTRY_TYPES),
  amount: z.number().positive(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(300).optional().nullable(),
  transactionId: z.number().int().positive().optional().nullable(),
})

function toSignedAmount(entryType: z.infer<typeof EntrySchema>["entryType"], amount: number) {
  if (entryType === "payment" || entryType === "payoff" || entryType === "refund" || entryType === "refinance_out") {
    return -Math.abs(amount)
  }

  if (entryType === "adjustment") {
    return amount
  }

  return Math.abs(amount)
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    const { id } = await context.params
    const debtAccountId = Number.parseInt(id, 10)

    if (!Number.isFinite(debtAccountId)) {
      return NextResponse.json({ error: "Invalid debt id" }, { status: 400 })
    }

    const entries = await getDebtEntries(userId, debtAccountId)
    return NextResponse.json({ entries })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch debt entries"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    const { id } = await context.params
    const debtAccountId = Number.parseInt(id, 10)

    if (!Number.isFinite(debtAccountId)) {
      return NextResponse.json({ error: "Invalid debt id" }, { status: 400 })
    }

    const body = await request.json()
    const parsed = EntrySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid debt entry payload" },
        { status: 400 }
      )
    }

    const debtAccount = await neonQuery<{ id: number }>(
      `SELECT id
       FROM debt_accounts
       WHERE id = $1
         AND user_id = $2`,
      [debtAccountId, userId]
    )

    if (debtAccount.length === 0) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 })
    }

    const { entryType, amount, entryDate, notes, transactionId } = parsed.data
    const signedAmount = toSignedAmount(entryType, amount)

    await neonQuery(
      `INSERT INTO debt_entries (
          user_id,
          debt_account_id,
          entry_type,
          entry_date,
          amount_signed,
          transaction_id,
          notes
       )
       VALUES ($1, $2, $3, $4::date, $5, $6, $7)`,
      [
        userId,
        debtAccountId,
        entryType,
        entryDate,
        signedAmount,
        transactionId ?? null,
        notes?.trim() || null,
      ]
    )

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create debt entry"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
