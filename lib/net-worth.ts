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
  const loanRemaining = metadata.financing?.loanRemaining ?? 0
  return baseValue - loanRemaining
}

export function computePropertyEquity(pocket: PocketItemWithTotals) {
  const metadata = pocket.metadata as Partial<OwnedPropertyMetadata>
  if (metadata.propertyType !== "owned") return 0

  const estimatedValue =
    typeof metadata.estimatedValue === "number" && Number.isFinite(metadata.estimatedValue)
      ? metadata.estimatedValue
      : pocket.totalInvested

  return estimatedValue - estimateRemainingMortgage(metadata.mortgage)
}

export function getLatestBalanceSnapshot(transactions: NetWorthTransaction[]) {
  return [...transactions]
    .filter((transaction) => transaction.balance !== null && transaction.balance !== undefined)
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
    return sum + pocket.totalInvested
  }, 0)

  const standaloneDebtTotal = debts
    .filter((debt) => debt.origin_kind === "standalone")
    .reduce((sum, debt) => sum + Math.max(0, debt.current_balance), 0)

  const total = savingsTotal + propertyTotal + vehicleTotal + otherTotal - standaloneDebtTotal

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
