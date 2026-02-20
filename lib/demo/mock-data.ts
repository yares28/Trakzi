/**
 * Centralized mock data for demo mode.
 *
 * All types intentionally kept as plain objects (no imports from
 * aggregation modules) so this file has zero server-side dependencies.
 * The shapes must match the JSON each real API route returns.
 */

// ═══════════════════════════════════════════════════════
// Shared helpers
// ═══════════════════════════════════════════════════════

/** Generate dates relative to "today" so charts always look current */
function daysAgo(n: number): string {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

function monthsAgo(n: number): string {
    const d = new Date()
    d.setMonth(d.getMonth() - n)
    return d.toISOString().slice(0, 7) // YYYY-MM
}

/** Seeded pseudo-random to avoid layout shift on hydration */
function seeded(seed: number): number {
    const x = Math.sin(seed * 9301 + 49297) * 49297
    return x - Math.floor(x)
}

// ═══════════════════════════════════════════════════════
// MASTER CATEGORIES LIST (12 Expense + Income + Savings)
// ═══════════════════════════════════════════════════════

const CATEGORIES_CONFIG = [
    { name: "Groceries", color: "#22c55e", type: "expense", min: 30, max: 150, freq: 0.25 },
    { name: "Dining", color: "#a855f7", type: "expense", min: 15, max: 80, freq: 0.15 },
    { name: "Transport", color: "#ec4899", type: "expense", min: 10, max: 50, freq: 0.15 },
    { name: "Shopping", color: "#f97316", type: "expense", min: 25, max: 120, freq: 0.12 },
    { name: "Entertainment", color: "#8b5cf6", type: "expense", min: 15, max: 90, freq: 0.10 },
    { name: "Utilities", color: "#f59e0b", type: "expense", min: 60, max: 200, freq: 0.05 },
    { name: "Medical/Healthcare", color: "#14b8a6", type: "expense", min: 40, max: 150, freq: 0.04 },
    { name: "Travel", color: "#0ea5e9", type: "expense", min: 100, max: 500, freq: 0.03 },
    { name: "Education", color: "#6366f1", type: "expense", min: 50, max: 300, freq: 0.03 },
    { name: "Personal Care", color: "#db2777", type: "expense", min: 20, max: 80, freq: 0.03 },
    { name: "Gifts/Donations", color: "#f43f5e", type: "expense", min: 30, max: 100, freq: 0.03 },
    { name: "Subscriptions", color: "#ef4444", type: "expense", min: 10, max: 30, freq: 0.02 },

    // Fixed / Monthly items (freq 0 means manually added)
    { name: "Housing", color: "#06b6d4", type: "expense", min: 1200, max: 1200, freq: 0 },
    { name: "Income", color: "#3b82f6", type: "income", min: 3200, max: 3200, freq: 0 },
    { name: "Freelance", color: "#3b82f6", type: "income", min: 300, max: 800, freq: 0.1 },
]

export const MOCK_CATEGORIES = CATEGORIES_CONFIG.map((c, i) => ({
    id: i + 1,
    name: c.name,
    color: c.color,
    broad_type: c.type === 'income' ? 'Other' : ['Groceries', 'Housing', 'Utilities', 'Transport', 'Medical/Healthcare'].includes(c.name) ? 'Essentials' : 'Wants'
}))

// ═══════════════════════════════════════════════════════
// TRANSACTIONS GENERATOR
// ═══════════════════════════════════════════════════════

export const MOCK_TRANSACTIONS = (() => {
    const items = []
    let currentBalance = 4250.50
    let idCounter = 1

    // Generate for 6 months (approx 180 days)
    for (let day = 0; day < 180; day++) {
        const date = daysAgo(day)
        const dateObj = new Date(date)
        const isStartOfMonth = dateObj.getDate() === 1

        // Fixed monthly transactions
        if (isStartOfMonth) {
            // Salary
            items.push({
                id: idCounter++,
                date,
                description: "Monthly Salary",
                amount: 3200.00,
                category: "Income",
                color: "#3b82f6",
                type: "income",
                balance: currentBalance += 3200
            })
            // Rent
            items.push({
                id: idCounter++,
                date,
                description: "Rent Payment",
                amount: -1200.00,
                category: "Housing",
                color: "#06b6d4",
                type: "expense",
                balance: currentBalance -= 1200
            })
            // Internet
            items.push({
                id: idCounter++,
                date,
                description: "Fiber Internet",
                amount: -49.99,
                category: "Utilities",
                color: "#f59e0b",
                type: "expense",
                balance: currentBalance -= 49.99
            })
        }

        // Random daily transactions
        const seed = day * 1337
        const numTransactions = Math.floor(seeded(seed) * 4) // 0 to 3 per day

        for (let i = 0; i < numTransactions; i++) {
            // Cumulative weighted selection
            const catSeed = seeded(seed + i * 100)
            let cumulative = 0
            const threshold = catSeed * CATEGORIES_CONFIG.reduce((sum, c) => sum + c.freq, 0)
            let cat = CATEGORIES_CONFIG[0]

            for (const c of CATEGORIES_CONFIG) {
                if (c.freq === 0) continue // Skip fixed monthly items
                cumulative += c.freq
                if (threshold < cumulative) {
                    cat = c
                    break
                }
            }

            // Amount
            const amtSeed = seeded(seed + i * 200)
            const amt = Math.round((cat.min + amtSeed * (cat.max - cat.min)) * 100) / 100
            const realAmount = cat.type === 'expense' ? -amt : amt

            // Descriptions map
            const descriptions: Record<string, string[]> = {
                "Groceries": ["Mercadona", "Lidl", "Carrefour", "Aldi", "Local Market", "Costco"],
                "Dining": ["Starbucks", "McDonalds", "Local Cafe", "Italian Bistro", "Sushi Place", "Burger King"],
                "Transport": ["Uber", "Metro", "Gas Station", "Bus Ticket", "Parking", "Train Ticket"],
                "Shopping": ["Amazon", "Zara", "H&M", "IKEA", "Decathlon", "Fnac", "El Corte Inglés"],
                "Entertainment": ["Cinema", "Netflix", "Spotify", "Bowling", "Concert", "Museum"],
                "Utilities": ["Water Bill", "Electric Bill", "Phone Bill", "Heating", "Solar Panel Maint."],
                "Medical/Healthcare": ["Pharmacy", "Dentist", "Doctor Visit", "Optician", "Physio"],
                "Travel": ["Flight", "Hotel", "Train", "Airbnb", "Car Rental", "Resort Fee"],
                "Freelance": ["Web Design Project", "Consulting Fee", "Logo Design"],
                "Education": ["Udemy Course", "Books", "Workshop", "Tuition"],
                "Personal Care": ["Haircut", "Hym", "Cosmetics", "Spa"],
                "Gifts/Donations": ["Birthday Gift", "Charity Donation", "Wedding Gift"],
                "Subscriptions": ["Netflix", "Spotify", "Amazon Prime", "Adobe Creative Cloud"],
            }

            const descOptions = descriptions[cat.name] || [cat.name]
            const desc = descOptions[Math.floor(seeded(seed + i * 300) * descOptions.length)]

            currentBalance += realAmount
            items.push({
                id: idCounter++,
                date,
                description: desc,
                amount: realAmount,
                category: cat.name === "Freelance" ? "Income" : cat.name,
                color: cat.color,
                type: cat.type,
                balance: Math.round(currentBalance * 100) / 100
            })
        }
    }

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})()

// ═══════════════════════════════════════════════════════
// DERIVED AGGREGATIONS (Single Source of Truth)
// ═══════════════════════════════════════════════════════

// Helpers
const groupBy = <T>(arr: T[], keyFn: (item: T) => string) => {
    return arr.reduce((acc, item) => {
        const key = keyFn(item)
        if (!acc[key]) acc[key] = []
        acc[key].push(item)
        return acc
    }, {} as Record<string, T[]>)
}

const expenses = MOCK_TRANSACTIONS.filter(t => t.type === 'expense')
const income = MOCK_TRANSACTIONS.filter(t => t.type === 'income')
const totalIncome = income.reduce((sum, t) => sum + t.amount, 0)
const totalExpense = Math.abs(expenses.reduce((sum, t) => sum + t.amount, 0))
const netSavings = totalIncome - totalExpense

// Top Categories (for Home Bundle)
const spendingByCategory = Object.entries(groupBy(expenses, t => t.category)).map(([catName, txs]) => {
    const total = Math.abs(txs.reduce((sum, t) => sum + t.amount, 0))
    const config = CATEGORIES_CONFIG.find(c => c.name === catName)
    return {
        category: catName,
        total,
        count: txs.length,
        color: config?.color || "#94a3b8",
        percentage: 0 // calculated below
    }
}).sort((a, b) => b.total - a.total)
const totalSpending = spendingByCategory.reduce((sum, c) => sum + c.total, 0)
spendingByCategory.forEach(c => c.percentage = Math.round((c.total / totalSpending) * 1000) / 10)

// Monthly Categories (for Analytics Bundle)
const monthlyCategoryData: { month: number; category: string; total: number }[] = []
const txsByMonth = groupBy(expenses, t => t.date.slice(0, 7)) // YYYY-MM
Object.entries(txsByMonth).forEach(([monthStr, txs]) => {
    const monthNum = parseInt(monthStr.split('-')[1])
    const byCat = groupBy(txs, t => t.category)
    Object.entries(byCat).forEach(([catName, catTxs]) => {
        const total = Math.abs(catTxs.reduce((sum, t) => sum + t.amount, 0))
        monthlyCategoryData.push({ month: monthNum, category: catName, total: Math.round(total) })
    })
})

// Trends Data (Category spending over time)
const trendCategories = CATEGORIES_CONFIG.filter(c => c.type === 'expense').map(c => c.name)
const allMonths = Object.keys(txsByMonth).sort()
const categoryTrends: Record<string, Array<{ date: string; value: number }>> = {}

trendCategories.forEach(cat => {
    categoryTrends[cat] = allMonths.map(monthStr => {
        const monthTxs = txsByMonth[monthStr] || []
        const total = Math.abs(monthTxs.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0))
        return {
            date: monthStr + "-01",
            value: Math.round(total * 100) / 100
        }
    })
})

