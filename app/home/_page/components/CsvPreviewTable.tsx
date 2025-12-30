import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
