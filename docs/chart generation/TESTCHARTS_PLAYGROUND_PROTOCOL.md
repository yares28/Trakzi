# Test Charts Playground Protocol

This file defines how chart ideation output should be materialized into the `/testCharts` playground.

The core rule is simple:

- ideation is not complete until the current candidate batch is represented in `/testCharts`
- all `/testCharts` chart implementations must follow `CHARTS_CLONE_SPEC.md`
- the batch should be shaped as ready-to-import Trakzi charts, not loose prototypes
- the default render mode is full production clone-spec card style, not the lightweight playground / prototype style

Primary implementation references:
- `/Users/yares/Trakzi/docs/CHARTS_CLONE_SPEC.md`
- `/Users/yares/Trakzi/docs/PAGES/TEST_CHARTS.md`
- `/Users/yares/Trakzi/docs/chart generation/READY_TO_IMPORT_DELIVERY_STANDARD.md`
- `/Users/yares/Trakzi/docs/chart generation/MOCK_DATA_IDEATION_STANDARD.md`

---

## Default Behavior

After the AI finishes generation / review / revision / scoring / selection for a new candidate batch, it should:

1. update the `/testCharts` playground with the new active batch
2. keep approved charts separated in `To Be Implemented`
3. use the playground as the visible working surface for the ideation round
4. document the visible state in `docs/PAGES/TEST_CHARTS.md`
5. use schema-shaped mock data by default when the user is judging ideas rather than live transactions

Ideation should not stop at abstract chart names if the task is to create a new round for review.

---

## Bias Toward Ready-To-Import Delivery

Use:
- `/Users/yares/Trakzi/docs/chart generation/READY_TO_IMPORT_DELIVERY_STANDARD.md`

Goal:
- make the playground useful now
- make the charts portable to real pages later
- keep the candidate batch close to production chart-card reality

If the user wants charts they can pass to other pages now, do not default to prototype-only cards or the lightweight playground look.

If the user wants to judge chart ideas rather than their actual transaction history, do not default to live bundle/API data.

---

## Required Implementation Rules

### 1. Use `/testCharts` as the chart playground

New chart rounds should be rendered in:
- `/Users/yares/Trakzi/app/testCharts/page.tsx`
- `/Users/yares/Trakzi/components/test-charts/idea-playground.tsx`
- `/Users/yares/Trakzi/components/test-charts/idea-playground-catalog.ts`

### 2. Respect `To Be Implemented`

Charts the user already approved must:
- stay visible in a dedicated `To Be Implemented` section
- remain separated from the active candidate batch
- not be mixed back into the new review pool

### 3. Active review batch belongs in `/testCharts`

If a new ideation round is created, the current live candidates should appear in `/testCharts`, not just in a text response.

### 4. Follow `CHARTS_CLONE_SPEC.md`

By default, all new chart cards should follow:
- `/Users/yares/Trakzi/docs/CHARTS_CLONE_SPEC.md`

This means:
- consistent chart card structure
- proper data flow
- production-style data flow
- theming rules
- action surfaces
- loading/empty states
- performance rules

Use the lightweight playground / prototype style only if the user explicitly asks for fast prototype-only rendering.
Use live bundle/API data only if the user explicitly asks for live integration in the ideation round.
Otherwise, use chart-specific mock data that reflects idealized but believable Trakzi scenarios.

### 5. Keep the docs aligned

Whenever `/testCharts` changes, update:
- `/Users/yares/Trakzi/docs/PAGES/TEST_CHARTS.md`

---

## Round Lifecycle

### When generating a fresh batch

- approved charts stay in `To Be Implemented`
- new candidate charts replace the previous active review batch
- the page should reflect the new review surface
- if the user asks for a very large pool such as `100`, rank the full pool first and only materialize the strongest `50` charts in `/testCharts`

### When the user selects favorites

- selected charts move to `To Be Implemented`
- non-selected charts are discarded
- discarded charts are added to rejected memory
- `/testCharts` should be updated to reflect the new state

---

## Practical Rule

If the user asks for a new chart round for review, the AI should assume they want:

1. strong chart concepts
2. ready-to-import charts in full clone-spec card style rather than loose prototypes
3. those concepts rendered into `/testCharts`
4. the page docs updated
5. the memory system preserved
6. chart-specific mock data if they want to judge the idea instead of their real transactions

For large runs, the AI should also assume:
- the user may want the full ranked idea pool in text
- but `/testCharts` should hold the strongest shortlist rather than every raw candidate

unless the user explicitly says they only want text ideation and no page updates.
