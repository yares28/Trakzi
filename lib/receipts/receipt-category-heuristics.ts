export function suggestReceiptCategoryNameFromDescription(params: {
  description: string
  categoryNameByLower: Map<string, string>
}): string | null {
  const description = params.description.trim()
  if (!description) return null

  const normalized = description
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")

  const pick = (...candidates: string[]) => {
    for (const candidate of candidates) {
      const key = candidate.trim().toLowerCase()
      const actual = params.categoryNameByLower.get(key)
      if (actual) return actual
    }
    return null
  }

  // Bags / packaging
  if (/\b(bag|bags|bolsa|bolsas)\b/.test(normalized)) {
    return pick("Bags", "Household & Cleaning Supplies", "Other")
  }

  // Carbs / staples
  if (/\b(rice|arroz)\b/.test(normalized)) {
    return pick("Pasta, Rice & Cereal", "Bread & Bakery", "Other")
  }
  if (/\b(pasta|spaghetti|noodle|noodles|macaroni|ramen)\b/.test(normalized)) {
    return pick("Pasta, Rice & Cereal", "Other")
  }
  if (/\b(bread|baguette|bagel|tortilla|wrap|bun)\b/.test(normalized)) {
    return pick("Bread & Bakery", "Other")
  }

  // Protein
  if (/\b(chicken|pollo|beef|ternera|pork|cerdo|sausage|salchicha|ham|jamon|turkey|pavo|bacon)\b/.test(normalized)) {
    return pick("Meat", "Deli", "Other")
  }
  if (/\b(salmon|salm[oó]n|tuna|atun|shrimp|prawn|fish|pescado|seafood|marisco)\b/.test(normalized)) {
    return pick("Fish & Seafood", "Other")
  }
  if (/\b(egg|eggs|huevo|huevos)\b/.test(normalized)) {
    return pick("Eggs", "Other")
  }

  // Dairy
  if (/\b(milk|leche|yogurt|yoghurt|yogur|cheese|queso|butter|mantequilla)\b/.test(normalized)) {
    return pick("Dairy", "Deli", "Other")
  }

  // Fruits & vegetables
  if (/\b(apple|manzana|banana|platano|orange|naranja|grape|uva|strawberry|fresa|avocado|aguacate|peach|melocoton)\b/.test(normalized)) {
    return pick("Fruits", "Other")
  }
  if (/\b(potato|patata|onion|cebolla|carrot|zanahoria|broccoli|brocoli|pepper|pimiento|tomato|tomate|cucumber|pepino|lettuce|lechuga|salad|ensalada)\b/.test(normalized)) {
    return pick("Vegetables", "Other")
  }

  // Drinks
  if (/\b(water|agua)\b/.test(normalized)) {
    return pick("Water", "Drinks", "Beverages", "Other")
  }
  if (/\b(energy)\b/.test(normalized)) {
    return pick("Energy Drinks", "Drinks", "Beverages", "Other")
  }
  if (/\b(cola|coke|coca|soda|refresco)\b/.test(normalized)) {
    return pick("Soda & Cola", "Drinks", "Beverages", "Other")
  }
  if (/\b(juice|zumo)\b/.test(normalized)) {
    return pick("Juice", "Drinks", "Beverages", "Other")
  }
  if (/\b(coffee|cafe|tea|te)\b/.test(normalized)) {
    return pick("Coffee & Tea", "Drinks", "Beverages", "Other")
  }
  if (/\b(beer|cerveza|wine|vino|alcohol)\b/.test(normalized)) {
    return pick("Alcohol", "Drinks", "Beverages", "Other")
  }

  // Household / personal care
  if (/\b(detergent|lavadora|lejia|bleach|cleaner|limpiador|dish|lavavajillas|soap|jabon|paper towel|servilleta)\b/.test(normalized)) {
    return pick("Household & Cleaning Supplies", "Other")
  }
  if (/\b(shampoo|conditioner|deodorant|toothpaste|pasta de dientes|floss|hilo dental)\b/.test(normalized)) {
    return pick("Personal Care", "Other")
  }

  return null
}
