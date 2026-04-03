export type FeatureManifestEntry = {
  id: string;
  title: string;
  featureType: "Strengthen Existing" | "Cross-Feature" | "Net-New";
  difficulty: "Easy" | "Medium" | "High";
  primarySurface: string;
  existingSurfaces: string;
  userProblemSolved: string;
  whatItDoes: string;
  whyItMatters: string;
  mvpShape: string;
  newDataInfraNeeded: string;
  confidence: "High" | "Medium" | "Low";
};

export type FeatureLabBundleResponse = {
  manifest: FeatureManifestEntry[];
  approvedManifest: FeatureManifestEntry[];
};

export const FEATURE_LAB_PRODUCT_SURFACE_MEMORY_PATH =
  "/Users/yares/Trakzi/docs/feature generation/PRODUCT_SURFACE_MEMORY.md";

export const FEATURE_LAB_ONE_CLICK_PROMPT_PATH =
  "/Users/yares/Trakzi/docs/feature generation/ONE_CLICK_FEATURE_PROMPT.md";

export const FEATURE_LAB_RESOLUTION_PROMPT_PATH =
  "/Users/yares/Trakzi/docs/feature generation/SHORTLIST_RESOLUTION_PROMPT.md";

export const FEATURE_LAB_CORE_PROMPT_PATH =
  "/Users/yares/Trakzi/docs/feature generation/ULTIMATE_FEATURE_GENERATION_PROMPT.md";

export const FEATURE_LAB_APPROVED_MEMORY_PATH =
  "/Users/yares/Trakzi/docs/feature generation/APPROVED_FEATURE_MEMORY.md";

export const FEATURE_LAB_REJECTED_MEMORY_PATH =
  "/Users/yares/Trakzi/docs/feature generation/REJECTED_FEATURE_MEMORY.md";

export const FEATURE_LAB_SCORING_PROMPT_PATH =
  "/Users/yares/Trakzi/docs/feature generation/FEATURE_SCORING_RUBRIC_PROMPT.md";

export const FEATURE_LAB_REVIEW_PROMPT_PATH =
  "/Users/yares/Trakzi/docs/feature generation/FEATURE_SHORTLIST_REVIEW_PROMPT.md";

export const FEATURE_LAB_ACTIVE_SHORTLIST_PATH =
  "/Users/yares/Trakzi/docs/feature generation/2026-04-02-feature-shortlist-round-1.md";

export const FEATURE_LAB_STRATEGY_LANES = [
  {
    title: "Strengthen Existing Surfaces",
    description:
      "Start from the product you already have. Make proven workflows clearer, faster, more actionable, and more habit-forming before inventing something unrelated.",
    examples: [
      "Home and analytics workflows that tighten decision-making",
      "Savings, debt, and goal systems that improve follow-through",
      "Import and receipt repair loops that reduce friction and errors",
    ],
  },
  {
    title: "Connect Surfaces Into One System",
    description:
      "The app is strongest when pages compound. Use feature ideation to connect budgeting, grocery, savings, shared expenses, AI, and asset tracking into one workspace.",
    examples: [
      "Fridge x budget x savings recovery loops",
      "Rooms x challenges x accountability mechanics",
      "Pockets x goals x net-worth planning systems",
    ],
  },
  {
    title: "Create Net-New Bets Carefully",
    description:
      "Only introduce new feature families when they feel native to Trakzi’s current product structure, brand, and data model.",
    examples: [
      "Automation and reminders with strong product fit",
      "Behavioral coaching features grounded in real usage data",
      "Premium workflows that make the subscription more defensible",
    ],
  },
] as const;

