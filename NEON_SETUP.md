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
```

Replace the connection string with your actual Neon connection string from Step 1.

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

## Step 4: Push Database Schema

Push your Prisma schema to the Neon database:

```bash
npm run db:push
```

Or, if you prefer to use migrations:

```bash
npm run db:migrate
```

If you are using Prisma, this will create all the tables defined in `prisma/schema.prisma`.
In this project, most of the production code now talks to Neon **directly via SQL** using
the helpers in `lib/neonClient.ts` and API routes under `app/api/**`.

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

// Example: query transactions
const rows = await neonQuery(
  "SELECT * FROM transactions WHERE user_id = $1",
  [userId]
)
```

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

### Option 2 – Prisma Client

If you prefer to keep using Prisma in other parts of the app, you can still
import the Prisma client in your application code:

```typescript
import { prisma } from '@/lib/prisma'

// Example: Create a user
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    name: 'John Doe',
  },
})

// Example: Get all transactions for a user
const transactions = await prisma.transaction.findMany({
  where: {
    userId: user.id,
  },
})
```

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

## Next Steps

Now that your database is set up, you can:

1. Create API routes to interact with the database
2. Replace static JSON files with database queries
3. Implement authentication with user persistence
4. Build the AI integration for document processing

See `backend_ai_integration_plan.md` for more details on the planned features.






