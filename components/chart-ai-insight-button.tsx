"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { IconSparkles, IconAlertTriangle, IconCheck, IconLoader2, IconLock } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { usePlanFeatures } from "@/hooks/use-plan-features"
import Link from "next/link"

const AI_INSIGHTS_USED_KEY = "ai_insights_previews_used"

function getPreviewsUsed(): number {
  try {
    return parseInt(localStorage.getItem(AI_INSIGHTS_USED_KEY) || "0", 10)
  } catch {
    return 0
  }
}

function incrementPreviewsUsed(): void {
  try {
    const current = getPreviewsUsed()
    localStorage.setItem(AI_INSIGHTS_USED_KEY, String(current + 1))
  } catch {
    // ignore localStorage errors
  }
}

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

// LocalStorage cache used in component instead of in-memory maps

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
  const [isPreviewLocked, setIsPreviewLocked] = useState(false)
  const fetchedRef = useRef(false)
  const planFeatures = usePlanFeatures()

  // Check preview limit when plan features load or popover opens
  useEffect(() => {
    if (!planFeatures) return
    const limit = planFeatures.aiInsightsFreePreviewCount
    if (limit > 0 && getPreviewsUsed() >= limit) {
      setIsPreviewLocked(true)
    }
  }, [planFeatures])

  // Helper to generate a robust cache key based on data content
  const getCacheKey = useCallback(async () => {
    if (!chartData) return `${chartId}-no-data`

    // Create a deterministic string representation of the data
    // We sort keys to ensure object order doesn't affect hash
    const stableStringify = (obj: any): string => {
      if (typeof obj !== 'object' || obj === null) return String(obj)
      if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`
      return `{${Object.keys(obj).sort().map(k => `${k}:${stableStringify(obj[k])}`).join(',')}}`
    }

    try {
      const dataString = stableStringify(chartData)
      const msgBuffer = new TextEncoder().encode(dataString)
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      return `ai_insight_v1_${chartId}_${hashHex}`
    } catch (e) {
      console.warn("Hashing failed, falling back to simple key", e)
      return `ai_insight_v1_${chartId}_${JSON.stringify(chartData).length}`
    }
  }, [chartId, chartData])

  const fetchInsight = useCallback(async () => {
    // Prevent duplicate fetches
    if (fetchedRef.current || isLoading) return
    fetchedRef.current = true
    setIsLoading(true)
    setError(null)
    let didError = true // assume error until success path clears it

    try {
      // 1. Check LocalStorage Cache
      const cacheKey = await getCacheKey()

      const cachedRaw = localStorage.getItem(cacheKey)
      if (cachedRaw) {
        try {
          const cachedData = JSON.parse(cachedRaw)
          // valid cache hit
          setInsight(cachedData)
          setIsLoading(false)
          return
        } catch (e) {
          localStorage.removeItem(cacheKey) // Corrupt cache
        }
      }

      // 2. Fetch from API if miss
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

      // 3. Increment preview counter for free-plan tracking (new API fetch = new preview used)
      if (planFeatures && planFeatures.aiInsightsFreePreviewCount > 0) {
        incrementPreviewsUsed()
        const used = getPreviewsUsed()
        if (used >= planFeatures.aiInsightsFreePreviewCount) {
          setIsPreviewLocked(true)
        }
      }

      // 4. Save to Cache
      setInsight(data)
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data))

        // Cleanup old keys occasionally (simple probabilistic cleanup)
        if (Math.random() < 0.1) {
          // 10% chance to run cleanup
          const now = Date.now()
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith('ai_insight_v1_')) {
              // Logic to remove very old keys could go here if we stored timestamp
              // For now, simple cleanup is just rely on manual clearing or browser limits
            }
          }
        }
      } catch (e) {
        console.warn("Failed to save to localStorage (likely quota)", e)
      }

      didError = false
    } catch (err: any) {
      didError = true
      setError(err.message || "Unable to generate insight")
    } finally {
      setIsLoading(false)
      // Allow re-fetch on error, but keep blocked on success to avoid loops
      if (didError) fetchedRef.current = false
    }
  }, [chartId, chartTitle, chartDescription, chartData, isLoading, getCacheKey, planFeatures])

  const handleOpenChange = (open: boolean) => {
    // Re-check preview lock on each open (in case limit was reached in another tab)
    if (open && planFeatures) {
      const limit = planFeatures.aiInsightsFreePreviewCount
      if (limit > 0 && getPreviewsUsed() >= limit) {
        setIsPreviewLocked(true)
        setIsOpen(true)
        return
      }
    }
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
          {isPreviewLocked && (
            <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
              <div className="rounded-full bg-primary/10 border border-primary/20 p-3">
                <IconLock className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Preview limit reached</p>
                <p className="text-xs text-muted-foreground">
                  You&apos;ve used your {planFeatures?.aiInsightsFreePreviewCount ?? 3} free AI insight previews.
                  Upgrade to Pro or Max for unlimited insights.
                </p>
              </div>
              <Button size="sm" asChild>
                <Link href="/settings">
                  <IconSparkles className="h-3.5 w-3.5 mr-1.5" />
                  Upgrade Plan
                </Link>
              </Button>
            </div>
          )}

          {!isPreviewLocked && isLoading && (
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

          {!isPreviewLocked && error && (
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

          {!isPreviewLocked && insight && !isLoading && (
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

