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
      "Coffee",
      "Bars",
      "Takeaway/Delivery",
    ],
  },
  {
    label: "Housing",
    categories: [
      "Rent",
      "Mortgage",
      "Home Maintenance",
      "Home Supplies",
    ],
  },
  {
    label: "Bills & Utilities",
    categories: [
      "Electricity",
      "Gas",
      "Water",
      "Internet",
      "Mobile",
    ],
  },
  {
    label: "Transportation",
    categories: [
      "Fuel",
      "Public Transport",
      "Taxi/Rideshare",
      "Parking/Tolls",
      "Car Maintenance",
    ],
  },
  {
    label: "Health & Fitness",
    categories: [
      "Pharmacy",
      "Medical",
      "Fitness",
    ],
  },
  {
    label: "Shopping",
    categories: [
      "Clothing",
      "Electronics",
      "Home Goods",
      "Gifts",
    ],
  },
  {
    label: "Finance & Insurance",
    categories: [
      "Bank Fees",
      "Taxes & Fees",
      "Insurance",
    ],
  },
  {
    label: "Income",
    categories: [
      "Salary",
      "Bonus",
      "Freelance",
      "Refunds/Reimbursements",
    ],
  },
  {
    label: "Savings & Investments",
    categories: [
      "Savings",
      "Investments",
      "Transfers",
    ],
  },
  {
    label: "Entertainment & Lifestyle",
    categories: [
      "Entertainment",
      "Education",
      "Subscriptions",
      "Travel",
      "Services",
    ],
  },
  {
    label: "Other",
    categories: ["Other"],
  },
]

export const DEFAULT_CATEGORIES = DEFAULT_CATEGORY_GROUPS.flatMap(
  (group) => group.categories,
)


