export const CHART_LAB_ONE_CLICK_PROMPT_PATH =
  "/Users/yares/Trakzi/docs/chart generation/ONE_CLICK_PROMPT.md";

export const CHART_LAB_RESOLUTION_PROMPT_PATH =
  "/Users/yares/Trakzi/docs/chart generation/SHORTLIST_RESOLUTION_PROMPT.md";

export const CHART_LAB_MASTER_WORKFLOW_PATH =
  "/Users/yares/Trakzi/docs/chart generation/MASTER_WORKFLOW.md";

export const CHART_LAB_REVIEW_PROMPT_PATH =
  "/Users/yares/Trakzi/docs/chart generation/CHART_BATCH_REVIEW_PROMPT.md";

export const CHART_LAB_REVISION_PROMPT_PATH =
  "/Users/yares/Trakzi/docs/chart generation/CHART_BATCH_REVISION_PROMPT.md";

export const CHART_LAB_SCORING_PROMPT_PATH =
  "/Users/yares/Trakzi/docs/chart generation/CHART_SCORING_RUBRIC_PROMPT.md";

export const CHART_LAB_SELECTION_PROMPT_PATH =
  "/Users/yares/Trakzi/docs/chart generation/CHART_TOP_SELECTION_PROMPT.md";

export const CHART_LAB_QUALITY_GATE_PATH =
  "/Users/yares/Trakzi/docs/chart generation/CHART_BATCH_QUALITY_GATE_PROMPT.md";

export const CHART_LAB_EXISTING_MEMORY_PATH =
  "/Users/yares/Trakzi/docs/chart generation/EXISTING_CHART_COVERAGE_MEMORY.md";

export const CHART_LAB_APPROVED_MEMORY_PATH =
  "/Users/yares/Trakzi/docs/chart generation/APPROVED_CHART_MEMORY.md";

export const CHART_LAB_REJECTED_MEMORY_PATH =
  "/Users/yares/Trakzi/docs/chart generation/REJECTED_CHART_MEMORY.md";

export const CHART_LAB_EXTRACTION_CHECKLIST_PATH =
  "/Users/yares/Trakzi/docs/chart generation/DATABASE_EXTRACTION_CHECKLIST.md";

export const CHART_LAB_DOMAIN_MAP_PATH =
  "/Users/yares/Trakzi/docs/chart generation/DOMAIN_EXTRACTABILITY_MAP.md";

export const CHART_LAB_JOIN_MAP_PATH =
  "/Users/yares/Trakzi/docs/chart generation/CROSS_FEATURE_JOIN_MAP.md";

export const CHART_LAB_PLAYGROUND_PROTOCOL_PATH =
  "/Users/yares/Trakzi/docs/chart generation/TESTCHARTS_PLAYGROUND_PROTOCOL.md";

export const CHART_LAB_DELIVERY_STANDARD_PATH =
  "/Users/yares/Trakzi/docs/chart generation/READY_TO_IMPORT_DELIVERY_STANDARD.md";

export const CHART_LAB_MOCK_DATA_STANDARD_PATH =
  "/Users/yares/Trakzi/docs/chart generation/MOCK_DATA_IDEATION_STANDARD.md";

export const CHART_LAB_STRATEGY_LANES = [
  {
    title: "High-Signal Over Filler",
    description:
      "Chart rounds should prioritize analytical questions that change decisions, not visual novelty or thin dashboard decoration.",
    examples: [
      "Keep charts that expose pressure, timing, recovery, or tradeoffs",
      "Reject generic totals, thin ratios, and weak restatements of existing cards",
      "Treat usefulness as more important than clever naming",
    ],
  },
  {
    title: "Coverage Over Bias",
    description:
      "A strong chart batch should cover Trakzi’s real chart surfaces instead of collapsing into grocery-heavy or single-domain ideation.",
    examples: [
      "Spread ideas across Analytics, Fridge, Savings, Debt, Goals, Pockets, Rooms, Challenges, and joins",
      "Avoid repeating the same question with minor visual changes",
      "Use domain balance as a quality signal before approval",
    ],
  },
  {
    title: "Import-Ready Over Prototype Drift",
    description:
      "Every shortlisted chart should be concrete enough to become a clone-spec card in `/testCharts` with believable seeded mock data.",
    examples: [
      "Require real schema grounding and realistic joins",
      "Use chart-specific mock storytelling instead of generic demo values",
      "Treat review, scoring, and selection as gates before implementation",
    ],
  },
] as const;

