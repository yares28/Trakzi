# Master Workflow

This file ties the full Trakzi chart ideation system into one repeatable workflow.

Use this when you want to go from:

1. new chart generation
2. strict review
3. revision
4. scoring
5. final picking
6. quality gate
7. `/testCharts` materialization
8. shortlist memory updates

---

## Files In This Workflow

- `EXISTING_CHART_COVERAGE_MEMORY.md`
- `APPROVED_CHART_MEMORY.md`
- `REJECTED_CHART_MEMORY.md`
- `DATABASE_EXTRACTION_CHECKLIST.md`
- `DOMAIN_EXTRACTABILITY_MAP.md`
- `CROSS_FEATURE_JOIN_MAP.md`
- `MEMORY_SYNC_PROTOCOL.md`
- `TESTCHARTS_PLAYGROUND_PROTOCOL.md`
- `READY_TO_IMPORT_DELIVERY_STANDARD.md`
- `MOCK_DATA_IDEATION_STANDARD.md`
- `ULTIMATE_CHART_GENERATION_PROMPT.md`
- `ONE_CLICK_PROMPT.md`
- `CHART_BATCH_REVIEW_PROMPT.md`
- `CHART_BATCH_REVISION_PROMPT.md`
- `QUICK_CHART_BATCH_REVIEW_PROMPT.md`
- `CHART_SCORING_RUBRIC_PROMPT.md`
- `CHART_TOP_SELECTION_PROMPT.md`
- `CHART_BATCH_QUALITY_GATE_PROMPT.md`

---

## Required Context Before Any Prompt Run

Every serious ideation or review pass should inspect:

- `/Users/yares/Trakzi/docs/CORE/NEON_DATABASE.md`
- `/Users/yares/Trakzi/docs/CORE/PROJECT_DEEP_DIVE.md`
- `DATABASE_EXTRACTION_CHECKLIST.md`
- `DOMAIN_EXTRACTABILITY_MAP.md`
- `CROSS_FEATURE_JOIN_MAP.md`
- `EXISTING_CHART_COVERAGE_MEMORY.md`
- `APPROVED_CHART_MEMORY.md`
- `REJECTED_CHART_MEMORY.md`
- `TESTCHARTS_PLAYGROUND_PROTOCOL.md`
- `READY_TO_IMPORT_DELIVERY_STANDARD.md`
- `MOCK_DATA_IDEATION_STANDARD.md`

Reason:
- the CORE docs reflect what the current database can actually support
- the memory docs prevent duplicate ideation across approved and discarded rounds
- the new extraction and join maps make cross-feature ideation much more realistic
- the playground protocol ensures the batch actually lands in `/testCharts`
- the delivery standard keeps the output closer to real importable page charts instead of prototype-only cards
- the mock-data standard keeps idea review focused on chart quality instead of current live transactions

---

## Recommended Process

### Step 1. Generate a New Batch

Use:
- `ULTIMATE_CHART_GENERATION_PROMPT.md`
- or `ONE_CLICK_PROMPT.md`

Goal:
- produce a high-quality candidate batch
- avoid duplicates
- respect approved and rejected concept memory
- stay grounded in the current database and extractable signals
- get a balanced set across domains, levels, and chart types
- prepare a batch that can be placed into `/testCharts`
- bias the batch toward ready-to-import chart cards, not concept stubs
- if the user asks for a large pool, generate the full pool first and then rank it by score
- if the user wants idea-review mode, use schema-shaped mock data instead of live APIs

Recommended:
- use this for serious ideation rounds
- replace `{X}` with the target number of charts

---

### Step 2. Audit the Batch Strictly

Use:
- `CHART_BATCH_REVIEW_PROMPT.md`

Goal:
- catch duplicates
- catch low-value ideas
- catch grocery bias
- catch repeated chart types
- catch weak domain spread
- separate keep / rework / remove

Recommended:
- use this after every important generation round

---

### Step 3. Revise the Batch

Use:
- `CHART_BATCH_REVISION_PROMPT.md`

Goal:
- repair the batch after review findings
- replace duplicates and weak ideas
- improve domain spread and chart-type diversity
- keep the strongest surviving concepts

Recommended:
- use this when the strict review finds meaningful issues

---

### Step 4. Quick Cleanup Pass

Use:
- `QUICK_CHART_BATCH_REVIEW_PROMPT.md`

Goal:
- do a faster review when you do not want the full long critique
- quickly identify the biggest problems in a batch

Recommended:
- use this for fast filtering
- use this after small revisions

---

### Step 5. Score the Survivors

Use:
- `CHART_SCORING_RUBRIC_PROMPT.md`

Goal:
- score each chart for:
  - usefulness
  - originality
  - clarity
  - implementation value
  - non-duplication confidence

Recommended:
- use this after weak ideas are already removed
- use it to compare strong candidates more objectively
- use it to rank the entire candidate pool before deciding what reaches `/testCharts`

---

### Step 6. Pick the Best Charts

Use:
- `CHART_TOP_SELECTION_PROMPT.md`

Goal:
- choose the best shortlist from a larger group
- identify which concepts deserve implementation discussion

Recommended:
- replace `{Y}` with the number of winners you want
- for large rounds, prefer selecting the top scored shortlist rather than materializing the entire raw pool

