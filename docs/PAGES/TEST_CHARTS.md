# Test Charts Page

This document tracks the current `/testCharts` implementation surface.

> **IMPORTANT:** When the approved queue, chart renderer, feature lab, or test-chart page wiring changes, update this file.

The page now behaves as a split test lab:

- `Charts` mode now has its own `To Be Approved`, `To Be Implemented`, and `Prompt Walkthrough` surfaces for chart ideation, implementation memory, and workflow discipline
- `Features` mode now has its own `To Be Approved`, `To Be Implemented`, and `Prompt Walkthrough` surfaces backed by feature memory docs and a dedicated feature-lab API

---

## Overview

| Section                      | Chart Count | Description                                                                                                                                                         |
| ---------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surface Switch               | 2 modes     | Top-level `Charts` / `Features` switch for moving between chart review and feature ideation                                                                         |
| Active Shortlist             | 0           | The current feature round has been resolved, so no active review shortlist remains in `To Be Approved`                                                              |
| Chart Prompt Walkthrough     | 1           | Chart workflow docs, memory paths, surface map, and copy-ready generation plus cleanup prompts                                                                      |
| Approved Analytics           | 22          | Approved transaction-first analytics cards                                                                                                                          |
| Approved Fridge              | 21          | Approved receipt and grocery cards, including `Store Price Floor Reliability` and `Store Visit Mission Drift`                                                       |
| Approved Savings             | 29          | Approved balance, reserve, and runway cards, including `Paycheck-to-Paycheck Carry Ratio`, `Cushion Depth vs Essential Median`, and `Low-Balance Rescue Source Mix` |
| Approved Debt                | 2           | Approved debt burden cards, including `Debt Ticket Drift by Stream`                                                                                                 |
| Approved Goals               | 4           | Approved goal feasibility and pressure cards                                                                                                                        |
| Approved Pockets             | 1           | Approved pocket burden card                                                                                                                                         |
| Approved Challenges          | 1           | Approved challenge leaderboard card                                                                                                                                 |
| Approved Cross-Feature       | 1           | Approved joined-system card                                                                                                                                         |
| Feature Review Queue         | 0           | No active feature review concepts remain in `To Be Approved` for the current round                                                                                  |
| Feature Implementation Queue | 6           | Approved feature concepts promoted from the resolved round now live in `To Be Implemented`                                                                          |
| Feature Prompt Walkthrough   | 1           | Whole-app product-surface map plus copy-ready generation and cleanup prompts                                                                                        |
| **Visible Total**            | **88**      | Approved chart queues, the approved feature implementation queue, and both prompt walkthrough surfaces                                                              |

---

## Current Page Behavior

- `/testCharts` now renders a top-level switch between `Charts` and `Features`
- `/testCharts` chart mode now renders a second-level switch between `To Be Approved`, `To Be Implemented`, and `Prompt Walkthrough` through `TestChartsIdeaPlayground`
- `Features` mode no longer has active review cards in `To Be Approved` because the current feature round has been resolved
- The six selected survivors from the resolved round now live in `To Be Implemented`
- `Store Visit Mission Drift`, `Low-Balance Rescue Source Mix`, and `Debt Ticket Drift by Stream` were promoted into `To Be Implemented`
- The rest of the April 1 live shortlist was discarded and recorded in rejected memory so it does not return unchanged
- The older approved queue stays separated from the active shortlist and continues to render as full clone-spec review cards
- All visible charts are displayed as full production clone-spec cards in seeded mock-data mode, not prototype-only cards
- The implementation queue continues to use explicit chart-specific scenario overrides in `components/test-charts/review-mock-data.ts` so cards remain reviewable without touching live user transactions
- `Charts` mode exposes:
  - `Prompt Walkthrough` for chart memory, review/scoring/selection docs, domain map, and the copy-ready generation and cleanup prompts
  - persistent chart-tab state so the last-used chart surface can be resumed
  - explicit approved/rejected memory paths when the review queue is empty, making queue state easier to reason about
