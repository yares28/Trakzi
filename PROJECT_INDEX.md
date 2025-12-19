# Project Index

## Overview
- Repo: folio2 (package.json name: my-v0-project)
- Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Prisma, Clerk, Stripe, PostHog, Neon
- Primary areas: analytics dashboards, billing and subscriptions, data ingestion (receipts and statements), chat, charts

## Top-Level Directories
- app/ - Next.js app routes, layouts, and API routes
- backend/ - migration artifacts
- components/ - shared UI and feature components
- database/ - SQL schema snapshot
- hooks/ - custom React hooks
- landing/ - landing page components
- LandingPage/landing/ - separate Next.js landing project (own package.json)
- lib/ - domain logic, parsing, AI helpers, types
- prisma/ - Prisma schema and migrations
- public/ - static assets
- scripts/ - maintenance scripts
- __tests__/ - Jest tests

## App Routes (app/)
- (landing)/ - marketing pages and auth entry points
- analytics/, dashboard/, reports/, trends/ - product pages
- api/ - route handlers (see API Routes)
- billing/, subscriptions/ - Stripe billing flows
- chat/, data-library/, fridge/, home/, savings/ - feature areas
- sso-callback/ - SSO callback
- testCharts/ - chart experiments

## API Route Groups (app/api/)
- ai/, analytics/, billing/, budgets/, categories/, charts/, checkout/
- dashboard/, dashboard-stats/, debug/, files/, financial-health/
- fridge/, limits/, receipt-categories/, receipt-transactions/, receipts/
- statements/, stats/, stripe/, subscription/, transactions/, trial/, webhook/

## Components
- components/ai-elements/
- components/chat/
- components/dashboard/
- components/fridge/
- components/test-charts/
- components/ui/

## Hooks
- hooks/use-chart-category-visibility.ts
- hooks/use-mobile.ts
- hooks/use-pending-checkout.ts

## Lib
- lib/ai/
- lib/files/
- lib/fridge/
- lib/limits/
- lib/parsing/
- lib/receipts/
- lib/types/

## Data and Migrations
- prisma/schema.prisma
- prisma/migrations/
- database/schema.sql
- backend/migrations/

## Docs and Specs
- README.md
- STRIPE_INTEGRATION.md
- NEON_SETUP.md
- CLERK_SETUP_CHECKLIST.md
- CLERK_INTEGRATION_COMPLETE.md
- ANALYTICS_CARD_CHARTS_CLONE_SPEC.md
- ANALYTICS_CARD_LAYOUT.md
- CHARTS_DOCUMENTATION.md
- PRE_LAUNCH_CHECKLIST.md
- PRODUCTION_CHECKLIST.md
- privacy-policy.md
- terms-and-conditions.md
- cookie-policy.md
- legal-notice.md
- WARP.md
- architecture_diagrams.html

## Config and Tooling
- package.json
- package-lock.json
- next.config.ts
- next-env.d.ts
- tsconfig.json
- eslint.config.mjs
- jest.config.js
- components.json
- middleware.ts
- instrumentation-client.ts

## Scripts
- scripts/get-all-chart-sizes.js
- scripts/get-current-chart-positions.js
- scripts/get-current-chart-sizes.js
- scripts/migrate-data-to-clerk-user.ts
- scripts/reset-categories.ts
- scripts/verify-transaction-count-mcp.ts

## Generated and Dependencies
- node_modules/
- .next/
- .swc/
- tsconfig.tsbuildinfo

## Agent Prompts
- .agent/prompts/STRIPE_SUBSCRIPTION_REQUIREMENTS.md
