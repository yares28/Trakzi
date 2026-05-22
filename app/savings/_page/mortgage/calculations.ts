import type {
  MortgageInputs,
  MortgageResults,
  MortgageBreakdown,
  AmortizationYearData,
  TaxBreakdown,
  CountryConfig,
  LoanProgramConfig,
  OccupancyType,
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
  const totalRate = taxes.reduce((sum, tax) => sum + tax.rate, 0)
  return price * (totalRate / 100)
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

function getCurrentRate(inputs: MortgageInputs): number {
  if (inputs.mortgageType === "fixed") {
    return Math.max(0, inputs.interestRate)
  }

  if (inputs.countryCode === "US") {
    return Math.max(0, inputs.interestRate)
  }

  return Math.max(0, inputs.referenceRate + inputs.spreadRate)
}

function getStressRate(inputs: MortgageInputs, currentRate: number): number {
  if (inputs.mortgageType === "fixed") {
    return currentRate
  }

  if (inputs.countryCode === "US") {
    const cappedRate = currentRate + Math.max(inputs.armInitialCap, 0)
    const lifetimeCapRate = currentRate + Math.max(inputs.armLifetimeCap, 0)
    return Math.max(currentRate, Math.min(Math.max(inputs.stressInterestRate, cappedRate), lifetimeCapRate || Infinity))
  }

  return Math.max(currentRate, inputs.stressInterestRate)
}

function getMonthlyRecurringHousingCosts(inputs: MortgageInputs): number {
  return (
    inputs.monthlyHoa +
    inputs.monthlyMaintenanceReserve +
    (inputs.annualPropertyTax + inputs.annualHomeInsurance + inputs.annualOtherHousingFees) / 12
  )
}

function presentValue(payment: number, monthlyRate: number, periods: number): number {
  if (payment <= 0 || periods <= 0) return 0

  if (monthlyRate === 0) {
    return payment * periods
  }

  return payment * (1 - Math.pow(1 + monthlyRate, -periods)) / monthlyRate
}

function estimateApr(
  netAmountReceived: number,
  monthlyOutflow: number,
  numPayments: number
): number {
  if (netAmountReceived <= 0 || monthlyOutflow <= 0 || numPayments <= 0) {
    return 0
  }

  let low = 0
  let high = 1

  for (let index = 0; index < 80; index++) {
    const mid = (low + high) / 2
    const pv = presentValue(monthlyOutflow, mid, numPayments)

    if (pv > netAmountReceived) {
      low = mid
    } else {
      high = mid
    }
  }

  const monthlyApr = (low + high) / 2
  return (Math.pow(1 + monthlyApr, 12) - 1) * 100
}

function getUsProgramConfig(config: CountryConfig, program: MortgageInputs["loanProgram"]): LoanProgramConfig | null {
  if (program === "standard") return null
  return config.programs?.[program] ?? null
}

function getConventionalMinDownPayment(occupancy: OccupancyType): number {
  if (occupancy === "investment") return 15
  if (occupancy === "second_home") return 10
  return 3
}

function getJumboMinDownPayment(occupancy: OccupancyType): number {
  if (occupancy === "investment") return 20
  if (occupancy === "second_home") return 15
  return 10
}

function getUsMinDownPaymentPercent(inputs: MortgageInputs): number {
  switch (inputs.loanProgram) {
    case "conventional":
      return getConventionalMinDownPayment(inputs.occupancy)
    case "fha":
      return 3.5
    case "va":
      return 0
    case "usda":
      return 0
    case "jumbo":
      return getJumboMinDownPayment(inputs.occupancy)
    default:
      return 20
  }
}

function getUsUpfrontFundingFeeRate(inputs: MortgageInputs): number {
  if (inputs.loanProgram === "fha") return 1.75
  if (inputs.loanProgram === "usda") return 1.0

  if (inputs.loanProgram !== "va") {
    return Math.max(0, inputs.upfrontFundingFeeRate)
  }

  const downPercent = inputs.price > 0 ? (inputs.deposit / inputs.price) * 100 : 0

  if (downPercent >= 10) return 1.25
  if (downPercent >= 5) return 1.5

  return inputs.vaUsage === "subsequent_use" ? 3.3 : 2.15
}

function getUsAnnualMortgageInsuranceRate(inputs: MortgageInputs, ltvOnPrice: number): number {
  switch (inputs.loanProgram) {
    case "conventional":
      return ltvOnPrice > 80 ? Math.max(inputs.annualMortgageInsuranceRate || 0.5, 0) : 0
    case "fha":
      if (inputs.termYears <= 15) {
        return ltvOnPrice > 90 ? 0.4 : 0.15
      }
      return 0.55
    case "usda":
      return 0.35
    case "jumbo":
      return Math.max(inputs.annualMortgageInsuranceRate, 0)
    default:
      return 0
  }
}

function monthsUntilBalanceThreshold(
  principal: number,
  annualRate: number,
  termYears: number,
  thresholdBalance: number
): number | null {
  if (principal <= thresholdBalance) return 0

  const monthlyRate = annualRate / 100 / 12
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termYears)
  const totalMonths = termYears * 12
  let balance = principal

  for (let month = 1; month <= totalMonths; month++) {
    const interestPayment = monthlyRate === 0 ? 0 : balance * monthlyRate
    const principalPayment = Math.min(monthlyPayment - interestPayment, balance)
    balance = Math.max(0, balance - principalPayment)

    if (balance <= thresholdBalance) {
      return month
    }
  }

  return null
}