// FRIDGE AGGREGATIONS
const groceryTxs = expenses.filter(t => t.category === "Groceries")
const totalGrocerySpend = Math.abs(groceryTxs.reduce((sum, t) => sum + t.amount, 0))
const stores = ["Mercadona", "Lidl", "Carrefour", "Aldi", "Local Market", "Costco"]
const storeSpending = stores.map(store => {
    const txs = groceryTxs.filter(t => t.description.includes(store))
    return {
        storeName: store,
        total: Math.abs(txs.reduce((sum, t) => sum + t.amount, 0)),
        count: txs.length
    }
}).filter(s => s.count > 0).sort((a, b) => b.total - a.total)

// Simulated Macronutrients (assign random type relative to store/amount if real data missing)
// We'll deterministically assign based on transaction ID
const groceryItems = groceryTxs.map(t => {
    const seed = t.id * 7
    const rand = seeded(seed)
    let type = "Nutritious"
    if (rand < 0.3) type = "Snacks"
    else if (rand < 0.5) type = "Other"

    return { ...t, broadType: type }
})

const macros = Object.values(groupBy(groceryItems, t => t.broadType)).map(txs => ({
    typeName: txs[0].broadType,
    total: Math.abs(txs.reduce((sum, t) => sum + t.amount, 0)),
    color: txs[0].broadType === "Nutritious" ? "#22c55e" : txs[0].broadType === "Snacks" ? "#f97316" : "#94a3b8"
}))

// Hourly Heatmap (Simulate hours based on day of week + random seed)
const hourlyData = []
for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
        // More active on weekends (5,6) and evenings (17-20)
        let weight = 0.1
        if (h >= 17 && h <= 20) weight += 0.4
        if ((d === 5 || d === 6) && h >= 10 && h <= 14) weight += 0.5

        const count = Math.floor(seeded(d * 24 + h) * weight * 5)
        if (count > 0) {
            hourlyData.push({
                hour: h,
                dayOfWeek: d,
                total: count * 45, // Avg spend
                count: count
            })
        }
    }
}

// ═══════════════════════════════════════════════════════
// HOME BUNDLE
// ═══════════════════════════════════════════════════════

export const MOCK_HOME_BUNDLE = {
    kpis: {
        totalIncome,
        totalExpense,
        netSavings,
        transactionCount: MOCK_TRANSACTIONS.length,
        avgTransaction: Math.round(totalExpense / expenses.length) || 0,
    },
    topCategories: spendingByCategory.slice(0, 8),
    activityRings: spendingByCategory.slice(0, 5).map(c => ({
        category: c.category,
        spent: c.total,
        percentage: Math.min(100, Math.round((c.total / 1500) * 100)),
        color: c.color
    })),
    dailySpending: Array.from({ length: 180 }, (_, i) => {
        const d = daysAgo(179 - i)
        const dayTxs = expenses.filter(t => t.date === d)
        return {
            date: d,
            total: Math.abs(dayTxs.reduce((sum, t) => sum + t.amount, 0))
        }
    }),
    recentTransactions: MOCK_TRANSACTIONS.length,
}

// ═══════════════════════════════════════════════════════
// ANALYTICS BUNDLE
// ═══════════════════════════════════════════════════════

