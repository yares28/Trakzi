// lib/categories.ts
// Grouped default categories used whenever the database has not been seeded yet.
// Each category is classified as "need" (essential) or "want" (discretionary)

export type CategoryType = "need" | "want"

export type CategoryDefinition = {
  name: string
  type: CategoryType
}

export type CategoryGroup = {
  label: string
  categories: CategoryDefinition[]
}

export const DEFAULT_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: "Food & Drink",
    categories: [
      { name: "Groceries", type: "need" },
      { name: "Restaurants", type: "want" },
      { name: "Coffee", type: "want" },
      { name: "Bars", type: "want" },
      { name: "Takeaway/Delivery", type: "want" },
    ],
  },
  {
    label: "Housing",
    categories: [
      { name: "Rent", type: "need" },
      { name: "Mortgage", type: "need" },
      { name: "Home Maintenance", type: "need" },
      { name: "Home Supplies", type: "need" },
    ],
  },
  {
    label: "Bills & Utilities",
    categories: [
      { name: "Electricity", type: "need" },
      { name: "Gas", type: "need" },
      { name: "Water", type: "need" },
      { name: "Internet", type: "need" },
      { name: "Mobile", type: "need" },
      { name: "Utilities", type: "need" },
    ],
  },
  {
    label: "Transportation",
    categories: [
      { name: "Fuel", type: "need" },
      { name: "Public Transport", type: "need" },
      { name: "Taxi/Rideshare", type: "want" },
      { name: "Parking/Tolls", type: "need" },
      { name: "Car Maintenance", type: "need" },
    ],
  },
  {
    label: "Health & Fitness",
    categories: [
      { name: "Pharmacy", type: "need" },
      { name: "Medical", type: "need" },
      { name: "Healthcare", type: "need" },
      { name: "Fitness", type: "want" },
    ],
  },
  {
    label: "Shopping",
    categories: [
      { name: "Shopping", type: "want" },
      { name: "Clothing", type: "want" },
      { name: "Electronics", type: "want" },
      { name: "Home Goods", type: "want" },
      { name: "Gifts", type: "want" },
    ],
  },
  {
    label: "Finance & Insurance",
    categories: [
      { name: "Bank Fees", type: "need" },
      { name: "Taxes & Fees", type: "need" },
      { name: "Insurance", type: "need" },
      { name: "Donation", type: "want" },
    ],
  },
  {
    label: "Income",
    categories: [
      { name: "Income", type: "need" },
      { name: "Salary", type: "need" },
      { name: "Bonus", type: "need" },
      { name: "Freelance", type: "need" },
      { name: "Refunds/Reimbursements", type: "need" },
      { name: "Cashback", type: "need" },
      { name: "Top-ups", type: "need" },
    ],
  },
  {
    label: "Savings & Investments",
    categories: [
      { name: "Savings", type: "need" },
      { name: "Investments", type: "want" },
      { name: "Transfers", type: "need" },
      { name: "Loan", type: "need" },
      { name: "Credit", type: "need" },
      { name: "Wealth", type: "want" },
    ],
  },
  {
    label: "Entertainment & Lifestyle",
    categories: [
      { name: "Entertainment", type: "want" },
      { name: "Education", type: "need" },
      { name: "Subscriptions", type: "want" },
      { name: "Travel", type: "want" },
      { name: "Services", type: "want" },
    ],
  },
  {
    label: "Other",
    categories: [
      { name: "Cash", type: "need" },
      { name: "General", type: "want" },
      { name: "Other", type: "want" },
    ],
  },
]

// Flat list of category names for backwards compatibility
export const DEFAULT_CATEGORIES = DEFAULT_CATEGORY_GROUPS.flatMap(
  (group) => group.categories.map((cat) => cat.name),
)

// Map of category name to type (need/want)
export const CATEGORY_TYPE_MAP: Record<string, CategoryType> = Object.fromEntries(
  DEFAULT_CATEGORY_GROUPS.flatMap((group) =>
    group.categories.map((cat) => [cat.name.toLowerCase(), cat.type])
  )
)

// Helper function to get category type
export function getCategoryType(categoryName: string): CategoryType {
  return CATEGORY_TYPE_MAP[categoryName.toLowerCase()] || "want"
}

// Helper function to check if a category is a need
export function isCategoryNeed(categoryName: string): boolean {
  return getCategoryType(categoryName) === "need"
}

// Helper function to check if a category is a want
export function isCategoryWant(categoryName: string): boolean {
  return getCategoryType(categoryName) === "want"
}

// Get all needs categories
export const NEEDS_CATEGORIES = DEFAULT_CATEGORY_GROUPS.flatMap(
  (group) => group.categories.filter((cat) => cat.type === "need").map((cat) => cat.name)
)

// Get all wants categories
export const WANTS_CATEGORIES = DEFAULT_CATEGORY_GROUPS.flatMap(
  (group) => group.categories.filter((cat) => cat.type === "want").map((cat) => cat.name)
)
