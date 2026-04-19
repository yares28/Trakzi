"use client";

import { useMemo, useCallback, useState, memo } from "react";
import { useTheme } from "next-themes";
import { ResponsiveBar } from "@nivo/bar";
import {
  ChartInfoPopover,
  ChartInfoPopoverCategoryControls,
} from "@/components/chart-info-popover";
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button";
import { ChartLoadingState } from "@/components/chart-loading-state";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartFavoriteButton } from "@/components/chart-favorite-button";
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle";
import { useColorScheme } from "@/components/color-scheme-provider";
import { useCurrency } from "@/components/currency-provider";
import {
  getChartTextColor,
  getChartAxisLineColor,
  DEFAULT_FALLBACK_PALETTE,
} from "@/lib/chart-colors";
import { NivoChartTooltip } from "@/components/chart-tooltip";
import { HoverableBar } from "@/components/chart-hoverable-bar";
import { useChartCategoryVisibility } from "@/hooks/use-chart-category-visibility";
import { ChartExpandButton } from "@/components/chart-expand-button";
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal";

interface ChartDayOfWeekSpendingProps {
  data?: Array<{
    id: number;
    date: string;
    description: string;
    amount: number;
    balance: number | null;
    category: string;
  }>;
  dayOfWeekCategoryData?: Array<{
    dayOfWeek: number;
    category: string;
    total: number;
  }>;
  categoryControls?: ChartInfoPopoverCategoryControls;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

// Week starts on Monday (ISO 8601 standard)
const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const dayNamesShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const ChartDayOfWeekSpending = memo(function ChartDayOfWeekSpending({
  data = [],
  dayOfWeekCategoryData,
  categoryControls: propCategoryControls,
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: ChartDayOfWeekSpendingProps) {
  const { resolvedTheme } = useTheme();
  const { getShuffledPalette, colorScheme } = useColorScheme();
  const { formatCurrency } = useCurrency();
  const palette = useMemo(() => getShuffledPalette(), [getShuffledPalette]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const normalizeCategoryName = useCallback((value?: string | null) => {
    const trimmed = (value ?? "").trim();
    return trimmed || "Other";
  }, []);

  const chartVisibility = useChartCategoryVisibility({
    chartId: "analytics:day-of-week-spending",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  });

  const { hiddenCategorySet, buildCategoryControls, hiddenCategories } =
    chartVisibility;

  const renderInfoTrigger = () => (
    <div className="flex items-center gap-2">
      <ChartInfoPopover
        title="Day of Week Spending by Category"
        description="See which categories you spend the most on each day of the week."
        details={[
          "This chart shows your spending broken down by category for each day of the week.",
          "Each day has multiple bars, one for each spending category.",
          "Only expense transactions (negative amounts) are included.",
          "The chart respects your selected time period filter.",
        ]}
        categoryControls={categoryControls}
      />
      <ChartAiInsightButton
        chartId="dayOfWeekCategory"
        chartTitle="Day of Week Spending by Category"
        chartDescription="See which categories you spend the most on each day of the week."
        size="sm"
      />
    </div>
  );

  // Process data to group by day of week and category
  const processedData = useMemo(() => {
    if (dayOfWeekCategoryData && dayOfWeekCategoryData.length > 0) {
      const dayNamesLocal = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return dayOfWeekCategoryData
        .filter((d) => !hiddenCategories.includes(d.category))
        .map((d) => ({
          day: d.dayOfWeek,
          dayName: dayNamesLocal[d.dayOfWeek] || "Mon",
          category: d.category,
          amount: d.total,
        }));
    }

    if (!data || data.length === 0) {
      return [];
    }

    const grouped = new Map<number, Map<string, number>>();

    dayNames.forEach((_, dayIndex) => {
      grouped.set(dayIndex, new Map<string, number>());
    });

    data.forEach((tx) => {
      const amount = Number(tx.amount) || 0;
      if (amount < 0) {
        const date = new Date(tx.date);
        const dayOfWeek = (date.getDay() + 6) % 7;
        const category = normalizeCategoryName(tx.category);

        if (hiddenCategories.includes(category)) {
          return;
        }

        const dayMap = grouped.get(dayOfWeek);
        if (dayMap) {
          const currentTotal = dayMap.get(category) || 0;
          dayMap.set(category, currentTotal + Math.abs(amount));
        }
      }
    });

    const flatData: Array<{
      day: number;
      dayName: string;
      category: string;
      amount: number;
    }> = [];
    grouped.forEach((categoryMap, dayIndex) => {
      categoryMap.forEach((amount, category) => {
        if (amount > 0) {
          flatData.push({
            day: dayIndex,
            dayName: dayNamesShort[dayIndex],
            category,
            amount,
          });
        }
      });
    });

    return flatData;
  }, [dayOfWeekCategoryData, data, hiddenCategories, normalizeCategoryName]);

  // Get all unique categories (including hidden ones for the controls)
  const allCategories = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }
    const categorySet = new Set<string>();
    data.forEach((tx) => {
      const amount = Number(tx.amount) || 0;
      if (amount < 0) {
        const category = normalizeCategoryName(tx.category);
        categorySet.add(category);
      }
    });
    return Array.from(categorySet).sort();
  }, [data, normalizeCategoryName]);

  // Get visible categories (for rendering)
  const categories: string[] = useMemo(() => {
    // Sort by max value in any single day so the dominant category
    // in its peak day sits at the top of the stack.
    const maxPerCategory = new Map<string, number>();
    processedData.forEach((d) => {
      const current = maxPerCategory.get(d.category) ?? 0;
      maxPerCategory.set(d.category, Math.max(current, d.amount));
    });

    return Array.from(maxPerCategory.entries())
      .filter(([, max]) => max > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([category]) => category);
  }, [processedData]);

  // Build category controls
  const categoryControls = useMemo(() => {
    return buildCategoryControls(allCategories);
  }, [buildCategoryControls, allCategories, hiddenCategories]);

  // Create color scale for categories
  const categoryColors = useMemo(() => {
    const colorMap = new Map<string, string>();
    const fallback = DEFAULT_FALLBACK_PALETTE;
    categories.forEach((category, index) => {
      colorMap.set(
        category,
        palette[index % palette.length] || fallback[index % fallback.length],
      );
    });
    return colorMap;
  }, [categories, palette]);

  const isDark = resolvedTheme === "dark";
  const textColor = getChartTextColor(isDark);
  const axisLineColor = getChartAxisLineColor(isDark);

  // Positional keys: each day sorts its categories descending (biggest → base),
  // then assigns pos_0, pos_1, … so every bar independently places its largest
  // category at the bottom regardless of other days.
  const { posKeys, nivoData, positionLookup } = useMemo(() => {
    let maxCount = 0;
    const daySorted = dayNamesShort.map((dayName, dayIndex) => {
      const sorted = processedData
        .filter((d) => d.day === dayIndex)
        .sort((a, b) => b.amount - a.amount);
      maxCount = Math.max(maxCount, sorted.length);
      return { dayName, sorted };
    });

    const keys = Array.from({ length: maxCount }, (_, i) => `pos_${i}`);
    const lookup = new Map<string, { category: string; color: string }>();

    const data = daySorted.map(({ dayName, sorted }) => {
      const row: Record<string, number | string> = { day: dayName };
      sorted.forEach((item, i) => {
        row[`pos_${i}`] = item.amount;
        lookup.set(`${dayName}_pos_${i}`, {
          category: item.category,
          color: categoryColors.get(item.category) ?? palette[i % palette.length],
        });
      });
      return row;
    });

    return { posKeys: keys, nivoData: data, positionLookup: lookup };
  }, [processedData, categoryColors, palette]);

  const renderChart = () => (
    <ResponsiveBar
      data={nivoData}
      keys={posKeys}
      indexBy="day"
      groupMode="stacked"
      margin={{ top: 16, right: 16, bottom: 40, left: 60 }}
      padding={0.3}
      colors={({ id, indexValue }) =>
        positionLookup.get(`${String(indexValue)}_${String(id)}`)?.color ?? palette[0]
      }
      borderRadius={4}
      enableLabel={false}
      axisBottom={{ tickSize: 0, tickPadding: 8 }}
      axisLeft={{
        tickSize: 0,
        tickPadding: 8,
        format: (v) => formatCurrency(v as number, { maximumFractionDigits: 0 }),
      }}
      enableGridY={true}
      gridYValues={5}
      theme={{
        text: { fill: textColor, fontSize: 11 },
        axis: {
          ticks: { text: { fill: textColor } },
          domain: { line: { stroke: axisLineColor } },
        },
        grid: {
          line: {
            stroke: axisLineColor,
            strokeWidth: 0.5,
            strokeDasharray: "3,3",
          },
        },
      }}
      tooltip={({ id, value, indexValue, color }) => {
        const info = positionLookup.get(`${String(indexValue)}_${String(id)}`);
        return (
          <NivoChartTooltip
            title={`${indexValue} — ${info?.category ?? String(id)}`}
            titleColor={info?.color ?? color}
            value={formatCurrency(value as number)}
          />
        );
      }}
      animate={true}
      motionConfig="gentle"
      barComponent={HoverableBar}
    />
  );

  if (!data || data.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="dayOfWeekSpending"
              chartTitle="Day of Week Spending by Category"
              size="md"
            />
            <CardTitle>Day of Week Spending by Category</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <ChartLoadingState
            isLoading={isLoading}
            skeletonType="bar"
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
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
        title="Day of Week Spending by Category"
        description="See which categories you spend the most on each day"
        headerActions={renderInfoTrigger()}
      >
        <div className="h-full w-full min-h-[400px]" key={colorScheme}>
          {renderChart()}
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="dayOfWeekSpending"
              chartTitle="Day of Week Spending by Category"
              size="md"
            />
            <CardTitle>Day of Week Spending by Category</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px] flex flex-col">
          <div className="h-full w-full min-h-[210px]" key={colorScheme}>
            {renderChart()}
          </div>
          {categories.length > 0 && (
            <div className="px-4 pb-4 pt-2 flex flex-wrap items-center justify-center gap-3 text-xs">
              {categories.slice(0, 10).map((category) => (
                <div key={category} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        categoryColors.get(category) ||
                        DEFAULT_FALLBACK_PALETTE[0],
                    }}
                  />
                  <span className="text-muted-foreground">{category}</span>
                </div>
              ))}
              {categories.length > 10 && (
                <span className="text-muted-foreground">
                  +{categories.length - 10} more
                </span>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="pb-3 gap-2">{renderInfoTrigger()}</CardFooter>
      </Card>
    </>
  );
});

ChartDayOfWeekSpending.displayName = "ChartDayOfWeekSpending";
