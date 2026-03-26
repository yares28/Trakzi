"use client";

// Single Month Category Spending Chart - Shows one selected month at a time
import * as React from "react";
import { useTheme } from "next-themes";
import { ResponsiveBar } from "@nivo/bar";
import { ChartInfoPopover } from "@/components/chart-info-popover";
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button";
import { useColorScheme } from "@/components/color-scheme-provider";
import { useCurrency } from "@/components/currency-provider";
import {
  DEFAULT_FALLBACK_PALETTE,
  getChartTextColor,
  getChartAxisLineColor,
} from "@/lib/chart-colors";
import { NivoChartTooltip } from "@/components/chart-tooltip";
import { HoverableBar } from "@/components/chart-hoverable-bar";
import {
  deduplicatedFetch,
  getCachedResponse,
} from "@/lib/request-deduplication";
import { ChartLoadingState } from "@/components/chart-loading-state";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartFavoriteButton } from "@/components/chart-favorite-button";
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartExpandButton } from "@/components/chart-expand-button";
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal";

interface ChartSingleMonthCategorySpendingProps {
  dateFilter?: string | null;
  monthlyCategoriesData?: Array<{
    category: string;
    month: string | number;
    total: number;
  }>;
  bundleLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

type MonthData = {
  category: string;
  month: number;
  total: number;
};

const MONTH_NAMES = [
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

const SHORT_MONTH_NAMES = [
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

// Parse "Jan 2024" or "Jan" to month number 1-12
const parseMonthToNumber = (m: string | number): number => {
  if (typeof m === "number") return m;
  const monthStr = String(m).split(" ")[0]; // Extract "Jan" from "Jan 2024"
  const idx = SHORT_MONTH_NAMES.indexOf(monthStr);
  return idx >= 0 ? idx + 1 : 1;
};

// Transform and aggregate bundle data by month number (combines all years)
const aggregateBundleData = (
  data: Array<{ category: string; month: string | number; total: number }>,
): MonthData[] => {
  const aggregated = new Map<string, Map<number, number>>(); // category -> (month -> total)

  data.forEach((d) => {
    const monthNum = parseMonthToNumber(d.month);
    if (!aggregated.has(d.category)) {
      aggregated.set(d.category, new Map());
    }
    const categoryMap = aggregated.get(d.category)!;
    categoryMap.set(monthNum, (categoryMap.get(monthNum) || 0) + d.total);
  });

  const result: MonthData[] = [];
  aggregated.forEach((monthMap, category) => {
    monthMap.forEach((total, month) => {
      result.push({ category, month, total });
    });
  });
  return result;
};

const buildMonthlyCategoryUrl = (params: URLSearchParams) =>
  `/api/analytics/monthly-category-duplicate?${params.toString()}`;

const SingleMonthInfoTrigger = React.memo(function SingleMonthInfoTrigger({
  forFullscreen = false,
}: {
  forFullscreen?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}
    >
      <ChartInfoPopover
        title="Single Month Category Spending"
        description="Compare spending across categories for a selected month."
        details={[
          "Each bar represents total spending in a category for the selected month.",
          "Use the month selector to switch between different months.",
          "Only the most spent categories are shown for each month.",
        ]}
        ignoredFootnote="Only expense transactions (amount < 0) are included."
      />
      <ChartAiInsightButton
        chartId="singleMonthCategorySpending"
        chartTitle="Single Month Category Spending"
        chartDescription="Compare spending across categories for a selected month."
        size="sm"
      />
    </div>
  );
});

SingleMonthInfoTrigger.displayName = "SingleMonthInfoTrigger";

export const ChartSingleMonthCategorySpending = React.memo(
  function ChartSingleMonthCategorySpending({
    dateFilter,
    monthlyCategoriesData,
    bundleLoading,
    emptyTitle,
    emptyDescription,
  }: ChartSingleMonthCategorySpendingProps) {
    const { resolvedTheme } = useTheme();
    const { colorScheme, getShuffledPalette } = useColorScheme();
    const { formatCurrency } = useCurrency();
    const buildMonthParams = React.useCallback(
      (month?: number | null) => {
        const params = new URLSearchParams();
        if (dateFilter) {
          params.append("filter", dateFilter);
        }
        if (typeof month === "number") {
          params.append("month", month.toString());
        }
        return params;
      },
      [dateFilter],
    );
    const availableUrl = buildMonthlyCategoryUrl(buildMonthParams());
    const cachedAvailable = getCachedResponse<{
      data: Array<{ category: string; month: number; total: number }>;
      availableMonths: number[];
    }>(availableUrl);
    const initialAvailableMonths = cachedAvailable?.availableMonths ?? [];
    const initialSelectedMonth =
      initialAvailableMonths.length > 0 ? initialAvailableMonths[0] : null;
    const cachedSelected =
      initialSelectedMonth !== null
        ? getCachedResponse<{
            data: Array<{ category: string; month: number; total: number }>;
            availableMonths: number[];
          }>(buildMonthlyCategoryUrl(buildMonthParams(initialSelectedMonth)))
        : undefined;
    const [mounted, setMounted] = React.useState(false);
    const [data, setData] = React.useState<MonthData[]>(
      () => cachedSelected?.data ?? [],
    );
    const [availableMonths, setAvailableMonths] = React.useState<number[]>(
      () => initialAvailableMonths,
    );
    const [selectedMonth, setSelectedMonth] = React.useState<number | null>(
      () => initialSelectedMonth,
    );
    const [loading, setLoading] = React.useState(
      () => initialAvailableMonths.length > 0 && cachedSelected === undefined,
    );
    const [isFullscreen, setIsFullscreen] = React.useState(false);

    React.useEffect(() => {
      setMounted(true);
    }, []);

    // Fetch available months first (without selected month) when dateFilter changes
    React.useEffect(() => {
      if (bundleLoading !== undefined) {
        if (bundleLoading) {
          setLoading(true);
          return;
        }
        if (monthlyCategoriesData && monthlyCategoriesData.length > 0) {
          const normalizedData = aggregateBundleData(monthlyCategoriesData);
          const months = [...new Set(normalizedData.map((d) => d.month))].sort(
            (a, b) => a - b,
          );
          setAvailableMonths(months);
          if (months.length > 0) {
            setSelectedMonth((prev) => {
              if (prev === null || !months.includes(prev)) {
                return months[0];
              }
              return prev;
            });
          } else {
            setSelectedMonth(null);
          }
          setLoading(false);
          return;
        }
        setAvailableMonths([]);
        setSelectedMonth(null);
        setLoading(false);
        return;
      }

      const fetchAvailableMonths = async () => {
        try {
          const cached = getCachedResponse<{
            data: Array<{ category: string; month: number; total: number }>;
            availableMonths: number[];
          }>(availableUrl);
          if (cached) {
            const months = cached.availableMonths || [];
            setAvailableMonths(months);
            if (months.length > 0) {
              setSelectedMonth((prev) => {
                if (prev === null || !months.includes(prev)) {
                  return months[0];
                }
                return prev;
              });
            } else {
              setSelectedMonth(null);
              setLoading(false);
            }
            return;
          }

          const result = await deduplicatedFetch<{
            data: Array<{ category: string; month: number; total: number }>;
            availableMonths: number[];
          }>(availableUrl);
          const months = result.availableMonths || [];
          setAvailableMonths(months);
          if (months.length > 0) {
            setSelectedMonth((prev) => {
              if (prev === null || !months.includes(prev)) {
                return months[0];
              }
              return prev;
            });
          } else {
            setSelectedMonth(null);
            setLoading(false);
          }
        } catch {
          setAvailableMonths([]);
          setSelectedMonth(null);
          setLoading(false);
        }
      };

      if (mounted) {
        fetchAvailableMonths();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      dateFilter,
      mounted,
      availableUrl,
      monthlyCategoriesData,
      bundleLoading,
    ]);

    // Fetch data when selectedMonth changes
    React.useEffect(() => {
      if (bundleLoading !== undefined) {
        if (bundleLoading) {
          return;
        }
        if (monthlyCategoriesData && monthlyCategoriesData.length > 0) {
          const normalizedData = aggregateBundleData(monthlyCategoriesData);
          if (selectedMonth === null) {
            setData([]);
          } else {
            const filtered = normalizedData.filter(
              (d) => d.month === selectedMonth,
            );
            setData(filtered);
          }
          setLoading(false);
          return;
        }
        setData([]);
        setLoading(false);
        return;
      }

      const fetchData = async () => {
        if (selectedMonth === null) {
          setData([]);
          setLoading(false);
          return;
        }

        const dataUrl = buildMonthlyCategoryUrl(
          buildMonthParams(selectedMonth),
        );
        const cached = getCachedResponse<{
          data: Array<{ category: string; month: number; total: number }>;
          availableMonths: number[];
        }>(dataUrl);
        if (cached) {
          setData(cached.data || []);
          setLoading(false);
          return;
        }

        setLoading(true);
        try {
          const result = await deduplicatedFetch<{
            data: Array<{ category: string; month: number; total: number }>;
            availableMonths: number[];
          }>(dataUrl);
          const fetchedData = result.data || [];

          if (fetchedData.length === 0 && availableMonths.length > 1) {
            for (const month of availableMonths) {
              if (month === selectedMonth) continue;

              const altUrl = buildMonthlyCategoryUrl(buildMonthParams(month));
              const cachedAlt = getCachedResponse<{
                data: Array<{ category: string; month: number; total: number }>;
                availableMonths: number[];
              }>(altUrl);
              if (cachedAlt?.data && cachedAlt.data.length > 0) {
                setSelectedMonth(month);
                setData(cachedAlt.data);
                setLoading(false);
                return;
              }

              const altResult = await deduplicatedFetch<{
                data: Array<{ category: string; month: number; total: number }>;
                availableMonths: number[];
              }>(altUrl);

              if (altResult.data && altResult.data.length > 0) {
                setSelectedMonth(month);
                setData(altResult.data);
                setLoading(false);
                return;
              }
            }
          }

          setData(fetchedData);
        } catch {
          setData([]);
        } finally {
          setLoading(false);
        }
      };

      if (mounted && selectedMonth !== null) {
        fetchData();
      }
    }, [
      selectedMonth,
      dateFilter,
      mounted,
      availableMonths,
      buildMonthParams,
      monthlyCategoriesData,
      bundleLoading,
    ]);

    const palette = React.useMemo(() => {
      const p = getShuffledPalette("analytics:singleMonthCategorySpending");
      return p.length ? p : DEFAULT_FALLBACK_PALETTE;
    }, [getShuffledPalette]);

    const isDark = resolvedTheme === "dark";
    const textColor = getChartTextColor(isDark);
    const gridColor = getChartAxisLineColor(isDark);

    const topCategories = React.useMemo(() => data.slice(0, 10), [data]);

    const chartData = React.useMemo(
      () =>
        topCategories.map((item, index) => ({
          category:
            item.category.length > 14
              ? item.category.slice(0, 13) + "…"
              : item.category,
          fullCategory: item.category,
          total: item.total,
          color: palette[index % palette.length],
        })),
      [topCategories, palette],
    );

    const monthTotal = React.useMemo(
      () => topCategories.reduce((sum, item) => sum + item.total, 0),
      [topCategories],
    );

    const renderChart = () => (
      <ResponsiveBar
        data={chartData}
        keys={["total"]}
        indexBy="category"
        margin={{ top: 16, right: 16, bottom: 60, left: 60 }}
        padding={0.3}
        colors={({ index }) =>
          chartData[index]?.color ?? palette[index % palette.length]
        }
        borderRadius={10}
        enableLabel={false}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: -35,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          format: (v: number) => {
            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
            if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
            return formatCurrency(v, { maximumFractionDigits: 0 });
          },
        }}
        enableGridY={true}
        gridYValues={5}
        theme={{
          text: { fill: textColor, fontSize: 11 },
          axis: { ticks: { text: { fill: textColor } } },
          grid: { line: { stroke: gridColor, strokeDasharray: "4 4" } },
        }}
        tooltip={({ indexValue, value, color }) => (
          <NivoChartTooltip
            title={
              chartData.find((d) => d.category === indexValue)?.fullCategory ??
              String(indexValue)
            }
            titleColor={color}
            value={formatCurrency(value as number)}
          />
        )}
        animate={true}
        motionConfig="gentle"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        barComponent={HoverableBar as any}
      />
    );

    const loadingCard = (isLoadingState: boolean) => (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="singleMonthCategorySpending"
              chartTitle="Single Month Category Spending"
              size="md"
            />
            <CardTitle>Single Month Category Spending</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <SingleMonthInfoTrigger />
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <ChartLoadingState
            isLoading={isLoadingState}
            skeletonType="bar"
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
        </CardContent>
      </Card>
    );

    if (!mounted) return loadingCard(true);
    if (loading) return loadingCard(true);

    if (!availableMonths.length || selectedMonth === null) {
      return (
        <Card className="@container/card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <GridStackCardDragHandle />
              <ChartFavoriteButton
                chartId="singleMonthCategorySpending"
                chartTitle="Single Month Category Spending"
                size="md"
              />
              <CardTitle>Single Month Category Spending</CardTitle>
            </div>
            <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <SingleMonthInfoTrigger />
            </CardAction>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
            <ChartLoadingState
              skeletonType="bar"
              emptyTitle={emptyTitle || "No monthly data yet"}
              emptyDescription={
                emptyDescription ||
                "Import your bank statements to see monthly category spending"
              }
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        <ChartFullscreenModal
          isOpen={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          title="Single Month Category Spending"
          description="Compare spending across categories for a selected month"
          headerActions={<SingleMonthInfoTrigger forFullscreen />}
        >
          <div className="h-full w-full min-h-[400px] flex flex-col" key={`${colorScheme}-${selectedMonth}`}>
            <div className="flex-1 min-h-0">
              {renderChart()}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
              {chartData.map((item) => (
                <div key={item.category} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-foreground truncate max-w-[120px]" title={item.fullCategory}>{item.fullCategory}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-1 px-4 py-2 text-xs text-muted-foreground border-t">
              <span>Total:</span>
              <span className="font-semibold text-foreground">{formatCurrency(monthTotal)}</span>
            </div>
          </div>
        </ChartFullscreenModal>

        <Card className="@container/card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <GridStackCardDragHandle />
              <ChartExpandButton onClick={() => setIsFullscreen(true)} />
              <ChartFavoriteButton
                chartId="singleMonthCategorySpending"
                chartTitle="Single Month Category Spending"
                size="md"
              />
              <CardTitle>Single Month Category Spending</CardTitle>
            </div>
            <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Select
                value={selectedMonth !== null ? selectedMonth.toString() : ""}
                onValueChange={(value) =>
                  setSelectedMonth(parseInt(value, 10))
                }
              >
                <SelectTrigger
                  className="w-32"
                  size="sm"
                  aria-label="Select month"
                >
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {availableMonths.map((month) => (
                    <SelectItem
                      key={month}
                      value={month.toString()}
                      className="rounded-lg"
                    >
                      {MONTH_NAMES[month - 1]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <SingleMonthInfoTrigger />
            </CardAction>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0 flex flex-col">
            {topCategories.length > 0 ? (
              <>
                <div className="h-full w-full min-h-[210px]" key={`${colorScheme}-${selectedMonth}`}>
                  {renderChart()}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
                  {chartData.map((item) => (
                    <div key={item.category} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-foreground truncate max-w-[120px]" title={item.fullCategory}>{item.fullCategory}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-1 pt-2 text-xs text-muted-foreground">
                  <span>Total:</span>
                  <span className="font-semibold text-foreground">{formatCurrency(monthTotal)}</span>
                </div>
              </>
            ) : (
              <div className="h-[250px]">
                <ChartLoadingState
                  skeletonType="bar"
                  emptyTitle={emptyTitle || "No spending data"}
                  emptyDescription={
                    emptyDescription ||
                    "No transactions recorded for this month yet"
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      </>
    );
  },
);

ChartSingleMonthCategorySpending.displayName =
  "ChartSingleMonthCategorySpending";
