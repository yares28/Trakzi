"use client";

import { useEffect, useMemo, useState, memo } from "react";
import { useTheme } from "next-themes";
import { ResponsivePie } from "@nivo/pie";
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button";

import {
  ChartInfoPopover,
  ChartInfoPopoverCategoryControls,
} from "@/components/chart-info-popover";
import { NeedsWantsCategoryEditor } from "@/components/needs-wants-category-editor";
import { useColorScheme } from "@/components/color-scheme-provider";
import { useCurrency } from "@/components/currency-provider";
import { toNumericValue } from "@/lib/utils";
import { ChartLoadingState } from "@/components/chart-loading-state";
import { NivoChartTooltip } from "@/components/chart-tooltip";
import { getContrastTextColor, getChartTextColor } from "@/lib/chart-colors";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartFavoriteButton } from "@/components/chart-favorite-button";
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle";
import { ChartExpandButton } from "@/components/chart-expand-button";
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal";

interface ChartNeedsWantsPieProps {
  data?: Array<{
    id: string;
    label: string;
    value: number;
  }>;
  categoryControls?: ChartInfoPopoverCategoryControls;
  // These props are passed by the draggable analytics layout but sizing is handled outside this component.
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export const ChartNeedsWantsPie = memo(function ChartNeedsWantsPie({
  data: baseData = [],
  categoryControls,
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: ChartNeedsWantsPieProps) {
  const { resolvedTheme } = useTheme();
  const { colorScheme, getShuffledPalette } = useColorScheme();
  const { formatCurrency } = useCurrency();
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const sanitizedBaseData = useMemo(
    () =>
      baseData.map((item) => ({
        ...item,
        value: toNumericValue(item.value),
      })),
    [baseData],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // We only ever have up to 3 slices (Essentials, Mandatory, Wants)
  // Assign colors from the current palette, using darker colors for larger values.
  const dataWithColors = useMemo(() => {
    const palette = getShuffledPalette();
    const sorted = [...sanitizedBaseData].sort((a, b) => b.value - a.value);
    const colors = palette.slice(0, Math.max(sorted.length, 3));

    return sorted.map((item, index) => ({
      ...item,
      color: colors[index % colors.length],
    }));
  }, [sanitizedBaseData, getShuffledPalette]);

  const data = dataWithColors;

  const total = useMemo(() => {
    return sanitizedBaseData.reduce((sum, item) => sum + item.value, 0);
  }, [sanitizedBaseData]);

  const colorConfig = { datum: "data.color" as const };

  const isDark = resolvedTheme === "dark";

  const textColor = getChartTextColor(isDark);

  // Format currency value using user's preferred currency
  const valueFormatter = useMemo(
    () => ({
      format: (value: number) => formatCurrency(value),
    }),
    [formatCurrency],
  );

  const renderInfoTrigger = () => (
    <div className="flex items-center gap-2">
      <ChartInfoPopover
        title="Needs vs Wants"
        description="Groups your spending into essentials, mandatory obligations, and discretionary wants."
        details={[
          "Essentials include day-to-day living costs like groceries, housing, core utilities, and basic transport.",
          "Mandatory covers recurring obligations such as insurance, taxes and similar non‑negotiable commitments.",
          "Wants capture lifestyle and discretionary categories like shopping, entertainment, and travel.",
        ]}
        ignoredFootnote="Only expense (negative) transactions are included, and hidden categories are excluded from the totals."
        categoryControls={categoryControls}
        topContent={legendContent}
        extraContent={<NeedsWantsCategoryEditor />}
      />
      <ChartAiInsightButton
        chartId="needsWantsBreakdown"
        chartTitle="Needs vs Wants Breakdown"
        chartDescription="Groups your spending into essentials, mandatory obligations, and discretionary wants."
        chartData={{
          total: total,
          categories: data.map((d) => ({ name: d.label, amount: d.value })),
          needsAmount:
            data.find(
              (d) =>
                d.label.toLowerCase().includes("essential") ||
                d.label.toLowerCase().includes("mandatory"),
            )?.value || 0,
          wantsAmount:
            data.find((d) => d.label.toLowerCase().includes("want"))?.value ||
            0,
        }}
        size="sm"
      />
    </div>
  );

  const frugalityScore = useMemo(() => {
    const wants = data
      .filter((d) => d.label.toLowerCase().includes("want"))
      .reduce((s, d) => s + d.value, 0);
    if (total === 0) return null;
    const wantsPct = (wants / total) * 100;
    return Math.max(0, Math.min(100, Math.round(100 - wantsPct)));
  }, [data, total]);

  // Render chart function for reuse
  const renderChart = (isCompact = false) => (
    <ResponsivePie
      data={data}
      margin={
        isCompact
          ? { top: 0, right: 0, bottom: 0, left: 0 }
          : { top: 40, right: 40, bottom: 40, left: 40 }
      }
      innerRadius={0.5}
      padAngle={0.6}
      cornerRadius={2}
      activeOuterRadiusOffset={8}
      enableArcLinkLabels={false}
      arcLabelsSkipAngle={15}
      arcLabelsTextColor={(d: { color: string }) =>
        getContrastTextColor(d.color)
      }
      valueFormat={(value) => formatCurrency(toNumericValue(value))}
      colors={colorConfig}
      tooltip={({ datum }) => {
        const percentage = total > 0 ? (Number(datum.value) / total) * 100 : 0;
        return (
          <NivoChartTooltip
            title={datum.label as string}
            titleColor={datum.color as string}
            value={valueFormatter.format(Number(datum.value))}
            subValue={`${percentage.toFixed(1)}%`}
          />
        );
      }}
      theme={{ text: { fill: textColor, fontSize: 12 } }}
    />
  );

  // Legend shown inside the info popover at the top
  const legendContent = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-2">
      {data.map((item) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs font-medium text-foreground">{item.label}</span>
          <span className="text-[0.7rem] text-muted-foreground">
            {total > 0 ? `${((item.value / total) * 100).toFixed(0)}%` : "0%"}
          </span>
        </div>
      ))}
    </div>
  );

  if (!mounted) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="needsWantsBreakdown"
              chartTitle="Needs vs Wants"
              size="md"
            />
            <CardTitle>Needs vs Wants</CardTitle>
          </div>
          </CardHeader>
        <CardContent className="flex-1 min-h-0">
          <div className="h-full w-full min-h-[180px] md:min-h-[250px]" />
        </CardContent>
        <CardFooter className="pb-3 gap-2">{renderInfoTrigger()}</CardFooter>
      </Card>
    );
  }

