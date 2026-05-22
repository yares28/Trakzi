# One-Click Prompt

Use this when you want the strongest default Trakzi chart ideation run without manually assembling the workflow.

```md
You are running the full Trakzi chart ideation workflow.

Before generating any charts, you must inspect these files in this order:

1. `/Users/yares/Trakzi/docs/chart generation/MASTER_WORKFLOW.md`
2. `/Users/yares/Trakzi/docs/chart generation/DATABASE_EXTRACTION_CHECKLIST.md`
3. `/Users/yares/Trakzi/docs/chart generation/DOMAIN_EXTRACTABILITY_MAP.md`
4. `/Users/yares/Trakzi/docs/chart generation/CROSS_FEATURE_JOIN_MAP.md`
5. `/Users/yares/Trakzi/docs/chart generation/EXISTING_CHART_COVERAGE_MEMORY.md`
6. `/Users/yares/Trakzi/docs/chart generation/APPROVED_CHART_MEMORY.md`
7. `/Users/yares/Trakzi/docs/chart generation/REJECTED_CHART_MEMORY.md`
8. `/Users/yares/Trakzi/docs/PAGES/ANALYTICS_CHARTS.md`
9. `/Users/yares/Trakzi/docs/PAGES/FRIDGE_CHARTS.md`
10. `/Users/yares/Trakzi/docs/CORE/NEON_DATABASE.md`
11. `/Users/yares/Trakzi/docs/CORE/PROJECT_DEEP_DIVE.md`
12. `/Users/yares/Trakzi/docs/CHARTS_CLONE_SPEC.md`
13. `/Users/yares/Trakzi/docs/chart generation/TESTCHARTS_PLAYGROUND_PROTOCOL.md`
14. `/Users/yares/Trakzi/docs/chart generation/READY_TO_IMPORT_DELIVERY_STANDARD.md`
15. `/Users/yares/Trakzi/docs/chart generation/MOCK_DATA_IDEATION_STANDARD.md`

Then do this workflow:

1. Run the generation logic from `ULTIMATE_CHART_GENERATION_PROMPT.md`
2. Review the batch using `CHART_BATCH_REVIEW_PROMPT.md`
3. If needed, revise it using `CHART_BATCH_REVISION_PROMPT.md`
4. Score the revised batch using `CHART_SCORING_RUBRIC_PROMPT.md`
5. Select the best charts using `CHART_TOP_SELECTION_PROMPT.md`
6. Evaluate the final survivors using `CHART_BATCH_QUALITY_GATE_PROMPT.md`
7. Rank the full batch by score and keep the ranked list
8. Materialize the active shortlisted batch in `/testCharts`
9. If the request is a large batch such as `100`, materialize only the top `50` scored ideas in `/testCharts`
10. Keep approved charts in `To Be Implemented`
11. Update `/Users/yares/Trakzi/docs/PAGES/TEST_CHARTS.md`

Important rules:

- Do not generate duplicate concepts
- Do not re-propose approved concepts
- Do not re-propose rejected concepts unchanged
- Keep chart ideas grounded in the current database and realistic joins
- Avoid grocery bias
- Avoid line-chart overuse
- Prefer product value over novelty
- The active review batch must be visible in `/testCharts`, not only returned as text
- Use `/Users/yares/Trakzi/docs/CHARTS_CLONE_SPEC.md` as the default chart-card implementation rule
- Do not use the lightweight playground / prototype visual style unless I explicitly ask for prototype-only output
- Treat `/testCharts` as the default playground unless I explicitly ask for text-only ideation
- For ideation rounds in `/testCharts`, default to chart-specific mock data instead of wiring to my live APIs or transactions
- The mock data should be idealized, believable, and specific to the chart's intended insight
- Do not frame Challenge Groups as group-vs-group; they are users competing inside one leaderboard group for top places
- Treat Pockets as separate chart surfaces for Travel, Vehicles, Housing, and Other unless I explicitly ask for cross-pocket charts
- Bias the batch toward ready-to-import Trakzi charts, not abstract prototypes
- For large runs, rank the entire idea pool and only send the strongest shortlist to `/testCharts`

If I later approve charts:
- they must move into `To Be Implemented`
- they become off-limits for future ideation rounds

If I do not approve charts:
- they become discarded
- they must be logged in rejected memory
- they must not return unchanged

When I later choose favorites:
- move them into `To Be Implemented`
- discard the rest
- update the playground state and memory files accordingly

Output rule for large runs:
- if **{X}** is `100`, generate and rank all `100` ideas
- then materialize only the top `50` ideas by score in `/testCharts`

Now generate the final batch of exactly **{X}** charts using the full workflow above.
```
