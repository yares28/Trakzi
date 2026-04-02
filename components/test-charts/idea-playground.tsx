"use client"

import { useEffect, useMemo, useState } from "react"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useCurrency } from "@/components/currency-provider"

import { buildInsightPlaygroundSections as buildLegacyApprovedSections } from "./idea-playground-catalog"
import { ChartMerchantBudgetMissMap } from "./chart-merchant-budget-miss-map"
import { ChartStorePriceDispersionIndex } from "./chart-store-price-dispersion-index"
import {
  buildApprovedOneClickGroups,
  buildInsightPlaygroundSections,
  type IdeaLabBundleResponse,
  type PlaygroundCardModel,
} from "./one-click-playground-catalog"
import { ProductionPlaygroundChartCard } from "./production-playground-chart-card"
import { withSeededMockReviewCard } from "./review-mock-data"

type ViewMode = "review" | "approved"

function inferCardSectionId(domain: string) {
  switch (domain) {
    case "Analytics":
      return "analytics"
    case "Fridge":
      return "fridge"
    case "Savings":
      return "savings"
    case "Debt":
      return "debt"
    case "Goals":
      return "goals"
    case "Pockets":
      return "pockets"
    case "Friend Rooms":
      return "friendRooms"
    case "Challenges":
      return "challenges"
    default:
      return "crossFeature"
  }
}

function adaptLegacyApprovedCards(
  bundle: IdeaLabBundleResponse,
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"],
) {
  const legacySection = buildLegacyApprovedSections(
    {
      transactions: bundle.transactions,
      receiptTransactions: bundle.receiptTransactions,
    },
    { formatCurrency },
  )[0]

  if (!legacySection) return []

  return legacySection.groups.map((group) => ({
    id: group.id,
    title: group.title.replace(/^Approved /, "To Be Implemented "),
    description: group.description,
    cards: group.cards.map<PlaygroundCardModel>((card) => ({
      ...card,
      visual: card.visual as PlaygroundCardModel["visual"],
      domain: group.title.replace(/^Approved /, ""),
      level: "Medium",
      chartType: card.tags[0] ?? "Approved chart",
      crossFeature: "No",
      primaryDataNeeded: "Existing transactions and receipt bundle",
      whyOriginal: "Previously approved and retained in implementation memory.",
      extractionConfidence: "High",
    })),
  }))
}

function renderImplementedChartCard(card: PlaygroundCardModel) {
  switch (card.id) {
    case "merchant-budget-miss-map":
      return <ChartMerchantBudgetMissMap card={card} />
    case "store-price-dispersion-index":
      return <ChartStorePriceDispersionIndex card={card} />
    default:
      return <ProductionPlaygroundChartCard card={card} />
  }
}

function getChartGridSpanClassName(card: PlaygroundCardModel) {
  if (card.id === "merchant-budget-miss-map") {
    return "xl:col-span-2"
  }

  return ""
}

