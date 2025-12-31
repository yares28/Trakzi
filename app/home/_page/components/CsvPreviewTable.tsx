import { IconInfoCircle } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { ParsedRow } from "../types"
import { MemoizedTableRow } from "./MemoizedTableRow"

type CsvPreviewTableProps = {
  parsedCsv: string | null
  parsedRows: ParsedRow[]
  selectedParsedRowIds: Set<number>
  transactionCount: number
  droppedFile: File | null
  isParsing: boolean
  parseError: string | null
  isImporting: boolean
  isAiReparsing: boolean
  onDeleteSelectedRows: () => void
  onOpenAiReparse: () => void
  onSelectAll: (checked: boolean) => void
  onToggleRow: (id: number, value: boolean) => void
  onCategoryChange: (id: number, value: string) => void
  onDeleteRow: (id: number) => void
}

export function CsvPreviewTable({
  parsedCsv,
  parsedRows,
  selectedParsedRowIds,
  transactionCount,
  droppedFile,
  isParsing,
  parseError,
  isImporting,
  isAiReparsing,
  onDeleteSelectedRows,
  onOpenAiReparse,
  onSelectAll,
  onToggleRow,
  onCategoryChange,
  onDeleteRow,
}: CsvPreviewTableProps) {
  if (!parsedCsv || isParsing || parseError || isImporting) {
    return null
  }

  const negativeTotals = new Map<string, number>()
  const allTotals = new Map<string, number>()
  let negativeTotal = 0
  let overallTotal = 0

  for (const row of parsedRows) {
    const amount = typeof row.amount === "number" ? row.amount : parseFloat(row.amount) || 0
    if (amount === 0) continue
    const category = row.category?.trim() || "Other"
    const value = Math.abs(amount)
    overallTotal += value
    allTotals.set(category, (allTotals.get(category) || 0) + value)
    if (amount < 0) {
      negativeTotal += value
      negativeTotals.set(category, (negativeTotals.get(category) || 0) + value)
    }
  }

  const totalsToUse = negativeTotal > 0 ? negativeTotals : allTotals
  const totalToUse = negativeTotal > 0 ? negativeTotal : overallTotal
  const breakdownDescription = negativeTotal > 0
    ? "Percent of total spending in this upload."
    : "Percent of total amount in this upload."

  const categoryBreakdown = Array.from(totalsToUse.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      percentage: totalToUse > 0 ? (amount / totalToUse) * 100 : 0,
    }))

  return (
    <Card className="border-2 overflow-hidden flex flex-col min-h-0 max-w-[1200px] w-full mx-auto">
      <CardHeader className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-sm">
              Preview ({transactionCount} transactions)
            </CardTitle>
            <CardDescription className="text-xs">
              Review and edit categories before importing
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full hover:bg-primary/10"
                  aria-label="View category percentages"
                >
                  <IconInfoCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Category breakdown</p>
                    <p className="text-xs text-muted-foreground">{breakdownDescription}</p>
                  </div>
                  {categoryBreakdown.length > 0 ? (
                    <div className="max-h-64 space-y-2 overflow-auto pr-1">
                      {categoryBreakdown.map((item) => (
                        <div key={item.category} className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-medium text-foreground">{item.category}</span>
                          <span className="text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No spending categories detected yet.
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeleteSelectedRows}
              disabled={selectedParsedRowIds.size === 0}
            >
              Delete selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAiReparse}
              disabled={!droppedFile || isAiReparsing}
            >
              Reparse with AI
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
        <div className="h-full max-h-[500px] overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      parsedRows.length > 0 &&
                      selectedParsedRowIds.size === parsedRows.length
                    }
                    onCheckedChange={(checked) => onSelectAll(checked === true)}
                    aria-label="Select all transactions"
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                parsedRows.map((row) => {
                  const amount =
                    typeof row.amount === "number"
                      ? row.amount
                      : parseFloat(row.amount) || 0
                  const category = row.category || "Other"

                  return (
                    <MemoizedTableRow
                      key={row.id ?? `${row.date}-${row.description}`}
                      row={row}
                      amount={amount}
                      category={category}
                      isSelected={selectedParsedRowIds.has(row.id)}
                      onSelectChange={(value) => onToggleRow(row.id, value)}
                      onCategoryChange={(value) =>
                        onCategoryChange(row.id, value)
                      }
                      onDelete={() => onDeleteRow(row.id)}
                    />
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