---

### Step 7. Run The Quality Gate

Use:
- `CHART_BATCH_QUALITY_GATE_PROMPT.md`

Goal:
- make a final pass/fail decision
- catch any remaining blocking issues
- stop weak batches from entering shortlist discussion

Recommended:
- use this before treating a batch as “ready”

---

### Step 8. Materialize The Batch In `/testCharts`

Use:
- `TESTCHARTS_PLAYGROUND_PROTOCOL.md`
- `/Users/yares/Trakzi/docs/CHARTS_CLONE_SPEC.md`
- `READY_TO_IMPORT_DELIVERY_STANDARD.md`
- `MOCK_DATA_IDEATION_STANDARD.md`

Goal:
- place the active candidate batch into `/testCharts`
- keep approved charts in `To Be Implemented`
- align the page doc with the visible playground state
- keep the batch close to real page importability
- default to schema-shaped mock data when the user wants to judge ideas rather than personal transactions

Large-batch default:
- if the user asks for `100` charts, generate and rank all `100`
- then materialize only the top `50` scored charts in `/testCharts`
- keep the full ranked set in the text output if helpful

Recommended:
- treat this as mandatory unless the user explicitly wants text ideation only

---

## Memory Rules After Selection

### If a chart is approved

- move it into `To Be Implemented`
- treat it as shortlisted
- do not propose it again as a new chart unless explicitly revisited

### If a chart is not chosen

- treat it as discarded
- add it to rejected / discarded concept memory
- do not propose it again unchanged

### If a discarded chart returns later

- it must be clearly upgraded
- it must not be only renamed
- it must have a materially better analytical question, framing, or usefulness

---

## Suggested Real Workflow

### Full workflow

1. Run `ULTIMATE_CHART_GENERATION_PROMPT.md`
2. Rank the full generated pool by score
3. Run `CHART_BATCH_REVIEW_PROMPT.md`
4. Run `CHART_BATCH_REVISION_PROMPT.md`
5. Run `CHART_SCORING_RUBRIC_PROMPT.md`
6. Run `CHART_TOP_SELECTION_PROMPT.md`
7. Run `CHART_BATCH_QUALITY_GATE_PROMPT.md`
8. Materialize the shortlisted batch in `/testCharts`
9. Move approved charts to `To Be Implemented`
10. Add unapproved charts to rejected / discarded memory using `MEMORY_SYNC_PROTOCOL.md`

### Faster workflow

1. Run `ULTIMATE_CHART_GENERATION_PROMPT.md`
2. Run `QUICK_CHART_BATCH_REVIEW_PROMPT.md`
3. If needed, run `CHART_BATCH_REVISION_PROMPT.md`
4. Run `CHART_TOP_SELECTION_PROMPT.md`
5. Run `CHART_BATCH_QUALITY_GATE_PROMPT.md`
6. Materialize the batch in `/testCharts`
7. Update approved / discarded memory

---

## Best Practices

- Prefer fewer strong charts over many average ones
- Do not accept visually different charts that ask the same question
- Do not let grocery dominate unless the round is specifically fridge-focused
- Prefer charts that reveal decisions, pressure, tradeoffs, or progress
- Prefer implementation-worthy charts over novelty
- Use the docs as hard memory, not soft inspiration
- Use the CORE database docs as a realism gate before accepting cross-feature ideas
- Use the domain extractability map to avoid proposing charts for data that does not really exist
- Use the cross-feature join map to avoid fake or weak cross-domain combinations
- Treat Challenge Groups as member-vs-member leaderboard systems, not group-vs-group battles
- Treat Pockets as separate subdomains by default: Travel, Vehicles, Housing, and Other
- Prefer ready-to-import charts over prototype-only concepts when the user wants charts usable now
- Prefer full clone-spec card rendering over lightweight playground styling when the user wants charts usable now
- Prefer schema-shaped mock data in `/testCharts` when the user wants idealized chart review rather than live data

---

## Notes

- The source of truth for workflow memory now lives in:
  - `APPROVED_CHART_MEMORY.md`
  - `REJECTED_CHART_MEMORY.md`
  - `EXISTING_CHART_COVERAGE_MEMORY.md`
- The source of truth for extraction realism now also includes:
  - `DATABASE_EXTRACTION_CHECKLIST.md`
  - `DOMAIN_EXTRACTABILITY_MAP.md`
  - `CROSS_FEATURE_JOIN_MAP.md`
- The source of truth for post-round memory maintenance now includes:
  - `MEMORY_SYNC_PROTOCOL.md`
- The source of truth for `/testCharts` review-surface behavior now includes:
  - `TESTCHARTS_PLAYGROUND_PROTOCOL.md`
- The source of truth for ready-to-import delivery behavior now includes:
  - `READY_TO_IMPORT_DELIVERY_STANDARD.md`
- The source of truth for mock-data idea-review behavior now includes:
  - `MOCK_DATA_IDEATION_STANDARD.md`
- `CHART_IDEA_GENERATOR_PROMPT.md` should stay aligned with those files
- The source of truth for current `/testCharts` shortlist state remains:
  - `/Users/yares/Trakzi/docs/PAGES/TEST_CHARTS.md`
