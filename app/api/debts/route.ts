import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { getDebtAccountsSummary } from "@/lib/debts/server"
import {
  DEBT_INTEREST_RATE_KINDS,
  DEBT_PAYMENT_FREQUENCIES,
  DEBT_STATUSES,
  STANDALONE_DEBT_TYPES,
} from "@/lib/types/debts"

const CreateDebtSchema = z.object({
  name: z.string().min(1).max(120),
  debtType: z.enum(STANDALONE_DEBT_TYPES),
  currentBalance: z.number().positive(),
  lenderName: z.string().max(120).optional().nullable(),
  currency: z.string().min(3).max(3).optional(),
  countryCode: z.string().max(2).optional().nullable(),
  regionCode: z.string().max(12).optional().nullable(),
  interestRate: z.number().min(0).max(100).optional().nullable(),
  interestRateKind: z.enum(DEBT_INTEREST_RATE_KINDS).optional(),
  minimumPayment: z.number().min(0).optional().nullable(),
  paymentFrequency: z.enum(DEBT_PAYMENT_FREQUENCIES).optional().nullable(),
  dueDay: z.number().int().min(1).max(31).optional().nullable(),
  openedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().max(400).optional().nullable(),
})

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    const debts = await getDebtAccountsSummary(userId)
    return NextResponse.json({ debts })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch debts"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    const body = await request.json()
    const parsed = CreateDebtSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid debt payload" },
        { status: 400 }
      )
    }

    const {
      name,
      debtType,
      currentBalance,
      lenderName,
      currency,
      countryCode,
      regionCode,
      interestRate,
      interestRateKind,
      minimumPayment,
      paymentFrequency,
      dueDay,
      openedAt,
      notes,
    } = parsed.data

    const insertedAccounts = await neonQuery<{ id: number }>(
      `INSERT INTO debt_accounts (
          user_id,
          origin_kind,
          name,
          debt_type,
          lender_name,
          currency,
          country_code,
          region_code,
          interest_rate,
          interest_rate_kind,
          minimum_payment,
          payment_frequency,
          due_day,
          status,
          opened_at,
          notes
       )
       VALUES (
          $1,
          'standalone',
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14::date,
          $15
       )
       RETURNING id`,
      [
        userId,
        name.trim(),
        debtType,
        lenderName?.trim() || null,
        currency ?? "EUR",
        countryCode?.trim() || null,
        regionCode?.trim() || null,
        interestRate ?? null,
        interestRateKind ?? (interestRate != null ? "fixed" : "unknown"),
        minimumPayment ?? null,
        paymentFrequency ?? null,
        dueDay ?? null,
        DEBT_STATUSES[0],
        openedAt ?? new Date().toISOString().slice(0, 10),
        notes?.trim() || null,
      ]
    )

    const debtAccountId = insertedAccounts[0]?.id
    if (!debtAccountId) {
      return NextResponse.json({ error: "Failed to create debt" }, { status: 500 })
    }

    await neonQuery(
      `INSERT INTO debt_entries (
          user_id,
          debt_account_id,
          entry_type,
          entry_date,
          amount_signed,
          principal_signed,
          notes
       )
       VALUES ($1, $2, 'opening_balance', $3::date, $4, $4, $5)`,
      [
        userId,
        debtAccountId,
        openedAt ?? new Date().toISOString().slice(0, 10),
        currentBalance,
        "Initial balance",
      ]
    )

    return NextResponse.json({ id: debtAccountId }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create debt"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