function getMortgageInsuranceEndMonth(
  inputs: MortgageInputs,
  financedLoanAmount: number,
  currentRate: number,
  ltvOnPrice: number
): number | null {
  switch (inputs.loanProgram) {
    case "conventional": {
      if (ltvOnPrice <= 80) return 0
      const thresholdBalance = inputs.price * 0.78
      return monthsUntilBalanceThreshold(financedLoanAmount, currentRate, inputs.termYears, thresholdBalance)
    }
    case "fha":
      return ltvOnPrice <= 90 ? Math.min(inputs.termYears * 12, 11 * 12) : inputs.termYears * 12
    case "usda":
    case "jumbo":
      return inputs.annualMortgageInsuranceRate > 0 ? inputs.termYears * 12 : 0
    default:
      return 0
  }
}

function getUsProgramNote(
  inputs: MortgageInputs,
  ltvOnPrice: number,
  countyLimitExceeded: boolean
): string | undefined {
  const notes: string[] = []

  if (inputs.loanProgram === "conventional" && ltvOnPrice > 80) {
    notes.push("PMI is modeled until scheduled 78% LTV and may be requestable at 80% LTV.")
  }

  if (inputs.loanProgram === "fha") {
    notes.push("FHA UFMIP is modeled at 1.75%, with annual MIP based on term and LTV.")
    if (inputs.occupancy !== "primary_home") {
      notes.push("FHA is generally limited to primary residences.")
    }
  }

  if (inputs.loanProgram === "va") {
    notes.push("VA loans do not use monthly mortgage insurance; funding fee is based on use and down payment.")
    notes.push("VA entitlement and residual income are not fully underwritten here.")
  }

  if (inputs.loanProgram === "usda") {
    notes.push("USDA is modeled with the current upfront guarantee fee and annual fee.")
    notes.push("USDA rural and income eligibility are not checked in this calculator.")
  }

  if (countyLimitExceeded && inputs.loanProgram === "conventional") {
    notes.push("This loan is above the selected conforming limit and likely belongs in jumbo pricing.")
  }

  if (inputs.loanProgram === "jumbo") {
    notes.push("Jumbo uses manual local assumptions for limits and mortgage insurance.")
  }

  return notes.length > 0 ? notes.join(" ") : undefined
}

function getUsProgramLimitWarning(
  inputs: MortgageInputs,
  financedLoanAmount: number,
  countyLimit: number
): string | undefined {
  if (inputs.loanProgram === "conventional" && financedLoanAmount > countyLimit) {
    return "Loan exceeds the selected conforming limit. Jumbo pricing is usually required."
  }

  if (inputs.loanProgram === "fha" && financedLoanAmount > countyLimit) {
    return "Loan exceeds the selected FHA county limit."
  }

  if (inputs.loanProgram === "va" && financedLoanAmount > countyLimit) {
    return "Loan is above the selected conforming reference limit. VA loan-limit rules depend on entitlement and lender overlays."
  }

  return undefined
}

