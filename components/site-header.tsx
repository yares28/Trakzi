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

export function SiteHeader() {
  const [dateFilter, setDateFilter] = useState<DateFilterType | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [isReady, setIsReady] = useState(false)

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

  // Store filter in localStorage and notify parent via custom event
  useEffect(() => {
    if (!isReady) return
    const nextFilter = normalizeDateFilterValue(dateFilter)
    localStorage.setItem("dateFilter", nextFilter)
    // Dispatch custom event to notify dashboard
    window.dispatchEvent(new CustomEvent("dateFilterChanged", { detail: nextFilter }))
  }, [dateFilter, isReady])

  // Load filter from localStorage on mount (with fallback to default time period)
  useEffect(() => {
    const savedFilter = localStorage.getItem("dateFilter")
    if (isValidDateFilterValue(savedFilter)) {
      setDateFilter(savedFilter)
      localStorage.setItem("dateFilter", savedFilter)
      setIsReady(true)
      return
    }

    const defaultTimePeriod = localStorage.getItem("default-time-period")
    const resolvedFilter = isValidDateFilterValue(defaultTimePeriod)
      ? defaultTimePeriod
      : FALLBACK_DATE_FILTER
    setDateFilter(resolvedFilter)
    localStorage.setItem("dateFilter", resolvedFilter)
    setIsReady(true)
  }, [])

  return (
    <>
      {/* Mobile: Floating glass island header */}
      <header className="
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
      ">
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
