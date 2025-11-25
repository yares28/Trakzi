"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
} from "react"
import {
  IconAlertTriangle,
  IconCategory,
  IconCloudUpload,
  IconDatabase,
  IconDownload,
  IconEye,
  IconFolders,
  IconLoader2,
  IconRefresh,
  IconShieldCheck,
  IconTrash,
} from "@tabler/icons-react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CategorySelect } from "@/components/category-select"
import { DataTable } from "@/components/data-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type Transaction = {
  id: number
  date: string
  description: string
  amount: number
  balance: number | null
  category: string
}

type Statement = {
  id: string
  name: string
  type: string
  date: string
  reviewer: string
  statementId: number
  fileId: string | null
}

type StatsResponse = {
  totalIncome: number
  totalExpenses: number
  savingsRate: number
  netWorth: number
  incomeChange: number
  expensesChange: number
  savingsRateChange: number
  netWorthChange: number
}

type Category = {
  id: number
  name: string
  color: string | null
  transactionCount: number
  totalSpend: number
  totalAmount?: number
  createdAt: string
}

type UserFile = {
  id: string
  fileName: string
  mimeType: string
  extension: string | null
  sizeBytes: number
  source: string | null
  uploadedAt: string
  rawFormat: string | null
  bankName: string | null
  accountName: string | null
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(value)
  )

const formatFreshness = (input?: string | null) => {
  if (!input) return "Awaiting sync"
  const timestamp = new Date(input).getTime()
  if (Number.isNaN(timestamp)) return "Awaiting sync"
  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (diffMinutes < 1) return "Updated just now"
  if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `Updated ${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `Updated ${diffDays}d ago`
}

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const idx = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  )
  const value = bytes / Math.pow(1024, idx)
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[idx]}`
}

const formatDateLabel = (input: string) =>
  new Date(input).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  }).format(value)

