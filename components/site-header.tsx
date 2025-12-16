"use client"

import { IconPalette, IconCheck } from "@tabler/icons-react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import ModeToggle from "@/components/mode-toggle"
import { useColorScheme } from "@/components/color-scheme-provider"
import { DateFilter, DateFilterType } from "@/components/date-filter"
import { useState, useEffect } from "react"

export function SiteHeader() {
  const { colorScheme, setColorScheme } = useColorScheme()
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <IconPalette className="size-[1.2rem]" />
                <span className="sr-only">Toggle color scheme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => setColorScheme("sunset")}
              >
                <span className="flex-1">Sunset</span>
                {colorScheme === "sunset" && (
                  <IconCheck className="size-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setColorScheme("dark")}
              >
                <span className="flex-1">Dark</span>
                {colorScheme === "dark" && (
                  <IconCheck className="size-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setColorScheme("colored")}
              >
                <span className="flex-1">Colored</span>
                {colorScheme === "colored" && (
                  <IconCheck className="size-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setColorScheme("gold")}
              >
                <span className="flex-1">Gold</span>
                {colorScheme === "gold" && (
                  <IconCheck className="size-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setColorScheme("aqua")}
              >
                <span className="flex-1">Aqua</span>
                {colorScheme === "aqua" && (
                  <IconCheck className="size-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setColorScheme("dull")}
              >
                <span className="flex-1">Dull</span>
                {colorScheme === "dull" && (
                  <IconCheck className="size-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setColorScheme("dry")}
              >
                <span className="flex-1">Dry</span>
                {colorScheme === "dry" && (
                  <IconCheck className="size-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setColorScheme("greens")}
              >
                <span className="flex-1">Greens</span>
                {colorScheme === "greens" && (
                  <IconCheck className="size-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setColorScheme("chrome")}
              >
                <span className="flex-1">Chrome</span>
                {colorScheme === "chrome" && (
                  <IconCheck className="size-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setColorScheme("beach")}
              >
                <span className="flex-1">Beach</span>
                {colorScheme === "beach" && (
                  <IconCheck className="size-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setColorScheme("jolly")}
              >
                <span className="flex-1">Jolly</span>
                {colorScheme === "jolly" && (
                  <IconCheck className="size-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setColorScheme("gothic")}
              >
                <span className="flex-1">Gothic</span>
                {colorScheme === "gothic" && (
                  <IconCheck className="size-4" />
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
