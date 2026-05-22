export type CashFlowGraphNode = {
  id: string
  label?: string
}

export type CashFlowGraphLink = {
  source: string
  target: string
  value: number
}

export type CashFlowGraph = {
  nodes: CashFlowGraphNode[]
  links: CashFlowGraphLink[]
}

type CashFlowTransaction = {
  amount: number
  category?: string | null
}

type BuildCashFlowGraphOptions = {
  transactions: CashFlowTransaction[]
  normalizeCategory: (category?: string | null) => string
  hiddenExpenseCategories?: Set<string>
  maxIncomeSources?: number
  maxExpenseCategories?: number
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100

export function buildCashFlowGraphFromTransactions({
  transactions,
  normalizeCategory,
  hiddenExpenseCategories = new Set<string>(),
  maxIncomeSources = 5,
  maxExpenseCategories = 8,
}: BuildCashFlowGraphOptions): {
  graph: CashFlowGraph
  categories: string[]
} {
  if (!transactions || transactions.length === 0) {
    return { graph: { nodes: [], links: [] }, categories: [] }
  }

  const incomeByCategoryMap = new Map<string, number>()
  const expenseByCategoryMap = new Map<string, number>()

  transactions.forEach((tx) => {
    if (tx.amount > 0) {
      const category = normalizeCategory(tx.category || "Income") || "Income"
      incomeByCategoryMap.set(category, (incomeByCategoryMap.get(category) || 0) + tx.amount)
      return
    }

    if (tx.amount < 0) {
      const category = normalizeCategory(tx.category)
      if (hiddenExpenseCategories.has(category)) return
      expenseByCategoryMap.set(category, (expenseByCategoryMap.get(category) || 0) + Math.abs(tx.amount))
    }
  })

  const totalIncome = Array.from(incomeByCategoryMap.values()).reduce((sum, value) => sum + value, 0)
  const totalExpenses = Array.from(expenseByCategoryMap.values()).reduce((sum, value) => sum + value, 0)

  if (totalIncome <= 0 && totalExpenses <= 0) {
    return { graph: { nodes: [], links: [] }, categories: [] }
  }

  const nodes: CashFlowGraphNode[] = [{ id: "total-cash", label: "Total Cash" }]
  const links: CashFlowGraphLink[] = []

  const sortedIncomeSources = Array.from(incomeByCategoryMap.entries())
    .sort((left, right) => right[1] - left[1])

  const visibleIncomeSources = sortedIncomeSources.slice(0, maxIncomeSources)
  const otherIncome = sortedIncomeSources
    .slice(maxIncomeSources)
    .reduce((sum, [, amount]) => sum + amount, 0)

  visibleIncomeSources.forEach(([category, amount]) => {
    if (amount <= 0) return
    const nodeId = `income-${category}`
    nodes.push({ id: nodeId, label: category })
    links.push({
      source: nodeId,
      target: "total-cash",
      value: roundCurrency(amount),
    })
  })

  if (otherIncome > 0) {
    nodes.push({ id: "income-Other Income", label: "Other Income" })
    links.push({
      source: "income-Other Income",
      target: "total-cash",
      value: roundCurrency(otherIncome),
    })
  }

  const sortedExpenses = Array.from(expenseByCategoryMap.entries())
    .sort((left, right) => right[1] - left[1])

  const visibleExpenses = sortedExpenses.slice(0, maxExpenseCategories)
  const otherExpenses = sortedExpenses
    .slice(maxExpenseCategories)
    .reduce((sum, [, amount]) => sum + amount, 0)

  visibleExpenses.forEach(([category, amount]) => {
    if (amount <= 0) return
    const nodeId = `expense-${category}`
    nodes.push({ id: nodeId, label: category })
    links.push({
      source: "total-cash",
      target: nodeId,
      value: roundCurrency(amount),
    })
  })

  if (otherExpenses > 0) {
    nodes.push({ id: "expense-Other", label: "Other" })
    links.push({
      source: "total-cash",
      target: "expense-Other",
      value: roundCurrency(otherExpenses),
    })
  }

  const savings = totalIncome - totalExpenses
  if (savings > 0) {
    nodes.push({ id: "savings", label: "Savings" })
    links.push({
      source: "total-cash",
      target: "savings",
      value: roundCurrency(savings),
    })
  }

  return {
    graph: { nodes, links },
    categories: Array.from(expenseByCategoryMap.keys()),
  }
}
