# Test Charts Page

This document tracks the current `/testCharts` implementation surface.

> **IMPORTANT:** When the approved queue, chart renderer, or test-chart page wiring changes, update this file.

The page now behaves as a production-style review surface for both any live ideation shortlist and the saved `To Be Implemented` chart backlog rather than a lightweight prototype playground.

---

## Overview

| Section | Chart Count | Description |
|---------|-------------|-------------|
| Active Shortlist | 0 | The latest April 1 shortlist has been resolved and cleared from the live review queue |
| Approved Analytics | 22 | Approved transaction-first analytics cards |
| Approved Fridge | 21 | Approved receipt and grocery cards, including `Store Price Floor Reliability` and `Store Visit Mission Drift` |
| Approved Savings | 29 | Approved balance, reserve, and runway cards, including `Paycheck-to-Paycheck Carry Ratio`, `Cushion Depth vs Essential Median`, and `Low-Balance Rescue Source Mix` |
| Approved Debt | 2 | Approved debt burden cards, including `Debt Ticket Drift by Stream` |
| Approved Goals | 4 | Approved goal feasibility and pressure cards |
| Approved Pockets | 1 | Approved pocket burden card |
| Approved Challenges | 1 | Approved challenge leaderboard card |
| Approved Cross-Feature | 1 | Approved joined-system card |
| **Visible Total** | **81** | Implementation queue only while the review queue is empty |

---

## Current Page Behavior

- `/testCharts` renders a top-level switch between `To Be Approved` and `To Be Implemented` through `TestChartsIdeaPlayground`
- The active review queue is currently empty because the latest shortlist has already been resolved
- `Store Visit Mission Drift`, `Low-Balance Rescue Source Mix`, and `Debt Ticket Drift by Stream` were promoted into `To Be Implemented`
- The rest of the April 1 live shortlist was discarded and recorded in rejected memory so it does not return unchanged
- The older approved queue stays separated from the active shortlist and continues to render as full clone-spec review cards
- All visible charts are displayed as full production clone-spec cards in seeded mock-data mode, not prototype-only cards
- The implementation queue continues to use explicit chart-specific scenario overrides in `components/test-charts/review-mock-data.ts` so cards remain reviewable without touching live user transactions
- Common chart types now render with the same library family used elsewhere in Trakzi:
  - line and trend charts use `@nivo/line`
  - bar, grouped-bar, and stacked-bar charts use `@nivo/bar`
  - pie / gauge-style radial charts use `@nivo/pie`
  - treemaps use `@nivo/treemap`
  - funnels use `@nivo/funnel`
  - sankeys use `@nivo/sankey`
  - heatmaps use `@nivo/heatmap`
  - radar-style multi-axis cards use `@nivo/radar`
  - scatter charts use `recharts`
- Special chart shapes that do not map cleanly to an existing Trakzi library chart remain custom-built inside the production card shell.

---

## Key Files

| File | Purpose |
|------|---------|
| `app/testCharts/page.tsx` | Main page shell for the test-chart review surface |
| `app/api/test-charts/idea-lab/route.ts` | Live review manifest plus `To Be Implemented` payload |
| `components/test-charts/idea-playground.tsx` | Builds the review and implementation queue tabs |
| `components/test-charts/production-playground-chart-card.tsx` | Production-shell renderer for clone-spec queue cards |
| `components/test-charts/review-mock-data.ts` | Deterministic seeded mock data for empty review scenarios |
| `components/test-charts/one-click-playground-catalog.ts` | One-click approved card modeling and visual definitions |
| `components/test-charts/idea-playground-catalog.ts` | Legacy approved analytics / fridge / savings card modeling |
| `components/test-charts/chart-merchant-budget-miss-map.tsx` | Dedicated full card implementation used in the queue |
| `components/test-charts/chart-store-price-dispersion-index.tsx` | Dedicated full card implementation used in the queue |

---

## Data Sources

The current `/testCharts` page is driven by the idea-lab payload:

1. **Idea Lab API**: `/api/test-charts/idea-lab`
   - reads the ranked April 1 manifest archive from `docs/chart generation/2026-04-01-one-click-100-charts-round-3.md`
   - currently returns an empty live manifest because that shortlist has been resolved
   - resolves the `To Be Implemented` queue from approved chart memory plus selected archived ideation picks
   - provides empty base bundles for page-safe generation
   - relies on deterministic seeded mock review data, with explicit scenario overrides for the approved cards, so charts render as believable review surfaces without touching live user data

2. **Approved chart memory**
   - source file: `docs/chart generation/APPROVED_CHART_MEMORY.md`
   - defines the approved set that belongs in `To Be Implemented`

3. **Rejected chart memory**
   - source file: `docs/chart generation/REJECTED_CHART_MEMORY.md`
   - records the discarded April 1 shortlist concepts so they do not return unchanged

4. **Active ranked run archive**
   - source file: `docs/chart generation/2026-04-01-one-click-100-charts-round-3.md`
   - preserves the ranked 100-idea pool and the now-resolved top-20 shortlist from that round

---

## Page Structure

```text
testCharts/page.tsx
└── TestChartsIdeaPlayground
    ├── Production batch summary
    ├── To Be Approved
    │   ├── analytics
    │   ├── fridge
    │   ├── savings
    │   ├── debt
    │   ├── goals
    │   ├── pockets
    │   ├── friendRooms
    │   ├── challenges
    │   └── crossFeature
    └── To Be Implemented
        ├── approved-analytics
        ├── approved-fridge
        ├── approved-savings
        ├── selected-debt
        ├── selected-goals
        ├── selected-pockets
        ├── selected-challenges
        └── selected-crossFeature
```

---

## Promoting Charts to Production

When a test chart is ready for production:

1. Move the implementation into the target production page or shared chart component set.
2. Keep the chart in clone-spec card structure.
3. Replace any seeded review mock state with the real bundle/API path for that page.
4. Remove or demote it from the `/testCharts` review queue when appropriate.
5. Update this file and the destination page documentation.

---

## Adding More Approved Test Charts

1. Add or promote the chart concept in the ideation docs.
2. Ensure the idea-lab route exposes that chart through either the active manifest or the approved manifest.
3. Extend the production review renderer in `components/test-charts/production-playground-chart-card.tsx` if the visual kind needs new chart support.
4. Add an explicit scenario override in `components/test-charts/review-mock-data.ts` when the live shortlist needs chart-specific mock storytelling.
5. Prefer the same chart-library mapping already used on the page before inventing a new rendering path.
6. Update this document with the new section counts or behavior changes.
