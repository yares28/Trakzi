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

    // Generate for 7 months (approx 210 days)
    for (let day = 0; day < 210; day++) {
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
    dailySpending: Array.from({ length: 210 }, (_, i) => {
        const d = daysAgo(209 - i)
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

    dailySpending: Array.from({ length: 210 }, (_, i) => {
        const d = daysAgo(209 - i)
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

    dailySpending: Array.from({ length: 210 }, (_, i) => {
        const d = daysAgo(209 - i)
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

