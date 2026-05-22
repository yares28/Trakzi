"use client"

import * as React from "react"
import { IconFilter, IconCheck, IconCalendar } from "@tabler/icons-react"
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
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import type { DateRange } from "react-day-picker"

import type { DateFilterType } from "@/lib/date-filter"
import { cn } from "@/lib/utils"

export type { DateFilterType } from "@/lib/date-filter"

import { useDateFilter } from "@/components/date-filter-provider"

interface DateFilterProps {
  value?: DateFilterType | null
  onChange?: (value: DateFilterType | null) => void
  availableYears: number[]
  triggerVariant?: React.ComponentProps<typeof Button>["variant"]
  triggerSize?: React.ComponentProps<typeof Button>["size"]
  triggerClassName?: string
}

function formatCustomRangeLabel(filter: string): string {
  if (!filter.startsWith("custom:")) return "Custom Range"
  const parts = filter.split(":")
  if (parts.length !== 3) return "Custom Range"
  const start = new Date(parts[1] + "T00:00:00")
  const end = new Date(parts[2] + "T00:00:00")
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return `${fmt(start)} – ${fmt(end)}`
}

export function DateFilter({
  value,
  onChange,
  availableYears,
  triggerVariant = "outline",
  triggerSize = "icon",
  triggerClassName,
}: DateFilterProps) {
  const { filter: globalFilter, setFilter: setGlobalFilter } = useDateFilter()

  const effectiveValue = value !== undefined ? value : globalFilter
  const effectiveOnChange = onChange || setGlobalFilter

  const [calendarOpen, setCalendarOpen] = React.useState(false)
  const [pendingRange, setPendingRange] = React.useState<DateRange | undefined>(undefined)
  const anchorRef = React.useRef<HTMLDivElement>(null)
  const ignoreNextOutside = React.useRef(false)

  const getFilterLabel = (filter: DateFilterType | null): string => {
    if (!filter) return "Last Year"
    if (typeof filter === "string" && filter.startsWith("custom:")) {
      return formatCustomRangeLabel(filter)
    }
    switch (filter) {
      case "last30days": return "Last 30 Days"
      case "last3months": return "Last 3 Months"
      case "last6months": return "Last 6 Months"
      case "lastyear": return "Last Year"
      case "ytd": return "YTD"
      default: return filter
    }
  }

  const handleConfirmCustomRange = () => {
    if (!pendingRange?.from || !pendingRange?.to) return
    const fmt = (d: Date) => d.toISOString().split("T")[0]
    effectiveOnChange(`custom:${fmt(pendingRange.from)}:${fmt(pendingRange.to)}`)
    setCalendarOpen(false)
    setPendingRange(undefined)
  }

  const isCustomActive = typeof effectiveValue === "string" && effectiveValue.startsWith("custom:")

  return (
    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={triggerVariant}
                size={triggerSize}
                className={cn("!gap-0 !p-0", triggerClassName)}
              >
                <IconFilter className="size-[1.2rem]" />
                <span className="sr-only">Filter by date</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setPendingRange(undefined)
                  ignoreNextOutside.current = true
                  setCalendarOpen(true)
                }}
              >
                <IconCalendar className="size-4 mr-2" />
                <span className="flex-1">Custom Range</span>
                {isCustomActive && <IconCheck className="size-4" />}
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
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="end"
        className="w-auto p-0"
        sideOffset={8}
        onInteractOutside={(e) => {
          if (ignoreNextOutside.current) {
            ignoreNextOutside.current = false
            e.preventDefault()
            return
          }
          setCalendarOpen(false)
        }}
      >
        <div className="p-3">
          <Calendar
            mode="range"
            selected={pendingRange}
            onSelect={setPendingRange}
            numberOfMonths={1}
            captionLayout="dropdown"
            disabled={{ after: new Date() }}
          />
          {pendingRange?.from && (
            <p className="text-xs text-muted-foreground text-center mt-1 mb-2">
              {pendingRange.to
                ? `${pendingRange.from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${pendingRange.to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                : `${pendingRange.from.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} — pick end date`}
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setCalendarOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleConfirmCustomRange}
              disabled={!pendingRange?.from || !pendingRange?.to}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
