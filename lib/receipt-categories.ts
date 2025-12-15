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
  { name: "Fiber", color: "#10b981" }, // Green
  { name: "Vitamins/Minerals", color: "#3b82f6" }, // Blue
  { name: "Other", color: "#64748b" }, // Slate
]

// Default Food Categories organized by Macronutrient Type
export const DEFAULT_RECEIPT_CATEGORIES: ReceiptCategory[] = [
  // PROTEIN
  { name: "Meat", type: "Protein", color: "#dc2626", broadType: "Food" }, // Chicken, beef, pork, sausage, bacon, etc.
  { name: "Fish & Seafood", type: "Protein", color: "#ea580c", broadType: "Food" }, // Shrimp, crab, cod, tuna, salmon, etc.
  { name: "Deli", type: "Protein", color: "#c2410c", broadType: "Food" }, // Cheese, salami, ham, turkey, etc.
  { name: "Eggs", type: "Protein", color: "#991b1b", broadType: "Food" },
  { name: "Plant-Based Protein", type: "Protein", color: "#7f1d1d", broadType: "Food" }, // Tofu, tempeh, seitan, etc.

  // CARBS
  { name: "Bread & Bakery", type: "Carbs", color: "#d97706", broadType: "Food" }, // Bread, tortillas, pies, muffins, bagels, cookies, etc.
  { name: "Pasta, Rice & Cereal", type: "Carbs", color: "#b45309", broadType: "Food" }, // Oats, granola, brown rice, white rice, macaroni, noodles, etc.
  { name: "Snacks", type: "Carbs", color: "#92400e", broadType: "Food" }, // Chips, pretzels, popcorn, crackers, etc.
  { name: "Baking", type: "Carbs", color: "#78350f", broadType: "Food" }, // Flour, powdered sugar, baking powder, cocoa, etc.

  // FAT
  { name: "Dairy", type: "Fat", color: "#fbbf24", broadType: "Food" }, // Butter, cheese, milk, yogurt, etc.
  { name: "Condiments & Spices", type: "Fat", color: "#f59e0b", broadType: "Food" }, // Black pepper, oregano, cinnamon, sugar, olive oil, ketchup, mayonnaise, etc.
  { name: "Oils & Fats", type: "Fat", color: "#d97706", broadType: "Food" }, // Olive oil, vegetable oil, coconut oil, etc.

  // FIBER
  { name: "Fruits", type: "Fiber", color: "#059669", broadType: "Food" }, // Apples, bananas, grapes, oranges, strawberries, avocados, peaches, etc.
  { name: "Vegetables", type: "Fiber", color: "#047857", broadType: "Food" }, // Potatoes, onions, carrots, salad greens, broccoli, peppers, tomatoes, cucumbers, etc.
  { name: "Canned Goods", type: "Fiber", color: "#065f46", broadType: "Food" }, // Soup, tuna, fruit, beans, vegetables, pasta sauce, etc.

  // VITAMINS/MINERALS
  { name: "Frozen Foods", type: "Vitamins/Minerals", color: "#2563eb", broadType: "Food" }, // Pizza, fish, potatoes, ready meals, ice cream, etc.
  { name: "Water", type: "Vitamins/Minerals", color: "#0ea5e9", broadType: "Drinks" }, // Bottled water, sparkling water, etc.
  { name: "Soda & Cola", type: "Vitamins/Minerals", color: "#1d4ed8", broadType: "Drinks" }, // Cola, soda, fizzy drinks, etc.
  { name: "Energy Drinks", type: "Vitamins/Minerals", color: "#f59e0b", broadType: "Drinks" }, // Energy drinks, sports drinks, etc.
  { name: "Juice", type: "Vitamins/Minerals", color: "#3b82f6", broadType: "Drinks" }, // Juice, smoothies, etc.
  { name: "Coffee & Tea", type: "Vitamins/Minerals", color: "#6b7280", broadType: "Drinks" }, // Coffee, tea, teabags, etc.
  { name: "Alcohol", type: "Vitamins/Minerals", color: "#9333ea", broadType: "Drinks" }, // Beer, wine, spirits, etc.
  { name: "Beverages", type: "Vitamins/Minerals", color: "#1d4ed8", broadType: "Drinks" }, // Coffee, teabags, milk, juice, soda, beer, wine, etc.
  { name: "Drinks", type: "Vitamins/Minerals", color: "#1e40af", broadType: "Drinks" }, // Energy drinks, fizzy drinks, water, milk, juice, alcohol, etc.
  { name: "Health Care", type: "Vitamins/Minerals", color: "#1e3a8a", broadType: "Health Care" }, // Saline, band-aid, cleaning alcohol, pain killers, antacids, etc.

  // OTHER (No specific macronutrient)
  { name: "Personal Care", type: "Vitamins/Minerals", color: "#1e40af", broadType: "Personal Care" }, // Shampoo, conditioner, deodorant, toothpaste, dental floss, etc.
  { name: "Household & Cleaning Supplies", type: "Vitamins/Minerals", color: "#1e3a8a", broadType: "Household" }, // Laundry detergent, dish soap, dishwashing liquid, paper towels, tissues, trash bags, aluminum foil, zip bags, etc.
  { name: "Baby Items", type: "Vitamins/Minerals", color: "#1e40af", broadType: "Personal Care" }, // Baby food, diapers, wet wipes, lotion, etc.
  { name: "Pet Care", type: "Vitamins/Minerals", color: "#1e3a8a", broadType: "Pet Care" }, // Pet food, kitty litter, chew toys, pet treats, pet shampoo, etc.
  { name: "Bags", type: "Other", color: "#64748b", broadType: "Household" }, // Grocery bags, trash bags, zip bags, etc.
  { name: "Other", type: "Vitamins/Minerals", color: "#64748b", broadType: "Other" }, // Catch-all
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