function PlaygroundSkeleton() {
  return (
    <div className="space-y-8 px-4 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-[1.6rem] border border-border/45 bg-card/75"
          />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-xl bg-foreground/6" />
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 3 }).map((__, inner) => (
              <div
                key={inner}
                className="h-[420px] animate-pulse rounded-[1.4rem] border border-border/45 bg-card/75"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function TestChartsIdeaPlayground() {
  const [bundle, setBundle] = useState<IdeaLabBundleResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("review")
  const { formatCurrency } = useCurrency()

  useEffect(() => {
    let isActive = true

    async function loadBundle() {
      try {
        setIsLoading(true)
        const response = await fetch("/api/test-charts/idea-lab", {
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error("Failed to load one-click chart batch data")
        }

        const json = (await response.json()) as IdeaLabBundleResponse

        if (isActive) {
          setBundle(json)
          setError(null)
        }
      } catch (fetchError) {
        if (isActive) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load chart batch")
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadBundle()

    return () => {
      isActive = false
    }
  }, [])

  const reviewSection = useMemo<{
    title: string
    description: string
    accent: string
    count: number
    groups: ReturnType<typeof adaptLegacyApprovedCards>
    leadTitle: string | null
  } | null>(() => {
    if (!bundle) return null

    const activeManifest = Array.isArray(bundle.manifest) ? bundle.manifest.slice(0, 20) : []
    if (!activeManifest.length) return null

    const reviewSections = buildInsightPlaygroundSections(
      {
        ...bundle,
        manifest: activeManifest,
      },
      { formatCurrency },
    )

    const reviewGroups = reviewSections.flatMap((section) =>
      section.groups.map((group) => ({
        ...group,
        cards: group.cards.map((card) =>
          withSeededMockReviewCard(card, inferCardSectionId(card.domain), formatCurrency),
        ),
      })),
    )

    const reviewCount = reviewGroups.reduce((total, group) => total + group.cards.length, 0)
    const leadTitle = reviewGroups.flatMap((group) => group.cards)[0]?.title ?? null

    return {
      title: "To Be Approved",
      description:
        "The review queue contains the active top-20 shortlist from the latest 100-chart run, separated from already approved charts.",
      accent: `${reviewCount} charts in review`,
      count: reviewCount,
      groups: reviewGroups,
      leadTitle,
    }
  }, [bundle, formatCurrency])

  const approvedSection = useMemo<{
    id: "approved"
    title: string
    description: string
    accent: string
    count: number
    groups: ReturnType<typeof adaptLegacyApprovedCards>
  } | null>(() => {
    if (!bundle) return null

    const approvedManifest =
      Array.isArray(bundle.approvedManifest) && bundle.approvedManifest.length > 0
        ? bundle.approvedManifest
        : []

    const legacyGroups = adaptLegacyApprovedCards(bundle, formatCurrency)
    const selectedGroups = buildApprovedOneClickGroups(
      {
        ...bundle,
        manifest: approvedManifest,
      },
      { formatCurrency },
    )

    const approvedGroups = [...legacyGroups, ...selectedGroups].map((group) => ({
      ...group,
      cards: group.cards.map((card) =>
        withSeededMockReviewCard(card, inferCardSectionId(card.domain), formatCurrency),
      ),
    }))

    const approvedCount = approvedGroups.reduce((total, group) => total + group.cards.length, 0)

    return {
      id: "approved",
      title: "To Be Implemented",
      description:
        "Approved charts stay in their own queue, separate from the live review surface, and remain available as full clone-spec implementation candidates with seeded mock data.",
      accent: `${approvedCount} charts ready to implement`,
      count: approvedCount,
      groups: approvedGroups,
    }
  }, [bundle, formatCurrency])

  const approvedCount = approvedSection?.count ?? 0
  const reviewCount = reviewSection?.count ?? 0
  const visibleCount = viewMode === "review" ? reviewCount : approvedCount

  if (isLoading) {
    return <PlaygroundSkeleton />
  }

  if (error || !bundle) {
    return (
      <div className="px-4 lg:px-6">
        <Card className="border-destructive/25 bg-card/90">
          <CardHeader>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Production chart batch
            </div>
            <CardTitle>Chart batch unavailable</CardTitle>
            <CardDescription>
              {error ?? "The implementation batch could not be generated from the current bundle."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-10 px-4 lg:px-6">
      <Card className="border-border/45 bg-card/92 shadow-none">
        <CardHeader className="gap-5 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/72">
                <Sparkles className="h-3.5 w-3.5" />
                Test Charts
              </div>
              <CardTitle className="text-[1.5rem] leading-tight tracking-[-0.04em]">
                Review and implementation queues
              </CardTitle>
              <CardDescription className="max-w-[56ch] text-sm leading-relaxed text-muted-foreground/82">
                A simple split between live candidates and approved clone-spec cards running in mock-data mode.
              </CardDescription>
            </div>
            <div className="inline-flex w-full rounded-full border border-border/50 bg-background/70 p-1 lg:w-auto">
              <Button
                size="sm"
                variant={viewMode === "review" ? "secondary" : "ghost"}
                className="flex-1 rounded-full shadow-none lg:flex-none"
                onClick={() => setViewMode("review")}
              >
                To Be Approved
              </Button>
              <Button
                size="sm"
                variant={viewMode === "approved" ? "secondary" : "ghost"}
                className="flex-1 rounded-full shadow-none lg:flex-none"
                onClick={() => setViewMode("approved")}
              >
                To Be Implemented
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground/78">
            <div>
              <span className="font-medium text-foreground">{reviewCount}</span> in review
            </div>
            <div>
              <span className="font-medium text-foreground">{approvedCount}</span> to implement
            </div>
            <div>
              <span className="font-medium text-foreground">{visibleCount}</span> visible
            </div>
            <div>
              Lead: <span className="font-medium text-foreground">{reviewSection?.leadTitle ?? "None"}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {viewMode === "review" ? (
        <section
          id="to-be-approved"
          className="space-y-6"
        >
          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/72">
              To Be Approved
            </div>
            <h3 className="text-[1.3rem] font-semibold tracking-[-0.04em]">No live review cards right now.</h3>
            <p className="max-w-[64ch] text-sm leading-relaxed text-muted-foreground/82">
              The latest shortlist has already been resolved. New review cards will appear here when another batch is opened.
            </p>
          </div>
          {reviewSection ? (
            reviewSection.groups.map((group) => (
              <div key={group.id} id={group.id} className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold tracking-[-0.03em]">{group.title}</h4>
                    <p className="mt-1 max-w-[64ch] text-sm text-muted-foreground/82">
                      {group.description}
                    </p>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/68">
                    {group.cards.length} charts
                  </div>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {group.cards.map((card) => (
                    <div key={card.id} className={getChartGridSpanClassName(card)}>
                      {renderImplementedChartCard(card)}
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-border/50 bg-background/35 px-5 py-10 text-center">
              <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground/72">
                Review queue empty
              </div>
              <p className="mx-auto mt-3 max-w-[50ch] text-sm leading-relaxed text-muted-foreground/88">
                Add a new ranked shortlist or promote more ideas into the page when you want another review round.
              </p>
            </div>
          )}
        </section>
      ) : null}

      {viewMode === "approved" && approvedSection ? (
        <section
          id="to-be-implemented"
          className="space-y-6"
        >
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/72">
                {approvedSection.title}
              </div>
              <div className="rounded-full border border-border/45 bg-background/65 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {approvedSection.accent}
              </div>
            </div>
            <h3 className="text-[1.3rem] font-semibold tracking-[-0.04em]">
              Selected charts live in their own implementation queue.
            </h3>
            <p className="max-w-[64ch] text-sm leading-relaxed text-muted-foreground/82">
              {approvedSection.description}
            </p>
          </div>

          {approvedSection.groups.map((group) => (
            <div key={group.id} id={group.id} className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h4 className="text-lg font-semibold tracking-[-0.03em]">{group.title}</h4>
                  <p className="mt-1 max-w-[64ch] text-sm text-muted-foreground/82">
                    {group.description}
                  </p>
                </div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/68">
                  {group.cards.length} charts
                </div>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {group.cards.map((card) => (
                  <div key={card.id} className={getChartGridSpanClassName(card)}>
                    {renderImplementedChartCard(card)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  )
}
