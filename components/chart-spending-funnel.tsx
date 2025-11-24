"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveFunnel } from "@nivo/funnel"
import { useColorScheme } from "@/components/color-scheme-provider"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { IconInfoCircle } from "@tabler/icons-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ChartSpendingFunnelProps {
  data?: Array<{
    id: string
    value: number
    label: string
  }>
}

// Dark colors that require white text
const darkColors = ["#696969", "#464646", "#2F2F2F", "#252525"]

// Gold palette colors that require white text (black and brown)
const goldDarkColors = ["#000000", "#361c1b", "#754232", "#cd894a"]

// Helper function to determine text color based on slice color
const getTextColor = (sliceColor: string, colorScheme?: string): string => {
  if (colorScheme === "gold") {
    return goldDarkColors.includes(sliceColor) ? "#ffffff" : "#000000"
  }
  return darkColors.includes(sliceColor) ? "#ffffff" : "#000000"
}

export function ChartSpendingFunnel({ data = [] }: ChartSpendingFunnelProps) {
  const { resolvedTheme } = useTheme()
  const { colorScheme, getPalette } = useColorScheme()
  const [mounted, setMounted] = useState(false)
  const [isInfoOpen, setIsInfoOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"
  const textColor = isDark ? "#9ca3af" : "#6b7280"
  
  // Use nivo scheme for colored, custom dark palette for dark styling
  // More money = darker color (bigger peso = darker)
  // Each layer is 2 shades lighter than the previous
  // Income ($5,430) = darkest, Savings ($800) = lightest
  // Max 7 layers
  // For all palettes: darker colors = larger amounts, lighter colors = smaller amounts
  const palette = getPalette().filter(color => color !== "#c3c3c3")
  const numLayers = Math.min(data.length, 7)
  
  // Reverse palette so darkest colors are first (for highest income)
  // Income (largest) gets darkest color, Savings (smallest) gets lightest color
  const reversedPalette = [...palette].reverse()
  let colorConfig = reversedPalette.slice(0, numLayers)
  
  // If we need more colors than available, cycle through the reversed palette
  while (colorConfig.length < numLayers) {
    colorConfig.push(...reversedPalette.slice(0, numLayers - colorConfig.length))
  }
  colorConfig = colorConfig.slice(0, numLayers)

  if (!mounted) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Money Flow</CardTitle>
          <CardDescription>How your income flows to savings</CardDescription>
          <CardAction>
            <Popover open={isInfoOpen} onOpenChange={setIsInfoOpen}>
              <PopoverTrigger asChild>
                <button 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onMouseEnter={() => setIsInfoOpen(true)}
                  onMouseLeave={() => setIsInfoOpen(false)}
                >
                  <IconInfoCircle className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-80" 
                align="end"
                onMouseEnter={() => setIsInfoOpen(true)}
                onMouseLeave={() => setIsInfoOpen(false)}
              >
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Money Flow</h4>
                  <p className="text-sm text-muted-foreground">
                    This funnel chart visualizes how your income flows through your top expense categories to savings.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>How it works:</strong> Starting from the top (Income), each layer represents a major expense category. The width shows the amount. Only categories larger than your savings are shown. The bottom layer represents your savings - what remains after all expenses.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // Don't render chart if data is empty
  if (!data || data.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Money Flow</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">
              Visualize how your income flows through expenses to savings
            </span>
            <span className="@[540px]/card:hidden">Income to savings flow</span>
          </CardDescription>
          <CardAction>
            <Popover open={isInfoOpen} onOpenChange={setIsInfoOpen}>
              <PopoverTrigger asChild>
                <button 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onMouseEnter={() => setIsInfoOpen(true)}
                  onMouseLeave={() => setIsInfoOpen(false)}
                >
                  <IconInfoCircle className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-80" 
                align="end"
                onMouseEnter={() => setIsInfoOpen(true)}
                onMouseLeave={() => setIsInfoOpen(false)}
              >
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Money Flow</h4>
                  <p className="text-sm text-muted-foreground">
                    This funnel chart visualizes how your income flows through your top expense categories to savings.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>How it works:</strong> Starting from the top (Income), each layer represents a major expense category. The width shows the amount. Only categories larger than your savings are shown. The bottom layer represents your savings - what remains after all expenses.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="h-[400px] w-full flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Money Flow</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Visualize how your income flows through expenses to savings
          </span>
          <span className="@[540px]/card:hidden">Income to savings flow</span>
        </CardDescription>
        <CardAction>
          <Popover open={isInfoOpen} onOpenChange={setIsInfoOpen}>
            <PopoverTrigger asChild>
              <button 
                className="text-muted-foreground hover:text-foreground transition-colors"
                onMouseEnter={() => setIsInfoOpen(true)}
                onMouseLeave={() => setIsInfoOpen(false)}
              >
                <IconInfoCircle className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-80" 
              align="end"
              onMouseEnter={() => setIsInfoOpen(true)}
              onMouseLeave={() => setIsInfoOpen(false)}
            >
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Money Flow</h4>
                <p className="text-sm text-muted-foreground">
                  This funnel chart visualizes how your income flows through your top expense categories to savings.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>How it works:</strong> Starting from the top (Income), each layer represents a major expense category. The width shows the amount. Only categories larger than your savings are shown. The bottom layer represents your savings - what remains after all expenses.
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="h-[400px] w-full">
          <ResponsiveFunnel
            data={data}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            valueFormat=">-$,.0f"
            colors={colorConfig}
            borderWidth={20}
            labelColor={(d: { color: string }) => getTextColor(d.color, colorScheme)}
            beforeSeparatorLength={100}
            beforeSeparatorOffset={20}
            afterSeparatorLength={100}
            afterSeparatorOffset={20}
            currentPartSizeExtension={10}
            currentBorderWidth={40}
            theme={{
              text: {
                fill: textColor,
                fontSize: 12,
              },
              tooltip: {
                container: {
                  background: "#ffffff",
                  color: "#000000",
                  fontSize: 12,
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  padding: "8px 12px",
                  border: "1px solid #e2e8f0",
                },
              },
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

