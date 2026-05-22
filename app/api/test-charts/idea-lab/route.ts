import { readFile } from "node:fs/promises"
import path from "node:path"

import { NextResponse } from "next/server"

import type { TestChartsSummary } from "@/lib/charts/aggregations"
import type { FriendsBundleSummary } from "@/lib/charts/friends-aggregations"
import type { PocketsBundleResponse } from "@/lib/types/pockets"

type IdeaManifestChart = {
  id: string
  title: string
  pageDomain: string
  level: "Easy" | "Medium" | "High"
  chartType: string
  coreQuestion: string
  whyItMatters: string
  primaryDataNeeded: string
  crossFeature: string
  whyOriginal: string
  extractionConfidence: "High" | "Medium" | "Low"
}

type IdeaLabGoal = {
  id: number
  category: string
  label: string | null
  targetAmount: number
  deadline: string
  monthlyAllocation: number
  status: string
}

type IdeaLabChallengeGroup = {
  id: string
  name: string
  isPublic: boolean
  inviteCode: string
  metrics: string[]
  members: Array<{
    userId: string
    displayName: string
    totalPoints: number
    joinedAt: string
  }>
  results: Array<{
    userId: string
    month: string
    metric: string
    score: number
    points: number
  }>
}

type IdeaLabResponse = TestChartsSummary & {
  manifest: IdeaManifestChart[]
  approvedManifest: IdeaManifestChart[]
  friends: FriendsBundleSummary
  pockets: PocketsBundleResponse
  goals: IdeaLabGoal[]
  challengeGroups: IdeaLabChallengeGroup[]
}

const EMPTY_BASE_BUNDLE: TestChartsSummary = {
  transactions: [],
  receiptTransactions: [],
}

const EMPTY_FRIENDS_BUNDLE: FriendsBundleSummary = {
  friends: [],
  rooms: [],
  friendsList: [],
  pendingRequests: {
    incoming: [],
    outgoing: [],
  },
  activityFeed: [],
  challenges: [],
  netBalance: {
    totalOwedToYou: 0,
    totalYouOwe: 0,
  },
}

const EMPTY_POCKETS_BUNDLE: PocketsBundleResponse = {
  countries: [],
  vehicles: [],
  properties: [],
  otherPockets: [],
  stats: {
    travel: {
      totalCountries: 0,
      totalSpentAbroad: 0,
      topCountry: null,
      avgDailySpend: 0,
    },
    garage: {
      totalVehicles: 0,
      totalInvested: 0,
      topVehicle: null,
    },
    property: {
      totalProperties: 0,
      totalValue: 0,
      totalEquity: 0,
      topProperty: null,
    },
    other: {
      totalItems: 0,
      totalSpent: 0,
      topItem: null,
    },
  },
}

const RESOLVED_PRIOR_TOP_TWENTY_PICKS = [
  "Merchant Budget Miss Map",
  "Category Timing Skew Ladder",
  "Overspend Streak by Category",
  "Store Price Dispersion Index",
  "Quantity Discount Failure Map",
  "Fixed-Bill Retention Rate",
  "Transfer Rescue Frequency",
  "Goal Deadline Order vs Target Size",
  "Goal Horizon Balance Index",
] as const

const RESOLVED_ROUND_TWO_PICKS = [
  "Category Price Season Window",
  "Metric Breadth by Member",
  "Grocery Store Mix vs Challenge Fridge Score",
] as const

const APRIL_FIRST_APPROVED_PICKS = [
  "Store Price Floor Reliability",
  "Cushion Depth vs Essential Median",
  "Paycheck-to-Paycheck Carry Ratio",
] as const

const APRIL_SECOND_APPROVED_PICKS = [
  "Store Visit Mission Drift",
  "Low-Balance Rescue Source Mix",
  "Debt Ticket Drift by Stream",
] as const

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function parseManifest(markdown: string): IdeaManifestChart[] {
  const sectionStart = markdown.indexOf("## 1. Proposed Charts")
  const sectionEnd = markdown.indexOf("## 2. Best of Batch")

  if (sectionStart === -1 || sectionEnd === -1 || sectionEnd <= sectionStart) {
    throw new Error("Could not locate proposed-chart table in one-click ideation run")
  }

  const lines = markdown
    .slice(sectionStart, sectionEnd)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const rows = lines.filter(
    (line) => line.startsWith("|") && !line.startsWith("|---") && !line.startsWith("| Chart Title |"),
  )

  return rows.map((row) => {
    const parts = row
      .slice(1, -1)
      .split("|")
      .map((part) => part.trim())

    const [
      title,
      pageDomain,
      level,
      chartType,
      coreQuestion,
      whyItMatters,
      primaryDataNeeded,
      crossFeature,
      whyOriginal,
      extractionConfidence,
    ] = parts

    return {
      id: slugify(title),
      title,
      pageDomain,
      level: (level as IdeaManifestChart["level"]) ?? "Medium",
      chartType,
      coreQuestion,
      whyItMatters,
      primaryDataNeeded,
      crossFeature,
      whyOriginal,
      extractionConfidence: (extractionConfidence as IdeaManifestChart["extractionConfidence"]) ?? "Medium",
    }
  })
}

async function getIdeaManifest(relativePath: string) {
  const filePath = path.join(process.cwd(), "docs", "chart generation", relativePath)
  const markdown = await readFile(filePath, "utf8")
  return parseManifest(markdown)
}

export const GET = async () => {
  try {
    const [
      activeManifest,
      aprilFirstArchiveManifest,
      previousApprovedManifest,
      resolvedRoundManifest,
      roundTwoResolvedManifest,
    ] =
      await Promise.all([
        getIdeaManifest("2026-04-01-one-click-100-charts-round-3.md"),
        getIdeaManifest("2026-04-01-one-click-100-charts.md"),
        getIdeaManifest("2026-03-29-one-click-100-charts.md"),
        getIdeaManifest("2026-03-30-one-click-100-charts.md"),
        getIdeaManifest("2026-03-30-one-click-100-charts-round-2.md"),
      ])

    const priorPromotedSelections = resolvedRoundManifest.filter((row) =>
      RESOLVED_PRIOR_TOP_TWENTY_PICKS.includes(row.title as (typeof RESOLVED_PRIOR_TOP_TWENTY_PICKS)[number]),
    )
    const roundTwoPromotedSelections = roundTwoResolvedManifest.filter((row) =>
      RESOLVED_ROUND_TWO_PICKS.includes(row.title as (typeof RESOLVED_ROUND_TWO_PICKS)[number]),
    )
    const aprilFirstApprovedSelections = aprilFirstArchiveManifest.filter((row) =>
      APRIL_FIRST_APPROVED_PICKS.includes(row.title as (typeof APRIL_FIRST_APPROVED_PICKS)[number]),
    )
    const aprilSecondApprovedSelections = activeManifest.filter((row) =>
      APRIL_SECOND_APPROVED_PICKS.includes(row.title as (typeof APRIL_SECOND_APPROVED_PICKS)[number]),
    )

    const payload: IdeaLabResponse = {
      manifest: [],
      approvedManifest: [
        ...previousApprovedManifest,
        ...priorPromotedSelections,
        ...roundTwoPromotedSelections,
        ...aprilFirstApprovedSelections,
        ...aprilSecondApprovedSelections,
      ],
      ...EMPTY_BASE_BUNDLE,
      friends: EMPTY_FRIENDS_BUNDLE,
      pockets: EMPTY_POCKETS_BUNDLE,
      goals: [],
      challengeGroups: [],
    }

    return NextResponse.json(payload, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load the test chart idea lab"

    console.error("[Test Charts Idea Lab] Error:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