export const MOCK_ANALYTICS_BUNDLE = {
    kpis: {
        totalIncome,
        totalExpense,
        netSavings,
        transactionCount: MOCK_TRANSACTIONS.length,
        avgTransaction: Math.round(totalExpense / expenses.length),
    },
    totalIncome,
    totalExpense,
    netSavings,
    transactionCount: MOCK_TRANSACTIONS.length,
    avgTransaction: Math.round(totalExpense / expenses.length),
    hasDataInOtherPeriods: true,

    categorySpending: spendingByCategory,

    dailySpending: Array.from({ length: 180 }, (_, i) => {
        const d = daysAgo(179 - i)
        const dayTxs = MOCK_TRANSACTIONS.filter(t => t.date === d)
        const dayInc = dayTxs.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
        const dayExp = Math.abs(dayTxs.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))
        return {
            date: d,
            total: dayExp,
            income: dayInc,
            expense: dayExp
        }
    }),

    monthlyCategories: monthlyCategoryData,

    dayOfWeekSpending: Array.from({ length: 7 }, (_, dayIdx) => {
        const txs = expenses.filter(t => new Date(t.date).getDay() === dayIdx)
        return {
            dayOfWeek: dayIdx,
            total: Math.abs(txs.reduce((sum, t) => sum + t.amount, 0)),
            count: txs.length
        }
    }),

    dayOfWeekCategory: (() => {
        const result: { dayOfWeek: number; category: string; total: number }[] = []
        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
            const txs = expenses.filter(t => new Date(t.date).getDay() === dayIdx)
            const byCat = groupBy(txs, t => t.category)
            Object.entries(byCat).forEach(([cat, list]) => {
                const total = Math.abs(list.reduce((s, t) => s + t.amount, 0))
                if (total > 0) {
                    result.push({ dayOfWeek: dayIdx, category: cat, total })
                }
            })
        }
        return result
    })(),

    transactionHistory: expenses.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        category: t.category,
        color: t.color,
    })),

    needsWants: [
        { classification: "Essentials" as const, total: spendingByCategory.filter(c => ['Housing', 'Groceries', 'Utilities', 'Transport', 'Medical/Healthcare'].includes(c.category)).reduce((s, c) => s + c.total, 0), count: 0 },
        { classification: "Wants" as const, total: spendingByCategory.filter(c => !['Housing', 'Groceries', 'Utilities', 'Transport', 'Medical/Healthcare'].includes(c.category)).reduce((s, c) => s + c.total, 0), count: 0 },
    ],

    cashFlow: {
        nodes: [
            { id: "salary", label: "Salary" },
            { id: "freelance", label: "Freelance" },
            { id: "total-cash", label: "Total Cash" },
            { id: "savings", label: "Savings" },
            ...spendingByCategory.map(c => ({ id: c.category.toLowerCase().replace(/[^a-z0-9]/g, '-'), label: c.category }))
        ],
        links: [
            { source: "salary", target: "total-cash", value: income.filter(t => t.category === "Income" || t.description.includes("Salary")).reduce((s, t) => s + t.amount, 0) },
            { source: "freelance", target: "total-cash", value: income.filter(t => t.category !== "Income" && !t.description.includes("Salary")).reduce((s, t) => s + t.amount, 0) },
            ...spendingByCategory.map(c => ({ source: "total-cash", target: c.category.toLowerCase().replace(/[^a-z0-9]/g, '-'), value: c.total })),
            { source: "total-cash", target: "savings", value: Math.max(0, netSavings) }
        ],
    },

    monthlyByCategory: monthlyCategoryData.map(m => {
        // Map month number back to a relative date string.
        // We find the matching YYYY-MM key from the txsByMonth object keys
        // logic: Month 12 is this month, 11 is last month, etc. (based on how we built monthlyCategoryData)
        // Actually, monthlyCategoryData was built from monthNum = parseInt(YYYY-MM part)
        // so we just need to reconstruct the YYYY-MM string that matches that integer.
        // But since we have 7 months spanning a year boundary maybe, it's safer to look it up.
        // Let's keep it simple: find the key in txsByMonth that parses to this int.
        const foundKey = Object.keys(txsByMonth).find(k => parseInt(k.split('-')[1]) === m.month)
        return {
            month: foundKey || `2026-${String(m.month).padStart(2, '0')}`,
            category: m.category,
            total: m.total
        }
    }),

    spendingPyramid: spendingByCategory.map(c => ({
        category: c.category,
        userTotal: c.total,
        userPercent: c.percentage,
        avgTotal: c.total * 0.9,
        avgPercent: c.percentage
    })),

    treeMapData: (() => {
        const categoryMap = new Map<string, { total: number; subcategories: Map<string, { amount: number; fullDescription: string }> }>()
        const getSubCategoryLabel = (description?: string) => {
            if (!description) return "Misc"
            const delimiterSplit = description.split(/[-??"|]/)[0] ?? description
            const trimmed = delimiterSplit.trim()
            return trimmed.length > 24 ? `${trimmed.slice(0, 21)}...` : (trimmed || "Misc")
        }

        expenses.forEach(tx => {
            const category = tx.category || "Other"
            const amount = Math.abs(tx.amount)

            if (!categoryMap.has(category)) {
                categoryMap.set(category, { total: 0, subcategories: new Map() })
            }

            const categoryEntry = categoryMap.get(category)!
            categoryEntry.total += amount

            const subCategory = getSubCategoryLabel(tx.description)
            const existing = categoryEntry.subcategories.get(subCategory)

            if (existing) {
                existing.amount += amount
            } else {
                categoryEntry.subcategories.set(subCategory, {
                    amount,
                    fullDescription: tx.description || subCategory,
                })
            }
        })

        const maxSubCategories = 5
        const children = Array.from(categoryMap.entries())
            .map(([name, { total, subcategories }]) => {
                const sortedSubs = Array.from(subcategories.entries()).sort((a, b) => b[1].amount - a[1].amount)
                const topSubs = sortedSubs.slice(0, maxSubCategories)
                const remainingTotal = sortedSubs.slice(maxSubCategories).reduce((sum, [, value]) => sum + value.amount, 0)

                const subChildren = topSubs.map(([subName, { amount: loc, fullDescription }]) => ({
                    name: subName,
                    loc,
                    fullDescription,
                }))

                if (remainingTotal > 0) {
                    subChildren.push({ name: "Other", loc: remainingTotal, fullDescription: "Other transactions" })
                }

                return {
                    name,
                    children: subChildren.length > 0 ? subChildren : [{ name, loc: total, fullDescription: name }],
                }
            })
            .sort((a, b) => {
                const aTotal = (a.children || []).reduce((sum, child) => sum + (child.loc || 0), 0)
                const bTotal = (b.children || []).reduce((sum, child) => sum + (child.loc || 0), 0)
                return bTotal - aTotal
            })

        return {
            name: "Expenses",
            children
        }
    })()
}

// ═══════════════════════════════════════════════════════
// BUDGETS
// ═══════════════════════════════════════════════════════

export const MOCK_BUDGETS = spendingByCategory.slice(0, 5).map((c, i) => ({
    id: i + 1,
    category: c.category,
    amount: Math.round(c.total * 1.1),
    spent: c.total,
    period: "monthly"
}))

// ═══════════════════════════════════════════════════════
// FINANCIAL HEALTH (radar chart data)
// ═══════════════════════════════════════════════════════

export const MOCK_FINANCIAL_HEALTH = (() => {
    const currentYear = new Date().getFullYear()
    const selectedYears = [currentYear]

    // Aggregate income and expenses per year
    const yearAggregates: Record<number, { income: number; expenses: number }> = {}
    selectedYears.forEach(y => { yearAggregates[y] = { income: 0, expenses: 0 } })

    MOCK_TRANSACTIONS.forEach(t => {
        const txYear = new Date(t.date).getFullYear()
        if (!yearAggregates[txYear]) return
        if (t.amount > 0) {
            yearAggregates[txYear].income += t.amount
        } else {
            yearAggregates[txYear].expenses += Math.abs(t.amount)
        }
    })

    const data: Record<string, string | number>[] = []

    // Income row
    const incomeRow: Record<string, string | number> = { capability: "Income" }
    selectedYears.forEach(y => { incomeRow[y.toString()] = Math.round(yearAggregates[y].income * 100) / 100 })
    data.push(incomeRow)

    // Expenses row
    const expensesRow: Record<string, string | number> = { capability: "Expenses" }
    selectedYears.forEach(y => { expensesRow[y.toString()] = Math.round(yearAggregates[y].expenses * 100) / 100 })
    data.push(expensesRow)

    // Per-category spending rows
    const categoryYearTotals: Record<string, Record<number, number>> = {}
    MOCK_TRANSACTIONS.filter(t => t.type === 'expense').forEach(t => {
        const txYear = new Date(t.date).getFullYear()
        if (!selectedYears.includes(txYear)) return
        const cat = t.category
        if (!categoryYearTotals[cat]) categoryYearTotals[cat] = {}
        categoryYearTotals[cat][txYear] = (categoryYearTotals[cat][txYear] || 0) + Math.abs(t.amount)
    })

    const sortedCategories = Object.entries(categoryYearTotals)
        .map(([cat, yearTotals]) => ({ cat, total: Object.values(yearTotals).reduce((s, v) => s + v, 0) }))
        .sort((a, b) => b.total - a.total)

    sortedCategories.forEach(({ cat }) => {
        const row: Record<string, string | number> = { capability: cat }
        selectedYears.forEach(y => { row[y.toString()] = Math.round((categoryYearTotals[cat][y] || 0) * 100) / 100 })
        data.push(row)
    })

    const years = selectedYears.map(y => ({
        year: y,
        income: Math.round(yearAggregates[y].income * 100) / 100,
        expenses: Math.round(yearAggregates[y].expenses * 100) / 100,
        savings: Math.round(Math.max(0, yearAggregates[y].income - yearAggregates[y].expenses) * 100) / 100,
    }))

    return { data, years }
})()

// ═══════════════════════════════════════════════════════
// DAILY TRANSACTIONS
// ═══════════════════════════════════════════════════════

export const MOCK_DAILY_TRANSACTIONS = MOCK_ANALYTICS_BUNDLE.dailySpending

// ═══════════════════════════════════════════════════════
// FRIDGE BUNDLE
// ═══════════════════════════════════════════════════════

export const MOCK_FRIDGE_BUNDLE = {
    kpis: {
        totalSpent: totalGrocerySpend,
        shoppingTrips: groceryTxs.length,
        storesVisited: storeSpending.length,
        averageReceipt: Math.round(totalGrocerySpend / groceryTxs.length) || 0,
        itemCount: Math.round(groceryTxs.length * 5.5),
    },

    categorySpending: groceryItems.reduce((acc, item) => {
        const cats = ["Fruits", "Vegetables", "Meat & Poultry", "Dairy (Milk/Yogurt)", "Salty Snacks", "Chocolate & Candy", "Pastries", "Soft Drinks", "Bread", "Coffee & Tea"]
        const catBroadTypes: Record<string, string> = {
            "Fruits": "Nutritious",
            "Vegetables": "Nutritious",
            "Meat & Poultry": "Nutritious",
            "Dairy (Milk/Yogurt)": "Nutritious",
            "Salty Snacks": "Snacks",
            "Chocolate & Candy": "Snacks",
            "Pastries": "Snacks",
            "Soft Drinks": "Other",
            "Bread": "Nutritious",
            "Coffee & Tea": "Other",
        }
        const subCat = cats[item.id % cats.length]

        const existing = acc.find(c => c.category === subCat)
        const amt = Math.abs(item.amount)
        if (existing) { existing.total += amt; existing.count++; }
        else {
            acc.push({
                category: subCat,
                total: amt,
                count: 1,
                color: item.color,
                broadType: catBroadTypes[subCat]
            })
        }
        return acc
    }, [] as any[]),

    dailySpending: Array.from({ length: 180 }, (_, i) => {
        const d = daysAgo(179 - i)
        const dayTxs = groceryTxs.filter(t => t.date === d)
        return {
            date: d,
            total: Math.abs(dayTxs.reduce((sum, t) => sum + t.amount, 0))
        }
    }),

    storeSpending,

    macronutrientBreakdown: macros,

    dayOfWeekSpending: Array.from({ length: 7 }, (_, d) => {
        const txs = groceryTxs.filter(t => new Date(t.date).getDay() === d)
        return {
            dayOfWeek: d,
            total: Math.abs(txs.reduce((sum, t) => sum + t.amount, 0)),
            count: txs.length
        }
    }),

    dayOfWeekCategory: (() => {
        const result: { dayOfWeek: number; category: string; total: number }[] = []
        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
            const txs = groceryTxs.filter(t => new Date(t.date).getDay() === dayIdx)
            const subCatMap: Record<string, number> = {}
            txs.forEach(t => {
                const cats = ["Fruits", "Vegetables", "Meat & Poultry", "Dairy (Milk/Yogurt)", "Salty Snacks", "Chocolate & Candy", "Pastries", "Soft Drinks", "Bread", "Coffee & Tea"]
                const subCat = cats[t.id % cats.length]
                subCatMap[subCat] = (subCatMap[subCat] || 0) + Math.abs(t.amount)
            })
            Object.entries(subCatMap).forEach(([cat, val]) => {
                result.push({ dayOfWeek: dayIdx, category: cat, total: Math.round(val * 100) / 100 })
            })
        }
        return result
    })(),

    monthlyCategories: (() => {
        const monthlyData: { month: number; category: string; total: number }[] = []
        const gTxsByMonth = groupBy(groceryTxs, t => t.date.slice(0, 7)) // YYYY-MM
        Object.entries(gTxsByMonth).forEach(([monthStr, txs]) => {
            const monthNum = parseInt(monthStr.split('-')[1])
            const subCatMap: Record<string, number> = {}
            txs.forEach(t => {
                const cats = ["Fruits", "Vegetables", "Meat & Poultry", "Dairy (Milk/Yogurt)", "Salty Snacks", "Chocolate & Candy", "Pastries", "Soft Drinks", "Bread", "Coffee & Tea"]
                const subCat = cats[t.id % cats.length]
                subCatMap[subCat] = (subCatMap[subCat] || 0) + Math.abs(t.amount)
            })
            Object.entries(subCatMap).forEach(([cat, val]) => {
                monthlyData.push({ month: monthNum, category: cat, total: Math.round(val * 100) / 100 })
            })
        })
        return monthlyData
    })(),
    hourlyActivity: (() => {
        const result: { hour: number; total: number; count: number }[] = []
        for (let h = 0; h < 24; h++) {
            let weight = 0.1
            if (h >= 17 && h <= 20) weight += 0.4
            if (h >= 10 && h <= 14) weight += 0.2

            const count = Math.floor(seeded(h * 100) * weight * 8)
            if (count > 0) {
                result.push({
                    hour: h,
                    total: Math.round(count * 52.5 * 100) / 100,
                    count: count
                })
            }
        }
        return result
    })(),

    hourDayHeatmap: hourlyData,
    dayMonthHeatmap: (() => {
        const result: { dayOfWeek: number; month: number; total: number; count: number }[] = []
        const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        for (const month of months) {
            for (let day = 0; day < 7; day++) {
                let weight = 0.1
                if (day === 5 || day === 6) weight += 0.3

                const count = Math.floor(seeded(month * 100 + day * 10) * weight * 6)
                if (count > 0) {
                    result.push({
                        dayOfWeek: day,
                        month: month,
                        total: Math.round(count * 85 * 100) / 100,
                        count: count
                    })
                }
            }
        }
        return result
    })(),

    categoryRankings: (() => {
        const cats = ["Fruits", "Vegetables", "Meat & Poultry", "Dairy (Milk/Yogurt)", "Salty Snacks", "Chocolate & Candy", "Pastries", "Soft Drinks", "Bread", "Coffee & Tea"]
        return cats.map((cat, i) => ({
            category: cat,
            rank: i + 1,
            total: Math.round(500 - i * 40 + seeded(i * 50) * 100),
            previousRank: i === 0 ? 2 : i === 1 ? 1 : i + 1
        }))
    })(),
}

