"use client"

import { useMemo } from "react"

import { WorldMapLayout } from "./components/WorldMapLayout"
import { WorldMapStatsCards } from "./components/StatsCards"
import { WorldMapChart, type CountryData } from "./components/WorldMapChart"

// Sample data for demonstration - in production, this would come from a bundle API
// Note: id must match the country name in the GeoJSON (properties.name)
const SAMPLE_COUNTRY_DATA: CountryData[] = [
  { id: "USA", value: 45000 },
  { id: "UK", value: 12000 },
  { id: "France", value: 8500 },
  { id: "Germany", value: 7200 },
  { id: "Japan", value: 6800 },
  { id: "Canada", value: 5500 },
  { id: "Australia", value: 4200 },
  { id: "Italy", value: 3800 },
  { id: "Spain", value: 3200 },
  { id: "Netherlands", value: 2800 },
  { id: "Brazil", value: 2500 },
  { id: "Mexico", value: 2200 },
  { id: "China", value: 1800 },
  { id: "India", value: 1500 },
  { id: "Korea", value: 1200 },
]

export default function WorldMapPage() {
  // Calculate stats from the sample data
  const stats = useMemo(() => {
    const domesticName = "USA"
    const totalAbroad = SAMPLE_COUNTRY_DATA
      .filter(d => d.id !== domesticName)
      .reduce((sum, d) => sum + d.value, 0)

    const domesticSpend = SAMPLE_COUNTRY_DATA
      .find(d => d.id === domesticName)?.value ?? 0

    const topCountry = SAMPLE_COUNTRY_DATA
      .filter(d => d.id !== domesticName)
      .sort((a, b) => b.value - a.value)[0]

    return {
      countriesCount: SAMPLE_COUNTRY_DATA.length,
      topCountrySpend: topCountry?.value ?? 0,
      topCountryName: topCountry?.id ?? "—",
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
            />
          </div>
        </div>
      </div>
    </WorldMapLayout>
  )
}
