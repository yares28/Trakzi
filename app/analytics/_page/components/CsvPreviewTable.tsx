import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import type { ParsedRow } from "../types"
import { MemoizedTableRow } from "./MemoizedTableRow"

type CsvPreviewTableProps = {
  parsedRows: ParsedRow[]
  selectedParsedRowIds: Set<number>
  onSelectAll: (value: boolean) => void
  onToggleRow: (rowId: number, value: boolean) => void
  onCategoryChange: (rowId: number, category: string) => void
  onDeleteRow: (rowId: number) => void
}

export function CsvPreviewTable({
  parsedRows,
  selectedParsedRowIds,
  onSelectAll,
  onToggleRow,
  onCategoryChange,
  onDeleteRow,
}: CsvPreviewTableProps) {
  return (
    <Table>
      <TableHeader className="bg-muted sticky top-0 z-10">
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={parsedRows.length > 0 && selectedParsedRowIds.size === parsedRows.length}
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
            const amount = typeof row.amount === "number" ? row.amount : parseFloat(row.amount) || 0
            const category = row.category || "Other"

            return (
              <MemoizedTableRow
                key={row.id ?? `${row.date}-${row.description}`}
                row={row}
                amount={amount}
                category={category}
                isSelected={selectedParsedRowIds.has(row.id)}
                onSelectChange={(value) => onToggleRow(row.id, value)}
                onCategoryChange={(value) => onCategoryChange(row.id, value)}
                onDelete={() => onDeleteRow(row.id)}
              />
            )
          })
        )}
      </TableBody>
    </Table>
  )
}
