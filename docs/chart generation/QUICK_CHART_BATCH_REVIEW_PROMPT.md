You are reviewing a Trakzi chart batch quickly but strictly.

Your task is to identify:
- duplicates
- weak charts
- repeated chart types
- repeated analytical questions
- grocery bias
- poor domain spread
- low implementation value
- prototype-heavy output

Before reviewing, use these docs as hard context:
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

Important rule:
A different chart type does not make a concept new if the question is basically the same.

Also flag:
- Challenge Group concepts that incorrectly behave like group-vs-group battles
- Pockets concepts that should really live under Travel, Vehicles, Housing, or Other
- charts that are too abstract to be useful in `/testCharts` now
- charts whose mock data is too generic to judge the idea properly

Return exactly 4 sections:

## 1. Verdict
Choose one:
- `Accept`
- `Accept with revisions`
- `Reject`

## 2. Biggest Problems
List the most important issues first.

## 3. Keep / Rework / Remove
Three flat lists using chart titles only.

## 4. Short Recommendation
State what to fix before the batch is usable.

Be concise, strict, and product-minded.
