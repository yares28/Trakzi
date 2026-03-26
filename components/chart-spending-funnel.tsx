"use client";

import { useState, useEffect, useMemo, memo } from "react";
import { useTheme } from "next-themes";
import { ResponsiveFunnel } from "@nivo/funnel";
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button";
import {
  ChartInfoPopover,
  ChartInfoPopoverCategoryControls,
} from "@/components/chart-info-popover";
import { useColorScheme } from "@/components/color-scheme-provider";
import { useCurrency } from "@/components/currency-provider";
import { toNumericValue } from "@/lib/utils";
import { ChartLoadingState } from "@/components/chart-loading-state";
import { NivoChartTooltip } from "@/components/chart-tooltip";
import { getContrastTextColor, getChartTextColor } from "@/lib/chart-colors";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartFavoriteButton } from "@/components/chart-favorite-button";
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle";
import { ChartExpandButton } from "@/components/chart-expand-button";
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal";
import { useIsMobile } from "@/hooks/use-mobile";
interface ChartSpendingFunnelProps {
  data?: Array<{
    id: string;
    value: number;
    label: string;
  }>;
  categoryControls?: ChartInfoPopoverCategoryControls;
  maxExpenseCategories?: number;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export const ChartSpendingFunnel = memo(function ChartSpendingFunnel({
  data = [],
  categoryControls,
  maxExpenseCategories = 2,
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: ChartSpendingFunnelProps) {
  const { resolvedTheme } = useTheme();
  const { getPalette } = useColorScheme();
  const { formatCurrency } = useCurrency();
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMobile = useIsMobile();
  const sanitizedData = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        value: toNumericValue(item.value),
      })),
    [data],
  );

  // Square-root normalised data for visual sizing only.
  // Large outliers (e.g. huge Savings values) would crush middle bands in a
  // linear funnel; sqrt compression keeps every band visible while preserving
  // relative ordering.  The original values are kept in sanitizedData and are
  // used for tooltips / labels.
  const displayData = useMemo(
    () =>
      sanitizedData.map((item) => ({
        ...item,
        value: Math.max(1, Math.sqrt(item.value)),
      })),
    [sanitizedData],
  );

  // Map from sqrt-display-value → original value, for label formatting.
  const sqrtToOriginal = useMemo(() => {
    const m = new Map<number, number>();
    sanitizedData.forEach((d) =>
      m.set(Math.max(1, Math.sqrt(d.value)), d.value),
    );
    return m;
  }, [sanitizedData]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";
  const textColor = getChartTextColor(isDark);

  // Use nivo scheme for colored, custom dark palette for dark styling
  // More money = darker color (bigger peso = darker)
  // Each layer is 2 shades lighter than the previous
  // Income ($5,430) = darkest, Savings ($800) = lightest
  // Max 7 layers
  // For all palettes: darker colors = larger amounts, lighter colors = smaller amounts
  const palette = getPalette();
  const numLayers = Math.min(data.length, 7);

  // Reverse palette so darkest colors are first (for highest income)
  // Income (largest) gets darkest color, Savings (smallest) gets lightest color
  // Start from position 2 (index 1) to use darker colors
  const reversedPalette = [...palette].reverse();
  // Create a palette without the first color (index 0) to use darker colors from position 2 onwards
  const darkerPalette = reversedPalette.slice(1);
  let colorConfig = darkerPalette.slice(0, numLayers);

  // If we need more colors than available, cycle through the darker palette
  while (colorConfig.length < numLayers) {
    colorConfig.push(...darkerPalette.slice(0, numLayers - colorConfig.length));
  }
  colorConfig = colorConfig.slice(0, numLayers);

  const renderInfoTrigger = (forFullscreen = false) => (
    <div
      className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}
    >
      <ChartInfoPopover
        title="Money Flow"
        description="This funnel shows how income cascades through major expense categories before landing in savings."
        details={[
          "Each layer represents a top expense category. Wider bands mean that category consumed more of your paycheck.",
          `The top ${maxExpenseCategories} categories by spending are shown individually, with all remaining categories grouped into 'Others'.`,
        ]}
        ignoredFootnote={`Only the top ${maxExpenseCategories} expense categories are shown individually. All other categories are aggregated into 'Others'.`}
        categoryControls={categoryControls}
      />
      <ChartAiInsightButton
        chartId="moneyFlow"
        chartTitle="Money Flow"
        chartDescription="This funnel shows how income cascades through major expense categories before landing in savings."
        chartData={{
          categories: sanitizedData.map((d) => ({
            name: d.label,
            amount: d.value,
          })),
          totalAmount: sanitizedData.reduce((sum, d) => sum + d.value, 0),
          topCategory: sanitizedData[0]?.label,
        }}
        size="sm"
      />
    </div>
  );

  // Shared tooltip renderer
  const funnelTooltip = ({
    part,
  }: {
    part: {
      data: { id: string; label?: string; value: number };
      color: string;
    };
  }) => {
    const original = sanitizedData.find((d) => d.id === part.data.id);
    const rawValue =
      original !== undefined ? original.value : Number(part.data.value);
    return (
      <NivoChartTooltip
        title={(part.data.label || part.data.id) as string}
        titleColor={part.color}
        value={formatCurrency(rawValue)}
      />
    );
  };

  // Render chart function for reuse — mobile uses tighter margins & no separators
  const renderChart = () =>
    isMobile ? (
      <ResponsiveFunnel
        data={displayData}
        margin={{ top: 8, right: 4, bottom: 8, left: 4 }}
        valueFormat={(v: number) =>
          formatCurrency(sqrtToOriginal.get(v) ?? v * v)
        }
        colors={colorConfig}
        borderWidth={12}
        labelColor={(d: { color: string }) => getContrastTextColor(d.color)}
        beforeSeparatorLength={0}
        beforeSeparatorOffset={8}
        afterSeparatorLength={0}
        afterSeparatorOffset={8}
        currentPartSizeExtension={4}
        currentBorderWidth={20}
        theme={{ text: { fill: textColor, fontSize: 10 } }}
        tooltip={funnelTooltip}
      />
    ) : (
      <ResponsiveFunnel
        data={displayData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        valueFormat={(v: number) =>
          formatCurrency(sqrtToOriginal.get(v) ?? v * v)
        }
        colors={colorConfig}
        borderWidth={20}
        labelColor={(d: { color: string }) => getContrastTextColor(d.color)}
        beforeSeparatorLength={100}
        beforeSeparatorOffset={20}
        afterSeparatorLength={100}
        afterSeparatorOffset={20}
        currentPartSizeExtension={10}
        currentBorderWidth={40}
        theme={{ text: { fill: textColor, fontSize: 12 } }}
        tooltip={funnelTooltip}
      />
    );

  if (!mounted) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="moneyFlow"
              chartTitle="Money Flow"
              size="md"
            />
            <CardTitle>Money Flow</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]" />
        </CardContent>
      </Card>
    );
  }

  // Don't render chart if data is empty
  if (!sanitizedData || sanitizedData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="moneyFlow"
              chartTitle="Money Flow"
              size="md"
            />
            <CardTitle>Money Flow</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]">
            <ChartLoadingState
              isLoading={isLoading}
              skeletonType="flow"
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Money Flow"
        description=""
        headerActions={renderInfoTrigger(true)}
        orientation="portrait"
      >
        <div className="h-full w-full min-h-[400px]">{renderChart()}</div>
      </ChartFullscreenModal>

      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="moneyFlow"
              chartTitle="Money Flow"
              size="md"
            />
            <CardTitle>Money Flow</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]">{renderChart()}</div>
        </CardContent>
      </Card>
    </>
  );
});

ChartSpendingFunnel.displayName = "ChartSpendingFunnel";
