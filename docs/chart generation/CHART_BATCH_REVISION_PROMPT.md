You are revising a Trakzi chart ideation batch after review feedback.

Your job is to improve the batch, not just comment on it.

You will receive:
- the original batch
- review findings
- optionally scoring results

Your task is to produce a **better revised batch** that:
- removes duplicates
- removes weak charts
- improves vague charts
- replaces low-value ideas
- increases domain balance
- increases chart-type diversity
- reduces grocery bias when needed
- respects approved / rejected memory
- stays grounded in the current database and schema
- moves the batch closer to ready-to-import `/testCharts` delivery

---

# Required context to inspect first

Before revising, inspect:
- `/Users/yares/Trakzi/docs/`
- `/Users/yares/Trakzi/docs/PAGES/ANALYTICS_CHARTS.md`
- `/Users/yares/Trakzi/docs/PAGES/FRIDGE_CHARTS.md`
- `/Users/yares/Trakzi/docs/CORE/NEON_DATABASE.md`
- `/Users/yares/Trakzi/docs/CORE/PROJECT_DEEP_DIVE.md`
- `/Users/yares/Trakzi/docs/chart generation/EXISTING_CHART_COVERAGE_MEMORY.md`
- `/Users/yares/Trakzi/docs/chart generation/APPROVED_CHART_MEMORY.md`
- `/Users/yares/Trakzi/docs/chart generation/REJECTED_CHART_MEMORY.md`
- `/Users/yares/Trakzi/docs/chart generation/DATABASE_EXTRACTION_CHECKLIST.md`
- `/Users/yares/Trakzi/docs/chart generation/DOMAIN_EXTRACTABILITY_MAP.md`
- `/Users/yares/Trakzi/docs/chart generation/CROSS_FEATURE_JOIN_MAP.md`
- `/Users/yares/Trakzi/docs/chart generation/TESTCHARTS_PLAYGROUND_PROTOCOL.md`
- `/Users/yares/Trakzi/docs/chart generation/READY_TO_IMPORT_DELIVERY_STANDARD.md`
- `/Users/yares/Trakzi/docs/chart generation/MOCK_DATA_IDEATION_STANDARD.md`

---

# Revision rules

1. Remove any chart that is clearly duplicate or too close to existing memory.
2. Rewrite any chart that is promising but weak.
3. Replace any chart that is low-value, vague, or repetitive.
4. Do not keep a chart just because it was in the original batch.
5. Preserve strong charts when they are genuinely distinct and useful.
6. Use the database/schema context to avoid unrealistic concepts.
7. A discarded chart must not return unchanged.
8. Fix any challenge concept that incorrectly behaves like group-vs-group competition.
9. Split Pockets concepts into Travel, Vehicles, Housing, or Other when the idea is really subdomain-specific.
10. Replace prototype-heavy concepts with ready-to-import chart candidates when possible.
11. If the round is in idea-review mode, replace weak live-data or generic-data usage with believable chart-specific mock data.

---

# What counts as a valid revision

A valid revision should improve one or more of:
- analytical distinctness
- usefulness
- implementation clarity
- domain balance
- level balance
- chart-type diversity
- schema realism
- importability
- mock-data quality

Rename-only revisions are not valid.

---

# Output format

Return exactly 4 sections.

## 1. Revised Batch

Return the revised chart table with columns:
- `Chart Title`
- `Page / Domain`
- `Level`
- `Chart Type`
- `Core Question`
- `Why It Matters`
- `Primary Data Needed`
- `Cross-Feature?`
- `Why It Is Original / Not A Duplicate`
- `Import Readiness`

## 2. Kept

List the chart titles that survived with little or no change.

## 3. Reworked / Replaced

For each changed chart, explain:
- what was wrong before
- what changed
- why the new version is stronger

## 4. Final Quality Check

Briefly confirm whether the revised batch now has:
- acceptable non-duplication
- better chart-type diversity
- better domain spread
- acceptable product value
- acceptable schema grounding
- better import readiness
- better mock-data quality when the batch is meant for idea review

Be strict and improve the batch meaningfully.
