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

export interface CountryConfig {
  code: string
  name: string
  flag: string
  currency: string
  regions: Record<string, RegionConfig>
  defaultRegion: string
  /** Tax breakdown when purchasing a new property */
  newPropertyTaxes: TaxBreakdown[]
  /** Tax breakdown when purchasing a second-hand property (ITP varies by region) */
  secondHandTaxes: (regionKey: string) => TaxBreakdown[]
  defaults: {
    price: number
    deposit: number
    termYears: number
    interestRate: number
    /** Annual property tax as % of property price (e.g., IBI in Spain) */
    annualTaxRate: number
  }
}

export interface MortgageInputs {
  price: number
  deposit: number
  termYears: number
  interestRate: number
  isNewProperty: boolean
  countryCode: string
  regionKey: string
  /** 1-12 representing January-December */
  startMonth: number
  /** Annual property tax as % of property price */
  annualTaxRate: number
}

export interface MortgageResults {
  loanAmount: number
  monthlyPayment: number
  financingPercent: number
  totalTaxesAndExpenses: number
  totalInterest: number
  totalAnnualTaxes: number
  totalCost: number
  taxBreakdown: TaxBreakdown[]
}

export interface MortgageBreakdown {
  deposit: number
  loanAmount: number
  totalInterest: number
  totalTaxesAndExpenses: number
  totalAnnualTaxes: number
  totalCost: number
}

export interface AmortizationYearData {
  /** Calendar year (e.g., 2026) */
  year: number
  principal: number
  interest: number
  /** Recurring annual property tax (e.g., IBI) */
  annualTax: number
  remainingBalance: number
}
