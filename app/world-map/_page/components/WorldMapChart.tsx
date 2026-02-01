"use client"

import { memo, useState, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import { ResponsiveChoropleth } from "@nivo/geo"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// World countries GeoJSON features
import worldCountriesRaw from "@/lib/data/world-countries.json"

// Type for GeoJSON feature
interface GeoFeature {
  type: string
  properties: { name: string }
  geometry: unknown
  id?: string
}

// Add id to each feature based on properties.name for Nivo matching
const worldCountries = {
  ...worldCountriesRaw,
  features: (worldCountriesRaw.features as GeoFeature[]).map((feature) => ({
    ...feature,
    id: feature.properties.name, // Nivo matches data.id to feature.id
  })),
}

export interface CountryData {
  id: string // Country name (must match feature.id which is set from properties.name)
  value: number
  label?: string
}

interface WorldMapChartProps {
  data?: CountryData[]
  isLoading?: boolean
  title?: string
}

export const WorldMapChart = memo(function WorldMapChart({
  data = [],
  isLoading = false,
  title = "Global Spending Distribution",
}: WorldMapChartProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"

  // Standard text colors from CHARTS_CLONE_SPEC
  const textColor = isDark ? "#9ca3af" : "#4b5563"

  // Get palette colors for the choropleth scale (darker = larger values)
  const colorScale = useMemo(() => {
    const palette = getPalette().filter(c => c !== "#c3c3c3")
    // Reverse palette so darkest colors go to largest values
    return [...palette].reverse().slice(0, 7)
  }, [getPalette])

  // Calculate domain for color scale
  const domain = useMemo(() => {
    if (data.length === 0) return [0, 100]
    const values = data.map(d => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    return [min, max]
  }, [data])

  // Nivo theme configuration - following CHARTS_CLONE_SPEC
  const nivoTheme = useMemo(() => ({
    background: "transparent",
    text: {
      fontSize: 12,
      fill: textColor,
    },
    legends: {
      text: {
        fontSize: 11,
        fill: textColor,
      },
    },
  }), [textColor])

  // Loading skeleton
  if (!mounted || isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full animate-pulse bg-muted/50 rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Fixed height container - required for Nivo responsive charts */}
        <div style={{ height: "500px", width: "100%" }}>
          <ResponsiveChoropleth
            data={data}
            features={worldCountries.features}
            label="properties.name"
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            colors={colorScale.length > 0 ? colorScale : ["#e5e7eb", "#d1d5db", "#9ca3af", "#6b7280", "#4b5563", "#374151", "#1f2937"]}
            domain={domain}
            // Better contrast in both light and dark mode
            unknownColor={isDark ? "#3f3f46" : "#e5e7eb"}
            valueFormat=".2s"
            projectionType="mercator"
            projectionScale={150}
            projectionTranslation={[0.5, 0.65]}
            projectionRotation={[0, 0, 0]}
            // No grid/graticule
            enableGraticule={false}
            // Border colors for visibility in both modes
            borderWidth={0.5}
            borderColor={isDark ? "#52525b" : "#a1a1aa"}
            theme={nivoTheme}
            tooltip={({ feature }) => {
              const countryName = feature.label || "Unknown"
              const countryData = data.find(d => d.id === countryName)
              const value = countryData?.value ?? 0

              return (
                <NivoChartTooltip
                  title={countryName}
                  titleColor={countryData ? colorScale[Math.floor(colorScale.length / 2)] : undefined}
                  value={formatCurrency(value)}
                  subValue={countryData ? "Total spending" : "No data"}
                />
              )
            }}
            legends={[
              {
                anchor: "bottom-left",
                direction: "column",
                justify: true,
                translateX: 20,
                translateY: -20,
                itemsSpacing: 0,
                itemWidth: 94,
                itemHeight: 18,
                itemDirection: "left-to-right",
                itemTextColor: textColor,
                itemOpacity: 0.85,
                symbolSize: 18,
                effects: [
                  {
                    on: "hover",
                    style: {
                      itemTextColor: isDark ? "#ffffff" : "#000000",
                      itemOpacity: 1,
                    },
                  },
                ],
              },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  )
})

WorldMapChart.displayName = "WorldMapChart"
