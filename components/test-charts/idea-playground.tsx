"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Layers3,
  ListChecks,
  Radar,
  Sparkles,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCurrency } from "@/components/currency-provider";

import {
  CHART_LAB_APPROVED_MEMORY_PATH,
  CHART_LAB_OUTPUT_RULES,
  CHART_LAB_REJECTED_MEMORY_PATH,
  CHART_LAB_RESOLUTION_PROMPT_PATH,
  CHART_LAB_STRATEGY_LANES,
  CHART_LAB_SURFACE_GROUPS,
  CHART_LAB_WORKFLOW_DOCS,
} from "./chart-lab-content";
import { buildInsightPlaygroundSections as buildLegacyApprovedSections } from "./idea-playground-catalog";
import { ChartMerchantBudgetMissMap } from "./chart-merchant-budget-miss-map";
import { ChartStorePriceDispersionIndex } from "./chart-store-price-dispersion-index";
import {
  buildApprovedOneClickGroups,
  buildInsightPlaygroundSections,
  type IdeaLabBundleResponse,
  type PlaygroundCardModel,
} from "./one-click-playground-catalog";
import { ProductionPlaygroundChartCard } from "./production-playground-chart-card";
import { withSeededMockReviewCard } from "./review-mock-data";

interface TestChartsIdeaPlaygroundProps {
  generationPrompt: string;
  resolutionPrompt: string;
}

type ViewMode = "review" | "approved" | "prompt";

const COPY_RESET_MS = 1800;
const CHART_VIEW_STORAGE_KEY = "trakzi:test-chart-lab-view";

function inferCardSectionId(domain: string) {
  switch (domain) {
    case "Analytics":
      return "analytics";
    case "Fridge":
      return "fridge";
    case "Savings":
      return "savings";
    case "Debt":
      return "debt";
    case "Goals":
      return "goals";
    case "Pockets":
      return "pockets";
    case "Friend Rooms":
      return "friendRooms";
    case "Challenges":
      return "challenges";
    default:
      return "crossFeature";
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
  )[0];

  if (!legacySection) return [];

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
  }));
}

function renderImplementedChartCard(card: PlaygroundCardModel) {
  switch (card.id) {
    case "merchant-budget-miss-map":
      return <ChartMerchantBudgetMissMap card={card} />;
    case "store-price-dispersion-index":
      return <ChartStorePriceDispersionIndex card={card} />;
    default:
      return <ProductionPlaygroundChartCard card={card} />;
  }
}

function getChartGridSpanClassName(card: PlaygroundCardModel) {
  if (card.id === "merchant-budget-miss-map") {
    return "xl:col-span-2";
  }

  return "";
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
  );
}

