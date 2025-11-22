# Backend & AI Integration Plan

## 1. System Architecture Overview

Moving from static JSON to a dynamic, AI-powered backend requires a robust database and API layer. We will use **Next.js Server Actions** for seamless frontend-backend communication and a **PostgreSQL** database (via Prisma ORM) for persistence.

### Core Components
1.  **Unified Data Store**: A single source of truth for all transactions (from PDFs) and grocery items (from Receipts).
2.  **AI Processing Layer**: A service that accepts files (PDF/Images), sends them to an LLM (e.g., Gemini/GPT-4o) for extraction, and returns structured JSON.
3.  **Staging Area**: A "Review" state where AI-extracted data sits before the user confirms it into the main dashboard.
4.  **Reports Hub**: A central place to manage all uploaded documents.

---

## 2. Database Schema (Prisma)

We need to model Users, Reports (Files), Transactions (General Spending), and Fridge Items (Groceries).

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  reports   Report[]
  transactions Transaction[]
  fridgeItems  FridgeItem[]
}

// Represents an uploaded file (PDF Statement or Receipt Image)
model Report {
  id        String   @id @default(cuid())
  userId    String
  type      String   // "BANK_STATEMENT" | "RECEIPT"
  status    String   // "PROCESSING" | "REVIEW_REQUIRED" | "PROCESSED"
  url       String   // Storage URL
  createdAt DateTime @default(now())
  
  // Relations
  transactions Transaction[] // Generated from this report
  fridgeItems  FridgeItem[]  // Generated from this report
}

// General Spending (Populates Dashboard & Analytics)
model Transaction {
  id          String   @id @default(cuid())
  userId      String
  reportId    String?
  date        DateTime
  amount      Float
  description String
  category    String   // e.g., "Housing", "Dining", "Transport"
  isRecurring Boolean  @default(false)
}

// Fridge/Grocery Items (Populates Fridge Dashboard)
model FridgeItem {
  id          String   @id @default(cuid())
  userId      String
  reportId    String?
  name        String   // e.g., "Milk"
  category    String   // e.g., "Dairy"
  price       Float
  quantity    Int      @default(1)
  purchaseDate DateTime
}
```

---

## 3. AI Integration Strategy

We will create a `lib/ai-service.ts` to handle interactions with the LLM.

### Workflow A: Bank Statement (PDF)
1.  **Upload**: User uploads PDF at `/reports`.
2.  **Extraction**: Server reads text from PDF.
3.  **AI Prompt**:
    > "Analyze this bank statement text. Extract all transactions into a JSON array with fields: date (ISO), description, amount, and suggested_category. Detect if it looks like a recurring subscription."
4.  **Review UI**: User sees a table of extracted transactions. They can edit categories or amounts.
5.  **Confirm**: User clicks "Approve". Data moves to `Transaction` table. Dashboard charts update automatically.

### Workflow B: Supermarket Receipt (Image)
1.  **Upload**: User uploads image at `/fridge`.
2.  **Vision Analysis**: Send image to Multimodal AI.
3.  **AI Prompt**:
    > "Extract all food items from this receipt. Return JSON with: item_name, price, quantity, and food_category (e.g., Produce, Dairy, Snacks)."
4.  **Review UI**: User validates the list.
5.  **Confirm**: Data moves to `FridgeItem` table. Fridge charts update.

### AI Advisor
*   **Endpoint**: `/api/ai/advice`
*   **Function**: Fetches last 30 days of `Transaction` data and asks AI:
    > "Given these expenses, identify 3 areas where the user is overspending and suggest actionable tips."
*   **UI**: A "Financial Health" card on the Dashboard displaying these insights.

---

## 4. Unified Data & Endpoints

Instead of disparate JSON files, we will have unified data fetchers.

*   **`getDashboardData(userId)`**: Aggregates `Transaction` table.
    *   Returns: Total Balance, Monthly Spend, Category Breakdown (for Pie Charts), Spending History (for Area Charts).
*   **`getFridgeData(userId)`**: Aggregates `FridgeItem` table.
    *   Returns: Total Grocery Spend, Top Categories, Item Frequency.
*   **`getReports(userId)`**: Lists all `Report` records with status/filtering.

**Impact on Charts**:
*   All charts (Nivo/Recharts) will accept a standardized prop interface populated by these fetchers.
*   Example: The "Expenses Pie Chart" in Analytics and the "Category Breakdown" in Fridge will use the same underlying `PieChartComponent`, just fed different data sources.

---

## 5. New Feature: Reports Page

**Location**: Sidebar > "Reports"
**Route**: `/reports`

### UI Layout
*   **Header**: "Document Archive" with "Upload New" button.
*   **Filter Bar**: Filter by Type (Statement/Receipt), Date Range, Status (Processed/Pending).
*   **List View**:
    *   Card layout using Shadcn `Card`.
    *   Icon indicating type (PDF vs Image).
    *   Status Badge (Yellow for "Review Needed", Green for "Processed").
    *   "View Details" button to see the extracted data for that report.

---

## 6. Implementation Roadmap

### Phase 1: Backend Foundation
1.  [ ] Set up Prisma with SQLite (dev) / Postgres (prod).
2.  [ ] Define Schema (`schema.prisma`).
3.  [ ] Create Server Actions for CRUD operations on Transactions and FridgeItems.

### Phase 2: AI Service
4.  [ ] Implement `parsePDF` utility.
5.  [ ] Implement `analyzeDocument(file, type)` function using the AI API Key.
6.  [ ] Create the "Review Staging" UI (a specialized Data Table that allows editing before saving).

### Phase 3: Frontend Integration
7.  [ ] Refactor `Dashboard` to fetch from DB.
8.  [ ] Refactor `Fridge` to fetch from DB.
9.  [ ] Build the `/reports` page.

### Phase 4: The AI Advisor
10. [ ] Create the "Advisor" component on the Dashboard.
11. [ ] Hook it up to the `getDashboardData` context to generate live advice.
