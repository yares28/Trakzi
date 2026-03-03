# Friends & Rooms Feature

**Status**: ✅ Phase 5 Complete (Full Frontend + Challenge API + Ranking Metrics)
**Page Route**: `/friends`, `/rooms/[roomId]`, `/friends/[friendId]`
**Created**: 2026-02-28
**Updated**: 2026-03-02 (Phase 5 — Full UI, Challenges, Privacy, Rankings)

---

## Overview

A social expense-sharing feature that combines a **Friend System** with collaborative **Rooms**. Users add friends, create rooms for group expenses, and split costs with AI-powered receipt scanning. Unlike standalone split apps, this integrates directly with Trakzi's existing financial data, AI categorization, and analytics engine.

### Three Ways to Split

| Method | Use Case | Requires Room? |
|--------|----------|----------------|
| **Quick Split** | "I paid for lunch, you owe $15" | No (friend-to-friend) |
| **Room Split** | "Monthly rent split 3 ways" | Yes |
| **Receipt Split** | "Scan grocery receipt, assign items" | Yes or No |

---

## User Stories

### 1. Add a Friend
```
User opens /friends → taps [+ Add Friend]
  → Options: Search by email, Enter friend code, Scan QR code
  → Friend request sent → recipient accepts
  → Both appear in each other's friend list
```

### 2. Quick Split (No Room)
```
User opens friend profile → taps [Quick Split]
  → Enters: "Lunch" / $30 / 50-50
  → Friend sees split in their balance
  → Later: friend taps [Settle Up] → marks as paid
```

### 3. Room with Receipt Scanning
```
User creates "Apartment 4B" room → invites 2 friends
  → Uploads grocery receipt photo
  → OCR extracts: Milk $5, Bread $3, Eggs $4, Coffee $10
  → Alice claims: Milk, Eggs ($9)
  → Bob claims: Bread ($3)
  → Shared: Coffee → split equally ($5 each)
  → System calculates: Alice owes $14, Bob owes $8
```

### 4. Share a Personal Transaction
```
User sees "$85 - Restaurant" in their Analytics page
  → Taps "Split this" button on the transaction
  → Selects "NYC Trip" room
  → Splits 4 ways equally ($21.25 each)
  → Original transaction linked to shared transaction
```

---

## Pages & Navigation

### Sidebar
```
Home
Analytics
Fridge
Savings
Friends  ← NEW (with unsettled count badge)
Settings
```

### Page Structure

```
app/
  friends/
    page.tsx                      # Friends hub (4-tab switcher)
    components/
      FriendsLayout.tsx           # Shared layout wrapper
      RankingsTab.tsx             # Rankings tab (privacy-safe metrics)
      FriendsTab.tsx              # Friends tab (list, balances, activity)
      GroupsTab.tsx               # Rooms tab (room cards, balances)
      ChallengesTab.tsx           # Challenges tab (groups + spending)
    [friendId]/
      page.tsx                    # Friend profile (balance + comparative metrics)
  rooms/
    [roomId]/
      page.tsx                    # Room detail
      _page/
        components/
          RoomHeader.tsx          # Name, invite code, member count
          RoomBalances.tsx        # Per-member balance cards
          RoomTransactions.tsx    # Transaction feed with splits
          RoomMembers.tsx         # Member list with role badges
  challenges/
    [groupId]/
      page.tsx                    # Challenge group detail
      _page/
        components/
          ChallengeHeader.tsx     # Group info, metrics, invite code
          ChallengeLeaderboards.tsx  # Per-metric + all-time leaderboard
          ChallengeMembers.tsx    # Member list with points
```

### Tab System

| Tab | Key | Description |
|-----|-----|-------------|
| Rankings | `rankings` | Compare financial progress via privacy-safe scores |
| Friends | `friends` | Manage friends, pending requests, quick splits |
| Rooms | `groups` | Shared expense rooms, balances, create/join |
| Challenges | `challenges` | Score-based leaderboard groups |

### Dialogs (7 components)

| Dialog | Location | Trigger |
|--------|----------|---------|
| `AddFriendDialog` | `components/friends/add-friend-dialog.tsx` | Rankings/Friends tab |
| `QuickSplitDialog` | `components/friends/quick-split-dialog.tsx` | Friends tab row |
| `CreateChallengeDialog` | `components/friends/create-challenge-dialog.tsx` | Challenges tab (spending) |
| `CreateChallengeGroupDialog` | `components/friends/create-challenge-group-dialog.tsx` | Challenges tab (groups) |
| `CreateRoomDialog` | `components/rooms/create-room-dialog.tsx` | Rooms tab |
| `JoinRoomDialog` | `components/rooms/join-room-dialog.tsx` | Rooms tab |
| `SettleUpDialog` | `components/rooms/settle-up-dialog.tsx` | Room detail page |

---

## Database Schema

### Tables (7 new tables)

