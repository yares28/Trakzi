## Analytics Card Layout & Sizing (How to Reuse on Another Page)

This document explains **exactly how the analytics cards are sized, positioned, and styled**, and how to **duplicate the same behavior on another page**.  
The layout is powered by **GridStack** (a 12‑column grid system) plus a custom **card size config**.

---

## 1. The Grid System (GridStack Basics)

- **Grid columns**
  - The analytics page uses a **12‑column grid**.
  - Every card has a width `w` in grid units where \(1 \leq w \leq 12\).
  - In this app we only use **6 or 12** as widths:
    - `w = 6` → half‑width card (50% of the container).
    - `w = 12` → full‑width card (100% of the container).

- **Grid height**
  - Each card has a height `h` in grid units.
  - GridStack multiplies `h` by `cellHeight` (set in `app/analytics/page.tsx`) to get the actual pixel height.
  - Example from the analytics page:
    - `cellHeight: 70`
    - If `h = 6`, visual height ≈ \(6 \times 70\) px (plus margins / padding).

- **Position**
  - Each card also has an `x` and `y` position in grid units:
    - `x` → horizontal column index (0–11).
    - `y` → vertical row index (0+; larger `y` = lower on the page).

- **How GridStack reads sizes**
  - Each card is rendered as a `div` with CSS class `grid-stack-item`.
  - GridStack reads its size from data attributes on that `div`:
    - `data-gs-w` → width `w`
    - `data-gs-h` → height `h`
    - `data-gs-x` → position `x`
    - `data-gs-y` → position `y`

---

## 2. Default Sizes & Positions (Initial Layout)

The initial layout for new users is defined in `app/analytics/page.tsx` in the `DEFAULT_CHART_SIZES` object.

Key idea:
- **Each chart id** (e.g. `"incomeExpensesTracking1"`) gets a **default `{ w, h, x, y }`**.
- These are used when **no saved layout** is in `localStorage`.

Example (simplified from `DEFAULT_CHART_SIZES`):

- **Full‑width cards**
  - `"incomeExpensesTracking1": { w: 12, h: 6, x: 0, y: 0 }`
  - `"incomeExpensesTracking2": { w: 12, h: 6, x: 0, y: 6 }`
  - `"spendingCategoryRankings": { w: 12, h: 8, x: 0, y: 12 }`
  - `"netWorthAllocation": { w: 12, h: 10, x: 0, y: 20 }`

- **Half‑width cards (left/right columns)**
  - `"moneyFlow": { w: 6, h: 10, x: 0, y: 30 }` → left column.
  - `"needsWantsBreakdown": { w: 6, h: 10, x: 6, y: 20 }` → right column.
  - `"expenseBreakdown": { w: 6, h: 10, x: 6, y: 30 }` → right column.
  - etc.

**How this fits into the DOM:**
- For each chart id, the page renders a `div.grid-stack-item` with:
  - `data-chart-id="moneyFlow"` etc.
  - `data-gs-w`, `data-gs-h`, `data-gs-x`, `data-gs-y` set from `DEFAULT_CHART_SIZES` **or** from the saved layout.
- Inside that `div`, a card component (e.g. `Card` / `SectionCards`) wraps the chart component itself.

---

## 3. Per‑Chart Min/Max Size Rules (`lib/chart-card-sizes.config.ts`)

The **global rules for how big each chart is allowed to be** live in `lib/chart-card-sizes.config.ts`.

- **Types**
  - `ChartId` is the union of all chart ids:
    - `"incomeExpensesTracking1"`, `"incomeExpensesTracking2"`, `"spendingCategoryRankings"`, …
  - `ChartCardSizeConfig` is:
    - `minW`, `maxW` → min/max width in grid units.
    - `minH`, `maxH` → min/max height in grid units.

- **Config map**
  - `CHART_CARD_SIZES: Record<ChartId, ChartCardSizeConfig>` gives a config per chart.
  - Example (from `lib/chart-card-sizes.config.ts`):
    - `incomeExpensesTracking1`: minW 6, maxW 12, minH 6, maxH 6 (fixed height).
    - `needsWantsBreakdown`: minW 6, maxW 12, minH 7, maxH 20.
    - `moneyFlow`: minW 6, maxW 12, minH 7, maxH 15.

