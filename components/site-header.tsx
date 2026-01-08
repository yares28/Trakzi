"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { DateFilter, DateFilterType } from "@/components/date-filter"
import {
  FALLBACK_DATE_FILTER,
  isValidDateFilterValue,
  normalizeDateFilterValue,
} from "@/lib/date-filter"
import { useState, useEffect } from "react"
import { useDateFilter } from "@/components/date-filter-provider"

export function SiteHeader() {
  const { filter: dateFilter, setFilter: setDateFilter } = useDateFilter()
  const [availableYears, setAvailableYears] = useState<number[]>([])

  // Fetch available years on mount
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const response = await fetch("/api/transactions/years")
        if (response.ok) {
          const years = await response.json()
          setAvailableYears(years)
        }
      } catch (error) {
        console.warn("Error fetching available years:", error)
      }
    }
    fetchYears()
  }, [])

  return (
    <>
      {/* Mobile: Floating glass island header */}
      <header 
        className="
        sticky top-0 z-40 
        mx-2 mt-2 mb-1
        rounded-2xl
        bg-background/80
        backdrop-blur-xl
        border border-border/50
        shadow-lg shadow-black/5
        flex h-14 shrink-0 items-center gap-2
        transition-all duration-300 ease-in-out
        md:mx-0 md:mt-0 md:mb-0 md:rounded-none md:rounded-t-2xl md:bg-background md:backdrop-blur-none md:border-0 md:border-b md:shadow-none md:h-[var(--header-height)]
        will-change-[width,height] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[var(--header-height)]
      "
        style={{ marginLeft: '5px', marginRight: '5px' }}
      >
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:pl-6 lg:pr-8 group-has-data-[collapsible=icon]/sidebar-wrapper:lg:pl-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4 hidden md:block"
          />
          <div className="ml-auto flex items-center gap-2">
            <DateFilter
              value={dateFilter}
              onChange={setDateFilter}
              availableYears={availableYears}
            />
          </div>
        </div>
      </header>
    </>
  )
}
