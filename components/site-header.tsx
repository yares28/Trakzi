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
    <>
      {/* Mobile: Floating glass island header */}
      <header className="
        sticky top-0 z-40 
        mx-2 mt-2 mb-1
        rounded-2xl
        bg-background/80 dark:bg-background/70
        backdrop-blur-xl
        border border-border/50 dark:border-white/10
        shadow-lg shadow-black/5 dark:shadow-black/20
        flex h-14 shrink-0 items-center gap-2
        transition-all duration-300 ease-in-out
        md:mx-0 md:mt-0 md:mb-0 md:rounded-none md:rounded-t-2xl md:bg-background md:backdrop-blur-none md:border-0 md:border-b md:shadow-none md:h-[var(--header-height)]
        will-change-[width,height] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[var(--header-height)]
      ">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-8">
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

