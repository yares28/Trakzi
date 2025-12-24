# How Stripe, Clerk, and Neon Communicate

This document explains how your application connects Stripe (payments), Clerk (authentication), and Neon (database) to identify users and manage subscriptions.

## Overview: The Three-System Architecture

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Clerk   │────────▶│  Neon   │◀────────│ Stripe  │
│ (Auth)  │         │ (DB)    │         │(Payments)│
└─────────┘         └─────────┘         └─────────┘
     │                    │                    │
     │                    │                    │
     └────────────────────┴────────────────────┘
                    │
              Your Next.js App
```

## The Linking Mechanism: `userId` (Clerk User ID)

**The key identifier that connects all three systems is the Clerk `userId`** (e.g., `user_2abc123xyz`).

### 1. User Identification Flow

#### Step 1: User Signs In (Clerk)
- User authenticates via Clerk
- Clerk generates/returns a unique `userId` (e.g., `user_2abc123xyz`)
- This `userId` is used throughout your app

#### Step 2: User Record Created in Neon
When a user first accesses your app:
```typescript
// lib/auth.ts - getCurrentUserId()
const { userId } = await auth() // Gets Clerk userId
await ensureUserExists() // Creates user record in Neon if doesn't exist
```

**Neon Database (`users` table):**
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,  -- Stores Clerk userId directly
    email TEXT UNIQUE,
    name TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Key Point:** The `users.id` field stores the Clerk `userId` directly - no separate ID mapping needed!

---

## 2. Subscription Flow: How Stripe Links to Users

### Step 1: User Initiates Checkout

```typescript
// app/api/checkout/route.ts
const { userId } = await auth() // Get Clerk userId

// Create Stripe customer BEFORE checkout
const newCustomer = await stripe.customers.create({
    email: userEmail, // From Clerk
    metadata: {
        userId: userId, // ⭐ Clerk userId stored in Stripe metadata
    },
});

// Store customer ID in Neon immediately
await upsertSubscription({
    userId,              // ⭐ Clerk userId
    stripeCustomerId: newCustomer.id, // ⭐ Stripe customer ID
    plan: 'free',
    status: 'active',
});

// Create checkout session with userId in metadata
const session = await stripe.checkout.sessions.create({
    customer: customerId,
    metadata: {
        userId: userId, // ⭐ Clerk userId in checkout metadata
    },
    subscription_data: {
        metadata: {
            userId: userId, // ⭐ Clerk userId in subscription metadata
        },
    },
});
```

### Step 2: Stripe Webhook Receives Events

When Stripe sends webhook events (subscription created, updated, deleted, etc.):

```typescript
// app/api/webhook/stripe/route.ts
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    // ⭐ Extract userId from checkout session metadata
    const userId = session.metadata?.userId;
    
    // ⭐ Extract customer ID from session
    const customerId = typeof session.customer === 'string' 
        ? session.customer 
        : session.customer?.id;
    
    // ⭐ Extract subscription ID
    const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    
    // Update Neon database
    await upsertSubscription({
        userId,                    // ⭐ Clerk userId
        stripeCustomerId: customerId,  // ⭐ Stripe customer ID
        stripeSubscriptionId: subscriptionId, // ⭐ Stripe subscription ID
        plan: 'pro',
        status: 'active',
    });
    
    // Sync to Clerk metadata
    await syncSubscriptionToClerk(userId, plan, 'active', customerId, periodEnd);
}
```

### Step 3: Neon Database Stores the Link

**Neon Database (`subscriptions` table):**
```sql
CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,  -- ⭐ Clerk userId (links to users.id)
    plan TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    stripe_customer_id TEXT UNIQUE,     -- ⭐ Stripe customer ID
    stripe_subscription_id TEXT UNIQUE, -- ⭐ Stripe subscription ID
    stripe_price_id TEXT,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN,
    -- ...
);
```

**The Linking Chain:**
```
Clerk userId (user_2abc123xyz)
    ↓
Neon subscriptions.user_id
    ↓
Neon subscriptions.stripe_customer_id
    ↓
Stripe Customer ID (cus_xxx)
```

---

## 3. How the App Identifies Subscribed Users

### Method 1: Query by Clerk userId (Most Common)

```typescript
// lib/subscriptions.ts
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
    // Query Neon database using Clerk userId
    const rows = await neonQuery<SubscriptionRow>(
        `SELECT * FROM subscriptions WHERE user_id = $1 LIMIT 1`,
        [userId] // ⭐ Clerk userId
    );
    
    return rowToSubscription(rows[0]);
}