- **Getter**
  - `getChartCardSize(chartId: ChartId)` returns the config for that chart.
  - The analytics page calls this when:
    - Initializing GridStack nodes.
    - Clamping width/height values so users cannot resize beyond allowed limits.

**Important behavior**:
- When the user resizes a card:
  - The **width** is forced to be either **6 or 12** (see the "Allowed sizes" section in `page.tsx`).
  - The **height** is clamped:
    - `h = max(sizeConfig.minH, min(sizeConfig.maxH, currentH))`.
  - This ensures each chart stays within sensible bounds.

---

## 4. Allowed Card Widths (Small vs Large)

In `app/analytics/page.tsx` there is an `allowedSizes` array and a `snapToAllowedSize` helper:

- **Allowed widths**
  - `allowedSizes = [ { w: 6, h: 6 }, { w: 12, h: 6 } ]`
  - Width is snapped to the **nearest** allowed width:
    - Anything < 9 → 6.
    - Anything ≥ 9 → 12.

- **Snap helper**
  - `snapToAllowedSize(w, h)`:
    - Picks the nearest width (6 or 12).
    - Keeps the height but later clamps it using the chart’s `minH`/`maxH`.

- **Why this matters**:
  - You **never** get a `w` like 7 or 9.
  - Cards are always **clean halves or full rows**, which keeps the grid looking nice and predictable.

---

## 5. How the `div` Sizes Map to the Card

Each card is roughly:

- An **outer container**: `div.grid-stack-item`
  - Has `data-gs-w`, `data-gs-h`, `data-gs-x`, `data-gs-y`.
  - GridStack manipulates these to compute **inline styles** (top, left, width, height).

- An **inner container**: `div.grid-stack-item-content` (or similar)
  - This is what you style with padding, background, borders, etc.
  - Inside this, you typically render a `Card` component from your UI library.

- A **card component**:
  - Often `Card` with a `CardHeader`, `CardContent`, etc.
  - Styling like border radius, shadows, typography is handled here.
  - GridStack’s height applies to the outer wrapper; the card simply fills that space.

Visually:
- Changing `w`/`h` (and `cellHeight`) changes the **bounding box**.
- Card styling is purely CSS and does **not** affect GridStack sizing logic.

---

## 6. Persistence: localStorage Layout

The layout is persisted so users keep their custom arrangement:

- **Keys**
  - `CHART_SIZES_STORAGE_KEY = "analytics-chart-sizes"`
  - `CHART_SIZES_VERSION_KEY = "analytics-chart-sizes-version"`
  - `DEFAULT_SIZES_VERSION = "7"` (at the time of writing).

- **On load**
  - The page:
    1. Tries to read saved layout from `localStorage["analytics-chart-sizes"]`.
    2. Reads version from `localStorage["analytics-chart-sizes-version"]`.
    3. If the version changed, it **merges** saved positions with new `DEFAULT_CHART_SIZES`.
       - Keeps `x`/`y` where possible.
       - Updates `w`/`h` to new defaults if necessary.

- **On change**
  - When a card is moved or resized:
    - GridStack emits change events.
    - The updated layout is assembled as:
      - `sizes[chartId] = { w, h, x, y }`
    - That object is saved to `localStorage` under the keys above.

**Result**:
- **First visit** → you see `DEFAULT_CHART_SIZES`.
- **Later visits** → you see your last layout, constrained by the per‑chart rules.

---

## 7. How to Duplicate This Layout on Another Page

To reuse this exact behavior on a new page (for example, a second analytics‑style page), follow this checklist.

### 7.1. Import the required pieces

- **GridStack**
  - Import and initialize `GridStack` similarly to `app/analytics/page.tsx`.
  - Make sure to import its CSS once (in the page or globally):
    - `import "gridstack/dist/gridstack.min.css"`.

- **Card size config**
  - Import `getChartCardSize` and `ChartId`:
    - `import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"`.
  - Either reuse existing `ChartId`s or **add new ids** there for your new page.

### 7.2. Define a chart order and default sizes

- Create a **chart order array** for rendering:
  - Example:
    - `const myPageChartOrder = ["incomeExpensesTracking1", "needsWantsBreakdown", ...] as ChartId[]`.

