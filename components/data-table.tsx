"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconDotsVertical,
  IconGripVertical,
  IconLayoutColumns,
  IconLoader,
  IconPlus,
  IconTrendingUp,
  IconSearch,
  IconX,
  IconTrash,
} from "@tabler/icons-react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { toast } from "sonner"
import { z } from "zod"

import { useIsMobile } from "@/hooks/use-mobile"
import { formatDateForDisplay } from "@/lib/date"
import { useCurrency } from "@/components/currency-provider"
import { TransactionDialog } from "@/components/transaction-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.string(),
  reviewer: z.string(),
})

// Create a separate component for the drag handle
function DragHandle({ id }: { id: UniqueIdentifier }) {
  const { attributes, listeners } = useSortable({
    id,
  })

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="text-muted-foreground size-7 hover:bg-transparent"
    >
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

const defaultColumns: ColumnDef<z.infer<typeof schema>>[] = [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
  },
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "header",
    header: "Description",
    cell: ({ row }) => {
      return <TableCellViewer item={row.original} />
    },
    enableHiding: false,
  },
  {
    accessorKey: "type",
    header: "Category",
    cell: ({ row }) => (
      <div className="w-32">
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {row.original.type}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground px-1.5">
        {row.original.status === "Done" ? (
          <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
        ) : (
          <IconLoader />
        )}
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "target",
    header: () => <div className="w-full text-right pr-2">Budget</div>,
    cell: ({ row }) => (
      <div className="text-right pr-2">
        ${row.original.target}
      </div>
    ),
  },
  {
    accessorKey: "limit",
    header: () => <div className="w-full text-right pr-2">Spent</div>,
    cell: ({ row }) => (
      <div className="text-right pr-2">
        ${row.original.limit}
      </div>
    ),
  },
  {
    accessorKey: "reviewer",
    header: "Payment Method",
    cell: ({ row }) => {
      const isAssigned = row.original.reviewer !== "Assign reviewer"

      if (isAssigned) {
        return row.original.reviewer
      }

      return (
        <>
          <Label htmlFor={`${row.original.id}-reviewer`} className="sr-only">
            Payment Method
          </Label>
          <Select>
            <SelectTrigger
              className="w-38 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              size="sm"
              id={`${row.original.id}-reviewer`}
            >
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="Credit Card">Credit Card</SelectItem>
              <SelectItem value="Debit Card">Debit Card</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
        </>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      // This will be overridden in the DataTable component to have access to delete function
      return null
    },
  },
]

function DraggableRow<TData>({ row }: { row: Row<TData> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: (row.original as any).id,
  })

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

interface DataTableProps<TData, TValue> {
  data: TData[]
  columns?: ColumnDef<TData, TValue>[]
}

export function DataTable<TData, TValue>({
  data: initialData,
  columns = defaultColumns as unknown as ColumnDef<TData, TValue>[],
  transactions,
  onTransactionAdded,
  transactionDialogOpen,
  onTransactionDialogOpenChange,
}: DataTableProps<TData, TValue> & {
  transactions?: Array<{
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
  }>
  onTransactionAdded?: () => void
  transactionDialogOpen?: boolean
  onTransactionDialogOpenChange?: (open: boolean) => void
}) {
  const { formatCurrency } = useCurrency()
  const [data, setData] = React.useState(() => initialData)
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [transactionPagination, setTransactionPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all")
  const [deletingId, setDeletingId] = React.useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [transactionToDelete, setTransactionToDelete] = React.useState<number | null>(null)
  const [selectedTransactionIds, setSelectedTransactionIds] = React.useState<Set<number>>(new Set())
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = React.useState(false)
  const [isBatchDeleting, setIsBatchDeleting] = React.useState(false)
  // Use external dialog state if provided, otherwise use internal state
  const [internalDialogOpen, setInternalDialogOpen] = React.useState(false)
  const isDialogOpen = transactionDialogOpen !== undefined ? transactionDialogOpen : internalDialogOpen
  const setIsDialogOpen = onTransactionDialogOpenChange || setInternalDialogOpen
  const sortableId = React.useId()

  // Delete transaction handler
  const handleDeleteTransaction = React.useCallback(async () => {
    if (!transactionToDelete || deletingId === transactionToDelete) return

    setDeletingId(transactionToDelete)
    try {
      const response = await fetch(`/api/transactions/${transactionToDelete}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete transaction")
      }

      toast.success("Transaction deleted successfully")
      setDeleteDialogOpen(false)
      setTransactionToDelete(null)

      // Refresh transactions
      if (onTransactionAdded) {
        onTransactionAdded()
      }

      // Reload the page after a short delay to ensure deletion is committed
      setTimeout(() => {
        window.location.reload()
      }, 300)
    } catch (error: any) {
      console.error("[Delete Transaction] Error:", error)
      toast.error(error.message || "Failed to delete transaction")
    } finally {
      setDeletingId(null)
    }
  }, [transactionToDelete, deletingId, onTransactionAdded])

  // Batch delete handler
  const handleBatchDelete = React.useCallback(async () => {
    if (selectedTransactionIds.size === 0 || isBatchDeleting) return

    setIsBatchDeleting(true)
    try {
      // Delete all selected transactions in parallel
      const deletePromises = Array.from(selectedTransactionIds).map(async (id) => {
        const response = await fetch(`/api/transactions/${id}`, {
          method: "DELETE",
        })
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || `Failed to delete transaction ${id}`)
        }
        return id
      })

      await Promise.all(deletePromises)

      toast.success(`Successfully deleted ${selectedTransactionIds.size} transaction(s)`)
      setBatchDeleteDialogOpen(false)
      setSelectedTransactionIds(new Set())

      // Refresh transactions
      if (onTransactionAdded) {
        onTransactionAdded()
      }

      // Reload the page after a short delay to ensure deletions are committed
      setTimeout(() => {
        window.location.reload()
      }, 300)
    } catch (error: any) {
      console.error("[Batch Delete] Error:", error)
      toast.error(error.message || "Failed to delete some transactions")
    } finally {
      setIsBatchDeleting(false)
    }
  }, [selectedTransactionIds, isBatchDeleting, onTransactionAdded])

  // Toggle transaction selection
  const toggleTransactionSelection = React.useCallback((id: number) => {
    setSelectedTransactionIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Open delete dialog
  const openDeleteDialog = React.useCallback((transactionId: number) => {
    setTransactionToDelete(transactionId)
    setDeleteDialogOpen(true)
  }, [])

  // Override actions column with delete button
  const columnsWithDelete = React.useMemo(() => {
    return columns.map((col) => {
      if (col.id === "actions") {
        return {
          ...col,
          cell: ({ row }: { row: Row<TData> }) => {
            const rowData = row.original as any
            const transactionId = rowData.id
            if (transactions && transactionId) {
              return (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => openDeleteDialog(transactionId)}
                >
                  <IconTrash className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              )
            }
            return null
          },
        } as ColumnDef<TData, TValue>
      }
      return col
    })
  }, [columns, transactions, openDeleteDialog])
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  // Update internal data when prop data changes
  React.useEffect(() => {
    setData(initialData)
  }, [initialData])

  // Get unique categories from transactions
  const uniqueCategories = React.useMemo(() => {
    if (!transactions || transactions.length === 0) return []
    const categories = new Set(transactions.map(tx => tx.category).filter(Boolean))
    return Array.from(categories).sort()
  }, [transactions])

  // Filter transactions based on search and category
  const filteredTransactions = React.useMemo(() => {
    if (!transactions || transactions.length === 0) return []

    let filtered = transactions

    // Filter by category
    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter(tx => tx.category === selectedCategory)
    }

    // Filter by search term (description)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(tx =>
        tx.description.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [transactions, selectedCategory, searchTerm])

  // Toggle all transactions on current page
  const toggleAllTransactions = React.useCallback(() => {
    if (!filteredTransactions || filteredTransactions.length === 0) return

    const pageSize = transactionPagination.pageSize
    const maxItems = 10000
    const limitedTransactions = filteredTransactions.slice(0, maxItems)
    const currentPage = transactionPagination.pageIndex
    const startIndex = currentPage * pageSize
    const endIndex = startIndex + pageSize
    const pageData = limitedTransactions.slice(startIndex, endIndex)

    const pageIds = new Set(pageData.map(tx => tx.id))
    const allSelected = pageIds.size > 0 && Array.from(pageIds).every(id => selectedTransactionIds.has(id))

    setSelectedTransactionIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        // Deselect all on current page
        pageIds.forEach(id => next.delete(id))
      } else {
        // Select all on current page
        pageIds.forEach(id => next.add(id))
      }
      return next
    })
  }, [filteredTransactions, transactionPagination, selectedTransactionIds])

  // Reset pagination when filters change
  React.useEffect(() => {
    setTransactionPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [selectedCategory, searchTerm])

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map((item: any) => item.id) || [],
    [data]
  )

  const table = useReactTable({
    data,
    columns: columnsWithDelete,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row: any) => row.id?.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(data, oldIndex, newIndex)
      })
    }
  }

  return (
    <div className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between px-4 lg:px-6 mb-5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Latest Transactions</h2>
          {filteredTransactions && filteredTransactions.length > 0 && (
            <Badge variant="secondary">
              {filteredTransactions.length}
              {transactions && transactions.length !== filteredTransactions.length &&
                ` of ${transactions.length}`}
            </Badge>
          )}
          {selectedTransactionIds.size > 0 && (
            <Badge variant="destructive" className="gap-1">
              {selectedTransactionIds.size} selected
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedTransactionIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBatchDeleteDialogOpen(true)}
              className="gap-1"
              disabled={isBatchDeleting}
            >
              {isBatchDeleting ? (
                <>
                  <IconLoader className="size-4 animate-spin" />
                  <span className="hidden lg:inline">Deleting...</span>
                </>
              ) : (
                <>
                  <IconTrash className="size-4" />
                  <span className="hidden lg:inline">Delete Selected ({selectedTransactionIds.size})</span>
                </>
              )}
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <IconPlus className="size-4" />
            <span className="hidden lg:inline">Add Transaction</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 px-4 lg:px-6 mb-5">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchTerm("")}
            >
              <IconX className="size-4" />
            </Button>
          )}
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {uniqueCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        {transactions && Array.isArray(transactions) && transactions.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          filteredTransactions.length > 0 &&
                          (() => {
                            const pageSize = transactionPagination.pageSize
                            const maxItems = 10000
                            const limitedTransactions = filteredTransactions.slice(0, maxItems)
                            const currentPage = transactionPagination.pageIndex
                            const startIndex = currentPage * pageSize
                            const endIndex = startIndex + pageSize
                            const pageData = limitedTransactions.slice(startIndex, endIndex)
                            const pageIds = pageData.map(tx => tx.id)
                            return pageIds.length > 0 && pageIds.every(id => selectedTransactionIds.has(id))
                          })()
                        }
                        onCheckedChange={toggleAllTransactions}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Category</TableHead>
                    {filteredTransactions.some(tx => tx.balance !== null) && (
                      <TableHead className="text-right">Balance</TableHead>
                    )}
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Determine if balance column should be shown (check original transactions, not filtered)
                    const hasBalanceColumn = transactions?.some(tx => tx.balance !== null) ?? false
                    const baseColSpan = hasBalanceColumn ? 6 : 5

                    if (!filteredTransactions || filteredTransactions.length === 0) {
                      const colSpanWithCheckbox = baseColSpan + 1 // Add 1 for checkbox column
                      return (
                        <TableRow>
                          <TableCell colSpan={colSpanWithCheckbox} className="h-24 text-center">
                            {searchTerm || selectedCategory !== "all"
                              ? "No transactions match your filters"
                              : "No transactions found"}
                          </TableCell>
                        </TableRow>
                      )
                    }

                    const pageSize = transactionPagination.pageSize
                    const maxPages = 1000 // 10000 transactions / 10 per page = 1000 pages
                    const maxItems = 10000 // Maximum 10000 transactions
                    const limitedTransactions = filteredTransactions.slice(0, maxItems)
                    const currentPage = transactionPagination.pageIndex
                    const startIndex = currentPage * pageSize
                    const endIndex = startIndex + pageSize
                    const pageData = limitedTransactions.slice(startIndex, endIndex)
                    const totalPages = Math.min(Math.ceil(limitedTransactions.length / pageSize), maxPages)

                    if (pageData.length === 0) {
                      const colSpanWithCheckbox = baseColSpan + 1 // Add 1 for checkbox column
                      return (
                        <TableRow>
                          <TableCell colSpan={colSpanWithCheckbox} className="h-24 text-center">
                            No transactions on this page
                          </TableCell>
                        </TableRow>
                      )
                    }

                    return pageData.map((tx) => (
                      <TableRow
                        key={tx.id}
                        className="group relative"
                        data-state={selectedTransactionIds.has(tx.id) ? "selected" : undefined}
                      >
                        <TableCell className="w-12">
                          <Checkbox
                            checked={selectedTransactionIds.has(tx.id)}
                            onCheckedChange={() => toggleTransactionSelection(tx.id)}
                            aria-label={`Select transaction ${tx.id}`}
                          />
                        </TableCell>
                        <TableCell className="w-28 flex-shrink-0">
                          {formatDateForDisplay(tx.date, "en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="min-w-[350px] max-w-[600px]">
                          <div className="truncate" title={tx.description}>
                            {tx.description}
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-medium w-24 flex-shrink-0 ${tx.amount < 0 ? "text-red-500" : "text-green-500"}`}>
                          {formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell className="w-[140px] flex-shrink-0">
                          <Badge variant="outline">{tx.category}</Badge>
                        </TableCell>
                        {filteredTransactions.some(t => t.balance !== null) && (
                          <TableCell className="text-right w-32 flex-shrink-0">
                            {tx.balance !== null ? formatCurrency(tx.balance) : "-"}
                          </TableCell>
                        )}
                        <TableCell className="w-12 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            onClick={() => openDeleteDialog(tx.id)}
                            disabled={deletingId === tx.id}
                            title="Delete transaction"
                          >
                            {deletingId === tx.id ? (
                              <IconLoader className="h-4 w-4 animate-spin" />
                            ) : (
                              <IconTrash className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  })()}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between mt-4">
              {(() => {
                const pageSize = transactionPagination.pageSize
                const maxPages = 500 // 10000 transactions / 20 per page = 500 pages
                const maxItems = 10000 // Maximum 10000 transactions
                const limitedTransactions = filteredTransactions.slice(0, maxItems)
                const currentPage = transactionPagination.pageIndex
                const startIndex = currentPage * pageSize
                const endIndex = startIndex + pageSize
                const totalPages = Math.min(Math.ceil(limitedTransactions.length / pageSize), maxPages)
                const showingStart = Math.min(startIndex + 1, limitedTransactions.length)
                const showingEnd = Math.min(endIndex, limitedTransactions.length)

                return (
                  <>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <span>Rows per page:</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(value) => {
                          setTransactionPagination({ pageIndex: 0, pageSize: Number(value) })
                        }}
                      >
                        <SelectTrigger className="h-8 w-[70px]">
                          <SelectValue placeholder={pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                          {[10, 20, 30, 50, 100].map((size) => (
                            <SelectItem key={size} value={String(size)}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="ml-2">
                        {limitedTransactions.length > 0
                          ? `${showingStart}-${showingEnd} of ${limitedTransactions.length}`
                          : "0 of 0"}
                        {transactions && transactions.length > maxItems && ` (max ${maxItems})`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => setTransactionPagination({ ...transactionPagination, pageIndex: 0 })}
                        disabled={currentPage === 0}
                      >
                        <IconChevronsLeft className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => setTransactionPagination({ ...transactionPagination, pageIndex: Math.max(0, currentPage - 1) })}
                        disabled={currentPage === 0}
                      >
                        <IconChevronLeft className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => setTransactionPagination({ ...transactionPagination, pageIndex: Math.min(totalPages - 1, currentPage + 1) })}
                        disabled={currentPage >= totalPages - 1}
                      >
                        <IconChevronRight className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => setTransactionPagination({ ...transactionPagination, pageIndex: totalPages - 1 })}
                        disabled={currentPage >= totalPages - 1}
                      >
                        <IconChevronsRight className="size-4" />
                      </Button>
                    </div>
                  </>
                )
              })()}
            </div>
          </>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <p className="text-muted-foreground">No transactions found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Import a bank statement to see your transactions here
              </p>
            </div>
          </div>
        )}
      </div>
      <TransactionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => {
          if (onTransactionAdded) {
            onTransactionAdded()
          }
        }}
      />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              {transactionToDelete && transactions ? (
                (() => {
                  const tx = transactions.find(t => t.id === transactionToDelete)
                  return tx ? (
                    <>
                      Are you sure you want to delete this transaction? This action cannot be undone.
                      <div className="mt-4 rounded-md bg-muted p-3 text-left">
                        <div className="font-medium">{tx.description}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatDateForDisplay(tx.date, "en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })} • {formatCurrency(tx.amount)} • {tx.category}
                        </div>
                      </div>
                    </>
                  ) : "Are you sure you want to delete this transaction? This action cannot be undone."
                })()
              ) : (
                "Are you sure you want to delete this transaction? This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTransaction}
              disabled={deletingId !== null}
              className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-800"
            >
              {deletingId !== null ? (
                <>
                  <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Transactions</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-2">
                Are you sure you want to delete {selectedTransactionIds.size} transaction(s)? This action cannot be undone.
              </p>
              {transactions && selectedTransactionIds.size > 0 && (
                <div className="mt-4 rounded-md bg-muted p-3 text-left max-h-48 overflow-y-auto space-y-2">
                  {Array.from(selectedTransactionIds).slice(0, 5).map((id) => {
                    const tx = transactions.find(t => t.id === id)
                    if (!tx) return null
                    return (
                      <div key={id}>
                        <div className="font-medium">{tx.description}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatDateForDisplay(tx.date, "en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })} • {formatCurrency(tx.amount)} • {tx.category}
                        </div>
                      </div>
                    )
                  })}
                  {selectedTransactionIds.size > 5 && (
                    <div className="text-sm text-muted-foreground pt-2">
                      ...and {selectedTransactionIds.size - 5} more
                    </div>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBatchDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={isBatchDeleting}
              className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-800"
            >
              {isBatchDeleting ? (
                <>
                  <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedTransactionIds.size} Transaction${selectedTransactionIds.size > 1 ? 's' : ''}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "Budget",
    color: "var(--primary)",
  },
  mobile: {
    label: "Actual",
    color: "var(--primary)",
  },
} satisfies ChartConfig

function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
  const isMobile = useIsMobile()

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left">
          {item.header}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.header}</DrawerTitle>
          <DrawerDescription>
            Showing expense trends for the last 6 months
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {!isMobile && (
            <>
              <ChartContainer config={chartConfig}>
                <AreaChart
                  accessibilityLayer
                  data={chartData}
                  margin={{
                    left: 0,
                    right: 10,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 3)}
                    hide
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Area
                    dataKey="mobile"
                    type="natural"
                    fill="var(--color-mobile)"
                    fillOpacity={0.6}
                    stroke="var(--color-mobile)"
                    stackId="a"
                  />
                  <Area
                    dataKey="desktop"
                    type="natural"
                    fill="var(--color-desktop)"
                    fillOpacity={0.4}
                    stroke="var(--color-desktop)"
                    stackId="a"
                  />
                </AreaChart>
              </ChartContainer>
              <Separator />
              <div className="grid gap-2">
                <div className="flex gap-2 leading-none font-medium">
                  Spending increased by 5.2% this month{" "}
                  <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  Showing expense breakdown for the last 6 months. Track your spending
                  patterns across different categories to identify savings opportunities.
                </div>
              </div>
              <Separator />
            </>
          )}
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="header">Description</Label>
              <Input id="header" defaultValue={item.header} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="type">Category</Label>
                <Select defaultValue={item.type}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Groceries">Groceries</SelectItem>
                    <SelectItem value="Transportation">
                      Transportation
                    </SelectItem>
                    <SelectItem value="Entertainment">
                      Entertainment
                    </SelectItem>
                    <SelectItem value="Utilities">Utilities</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Shopping">Shopping</SelectItem>
                    <SelectItem value="Dining">Dining</SelectItem>
                    <SelectItem value="Housing">Housing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue={item.status}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="target">Budget</Label>
                <Input id="target" defaultValue={item.target} />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="limit">Spent</Label>
                <Input id="limit" defaultValue={item.limit} />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="reviewer">Payment Method</Label>
              <Select defaultValue={item.reviewer}>
                <SelectTrigger id="reviewer" className="w-full">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Debit Card">Debit Card</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
        </div>
        <DrawerFooter>
          <Button>Submit</Button>
          <DrawerClose asChild>
            <Button variant="outline">Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
