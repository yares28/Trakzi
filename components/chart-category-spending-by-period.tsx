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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartFavoriteButton } from "@/components/chart-favorite-button";
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle";
import {
  ChartCardFloatingMeta,
  ChartCardTopRightControl,
  chartCardHeaderIconClusterClassName,
  chartCardHeaderLeadingClassName,
  chartCardHeaderRowClassName,
  chartCardHeaderTitleClassName,
} from "@/components/chart-card-overlay-controls";
import { CHART_METADATA } from "@/lib/chart-metadata";
import { useColorScheme } from "@/components/color-scheme-provider";
import { useCurrency } from "@/components/currency-provider";
import {
  getChartTextColor,
  getChartAxisLineColor,
  DEFAULT_FALLBACK_PALETTE,
} from "@/lib/chart-colors";
import { NivoChartTooltip } from "@/components/chart-tooltip";
import { HoverableBar } from "@/components/chart-hoverable-bar";
import { ChartExpandButton } from "@/components/chart-expand-button";
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal";

type PeriodView = "week" | "month" | "quarter" | "year";

type Tx = {
  id: number;
  date: string;
  description: string;
  amount: number;
  balance: number | null;
  category: string;
};

interface ChartCategorySpendingByPeriodProps {
  data?: Tx[];
  dayOfWeekCategoryData?: Array<{
    dayOfWeek: number;
    category: string;
    total: number;
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

const QUARTER_LABELS = ["Q1", "Q2", "Q3", "Q4"];

function parseMonthYearLabel(
  label: string,
): { monthIndex: number; year: number } | null {
  const parts = label.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const monthIndex = MONTH_ABBREV.indexOf(parts[0]);
  const year = parseInt(parts[1], 10);
  if (monthIndex === -1 || !Number.isFinite(year)) return null;
  return { monthIndex, year };
}

function txCalendarMonthIndex(dateStr: string): number {
  const parts = dateStr.split("-");
  if (parts.length >= 2) {
    const m = parseInt(parts[1], 10);
    if (Number.isFinite(m) && m >= 1 && m <= 12) return m - 1;
  }
  return new Date(dateStr).getUTCMonth();
}

function txCalendarYear(dateStr: string): number {
  const parts = dateStr.split("-");
  if (parts.length >= 1) {
    const y = parseInt(parts[0], 10);
    if (Number.isFinite(y) && y > 1900) return y;
  }
  return new Date(dateStr).getUTCFullYear();
}

const { title: chartTitle, description: chartDescription } =
  CHART_METADATA.categorySpendingByPeriod;

const CategorySpendingByPeriodInfo = memo(function CategorySpendingByPeriodInfo({
  forFullscreen = false,
  categoryControls,
}: {
  forFullscreen?: boolean;
  categoryControls?: ChartInfoPopoverCategoryControls;
}) {
  if (!forFullscreen) {
    return (
      <ChartCardFloatingMeta
        insight={
          <ChartAiInsightButton
            chartId="categorySpendingByPeriod"
            chartTitle={chartTitle}
            chartDescription={chartDescription}
            size="sm"
          />
        }
        info={
          <ChartInfoPopover
            title={chartTitle}
            description={chartDescription}
            details={[
              "Week: stacked spending by category for each weekday (Monday–Sunday).",
              "Month: totals rolled up by calendar month (Jan–Dec) within your filter.",
              "Quarter: totals by calendar quarter (Q1–Q4) within your filter.",
              "Year: one stacked bar per calendar year in range.",
              "Only expenses are included; the global date filter applies.",
            ]}
            categoryControls={categoryControls}
          />
        }
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <ChartAiInsightButton
        chartId="categorySpendingByPeriod"
        chartTitle={chartTitle}
        chartDescription={chartDescription}
        size="sm"
      />
      <ChartInfoPopover
        title={chartTitle}
        description={chartDescription}
        details={[
          "Week: stacked spending by category for each weekday (Monday–Sunday).",
          "Month: totals rolled up by calendar month (Jan–Dec) within your filter.",
          "Quarter: totals by calendar quarter (Q1–Q4) within your filter.",
          "Year: one stacked bar per calendar year in range.",
          "Only expenses are included; the global date filter applies.",
        ]}
        categoryControls={categoryControls}
      />
    </div>
  );
});

CategorySpendingByPeriodInfo.displayName = "CategorySpendingByPeriodInfo";

export const ChartCategorySpendingByPeriod = memo(
  function ChartCategorySpendingByPeriod({
    data = [],
    dayOfWeekCategoryData,
    monthlyCategoriesData,
    categoryControls,
    isLoading = false,
    bundleLoading = false,
    emptyTitle,
    emptyDescription,
  }: ChartCategorySpendingByPeriodProps) {
    const { resolvedTheme } = useTheme();
    const { getShuffledPalette, colorScheme } = useColorScheme();
    const { formatCurrency } = useCurrency();
    const palette = useMemo(
      () => getShuffledPalette("analytics:categorySpendingByPeriod"),
      [getShuffledPalette],
    );
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [viewMode, setViewMode] = useState<PeriodView>("week");

    const normalizeCategoryName = useCallback((value?: string | null) => {
      const trimmed = (value ?? "").trim();
      return trimmed || "Other";
    }, []);

    const resolvedCategoryControls = useMemo((): ChartInfoPopoverCategoryControls => {
      return (
        categoryControls ?? {
          categories: [],
          hiddenCategories: [],
          onToggle: () => {},
        }
      );
    }, [categoryControls]);

    const hiddenCategorySetFromProp = useMemo(() => {
      const h = resolvedCategoryControls.hiddenCategories ?? [];
      return new Set(h.map((c) => normalizeCategoryName(c)));
    }, [resolvedCategoryControls.hiddenCategories, normalizeCategoryName]);

    const shouldHideCategory = useCallback(
      (raw: string) => {
        const n = normalizeCategoryName(raw);
        return hiddenCategorySetFromProp.has(n);
      },
      [hiddenCategorySetFromProp, normalizeCategoryName],
    );

    const processedData = useMemo(() => {
      type Row = {
        periodIndex: number;
        periodLabel: string;
        category: string;
        amount: number;
      };
      const out: Row[] = [];

      if (viewMode === "week") {
        if (dayOfWeekCategoryData && dayOfWeekCategoryData.length > 0) {
          const dayNamesLocal = [
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat",
            "Sun",
          ];
          for (const d of dayOfWeekCategoryData) {
            if (shouldHideCategory(d.category)) continue;
            out.push({
              periodIndex: d.dayOfWeek,
              periodLabel: dayNamesLocal[d.dayOfWeek] || "Mon",
              category: d.category,
              amount: d.total,
            });
          }
          return out;
        }

        const grouped = new Map<number, Map<string, number>>();
        dayNames.forEach((_, dayIndex) => {
          grouped.set(dayIndex, new Map<string, number>());
        });

        for (const tx of data) {
          const amount = Number(tx.amount) || 0;
          if (amount >= 0) continue;
          const date = new Date(tx.date);
          const dayOfWeek = (date.getDay() + 6) % 7;
          const category = normalizeCategoryName(tx.category);
          if (shouldHideCategory(category)) continue;
          const dayMap = grouped.get(dayOfWeek);
          if (!dayMap) continue;
          dayMap.set(category, (dayMap.get(category) || 0) + Math.abs(amount));
        }

        grouped.forEach((categoryMap, dayIndex) => {
          categoryMap.forEach((amount, category) => {
            if (amount > 0) {
              out.push({
                periodIndex: dayIndex,
                periodLabel: dayNamesShort[dayIndex],
                category,
                amount,
              });
            }
          });
        });
        return out;
      }

      if (viewMode === "month") {
        if (monthlyCategoriesData && monthlyCategoriesData.length > 0) {
          const grouped = new Map<number, Map<string, number>>();
          monthNames.forEach((_, monthIndex) => {
            grouped.set(monthIndex, new Map<string, number>());
          });

          for (const m of monthlyCategoriesData) {
            let monthIndex: number;
            if (typeof m.month === "string") {
              const parsed = parseMonthYearLabel(m.month as string);
              if (!parsed) continue;
              monthIndex = parsed.monthIndex;
            } else {
              monthIndex = (m.month as number) - 1;
              if (monthIndex < 0 || monthIndex > 11) continue;
            }
            if (shouldHideCategory(m.category)) continue;
            const bucket = grouped.get(monthIndex);
            if (bucket) {
              bucket.set(m.category, (bucket.get(m.category) || 0) + m.total);
            }
          }

          grouped.forEach((categoryMap, monthIndex) => {
            categoryMap.forEach((amount, category) => {
              if (amount > 0) {
                out.push({
                  periodIndex: monthIndex,
                  periodLabel: MONTH_ABBREV[monthIndex],
                  category,
                  amount,
                });
              }
            });
          });
          return out;
        }

        const grouped = new Map<number, Map<string, number>>();
        monthNames.forEach((_, monthIndex) => {
          grouped.set(monthIndex, new Map<string, number>());
        });

        for (const tx of data) {
          const amount = Number(tx.amount) || 0;
          if (amount >= 0) continue;
          const monthIndex = txCalendarMonthIndex(tx.date);
          const category = normalizeCategoryName(tx.category);
          if (shouldHideCategory(category)) continue;
          const monthMap = grouped.get(monthIndex);
          if (monthMap) {
            monthMap.set(category, (monthMap.get(category) || 0) + Math.abs(amount));
          }
        }

        grouped.forEach((categoryMap, monthIndex) => {
          categoryMap.forEach((amount, category) => {
            if (amount > 0) {
              out.push({
                periodIndex: monthIndex,
                periodLabel: MONTH_ABBREV[monthIndex],
                category,
                amount,
              });
            }
          });
        });
        return out;
      }

      if (viewMode === "quarter") {
        const grouped = new Map<number, Map<string, number>>();
        for (let q = 0; q < 4; q++) {
          grouped.set(q, new Map<string, number>());
        }

        if (monthlyCategoriesData && monthlyCategoriesData.length > 0) {
          for (const m of monthlyCategoriesData) {
            let monthIndex: number;
            if (typeof m.month === "string") {
              const parsed = parseMonthYearLabel(m.month as string);
              if (!parsed) continue;
              monthIndex = parsed.monthIndex;
            } else {
              monthIndex = (m.month as number) - 1;
              if (monthIndex < 0 || monthIndex > 11) continue;
            }
            const q = Math.floor(monthIndex / 3);
            if (shouldHideCategory(m.category)) continue;
            const bucket = grouped.get(q);
            if (bucket) {
              bucket.set(m.category, (bucket.get(m.category) || 0) + m.total);
            }
          }
        } else {
          for (const tx of data) {
            const amount = Number(tx.amount) || 0;
            if (amount >= 0) continue;
            const monthIndex = txCalendarMonthIndex(tx.date);
            const category = normalizeCategoryName(tx.category);
            if (shouldHideCategory(category)) continue;
            const q = Math.floor(monthIndex / 3);
            const bucket = grouped.get(q);
            if (bucket) {
              bucket.set(category, (bucket.get(category) || 0) + Math.abs(amount));
            }
          }
        }

        grouped.forEach((categoryMap, q) => {
          categoryMap.forEach((amount, category) => {
            if (amount > 0) {
              out.push({
                periodIndex: q,
                periodLabel: QUARTER_LABELS[q],
                category,
                amount,
              });
            }
          });
        });
        return out;
      }

      // year
      const grouped = new Map<number, Map<string, number>>();

      if (monthlyCategoriesData && monthlyCategoriesData.length > 0) {
        for (const m of monthlyCategoriesData) {
          let year: number;
          if (typeof m.month === "string") {
            const parsed = parseMonthYearLabel(m.month as string);
            if (!parsed) continue;
            year = parsed.year;
          } else {
            continue;
          }
          if (shouldHideCategory(m.category)) continue;
          if (!grouped.has(year)) grouped.set(year, new Map<string, number>());
          const yMap = grouped.get(year)!;
          yMap.set(m.category, (yMap.get(m.category) || 0) + m.total);
        }
      }

      if (grouped.size === 0) {
        for (const tx of data) {
          const amount = Number(tx.amount) || 0;
          if (amount >= 0) continue;
          const year = txCalendarYear(tx.date.split("T")[0]);
          const category = normalizeCategoryName(tx.category);
          if (shouldHideCategory(category)) continue;
          if (!grouped.has(year)) grouped.set(year, new Map<string, number>());
          const yMap = grouped.get(year)!;
          yMap.set(category, (yMap.get(category) || 0) + Math.abs(amount));
        }
      }

      const years = Array.from(grouped.keys()).sort((a, b) => a - b);
      for (const year of years) {
        const categoryMap = grouped.get(year)!;
        categoryMap.forEach((amount, category) => {
          if (amount > 0) {
            out.push({
              periodIndex: year,
              periodLabel: String(year),
              category,
              amount,
            });
          }
        });
      }
      return out;
    }, [
      viewMode,
      data,
      dayOfWeekCategoryData,
      monthlyCategoriesData,
      shouldHideCategory,
      normalizeCategoryName,
    ]);

    const allCategories = useMemo(() => {
      const categorySet = new Set<string>();
      for (const tx of data) {
        const amount = Number(tx.amount) || 0;
        if (amount < 0) {
          categorySet.add(normalizeCategoryName(tx.category));
        }
      }
      return Array.from(categorySet).sort();
    }, [data, normalizeCategoryName]);

    const categories: string[] = useMemo(() => {
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

    const periodOrder = useMemo(() => {
      if (viewMode === "week") return [...dayNamesShort];
      if (viewMode === "month") return [...MONTH_ABBREV];
      if (viewMode === "quarter") return [...QUARTER_LABELS];
      const years = new Set<string>();
      processedData.forEach((d) => years.add(d.periodLabel));
      return Array.from(years).sort(
        (a, b) => parseInt(a, 10) - parseInt(b, 10),
      );
    }, [viewMode, processedData]);

    const { posKeys, nivoData, positionLookup } = useMemo(() => {
      let maxCount = 0;
      const sortedBuckets = periodOrder.map((label) => {
        const sorted = processedData
          .filter((d) => d.periodLabel === label)
          .sort((a, b) => b.amount - a.amount);
        maxCount = Math.max(maxCount, sorted.length);
        return { label, sorted };
      });

      const keys = Array.from({ length: maxCount }, (_, i) => `pos_${i}`);
      const lookup = new Map<string, { category: string; color: string }>();

      const rows = sortedBuckets.map(({ label, sorted }) => {
        const row: Record<string, number | string> = { period: label };
        sorted.forEach((item, i) => {
          row[`pos_${i}`] = item.amount;
          lookup.set(`${label}_pos_${i}`, {
            category: item.category,
            color:
              categoryColors.get(item.category) ?? palette[i % palette.length],
          });
        });
        return row;
      });

      return { posKeys: keys, nivoData: rows, positionLookup: lookup };
    }, [processedData, periodOrder, categoryColors, palette]);

    const viewSwitchControl = (
      <div
        className="flex max-w-full shrink-0 flex-wrap items-center justify-center gap-px rounded-full bg-muted p-px text-[10px] leading-tight sm:text-xs"
        role="group"
        aria-label="Category spending period"
      >
        {(
          [
            ["week", "Week"],
            ["month", "Month"],
            ["quarter", "Quarter"],
            ["year", "Year"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            className={`rounded-full px-2 py-1 font-medium transition-all whitespace-nowrap sm:px-2.5 ${viewMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setViewMode(mode)}
          >
            {label}
          </button>
        ))}
      </div>
    );

    const renderChart = () => (
      <div className="h-full w-full min-h-0" key={`${viewMode}-${colorScheme}`}>
        <ResponsiveBar
          data={nivoData}
          keys={posKeys}
          indexBy="period"
          groupMode="stacked"
          margin={{ top: 16, right: 16, bottom: 40, left: 60 }}
          padding={0.3}
          colors={({ id, indexValue }) =>
            positionLookup.get(`${String(indexValue)}_${String(id)}`)?.color ??
            palette[0]
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
      </div>
    );

    const hasTx = data.length > 0;
    const hasMonthlyBundle =
      Array.isArray(monthlyCategoriesData) && monthlyCategoriesData.length > 0;
    const hasDowBundle =
      Array.isArray(dayOfWeekCategoryData) && dayOfWeekCategoryData.length > 0;
    const chartLoading =
      viewMode === "week"
        ? isLoading && !hasDowBundle && !hasTx
        : bundleLoading && !hasMonthlyBundle && !hasTx;

    const showEmpty =
      !hasTx &&
      !hasMonthlyBundle &&
      !hasDowBundle &&
      processedData.length === 0;

    if (showEmpty) {
      return (
        <Card className="@container/card relative">
          <CardHeader className={chartCardHeaderRowClassName}>
            <div className={chartCardHeaderLeadingClassName}>
              <div className={chartCardHeaderIconClusterClassName}>
                <GridStackCardDragHandle />
                <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                <ChartFavoriteButton
                  chartId="categorySpendingByPeriod"
                  chartTitle={chartTitle}
                  size="md"
                />
              </div>
              <CardTitle className={chartCardHeaderTitleClassName}>{chartTitle}</CardTitle>
            </div>
            <ChartCardTopRightControl>{viewSwitchControl}</ChartCardTopRightControl>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-2 pt-4 sm:px-6 sm:pt-6">
            <div className="h-[210px]">
              <ChartLoadingState
                isLoading={isLoading || bundleLoading}
                skeletonType="bar"
                emptyTitle={emptyTitle}
                emptyDescription={emptyDescription}
              />
            </div>
          </CardContent>
          <CategorySpendingByPeriodInfo
            categoryControls={resolvedCategoryControls}
          />
        </Card>
      );
    }

    return (
      <>
        <ChartFullscreenModal
          isOpen={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          title={chartTitle}
          description={chartDescription}
          headerActions={
            <CategorySpendingByPeriodInfo
              forFullscreen
              categoryControls={resolvedCategoryControls}
            />
          }
        >
          <div className="mb-3 flex justify-center">{viewSwitchControl}</div>
          <div className="h-full w-full min-h-[400px]">
            {chartLoading ? (
              <ChartLoadingState isLoading skeletonType="bar" />
            ) : (
              renderChart()
            )}
          </div>
        </ChartFullscreenModal>

        <Card className="@container/card relative">
          <CardHeader className={chartCardHeaderRowClassName}>
            <div className={chartCardHeaderLeadingClassName}>
              <div className={chartCardHeaderIconClusterClassName}>
                <GridStackCardDragHandle />
                <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                <ChartFavoriteButton
                  chartId="categorySpendingByPeriod"
                  chartTitle={chartTitle}
                  size="md"
                />
              </div>
              <CardTitle className={chartCardHeaderTitleClassName}>{chartTitle}</CardTitle>
            </div>
            <ChartCardTopRightControl>{viewSwitchControl}</ChartCardTopRightControl>
          </CardHeader>
          <CardContent className="flex h-[250px] flex-col px-2 pt-4 sm:px-6 sm:pt-6">
            <div className="min-h-[180px] flex-1 w-full">
              {chartLoading ? (
                <ChartLoadingState isLoading skeletonType="bar" />
              ) : (
                renderChart()
              )}
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 pb-1 pt-2 text-xs text-muted-foreground mt-2 mb-2">
                {categories.slice(0, 10).map((category) => (
                  <div key={category} className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          categoryColors.get(category) ||
                          DEFAULT_FALLBACK_PALETTE[0],
                      }}
                    />
                    <span
                      className="font-medium text-foreground truncate max-w-[120px]"
                      title={category}
                    >
                      {category}
                    </span>
                  </div>
                ))}
                {categories.length > 10 && (
                  <span className="text-[0.65rem] text-muted-foreground">
                    +{categories.length - 10} more
                  </span>
                )}
              </div>
            )}
          </CardContent>
          <CategorySpendingByPeriodInfo
            categoryControls={resolvedCategoryControls}
          />
        </Card>
      </>
    );
  },
);

ChartCategorySpendingByPeriod.displayName = "ChartCategorySpendingByPeriod";