#### friendships
```sql
CREATE TABLE friendships (
    id TEXT PRIMARY KEY,
    requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id)
);

-- Bidirectional uniqueness (only one friendship per pair)
CREATE UNIQUE INDEX idx_friendships_pair ON friendships(
    LEAST(requester_id, addressee_id),
    GREATEST(requester_id, addressee_id)
);
```

#### friend_codes
```sql
CREATE TABLE friend_codes (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL
);
```

#### rooms
```sql
CREATE TABLE rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    description TEXT,
    currency TEXT DEFAULT 'EUR',
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
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
```

#### shared_transactions
```sql
CREATE TABLE shared_transactions (
    id TEXT PRIMARY KEY,
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
    split_type TEXT CHECK (split_type IN ('equal', 'percentage', 'custom', 'item_level')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (room_id IS NOT NULL OR friendship_id IS NOT NULL)
);
```

#### receipt_items
```sql
CREATE TABLE receipt_items (
    id TEXT PRIMARY KEY,
    shared_tx_id TEXT NOT NULL REFERENCES shared_transactions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    category TEXT
);
```

#### transaction_splits
```sql
CREATE TABLE transaction_splits (
    id TEXT PRIMARY KEY,
    shared_tx_id TEXT NOT NULL REFERENCES shared_transactions(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES receipt_items(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'settled')) DEFAULT 'pending',
    settled_at TIMESTAMPTZ
);
```

### Privacy & Ranking System

#### Sharing Preferences (users table)
- `share_with_friends` (boolean, default false) — opt-in to share ranking metrics with accepted friends
- `share_publicly` (boolean, default false) — opt-in to share with anyone

#### Privacy Check Flow
```
canViewMetrics(viewerId, targetId):
  1. Self → always allowed
  2. share_publicly = true → anyone can view
  3. share_with_friends = true + accepted friend → allowed
  4. Otherwise → isPrivate: true, all scores = 0
```

#### Ranking Metrics (privacy-safe, never raw amounts)

| Metric | Source | Display | Weight |
|--------|--------|---------|--------|
| Savings Rate | `(income - expense) / income` | X% | 30% |
| Financial Health | 50/30/20 rule scoring | 0-100 | 30% |
| Consistency Score | CV of 6-month spending (inverse) | 0-100 | 20% |
| Fridge Score | Healthy vs unhealthy receipt ratio | 0-100 | 20% |
| Wants Percent | `wants / totalExpense` | X% | — |
| Overall Score | Weighted composite | 0-100 | — |

**Entry requirements:** 20+ categorized transactions with 500+ volume, or 2+ receipts with 50+ volume

**API:** `GET/PATCH /api/users/sharing-preferences`
**Engine:** `lib/friends/ranking-metrics.ts` → `computeUserMetrics()`, `computeFriendRankings()`
**Cache:** `ranking-metrics:{userId}:{YYYY-MM}` with 5-min TTL

---

### Challenge Groups (Leaderboard System)

Score-based monthly competitions on ranking metrics:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/challenge-groups` | GET | List groups with live scores |
| `/api/challenge-groups` | POST | Create group (name, metrics, visibility) |
| `/api/challenge-groups/join` | POST | Join via invite code |
| `/api/challenge-groups/[groupId]` | DELETE | Leave group |

**Scoring:** Monthly results → 3 pts (1st), 2 pts (2nd), 1 pt (3rd), 0 (other). Points accumulate across months.

**Available metrics:** `savingsRate`, `financialHealth`, `fridgeScore`, `wantsPercent`

---

### Key Design Decisions

1. **Bidirectional friendship uniqueness**: `LEAST/GREATEST` index prevents duplicate (A,B) and (B,A) friendships
2. **Flexible shared_transactions**: `CHECK` constraint ensures tx belongs to room OR friendship
3. **Partial indexes**: `WHERE room_id IS NOT NULL` keeps indexes small
4. **Linked transactions**: `original_tx_id` connects personal bank transactions to splits

---

## API Routes

### Friend Management (10 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/friends/search` | Search by exact email |
| POST | `/api/friends/request` | Send friend request |
| GET | `/api/friends` | List accepted friends |
| GET | `/api/friends/requests` | Pending requests |
| PATCH | `/api/friends/requests/[id]` | Accept/decline |
| DELETE | `/api/friends/[friendshipId]` | Remove friend |
| POST | `/api/friends/block/[userId]` | Block user |
| GET | `/api/friends/my-code` | Get friend code (for QR) |
| POST | `/api/friends/add-by-code` | Add via code/QR |
| GET | `/api/friends/bundle` | Friends page bundle |
| GET/PATCH | `/api/users/sharing-preferences` | Privacy sharing toggles |

### Friend Quick Splits (4 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/friends/[friendshipId]/splits` | Create 1:1 split |
| GET | `/api/friends/[friendshipId]/splits` | Split history |
| GET | `/api/friends/[friendshipId]/balance` | Net balance |
| GET | `/api/friends/[friendshipId]/bundle` | Profile + insights |

### Room Management (8 endpoints)

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

### Transactions & Splits (8 endpoints)

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

