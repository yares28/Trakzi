"use client";

import { useEffect, useState } from "react";
import { Lightbulb, LineChart, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { FeatureIdeaPlayground } from "./feature-idea-playground";
import { TestChartsIdeaPlayground } from "./idea-playground";

type TestLabSurfaceMode = "charts" | "features";

interface TestLabWorkbenchProps {
  chartPrompts: {
    generation: string;
    resolution: string;
  };
  featurePrompts: {
    generation: string;
    resolution: string;
  };
}

const SURFACE_STORAGE_KEY = "trakzi:test-lab-surface";

const SURFACE_COPY: Record<
  TestLabSurfaceMode,
  { title: string; description: string }
> = {
  charts: {
    title: "Chart review and implementation queues",
    description:
      "Use the chart side to review shortlist candidates, inspect the chart workflow, and keep approved implementation candidates separate from active review work.",
  },
  features: {
    title: "Feature ideation and testing surface",
    description:
      "Switch here when you want to think beyond charts, audit the current product surface, and prepare new feature experiments.",
  },
};

export function TestLabWorkbench({
  chartPrompts,
  featurePrompts,
}: TestLabWorkbenchProps) {
  const [surfaceMode, setSurfaceMode] = useState<TestLabSurfaceMode>("charts");

  useEffect(() => {
    const storedMode = window.localStorage.getItem(SURFACE_STORAGE_KEY);

    if (storedMode === "charts" || storedMode === "features") {
      setSurfaceMode(storedMode);
    }
  }, []);

  function handleSurfaceModeChange(mode: TestLabSurfaceMode) {
    setSurfaceMode(mode);
    window.localStorage.setItem(SURFACE_STORAGE_KEY, mode);
  }

  const activeCopy = SURFACE_COPY[surfaceMode];

  return (
    <div className="space-y-6">
      <Card className="border-border/45 bg-card/92 shadow-none">
        <CardHeader className="gap-5 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/72">
                <Sparkles className="h-3.5 w-3.5" />
                Test Lab
              </div>
              <CardTitle className="text-[1.5rem] leading-tight tracking-[-0.04em]">
                {activeCopy.title}
              </CardTitle>
              <CardDescription className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground/82">
                {activeCopy.description}
              </CardDescription>
            </div>
            <div className="inline-flex w-full rounded-full border border-border/50 bg-background/70 p-1 lg:w-auto">
              <Button
                type="button"
                size="sm"
                variant={surfaceMode === "charts" ? "secondary" : "ghost"}
                className={cn("flex-1 rounded-full shadow-none lg:flex-none")}
                onClick={() => handleSurfaceModeChange("charts")}
              >
                <LineChart className="h-4 w-4" />
                Charts
              </Button>
              <Button
                type="button"
                size="sm"
                variant={surfaceMode === "features" ? "secondary" : "ghost"}
                className={cn("flex-1 rounded-full shadow-none lg:flex-none")}
                onClick={() => handleSurfaceModeChange("features")}
              >
                <Lightbulb className="h-4 w-4" />
                Features
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {surfaceMode === "charts" ? (
        <TestChartsIdeaPlayground
          generationPrompt={chartPrompts.generation}
          resolutionPrompt={chartPrompts.resolution}
        />
      ) : null}
      {surfaceMode === "features" ? (
        <FeatureIdeaPlayground
          generationPrompt={featurePrompts.generation}
          resolutionPrompt={featurePrompts.resolution}
        />
      ) : null}
    </div>
  );
}
