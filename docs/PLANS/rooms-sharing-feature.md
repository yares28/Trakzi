# Trakzi Friends & Rooms - Implementation Plan

**Status**: 🚧 In Progress — Frontend Shell Built
**Created**: 2026-02-28
**Updated**: 2026-03-01 (v3 - Frontend-First Update)
**Estimated Duration**: 10-14 days remaining
**Complexity**: High

---

## Current Implementation State

### ✅ Already Built (Frontend Shell)

| File | What It Does |
|------|-------------|
| `app/friends/page.tsx` | Main page — pill tab switcher (Rankings / Groups), intro card |
| `app/friends/components/FriendsLayout.tsx` | Layout wrapper with sidebar + header |
| `app/friends/components/RankingsTab.tsx` | Podium + glassmorphism leaderboard, 3 metrics (savings/frugality/targets), expandable rows |
| `app/friends/components/GroupsTab.tsx` | Themed gradient room cards grid, 3 summary stat cards, Create Group tile |
| `hooks/use-friends-bundle.ts` | React Query hook — fetches friends + rooms, supports demo mode |
| `app/api/demo/friends-bundle/route.ts` | Demo API returns `MOCK_FRIENDS_BUNDLE` |
| `lib/demo/mock-data.ts` | `MOCK_FRIENDS`, `MOCK_ROOMS`, `MOCK_FRIENDS_BUNDLE` |

### ✅ Design System Established (Do Not Change)

- **Tab switcher**: pill-shaped `rounded-full` container, active = `bg-background` with shadow
- **Room cards**: `rounded-3xl`, `bg-gradient-to-br`, 5 themes (blue/emerald/violet/rose/amber)
- **Leaderboard card**: `bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-3xl`
- **Typography**: `font-mono font-medium` page wrapper, `font-sans` for card content labels
- **Spacing**: `px-4 lg:px-6` horizontal, `gap-4 md:gap-6` between sections
- **Intro card**: `rounded-3xl border bg-muted/30 px-6 py-6` with `Badge + h1 + p`
- **Colors**: balance positive = `text-emerald-500`, negative = `text-rose-500`

### ❌ Not Yet Built

- Friend system (DB, API, types)
- Room system (DB, API, types)
- Shared transactions & splits
- "Friends" tab (3rd tab — social hub)
- Room detail page (`/rooms/[roomId]`)
- Friend profile page (`/friends/[friendId]`)
- All dialogs (Add Friend, Create Room, Quick Split, Settle Up)
- Real bundle API (`/api/friends-bundle`) — only demo exists

---

## Overview

A social expense-sharing feature that combines a **Friend System** with collaborative **Rooms**. Unlike standalone split apps (Splitwise, Tricount), Trakzi integrates splitting directly with the user's existing financial data, AI categorization, receipt OCR, and analytics engine — creating a uniquely powerful experience.

### What Makes This Different From Splitwise

| Feature | Splitwise | Trakzi |
|---------|-----------|--------|
| Receipt OCR → auto-extract items | ❌ Manual only | ✅ Gemini AI OCR |
| AI categorization of shared expenses | ❌ | ✅ 41-category AI system |
| Link personal bank transactions to splits | ❌ | ✅ CSV import integration |
| Shared analytics & insights | ❌ Basic totals | ✅ Full chart engine |
| Smart split suggestions from history | ❌ | ✅ AI pattern detection |
| Integrated budgeting | ❌ | ✅ Budget system |
| Debt simplification algorithm | ✅ | ✅ |
| Multi-currency | ✅ | ✅ USD/EUR/GBP |
| **Leaderboards & rankings** | ❌ | ✅ Already built |

---

## Architecture Decisions

### 1. Friend System + Room-Based Model
✅ **Chosen Approach (v2)**
- Users add friends via **email search**, **QR code**, or **unique friend code**
- Friends can create Rooms together for group expenses
- Friends page is the **social hub** — 3-tab layout: **Rankings / Friends / Groups**
- Rooms still use invite codes for non-friends (e.g., one-time events)

**Tab Architecture (actual):**
```
/friends
  ├── tab: Rankings   → RankingsTab.tsx   (podium + leaderboard — DONE)
  ├── tab: Friends    → FriendsTab.tsx    (friend list, requests, balances — TO BUILD)
  ├── tab: Groups     → GroupsTab.tsx     (room cards grid — DONE)
  └── tab: Challenges → ChallengesTab.tsx (cross-friend accountability — TO BUILD)
```

**Privacy Model:**
- Users are NOT discoverable by default
- Friend add requires: email (exact match), QR scan, or friend code
- Friends see: display name, avatar, shared room activity only
- Friends NEVER see: personal transactions, balances, categories, budgets

### 2. Friend Request Flow
✅ **Send → Accept/Decline**
- Sender searches by email (exact match only, not partial)
- Recipient gets in-app notification + optional email
- Both users must consent (no one-sided adding)
- Can block users (prevents future requests)

### 3. Quick Splits (Friend-to-Friend)
✅ **Direct splits without rooms**
- Select a friend → enter amount → split
- No room creation needed for 1:1 expenses
- History tracked under the friendship
- Ideal for: "I paid for lunch, you owe me $15"

### 4. Rooms (Group Expenses)
✅ **Enhanced with Friend System**
- Create room → invite friends (instant) or share invite code
- Friends appear as quick-add suggestions when creating rooms
- Room members don't need to be friends (invite codes still work)
- Rooms have roles: owner, admin, member

### 5. Transaction Limits

**Counting**: Shared transactions count against **uploader only**

| Plan | Max Friends | Max Rooms | Shared Tx/Month | Quick Splits/Month |
|------|-------------|-----------|------------------|--------------------|
| Free | 5 | 2 | 50 | 20 |
| Pro | 50 | 10 | 200 | 100 |
| Max | Unlimited | Unlimited | Unlimited | Unlimited |

---

## Market-Leading Upgrades

### Tier 1: Core Differentiators (MVP)