// ═══════════════════════════════════════════════════════
// FRIDGE RECEIPT TRANSACTIONS
// ═══════════════════════════════════════════════════════

const RECEIPT_CATEGORIES = [
    { name: "Fruits", color: "#22c55e", broadType: "Nutritious" },
    { name: "Vegetables", color: "#047857", broadType: "Nutritious" },
    { name: "Meat & Poultry", color: "#ef4444", broadType: "Nutritious" },
    { name: "Dairy (Milk/Yogurt)", color: "#3b82f6", broadType: "Nutritious" },
    { name: "Salty Snacks", color: "#f97316", broadType: "Snacks" },
    { name: "Chocolate & Candy", color: "#78350f", broadType: "Snacks" },
    { name: "Pastries", color: "#a855f7", broadType: "Snacks" },
    { name: "Soft Drinks", color: "#06b6d4", broadType: "Other" },
    { name: "Bread", color: "#d97706", broadType: "Nutritious" },
    { name: "Coffee & Tea", color: "#6b7280", broadType: "Other" },
]

const RECEIPT_ITEM_NAMES: Record<string, string[]> = {
    "Fruits": ["Organic Bananas", "Apples", "Oranges", "Strawberries", "Grapes", "Pears", "Mango"],
    "Vegetables": ["Avocados", "Tomatoes", "Spinach", "Broccoli", "Carrots", "Bell Peppers", "Cucumber", "Lettuce"],
    "Meat & Poultry": ["Chicken Breast", "Ground Beef", "Pork Chops", "Turkey Bacon", "Sausages", "Salmon Fillet"],
    "Dairy (Milk/Yogurt)": ["Whole Milk", "Greek Yogurt", "Cheddar Cheese", "Eggs (12pk)", "Butter", "Cream Cheese"],
    "Salty Snacks": ["Potato Chips", "Tortilla Chips", "Pretzels", "Popcorn", "Crackers"],
    "Chocolate & Candy": ["Chocolate Bar", "Cookies", "Candy", "Gummy Bears"],
    "Pastries": ["Croissants", "Muffins", "Donuts", "Danish Pastry"],
    "Soft Drinks": ["Cola", "Sparkling Water", "Lemonade", "Soda"],
    "Bread": ["Sourdough Bread", "Bagels", "Baguette", "Tortillas", "Whole Wheat Bread"],
    "Coffee & Tea": ["Coffee Beans", "Green Tea", "Black Tea", "Espresso"],
}

export const MOCK_RECEIPT_TRANSACTIONS = (() => {
    const items: any[] = []
    let idCounter = 1
    let receiptIdCounter = 1

    const storeNames = ["Mercadona", "Lidl", "Carrefour", "Aldi", "Whole Foods", "Costco"]

    for (let day = 0; day < 60; day++) {
        const date = daysAgo(day)
        const seed = day * 777

        if (seeded(seed) > 0.35) continue

        const storeName = storeNames[Math.floor(seeded(seed + 1) * storeNames.length)]
        const receiptId = `rcpt_${receiptIdCounter++}`
        const hour = Math.floor(seeded(seed + 2) * 12) + 8
        const time = `${String(hour).padStart(2, '0')}:${String(Math.floor(seeded(seed + 3) * 60)).padStart(2, '0')}`

        const numItems = Math.floor(seeded(seed + 4) * 8) + 3
        let receiptTotal = 0

        for (let i = 0; i < numItems; i++) {
            const catIdx = Math.floor(seeded(seed + 10 + i) * RECEIPT_CATEGORIES.length)
            const category = RECEIPT_CATEGORIES[catIdx]
            const itemNames = RECEIPT_ITEM_NAMES[category.name]
            const itemName = itemNames[Math.floor(seeded(seed + 20 + i) * itemNames.length)]

            const quantity = Math.floor(seeded(seed + 30 + i) * 3) + 1
            const pricePerUnit = Math.round((1.5 + seeded(seed + 40 + i) * 8) * 100) / 100
            const totalPrice = Math.round(pricePerUnit * quantity * 100) / 100

            receiptTotal += totalPrice

            items.push({
                id: idCounter++,
                date: date, // For compatibility with filterByPeriod
                receiptId: receiptId,
                storeName: storeName,
                receiptDate: date,
                receiptTime: time,
                receiptTotalAmount: 0,
                receiptStatus: "reviewed",
                description: itemName,
                quantity: quantity,
                pricePerUnit: pricePerUnit,
                totalPrice: totalPrice,
                categoryId: catIdx + 1,
                categoryTypeId: category.broadType === "Nutritious" ? 1 : category.broadType === "Snacks" ? 2 : 3,
                categoryName: category.name,
                categoryColor: category.color,
                categoryTypeName: category.broadType,
                categoryTypeColor: category.broadType === "Nutritious" ? "#22c55e" : category.broadType === "Snacks" ? "#f97316" : "#94a3b8",
            })
        }

        for (let i = items.length - numItems; i < items.length; i++) {
            items[i].receiptTotalAmount = Math.round(receiptTotal * 100) / 100
        }
    }

    return items.sort((a, b) => new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime())
})()

// ═══════════════════════════════════════════════════════
// GROCERY VS RESTAURANT DATA
// ═══════════════════════════════════════════════════════

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const currentYear = new Date().getFullYear()

export const MOCK_GROCERY_VS_RESTAURANT = (() => {
    const groceryTx = MOCK_TRANSACTIONS.filter(t =>
        t.category === "Groceries" && t.type === "expense"
    )
    const diningTx = MOCK_TRANSACTIONS.filter(t =>
        t.category === "Dining" && t.type === "expense"
    )

    const monthlyData = new Map<string, { month: string; "Home Food": number; "Outside Food": number }>()

    groceryTx.forEach(t => {
        const date = new Date(t.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`

        if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, { month: monthLabel, "Home Food": 0, "Outside Food": 0 })
        }
        monthlyData.get(monthKey)!["Home Food"] += Math.abs(t.amount)
    })

    diningTx.forEach(t => {
        const date = new Date(t.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`

        if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, { month: monthLabel, "Home Food": 0, "Outside Food": 0 })
        }
        monthlyData.get(monthKey)!["Outside Food"] += Math.abs(t.amount)
    })

    return Array.from(monthlyData.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([_, value]) => ({
            ...value,
            "Home Food": Math.round(value["Home Food"] * 100) / 100,
            "Outside Food": Math.round(value["Outside Food"] * 100) / 100,
        }))
})()

// ═══════════════════════════════════════════════════════
// SAVINGS BUNDLE
// ═══════════════════════════════════════════════════════

// Derive Savings chart from income vs expense accumulation
const savingsChartData = (() => {
    let cumulative = 0
    // Generate last 12 months (or 7 since that's our horizon)
    return Array.from({ length: 180 }, (_, i) => {
        const d = daysAgo(179 - i)
        const dayInc = income.filter(t => t.date === d).reduce((s, t) => s + t.amount, 0)
        const dayExp = Math.abs(expenses.filter(t => t.date === d).reduce((s, t) => s + t.amount, 0))
        cumulative += (dayInc - dayExp)
        return {
            date: d,
            amount: dayInc - dayExp,
            cumulative: cumulative
        }
    }).filter((_, i) => i % 15 === 0) // decimate for chart
})()

export const MOCK_SAVINGS_BUNDLE = {
    kpis: {
        totalSaved: netSavings,
        savingsRate: Math.round((netSavings / totalIncome) * 100),
        transactionCount: income.length, // approximation
        avgSavingsPerTransaction: Math.round(netSavings / 30), // per month approx
    },
    chartData: savingsChartData
}

// ═══════════════════════════════════════════════════════
// POCKETS BUNDLE (countries / vehicles / properties)
// ═══════════════════════════════════════════════════════