### Challenges (5 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/challenges` | List active challenges |
| POST | `/api/challenges` | Create + auto-join + invite friends |
| GET | `/api/challenges/[id]` | Challenge detail + participants |
| DELETE | `/api/challenges/[id]` | Delete (creator only) |
| POST | `/api/challenges/[id]/join` | Join challenge |
| POST | `/api/challenges/[id]/leave` | Leave (not creator) |
| POST | `/api/challenges/[id]/refresh` | Batch refresh current_spend |

### Challenge Groups (4 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/challenge-groups` | List groups with live scores |
| POST | `/api/challenge-groups` | Create group |
| POST | `/api/challenge-groups/join` | Join via invite code |
| DELETE | `/api/challenge-groups/[groupId]` | Leave group |

---

## Plan Limits

| Feature | Free | Pro | Max |
|---------|------|-----|-----|
| Max Friends | 5 | 50 | Unlimited |
| Max Rooms | 2 | 10 | Unlimited |
| Shared Tx/Month | 50 | 200 | Unlimited |
| Quick Splits/Month | 20 | 100 | Unlimited |
| Receipt OCR Splits | 5/month | 50/month | Unlimited |
| Friend Search | 10/min | 10/min | 10/min |

---

## Split Types

| Type | Description | Example |
|------|-------------|---------|
| `equal` | Even split among all | $90 / 3 = $30 each |
| `percentage` | Custom % per person | 50/30/20 split |
| `custom` | Manual amounts per person | A: $40, B: $25, C: $25 |
| `item_level` | Per-receipt-item assignment | Each claims their items |

---

## Caching Strategy

| Key Pattern | TTL | Invalidate On |
|-------------|-----|---------------|
| `friends:user:{userId}:list` | 5 min | Friend added/removed |
| `friends:user:{userId}:requests` | 1 min | Request sent/accepted/declined |
| `friends:user:{userId}:balance` | 1 min | Split created/settled |
| `rooms:user:{userId}:list` | 5 min | Room created/joined/left |
| `room:{roomId}:bundle` | 2 min | Transaction/member change |
| `room:{roomId}:balance` | 1 min | Split created/settled |
| `friendship:{id}:insights` | 10 min | Transaction added/settled |

---

## Key Differentiators vs Competition

### 1. AI Receipt Item Splitting
Leverages existing Gemini OCR + merchant parsers to auto-extract receipt items. Users assign items to friends instead of manual entry.

### 2. Link Personal Transactions
Users can share existing bank transactions to rooms with one tap. No re-entry needed.

### 3. Friend Insights
Analytics engine generates per-friendship spending insights (total shared, top categories, monthly trends).

### 4. QR Code Friend Add
Instant in-person friend adding via QR scan of personal friend code.

### 5. Smart Split Suggestions (Phase 2)
AI learns split patterns and suggests recurring splits automatically.

---

## Security Rules

1. **Email search**: Exact match only, rate limited (10/min), generic "not found" response
2. **Friend requests**: Rate limited (20/hour), block prevents future requests
3. **Room access**: All queries filter by room membership
4. **Role checks**: Destructive operations require owner/admin role
5. **Friend codes**: 8-char crypto random, requires acceptance (not auto-add)
6. **Data isolation**: Friends NEVER see personal transactions, budgets, categories

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/charts/friends-aggregations.ts` | Bundle aggregation (rankings, rooms, friends, challenges) |
| `lib/friends/ranking-metrics.ts` | Privacy-safe ranking metrics engine |
| `lib/friends/sharing.ts` | Sharing preferences + `canViewMetrics()` |
| `lib/friends/permissions.ts` | Friend/room limit checks, friendship verification |
| `lib/friends/codes.ts` | Friend code + room invite code generation |
| `lib/friends/limits.ts` | Shared tx + quick split rate limiting |
| `lib/rooms/balances.ts` | Room + friendship balance calculations |
| `lib/rooms/permissions.ts` | Room role verification |
| `lib/rooms/split-validation.ts` | Split type validation (equal/percentage/custom/item) |
| `lib/types/friends.ts` | Friend-related TypeScript types |
| `lib/types/rooms.ts` | Room-related TypeScript types |
| `lib/types/challenges.ts` | Challenge + challenge group types |
| `hooks/use-friends-bundle.ts` | React Query hook for friends bundle |
| `hooks/use-room-bundle.ts` | React Query hook for room detail |
| `hooks/use-challenge-group.ts` | React Query hook for challenge group detail |

## Related Documentation

- [Full Implementation Plan](../PLANS/rooms-sharing-feature.md) - Detailed 9-phase plan with code examples
- [Challenges Documentation](./CHALLENGES.md) - Challenge system details
- [Database Schema](../CORE/NEON_DATABASE.md) - Core database patterns (tables 21-32)
- [Plan Limits](../CORE/PLAN_SUBSCRIPTION_OVERHAUL.md) - Subscription system

---

**Last Updated**: 2026-03-03 v3