#### 1. AI Receipt Item Splitting
**Leverage existing**: Gemini OCR + receipt parsers (Mercadona, DIA, Consum)

```
User uploads receipt photo
  → OCR extracts items + prices automatically
  → Shows item list with checkboxes per friend
  → Each friend taps which items are theirs
  → Auto-calculates totals per person
```

**Why it wins**: Splitwise requires manual item entry. Trakzi does it in one photo.

#### 2. Link Personal Transactions to Splits
**Leverage existing**: Bank CSV import system

```
User sees "$85 - Restaurant" in their transactions
  → Taps "Split this" button
  → Selects room or friend
  → Chooses split method (equal, custom, item-level)
  → Original transaction gets linked to shared_transaction
```

**Why it wins**: No other app connects your actual bank data to group splits.

#### 3. Friend Insights Dashboard
**Leverage existing**: Analytics chart engine + bundle APIs

```
"You and Sarah" insights:
  - Total shared spending: $2,400 this year
  - Top shared categories: Dining ($800), Groceries ($600)
  - Average split: 52% you / 48% Sarah
  - Monthly trend chart
  - "You've settled $1,800 / $600 outstanding"
```

**Why it wins**: No split app shows analytics on your shared spending patterns.

#### 3a. Shared Spending Impact ✨ NEW
**Leverage existing**: Personal budget system + category data

Extends the Friend Insights section on the Friend Profile page with a budget-aware dimension:

```
"You and Alice shared €820 on Dining this year
  → That's 31% of your total Dining budget
  → Your Dining budget is on track for the month
  → Without shared meals: you'd have 12% more headroom"
```

Connects shared expenses to the user's **personal budget**, making them aware of how their social spending affects their own financial goals. Surfaces on the Friend Profile page beneath the existing spending breakdown. Privacy-safe — each user only sees their own budget impact, not the friend's.

#### 4. QR Code Friend Add
```
User opens Friends tab → taps "Add Friend" → "My QR Code"
  → Shows unique QR containing their friend code
  → Other user scans with phone camera
  → Instant friend request sent
```

**Why it wins**: Faster than typing email, perfect for in-person "let me add you" moments.

---

### Tier 2: Power Features (Phase 2)

#### 5. Smart Split Suggestions (AI)
**Leverage existing**: Gemini AI categorization engine

```
AI detects patterns:
  - "Last 5 times at Pizza Place, you split 50/50 with John"
  - Suggests same split automatically
  - "This looks like a group dinner (amount: $180). Split with Roommates?"
```

#### 6. Debt Simplification
```
Room has 4 people:
  A owes B: $30
  B owes C: $20
  A owes C: $10

Simplified:
  A pays C: $30
  A pays B: $10
  (B's debts cancel out)
```

Reduces number of payments needed. Classic algorithm (min-cost max-flow).

#### 7. Settlement Integration
```
User taps "Settle Up" with friend
  → Shows outstanding balance
  → Options:
    - "Mark as settled" (they paid cash/Venmo)
    - "Send payment link" (Bizum/Revolut/PayPal deep link)
    - "Request payment" (sends nudge notification)
```

#### 8. Split Templates
```
"Monthly Rent" template:
  - Room: Apartment 4B
  - Amount: $1,200
  - Split: Alice 50%, Bob 30%, Charlie 20%
  - Recurrence: 1st of every month
  - Auto-create split each month
```

#### 9. Shared Budgets per Room
**Leverage existing**: Budget system

```
"NYC Trip" room budget:
  - Total budget: $3,000
  - Spent so far: $1,800 (60%)
  - Per-person budget tracking
  - Budget burndown chart (reuse existing chart component)
```

#### 9a. Simplified Room Analytics ✨ NEW
**Leverage existing**: Existing chart components + room bundle API

A stats section within the Room Detail page (not a separate page — keep it focused). Shows the most useful signals without overwhelming:

```
Apartment 4B — Overview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Top categories      Groceries · Housing · Utilities
  Per-member totals   Alice $420 / Bob $310 / You $280
  Spending this month [small bar chart — last 4 weeks]
  ────────────────────────────────────────────────────
  Biggest expense:    Electric bill — $240
  Most active month:  January ($1,100)
```

**What "simplified" means**: one small bar chart (monthly totals), a top-3 category row, and per-member totals. No full analytics page — just a collapsible "Overview" section at the top of the room detail view. Powered by `getRoomBundle()` — no new aggregation file needed beyond adding a `analytics` field to the existing room bundle.

#### 10. Spending Chemistry Score ✨ NEW
**Leverage existing**: Personal transaction history + category engine

When two users become friends, the app computes a one-time compatibility card from their transaction histories (opt-in, privacy-safe — percentages only, no raw amounts):

```
You & Alice — 84% Financially Aligned
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Groceries over Dining    ✓ Both prioritize
  Savings Rate             ✓ Similar (28% vs 34%)
  Impulse Spending         ✗ You're 2x more likely
  Weekend Spending         ~ Slight divergence
```

Displayed as a card on the Friend Profile page. Re-calculated monthly.

**Why it's uniquely Trakzi**: No split app can compute this because they don't have transaction history. This card is only possible because users already categorized all their spending.

**Implementation notes**:
- Score computed server-side at friendship creation + monthly refresh
- Stored on the `friendships` table as a `chemistry_snapshot JSONB` column
- Categories mapped to 4-5 dimensions: savings tendency, spending priorities, impulse vs. planned, weekday vs. weekend patterns
- Never shown without explicit opt-in from both users

---

### Tier 3: Social & Gamification (Partially Built)

#### 11. Friend Rankings & Leaderboards ✅ BUILT
**Already implemented in `RankingsTab.tsx`:**
- Podium with Gold/Silver/Bronze crowns
- 3 ranking metrics: Savings Rate, Frugality, Targets Hit
- Expandable rows with progress bars per metric
- Trend indicators (up/down/flat)
- Empty state with ghosted podium slots
- "Add Friends" CTA button (needs dialog wiring)

