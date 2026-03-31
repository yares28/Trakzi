"use client";

import { useState, useRef, useEffect, memo, useMemo } from "react";
import ReactDOM from "react-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  TooltipProps,
} from "recharts";
import { useTheme } from "next-themes";

import {
  ChartInfoPopover,
  ChartInfoPopoverCategoryControls,
} from "@/components/chart-info-popover";
import { ChartFavoriteButton } from "@/components/chart-favorite-button";
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle";
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button";
import { ChartExpandButton } from "@/components/chart-expand-button";
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal";
import { useColorScheme } from "@/components/color-scheme-provider";
import { CHART_GRID_COLOR } from "@/lib/chart-colors";
import { useCurrency } from "@/components/currency-provider";
import { type ChartId } from "@/lib/chart-card-sizes.config";
import { formatDateForDisplay } from "@/lib/date";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { ChartLoadingState } from "@/components/chart-loading-state";
import {
  ChartCardFloatingMeta,
  ChartCardTopRightControl,
} from "@/components/chart-card-overlay-controls";
export const description = "An interactive area chart";

interface ChartAreaInteractiveProps {
  data?: Array<{
    date: string;
    desktop: number;
    mobile: number;
  }>;
  /**
   * When set, shows a Basic / Cumulative segmented control (same cumulative rules as the dedicated cumulative chart).
   * Series respects the same category visibility as `data`.
   */
  cumulativeData?: Array<{
    date: string;
    desktop: number;
    mobile: number;
  }>;
  /**
   * When set, adds a "Net" pill button showing weekly net cash flow (income − expenses).
   * One data point per week (Monday = week start).
   */
  netData?: Array<{
    date: string;
    net: number;
  }>;
  categoryControls?: ChartInfoPopoverCategoryControls;
  chartId?: ChartId;
  /** Custom title for the chart card. Defaults to "Income & Expenses Cumulative Tracking" */
  title?: string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

interface AreaInfoActionProps {
  title: string;
  chartId: ChartId;
  categoryControls?: ChartInfoPopoverCategoryControls;
  filteredData: Array<{ date: string; desktop: number; mobile: number }>;
  forFullscreen?: boolean;
}

const AreaInfoAction = memo(function AreaInfoAction({
  title,
  chartId,
  categoryControls,
  filteredData,
  forFullscreen = false,
}: AreaInfoActionProps) {
  if (!forFullscreen) {
    return (
      <ChartCardFloatingMeta
        insight={
          <ChartAiInsightButton
            chartId={chartId}
            chartTitle={title}
            chartDescription="This chart visualizes your cumulative cash flow over time, showing income and expenses."
            chartData={{
              totalIncome: filteredData.reduce(
                (sum, d) => sum + (d.desktop || 0),
                0,
              ),
              totalExpenses: filteredData.reduce(
                (sum, d) => sum + (d.mobile || 0),
                0,
              ),
              dataPoints: filteredData.length,
              dateRange:
                filteredData.length > 0
                  ? {
                      start: filteredData[0].date,
                      end: filteredData[filteredData.length - 1].date,
                    }
                  : null,
            }}
            size="sm"
          />
        }
        info={
          <ChartInfoPopover
            title={title}
            description="This chart visualizes your cash flow over time."
            details={[
              "The income line shows daily deposits, while the expense line accumulates your negative transactions.",
              "How it works: expenses stack up as they happen. Incoming cash reduces the cumulative expense line so you can see how quickly income offsets spending.",
              ...(categoryControls
                ? [
                    "Use the toggles below to hide categories across every analytics chart.",
                  ]
                : []),
            ]}
            ignoredFootnote="Positive transactions feed the Income series and negative transactions feed Expenses automatically."
            categoryControls={categoryControls}
          />
        }
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <ChartInfoPopover
        title={title}
        description="This chart visualizes your cash flow over time."
        details={[
          "The income line shows daily deposits, while the expense line accumulates your negative transactions.",
          "How it works: expenses stack up as they happen. Incoming cash reduces the cumulative expense line so you can see how quickly income offsets spending.",
          ...(categoryControls
            ? [
                "Use the toggles below to hide categories across every analytics chart.",
              ]
            : []),
        ]}
        ignoredFootnote="Positive transactions feed the Income series and negative transactions feed Expenses automatically."
        categoryControls={categoryControls}
      />
      <ChartAiInsightButton
        chartId={chartId}
        chartTitle={title}
        chartDescription="This chart visualizes your cumulative cash flow over time, showing income and expenses."
        chartData={{
          totalIncome: filteredData.reduce(
            (sum, d) => sum + (d.desktop || 0),
            0,
          ),
          totalExpenses: filteredData.reduce(
            (sum, d) => sum + (d.mobile || 0),
            0,
          ),
          dataPoints: filteredData.length,
          dateRange:
            filteredData.length > 0
              ? {
                  start: filteredData[0].date,
                  end: filteredData[filteredData.length - 1].date,
                }
              : null,
        }}
        size="sm"
      />
    </div>
  );
});

AreaInfoAction.displayName = "AreaInfoAction";

const DEFAULT_CHART_TITLE = "Income & Expenses Cumulative Tracking";

type IncomeAreaViewMode = "basic" | "cumulative" | "net";

export const ChartAreaInteractive = memo(function ChartAreaInteractive({
  data = [],
  cumulativeData,
  netData,
  categoryControls,
  chartId = "incomeExpensesTracking1",
  title = DEFAULT_CHART_TITLE,
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: ChartAreaInteractiveProps) {
  const { getPalette } = useColorScheme();
  const { formatCurrency } = useCurrency();
  const { resolvedTheme } = useTheme();
  const [tooltip, setTooltip] = useState<{
    date: string;
    income: number;
    expenses: number;
    net?: number;
  } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number | undefined;
    y: number | undefined;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<IncomeAreaViewMode>("basic");
  // Track if we should use real data - starts false to force animation by showing empty data first
  const [useRealData, setUseRealData] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null);
  // RAF handle for throttling mousemove → prevents re-renders at DOM event rate (~250/s)
  const mouseRafRef = useRef<number | null>(null);
  // Cached tooltip dimensions to avoid offsetWidth reads during render (which force reflow)
  const tooltipSizeRef = useRef({ width: 180, height: 80 });
  const isDark = resolvedTheme === "dark";
  const gridStrokeColor = CHART_GRID_COLOR;

  // Force animation by delaying when we switch from empty data to real data
  // Recharts animates when data changes, so we start with [] then switch to real data
  useEffect(() => {
    // Use requestAnimationFrame to ensure the empty-data render happens first
    const rafId = requestAnimationFrame(() => {
      setUseRealData(true);
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Use the ordered palette so we can pick from the dark/light ends for max contrast
  const palette = useMemo(() => getPalette(), [getPalette]);

  // Palette is ordered dark → light.
  // Expenses = near-darkest (index 1), Income = near-lightest (index n-2)
  const expensesColor = palette[1] || palette[0];
  const incomeColor =
    palette[palette.length - 2] || palette[palette.length - 1] || palette[0];
  const netColor = palette[Math.floor(palette.length / 2)] || palette[0];

  // Use theme-based colors for proper CSS variable generation
  const chartConfig = {
    cashflow: {
      label: "Cash Flow",
    },
    desktop: {
      label: "Income",
      theme: {
        light: incomeColor,
        dark: incomeColor,
      },
    },
    mobile: {
      label: "Expenses",
      theme: {
        light: expensesColor,
        dark: expensesColor,
      },
    },
  } satisfies ChartConfig;

  const netChartConfig = {
    net: {
      label: "Net",
      theme: {
        light: netColor,
        dark: netColor,
      },
    },
  } satisfies ChartConfig;

  // For stroke colors, use the theme-aware colors
  const incomeBorderColor = incomeColor;
  const expensesBorderColor = expensesColor;

  const showViewSwitcher = cumulativeData !== undefined || netData !== undefined;
  const hasBasicData = data.length > 0;
  const hasCumulativeData = (cumulativeData?.length ?? 0) > 0;
  const hasNetData = (netData?.length ?? 0) > 0;

  const filteredData = useMemo(() => {
    if (!showViewSwitcher) return data;
    return viewMode === "cumulative" ? (cumulativeData ?? []) : data;
  }, [showViewSwitcher, viewMode, cumulativeData, data]);

  const shouldShowEmptyCard =
    isLoading ||
    (!showViewSwitcher && (!data || data.length === 0)) ||
    (showViewSwitcher && !hasBasicData && !hasCumulativeData && !hasNetData);

  const viewModeSwitcherControl =
    showViewSwitcher && (hasBasicData || hasCumulativeData || hasNetData) ? (
      <div
        className="flex shrink-0 items-center justify-start text-center rounded-full bg-muted p-px text-xs leading-tight"
        role="group"
        aria-label="Income and expenses view mode"
      >
        <button
          type="button"
          className={`rounded-full px-2.5 py-1 font-medium transition-all whitespace-nowrap ${viewMode === "basic" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setViewMode("basic")}
        >
          Basic
        </button>
        <button
          type="button"
          className={`rounded-full px-2.5 py-1 font-medium transition-all whitespace-nowrap ${viewMode === "cumulative" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setViewMode("cumulative")}
        >
          Cumulative
        </button>
        {netData !== undefined && (
          <button
            type="button"
            className={`rounded-full px-2.5 py-1 font-medium transition-all whitespace-nowrap ${viewMode === "net" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setViewMode("net")}
          >
            Net
          </button>
        )}
      </div>
    ) : null;

  // Format currency value using user's preferred currency
  const valueFormatter = {
    format: (value: number) => formatCurrency(value),
  };

  // Track mouse movement so the tooltip position animates smoothly with the cursor.
  // We store viewport-relative coordinates (clientX/Y) so the portal tooltip can
  // use `position: fixed` and escape any overflow-hidden ancestor.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Only update the ref — no setState here.
      // The Recharts tooltip callback reads this ref and owns all setState calls,
      // which eliminates the duplicate re-renders that caused the lag.
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      setTooltip(null);
      setTooltipPosition(null);
      mousePositionRef.current = null;
    };

    const handleDocumentTouch = (e: TouchEvent) => {
      if (!container.contains(e.target as Node)) {
        setTooltip(null);
        setTooltipPosition(null);
        mousePositionRef.current = null;
      }
    };

    const handleScroll = () => {
      setTooltip(null);
      setTooltipPosition(null);
      mousePositionRef.current = null;
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("touchstart", handleDocumentTouch, {
      passive: true,
    });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("touchstart", handleDocumentTouch);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // The data to pass to the chart - empty initially, then real data after mount
  // This forces Recharts to see a data change and trigger animation
  const chartData = useRealData ? filteredData : [];

  // Show loading/empty state only when loading or no data available
  if (shouldShowEmptyCard) {
    return (
      <Card className="@container/card relative gap-[20px]">
        {viewModeSwitcherControl ? (
          <ChartCardTopRightControl>{viewModeSwitcherControl}</ChartCardTopRightControl>
        ) : null}
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-0">
          <div className="flex items-center gap-2 min-w-0">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId={chartId}
              chartTitle={title}
              size="md"
            />
            <CardTitle className="truncate">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-0 sm:px-6">
          <div className="h-[250px] w-full">
            <ChartLoadingState
              isLoading={isLoading}
              skeletonType="area"
              emptyTitle={emptyTitle || "No financial data yet"}
              emptyDescription={
                emptyDescription ||
                "Import your bank statements to see your cash flow"
              }
            />
          </div>
        </CardContent>
        <AreaInfoAction
          title={title}
          chartId={chartId}
          categoryControls={categoryControls}
          filteredData={filteredData}
        />
      </Card>
    );
  }

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title}
        description={
          viewMode === "cumulative"
            ? "Cumulative cash flow over time"
            : "Daily income and expenses"
        }
        headerActions={
          <AreaInfoAction
            title={title}
            chartId={chartId}
            categoryControls={categoryControls}
            filteredData={filteredData}
            forFullscreen
          />
        }
      >
        <div className="flex h-full min-h-0 w-full flex-col">
          {viewModeSwitcherControl ? (
            <div className="shrink-0 pt-1">{viewModeSwitcherControl}</div>
          ) : null}
          <div className="min-h-[320px] flex-1 min-h-0 w-full">
            {filteredData.length === 0 ? (
              <ChartLoadingState
                isLoading={false}
                skeletonType="area"
                emptyTitle={
                  viewMode === "cumulative"
                    ? "No cumulative data for this view"
                    : "No data for this view"
                }
                emptyDescription="Try the other mode or adjust category filters."
              />
            ) : (
              viewMode === "net" ? (
                <ChartContainer config={netChartConfig} className="h-full w-full">
                  <AreaChart data={useRealData ? (netData ?? []) : []}>
                    <defs>
                      <linearGradient id="fillNetFS" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={netColor} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={netColor} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke={gridStrokeColor}
                      strokeDasharray="3 3"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={(value) =>
                        formatDateForDisplay(String(value), "en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={4}
                      width={68}
                      tickFormatter={(v: number) => {
                        const abs = Math.abs(v)
                        const sign = v < 0 ? "-" : ""
                        if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`
                        return `${sign}$${abs.toFixed(0)}`
                      }}
                    />
                    <ReferenceLine
                      y={0}
                      stroke={gridStrokeColor}
                      strokeDasharray="4 4"
                      strokeOpacity={0.6}
                    />
                    <Area
                      dataKey="net"
                      type="natural"
                      fill="url(#fillNetFS)"
                      stroke={netColor}
                      strokeWidth={1}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillDesktopFS" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-desktop)"
                    stopOpacity={1.0}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-desktop)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillMobileFS" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-mobile)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-mobile)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke={gridStrokeColor}
                strokeDasharray="3 3"
                opacity={0.3}
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) =>
                  formatDateForDisplay(String(value), "en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <Area
                dataKey="desktop"
                type="natural"
                fill="url(#fillDesktopFS)"
                stroke={incomeBorderColor}
                strokeWidth={1}
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-out"
              />
              <Area
                dataKey="mobile"
                type="natural"
                fill="url(#fillMobileFS)"
                stroke={expensesBorderColor}
                strokeWidth={1}
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ChartContainer>
              )
            )}
          </div>
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card relative gap-[20px]">
        {viewModeSwitcherControl ? (
          <ChartCardTopRightControl>{viewModeSwitcherControl}</ChartCardTopRightControl>
        ) : null}
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-0">
          <div className="flex items-center gap-2 min-w-0">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId={chartId}
              chartTitle={title}
              size="md"
            />
            <CardTitle className="truncate">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-0 sm:px-6 min-w-0 flex flex-col flex-1 min-h-0">
          <div ref={containerRef} className="relative flex-1 min-h-[180px]">
            {filteredData.length === 0 ? (
              <div className="flex h-full min-h-[180px] w-full items-center justify-center">
                <ChartLoadingState
                  isLoading={false}
                  skeletonType="area"
                  emptyTitle={
                    viewMode === "cumulative"
                      ? "No cumulative data for this view"
                      : "No data for this view"
                  }
                  emptyDescription="Try the other mode or adjust category filters."
                />
              </div>
            ) : (
            <div ref={chartContainerRef} className="h-full">
              {viewMode === "net" ? (
                <ChartContainer
                  config={netChartConfig}
                  className="aspect-auto h-full w-full min-w-0"
                >
                  <AreaChart data={useRealData ? (netData ?? []) : []}>
                    <defs>
                      <linearGradient id="fillNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={netColor} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={netColor} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke={gridStrokeColor}
                      strokeDasharray="3 3"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={(value) =>
                        formatDateForDisplay(String(value), "en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={4}
                      width={68}
                      tickFormatter={(v: number) => {
                        const abs = Math.abs(v)
                        const sign = v < 0 ? "-" : ""
                        if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`
                        return `${sign}$${abs.toFixed(0)}`
                      }}
                    />
                    <ReferenceLine
                      y={0}
                      stroke={gridStrokeColor}
                      strokeDasharray="4 4"
                      strokeOpacity={0.6}
                    />
                    <Tooltip
                      cursor={false}
                      content={(props: TooltipProps<number, string>) => {
                        const { active, payload, coordinate } = props
                        if (!active || !payload || !payload.length || !coordinate) {
                          queueMicrotask(() => {
                            setTooltip(null)
                            setTooltipPosition(null)
                          })
                          return null
                        }
                        const d = payload[0].payload
                        const date = d.date
                        const net = d.net ?? 0
                        if (containerRef.current && coordinate) {
                          const rect = containerRef.current.getBoundingClientRect()
                          const basePosition = mousePositionRef.current ?? {
                            x: rect.left + (coordinate.x ?? 0),
                            y: rect.top + (coordinate.y ?? 0),
                          }
                          queueMicrotask(() => {
                            setTooltipPosition(basePosition)
                            setTooltip({ date, income: 0, expenses: 0, net })
                          })
                        }
                        return null
                      }}
                    />
                    <Area
                      dataKey="net"
                      type="natural"
                      fill="url(#fillNet)"
                      stroke={netColor}
                      strokeWidth={1}
                      isAnimationActive={true}
                      animationBegin={0}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-full w-full min-w-0"
              >
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="fillDesktop"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-desktop)"
                        stopOpacity={1.0}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-desktop)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-mobile)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-mobile)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke={gridStrokeColor}
                    strokeDasharray="3 3"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tickFormatter={(value) => {
                      return formatDateForDisplay(String(value), "en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                  />
                  <Tooltip
                    cursor={false}
                    content={(props: TooltipProps<number, string>) => {
                      const { active, payload, coordinate } = props;

                      // Avoid calling setState while React is in the render phase.
                      // Recharts tooltip `content` sometimes runs during render,
                      // which can trigger "Cannot update a component while rendering"
                      // warnings if we call setTooltip / setTooltipPosition here.
                      if (
                        !active ||
                        !payload ||
                        !payload.length ||
                        !coordinate
                      ) {
                        queueMicrotask(() => {
                          setTooltip(null);
                          setTooltipPosition(null);
                        });
                        return null;
                      }

                      const data = payload[0].payload;
                      const date = data.date;
                      const income = data.desktop || 0;
                      const expenses = data.mobile || 0;

                      if (containerRef.current && coordinate) {
                        const rect = containerRef.current.getBoundingClientRect();
                        const basePosition = mousePositionRef.current ?? {
                          x: rect.left + (coordinate.x ?? 0),
                          y: rect.top + (coordinate.y ?? 0),
                        };
                        queueMicrotask(() => {
                          setTooltipPosition(basePosition);
                          setTooltip({ date, income, expenses });
                        });
                      }

                      return null;
                    }}
                  />
                  <Area
                    dataKey="desktop"
                    type="natural"
                    fill="url(#fillDesktop)"
                    stroke={incomeBorderColor}
                    strokeWidth={1}
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                  <Area
                    dataKey="mobile"
                    type="natural"
                    fill="url(#fillMobile)"
                    stroke={expensesBorderColor}
                    strokeWidth={1}
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ChartContainer>
              )}
            </div>
            )}
            {tooltip &&
              tooltipPosition &&
              typeof document !== "undefined" &&
              ReactDOM.createPortal(
                <div
                  ref={(el) => {
                    (tooltipRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                    // Cache dimensions after mount to avoid offsetWidth reads during render
                    if (el) {
                      tooltipSizeRef.current = { width: el.offsetWidth, height: el.offsetHeight };
                    }
                  }}
                  className="pointer-events-none fixed z-[9999] rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg"
                  style={(() => {
                    const cursorX = tooltipPosition.x ?? 0;
                    const cursorY = tooltipPosition.y ?? 0;
                    // Use cached dimensions — no offsetWidth reflow during render
                    const tooltipWidth = tooltipSizeRef.current.width;
                    const tooltipHeight = tooltipSizeRef.current.height;
                    const gap = 16;
                    const vw =
                      typeof window !== "undefined" ? window.innerWidth : 9999;
                    const vh =
                      typeof window !== "undefined" ? window.innerHeight : 9999;

                    // Horizontal: prefer right of cursor, flip left if it would overflow
                    const xRight = cursorX + gap;
                    const left =
                      xRight + tooltipWidth > vw
                        ? cursorX - tooltipWidth - gap
                        : xRight;

                    // Vertical: prefer above cursor, flip below if it would overflow above
                    const yAbove = cursorY - gap - tooltipHeight;
                    const top = yAbove < 0 ? cursorY + gap : yAbove;

                    return { left, top };
                  })()}
                >
                  <div className="font-medium text-foreground mb-2 whitespace-nowrap">
                    {formatDateForDisplay(tooltip.date, "en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  {tooltip.net !== undefined ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-border/50"
                        style={{ backgroundColor: netColor, borderColor: netColor }}
                      />
                      <span className="text-foreground/80">Net:</span>
                      <span className="font-mono text-[0.7rem] text-foreground font-medium">
                        {tooltip.net >= 0 ? "+" : ""}
                        {valueFormatter.format(tooltip.net)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-border/50"
                          style={{
                            backgroundColor: incomeBorderColor,
                            borderColor: incomeBorderColor,
                          }}
                        />
                        <span className="text-foreground/80">Income:</span>
                        <span className="font-mono text-[0.7rem] text-foreground font-medium">
                          {valueFormatter.format(tooltip.income)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-border/50"
                          style={{
                            backgroundColor: expensesBorderColor,
                            borderColor: expensesBorderColor,
                          }}
                        />
                        <span className="text-foreground/80">Expenses:</span>
                        <span className="font-mono text-[0.7rem] text-foreground font-medium">
                          {valueFormatter.format(tooltip.expenses)}
                        </span>
                      </div>
                    </>
                  )}
                </div>,
                document.body,
              )}
          </div>
        </CardContent>
        <AreaInfoAction
          title={title}
          chartId={chartId}
          categoryControls={categoryControls}
          filteredData={filteredData}
        />
      </Card>
    </>
  );
});

ChartAreaInteractive.displayName = "ChartAreaInteractive";
