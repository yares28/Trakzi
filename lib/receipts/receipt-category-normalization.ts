type CategoryResolver = (input: string | null | undefined) => string | null

const STOPWORDS = new Set([
  "and",
  "the",
  "for",
  "of",
  "with",
  "y",
  "e",
  "de",
  "del",
  "la",
  "las",
  "el",
  "los",
  "por",
  "para",
  "con",
  "da",
  "do",
  "das",
  "dos",
  "du",
  "des",
  "le",
  "les",
  "au",
  "aux",
  "et",
  "en",
  "und",
  "oder",
  "mit",
  "von",
  "der",
  "die",
  "das",
  "den",
  "dem",
  "im",
  "zum",
  "zur",
  "ein",
  "eine",
  "van",
  "het",
  "een",
])

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  "Fruits": ["fruit", "fruits", "fruta", "frutas", "frutta", "obst", "fruita"],
  "Vegetables": [
    "vegetable",
    "vegetables",
    "veg",
    "veggies",
    "verdura",
    "verduras",
    "vegetal",
    "vegetales",
    "verdure",
    "gemuse",
    "groente",
    "verdures",
  ],
  "Herbs & Fresh Aromatics": ["herb", "herbs", "fresh herbs", "aromatics", "hierbas", "hierbas frescas", "aromaticas"],
  "Meat & Poultry": [
    "meat",
    "meats",
    "poultry",
    "carne",
    "carnes",
    "pollo",
    "beef",
    "pork",
    "chicken",
    "turkey",
    "viande",
    "frango",
    "fleisch",
    "geflugel",
    "kip",
    "pollastre",
  ],
  "Fish & Seafood": ["fish", "seafood", "pescado", "marisco", "mariscos", "poisson", "pesce", "fisch", "vis", "peix"],
  "Eggs": ["egg", "eggs", "huevo", "huevos"],
  "Dairy (Milk/Yogurt)": [
    "dairy",
    "milk",
    "yogurt",
    "yoghurt",
    "yogur",
    "leche",
    "lacteos",
    "lait",
    "latte",
    "milch",
    "melk",
    "llet",
  ],
  "Cheese": ["cheese", "queso", "fromage", "queijo", "formaggio", "kase", "kaese", "kaas", "formatge"],
  "Deli / Cold Cuts": [
    "deli",
    "cold cuts",
    "coldcuts",
    "charcuterie",
    "charcut",
    "fiambre",
    "embutido",
    "embutidos",
    "jamon",
    "ham",
    "salami",
    "mortadela",
    "mortadella",
    "prosciutto",
    "chorizo",
    "salchichon",
    "deli meat",
    "deli meats",
    "wurst",
    "schinken",
    "vleeswaren",
    "pernil",
    "embotit",
  ],
  "Fresh Ready-to-Eat": ["ready to eat", "ready-to-eat", "fresh ready", "prepared fresh"],
  "Bread": ["bread", "pan", "baguette", "pao", "pain", "pane", "brot", "brood", "pa"],
  "Pastries": ["pastry", "pastries", "bolleria", "bakery", "croissant"],
  "Wraps & Buns": ["wrap", "wraps", "bun", "buns", "tortilla", "tortillas"],
  "Pasta, Rice & Grains": ["pasta", "rice", "grain", "grains", "arroz", "noodles", "spaghetti"],
  "Legumes": ["legume", "legumes", "lentil", "lentils", "lenteja", "lentejas", "garbanzo", "garbanzos", "beans"],
  "Canned & Jarred": ["canned", "canned goods", "jarred", "tinned", "conserva", "conservas", "enlatado", "enlatados"],
  "Sauces": ["sauce", "sauces", "salsa", "salsas", "tomato sauce", "pasta sauce", "bbq sauce"],
  "Condiments": ["condiment", "condiments", "condimento", "condimentos", "aderezo", "aderezos"],
  "Spices & Seasonings": ["spice", "spices", "seasoning", "seasonings", "especia", "especias"],
  "Oils & Vinegars": ["oil", "oils", "aceite", "aceites", "vinegar", "vinagre"],
  "Baking Ingredients": ["baking", "flour", "harina", "levadura", "yeast", "baking ingredients"],
  "Breakfast & Spreads": ["breakfast", "spread", "spreads", "cereal", "cereals", "mermelada", "jam", "honey", "miel"],
  "Salty Snacks": ["salty snacks", "snacks", "snack", "chips", "crisps", "aperitivos", "patatas fritas"],
  "Cookies & Biscuits": ["cookies", "cookie", "biscuits", "biscuit", "galletas"],
  "Chocolate & Candy": ["chocolate", "candy", "sweets", "dulces", "caramelos"],
  "Nuts & Seeds": ["nuts", "seeds", "frutos secos", "nueces", "almendras", "semillas"],
  "Ice Cream & Desserts": ["ice cream", "dessert", "desserts", "helado", "helados", "postre", "postres"],
  "Water": ["water", "agua", "eau", "acqua", "wasser", "aigua"],
  "Soft Drinks": ["soft drink", "soft drinks", "soda", "sodas", "refresco", "refrescos", "cola", "gaseosa"],
  "Juice": ["juice", "juices", "zumo", "zumos", "jugo", "jugos", "suco", "succo", "jus", "saft", "sap", "suc"],
  "Coffee & Tea": ["coffee", "tea", "cafe", "te", "caffe", "the", "cha"],
  "Energy & Sports Drinks": ["energy drink", "energy drinks", "sports drink", "sports drinks", "energetica", "isotonica"],
  "Beer": ["beer", "cerveza", "cervezas", "biere", "cerveja", "birra", "bier", "cervesa"],
  "Wine": ["wine", "vino", "vinos", "vin", "vinho", "wein", "wijn", "vi"],
  "Spirits": ["spirits", "spirit", "liquor", "licor", "whisky", "whiskey", "vodka", "ron", "rum", "gin", "tequila"],
  "Low/No Alcohol": ["non alcoholic", "non-alcoholic", "alcohol free", "sin alcohol", "0.0", "0%"],
  "Frozen Vegetables & Fruit": ["frozen vegetables", "frozen veggies", "frozen fruit", "congelado verduras", "congelado fruta"],
  "Frozen Meals": ["frozen meals", "frozen meal", "frozen food", "frozen dinner", "congelados"],
  "Ready Meals": ["ready meal", "ready meals", "prepared meal", "prepared meals", "comida preparada", "plato preparado"],
  "Prepared Salads": ["prepared salad", "prepared salads", "ensalada preparada", "ensaladas preparadas"],
  "Sandwiches / Takeaway": ["sandwich", "sandwiches", "bocadillo", "bocadillos", "takeaway", "to go", "para llevar"],
  "OTC Medicine": ["otc", "over the counter", "medicine", "medicines", "medicamento", "medicamentos"],
  "Supplements": ["supplement", "supplements", "suplemento", "suplementos"],
  "First Aid": ["first aid", "primeros auxilios"],
  "Hygiene & Toiletries": ["hygiene", "toiletries", "higiene", "aseo"],
  "Hair Care": ["hair care", "shampoo", "champu", "conditioner", "acondicionador"],
  "Skin Care": ["skin care", "skincare", "cuidado piel", "crema"],
  "Oral Care": ["oral care", "dental", "toothpaste", "pasta de dientes", "cepillo"],
  "Cosmetics": ["cosmetics", "cosmetic", "maquillaje", "cosmetica"],
  "Cleaning Supplies": ["cleaning", "cleaner", "cleaners", "limpieza", "detergent", "detergente", "bleach", "lejia"],
  "Laundry": ["laundry", "lavanderia", "detergente ropa", "softener"],
  "Paper Goods": ["paper goods", "paper", "papel", "tissue", "toilet paper"],
  "Kitchen Consumables": ["kitchen consumables", "foil", "film", "wrap", "aluminum foil"],
  "Storage (containers, zip bags)": ["storage", "container", "containers", "zip bags", "zipbag", "tupper", "tupperware"],
  "Baby (Diapers & Wipes)": ["diapers", "wipes", "panales", "toallitas"],
  "Baby Food": ["baby food", "comida bebe", "pure bebe"],
  "Pet Food": ["pet food", "alimento mascota", "comida mascota"],
  "Pet Supplies": ["pet supplies", "pet care", "mascota"],
  "Bags": ["bag", "bags", "bolsa", "bolsas"],
  "Other": ["other", "otros", "varios", "misc", "miscellaneous"],
}

function normalizeCategoryKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/ß/g, "ss")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function stripStopwords(key: string): string {
  if (!key) return ""
  const tokens = key.split(" ").filter((token) => token && !STOPWORDS.has(token))
  return tokens.join(" ")
}

function singularizeToken(token: string): string {
  if (token.endsWith("ies") && token.length > 3) return `${token.slice(0, -3)}y`
  if (token.endsWith("es") && token.length > 3) return token.slice(0, -2)
  if (token.endsWith("s") && token.length > 3) return token.slice(0, -1)
  return token
}

function singularizeKey(key: string): string {
  if (!key) return ""
  return key
    .split(" ")
    .map((token) => singularizeToken(token))
    .join(" ")
}

function buildKeys(value: string): string[] {
  const base = normalizeCategoryKey(value)
  if (!base) return []
  const noStop = stripStopwords(base)
  const singular = singularizeKey(base)
  const singularNoStop = singularizeKey(noStop)
  const keys = new Set<string>([base, noStop, singular, singularNoStop].filter(Boolean))
  return Array.from(keys)
}

export function createReceiptCategoryResolver(allowedCategories: string[]): CategoryResolver {
  const allowedSet = new Set(allowedCategories.map((category) => category.toLowerCase()))
  const normalizedToCategory = new Map<string, string>()

  const addKey = (key: string, category: string) => {
    if (!key) return
    if (!normalizedToCategory.has(key)) {
      normalizedToCategory.set(key, category)
    }
  }

  const addKeysForLabel = (label: string, category: string) => {
    buildKeys(label).forEach((key) => addKey(key, category))
  }

  allowedCategories.forEach((category) => addKeysForLabel(category, category))

  Object.entries(CATEGORY_SYNONYMS).forEach(([category, synonyms]) => {
    if (!allowedSet.has(category.toLowerCase())) return
    synonyms.forEach((label) => addKeysForLabel(label, category))
  })

  return (input: string | null | undefined) => {
    if (!input || typeof input !== "string") return null
    const key = normalizeCategoryKey(input)
    if (!key) return null
    const direct = normalizedToCategory.get(key)
    if (direct) return direct
    const noStop = stripStopwords(key)
    const fallbackDirect = normalizedToCategory.get(noStop)
    if (fallbackDirect) return fallbackDirect
    const singular = singularizeKey(key)
    const singularMatch = normalizedToCategory.get(singular)
    if (singularMatch) return singularMatch
    const singularNoStop = singularizeKey(noStop)
    return normalizedToCategory.get(singularNoStop) ?? null
  }
}
