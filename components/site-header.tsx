"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { DateFilter, DateFilterType } from "@/components/date-filter"
import { useState, useEffect } from "react"

export function SiteHeader() {
  const [dateFilter, setDateFilter] = useState<DateFilterType | null>(null)
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

  // Store filter in localStorage and notify parent via custom event
  useEffect(() => {
    if (dateFilter !== null) {
      localStorage.setItem("dateFilter", dateFilter)
    } else {
      localStorage.removeItem("dateFilter")
    }
    // Dispatch custom event to notify dashboard
    window.dispatchEvent(new CustomEvent("dateFilterChanged", { detail: dateFilter }))
  }, [dateFilter])

  // Load filter from localStorage on mount (with fallback to default time period)
  useEffect(() => {
    const savedFilter = localStorage.getItem("dateFilter")
    if (savedFilter) {
      setDateFilter(savedFilter as DateFilterType)
    } else {
      // If no current filter, check for default time period setting
      const defaultTimePeriod = localStorage.getItem("default-time-period")
      if (defaultTimePeriod && defaultTimePeriod !== "all") {
        setDateFilter(defaultTimePeriod as DateFilterType)
        localStorage.setItem("dateFilter", defaultTimePeriod)
      }
    }
  }, [])

  return (
    <header className="sticky top-0 z-40 bg-background flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b transition-[width,height] duration-300 ease-in-out will-change-[width,height] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[var(--header-height)] ml-[5px]">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
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
  )
}