function getSpainProgramNote(inputs: MortgageInputs, financingGap: number): string | undefined {
  const notes: string[] = []

  if (inputs.residencyStatus === "non_resident") {
    notes.push("Non-resident buyers often face lower maximum LTV limits.")
  }

  if (inputs.occupancy !== "primary_home") {
    notes.push("Primary-home incentives are not applied in this estimate.")
  }

  if (inputs.buyerProfile !== "standard") {
    notes.push("Profile-based tax reductions or public guarantee schemes may apply but are not auto-applied yet.")
  }

  if (financingGap > 0) {
    notes.push("Your planned loan is above the estimated lender cap based on appraisal value.")
  }

  return notes.length > 0 ? notes.join(" ") : undefined
}

/** Compute the full results object from inputs */
export function computeMortgageResults(inputs: MortgageInputs): MortgageResults {
  const config = getCountryConfig(inputs.countryCode)
  const currentRate = getCurrentRate(inputs)
  const stressRate = getStressRate(inputs, currentRate)
  const baseLoanAmount = Math.max(0, inputs.price - inputs.deposit)
  const ltvOnAppraisal = inputs.appraisalValue > 0
    ? (baseLoanAmount / inputs.appraisalValue) * 100
    : 0
  const ltvOnPrice = inputs.price > 0
    ? (baseLoanAmount / inputs.price) * 100
    : 0

  let recommendedMaxLoan = 0
  let financingGap = 0
  let totalTaxesAndExpenses = 0
  let originationFeeAmount = baseLoanAmount * (inputs.originationFeeRate / 100)
  let discountPointsAmount = baseLoanAmount * (inputs.discountPointsRate / 100)
  let upfrontFundingFeeAmount = 0
  let fundedUpfrontFeeAmount = 0
  let financedLoanAmount = baseLoanAmount
  let annualMortgageInsuranceRate = 0
  let mortgageInsuranceEndMonth: number | null = 0
  let taxBreakdown: TaxBreakdown[] = []
  let programNote: string | undefined
  let programLimitWarning: string | undefined

  if (inputs.countryCode === "US") {
    const programConfig = getUsProgramConfig(config, inputs.loanProgram)
    const minDownPaymentPercent = getUsMinDownPaymentPercent(inputs)
    const maxLtv = 100 - minDownPaymentPercent
    const countyLoanLimit = Math.max(0, inputs.countyLoanLimit || programConfig?.defaultLoanLimit || baseLoanAmount)
    recommendedMaxLoan = inputs.appraisalValue * (maxLtv / 100)
    financingGap = Math.max(0, baseLoanAmount - recommendedMaxLoan)
    totalTaxesAndExpenses = inputs.titleAndRecordingFees + inputs.transferTaxes + inputs.prepaidsAndEscrow
    upfrontFundingFeeAmount = baseLoanAmount * (getUsUpfrontFundingFeeRate(inputs) / 100)
    fundedUpfrontFeeAmount = inputs.financeUpfrontFundingFee ? upfrontFundingFeeAmount : 0
    financedLoanAmount = baseLoanAmount + fundedUpfrontFeeAmount
    annualMortgageInsuranceRate = getUsAnnualMortgageInsuranceRate(inputs, ltvOnPrice)
    mortgageInsuranceEndMonth = getMortgageInsuranceEndMonth(inputs, financedLoanAmount, currentRate, ltvOnPrice)
    programLimitWarning = getUsProgramLimitWarning(inputs, financedLoanAmount, countyLoanLimit)
    programNote = getUsProgramNote(inputs, ltvOnPrice, financedLoanAmount > countyLoanLimit)
  } else {
    const allowedLtv = inputs.residencyStatus === "non_resident"
      ? config.lendingPolicy.nonResidentMaxLtv
      : config.lendingPolicy.residentMaxLtv

    recommendedMaxLoan = inputs.appraisalValue * (allowedLtv / 100)
    financingGap = Math.max(0, baseLoanAmount - recommendedMaxLoan)
    taxBreakdown = inputs.isNewProperty
      ? config.newPropertyTaxes ?? []
      : config.secondHandTaxes?.(inputs.regionKey) ?? []
    totalTaxesAndExpenses = calculateTaxesAndExpenses(inputs.price, taxBreakdown)
    financedLoanAmount = baseLoanAmount
    annualMortgageInsuranceRate = 0
    mortgageInsuranceEndMonth = 0
    programNote = getSpainProgramNote(inputs, financingGap)
  }

  const principalAndInterest = calculateMonthlyPayment(
    financedLoanAmount,
    currentRate,
    inputs.termYears
  )

  const monthlyMortgageInsurance = annualMortgageInsuranceRate > 0
    ? financedLoanAmount * (annualMortgageInsuranceRate / 100 / 12)
    : financedLoanAmount * (inputs.monthlyMortgageInsuranceRate / 100)

  const monthlyRecurringHousingCosts = getMonthlyRecurringHousingCosts(inputs)
  const totalMonthlyPayment =
    principalAndInterest +
    monthlyMortgageInsurance +
    monthlyRecurringHousingCosts

  const frontEndRatio = inputs.monthlyIncome > 0
    ? (totalMonthlyPayment / inputs.monthlyIncome) * 100
    : 0

  const backEndRatio = inputs.monthlyIncome > 0
    ? ((totalMonthlyPayment + inputs.monthlyDebtPayments) / inputs.monthlyIncome) * 100
    : 0

  const cashToClose = Math.max(
    0,
    inputs.deposit +
      financingGap +
      totalTaxesAndExpenses +
      originationFeeAmount +
      discountPointsAmount +
      inputs.appraisalFee +
      upfrontFundingFeeAmount -
      fundedUpfrontFeeAmount -
      Math.max(0, inputs.sellerCredits)
  )

  const totalInterest = principalAndInterest * inputs.termYears * 12 - financedLoanAmount
  const totalRecurringPropertyTaxes = inputs.annualPropertyTax * inputs.termYears
  const totalRecurringHousingCosts = monthlyRecurringHousingCosts * 12 * inputs.termYears
  const totalMortgageInsuranceCost =
    monthlyMortgageInsurance * (mortgageInsuranceEndMonth ?? inputs.termYears * 12)

  const stressMonthlyPayment = calculateMonthlyPayment(
    financedLoanAmount,
    stressRate,
    inputs.termYears
  ) + monthlyMortgageInsurance + monthlyRecurringHousingCosts

  const estimatedApr = estimateApr(
    financedLoanAmount -
      originationFeeAmount -
      discountPointsAmount -
      inputs.appraisalFee -
      Math.max(0, upfrontFundingFeeAmount - fundedUpfrontFeeAmount),
    principalAndInterest + monthlyMortgageInsurance,
    inputs.termYears * 12
  )

  const totalCost =
    inputs.price +
    totalTaxesAndExpenses +
    originationFeeAmount +
    discountPointsAmount +
    inputs.appraisalFee +
    upfrontFundingFeeAmount +
    Math.max(0, totalInterest) +
    totalRecurringHousingCosts +
    totalMortgageInsuranceCost

  return {
    baseLoanAmount: roundCurrency(baseLoanAmount),
    financedLoanAmount: roundCurrency(financedLoanAmount),
    principalAndInterest: roundCurrency(principalAndInterest),
    monthlyMortgageInsurance: roundCurrency(monthlyMortgageInsurance),
    totalMonthlyPayment: roundCurrency(totalMonthlyPayment),
    financingPercent: roundCurrency(ltvOnPrice),
    ltvOnAppraisal: roundCurrency(ltvOnAppraisal),
    recommendedMaxLoan: roundCurrency(recommendedMaxLoan),
    financingGap: roundCurrency(financingGap),
    totalTaxesAndExpenses: roundCurrency(totalTaxesAndExpenses),
    originationFeeAmount: roundCurrency(originationFeeAmount),
    discountPointsAmount: roundCurrency(discountPointsAmount),
    upfrontFundingFeeAmount: roundCurrency(upfrontFundingFeeAmount),
    fundedUpfrontFeeAmount: roundCurrency(fundedUpfrontFeeAmount),
    cashToClose: roundCurrency(cashToClose),
    totalInterest: roundCurrency(Math.max(0, totalInterest)),
    totalRecurringPropertyTaxes: roundCurrency(totalRecurringPropertyTaxes),
    totalRecurringHousingCosts: roundCurrency(totalRecurringHousingCosts),
    totalMortgageInsuranceCost: roundCurrency(totalMortgageInsuranceCost),
    frontEndRatio: roundCurrency(frontEndRatio),
    backEndRatio: roundCurrency(backEndRatio),
    currentRate: roundCurrency(currentRate),
    stressMonthlyPayment: roundCurrency(stressMonthlyPayment),
    estimatedApr: roundCurrency(estimatedApr),
    rateReviewMonths: inputs.rateReviewMonths,
    totalCost: roundCurrency(totalCost),
    taxBreakdown,
    programNote,
    programLimitWarning,
    mortgageInsuranceEndMonth,
  }
}

