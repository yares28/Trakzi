import type {
  MortgageInputs,
  MortgageResults,
  MortgageBreakdown,
  AmortizationYearData,
  TaxBreakdown,
} from "./types"
import { getCountryConfig } from "./country-config"

/**
 * Standard amortization formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 * Returns 0 if rate is 0 (simple division of principal over months).
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0 || termYears <= 0) return 0

  const monthlyRate = annualRate / 100 / 12
  const numPayments = termYears * 12

  if (monthlyRate === 0) {
    return principal / numPayments
  }

  const factor = Math.pow(1 + monthlyRate, numPayments)
  return principal * (monthlyRate * factor) / (factor - 1)
}

/** Sum of tax percentages applied to the property price */
export function calculateTaxesAndExpenses(
  price: number,
  taxes: TaxBreakdown[]
): number {
  const totalRate = taxes.reduce((sum, t) => sum + t.rate, 0)
  return price * (totalRate / 100)
}

/** Compute the full results object from inputs */
export function computeMortgageResults(inputs: MortgageInputs): MortgageResults {
  const config = getCountryConfig(inputs.countryCode)
  const loanAmount = Math.max(0, inputs.price - inputs.deposit)
  const monthlyPayment = calculateMonthlyPayment(
    loanAmount,
    inputs.interestRate,
    inputs.termYears
  )

  const financingPercent = inputs.price > 0
    ? (loanAmount / inputs.price) * 100
    : 0

  const taxBreakdown = inputs.isNewProperty
    ? config.newPropertyTaxes
    : config.secondHandTaxes(inputs.regionKey)

  const totalTaxesAndExpenses = calculateTaxesAndExpenses(inputs.price, taxBreakdown)
  const totalInterest = monthlyPayment * inputs.termYears * 12 - loanAmount
  const totalAnnualTaxes = inputs.price * (inputs.annualTaxRate / 100) * inputs.termYears
  const totalCost =
    inputs.price +
    totalTaxesAndExpenses +
    Math.max(0, totalInterest) +
    totalAnnualTaxes

  return {
    loanAmount,
    monthlyPayment,
    financingPercent,
    totalTaxesAndExpenses,
    totalInterest: Math.max(0, totalInterest),
    totalAnnualTaxes,
    totalCost,
    taxBreakdown,
  }
}

/** Build the high-level breakdown (deposit, loan, interest, taxes, total) */
export function computeBreakdown(
  inputs: MortgageInputs,
  results: MortgageResults
): MortgageBreakdown {
  return {
    deposit: inputs.deposit,
    loanAmount: results.loanAmount,
    totalInterest: results.totalInterest,
    totalTaxesAndExpenses: results.totalTaxesAndExpenses,
    totalAnnualTaxes: results.totalAnnualTaxes,
    totalCost: results.totalCost,
  }
}

/**
 * Generate a yearly amortization schedule for the chart.
 *
 * - Uses calendar years (e.g. 2026, 2027...) based on the current date
 * - Year 1 has only (12 - startMonth + 1) months of payments
 * - Annual property tax (IBI) is prorated in year 1 based on start month
 * - Upfront purchase taxes are NOT included (shown only in cost breakdown)
 */
export function generateAmortizationSchedule(
  inputs: MortgageInputs,
  results: MortgageResults
): AmortizationYearData[] {
  const { loanAmount, monthlyPayment } = results
  const monthlyRate = inputs.interestRate / 100 / 12
  const yearlyAnnualTax = inputs.price * (inputs.annualTaxRate / 100)
  const schedule: AmortizationYearData[] = []
  const currentYear = new Date().getFullYear()

  let balance = loanAmount
  let totalMonthsPaid = 0
  const totalMonths = inputs.termYears * 12

  for (let yearIndex = 0; totalMonthsPaid < totalMonths && balance > 0; yearIndex++) {
    // Year 1: only months from startMonth to December
    // Subsequent years: full 12 months (or remainder)
    const monthsThisYear = yearIndex === 0
      ? 13 - inputs.startMonth  // e.g., startMonth=10 → 3 months
      : 12

    const monthsToProcess = Math.min(monthsThisYear, totalMonths - totalMonthsPaid)

    let yearlyPrincipal = 0
    let yearlyInterest = 0

    for (let m = 0; m < monthsToProcess; m++) {
      if (balance <= 0) break

      const interestPayment = balance * monthlyRate
      const principalPayment = Math.min(
        monthlyPayment - interestPayment,
        balance
      )

      yearlyInterest += interestPayment
      yearlyPrincipal += principalPayment
      balance = Math.max(0, balance - principalPayment)
      totalMonthsPaid++
    }

    // Snap negligible balances to zero to avoid floating point noise
    if (balance < 0.01) balance = 0

    // Annual tax prorated in year 1 based on months remaining in the year
    const annualTax = yearIndex === 0
      ? yearlyAnnualTax * (monthsThisYear / 12)
      : yearlyAnnualTax

    schedule.push({
      year: currentYear + yearIndex,
      principal: Math.round(yearlyPrincipal * 100) / 100,
      interest: Math.round(yearlyInterest * 100) / 100,
      annualTax: Math.round(annualTax * 100) / 100,
      remainingBalance: Math.round(balance * 100) / 100,
    })

    if (balance <= 0) break
  }

  return schedule
}
