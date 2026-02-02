"use client"

import { memo, useState, useMemo } from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import ReactCountryFlag from "react-country-flag"

import { cn } from "@/lib/utils"
import { getValidCountryNames, getCountryCode } from "@/lib/data/country-codes"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

interface CountrySelectProps {
    value: string | null
    onSelect: (country: string) => void
    excludeCountries?: string[]
    placeholder?: string
}

export const CountrySelect = memo(function CountrySelect({
    value,
    onSelect,
    excludeCountries = [],
    placeholder = "Select a country...",
}: CountrySelectProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")

    // Get all valid countries, filtered by exclusions
    const allCountries = useMemo(() => {
        const countries = getValidCountryNames()
        const excludeSet = new Set(excludeCountries)
        return countries.filter(c => !excludeSet.has(c))
    }, [excludeCountries])

    // Filter countries by search
    const filteredCountries = useMemo(() => {
        if (!search.trim()) return allCountries
        const searchLower = search.toLowerCase()
        return allCountries.filter(c => c.toLowerCase().includes(searchLower))
    }, [allCountries, search])

    const selectedCountryCode = value ? getCountryCode(value) : null

    const handleSelect = (country: string) => {
        onSelect(country)
        setOpen(false)
        setSearch("")
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {value ? (
                        <span className="flex items-center gap-2">
                            {selectedCountryCode ? (
                                <ReactCountryFlag
                                    countryCode={selectedCountryCode}
                                    svg
                                    style={{
                                        width: "1.25em",
                                        height: "1.25em",
                                    }}
                                    title={value}
                                    aria-label={`Flag of ${value}`}
                                />
                            ) : null}
                            <span>{value}</span>
                        </span>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <div className="p-2 border-b">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search country..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
                <ScrollArea className="h-[300px]">
                    {filteredCountries.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            No country found.
                        </div>
                    ) : (
                        <div className="p-1">
                            {filteredCountries.map((country) => {
                                const countryCode = getCountryCode(country)
                                const isSelected = value === country
                                return (
                                    <button
                                        key={country}
                                        onClick={() => handleSelect(country)}
                                        className={cn(
                                            "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                            isSelected && "bg-accent"
                                        )}
                                    >
                                        <Check
                                            className={cn(
                                                "h-4 w-4",
                                                isSelected ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {countryCode ? (
                                            <ReactCountryFlag
                                                countryCode={countryCode}
                                                svg
                                                style={{
                                                    width: "1.25em",
                                                    height: "1.25em",
                                                }}
                                                title={country}
                                                aria-label={`Flag of ${country}`}
                                            />
                                        ) : null}
                                        <span>{country}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
})

CountrySelect.displayName = "CountrySelect"
