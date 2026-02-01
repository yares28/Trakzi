import { useMemo } from "react"
import {
  IconCategory,
  IconFolders,
  IconRefresh,
  IconShieldCheck,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { formatFreshness, formatNumber } from "../formatters"
import { isDefaultCategory } from "../utils/defaults"
import type {
  Category,
  ReceiptCategory,
  ReceiptCategoryType,
  Statement,
  Transaction,
} from "../types"

type StatsCardsProps = {
  transactions: Transaction[]
  statements: Statement[]
  categories: Category[]
  receiptCategoryTypes: ReceiptCategoryType[]
  receiptCategories: ReceiptCategory[]
  receiptTransactionsCount: number
  totalUserCategoriesCount: number
}

export const StatsCards = ({
  transactions,
  statements,
  categories,
  receiptCategoryTypes,
  receiptCategories,
  receiptTransactionsCount,
  totalUserCategoriesCount,
}: StatsCardsProps) => {
  const latestTransactionDate = transactions.reduce<string | null>(
    (latest, tx) => {
      if (!latest) return tx.date
      return new Date(tx.date) > new Date(latest) ? tx.date : latest
    },
    null
  )

  const statementDistribution = useMemo(() => {
    return statements.reduce<Record<string, number>>((acc, stmt) => {
      acc[stmt.type] = (acc[stmt.type] || 0) + 1
      return acc
    }, {})
  }, [statements])

  const customCategoriesCount = useMemo(() => {
    // Use default list (lib/categories.ts) so DB and code stay in sync
    return categories.filter((cat) => !isDefaultCategory(cat.name)).length
  }, [categories])

  const customReceiptCategoriesCount = useMemo(() => {
    // @ts-ignore - is_default exists in DB but not in type
    return receiptCategories.filter((cat) => !cat.is_default).length
  }, [receiptCategories])

  const totalTransactionsCount = useMemo(() => {
    return transactions.length + receiptTransactionsCount
  }, [transactions.length, receiptTransactionsCount])

  const kpiCards = [
    {
      title: "Transactions Indexed",
      value: formatNumber(totalTransactionsCount),
      hint: latestTransactionDate
        ? `Last touch ${formatFreshness(latestTransactionDate).toLowerCase()}`
        : "Waiting for first sync",
      icon: IconRefresh,
      subtitle: "all transactions tracked",
    },
    {
      title: "Documents Archived",
      value: formatNumber(statements.length),
      hint:
        Object.keys(statementDistribution).length > 0
          ? `${Object.keys(statementDistribution).length} source${
              Object.keys(statementDistribution).length === 1 ? "" : "s"
            }`
          : "Upload a statement to unlock insights",
      icon: IconShieldCheck,
      subtitle: "documents captured",
    },
    {
      title: "Total User Categories",
      value: formatNumber(totalUserCategoriesCount),
      hint: "Total user-created categories (transaction + receipt combined).",
      icon: IconCategory,
      subtitle: "custom categories across all types",
    },
    {
      title: "Macronutrient Types",
      value: formatNumber(receiptCategoryTypes.length),
      hint: "Protein, Carbs, Fat, Mixed, None, Other",
      icon: IconFolders,
      subtitle: "classification types",
    },
    {
      title: "Total Spending/Income Categories",
      value: formatNumber(customCategoriesCount),
      hint: "User-created transaction categories (excluding defaults).",
      icon: IconCategory,
      subtitle: "custom categories created",
    },
    {
      title: "Receipt Categories",
      value: formatNumber(customReceiptCategoriesCount),
      hint: "User-created food categories (excluding defaults).",
      icon: IconFolders,
      subtitle: "custom food categories for AI",
    },
  ]

  return (
    <section className="grid gap-4 px-4 lg:grid-cols-4 lg:px-6">
      {kpiCards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{card.title}</CardTitle>
              <CardDescription>{card.hint}</CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <card.icon className="size-4" />
              Live
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold">{card.value}</div>
            <p className="text-muted-foreground text-sm">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