**Privacy**: Rankings use percentages, never absolute amounts. Opt-in per user.

#### 12. Activity Feed
```
Friends tab shows recent activity:
  - "Sarah added a $45 dinner to NYC Trip"
  - "John settled $120 with you"
  - "New room invite: Weekend Getaway"
  - "Alice uploaded a receipt to Roommates"
```

#### 13. Challenges Tab ✨ NEW (own tab — not a room feature)
**Leverage existing**: AI-categorized personal transactions + ranking row components

A 4th standalone tab alongside Rankings / Friends / Groups. Challenges are **cross-friend, cross-room** — any group of friends can create one regardless of whether they share a room.

**Tab layout:**
```
┌─ Active Challenges ───────────────────────────────┐
│  🥗 No Dining Out — February          8 days left │
│     You · Alice · Bob · +2                        │
│  🛒 Groceries Under €300 — March       14 days left│
│     You · Charlie                                 │
└────────────────────────────────────────────────────┘

┌─ Challenge Detail (expanded) ─────────────────────┐
│  🛒 Groceries Under €300 — March                  │
│  ─────────────────────────────────────────────────│
│  Alice    €82   ██░░░░  Under pace ✓              │
│  You      €110  ████░░  On pace                   │
│  Bob      €145  ██████  ⚠ Over pace               │
│  ─────────────────────────────────────────────────│
│  Group total: €337 / €400 · 8 days left           │
│  [+ Invite Friend]   [Leave Challenge]            │
└────────────────────────────────────────────────────┘

[+ New Challenge]
```

**How progress is tracked**: each participant's personal transactions (already AI-categorized) are aggregated server-side by category + date range. No manual entry — the spending data is already there.

**Challenge setup:**
```
Category:    [Dining / Groceries / Shopping / Any]
Goal type:   [Individual cap / Group total cap]
Target:      €___
Duration:    [This month / 7 days / 30 days / Custom]
Invite:      [Select from friends list]
```

**Why it works as its own tab**: it's not about settling debts (Groups) or ranking long-term scores (Rankings) — it's a short-term, opt-in accountability layer. Friends who don't share a room can still challenge each other. Reuses the ranking row component for the leaderboard within each challenge.

**New DB tables needed:**
```sql
challenges (id, created_by, title, category, goal_type, target_amount,
            starts_at, ends_at, created_at)
challenge_participants (challenge_id, user_id, joined_at, current_spend)
```

#### 14. Shared Savings Goals
```
"Europe Trip Fund":
  - Target: $5,000
  - Alice: $1,200 saved
  - Bob: $800 saved
  - Progress bar with contributions
```

---

## Database Schema

### New Tables

#### friendships
```sql
CREATE TABLE friendships (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id)
);

-- Fast lookups for "my friends" and "pending requests"
CREATE INDEX idx_friendships_requester ON friendships(requester_id, status);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id, status);
-- Prevent duplicate friendships in either direction
CREATE UNIQUE INDEX idx_friendships_pair ON friendships(
    LEAST(requester_id, addressee_id),
    GREATEST(requester_id, addressee_id)
);
```

#### friend_codes (for QR code / shareable friend add)
```sql
CREATE TABLE friend_codes (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_friend_codes_code ON friend_codes(code);
```

#### rooms
```sql
CREATE TABLE rooms (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    description TEXT,
    avatar_url TEXT,
    currency TEXT DEFAULT 'EUR',
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rooms_created_by ON rooms(created_by);
CREATE UNIQUE INDEX idx_rooms_invite_code ON rooms(invite_code);
CREATE INDEX idx_rooms_created_at ON rooms(created_at DESC);
```

#### room_members
```sql
CREATE TABLE room_members (
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

CREATE INDEX idx_room_members_user ON room_members(user_id);
CREATE INDEX idx_room_members_room ON room_members(room_id);
```

#### shared_transactions
```sql
CREATE TABLE shared_transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    friendship_id TEXT REFERENCES friendships(id) ON DELETE SET NULL,
    uploaded_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_tx_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    description TEXT NOT NULL,
    category TEXT,
    transaction_date DATE NOT NULL,
    receipt_url TEXT,
    split_type TEXT CHECK (split_type IN ('equal', 'percentage', 'custom', 'item_level')) DEFAULT 'equal',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (room_id IS NOT NULL OR friendship_id IS NOT NULL)
);

-- Either room_id or friendship_id must be set (room split or quick split)
CREATE INDEX idx_shared_tx_room ON shared_transactions(room_id, transaction_date DESC)
    WHERE room_id IS NOT NULL;
CREATE INDEX idx_shared_tx_friendship ON shared_transactions(friendship_id, transaction_date DESC)
    WHERE friendship_id IS NOT NULL;
CREATE INDEX idx_shared_tx_uploader ON shared_transactions(uploaded_by);
CREATE INDEX idx_shared_tx_original ON shared_transactions(original_tx_id)
    WHERE original_tx_id IS NOT NULL;
```

#### receipt_items
```sql
CREATE TABLE receipt_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    shared_tx_id TEXT NOT NULL REFERENCES shared_transactions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receipt_items_tx ON receipt_items(shared_tx_id);
```

#### transaction_splits
```sql
CREATE TABLE transaction_splits (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    shared_tx_id TEXT NOT NULL REFERENCES shared_transactions(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES receipt_items(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'settled')) DEFAULT 'pending',
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_splits_user_status ON transaction_splits(user_id, status);
CREATE INDEX idx_splits_tx ON transaction_splits(shared_tx_id);
CREATE INDEX idx_splits_item ON transaction_splits(item_id) WHERE item_id IS NOT NULL;
```

#### challenges
```sql
CREATE TABLE challenges (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('individual_cap', 'group_total')),
    target_amount NUMERIC(10,2) NOT NULL,
    starts_at DATE NOT NULL,
    ends_at DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_challenges_creator ON challenges(created_by);
CREATE INDEX idx_challenges_ends_at ON challenges(ends_at);
```

