# Chart Generation Prompt Kit

This folder contains the reusable prompt set for Trakzi chart ideation.

## Best Entry Points

- Fastest strong default:
  - `ONE_CLICK_PROMPT.md`
- Best manual generation prompt:
  - `ULTIMATE_CHART_GENERATION_PROMPT.md`
- Best full process guide:
  - `MASTER_WORKFLOW.md`

## Files

- `EXISTING_CHART_COVERAGE_MEMORY.md`
  Summary memory of concept families already covered in the product.

- `APPROVED_CHART_MEMORY.md`
  Dedicated memory file for approved / `To Be Implemented` chart concepts.

- `REJECTED_CHART_MEMORY.md`
  Dedicated memory file for discarded / rejected chart concepts.

- `DATABASE_EXTRACTION_CHECKLIST.md`
  Required schema-grounding checklist using the live database docs in `/docs/CORE`.

- `DOMAIN_EXTRACTABILITY_MAP.md`
  Domain-by-domain map of what Trakzi can realistically chart from the current database and backend shape.

- `CROSS_FEATURE_JOIN_MAP.md`
  Cross-feature feasibility map for realistic joins between domains.

- `MEMORY_SYNC_PROTOCOL.md`
  Rules for keeping approved/rejected memory aligned after every ideation round.

- `TESTCHARTS_PLAYGROUND_PROTOCOL.md`
  Rules for turning ideation output into the actual `/testCharts` playground and keeping it aligned with `CHARTS_CLONE_SPEC.md`.

- `READY_TO_IMPORT_DELIVERY_STANDARD.md`
  Delivery standard for charts that should be usable now and passable to real pages, not just prototype-only concepts.

- `MOCK_DATA_IDEATION_STANDARD.md`
  Rules for using idealized, schema-shaped mock data in `/testCharts` so chart ideas are judged on their intended value rather than current user transactions.

- `ULTIMATE_CHART_GENERATION_PROMPT.md`
  The strongest long-form generation prompt. Use this for serious ideation rounds.

- `ONE_CLICK_PROMPT.md`
  Single best default prompt that tells the model exactly what to read and how to run the workflow.

- `CHART_BATCH_REVIEW_PROMPT.md`
  A strict reviewer prompt for auditing a generated batch.

- `CHART_BATCH_REVISION_PROMPT.md`
  A formal revision prompt for repairing a weak batch after review.

- `QUICK_CHART_BATCH_REVIEW_PROMPT.md`
  A shorter review prompt for fast filtering.

- `CHART_SCORING_RUBRIC_PROMPT.md`
  Scores each proposed chart for usefulness, originality, clarity, and implementation value.

- `CHART_TOP_SELECTION_PROMPT.md`
  Chooses the best charts from a larger batch and explains why they survive.

- `CHART_BATCH_QUALITY_GATE_PROMPT.md`
  Final pass/fail acceptance gate for a batch after review, revision, scoring, and selection.

## Suggested workflow

1. Generate a batch with `ULTIMATE_CHART_GENERATION_PROMPT.md` or `ONE_CLICK_PROMPT.md`
2. Rank the full batch by score
3. Audit it with `CHART_BATCH_REVIEW_PROMPT.md`
4. Revise it with `CHART_BATCH_REVISION_PROMPT.md` if needed
5. If needed, run `QUICK_CHART_BATCH_REVIEW_PROMPT.md` for fast cleanup
6. Score survivors with `CHART_SCORING_RUBRIC_PROMPT.md`
7. Pick the final shortlist with `CHART_TOP_SELECTION_PROMPT.md`
8. Run `CHART_BATCH_QUALITY_GATE_PROMPT.md`
9. Materialize the active batch in `/testCharts` using `TESTCHARTS_PLAYGROUND_PROTOCOL.md`
10. Use `READY_TO_IMPORT_DELIVERY_STANDARD.md` to keep the batch page-ready
11. Use `MOCK_DATA_IDEATION_STANDARD.md` when the user wants idea-review mode with ideal transactions
12. Update memory using `MEMORY_SYNC_PROTOCOL.md`

## Large-batch rule

If the user asks for a large batch such as `100` charts:
- generate and rank all `100` ideas
- keep the full ranked list in the response
- materialize only the strongest `50` ideas into `/testCharts`
- treat the visible `/testCharts` set as the shortlist layer, not the full raw pool

## Memory rule

- Charts the user approves should move to `To Be Implemented`
- Charts the user rejects should be treated as discarded
- Discarded charts should not come back unchanged
- Any revisited discarded chart must be clearly upgraded
- All ideation and review passes should inspect `/Users/yares/Trakzi/docs/CORE/NEON_DATABASE.md` and `/Users/yares/Trakzi/docs/CORE/PROJECT_DEEP_DIVE.md` so chart ideas stay grounded in the current database
- Use `DOMAIN_EXTRACTABILITY_MAP.md` and `CROSS_FEATURE_JOIN_MAP.md` before proposing ambitious cross-feature charts
- Use `TESTCHARTS_PLAYGROUND_PROTOCOL.md` whenever the task is to create a live review round in `/testCharts`
- Use `READY_TO_IMPORT_DELIVERY_STANDARD.md` whenever the user wants charts they can use on real pages now
- When the user wants importable charts now, default to full clone-spec card style rather than lightweight playground styling
- When the user wants to judge chart ideas instead of real transactions, default `/testCharts` to chart-specific mock data
- Use `MEMORY_SYNC_PROTOCOL.md` after every decision round so the system stays aligned
