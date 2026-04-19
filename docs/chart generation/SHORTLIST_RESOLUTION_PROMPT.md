# Chart Shortlist Resolution Prompt

Use this after reviewing a chart batch and deciding which charts to keep.

```md
You are finalizing a Trakzi chart ideation round after I reviewed the shortlist.

My selected chart titles are:

{PASTE_THE_CHART_TITLES_I_WANT_TO_KEEP}

Everything else currently in the active `/testCharts` chart review shortlist should be treated as not approved for this round.

Before making changes, inspect these files:

1. `/Users/yares/Trakzi/docs/PAGES/TEST_CHARTS.md`
2. `/Users/yares/Trakzi/docs/chart generation/APPROVED_CHART_MEMORY.md`
3. `/Users/yares/Trakzi/docs/chart generation/REJECTED_CHART_MEMORY.md`
4. `/Users/yares/Trakzi/docs/chart generation/TESTCHARTS_PLAYGROUND_PROTOCOL.md`
5. `/Users/yares/Trakzi/docs/chart generation/MEMORY_SYNC_PROTOCOL.md`
6. `/Users/yares/Trakzi/docs/chart generation/2026-04-01-one-click-100-charts-round-3.md`
7. `/Users/yares/Trakzi/app/api/test-charts/idea-lab/route.ts`
8. `/Users/yares/Trakzi/components/test-charts/idea-playground.tsx`

Your job:

1. Keep only my selected charts as approved survivors for this round
2. Move those selected charts into `To Be Implemented`
3. Add those selected charts to `APPROVED_CHART_MEMORY.md` if they are not already there
4. Remove every non-selected chart from the active review shortlist
5. Add every non-selected chart from the active shortlist to `REJECTED_CHART_MEMORY.md` unless it is already there
6. Make sure rejected charts do not return unchanged in later rounds
7. Update any shortlist/archive wiring so `/testCharts` no longer shows the charts I rejected in `To Be Approved`
8. Update `/Users/yares/Trakzi/docs/PAGES/TEST_CHARTS.md` so counts, queue state, and behavior description are accurate
9. Preserve the approved implementation queue and do not delete previously approved charts unless I explicitly say so

Important rules:

- Only the chart titles I selected should survive this round
- Everything else in the active review queue is rejected for this round
- Do not remove older approved charts from `To Be Implemented`
- Do not create rename-only duplicates
- Keep the chart workflow docs and memory files consistent with the visible `/testCharts` state

At the end, return:

## 1. Approved This Round

List only the charts I kept.

## 2. Rejected This Round

List the charts removed from the active shortlist.

## 3. Updated Files

List every file you changed.

## 4. Resulting Queue State

State:

- how many charts remain in `To Be Approved`
- how many charts are now in `To Be Implemented`
- whether `APPROVED_CHART_MEMORY.md` and `REJECTED_CHART_MEMORY.md` were updated
```