export const MOCK_POCKETS_BUNDLE = {
    countries: [
        {
            instance_id: 1,
            country_name: "Spain",
            country_code: "ES",
            total_spent: totalExpense * 0.8,
            transaction_count: expenses.length * 0.8,
            first_visit: daysAgo(365),
            last_visit: daysAgo(0),
            label: "Home",
        },
        // We added a "Travel" category, let's map it here
        {
            instance_id: 2,
            country_name: "France",
            country_code: "FR",
            total_spent: spendingByCategory.find(c => c.category === "Travel")?.total || 0,
            transaction_count: spendingByCategory.find(c => c.category === "Travel")?.count || 0,
            first_visit: daysAgo(60),
            last_visit: daysAgo(55),
            label: "Trip",
        }
    ],
    vehicles: [
        {
            id: 1,
            type: "vehicle",
            name: "Toyota Corolla",
            metadata: { make: "Toyota", model: "Corolla", year: 2020, licensePlate: "1234 ABC" },
            totalSpent: spendingByCategory.find(c => c.category === "Transport")?.total || 0,
            transactionCount: spendingByCategory.find(c => c.category === "Transport")?.count || 0,
        },
    ],
    properties: [
        {
            id: 2,
            type: "property",
            name: "Main Apartment",
            metadata: { address: "123 Main St", type: "apartment" },
            totalSpent: spendingByCategory.find(c => c.category === "Housing")?.total || 0,
            transactionCount: spendingByCategory.find(c => c.category === "Housing")?.count || 0,
        },
    ],
    other: [],
    travelStats: {
        countriesVisited: 2,
        totalSpent: totalExpense,
        totalTransactions: expenses.length,
    },
    garageStats: {
        vehicleCount: 1,
        totalSpent: spendingByCategory.find(c => c.category === "Transport")?.total || 0,
        avgPerVehicle: spendingByCategory.find(c => c.category === "Transport")?.total || 0,
    },
    propertyStats: {
        propertyCount: 1,
        totalSpent: spendingByCategory.find(c => c.category === "Housing")?.total || 0,
        avgPerProperty: spendingByCategory.find(c => c.category === "Housing")?.total || 0,
        totalMortgage: 0,
        totalInsurance: 1200,
        totalMaintenance: 600,
        totalUtilities: 2400,
        totalTax: 800,
        totalOther: 0,
    },
    otherStats: {
        itemCount: 0,
        totalSpent: 0,
        avgPerItem: 0,
    },
}

// ═══════════════════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════════════════

export const MOCK_DASHBOARD_STATS = {
    analytics: {
        transactionCount: MOCK_TRANSACTIONS.length,
        score: 72,
        needsPercent: 53,
        wantsPercent: 25,
        savingsPercent: 15,
        otherPercent: 7,
        hasEnoughTransactions: true,
        minRequired: 100,
        breakdown: {
            needs: spendingByCategory.filter(c => ['Housing', 'Groceries', 'Utilities'].includes(c.category)).reduce((s, c) => s + c.total, 0),
            wants: spendingByCategory.filter(c => ['Dining', 'Shopping', 'Entertainment', 'Travel'].includes(c.category)).reduce((s, c) => s + c.total, 0),
            savings: netSavings,
            other: 0
        },
        scoreHistory: [
            { month: monthsAgo(5), score: 58, otherPercent: 12 },
            { month: monthsAgo(4), score: 62, otherPercent: 10 },
            { month: monthsAgo(3), score: 65, otherPercent: 9 },
            { month: monthsAgo(2), score: 68, otherPercent: 8 },
            { month: monthsAgo(1), score: 70, otherPercent: 7 },
            { month: monthsAgo(0), score: 72, otherPercent: 7 },
        ],
    },
    fridge: {
        transactionCount: groceryTxs.length,
        score: 68,
        healthyPercent: 69,
        unhealthyPercent: 14,
        hasEnoughTransactions: true,
        minRequired: 200,
        breakdown: { healthy: 336, unhealthy: 68, neutral: 83 },
        itemCounts: { healthy: 38, unhealthy: 14, neutral: 16 },
    },
    savings: {
        transactionCount: MOCK_TRANSACTIONS.length,
        totalIncome,
        totalExpenses: totalExpense,
        actualSavings: netSavings,
        savingsRate: Math.round((netSavings / totalIncome) * 100),
        score: 75,
        monthlyAvgSavings: Math.round(netSavings / 7),
        targetSavings: 1500,
        gap: 1500 - Math.round(netSavings / 7),
        trend: {
            direction: "improving" as const,
            change: 4.2,
            currentMonthRate: 33.5,
            previousMonthRate: 29.3,
        },
        scoreHistory: [
            { month: monthsAgo(5), score: 60, savingsRate: 22 },
            { month: monthsAgo(4), score: 63, savingsRate: 25 },
            { month: monthsAgo(3), score: 67, savingsRate: 28 },
            { month: monthsAgo(2), score: 70, savingsRate: 29 },
            { month: monthsAgo(1), score: 73, savingsRate: 32 },
            { month: monthsAgo(0), score: 75, savingsRate: 33.5 },
        ],
    },
    trends: {
        transactionCount: MOCK_TRANSACTIONS.length,
        categoryCount: spendingByCategory.length,
        monthCount: 6,
        score: 65,
        categoryAnalysis: spendingByCategory.slice(0, 5).map(c => ({
            category: c.category,
            userPercent: Math.round(c.percentage),
            avgPercent: 15,
            status: "average" as const,
            difference: 0
        })),
    },
    comparison: {
        userCount: 1247,
        analytics: { userRank: 312, avgScore: 58, percentile: 75 },
        fridge: { userRank: 445, avgScore: 52, percentile: 64 },
        savings: { userRank: 287, avgScore: 48, percentile: 77 },
        trends: { userRank: 520, avgScore: 55, percentile: 58 },
    },
}

// ═══════════════════════════════════════════════════════
// DATA LIBRARY BUNDLE
// ═══════════════════════════════════════════════════════

export const MOCK_DATA_LIBRARY_BUNDLE = {
    transactions: MOCK_TRANSACTIONS.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        balance: t.balance,
        category: t.category,
    })),

    stats: {
        totalIncome,
        totalExpenses: totalExpense,
        savingsRate: Math.round((netSavings / totalIncome) * 100),
        netWorth: netSavings,
        incomeChange: 8.2,
        expensesChange: -3.5,
        savingsRateChange: 4.2,
        netWorthChange: 12.1,
    },

    statements: [
        {
            id: "1",
            name: "bank_statement_jan_2026.csv",
            type: "Income/Expenses",
            date: new Date(Date.now() - 30 * 86400000).toISOString(),
            reviewer: "System",
            statementId: 1,
            fileId: null,
            receiptId: null,
        },
    ],

    categories: MOCK_CATEGORIES.map((c, i) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        createdAt: new Date(Date.now() - (i + 1) * 30 * 86400000).toISOString(),
        transactionCount: spendingByCategory.find(s => s.category === c.name)?.count || 0,
        totalSpend: spendingByCategory.find(s => s.category === c.name)?.total || 0,
        totalAmount: 0, // Placeholder
        broadType: c.broad_type,
    })),

    userFiles: [],
    receiptCategoryTypes: [
        { id: 1, name: "Nutritious", color: "#22c55e", createdAt: daysAgo(90), categoryCount: 4, transactionCount: 38, totalSpend: 336.10 },
        { id: 2, name: "Snacks", color: "#f97316", createdAt: daysAgo(90), categoryCount: 3, transactionCount: 14, totalSpend: 67.80 },
        { id: 3, name: "Other", color: "#94a3b8", createdAt: daysAgo(90), categoryCount: 2, transactionCount: 16, totalSpend: 83.40 },
    ],

    receiptCategories: [],
    receiptTransactionsCount: groceryTxs.length,
    userCategoriesCount: 4,
}

// ═══════════════════════════════════════════════════════
// SUBSCRIPTION
// ═══════════════════════════════════════════════════════

export const MOCK_SUBSCRIPTION = {
    plan: "pro",
    status: "active",
    limits: {
        transactions: 999999,
        statements: 999999,
        receipts: 999999,
        receipt_trips: 999999,
        aiMessages: 50,
    },
    usage: {
        transactions: MOCK_TRANSACTIONS.length,
        statements: 3,
        receipts: 2,
        receipt_trips: 12,
        aiMessages: 0,
    },
}

// ═══════════════════════════════════════════════════════
// CHAT
// ═══════════════════════════════════════════════════════

export const MOCK_CHAT_MESSAGES = [
    {
        role: "assistant" as const,
        content: "👋 Hey! I'm your Trakzi AI assistant. I can help you understand your spending patterns, find savings opportunities, and answer questions about your finances.\n\nHere are some things you can ask me:\n- \"How much did I spend on groceries this month?\"\n- \"What are my top spending categories?\"\n- \"How can I save more money?\"\n\nIn this demo, I'm showing a preview of how the chat works. Sign up to get personalized financial insights!",
        timestamp: daysAgo(0),
    },
]

// ═══════════════════════════════════════════════════════
// TRENDS BUNDLE (category trends over time)
// ═══════════════════════════════════════════════════════

export const MOCK_TRENDS_BUNDLE = {
    categoryTrends,
    categories: trendCategories,
}

// ═══════════════════════════════════════════════════════
// TOTAL TRANSACTION COUNT (all-time)
// ═══════════════════════════════════════════════════════

export const MOCK_TOTAL_TRANSACTION_COUNT = {
    count: MOCK_TRANSACTIONS.length,
    timeSpan: "6 months",
    firstDate: daysAgo(180),
    lastDate: daysAgo(0),
    trend: Array.from({ length: 6 }, (_, i) => ({
        date: monthsAgo(5 - i),
        value: MOCK_TRANSACTIONS.filter(t => t.date.startsWith(monthsAgo(5 - i))).length,
    })),
}


// ═══════════════════════════════════════════════════════
// PERIOD FILTER HELPERS (used by demo API routes)
// ═══════════════════════════════════════════════════════