// Usage in API routes
const { userId } = await auth() // Get Clerk userId
const subscription = await getUserSubscription(userId) // Query Neon
```

### Method 2: Query by Stripe Customer ID (Webhooks)

When Stripe sends webhook events, we need to find the user:

```typescript
// app/api/webhook/stripe/route.ts
async function handleSubscriptionUpdate(subscription: StripeSubscriptionData) {
    const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;
    
    // ⭐ Find user by Stripe customer ID
    const existingSub = await getSubscriptionByStripeCustomerId(customerId);
    
    if (existingSub) {
        const userId = existingSub.userId; // ⭐ Get Clerk userId from Neon
        // Update subscription...
    } else {
        // Fallback: Check Stripe subscription metadata
        const metaUserId = subscription.metadata?.userId; // ⭐ Clerk userId from Stripe
        if (metaUserId) {
            userId = metaUserId;
        }
    }
}
```

### Method 3: Check Clerk Metadata (Optional Cache)

Clerk metadata is synced but **NOT the source of truth** - it's a cache:

```typescript
// app/api/webhook/stripe/route.ts
async function syncSubscriptionToClerk(userId: string, plan: string, status: string, stripeCustomerId: string, currentPeriodEnd: Date | null) {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
        publicMetadata: {
            subscription: {
                plan,
                status,
                stripeCustomerId,
                currentPeriodEnd: safeDateToISO(currentPeriodEnd),
                updatedAt: new Date().toISOString(),
            },
        },
    });
}
```

**Important:** Clerk metadata is synced FROM Neon, not the other way around. Neon is the source of truth.

---

## 4. Complete User Identification Flow

### Scenario: User Subscribes

```
1. User clicks "Subscribe" → Authenticated via Clerk
   └─> Clerk userId: user_2abc123xyz

2. POST /api/checkout
   └─> Gets userId from Clerk auth
   └─> Creates Stripe customer with metadata: { userId: "user_2abc123xyz" }
   └─> Stores in Neon: subscriptions (user_id: "user_2abc123xyz", stripe_customer_id: "cus_xxx")

3. User completes payment → Stripe sends webhook
   └─> Webhook receives: checkout.session.completed
   └─> Extracts userId from session.metadata.userId
   └─> Updates Neon: subscriptions (plan: "pro", status: "active")
   └─> Syncs to Clerk metadata (optional cache)

4. User accesses app → Checks subscription
   └─> Gets userId from Clerk auth
   └─> Queries Neon: SELECT * FROM subscriptions WHERE user_id = "user_2abc123xyz"
   └─> Returns subscription status
```

### Scenario: Stripe Sends Subscription Update Webhook

```
1. Stripe sends: customer.subscription.updated
   └─> Contains: customer: "cus_xxx", subscription: "sub_xxx"

2. Webhook handler receives event
   └─> Extracts customerId: "cus_xxx"

3. Query Neon to find user:
   └─> SELECT * FROM subscriptions WHERE stripe_customer_id = "cus_xxx"
   └─> Gets: user_id: "user_2abc123xyz"

4. Update subscription in Neon:
   └─> UPDATE subscriptions SET plan = "max", status = "active" WHERE user_id = "user_2abc123xyz"

5. Sync to Clerk (optional):
   └─> Update Clerk metadata for userId: "user_2abc123xyz"
```

---

## 5. Key Data Flow Points

### Clerk → Neon
- **When:** User first accesses app, or during checkout
- **What:** Clerk `userId` → Neon `users.id` and `subscriptions.user_id`
- **How:** `ensureUserExists()` function syncs Clerk user to Neon

### Stripe → Neon
- **When:** Webhook events (checkout completed, subscription updated, etc.)
- **What:** Stripe customer/subscription IDs → Neon `subscriptions` table
- **How:** Webhook handler extracts `userId` from metadata, then updates Neon

### Neon → Clerk
- **When:** After subscription changes in Neon
- **What:** Subscription status → Clerk `publicMetadata`
- **How:** `syncSubscriptionToClerk()` function updates Clerk metadata
- **Note:** This is optional caching - Neon is the source of truth

### App → Neon (for subscription checks)
- **When:** User accesses protected features
- **What:** Clerk `userId` → Query Neon for subscription
- **How:** `getUserSubscription(userId)` queries Neon database

---

## 6. Metadata Storage Locations

### Stripe Metadata (Stored in Stripe)
- **Customer metadata:** `{ userId: "user_2abc123xyz" }`
- **Checkout session metadata:** `{ userId: "user_2abc123xyz" }`
- **Subscription metadata:** `{ userId: "user_2abc123xyz" }`

**Purpose:** Allows webhooks to identify which user a Stripe event belongs to

### Neon Database (Source of Truth)
- **`users.id`:** Clerk userId (primary key)
- **`subscriptions.user_id`:** Clerk userId (foreign key to users)
- **`subscriptions.stripe_customer_id`:** Stripe customer ID
- **`subscriptions.stripe_subscription_id`:** Stripe subscription ID

**Purpose:** Single source of truth for all subscription data

### Clerk Metadata (Optional Cache)
- **`publicMetadata.subscription`:** Cached subscription info
  ```json
  {
    "plan": "pro",
    "status": "active",
    "stripeCustomerId": "cus_xxx",
    "currentPeriodEnd": "2024-12-31T00:00:00Z",
    "updatedAt": "2024-12-01T12:00:00Z"
  }
  ```

**Purpose:** Fast access without database query (but Neon is authoritative)

---

## 7. How to Determine if User is Subscribed

### In API Routes:
```typescript
import { auth } from '@clerk/nextjs/server';
import { getUserSubscription } from '@/lib/subscriptions';