#### challenge_participants
```sql
CREATE TABLE challenge_participants (
    challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    current_spend NUMERIC(10,2) DEFAULT 0,
    PRIMARY KEY (challenge_id, user_id)
);

CREATE INDEX idx_challenge_participants_user ON challenge_participants(user_id);
```

### Schema Relationships

```
users
  ↕ (friendships - bidirectional)
users
  ↓ (created_by)
rooms ←→ room_members ←→ users
  ↓ (room_id)
shared_transactions ←→ receipt_items
  ↑ (friendship_id - for quick splits)
  ↑ (original_tx_id - linked personal transaction)
  ↓ (shared_tx_id)
transaction_splits → users
```

### Key Design Decisions

**Bidirectional friendship uniqueness**: The `LEAST/GREATEST` unique index on `friendships` prevents both (A→B) and (B→A) from existing simultaneously. Only one row per friendship pair.

**Flexible shared_transactions**: The `CHECK (room_id IS NOT NULL OR friendship_id IS NOT NULL)` constraint ensures every shared transaction belongs to either a room OR a direct friendship split — never neither, optionally both.

**Partial indexes**: Indexes with `WHERE` clauses (e.g., `WHERE room_id IS NOT NULL`) keep the index small and fast by excluding irrelevant rows.

---

## Implementation Phases

### Phase 1: Database Schema & Core Infrastructure
**Complexity**: Medium | **Duration**: 1-2 days

#### Tasks
- [ ] 1.1 Create database migration SQL (all 7 tables + indexes)
- [ ] 1.2 Create TypeScript types (`lib/types/friends.ts`, `lib/types/rooms.ts`)
- [ ] 1.3 Create invite/friend code generator (`lib/friends/codes.ts`)
- [ ] 1.4 Verify indexes with EXPLAIN queries
- [ ] 1.5 Seed test data for development

**Checkpoint**:
- [ ] All tables created with proper cascades
- [ ] Bidirectional friendship uniqueness enforced
- [ ] Code generators produce cryptographically secure output

---

### Phase 2: Friend System API
**Complexity**: Medium | **Duration**: 2-3 days
**Depends on**: Phase 1

#### Tasks
- [ ] 2.1 Create friend search endpoint
  - `POST /api/friends/search` - Search by exact email
  - Returns: user_id, display name, avatar (limited info)
  - Rate limited: 10 searches/minute (prevent enumeration)
- [ ] 2.2 Create friend request endpoints
  - `POST /api/friends/request` - Send friend request (by user_id or friend code)
  - `GET /api/friends/requests` - Get pending requests (sent + received)
  - `PATCH /api/friends/requests/[id]` - Accept/decline request
- [ ] 2.3 Create friend list endpoint
  - `GET /api/friends` - Get accepted friends with basic profile + net balance
  - `DELETE /api/friends/[friendshipId]` - Remove friend
  - `POST /api/friends/block/[userId]` - Block user
- [ ] 2.4 Create friend code system
  - `GET /api/friends/my-code` - Get/generate personal friend code
  - `POST /api/friends/add-by-code` - Add friend via code (for QR scan)
- [ ] 2.5 Create friend permission middleware (`lib/friends/permissions.ts`)
  - `verifyFriendship(userId, friendId)` - Check accepted friendship
  - `checkFriendLimit(userId)` - Check plan limit

**Security Checklist**:
- [ ] Email search is exact match only (no partial/wildcard)
- [ ] Rate limiting on search endpoint (prevent email enumeration)
- [ ] Block feature prevents all future interaction
- [ ] Friend codes are non-sequential, cryptographically random
- [ ] Users cannot see non-friend profiles

---

### Phase 3: Room Management API
**Complexity**: Medium | **Duration**: 1-2 days
**Depends on**: Phase 1, Phase 2

#### Tasks
- [ ] 3.1 Create room permission middleware (`lib/rooms/permissions.ts`)
- [ ] 3.2 Implement room CRUD
  - `POST /api/rooms` - Create room
  - `GET /api/rooms` - List user's rooms
  - `GET /api/rooms/[roomId]` - Room details
  - `PATCH /api/rooms/[roomId]` - Update (owner/admin)
  - `DELETE /api/rooms/[roomId]` - Delete (owner only)
- [ ] 3.3 Implement membership
  - `POST /api/rooms/join` - Join via invite code
  - `POST /api/rooms/[roomId]/invite` - Invite friends (instant add)
  - `DELETE /api/rooms/[roomId]/members/[userId]` - Remove member
  - `PATCH /api/rooms/[roomId]/members/[userId]/role` - Change role
- [ ] 3.4 Plan limit enforcement (`lib/rooms/limits.ts`)

**Friend Integration**: When creating a room, show friends list for quick-invite. Friends don't need to enter invite codes — they get added directly (with notification).

---

### Phase 4: Shared Transactions & Splits (CRITICAL)
**Complexity**: Complex | **Duration**: 2-3 days
**Depends on**: Phase 2, Phase 3

#### Tasks
- [ ] 4.1 Room transaction endpoints
  - `POST /api/rooms/[roomId]/transactions` - Upload shared transaction
  - `GET /api/rooms/[roomId]/transactions` - Paginated feed
  - `GET /api/rooms/[roomId]/transactions/[txId]` - Detail with splits
  - `DELETE /api/rooms/[roomId]/transactions/[txId]` - Delete (uploader/admin)
- [ ] 4.2 Quick split endpoints (friend-to-friend, no room)
  - `POST /api/friends/[friendshipId]/splits` - Create quick split
  - `GET /api/friends/[friendshipId]/splits` - Get split history
- [ ] 4.3 Link personal transaction to split
  - `POST /api/transactions/[txId]/share` - Share existing transaction
  - Links `transactions.id` → `shared_transactions.original_tx_id`
- [ ] 4.4 Split validation logic
  - Splits sum to total (±$0.01 tolerance)
  - All split users are room members or friends
  - Transaction limits enforced
