"use client";

import { useMemo, useCallback, useState, memo } from "react";
import { useTheme } from "next-themes";
import { ResponsiveBar } from "@nivo/bar";
import {
  ChartInfoPopover,
  ChartInfoPopoverCategoryControls,
} from "@/components/chart-info-popover";
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button";
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
import { ChartLoadingState } from "@/components/chart-loading-state";
import { ChartExpandButton } from "@/components/chart-expand-button";
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal";

interface ChartAllMonthsCategorySpendingProps {
  data?: Array<{
    id: number;
    date: string;
    description: string;
    amount: number;
    balance: number | null;
    category: string;
  }>;
  monthlyCategoriesData?: Array<{
    month: number | string;
    category: string;
    total: number;
  }>;
  categoryControls?: ChartInfoPopoverCategoryControls;
  isLoading?: boolean;
  bundleLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// 3-letter abbreviations matching PostgreSQL TO_CHAR(date, 'Mon YYYY') output
const MONTH_ABBREV = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface AllMonthsCategoryInfoTriggerProps {
  categoryControls?: ChartInfoPopoverCategoryControls;
}

const AllMonthsCategoryInfoTrigger = memo(
  function AllMonthsCategoryInfoTrigger({
    categoryControls,
  }: AllMonthsCategoryInfoTriggerProps) {
    return (
      <div
        className="flex items-center gap-2"
      >
        <ChartInfoPopover
          title="All Months Category Spending"
          description="See which categories you spend the most on each month of the year (all 12 months shown)."
          details={[
            "This chart shows your spending broken down by category for each month of the year.",
            "All 12 months (January through December) are displayed side-by-side.",
            "Each month has multiple bars, one for each spending category.",
            "Only expense transactions (negative amounts) are included.",
            "The chart respects your selected time period filter.",
          ]}
          categoryControls={categoryControls}
        />
        <ChartAiInsightButton
          chartId="allMonthsCategorySpending"
          chartTitle="All Months Category Spending"
          chartDescription="See which categories you spend the most on each month of the year (all 12 months shown)."
          size="sm"
        />
      </div>
    );
  },
);

AllMonthsCategoryInfoTrigger.displayName = "AllMonthsCategoryInfoTrigger";

export const ChartAllMonthsCategorySpending = memo(
  function ChartAllMonthsCategorySpending({
    data = [],
    monthlyCategoriesData,
    categoryControls: propCategoryControls,
    isLoading = false,
    emptyTitle,
    emptyDescription,
  }: ChartAllMonthsCategorySpendingProps) {
    const { resolvedTheme } = useTheme();
    const { getShuffledPalette, colorScheme } = useColorScheme();
    const { formatCurrency } = useCurrency();
    const palette = useMemo(
      () => getShuffledPalette("analytics:allMonthsCategorySpending"),
      [getShuffledPalette],
    );
    const [isFullscreen, setIsFullscreen] = useState(false);

    const normalizeCategoryName = useCallback((value?: string | null) => {
      const trimmed = (value ?? "").trim();
      return trimmed || "Other";
    }, []);

    // Extract hidden categories from prop category controls
    const hiddenCategories = useMemo(() => {
      return propCategoryControls?.hiddenCategories || [];
    }, [propCategoryControls?.hiddenCategories]);

    // Create a Set for efficient lookup
    const hiddenCategorySet = useMemo(() => {
      return new Set(hiddenCategories.map((cat) => normalizeCategoryName(cat)));
    }, [hiddenCategories, normalizeCategoryName]);

    // Process data to group by month of year and category
    const processedData = useMemo(() => {
      if (monthlyCategoriesData && monthlyCategoriesData.length > 0) {
        const grouped = new Map<number, Map<string, number>>();
        monthNames.forEach((_, monthIndex) => {
          grouped.set(monthIndex, new Map<string, number>());
        });

        monthlyCategoriesData.forEach((m) => {
          let monthIndex: number;
          if (typeof m.month === "string") {
            const monthStr = (m.month as string).split(" ")[0];
            monthIndex = MONTH_ABBREV.indexOf(monthStr);
            if (monthIndex === -1) return;
          } else {
            monthIndex = (m.month as number) - 1;
          }

          const category = m.category;
          if (hiddenCategorySet.has(category)) return;
          const dayMap = grouped.get(monthIndex);
          if (dayMap) {
            dayMap.set(category, (dayMap.get(category) || 0) + m.total);
          }
        });

        const flatData: Array<{
          month: number;
          monthName: string;
          category: string;
          amount: number;
        }> = [];
        grouped.forEach((categoryMap, monthIndex) => {
          categoryMap.forEach((amount, category) => {
            if (amount > 0) {
              flatData.push({
                month: monthIndex,
                monthName: MONTH_ABBREV[monthIndex],
                category,
                amount,
              });
            }
          });
        });
        return flatData;
      }

      if (!data || data.length === 0) {
        return [];
      }

      const grouped = new Map<number, Map<string, number>>();

      monthNames.forEach((_, monthIndex) => {
        grouped.set(monthIndex, new Map<string, number>());
      });

      data.forEach((tx) => {
        const amount = Number(tx.amount) || 0;
        if (amount < 0) {
          let monthIndex: number;
          if (typeof tx.date === "string") {
            const parts = tx.date.split("-");
            if (parts.length >= 3) {
              monthIndex = parseInt(parts[1], 10) - 1;
            } else if (parts.length >= 2) {
              monthIndex = parseInt(parts[1], 10) - 1;
            } else {
              const date = new Date(tx.date);
              monthIndex = date.getUTCMonth();
            }
          } else {
            const date = new Date(tx.date);
            monthIndex = date.getUTCMonth();
          }

          const category = normalizeCategoryName(tx.category);

          if (hiddenCategorySet.has(category)) {
            return;
          }

          const monthMap = grouped.get(monthIndex);
          if (monthMap) {
            const currentTotal = monthMap.get(category) || 0;
            monthMap.set(category, currentTotal + Math.abs(amount));
          }
        }
      });

      const flatData: Array<{
        month: number;
        monthName: string;
        category: string;
        amount: number;
      }> = [];
      grouped.forEach((categoryMap, monthIndex) => {
        categoryMap.forEach((amount, category) => {
          if (amount > 0) {
            flatData.push({
              month: monthIndex,
              monthName: MONTH_ABBREV[monthIndex],
              category,
              amount,
            });
          }
        });
      });

      return flatData;
    }, [monthlyCategoriesData, data, hiddenCategorySet, normalizeCategoryName]);

    // All categories (for controls)
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

    // Visible categories (non-zero totals)
    const categories: string[] = useMemo(() => {
      // Sort by max value in any single month so the globally dominant category
      // in its peak month sits at the top of the stack.
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

    // Use propCategoryControls if provided
    const categoryControls = propCategoryControls;

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

    // Positional keys: each month sorts its categories descending (biggest → base),
    // then assigns pos_0, pos_1, … so every bar independently places its largest
    // category at the bottom regardless of other months.
    const { posKeys, nivoData, positionLookup } = useMemo(() => {
      let maxCount = 0;
      const monthSorted = MONTH_ABBREV.map((monthAbbrev, monthIndex) => {
        const sorted = processedData
          .filter((d) => d.month === monthIndex)
          .sort((a, b) => b.amount - a.amount);
        maxCount = Math.max(maxCount, sorted.length);
        return { monthAbbrev, sorted };
      });

      const keys = Array.from({ length: maxCount }, (_, i) => `pos_${i}`);
      const lookup = new Map<string, { category: string; color: string }>();

      const data = monthSorted.map(({ monthAbbrev, sorted }) => {
        const row: Record<string, number | string> = { month: monthAbbrev };
        sorted.forEach((item, i) => {
          row[`pos_${i}`] = item.amount;
          lookup.set(`${monthAbbrev}_pos_${i}`, {
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
        indexBy="month"
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

    if (
      (!data || data.length === 0) &&
      (!monthlyCategoriesData || monthlyCategoriesData.length === 0) &&
      processedData.length === 0
    ) {
      return (
        <Card className="@container/card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <GridStackCardDragHandle />
              <ChartFavoriteButton
                chartId="allMonthsCategorySpending"
                chartTitle="All Months Category Spending"
                size="md"
              />
              <CardTitle>All Months Category Spending</CardTitle>
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
          <CardFooter className="pb-3 gap-2">
            <AllMonthsCategoryInfoTrigger
              categoryControls={categoryControls}
            />
          </CardFooter>
        </Card>
      );
    }

    return (
      <>
        <ChartFullscreenModal
          isOpen={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          title="All Months Category Spending"
          description="Monthly spending by category across all 12 months"
          headerActions={
            <AllMonthsCategoryInfoTrigger
              categoryControls={categoryControls}
            />
          }
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
                chartId="allMonthsCategorySpending"
                chartTitle="All Months Category Spending"
                size="md"
              />
              <CardTitle>All Months Category Spending</CardTitle>
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
          <CardFooter className="pb-3 gap-2">
            <AllMonthsCategoryInfoTrigger
              categoryControls={categoryControls}
            />
          </CardFooter>
        </Card>
      </>
    );
  },
);

ChartAllMonthsCategorySpending.displayName = "ChartAllMonthsCategorySpending";