function ChartPromptWalkthrough({
  generationPrompt,
  resolutionPrompt,
  reviewCount,
  approvedCount,
}: {
  generationPrompt: string;
  resolutionPrompt: string;
  reviewCount: number;
  approvedCount: number;
}) {
  const [copiedPrompt, setCopiedPrompt] = useState<
    "generation" | "resolution" | null
  >(null);

  useEffect(() => {
    if (!copiedPrompt) return;

    const timeout = window.setTimeout(() => {
      setCopiedPrompt(null);
    }, COPY_RESET_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [copiedPrompt]);

  async function handleCopyPrompt(kind: "generation" | "resolution") {
    try {
      await navigator.clipboard.writeText(
        kind === "generation" ? generationPrompt : resolutionPrompt,
      );
      setCopiedPrompt(kind);
    } catch {
      setCopiedPrompt(null);
    }
  }

  return (
    <section className="space-y-6">
      <Card className="border-border/45 bg-card/92 shadow-none">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/72">
              Prompt Walkthrough
            </div>
            <div className="rounded-full border border-border/45 bg-background/65 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Chart workflow visible
            </div>
          </div>
          <CardTitle className="text-[1.3rem] tracking-[-0.04em]">
            The chart system now exposes its review rules, memory, and delivery
            standards.
          </CardTitle>
          <CardDescription className="max-w-[72ch] text-sm leading-relaxed text-muted-foreground/84">
            The chart side already had strong underlying docs. This walkthrough
            makes them visible in the page so chart ideation is easier to audit,
            repeat, and keep disciplined over time.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border/45 bg-background/45 px-4 py-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/68">
              Review queue
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
              {reviewCount}
            </div>
            <p className="mt-2 leading-relaxed text-muted-foreground/82">
              Active shortlist cards currently waiting for approval.
            </p>
          </div>
          <div className="rounded-2xl border border-border/45 bg-background/45 px-4 py-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/68">
              Implementation queue
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
              {approvedCount}
            </div>
            <p className="mt-2 leading-relaxed text-muted-foreground/82">
              Approved clone-spec charts held apart from active review.
            </p>
          </div>
          <div className="rounded-2xl border border-border/45 bg-background/45 px-4 py-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/68">
              Workflow docs
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
              {CHART_LAB_WORKFLOW_DOCS.length}
            </div>
            <p className="mt-2 leading-relaxed text-muted-foreground/82">
              Review, scoring, selection, memory, and delivery docs backing the
              chart lab.
            </p>
          </div>
          <div className="rounded-2xl border border-border/45 bg-background/45 px-4 py-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/68">
              Memory discipline
            </div>
            <div className="mt-2 text-sm font-medium text-foreground">
              Approved + rejected tracked
            </div>
            <p className="mt-2 leading-relaxed text-muted-foreground/82">
              Survivors move into implementation memory and discarded charts
              stay off-limits unchanged.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {CHART_LAB_STRATEGY_LANES.map((lane) => (
          <Card
            key={lane.title}
            className="border-border/45 bg-card/90 shadow-none"
          >
            <CardHeader className="gap-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/72">
                <Workflow className="h-3.5 w-3.5" />
                Strategy lane
              </div>
              <CardTitle className="text-xl tracking-[-0.03em]">
                {lane.title}
              </CardTitle>
              <CardDescription className="leading-relaxed text-muted-foreground/84">
                {lane.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground/84">
                {lane.examples.map((example) => (
                  <li
                    key={example}
                    className="rounded-2xl border border-border/45 bg-background/45 px-3 py-3"
                  >
                    {example}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/45 bg-card/90 shadow-none">
        <CardHeader className="gap-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/72">
            <Radar className="h-3.5 w-3.5" />
            Chart Surface Map
          </div>
          <CardTitle className="text-[1.2rem] tracking-[-0.03em]">
            Shortlists should cover Trakzi’s real chart surfaces, not one narrow
            pocket of the app.
          </CardTitle>
          <CardDescription className="max-w-[72ch] leading-relaxed text-muted-foreground/84">
            These are the target domains the chart workflow is designed to
            balance before anything is promoted into `To Be Implemented`.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {CHART_LAB_SURFACE_GROUPS.map((group) => (
            <div
              key={group.title}
              className="rounded-[1.4rem] border border-border/45 bg-background/40 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-lg font-semibold tracking-[-0.03em]">
                  {group.title}
                </h4>
                <div className="rounded-full border border-border/45 bg-background/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {group.accent}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.pages.map((page) => (
                  <div
                    key={page}
                    className="rounded-full border border-border/45 bg-card/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    {page}
                  </div>
                ))}
              </div>
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground/84">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-border/45 bg-card/70 px-3 py-3"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/45 bg-card/90 shadow-none">
        <CardHeader className="gap-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/72">
            <ListChecks className="h-3.5 w-3.5" />
            Workflow Docs
          </div>
          <CardTitle className="text-[1.2rem] tracking-[-0.03em]">
            These docs now define the chart queue more explicitly than before.
          </CardTitle>
          <CardDescription className="leading-relaxed text-muted-foreground/84">
            The chart lab is no longer only a visual queue. It now points
            directly at the prompts and memory files used to keep chart ideation
            strict.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 xl:grid-cols-2">
          {CHART_LAB_WORKFLOW_DOCS.map((doc) => (
            <div
              key={doc.path}
              className="rounded-2xl border border-border/45 bg-background/45 px-4 py-4"
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/68">
                {doc.title}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground/84">
                {doc.description}
              </p>
              <div className="mt-3 rounded-xl border border-border/45 bg-card/80 px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground/78">
                {doc.path}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/45 bg-card/90 shadow-none">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/72">
                <Layers3 className="h-3.5 w-3.5" />
                Step 1
              </div>
              <CardTitle className="text-[1.2rem] tracking-[-0.03em]">
                Generate the chart batch
              </CardTitle>
              <CardDescription className="max-w-[72ch] leading-relaxed text-muted-foreground/84">
                Start with the full one-click chart workflow. This covers
                generation, review, scoring, selection, and visible shortlist
                materialization in `/testCharts`.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              onClick={() => handleCopyPrompt("generation")}
            >
              {copiedPrompt === "generation" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copiedPrompt === "generation"
                ? "Copied"
                : "Copy generation prompt"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-2">
            <div className="rounded-2xl border border-border/45 bg-background/45 px-4 py-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/68">
                Approved memory path
              </div>
              <div className="mt-2 font-mono text-[11px] leading-relaxed text-muted-foreground/78">
                {CHART_LAB_APPROVED_MEMORY_PATH}
              </div>
            </div>
            <div className="rounded-2xl border border-border/45 bg-background/45 px-4 py-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/68">
                Rejected memory path
              </div>
              <div className="mt-2 font-mono text-[11px] leading-relaxed text-muted-foreground/78">
                {CHART_LAB_REJECTED_MEMORY_PATH}
              </div>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-border/45 bg-background/45 p-4">
            <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-muted-foreground/84">
              {generationPrompt}
            </pre>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {CHART_LAB_OUTPUT_RULES.map((rule) => (
              <div
                key={rule}
                className="rounded-2xl border border-border/45 bg-card/75 px-4 py-4 text-sm leading-relaxed text-muted-foreground/84"
              >
                {rule}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/45 bg-card/90 shadow-none">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/72">
                <Layers3 className="h-3.5 w-3.5" />
                Step 2
              </div>
              <CardTitle className="text-[1.2rem] tracking-[-0.03em]">
                Resolve the shortlist after you pick favorites
              </CardTitle>
              <CardDescription className="max-w-[72ch] leading-relaxed text-muted-foreground/84">
                Use this second prompt after review to keep the charts you want,
                reject the rest, and sync `To Be Implemented`, approved memory,
                rejected memory, and the visible `/testCharts` queue.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              onClick={() => handleCopyPrompt("resolution")}
            >
              {copiedPrompt === "resolution" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copiedPrompt === "resolution" ? "Copied" : "Copy cleanup prompt"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-2">
            <div className="rounded-2xl border border-border/45 bg-background/45 px-4 py-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/68">
                Resolution prompt path
              </div>
              <div className="mt-2 font-mono text-[11px] leading-relaxed text-muted-foreground/78">
                {CHART_LAB_RESOLUTION_PROMPT_PATH}
              </div>
            </div>
            <div className="rounded-2xl border border-border/45 bg-background/45 px-4 py-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/68">
                Queue effect
              </div>
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground/84">
                Keeps only chosen charts, moves survivors to implementation, and
                updates approved and rejected memory.
              </div>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-border/45 bg-background/45 p-4">
            <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-muted-foreground/84">
              {resolutionPrompt}
            </pre>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export function TestChartsIdeaPlayground({
  generationPrompt,
  resolutionPrompt,
}: TestChartsIdeaPlaygroundProps) {
  const [bundle, setBundle] = useState<IdeaLabBundleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("review");
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    const storedMode = window.localStorage.getItem(CHART_VIEW_STORAGE_KEY);

    if (
      storedMode === "review" ||
      storedMode === "approved" ||
      storedMode === "prompt"
    ) {
      setViewMode(storedMode);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadBundle() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/test-charts/idea-lab", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load one-click chart batch data");
        }

        const json = (await response.json()) as IdeaLabBundleResponse;

        if (isActive) {
          setBundle(json);
          setError(null);
        }
      } catch (fetchError) {
        if (isActive) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load chart batch",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadBundle();

    return () => {
      isActive = false;
    };
  }, []);

  const reviewSection = useMemo<{
    title: string;
    description: string;
    accent: string;
    count: number;
    groups: ReturnType<typeof adaptLegacyApprovedCards>;
    leadTitle: string | null;
  } | null>(() => {
    if (!bundle) return null;

    const activeManifest = Array.isArray(bundle.manifest)
      ? bundle.manifest.slice(0, 20)
      : [];
    if (!activeManifest.length) return null;

    const reviewSections = buildInsightPlaygroundSections(
      {
        ...bundle,
        manifest: activeManifest,
      },
      { formatCurrency },
    );

    const reviewGroups = reviewSections.flatMap((section) =>
      section.groups.map((group) => ({
        ...group,
        cards: group.cards.map((card) =>
          withSeededMockReviewCard(
            card,
            inferCardSectionId(card.domain),
            formatCurrency,
          ),
        ),
      })),
    );

    const reviewCount = reviewGroups.reduce(
      (total, group) => total + group.cards.length,
      0,
    );
    const leadTitle =
      reviewGroups.flatMap((group) => group.cards)[0]?.title ?? null;

    return {
      title: "To Be Approved",
      description:
        "The review queue contains the current shortlisted charts waiting for approval before they move into the implementation backlog.",
      accent: `${reviewCount} charts in review`,
      count: reviewCount,
      groups: reviewGroups,
      leadTitle,
    };
  }, [bundle, formatCurrency]);

  const approvedSection = useMemo<{
    id: "approved";
    title: string;
    description: string;
    accent: string;
    count: number;
    groups: ReturnType<typeof adaptLegacyApprovedCards>;
  } | null>(() => {
    if (!bundle) return null;

    const approvedManifest =
      Array.isArray(bundle.approvedManifest) &&
      bundle.approvedManifest.length > 0
        ? bundle.approvedManifest
        : [];

    const legacyGroups = adaptLegacyApprovedCards(bundle, formatCurrency);
    const selectedGroups = buildApprovedOneClickGroups(
      {
        ...bundle,
        manifest: approvedManifest,
      },
      { formatCurrency },
    );

    const approvedGroups = [...legacyGroups, ...selectedGroups].map(
      (group) => ({
        ...group,
        cards: group.cards.map((card) =>
          withSeededMockReviewCard(
            card,
            inferCardSectionId(card.domain),
            formatCurrency,
          ),
        ),
      }),
    );

    const approvedCount = approvedGroups.reduce(
      (total, group) => total + group.cards.length,
      0,
    );

    return {
      id: "approved",
      title: "To Be Implemented",
      description:
        "Approved charts stay in their own queue, separate from the live review surface, and remain available as clone-spec implementation candidates with seeded mock data.",
      accent: `${approvedCount} charts ready to implement`,
      count: approvedCount,
      groups: approvedGroups,
    };
  }, [bundle, formatCurrency]);

  const approvedCount = approvedSection?.count ?? 0;
  const reviewCount = reviewSection?.count ?? 0;
  const visibleCount =
    viewMode === "review"
      ? reviewCount
      : viewMode === "approved"
        ? approvedCount
        : CHART_LAB_WORKFLOW_DOCS.length;

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    window.localStorage.setItem(CHART_VIEW_STORAGE_KEY, mode);
  }

  if (isLoading) {
    return <PlaygroundSkeleton />;
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
              {error ??
                "The implementation batch could not be generated from the current bundle."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
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
                Review, implementation, and workflow discipline
              </CardTitle>
              <CardDescription className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground/82">
                The chart side now exposes the shortlist queue, implementation
                backlog, and the prompts and memory that keep chart ideation
                strict.
              </CardDescription>
            </div>
            <div className="inline-flex w-full rounded-full border border-border/50 bg-background/70 p-1 lg:w-auto">
              <Button
                size="sm"
                variant={viewMode === "review" ? "secondary" : "ghost"}
                className="flex-1 rounded-full shadow-none lg:flex-none"
                onClick={() => handleViewModeChange("review")}
              >
                To Be Approved
              </Button>
              <Button
                size="sm"
                variant={viewMode === "approved" ? "secondary" : "ghost"}
                className="flex-1 rounded-full shadow-none lg:flex-none"
                onClick={() => handleViewModeChange("approved")}
              >
                To Be Implemented
              </Button>
              <Button
                size="sm"
                variant={viewMode === "prompt" ? "secondary" : "ghost"}
                className="flex-1 rounded-full shadow-none lg:flex-none"
                onClick={() => handleViewModeChange("prompt")}
              >
                Prompt Walkthrough
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground/78">
            <div>
              <span className="font-medium text-foreground">{reviewCount}</span>{" "}
              in review
            </div>
            <div>
              <span className="font-medium text-foreground">
                {approvedCount}
              </span>{" "}
              to implement
            </div>
            <div>
              <span className="font-medium text-foreground">
                {CHART_LAB_WORKFLOW_DOCS.length}
              </span>{" "}
              workflow docs
            </div>
            <div>
              <span className="font-medium text-foreground">
                {visibleCount}
              </span>{" "}
              visible
            </div>
            <div>
              Lead:{" "}
              <span className="font-medium text-foreground">
                {reviewSection?.leadTitle ?? "Awaiting next shortlist"}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {viewMode === "review" ? (
        <section id="to-be-approved" className="space-y-6">
          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/72">
              To Be Approved
            </div>
            <h3 className="text-[1.3rem] font-semibold tracking-[-0.04em]">
              {reviewSection
                ? "The live shortlist is separated from implementation work."
                : "No live review cards right now."}
            </h3>
            <p className="max-w-[70ch] text-sm leading-relaxed text-muted-foreground/82">
              {reviewSection
                ? reviewSection.description
                : "The latest shortlist has already been resolved. Approved survivors now live in `To Be Implemented`, and discarded survivors belong in rejected memory so they do not drift back unchanged."}
            </p>
          </div>
          {reviewSection ? (
            reviewSection.groups.map((group) => (
              <div key={group.id} id={group.id} className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold tracking-[-0.03em]">
                      {group.title}
                    </h4>
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
                    <div
                      key={card.id}
                      className={getChartGridSpanClassName(card)}
                    >
                      {renderImplementedChartCard(card)}
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[1.2rem] border border-dashed border-border/50 bg-background/35 px-5 py-10 text-center">
                <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground/72">
                  Review queue empty
                </div>
                <p className="mx-auto mt-3 max-w-[50ch] text-sm leading-relaxed text-muted-foreground/88">
                  Open a new ranked shortlist when you want another review
                  round. The workflow docs are now visible in the prompt
                  walkthrough so that next round can follow the same gate logic.
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-border/45 bg-background/40 px-5 py-6">
                <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground/72">
                  Memory discipline
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground/84">
                  Approved survivors move into `To Be Implemented`. Discarded
                  survivors should be recorded in rejected memory and revisited
                  only if materially upgraded.
                </p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-border/45 bg-card/80 px-3 py-3 font-mono text-[11px] leading-relaxed text-muted-foreground/78">
                    {CHART_LAB_APPROVED_MEMORY_PATH}
                  </div>
                  <div className="rounded-xl border border-border/45 bg-card/80 px-3 py-3 font-mono text-[11px] leading-relaxed text-muted-foreground/78">
                    {CHART_LAB_REJECTED_MEMORY_PATH}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {viewMode === "approved" && approvedSection ? (
        <section id="to-be-implemented" className="space-y-6">
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
              Approved charts live in their own implementation queue.
            </h3>
            <p className="max-w-[64ch] text-sm leading-relaxed text-muted-foreground/82">
              {approvedSection.description}
            </p>
          </div>

          {approvedSection.groups.map((group) => (
            <div key={group.id} id={group.id} className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h4 className="text-lg font-semibold tracking-[-0.03em]">
                    {group.title}
                  </h4>
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
                  <div
                    key={card.id}
                    className={getChartGridSpanClassName(card)}
                  >
                    {renderImplementedChartCard(card)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {viewMode === "prompt" ? (
        <ChartPromptWalkthrough
          generationPrompt={generationPrompt}
          resolutionPrompt={resolutionPrompt}
          reviewCount={reviewCount}
          approvedCount={approvedCount}
        />
      ) : null}
    </div>
  );
}
