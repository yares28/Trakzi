import { neonQuery } from "@/lib/neonClient"
import type { OwnedPropertyMetadata, VehicleMetadata } from "@/lib/types/pockets"
import type { DebtAccountSummary, DebtEntrySummary, DebtType } from "@/lib/types/debts"

type SyncPocket = {
  id: number
  type: "vehicle" | "property" | "other"
  name: string
  metadata: Record<string, unknown>
  created_at: string
}

function estimateRemainingMortgage(mortgage?: OwnedPropertyMetadata["mortgage"]) {
  if (!mortgage) return 0

  const principal = mortgage.originalAmount ?? 0
  const totalPayments = Math.max(0, Math.round((mortgage.loanYears ?? 0) * 12))
  const paidPayments = Math.max(0, Math.min(totalPayments, Math.round((mortgage.yearsPaid ?? 0) * 12)))
  const monthlyRate = (mortgage.interestRate ?? 0) / 100 / 12

  if (principal <= 0 || totalPayments <= 0) return 0
  if (paidPayments >= totalPayments) return 0

  if (monthlyRate <= 0) {
    return principal * ((totalPayments - paidPayments) / totalPayments)
  }

  const growthFactor = (1 + monthlyRate) ** totalPayments
  const payment = (principal * monthlyRate * growthFactor) / (growthFactor - 1)
  const remaining =
    principal * (1 + monthlyRate) ** paidPayments -
    payment * (((1 + monthlyRate) ** paidPayments - 1) / monthlyRate)

  return Number.isFinite(remaining) ? Math.max(0, remaining) : 0
}

function getVehiclePocketDebt(pocket: SyncPocket) {
  const metadata = pocket.metadata as Partial<VehicleMetadata>
  const remaining = metadata.financing?.loanRemaining ?? 0

  if (!remaining || remaining <= 0) return null

  return {
    debtType: "vehicle_finance" as DebtType,
    name: `${pocket.name} Financing`,
    openingBalance: remaining,
    interestRate: metadata.financing?.annualInterestRate ?? null,
    openedAt: pocket.created_at.slice(0, 10),
  }
}

function getPropertyPocketDebt(pocket: SyncPocket) {
  const metadata = pocket.metadata as Partial<OwnedPropertyMetadata>
  if (metadata.propertyType !== "owned") return null

  const remaining = estimateRemainingMortgage(metadata.mortgage)
  if (!remaining || remaining <= 0) return null

  return {
    debtType: "mortgage_main_home" as DebtType,
    name: `${pocket.name} Mortgage`,
    openingBalance: remaining,
    interestRate: metadata.mortgage?.interestRate ?? null,
    openedAt: pocket.created_at.slice(0, 10),
  }
}

export async function ensureLinkedPocketDebts(userId: string) {
  const pockets = await neonQuery<{
    id: number
    type: "vehicle" | "property" | "other"
    name: string
    metadata: Record<string, unknown>
    created_at: string
  }>(
    `SELECT id, type, name, metadata, created_at::text as created_at
     FROM pockets
     WHERE user_id = $1
       AND type IN ('vehicle', 'property')`,
    [userId]
  )

  const existingAccounts = await neonQuery<{
    linked_pocket_id: number | null
    linked_pocket_type: string | null
  }>(
    `SELECT linked_pocket_id, linked_pocket_type
     FROM debt_accounts
     WHERE user_id = $1
       AND linked_pocket_id IS NOT NULL
       AND linked_pocket_type IS NOT NULL`,
    [userId]
  )

  const existingKeys = new Set(
    existingAccounts.map((account) => `${account.linked_pocket_type}:${account.linked_pocket_id}`)
  )

  for (const pocket of pockets) {
    const pocketDebt =
      pocket.type === "vehicle"
        ? getVehiclePocketDebt(pocket)
        : getPropertyPocketDebt(pocket)

    if (!pocketDebt) continue

    const key = `${pocket.type}:${pocket.id}`
    if (existingKeys.has(key)) continue

    const insertedAccounts = await neonQuery<{ id: number }>(
      `INSERT INTO debt_accounts (
          user_id,
          origin_kind,
          linked_pocket_id,
          linked_pocket_type,
          name,
          debt_type,
          currency,
          interest_rate,
          interest_rate_kind,
          status,
          opened_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'EUR', $7, $8, 'active', $9::date)
       RETURNING id`,
      [
        userId,
        pocket.type === "vehicle" ? "vehicle_pocket" : "property_pocket",
        pocket.id,
        pocket.type,
        pocketDebt.name,
        pocketDebt.debtType,
        pocketDebt.interestRate,
        pocketDebt.interestRate != null ? "fixed" : "unknown",
        pocketDebt.openedAt,
      ]
    )

    const debtAccountId = insertedAccounts[0]?.id
    if (!debtAccountId) continue

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
        pocketDebt.openedAt,
        pocketDebt.openingBalance,
        `Auto-created from ${pocket.type} pocket`,
      ]
    )
  }
}

export async function getDebtAccountsSummary(userId: string) {
  await ensureLinkedPocketDebts(userId)

  return neonQuery<DebtAccountSummary>(
    `SELECT
        da.id,
        da.user_id,
        da.origin_kind,
        da.linked_pocket_id,
        da.linked_pocket_type,
        da.name,
        da.debt_type,
        da.lender_name,
        da.currency,
        da.country_code,
        da.region_code,
        da.interest_rate,
        da.interest_rate_kind,
        da.reference_rate,
        da.minimum_payment,
        da.payment_frequency,
        da.due_day,
        da.status,
        da.opened_at::text,
        da.closed_at::text,
        da.notes,
        da.created_at::text,
        da.updated_at::text,
        COALESCE(SUM(de.amount_signed), 0)::float8 AS current_balance,
        COALESCE(SUM(CASE WHEN de.entry_type = 'payment' THEN ABS(de.amount_signed) ELSE 0 END), 0)::float8 AS total_paid,
        COALESCE(SUM(CASE WHEN de.entry_type = 'interest' THEN de.amount_signed ELSE 0 END), 0)::float8 AS total_interest,
        COALESCE(SUM(CASE WHEN de.entry_type = 'fee' THEN de.amount_signed ELSE 0 END), 0)::float8 AS total_fees,
        COUNT(de.id)::int AS entry_count,
        MAX(de.entry_date)::text AS last_entry_date
     FROM debt_accounts da
     LEFT JOIN debt_entries de
       ON de.debt_account_id = da.id
      AND de.user_id = da.user_id
     WHERE da.user_id = $1
       AND da.status != 'archived'
     GROUP BY da.id
     ORDER BY
       CASE da.status WHEN 'active' THEN 0 WHEN 'paid_off' THEN 1 ELSE 2 END,
       current_balance DESC,
       da.created_at DESC`,
    [userId]
  )
}

export async function getDebtEntries(userId: string, debtAccountId: number) {
  return neonQuery<DebtEntrySummary>(
    `SELECT
        id,
        debt_account_id,
        entry_type,
        entry_date::text,
        amount_signed::float8,
        principal_signed::float8,
        interest_signed::float8,
        fee_signed::float8,
        transaction_id,
        notes,
        created_at::text
     FROM debt_entries
     WHERE user_id = $1
       AND debt_account_id = $2
     ORDER BY entry_date DESC, created_at DESC`,
    [userId, debtAccountId]
  )
}