- [ ] 4.5 Balance calculation engine (`lib/rooms/balances.ts`)
  - Per-room balances
  - Per-friendship balances
  - Cross-room aggregate ("total owed/owe across everything")
- [ ] 4.6 Settlement endpoints
  - `PATCH /api/splits/[splitId]/settle` - Mark as settled
  - `GET /api/friends/[friendshipId]/balance` - Net balance with friend

**Split Types Supported:**

| Type | Description | Use Case |
|------|-------------|----------|
| `equal` | Split evenly among all | Quick dinner split |
| `percentage` | Custom % per person | Rent (50/30/20) |
| `custom` | Manual amounts | Variable costs |
| `item_level` | Per-receipt-item assignment | Grocery receipts |

---

### Phase 5: AI Receipt Splitting (KEY DIFFERENTIATOR)
**Complexity**: Medium | **Duration**: 1-2 days
**Depends on**: Phase 4
**Leverages existing**: Gemini OCR + receipt parsers

#### Tasks
- [ ] 5.1 Extend receipt OCR for shared context
  - Reuse `extractTextFromImage()` from `lib/receipts/ocr/`
  - Reuse merchant-specific parsers (Mercadona, DIA, Consum)
  - Return structured item list with prices
- [ ] 5.2 Create shared receipt upload flow
  - `POST /api/rooms/[roomId]/receipts` - Upload receipt image
  - OCR extracts items → returns item list for splitting
  - Users assign items to members via UI
  - Auto-calculate totals per person
- [ ] 5.3 Smart split suggestions (AI)
  - Use Gemini to detect split patterns from history
  - "Last 3 times you split Pizza Place 50/50 with John"
  - Suggest same split automatically

**Existing Infrastructure to Reuse:**
- `lib/receipts/ocr/extractTextFromImage.ts` - Gemini OCR
- `lib/receipts/parsers/` - Merchant-specific parsing
- `lib/ai/categoriseTransactions.ts` - Category assignment
- `lib/ai/posthog-gemini.ts` - Gemini client

---

### Phase 6: Complete the Friends Page UI
**Complexity**: Medium | **Duration**: 2-3 days
**Depends on**: Phases 2-4
**Design constraint**: Build on existing design — do NOT redesign what's already there

#### What's Done ✅

| Component | File | Status |
|-----------|------|--------|
| Page shell + tab switcher (3 tabs) | `app/friends/page.tsx` | ✅ Done — needs 4th tab added |
| Layout wrapper | `app/friends/components/FriendsLayout.tsx` | ✅ Done |
| Rankings tab (podium + list) | `app/friends/components/RankingsTab.tsx` | ✅ Done |
| Groups tab (room cards) | `app/friends/components/GroupsTab.tsx` | ✅ Done |
| Data hook | `hooks/use-friends-bundle.ts` | ✅ Done — needs challenges field |
| Demo API | `app/api/demo/friends-bundle/route.ts` | ✅ Done |
| Mock data | `lib/demo/mock-data.ts` | ✅ Done — needs challenge mock data |

#### 6.1 Add a 3rd "Friends" Tab

**Update `app/friends/page.tsx`**: Add `"friends"` to `FriendsViewMode` and add a 3rd pill button between Rankings and Groups using the existing pill switcher pattern.

**Tab order**: Rankings | Friends | Groups | Challenges

```tsx
// New tab button — insert between Rankings and Groups buttons:
<button
  type="button"
  onClick={() => setViewMode("friends")}
  className={cn(
    "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ease-out",
    viewMode === "friends"
      ? "bg-background text-foreground shadow-[0_2px_10px_rgba(0,0,0,0.05)] scale-100"
      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 scale-[0.98]"
  )}
>
  <UserCheck className={cn(
    "size-4 transition-colors",
    viewMode === "friends" ? "text-primary/80" : "text-muted-foreground"
  )} />
  Friends
</button>
```

**Update intro card** to show different title/description per tab (already does this for rankings/groups — extend to friends).

#### 6.2 Create FriendsTab Component

**File**: `app/friends/components/FriendsTab.tsx`

**Sections** (styled to match existing design):

```
┌─ Net Balance Card ─────────────────────────────────┐
│  (same summary card style as GroupsTab — 3 stats)  │
│  Total Friends: 6 | Owed to you: $75 | You owe: $0 │
└────────────────────────────────────────────────────┘

┌─ Pending Requests (if any) ───────────────────────┐
│  Small section, collapsible                        │
│  Each request: avatar + name + [Accept] [Decline]  │
│  Style: rounded-2xl bg-muted/30 with amber badge   │
└────────────────────────────────────────────────────┘

┌─ Friends List ────────────────────────────────────┐
│  Glassmorphism card (same style as leaderboard)   │
│  Row: avatar | name | last active | balance badge │
│  Tap row → /friends/[friendshipId]                │
│  Bottom: "Add Friend" button (same as Rankings)   │
└────────────────────────────────────────────────────┘

┌─ Activity Feed ────────────────────────────────────┐
│  Last 10 events from rooms + quick splits          │
│  Each item: icon | text | timestamp               │
│  Icons: receipt, handshake, door-open, user-plus  │
└────────────────────────────────────────────────────┘
```

**Data from bundle** (extend `FriendsBundleData`):
```typescript
interface FriendsBundleData {
  friends: FriendScore[]    // existing (rankings data)
  rooms: RoomData[]         // existing (groups data)
  friendsList: FriendWithBalance[]    // NEW: friend + net balance
  pendingRequests: FriendRequest[]    // NEW: incoming/outgoing requests
  activityFeed: ActivityItem[]        // NEW: recent room/split activity
  netBalance: {                       // NEW: aggregate
    totalOwedToYou: number
    totalYouOwe: number
  }
}
```

