"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Layers3,
  Sparkles,
  Waypoints,
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

import type {
  FeatureLabBundleResponse,
  FeatureManifestEntry,
} from "./feature-lab-content";
import {
  FEATURE_LAB_ACTIVE_SHORTLIST_PATH,
  FEATURE_LAB_APPROVED_MEMORY_PATH,
  FEATURE_LAB_CORE_PROMPT_PATH,
  FEATURE_LAB_ONE_CLICK_PROMPT_PATH,
  FEATURE_LAB_OUTPUT_RULES,
  FEATURE_LAB_PRODUCT_SURFACE_MEMORY_PATH,
  FEATURE_LAB_REJECTED_MEMORY_PATH,
  FEATURE_LAB_RESOLUTION_PROMPT_PATH,
  FEATURE_LAB_REVIEW_PROMPT_PATH,
  FEATURE_LAB_SCORING_PROMPT_PATH,
  FEATURE_LAB_STRATEGY_LANES,
  FEATURE_LAB_SURFACE_GROUPS,
} from "./feature-lab-content";

interface FeatureIdeaPlaygroundProps {
  generationPrompt: string;
  resolutionPrompt: string;
}

type FeatureViewMode = "review" | "approved" | "prompt";

const COPY_RESET_MS = 1800;
const FEATURE_VIEW_STORAGE_KEY = "trakzi:test-feature-lab-view";

const PRIMARY_SURFACE_META: Record<
  string,
  {
    accent: string;
    description: string;
  }
> = {
  Marketing: {
    accent: "Growth and activation",
    description:
      "Marketing, acquisition, and signup-adjacent ideas that improve the handoff into the real product.",
  },
  Capture: {
    accent: "Import and intake",
    description:
      "Features that improve statement, CSV, or receipt ingestion before users reach deeper product flows.",
  },
  Home: {
    accent: "Daily operations",
    description:
      "Home-surface ideas that help users decide what matters now and act on it faster.",
  },
  Dashboard: {
    accent: "Score and status",
    description:
      "Features that strengthen the AI dashboard summary and financial-health overview layer.",
  },
  Analytics: {
    accent: "Investigation and diagnosis",
    description:
      "Ideas that make analytics more actionable, guided, or strategically useful.",
  },
  Fridge: {
    accent: "Grocery intelligence",
    description:
      "Receipt-native grocery features that improve shopping discipline, cleanup, or insight quality.",
  },
  Savings: {
    accent: "Planning and resilience",
    description:
      "Savings, goals, debt, and recovery concepts that improve financial follow-through.",
  },
  Pockets: {
    accent: "Assets and reserves",
    description:
      "Travel, garage, property, and other-asset features that make pockets more operationally useful.",
  },
  Friends: {
    accent: "Comparison and coaching",
    description:
      "Social comparison features for rankings and friend-level understanding.",
  },
  Rooms: {
    accent: "Shared-expense operations",
    description:
      "Room-level workflows for attribution, settlement, and shared-money coordination.",
  },
  Challenges: {
    accent: "Competition and habits",
    description:
      "Challenge-group features that make competition more understandable, sticky, and useful.",
  },
  "AI Chat": {
    accent: "Assistant workflows",
    description:
      "Ideas that turn conversation into navigation, actions, or saved workflows.",
  },
  "Data Library": {
    accent: "Taxonomy and records",
    description:
      "Library-level controls that improve transaction, statement, and taxonomy quality.",
  },
  System: {
    accent: "Shared platform layer",
    description:
      "Cross-page features for onboarding, billing, limits, shortcuts, and other shared infrastructure.",
  },
};

