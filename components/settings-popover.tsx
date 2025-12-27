"use client"

import * as React from "react"
import { Moon, Sun, CreditCard, Shuffle } from "lucide-react"
import { IconPalette, IconCheck, IconCurrencyDollar, IconCalendar } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import { useColorScheme } from "@/components/color-scheme-provider"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { BugReportDialog } from "@/components/bug-report-dialog"
import { SubscriptionDialog } from "@/components/subscription-dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"

type ColorScheme = "sunset" | "dark" | "colored" | "gold" | "aqua" | "dull" | "dry" | "greens" | "chrome" | "beach" | "jolly" | "gothic"

const colorSchemes: { value: ColorScheme; label: string }[] = [
  { value: "sunset", label: "Sunset" },
  { value: "dark", label: "Dark" },
  { value: "colored", label: "Colored" },
  { value: "gold", label: "Gold" },
  { value: "aqua", label: "Aqua" },
  { value: "dull", label: "Dull" },
  { value: "dry", label: "Dry" },
  { value: "greens", label: "Greens" },
  { value: "chrome", label: "Chrome" },
  { value: "beach", label: "Beach" },
  { value: "jolly", label: "Jolly" },
  { value: "gothic", label: "Gothic" },
]

const currencies = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "CAD", label: "CAD (C$)" },
  { value: "AUD", label: "AUD (A$)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "CNY", label: "CNY (¥)" },
  { value: "INR", label: "INR (₹)" },
  { value: "BRL", label: "BRL (R$)" },
  { value: "MXN", label: "MXN ($)" },
  { value: "KRW", label: "KRW (₩)" },
  { value: "CHF", label: "CHF (Fr)" },
]

const timePeriods = [
  { value: "all", label: "All Time" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "last30days", label: "Last 30 Days" },
  { value: "last3months", label: "Last 3 Months" },
  { value: "last6months", label: "Last 6 Months" },
  { value: "lastyear", label: "Last Year" },
]

const CURRENCY_STORAGE_KEY = "selected-currency"
const DEFAULT_TIME_PERIOD_KEY = "default-time-period"

export function SettingsPopover({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme()
  const { colorScheme, setColorScheme } = useColorScheme()
  const [mounted, setMounted] = React.useState(false)
  const [currency, setCurrency] = React.useState<string>("USD")
  const [defaultTimePeriod, setDefaultTimePeriod] = React.useState<string>("all")
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  React.useEffect(() => {
    setMounted(true)
    // Load currency from localStorage
    const savedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY)
    if (savedCurrency) {
      setCurrency(savedCurrency)
    }
    // Load default time period from localStorage
    const savedTimePeriod = localStorage.getItem(DEFAULT_TIME_PERIOD_KEY)
    if (savedTimePeriod) {
      setDefaultTimePeriod(savedTimePeriod)
    }
  }, [])

  React.useEffect(() => {
    if (mounted) {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency)
      // Dispatch event for currency change
      window.dispatchEvent(new CustomEvent("currencyChanged", { detail: currency }))
    }
  }, [currency, mounted])

  // Handle default time period changes
  const handleTimePeriodChange = (value: string) => {
    setDefaultTimePeriod(value)
    localStorage.setItem(DEFAULT_TIME_PERIOD_KEY, value)

    // Also apply this as the current filter immediately
    const filterValue = value === "all" ? null : value
    if (filterValue) {
      localStorage.setItem("dateFilter", filterValue)
    } else {
      localStorage.removeItem("dateFilter")
    }
    // Dispatch event to notify all pages of the filter change
    window.dispatchEvent(new CustomEvent("dateFilterChanged", { detail: filterValue }))
  }

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark"
    setTheme(nextTheme)
  }

  const handleRandomizeLayout = () => {
    window.dispatchEvent(new CustomEvent("gridstack:randomize"))
  }

  if (!mounted) {
    return <>{children}</>
  }

  const settingsContent = (
    <div className="space-y-4">
      {/* Theme Switcher */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            {resolvedTheme === "dark" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span>Theme</span>
          </div>
          <button
            role="switch"
            aria-checked={resolvedTheme === "dark"}
            onClick={toggleTheme}
            className="peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
            data-state={resolvedTheme === "dark" ? "checked" : "unchecked"}
          >
            <span
              className="pointer-events-none flex h-6 w-6 rounded-full bg-background shadow-lg ring-0 transition-transform items-center justify-center data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
              data-state={resolvedTheme === "dark" ? "checked" : "unchecked"}
            >
              {resolvedTheme === "dark" ? (
                <Moon className="h-4 w-4 text-primary" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
            </span>
          </button>
        </div>
      </div>

      <Separator />

      {/* Palette Switcher */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <IconPalette className="h-4 w-4" />
          <span>Color Palette</span>
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {colorSchemes.map((scheme) => {
            const isDisabled = scheme.value !== "sunset";
            return (
              <Button
                key={scheme.value}
                variant={colorScheme === scheme.value ? "default" : "outline"}
                size="sm"
                onClick={() => !isDisabled && setColorScheme(scheme.value)}
                disabled={isDisabled}
                className={`justify-start ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                title={isDisabled ? "Coming Soon" : undefined}
              >
                <span className="flex-1 text-left">
                  {scheme.label}
                  {isDisabled && <span className="text-xs text-muted-foreground ml-1">(Soon)</span>}
                </span>
                {colorScheme === scheme.value && (
                  <IconCheck className="h-4 w-4" />
                )}
              </Button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Currency Chooser */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <IconCurrencyDollar className="h-4 w-4" />
          <span>Currency</span>
        </div>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="w-full pointer-events-auto">
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((curr) => (
              <SelectItem key={curr.value} value={curr.value}>
                {curr.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Default Time Period */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <IconCalendar className="h-4 w-4" />
          <span>Default Time Period</span>
        </div>
        <Select value={defaultTimePeriod} onValueChange={handleTimePeriodChange}>
          <SelectTrigger className="w-full pointer-events-auto">
            <SelectValue placeholder="Select default time period" />
          </SelectTrigger>
          <SelectContent>
            {timePeriods.map((period) => (
              <SelectItem key={period.value} value={period.value}>
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Set the default time range for charts and data
        </p>
      </div>

      <Separator />

      {/* Layout Actions */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Shuffle className="h-4 w-4" />
          <span>Layout</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleRandomizeLayout}>
          <Shuffle className="h-4 w-4 mr-2" />
          Randomize cards
        </Button>
        <p className="text-xs text-muted-foreground">
          Applies to the current draggable grid.
        </p>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex gap-2">
        <SubscriptionDialog>
          <Button variant="outline" size="sm" className="flex-1">
            <CreditCard className="h-4 w-4 mr-2" />
            Subscription
          </Button>
        </SubscriptionDialog>
        <BugReportDialog />
      </div>
    </div>
  )

  // On mobile, use a Drawer for better UX
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {children}
        </DrawerTrigger>
        <DrawerContent className="px-4 pb-6">
          <DrawerHeader className="text-left">
            <DrawerTitle>Settings</DrawerTitle>
          </DrawerHeader>
          {settingsContent}
        </DrawerContent>
      </Drawer>
    )
  }

  // On desktop, use a Popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end" side="right">
        {settingsContent}
      </PopoverContent>
    </Popover>
  )
}













