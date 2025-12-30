import type { Dispatch, SetStateAction } from "react"
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
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

import { PAGE_SIZE_OPTIONS } from "../constants"
import { formatDateLabel } from "../formatters"
import type { ReceiptCategoryType } from "../types"

type ReceiptTypesTableProps = {
  receiptCategoryTypes: ReceiptCategoryType[]
  filteredReceiptTypes: ReceiptCategoryType[]
  receiptTypeSearch: string
  onReceiptTypeSearchChange: (value: string) => void
  receiptTypePage: number
  onReceiptTypePageChange: (value: number) => void
  receiptTypePageSize: number
  onReceiptTypePageSizeChange: (value: number) => void
  selectedReceiptTypeIds: Set<number>
  setSelectedReceiptTypeIds: Dispatch<SetStateAction<Set<number>>>
  onRequestDeleteReceiptType: (type: ReceiptCategoryType) => void
  isDefaultReceiptType: (name: string) => boolean
  formatCurrency: (value: number) => string
}

export function ReceiptTypesTable({
  receiptCategoryTypes,
  filteredReceiptTypes,
  receiptTypeSearch,
  onReceiptTypeSearchChange,
  receiptTypePage,
  onReceiptTypePageChange,
  receiptTypePageSize,
  onReceiptTypePageSizeChange,
  selectedReceiptTypeIds,
  setSelectedReceiptTypeIds,
  onRequestDeleteReceiptType,
  isDefaultReceiptType,
  formatCurrency,
}: ReceiptTypesTableProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle>Receipt Macronutrient Types</CardTitle>
          <Badge variant="secondary">
            {filteredReceiptTypes.length}
            {receiptCategoryTypes.length !== filteredReceiptTypes.length &&
              ` of ${receiptCategoryTypes.length}`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search types..."
              value={receiptTypeSearch}
              onChange={(e) => onReceiptTypeSearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {receiptTypeSearch && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => onReceiptTypeSearchChange("")}
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
                      filteredReceiptTypes.length > 0 &&
                      (() => {
                        const startIndex = receiptTypePage * receiptTypePageSize
                        const endIndex = startIndex + receiptTypePageSize
                        const pageData = filteredReceiptTypes.slice(
                          startIndex,
                          endIndex
                        )
                        return (
                          pageData.length > 0 &&
                          pageData.every((t) => selectedReceiptTypeIds.has(t.id))
                        )
                      })()
                    }
                    onCheckedChange={(checked) => {
                      const startIndex = receiptTypePage * receiptTypePageSize
                      const endIndex = startIndex + receiptTypePageSize
                      const pageData = filteredReceiptTypes.slice(
                        startIndex,
                        endIndex
                      )
                      if (checked) {
                        setSelectedReceiptTypeIds((prev) => {
                          const next = new Set(prev)
                          pageData.forEach((t) => next.add(t.id))
                          return next
                        })
                      } else {
                        setSelectedReceiptTypeIds((prev) => {
                          const next = new Set(prev)
                          pageData.forEach((t) => next.delete(t.id))
                          return next
                        })
                      }
                    }}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="text-right">Categories</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const startIndex = receiptTypePage * receiptTypePageSize
                const endIndex = startIndex + receiptTypePageSize
                const pageData = filteredReceiptTypes.slice(startIndex, endIndex)

                if (pageData.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        <p className="text-sm text-muted-foreground">
                          {receiptTypeSearch
                            ? "No types match your search."
                            : "No receipt types yet."}
                        </p>
                      </TableCell>
                    </TableRow>
                  )
                }

                return pageData.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedReceiptTypeIds.has(type.id)}
                        onCheckedChange={(checked) => {
                          setSelectedReceiptTypeIds((prev) => {
                            const next = new Set(prev)
                            if (checked) {
                              next.add(type.id)
                            } else {
                              next.delete(type.id)
                            }
                            return next
                          })
                        }}
                        aria-label={`Select ${type.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex size-2.5 rounded-full"
                          style={{
                            backgroundColor: type.color ?? "hsl(var(--primary))",
                          }}
                        />
                        <span className="font-medium">{type.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {formatDateLabel(type.createdAt)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {type.categoryCount}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {type.transactionCount}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {(() => {
                        const amount = type.totalSpend ?? 0
                        if (amount === 0) {
                          return (
                            <span className="text-muted-foreground">
                              {formatCurrency(0)}
                            </span>
                          )
                        }
                        return (
                          <span
                            className={amount < 0 ? "text-red-500" : "text-green-500"}
                          >
                            {formatCurrency(amount)}
                          </span>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      {!isDefaultReceiptType(type.name) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onRequestDeleteReceiptType(type)}
                        >
                          <IconTrash className="size-4" />
                          <span className="sr-only">Delete type</span>
                        </Button>
                      )}
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
              value={String(receiptTypePageSize)}
              onValueChange={(value) => {
                onReceiptTypePageSizeChange(Number(value))
                onReceiptTypePageChange(0)
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={receiptTypePageSize} />
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
              {filteredReceiptTypes.length > 0
                ? `${Math.min(
                    receiptTypePage * receiptTypePageSize + 1,
                    filteredReceiptTypes.length
                  )}-${Math.min(
                    (receiptTypePage + 1) * receiptTypePageSize,
                    filteredReceiptTypes.length
                  )} of ${filteredReceiptTypes.length}`
                : "0 of 0"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => onReceiptTypePageChange(0)}
              disabled={receiptTypePage === 0}
            >
              <IconChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() =>
                onReceiptTypePageChange(Math.max(0, receiptTypePage - 1))
              }
              disabled={receiptTypePage === 0}
            >
              <IconChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() =>
                onReceiptTypePageChange(
                  Math.min(
                    Math.ceil(filteredReceiptTypes.length / receiptTypePageSize) - 1,
                    receiptTypePage + 1
                  )
                )
              }
              disabled={
                receiptTypePage >=
                Math.ceil(filteredReceiptTypes.length / receiptTypePageSize) - 1
              }
            >
              <IconChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() =>
                onReceiptTypePageChange(
                  Math.ceil(filteredReceiptTypes.length / receiptTypePageSize) - 1
                )
              }
              disabled={
                receiptTypePage >=
                Math.ceil(filteredReceiptTypes.length / receiptTypePageSize) - 1
              }
            >
              <IconChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
