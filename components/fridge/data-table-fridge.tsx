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
    IconDotsVertical,
    IconGripVertical,
    IconLayoutColumns,
    IconMinus,
    IconPlus,
    IconTrash,
} from "@tabler/icons-react"
import {
    ColumnDef,
    ColumnFiltersState,
    ExpandedState,
    flexRender,
    getCoreRowModel,
    getExpandedRowModel,
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
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { formatDateForDisplay } from "@/lib/date"
import { getReceiptCategoryByName } from "@/lib/receipt-categories"

export const schema = z.object({
    id: z.string(),
    storeName: z.string(),
    date: z.string(),
    totalAmount: z.number(),
    items: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            category: z.string(),
            categoryId: z.number().nullable().optional(),
            categoryColor: z.string().nullable().optional(),
            price: z.number(),
            quantity: z.number(),
        })
    ),
})

// Create a separate component for the drag handle
function DragHandle({ id }: { id: string }) {
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

const columns: ColumnDef<z.infer<typeof schema>>[] = [
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
        accessorKey: "storeName",
        header: "Store",
        cell: ({ row }) => {
            return <div className="font-medium">{row.original.storeName}</div>
        },
        enableHiding: false,
    },
    {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => {
            return (
                <div className="text-muted-foreground">
                    {formatDateForDisplay(row.original.date, "en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    })}
                </div>
            )
        },
    },
    {
        accessorKey: "totalAmount",
        header: () => <div className="w-full text-center">Total</div>,
        cell: ({ row }) => (
            <div className="text-center font-medium">
                ${row.original.totalAmount.toFixed(2)}
            </div>
        ),
    },
    {
        id: "itemCount",
        header: () => <div className="w-full text-center">Items</div>,
        cell: ({ row }) => (
            <div className="text-center text-muted-foreground">
                {row.original.items.length} items
            </div>
        ),
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div className="flex items-center justify-end gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground"
                    onClick={() => row.toggleExpanded()}
                >
                    {row.getIsExpanded() ? <IconChevronDown className="size-4" /> : <IconChevronRight className="size-4" />}
                </Button>
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
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        ),
    },
]

function DraggableRow({
    row,
    categories,
    updatingItemIds,
    onItemCategoryChange,
}: {
    row: Row<z.infer<typeof schema>>
    categories: Array<{ name: string; color?: string | null; typeName?: string; typeColor?: string | null; broadType?: string }>
    updatingItemIds: Record<string, boolean>
    onItemCategoryChange: (itemId: string, categoryName: string) => void
}) {
    // Group categories by broad type
    const categoriesByBroadType = React.useMemo(() => {
        const grouped: Record<string, typeof categories> = {}
        categories.forEach((category) => {
            const broadType = category.broadType || "Other"
            if (!grouped[broadType]) {
                grouped[broadType] = []
            }
            grouped[broadType].push(category)
        })
        return grouped
    }, [categories])
    const { transform, transition, setNodeRef, isDragging } = useSortable({
        id: row.original.id,
    })

    return (
        <>
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
            {row.getIsExpanded() && (
                <TableRow>
                    <TableCell colSpan={row.getVisibleCells().length} className="p-0">
                        <div className="bg-muted/30 p-4">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-center">Category</TableHead>
                                        <TableHead className="text-center">Item</TableHead>
                                        <TableHead className="text-center">Quantity</TableHead>
                                        <TableHead className="text-center">Price</TableHead>
                                        <TableHead className="text-center">Total</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {row.original.items.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-background/50">
                                            <TableCell className="text-center">
                                                {categories.length ? (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="mx-auto w-[250px] justify-between"
                                                                disabled={Boolean(updatingItemIds[item.id])}
                                                            >
                                                                <span className="flex items-center gap-2 truncate">
                                                                    {item.category ? (
                                                                        <>
                                                                            <span
                                                                                className="h-2 w-2 shrink-0 rounded-full border border-border/50"
                                                                                style={{
                                                                                    backgroundColor: categories.find((c) => c.name === item.category)?.color ?? item.categoryColor ?? undefined,
                                                                                    borderColor: categories.find((c) => c.name === item.category)?.color ?? item.categoryColor ?? undefined,
                                                                                }}
                                                                            />
                                                                            <span className="truncate">{item.category}</span>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">Select category</span>
                                                                    )}
                                                                </span>
                                                                <IconChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="start" className="w-[250px]">
                                                            {Object.entries(categoriesByBroadType)
                                                                .sort(([a], [b]) => a.localeCompare(b))
                                                                .map(([broadType, typeCategories]) => (
                                                                    <DropdownMenuSub key={broadType}>
                                                                        <DropdownMenuSubTrigger>
                                                                            <span>{broadType}</span>
                                                                        </DropdownMenuSubTrigger>
                                                                        <DropdownMenuPortal>
                                                                            <DropdownMenuSubContent>
                                                                            {typeCategories
                                                                                .sort((a, b) => a.name.localeCompare(b.name))
                                                                                .map((category) => (
                                                                                    <DropdownMenuItem
                                                                                        key={category.name}
                                                                                        onClick={() => onItemCategoryChange(item.id, category.name)}
                                                                                        className="cursor-pointer"
                                                                                    >
                                                                                        <span className="flex items-center gap-2 w-full">
                                                                                            <span
                                                                                                className="h-2 w-2 shrink-0 rounded-full border border-border/50"
                                                                                                style={{
                                                                                                    backgroundColor: category.color ?? undefined,
                                                                                                    borderColor: category.color ?? undefined,
                                                                                                }}
                                                                                            />
                                                                                            <span className="truncate">{category.name}</span>
                                                                                            {category.typeName ? (
                                                                                                <span
                                                                                                    className="ml-auto text-xs text-muted-foreground shrink-0"
                                                                                                    style={
                                                                                                        category.typeColor
                                                                                                            ? { color: category.typeColor }
                                                                                                            : undefined
                                                                                                    }
                                                                                                >
                                                                                                    {category.typeName}
                                                                                                </span>
                                                                                            ) : null}
                                                                                        </span>
                                                                                    </DropdownMenuItem>
                                                                                ))}
                                                                            </DropdownMenuSubContent>
                                                                        </DropdownMenuPortal>
                                                                    </DropdownMenuSub>
                                                                ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        style={
                                                            item.categoryColor
                                                                ? { borderColor: item.categoryColor, color: item.categoryColor }
                                                                : undefined
                                                        }
                                                    >
                                                        {item.category}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center font-medium">{item.name}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-2 group/quantity">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/quantity:opacity-100 transition-opacity">
                                                        <IconMinus className="h-3 w-3" />
                                                    </Button>
                                                    <span className="w-4">{item.quantity}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/quantity:opacity-100 transition-opacity">
                                                        <IconPlus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">${item.price.toFixed(2)}</TableCell>
                                            <TableCell className="text-center">${(item.price * item.quantity).toFixed(2)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <IconDotsVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem className="text-destructive">
                                                                <IconTrash className="mr-2 h-4 w-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>

                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    )
}

export function DataTableFridge({
    data: initialData,
    onReceiptsChanged,
}: {
    data: z.infer<typeof schema>[]
    onReceiptsChanged?: () => void
}) {
    const [data, setData] = React.useState(() => initialData)
    const [categories, setCategories] = React.useState<
        Array<{ name: string; color?: string | null; typeName?: string; typeColor?: string | null; broadType?: string }>
    >([])
    const [updatingItemIds, setUpdatingItemIds] = React.useState<Record<string, boolean>>({})
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
    const [expanded, setExpanded] = React.useState<ExpandedState>({})
    const sortableId = React.useId()
    const sensors = useSensors(
        useSensor(MouseSensor, {}),
        useSensor(TouchSensor, {}),
        useSensor(KeyboardSensor, {})
    )

    const dataIds = React.useMemo<UniqueIdentifier[]>(
        () => data?.map(({ id }) => id) || [],
        [data]
    )

    React.useEffect(() => {
        setData(initialData)
    }, [initialData])

    React.useEffect(() => {
        let cancelled = false

        async function loadCategories() {
            try {
                const response = await fetch("/api/receipt-categories")
                if (!response.ok) return
                const payload = (await response.json()) as Array<{
                    name?: string
                    color?: string | null
                    broadType?: string | null
                    broad_type?: string | null
                    type_name?: string
                    type_color?: string | null
                    typeName?: string
                    typeColor?: string | null
                }>
                if (cancelled) return
                const normalized = Array.isArray(payload)
                    ? payload
                        .map((cat) => {
                            const categoryName = typeof cat?.name === "string" ? cat.name : ""
                            const defaultCategory = getReceiptCategoryByName(categoryName)
                            const broadTypeValue =
                                typeof cat?.broadType === "string"
                                    ? cat.broadType
                                    : typeof cat?.broad_type === "string"
                                        ? cat.broad_type
                                        : defaultCategory?.broadType || "Other"
                            return {
                                name: categoryName,
                                color: typeof cat?.color === "string" ? cat.color : null,
                                typeName:
                                    typeof cat?.typeName === "string"
                                        ? cat.typeName
                                        : typeof cat?.type_name === "string"
                                            ? cat.type_name
                                            : "",
                                typeColor:
                                    typeof cat?.typeColor === "string"
                                        ? cat.typeColor
                                        : typeof cat?.type_color === "string"
                                            ? cat.type_color
                                            : null,
                                broadType: broadTypeValue || "Other",
                            }
                        })
                        .filter((cat) => cat.name.trim().length > 0)
                    : []
                setCategories(normalized)
            } catch {
                // Ignore errors; categories are optional for table rendering.
            }
        }

        void loadCategories()

        return () => {
            cancelled = true
        }
    }, [])

    const updateItemCategory = React.useCallback(
        async (itemId: string, categoryName: string) => {
            setUpdatingItemIds((prev) => ({ ...prev, [itemId]: true }))

            try {
                const response = await fetch(`/api/receipt-transactions/${encodeURIComponent(itemId)}/category`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ categoryName }),
                })

                if (!response.ok) {
                    return
                }

                const updated = (await response.json()) as {
                    categoryId: number | null
                    categoryName: string | null
                    categoryColor: string | null
                }

                setData((prev) =>
                    prev.map((receipt) => ({
                        ...receipt,
                        items: receipt.items.map((item) => {
                            if (item.id !== itemId) return item
                            return {
                                ...item,
                                category: updated.categoryName || categoryName,
                                categoryId: updated.categoryId ?? null,
                                categoryColor: updated.categoryColor ?? null,
                            }
                        }),
                    }))
                )

                onReceiptsChanged?.()
            } finally {
                setUpdatingItemIds((prev) => {
                    const next = { ...prev }
                    delete next[itemId]
                    return next
                })
            }
        },
        [onReceiptsChanged]
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
            expanded,
        },
        getRowId: (row) => row.id,
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        onExpandedChange: setExpanded,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getExpandedRowModel: getExpandedRowModel(),
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
        <Tabs
            defaultValue="all"
            className="w-full flex-col justify-start gap-6"
        >
            <div className="flex items-center justify-between px-4 lg:px-6">
                <Label htmlFor="view-selector" className="sr-only">
                    View
                </Label>
                <Select defaultValue="all">
                    <SelectTrigger
                        className="flex w-fit @4xl/main:hidden"
                        size="sm"
                        id="view-selector"
                    >
                        <SelectValue placeholder="Select a view" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Receipts</SelectItem>
                    </SelectContent>
                </Select>
                <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
                    <TabsTrigger value="all">All Receipts</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <IconLayoutColumns />
                                <span className="hidden lg:inline">Customize Columns</span>
                                <span className="lg:hidden">Columns</span>
                                <IconChevronDown />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            {table
                                .getAllColumns()
                                .filter(
                                    (column) =>
                                        typeof column.accessorFn !== "undefined" &&
                                        column.getCanHide()
                                )
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) =>
                                                column.toggleVisibility(!!value)
                                            }
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    )
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm">
                        <IconPlus />
                        <span className="hidden lg:inline">Add Receipt</span>
                    </Button>
                </div>
            </div>
            <TabsContent
                value="all"
                className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
            >
                <div className="overflow-hidden rounded-lg border">
                    <DndContext
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis]}
                        onDragEnd={handleDragEnd}
                        sensors={sensors}
                        id={sortableId}
                    >
                        <Table>
                            <TableHeader className="bg-muted sticky top-0 z-10">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => {
                                            return (
                                                <TableHead key={header.id} colSpan={header.colSpan}>
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                </TableHead>
                                            )
                                        })}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody className="**:data-[slot=table-cell]:first:w-8">
                                {table.getRowModel().rows?.length ? (
                                    <SortableContext
                                        items={dataIds}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {table.getRowModel().rows.map((row) => (
                                            <DraggableRow
                                                key={row.id}
                                                row={row}
                                                categories={categories}
                                                updatingItemIds={updatingItemIds}
                                                onItemCategoryChange={updateItemCategory}
                                            />
                                        ))}
                                    </SortableContext>
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={columns.length}
                                            className="h-24 text-center"
                                        >
                                            No results.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </DndContext>
                </div>
                <div className="flex items-center justify-between px-4">
                    <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
                        {table.getFilteredSelectedRowModel().rows.length} of{" "}
                        {table.getFilteredRowModel().rows.length} row(s) selected.
                    </div>
                    <div className="flex w-full items-center gap-8 lg:w-fit">
                        <div className="hidden items-center gap-2 lg:flex">
                            <Label htmlFor="rows-per-page" className="text-sm font-medium">
                                Rows per page
                            </Label>
                            <Select
                                value={`${table.getState().pagination.pageSize}`}
                                onValueChange={(value) => {
                                    table.setPageSize(Number(value))
                                }}
                            >
                                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                                    <SelectValue
                                        placeholder={table.getState().pagination.pageSize}
                                    />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[10, 20, 30, 40, 50].map((pageSize) => (
                                        <SelectItem key={pageSize} value={`${pageSize}`}>
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex w-fit items-center justify-center text-sm font-medium">
                            Page {table.getState().pagination.pageIndex + 1} of{" "}
                            {table.getPageCount()}
                        </div>
                        <div className="ml-auto flex items-center gap-2 lg:ml-0">
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 lg:flex"
                                onClick={() => table.setPageIndex(0)}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <span className="sr-only">Go to first page</span>
                                <IconChevronsLeft />
                            </Button>
                            <Button
                                variant="outline"
                                className="size-8"
                                size="icon"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <span className="sr-only">Go to previous page</span>
                                <IconChevronLeft />
                            </Button>
                            <Button
                                variant="outline"
                                className="size-8"
                                size="icon"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                <span className="sr-only">Go to next page</span>
                                <IconChevronRight />
                            </Button>
                            <Button
                                variant="outline"
                                className="hidden size-8 lg:flex"
                                size="icon"
                                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                disabled={!table.getCanNextPage()}
                            >
                                <span className="sr-only">Go to last page</span>
                                <IconChevronsRight />
                            </Button>
                        </div>
                    </div>
                </div>
            </TabsContent>
        </Tabs>
    )
}
