"use client"

import { useState, useEffect } from "react"

export interface PlanFeatures {
  plan: string
  advancedChartsEnabled: boolean
  aiInsightsFreePreviewCount: number
  aiChatMessages: number
  aiInsightsEnabled: boolean
}

const DEFAULT_FEATURES: PlanFeatures = {
  plan: "free",
  advancedChartsEnabled: false,
  aiInsightsFreePreviewCount: 3,
  aiChatMessages: 10,
  aiInsightsEnabled: false,
}

// Module-level singleton — avoids duplicate API calls across multiple hook instances
let cachedFeatures: PlanFeatures | null = null
let fetchPromise: Promise<PlanFeatures> | null = null

async function loadFeatures(): Promise<PlanFeatures> {
  if (cachedFeatures) return cachedFeatures
  if (!fetchPromise) {
    fetchPromise = fetch("/api/subscription/me")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch subscription")
        return res.json()
      })
      .then((data): PlanFeatures => {
        const features: PlanFeatures = {
          plan: data.plan || "free",
          advancedChartsEnabled: data.limits?.advanced_charts_enabled ?? false,
          aiInsightsFreePreviewCount: data.limits?.ai_insights_free_preview_count ?? 3,
          aiChatMessages: data.limits?.ai_chat_messages ?? 10,
          aiInsightsEnabled: data.limits?.ai_insights_enabled ?? false,
        }
        cachedFeatures = features
        return features
      })
      .catch(() => {
        fetchPromise = null // Allow retry on next hook mount
        return DEFAULT_FEATURES
      })
  }
  return fetchPromise
}

/**
 * Returns the current user's plan feature flags, fetched once per session.
 * Returns null while loading so callers can show a skeleton if needed.
 */
export function usePlanFeatures(): PlanFeatures | null {
  const [features, setFeatures] = useState<PlanFeatures | null>(cachedFeatures)

  useEffect(() => {
    if (cachedFeatures) {
      setFeatures(cachedFeatures)
      return
    }
    loadFeatures().then(setFeatures)
  }, [])

  return features
}
