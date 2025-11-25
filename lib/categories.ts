// lib/categories.ts
// Grouped default categories used whenever the database has not been seeded yet.

export type CategoryGroup = {
  label: string
  categories: string[]
}

export const DEFAULT_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: "Food & Drink",
    categories: [
      "Groceries",
      "Restaurants",
      "Bars",
    ],
  },
  {
    label: "Home & Utilities",
    categories: [
      "Rent", 
      "Mortgage",
      "Utilities",
    ],
  },
  {
    label: "Transportation",
    categories: [
      "Fuel",
      "Transport",
    ],
  },
  {
    label: "Finance & Insurance",
    categories: [
      "Insurance",
      "Taxes & Fees",
    ],
  },
  {
    label: "Lifestyle & Shopping",
    categories: [
      "Shopping",
      "Entertainment",
      "Education",
      "Health & Fitness",
      "Subscriptions",
      "Travel",
      "Services",
    ],
  },
  {
    label: "Income & Transfers",
    categories: [
      "Income",
      "Transfers",
      "Refunds",
    ],
  },
  {
    label: "Savings & Goals",
    categories: [
      "Savings",
    ],
  },
  {
    label: "Personal & Other",
    categories: ["Other"],
  },
]

export const DEFAULT_CATEGORIES = DEFAULT_CATEGORY_GROUPS.flatMap(
  (group) => group.categories,
)

