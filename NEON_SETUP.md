# Neon Database Setup Guide

This guide will help you set up Neon (serverless Postgres) for your Folio2 project.

## Prerequisites

- A Neon account (sign up at [neon.tech](https://neon.tech))
- Node.js and npm installed

## Step 1: Create a Neon Database

1. Go to [console.neon.tech](https://console.neon.tech/)
2. Sign up or log in
3. Create a new project
4. Create a new database (or use the default one)
5. Copy your connection string from the dashboard

## Step 2: Configure Environment Variables

**⚠️ IMPORTANT: Always use `.env.local` (not `.env`) to ensure your credentials are never committed to git!**

Create a `.env.local` file in the root of your project (if it doesn't exist) and add:

```env
# Neon Database Connection
# Get your connection string from: https://console.neon.tech/
DATABASE_URL="postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require"

# Direct connection URL for migrations (optional, same as DATABASE_URL if not using connection pooling)
DIRECT_URL="postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require"

# If using Neon REST API (optional)
NEON_REST_URL="https://ep-xxx-xxx.apirest.region.aws.neon.tech/neondb/rest/v1"
NEON_API_KEY="your-neon-api-key-here"

# Clerk Authentication (REQUIRED)
# Get these from: https://dashboard.clerk.com/last-active?path=api-keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
CLERK_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE

# Clerk Sign-In/Sign-Up URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

# Optional: After sign-in/sign-up redirects
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

Replace the connection strings and Clerk keys with your actual values.

**Note:** The `.env.local` file is already in `.gitignore` and will never be committed to git.

**Note:** If you're using Neon's connection pooling, you might have two different URLs:
- `DATABASE_URL`: The pooled connection (for your application)
- `DIRECT_URL`: The direct connection (for migrations)

If you're not using connection pooling, you can set both to the same value.

## Step 3: Generate Prisma Client (optional – Prisma)

Run the following command to generate the Prisma Client:

```bash
npm run db:generate
```

## Step 4: Database Schema Setup

### Important: User ID Schema

**This project uses Clerk for authentication**, which means user IDs are text strings (e.g., `"user_2abc123xyz"`), not UUIDs. The database schema has been migrated to support this:

- `users.id` is `TEXT` (not UUID)
- All `user_id` foreign key columns are `TEXT` (not UUID)
- Existing UUID data has been preserved as text strings

If you're setting up a fresh database, the schema will be created correctly. If you're migrating from an older version, see `DATABASE_SCHEMA_UPDATE.md` for migration instructions.

### Push Database Schema

Push your Prisma schema to the Neon database:

```bash
npm run db:push
```

Or, if you prefer to use migrations:

```bash
npm run db:migrate
```

**Note:** The Prisma schema (`prisma/schema.prisma`) may still show UUID types, but the actual database uses TEXT for user IDs to match Clerk's format. Most of the production code talks to Neon **directly via SQL** using the helpers in `lib/neonClient.ts` and API routes under `app/api/**`.

## Step 5: Verify Setup

You can open Prisma Studio to view and manage your database:

```bash
npm run db:studio
```

This will open a web interface at `http://localhost:5555` where you can browse your database tables.

## Using the Database in Your Code (Neon SQL + Prisma)

You have two options when talking to Neon from your code:

- **Direct SQL via Neon** (what the analytics pages use)
- **Prisma Client** (for features that still rely on `prisma/schema.prisma`)

### Option 1 – Direct SQL via Neon (current analytics implementation)

Most of the analytics, categories, transactions, and budgets features use
the Neon helper functions in `lib/neonClient.ts`:

```ts
import { neonQuery, neonInsert } from "@/lib/neonClient"
import { getCurrentUserId } from "@/lib/auth"

// Example: query transactions (with Clerk authentication)
export async function GET(request: Request) {
  const userId = await getCurrentUserId() // Gets Clerk user ID and syncs with DB
  
  const rows = await neonQuery(
    "SELECT * FROM transactions WHERE user_id = $1",
    [userId]
  )
  
  return NextResponse.json(rows)
}
```

**Important:** Always use `getCurrentUserId()` from `lib/auth.ts` to get the authenticated user's ID. This function:
- Authenticates the user via Clerk
- Automatically syncs the Clerk user with your database
- Returns the database user ID (which matches the Clerk user ID)

Category budgets for analytics are stored per user in the
`public.category_budgets` table and accessed through the `/api/budgets` route.
When you change a budget in the **Category Budget** or **Spending Activity Rings**
cards on the analytics page:

- The frontend calls `POST /api/budgets` with `{ categoryName, budget }`
- The API resolves the `category_id` for that user and **upserts** into:
  - `public.category_budgets (user_id, category_id, scope='analytics', budget)`
- On page load, the analytics page calls `GET /api/budgets` to load
  all saved budgets for the current user.

This means budgets are now **per user and persisted in Neon**, not just in
`localStorage`.

### Receipt Categories API Example

Here's how to work with receipt categories (similar to regular categories):

```ts
import { neonQuery, neonInsert } from "@/lib/neonClient"
import { getCurrentUserId } from "@/lib/auth"

// GET /api/receipt-categories/types - Get all macronutrient types
export async function GET(request: Request) {
  const userId = await getCurrentUserId()
  
  const types = await neonQuery(
    "SELECT id, name, color FROM receipt_category_types WHERE user_id = $1 ORDER BY name",
    [userId]
  )
  
  return NextResponse.json(types)
}

// POST /api/receipt-categories/types - Create new macronutrient type
export async function POST(request: Request) {
  const userId = await getCurrentUserId()
  const { name, color } = await request.json()
  
  const [type] = await neonInsert("receipt_category_types", {
    user_id: userId,
    name,
    color: color || "#6366f1"
  })
  
  return NextResponse.json(type, { status: 201 })
}

// GET /api/receipt-categories - Get all food categories with type info
export async function GET(request: Request) {
  const userId = await getCurrentUserId()
  
  const categories = await neonQuery(
    `SELECT 
      rc.id,
      rc.name,
      rc.color,
      rc.type_id,
      rct.name as type_name,
      rct.color as type_color
    FROM receipt_categories rc
    INNER JOIN receipt_category_types rct ON rc.type_id = rct.id
    WHERE rc.user_id = $1
    ORDER BY rct.name, rc.name`,
    [userId]
  )
  
  return NextResponse.json(categories)
}

// POST /api/receipt-categories - Create new food category
export async function POST(request: Request) {
  const userId = await getCurrentUserId()
  const { name, type_id, color } = await request.json()
  
  const [category] = await neonInsert("receipt_categories", {
    user_id: userId,
    type_id,
    name,
    color: color || "#6366f1"
  })
  
  return NextResponse.json(category, { status: 201 })
}
```

### Receipts API Example

Here's how to query receipt transactions for the `/fridge` page:

```ts
import { neonQuery } from "@/lib/neonClient"
import { getCurrentUserId } from "@/lib/auth"

// GET /api/fridge - Get all receipt transactions for current user
export async function GET(request: Request) {
  const userId = await getCurrentUserId()
  
  const rows = await neonQuery(
    `SELECT 
      rt.id,
      rt.description,
      rt.quantity,
      rt.price_per_unit,
      rt.total_price,
      rt.category_id,
      rt.receipt_date,
      rt.receipt_time,
      r.store_name,
      r.id as receipt_id,
      c.name as category_name,
      c.color as category_color
    FROM receipt_transactions rt
    INNER JOIN receipts r ON rt.receipt_id = r.id
    LEFT JOIN categories c ON rt.category_id = c.id
    WHERE rt.user_id = $1
    ORDER BY rt.receipt_date DESC, rt.receipt_time DESC
    LIMIT $2 OFFSET $3`,
    [userId, 50, 0]
  )
  
  return NextResponse.json(rows)
}

// POST /api/receipts/upload - Upload receipt image
export async function POST(request: Request) {
  const userId = await getCurrentUserId()
  const formData = await request.formData()
  const file = formData.get('file') as File
  
  // 1. Save file to user_files with source='Receipt'
  const fileId = await saveFileToUserFiles(file, userId, 'Receipt')
  
  // 2. Create receipt record with status='processing'
  const receiptId = await neonInsert(
    `INSERT INTO receipts (user_id, receipt_file_id, total_amount, status)
     VALUES ($1, $2, $3, 'processing')
     RETURNING id`,
    [userId, fileId, 0]
  )
  
  // 3. Trigger async AI processing (background job)
  // ... AI extraction logic ...
  
  return NextResponse.json({ receiptId, status: 'processing' })
}
```

### Option 2 – Prisma Client

If you prefer to keep using Prisma in other parts of the app, you can still
import the Prisma client in your application code. However, **note that user creation is now handled automatically by Clerk and the user sync function**.

```typescript
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth'

// Example: Get all transactions for the current user
// Note: Users are created automatically via Clerk sign-up and synced via lib/user-sync.ts
export async function GET() {
  const userId = await getCurrentUserId() // Gets authenticated Clerk user ID
  
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: userId, // userId is now TEXT (Clerk user ID)
    },
  })
  
  return transactions
}
```

**Note:** User creation happens automatically when users sign up via Clerk. The `lib/user-sync.ts` function ensures Clerk users are synced with your database.

## Available Scripts

- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database (development)
- `npm run db:migrate` - Create and apply migrations (production)
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:seed` - Seed the database (if seed script is configured)

## Troubleshooting

### API Key or Connection String Revoked

If you accidentally committed your Neon credentials to GitHub and they were revoked:

1. **Get a new connection string:**
   - Go to [Neon Console](https://console.neon.tech)
   - Select your project
   - Go to "Connection Details" or "Dashboard"
   - Copy the new connection string (it will be different from the revoked one)

2. **Get a new API key (if using REST API):**
   - In Neon Console, go to "Project Settings" → "API Keys"
   - Create a new API key
   - Copy the new key

3. **Update your `.env.local` file:**
   - Open `.env.local` in your project root
   - Replace `DATABASE_URL` with the new connection string
   - Replace `NEON_API_KEY` with the new API key (if applicable)
   - Save the file

4. **Verify `.env.local` is not tracked by git:**
   ```bash
   git check-ignore .env.local
   ```
   This should output `.env.local` - if it doesn't, your `.gitignore` needs to be updated.

5. **Restart your dev server:**
   ```bash
   npm run dev
   ```

6. **Remove old credentials from git history (if needed):**
   If credentials were committed, consider using `git filter-branch` or BFG Repo-Cleaner to remove them from history, or rotate the credentials again after cleaning.

### Connection Issues

- Make sure your `.env.local` file has the correct connection string
- Verify that your Neon database is active (not paused)
- Check that your IP is allowed (Neon allows all IPs by default)
- Restart your dev server after updating environment variables

### Migration Issues

- If `db:push` fails, try using `db:migrate` instead
- Make sure your schema is valid by running `prisma validate`
- Check the Prisma logs for detailed error messages

### Authentication Issues

- **"Unauthorized" errors in API routes:**
  - Make sure Clerk API keys are set correctly in `.env.local`
  - Verify you're signed in (check the navigation bar for user button)
  - Restart your dev server after updating environment variables

- **User not created in database:**
  - Check that the database schema uses TEXT for `users.id` (not UUID)
  - Verify the `lib/user-sync.ts` function is working
  - Check browser console and server logs for errors

- **Database schema mismatch errors:**
  - Ensure `users.id` and all `user_id` columns are TEXT type
  - See `DATABASE_SCHEMA_UPDATE.md` for migration instructions
  - The schema has already been migrated if you're using the latest version

## Authentication & User Management

This project uses **Clerk** for authentication. When users sign up or sign in:

1. Clerk handles the authentication flow
2. The `lib/user-sync.ts` function automatically syncs Clerk users with your database
3. User IDs in the database match Clerk user IDs (text format, e.g., `"user_2abc123xyz"`)

### User Sync

The `ensureUserExists()` function in `lib/user-sync.ts`:
- Checks if a Clerk user exists in your database
- Creates a database record if the user doesn't exist
- Updates user information (email, name) if it has changed
- Returns the database user ID

This happens automatically when API routes call `getCurrentUserId()` from `lib/auth.ts`.

### Protected Routes

All routes except `/`, `/sign-in`, and `/sign-up` require authentication. The middleware in `proxy.ts` handles route protection automatically.

## Receipts & Receipt Transactions

The database includes support for receipt processing with AI-powered extraction:

### Database Schema

**`receipts` Table:**
- Stores receipt metadata (store name, date, time, total amount)
- Links to `user_files` table for receipt images (set `source = 'Receipt'`)
- Status tracking: `'processing'`, `'completed'`, `'failed'`
- AI extraction data stored in JSONB for debugging/audit

**`receipt_transactions` Table:**
- Stores individual line items from receipts
- Denormalized for performance: includes `user_id`, `receipt_date`, `receipt_time`
- Links to `receipt_categories` (food categories) and `receipt_category_types` (macronutrients)
- Auto-assigned categories via AI
- Optimized indexes for fast queries on `/fridge` page

**`receipt_category_types` Table:**
- Stores macronutrient types (Protein, Carbs, Fat, Fiber, Vitamins/Minerals)
- User-customizable categories (identical structure to `categories` table)
- Used for organizing food categories by nutritional type

**`receipt_categories` Table:**
- Stores food categories (Fruits, Vegetables, Meat, Dairy, etc.)
- User-customizable categories (identical structure to `categories` table)
- Each category belongs to one macronutrient type (`type_id`)
- Used by AI for auto-assigning categories to receipt items

### Receipt Processing Flow

1. **Upload**: User drags/drops receipt image → saved to `user_files` with `source = 'Receipt'`
2. **Create Receipt Record**: `receipts` table entry with `status = 'processing'`
3. **AI Processing**: Background job extracts:
   - Store name
   - Receipt date and time
   - Line items (description, quantity, price_per_unit, total_price)
   - Auto-assigns categories
4. **Create Transactions**: `receipt_transactions` records created for each line item
5. **Complete**: Receipt status updated to `'completed'`

### API Design for `/fridge` Page

**Primary Endpoint: `GET /api/fridge`**
- Single optimized query using covering index
- Returns receipt transactions with receipt and category details
- Fast performance with denormalized data

**Example Query (Optimized for Speed):**
```sql
SELECT 
  rt.id,
  rt.description,
  rt.quantity,
  rt.price_per_unit,
  rt.total_price,
  rt.category_id,
  rt.category_type_id,  -- Denormalized for fastest fetch
  rt.receipt_date,
  rt.receipt_time,
  r.store_name,
  r.id as receipt_id,
  r.total_amount as receipt_total_amount,
  r.status as receipt_status,
  rc.name as category_name,
  rc.color as category_color,
  rct.name as category_type_name,  -- Direct join, no subquery needed
  rct.color as category_type_color
FROM receipt_transactions rt
INNER JOIN receipts r ON rt.receipt_id = r.id
LEFT JOIN receipt_categories rc ON rt.category_id = rc.id
LEFT JOIN receipt_category_types rct ON rt.category_type_id = rct.id
WHERE rt.user_id = $1
ORDER BY rt.receipt_date DESC, rt.receipt_time DESC;
```

**Why this is fastest:**
- `category_type_id` stored directly in `receipt_transactions` (denormalized)
- Only 2 LEFT JOINs needed (categories + types)
- Covering index includes both `category_id` and `category_type_id`
- All filtering happens on indexed columns

### Receipt Categories System

The receipt categories use a two-level hierarchy:

1. **Macronutrient Types** (`receipt_category_types`):
   - Protein, Carbs, Fat, Fiber, Vitamins/Minerals
   - User-customizable (can add/edit/delete in Data Library)
   - Each type has a color for visual distinction

2. **Food Categories** (`receipt_categories`):
   - Fruits, Vegetables, Meat, Dairy, Bread & Bakery, etc.
   - User-customizable (can add/edit/delete in Data Library)
   - Each category belongs to one macronutrient type
   - Used by AI for auto-assigning categories to receipt items

**Default Categories:**
- 5 macronutrient types (Protein, Carbs, Fat, Fiber, Vitamins/Minerals)
- 25+ food categories organized by type
- See `lib/receipt-categories.ts` for complete list

**Data Library:**
- Users can manage receipt categories in `/data-library` page
- Identical interface to regular categories management
- Can add, edit, delete both types and categories

### Performance Optimizations

- **Denormalization**: 
  - `user_id`, `receipt_date`, `receipt_time` stored in `receipt_transactions` for direct filtering
  - `category_type_id` stored directly in `receipt_transactions` to avoid joining through `receipt_categories`
- **Covering Index**: `idx_receipt_transactions_covering` includes `category_id`, `category_type_id`, and frequently accessed columns
- **Composite Indexes**: Optimized for common query patterns (by date, by category, by receipt, by type)
- **Separate Tables**: `receipt_transactions` kept separate from `transactions` for independent scaling
- **Fast Fetch**: Direct joins to both category tables without subqueries

### Receipt File Storage

Receipt images are stored in the existing `user_files` table:
- Set `source = 'Receipt'` to tag receipt files
- Link via `receipts.receipt_file_id` foreign key
- No schema changes needed to `user_files`

## Next Steps

Now that your database is set up with Clerk authentication, you can:

1. ✅ **Authentication** - Already implemented with Clerk
2. ✅ **User persistence** - Users are automatically synced with the database
3. ✅ **Receipts Schema** - Receipts and receipt_transactions tables created
4. ✅ **Receipt Categories** - Two-level category system (types + categories) implemented
5. Create API routes for receipt categories (`/api/receipt-categories/types`, `/api/receipt-categories`)
6. Implement receipt upload and AI processing endpoints
7. Build the `/fridge` page using receipt_transactions API
8. Build the `/data-library` page for managing receipt categories

See `CLERK_INTEGRATION_COMPLETE.md` for details on the authentication setup, and `DATABASE_SCHEMA_UPDATE.md` for information about the schema migration.