**Mock data to add in `MOCK_FRIENDS_BUNDLE`**:
```typescript
friendsList: [
  { id: "1", name: "Alice Chen", avatarUrl: "", balance: -45.50, lastActive: "2h ago", status: "accepted" },
  { id: "2", name: "Bob Smith",  avatarUrl: "", balance: 0,      lastActive: "1d ago", status: "accepted" },
  ...
],
pendingRequests: [
  { id: "req-1", from: { id: "99", name: "Marco Polo", avatarUrl: "" }, sentAt: "1h ago", direction: "incoming" }
],
activityFeed: [
  { id: "a1", type: "split_added",   text: "Alice added a $45 dinner to Apartment 4B",  time: "2h ago" },
  { id: "a2", type: "split_settled", text: "Bob settled $30 with you",                   time: "Yesterday" },
  { id: "a3", type: "room_invite",   text: "You joined Weekend Getaway ✈️",              time: "3d ago" },
],
netBalance: { totalOwedToYou: 75.00, totalYouOwe: 0 }
```

#### 6.3 Wire Up Existing Buttons

| Button | Location | Wire To |
|--------|----------|---------|
| "Add Friends" | `RankingsTab.tsx` bottom | `AddFriendDialog` |
| "Create Group" tile | `GroupsTab.tsx` | `CreateRoomDialog` |
| Room card click | `GroupsTab.tsx` | `router.push('/rooms/${room.id}')` |
| Friend row click | `FriendsTab.tsx` | `router.push('/friends/${friend.id}')` |

#### 6.4 Create ChallengesTab Component

**File**: `app/friends/components/ChallengesTab.tsx`

**Sections:**
- Active challenges list — each expandable to show per-member leaderboard rows (reuse ranking row component)
- Challenge detail — progress bars + group total + days remaining
- "New Challenge" button → `CreateChallengeDialog`
- Empty state with CTA when no active challenges

**New dialog**: `CreateChallengeDialog` — category picker, goal type (individual cap / group total), target amount, duration, friend invite list.

**Mock data to add** in `MOCK_FRIENDS_BUNDLE`:
```typescript
challenges: [
  {
    id: "c1", title: "Groceries Under €300", category: "Groceries",
    goalType: "group_total", target: 300, endsAt: "2026-03-31",
    daysLeft: 14,
    participants: [
      { id: "1", name: "Alice Chen",  currentSpend: 82,  avatarUrl: "" },
      { id: "7", name: "You",         currentSpend: 110, avatarUrl: "" },
      { id: "2", name: "Bob Smith",   currentSpend: 145, avatarUrl: "" },
    ]
  }
]
```

#### 6.5 Dialogs to Create

| Component | File | Purpose |
|-----------|------|---------|
| `AddFriendDialog` | `components/friends/add-friend-dialog.tsx` | 3 tabs: Email / Friend Code / My QR |
| `CreateRoomDialog` | `components/rooms/create-room-dialog.tsx` | Name, description, theme picker, invite friends |
| `JoinRoomDialog` | `components/rooms/join-room-dialog.tsx` | Enter invite code |
| `QuickSplitDialog` | `components/friends/quick-split-dialog.tsx` | 1:1 split — amount + split type |
| `SettleUpDialog` | `components/rooms/settle-up-dialog.tsx` | Mark settled or send payment link |

All dialogs use shadcn `Dialog` + same `rounded-3xl` / `font-mono` design language.

**`AddFriendDialog` detail** (3 tabs inside):
```
Email tab:   Input → Search → Found card → Send Request button
Code tab:    Paste code field → Add Friend button
My QR tab:   QR code display (react-qr-code) + copy code button
```

#### 6.5 Room Detail Page

**File**: `app/rooms/[roomId]/page.tsx`

```
┌─ Header ──────────────────────────────────────────┐
│  ← [Room Name]                    [⚙ Settings]   │
│  [member avatars] · Invite code: ABC123 [Copy]    │
└────────────────────────────────────────────────────┘

┌─ Balances ─────────────────────────────────────────┐
│  Same 3-card summary as GroupsTab                  │
│  Per-member balance rows below                     │
│  [Settle Up] button                                │
└────────────────────────────────────────────────────┘

┌─ Transactions ─────────────────────────────────────┐
│  Paginated feed, newest first                      │
│  Each: description | amount | your share | date    │
│  [+ Add Transaction] [📸 Scan Receipt] buttons     │
└────────────────────────────────────────────────────┘
```

Style: use `rounded-3xl` cards, same theme gradient as room card's theme color.

#### 6.6 Friend Profile Page

**File**: `app/friends/[friendId]/page.tsx`

```
┌─ Header ──────────────────────────────────────────┐
│  ← [Friend Name]              Friends since [date] │
└────────────────────────────────────────────────────┘

┌─ Balance Card (theme: primary/secondary) ──────────┐
│  Net balance + [Settle Up] + [Quick Split] buttons │
└────────────────────────────────────────────────────┘

┌─ Spending Chemistry (✨ NEW — opt-in both users) ──┐
│  "84% Financially Aligned"                         │
│  4 dimension rows: ✓ ✗ ~ indicators                │
│  "Recalculated monthly"                            │
└────────────────────────────────────────────────────┘

┌─ Spending Insights ────────────────────────────────┐
│  Total shared, top category, avg split ratio       │
│  Small chart (reuse existing chart engine)         │
│                                                    │
│  Shared Spending Impact (✨ NEW):                  │
│  "€820 shared on Dining = 31% of your budget"      │
│  "Without shared meals: 12% more headroom"         │
└────────────────────────────────────────────────────┘

┌─ Shared Rooms ─────────────────────────────────────┐
│  Small room chips (name + balance)                 │
└────────────────────────────────────────────────────┘

┌─ Recent Splits ────────────────────────────────────┐
│  List of quick splits + room splits with friend    │
└────────────────────────────────────────────────────┘
```

#### 6.7 Sidebar Badge

**File**: `components/app-sidebar.tsx` (already updated with Friends link)

Add unsettled count badge — total pending splits across all rooms + direct splits.

---

### Phase 7: Bundle API & Caching
**Complexity**: Medium | **Duration**: 1 day
**Depends on**: Phases 2-5