- Create a **`DEFAULT_CHART_SIZES` object** for this new page:
  - Same shape as on the analytics page:
    - `Record<string, { w: number; h: number; x?: number; y?: number }>`
  - For each chart id in your new page:
    - Choose sensible `w` (6 or 12) and `h`.
    - Choose `x` and `y` positions to layout rows and columns.

### 7.3. Render GridStack items with data attributes

For each chart:

- Render a `div` like:
  - `className="grid-stack-item"`
  - `data-chart-id` set to the chart’s id string.
  - `data-gs-w`, `data-gs-h`, `data-gs-x`, `data-gs-y` pulled from either:
    - the saved layout, or
    - your `DEFAULT_CHART_SIZES`.

Inside that `div`:

- Add a `div` for the content (`grid-stack-item-content` or similar).
- Render your `Card` and the actual chart component.

The **critical part** is that the outer `div.grid-stack-item` has the right **data attributes**; GridStack will handle the rest.

### 7.4. Initialize GridStack and apply constraints

In a `useEffect` (client‑only):

- Initialize once:
  - Call `GridStack.init({ column: 12, cellHeight: 70, margin: 8, ... })` on the grid container.
  - Grab all `.grid-stack-item` elements and ensure they use:
    - Snapped widths (`snapToAllowedSize`) where you want just 6 or 12.
    - Clamped heights using `getChartCardSize(chartId).minH / maxH`.

- For each node:
  - Set `node.minW`, `node.maxW`, `node.minH`, `node.maxH` using `getChartCardSize`.
  - This is required because GridStack reads constraints from the **node**, not from DOM attributes alone.

- Add event handlers for:
  - Width toggling (to enforce 6↔12 widths).
  - Saving the updated layout to `localStorage` (or any state store you want).

You can copy this logic from `app/analytics/page.tsx` and adapt the chart ids and storage key names.

### 7.5. Use a new localStorage key (if it’s a different page)

- If your new page represents a totally separate layout, use:
  - A **different** `STORAGE_KEY` and `VERSION_KEY`.
  - Example:
    - `"analytics-trends-chart-sizes"` and `"analytics-trends-chart-sizes-version"`.
- This prevents layouts from different pages overwriting each other.

---

## 8. Styling: Making Cards Look the Same

Visual styling is mostly independent from GridStack:

- Use the **same card component** (e.g. `Card` from `components/ui/card.tsx`) and apply:
  - `className` for padding, background, border radius, shadow.
  - Optional header/footer regions for titles and controls.

- The **outer height/width** is controlled by GridStack.
  - The card simply fills that rectangle.
  - If you want consistent internal spacing:
    - Use flexbox or CSS grid inside the card.
    - Don’t change outer height directly; instead, adjust `h` or `cellHeight`.

To keep things consistent:

- Reuse the same **card component** and **CSS utility classes**.
- Only adjust:
  - `DEFAULT_CHART_SIZES` for initial layout.
  - `CHART_CARD_SIZES` for allowed min/max sizes per chart.

---

## 9. Mental Model Summary

If Cursor “doesn’t understand you”, keep this mental model:

- **Grid units control the box; CSS controls the look.**
  - `w`, `h`, `x`, `y` in **grid units** → how big and where the card is.
  - `cellHeight` → how tall a single `h` unit is.
  - Card CSS → colors, padding, typography, but not the grid position.

- **Per‑chart config controls allowed sizes.**
  - `lib/chart-card-sizes.config.ts` → min/max width/height for each chart.

- **Default layout config controls initial placement.**
  - `DEFAULT_CHART_SIZES` in the page → initial `{ w, h, x, y }` per chart.

- **localStorage keeps user changes.**
  - Layout is read on load, updated after each drag/resize.

To duplicate the layout on any new page:

1. Import `GridStack` and `getChartCardSize`.
2. Define your chart ids and `DEFAULT_CHART_SIZES`.
3. Render `div.grid-stack-item` with `data-gs-*` attributes and a card inside.
4. Initialize GridStack, clamp sizes using `getChartCardSize`, and save changes.
5. Use a unique localStorage key if it’s a separate layout.






















