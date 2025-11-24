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

Create a `.env` file in the root of your project (if it doesn't exist) and add:

```env
# Neon Database Connection
# Get your connection string from: https://console.neon.tech/
DATABASE_URL="postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require"

# Direct connection URL for migrations (optional, same as DATABASE_URL if not using connection pooling)
DIRECT_URL="postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require"
```

Replace the connection string with your actual Neon connection string from Step 1.

**Note:** If you're using Neon's connection pooling, you might have two different URLs:
- `DATABASE_URL`: The pooled connection (for your application)
- `DIRECT_URL`: The direct connection (for migrations)

If you're not using connection pooling, you can set both to the same value.

## Step 3: Generate Prisma Client

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

This will create all the tables defined in `prisma/schema.prisma`:
- `users` - User accounts
- `reports` - Uploaded files (PDFs/Images)
- `transactions` - Financial transactions
- `fridge_items` - Grocery items

## Step 5: Verify Setup

You can open Prisma Studio to view and manage your database:

```bash
npm run db:studio
```

This will open a web interface at `http://localhost:5555` where you can browse your database tables.

## Using the Database in Your Code

Import the Prisma client in your application code:

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

### Connection Issues

- Make sure your `.env` file has the correct connection string
- Verify that your Neon database is active (not paused)
- Check that your IP is allowed (Neon allows all IPs by default)

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