function groupManifestBySurface(items: FeatureManifestEntry[]) {
  const grouped = new Map<string, FeatureManifestEntry[]>();

  for (const item of items) {
    const key = item.primarySurface || "Other";
    const current = grouped.get(key) ?? [];
    current.push(item);
    grouped.set(key, current);
  }

  return Array.from(grouped.entries()).map(([title, cards]) => {
    const surfaceMeta = PRIMARY_SURFACE_META[title];

    return {
      title,
      accent: surfaceMeta?.accent ?? "Feature surface",
      description:
        surfaceMeta?.description ??
        "Feature concepts grouped by the primary product surface they strengthen or extend.",
      cards,
    };
  });
}

function FeatureQueueCard({ item }: { item: FeatureManifestEntry }) {
  return (
    <Card className="border-border/45 bg-card/90 shadow-none">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/72">
            {item.primarySurface}
          </div>
          <div className="rounded-full border border-border/45 bg-background/65 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {item.featureType}
          </div>
          <div className="rounded-full border border-border/45 bg-background/65 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {item.difficulty}
          </div>
          <div className="rounded-full border border-border/45 bg-background/65 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {item.confidence} confidence
          </div>
        </div>
        <CardTitle className="text-xl tracking-[-0.03em]">
          {item.title}
        </CardTitle>
        <CardDescription className="leading-relaxed text-muted-foreground/84">
          {item.userProblemSolved}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground/84">
        <div className="rounded-2xl border border-border/45 bg-background/45 px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/68">
            What it does
          </div>
          <p className="mt-2 leading-relaxed">{item.whatItDoes}</p>
        </div>
        <div className="rounded-2xl border border-border/45 bg-background/45 px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/68">
            Why it matters
          </div>
          <p className="mt-2 leading-relaxed">{item.whyItMatters}</p>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          <div className="rounded-2xl border border-border/45 bg-background/45 px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/68">
              Existing surfaces used
            </div>
            <p className="mt-2 leading-relaxed">{item.existingSurfaces}</p>
          </div>
          <div className="rounded-2xl border border-border/45 bg-background/45 px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/68">
              MVP shape
            </div>
            <p className="mt-2 leading-relaxed">{item.mvpShape}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border/45 bg-background/45 px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/68">
            New data / infra needed
          </div>
          <p className="mt-2 leading-relaxed">{item.newDataInfraNeeded}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureQueueSection({
  title,
  description,
  accent,
  groups,
}: {
  title: string;
  description: string;
  accent: string;
  groups: ReturnType<typeof groupManifestBySurface>;
}) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/72">
            {title}
          </div>
          <div className="rounded-full border border-border/45 bg-background/65 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {accent}
          </div>
        </div>
        <p className="max-w-[70ch] text-sm leading-relaxed text-muted-foreground/82">
          {description}
        </p>
      </div>

      {groups.map((group) => (
        <div key={group.title} className="space-y-4">
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
              {group.cards.length} features
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {group.cards.map((item) => (
              <FeatureQueueCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function PromptWalkthrough({
  generationPrompt,
  resolutionPrompt,
}: {
  generationPrompt: string;
  resolutionPrompt: string;
}) {
  const [copiedPrompt, setCopiedPrompt] = useState<
    "generation" | "resolution" | null
  >(null);
  const totalSurfaceItems = FEATURE_LAB_SURFACE_GROUPS.reduce(
    (count, group) => count + group.items.length,
    0,
  );

  useEffect(() => {
    if (!copiedPrompt) return;

    const timeoutId = window.setTimeout(() => {
      setCopiedPrompt(null);
    }, COPY_RESET_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copiedPrompt]);

  async function handleCopyPrompt(kind: "generation" | "resolution") {
    await navigator.clipboard.writeText(
      kind === "generation" ? generationPrompt : resolutionPrompt,
    );
    setCopiedPrompt(kind);
  }

  return (
    <section className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-3">
        {FEATURE_LAB_STRATEGY_LANES.map((lane) => (
          <Card
            key={lane.title}
            className="border-border/45 bg-card/90 shadow-none"
          >
            <CardHeader className="gap-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/72">
                Strategy
              </div>
              <CardTitle className="text-xl tracking-[-0.03em]">
                {lane.title}
              </CardTitle>
              <CardDescription className="leading-relaxed text-muted-foreground/82">
                {lane.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground/82">
              {lane.examples.map((example) => (
                <div
                  key={example}
                  className="rounded-2xl border border-border/45 bg-background/45 px-3 py-2.5"
                >
                  {example}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/72">
            Current Product Surface
          </div>
          <h3 className="text-[1.3rem] font-semibold tracking-[-0.04em]">
            Whole-app feature ideation starts from the real Trakzi page map.
          </h3>
          <p className="max-w-[72ch] text-sm leading-relaxed text-muted-foreground/82">
            The new workflow explicitly covers acquisition pages, auth and
            transition pages, core app workspaces, detail pages, and system
            layers. The prompt should never drift back into “just a few core
            pages”.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {FEATURE_LAB_SURFACE_GROUPS.map((group) => (
            <Card
              key={group.title}
              className="border-border/45 bg-card/90 shadow-none"
            >
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/72">
                    {group.accent}
                  </div>
                  <div className="rounded-full border border-border/45 bg-background/65 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {group.pages.length} page paths
                  </div>
                  <div className="rounded-full border border-border/45 bg-background/65 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {group.items.length} feature clusters
                  </div>
                </div>
                <CardTitle className="text-lg tracking-[-0.03em]">
                  {group.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground/84">
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/68">
                    Pages
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.pages.map((page) => (
                      <div
                        key={page}
                        className="rounded-full border border-border/45 bg-background/45 px-2.5 py-1 font-mono text-[11px] text-foreground/88"
                      >
                        {page}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/68">
                    Core features
                  </div>
                  {group.items.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-border/45 bg-background/45 px-3 py-2.5"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
        <Card className="border-border/45 bg-card/92 shadow-none">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/72">
                  Step 1
                </div>
                <CardTitle className="mt-2 text-[1.2rem] tracking-[-0.04em]">
                  Generate the feature batch
                </CardTitle>
              </div>
              <Button
                type="button"
                variant={
                  copiedPrompt === "generation" ? "secondary" : "outline"
                }
                className="rounded-full"
                onClick={() => handleCopyPrompt("generation")}
              >
                {copiedPrompt === "generation" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copiedPrompt === "generation"
                  ? "Copied prompt"
                  : "Copy generation prompt"}
              </Button>
            </div>
            <CardDescription className="max-w-[72ch] leading-relaxed text-muted-foreground/82">
              This prompt now reads whole-app surface memory, approved and
              rejected feature memory, the shortlist review prompt, and the
              scoring rubric before it generates anything.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-[1.4rem] border border-border/45 bg-zinc-950/90 p-4 text-sm text-zinc-100 shadow-inner">
              <pre className="max-h-[42rem] overflow-auto whitespace-pre-wrap font-mono leading-6">
                {generationPrompt}
              </pre>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/45 bg-card/90 shadow-none">
            <CardHeader className="gap-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/72">
                Workflow Files
              </div>
              <CardTitle className="text-lg tracking-[-0.03em]">
                Source of truth
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed text-muted-foreground/82">
                The prompt walkthrough is now backed by explicit memory, review,
                scoring, and shortlist docs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground/84">
              {[
                FEATURE_LAB_PRODUCT_SURFACE_MEMORY_PATH,
                FEATURE_LAB_ONE_CLICK_PROMPT_PATH,
                FEATURE_LAB_RESOLUTION_PROMPT_PATH,
                FEATURE_LAB_CORE_PROMPT_PATH,
                FEATURE_LAB_ACTIVE_SHORTLIST_PATH,
                FEATURE_LAB_APPROVED_MEMORY_PATH,
                FEATURE_LAB_REJECTED_MEMORY_PATH,
                FEATURE_LAB_REVIEW_PROMPT_PATH,
                FEATURE_LAB_SCORING_PROMPT_PATH,
              ].map((filePath) => (
                <div
                  key={filePath}
                  className="rounded-2xl border border-border/45 bg-background/45 px-3 py-3"
                >
                  <div className="break-all font-mono text-[12px] leading-5 text-foreground/88">
                    {filePath}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/45 bg-card/90 shadow-none">
            <CardHeader className="gap-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/72">
                <Layers3 className="h-3.5 w-3.5" />
                Coverage
              </div>
              <CardTitle className="text-lg tracking-[-0.03em]">
                Whole-app memory
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[1.25rem] border border-border/50 bg-background/55 px-4 py-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/72">
                  <Layers3 className="h-3.5 w-3.5" />
                  Strategy lanes
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                  {FEATURE_LAB_STRATEGY_LANES.length}
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-border/50 bg-background/55 px-4 py-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/72">
                  <Waypoints className="h-3.5 w-3.5" />
                  Surface groups
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                  {FEATURE_LAB_SURFACE_GROUPS.length}
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-border/50 bg-background/55 px-4 py-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/72">
                  <Workflow className="h-3.5 w-3.5" />
                  Feature clusters
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                  {totalSurfaceItems}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/45 bg-card/90 shadow-none">
            <CardHeader className="gap-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/72">
                Output Rules
              </div>
              <CardTitle className="text-lg tracking-[-0.03em]">
                What good feature output looks like
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground/84">
              {FEATURE_LAB_OUTPUT_RULES.map((rule) => (
                <div
                  key={rule}
                  className="rounded-2xl border border-border/45 bg-background/45 px-3 py-2.5"
                >
                  {rule}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <Card className="border-border/45 bg-card/92 shadow-none">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/72">
                  Step 2
                </div>
                <CardTitle className="mt-2 text-[1.2rem] tracking-[-0.04em]">
                  Resolve the shortlist after you choose favorites
                </CardTitle>
              </div>
              <Button
                type="button"
                variant={
                  copiedPrompt === "resolution" ? "secondary" : "outline"
                }
                className="rounded-full"
                onClick={() => handleCopyPrompt("resolution")}
              >
                {copiedPrompt === "resolution" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copiedPrompt === "resolution"
                  ? "Copied prompt"
                  : "Copy cleanup prompt"}
              </Button>
            </div>
            <CardDescription className="max-w-[72ch] leading-relaxed text-muted-foreground/82">
              This second prompt keeps only the features you want, rejects the
              rest of the active shortlist, and syncs `To Be Implemented`,
              approved memory, rejected memory, and the visible feature queue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 xl:grid-cols-2">
              <div className="rounded-2xl border border-border/45 bg-background/45 px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/68">
                  Resolution prompt path
                </div>
                <div className="mt-2 break-all font-mono text-[12px] leading-5 text-foreground/88">
                  {FEATURE_LAB_RESOLUTION_PROMPT_PATH}
                </div>
              </div>
              <div className="rounded-2xl border border-border/45 bg-background/45 px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/68">
                  Queue effect
                </div>
                <div className="mt-2 text-sm leading-relaxed text-muted-foreground/84">
                  Promotes selected features into implementation memory and
                  removes the rejected rest from the visible shortlist.
                </div>
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-border/45 bg-zinc-950/90 p-4 text-sm text-zinc-100 shadow-inner">
              <pre className="max-h-[42rem] overflow-auto whitespace-pre-wrap font-mono leading-6">
                {resolutionPrompt}
              </pre>
            </div>
          </CardContent>
        </Card>
      </section>
    </section>
  );
}

export function FeatureIdeaPlayground({
  generationPrompt,
  resolutionPrompt,
}: FeatureIdeaPlaygroundProps) {
  const [bundle, setBundle] = useState<FeatureLabBundleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<FeatureViewMode>("review");

  useEffect(() => {
    const storedMode = window.localStorage.getItem(FEATURE_VIEW_STORAGE_KEY);

    if (
      storedMode === "review" ||
      storedMode === "approved" ||
      storedMode === "prompt"
    ) {
      setViewMode(storedMode);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(FEATURE_VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    let isActive = true;

    async function loadBundle() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/test-charts/feature-lab", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load feature idea lab data");
        }

        const json = (await response.json()) as FeatureLabBundleResponse;

        if (isActive) {
          setBundle(json);
          setError(null);
        }
      } catch (fetchError) {
        if (isActive) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load feature queue",
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

  const reviewGroups = useMemo(
    () => groupManifestBySurface(bundle?.manifest ?? []),
    [bundle],
  );
  const approvedGroups = useMemo(
    () => groupManifestBySurface(bundle?.approvedManifest ?? []),
    [bundle],
  );

  const reviewCount = bundle?.manifest.length ?? 0;
  const approvedCount = bundle?.approvedManifest.length ?? 0;
  const visibleCount =
    viewMode === "review"
      ? reviewCount
      : viewMode === "approved"
        ? approvedCount
        : 0;
  const leadTitle = bundle?.manifest[0]?.title ?? "None";

  if (isLoading) {
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
              {Array.from({ length: 2 }).map((__, inner) => (
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

  if (error || !bundle) {
    return (
      <div className="px-4 lg:px-6">
        <Card className="border-destructive/25 bg-card/90">
          <CardHeader>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Feature idea lab
            </div>
            <CardTitle>Feature queue unavailable</CardTitle>
            <CardDescription>
              {error ??
                "The feature ideation queue could not be generated from the current docs."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 lg:px-6">
      <Card className="border-border/45 bg-card/92 shadow-none">
        <CardHeader className="gap-5 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/72">
                <Sparkles className="h-3.5 w-3.5" />
                Test Features
              </div>
              <CardTitle className="text-[1.5rem] leading-tight tracking-[-0.04em]">
                Review, implementation, and prompt walkthrough
              </CardTitle>
              <CardDescription className="max-w-[62ch] text-sm leading-relaxed text-muted-foreground/82">
                Feature mode now has a real shortlist queue, an implementation
                queue, and a whole-app prompt walkthrough backed by
                source-of-truth memory docs.
              </CardDescription>
            </div>
            <div className="inline-flex w-full rounded-full border border-border/50 bg-background/70 p-1 lg:w-auto">
              <Button
                type="button"
                size="sm"
                variant={viewMode === "review" ? "secondary" : "ghost"}
                className="flex-1 rounded-full shadow-none lg:flex-none"
                onClick={() => setViewMode("review")}
              >
                To Be Approved
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "approved" ? "secondary" : "ghost"}
                className="flex-1 rounded-full shadow-none lg:flex-none"
                onClick={() => setViewMode("approved")}
              >
                To Be Implemented
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "prompt" ? "secondary" : "ghost"}
                className="flex-1 rounded-full shadow-none lg:flex-none"
                onClick={() => setViewMode("prompt")}
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
                {visibleCount}
              </span>{" "}
              visible
            </div>
            <div>
              Lead:{" "}
              <span className="font-medium text-foreground">{leadTitle}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {viewMode === "review" ? (
        <FeatureQueueSection
          title="To Be Approved"
          description="This active shortlist is the current review surface for full-app Trakzi feature ideas. The candidates intentionally cover major pages and systems instead of clustering around one narrow area."
          accent={`${reviewCount} feature candidates in review`}
          groups={reviewGroups}
        />
      ) : null}

      {viewMode === "approved" ? (
        <FeatureQueueSection
          title="To Be Implemented"
          description="Approved feature concepts live in a separate queue so implementation candidates are not mixed with raw ideation. These are the concepts the workflow should treat as already claimed."
          accent={`${approvedCount} approved feature concepts`}
          groups={approvedGroups}
        />
      ) : null}

      {viewMode === "prompt" ? (
        <PromptWalkthrough
          generationPrompt={generationPrompt}
          resolutionPrompt={resolutionPrompt}
        />
      ) : null}
    </div>
  );
}
