# Feature Shortlist Resolution Prompt

Use this after reviewing a feature batch and deciding which features to keep.

```md
You are finalizing a Trakzi feature ideation round after I reviewed the shortlist.

My selected feature titles are:

{PASTE_THE_FEATURE_TITLES_I_WANT_TO_KEEP}

Everything else currently in the active `/testCharts` feature review shortlist should be treated as not approved for this round.

Before making changes, inspect these files:

1. `/Users/yares/Trakzi/docs/PAGES/TEST_CHARTS.md`
2. `/Users/yares/Trakzi/docs/feature generation/APPROVED_FEATURE_MEMORY.md`
3. `/Users/yares/Trakzi/docs/feature generation/REJECTED_FEATURE_MEMORY.md`
4. `/Users/yares/Trakzi/docs/feature generation/2026-04-02-feature-shortlist-round-1.md`
5. `/Users/yares/Trakzi/app/api/test-charts/feature-lab/route.ts`
6. `/Users/yares/Trakzi/components/test-charts/feature-idea-playground.tsx`
7. `/Users/yares/Trakzi/components/test-charts/feature-lab-content.ts`

Your job:

1. Keep only my selected features as approved survivors for this round
2. Move those selected features into `To Be Implemented`
3. Add those selected features to `APPROVED_FEATURE_MEMORY.md` if they are not already there
4. Remove every non-selected feature from the active review shortlist
5. Add every non-selected feature from the active shortlist to `REJECTED_FEATURE_MEMORY.md` unless it is already there
6. Make sure rejected features do not return unchanged in later rounds
7. Update the active shortlist doc so `/testCharts` feature mode no longer shows the features I rejected in `To Be Approved`
8. Update `/Users/yares/Trakzi/docs/PAGES/TEST_CHARTS.md` so counts, queue state, and behavior description are accurate
9. Preserve the approved implementation queue and do not delete previously approved features unless I explicitly say so

Important rules:

- Only the feature titles I selected should survive this round
- Everything else in the active feature review queue is rejected for this round
- Do not remove older approved features from `To Be Implemented`
- Do not re-add rejected features under slight renames
- Keep the visible `/testCharts` feature queue aligned with the memory docs

At the end, return:

## 1. Approved This Round

List only the features I kept.

## 2. Rejected This Round

List the features removed from the active shortlist.

## 3. Updated Files

List every file you changed.

## 4. Resulting Queue State

State:

- how many features remain in `To Be Approved`
- how many features are now in `To Be Implemented`
- whether `APPROVED_FEATURE_MEMORY.md` and `REJECTED_FEATURE_MEMORY.md` were updated
```