#### Tasks
- [ ] 7.1 Create real friends bundle API (`/api/friends-bundle`)
  - Replace demo-only endpoint with real authenticated one
  - Returns: friendsList, pendingRequests, rooms, activityFeed, netBalance, friends (leaderboard)
- [ ] 7.2 Create room bundle API
  - `GET /api/rooms/[roomId]/bundle` → room details, members, transactions, balances
- [ ] 7.3 Create friend profile bundle API
  - `GET /api/friends/[friendId]/bundle` → profile, balance, insights, shared rooms, splits
- [ ] 7.4 Implement cache strategy

**Cache Keys:**

| Key Pattern | TTL | Invalidate On |
|-------------|-----|---------------|
| `friends:user:{userId}:list` | 5 min | Friend added/removed |
| `friends:user:{userId}:requests` | 1 min | Request sent/received/responded |
| `friends:user:{userId}:balance` | 1 min | Split created/settled |
| `rooms:user:{userId}:list` | 5 min | Room created/joined/left |
| `room:{roomId}:bundle` | 2 min | Transaction/member change |
| `room:{roomId}:balance` | 1 min | Split created/settled |
| `friendship:{id}:insights` | 10 min | Transaction added/settled |

---

### Phase 8: Plan Limits & Enforcement
**Complexity**: Simple | **Duration**: 0.5 day
**Can parallelize with**: Phase 6

#### Tasks
- [ ] 8.1 Update `lib/plan-limits.ts` with friend/room limits
- [ ] 8.2 Create `lib/friends/limits.ts` (friend count, search rate limit)
- [ ] 8.3 Create `lib/rooms/limits.ts` (room count, transaction count)
- [ ] 8.4 Integrate checks into all creation endpoints
- [ ] 8.5 User-friendly upgrade prompts when limits reached

---

### Phase 9: Testing & Documentation
**Complexity**: Medium | **Duration**: 2 days
**Depends on**: All previous phases

#### Tasks
- [ ] 9.1 API tests for friend system
- [ ] 9.2 API tests for room system
- [ ] 9.3 API tests for split calculations
- [ ] 9.4 Security audit (auth, permissions, rate limiting)
- [ ] 9.5 Performance testing (balance calculations at scale)
- [ ] 9.6 Update documentation files
- [ ] 9.7 Build verification (`npm run build`)

---

## API Routes Summary

### Friend Management
| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | `/api/friends/search` | Search by email (exact) | 10/min |
| POST | `/api/friends/request` | Send friend request | 20/hour |
| GET | `/api/friends` | List accepted friends | - |
| GET | `/api/friends/requests` | Pending requests | - |
| PATCH | `/api/friends/requests/[id]` | Accept/decline | - |
| DELETE | `/api/friends/[friendshipId]` | Remove friend | - |
| POST | `/api/friends/block/[userId]` | Block user | - |
| GET | `/api/friends/my-code` | Get friend code | - |
| POST | `/api/friends/add-by-code` | Add via code/QR | 20/hour |
| GET | `/api/friends-bundle` | Friends page bundle (all data) | - |

### Friend Quick Splits
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/friends/[friendshipId]/splits` | Create 1:1 split |
| GET | `/api/friends/[friendshipId]/splits` | Split history |
| GET | `/api/friends/[friendshipId]/balance` | Net balance |
| GET | `/api/friends/[friendshipId]/bundle` | Profile + insights |

### Room Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rooms` | Create room |
| GET | `/api/rooms` | List rooms |
| GET | `/api/rooms/[roomId]` | Room details |
| PATCH | `/api/rooms/[roomId]` | Update room |
| DELETE | `/api/rooms/[roomId]` | Delete room |
| POST | `/api/rooms/join` | Join via invite code |
| POST | `/api/rooms/[roomId]/invite` | Invite friends |
| DELETE | `/api/rooms/[roomId]/members/[userId]` | Remove member |

### Shared Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rooms/[roomId]/transactions` | Upload transaction |
| GET | `/api/rooms/[roomId]/transactions` | Paginated feed |
| DELETE | `/api/rooms/[roomId]/transactions/[txId]` | Delete |
| POST | `/api/rooms/[roomId]/receipts` | Upload receipt (OCR) |
| POST | `/api/transactions/[txId]/share` | Share personal tx |
| PATCH | `/api/splits/[splitId]/settle` | Settle split |
| GET | `/api/rooms/[roomId]/bundle` | Room bundle |
| GET | `/api/rooms/[roomId]/balance` | Balance summary |

---

## Permissions Matrix

### Room Permissions

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| Upload transaction | ✅ | ✅ | ✅ |
| Upload receipt (OCR) | ✅ | ✅ | ✅ |
| Delete own transaction | ✅ | ✅ | ✅ |
| Delete others' transaction | ✅ | ✅ | ❌ |
| Update room settings | ✅ | ✅ | ❌ |
| Delete room | ✅ | ❌ | ❌ |
| Invite friends | ✅ | ✅ | ❌ |
| Remove members | ✅ | ✅ | ❌ |
| Change member roles | ✅ | ❌ | ❌ |
| View transactions | ✅ | ✅ | ✅ |
| Settle own splits | ✅ | ✅ | ✅ |

### Friend Permissions

| Action | Friend | Blocked |
|--------|--------|---------|
| Send quick split | ✅ | ❌ |
| View balance | ✅ | ❌ |
| View insights | ✅ | ❌ |
| Invite to room | ✅ | ❌ |
| Send messages | ❌ (future) | ❌ |

---

## Risk Mitigation

### Risk: Email enumeration via friend search
**Impact**: High | **Probability**: Medium
**Mitigation**:
- Exact email match only (no partial search)
- Rate limit: 10 searches/minute per user
- Generic "not found" response (no user exists vs. not on platform)
- Log and alert on suspicious search patterns

