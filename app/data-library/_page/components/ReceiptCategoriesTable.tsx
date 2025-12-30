import type { Dispatch, SetStateAction } from "react"
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconPlus,
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
import type { ReceiptCategory } from "../types"

type ReceiptCategoriesTableProps = {
  receiptCategories: ReceiptCategory[]
  filteredReceiptCategories: ReceiptCategory[]
  receiptCategorySearch: string
  onReceiptCategorySearchChange: (value: string) => void
  receiptCategoryPage: number
  onReceiptCategoryPageChange: (value: number) => void
  receiptCategoryPageSize: number
  onReceiptCategoryPageSizeChange: (value: number) => void
  selectedReceiptCategoryIds: Set<number>
  setSelectedReceiptCategoryIds: Dispatch<SetStateAction<Set<number>>>
  onAddReceiptCategory: () => void
  onRequestDeleteReceiptCategory: (category: ReceiptCategory) => void
  isDefaultReceiptCategory: (name: string) => boolean
  formatCurrency: (value: number) => string
}

export function ReceiptCategoriesTable({
  receiptCategories,
  filteredReceiptCategories,
  receiptCategorySearch,
  onReceiptCategorySearchChange,
  receiptCategoryPage,
  onReceiptCategoryPageChange,
  receiptCategoryPageSize,
  onReceiptCategoryPageSizeChange,
  selectedReceiptCategoryIds,
  setSelectedReceiptCategoryIds,
  onAddReceiptCategory,
  onRequestDeleteReceiptCategory,
  isDefaultReceiptCategory,
  formatCurrency,
}: ReceiptCategoriesTableProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle>Receipt Categories</CardTitle>
          <Badge variant="secondary">
            {filteredReceiptCategories.length}
            {receiptCategories.length !== filteredReceiptCategories.length &&
              ` of ${receiptCategories.length}`}
          </Badge>
        </div>
        <Button size="sm" onClick={onAddReceiptCategory}>
          <IconPlus className="size-4 mr-1" />
          Add Receipt Category
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search categories or types..."
              value={receiptCategorySearch}
              onChange={(e) => onReceiptCategorySearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {receiptCategorySearch && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => onReceiptCategorySearchChange("")}
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
                      filteredReceiptCategories.length > 0 &&
                      (() => {
                        const startIndex =
                          receiptCategoryPage * receiptCategoryPageSize
                        const endIndex = startIndex + receiptCategoryPageSize
                        const pageData = filteredReceiptCategories.slice(
                          startIndex,
                          endIndex
                        )
                        return (
                          pageData.length > 0 &&
                          pageData.every((c) => selectedReceiptCategoryIds.has(c.id))
                        )
                      })()
                    }
                    onCheckedChange={(checked) => {
                      const startIndex =
                        receiptCategoryPage * receiptCategoryPageSize
                      const endIndex = startIndex + receiptCategoryPageSize
                      const pageData = filteredReceiptCategories.slice(
                        startIndex,
                        endIndex
                      )
                      if (checked) {
                        setSelectedReceiptCategoryIds((prev) => {
                          const next = new Set(prev)
                          pageData.forEach((c) => next.add(c.id))
                          return next
                        })
                      } else {
                        setSelectedReceiptCategoryIds((prev) => {
                          const next = new Set(prev)
                          pageData.forEach((c) => next.delete(c.id))
                          return next
                        })
                      }
                    }}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const startIndex = receiptCategoryPage * receiptCategoryPageSize
                const endIndex = startIndex + receiptCategoryPageSize
                const pageData = filteredReceiptCategories.slice(startIndex, endIndex)

                if (pageData.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        <p className="text-sm text-muted-foreground">
                          {receiptCategorySearch
                            ? "No categories match your search."
                            : "No receipt categories yet."}
                        </p>
                      </TableCell>
                    </TableRow>
                  )
                }

                return pageData.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedReceiptCategoryIds.has(category.id)}
                        onCheckedChange={(checked) => {
                          setSelectedReceiptCategoryIds((prev) => {
                            const next = new Set(prev)
                            if (checked) {
                              next.add(category.id)
                            } else {
                              next.delete(category.id)
                            }
                            return next
                          })
                        }}
                        aria-label={`Select ${category.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex size-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              category.color ?? "hsl(var(--primary))",
                          }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex size-2 rounded-full"
                          style={{
                            backgroundColor:
                              category.typeColor ?? "hsl(var(--muted-foreground))",
                          }}
                        />
                        <span>{category.typeName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {formatDateLabel(category.createdAt)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {category.transactionCount}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {(() => {
                        const amount = category.totalSpend ?? 0
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
                      {!isDefaultReceiptCategory(category.name) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onRequestDeleteReceiptCategory(category)}
                        >
                          <IconTrash className="size-4" />
                          <span className="sr-only">Delete category</span>
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
              value={String(receiptCategoryPageSize)}
              onValueChange={(value) => {
                onReceiptCategoryPageSizeChange(Number(value))
                onReceiptCategoryPageChange(0)
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={receiptCategoryPageSize} />
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
              {filteredReceiptCategories.length > 0
                ? `${Math.min(
                    receiptCategoryPage * receiptCategoryPageSize + 1,
                    filteredReceiptCategories.length
                  )}-${Math.min(
                    (receiptCategoryPage + 1) * receiptCategoryPageSize,
                    filteredReceiptCategories.length
                  )} of ${filteredReceiptCategories.length}`
                : "0 of 0"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => onReceiptCategoryPageChange(0)}
              disabled={receiptCategoryPage === 0}
            >
              <IconChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() =>
                onReceiptCategoryPageChange(Math.max(0, receiptCategoryPage - 1))
              }
              disabled={receiptCategoryPage === 0}
            >
              <IconChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() =>
                onReceiptCategoryPageChange(
                  Math.min(
                    Math.ceil(
                      filteredReceiptCategories.length / receiptCategoryPageSize
                    ) - 1,
                    receiptCategoryPage + 1
                  )
                )
              }
              disabled={
                receiptCategoryPage >=
                Math.ceil(filteredReceiptCategories.length / receiptCategoryPageSize) - 1
              }
            >
              <IconChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() =>
                onReceiptCategoryPageChange(
                  Math.ceil(
                    filteredReceiptCategories.length / receiptCategoryPageSize
                  ) - 1
                )
              }
              disabled={
                receiptCategoryPage >=
                Math.ceil(filteredReceiptCategories.length / receiptCategoryPageSize) - 1
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