- `Features` mode exposes:
  - `To Be Approved` for the active feature shortlist when a feature round is still under review
  - `To Be Implemented` for approved feature concepts persisted in feature memory
  - `Prompt Walkthrough` for product-surface memory, review/scoring docs, and the whole-app generation and cleanup prompts
  - the current mapped Trakzi page and feature surface, including marketing, in-app, detail, and system layers
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

| File                                                              | Purpose                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| `app/testCharts/page.tsx`                                         | Main page shell for the test-chart review surface                   |
| `components/test-charts/test-lab-workbench.tsx`                   | Top-level `Charts` / `Features` switcher                            |
| `app/api/test-charts/idea-lab/route.ts`                           | Live review manifest plus `To Be Implemented` payload               |
| `app/api/test-charts/feature-lab/route.ts`                        | Active feature shortlist plus approved feature queue payload        |
| `components/test-charts/idea-playground.tsx`                      | Builds the review and implementation queue tabs                     |
| `components/test-charts/chart-lab-content.ts`                     | Chart prompt paths, workflow docs, surface map, and chart-lab rules |
| `components/test-charts/feature-idea-playground.tsx`              | Feature ideation surface for `/testCharts`                          |
| `components/test-charts/feature-lab-content.ts`                   | Product-surface map, prompt paths, and feature-lab metadata         |
| `components/test-charts/production-playground-chart-card.tsx`     | Production-shell renderer for clone-spec queue cards                |
| `components/test-charts/review-mock-data.ts`                      | Deterministic seeded mock data for empty review scenarios           |
| `components/test-charts/one-click-playground-catalog.ts`          | One-click approved card modeling and visual definitions             |
| `components/test-charts/idea-playground-catalog.ts`               | Legacy approved analytics / fridge / savings card modeling          |
| `components/test-charts/chart-merchant-budget-miss-map.tsx`       | Dedicated full card implementation used in the queue                |
| `components/test-charts/chart-store-price-dispersion-index.tsx`   | Dedicated full card implementation used in the queue                |
| `docs/feature generation/PRODUCT_SURFACE_MEMORY.md`               | Full app page-and-feature inventory for feature ideation            |
| `docs/feature generation/ONE_CLICK_FEATURE_PROMPT.md`             | Copy-ready feature ideation prompt shown in `Features` mode         |
| `docs/feature generation/SHORTLIST_RESOLUTION_PROMPT.md`          | Copy-ready feature cleanup and shortlist-resolution prompt          |
| `docs/feature generation/ULTIMATE_FEATURE_GENERATION_PROMPT.md`   | Deep feature ideation prompt used by the one-click wrapper          |
| `docs/feature generation/APPROVED_FEATURE_MEMORY.md`              | Approved feature concepts that should not be re-proposed unchanged  |
| `docs/feature generation/REJECTED_FEATURE_MEMORY.md`              | Rejected feature concepts that should not return unchanged          |
| `docs/feature generation/FEATURE_SHORTLIST_REVIEW_PROMPT.md`      | Strict review prompt for feature batches                            |
| `docs/feature generation/FEATURE_SCORING_RUBRIC_PROMPT.md`        | Scoring prompt for feature batches                                  |
| `docs/feature generation/2026-04-02-feature-shortlist-round-1.md` | Active feature shortlist backing `To Be Approved`                   |

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