export const CHART_LAB_SURFACE_GROUPS = [
  {
    title: "Analytics",
    accent: "Core spending diagnosis",
    pages: ["/analytics", "/home", "/dashboard"],
    items: [
      "Transaction-first spending, timing, volatility, merchant, budget, and balance-behavior charts",
      "Charts that can strengthen analytics layouts or summary surfaces on home and dashboard",
      "Highest-volume domain for cash-flow and behavior analysis",
    ],
  },
  {
    title: "Fridge",
    accent: "Receipt-native grocery analysis",
    pages: ["/fridge", "/data-library"],
    items: [
      "Store, category, basket, unit-price, nutrition, and mission-based grocery charts",
      "Receipt review and taxonomy flows can feed grocery-specific analysis",
      "Needs active anti-bias discipline so chart rounds do not over-index on grocery ideas",
    ],
  },
  {
    title: "Savings",
    accent: "Cash resilience and runway",
    pages: ["/savings", "/dashboard"],
    items: [
      "Runway, balance-floor, carry, rescue, and reserve-strength charts",
      "Charts that turn cash position into clearer financial safety signals",
      "Natural home for liquidity, retention, and month-end survivability questions",
    ],
  },
  {
    title: "Debt And Goals",
    accent: "Commitments and progress",
    pages: ["/savings"],
    items: [
      "Debt burden, debt stream drift, goal feasibility, allocation, and deadline-pressure charts",
      "Charts that help users sequence priorities or understand progress risk",
      "Should stay grounded in current goals, debt, and planning data already in the app",
    ],
  },
  {
    title: "Pockets",
    accent: "Life-surface asset tracking",
    pages: ["/pockets"],
    items: [
      "Travel, garage, property, and other-asset charts",
      "Pocket charts should respect pocket-type differences instead of treating all pockets as one blended surface",
      "Useful for burden, utilization, and asset-specific operating signals",
    ],
  },
  {
    title: "Friend Rooms",
    accent: "Shared-expense coordination",
    pages: ["/friends", "/friends/[friendId]", "/rooms/[roomId]"],
    items: [
      "Balance, attribution, settlement, member, and room-insight charts",
      "Friend comparison and room behavior can support leaderboard-adjacent or accountability views",
      "Should reflect real room operations, not invented collaboration models",
    ],
  },
  {
    title: "Challenges",
    accent: "Leaderboard behavior",
    pages: ["/challenges/[groupId]", "/friends"],
    items: [
      "Challenge score, metric breadth, rank movement, and participation charts",
      "Must model users competing within one challenge group leaderboard",
      "Best when they strengthen motivation or explain performance changes",
    ],
  },
  {
    title: "Cross-Feature",
    accent: "Joined-system analysis",
    pages: [
      "/analytics",
      "/fridge",
      "/savings",
      "/pockets",
      "/friends",
      "/challenges/[groupId]",
    ],
    items: [
      "Cross-domain charts that connect groceries, savings, challenges, or other tracked systems",
      "Only valid when the join is realistic in the current schema and product model",
      "Best used for high-leverage system-level insights, not forced mashups",
    ],
  },
] as const;

export const CHART_LAB_WORKFLOW_DOCS = [
  {
    title: "One-click prompt",
    path: CHART_LAB_ONE_CLICK_PROMPT_PATH,
    description:
      "Default wrapper that runs the full chart workflow end-to-end.",
  },
  {
    title: "Master workflow",
    path: CHART_LAB_MASTER_WORKFLOW_PATH,
    description:
      "Source-of-truth chart pipeline from ideation through memory sync.",
  },
  {
    title: "Shortlist resolution",
    path: CHART_LAB_RESOLUTION_PROMPT_PATH,
    description:
      "Second-step prompt for keeping favorites, rejecting the rest, and syncing queue memory.",
  },
  {
    title: "Batch review",
    path: CHART_LAB_REVIEW_PROMPT_PATH,
    description:
      "Strict product review pass for duplicate, bias, and value issues.",
  },
  {
    title: "Batch revision",
    path: CHART_LAB_REVISION_PROMPT_PATH,
    description:
      "Follow-up pass for improving weak survivors without drifting into duplicates.",
  },
  {
    title: "Scoring rubric",
    path: CHART_LAB_SCORING_PROMPT_PATH,
    description: "Nine-factor scoring pass for shortlist quality and cutoffs.",
  },
  {
    title: "Top selection",
    path: CHART_LAB_SELECTION_PROMPT_PATH,
    description:
      "Selection gate that chooses what actually deserves shortlist status.",
  },
  {
    title: "Quality gate",
    path: CHART_LAB_QUALITY_GATE_PATH,
    description:
      "Final sanity check before the shortlist is materialized in `/testCharts`.",
  },
  {
    title: "Existing chart memory",
    path: CHART_LAB_EXISTING_MEMORY_PATH,
    description:
      "Coverage memory of current chart territory already represented in Trakzi.",
  },
  {
    title: "Approved chart memory",
    path: CHART_LAB_APPROVED_MEMORY_PATH,
    description:
      "Approved concepts that belong in `To Be Implemented` and cannot return as new.",
  },
  {
    title: "Rejected chart memory",
    path: CHART_LAB_REJECTED_MEMORY_PATH,
    description: "Discarded concepts that must not reappear unchanged.",
  },
  {
    title: "Extraction checklist",
    path: CHART_LAB_EXTRACTION_CHECKLIST_PATH,
    description:
      "Grounding check for whether a chart is feasible from the real data model.",
  },
  {
    title: "Domain extractability map",
    path: CHART_LAB_DOMAIN_MAP_PATH,
    description:
      "Practical guide for which domains and fields are realistically chartable.",
  },
  {
    title: "Cross-feature join map",
    path: CHART_LAB_JOIN_MAP_PATH,
    description:
      "Guardrail for joined-system charts so cross-feature ideas stay credible.",
  },
  {
    title: "Playground protocol",
    path: CHART_LAB_PLAYGROUND_PROTOCOL_PATH,
    description:
      "Rules for how shortlist survivors should appear in `/testCharts`.",
  },
  {
    title: "Delivery standard",
    path: CHART_LAB_DELIVERY_STANDARD_PATH,
    description: "Defines ready-to-import chart quality and card expectations.",
  },
  {
    title: "Mock-data standard",
    path: CHART_LAB_MOCK_DATA_STANDARD_PATH,
    description:
      "Ensures shortlist review uses chart-specific seeded mock data instead of weak demos.",
  },
] as const;

export const CHART_LAB_OUTPUT_RULES = [
  "Do not return duplicate charts that overlap with existing, approved, or rejected memory.",
  "Do not let grocery-heavy batches crowd out the rest of Trakzi’s chart surfaces.",
  "Require schema grounding and realistic joins before a chart is shortlisted.",
  "Treat `/testCharts` as the visible review surface, not just a place to dump ideas after the fact.",
  "Promote approved charts into `To Be Implemented` and send discarded survivors to rejected memory.",
] as const;
