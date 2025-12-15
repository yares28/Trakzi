"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { IconPalette, IconCheck, IconCurrencyDollar } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import { useColorScheme } from "@/components/color-scheme-provider"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  { value: "JPY", label: "JPY (¥)" },
  { value: "CAD", label: "CAD (C$)" },
  { value: "AUD", label: "AUD (A$)" },
  { value: "CHF", label: "CHF (Fr)" },
  { value: "CNY", label: "CNY (¥)" },
]

const CURRENCY_STORAGE_KEY = "selected-currency"

export function SettingsPopover({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme()
  const { colorScheme, setColorScheme } = useColorScheme()
  const [mounted, setMounted] = React.useState(false)
  const [currency, setCurrency] = React.useState<string>("USD")

  React.useEffect(() => {
    setMounted(true)
    // Load currency from localStorage
    const savedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY)
    if (savedCurrency) {
      setCurrency(savedCurrency)
    }
  }, [])

  React.useEffect(() => {
    if (mounted) {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency)
      // Dispatch event for currency change
      window.dispatchEvent(new CustomEvent("currencyChanged", { detail: currency }))
    }
  }, [currency, mounted])

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark"
    setTheme(nextTheme)
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end" side="right">
        <div className="space-y-4">
          {/* Theme Switcher */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sun className="h-4 w-4" />
              <span>Theme</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="w-full justify-start"
            >
              {resolvedTheme === "dark" ? (
                <>
                  <Sun className="mr-2 h-4 w-4" />
                  Switch to Light
                </>
              ) : (
                <>
                  <Moon className="mr-2 h-4 w-4" />
                  Switch to Dark
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Palette Switcher */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <IconPalette className="h-4 w-4" />
              <span>Color Palette</span>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {colorSchemes.map((scheme) => (
                <Button
                  key={scheme.value}
                  variant={colorScheme === scheme.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setColorScheme(scheme.value)}
                  className="justify-start"
                >
                  <span className="flex-1 text-left">{scheme.label}</span>
                  {colorScheme === scheme.value && (
                    <IconCheck className="h-4 w-4" />
                  )}
                </Button>
              ))}
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
              <SelectTrigger className="w-full">
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
        </div>
      </PopoverContent>
    </Popover>
  )
}
