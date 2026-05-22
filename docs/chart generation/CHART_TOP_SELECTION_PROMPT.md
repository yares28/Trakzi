You are choosing the best charts from a larger Trakzi ideation batch.

Before choosing, inspect:
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

Your job is to select the strongest charts for shortlist discussion.

Choose based on:
- usefulness
- originality
- implementation value
- clarity
- domain balance
- chart-type diversity
- non-duplication confidence
- schema grounding
- join realism
- import readiness
- mock-data quality

Reject charts that are:
- weaker versions of better ideas
- repetitive
- too grocery-heavy
- low-value
- vague
- too close to existing, approved, or rejected concepts
- weakly grounded in the schema
- dependent on shaky joins
- based on group-vs-group Challenge logic
- too prototype-heavy for real page use now
- weakly demonstrated by generic or unhelpful mock data

## Task

From the provided batch, choose the **best {Y} charts**.

Default shortlist rule:
- if the original request was `100`, choose the top `50` by score unless the user explicitly asks for a different shortlist size

## Output format

Return exactly 5 sections.

## 1. Selected Charts
List the chosen chart titles in ranked order.

## 2. Why These Won
For each selected chart, explain briefly why it survived.

## 3. Near Misses
List the charts that were close but did not make the cut.

## 4. Cut Reasons
Summarize the most common reasons other charts were not selected.

## 5. Shortlist Confidence
Give a one-line confidence verdict on whether the selected set is strong enough for implementation discussion.

Important:
- prefer distinct ideas over redundant ones
- prefer product value over novelty
- prefer implementation-worthy charts over clever but weak concepts
