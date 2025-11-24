"use client"

import * as React from "react"
import {
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconCircleCheckFilled,
    IconDotsVertical,
    IconLayoutColumns,
    IconPlus,
    IconTrash,
    IconEye,
    IconLoader2,
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { CategorySelect } from "@/components/category-select"

export const reportSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    date: z.string(),
    reviewer: z.string(),
    statementId: z.number().optional(),
    fileId: z.string().nullable().optional(),
})

// Transaction Row Component with Delete Button and Editable Category
function TransactionRow({ 
    transaction, 
    onDelete,
    onCategoryChange
}: { 
    transaction: {
        id: number;
        date: string;
        description: string;
        amount: number;
        balance: number | null;
        category: string;
    };
    onDelete: () => void;
    onCategoryChange: (transactionId: number, newCategory: string) => void;
}) {
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);
    const [updatingCategory, setUpdatingCategory] = React.useState(false);
    const [currentCategory, setCurrentCategory] = React.useState(transaction.category);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const response = await fetch(`/api/transactions/${transaction.id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                onDelete();
                setDeleteOpen(false);
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("Failed to delete transaction:", errorData.error || response.statusText);
                alert(`Failed to delete transaction: ${errorData.error || response.statusText}`);
            }
        } catch (error) {
            console.error("Error deleting transaction:", error);
            alert(`Error deleting transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setDeleting(false);
        }
    };

    const handleCategoryChange = async (newCategory: string) => {
        if (newCategory === currentCategory) return;

        setUpdatingCategory(true);
        try {
            const response = await fetch(`/api/transactions/${transaction.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ category: newCategory }),
            });

            if (response.ok) {
                setCurrentCategory(newCategory);
                onCategoryChange(transaction.id, newCategory);
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("Failed to update category:", errorData.error || response.statusText);
                alert(`Failed to update category: ${errorData.error || response.statusText}`);
                // Revert to previous category on error
                setCurrentCategory(transaction.category);
            }
        } catch (error) {
            console.error("Error updating category:", error);
            alert(`Error updating category: ${error instanceof Error ? error.message : 'Unknown error'}`);
            // Revert to previous category on error
            setCurrentCategory(transaction.category);
        } finally {
            setUpdatingCategory(false);
        }
    };

    return (
        <TableRow>
            <TableCell className="font-mono text-sm">
                {new Date(transaction.date).toLocaleDateString()}
            </TableCell>
            <TableCell>{transaction.description}</TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <CategorySelect
                        value={currentCategory}
                        onValueChange={handleCategoryChange}
                    />
                    {updatingCategory && (
                        <IconLoader2 className="size-4 animate-spin text-muted-foreground" />
                    )}
                </div>
            </TableCell>
            <TableCell className={`text-right font-mono ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {transaction.amount >= 0 ? '+' : ''}{transaction.amount.toFixed(2)}
            </TableCell>
            <TableCell className="text-right font-mono text-muted-foreground">
                {transaction.balance !== null ? transaction.balance.toFixed(2) : '-'}
            </TableCell>
            <TableCell className="text-right">
                <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={deleting}
                        >
                            {deleting ? (
                                <IconLoader2 className="size-4 animate-spin" />
                            ) : (
                                <IconTrash className="size-4" />
                            )}
                            <span className="sr-only">Delete transaction</span>
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this transaction
                                from the database.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                disabled={deleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {deleting ? (
                                    <>
                                        <IconLoader2 className="size-4 animate-spin mr-2" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Delete"
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </TableCell>
        </TableRow>
    );
}

const createColumns = (onDelete?: (statementId: string) => void): ColumnDef<z.infer<typeof reportSchema>>[] => [
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
        accessorKey: "name",
        header: "Document Name",
        cell: ({ row }) => (
            <div className="font-medium">{row.original.name}</div>
        ),
        enableHiding: false,
    },
    {
        accessorKey: "type",
        header: "Source",
        cell: ({ row }) => {
            const isIncomeExpenses = row.original.type === "Income/Expenses"
            return (
                <Badge
                    variant="outline"
                    className={`text-muted-foreground px-2 ${isIncomeExpenses
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-green-500/50 bg-green-500/10"
                        }`}
                >
                    {row.original.type}
                </Badge>
            )
        },
    },
    {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => {
            const date = new Date(row.original.date)
            return (
                <div className="text-sm">
                    {date.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    })}
                </div>
            )
        },
    },
    {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
            const [deleteOpen, setDeleteOpen] = React.useState(false);
            const [viewOpen, setViewOpen] = React.useState(false);
            const [transactions, setTransactions] = React.useState<Array<{
                id: number;
                date: string;
                description: string;
                amount: number;
                balance: number | null;
                category: string;
            }>>([]);
            const [loading, setLoading] = React.useState(false);

            const handleDelete = () => {
                if (onDelete) {
                    onDelete(row.original.id);
                }
            };

            const handleView = async () => {
                setViewOpen(true);
                const statementId = (row.original as any).statementId;
                if (!statementId) {
                    console.error("No statement ID found");
                    return;
                }

                setLoading(true);
                try {
                    const response = await fetch(`/api/statements/${statementId}/transactions`);
                    if (response.ok) {
                        const data = await response.json();
                        setTransactions(data);
                    } else {
                        console.error("Failed to fetch transactions");
                        setTransactions([]);
                    }
                } catch (error) {
                    console.error("Error fetching transactions:", error);
                    setTransactions([]);
                } finally {
                    setLoading(false);
                }
            };

            return (
                <div className="flex justify-end gap-2">
                    {/* View Button */}
                    <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Transactions - {row.original.name}</DialogTitle>
                                <DialogDescription>
                                    View all transactions from this statement
                                </DialogDescription>
                            </DialogHeader>
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : transactions.length > 0 ? (
                                <div className="mt-4">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead className="text-right">Balance</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transactions.map((tx) => (
                                                <TransactionRow 
                                                    key={tx.id} 
                                                    transaction={tx}
                                                    onDelete={() => {
                                                        // Remove from local state
                                                        setTransactions(prev => prev.filter(t => t.id !== tx.id));
                                                    }}
                                                    onCategoryChange={(transactionId, newCategory) => {
                                                        // Update the category in local state
                                                        setTransactions(prev => prev.map(t => 
                                                            t.id === transactionId 
                                                                ? { ...t, category: newCategory }
                                                                : t
                                                        ));
                                                    }}
                                                />
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="py-8 text-center text-muted-foreground">
                                    No transactions found for this statement.
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleView}
                        className="hover:bg-accent"
                    >
                        <IconEye className="size-4" />
                        <span className="sr-only">View transactions</span>
                    </Button>

                    {/* Delete Button */}
                    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <IconTrash className="size-4" />
                                <span className="sr-only">Delete</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete
                                    <strong> "{row.original.name}"</strong> and remove all associated
                                    transactions from the database.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDelete}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            );
        },
    },
]

export function ReportsDataTable({
    data,
    onDelete,
    loading = false,
}: {
    data: z.infer<typeof reportSchema>[]
    onDelete?: (statementId: string) => void
    loading?: boolean
}) {
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

    const columns = React.useMemo(() => createColumns(onDelete), [onDelete]);

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
        getRowId: (row) => row.id,
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

    return (
        <div className="w-full flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-1 items-center gap-2">
                    <Input
                        placeholder="Search documents..."
                        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn("name")?.setFilterValue(event.target.value)
                        }
                        className="max-w-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <IconChevronDown />
                                Filter
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <div className="p-2">
                                <Label className="text-xs font-medium mb-2 block">Source</Label>
                                <Select
                                    value={(table.getColumn("type")?.getFilterValue() as string) ?? "all"}
                                    onValueChange={(value) =>
                                        table.getColumn("type")?.setFilterValue(value === "all" ? "" : value)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="All Sources" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sources</SelectItem>
                                        <SelectItem value="Income/Expenses">Income/Expenses</SelectItem>
                                        <SelectItem value="Fridge/Receipts">Fridge/Receipts</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <IconLayoutColumns />
                                <span className="hidden lg:inline">Columns</span>
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
                        <span className="hidden lg:inline">Export</span>
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-lg border">
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
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
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
            </div>

            {/* Pagination */}
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
        </div>
    )
}
