# One-Click Feature Prompt

Use this when you want the strongest default Trakzi feature ideation run without manually assembling the workflow.

```md
You are running the full Trakzi feature ideation workflow.

Before generating any features, you must inspect these files in this order:

1. `/Users/yares/Trakzi/docs/feature generation/ULTIMATE_FEATURE_GENERATION_PROMPT.md`
2. `/Users/yares/Trakzi/docs/feature generation/PRODUCT_SURFACE_MEMORY.md`
3. `/Users/yares/Trakzi/docs/feature generation/APPROVED_FEATURE_MEMORY.md`
4. `/Users/yares/Trakzi/docs/feature generation/REJECTED_FEATURE_MEMORY.md`
5. `/Users/yares/Trakzi/docs/feature generation/FEATURE_SHORTLIST_REVIEW_PROMPT.md`
6. `/Users/yares/Trakzi/docs/feature generation/FEATURE_SCORING_RUBRIC_PROMPT.md`
7. `/Users/yares/Trakzi/docs/CORE/PROJECT_DEEP_DIVE.md`
8. `/Users/yares/Trakzi/docs/CORE/NEON_DATABASE.md`
9. `/Users/yares/Trakzi/docs/PAGES/TEST_CHARTS.md`
10. `/Users/yares/Trakzi/components/app-sidebar.tsx`
11. `/Users/yares/Trakzi/app/(landing)/features/page.tsx`
12. `/Users/yares/Trakzi/app/home/_page/HomePage.tsx`
13. `/Users/yares/Trakzi/app/dashboard/_page/DashboardPage.tsx`
14. `/Users/yares/Trakzi/app/analytics/_page/AnalyticsPage.tsx`
15. `/Users/yares/Trakzi/app/fridge/_client/FridgePageClient.tsx`
16. `/Users/yares/Trakzi/app/savings/page.tsx`
17. `/Users/yares/Trakzi/app/pockets/_page/WorldMapPage.tsx`
18. `/Users/yares/Trakzi/app/friends/page.tsx`
19. `/Users/yares/Trakzi/app/friends/[friendId]/page.tsx`
20. `/Users/yares/Trakzi/app/rooms/[roomId]/page.tsx`
21. `/Users/yares/Trakzi/app/challenges/[groupId]/page.tsx`
22. `/Users/yares/Trakzi/app/data-library/_page/DataLibraryPage.tsx`
23. `/Users/yares/Trakzi/components/chat/chat-interface.tsx`

You must treat this as **whole-app scope**.

That means the ideation pass must think across:

- acquisition and marketing pages
- auth and transition pages
- home
- dashboard
- analytics
- fridge
- savings
- pockets
- friends
- rooms
- challenges
- chat
- data library
- test and debug surfaces
- billing, onboarding, limits, and other shared system layers

You must explicitly account for all current page routes:

- `/`
- `/features`
- `/pricing`
- `/csv-import`
- `/receipt-scanner`
- `/grocery-tracker`
- `/split-expenses`
- `/docs`
- `/docs/[slug]`
- `/compare/trakzi-vs-monarch`
- `/compare/trakzi-vs-ynab`
- `/compare/trakzi-vs-splitwise`
- `/legal`
- `/privacy`
- `/cookies`
- `/terms`
- `/sign-in/[[...sign-in]]`
- `/sign-up/[[...sign-up]]`
- `/es`
- `/es/features`
- `/es/precios`
- `/es/importar-csv`
- `/es/escaner-tickets`
- `/es/gastos-supermercado`
- `/es/dividir-gastos`
- `/es/docs`
- `/es/docs/[slug]`
- `/es/compare/trakzi-vs-monarch`
- `/es/compare/trakzi-vs-ynab`
- `/es/compare/trakzi-vs-splitwise`
- `/billing/return`
- `/sso-callback`
- `/home`
- `/dashboard`
- `/analytics`
- `/fridge`
- `/savings`
- `/pockets`
- `/chat`
- `/friends`
- `/friends/[friendId]`
- `/rooms/[roomId]`
- `/challenges/[groupId]`
- `/data-library`
- `/testCharts`
- `/debug-chart`

And it must reason from these current feature families, not a generic budgeting app:

- acquisition features: landing pages, docs, comparisons, pricing, legal, privacy, cookies, terms, English and Spanish variants, auth entry
- capture features: CSV import, statement review, receipt OCR, receipt review, AI reparse, bank-first import without direct bank connections
- home and dashboard features: stats cards, favorites, transactions, onboarding entry, AI scorecards, comparison popovers, progress surfaces
- analytics features: Analytics, Advanced, Trends, advanced-chart gating, budgets, category visibility, reorderable and resizable layouts
- fridge features: receipt upload, receipt review, receipt-category creation, grocery metrics, receipts table, fridge-specific trends and analytics
- savings features: Savings, Net Worth, Debt, Calculator, Goals, goal wizard, debt manager, mortgage calculator, savings-rate and goal tracking
- pockets features: Travel, Garage, Property, Other, transaction linking, vehicle detail tabs, property detail groupings
- collaboration features: friends rankings, rooms, challenges, settle-up, activity feed, members, leaderboard flows, friend comparison
- AI features: chat, anomaly chips, suggested prompts, chat history, usage limits, reset messaging, chart-backed answers, demo-mode handling
- data library and system features: transactions, statements, reports, categories, receipt types, receipt categories, search, pagination, limits dialogs, billing flows, plan limits, onboarding tours, test lab, debug chart

Then do this workflow:

1. Run the generation logic from `ULTIMATE_FEATURE_GENERATION_PROMPT.md`
2. Review the batch using `FEATURE_SHORTLIST_REVIEW_PROMPT.md`
3. Revise it if the review says the batch is too weak, repetitive, vague, or not full-app enough
4. Score the revised batch using `FEATURE_SCORING_RUBRIC_PROMPT.md`
5. Rank the full pool from strongest to weakest
6. Materialize the strongest shortlist in `/testCharts` using `Features` mode unless I explicitly ask for text-only output
7. Keep approved feature concepts in `To Be Implemented`
8. Update the visible queue and supporting docs if the shortlist changes

Important rules:

- Do not generate chart-only concepts and call them features
- Do not re-propose approved feature concepts unchanged
- Do not re-propose rejected feature concepts unchanged
- Strengthen current surfaces before inventing random net-new ones
- Use Trakzi’s real page map and feature set as the base context
- Prefer ideas that improve leverage, activation, retention, follow-through, or monetization
- If a feature needs new data, new tables, jobs, or APIs, call that out explicitly
- Use `/testCharts` feature mode as the default playground for shortlisted feature experiments
- Keep the visible shortlist small, strong, and reviewable
- Avoid vague ideas that sound strategic but do not define a real workflow
- Do not claim whole-app scope while only covering a few core pages

If I later choose favorite features:

- keep them in `/testCharts` feature mode or move them into a clearer implementation queue
- discard weaker alternatives from the visible shortlist
- update supporting docs if the playground structure changes

Output rule for large runs:

- if **{X}** is `50` or more, generate and rank the full pool
- then materialize only the top `12` to `20` ideas in `/testCharts` feature mode

Now generate the final batch of exactly **{X}** new Trakzi features using the full workflow above.
```