/**
 * Returns the cutoff Date for a given filter string.
 * Transactions on or after this date are included.
 */
export function getPeriodCutoff(filter: string | null | undefined): Date {
    const now = new Date()
    if (!filter) {
        // Default: last 6 months
        const d = new Date(now)
        d.setMonth(d.getMonth() - 6)
        return d
    }
    const f = filter.trim().toLowerCase()
    switch (f) {
        case 'last7days': {
            const d = new Date(now); d.setDate(d.getDate() - 7); return d
        }
        case 'last30days': {
            const d = new Date(now); d.setDate(d.getDate() - 30); return d
        }
        case 'last3months': {
            const d = new Date(now); d.setMonth(d.getMonth() - 3); return d
        }
        case 'last6months': {
            const d = new Date(now); d.setMonth(d.getMonth() - 6); return d
        }
        case 'lastyear': {
            const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d
        }
        case 'ytd': {
            return new Date(now.getFullYear(), 0, 1)
        }
        default: {
            // Year filter (e.g. "2025")
            if (/^\d{4}$/.test(f)) {
                return new Date(parseInt(f), 0, 1)
            }
            // Unknown — no cutoff (return all)
            return new Date(0)
        }
    }
}

/** Returns the end Date for a given filter (for year filters). */
function getPeriodEnd(filter: string | null | undefined): Date | null {
    if (!filter) return null
    const f = filter.trim().toLowerCase()
    if (/^\d{4}$/.test(f)) {
        return new Date(parseInt(f) + 1, 0, 1) // exclusive end of that year
    }
    return null // no explicit end — "up to today"
}

/** Filters an array of date-bearing objects to the selected period. */
export function filterByPeriod<T extends { date: string }>(items: T[], filter: string | null | undefined): T[] {
    const cutoff = getPeriodCutoff(filter)
    const end = getPeriodEnd(filter)
    return items.filter(item => {
        const d = new Date(item.date)
        if (d < cutoff) return false
        if (end && d >= end) return false
        return true
    })
}

/** Filter MOCK_TRANSACTIONS to a given period. */
export function filterMockTransactionsByPeriod(filter: string | null | undefined) {
    return filterByPeriod(MOCK_TRANSACTIONS, filter)
}

/**
 * Build a filtered analytics bundle for the given period.
 * Recomputes all aggregates from scratch using only transactions in the period.
 */
export function buildFilteredAnalyticsBundle(filter: string | null | undefined) {
    const txs = filterMockTransactionsByPeriod(filter)
    const filteredExpenses = txs.filter(t => t.type === 'expense')
    const filteredIncome = txs.filter(t => t.type === 'income')
    const filteredTotalIncome = filteredIncome.reduce((s, t) => s + t.amount, 0)
    const filteredTotalExpense = Math.abs(filteredExpenses.reduce((s, t) => s + t.amount, 0))
    const filteredNetSavings = filteredTotalIncome - filteredTotalExpense

    const catMap: Record<string, { total: number; count: number; color: string }> = {}
    filteredExpenses.forEach(t => {
        if (!catMap[t.category]) catMap[t.category] = { total: 0, count: 0, color: t.color }
        catMap[t.category].total += Math.abs(t.amount)
        catMap[t.category].count++
    })
    const filteredCategorySpending = Object.entries(catMap)
        .map(([category, { total, count, color }]) => ({ category, total: Math.round(total * 100) / 100, count, color, percentage: 0 }))
        .sort((a, b) => b.total - a.total)
    const filteredTotalSpending = filteredCategorySpending.reduce((s, c) => s + c.total, 0)
    filteredCategorySpending.forEach(c => c.percentage = filteredTotalSpending > 0 ? Math.round((c.total / filteredTotalSpending) * 1000) / 10 : 0)

    // Daily spending (all days in period)
    const cutoff = getPeriodCutoff(filter)
    const dayCount = Math.ceil((Date.now() - cutoff.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const filteredDailySpending = Array.from({ length: dayCount }, (_, i) => {
        const d = daysAgo(dayCount - 1 - i)
        const dayTxs = txs.filter(t => t.date === d)
        return {
            date: d,
            total: Math.abs(dayTxs.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)),
            income: dayTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0),
            expense: Math.abs(dayTxs.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)),
        }
    })

    // Monthly categories
    const monthCatMap: Record<string, Record<string, number>> = {}
    filteredExpenses.forEach(t => {
        const mo = t.date.slice(0, 7)
        if (!monthCatMap[mo]) monthCatMap[mo] = {}
        monthCatMap[mo][t.category] = (monthCatMap[mo][t.category] || 0) + Math.abs(t.amount)
    })
    const filteredMonthlyCategories = Object.entries(monthCatMap).flatMap(([month, cats]) =>
        Object.entries(cats).map(([category, total]) => ({ month, category, total: Math.round(total) }))
    )

    // Day of week
    const filteredDayOfWeekSpending = Array.from({ length: 7 }, (_, d) => {
        const dayTxs = filteredExpenses.filter(t => new Date(t.date).getDay() === d)
        return { dayOfWeek: d, total: Math.abs(dayTxs.reduce((s, t) => s + t.amount, 0)), count: dayTxs.length }
    })

    const filteredDayOfWeekCategory: { dayOfWeek: number; category: string; total: number }[] = []
    for (let d = 0; d < 7; d++) {
        const dayTxs = filteredExpenses.filter(t => new Date(t.date).getDay() === d)
        const byCat: Record<string, number> = {}
        dayTxs.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + Math.abs(t.amount) })
        Object.entries(byCat).forEach(([cat, total]) => filteredDayOfWeekCategory.push({ dayOfWeek: d, category: cat, total }))
    }

    // Needs/Wants
    const essentials = ['Housing', 'Groceries', 'Utilities', 'Transport', 'Medical/Healthcare']
    const filteredNeedsWants = [
        { classification: 'Essentials' as const, total: filteredCategorySpending.filter(c => essentials.includes(c.category)).reduce((s, c) => s + c.total, 0), count: 0 },
        { classification: 'Wants' as const, total: filteredCategorySpending.filter(c => !essentials.includes(c.category)).reduce((s, c) => s + c.total, 0), count: 0 },
    ]

    // monthlyByCategory (same as monthlyCategories but keyed differently for streamgraph)
    const filteredMonthlyByCategory = filteredMonthlyCategories

    return {
        ...MOCK_ANALYTICS_BUNDLE,
        kpis: {
            totalIncome: filteredTotalIncome,
            totalExpense: filteredTotalExpense,
            netSavings: filteredNetSavings,
            transactionCount: txs.length,
            avgTransaction: filteredExpenses.length > 0 ? Math.round(filteredTotalExpense / filteredExpenses.length) : 0,
        },
        totalIncome: filteredTotalIncome,
        totalExpense: filteredTotalExpense,
        netSavings: filteredNetSavings,
        transactionCount: txs.length,
        avgTransaction: filteredExpenses.length > 0 ? Math.round(filteredTotalExpense / filteredExpenses.length) : 0,
        categorySpending: filteredCategorySpending,
        dailySpending: filteredDailySpending,
        monthlyCategories: filteredMonthlyCategories,
        dayOfWeekSpending: filteredDayOfWeekSpending,
        dayOfWeekCategory: filteredDayOfWeekCategory,
        needsWants: filteredNeedsWants,
        monthlyByCategory: filteredMonthlyByCategory,
        transactionHistory: filteredExpenses.map(t => ({
            id: t.id, date: t.date, description: t.description, amount: t.amount, category: t.category, color: t.color,
        })),
    }
}

/**
 * Build a filtered fridge bundle for the given period.
 */