/** Build the high-level breakdown (deposit, loan, interest, taxes, total) */
export function computeBreakdown(
  inputs: MortgageInputs,
  results: MortgageResults
): MortgageBreakdown {
  return {
    deposit: inputs.deposit,
    baseLoanAmount: results.baseLoanAmount,
    financedLoanAmount: results.financedLoanAmount,
    financingGap: results.financingGap,
    totalInterest: results.totalInterest,
    totalTaxesAndExpenses: results.totalTaxesAndExpenses,
    originationFeeAmount: results.originationFeeAmount,
    discountPointsAmount: results.discountPointsAmount,
    appraisalFee: inputs.appraisalFee,
    upfrontFundingFeeAmount: results.upfrontFundingFeeAmount,
    totalRecurringPropertyTaxes: results.totalRecurringPropertyTaxes,
    totalRecurringHousingCosts: results.totalRecurringHousingCosts,
    totalMortgageInsuranceCost: results.totalMortgageInsuranceCost,
    sellerCredits: Math.max(0, inputs.sellerCredits),
    cashToClose: results.cashToClose,
    totalCost: results.totalCost,
  }
}

/**
 * Generate a yearly amortization schedule for the chart.
 *
 * - Uses calendar years (e.g. 2026, 2027...) based on the current date
 * - Year 1 has only (12 - startMonth + 1) months of payments
 * - Annual property tax is prorated in year 1 based on start month
 * - Upfront purchase taxes are NOT included (shown only in cost breakdown)
 */
