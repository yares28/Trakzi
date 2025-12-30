import type { Dispatch, SetStateAction } from "react"
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconEye,
  IconLoader2,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
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
} from "@/components/ui/alert-dialog"

import { PAGE_SIZE_OPTIONS } from "../constants"
import { formatDateLabel } from "../formatters"
import type { Statement } from "../types"

type ReportsTableProps = {
  statements: Statement[]
  filteredStatements: Statement[]
  uniqueReportTypes: string[]
  selectedReportType: string
  onReportTypeChange: (value: string) => void
  reportsSearch: string
  onReportsSearchChange: (value: string) => void
  reportsPage: number
  onReportsPageChange: (value: number) => void
  reportsPageSize: number
  onReportsPageSizeChange: (value: number) => void
  selectedReportIds: Set<string>
  setSelectedReportIds: Dispatch<SetStateAction<Set<string>>>
  onViewStatement: (statement: Statement) => void
  onRequestDelete: (statement: Statement) => void
  viewLoading: boolean
  selectedStatementId: string | null
  deleteLoading: boolean
  statementToDelete: Statement | null
  deleteDialogOpen: boolean
  onDeleteDialogOpenChange: (open: boolean) => void
  onDeleteStatement: () => void
}

export function ReportsTable({
  statements,
  filteredStatements,
  uniqueReportTypes,
  selectedReportType,
  onReportTypeChange,
  reportsSearch,
  onReportsSearchChange,
  reportsPage,
  onReportsPageChange,
  reportsPageSize,
  onReportsPageSizeChange,
  selectedReportIds,
  setSelectedReportIds,
  onViewStatement,
  onRequestDelete,
  viewLoading,
  selectedStatementId,
  deleteLoading,
  statementToDelete,
  deleteDialogOpen,
  onDeleteDialogOpenChange,
  onDeleteStatement,
}: ReportsTableProps) {
  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <CardTitle>Reports</CardTitle>
            <Badge variant="secondary">
              {filteredStatements.length}
              {statements.length !== filteredStatements.length &&
                ` of ${statements.length}`}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {uniqueReportTypes.length > 0 && (
              <Select value={selectedReportType} onValueChange={onReportTypeChange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {uniqueReportTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={reportsSearch}
                onChange={(e) => onReportsSearchChange(e.target.value)}
                className="pl-9 pr-9"
              />
              {reportsSearch && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => onReportsSearchChange("")}
                >
                  <IconX className="size-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredStatements.length > 0 &&
                        (() => {
                          const startIndex = reportsPage * reportsPageSize
                          const endIndex = startIndex + reportsPageSize
                          const pageData = filteredStatements.slice(
                            startIndex,
                            endIndex
                          )
                          return (
                            pageData.length > 0 &&
                            pageData.every((s) => selectedReportIds.has(s.id))
                          )
                        })()
                      }
                      onCheckedChange={(checked) => {
                        const startIndex = reportsPage * reportsPageSize
                        const endIndex = startIndex + reportsPageSize
                        const pageData = filteredStatements.slice(
                          startIndex,
                          endIndex
                        )
                        if (checked) {
                          setSelectedReportIds((prev) => {
                            const next = new Set(prev)
                            pageData.forEach((s) => next.add(s.id))
                            return next
                          })
                        } else {
                          setSelectedReportIds((prev) => {
                            const next = new Set(prev)
                            pageData.forEach((s) => next.delete(s.id))
                            return next
                          })
                        }
                      }}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Report</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const startIndex = reportsPage * reportsPageSize
                  const endIndex = startIndex + reportsPageSize
                  const pageData = filteredStatements.slice(startIndex, endIndex)

                  if (pageData.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                          <p className="text-sm text-muted-foreground">
                            {reportsSearch
                              ? "No reports match your search."
                              : selectedReportType !== "all"
                              ? `No ${selectedReportType} reports found.`
                              : "No reports yet - upload a statement to populate this list."}
                          </p>
                        </TableCell>
                      </TableRow>
                    )
                  }

                  return pageData.map((statement) => (
                    <TableRow key={statement.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedReportIds.has(statement.id)}
                          onCheckedChange={(checked) => {
                            setSelectedReportIds((prev) => {
                              const next = new Set(prev)
                              if (checked) {
                                next.add(statement.id)
                              } else {
                                next.delete(statement.id)
                              }
                              return next
                            })
                          }}
                          aria-label={`Select ${statement.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {statement.name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex size-2 rounded-full"
                            style={{
                              backgroundColor:
                                statement.type === "Receipts"
                                  ? "#10b981"
                                  : statement.type === "Income/Expenses"
                                  ? "#3b82f6"
                                  : "#6b7280",
                            }}
                          />
                          <span>{statement.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateLabel(statement.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onViewStatement(statement)}
                            className="hover:bg-accent"
                          >
                            {viewLoading &&
                            selectedStatementId === statement.id ? (
                              <IconLoader2 className="size-4 animate-spin" />
                            ) : (
                              <IconEye className="size-4" />
                            )}
                            <span className="sr-only">View transactions</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRequestDelete(statement)}
                            disabled={
                              deleteLoading && statementToDelete?.id === statement.id
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
                })()}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span>Rows per page:</span>
              <Select
                value={String(reportsPageSize)}
                onValueChange={(value) => {
                  onReportsPageSizeChange(Number(value))
                  onReportsPageChange(0)
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={reportsPageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {PAGE_SIZE_OPTIONS.map((pageSize) => (
                    <SelectItem key={pageSize} value={String(pageSize)}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="ml-2">
                {filteredStatements.length > 0
                  ? `${Math.min(
                      reportsPage * reportsPageSize + 1,
                      filteredStatements.length
                    )}-${Math.min(
                      (reportsPage + 1) * reportsPageSize,
                      filteredStatements.length
                    )} of ${filteredStatements.length}`
                  : "0 of 0"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => onReportsPageChange(0)}
                disabled={reportsPage === 0}
              >
                <IconChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => onReportsPageChange(Math.max(0, reportsPage - 1))}
                disabled={reportsPage === 0}
              >
                <IconChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() =>
                  onReportsPageChange(
                    Math.min(
                      Math.ceil(filteredStatements.length / reportsPageSize) -
                        1,
                      reportsPage + 1
                    )
                  )
                }
                disabled={
                  reportsPage >=
                  Math.ceil(filteredStatements.length / reportsPageSize) - 1
                }
              >
                <IconChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() =>
                  onReportsPageChange(
                    Math.ceil(filteredStatements.length / reportsPageSize) - 1
                  )
                }
                disabled={
                  reportsPage >=
                  Math.ceil(filteredStatements.length / reportsPageSize) - 1
                }
              >
                <IconChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={onDeleteDialogOpenChange}>
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
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDeleteStatement}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <IconLoader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
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
    </>
  )
}
