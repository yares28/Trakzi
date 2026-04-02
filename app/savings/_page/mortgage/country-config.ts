import type { CountryConfig, TaxBreakdown } from "./types"

const CONFORMING_BASELINE_LIMIT_2026 = 832750
const HIGH_COST_CONFORMING_LIMIT_2026 = 1249125
const FHA_FLOOR_LIMIT_2026 = 541287
const FHA_CEILING_LIMIT_2026 = 1249125

/**
 * Spain country configuration for mortgage calculations.
 *
 * New properties: IVA 10% + AJD ~1.5% + notary/registry ~1.5% = ~13%
 * Second-hand: ITP varies by autonomous community (4-10%) + notary/registry ~1.5%
 * Annual property tax (IBI) is municipal and tied to cadastral value, so the
 * calculator now defaults to an explicit annual amount instead of a % of price.
 */
const SPAIN_CONFIG: CountryConfig = {
  code: "ES",
  name: "Spain",
  flag: "\uD83C\uDDEA\uD83C\uDDF8",
  currency: "EUR",
  defaultRegion: "madrid",
  defaults: {
    price: 250000,
    appraisalValue: 250000,
    deposit: 50000,
    termYears: 25,
    interestRate: 3.0,
    referenceRate: 2.4,
    spreadRate: 0.9,
    stressInterestRate: 5.0,
    mortgageType: "fixed",
    residencyStatus: "resident",
    occupancy: "primary_home",
    buyerProfile: "standard",
    loanProgram: "standard",
    loanLimitMode: "manual",
    countyLoanLimit: 200000,
    monthlyIncome: 3400,
    monthlyDebtPayments: 250,
    annualPropertyTax: 650,
    annualHomeInsurance: 260,
    monthlyHoa: 75,
    annualOtherHousingFees: 120,
    monthlyMaintenanceReserve: 100,
    originationFeeRate: 1,
    discountPointsRate: 0,
    appraisalFee: 400,
    titleAndRecordingFees: 0,
    transferTaxes: 0,
    prepaidsAndEscrow: 0,
    sellerCredits: 0,
    annualMortgageInsuranceRate: 0,
    monthlyMortgageInsuranceRate: 0,
    upfrontFundingFeeRate: 0,
    financeUpfrontFundingFee: false,
    rateReviewMonths: 12,
    armInitialCap: 0,
    armPeriodicCap: 0,
    armLifetimeCap: 0,
    vaUsage: "first_use",
  },
  lendingPolicy: {
    recommendedDebtRatio: 35,
    hardDebtRatio: 40,
    residentMaxLtv: 80,
    nonResidentMaxLtv: 70,
  },
  regions: {
    andalucia: { name: "Andaluc\u00EDa", itpRate: 7 },
    aragon: { name: "Arag\u00F3n", itpRate: 8 },
    asturias: { name: "Asturias", itpRate: 8 },
    baleares: { name: "Islas Baleares", itpRate: 8 },
    canarias: { name: "Islas Canarias", itpRate: 6.5 },
    cantabria: { name: "Cantabria", itpRate: 10 },
    castilla_la_mancha: { name: "Castilla-La Mancha", itpRate: 9 },
    castilla_y_leon: { name: "Castilla y Le\u00F3n", itpRate: 8 },
    cataluna: { name: "Catalu\u00F1a", itpRate: 10 },
    ceuta: { name: "Ceuta", itpRate: 6 },
    extremadura: { name: "Extremadura", itpRate: 8 },
    galicia: { name: "Galicia", itpRate: 9 },
    madrid: { name: "Madrid", itpRate: 6 },
    melilla: { name: "Melilla", itpRate: 6 },
    murcia: { name: "Murcia", itpRate: 8 },
    navarra: { name: "Navarra", itpRate: 6 },
    pais_vasco: { name: "Pa\u00EDs Vasco", itpRate: 4 },
    rioja: { name: "La Rioja", itpRate: 7 },
    valencia: { name: "Comunidad Valenciana", itpRate: 10 },
  },
  newPropertyTaxes: [
    { label: "IVA (VAT)", rate: 10 },
    { label: "AJD (Stamp Duty)", rate: 1.5 },
    { label: "Notary & Registry", rate: 1.5 },
  ],
  secondHandTaxes: (regionKey: string): TaxBreakdown[] => {
    const region = SPAIN_CONFIG.regions?.[regionKey]
    const itpRate = region?.itpRate ?? 6

    return [
      { label: "ITP (Transfer Tax)", rate: itpRate },
      { label: "Notary & Registry", rate: 1.5 },
    ]
  },
}

