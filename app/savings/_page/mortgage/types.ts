/** Shared types for the mortgage calculator feature */

export interface RegionConfig {
  name: string
  /** ITP (Impuesto de Transmisiones Patrimoniales) rate for second-hand properties */
  itpRate: number
}

export interface TaxBreakdown {
  label: string
  rate: number
}

export type CountryCode = "ES" | "US"

export type MortgageType = "fixed" | "adjustable" | "mixed"

export type ResidencyStatus = "resident" | "non_resident"

export type OccupancyType = "primary_home" | "second_home" | "investment"

export type BuyerProfile =
  | "standard"
  | "young_buyer"
  | "family"
  | "disability"
  | "protected_housing"

export type LoanProgram =
  | "standard"
  | "conventional"
  | "fha"
  | "va"
  | "usda"
  | "jumbo"

export type LoanLimitMode = "manual"

export type LoanPurpose = "purchase"

export type VaUsage = "first_use" | "subsequent_use"

export interface CountryDefaults {
  price: number
  appraisalValue: number
  deposit: number
  termYears: number
  interestRate: number
  referenceRate: number
  spreadRate: number
  stressInterestRate: number
  mortgageType: MortgageType
  residencyStatus: ResidencyStatus
  occupancy: OccupancyType
  buyerProfile: BuyerProfile
  loanProgram: LoanProgram
  loanLimitMode: LoanLimitMode
  countyLoanLimit: number
  monthlyIncome: number
  monthlyDebtPayments: number
  annualPropertyTax: number
  annualHomeInsurance: number
  monthlyHoa: number
  annualOtherHousingFees: number
  monthlyMaintenanceReserve: number
  originationFeeRate: number
  discountPointsRate: number
  appraisalFee: number
  titleAndRecordingFees: number
  transferTaxes: number
  prepaidsAndEscrow: number
  sellerCredits: number
  annualMortgageInsuranceRate: number
  monthlyMortgageInsuranceRate: number
  upfrontFundingFeeRate: number
  financeUpfrontFundingFee: boolean
  rateReviewMonths: number
  armInitialCap: number
  armPeriodicCap: number
  armLifetimeCap: number
  vaUsage: VaUsage
}

export interface LendingPolicy {
  recommendedHousingRatio?: number
  recommendedDebtRatio: number
  hardDebtRatio: number
  residentMaxLtv: number
  nonResidentMaxLtv: number
}

export interface LoanProgramConfig {
  label: string
  defaultLoanLimit: number
  maxLoanLimit: number
  minDownPaymentPercent: number
  recommendedHousingRatio?: number
  recommendedDebtRatio: number
  hardDebtRatio: number
}

export interface CountryConfig {
  code: CountryCode
  name: string
  flag: string
  currency: string
  regions?: Record<string, RegionConfig>
  defaultRegion?: string
  /** Tax breakdown when purchasing a new property */
  newPropertyTaxes?: TaxBreakdown[]
  /** Tax breakdown when purchasing a second-hand property (ITP varies by region) */
  secondHandTaxes?: (regionKey: string) => TaxBreakdown[]
  defaults: CountryDefaults
  lendingPolicy: LendingPolicy
  programs?: Partial<Record<Exclude<LoanProgram, "standard">, LoanProgramConfig>>
}

export interface MortgageInputs {
  price: number
  appraisalValue: number
  deposit: number
  termYears: number
  interestRate: number
  referenceRate: number
  spreadRate: number
  stressInterestRate: number
  mortgageType: MortgageType
  isNewProperty: boolean
  countryCode: CountryCode
  regionKey: string
  residencyStatus: ResidencyStatus
  occupancy: OccupancyType
  buyerProfile: BuyerProfile
  loanProgram: LoanProgram
  loanLimitMode: LoanLimitMode
  loanPurpose: LoanPurpose
  countyLoanLimit: number
  monthlyIncome: number
  monthlyDebtPayments: number
  /** 1-12 representing January-December */
  startMonth: number
  annualPropertyTax: number
  annualHomeInsurance: number
  monthlyHoa: number
  annualOtherHousingFees: number
  monthlyMaintenanceReserve: number
  originationFeeRate: number
  discountPointsRate: number
  appraisalFee: number
  titleAndRecordingFees: number
  transferTaxes: number
  prepaidsAndEscrow: number
  sellerCredits: number
  annualMortgageInsuranceRate: number
  monthlyMortgageInsuranceRate: number
  upfrontFundingFeeRate: number
  financeUpfrontFundingFee: boolean
  rateReviewMonths: number
  armInitialCap: number
  armPeriodicCap: number
  armLifetimeCap: number
  vaUsage: VaUsage
}

export interface MortgageResults {
  baseLoanAmount: number
  financedLoanAmount: number
  principalAndInterest: number
  monthlyMortgageInsurance: number
  totalMonthlyPayment: number
  financingPercent: number
  ltvOnAppraisal: number
  recommendedMaxLoan: number
  financingGap: number
  totalTaxesAndExpenses: number
  originationFeeAmount: number
  discountPointsAmount: number
  upfrontFundingFeeAmount: number
  fundedUpfrontFeeAmount: number
  cashToClose: number
  totalInterest: number
  totalRecurringPropertyTaxes: number
  totalRecurringHousingCosts: number
  totalMortgageInsuranceCost: number
  frontEndRatio: number
  backEndRatio: number
  currentRate: number
  stressMonthlyPayment: number
  estimatedApr: number
  rateReviewMonths: number
  totalCost: number
  taxBreakdown: TaxBreakdown[]
  programNote?: string
  programLimitWarning?: string
  mortgageInsuranceEndMonth?: number | null
}

export interface MortgageBreakdown {
  deposit: number
  baseLoanAmount: number
  financedLoanAmount: number
  financingGap: number
  totalInterest: number
  totalTaxesAndExpenses: number
  originationFeeAmount: number
  discountPointsAmount: number
  appraisalFee: number
  upfrontFundingFeeAmount: number
  totalRecurringPropertyTaxes: number
  totalRecurringHousingCosts: number
  totalMortgageInsuranceCost: number
  sellerCredits: number
  cashToClose: number
  totalCost: number
}

export interface AmortizationYearData {
  /** Calendar year (e.g. 2026) */
  year: number
  principal: number
  interest: number
  /** Recurring annual property tax */
  annualTax: number
  remainingBalance: number
}
