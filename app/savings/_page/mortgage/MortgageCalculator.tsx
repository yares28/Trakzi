"use client"

import { memo, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useCurrency } from "@/components/currency-provider"
import { COUNTRY_CONFIGS, getCountryConfig, US_MORTGAGE_LIMITS_2026 } from "./country-config"
import {
  computeMortgageResults,
  computeBreakdown,
  generateAmortizationSchedule,
} from "./calculations"
import { MortgageAmortizationChart } from "./MortgageAmortizationChart"
import type {
  BuyerProfile,
  CountryConfig,
  LoanProgram,
  MortgageInputs,
  MortgageType,
  OccupancyType,
  ResidencyStatus,
  VaUsage,
} from "./types"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const OCCUPANCY_OPTIONS: Array<{ value: OccupancyType; label: string }> = [
  { value: "primary_home", label: "Primary home" },
  { value: "second_home", label: "Second home" },
  { value: "investment", label: "Investment" },
]

const BUYER_PROFILE_OPTIONS: Array<{ value: BuyerProfile; label: string }> = [
  { value: "standard", label: "Standard buyer" },
  { value: "young_buyer", label: "Young buyer" },
  { value: "family", label: "Family / children" },
  { value: "disability", label: "Disability" },
  { value: "protected_housing", label: "Protected housing" },
]

const US_PROGRAM_OPTIONS: Array<{ value: LoanProgram; label: string }> = [
  { value: "conventional", label: "Conventional" },
  { value: "fha", label: "FHA" },
  { value: "va", label: "VA" },
  { value: "usda", label: "USDA" },
  { value: "jumbo", label: "Jumbo" },
]

function applyConfigDefaults(config: CountryConfig) {
  return {
    regionKey: config.defaultRegion ?? "",
    price: config.defaults.price,
    appraisalValue: config.defaults.appraisalValue,
    deposit: config.defaults.deposit,
    termYears: config.defaults.termYears,
    interestRate: config.defaults.interestRate,
    referenceRate: config.defaults.referenceRate,
    spreadRate: config.defaults.spreadRate,
    stressInterestRate: config.defaults.stressInterestRate,
    mortgageType: config.defaults.mortgageType,
    residencyStatus: config.defaults.residencyStatus,
    occupancy: config.defaults.occupancy,
    buyerProfile: config.defaults.buyerProfile,
    loanProgram: config.defaults.loanProgram,
    monthlyIncome: config.defaults.monthlyIncome,
    monthlyDebtPayments: config.defaults.monthlyDebtPayments,
    annualPropertyTax: config.defaults.annualPropertyTax,
    annualHomeInsurance: config.defaults.annualHomeInsurance,
    monthlyHoa: config.defaults.monthlyHoa,
    annualOtherHousingFees: config.defaults.annualOtherHousingFees,
    monthlyMaintenanceReserve: config.defaults.monthlyMaintenanceReserve,
    originationFeeRate: config.defaults.originationFeeRate,
    discountPointsRate: config.defaults.discountPointsRate,
    appraisalFee: config.defaults.appraisalFee,
    titleAndRecordingFees: config.defaults.titleAndRecordingFees,
    transferTaxes: config.defaults.transferTaxes,
    prepaidsAndEscrow: config.defaults.prepaidsAndEscrow,
    sellerCredits: config.defaults.sellerCredits,
    annualMortgageInsuranceRate: config.defaults.annualMortgageInsuranceRate,
    monthlyMortgageInsuranceRate: config.defaults.monthlyMortgageInsuranceRate,
    upfrontFundingFeeRate: config.defaults.upfrontFundingFeeRate,
    financeUpfrontFundingFee: config.defaults.financeUpfrontFundingFee,
    rateReviewMonths: config.defaults.rateReviewMonths,
    armInitialCap: config.defaults.armInitialCap,
    armPeriodicCap: config.defaults.armPeriodicCap,
    armLifetimeCap: config.defaults.armLifetimeCap,
    countyLoanLimit: config.defaults.countyLoanLimit,
    vaUsage: config.defaults.vaUsage,
  }
}

function getProgramDefaultLimit(config: CountryConfig, program: LoanProgram): number {
  if (program === "standard") return config.defaults.countyLoanLimit
  return config.programs?.[program]?.defaultLoanLimit ?? config.defaults.countyLoanLimit
}

