# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Core commands

All commands assume the project root of this repo.

- Install dependencies:
  - `npm install`
- Run the Next.js dev server (default on http://localhost:3000):
  - `npm run dev`
- Create a production build:
  - `npm run build`
- Run the production server (after `npm run build`):
  - `npm run start`
- Lint the codebase (Next.js + TypeScript ESLint config from `eslint.config.mjs`):
  - `npm run lint`

### Jest test commands

Jest is configured via `jest.config.js` and test helpers under `__tests__/`.

- Run the full test suite:
  - `npm test`
- Watch tests during development:
  - `npm run test:watch`
- Generate a coverage report:
  - `npm run test:coverage`
- Run a single test file:
  - `npm test -- auth/login-form.test.tsx`
- Run tests for a specific feature directory:
  - `npm test -- auth/`
- Update snapshots:
  - `npm test -- -u`

Tests live under `__tests__/` and are matched via `jest.config.js` patterns `**/__tests__/**/*.test.ts[x]`. The Jest setup file `__tests__/setup.ts` wires up `@testing-library/jest-dom`, mocks `next/navigation`, and mocks `next-themes`. Prefer importing from `__tests__/test-utils` so components are wrapped in the appropriate providers.

### E2E testing (optional setup)

There is documentation for Playwright/Cypress under `__tests__/e2e/README.md`, but no E2E npm scripts are defined yet.

- Recommended Playwright install (from docs):
  - `npm install -D @playwright/test`
  - `npx playwright install`
- Recommended Cypress install (from docs):
  - `npm install -D cypress`
  - `npx cypress open`

If you introduce E2E scripts, align them with the patterns suggested in `__tests__/e2e/README.md`.

## High-level architecture

### Framework and tooling

- **Next.js App Router** (see `next.config.ts`, `app/`):
  - Uses the `app/` directory with `layout.tsx` and route segments for `/`, `/dashboard`, `/analytics`, `/savings`, `/login`, and `/register`.
  - TypeScript configuration (`tsconfig.json`) is strict and defines a path alias `@/* -> ./*`, which is used throughout the app and in Jest (`moduleNameMapper`).
- **Styling**:
  - Tailwind CSS v4 via `postcss.config.mjs` and `app/globals.css`.
  - UI primitives live under `components/ui/` and are shadcn/Radix-style building blocks (e.g. `button`, `card`, `sidebar`, `dialog`, `select`, `tabs`, etc.).
- **Testing**:
  - Jest + React Testing Library, configured in `jest.config.js` with jsdom environment and 70% global coverage thresholds.
  - Test-specific ESLint config lives in `__tests__/.eslintrc.json`.

### Application shell and global providers

`app/layout.tsx` defines the HTML shell and global React providers:

- **Fonts**: `Geist` and `Geist_Mono` from `next/font/google` supply CSS variables for typography.
- **ThemeProvider** (`components/theme-provider.tsx`):
  - Thin wrapper around `next-themes` `ThemeProvider`.
  - Controls light/dark mode and is toggled via `ModeToggle` (see `components/mode-toggle.tsx`) and other theme-aware components.
- **AuthProvider** (`components/auth-provider.tsx`):
  - Simple in-memory auth context with `user`, `login`, `register`, `logout`, and `isAuthenticated`.
  - `login`/`register` are mock implementations that validate basic inputs and then set `user`; there is no persistence or backend integration.
  - Accessed via `useAuth()`; consumers must be wrapped in `AuthProvider` (already done at the layout level).
- **ColorSchemeProvider** (`components/color-scheme-provider.tsx`):
  - Custom context providing named color palettes (e.g. `dark`, `colored`, `gold`, `aqua`, etc.).
  - Exposes `colorScheme`, `setColorScheme`, and `getPalette()`; the palettes are used to colorize charts and legends consistently.
  - `SiteHeader` exposes a palette dropdown that calls `setColorScheme`, and many chart components call `getPalette()` to derive Nivo/Recharts colors.

Agents modifying layout-level behavior should respect this provider stack and avoid bypassing `ThemeProvider`, `AuthProvider`, or `ColorSchemeProvider` when adding new top-level UI.

### Routing and pages

The main routes are implemented in `app/`:

- **`app/page.tsx` ("Home" dashboard)**
  - Client component (`"use client"`) that owns the primary interactive dashboard with:
    - `SidebarProvider`/`SidebarInset` from `components/ui/sidebar` defining the two-column layout.
    - `AppSidebar` for navigation and a "Quick Create" button.
    - `SiteHeader` for sidebar toggle and theme/color controls.
    - A `FileDropzone` for uploads, `SectionCards` for summary metrics, and a set of chart components (`ChartAreaInteractive`, `ChartCategoryFlow`, `ChartTransactionCalendar`, `ChartSpendingFunnel`, `ChartExpensesPie`).
    - A `DataTable` bound to transaction data.
    - `TransactionDialog`, controlled via local state, used to add a new transaction into the `transactions` array.
  - Initial transactions are loaded from `app/dashboard/transactions.json`; new transactions are appended in-memory only.

- **`app/dashboard/page.tsx`**
  - A more static dashboard variant that reads from `app/dashboard/data.json` instead of maintaining transaction state.
  - Shares most composition pieces with the home page: `AppSidebar`, `SiteHeader`, `SectionCards`, the chart components, and `DataTable`.

- **`app/analytics/page.tsx`**
  - Advanced analytics view composed of many Nivo/Recharts-based visualizations from `components/analytics-advanced-charts.tsx` alongside the standard charts and `SectionCards`.
  - Uses the same `SidebarProvider`/`AppSidebar`/`SiteHeader` layout pattern.

- **`app/savings/page.tsx`**
  - Focused view around savings growth, using `ChartSavingsAccumulation` plus `SectionCards` in the standard shell.

- **Auth pages (`app/login/page.tsx`, `app/register/page.tsx`)**
  - Centered card layouts that embed `LoginForm` and `RegisterForm` respectively.
  - Both include links back to `/` for quick navigation.
  - Forms call `useAuth()` to perform mock auth and then navigate using `next/navigation`'s `useRouter().push`.

When adding new routes, follow the pattern of using `SidebarProvider`/`SidebarInset` and reusing shared components instead of duplicating layout logic.

### Navigation and layout primitives

- **Sidebar system (`components/ui/sidebar.tsx`)**
  - Provides `SidebarProvider` and many layout primitives: `Sidebar`, `SidebarInset`, `SidebarHeader`, `SidebarContent`, `SidebarMenu`, `SidebarMenuButton`, `SidebarTrigger`, `SidebarRail`, etc.
  - Stores open/collapsed state in React state and mirrors it to a `sidebar_state` cookie for persistence.
  - Is mobile-aware via the `useIsMobile()` hook from `hooks/use-mobile.ts`, switching to a `Sheet`-based drawer on small screens.
  - Supports an `offcanvas` collapsible mode and an `icon`-only collapsed mode using data attributes for styling.

- **AppSidebar (`components/app-sidebar.tsx`)**
  - Assembles the sidebar using:
    - `NavMain` for primary navigation (Dashboard/Savings/Analytics plus a "Quick Create" button wired back to the page via the optional `onQuickCreate` prop).
    - `NavDocuments` for secondary resources.
    - `NavSecondary` for settings/help/search links.
    - `NavUser` in the footer for user/account controls.
  - Uses `next-themes` `useTheme()` to pick an appropriate logo icon variant.

- **NavUser (`components/nav-user.tsx`)**
  - Integrates tightly with `AuthProvider`:
    - When `isAuthenticated` is false, the footer shows a "Guest User" entry that links to `/login`.
    - When authenticated, renders a `DropdownMenu` with account/billing/notification/"Log out" options; `Log out` calls `logout()` and sends the user back to `/` via `next/navigation`.

The expectation is that auth-aware UI consults `useAuth()` and that new sidebar elements use the shared sidebar primitives instead of bespoke menus.

### Charts and color scheme integration

Many visualization components live under `components/` and share several patterns:

- All chart components (`chart-area-interactive`, `chart-category-flow`, `chart-expenses-pie`, `chart-transaction-calendar`, `chart-spending-funnel`, `chart-savings-accumulation`, `analytics-advanced-charts`) are client components and wrap their content in `Card` from `components/ui/card`.
- They use `useColorScheme()` to obtain a palette via `getPalette()`, usually filtering out the neutral `#c3c3c3` and reversing the palette so darker shades represent higher values.
- Recharts-based charts (`AreaChart`, `RadialBarChart`, etc.) and Nivo-based charts (`ResponsivePie`, `ResponsiveCalendar`, `ResponsiveFunnel`, `ResponsiveAreaBump`, etc.) are configured to:
  - Encode semantic meaning via color intensity (e.g. darker = more spending, higher rank, larger savings).
  - Use the shared palettes so changing the palette in the header updates all charts consistently.
- Several charts (e.g. `ChartAreaInteractive`, `ChartSavingsAccumulation`) also depend on `useIsMobile()` to adjust default time ranges and control layout.

Agents changing color behavior should route any palette changes through `ColorSchemeProvider` and its `getPalette()` contract rather than hardcoding colors in each chart.

### Auth, forms, and utilities

- **Auth forms** (`components/login-form.tsx`, `components/register-form.tsx`):
  - Built from primitives in `components/ui/card`, `components/ui/field`, `components/ui/input`, and `components/ui/button`.
  - Handle `onSubmit` manually, extract values from `FormData`, call `useAuth().login`/`register`, and either push to `/` or show an inline error via `FieldDescription`.

- **Transactions** (`components/transaction-dialog.tsx`, `components/data-table.tsx`):
  - `TransactionDialog` exposes a controlled `open`/`onOpenChange` API and an `onAddTransaction` callback; it manages local form state and emits a transaction payload (without `id`).
  - Consumers (e.g. `app/page.tsx`) are responsible for assigning IDs and updating their own state before re-rendering `DataTable`.

- **Utility helpers**:
  - `lib/utils.ts` exposes a single `cn(...inputs)` helper that wraps `clsx` + `tailwind-merge` for composing Tailwind class names.
  - `hooks/use-mobile.ts` is the central responsive hook used by layout and chart components to adjust for small screens.

### Testing structure

Testing is heavily documented under `TESTING_SUMMARY.md`, `__tests__/README.md`, and `__tests__/TESTING_OVERVIEW.md`. The key structural points for agents are:

- Tests are organized by feature under `__tests__/` (auth, components, navigation, pages, theme, ui, utils, hooks, integration, plus `mocks` and `e2e`).
- All React tests should import from `__tests__/test-utils` to get the custom `render` that wraps components in `ThemeProvider` and exposes helpers like `mockUser` and `mockDocument`.
- Jest environment and router/theme mocks are defined centrally in `__tests__/setup.ts`; new tests should rely on these mocks instead of re-defining them locally.
- Coverage rules and test patterns (unit vs integration vs e2e) are summarized in `TESTING_SUMMARY.md` and `__tests__/TESTING_OVERVIEW.md`; keep new tests consistent with the existing organization and coverage thresholds.

### Editor / tool integration

- **Path aliases**: Use `@/` imports instead of relative paths when referencing internal modules, matching `tsconfig.json` and `jest.config.js`.
- **Cursor MCP config**: `.cursor/mcp.json` defines an MCP server named `shadcn` using the `npx shadcn@latest mcp` command. This reflects that UI primitives are sourced from the `shadcn` ecosystem; when generating new UI components, match the existing `components/ui/` patterns and rely on shadcn-style composition.
