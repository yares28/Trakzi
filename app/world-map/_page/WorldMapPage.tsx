"use client"

import { useMemo } from "react"
import { useTheme } from "next-themes"
import { useColorScheme } from "@/components/color-scheme-provider"

import { WorldMapLayout } from "./components/WorldMapLayout"
import { WorldMapStatsCards } from "./components/StatsCards"
import { WorldMapChart, type CountryData } from "./components/WorldMapChart"

// Sample data for demonstration - in production, this would come from a bundle API
const SAMPLE_COUNTRY_DATA: CountryData[] = [
  { id: "USA", value: 45000, label: "United States" },
  { id: "GBR", value: 12000, label: "United Kingdom" },
  { id: "FRA", value: 8500, label: "France" },
  { id: "DEU", value: 7200, label: "Germany" },
  { id: "JPN", value: 6800, label: "Japan" },
  { id: "CAN", value: 5500, label: "Canada" },
  { id: "AUS", value: 4200, label: "Australia" },
  { id: "ITA", value: 3800, label: "Italy" },
  { id: "ESP", value: 3200, label: "Spain" },
  { id: "NLD", value: 2800, label: "Netherlands" },
  { id: "BRA", value: 2500, label: "Brazil" },
  { id: "MEX", value: 2200, label: "Mexico" },
  { id: "CHN", value: 1800, label: "China" },
  { id: "IND", value: 1500, label: "India" },
  { id: "KOR", value: 1200, label: "South Korea" },
]

export default function WorldMapPage() {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const palette = getPalette()

  // Calculate stats from the sample data
  const stats = useMemo(() => {
    const totalAbroad = SAMPLE_COUNTRY_DATA
      .filter(d => d.id !== "USA") // Assuming USA is "domestic"
      .reduce((sum, d) => sum + d.value, 0)

    const domesticSpend = SAMPLE_COUNTRY_DATA
      .find(d => d.id === "USA")?.value ?? 0

    const topCountry = SAMPLE_COUNTRY_DATA
      .filter(d => d.id !== "USA")
      .sort((a, b) => b.value - a.value)[0]

    return {
      countriesCount: SAMPLE_COUNTRY_DATA.length,
      topCountrySpend: topCountry?.value ?? 0,
      topCountryName: topCountry?.label ?? "—",
      totalSpendAbroad: totalAbroad,
      domesticSpend: domesticSpend,
    }
  }, [])

  return (
    <WorldMapLayout>
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Stats Cards - 4 top bars like analytics */}
          <WorldMapStatsCards
            countriesCount={stats.countriesCount}
            topCountrySpend={stats.topCountrySpend}
            topCountryName={stats.topCountryName}
            totalSpendAbroad={stats.totalSpendAbroad}
            domesticSpend={stats.domesticSpend}
          />

          {/* World Map Chart - big card */}
          <div className="px-4 lg:px-6">
            <WorldMapChart
              data={SAMPLE_COUNTRY_DATA}
              isLoading={false}
              title="Global Spending Distribution"
              description="Visualize your spending across different countries"
            />
          </div>
        </div>
      </div>
    </WorldMapLayout>
  )
}