export default function DataLibraryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isPending, startTransition] = useTransition()
  const [statements, setStatements] = useState<Statement[]>([])
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [userFiles, setUserFiles] = useState<UserFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null)
  const [statementTransactions, setStatementTransactions] = useState<
    {
      id: number
      date: string
      description: string
      amount: number
      balance: number | null
      category: string
    }[]
  >([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [statementToDelete, setStatementToDelete] = useState<Statement | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const totalTransactions = transactions.length
  const categorizedTransactions = transactions.filter(
    (tx) => tx.category && tx.category !== "Other"
  ).length
  const latestTransactionDate = transactions.reduce<string | null>(
    (latest, tx) => {
      if (!latest) return tx.date
      return new Date(tx.date) > new Date(latest) ? tx.date : latest
    },
    null
  )

  const latestStatementDate = statements.reduce<string | null>(
    (latest, stmt) => {
      if (!latest) return stmt.date
      return new Date(stmt.date) > new Date(latest) ? stmt.date : latest
    },
    null
  )

  const statementDistribution = useMemo(() => {
    return statements.reduce<Record<string, number>>((acc, stmt) => {
      acc[stmt.type] = (acc[stmt.type] || 0) + 1
      return acc
    }, {})
  }, [statements])

  const fetchLibraryData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [txRes, statsRes, stmtRes, catRes, filesRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/stats"),
        fetch("/api/statements"),
        fetch("/api/categories"),
        fetch("/api/files"),
      ])

      if (!txRes.ok) {
        throw new Error(
          (await txRes.text()) || "Unable to load transactions dataset."
        )
      }
      if (!statsRes.ok) {
        throw new Error((await statsRes.text()) || "Stats pipeline unavailable.")
      }
      if (!stmtRes.ok) {
        throw new Error(
          (await stmtRes.text()) || "Failed to fetch statement archive."
        )
      }
      if (!catRes.ok) {
        throw new Error(
          (await catRes.text()) || "Unable to load category taxonomy."
        )
      }
      if (!filesRes.ok) {
        throw new Error(
          (await filesRes.text()) || "Unable to load raw file inventory."
        )
      }

      const [txData, statsData, stmtData, catData, filesData] =
        await Promise.all([
        txRes.json(),
        statsRes.json(),
        stmtRes.json(),
          catRes.json(),
          filesRes.json(),
        ])

      setTransactions(txData)
      setStats(statsData)
      setStatements(stmtData)
      setCategories(catData)
      setUserFiles(filesData)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "We hit a snag while syncing the library."
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLibraryData()
  }, [fetchLibraryData])

  const uniqueCategoryOptions = useMemo(() => {
    const names = new Set<string>()
    categories.forEach((category) => names.add(category.name))
    statementTransactions.forEach((tx) => names.add(tx.category || "Other"))
    if (names.size === 0) {
      names.add("Other")
    }
    return Array.from(names)
  }, [categories, statementTransactions])

  const handleViewStatementTransactions = async (statement: Statement) => {
    setSelectedStatement(statement)
    setViewDialogOpen(true)
    setViewLoading(true)
    setStatementTransactions([])

    const statementId = statement.statementId ?? Number(statement.id)
    if (!statementId) {
      console.error("Missing statement ID")
      setViewLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/statements/${statementId}/transactions`)
      if (response.ok) {
        const data = await response.json()
        setStatementTransactions(data)
      } else {
        console.error("Failed to fetch statement transactions")
        setStatementTransactions([])
      }
    } catch (err) {
      console.error("Error fetching statement transactions:", err)
      setStatementTransactions([])
    } finally {
      setViewLoading(false)
    }
  }

  const handleDeleteStatement = async () => {
    if (!statementToDelete) return
    const statementId = statementToDelete.statementId ?? Number(statementToDelete.id)
    if (!statementId) return

    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/statements/${statementId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        await fetchLibraryData()
        setDeleteDialogOpen(false)
        setStatementToDelete(null)
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(errorData.error || "Failed to delete statement")
      }
    } catch (err) {
      console.error("Error deleting statement:", err)
      alert(err instanceof Error ? err.message : "Failed to delete statement")
    } finally {
      setDeleteLoading(false)
    }
  }

  const kpiCards = [
    {
      title: "Transactions Indexed",
      value: formatNumber(totalTransactions),
      hint: latestTransactionDate
        ? `Last touch ${formatFreshness(latestTransactionDate).toLowerCase()}`
        : "Waiting for first sync",
      icon: IconRefresh,
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
    },
  ]

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72 - 15px)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <section className="px-4 lg:px-6">
                <div className="flex flex-col justify-between gap-4 rounded-3xl border bg-muted/30 px-6 py-6 lg:flex-row lg:items-center">
                  <div className="space-y-2">
                    <Badge variant="outline" className="gap-1 px-3 py-1 text-sm">
                      <IconDatabase className="size-4" />
                      Unified Library
                    </Badge>
                    <h1 className="text-3xl font-semibold tracking-tight">
                      Data Library
                    </h1>
                    <p className="text-muted-foreground max-w-2xl">
                      Live view of every dataset powered by your statements,
                      ledger, and AI interpretations. Tap into real backend
                      telemetry without leaving the dashboard.
                    </p>
                  </div>
                </div>
                {error && (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <IconAlertTriangle className="size-4" />
                    <span>{error}</span>
                  </div>
                )}
              </section>

              <section className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
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
                      <p className="text-muted-foreground text-sm">
                        {card.title === "Transactions Indexed"
                          ? "synced ledger entries"
                          : "documents captured"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
                <Card>
                  <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle>User Categories</CardTitle>
                      <CardDescription>
                        Count pulled directly from your Neon categories table.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <IconCategory className="size-3.5" />
                      Live
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-semibold">
                      {formatNumber(categories.length)}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      total categories synced from Neon
                    </p>
                  </CardContent>
                </Card>
              </section>


              <section className="px-4 lg:px-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle>Reports</CardTitle>
                        <CardDescription>
                          Latest statements synced from Neon storage.
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <IconFolders className="size-3.5" />
                        {statements.length} total
                      </Badge>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Report</TableHead>
                            <TableHead className="hidden md:table-cell">
                              Type
                            </TableHead>
                            <TableHead>Uploaded</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statements.length ? (
                            statements.slice(0, 6).map((statement) => (
                              <TableRow key={statement.id}>
                                <TableCell className="font-medium">
                                  {statement.name}
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                  {statement.type}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {formatDateLabel(statement.date)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        handleViewStatementTransactions(statement)
                                      }
                                      className="hover:bg-accent"
                                    >
                                      {viewLoading &&
                                      selectedStatement?.id === statement.id ? (
                                        <IconLoader2 className="size-4 animate-spin" />
                                      ) : (
                                        <IconEye className="size-4" />
                                      )}
                                      <span className="sr-only">View transactions</span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setStatementToDelete(statement)
                                        setDeleteDialogOpen(true)
                                      }}
                                      disabled={
                                        deleteLoading &&
                                        statementToDelete?.id === statement.id
                                      }
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      {deleteLoading &&
                                      statementToDelete?.id === statement.id ? (
                                        <IconLoader2 className="size-4 animate-spin" />
                                      ) : (
                                        <IconTrash className="size-4" />
                                      )}
                                      <span className="sr-only">Delete</span>
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center">
                                <p className="text-sm text-muted-foreground">
                                  No reports yet—upload a statement to populate this list.
                                </p>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  <Card className="lg:col-span-2">
                    <CardContent className="p-0">
                      <DataTable 
                        data={[]} 
                        transactions={transactions}
                      />
                    </CardContent>
                  </Card>
                  <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle>Categories</CardTitle>
                        <CardDescription>
                          Full taxonomy pulled from Neon categories table.
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <IconCategory className="size-3.5" />
                        {categories.length} total
                      </Badge>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead className="hidden md:table-cell">
                              Created
                            </TableHead>
                            <TableHead className="text-right">
                              Transactions
                            </TableHead>
                            <TableHead className="text-right">Spend</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categories.length ? (
                            categories.map((category) => (
                              <TableRow key={category.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="inline-flex size-2.5 rounded-full"
                                      style={{
                                        backgroundColor:
                                          category.color ?? "hsl(var(--primary))",
                                      }}
                                    />
                                    <span className="font-medium">
                                      {category.name}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                  {formatDateLabel(category.createdAt)}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {category.transactionCount}
                                </TableCell>
                                <TableCell className="text-right text-sm font-medium">
                                  {(() => {
                                    const amount = category.totalAmount ?? 0
                                    if (amount === 0) {
                                      return (
                                        <span className="text-muted-foreground">
                                          {formatCurrency(0)}
                                        </span>
                                      )
                                    }
                                    if (amount < 0) {
                                      // Expenses (negative) - show in red
                                      return (
                                        <span className="text-red-500">
                                          {formatCurrency(amount)}
                                        </span>
                                      )
                                    }
                                    // Income (positive) - show in green
                                    return (
                                      <span className="text-green-500">
                                        {formatCurrency(amount)}
                                      </span>
                                    )
                                  })()}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center">
                                <p className="text-sm text-muted-foreground">
                                  No categories yet—tag transactions to build your taxonomy.
                                </p>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <Dialog
                open={viewDialogOpen}
                onOpenChange={(open) => {
                  setViewDialogOpen(open)
                  if (!open) {
                    setStatementTransactions([])
                    setSelectedStatement(null)
                  }
                }}
              >
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      Transactions — {selectedStatement?.name ?? "Statement"}
                    </DialogTitle>
                    <DialogDescription>
                      Detailed ledger entries sourced from this statement.
                    </DialogDescription>
                  </DialogHeader>
                  {viewLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : statementTransactions.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            onClick={() => {
                              setStatementTransactions((prev) =>
                                [...prev].sort((a, b) =>
                                  sortDirection === "asc"
                                    ? new Date(a.date).getTime() -
                                      new Date(b.date).getTime()
                                    : new Date(b.date).getTime() -
                                      new Date(a.date).getTime()
                                )
                              )
                              setSortDirection((prev) =>
                                prev === "asc" ? "desc" : "asc"
                              )
                            }}
                            className="cursor-pointer select-none"
                          >
                            Date
                          </TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statementTransactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDateLabel(tx.date)}
                            </TableCell>
                            <TableCell>{tx.description}</TableCell>
                            <TableCell>
                              <CategorySelect
                                value={tx.category}
                                onValueChange={(value) => {
                                  // Update state in a transition so it doesn't block the Select from closing
                                  const previousCategory = tx.category
                                  startTransition(() => {
                                    setStatementTransactions((prev) =>
                                      prev.map((item) =>
                                        item.id === tx.id
                                          ? { ...item, category: value }
                                          : item
                                      )
                                    )
                                  })

                                  // Then update the database in the background (don't await)
                                  fetch(
                                    `/api/transactions/${tx.id}`,
                                    {
                                      method: "PATCH",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        category: value,
                                      }),
                                    }
                                  )
                                    .then(async (response) => {
                                      if (!response.ok) {
                                        // Revert on error
                                        startTransition(() => {
                                          setStatementTransactions((prev) =>
                                            prev.map((item) =>
                                              item.id === tx.id
                                                ? { ...item, category: previousCategory }
                                                : item
                                            )
                                          )
                                        })
                                        const errorData = await response.json().catch(() => ({}))
                                        alert(errorData.error || "Failed to update category")
                                      }
                                    })
                                    .catch((err) => {
                                      // Revert on error
                                      startTransition(() => {
                                        setStatementTransactions((prev) =>
                                          prev.map((item) =>
                                            item.id === tx.id
                                              ? { ...item, category: previousCategory }
                                              : item
                                          )
                                        )
                                      })
                                      console.error(
                                        "Error updating category:",
                                        err
                                      )
                                      alert("Error updating category")
                                    })
                                }}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(tx.amount)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {tx.balance !== null
                                ? formatCurrency(tx.balance)
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No transactions found for this statement.
                    </p>
                  )}
                </DialogContent>
              </Dialog>

              <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                  setDeleteDialogOpen(open)
                  if (!open) {
                    setStatementToDelete(null)
                  }
                }}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete report?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove{" "}
                      <span className="font-medium">
                        {statementToDelete?.name ?? "this report"}
                      </span>{" "}
                      and its transactions from Neon storage.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteLoading}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleDeleteStatement}
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? (
                        <>
                          <IconLoader2 className="mr-2 size-4 animate-spin" />
                          Deleting…
                        </>
                      ) : (
                        <>
                          <IconTrash className="mr-2 size-4" />
                          Delete
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

