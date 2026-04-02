"use client";

/**
 * Temporary debug page — no auth, renders ChartAreaInteractive with controlled mock data.
 * Delete after debugging is done.
 */
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { ThemeProvider } from "@/components/theme-provider";
import { ColorSchemeProvider } from "@/components/color-scheme-provider";
import { CurrencyProvider } from "@/components/currency-provider";

// Scenario: get paid day 1, then expenses pile up throughout the month
// Income on day 1: $2000. Expenses ~$100/day for 20 days.
// Match real bundle convention: mobile (expense) is NEGATIVE
const basicData = Array.from({ length: 20 }, (_, i) => {
  const day = String(i + 1).padStart(2, "0");
  return {
    date: `2024-01-${day}`,
    desktop: i === 0 ? 2000 : 0,   // income: only on day 1 (positive)
    mobile: i === 0 ? 0 : -100,    // expense: -$100/day after day 1 (negative, per bundle convention)
  };
});

// Cumulative: wallet balance = cumIncome - cumExpenses
// Day 1: income $2000, expense $0 → balance = +2000
// Day 2: income $0, expense $100 → balance = +1900
// ...balance decreases as expenses accumulate, spikes back up on income days
const cumulativeData = (() => {
  let running = 0;
  return basicData.map(d => {
    const dayIncome = d.desktop || 0;
    const dayExpenses = Math.abs(d.mobile || 0);
    running = Math.round((running + dayIncome - dayExpenses) * 100) / 100;
    return { date: d.date, desktop: d.desktop, mobile: running };
  });
})();

// Weekly net data
const netData = [
  { date: "2024-01-01", net: -1900 },
  { date: "2024-01-08", net: -1200 },
  { date: "2024-01-15", net: -500 },
];

export default function DebugChartPage() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
    <ColorSchemeProvider>
      <CurrencyProvider>
        <div className="p-8 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Debug: Cumulative Chart</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Day 1: $2000 income. Days 2–20: $100/day expenses.<br />
            Expected: Balance spikes to +$2000 on day 1, then drops $100/day. Income line spikes on payday.
          </p>
          <div className="mb-4 p-3 bg-muted rounded text-xs font-mono">
            <div>Day 1 (income $2000): balance = {cumulativeData[0]?.mobile}</div>
            <div>Day 2 (expense $100): balance = {cumulativeData[1]?.mobile}</div>
            <div>Day 5 (expense $100): balance = {cumulativeData[4]?.mobile}</div>
            <div>Day 10 (expense $100): balance = {cumulativeData[9]?.mobile}</div>
          </div>
          <ChartAreaInteractive
            chartId="incomeExpensesTracking2"
            title="Income & Expenses (debug)"
            data={basicData}
            cumulativeData={cumulativeData}
            netData={netData}
          />
        </div>
      </CurrencyProvider>
    </ColorSchemeProvider>
    </ThemeProvider>
  );
}