export function generateAmortizationSchedule(
  inputs: MortgageInputs,
  results: MortgageResults
): AmortizationYearData[] {
  const { financedLoanAmount, principalAndInterest, currentRate } = results
  const monthlyRate = currentRate / 100 / 12
  const yearlyAnnualTax = inputs.annualPropertyTax
  const schedule: AmortizationYearData[] = []
  const currentYear = new Date().getFullYear()

  let balance = financedLoanAmount
  let totalMonthsPaid = 0
  const totalMonths = inputs.termYears * 12

  for (let yearIndex = 0; totalMonthsPaid < totalMonths && balance > 0; yearIndex++) {
    const monthsThisYear = yearIndex === 0
      ? 13 - inputs.startMonth
      : 12

    const monthsToProcess = Math.min(monthsThisYear, totalMonths - totalMonthsPaid)

    let yearlyPrincipal = 0
    let yearlyInterest = 0

    for (let month = 0; month < monthsToProcess; month++) {
      if (balance <= 0) break

      const interestPayment = balance * monthlyRate
      const principalPayment = Math.min(
        principalAndInterest - interestPayment,
        balance
      )

      yearlyInterest += interestPayment
      yearlyPrincipal += principalPayment
      balance = Math.max(0, balance - principalPayment)
      totalMonthsPaid++
    }

    if (balance < 0.01) balance = 0

    const annualTax = yearIndex === 0
      ? yearlyAnnualTax * (monthsThisYear / 12)
      : yearlyAnnualTax

    schedule.push({
      year: currentYear + yearIndex,
      principal: roundCurrency(yearlyPrincipal),
      interest: roundCurrency(yearlyInterest),
      annualTax: roundCurrency(annualTax),
      remainingBalance: roundCurrency(balance),
    })

    if (balance <= 0) break
  }

  return schedule
}
