You are scoring a Trakzi feature ideation batch.

Before scoring, inspect:

- `/Users/yares/Trakzi/docs/feature generation/PRODUCT_SURFACE_MEMORY.md`
- `/Users/yares/Trakzi/docs/feature generation/APPROVED_FEATURE_MEMORY.md`
- `/Users/yares/Trakzi/docs/feature generation/REJECTED_FEATURE_MEMORY.md`
- `/Users/yares/Trakzi/docs/feature generation/ULTIMATE_FEATURE_GENERATION_PROMPT.md`
- `/Users/yares/Trakzi/docs/CORE/PROJECT_DEEP_DIVE.md`
- `/Users/yares/Trakzi/docs/CORE/NEON_DATABASE.md`
- `/Users/yares/Trakzi/docs/PAGES/TEST_CHARTS.md`
- the relevant page files for the surfaces touched by the proposed features

Use those docs to judge whether ideas are:

- duplicates of existing product behavior
- too similar to approved feature concepts
- too similar to rejected feature concepts
- weakly grounded in the current app surface
- weakly grounded in the current data model
- too vague to build
- too disconnected from the full product scope
- weakly shaped for `/testCharts` feature-mode materialization

For each proposed feature, assign scores from **1 to 10** for:

1. `Usefulness`
2. `Originality`
3. `Clarity`
4. `Implementation Value`
5. `Non-Duplication Confidence`
6. `Surface Grounding`
7. `Data / Infra Realism`
8. `Workflow Leverage`
9. `Import Readiness`

Then compute:

- `Total Score` out of 90

## Scoring guidance

- `Usefulness`
  Does this solve a meaningful user problem in Trakzi?

- `Originality`
  Is this meaningfully distinct from current behavior and old ideas?

- `Clarity`
  Is the workflow easy to understand and describe?

- `Implementation Value`
  Is it realistic and worth build discussion?

- `Non-Duplication Confidence`
  How confident are you that this is not already covered, approved, or rejected?

- `Surface Grounding`
  Does it clearly build on the real pages and features in the current app?

- `Data / Infra Realism`
  Is the required data and system work credible for Trakzi today?

- `Workflow Leverage`
  Does it make the product stronger in a compounding way instead of adding loose functionality?

- `Import Readiness`
  Is it shaped enough to become a real `/testCharts` feature card or prototype candidate?

## Output format

Return exactly 4 sections.

## 1. Score Table

Use columns:

- `Feature Name`
- `Usefulness`
- `Originality`
- `Clarity`
- `Implementation Value`
- `Non-Duplication Confidence`
- `Surface Grounding`
- `Data / Infra Realism`
- `Workflow Leverage`
- `Import Readiness`
- `Total Score`

## 2. Top Scorers

List the best features in descending order.

## 3. Weakest Features

List the lowest scorers and briefly explain why they are weak.

## 4. Recommended Cutoffs

State:

- which score range is implementation-worthy
- which score range needs revision
- which score range should be discarded

Be strict. A feature with weak duplication confidence or poor surface grounding should be treated as risky even if it sounds exciting.
