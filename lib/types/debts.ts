export const DEBT_TYPES = [
  "mortgage_main_home",
  "mortgage_other_property",
  "property_secured_loan",
  "vehicle_finance",
  "credit_card",
  "revolving_credit",
  "student_loan",
  "personal_loan",
  "consumer_loan",
  "credit_line",
  "overdraft",
  "buy_now_pay_later",
  "quick_loan",
  "tax_debt",
  "medical_debt",
  "family_private_loan",
  "business_loan_personal_liability",
  "other",
] as const

export const STANDALONE_DEBT_TYPES = [
  "credit_card",
  "revolving_credit",
  "student_loan",
  "personal_loan",
  "consumer_loan",
  "credit_line",
  "overdraft",
  "buy_now_pay_later",
  "quick_loan",
  "tax_debt",
  "medical_debt",
  "family_private_loan",
  "business_loan_personal_liability",
  "other",
] as const

export const DEBT_ENTRY_TYPES = [
  "opening_balance",
  "payment",
  "interest",
  "fee",
  "drawdown",
  "purchase",
  "adjustment",
  "refund",
  "refinance_in",
  "refinance_out",
  "payoff",
] as const

export const DEBT_ORIGIN_KINDS = [
  "standalone",
  "property_pocket",
  "vehicle_pocket",
] as const

export const DEBT_STATUSES = [
  "active",
  "paid_off",
  "paused",
  "archived",
] as const

export const DEBT_INTEREST_RATE_KINDS = [
  "fixed",
  "variable",
  "mixed",
  "none",
  "unknown",
] as const

export const DEBT_PAYMENT_FREQUENCIES = [
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
  "irregular",
] as const

export type DebtType = (typeof DEBT_TYPES)[number]
export type StandaloneDebtType = (typeof STANDALONE_DEBT_TYPES)[number]
export type DebtEntryType = (typeof DEBT_ENTRY_TYPES)[number]
export type DebtOriginKind = (typeof DEBT_ORIGIN_KINDS)[number]
export type DebtStatus = (typeof DEBT_STATUSES)[number]
export type DebtInterestRateKind = (typeof DEBT_INTEREST_RATE_KINDS)[number]
export type DebtPaymentFrequency = (typeof DEBT_PAYMENT_FREQUENCIES)[number]

export interface DebtAccountSummary {
  id: number
  user_id: string
  origin_kind: DebtOriginKind
  linked_pocket_id: number | null
  linked_pocket_type: string | null
  name: string
  debt_type: DebtType
  lender_name: string | null
  currency: string
  country_code: string | null
  region_code: string | null
  interest_rate: number | null
  interest_rate_kind: DebtInterestRateKind
  reference_rate: string | null
  minimum_payment: number | null
  payment_frequency: DebtPaymentFrequency | null
  due_day: number | null
  status: DebtStatus
  opened_at: string | null
  closed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  current_balance: number
  total_paid: number
  total_interest: number
  total_fees: number
  entry_count: number
  last_entry_date: string | null
}

export interface DebtEntrySummary {
  id: number
  debt_account_id: number
  entry_type: DebtEntryType
  entry_date: string
  amount_signed: number
  principal_signed: number | null
  interest_signed: number | null
  fee_signed: number | null
  transaction_id: number | null
  notes: string | null
  created_at: string
}
