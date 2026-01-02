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

// Dashboard header - has date filter, no palette/theme switcher
export function DashboardHeader() {
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
        <header className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b transition-[width,height] duration-300 ease-in-out will-change-[width,height] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[var(--header-height)] ml-[5px]">
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
