import { SupportedLocale } from "@/lib/language/language-detection"

export type ReceiptCategorySuggestion = {
  category: string
  confidence: "strong" | "weak"
  score: number
  reason?: string
}

export function getReceiptCategorySuggestion(params: {
  description: string
  categoryNameByLower: Map<string, string>
  locale?: SupportedLocale
}): ReceiptCategorySuggestion | null {
  const description = params.description.trim()
  if (!description) return null

  const normalized = description
    .toLowerCase()
    .normalize("NFKD")
    .replace(/ß/g, "ss")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[_/\\-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  const tokens = normalized.split(" ").filter(Boolean)

  const hasPattern = (pattern: RegExp) => pattern.test(normalized)
  const hasAnyPattern = (patterns: RegExp[]) => patterns.some((pattern) => pattern.test(normalized))

  const hasBeverageSignal =
    hasAnyPattern([
      /\b(drink|bebida|refresco|soda|cola|coke|coca|fanta|sprite|pepsi|soft|sparkling|seltzer|agua|water)\b/,
      /\b(juice|zumo|jugo|suco|nectar|limonada)\b/,
      /\b(energy|energetic|energetica|energizante|isotonic|isotonica)\b/,
      /\b(monster|red\s*bull|redbull|gatorade|powerade|aquarius)\b/,
      /\b(zero|light|diet|sin\s*azucar|sugar\s*free|0%|0\.0)\b/,
      /\b(bottle|botella|can|lata)\b/,
      /\b\d{2,4}\s?(ml|cl|l)\b/,
    ]) || tokens.includes("ml") || tokens.includes("cl")

  const hasSauceSignal = hasAnyPattern([
    /\b(sauce|salsa|ketchup|mayo|mayonesa|bbq|soja|soy|teriyaki)\b/,
  ])

  const hasCleaningSignal = hasAnyPattern([
    /\b(detergent|detergente|lejia|bleach|cleaner|cleaning|limpiador|lavavajillas|dish\s*soap)\b/,
  ])

  const hasEnergySnackSignal = hasAnyPattern([
    /\b(bar|protein|snack|granola|cereal)\b/,
  ])

  const pick = (...candidates: string[]) => {
    for (const candidate of candidates) {
      const key = candidate.trim().toLowerCase()
      const actual = params.categoryNameByLower.get(key)
      if (actual) return actual
    }
    return null
  }

  const strong = (
    category: string | null,
    reason?: string,
    score = 0.82
  ): ReceiptCategorySuggestion | null => {
    if (!category) return null
    return { category, confidence: "strong", score, reason }
  }

  const weak = (category: string | null, reason?: string, score = 0.45): ReceiptCategorySuggestion | null => {
    if (!category) return null
    return { category, confidence: "weak", score, reason }
  }

  const locale = params.locale ?? "unknown"
  if (locale !== "unknown") {
    const localeHit = getLocaleSpecificHint({
      locale,
      normalized,
      pick,
    })
    if (localeHit) return localeHit
  }

  // ===== SPECIFIC PRODUCTS FIRST =====
  // Snacks - BEFORE vegetables (pringles has "onion" but isn't vegetable)
  if (hasPattern(/\b(chips|crisps|pringles|doritos|cheetos|nachos)\b/)) {
    return strong(pick("Salty Snacks", "Other"), "snack", 0.88)
  }
  if (hasPattern(/\b(ice cream|helado|sorbet|cono|conos)\b/)) {
    return strong(pick("Ice Cream & Desserts", "Other"), "dessert", 0.86)
  }

  // Bags / packaging
  if (hasPattern(/\b(bag|bags|bolsa|bolsas)\b/)) {
    return strong(pick("Bags", "Household & Cleaning Supplies", "Other"), "bags", 0.8)
  }

  // Carbs / staples
  if (hasPattern(/\b(rice|arroz|potato|patata)\b/)) {
    return strong(pick("Pasta, Rice & Grains", "Bread", "Other"), "staple", 0.78)
  }
  if (hasPattern(/\b(pasta|spaghetti|noodle|noodles|macaroni|ramen|fideos)\b/)) {
    return strong(pick("Pasta, Rice & Grains", "Other"), "pasta", 0.78)
  }
  if (hasPattern(/\b(bread|baguette|bagel|tortilla|wrap|bun|pan)\b/)) {
    return strong(pick("Bread", "Wraps & Buns", "Other"), "bread", 0.78)
  }

  // Protein
  if (hasPattern(/\b(chicken|pollo|beef|ternera|pork|cerdo|turkey|pavo|lamb|cordero|duck|pato)\b/)) {
    return strong(pick("Meat & Poultry", "Other"), "meat", 0.8)
  }
  if (hasPattern(/\b(sausage|salchicha|ham|jamon|bacon|salami|chorizo|cold cut|deli meat|fiambre|embut|mortad|prosciutto|salchichon|lonchas|charcut|charcuterie|deli)\b/)) {
    return strong(pick("Deli / Cold Cuts", "Meat & Poultry", "Other"), "deli", 0.84)
  }
  if (hasPattern(/\b(salmon|tuna|atun|shrimp|prawn|fish|pescado|seafood|marisco|mariscos)\b/)) {
    return strong(pick("Fish & Seafood", "Other"), "seafood", 0.82)
  }
  if (hasPattern(/\b(egg|eggs|huevo|huevos)\b/)) {
    return strong(pick("Eggs", "Other"), "eggs", 0.82)
  }

  // Dairy
  if (hasPattern(/\b(cheese|queso|mozzarella|cheddar|parmesan|parmesano)\b/)) {
    return strong(pick("Cheese", "Other"), "cheese", 0.84)
  }
  if (hasPattern(/\b(milk|leche|yogurt|yoghurt|yogur|kefir|lacteos|proteina|protein)\b/)) {
    return strong(pick("Dairy (Milk/Yogurt)", "Other"), "dairy", 0.78)
  }
  if (hasPattern(/\b(butter|mantequilla)\b/)) {
    return strong(pick("Oils & Vinegars", "Condiments", "Other"), "butter", 0.72)
  }

  // Fruits & vegetables
  if (hasPattern(/\b(apple|manzana|banana|platano|orange|naranja|grape|uva|strawberry|fresa|avocado|aguacate|peach|melocoton|pear|pera)\b/)) {
    if (!hasBeverageSignal && !hasCleaningSignal && !hasSauceSignal) {
      return strong(pick("Fruits", "Other"), "fruit", 0.78)
    }
  }
  if (hasPattern(/\b(onion|cebolla|carrot|zanahoria|broccoli|brocoli|pepper|pimiento|tomato|tomate|cucumber|pepino|lettuce|lechuga|batata)\b/)) {
    // Skip if product name indicates it's not a vegetable
    if (hasPattern(/\b(pringles|chips|burger)\b/) || hasBeverageSignal || hasSauceSignal || hasCleaningSignal) {
      // Will be caught later by specific patterns
    } else {
      return strong(pick("Vegetables", "Other"), "vegetable", 0.76)
    }
  }
  if (hasPattern(/\b(salad|ensalada)\b/) && hasPattern(/\b(prepared|ready|fresh|lista|preparada)\b/)) {
    return strong(pick("Prepared Salads", "Fresh Ready-to-Eat", "Other"), "prepared-salad", 0.74)
  }
  if (hasPattern(/\b(crema|sopa|soup|cream|pure|gazpacho)\b/) && hasPattern(/\b(calabaza|tomate|verduras|vegetable|pumpkin|lenteja)\b/)) {
    return strong(pick("Canned & Jarred", "Ready Meals", "Other"), "soup", 0.7)
  }

  // Drinks
  if (hasPattern(/\b(water|agua)\b/) && !hasPattern(/\b(coconut|coco)\b/)) {
    return strong(pick("Water", "Other"), "water", 0.86)
  }
  if (
    hasPattern(/\b(energy|energetica|energizante|furious|monster|red\s*bull|redbull|gatorade|powerade|isotonic|isotonica|aquarius)\b/) &&
    !hasEnergySnackSignal
  ) {
    return strong(pick("Energy & Sports Drinks", "Soft Drinks", "Other"), "energy-drink", 0.9)
  }
  if (hasPattern(/\b(cola|coke|coca|soda|refresco|sprite|fanta|pepsi|gaseosa|limonada)\b/)) {
    return strong(pick("Soft Drinks", "Other"), "soft-drink", 0.86)
  }
  // Juice checked after fruits; fruit/veg guard skips when beverage signals are present.
  if (hasPattern(/\b(juice|zumo|jugo|suco|nectar)\b/)) {
    return strong(pick("Juice", "Other"), "juice", 0.86)
  }
  if (hasPattern(/\b(coffee|cafe|tea|te)\b/)) {
    return strong(pick("Coffee & Tea", "Other"), "coffee-tea", 0.8)
  }
  if (hasPattern(/\b(beer|cerveza)\b/)) {
    return strong(pick("Beer", "Other"), "beer", 0.84)
  }
  if (hasPattern(/\b(wine|vino)\b/)) {
    return strong(pick("Wine", "Other"), "wine", 0.84)
  }
  if (hasPattern(/\b(vodka|whisky|whiskey|rum|ron|gin|ginebra|tequila|spirits?)\b/)) {
    return strong(pick("Spirits", "Other"), "spirits", 0.84)
  }

  // Household / personal care
  if (hasPattern(/\b(detergent|detergente|lavadora|lejia|bleach|cleaner|limpiador|dish|lavavajillas)\b/)) {
    return strong(pick("Cleaning Supplies", "Laundry", "Other"), "cleaning", 0.78)
  }
  if (hasPattern(/\b(soap|jabon)\b/) && !hasPattern(/\b(dish|lavavajillas)\b/)) {
    return strong(pick("Hygiene & Toiletries", "Other"), "hygiene", 0.78)
  }
  if (hasPattern(/\b(paper towel|servilleta|tissue|papel|toilet paper|papel higienico)\b/)) {
    return strong(pick("Paper Goods", "Other"), "paper", 0.8)
  }
  if (hasPattern(/\b(shampoo|conditioner|champu|acondicionador)\b/)) {
    return strong(pick("Hair Care", "Other"), "hair-care", 0.78)
  }
  if (hasPattern(/\b(deodorant|desodorante)\b/)) {
    return strong(pick("Hygiene & Toiletries", "Other"), "deodorant", 0.78)
  }
  if (hasPattern(/\b(toothpaste|pasta de dientes|floss|hilo dental|toothbrush|cepillo)\b/)) {
    return strong(pick("Oral Care", "Other"), "oral-care", 0.78)
  }

  // Snacks
  if (hasPattern(/\b(cookie|galleta|biscuit)\b/)) {
    return strong(pick("Cookies & Biscuits", "Other"), "cookies", 0.8)
  }
  if (hasPattern(/\b(chocolate|candy|caramelo|dulce)\b/)) {
    return strong(pick("Chocolate & Candy", "Other"), "candy", 0.8)
  }
  if (hasPattern(/\b(nuts|almonds|almendra|cacahuete|peanut|nuez|semilla)\b/)) {
    return strong(pick("Nuts & Seeds", "Other"), "nuts", 0.8)
  }
  if (hasPattern(/\b(ice cream|helado|sorbet)\b/)) {
    return strong(pick("Ice Cream & Desserts", "Other"), "dessert", 0.82)
  }

  // Frozen
  if (hasPattern(/\b(frozen|congelad)\b/)) {
    if (hasPattern(/\b(pizza|meal|lasagna|burger|nugget)\b/)) {
      return strong(pick("Frozen Meals", "Other"), "frozen-meal", 0.78)
    }
    return strong(pick("Frozen Vegetables & Fruit", "Frozen Meals", "Other"), "frozen", 0.72)
  }

  // Condiments & spreads
  if (hasPattern(/\b(ketchup|mustard|mayo|mayonnaise|mayonesa|salsa|sauce)\b/)) {
    return strong(pick("Sauces", "Condiments", "Other"), "sauces", 0.76)
  }
  if (hasPattern(/\b(jam|mermelada|jelly|honey|miel|nutella|spread)\b/)) {
    return strong(pick("Breakfast & Spreads", "Other"), "spread", 0.74)
  }
  if (hasPattern(/\b(salt|sal|pepper|pimienta|spice|especia|oregano|basil|albahaca)\b/)) {
    return strong(pick("Spices & Seasonings", "Condiments", "Other"), "spice", 0.7)
  }

  // Breakfast items
  if (hasPattern(/\b(cereal|cornflakes|muesli|granola|avena|oat)\b/)) {
    return strong(pick("Breakfast & Spreads", "Other"), "breakfast", 0.72)
  }

  // Prepared/ready meals
  if (hasPattern(/\b(sandwich|bocadillo|wrap|burger|pizza|kebab|relleno|para llevar)\b/)) {
    return strong(pick("Sandwiches / Takeaway", "Ready Meals", "Other"), "takeaway", 0.74)
  }
  if (hasPattern(/\b(ready|preparad|meal|comida|plato)\b/)) {
    return strong(pick("Ready Meals", "Prepared Salads", "Other"), "ready-meal", 0.7)
  }

  // Canned goods
  if (hasPattern(/\b(can|lata|conserva|tin)\b/)) {
    return strong(pick("Canned & Jarred", "Other"), "canned", 0.7)
  }
  if (hasPattern(/\b(beans|legume|lentil|lenteja|chickpea|garbanzo)\b/)) {
    return strong(pick("Legumes", "Canned & Jarred", "Other"), "legumes", 0.72)
  }

  // Fallback: educated guesses
  if (hasPattern(/\b(bio|organic|natural|fresco|fresh)\b/)) {
    return weak(pick("Fruits", "Vegetables", "Fresh Ready-to-Eat", "Other"), "fresh", 0.42)
  }

  const words = tokens
  if (words.length <= 2 && normalized.length > 3) {
    return weak(pick("Vegetables", "Fruits", "Pasta, Rice & Grains", "Other"), "short", 0.4)
  }

  return null
}

export function suggestReceiptCategoryNameFromDescription(params: {
  description: string
  categoryNameByLower: Map<string, string>
}): string | null {
  return getReceiptCategorySuggestion(params)?.category ?? null
}

function getLocaleSpecificHint(params: {
  locale: SupportedLocale
  normalized: string
  pick: (...candidates: string[]) => string | null
}): ReceiptCategorySuggestion | null {
  const { locale, normalized, pick } = params

  const strong = (
    category: string | null,
    reason?: string,
    score = 0.84
  ): ReceiptCategorySuggestion | null => {
    if (!category) return null
    return { category, confidence: "strong", score, reason }
  }

  const patternsByLocale: Record<Exclude<SupportedLocale, "unknown">, Array<{ pattern: RegExp; category: string }>> = {
    es: [
      { pattern: /\b(zumo|jugo)\b/, category: "Juice" },
      { pattern: /\b(pan)\b/, category: "Bread" },
      { pattern: /\b(queso)\b/, category: "Cheese" },
      { pattern: /\b(jamon|fiambre|embutido|embutidos|lonchas)\b/, category: "Deli / Cold Cuts" },
      { pattern: /\b(pollo)\b/, category: "Meat & Poultry" },
      { pattern: /\b(pescado|marisco|mariscos)\b/, category: "Fish & Seafood" },
      { pattern: /\b(leche|yogur|yogurt)\b/, category: "Dairy (Milk/Yogurt)" },
      { pattern: /\b(fruta|frutas)\b/, category: "Fruits" },
      { pattern: /\b(verdura|verduras|hortaliza|hortalizas)\b/, category: "Vegetables" },
      { pattern: /\b(agua)\b/, category: "Water" },
      { pattern: /\b(cerveza)\b/, category: "Beer" },
      { pattern: /\b(vino)\b/, category: "Wine" },
    ],
    en: [],
    pt: [
      { pattern: /\b(sumo|suco)\b/, category: "Juice" },
      { pattern: /\b(pao)\b/, category: "Bread" },
      { pattern: /\b(queijo)\b/, category: "Cheese" },
      { pattern: /\b(presunto|fiambre)\b/, category: "Deli / Cold Cuts" },
      { pattern: /\b(frango)\b/, category: "Meat & Poultry" },
      { pattern: /\b(peixe)\b/, category: "Fish & Seafood" },
      { pattern: /\b(leite|iogurte)\b/, category: "Dairy (Milk/Yogurt)" },
      { pattern: /\b(fruta|frutas)\b/, category: "Fruits" },
      { pattern: /\b(verdura|verduras|legumes)\b/, category: "Vegetables" },
      { pattern: /\b(agua)\b/, category: "Water" },
      { pattern: /\b(cerveja)\b/, category: "Beer" },
      { pattern: /\b(vinho)\b/, category: "Wine" },
    ],
    fr: [
      { pattern: /\b(jus)\b/, category: "Juice" },
      { pattern: /\b(pain)\b/, category: "Bread" },
      { pattern: /\b(fromage)\b/, category: "Cheese" },
      { pattern: /\b(jambon|charcuterie)\b/, category: "Deli / Cold Cuts" },
      { pattern: /\b(poulet)\b/, category: "Meat & Poultry" },
      { pattern: /\b(poisson|fruits de mer)\b/, category: "Fish & Seafood" },
      { pattern: /\b(lait|yaourt|yogourt)\b/, category: "Dairy (Milk/Yogurt)" },
      { pattern: /\b(fruit|fruits)\b/, category: "Fruits" },
      { pattern: /\b(legume|legumes)\b/, category: "Vegetables" },
      { pattern: /\b(eau)\b/, category: "Water" },
      { pattern: /\b(biere)\b/, category: "Beer" },
      { pattern: /\b(vin)\b/, category: "Wine" },
    ],
    it: [
      { pattern: /\b(succo)\b/, category: "Juice" },
      { pattern: /\b(pane)\b/, category: "Bread" },
      { pattern: /\b(formaggio)\b/, category: "Cheese" },
      { pattern: /\b(prosciutto|salumi)\b/, category: "Deli / Cold Cuts" },
      { pattern: /\b(pollo)\b/, category: "Meat & Poultry" },
      { pattern: /\b(pesce|frutti di mare)\b/, category: "Fish & Seafood" },
      { pattern: /\b(latte|yogurt)\b/, category: "Dairy (Milk/Yogurt)" },
      { pattern: /\b(frutta)\b/, category: "Fruits" },
      { pattern: /\b(verdura|verdure)\b/, category: "Vegetables" },
      { pattern: /\b(acqua)\b/, category: "Water" },
      { pattern: /\b(birra)\b/, category: "Beer" },
      { pattern: /\b(vino)\b/, category: "Wine" },
    ],
    de: [
      { pattern: /\b(saft)\b/, category: "Juice" },
      { pattern: /\b(brot)\b/, category: "Bread" },
      { pattern: /\b(kase|kaese)\b/, category: "Cheese" },
      { pattern: /\b(schinken|wurst)\b/, category: "Deli / Cold Cuts" },
      { pattern: /\b(huhn|hahnchen|geflugel)\b/, category: "Meat & Poultry" },
      { pattern: /\b(fisch|meeresfruchte)\b/, category: "Fish & Seafood" },
      { pattern: /\b(milch|joghurt)\b/, category: "Dairy (Milk/Yogurt)" },
      { pattern: /\b(obst)\b/, category: "Fruits" },
      { pattern: /\b(gemuse)\b/, category: "Vegetables" },
      { pattern: /\b(wasser)\b/, category: "Water" },
      { pattern: /\b(bier)\b/, category: "Beer" },
      { pattern: /\b(wein)\b/, category: "Wine" },
    ],
    nl: [
      { pattern: /\b(sap)\b/, category: "Juice" },
      { pattern: /\b(brood)\b/, category: "Bread" },
      { pattern: /\b(kaas)\b/, category: "Cheese" },
      { pattern: /\b(vleeswaren|ham|worst)\b/, category: "Deli / Cold Cuts" },
      { pattern: /\b(kip)\b/, category: "Meat & Poultry" },
      { pattern: /\b(vis|zeevruchten)\b/, category: "Fish & Seafood" },
      { pattern: /\b(melk|yoghurt)\b/, category: "Dairy (Milk/Yogurt)" },
      { pattern: /\b(fruit)\b/, category: "Fruits" },
      { pattern: /\b(groente|groenten)\b/, category: "Vegetables" },
      { pattern: /\b(water)\b/, category: "Water" },
      { pattern: /\b(bier)\b/, category: "Beer" },
      { pattern: /\b(wijn)\b/, category: "Wine" },
    ],
    ca: [
      { pattern: /\b(suc)\b/, category: "Juice" },
      { pattern: /\b(pa)\b/, category: "Bread" },
      { pattern: /\b(formatge)\b/, category: "Cheese" },
      { pattern: /\b(pernil|embotit)\b/, category: "Deli / Cold Cuts" },
      { pattern: /\b(pollastre)\b/, category: "Meat & Poultry" },
      { pattern: /\b(peix|marisc)\b/, category: "Fish & Seafood" },
      { pattern: /\b(llet|iogurt)\b/, category: "Dairy (Milk/Yogurt)" },
      { pattern: /\b(fruita)\b/, category: "Fruits" },
      { pattern: /\b(verdura|verdures)\b/, category: "Vegetables" },
      { pattern: /\b(aigua)\b/, category: "Water" },
      { pattern: /\b(cervesa)\b/, category: "Beer" },
      { pattern: /\b(vi)\b/, category: "Wine" },
    ],
  }

  if (locale === "unknown") return null
  const patterns = patternsByLocale[locale as Exclude<SupportedLocale, "unknown">]
  if (!patterns || patterns.length === 0) return null

  for (const entry of patterns) {
    if (entry.pattern.test(normalized)) {
      return strong(pick(entry.category, "Other"), `locale:${locale}`)
    }
  }

  return null
}
