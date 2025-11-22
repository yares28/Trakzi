# Project Deep Dive: Folio2

## 1. Project Overview
**Folio2** is a modern, high-performance personal finance and project management dashboard built with the latest web technologies. It emphasizes beautiful, interactive data visualization to help users track budgets, spending, and project deliverables.

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4, Shadcn UI, Radix UI Primitives
- **Icons**: Lucide React, Tabler Icons
- **Charts**: Nivo (primary), Recharts (secondary)
- **State Management**: React Context (Auth), Local State
- **Testing**: Jest, React Testing Library, MSW

## 2. Architecture & Flow

### Directory Structure
- **`app/`**: Contains the application routes and page logic.
  - `dashboard/`: Main view with summary cards and key charts.
  - `analytics/`: Advanced visualization hub with 10+ types of charts.
  - `savings/`: Dedicated view for savings accumulation tracking.
  - `login/` & `register/`: Authentication pages.
- **`components/`**: Reusable UI blocks.
  - `ui/`: Base Shadcn components (buttons, inputs, cards).
  - `*-chart.tsx`: Specialized chart components wrapping Nivo/Recharts.
  - `nav-*.tsx`: Navigation components for the sidebar and header.
- **`lib/`**: Utility functions (`utils.ts` for class merging).
- **`__tests__/`**: Robust testing suite covering auth, components, and pages.

### Application Flow
1.  **Authentication**: Users land on `/login`. The `AuthProvider` (`components/auth-provider.tsx`) handles the session. Currently, it uses a **mock implementation** (accepts any email/password > 6 chars) and stores the user in React state.
2.  **Navigation**: Once "logged in", the `AppSidebar` provides navigation between Dashboard, Analytics, and Savings.
3.  **Data Display**: Pages load static data (e.g., `app/dashboard/data.json`) or internal mock data within chart components to render visualizations.

## 3. Key Features

### ✅ Implemented
*   **Modern Dashboard Layout**: Responsive sidebar layout with a clean, professional aesthetic.
*   **Comprehensive Analytics**: A wide array of charts including:
    *   Area Interactive (Trends)
    *   Category Flow (Sankey)
    *   Spending Funnel
    *   Expenses Pie
    *   Advanced: Circle Packing, Polar Bar, Radar, TreeMap, Stream, SwarmPlot.
*   **Data Table**: A robust table (`components/data-table.tsx`) with sorting, filtering, and pagination for tracking items (currently "Deliverables" or "Tasks").
*   **Mock Authentication**: Functional UI for login/register flows.
*   **Theming**: Dark/Light mode support (`next-themes`) and dynamic color styling.
*   **Testing Infrastructure**: A complete test setup is in place, ensuring reliability for future development.

### 🚧 Unfinished / Mocked
*   **Backend Integration**: No real database connection. Data is hardcoded or read from JSON files.
*   **User Persistence**: Refreshing the page resets the auth state because it's not stored in a cookie/localStorage or verified by a server.
*   **Data Entry**: While there is a `TransactionDialog`, full CRUD (Create, Read, Update, Delete) operations are not hooked up to a persistent store.
*   **User Profile**: The user menu exists but settings are likely non-functional.

## 4. Data Model Analysis
The current `data.json` suggests a **Project Management** focus mixed with Finance:
```json
{
  "id": 1,
  "header": "Cover page",
  "type": "Cover page",
  "status": "In Process",
  "target": "18",
  "limit": "5",
  "reviewer": "Eddie Lake"
}
```
*   **Observation**: The table data looks like "Deliverables" with reviewers and status, while the Charts (Pie, Funnel) look like "Financial" data (Expenses, Savings).
*   **Recommendation**: Clarify the app's identity. Is it for Project Management (tracking deliverables) or Personal Finance (tracking money)? Or both (Project Budgeting)?

## 5. Ideas for Improvement

### 🎨 UX & Aesthetics
*   **Glassmorphism**: Add subtle glass effects to the sidebar and cards for a more premium feel.
*   **Micro-interactions**: Animate numbers counting up when the dashboard loads. Add hover scales to cards.
*   **Onboarding**: A quick tour (using `driver.js` or similar) to explain the charts to new users.

### 🚀 New Features
*   **AI Insights**: Use a simplified AI model to analyze the "Spending" data and give tips (e.g., "You spent 20% more on Dining this month").
*   **Export Reports**: Allow users to download their dashboard as a PDF or the data table as CSV.
*   **Budget Goals**: Allow users to set a "Limit" for each category and visually show progress bars in the table.
*   **Calendar View**: Integrate a calendar to show upcoming bills or project deadlines.

## 6. Implementation Roadmap

### Phase 1: Data Persistence (The "Real" App)
- [ ] Set up a database (PostgreSQL via Supabase or Neon).
- [ ] Create API routes (`app/api/...`) to fetch/save data.
- [ ] Replace `data.json` with a `useQuery` hook (TanStack Query) to fetch real data.

### Phase 2: Authentication
- [ ] Replace `AuthProvider` mock with NextAuth.js or Supabase Auth.
- [ ] Create a `User` table in the DB to store preferences.
- [ ] Implement "Forgot Password" flow.

### Phase 3: Feature Expansion
- [ ] **Transaction Management**: Build a full form to add/edit income and expenses.
- [ ] **Category Management**: Allow users to create custom categories with assigned colors.
- [ ] **Filtering**: Add a global date picker (e.g., "Last 30 Days", "Year to Date") that updates ALL charts.

### Phase 4: Polish
- [ ] Add loading skeletons for all charts.
- [ ] Implement the "Export to CSV" feature.
- [ ] Add tooltips to all complex charts explaining what they show.