### Risk: Friend request spam
**Impact**: Medium | **Probability**: Medium
**Mitigation**:
- Rate limit: 20 requests/hour
- Block feature prevents repeat requests
- Auto-decline after 30 days (keeps things clean)

### Risk: Balance calculation performance with many rooms/friends
**Impact**: High | **Probability**: Medium
**Mitigation**:
- Aggregate balances with DB-level SUM/GROUP BY
- Cache aggressively (1-2 min TTL)
- Index on (user_id, status) for fast filtering
- Consider materialized view for "total balance across all" query

### Risk: QR code security (friend code hijacking)
**Impact**: Low | **Probability**: Low
**Mitigation**:
- Friend codes are 8-character crypto random (32^8 = 1.1 trillion combinations)
- Still requires request acceptance (not auto-add)
- Can regenerate code at any time

### Risk: Orphaned data on friendship deletion
**Impact**: Medium | **Probability**: Medium
**Mitigation**:
- Shared transactions keep `friendship_id` as SET NULL (history preserved)
- Quick split history remains visible to both parties
- Balance shows as "Former friend" with settled/unsettled status

---

## Success Metrics

### Performance
- [ ] Friend search < 200ms
- [ ] Friends page load < 1s
- [ ] Room page load < 1.5s
- [ ] Balance calculation < 200ms
- [ ] Receipt OCR + item extraction < 5s
- [ ] QR code generation < 100ms

### Engagement (Track via PostHog)
- [ ] % of users who add at least 1 friend (target: 30% in first month)
- [ ] Average rooms per active user (target: 1.5)
- [ ] % of splits settled within 7 days (target: 60%)
- [ ] Receipt OCR usage rate (target: 40% of shared transactions)
- [ ] Quick split vs room split ratio
- [ ] % of users who check Rankings tab (target: 50%)

### Security
- [ ] 0 email enumeration vulnerabilities
- [ ] 0 authorization bypass issues
- [ ] All queries user-scoped
- [ ] Rate limiting enforced on all public endpoints

---

## Future Enhancements (Post-MVP)

### Phase 2 Features (2-4 weeks after MVP)
- [ ] Debt simplification algorithm (min-cost max-flow)
- [ ] Settlement deep links (Bizum, Revolut, PayPal)
- [ ] Split templates (recurring splits)
- [ ] Push notifications for new splits/settlements
- [ ] Room analytics dashboard (charts reusing existing engine)
- [ ] Export room history to CSV

### Phase 3 Features (2-3 months)
- [ ] Shared room budgets
- [ ] Spending challenges between friends (leaderboard already done)
- [ ] Shared savings goals
- [ ] Smart split suggestions (AI learns patterns)
- [ ] Auto-detect shareable transactions ("$180 at restaurant → split?")

### Phase 4 Enterprise (6+ months)
- [ ] Company expense rooms
- [ ] Approval workflows for business splits
- [ ] Audit logs
- [ ] Custom roles
- [ ] Advanced reporting / export

---

## Changelog

### 2026-03-02 v5 - Room & Challenges Upgrades
- Added **Simplified Room Analytics** (item 9a): collapsible Overview section in Room Detail — top-3 categories, per-member totals, monthly bar chart. No new aggregation file, extends existing room bundle.
- Added **Challenges Tab** (item 13, own tab): `ChallengesTab.tsx` — 4th tab in the pill switcher. Cross-friend, cross-room accountability challenges powered by personal AI-categorized transactions. Includes `CreateChallengeDialog`, mock data spec, 2 new DB tables (`challenges`, `challenge_participants`).
- Removed Recurring Expense Templates (no upload trigger date — doesn't fit the model)
- Tab architecture updated: Rankings | Friends | Groups | **Challenges**
- Updated `page.tsx` status note to reflect 4th tab needed

### 2026-03-02 v4 - Financial Intelligence Upgrades
- Added **Spending Chemistry Score** (Tier 2, #10): opt-in compatibility card computed from transaction history, stored as `chemistry_snapshot JSONB` on friendships, shown on Friend Profile page
- Added **Shared Spending Impact** (extends Tier 1 #3): connects shared expenses to personal budget — "€820 shared on Dining = 31% of your dining budget", shown in Spending Insights section of Friend Profile
- Removed "This Looks Shareable" detection feature (dropped by design decision)
- Updated Friend Profile page spec (Phase 6.6) to include both new sections
- Renumbered Tier 3 items (11–14) to accommodate new Tier 2 entry

### 2026-03-01 v3 - Frontend-First Update
- Updated plan to reflect actual frontend already built by developer
- Documented existing design system (pill tabs, themed cards, podium, glassmorphism)
- Redesigned Phase 6 to build ON TOP of existing components instead of replacing them
- Added 3rd "Friends" tab to tab architecture (Rankings | Friends | Groups)
- Defined `FriendsTab.tsx` component spec with sections matching existing visual style
- Defined `AddFriendDialog` with 3 sub-tabs (Email / Code / My QR)
- Added mock data additions needed for new FriendsTab fields
- Marked leaderboard/rankings (Phase 3 Tier 3 #10) as ✅ BUILT
- Added Friends page metrics to PostHog success targets

### 2026-02-28 v2 - Friend System + Market Upgrades
- Replaced invite-only model with full Friend System
- Added friend search (email), friend codes, QR code add
- Added Quick Splits (friend-to-friend without rooms)
- Added "Link Personal Transaction to Split" feature
- Added AI Receipt Splitting leveraging existing OCR
- Added Friend Insights (analytics per friendship)
- Added Activity Feed
- Added Friend Profile page
- Redesigned Friends page as social hub
- Updated database schema (7 tables, +friendships, +friend_codes)
- Expanded API surface (30+ endpoints)
- Added market comparison vs Splitwise
- Extended timeline to 14-20 days

### 2026-02-28 v1 - Initial Plan
- Room-based architecture with invite codes only
- No friend system
- Basic split functionality

---

**Plan Status**: 🚧 In Progress — Frontend Shell Done, Backend Pending
**Last Updated**: 2026-03-01 v3