const US_CONFIG: CountryConfig = {
  code: "US",
  name: "United States",
  flag: "\uD83C\uDDFA\uD83C\uDDF8",
  currency: "USD",
  defaults: {
    price: 450000,
    appraisalValue: 450000,
    deposit: 45000,
    termYears: 30,
    interestRate: 6.5,
    referenceRate: 5.8,
    spreadRate: 2.25,
    stressInterestRate: 8.0,
    mortgageType: "fixed",
    residencyStatus: "resident",
    occupancy: "primary_home",
    buyerProfile: "standard",
    loanProgram: "conventional",
    loanLimitMode: "manual",
    countyLoanLimit: CONFORMING_BASELINE_LIMIT_2026,
    monthlyIncome: 9000,
    monthlyDebtPayments: 600,
    annualPropertyTax: 5400,
    annualHomeInsurance: 1800,
    monthlyHoa: 0,
    annualOtherHousingFees: 0,
    monthlyMaintenanceReserve: 150,
    originationFeeRate: 0.5,
    discountPointsRate: 0,
    appraisalFee: 650,
    titleAndRecordingFees: 2200,
    transferTaxes: 0,
    prepaidsAndEscrow: 3500,
    sellerCredits: 0,
    annualMortgageInsuranceRate: 0.5,
    monthlyMortgageInsuranceRate: 0,
    upfrontFundingFeeRate: 0,
    financeUpfrontFundingFee: false,
    rateReviewMonths: 12,
    armInitialCap: 2,
    armPeriodicCap: 1,
    armLifetimeCap: 5,
    vaUsage: "first_use",
  },
  lendingPolicy: {
    recommendedHousingRatio: 28,
    recommendedDebtRatio: 36,
    hardDebtRatio: 43,
    residentMaxLtv: 97,
    nonResidentMaxLtv: 80,
  },
  programs: {
    conventional: {
      label: "Conventional",
      defaultLoanLimit: CONFORMING_BASELINE_LIMIT_2026,
      maxLoanLimit: HIGH_COST_CONFORMING_LIMIT_2026,
      minDownPaymentPercent: 3,
      recommendedHousingRatio: 28,
      recommendedDebtRatio: 36,
      hardDebtRatio: 45,
    },
    fha: {
      label: "FHA",
      defaultLoanLimit: FHA_FLOOR_LIMIT_2026,
      maxLoanLimit: FHA_CEILING_LIMIT_2026,
      minDownPaymentPercent: 3.5,
      recommendedHousingRatio: 31,
      recommendedDebtRatio: 43,
      hardDebtRatio: 50,
    },
    va: {
      label: "VA",
      defaultLoanLimit: CONFORMING_BASELINE_LIMIT_2026,
      maxLoanLimit: HIGH_COST_CONFORMING_LIMIT_2026,
      minDownPaymentPercent: 0,
      recommendedDebtRatio: 41,
      hardDebtRatio: 50,
    },
    usda: {
      label: "USDA",
      defaultLoanLimit: CONFORMING_BASELINE_LIMIT_2026,
      maxLoanLimit: CONFORMING_BASELINE_LIMIT_2026,
      minDownPaymentPercent: 0,
      recommendedHousingRatio: 29,
      recommendedDebtRatio: 41,
      hardDebtRatio: 44,
    },
    jumbo: {
      label: "Jumbo",
      defaultLoanLimit: HIGH_COST_CONFORMING_LIMIT_2026,
      maxLoanLimit: 5000000,
      minDownPaymentPercent: 10,
      recommendedHousingRatio: 28,
      recommendedDebtRatio: 40,
      hardDebtRatio: 43,
    },
  },
}

/** All supported country configurations, keyed by country code */
export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  ES: SPAIN_CONFIG,
  US: US_CONFIG,
}

/** Returns the config for a given country code, defaulting to Spain */
export function getCountryConfig(code: string): CountryConfig {
  return COUNTRY_CONFIGS[code] ?? SPAIN_CONFIG
}

export const US_MORTGAGE_LIMITS_2026 = {
  conformingBaseline: CONFORMING_BASELINE_LIMIT_2026,
  conformingHighCostCeiling: HIGH_COST_CONFORMING_LIMIT_2026,
  fhaFloor: FHA_FLOOR_LIMIT_2026,
  fhaCeiling: FHA_CEILING_LIMIT_2026,
}
