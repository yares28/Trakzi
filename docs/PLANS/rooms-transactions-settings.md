# Plan: Room/Challenge Settings + Transaction System

## Overview

Add admin settings to rooms and challenges, and build a full transaction creation/management system for rooms so users can share expenses, split bills, and track who owes whom — completely isolated from global stats.

## Key Constraint

Room transactions are **isolated** — they do NOT affect the user's global analytics, charts, or transaction wallet. They only track balances between room members.

## What Already Exists (Backend)

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `POST /api/rooms/[roomId]/transactions` | Create shared transaction with splits | Exists |
| `GET /api/rooms/[roomId]/transactions` | List room transactions | Exists |
| `DELETE /api/rooms/[roomId]/transactions/[txId]` | Delete transaction | Exists |
| `PATCH /api/splits/[splitId]/settle` | Settle a split | Exists |
| `PATCH /api/rooms/[roomId]` | Update room settings | Exists |
| `DELETE /api/rooms/[roomId]` | Delete room (owner only) | Exists |
| `DELETE /api/rooms/[roomId]/members/[userId]` | Remove member | Exists |
| `POST /api/rooms/[roomId]/invite` | Invite friends | Exists |
| `GET /api/rooms/[roomId]/bundle` | Full room data bundle | Exists |
| Challenge group admin endpoints | Settings, member mgmt | **MISSING** |

## Phases

---

### Phase 1: Room Transaction Creation Dialog

**Priority: HIGHEST — this is the core missing feature**

**New file**: `components/rooms/create-transaction-dialog.tsx`

**UI Flow**:
1. Amount input + description + date (default today)
2. Split type selector: Equal (default) | Custom | Percentage
3. Member selection (all by default for Equal)
4. Live split preview showing per-person amounts
5. Submit → POST `/api/rooms/[roomId]/transactions`

**Split Types**:
- **Equal**: Total / selected members. Toggle members in/out.
- **Custom**: Input per-member amounts. Must sum to total.
- **Percentage**: Input per-member %. Must sum to 100%.

**Rules**:
- Payer = current user (always included, auto-settled by backend)
- All room members shown, all selected by default
- Client-side split preview (mirrors `lib/rooms/split-validation.ts`)

**Modify**: `app/rooms/[roomId]/page.tsx` — Add "Add Expense" button + dialog state

---

### Phase 2: Room Transaction List Enhancement

**Modify**: `app/rooms/[roomId]/_page/components/RoomTransactions.tsx`

**Changes**:
1. Click transaction row → expand inline showing splits
2. Each split shows: member name, amount, status badge (pending/settled)
3. "Settle" button on pending splits (calls PATCH `/api/splits/[splitId]/settle`)
4. Delete button for uploader/admin (calls DELETE endpoint)
5. Empty state with prompt to add first expense

**New props**: `roomId`, `currentUserId`, `currentUserRole`

---

### Phase 3: Room Settings Dialog

**New file**: `components/rooms/room-settings-dialog.tsx`

**Sections by role**:

| Section | All Members | Admin/Owner | Owner Only |
|---------|-------------|-------------|------------|
| View invite code + copy | Yes | Yes | Yes |
| Leave room | Yes | Yes | No (must transfer first) |
| Edit name/description/currency | No | Yes | Yes |
| Kick members | No | Yes | Yes |
| Invite friends from friends list | No | Yes | Yes |
| Change member roles | No | No | Yes |
| Delete room | No | No | Yes |

**New backend file**: `app/api/rooms/[roomId]/transfer/route.ts`
- POST `{ new_owner_id }` — atomically swap owner roles

**Modify**:
- `app/rooms/[roomId]/_page/components/RoomHeader.tsx` — Add gear icon button prop
- `app/rooms/[roomId]/page.tsx` — Wire settings dialog

---

### Phase 4: Challenge Group Settings

**Migration SQL** (run first):
```sql
ALTER TABLE challenge_group_members
ADD COLUMN role TEXT NOT NULL DEFAULT 'member'
CHECK (role IN ('owner', 'member'));

UPDATE challenge_group_members cgm
SET role = 'owner'
FROM challenge_groups cg
WHERE cgm.group_id = cg.id AND cgm.user_id = cg.created_by;
```

**New backend files**:
- `app/api/challenge-groups/[groupId]/settings/route.ts` — PATCH (name, is_public, metrics)
- `app/api/challenge-groups/[groupId]/members/[userId]/route.ts` — DELETE (kick/leave)
- `lib/challenges/permissions.ts` — `verifyChallengeGroupOwner()`

**New frontend file**: `components/challenges/challenge-settings-dialog.tsx`

**Sections**:
- **All members**: View invite code, leave group
- **Owner only**: Edit name, toggle public/private, change metrics, kick members, delete group

**Modify**:
- `lib/types/challenges.ts` — Add `role` to `ChallengeGroupMember`
- `app/challenges/[groupId]/_page/components/ChallengeHeader.tsx` — Add gear icon
- `app/challenges/[groupId]/page.tsx` — Wire settings dialog
- `app/api/challenge-groups/[groupId]/route.ts` — Add ownership check to DELETE

---

### Phase 5: Receipt Item Sharing (Stretch)

**New file**: `components/rooms/receipt-split-dialog.tsx`

- Add line items manually (name, amount, quantity)
- Assign each item to member(s)
- Uses `item_level` split type + `receipt_items` table
- Computes per-member totals from item assignments

**Deferred** — can be added later without breaking anything.

---

## Demo Mode

All dialogs use `demoFetch()`. Mutations return 403 in demo mode → show `toast.error("Not available in demo mode")`. Read-only sections (members, invite codes) work normally via demo GET routes.

## Files Summary

### New Files (9)
| File | Phase |
|------|-------|
| `components/rooms/create-transaction-dialog.tsx` | 1 |
| `components/rooms/room-settings-dialog.tsx` | 3 |
| `app/api/rooms/[roomId]/transfer/route.ts` | 3 |
| `components/challenges/challenge-settings-dialog.tsx` | 4 |
| `app/api/challenge-groups/[groupId]/settings/route.ts` | 4 |
| `app/api/challenge-groups/[groupId]/members/[userId]/route.ts` | 4 |
| `lib/challenges/permissions.ts` | 4 |
| `docs/PLANS/migration-challenge-group-roles.sql` | 4 |
| `components/rooms/receipt-split-dialog.tsx` | 5 (stretch) |

### Modified Files (7)
| File | Phase | Change |
|------|-------|--------|
| `app/rooms/[roomId]/page.tsx` | 1,2,3 | Add expense button, settings button, wire dialogs, pass new props |
| `app/rooms/[roomId]/_page/components/RoomTransactions.tsx` | 2 | Expandable rows, settle/delete actions |
| `app/rooms/[roomId]/_page/components/RoomHeader.tsx` | 3 | Gear icon for settings |
| `app/challenges/[groupId]/page.tsx` | 4 | Settings button, wire dialog |
| `app/challenges/[groupId]/_page/components/ChallengeHeader.tsx` | 4 | Gear icon for settings |
| `lib/types/challenges.ts` | 4 | Add `role` to `ChallengeGroupMember` |
| `app/api/challenge-groups/[groupId]/route.ts` | 4 | Add ownership check to DELETE |

## Implementation Order

1. **Phase 1** — Transaction creation dialog (highest user value)
2. **Phase 2** — Transaction list enhancement (complements Phase 1)
3. **Phase 3** — Room settings dialog (all backend exists)
4. **Phase 4** — Challenge settings (needs migration + new endpoints)
5. **Phase 5** — Receipt sharing (stretch, defer)