  if (!sanitizedBaseData || sanitizedBaseData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="needsWantsBreakdown"
              chartTitle="Needs vs Wants"
              size="md"
            />
            <CardTitle>Needs vs Wants</CardTitle>
          </div>
          </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
          <div className="h-full w-full min-h-[180px] md:min-h-[250px]">
            <ChartLoadingState
              isLoading={isLoading}
              skeletonType="pie"
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
            />
          </div>
        </CardContent>
        <CardFooter className="pb-3 gap-2">{renderInfoTrigger()}</CardFooter>
      </Card>
    );
  }

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Needs vs Wants"
        description="Essentials, mandatory, and discretionary spending"
        headerActions={renderInfoTrigger()}
        orientation="portrait"
      >
        <div className="h-full w-full min-h-[400px]" key={colorScheme}>
          {renderChart()}
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card">
        {/* Compact header on mobile: pull up into card's gap-6 */}
        <CardHeader className="px-3 py-0 -mt-3 sm:px-6 sm:mt-0 sm:py-0">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="needsWantsBreakdown"
              chartTitle="Needs vs Wants"
              size="md"
            />
            <CardTitle className="text-sm sm:text-base">Needs vs Wants</CardTitle>
          </div>
        </CardHeader>
        {/* Pull content up on mobile to reclaim gap-6 space */}
        <CardContent className="px-2 pt-0 sm:px-6 sm:pt-2 flex-1 min-h-0 flex flex-col pb-0 -mt-4 sm:mt-0">
          <div
            className="relative flex-1 min-h-[240px] md:min-h-[200px]"
            key={colorScheme}
          >
            {renderChart(true)}
            {frugalityScore !== null && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl @sm/card:text-3xl @md/card:text-4xl @lg/card:text-5xl font-bold text-foreground leading-none">
                  {frugalityScore}
                </span>
                <span className="text-[0.65rem] @sm/card:text-xs @md/card:text-sm font-medium text-muted-foreground mt-0.5">
                  Frugality Score
                </span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="pb-2 pt-0 px-3 sm:px-6 sm:pb-3 -mb-2 sm:mb-0 gap-2">
          {renderInfoTrigger()}
        </CardFooter>
      </Card>
    </>
  );
});

ChartNeedsWantsPie.displayName = "ChartNeedsWantsPie";