5. **Chart workflow memory and prompt docs**
   - source files:
     - `docs/chart generation/ONE_CLICK_PROMPT.md`
     - `docs/chart generation/SHORTLIST_RESOLUTION_PROMPT.md`
     - `docs/chart generation/MASTER_WORKFLOW.md`
     - `docs/chart generation/CHART_BATCH_REVIEW_PROMPT.md`
     - `docs/chart generation/CHART_BATCH_REVISION_PROMPT.md`
     - `docs/chart generation/CHART_SCORING_RUBRIC_PROMPT.md`
     - `docs/chart generation/CHART_TOP_SELECTION_PROMPT.md`
     - `docs/chart generation/CHART_BATCH_QUALITY_GATE_PROMPT.md`
     - `docs/chart generation/EXISTING_CHART_COVERAGE_MEMORY.md`
     - `docs/chart generation/DATABASE_EXTRACTION_CHECKLIST.md`
     - `docs/chart generation/DOMAIN_EXTRACTABILITY_MAP.md`
     - `docs/chart generation/CROSS_FEATURE_JOIN_MAP.md`
     - `docs/chart generation/TESTCHARTS_PLAYGROUND_PROTOCOL.md`
     - `docs/chart generation/READY_TO_IMPORT_DELIVERY_STANDARD.md`
     - `docs/chart generation/MOCK_DATA_IDEATION_STANDARD.md`
   - these now back the chart-mode `Prompt Walkthrough` inside `/testCharts`

6. **Feature idea lab API**: `/api/test-charts/feature-lab`
   - reads the active feature shortlist from `docs/feature generation/2026-04-02-feature-shortlist-round-1.md`
   - that file is now a resolved-shortlist record, so `To Be Approved` stays empty until a new round is generated
   - reads the approved feature queue from `docs/feature generation/APPROVED_FEATURE_MEMORY.md`
   - currently returns the six approved survivors for feature-mode `To Be Implemented`

7. **Feature workflow memory**
   - source files:
     - `docs/feature generation/PRODUCT_SURFACE_MEMORY.md`
     - `docs/feature generation/APPROVED_FEATURE_MEMORY.md`
     - `docs/feature generation/REJECTED_FEATURE_MEMORY.md`
     - `docs/feature generation/SHORTLIST_RESOLUTION_PROMPT.md`
     - `docs/feature generation/FEATURE_SHORTLIST_REVIEW_PROMPT.md`
     - `docs/feature generation/FEATURE_SCORING_RUBRIC_PROMPT.md`
   - defines whole-app coverage, approved memory, rejected memory, review rules, and scoring rules for feature ideation

---

## Page Structure

```text
testCharts/page.tsx
└── TestLabWorkbench
    ├── Surface switch
    ├── Charts
    │   └── TestChartsIdeaPlayground
    │       ├── Production batch summary
    │       ├── To Be Approved
    │       │   ├── analytics
    │       │   ├── fridge
    │       │   ├── savings
    │       │   ├── debt
    │       │   ├── goals
    │       │   ├── pockets
    │       │   ├── friendRooms
    │       │   ├── challenges
    │       │   └── crossFeature
    │       ├── To Be Implemented
    │       │   ├── approved-analytics
    │       │   ├── approved-fridge
    │       │   ├── approved-savings
    │       │   ├── selected-debt
    │       │   ├── selected-goals
    │       │   ├── selected-pockets
    │       │   ├── selected-challenges
    │       │   └── selected-crossFeature
    │       └── Prompt Walkthrough
    │           ├── Strategy lanes
    │           ├── Chart surface map
    │           ├── Workflow docs
    │           ├── Generation prompt
    │           └── Cleanup prompt
    └── Features
        └── FeatureIdeaPlayground
            ├── Feature lab summary
            ├── To Be Approved
            │   ├── Capture
            │   ├── Marketing
            │   ├── Home
            │   ├── Analytics
            │   ├── Fridge
            │   ├── Savings
            │   ├── Pockets
            │   ├── Friends
            │   ├── Rooms
            │   ├── Challenges
            │   ├── AI Chat
            │   ├── Data Library
            │   └── System
            ├── To Be Implemented
            │   ├── System
            │   ├── Home
            │   ├── Analytics
            │   ├── Fridge
            │   ├── Savings
            │   ├── Pockets
            │   ├── Rooms
            │   ├── Challenges
            │   ├── AI Chat
            │   └── Marketing
            └── Prompt Walkthrough
                ├── Strategy lanes
                ├── Full app surface map
                ├── Generation prompt
                ├── Cleanup prompt
                └── Workflow docs
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