export function buildFilteredFridgeBundle(filter: string | null | undefined) {
    const filteredGroceryTxs = filterByPeriod(
        MOCK_TRANSACTIONS.filter(t => t.category === 'Groceries' && t.type === 'expense'),
        filter
    )
    const filteredTotalGrocery = filteredGroceryTxs.reduce((s, t) => s + Math.abs(t.amount), 0)

    const cats = ['Fruits', 'Vegetables', 'Meat & Poultry', 'Dairy (Milk/Yogurt)', 'Salty Snacks', 'Chocolate & Candy', 'Pastries', 'Soft Drinks', 'Bread', 'Coffee & Tea']
    const catBroadTypes: Record<string, string> = {
        'Fruits': 'Nutritious', 'Vegetables': 'Nutritious', 'Meat & Poultry': 'Nutritious',
        'Dairy (Milk/Yogurt)': 'Nutritious', 'Salty Snacks': 'Snacks', 'Chocolate & Candy': 'Snacks',
        'Pastries': 'Snacks', 'Soft Drinks': 'Other', 'Bread': 'Nutritious', 'Coffee & Tea': 'Other',
    }

    const filteredCategorySpending = filteredGroceryTxs.reduce((acc, item) => {
        const subCat = cats[item.id % cats.length]
        const existing = acc.find((c: any) => c.category === subCat)
        const amt = Math.abs(item.amount)
        if (existing) { existing.total += amt; existing.count++ }
        else acc.push({ category: subCat, total: amt, count: 1, color: item.color, broadType: catBroadTypes[subCat] })
        return acc
    }, [] as any[])

    // Daily spending
    const cutoff = getPeriodCutoff(filter)
    const dayCount = Math.ceil((Date.now() - cutoff.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const filteredDailySpending = Array.from({ length: dayCount }, (_, i) => {
        const d = daysAgo(dayCount - 1 - i)
        const dayTxs = filteredGroceryTxs.filter(t => t.date === d)
        return { date: d, total: Math.abs(dayTxs.reduce((s, t) => s + t.amount, 0)) }
    })

    // Store spending
    const storeNames = ['Mercadona', 'Lidl', 'Carrefour', 'Aldi', 'Local Market', 'Costco']
    const filteredStoreSpending = storeNames.map(store => {
        const storeTxs = filteredGroceryTxs.filter(t => t.description.includes(store))
        return { storeName: store, total: Math.abs(storeTxs.reduce((s, t) => s + t.amount, 0)), count: storeTxs.length }
    }).filter(s => s.count > 0).sort((a, b) => b.total - a.total)

    // Day of week
    const filteredDayOfWeekSpending = Array.from({ length: 7 }, (_, d) => {
        const dayTxs = filteredGroceryTxs.filter(t => new Date(t.date).getDay() === d)
        return { dayOfWeek: d, total: Math.abs(dayTxs.reduce((s, t) => s + t.amount, 0)), count: dayTxs.length }
    })

    const filteredDayOfWeekCategory: { dayOfWeek: number; category: string; total: number }[] = []
    for (let d = 0; d < 7; d++) {
        const dayTxs = filteredGroceryTxs.filter(t => new Date(t.date).getDay() === d)
        const subCatMap: Record<string, number> = {}
        dayTxs.forEach(t => {
            const subCat = cats[t.id % cats.length]
            subCatMap[subCat] = (subCatMap[subCat] || 0) + Math.abs(t.amount)
        })
        Object.entries(subCatMap).forEach(([cat, val]) => filteredDayOfWeekCategory.push({ dayOfWeek: d, category: cat, total: Math.round(val * 100) / 100 }))
    }

    // Monthly categories
    const gTxsByMonth: Record<string, typeof filteredGroceryTxs> = {}
    filteredGroceryTxs.forEach(t => { const mo = t.date.slice(0, 7); if (!gTxsByMonth[mo]) gTxsByMonth[mo] = []; gTxsByMonth[mo].push(t) })
    const filteredMonthlyCategories: { month: number; category: string; total: number }[] = []
    Object.entries(gTxsByMonth).forEach(([monthStr, txs]) => {
        const monthNum = parseInt(monthStr.split('-')[1])
        const subCatMap: Record<string, number> = {}
        txs.forEach(t => { const subCat = cats[t.id % cats.length]; subCatMap[subCat] = (subCatMap[subCat] || 0) + Math.abs(t.amount) })
        Object.entries(subCatMap).forEach(([cat, val]) => filteredMonthlyCategories.push({ month: monthNum, category: cat, total: Math.round(val * 100) / 100 }))
    })

    // Macronutrient breakdown from filtered txs
    const filteredGroceryItems = filteredGroceryTxs.map(t => {
        const seed = t.id * 7
        const rand = seeded(seed)
        const type = rand < 0.3 ? 'Snacks' : rand < 0.5 ? 'Other' : 'Nutritious'
        return { ...t, broadType: type }
    })
    const filteredMacros = Object.values(
        filteredGroceryItems.reduce((acc, t) => {
            if (!acc[t.broadType]) acc[t.broadType] = { typeName: t.broadType, total: 0, color: t.broadType === 'Nutritious' ? '#22c55e' : t.broadType === 'Snacks' ? '#f97316' : '#94a3b8' }
            acc[t.broadType].total += Math.abs(t.amount)
            return acc
        }, {} as Record<string, { typeName: string; total: number; color: string }>)
    )

    return {
        ...MOCK_FRIDGE_BUNDLE,
        kpis: {
            totalSpent: filteredTotalGrocery,
            shoppingTrips: filteredGroceryTxs.length,
            storesVisited: filteredStoreSpending.length,
            averageReceipt: filteredGroceryTxs.length > 0 ? Math.round(filteredTotalGrocery / filteredGroceryTxs.length) : 0,
            itemCount: Math.round(filteredGroceryTxs.length * 5.5),
        },
        categorySpending: filteredCategorySpending,
        dailySpending: filteredDailySpending,
        storeSpending: filteredStoreSpending,
        macronutrientBreakdown: filteredMacros,
        dayOfWeekSpending: filteredDayOfWeekSpending,
        dayOfWeekCategory: filteredDayOfWeekCategory,
        monthlyCategories: filteredMonthlyCategories,
    }
}

/**
 * Build filtered trends bundle (category trends) for the given period.
 */
export function buildFilteredTrendsBundle(filter: string | null | undefined) {
    const txs = filterMockTransactionsByPeriod(filter)
    const filteredExpenses = txs.filter(t => t.type === 'expense')

    // GroupByCategory then calculate monthly values
    const trendCats = CATEGORIES_CONFIG.filter(c => c.type === 'expense').map(c => c.name)

    // Group by month
    const byMonth: Record<string, typeof filteredExpenses> = {}
    filteredExpenses.forEach(t => {
        const mo = t.date.slice(0, 7)
        if (!byMonth[mo]) byMonth[mo] = []
        byMonth[mo].push(t)
    })
    const allMonths = Object.keys(byMonth).sort()

    const filteredCategoryTrends: Record<string, Array<{ date: string; value: number }>> = {}
    trendCats.forEach(cat => {
        filteredCategoryTrends[cat] = allMonths.map(mo => ({
            date: mo + '-01',
            value: Math.round(Math.abs((byMonth[mo] || []).filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0)) * 100) / 100
        }))
    })

    return {
        categoryTrends: filteredCategoryTrends,
        categories: trendCats,
    }
}

/**
 * Build filtered groceries trends bundle (category trends) for the given period.
 */
export function buildFilteredGroceriesTrendsBundle(filter: string | null | undefined) {
    const txs = filterByPeriod(MOCK_RECEIPT_TRANSACTIONS, filter)

    // GroupByCategory then calculate monthly values
    const trendCats = RECEIPT_CATEGORIES.map(c => c.name)

    // Group by month
    const byMonth: Record<string, typeof txs> = {}
    txs.forEach(t => {
        const mo = t.date.slice(0, 7)
        if (!byMonth[mo]) byMonth[mo] = []
        byMonth[mo].push(t)
    })
    const allMonths = Object.keys(byMonth).sort()

    const filteredCategoryTrends: Record<string, Array<{ date: string; value: number }>> = {}
    trendCats.forEach(cat => {
        filteredCategoryTrends[cat] = allMonths.map(mo => ({
            date: mo + '-01',
            value: Math.round((byMonth[mo] || []).filter(t => t.categoryName === cat).reduce((s, t) => s + t.totalPrice, 0) * 100) / 100
        }))
    })

    return {
        categoryTrends: filteredCategoryTrends,
        categories: trendCats,
    }
}

/**
 * Build filtered grocery-vs-restaurant data for the given period.
 */
export function buildFilteredGroceryVsRestaurant(filter: string | null | undefined) {
    const txs = filterMockTransactionsByPeriod(filter)
    const groceryTx = txs.filter(t => t.category === 'Groceries' && t.type === 'expense')
    const diningTx = txs.filter(t => t.category === 'Dining' && t.type === 'expense')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const monthlyData = new Map<string, { month: string; 'Home Food': number; 'Outside Food': number }>()
    groceryTx.forEach(t => {
        const date = new Date(t.date)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`
        if (!monthlyData.has(key)) monthlyData.set(key, { month: label, 'Home Food': 0, 'Outside Food': 0 })
        monthlyData.get(key)!['Home Food'] += Math.abs(t.amount)
    })
    diningTx.forEach(t => {
        const date = new Date(t.date)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`
        if (!monthlyData.has(key)) monthlyData.set(key, { month: label, 'Home Food': 0, 'Outside Food': 0 })
        monthlyData.get(key)!['Outside Food'] += Math.abs(t.amount)
    })

    return Array.from(monthlyData.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([, v]) => ({ ...v, 'Home Food': Math.round(v['Home Food'] * 100) / 100, 'Outside Food': Math.round(v['Outside Food'] * 100) / 100 }))
}

/**
 * Build a filtered home bundle for the given period.
 */
export function buildFilteredHomeBundle(filter: string | null | undefined) {
    const txs = filterMockTransactionsByPeriod(filter)
    const expenses = txs.filter(t => t.type === 'expense')
    const income = txs.filter(t => t.type === 'income')
    const totalIncome = income.reduce((s, t) => s + t.amount, 0)
    const totalExpense = Math.abs(expenses.reduce((s, t) => s + t.amount, 0))
    const netSavings = totalIncome - totalExpense

    const catMap: Record<string, { total: number; color: string }> = {}
    expenses.forEach(t => {
        if (!catMap[t.category]) catMap[t.category] = { total: 0, color: t.color }
        catMap[t.category].total += Math.abs(t.amount)
    })
    const spendingByCategory = Object.entries(catMap)
        .map(([category, { total, color }]) => ({ category, total: Math.round(total * 100) / 100, color }))
        .sort((a, b) => b.total - a.total)

    // Daily spending (all days in period)
    const cutoff = getPeriodCutoff(filter)
    const dayCount = Math.ceil((Date.now() - cutoff.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const dailySpending = Array.from({ length: dayCount }, (_, i) => {
        const d = daysAgo(dayCount - 1 - i)
        const dayTxs = expenses.filter(t => t.date === d)
        return { date: d, total: Math.abs(dayTxs.reduce((s, t) => s + t.amount, 0)) }
    })

    return {
        ...MOCK_HOME_BUNDLE,
        kpis: {
            totalIncome,
            totalExpense,
            netSavings,
            transactionCount: txs.length,
            avgTransaction: expenses.length > 0 ? Math.round(totalExpense / expenses.length) : 0,
        },
        topCategories: spendingByCategory.slice(0, 8),
        activityRings: spendingByCategory.slice(0, 5).map(c => ({
            category: c.category,
            spent: c.total,
            percentage: Math.min(100, Math.round((c.total / 1500) * 100)),
            color: c.color
        })),
        dailySpending,
        recentTransactions: txs.length,
    }
}

/**
 * Build filtered total transaction count for the given period.
 */
export function buildFilteredTotalTransactionCount(filter: string | null | undefined) {
    const txs = filterMockTransactionsByPeriod(filter)
    const cutoff = getPeriodCutoff(filter)
    const days = Math.ceil((Date.now() - cutoff.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const segments = 6
    const trend = Array.from({ length: segments }, (_, i) => {
        const d = monthsAgo(segments - 1 - i)
        return {
            date: d,
            value: txs.filter(t => t.date.startsWith(d)).length
        }
    })

    return {
        count: txs.length,
        timeSpan: filter || "6 months",
        firstDate: txs.length > 0 ? txs[txs.length - 1].date : daysAgo(days),
        lastDate: txs.length > 0 ? txs[0].date : daysAgo(0),
        trend
    }
}

/**
 * Build filtered savings bundle for the given period.
 */
export function buildFilteredSavingsBundle(filter: string | null | undefined) {
    const txs = filterMockTransactionsByPeriod(filter)
    const expenses = txs.filter(t => t.type === 'expense')
    const income = txs.filter(t => t.type === 'income')
    const totalIncome = income.reduce((s, t) => s + t.amount, 0)
    const totalExpense = Math.abs(expenses.reduce((s, t) => s + t.amount, 0))
    const netSavings = totalIncome - totalExpense

    const cutoff = getPeriodCutoff(filter)
    const dayCount = Math.ceil((Date.now() - cutoff.getTime()) / (1000 * 60 * 60 * 24)) + 1

    let cumulative = 0
    const savingsChartData = Array.from({ length: dayCount }, (_, i) => {
        const d = daysAgo(dayCount - 1 - i)
        const dayInc = income.filter(t => t.date === d).reduce((s, t) => s + t.amount, 0)
        const dayExp = Math.abs(expenses.filter(t => t.date === d).reduce((s, t) => s + t.amount, 0))
        cumulative += (dayInc - dayExp)
        return { date: d, amount: dayInc - dayExp, cumulative }
    }).filter((_, i, arr) => {
        // Decimate to approx 15-20 points
        const stride = Math.max(1, Math.floor(arr.length / 15))
        return i % stride === 0
    })

    return {
        kpis: {
            totalSaved: netSavings,
            savingsRate: totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0,
            transactionCount: income.length,
            avgSavingsPerTransaction: Math.round(netSavings / Math.max(1, dayCount / 30)),
        },
        chartData: savingsChartData
    }
}

/**
 * Build filtered pockets bundle for the given period.
 */
export function buildFilteredPocketsBundle(filter: string | null | undefined) {
    const txs = filterMockTransactionsByPeriod(filter)
    const expenses = txs.filter(t => t.type === 'expense')
    const totalExpense = Math.abs(expenses.reduce((s, t) => s + t.amount, 0))

    const byCat: Record<string, { total: number; count: number }> = {}
    expenses.forEach(t => {
        if (!byCat[t.category]) byCat[t.category] = { total: 0, count: 0 }
        byCat[t.category].total += Math.abs(t.amount)
        byCat[t.category].count++
    })

    return {
        ...MOCK_POCKETS_BUNDLE,
        countries: MOCK_POCKETS_BUNDLE.countries.map(c => ({
            ...c,
            total_spent: c.country_name === "Spain" ? totalExpense * 0.8 : (byCat["Travel"]?.total || 0),
            transaction_count: c.country_name === "Spain" ? expenses.length * 0.8 : (byCat["Travel"]?.count || 0),
        })),
        vehicles: MOCK_POCKETS_BUNDLE.vehicles.map(v => ({
            ...v,
            totalSpent: byCat["Transport"]?.total || 0,
            transactionCount: byCat["Transport"]?.count || 0,
        })),
        properties: MOCK_POCKETS_BUNDLE.properties.map(p => ({
            ...p,
            totalSpent: byCat["Housing"]?.total || 0,
            transactionCount: byCat["Housing"]?.count || 0,
        })),
        travelStats: {
            countriesVisited: byCat["Travel"]?.total > 0 ? 2 : 1,
            totalSpent: totalExpense,
            totalTransactions: expenses.length,
        },
        garageStats: {
            vehicleCount: 1,
            totalSpent: byCat["Transport"]?.total || 0,
            avgPerVehicle: byCat["Transport"]?.total || 0,
        },
        propertyStats: {
            ...MOCK_POCKETS_BUNDLE.propertyStats,
            totalSpent: byCat["Housing"]?.total || 0,
            avgPerProperty: byCat["Housing"]?.total || 0,
        }
    }
}

/**
 * Build filtered dashboard stats for the given period.
 */
export function buildFilteredDashboardStats(filter: string | null | undefined) {
    const analytics = buildFilteredAnalyticsBundle(filter)
    const fridge = buildFilteredFridgeBundle(filter)
    const savings = buildFilteredSavingsBundle(filter)
    const trends = buildFilteredTrendsBundle(filter)

    return {
        analytics: {
            transactionCount: analytics.transactionCount,
            score: 72,
            needsPercent: 53,
            wantsPercent: 25,
            savingsPercent: 15,
            otherPercent: 7,
            hasEnoughTransactions: true,
            minRequired: 100,
            breakdown: {
                needs: analytics.needsWants.find(n => n.classification === 'Essentials')?.total || 0,
                wants: analytics.needsWants.find(n => n.classification === 'Wants')?.total || 0,
                savings: analytics.netSavings,
                other: 0
            },
            scoreHistory: MOCK_DASHBOARD_STATS.analytics.scoreHistory,
        },
        fridge: {
            transactionCount: fridge.kpis.shoppingTrips,
            score: 68,
            healthyPercent: Math.round((fridge.macronutrientBreakdown.find(m => m.typeName === 'Nutritious')?.total || 0) / Math.max(1, fridge.kpis.totalSpent) * 100),
            unhealthyPercent: Math.round((fridge.macronutrientBreakdown.find(m => m.typeName === 'Snacks')?.total || 0) / Math.max(1, fridge.kpis.totalSpent) * 100),
            hasEnoughTransactions: true,
            minRequired: 200,
            breakdown: {
                healthy: fridge.macronutrientBreakdown.find(m => m.typeName === 'Nutritious')?.total || 0,
                unhealthy: fridge.macronutrientBreakdown.find(m => m.typeName === 'Snacks')?.total || 0,
                neutral: fridge.macronutrientBreakdown.find(m => m.typeName === 'Other')?.total || 0
            },
            itemCounts: {
                healthy: fridge.categorySpending.filter(c => c.broadType === 'Nutritious').reduce((s, c) => s + c.count, 0),
                unhealthy: fridge.categorySpending.filter(c => c.broadType === 'Snacks').reduce((s, c) => s + c.count, 0),
                neutral: fridge.categorySpending.filter(c => c.broadType === 'Other').reduce((s, c) => s + c.count, 0)
            },
        },
        savings: {
            transactionCount: analytics.transactionCount,
            totalIncome: analytics.totalIncome,
            totalExpenses: analytics.totalExpense,
            actualSavings: analytics.netSavings,
            savingsRate: savings.kpis.savingsRate,
            score: 75,
            monthlyAvgSavings: savings.kpis.avgSavingsPerTransaction,
            targetSavings: 1500,
            gap: 1500 - savings.kpis.avgSavingsPerTransaction,
            trend: MOCK_DASHBOARD_STATS.savings.trend,
            scoreHistory: MOCK_DASHBOARD_STATS.savings.scoreHistory,
        },
        trends: {
            transactionCount: analytics.transactionCount,
            categoryCount: analytics.categorySpending.length,
            monthCount: 6,
            score: 65,
            categoryAnalysis: analytics.categorySpending.slice(0, 5).map(c => ({
                category: c.category,
                userPercent: Math.round(c.percentage),
                avgPercent: 15,
                status: "average" as const,
                difference: 0
            })),
        },
        comparison: MOCK_DASHBOARD_STATS.comparison
    }
}

/**
 * Build filtered data library bundle for the given period.
 */
export function buildFilteredDataLibraryBundle(filter: string | null | undefined) {
    const txs = filterMockTransactionsByPeriod(filter)
    const expenses = txs.filter(t => t.type === 'expense')
    const income = txs.filter(t => t.type === 'income')
    const totalIncome = income.reduce((s, t) => s + t.amount, 0)
    const totalExpense = Math.abs(expenses.reduce((s, t) => s + t.amount, 0))
    const netSavings = totalIncome - totalExpense

    return {
        ...MOCK_DATA_LIBRARY_BUNDLE,
        transactions: txs.map(t => ({
            id: t.id,
            date: t.date,
            description: t.description,
            amount: t.amount,
            balance: t.balance,
            category: t.category,
        })),
        stats: {
            ...MOCK_DATA_LIBRARY_BUNDLE.stats,
            totalIncome,
            totalExpenses: totalExpense,
            savingsRate: totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0,
            netWorth: netSavings,
        }
    }
}