export const MortgageCalculator = memo(function MortgageCalculator() {
  const { formatCurrency } = useCurrency()

  const [countryCode, setCountryCode] = useState<"ES" | "US">("ES")
  const initialConfig = getCountryConfig(countryCode)
  const initialState = applyConfigDefaults(initialConfig)

  const [regionKey, setRegionKey] = useState(initialState.regionKey)
  const [price, setPrice] = useState(initialState.price)
  const [appraisalValue, setAppraisalValue] = useState(initialState.appraisalValue)
  const [deposit, setDeposit] = useState(initialState.deposit)
  const [termYears, setTermYears] = useState(initialState.termYears)
  const [interestRate, setInterestRate] = useState(initialState.interestRate)
  const [referenceRate, setReferenceRate] = useState(initialState.referenceRate)
  const [spreadRate, setSpreadRate] = useState(initialState.spreadRate)
  const [stressInterestRate, setStressInterestRate] = useState(initialState.stressInterestRate)
  const [mortgageType, setMortgageType] = useState<MortgageType>(initialState.mortgageType)
  const [isNewProperty, setIsNewProperty] = useState(false)
  const [borrowerCount, setBorrowerCount] = useState<1 | 2>(1)
  const [residencyStatus, setResidencyStatus] = useState<ResidencyStatus>(initialState.residencyStatus)
  const [occupancy, setOccupancy] = useState<OccupancyType>(initialState.occupancy)
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfile>(initialState.buyerProfile)
  const [loanProgram, setLoanProgram] = useState<LoanProgram>(initialState.loanProgram)
  const [monthlyIncome, setMonthlyIncome] = useState(initialState.monthlyIncome)
  const [monthlyDebtPayments, setMonthlyDebtPayments] = useState(initialState.monthlyDebtPayments)
  const [startMonth, setStartMonth] = useState(new Date().getMonth() + 1)
  const [annualPropertyTax, setAnnualPropertyTax] = useState(initialState.annualPropertyTax)
  const [annualHomeInsurance, setAnnualHomeInsurance] = useState(initialState.annualHomeInsurance)
  const [monthlyHoa, setMonthlyHoa] = useState(initialState.monthlyHoa)
  const [annualOtherHousingFees, setAnnualOtherHousingFees] = useState(initialState.annualOtherHousingFees)
  const [monthlyMaintenanceReserve, setMonthlyMaintenanceReserve] = useState(initialState.monthlyMaintenanceReserve)
  const [originationFeeRate, setOriginationFeeRate] = useState(initialState.originationFeeRate)
  const [discountPointsRate, setDiscountPointsRate] = useState(initialState.discountPointsRate)
  const [appraisalFee, setAppraisalFee] = useState(initialState.appraisalFee)
  const [titleAndRecordingFees, setTitleAndRecordingFees] = useState(initialState.titleAndRecordingFees)
  const [transferTaxes, setTransferTaxes] = useState(initialState.transferTaxes)
  const [prepaidsAndEscrow, setPrepaidsAndEscrow] = useState(initialState.prepaidsAndEscrow)
  const [sellerCredits, setSellerCredits] = useState(initialState.sellerCredits)
  const [annualMortgageInsuranceRate, setAnnualMortgageInsuranceRate] = useState(initialState.annualMortgageInsuranceRate)
  const [upfrontFundingFeeRate, setUpfrontFundingFeeRate] = useState(initialState.upfrontFundingFeeRate)
  const [financeUpfrontFundingFee, setFinanceUpfrontFundingFee] = useState(initialState.financeUpfrontFundingFee)
  const [rateReviewMonths, setRateReviewMonths] = useState(initialState.rateReviewMonths)
  const [armInitialCap, setArmInitialCap] = useState(initialState.armInitialCap)
  const [armPeriodicCap, setArmPeriodicCap] = useState(initialState.armPeriodicCap)
  const [armLifetimeCap, setArmLifetimeCap] = useState(initialState.armLifetimeCap)
  const [countyLoanLimit, setCountyLoanLimit] = useState(initialState.countyLoanLimit)
  const [vaUsage, setVaUsage] = useState<VaUsage>(initialState.vaUsage)

  const config = getCountryConfig(countryCode)
  const isUS = countryCode === "US"
  const effectiveRegionKey = config.regions?.[regionKey] ? regionKey : (config.defaultRegion ?? "")
  const usProgramConfig = isUS && loanProgram !== "standard"
    ? config.programs?.[loanProgram]
    : undefined

  const depositPercent = useMemo(
    () => price > 0 ? ((deposit / price) * 100).toFixed(1) : "0",
    [deposit, price]
  )

  const inputs: MortgageInputs = useMemo(() => ({
    price,
    appraisalValue,
    deposit,
    termYears,
    interestRate,
    referenceRate,
    spreadRate,
    stressInterestRate,
    mortgageType,
    isNewProperty,
    countryCode,
    regionKey: effectiveRegionKey,
    residencyStatus,
    occupancy,
    buyerProfile,
    loanProgram,
    loanLimitMode: "manual",
    loanPurpose: "purchase",
    countyLoanLimit,
    monthlyIncome,
    monthlyDebtPayments,
    startMonth,
    annualPropertyTax,
    annualHomeInsurance,
    monthlyHoa,
    annualOtherHousingFees,
    monthlyMaintenanceReserve,
    originationFeeRate,
    discountPointsRate,
    appraisalFee,
    titleAndRecordingFees,
    transferTaxes,
    prepaidsAndEscrow,
    sellerCredits,
    annualMortgageInsuranceRate,
    monthlyMortgageInsuranceRate: 0,
    upfrontFundingFeeRate,
    financeUpfrontFundingFee,
    rateReviewMonths,
    armInitialCap,
    armPeriodicCap,
    armLifetimeCap,
    vaUsage,
  }), [
    price,
    appraisalValue,
    deposit,
    termYears,
    interestRate,
    referenceRate,
    spreadRate,
    stressInterestRate,
    mortgageType,
    isNewProperty,
    countryCode,
    effectiveRegionKey,
    residencyStatus,
    occupancy,
    buyerProfile,
    loanProgram,
    countyLoanLimit,
    monthlyIncome,
    monthlyDebtPayments,
    startMonth,
    annualPropertyTax,
    annualHomeInsurance,
    monthlyHoa,
    annualOtherHousingFees,
    monthlyMaintenanceReserve,
    originationFeeRate,
    discountPointsRate,
    appraisalFee,
    titleAndRecordingFees,
    transferTaxes,
    prepaidsAndEscrow,
    sellerCredits,
    annualMortgageInsuranceRate,
    upfrontFundingFeeRate,
    financeUpfrontFundingFee,
    rateReviewMonths,
    armInitialCap,
    armPeriodicCap,
    armLifetimeCap,
    vaUsage,
  ])

  const results = useMemo(() => computeMortgageResults(inputs), [inputs])
  const breakdown = useMemo(() => computeBreakdown(inputs, results), [inputs, results])
  const amortizationData = useMemo(
    () => generateAmortizationSchedule(inputs, results),
    [inputs, results]
  )

  const regionEntries = useMemo(() => {
    return Object.entries(config.regions ?? {}).sort(([, left], [, right]) =>
      left.name.localeCompare(right.name)
    )
  }, [config.regions])

  const taxDetailNote = useMemo(() => {
    return results.taxBreakdown
      .map((tax) => `${tax.label}: ${tax.rate}%`)
      .join(" + ")
  }, [results.taxBreakdown])

  const ratioTone = useMemo(() => {
    const recommended = usProgramConfig?.recommendedDebtRatio ?? config.lendingPolicy.recommendedDebtRatio
    const hard = usProgramConfig?.hardDebtRatio ?? config.lendingPolicy.hardDebtRatio

    if (results.backEndRatio > hard) {
      return "text-red-600 dark:text-red-400"
    }

    if (results.backEndRatio > recommended) {
      return "text-amber-600 dark:text-amber-400"
    }

    return "text-emerald-600 dark:text-emerald-400"
  }, [config.lendingPolicy.hardDebtRatio, config.lendingPolicy.recommendedDebtRatio, results.backEndRatio, usProgramConfig?.hardDebtRatio, usProgramConfig?.recommendedDebtRatio])

  const currentRateLabel = useMemo(() => {
    if (mortgageType === "fixed") {
      return `${results.currentRate.toFixed(2)}% fixed`
    }

    if (isUS) {
      return `${results.currentRate.toFixed(2)}% start rate`
    }

    return `${results.currentRate.toFixed(2)}% current`
  }, [isUS, mortgageType, results.currentRate])

  const applyDefaults = (nextConfig: CountryConfig) => {
    const defaults = applyConfigDefaults(nextConfig)

    setRegionKey(defaults.regionKey)
    setPrice(defaults.price)
    setAppraisalValue(defaults.appraisalValue)
    setDeposit(defaults.deposit)
    setTermYears(defaults.termYears)
    setInterestRate(defaults.interestRate)
    setReferenceRate(defaults.referenceRate)
    setSpreadRate(defaults.spreadRate)
    setStressInterestRate(defaults.stressInterestRate)
    setMortgageType(defaults.mortgageType)
    setResidencyStatus(defaults.residencyStatus)
    setOccupancy(defaults.occupancy)
    setBuyerProfile(defaults.buyerProfile)
    setLoanProgram(defaults.loanProgram)
    setMonthlyIncome(defaults.monthlyIncome)
    setMonthlyDebtPayments(defaults.monthlyDebtPayments)
    setAnnualPropertyTax(defaults.annualPropertyTax)
    setAnnualHomeInsurance(defaults.annualHomeInsurance)
    setMonthlyHoa(defaults.monthlyHoa)
    setAnnualOtherHousingFees(defaults.annualOtherHousingFees)
    setMonthlyMaintenanceReserve(defaults.monthlyMaintenanceReserve)
    setOriginationFeeRate(defaults.originationFeeRate)
    setDiscountPointsRate(defaults.discountPointsRate)
    setAppraisalFee(defaults.appraisalFee)
    setTitleAndRecordingFees(defaults.titleAndRecordingFees)
    setTransferTaxes(defaults.transferTaxes)
    setPrepaidsAndEscrow(defaults.prepaidsAndEscrow)
    setSellerCredits(defaults.sellerCredits)
    setAnnualMortgageInsuranceRate(defaults.annualMortgageInsuranceRate)
    setUpfrontFundingFeeRate(defaults.upfrontFundingFeeRate)
    setFinanceUpfrontFundingFee(defaults.financeUpfrontFundingFee)
    setRateReviewMonths(defaults.rateReviewMonths)
    setArmInitialCap(defaults.armInitialCap)
    setArmPeriodicCap(defaults.armPeriodicCap)
    setArmLifetimeCap(defaults.armLifetimeCap)
    setCountyLoanLimit(defaults.countyLoanLimit)
    setVaUsage(defaults.vaUsage)
    setBorrowerCount(1)
    setIsNewProperty(false)
  }

  const handleCountryChange = (code: string) => {
    const nextCode = code === "US" ? "US" : "ES"
    setCountryCode(nextCode)
    applyDefaults(getCountryConfig(nextCode))
  }

  const handleLoanProgramChange = (value: string) => {
    const nextProgram = value as LoanProgram
    setLoanProgram(nextProgram)
    setCountyLoanLimit(getProgramDefaultLimit(config, nextProgram))

    if (nextProgram === "usda" || nextProgram === "va" || nextProgram === "fha") {
      setOccupancy("primary_home")
    }

    if (nextProgram === "va") {
      setFinanceUpfrontFundingFee(true)
      setAnnualMortgageInsuranceRate(0)
    } else if (nextProgram === "usda") {
      setFinanceUpfrontFundingFee(true)
      setAnnualMortgageInsuranceRate(0.35)
    } else if (nextProgram === "fha") {
      setFinanceUpfrontFundingFee(true)
      setAnnualMortgageInsuranceRate(0.55)
    } else if (nextProgram === "conventional") {
      setFinanceUpfrontFundingFee(false)
      setAnnualMortgageInsuranceRate(0.5)
    } else if (nextProgram === "jumbo") {
      setFinanceUpfrontFundingFee(false)
      setAnnualMortgageInsuranceRate(0)
    }
  }

  return (
    <section className="px-4 lg:px-6">
      <Card className="@container/mortgage">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium">
            Mortgage Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 @xl/mortgage:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="space-y-4">
              <Tabs defaultValue="basic" className="gap-4">
                <TabsList className="grid h-auto w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 @sm/mortgage:grid-cols-2">
                    <Field>
                      <Label htmlFor="mortgage-country">Country</Label>
                      <Select value={countryCode} onValueChange={handleCountryChange}>
                        <SelectTrigger id="mortgage-country">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(COUNTRY_CONFIGS).map(([code, country]) => (
                            <SelectItem key={code} value={code}>
                              {country.flag} {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    {isUS ? (
                      <Field>
                        <Label htmlFor="mortgage-program">Loan Program</Label>
                        <Select value={loanProgram} onValueChange={handleLoanProgramChange}>
                          <SelectTrigger id="mortgage-program">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {US_PROGRAM_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    ) : (
                      <Field>
                        <Label htmlFor="mortgage-region">Region</Label>
                        <Select value={effectiveRegionKey} onValueChange={setRegionKey}>
                          <SelectTrigger id="mortgage-region">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {regionEntries.map(([key, region]) => (
                              <SelectItem key={key} value={key}>
                                {region.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  </div>

                  <Field>
                    <Label htmlFor="mortgage-price">Home Price</Label>
                    <Input
                      id="mortgage-price"
                      type="number"
                      min={0}
                      step={1000}
                      value={price}
                      onChange={(event) => setPrice(Math.max(0, Number(event.target.value)))}
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-3 @sm/mortgage:grid-cols-2">
                    <CurrencyField
                      id="mortgage-appraisal"
                      label="Appraisal Value"
                      value={appraisalValue}
                      step={1000}
                      onChange={setAppraisalValue}
                    />

                    <Field>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="mortgage-deposit">Down Payment</Label>
                        <Badge variant="secondary" className="text-[10px] leading-none px-1.5 py-0.5">
                          {depositPercent}%
                        </Badge>
                      </div>
                      <Input
                        id="mortgage-deposit"
                        type="number"
                        min={0}
                        step={1000}
                        value={deposit}
                        onChange={(event) => setDeposit(Math.max(0, Number(event.target.value)))}
                      />
                    </Field>
                  </div>

                  {!isUS && (
                    <Field>
                      <Label>Property Condition</Label>
                      <ToggleGroup
                        type="single"
                        variant="outline"
                        value={isNewProperty ? "new" : "secondhand"}
                        onValueChange={(value) => {
                          if (value) setIsNewProperty(value === "new")
                        }}
                        className="w-full"
                      >
                        <ToggleGroupItem value="new" className="flex-1">
                          New
                        </ToggleGroupItem>
                        <ToggleGroupItem value="secondhand" className="flex-1">
                          Second-hand
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </Field>
                  )}

                  <div className="grid grid-cols-1 gap-3 @sm/mortgage:grid-cols-2">
                    {isUS ? (
                      <Field>
                        <Label htmlFor="mortgage-occupancy">Occupancy</Label>
                        <Select
                          value={occupancy}
                          onValueChange={(value) => setOccupancy(value as OccupancyType)}
                        >
                          <SelectTrigger id="mortgage-occupancy">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OCCUPANCY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    ) : (
                      <Field>
                        <Label>Residency</Label>
                        <ToggleGroup
                          type="single"
                          variant="outline"
                          value={residencyStatus}
                          onValueChange={(value) => {
                            if (value === "resident" || value === "non_resident") {
                              setResidencyStatus(value)
                            }
                          }}
                          className="w-full"
                        >
                          <ToggleGroupItem value="resident" className="flex-1">
                            Resident
                          </ToggleGroupItem>
                          <ToggleGroupItem value="non_resident" className="flex-1">
                            Non-resident
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </Field>
                    )}

                    <Field>
                      <Label>Mortgage Type</Label>
                      <ToggleGroup
                        type="single"
                        variant="outline"
                        value={mortgageType}
                        onValueChange={(value) => {
                          if (value === "fixed" || value === "adjustable" || value === "mixed") {
                            setMortgageType(value)
                          }
                        }}
                        className="w-full"
                      >
                        <ToggleGroupItem value="fixed" className="flex-1">
                          Fixed
                        </ToggleGroupItem>
                        <ToggleGroupItem value="adjustable" className="flex-1">
                          {isUS ? "ARM" : "Variable"}
                        </ToggleGroupItem>
                        <ToggleGroupItem value="mixed" className="flex-1">
                          Mixed
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </Field>
                  </div>

                  {mortgageType === "fixed" ? (
                    <div className="grid grid-cols-1 gap-3 @sm/mortgage:grid-cols-2">
                      <Field>
                        <Label htmlFor="mortgage-term">Term (years)</Label>
                        <Input
                          id="mortgage-term"
                          type="number"
                          min={1}
                          max={40}
                          value={termYears}
                          onChange={(event) =>
                            setTermYears(Math.min(40, Math.max(1, Number(event.target.value))))
                          }
                        />
                      </Field>

                      <PercentField
                        id="mortgage-rate"
                        label={isUS ? "Interest Rate" : "Interest Rate"}
                        value={interestRate}
                        step={0.1}
                        max={30}
                        onChange={setInterestRate}
                      />
                    </div>
                  ) : isUS ? (
                    <>
                      <div className="grid grid-cols-1 gap-3 @sm/mortgage:grid-cols-2">
                        <Field>
                          <Label htmlFor="mortgage-term-arm">Term (years)</Label>
                          <Input
                            id="mortgage-term-arm"
                            type="number"
                            min={1}
                            max={40}
                            value={termYears}
                            onChange={(event) =>
                              setTermYears(Math.min(40, Math.max(1, Number(event.target.value))))
                            }
                          />
                        </Field>

                        <PercentField
                          id="mortgage-arm-rate"
                          label="ARM Starter Rate"
                          value={interestRate}
                          step={0.1}
                          max={30}
                          onChange={setInterestRate}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Advanced controls let you model ARM review cadence and cap structure.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-3 @sm/mortgage:grid-cols-3">
                        <Field>
                          <Label htmlFor="mortgage-term-alt">Term (years)</Label>
                          <Input
                            id="mortgage-term-alt"
                            type="number"
                            min={1}
                            max={40}
                            value={termYears}
                            onChange={(event) =>
                              setTermYears(Math.min(40, Math.max(1, Number(event.target.value))))
                            }
                          />
                        </Field>
                        <PercentField
                          id="mortgage-reference-rate"
                          label="Reference Rate"
                          value={referenceRate}
                          step={0.05}
                          max={20}
                          min={-5}
                          onChange={setReferenceRate}
                        />
                        <PercentField
                          id="mortgage-spread-rate"
                          label="Spread"
                          value={spreadRate}
                          step={0.05}
                          max={10}
                          onChange={setSpreadRate}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Current modeled rate: {results.currentRate.toFixed(2)}%
                      </p>
                    </>
                  )}

                  <div className="grid grid-cols-1 gap-3 @sm/mortgage:grid-cols-2">
                    <CurrencyField
                      id="mortgage-income"
                      label={isUS ? "Gross Income / month" : "Monthly Income"}
                      value={monthlyIncome}
                      step={100}
                      onChange={setMonthlyIncome}
                    />
                    <CurrencyField
                      id="mortgage-debts"
                      label="Existing Debts / month"
                      value={monthlyDebtPayments}
                      step={50}
                      onChange={setMonthlyDebtPayments}
                    />
                  </div>

                  {isUS ? (
                    <div className="grid grid-cols-1 gap-3 @sm/mortgage:grid-cols-3">
                      <CurrencyField
                        id="mortgage-property-tax"
                        label="Property Tax / year"
                        value={annualPropertyTax}
                        step={100}
                        onChange={setAnnualPropertyTax}
                      />
                      <CurrencyField
                        id="mortgage-home-insurance"
                        label="Home Insurance / year"
                        value={annualHomeInsurance}
                        step={100}
                        onChange={setAnnualHomeInsurance}
                      />
                      <CurrencyField
                        id="mortgage-hoa"
                        label="HOA / month"
                        value={monthlyHoa}
                        step={25}
                        onChange={setMonthlyHoa}
                      />
                    </div>
                  ) : (
                    <>
                      <Field>
                        <Label htmlFor="mortgage-borrowers">Borrowers</Label>
                        <ToggleGroup
                          id="mortgage-borrowers"
                          type="single"
                          variant="outline"
                          value={borrowerCount === 1 ? "1" : "2"}
                          onValueChange={(value) => {
                            if (value) setBorrowerCount(value === "2" ? 2 : 1)
                          }}
                          className="w-full"
                        >
                          <ToggleGroupItem value="1" className="flex-1">
                            1
                          </ToggleGroupItem>
                          <ToggleGroupItem value="2" className="flex-1">
                            2
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </Field>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  <div className="rounded-lg border bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
                    {isUS
                      ? "Manual local costs keep the USA calculator realistic without forcing state or county lookup data into v1."
                      : "Use advanced inputs to refine Spain-specific taxes, ownership costs, and affordability assumptions."}
                  </div>

                  <div className="grid grid-cols-1 gap-3 @sm/mortgage:grid-cols-2">
                    {isUS ? (
                      <>
                        <CurrencyField
                          id="mortgage-county-limit"
                          label="County Loan Limit (manual)"
                          value={countyLoanLimit}
                          step={1000}
                          onChange={setCountyLoanLimit}
                        />
                        <Field>
                          <Label htmlFor="mortgage-start-month">Start Month</Label>
                          <Select
                            value={String(startMonth)}
                            onValueChange={(value) => setStartMonth(Number(value))}
                          >
                            <SelectTrigger id="mortgage-start-month">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTH_NAMES.map((name, index) => (
                                <SelectItem key={index + 1} value={String(index + 1)}>
                                  {name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </>
                    ) : (
                      <>
                        <Field>
                          <Label htmlFor="mortgage-profile">Buyer Profile</Label>
                          <Select
                            value={buyerProfile}
                            onValueChange={(value) => setBuyerProfile(value as BuyerProfile)}
                          >
                            <SelectTrigger id="mortgage-profile">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BUYER_PROFILE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field>
                          <Label htmlFor="mortgage-start-month-es">Start Month</Label>
                          <Select
                            value={String(startMonth)}
                            onValueChange={(value) => setStartMonth(Number(value))}
                          >
                            <SelectTrigger id="mortgage-start-month-es">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTH_NAMES.map((name, index) => (
                                <SelectItem key={index + 1} value={String(index + 1)}>
                                  {name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </>
                    )}
                  </div>

                  {isUS ? (
                    <>
                      <div className="grid grid-cols-1 gap-3 @sm/mortgage:grid-cols-2">
                        <CurrencyField
                          id="mortgage-title-fees"
                          label="Title & Recording Fees"
                          value={titleAndRecordingFees}
                          step={100}
                          onChange={setTitleAndRecordingFees}
                        />
                        <CurrencyField
                          id="mortgage-transfer-taxes"
                          label="Transfer Taxes"
                          value={transferTaxes}
                          step={100}
                          onChange={setTransferTaxes}
                        />
                        <CurrencyField
                          id="mortgage-prepaids"
                          label="Prepaids & Escrow"
                          value={prepaidsAndEscrow}
                          step={100}
                          onChange={setPrepaidsAndEscrow}
                        />
                        <CurrencyField
                          id="mortgage-seller-credits"
                          label="Seller Credits"
                          value={sellerCredits}
                          step={100}
                          onChange={setSellerCredits}
                        />
                        <CurrencyField
                          id="mortgage-appraisal-fee"
                          label="Appraisal Fee"
                          value={appraisalFee}
                          step={50}
                          onChange={setAppraisalFee}
                        />
                        <CurrencyField
                          id="mortgage-maintenance"
                          label="Maintenance Reserve / month"
                          value={monthlyMaintenanceReserve}
                          step={25}
                          onChange={setMonthlyMaintenanceReserve}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 @sm/mortgage:grid-cols-2">
                        <PercentField
                          id="mortgage-origination"
                          label="Origination Fee"
                          value={originationFeeRate}
                          step={0.1}
                          max={5}
                          onChange={setOriginationFeeRate}
                        />
                        <PercentField
                          id="mortgage-points"
                          label="Discount Points"
                          value={discountPointsRate}
                          step={0.125}
                          max={5}
                          onChange={setDiscountPointsRate}
                        />
                      </div>

                      {(loanProgram === "conventional" || loanProgram === "jumbo") && (
                        <PercentField
                          id="mortgage-mi-rate"
                          label="Annual MI Rate"
                          value={annualMortgageInsuranceRate}
                          step={0.05}
                          max={5}
                          onChange={setAnnualMortgageInsuranceRate}
                        />
                      )}

                      {(loanProgram === "fha" || loanProgram === "va" || loanProgram === "usda") && (
                        <Field>
                          <Label>Finance Upfront Fee</Label>
                          <ToggleGroup
                            type="single"
                            variant="outline"
                            value={financeUpfrontFundingFee ? "yes" : "no"}
                            onValueChange={(value) => {
                              if (value) setFinanceUpfrontFundingFee(value === "yes")
                            }}
                            className="w-full"
                          >
                            <ToggleGroupItem value="yes" className="flex-1">
                              Yes
                            </ToggleGroupItem>
                            <ToggleGroupItem value="no" className="flex-1">
                              No
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </Field>
                      )}

                      {loanProgram === "va" && (
                        <Field>
                          <Label>VA Use</Label>
                          <ToggleGroup
                            type="single"
                            variant="outline"
                            value={vaUsage}
                            onValueChange={(value) => {
                              if (value === "first_use" || value === "subsequent_use") {
                                setVaUsage(value)
                              }
                            }}
                            className="w-full"
                          >
                            <ToggleGroupItem value="first_use" className="flex-1">
                              First use
                            </ToggleGroupItem>
                            <ToggleGroupItem value="subsequent_use" className="flex-1">
                              Subsequent
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </Field>
                      )}

                      {(mortgageType === "adjustable" || mortgageType === "mixed") && (
                        <div className="grid grid-cols-1 gap-3 @sm/mortgage:grid-cols-2">
                          <Field>
                            <Label htmlFor="mortgage-review-months">Rate Review (months)</Label>
                            <Input
                              id="mortgage-review-months"
                              type="number"
                              min={1}
                              max={24}
                              value={rateReviewMonths}
                              onChange={(event) =>
                                setRateReviewMonths(Math.min(24, Math.max(1, Number(event.target.value))))
                              }
                            />
                          </Field>
                          <PercentField
                            id="mortgage-stress-rate"
                            label="Stress Rate"
                            value={stressInterestRate}
                            step={0.1}
                            max={15}
                            onChange={setStressInterestRate}
                          />
                          <PercentField
                            id="mortgage-arm-cap-initial"
                            label="Initial Cap"
                            value={armInitialCap}
                            step={0.25}
                            max={10}
                            onChange={setArmInitialCap}
                          />
                          <PercentField
                            id="mortgage-arm-cap-periodic"
                            label="Periodic Cap"
                            value={armPeriodicCap}
                            step={0.25}
                            max={10}
                            onChange={setArmPeriodicCap}
                          />
                          <PercentField
                            id="mortgage-arm-cap-lifetime"
                            label="Lifetime Cap"
                            value={armLifetimeCap}
                            step={0.25}
                            max={15}
                            onChange={setArmLifetimeCap}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-3 @sm/mortgage:grid-cols-2">
                        <CurrencyField
                          id="mortgage-ibi"
                          label="IBI / year"
                          value={annualPropertyTax}
                          step={25}
                          onChange={setAnnualPropertyTax}
                        />
                        <CurrencyField
                          id="mortgage-trash-tax"
                          label="Other Fees / year"
                          value={annualOtherHousingFees}
                          step={10}
                          onChange={setAnnualOtherHousingFees}
                        />
                        <CurrencyField
                          id="mortgage-community"
                          label="Community Fee / month"
                          value={monthlyHoa}
                          step={10}
                          onChange={setMonthlyHoa}
                        />
                        <CurrencyField
                          id="mortgage-home-insurance"
                          label="Home Insurance / year"
                          value={annualHomeInsurance}
                          step={25}
                          onChange={setAnnualHomeInsurance}
                        />
                        <CurrencyField
                          id="mortgage-appraisal-fee-es"
                          label="Appraisal Fee"
                          value={appraisalFee}
                          step={25}
                          onChange={setAppraisalFee}
                        />
                        <CurrencyField
                          id="mortgage-maintenance-es"
                          label="Maintenance Reserve / month"
                          value={monthlyMaintenanceReserve}
                          step={10}
                          onChange={setMonthlyMaintenanceReserve}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 @sm/mortgage:grid-cols-2">
                        <PercentField
                          id="mortgage-opening-fee"
                          label="Origination Fee"
                          value={originationFeeRate}
                          step={0.1}
                          max={5}
                          onChange={setOriginationFeeRate}
                        />
                        <PercentField
                          id="mortgage-stress-rate-es"
                          label="Stress Rate"
                          value={stressInterestRate}
                          step={0.1}
                          max={15}
                          onChange={setStressInterestRate}
                        />
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 text-center">
                <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {isUS ? "Total Monthly Payment" : "Monthly Payment"}
                </p>
                <p className="text-3xl font-bold tabular-nums">
                  {formatCurrency(results.totalMonthlyPayment)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  P&amp;I: {formatCurrency(results.principalAndInterest)} · {currentRateLabel}
                </p>
                {!isUS && borrowerCount === 2 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Per borrower: {formatCurrency(results.totalMonthlyPayment / 2)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {isUS ? (
                  <>
                    <SummaryItem
                      label="P&I"
                      value={formatCurrency(results.principalAndInterest, { maximumFractionDigits: 0 })}
                    />
                    <SummaryItem
                      label="Cash to Close"
                      value={formatCurrency(results.cashToClose, { maximumFractionDigits: 0 })}
                    />
                    <SummaryItem
                      label="Loan-to-Value"
                      value={`${results.financingPercent.toFixed(1)}%`}
                    />
                    <SummaryItem
                      label="Front-end Ratio"
                      value={`${results.frontEndRatio.toFixed(1)}%`}
                    />
                    <SummaryItem
                      label="Back-end Ratio"
                      value={`${results.backEndRatio.toFixed(1)}%`}
                      valueClassName={ratioTone}
                    />
                    <SummaryItem
                      label="APR"
                      value={`${results.estimatedApr.toFixed(2)}%`}
                    />
                    <SummaryItem
                      label="MI / Funding Fee"
                      value={
                        results.monthlyMortgageInsurance > 0
                          ? `${formatCurrency(results.monthlyMortgageInsurance, { maximumFractionDigits: 0 })}/mo`
                          : formatCurrency(results.upfrontFundingFeeAmount, { maximumFractionDigits: 0 })
                      }
                      hint={results.monthlyMortgageInsurance > 0 ? "Monthly insurance" : "Upfront fee"}
                    />
                    <SummaryItem
                      label="Program Limit"
                      value={
                        results.programLimitWarning
                          ? "Review needed"
                          : formatCurrency(countyLoanLimit, { maximumFractionDigits: 0 })
                      }
                      hint={results.programLimitWarning ?? "Manual county limit"}
                      valueClassName={results.programLimitWarning ? "text-amber-600 dark:text-amber-400" : undefined}
                    />
                  </>
                ) : (
                  <>
                    <SummaryItem
                      label="Mortgage Amount"
                      value={formatCurrency(results.financedLoanAmount, { maximumFractionDigits: 0 })}
                    />
                    <SummaryItem
                      label="Cash to Close"
                      value={formatCurrency(results.cashToClose, { maximumFractionDigits: 0 })}
                    />
                    <SummaryItem
                      label="LTV on Appraisal"
                      value={`${results.ltvOnAppraisal.toFixed(1)}%`}
                    />
                    <SummaryItem
                      label="Back-end Ratio"
                      value={`${results.backEndRatio.toFixed(1)}%`}
                      valueClassName={ratioTone}
                    />
                    <SummaryItem
                      label="Property Tax / year"
                      value={formatCurrency(annualPropertyTax, { maximumFractionDigits: 0 })}
                    />
                    <SummaryItem
                      label="APR"
                      value={`${results.estimatedApr.toFixed(2)}%`}
                    />
                  </>
                )}
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <p className="font-medium">Cost Breakdown</p>
                <BreakdownRow
                  label="Down payment"
                  value={formatCurrency(breakdown.deposit, { maximumFractionDigits: 0 })}
                />
                <BreakdownRow
                  label="Base loan"
                  value={formatCurrency(breakdown.baseLoanAmount, { maximumFractionDigits: 0 })}
                />
                {breakdown.financedLoanAmount !== breakdown.baseLoanAmount && (
                  <BreakdownRow
                    label="Financed loan"
                    value={formatCurrency(breakdown.financedLoanAmount, { maximumFractionDigits: 0 })}
                  />
                )}
                <BreakdownRow
                  label={isUS ? "Closing costs & prepaids" : "Purchase taxes"}
                  value={formatCurrency(breakdown.totalTaxesAndExpenses, { maximumFractionDigits: 0 })}
                />
                <BreakdownRow
                  label="Origination fee"
                  value={formatCurrency(breakdown.originationFeeAmount, { maximumFractionDigits: 0 })}
                />
                {breakdown.discountPointsAmount > 0 && (
                  <BreakdownRow
                    label="Discount points"
                    value={formatCurrency(breakdown.discountPointsAmount, { maximumFractionDigits: 0 })}
                  />
                )}
                <BreakdownRow
                  label="Appraisal fee"
                  value={formatCurrency(breakdown.appraisalFee, { maximumFractionDigits: 0 })}
                />
                {breakdown.upfrontFundingFeeAmount > 0 && (
                  <BreakdownRow
                    label="Upfront fee"
                    value={formatCurrency(breakdown.upfrontFundingFeeAmount, { maximumFractionDigits: 0 })}
                  />
                )}
                {breakdown.financingGap > 0 && (
                  <BreakdownRow
                    label="Extra cash for max-LTV gap"
                    value={formatCurrency(breakdown.financingGap, { maximumFractionDigits: 0 })}
                  />
                )}
                <BreakdownRow
                  label="Total interest"
                  value={formatCurrency(breakdown.totalInterest, { maximumFractionDigits: 0 })}
                />
                <BreakdownRow
                  label={`Property tax (${termYears}yr)`}
                  value={formatCurrency(breakdown.totalRecurringPropertyTaxes, { maximumFractionDigits: 0 })}
                />
                <BreakdownRow
                  label="Recurring housing costs"
                  value={formatCurrency(breakdown.totalRecurringHousingCosts, { maximumFractionDigits: 0 })}
                />
                {breakdown.totalMortgageInsuranceCost > 0 && (
                  <BreakdownRow
                    label="Mortgage insurance"
                    value={formatCurrency(breakdown.totalMortgageInsuranceCost, { maximumFractionDigits: 0 })}
                  />
                )}
                {isUS && breakdown.sellerCredits > 0 && (
                  <BreakdownRow
                    label="Seller credits"
                    value={`-${formatCurrency(breakdown.sellerCredits, { maximumFractionDigits: 0 })}`}
                  />
                )}
                <Separator />
                <BreakdownRow
                  label="Total cost"
                  value={formatCurrency(breakdown.totalCost, { maximumFractionDigits: 0 })}
                  bold
                />
              </div>

              <details className="rounded-lg border bg-muted/20 p-4">
                <summary className="cursor-pointer list-none text-sm font-medium">
                  Notes and assumptions
                </summary>
                <div className="mt-4 grid gap-3 text-sm">
                  {isUS ? (
                    <>
                      <BreakdownRow
                        label="Manual county limit"
                        value={formatCurrency(countyLoanLimit, { maximumFractionDigits: 0 })}
                      />
                      <BreakdownRow
                        label="2026 baseline conforming"
                        value={formatCurrency(US_MORTGAGE_LIMITS_2026.conformingBaseline, { maximumFractionDigits: 0 })}
                      />
                      <BreakdownRow
                        label="2026 FHA floor"
                        value={formatCurrency(US_MORTGAGE_LIMITS_2026.fhaFloor, { maximumFractionDigits: 0 })}
                      />
                      {(loanProgram === "conventional" || loanProgram === "fha") && (
                        <BreakdownRow
                          label="Program ceiling"
                          value={formatCurrency(
                            loanProgram === "conventional"
                              ? US_MORTGAGE_LIMITS_2026.conformingHighCostCeiling
                              : US_MORTGAGE_LIMITS_2026.fhaCeiling,
                            { maximumFractionDigits: 0 }
                          )}
                        />
                      )}
                    </>
                  ) : (
                    <BreakdownRow
                      label="Tax estimate"
                      value={taxDetailNote || "No purchase taxes modeled"}
                    />
                  )}

                  {results.mortgageInsuranceEndMonth != null && results.mortgageInsuranceEndMonth > 0 && (
                    <BreakdownRow
                      label="MI ends around"
                      value={`Month ${results.mortgageInsuranceEndMonth}`}
                    />
                  )}

                  {results.programLimitWarning && (
                    <p className="rounded-md border border-amber-200/60 bg-amber-50/60 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                      {results.programLimitWarning}
                    </p>
                  )}

                  {results.programNote && (
                    <p className="rounded-md border border-border/70 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                      {results.programNote}
                    </p>
                  )}
                </div>
              </details>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Amortization Schedule</p>
            <MortgageAmortizationChart data={amortizationData} />
          </div>

          <p className="text-center text-[10px] text-muted-foreground">
            Estimates only. USA program eligibility, Spain tax reliefs, and lender-specific overlays are not fully automated.
          </p>
        </CardContent>
      </Card>
    </section>
  )
})

MortgageCalculator.displayName = "MortgageCalculator"

function Field({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>
}

function SummaryItem({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string
  value: string
  hint?: string
  valueClassName?: string
}) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`font-medium tabular-nums ${valueClassName ?? ""}`}>{value}</p>
      {hint ? <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function BreakdownRow({
  label,
  value,
  bold,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className={bold ? "font-medium" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={`text-right tabular-nums ${bold ? "font-semibold" : ""}`}>
        {value}
      </span>
    </div>
  )
}

function CurrencyField({
  id,
  label,
  value,
  step,
  onChange,
}: {
  id: string
  label: string
  value: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <Field>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
      />
    </Field>
  )
}

function PercentField({
  id,
  label,
  value,
  step,
  max,
  min = 0,
  onChange,
}: {
  id: string
  label: string
  value: number
  step: number
  max: number
  min?: number
  onChange: (value: number) => void
}) {
  return (
    <Field>
      <div className="flex items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Badge variant="secondary" className="text-[10px] leading-none px-1.5 py-0.5">
          %
        </Badge>
      </div>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) =>
          onChange(Math.min(max, Math.max(min, Number(event.target.value))))
        }
      />
    </Field>
  )
}