export async function GET() {
    const { userId } = await auth(); // Get Clerk userId
    
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Query Neon database using Clerk userId
    const subscription = await getUserSubscription(userId);
    
    if (subscription && subscription.status === 'active' && subscription.plan !== 'free') {
        // User is subscribed
        return NextResponse.json({ subscribed: true, plan: subscription.plan });
    }
    
    // User is on free plan
    return NextResponse.json({ subscribed: false, plan: 'free' });
}
```

### In Webhook Handlers:
```typescript
// Option 1: From metadata (preferred)
const userId = session.metadata?.userId; // Clerk userId from Stripe metadata

// Option 2: From Neon lookup
const customerId = session.customer;
const subscription = await getSubscriptionByStripeCustomerId(customerId);
const userId = subscription?.userId; // Clerk userId from Neon
```

---

## 8. Summary: The Three Identifiers

| System | Identifier | Format | Example |
|--------|-----------|--------|---------|
| **Clerk** | `userId` | `user_*` | `user_2abc123xyz` |
| **Stripe** | `customerId` | `cus_*` | `cus_ABC123xyz` |
| **Stripe** | `subscriptionId` | `sub_*` | `sub_XYZ789abc` |
| **Neon** | `user_id` | `user_*` | `user_2abc123xyz` (same as Clerk) |
| **Neon** | `stripe_customer_id` | `cus_*` | `cus_ABC123xyz` (same as Stripe) |

**The Linking:**
- Clerk `userId` = Neon `user_id` (same value)
- Stripe `customerId` = Neon `stripe_customer_id` (same value)
- Stripe stores Clerk `userId` in metadata for webhook identification
- Neon stores both Clerk `userId` and Stripe `customerId` to link them

---

## 9. Best Practices in Your Implementation

✅ **Always create Stripe customer before checkout** - Prevents race conditions
✅ **Store `userId` in Stripe metadata** - Allows webhooks to identify users
✅ **Store customer ID in Neon immediately** - Ensures binding exists before checkout
✅ **Use Neon as source of truth** - Clerk metadata is optional cache
✅ **Query by `userId` for user-facing operations** - Most reliable
✅ **Query by `customerId` in webhooks** - When Stripe sends customer ID
✅ **Idempotency checks** - Prevent duplicate webhook processing

---

## 10. Common Queries

### "Who is this Stripe customer?"
```typescript
const subscription = await getSubscriptionByStripeCustomerId('cus_xxx');
const clerkUserId = subscription?.userId; // Returns Clerk userId
```

### "What's this user's subscription status?"
```typescript
const { userId } = await auth(); // Get Clerk userId
const subscription = await getUserSubscription(userId); // Query Neon
const plan = subscription?.plan ?? 'free';
```

### "Is this user subscribed?"
```typescript
const { userId } = await auth();
const subscription = await getUserSubscription(userId);
const isSubscribed = subscription?.status === 'active' && subscription?.plan !== 'free';
```

---

## Conclusion

**The magic is in the `userId` (Clerk User ID):**
- It's stored in Stripe metadata (for webhook identification)
- It's the primary key in Neon `users` table
- It's the foreign key in Neon `subscriptions.user_id`
- It's used throughout your app to identify users

**Neon is the source of truth** - it links Clerk users to Stripe customers and subscriptions.

**Stripe metadata** provides a fallback for webhook identification when the database lookup fails.

**Clerk metadata** is an optional cache for faster access, but always defer to Neon for authoritative data.