export const FEATURE_LAB_SURFACE_GROUPS = [
  {
    title: "Acquisition And Entry",
    accent: "Marketing and auth surfaces",
    pages: [
      "/",
      "/features",
      "/pricing",
      "/csv-import",
      "/receipt-scanner",
      "/grocery-tracker",
      "/split-expenses",
      "/docs",
      "/docs/[slug]",
      "/compare/trakzi-vs-monarch",
      "/compare/trakzi-vs-ynab",
      "/compare/trakzi-vs-splitwise",
      "/legal",
      "/privacy",
      "/cookies",
      "/terms",
      "/sign-in/[[...sign-in]]",
      "/sign-up/[[...sign-up]]",
      "/es",
      "/es/features",
      "/es/precios",
      "/es/importar-csv",
      "/es/escaner-tickets",
      "/es/gastos-supermercado",
      "/es/dividir-gastos",
      "/es/docs",
      "/es/docs/[slug]",
      "/es/compare/trakzi-vs-monarch",
      "/es/compare/trakzi-vs-ynab",
      "/es/compare/trakzi-vs-splitwise",
      "/billing/return",
      "/sso-callback",
    ],
    items: [
      "Landing page plus dedicated feature-detail pages for CSV import, receipt scanning, grocery tracking, and split expenses",
      "Docs index and docs detail pages in English and Spanish",
      "Comparison pages against Monarch, YNAB, and Splitwise in English and Spanish",
      "Pricing, legal, privacy, cookies, and terms surfaces",
      "Sign-in and sign-up entry points plus post-billing and SSO callback flows",
    ],
  },
  {
    title: "Home Workspace",
    accent: "Daily operations",
    pages: ["/home", "/dashboard"],
    items: [
      "Home dashboard with stats cards, favorites grid, and transaction table",
      "Statement upload, parsing review, and AI reparse",
      "Onboarding tour entry point",
      "Dashboard scorecards and AI health summaries",
    ],
  },
  {
    title: "Analytics Workspace",
    accent: "Deeper spending analysis",
    pages: ["/analytics"],
    items: [
      "Analytics, Advanced, and Trends modes",
      "Resizable and reorderable chart layouts",
      "Budgets, category filters, visibility toggles, and advanced chart gating",
      "Bundle-backed chart rendering and import-driven analysis",
    ],
  },
  {
    title: "Fridge Workspace",
    accent: "Receipt-native grocery intelligence",
    pages: ["/fridge"],
    items: [
      "Fridge, Advanced, and Trends modes",
      "Receipt upload, review, and receipt-category creation",
      "Store, category, time, basket, and nutrition-oriented charting",
      "Receipts table and grocery-specific analytics",
    ],
  },
  {
    title: "Savings And Planning",
    accent: "Resilience and financial planning",
    pages: ["/savings"],
    items: [
      "Savings, Net Worth, Debt, Calculator, and Goals modes",
      "Savings accumulation and savings-rate tracking",
      "Debt manager and mortgage calculator",
      "Goal wizard, goal tracking, and goal-entry flows",
    ],
  },
  {
    title: "Pockets",
    accent: "Life surfaces beyond categories",
    pages: ["/pockets"],
    items: [
      "Travel pocket with countries and spend abroad",
      "Garage pocket with vehicles, financing, fuel, maintenance, insurance, parking, and certificates",
      "Property pocket with value, equity, mortgage, and transaction tabs",
      "Other-assets pocket with custom items and linked transactions",
    ],
  },
  {
    title: "Friends, Rooms, And Challenges",
    accent: "Shared accountability",
    pages: [
      "/friends",
      "/friends/[friendId]",
      "/rooms/[roomId]",
      "/challenges/[groupId]",
    ],
    items: [
      "Friends Rankings, Rooms, and Challenges tabs",
      "Friend profile comparisons and balance summaries",
      "Room expenses, insights, about tab, balances, members, activity feed, and settle-up flows",
      "Challenge leaderboards, all-time views, members, descriptions, and group-management flows",
    ],
  },
  {
    title: "AI And Assistant Layer",
    accent: "Conversation as interface",
    pages: ["/chat"],
    items: [
      "AI chat with suggested prompts and anomaly chips",
      "Usage tracking, saved chat history, and free-plan gating",
      "Chart-backed finance answers",
      "Goal wizard suggestions derived from user finances",
    ],
  },
  {
    title: "Data Library And Taxonomy",
    accent: "Structured control layer",
    pages: ["/data-library"],
    items: [
      "Transactions, statements, categories, receipt types, receipt categories, and reports tables",
      "CSV import and receipt upload into the library",
      "Category and receipt taxonomy management",
      "Preference updates, search, pagination, and limits dialogs",
    ],
  },
  {
    title: "System And Test Surfaces",
    accent: "Infrastructure-facing product layers",
    pages: ["/billing/return", "/testCharts", "/debug-chart"],
    items: [
      "Plan limits for advanced charts, AI insights, and chat usage",
      "Billing-return and subscription change flows",
      "`/testCharts` as chart and feature ideation lab",
      "Debug and playground surfaces for validating new chart and feature concepts",
    ],
  },
] as const;

export const FEATURE_LAB_OUTPUT_RULES = [
  "Do not return chart-only ideas disguised as features.",
  "Prefer features that reuse current surfaces, data, or workflows before requiring major new infrastructure.",
  "If a feature needs new tables, signals, jobs, or APIs, call that out explicitly.",
  "Bias toward importable product bets, not vague strategy slogans.",
  "Use `/testCharts` feature mode as the default place to materialize shortlisted feature experiments.",
] as const;
