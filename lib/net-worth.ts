import type { DebtAccountSummary } from "@/lib/types/debts"
import type {
  OwnedPropertyMetadata,
  PocketItemWithTotals,
  PocketsBundleResponse,
  VehicleMetadata,
} from "@/lib/types/pockets"

export type NetWorthTransaction = {
  date: string
  amount: number
  balance?: number | null
}

export function estimateRemainingMortgage(mortgage?: OwnedPropertyMetadata["mortgage"]) {
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

export function computeVehicleEquity(pocket: PocketItemWithTotals) {
  const metadata = pocket.metadata as Partial<VehicleMetadata>
  const baseValue =
    typeof metadata.priceBought === "number" && Number.isFinite(metadata.priceBought)
      ? metadata.priceBought
      : pocket.totalInvested
  const safeBaseValue = Number.isFinite(baseValue) ? (baseValue as number) : 0
  const loanRemaining = Number.isFinite(metadata.financing?.loanRemaining)
    ? (metadata.financing?.loanRemaining as number)
    : 0
  return safeBaseValue - loanRemaining
}

export function computePropertyEquity(pocket: PocketItemWithTotals) {
  const metadata = pocket.metadata as Partial<OwnedPropertyMetadata>
  if (metadata.propertyType !== "owned") return 0

  const estimatedValue =
    typeof metadata.estimatedValue === "number" && Number.isFinite(metadata.estimatedValue)
      ? metadata.estimatedValue
      : pocket.totalInvested
  const safeEstimatedValue = Number.isFinite(estimatedValue) ? (estimatedValue as number) : 0

  return safeEstimatedValue - estimateRemainingMortgage(metadata.mortgage)
}

export function getLatestBalanceSnapshot(transactions: NetWorthTransaction[]) {
  // `Number.isFinite` rejects null, undefined AND NaN — a plain `!== null`
  // check would let NaN through and poison every downstream total.
  return [...transactions]
    .filter((transaction) => Number.isFinite(transaction.balance))
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
}

export function computeDefaultNetWorth({
  transactions,
  savingsTotal,
  pocketsData,
  debts,
}: {
  transactions: NetWorthTransaction[]
  savingsTotal: number
  pocketsData?: PocketsBundleResponse
  debts: DebtAccountSummary[]
}) {
  const latestBalanceEntry = getLatestBalanceSnapshot(transactions)

  const propertyTotal = (pocketsData?.properties ?? []).reduce((sum, pocket) => {
    return sum + computePropertyEquity(pocket)
  }, 0)

  const vehicleTotal = (pocketsData?.vehicles ?? []).reduce((sum, pocket) => {
    return sum + computeVehicleEquity(pocket)
  }, 0)

  const otherTotal = (pocketsData?.otherPockets ?? []).reduce((sum, pocket) => {
    return sum + (Number.isFinite(pocket.totalInvested) ? pocket.totalInvested : 0)
  }, 0)

  const standaloneDebtTotal = debts
    .filter((debt) => debt.origin_kind === "standalone")
    .reduce((sum, debt) => sum + Math.max(0, Number.isFinite(debt.current_balance) ? debt.current_balance : 0), 0)

  const safeSavingsTotal = Number.isFinite(savingsTotal) ? savingsTotal : 0
  const total = safeSavingsTotal + propertyTotal + vehicleTotal + otherTotal - standaloneDebtTotal

  return {
    total,
    latestBalanceSnapshot: latestBalanceEntry?.balance ?? 0,
    propertyTotal,
    vehicleTotal,
    otherTotal,
    standaloneDebtTotal,
    savingsTotal,
  }
}
