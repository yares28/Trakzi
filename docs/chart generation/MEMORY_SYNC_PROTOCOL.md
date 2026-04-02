# Memory Sync Protocol

This file defines how the chart ideation memory should be updated after each round.

The goal is to keep:
- approved memory
- rejected memory
- `/testCharts` state
- `CHART_IDEA_GENERATOR_PROMPT.md`
- ready-to-import delivery expectations

aligned.

---

## When the user approves charts

Do all of these:

1. Move the approved charts into `To Be Implemented`
2. Add them to `APPROVED_CHART_MEMORY.md`
3. Ensure they are treated as off-limits in future ideation rounds
4. Update the visible `/testCharts` state so they appear in `To Be Implemented`
5. Update `/Users/yares/Trakzi/docs/PAGES/TEST_CHARTS.md`
6. Keep `/Users/yares/Trakzi/docs/CHART_IDEA_GENERATOR_PROMPT.md` aligned if it is still being used as a legacy summary doc
7. Preserve target page fit so approved charts remain usable for real-page import, not just remembered as ideas

---

## When the user rejects or ignores charts

Do all of these:

1. Treat them as discarded
2. Add them to `REJECTED_CHART_MEMORY.md`
3. Remove them from the active `/testCharts` candidate round
4. Update `/Users/yares/Trakzi/docs/PAGES/TEST_CHARTS.md`
5. Do not re-propose them unchanged
6. If they come back later, they must be clearly upgraded

---

## When a discarded chart returns

Check all of these:

1. Is the analytical question materially different?
2. Is the product value clearly better?
3. Is the framing stronger?
4. Is the cross-feature logic more meaningful?
5. Is the chart more realistic given the schema?

If the answer is mostly no, it should still be treated as rejected.

---

## Order of truth

For workflow memory, use this order:

1. `APPROVED_CHART_MEMORY.md`
2. `REJECTED_CHART_MEMORY.md`
3. `EXISTING_CHART_COVERAGE_MEMORY.md`
4. `/Users/yares/Trakzi/docs/PAGES/TEST_CHARTS.md`
5. `/Users/yares/Trakzi/docs/CHART_IDEA_GENERATOR_PROMPT.md`

`CHART_IDEA_GENERATOR_PROMPT.md` should be considered a legacy umbrella doc unless and until it is fully refactored.

---

## Goal

After every ideation round, the system should answer these correctly:

- What is already approved?
- What is already rejected?
- What is still live?
- What is off-limits?
- What can only return as an upgraded idea?
