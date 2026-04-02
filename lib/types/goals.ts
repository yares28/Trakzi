export const GOAL_KINDS = [
  "savings_target",
  "debt_payoff",
  "net_worth_target",
  "pocket_funding",
] as const

export const GOAL_ENTRY_TYPES = [
  "contribution",
  "withdrawal",
  "adjustment",
] as const

export const GOAL_STATUSES = [
  "active",
  "completed",
  "archived",
] as const

export const GOAL_POCKET_TYPES = [
  "property",
  "vehicle",
] as const

export type GoalKind = (typeof GOAL_KINDS)[number]
export type GoalEntryType = (typeof GOAL_ENTRY_TYPES)[number]
export type GoalStatus = (typeof GOAL_STATUSES)[number]
export type GoalPocketType = (typeof GOAL_POCKET_TYPES)[number]

export interface GoalRecord {
  id: number
  user_id: string
  category: string
  label: string | null
  target_amount: string
  deadline: string
  monthly_allocation: string
  status: GoalStatus | string
  created_at: string
  goal_kind: GoalKind
  priority: number
  notes: string | null
  linked_debt_account_id: number | null
  linked_pocket_id: number | null
  linked_pocket_type: GoalPocketType | null
  archived_at: string | null
  updated_at: string | null
  completed_at: string | null
  target_balance: string | null
  starting_amount: string | null
  manual_progress: string
}

export interface GoalEntryRecord {
  id: number
  goal_id: number
  user_id: string
  entry_type: GoalEntryType
  amount: string
  entry_date: string
  transaction_id: number | null
  debt_entry_id: number | null
  note: string | null
  created_at: string
}
