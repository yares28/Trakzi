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
  if (/\b(rice|arroz|potato|patata)\b/.test(normalized)) {
    return pick("Pasta, Rice & Grains", "Bread", "Other")
  }
  if (/\b(pasta|spaghetti|noodle|noodles|macaroni|ramen)\b/.test(normalized)) {
    return pick("Pasta, Rice & Grains", "Other")
  }
  if (/\b(bread|baguette|bagel|tortilla|wrap|bun)\b/.test(normalized)) {
    return pick("Bread", "Wraps & Buns", "Other")
  }

  // Protein
  if (/\b(chicken|pollo|beef|ternera|pork|cerdo|turkey|pavo)\b/.test(normalized)) {
    return pick("Meat & Poultry", "Other")
  }
  if (/\b(sausage|salchicha|ham|jamon|bacon|salami|chorizo|cold cut|deli meat)\b/.test(normalized)) {
    return pick("Deli / Cold Cuts", "Meat & Poultry", "Other")
  }
  if (/\b(salmon|salm[oó]n|tuna|atun|shrimp|prawn|fish|pescado|seafood|marisco)\b/.test(normalized)) {
    return pick("Fish & Seafood", "Other")
  }
  if (/\b(egg|eggs|huevo|huevos)\b/.test(normalized)) {
    return pick("Eggs", "Other")
  }

  // Dairy
  if (/\b(cheese|queso)\b/.test(normalized)) {
    return pick("Cheese", "Other")
  }
  if (/\b(milk|leche|yogurt|yoghurt|yogur|proteina|protein)\b/.test(normalized)) {
    return pick("Dairy (Milk/Yogurt)", "Other")
  }
  if (/\b(butter|mantequilla)\b/.test(normalized)) {
    return pick("Oils & Vinegars", "Condiments", "Other")
  }

  // Fruits & vegetables
  if (/\b(apple|manzana|banana|platano|orange|naranja|grape|uva|strawberry|fresa|avocado|aguacate|peach|melocoton)\b/.test(normalized)) {
    return pick("Fruits", "Other")
  }
  if (/\b(onion|cebolla|carrot|zanahoria|broccoli|brocoli|pepper|pimiento|tomato|tomate|cucumber|pepino|lettuce|lechuga)\b/.test(normalized)) {
    return pick("Vegetables", "Other")
  }
  if (/\b(salad|ensalada)\b/.test(normalized) && /\b(prepared|ready|fresh)\b/.test(normalized)) {
    return pick("Prepared Salads", "Fresh Ready-to-Eat", "Other")
  }
  if (/\b(crema|sopa|soup|cream|pure|gaz)\b/.test(normalized) && /\b(calabaza|tomate|verduras|vegetable|pumpkin|lenteja)\b/.test(normalized)) {
    return pick("Canned & Jarred", "Ready Meals", "Other")
  }

  // Drinks
  if (/\b(water|agua)\b/.test(normalized) && !/\b(coconut|coco)\b/.test(normalized)) {
    return pick("Water", "Other")
  }
  if (/\b(energy|energetica|energizante|furious|monster|berries.*zero|aquarius)\b/.test(normalized)) {
    return pick("Energy & Sports Drinks", "Soft Drinks", "Other")
  }
  if (/\b(cola|coke|coca|soda|refresco|sprite|fanta|pepsi)\b/.test(normalized)) {
    return pick("Soft Drinks", "Other")
  }
  if (/\b(juice|zumo)\b/.test(normalized)) {
    return pick("Juice", "Other")
  }
  if (/\b(coffee|cafe|tea|te)\b/.test(normalized)) {
    return pick("Coffee & Tea", "Other")
  }
  if (/\b(beer|cerveza)\b/.test(normalized)) {
    return pick("Beer", "Other")
  }
  if (/\b(wine|vino)\b/.test(normalized)) {
    return pick("Wine", "Other")
  }
  if (/\b(vodka|whisky|whiskey|rum|ron|gin|ginebra|tequila|spirits?)\b/.test(normalized)) {
    return pick("Spirits", "Other")
  }

  // Household / personal care
  if (/\b(detergent|lavadora|lejia|bleach|cleaner|limpiador|dish|lavavajillas)\b/.test(normalized)) {
    return pick("Cleaning Supplies", "Laundry", "Other")
  }
  if (/\b(soap|jabon)\b/.test(normalized) && !/\b(dish|lavavajillas)\b/.test(normalized)) {
    return pick("Hygiene & Toiletries", "Other")
  }
  if (/\b(paper towel|servilleta|tissue|papel)\b/.test(normalized)) {
    return pick("Paper Goods", "Other")
  }
  if (/\b(shampoo|conditioner)\b/.test(normalized)) {
    return pick("Hair Care", "Other")
  }
  if (/\b(deodorant|desodorante)\b/.test(normalized)) {
    return pick("Hygiene & Toiletries", "Other")
  }
  if (/\b(toothpaste|pasta de dientes|floss|hilo dental|toothbrush|cepillo)\b/.test(normalized)) {
    return pick("Oral Care", "Other")
  }

  return null
}
