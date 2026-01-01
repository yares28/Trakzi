"use client"

import * as React from "react"
import { IconFilter, IconCheck } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import type { DateFilterType } from "@/lib/date-filter"

export type { DateFilterType } from "@/lib/date-filter"

import { useDateFilter } from "@/components/date-filter-provider"

interface DateFilterProps {
  value?: DateFilterType | null
  onChange?: (value: DateFilterType | null) => void
  availableYears: number[]
}

export function DateFilter({ value, onChange, availableYears }: DateFilterProps) {
  const { filter: globalFilter, setFilter: setGlobalFilter } = useDateFilter()

  const effectiveValue = value !== undefined ? value : globalFilter
  const effectiveOnChange = onChange || setGlobalFilter

  const getFilterLabel = (filter: DateFilterType | null): string => {
    if (!filter) return "Last Year" // Default display
    switch (filter) {
      case "last7days":
        return "Last 7 Days"
      case "last30days":
        return "Last 30 Days"
      case "last3months":
        return "Last 3 Months"
      case "last6months":
        return "Last 6 Months"
      case "lastyear":
        return "Last Year"
      case "ytd":
        return "YTD"
      default:
        // It's a year string
        return filter
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <IconFilter className="size-[1.2rem]" />
          <span className="sr-only">Filter by date</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Time Period</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => effectiveOnChange("lastyear")}>
          <span className="flex-1">Last Year</span>
          {effectiveValue === "lastyear" && <IconCheck className="size-4" />}
        </DropdownMenuItem>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem onClick={() => effectiveOnChange("ytd")}>
                <span className="flex-1">YTD</span>
                {effectiveValue === "ytd" && <IconCheck className="size-4" />}
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Year To Date</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => effectiveOnChange("last7days")}>
          <span className="flex-1">Last 7 Days</span>
          {effectiveValue === "last7days" && <IconCheck className="size-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => effectiveOnChange("last30days")}>
          <span className="flex-1">Last 30 Days</span>
          {effectiveValue === "last30days" && <IconCheck className="size-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => effectiveOnChange("last3months")}>
          <span className="flex-1">Last 3 Months</span>
          {effectiveValue === "last3months" && <IconCheck className="size-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => effectiveOnChange("last6months")}>
          <span className="flex-1">Last 6 Months</span>
          {effectiveValue === "last6months" && <IconCheck className="size-4" />}
        </DropdownMenuItem>
        {availableYears.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Specific Years</DropdownMenuLabel>
            {availableYears.map((year) => (
              <DropdownMenuItem
                key={year}
                onClick={() => effectiveOnChange(year.toString())}
              >
                <span className="flex-1">{year}</span>
                {effectiveValue === year.toString() && <IconCheck className="size-4" />}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
