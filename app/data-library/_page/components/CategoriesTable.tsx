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
import type { Category } from "../types"

type CategoriesTableProps = {
  categories: Category[]
  filteredCategories: Category[]
  categorySearch: string
  onCategorySearchChange: (value: string) => void
  categoryPage: number
  onCategoryPageChange: (value: number) => void
  categoryPageSize: number
  onCategoryPageSizeChange: (value: number) => void
  selectedCategoryIds: Set<number>
  setSelectedCategoryIds: Dispatch<SetStateAction<Set<number>>>
  onAddCategory: () => void
  onRequestDeleteCategory: (category: Category) => void
  isDefaultCategory: (name: string) => boolean
  formatCurrency: (value: number) => string
  onCategoryBroadTypeChange: (
    categoryId: number,
    next: "Essentials" | "Mandatory" | "Wants",
  ) => void
}

export function CategoriesTable({
  categories,
  filteredCategories,
  categorySearch,
  onCategorySearchChange,
  categoryPage,
  onCategoryPageChange,
  categoryPageSize,
  onCategoryPageSizeChange,
  selectedCategoryIds,
  setSelectedCategoryIds,
  onAddCategory,
  onRequestDeleteCategory,
  isDefaultCategory,
  formatCurrency,
  onCategoryBroadTypeChange,
}: CategoriesTableProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle>Categories</CardTitle>
          <Badge variant="secondary">
            {filteredCategories.length}
            {categories.length !== filteredCategories.length &&
              ` of ${categories.length}`}
          </Badge>
        </div>
        <Button size="sm" onClick={onAddCategory}>
          <IconPlus className="size-4 mr-1" />
          Add Category
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={categorySearch}
              onChange={(e) => onCategorySearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {categorySearch && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => onCategorySearchChange("")}
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
                      filteredCategories.length > 0 &&
                      (() => {
                        const startIndex = categoryPage * categoryPageSize
                        const endIndex = startIndex + categoryPageSize
                        const pageData = filteredCategories.slice(
                          startIndex,
                          endIndex
                        )
                        return (
                          pageData.length > 0 &&
                          pageData.every((c) => selectedCategoryIds.has(c.id))
                        )
                      })()
                    }
                    onCheckedChange={(checked) => {
                      const startIndex = categoryPage * categoryPageSize
                      const endIndex = startIndex + categoryPageSize
                      const pageData = filteredCategories.slice(
                        startIndex,
                        endIndex
                      )
                      if (checked) {
                        setSelectedCategoryIds((prev) => {
                          const next = new Set(prev)
                          pageData.forEach((c) => next.add(c.id))
                          return next
                        })
                      } else {
                        setSelectedCategoryIds((prev) => {
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
                <TableHead className="hidden xl:table-cell">Broad type</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const startIndex = categoryPage * categoryPageSize
                const endIndex = startIndex + categoryPageSize
                const pageData = filteredCategories.slice(startIndex, endIndex)

                if (pageData.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        <p className="text-sm text-muted-foreground">
                          {categorySearch
                            ? "No categories match your search."
                            : "No categories yet - tag transactions to build your taxonomy."}
                        </p>
                      </TableCell>
                    </TableRow>
                  )
                }

                return pageData.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedCategoryIds.has(category.id)}
                        onCheckedChange={(checked) => {
                          setSelectedCategoryIds((prev) => {
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
                    <TableCell className="hidden xl:table-cell align-middle text-xs">
                      <Select
                        value={
                          (category.broadType as
                            | "Essentials"
                            | "Mandatory"
                            | "Wants"
                            | null) ?? "Wants"
                        }
                        onValueChange={(value) =>
                          onCategoryBroadTypeChange(
                            category.id,
                            value as "Essentials" | "Mandatory" | "Wants",
                          )
                        }
                      >
                        <SelectTrigger className="h-8 w-[140px] text-xs">
                          <SelectValue placeholder="Wants" />
                        </SelectTrigger>
                        <SelectContent side="top">
                          <SelectItem value="Essentials">Needs</SelectItem>
                          <SelectItem value="Mandatory">Mandatory</SelectItem>
                          <SelectItem value="Wants">Wants</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {formatDateLabel(category.createdAt)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {category.transactionCount}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {(() => {
                        const amount = category.totalAmount ?? 0
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
                      {!isDefaultCategory(category.name) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onRequestDeleteCategory(category)}
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
              value={String(categoryPageSize)}
              onValueChange={(value) => {
                onCategoryPageSizeChange(Number(value))
                onCategoryPageChange(0)
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={categoryPageSize} />
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
              {filteredCategories.length > 0
                ? `${Math.min(
                    categoryPage * categoryPageSize + 1,
                    filteredCategories.length
                  )}-${Math.min(
                    (categoryPage + 1) * categoryPageSize,
                    filteredCategories.length
                  )} of ${filteredCategories.length}`
                : "0 of 0"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => onCategoryPageChange(0)}
              disabled={categoryPage === 0}
            >
              <IconChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => onCategoryPageChange(Math.max(0, categoryPage - 1))}
              disabled={categoryPage === 0}
            >
              <IconChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() =>
                onCategoryPageChange(
                  Math.min(
                    Math.ceil(filteredCategories.length / categoryPageSize) - 1,
                    categoryPage + 1
                  )
                )
              }
              disabled={
                categoryPage >=
                Math.ceil(filteredCategories.length / categoryPageSize) - 1
              }
            >
              <IconChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() =>
                onCategoryPageChange(
                  Math.ceil(filteredCategories.length / categoryPageSize) - 1
                )
              }
              disabled={
                categoryPage >=
                Math.ceil(filteredCategories.length / categoryPageSize) - 1
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
