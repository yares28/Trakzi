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
  // PROTEIN
  { name: "Meat", type: "Protein", color: "#dc2626", broadType: "Food" }, // Chicken, beef, pork, sausage, bacon, etc.
  { name: "Fish & Seafood", type: "Protein", color: "#ea580c", broadType: "Food" }, // Shrimp, crab, cod, tuna, salmon, etc.
  { name: "Eggs", type: "Protein", color: "#991b1b", broadType: "Food" },
  { name: "Plant-Based Protein", type: "Protein", color: "#7f1d1d", broadType: "Food" }, // Tofu, tempeh, seitan, etc.
  { name: "Cheese", type: "Protein", color: "#fcd34d", broadType: "Food" }, // All types of cheese

  // CARBS
  { name: "Bread & Bakery", type: "Carbs", color: "#d97706", broadType: "Food" }, // Bread, tortillas, pies, muffins, bagels, cookies, etc.
  { name: "Snacks", type: "Carbs", color: "#92400e", broadType: "Food" }, // Chips, pretzels, popcorn, crackers, etc.
  { name: "Baking", type: "Carbs", color: "#78350f", broadType: "Food" }, // Flour, powdered sugar, baking powder, cocoa, etc.
  { name: "Soda & Cola", type: "Carbs", color: "#1d4ed8", broadType: "Drinks" }, // Cola, soda, fizzy drinks, etc. (sugar-based)
  { name: "Energy Drinks", type: "Carbs", color: "#f59e0b", broadType: "Drinks" }, // Energy drinks, sports drinks, etc. (sugar-based)
  { name: "Juice", type: "Carbs", color: "#3b82f6", broadType: "Drinks" }, // Juice, smoothies, etc. (sugar-based)
  { name: "Beverages", type: "Carbs", color: "#1d4ed8", broadType: "Drinks" }, // Sugar-based drinks
  { name: "Drinks", type: "Carbs", color: "#1e40af", broadType: "Drinks" }, // General sugary drinks

  // FAT
  { name: "Dairy", type: "Fat", color: "#fbbf24", broadType: "Food" }, // Butter, milk, yogurt, cream, etc.
  { name: "Condiments & Spices", type: "Fat", color: "#f59e0b", broadType: "Food" }, // Black pepper, oregano, cinnamon, sugar, olive oil, ketchup, mayonnaise, etc.
  { name: "Oils & Fats", type: "Fat", color: "#d97706", broadType: "Food" }, // Olive oil, vegetable oil, coconut oil, etc.
  { name: "Sauce", type: "Fat", color: "#ea580c", broadType: "Food" }, // Tomato sauce, pasta sauce, BBQ sauce, salsa, etc.

  // NONE (No macronutrient value) - Fruits, Vegetables, Canned Goods, etc.
  { name: "Fruits", type: "None", color: "#059669", broadType: "Food" }, // Apples, bananas, grapes, oranges, strawberries, avocados, peaches, etc.
  { name: "Vegetables", type: "None", color: "#047857", broadType: "Food" }, // Onions, carrots, salad greens, broccoli, peppers, tomatoes, cucumbers, etc.
  { name: "Canned Goods", type: "None", color: "#065f46", broadType: "Food" }, // Soup, tuna, fruit, beans, vegetables, pasta sauce, etc.

  // MIXED (Multiple macronutrients - prepared/frozen foods)
  { name: "Frozen Foods", type: "Mixed", color: "#8b5cf6", broadType: "Food" }, // Pizza, fish, potatoes, ready meals, ice cream, etc.
  { name: "Prepared Foods", type: "Mixed", color: "#7c3aed", broadType: "Food" }, // Ready-to-eat meals, pre-made salads, rotisserie chicken, etc.
  { name: "Water", type: "None", color: "#0ea5e9", broadType: "Drinks" }, // Bottled water, sparkling water, etc.
  { name: "Coffee & Tea", type: "None", color: "#6b7280", broadType: "Drinks" }, // Coffee, tea, teabags, etc.
  { name: "Alcohol", type: "Carbs", color: "#9333ea", broadType: "Drinks" }, // Beer, wine, spirits, etc. (carbs from alcohol)
  { name: "Health Care", type: "None", color: "#1e3a8a", broadType: "Health Care" }, // Saline, band-aid, cleaning alcohol, pain killers, antacids, etc.

  // OTHER (No specific macronutrient)
  { name: "Personal Care", type: "Other", color: "#1e40af", broadType: "Personal Care" }, // Shampoo, conditioner, deodorant, toothpaste, dental floss, etc.
  { name: "Household & Cleaning Supplies", type: "Other", color: "#1e3a8a", broadType: "Household" }, // Laundry detergent, dish soap, dishwashing liquid, paper towels, tissues, trash bags, aluminum foil, zip bags, etc.
  { name: "Baby Items", type: "Other", color: "#1e40af", broadType: "Personal Care" }, // Baby food, diapers, wet wipes, lotion, etc.
  { name: "Pet Care", type: "Other", color: "#1e3a8a", broadType: "Pet Care" }, // Pet food, kitty litter, chew toys, pet treats, pet shampoo, etc.
  { name: "Bags", type: "Other", color: "#64748b", broadType: "Household" }, // Grocery bags, trash bags, zip bags, etc.
  { name: "Other", type: "Other", color: "#64748b", broadType: "Other" }, // Catch-all (should be rarely used)
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










