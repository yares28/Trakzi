// lib/receipt-categories.ts
// Default receipt categories organized by macronutrient type

export type ReceiptCategoryType = {
  name: string
  color: string
}

export type ReceiptCategory = {
  name: string
  type: string // Macronutrient type name
  color: string
  broadType?: string // Broad category type (e.g., "Drinks", "Food", "Health Care")
}

// Default Macronutrient Types (User Customizable)
export const DEFAULT_RECEIPT_CATEGORY_TYPES: ReceiptCategoryType[] = [
  { name: "Protein", color: "#ef4444" }, // Red
  { name: "Carbs", color: "#f59e0b" }, // Amber
  { name: "Fat", color: "#eab308" }, // Yellow
  { name: "Mixed", color: "#8b5cf6" }, // Purple (mixed macronutrients - prepared/frozen foods)
  { name: "None", color: "#3b82f6" }, // Blue (no macronutrient value)
  { name: "Other", color: "#64748b" }, // Slate
]

// Default Food Categories organized by Macronutrient Type
export const DEFAULT_RECEIPT_CATEGORIES: ReceiptCategory[] = [
  // FRESH / WHOLE FOODS
  { name: "Fruits", type: "None", color: "#059669", broadType: "Food" },
  { name: "Vegetables", type: "None", color: "#047857", broadType: "Food" },
  { name: "Herbs & Fresh Aromatics", type: "None", color: "#065f46", broadType: "Food" },
  { name: "Meat & Poultry", type: "Protein", color: "#dc2626", broadType: "Food" },
  { name: "Fish & Seafood", type: "Protein", color: "#ea580c", broadType: "Food" },
  { name: "Eggs", type: "Protein", color: "#991b1b", broadType: "Food" },
  { name: "Dairy (Milk/Yogurt)", type: "Mixed", color: "#fbbf24", broadType: "Food" },
  { name: "Cheese", type: "Fat", color: "#fcd34d", broadType: "Food" },
  { name: "Deli / Cold Cuts", type: "Protein", color: "#7f1d1d", broadType: "Food" },
  { name: "Fresh Ready-to-Eat", type: "Mixed", color: "#7c3aed", broadType: "Food" },

  // BAKERY
  { name: "Bread", type: "Carbs", color: "#d97706", broadType: "Food" },
  { name: "Pastries", type: "Carbs", color: "#f59e0b", broadType: "Food" },
  { name: "Wraps & Buns", type: "Carbs", color: "#92400e", broadType: "Food" },

  // PANTRY STAPLES
  { name: "Pasta, Rice & Grains", type: "Carbs", color: "#78350f", broadType: "Food" },
  { name: "Legumes", type: "Protein", color: "#7f1d1d", broadType: "Food" },
  { name: "Canned & Jarred", type: "Mixed", color: "#065f46", broadType: "Food" },
  { name: "Sauces", type: "Mixed", color: "#ea580c", broadType: "Food" },
  { name: "Condiments", type: "Fat", color: "#f59e0b", broadType: "Food" },
  { name: "Spices & Seasonings", type: "None", color: "#92400e", broadType: "Food" },
  { name: "Oils & Vinegars", type: "Fat", color: "#d97706", broadType: "Food" },
  { name: "Baking Ingredients", type: "Carbs", color: "#78350f", broadType: "Food" },
  { name: "Breakfast & Spreads", type: "Carbs", color: "#d97706", broadType: "Food" },

  // SNACKS & SWEETS
  { name: "Salty Snacks", type: "Carbs", color: "#92400e", broadType: "Food" },
  { name: "Cookies & Biscuits", type: "Carbs", color: "#f59e0b", broadType: "Food" },
  { name: "Chocolate & Candy", type: "Carbs", color: "#78350f", broadType: "Food" },
  { name: "Nuts & Seeds", type: "Fat", color: "#d97706", broadType: "Food" },
  { name: "Ice Cream & Desserts", type: "Mixed", color: "#8b5cf6", broadType: "Food" },

  // BEVERAGES
  { name: "Water", type: "None", color: "#0ea5e9", broadType: "Drinks" },
  { name: "Soft Drinks", type: "Carbs", color: "#1d4ed8", broadType: "Drinks" },
  { name: "Juice", type: "Carbs", color: "#3b82f6", broadType: "Drinks" },
  { name: "Coffee & Tea", type: "None", color: "#6b7280", broadType: "Drinks" },
  { name: "Energy & Sports Drinks", type: "Carbs", color: "#f59e0b", broadType: "Drinks" },

  // ALCOHOL
  { name: "Beer", type: "Other", color: "#9333ea", broadType: "Drinks" },
  { name: "Wine", type: "Other", color: "#7c3aed", broadType: "Drinks" },
  { name: "Spirits", type: "Other", color: "#6d28d9", broadType: "Drinks" },
  { name: "Low/No Alcohol", type: "Other", color: "#5b21b6", broadType: "Drinks" },

  // FROZEN
  { name: "Frozen Vegetables & Fruit", type: "None", color: "#0ea5e9", broadType: "Food" },
  { name: "Frozen Meals", type: "Mixed", color: "#8b5cf6", broadType: "Food" },

  // PREPARED FOODS
  { name: "Ready Meals", type: "Mixed", color: "#7c3aed", broadType: "Food" },
  { name: "Prepared Salads", type: "Mixed", color: "#6d28d9", broadType: "Food" },
  { name: "Sandwiches / Takeaway", type: "Mixed", color: "#5b21b6", broadType: "Food" },

  // NON-FOOD (broad_type = "Other")
  { name: "OTC Medicine", type: "Other", color: "#1e3a8a", broadType: "Other" },
  { name: "Supplements", type: "Other", color: "#1e40af", broadType: "Other" },
  { name: "First Aid", type: "Other", color: "#1d4ed8", broadType: "Other" },
  { name: "Hygiene & Toiletries", type: "Other", color: "#1e40af", broadType: "Other" },
  { name: "Hair Care", type: "Other", color: "#1e3a8a", broadType: "Other" },
  { name: "Skin Care", type: "Other", color: "#1d4ed8", broadType: "Other" },
  { name: "Oral Care", type: "Other", color: "#1e40af", broadType: "Other" },
  { name: "Cosmetics", type: "Other", color: "#1e3a8a", broadType: "Other" },
  { name: "Cleaning Supplies", type: "Other", color: "#1e40af", broadType: "Other" },
  { name: "Laundry", type: "Other", color: "#1e3a8a", broadType: "Other" },
  { name: "Paper Goods", type: "Other", color: "#1d4ed8", broadType: "Other" },
  { name: "Kitchen Consumables", type: "Other", color: "#1e40af", broadType: "Other" },
  { name: "Storage (containers, zip bags)", type: "Other", color: "#64748b", broadType: "Other" },
  { name: "Baby (Diapers & Wipes)", type: "Other", color: "#1e40af", broadType: "Other" },
  { name: "Baby Food", type: "Mixed", color: "#7c3aed", broadType: "Food" },
  { name: "Pet Food", type: "Other", color: "#1e40af", broadType: "Other" },
  { name: "Pet Supplies", type: "Other", color: "#1e3a8a", broadType: "Other" },
  { name: "Bags", type: "Other", color: "#64748b", broadType: "Other" },
  { name: "Other", type: "Other", color: "#64748b", broadType: "Other" },
]

