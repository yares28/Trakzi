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
import { TransactionDialog } from "@/components/transaction-dialog"
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
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>Make a copy</DropdownMenuItem>
          <DropdownMenuItem>Favorite</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
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
}) {
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
    pageSize: 20,
  })
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const sortableId = React.useId()
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
    columns,
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
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsDialogOpen(true)}
          >
            <IconPlus />
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
        {(() => {
          console.log("[DataTable] Transactions prop:", transactions)
          console.log("[DataTable] Transactions length:", transactions?.length)
          console.log("[DataTable] Is array?", Array.isArray(transactions))
          if (transactions && transactions.length > 0) {
            console.log("[DataTable] First transaction:", transactions[0])
          }
          return null
        })()}
        {transactions && Array.isArray(transactions) && transactions.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Category</TableHead>
                    {filteredTransactions.some(tx => tx.balance !== null) && (
                      <TableHead className="text-right">Balance</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    if (!filteredTransactions || filteredTransactions.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            {searchTerm || selectedCategory !== "all" 
                              ? "No transactions match your filters"
                              : "No transactions found"}
                          </TableCell>
                        </TableRow>
                      )
                    }
                    
                    const pageSize = transactionPagination.pageSize
                    const maxPages = 500 // 10000 transactions / 20 per page = 500 pages
                    const maxItems = 10000 // Maximum 10000 transactions
                    const limitedTransactions = filteredTransactions.slice(0, maxItems)
                    const currentPage = transactionPagination.pageIndex
                    const startIndex = currentPage * pageSize
                    const endIndex = startIndex + pageSize
                    const pageData = limitedTransactions.slice(startIndex, endIndex)
                    const totalPages = Math.min(Math.ceil(limitedTransactions.length / pageSize), maxPages)
                    
                    if (pageData.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            No transactions on this page
                          </TableCell>
                        </TableRow>
                      )
                    }
                    
                    return pageData.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="w-28 flex-shrink-0">
                          {new Date(tx.date).toLocaleDateString("en-US", {
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
                          {tx.amount.toFixed(2)}€
                        </TableCell>
                        <TableCell className="w-[140px] flex-shrink-0">
                          <Badge variant="outline">{tx.category}</Badge>
                        </TableCell>
                        {filteredTransactions.some(t => t.balance !== null) && (
                          <TableCell className="text-right w-32 flex-shrink-0">
                            {tx.balance !== null ? `${tx.balance.toFixed(2)}€` : "-"}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  })()}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between px-4">
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
                    <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
                      Showing {showingStart} to {showingEnd} of {limitedTransactions.length} transaction(s)
                      {transactions.length > maxItems && ` (showing first ${maxItems} of ${transactions.length} total)`}
                    </div>
                    <div className="flex w-full items-center gap-8 lg:w-fit">
                      <div className="hidden items-center gap-2 lg:flex">
                        <Label htmlFor="tx-rows-per-page" className="text-sm font-medium">
                          Rows per page
                        </Label>
                        <Select
                          value={`${pageSize}`}
                          onValueChange={() => {}}
                          disabled
                        >
                          <SelectTrigger size="sm" className="w-20" id="tx-rows-per-page">
                            <SelectValue placeholder={pageSize} />
                          </SelectTrigger>
                          <SelectContent side="top">
                            <SelectItem value={`${pageSize}`}>{pageSize}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex w-fit items-center justify-center text-sm font-medium">
                        Page {currentPage + 1} of {totalPages}
                      </div>
                      <div className="ml-auto flex items-center gap-2 lg:ml-0">
                        <Button
                          variant="outline"
                          className="hidden h-8 w-8 p-0 lg:flex"
                          onClick={() => setTransactionPagination({ ...transactionPagination, pageIndex: 0 })}
                          disabled={currentPage === 0}
                        >
                          <span className="sr-only">Go to first page</span>
                          <IconChevronsLeft />
                        </Button>
                        <Button
                          variant="outline"
                          className="size-8"
                          size="icon"
                          onClick={() => setTransactionPagination({ ...transactionPagination, pageIndex: Math.max(0, currentPage - 1) })}
                          disabled={currentPage === 0}
                        >
                          <span className="sr-only">Go to previous page</span>
                          <IconChevronLeft />
                        </Button>
                        <Button
                          variant="outline"
                          className="size-8"
                          size="icon"
                          onClick={() => setTransactionPagination({ ...transactionPagination, pageIndex: Math.min(totalPages - 1, currentPage + 1) })}
                          disabled={currentPage >= totalPages - 1}
                        >
                          <span className="sr-only">Go to next page</span>
                          <IconChevronRight />
                        </Button>
                        <Button
                          variant="outline"
                          className="hidden size-8 lg:flex"
                          size="icon"
                          onClick={() => setTransactionPagination({ ...transactionPagination, pageIndex: totalPages - 1 })}
                          disabled={currentPage >= totalPages - 1}
                        >
                          <span className="sr-only">Go to last page</span>
                          <IconChevronsRight />
                        </Button>
                      </div>
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
