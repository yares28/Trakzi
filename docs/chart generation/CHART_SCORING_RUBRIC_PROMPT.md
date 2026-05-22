You are scoring a Trakzi chart ideation batch.

Before scoring, inspect:
- `/Users/yares/Trakzi/docs/`
- `/Users/yares/Trakzi/docs/PAGES/ANALYTICS_CHARTS.md`
- `/Users/yares/Trakzi/docs/PAGES/FRIDGE_CHARTS.md`
- `/Users/yares/Trakzi/docs/CORE/NEON_DATABASE.md`
- `/Users/yares/Trakzi/docs/chart generation/EXISTING_CHART_COVERAGE_MEMORY.md`
- `/Users/yares/Trakzi/docs/chart generation/APPROVED_CHART_MEMORY.md`
- `/Users/yares/Trakzi/docs/chart generation/REJECTED_CHART_MEMORY.md`
- `/Users/yares/Trakzi/docs/chart generation/DOMAIN_EXTRACTABILITY_MAP.md`
- `/Users/yares/Trakzi/docs/chart generation/CROSS_FEATURE_JOIN_MAP.md`
- `/Users/yares/Trakzi/docs/chart generation/TESTCHARTS_PLAYGROUND_PROTOCOL.md`
- `/Users/yares/Trakzi/docs/chart generation/READY_TO_IMPORT_DELIVERY_STANDARD.md`
- `/Users/yares/Trakzi/docs/chart generation/MOCK_DATA_IDEATION_STANDARD.md`

Use those docs to judge whether ideas are:
- duplicate
- too similar to approved concepts
- too similar to rejected concepts
- too similar to existing charts
- weakly grounded in the current schema
- weakly grounded in realistic joins
- misaligned with real Challenge Group behavior
- too abstract to be ready-to-import when the user wants usable charts now
- weakly demonstrated because the mock data is generic or unhelpful

For each proposed chart, assign scores from **1 to 10** for:

1. `Usefulness`
2. `Originality`
3. `Clarity`
4. `Implementation Value`
5. `Non-Duplication Confidence`
6. `Schema Grounding`
7. `Join Realism` (for cross-feature charts; otherwise score based on domain realism)
8. `Import Readiness`
9. `Mock Data Quality`

Then compute:
- `Total Score` out of 90

For large runs:
- rank the full batch from highest to lowest `Total Score`
- use that ranking to decide what reaches `/testCharts`
- if the request was `100`, the default visible shortlist should be the top `50`

## Scoring guidance

- `Usefulness`
  Does this reveal information that matters and can affect decisions?

- `Originality`
  Is the analytical question fresh and not just a reworded old idea?

- `Clarity`
  Will users understand what it is telling them?

- `Implementation Value`
  Is it realistic and worth building?

- `Non-Duplication Confidence`
  How confident are you that this is not overlapping with existing, approved, or rejected concepts?

- `Schema Grounding`
  How well is this idea supported by the current tracked fields and tables?

- `Join Realism`
  How credible is the cross-feature relationship or domain logic needed to build it?

- `Import Readiness`
  Is this shaped enough to be implemented in `/testCharts` now and passed to a real page later?

- `Mock Data Quality`
  Does the chart use believable, chart-specific mock data that clearly reveals the intended insight?

## Output format

Return exactly 4 sections.

## 1. Score Table
Use columns:
- `Chart Title`
- `Usefulness`
- `Originality`
- `Clarity`
- `Implementation Value`
- `Non-Duplication Confidence`
- `Schema Grounding`
- `Join Realism`
- `Import Readiness`
- `Mock Data Quality`
- `Total Score`

## 2. Top Scorers
List the best charts in descending order.

## 3. Weakest Charts
List the lowest scorers and briefly explain why they are weak.

## 4. Recommended Cutoffs
State:
- which score range is implementation-worthy
- which score range needs revision
- which score range should be discarded

Be strict. A chart with a low non-duplication score should be treated as risky even if it is otherwise strong.