// Helper function to get categories grouped by type
export function getReceiptCategoriesByType(): Record<string, ReceiptCategory[]> {
  const grouped: Record<string, ReceiptCategory[]> = {}

  DEFAULT_RECEIPT_CATEGORIES.forEach(category => {
    if (!grouped[category.type]) {
      grouped[category.type] = []
    }
    grouped[category.type].push(category)
  })

  return grouped
}

// Helper function to get all category names
export function getReceiptCategoryNames(): string[] {
  return DEFAULT_RECEIPT_CATEGORIES.map(c => c.name)
}

// Helper function to get category by name
export function getReceiptCategoryByName(name: string): ReceiptCategory | undefined {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return undefined
  return DEFAULT_RECEIPT_CATEGORIES.find((c) => c.name.toLowerCase() === normalized)
}

// Helper function to get categories grouped by broad type
export function getReceiptCategoriesByBroadType(): Record<string, ReceiptCategory[]> {
  const grouped: Record<string, ReceiptCategory[]> = {}

  DEFAULT_RECEIPT_CATEGORIES.forEach(category => {
    const broadType = category.broadType || "Other"
    if (!grouped[broadType]) {
      grouped[broadType] = []
    }
    grouped[broadType].push(category)
  })

  return grouped
}

// Helper function to get all unique broad types
export function getReceiptBroadTypes(): string[] {
  const broadTypes = new Set<string>()
  DEFAULT_RECEIPT_CATEGORIES.forEach(category => {
    const broadType = category.broadType || "Other"
    broadTypes.add(broadType)
  })
  return Array.from(broadTypes).sort()
}












