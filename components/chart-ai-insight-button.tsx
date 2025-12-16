"use client"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { IconSparkles, IconAlertTriangle, IconCheck, IconLoader2 } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

// Custom lightbulb icon
const IconLightbulb = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className={className}>
    <path fill="none" d="M0 0h24v24H0z"></path>
    <path d="M11 18H7.94101C7.64391 16.7274 6.30412 15.6857 5.75395 14.9992C4.65645 13.6297 4 11.8915 4 10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10C20 11.8925 19.3428 13.6315 18.2443 15.0014C17.6944 15.687 16.3558 16.7276 16.059 18H13V13H11V18ZM16 20V21C16 22.1046 15.1046 23 14 23H10C8.89543 23 8 22.1046 8 21V20H16Z"></path>
  </svg>
)
import { useTheme } from "next-themes"

interface ChartAiInsightButtonProps {
  chartId: string
  chartTitle: string
  chartDescription?: string
  chartData?: Record<string, any>
  className?: string
  size?: "sm" | "md" | "lg"
}

type Sentiment = "positive" | "neutral" | "negative" | "warning"

interface InsightData {
  insight: string
  sentiment: Sentiment
  tips?: string[]
}

// Cache for insights to avoid repeated API calls
const insightCache = new Map<string, InsightData>()

export function ChartAiInsightButton({
  chartId,
  chartTitle,
  chartDescription,
  chartData,
  className,
  size = "md"
}: ChartAiInsightButtonProps) {
  const { resolvedTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [insight, setInsight] = useState<InsightData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  const fetchInsight = useCallback(async () => {
    // Check cache first
    const cacheKey = `${chartId}-${JSON.stringify(chartData || {}).substring(0, 100)}`
    if (insightCache.has(cacheKey)) {
      setInsight(insightCache.get(cacheKey)!)
      return
    }

    // Prevent duplicate fetches
    if (fetchedRef.current || isLoading) return
    fetchedRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/ai/chart-insight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chartId,
          chartTitle,
          chartDescription,
          chartData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch insight")
      }

      const data: InsightData = await response.json()
      setInsight(data)
      insightCache.set(cacheKey, data)
    } catch (err: any) {
      console.error("[ChartAiInsight] Error:", err)
      setError(err.message || "Unable to generate insight")
    } finally {
      setIsLoading(false)
    }
  }, [chartId, chartTitle, chartDescription, chartData, isLoading])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && !insight && !error) {
      fetchInsight()
    }
  }

  const getSentimentIcon = (sentiment: Sentiment) => {
    switch (sentiment) {
      case "positive":
        return <IconCheck className="h-4 w-4 text-green-500" />
      case "warning":
        return <IconAlertTriangle className="h-4 w-4 text-amber-500" />
      case "negative":
        return <IconAlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <IconLightbulb className="h-4 w-4 text-blue-500" />
    }
  }

  const getSentimentColor = (sentiment: Sentiment) => {
    switch (sentiment) {
      case "positive":
        return "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30"
      case "warning":
        return "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30"
      case "negative":
        return "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30"
      default:
        return "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30"
    }
  }

  const sizeClasses = {
    sm: "h-7 w-7",
    md: "h-8 w-8",
    lg: "h-9 w-9",
  }

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            sizeClasses[size],
            "flex-shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 relative z-20 transition-all duration-200",
            isOpen && "text-primary bg-primary/10 dark:bg-primary/20",
            className
          )}
          title={`AI Insights for ${chartTitle}`}
        >
          <IconSparkles className={cn(iconSizes[size], isOpen && "animate-pulse")} />
          <span className="sr-only">Get AI insights for {chartTitle}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 overflow-hidden"
        align="end"
        side="top"
        sideOffset={8}
      >
        <div className="px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10">
          <div className="flex items-center gap-2">
            <IconSparkles className="h-4 w-4 text-primary" />
            <h4 className="font-medium text-sm">AI Insight</h4>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {chartTitle}
          </p>
        </div>

        <div className="p-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="relative">
                <IconLoader2 className="h-8 w-8 text-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-primary/20 animate-ping" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Analyzing your data...
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Generating personalized insights
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30">
              <IconAlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                  Unable to generate insight
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
                  {error}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => {
                    fetchedRef.current = false
                    fetchInsight()
                  }}
                >
                  Try again
                </Button>
              </div>
            </div>
          )}

          {insight && !isLoading && (
            <div className="space-y-3">
              <div className={cn(
                "p-3 rounded-lg border",
                getSentimentColor(insight.sentiment)
              )}>
                <div className="flex items-start gap-2">
                  {getSentimentIcon(insight.sentiment)}
                  <p className="text-sm leading-relaxed">
                    {insight.insight}
                  </p>
                </div>
              </div>

              {insight.tips && insight.tips.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <IconLightbulb className="h-3 w-3" />
                    Tips
                  </p>
                  <ul className="space-y-1.5">
                    {insight.tips.map((tip, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-muted-foreground flex items-start gap-2"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

