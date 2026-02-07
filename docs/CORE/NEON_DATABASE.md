# Neon Database Documentation

This document is a snapshot of the Neon database setup for the Trakzi project. It is generated using the Neon MCP server so the inventory, schema, and operational details stay in one place.

## How to read this document

- Organization Information: The Neon organization that owns the project and billing.
- Project Information: The Neon project container for branches, databases, and roles.
- Branch Information: The primary branch used by the app plus its activity and size.
- Compute Endpoint Information: The compute host that serves queries (region, autoscale, state).
- Connection String: How the app connects to Neon (treat as secret).
- Database Structure: Databases and schemas present in the project.
- Tables Overview: Quick list of tables by schema.
- Detailed Table Schemas: Column-level details, indexes, constraints, and sizes.
- Functions and Triggers: Server-side helpers and automatic updated_at behavior.
- Performance Optimizations and Statistics: Indexing choices and size metrics.
- Monitoring and Notes: Operational notes, recent changes, and last refresh date.

## Neon MCP (Codex integration)

This documentation is assembled with Neon MCP tools. Use the steps below to refresh or extend it.

### Remote MCP (OAuth, recommended)
```toml
[mcp_servers.neon]
command = "npx"
args = ["-y", "mcp-remote", "https://mcp.neon.tech/mcp"]
```
Verify the MCP server is registered with `codex mcp list`. The first run opens an OAuth browser window.

### Local MCP (API key)
```toml
[mcp_servers.neon]
command = "npx"
args = ["-y", "@neondatabase/mcp-server-neon", "start", "<NEON_API_KEY>"]
```

### Typical refresh flow (tools)
1. list_organizations -> identify org
2. list_projects -> identify project
3. describe_project -> project, branches, and databases
4. describe_branch -> branch metadata and size
5. list_branch_computes -> compute endpoint details
6. get_connection_string -> connection info
7. get_database_tables -> table inventory
8. describe_table_schema -> per-table schema
9. run_sql -> table sizes, indexes, stats, or custom checks

### Safety notes
- Always verify destructive actions; Neon MCP can create, modify, or delete resources.
- Keep connection strings and API keys out of shared or public docs.

## Source of Truth Rules

- The live Neon database is authoritative for schema, data, and operational state.
- This file is the curated snapshot for humans and AI. Refresh it after any migration, backfill, or Neon setting change.
- If code, Prisma, or this document disagree with Neon, refresh via Neon MCP and reconcile before shipping changes.

## Project Code References (Schema + Access)

- `lib/neonClient.ts`: primary DB access path using @neondatabase/serverless and raw SQL. It reads `DATABASE_URL` or `NEON_CONNECTION_STRING` and auto-converts to pooled connections.
- `prisma/schema.prisma`: reference schema for Prisma Studio only. It is not authoritative.
- `prisma/migrations/*`: partial Prisma migrations (currently subscription-related). Validate against Neon before reusing.
- `database/schema.sql`: referenced by Prisma schema as authoritative, but not present in this repo as of December 30, 2025. If it exists elsewhere, link it here or update the Prisma note.

## Secrets and Access

- Connection strings and API keys are secrets. Store them in `.env`/secret manager, not in source control.
- `DATABASE_URL` should be the pooled connection string for app traffic; `DIRECT_URL` is for migrations/admin tasks when needed.
- If this document is shared outside the team, rotate the `neondb_owner` password.

## Update Checklist (when something changes)

1. Refresh org, project, branch, and compute metadata via Neon MCP.
2. Recompute branch sizes and usage via `describe_branch`.
3. Regenerate the table list via `get_database_tables`.
4. Re-pull per-table schemas via `describe_table_schema`.
5. Update size/index stats with `run_sql` (see queries below).
6. Update "Last Updated" and add a line under "Recent Changes".

### Useful SQL (run_sql)

Table sizes (schema + index size):
```sql
SELECT
  n.nspname AS schema,
  c.relname AS table,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
  pg_size_pretty(pg_relation_size(c.oid)) AS table_size,
  pg_size_pretty(pg_total_relation_size(c.oid) - pg_relation_size(c.oid)) AS index_size
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname IN ('public', 'neon_auth')
ORDER BY pg_total_relation_size(c.oid) DESC;
```

Indexes per table:
```sql
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname IN ('public', 'neon_auth')
ORDER BY schemaname, tablename, indexname;
```

Triggers for updated_at:
```sql
SELECT event_object_table, trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```


## Organization Information

The Neon organization that owns the project and billing.

- **Organization Name**: yares
- **Organization ID**: org-damp-flower-56045386
- **Organization Handle**: yares-org-damp-flower-56045386
- **Plan**: free
- **Created**: November 22, 2025
- **Updated**: November 24, 2025
- **Members**: 1
- **Projects**: 1

## Project Information

The Neon project container for branches, databases, and roles.

- **Project Name**: Trakzi
- **Project ID**: orange-waterfall-16223480
- **Console URL**: https://console.neon.tech/app/projects/orange-waterfall-16223480
- **Region**: aws-eu-west-2 (London)
- **Postgres Version**: 17
- **Proxy Host**: eu-west-2.aws.neon.tech
- **Default Autoscaling**: 0.25-2 CU (min 0.25, max 2)
- **Project Active Time**: 206,584 seconds (~57.4 hours)
- **Project CPU Used**: 52,855 seconds (~14.7 hours)
- **Synthetic Storage Size**: 102,112,472 bytes (~97.4 MB)
- **Project Updated**: February 7, 2026 at 16:10:01 UTC
- **Compute Last Active**: February 7, 2026 at 16:09:53 UTC

## Branch Information

Branch metadata, starting with the default production branch.

### Production Branch (Default)

- **Branch Name**: Prod
- **Branch ID**: br-rapid-voice-abajd9gp
- **Status**: ready
- **Primary**: Yes
- **Default**: Yes
- **Protected**: No
- **Created**: November 22, 2025 at 19:29:06 UTC
- **Updated**: December 30, 2025 at 00:30:36 UTC
- **Created By**: yares
- **Logical Size**: 45,629,440 bytes (~43.5 MB)
- **Compute Usage**: 99,153 seconds (~27.5 hours)
- **Active Time**: 387,216 seconds (~107.6 hours)
- **Written Data**: 148,709,368 bytes (~141.8 MB)
- **Data Transfer**: 234,924,291 bytes (~224.0 MB)
- **Console Link**: https://console.neon.tech/app/projects/orange-waterfall-16223480/branches/br-rapid-voice-abajd9gp

### Other Branches

1. **preview/yaya** (br-purple-fog-ab3rzue3)
   - Parent: br-rapid-voice-abajd9gp
   - Status: ready
   - Source: vercel
   - Created: December 29, 2025 at 12:42:58 UTC
   - Updated: December 29, 2025 at 22:50:35 UTC

## Compute Endpoint Information

Details about the compute endpoint that serves queries.

- **Compute ID**: ep-purple-tree-abhoip45
- **Compute Type**: read_write
- **Compute Size**: 0.25-2 CU (autoscaling)
- **Autoscaling Min CU**: 0.25
- **Autoscaling Max CU**: 2
- **Region**: aws-eu-west-2 (London)
- **Host**: ep-purple-tree-abhoip45.eu-west-2.aws.neon.tech
- **Proxy Host**: eu-west-2.aws.neon.tech
- **Current State**: active
- **Last Active**: December 30, 2025 at 00:16:06 UTC
- **Started At**: December 30, 2025 at 00:45:54 UTC
- **Pooler Enabled**: false
- **Pooler Mode**: transaction
- **Passwordless Access**: true
- **Suspend Timeout**: 0 seconds
- **Compute Release Version**: 10673
- **Created**: November 22, 2025 at 19:29:06 UTC
- **Updated**: December 30, 2025 at 00:45:54 UTC

## Connection String

Connection details for applications and tooling. Treat credentials as secrets.

**Pooled Connection String** (Recommended for application use):
```
postgresql://neondb_owner:npg_nCG8VWF9OSwI@ep-purple-tree-abhoip45-pooler.eu-west-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require
```

**Connection Details**:
- **Database**: neondb
- **Role**: neondb_owner
- **Branch ID**: br-rapid-voice-abajd9gp
- **Using Default Compute**: Yes

## Database Structure

High-level inventory of databases and schemas.

### Databases

1. **postgres** (system database)
2. **neondb** (main application database)

### Schemas

1. **public** - Main application schema
2. **neon_auth** - Neon Auth schema (contains `users_sync` table)

## Tables Overview

Quick list of tables by schema; details follow.

### Public Schema Tables

1. **users** - User accounts (Clerk authentication)
2. **categories** - Transaction categories (41 defaults)
3. **transactions** - Bank transactions
4. **statements** - Uploaded bank statements
5. **category_budgets** - Category budget settings
6. **user_files** - Uploaded files storage
7. **receipts** - Grocery receipt metadata
8. **receipt_category_types** - Macronutrient types (6 types: Protein, Carbs, Fat, Mixed, None, Other)
9. **receipt_categories** - Food/Drink/Non-food categories (62 defaults, broad_type: Food/Drinks/Other)
10. **receipt_transactions** - Individual receipt line items
11. **receipt_item_category_preferences** - Receipt item categorization preferences
12. **transaction_category_preferences** - Transaction categorization preferences
13. **subscriptions** - Stripe subscription management
14. **webhook_events** - Stripe webhook event tracking (idempotency)
15. **ai_chat_usage** - AI chat usage tracking (rate limiting)
16. **receipt_store_language_preferences** - Per-store receipt language preferences
17. **user_preferences** - User UI preferences (chart favourites, layout, sizes)

### Neon Auth Schema Tables

1. **users_sync** - Neon Auth user synchronization table

## Detailed Table Schemas

Per-table columns, indexes, constraints, and sizes.

### 1. users

**Purpose**: Stores user accounts linked to Clerk authentication

**Columns**:
- `id` (text, PRIMARY KEY) - Clerk user ID (e.g., "user_2abc123xyz")
- `email` (text, NOT NULL, UNIQUE) - User email address
- `name` (text, NULLABLE) - User display name
- `created_at` (timestamp without time zone, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (timestamp without time zone, NOT NULL)

**Indexes**:
- `users_pkey` (16 kB) - PRIMARY KEY on `id`
- `users_email_key` (16 kB) - UNIQUE index on `email`

**Constraints**:
- PRIMARY KEY: `id`

**Size**: Table: 8 kB, Indexes: 72 kB, Total: 80 kB

---

### 2. transactions

**Purpose**: Stores bank transaction records

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (text, NOT NULL) - References `users(id)`
- `statement_id` (integer, NULLABLE) - References `statements(id)`
- `tx_date` (date, NOT NULL) - Transaction date
- `tx_time` (time without time zone, NULLABLE) - Transaction time (from CSV import)
- `description` (text, NOT NULL) - Transaction description
- `amount` (numeric, NOT NULL) - Transaction amount
- `balance` (numeric, NULLABLE) - Account balance after transaction
- `category_id` (integer, NULLABLE) - References `categories(id)`
- `currency` (text, NOT NULL, DEFAULT 'EUR')
- `country_name` (text, NULLABLE) - Country for world map tracking (must match GeoJSON properties.name)
- `raw_csv_row` (jsonb, NULLABLE) - Original CSV row data
- `created_at` (timestamp without time zone, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (timestamp without time zone, NOT NULL)

**Indexes**:
- `transactions_pkey` (16 kB) - PRIMARY KEY on `id`
- `idx_transactions_user` (16 kB) - Index on `user_id`
- `idx_transactions_user_date` (32 kB) - Composite index on `user_id, tx_date DESC`
- `idx_transactions_user_date_desc_covering` (56 kB) - Covering index on `user_id, tx_date DESC` INCLUDE (`amount`, `balance`, `category_id`, `description`, `tx_time`)
- `idx_transactions_user_country` - Partial index on `user_id, country_name` WHERE `country_name IS NOT NULL` (for world map aggregation)

**Constraints**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` -> `users(id)` ON DELETE CASCADE

**Size**: Table: 112 kB, Indexes: 152 kB, Total: 264 kB

---

### 3. categories

**Purpose**: User-defined transaction categories

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (text, NOT NULL) - References `users(id)`
- `name` (text, NOT NULL) - Category name
- `color` (text, NULLABLE, DEFAULT '#6366f1') - Category color
- `icon` (text, NULLABLE) - Category icon
- `is_default` (boolean, NULLABLE, DEFAULT false) - System default flag
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())
- `updated_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `categories_pkey` (16 kB) - PRIMARY KEY on `id`
- `categories_user_id_name_key` (16 kB) - UNIQUE index on `user_id, name`
- `idx_categories_user` (16 kB) - Index on `user_id`
- `idx_categories_user_name` (16 kB) - Composite index on `user_id, name`

**Constraints**:
- PRIMARY KEY: `id`
- UNIQUE: `user_id, name`
- FOREIGN KEY: `user_id` -> `users(id)` ON DELETE CASCADE

**Size**: Table: 16 kB, Indexes: 96 kB, Total: 112 kB

---

### 4. statements

**Purpose**: Tracks uploaded bank statement files

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (text, NOT NULL) - References `users(id)`
- `file_name` (text, NOT NULL) - Original filename
- `status` (text, NULLABLE, DEFAULT 'processing') - processing, completed, failed
- `row_count` (integer, NULLABLE, DEFAULT 0) - Total rows in CSV
- `imported_count` (integer, NULLABLE, DEFAULT 0) - Successfully imported rows
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())
- `updated_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `statements_pkey` (16 kB) - PRIMARY KEY on `id`
- `idx_statements_user` (16 kB) - Index on `user_id`
- `idx_statements_user_created` (16 kB) - Composite index on `user_id, created_at DESC`

**Constraints**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` -> `users(id)` ON DELETE CASCADE

**Size**: Table: 8 kB, Indexes: 56 kB, Total: 64 kB

---

### 5. category_budgets

**Purpose**: Stores user-defined category budgets for analytics

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (text, NOT NULL) - References `users(id)`
- `category_id` (integer, NOT NULL) - References `categories(id)`
- `scope` (text, NULLABLE, DEFAULT 'analytics') - Budget scope
- `budget` (numeric, NOT NULL, DEFAULT 0) - Budget amount
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())
- `updated_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `category_budgets_pkey` (8 kB) - PRIMARY KEY on `id`
- `category_budgets_user_id_category_id_scope_key` (8 kB) - UNIQUE index on `user_id, category_id, scope`
- `idx_category_budgets_user` (8 kB) - Index on `user_id`

**Constraints**:
- PRIMARY KEY: `id`
- UNIQUE: `user_id, category_id, scope`
- FOREIGN KEY: `user_id` -> `users(id)` ON DELETE CASCADE
- FOREIGN KEY: `category_id` -> `categories(id)` ON DELETE CASCADE

**Size**: Table: 0 bytes, Indexes: 32 kB, Total: 32 kB

---

### 6. user_files

**Purpose**: Stores uploaded files (receipts, statements, etc.)

**Columns**:
- `id` (text, PRIMARY KEY, DEFAULT gen_random_uuid()::text)
- `user_id` (text, NOT NULL) - References `users(id)`
- `file_name` (text, NOT NULL) - Original filename
- `mime_type` (text, NOT NULL) - File MIME type
- `source` (text, NULLABLE, DEFAULT 'Upload') - 'Upload', 'Receipt', 'Statement'
- `data` (bytea, NOT NULL) - File binary data
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `user_files_pkey` (16 kB) - PRIMARY KEY on `id`
- `idx_user_files_user` (16 kB) - Index on `user_id`
- `idx_user_files_source` (16 kB) - Composite index on `user_id, source`

**Constraints**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` -> `users(id)` ON DELETE CASCADE

**Size**: Table: 16 kB, Indexes: 5,816 kB, Total: 5,832 kB

---

### 7. receipts

**Purpose**: Stores grocery receipt metadata

**Columns**:
- `id` (text, PRIMARY KEY, DEFAULT gen_random_uuid()::text)
- `user_id` (text, NOT NULL) - References `users(id)`
- `receipt_file_id` (text, NULLABLE) - References `user_files(id)`
- `store_name` (text, NULLABLE) - Store name from receipt
- `receipt_date` (date, NULLABLE) - Receipt date
- `receipt_time` (time without time zone, NULLABLE) - Receipt time
- `total_amount` (numeric, NULLABLE) - Total receipt amount
- `currency` (text, NULLABLE, DEFAULT 'EUR')
- `status` (text, NULLABLE, DEFAULT 'processing') - processing, completed, failed
- `ai_extraction_data` (jsonb, NULLABLE) - AI extraction metadata
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())
- `updated_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `receipts_pkey` (16 kB) - PRIMARY KEY on `id`
- `idx_receipts_user` (16 kB) - Index on `user_id`
- `idx_receipts_date` (16 kB) - Composite index on `user_id, receipt_date DESC`

**Constraints**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` -> `users(id)` ON DELETE CASCADE
- FOREIGN KEY: `receipt_file_id` -> `user_files(id)` ON DELETE SET NULL

**Size**: Table: 8 kB, Indexes: 56 kB, Total: 64 kB

---

### 8. receipt_category_types

**Purpose**: Stores macronutrient types (Protein, Carbs, Fat, Fiber, Vitamins/Minerals)

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (text, NOT NULL) - References `users(id)`
- `name` (text, NOT NULL) - Type name
- `color` (text, NULLABLE, DEFAULT '#6366f1') - Type color
- `is_default` (boolean, NULLABLE, DEFAULT false) - System default flag
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())
- `updated_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `receipt_category_types_pkey` (16 kB) - PRIMARY KEY on `id`
- `receipt_category_types_user_id_name_key` (16 kB) - UNIQUE index on `user_id, name`
- `idx_receipt_category_types_user` (16 kB) - Index on `user_id`

**Constraints**:
- PRIMARY KEY: `id`
- UNIQUE: `user_id, name`
- FOREIGN KEY: `user_id` -> `users(id)` ON DELETE CASCADE

**Size**: Table: 8 kB, Indexes: 56 kB, Total: 64 kB

---

### 9. receipt_categories

**Purpose**: Stores food, drink, and non-food grocery categories

**Default Categories**: 62 categories organized by type:
- Food (38): Fresh/whole foods, bakery, pantry staples, snacks, frozen, prepared foods
- Drinks (9): Water, soft drinks, juice, coffee/tea, energy drinks, alcohol (beer, wine, spirits, low/no alcohol)
- Other (15): OTC medicine, supplements, hygiene, cleaning, baby, pet supplies

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (text, NOT NULL) - References `users(id)`
- `type_id` (integer, NULLABLE) - References `receipt_category_types(id)` (fallback macro classification)
- `name` (text, NOT NULL) - Category name
- `color` (text, NULLABLE, DEFAULT '#6366f1') - Category color
- `broad_type` (text, NULLABLE) - **Standardized values**: 'Food' | 'Drinks' | 'Other' (used for filtering)
- `is_default` (boolean, NULLABLE, DEFAULT false) - System default flag
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())
- `updated_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `receipt_categories_pkey` (16 kB) - PRIMARY KEY on `id`
- `receipt_categories_user_id_name_key` (16 kB) - UNIQUE index on `user_id, name`
- `idx_receipt_categories_user` (16 kB) - Index on `user_id`
- `idx_receipt_categories_type` (16 kB) - Index on `type_id`

**Constraints**:
- PRIMARY KEY: `id`
- UNIQUE: `user_id, name`
- FOREIGN KEY: `user_id` -> `users(id)` ON DELETE CASCADE
- FOREIGN KEY: `type_id` -> `receipt_category_types(id)` ON DELETE SET NULL

**Size**: Table: 16 kB, Indexes: 96 kB, Total: 112 kB

---

### 10. receipt_transactions

**Purpose**: Stores individual line items from receipts

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `receipt_id` (text, NOT NULL) - References `receipts(id)`
- `user_id` (text, NOT NULL) - References `users(id)` (denormalized for performance)
- `description` (text, NOT NULL) - Item description
- `quantity` (numeric, NULLABLE, DEFAULT 1) - Item quantity
- `price_per_unit` (numeric, NULLABLE) - Price per unit
- `total_price` (numeric, NOT NULL) - Total price
- `category_id` (integer, NULLABLE) - References `receipt_categories(id)`
- `category_type_id` (integer, NULLABLE) - References `receipt_category_types(id)` (denormalized)
- `receipt_date` (date, NULLABLE) - Denormalized receipt date
- `receipt_time` (time without time zone, NULLABLE) - Denormalized receipt time
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())
- `updated_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `receipt_transactions_pkey` (16 kB) - PRIMARY KEY on `id`
- `idx_receipt_transactions_user` (16 kB) - Index on `user_id`
- `idx_receipt_transactions_receipt` (16 kB) - Index on `receipt_id`
- `idx_receipt_transactions_date` (16 kB) - Composite index on `user_id, receipt_date DESC`
- `idx_receipt_transactions_category` (16 kB) - Index on `category_id`

**Constraints**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `receipt_id` -> `receipts(id)` ON DELETE CASCADE
- FOREIGN KEY: `user_id` -> `users(id)` ON DELETE CASCADE
- FOREIGN KEY: `category_id` -> `receipt_categories(id)` ON DELETE SET NULL
- FOREIGN KEY: `category_type_id` -> `receipt_category_types(id)` ON DELETE SET NULL

**Size**: Table: 8 kB, Indexes: 88 kB, Total: 96 kB

---

### 11. receipt_item_category_preferences

**Purpose**: Stores user preferences for categorizing receipt items

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (text, NOT NULL) - References `users(id)`
- `store_key` (text, NOT NULL, DEFAULT '') - Store identifier
- `description_key` (text, NOT NULL) - Item description key
- `category_id` (integer, NOT NULL) - References `receipt_categories(id)`
- `use_count` (integer, NULLABLE, DEFAULT 0) - Usage count
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())
- `updated_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `receipt_item_category_preferences_pkey` (8 kB) - PRIMARY KEY on `id`
- `receipt_item_category_prefere_user_id_store_key_description_key` (8 kB) - UNIQUE index on `user_id, store_key, description_key`
- `idx_receipt_item_prefs_user` (8 kB) - Index on `user_id`
- `idx_receipt_item_prefs_lookup` (8 kB) - Composite index on `user_id, store_key, description_key`
- `receipt_item_category_preferences_unique` (8 kB) - UNIQUE index on `user_id, store_key, description_key`

**Constraints**:
- PRIMARY KEY: `id`
- UNIQUE: `user_id, store_key, description_key`
- FOREIGN KEY: `user_id` -> `users(id)` ON DELETE CASCADE
- FOREIGN KEY: `category_id` -> `receipt_categories(id)` ON DELETE CASCADE

**Size**: Table: 0 bytes, Indexes: 48 kB, Total: 48 kB

---

### 12. transaction_category_preferences

**Purpose**: Stores user preferences for categorizing transactions

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (text, NOT NULL) - References `users(id)`
- `description_key` (text, NOT NULL) - Transaction description key
- `example_description` (text, NULLABLE) - Example transaction description
- `category_id` (integer, NOT NULL) - References `categories(id)`
- `use_count` (integer, NOT NULL, DEFAULT 0) - Usage count
- `last_used_at` (timestamp with time zone, NULLABLE) - Last usage timestamp
- `created_at` (timestamp with time zone, NOT NULL, DEFAULT now())
- `updated_at` (timestamp with time zone, NOT NULL, DEFAULT now())

**Indexes**:
- `transaction_category_preferences_pkey` (16 kB) - PRIMARY KEY on `id`
- `transaction_category_preferences_unique` (16 kB) - UNIQUE index on `user_id, description_key`

**Constraints**:
- PRIMARY KEY: `id`
- UNIQUE: `user_id, description_key`

**Size**: Table: 8 kB, Indexes: 40 kB, Total: 48 kB

---

### 13. subscriptions

**Purpose**: Manages Stripe subscription information

**Columns**:
- `id` (text, PRIMARY KEY)
- `user_id` (text, NOT NULL, UNIQUE) - References `users(id)`
- `plan` (text, NOT NULL, DEFAULT 'free') - free, pro, max
- `status` (text, NOT NULL, DEFAULT 'active') - active, canceled, past_due, trialing
- `stripe_customer_id` (text, NULLABLE, UNIQUE) - Stripe customer ID
- `stripe_subscription_id` (text, NULLABLE, UNIQUE) - Stripe subscription ID
- `stripe_price_id` (text, NULLABLE) - Stripe price ID
- `current_period_end` (timestamp without time zone, NULLABLE) - Subscription period end
- `cancel_at_period_end` (boolean, NOT NULL, DEFAULT false) - Cancel at period end flag
- `is_lifetime` (boolean, NULLABLE, DEFAULT false) - Lifetime subscription flag
- `pending_plan` (text, NULLABLE) - Plan to switch to at period end
- `created_at` (timestamp without time zone, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (timestamp without time zone, NOT NULL)

**Indexes**:
- `subscriptions_pkey` (16 kB) - PRIMARY KEY on `id`
- `subscriptions_user_id_key` (16 kB) - UNIQUE index on `user_id`
- `subscriptions_stripe_customer_id_key` (16 kB) - UNIQUE index on `stripe_customer_id`
- `subscriptions_stripe_subscription_id_key` (16 kB) - UNIQUE index on `stripe_subscription_id`
- `idx_subscriptions_user` (16 kB) - Index on `user_id`
- `idx_subscriptions_stripe_customer` (16 kB) - Partial index on `stripe_customer_id` WHERE NOT NULL
- `idx_subscriptions_stripe_sub` (16 kB) - Partial index on `stripe_subscription_id` WHERE NOT NULL

**Constraints**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` -> `users(id)` ON DELETE CASCADE

**Size**: Table: 8 kB, Indexes: 120 kB, Total: 128 kB

---

### 14. webhook_events

**Purpose**: Tracks Stripe webhook events for idempotency (prevents duplicate processing)

**Columns**:
- `event_id` (text, PRIMARY KEY) - Stripe event ID (e.g., "evt_xxx")
- `event_type` (text, NOT NULL) - Stripe event type
- `status` (text, NULLABLE, DEFAULT 'processing') - processing, completed, failed
- `error_message` (text, NULLABLE) - Error message if processing failed
- `subscription_id` (text, NULLABLE) - Related Stripe subscription ID
- `customer_id` (text, NULLABLE) - Related Stripe customer ID
- `processed_at` (timestamp with time zone, NULLABLE) - When event was processed
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now()) - When event was received

**Indexes**:
- `webhook_events_pkey` (8 kB) - PRIMARY KEY on `event_id`
- `idx_webhook_events_type` (8 kB) - Index on `event_type`
- `idx_webhook_events_status` (8 kB) - Index on `status`
- `idx_webhook_events_processed` (8 kB) - Index on `processed_at`

**Constraints**:
- PRIMARY KEY: `event_id`

**Size**: Table: 0 bytes, Indexes: 40 kB, Total: 40 kB

**Note**: This table implements Stripe's recommended idempotency pattern to ensure webhook events are only processed once, even if Stripe retries delivery.

---

### 15. ai_chat_usage

**Purpose**: Tracks AI chat usage per user for rate limiting

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (text, NOT NULL) - References `users(id)`
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `ai_chat_usage_pkey` (16 kB) - PRIMARY KEY on `id`
- `idx_ai_chat_usage_user_created` (16 kB) - Composite index on `user_id, created_at`

**Constraints**:
- PRIMARY KEY: `id`

**Size**: Table: 8 kB, Indexes: 40 kB, Total: 48 kB

---

### 16. receipt_store_language_preferences

**Purpose**: Stores per-store receipt language preferences for OCR parsing

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (text, NOT NULL) - References `users(id)`
- `store_key` (text, NOT NULL) - Normalized store identifier
- `store_name` (text, NULLABLE) - Display store name
- `language` (text, NOT NULL) - Language code (e.g., 'en', 'fr')
- `use_count` (integer, NOT NULL, DEFAULT 0) - Usage count
- `created_at` (timestamp with time zone, NOT NULL, DEFAULT now())
- `updated_at` (timestamp with time zone, NOT NULL, DEFAULT now())

**Indexes**:
- `receipt_store_language_preferences_pkey` (8 kB) - PRIMARY KEY on `id`
- `receipt_store_language_preferences_unique` (8 kB) - UNIQUE index on `user_id, store_key`

**Constraints**:
- PRIMARY KEY: `id`
- UNIQUE: `user_id, store_key`

**Size**: Table: 0 bytes, Indexes: 24 kB, Total: 24 kB

---

### 17. user_preferences

**Purpose**: Stores user UI preferences as JSONB (chart favourites, layout order, grid sizes across all pages)

**Columns**:
- `user_id` (text, PRIMARY KEY) - References `users(id)`
- `preferences` (jsonb, NOT NULL, DEFAULT '{}') - All user preferences namespaced by page
- `updated_at` (timestamp with time zone, NOT NULL, DEFAULT now())

**JSONB Structure**:
```json
{
  "home": { "favorites": [...], "order": [...], "sizes": {...} },
  "analytics": { "order": [...], "sizes": {...}, "sizes_version": "9" },
  "fridge": { "order": [...], "sizes": {...}, "sizes_version": "1" }
}
```

**Indexes**:
- `user_preferences_pkey` - PRIMARY KEY on `user_id`

**Constraints**:
- PRIMARY KEY: `user_id`
- FOREIGN KEY: `user_id` -> `users(id)` ON DELETE CASCADE

**Triggers**:
- `update_user_preferences_updated_at` - Auto-updates `updated_at` on row update

**Size**: Table: 0 bytes, Indexes: 8 kB, Total: 8 kB (new table)

---

## Database Functions

Server-side functions available in the database.

### Public Schema Functions

- `update_updated_at_column()` - Trigger function to update `updated_at` timestamp
- `show_db_tree()` - Utility function for displaying database tree structure

### UUID Functions (from uuid-ossp extension)

- `uuid_generate_v1()`
- `uuid_generate_v1mc()`
- `uuid_generate_v3()`
- `uuid_generate_v4()`
- `uuid_generate_v5()`
- `uuid_nil()`
- `uuid_ns_dns()`
- `uuid_ns_oid()`
- `uuid_ns_url()`
- `uuid_ns_x500()`

## Database Triggers

Automatic triggers that update fields or enforce behavior.

The following tables have triggers that automatically update the `updated_at` column:

- `users`
- `categories`
- `statements`
- `transactions`
- `receipts`
- `receipt_categories`
- `receipt_category_types`
- `receipt_transactions`
- `subscriptions`
- `category_budgets`
- `user_preferences`

All triggers use the `update_updated_at_column()` function.

## Performance Optimizations

Indexing and denormalization choices that improve query speed.

### Covering Indexes

1. **transactions**: `idx_transactions_user_date_desc_covering`
   - Includes frequently accessed columns (`amount`, `balance`, `category_id`, `description`, `tx_time`)
   - Optimizes queries that filter by `user_id` and `tx_date` and select these columns

2. **receipt_transactions**: `idx_receipt_transactions_covering` (mentioned in schema but not present in current structure)
   - Would include `category_id`, `category_type_id`, `description`, `quantity`, `total_price`

### Denormalization

1. **receipt_transactions**:
   - `user_id` stored directly (avoids join through `receipts`)
   - `receipt_date` and `receipt_time` stored directly (avoids join through `receipts`)
   - `category_type_id` stored directly (avoids join through `receipt_categories`)

### Composite Indexes

- User + date indexes for time-series queries
- User + category indexes for category filtering
- User + name indexes for category lookups

## Database Statistics

Size and usage metrics for the project.

### Total Database Size

- **Logical Size**: ~43.5 MB
- **Written Data**: ~141.8 MB
- **Data Transfer**: ~224.0 MB

### Table Sizes Summary

| Table | Table Size | Index Size | Total Size |
|-------|------------|------------|------------|
| user_files | 32 kB | 17 MB | 17 MB |
| transactions | 232 kB | 448 kB | 680 kB |
| categories | 56 kB | 168 kB | 224 kB |
| receipt_categories | 56 kB | 160 kB | 216 kB |
| receipt_transactions | 32 kB | 112 kB | 144 kB |
| subscriptions | 8 kB | 120 kB | 128 kB |
| users | 8 kB | 72 kB | 80 kB |
| webhook_events | 8 kB | 72 kB | 80 kB |
| category_budgets | 8 kB | 56 kB | 64 kB |
| statements | 8 kB | 56 kB | 64 kB |
| receipts | 8 kB | 56 kB | 64 kB |
| receipt_category_types | 8 kB | 56 kB | 64 kB |
| ai_chat_usage | 8 kB | 40 kB | 48 kB |
| receipt_item_category_preferences | 0 bytes | 48 kB | 48 kB |
| transaction_category_preferences | 8 kB | 40 kB | 48 kB |
| receipt_store_language_preferences | 0 bytes | 24 kB | 24 kB |
| user_preferences | 0 bytes | 8 kB | 8 kB |

**Note**: The `user_files` table has a large index size (17 MB) due to indexing binary data, which is expected for file storage. Sizes sorted by total descending.

## Connection Information

Connection format and pooling behavior.

### Connection String Format

The connection string uses the pooled endpoint format:
```
postgresql://[role]:[password]@[endpoint]-pooler.[region].aws.neon.tech/[database]?channel_binding=require&sslmode=require
```

### Connection Pooling

- **Pooler Enabled**: Currently disabled on the compute endpoint
- **Pooler Mode**: transaction (when enabled)
- **Recommended**: Use pooled connection string for application connections

### Security

- **SSL Mode**: require
- **Channel Binding**: require
- **Passwordless Access**: Enabled

## Monitoring & Performance

Operational monitoring status and current compute activity.

### Slow Query Monitoring

**Status**: `pg_stat_statements` extension is not currently installed

To enable slow query monitoring, run:
```sql
CREATE EXTENSION pg_stat_statements;
```

### Compute Usage

- **Total Compute Time**: 99,153 seconds (~27.5 hours)
- **Active Time**: 387,216 seconds (~107.6 hours)
- **Last Active**: December 30, 2025 at 00:16:06 UTC
- **Current Status**: Active (was suspended, now resumed)

## Notes

Important context and caveats for the schema and infrastructure.

1. **User IDs**: All user IDs are stored as `TEXT` to match Clerk's authentication format (e.g., "user_2abc123xyz"), not UUIDs.

2. **Connection Pooling**: While the compute endpoint shows pooler as disabled, the connection string uses the `-pooler` suffix, which enables Neon's built-in connection pooling at the proxy level.

3. **Database Suspension**: The compute endpoint automatically suspends when idle on the free tier. It was suspended on December 23, 2025 and resumed on December 24, 2025 at 00:06:09 UTC. The endpoint is currently active (last active December 30, 2025 at 00:16:06 UTC).

4. **File Storage**: The `user_files` table stores binary data directly in the database. Consider migrating to object storage (S3, etc.) for production if file sizes grow significantly.

5. **Neon Auth**: The `neon_auth` schema contains a `users_sync` table, indicating Neon Auth may have been provisioned at some point, though it's not currently active in the main database.

---

## API Routes Reference

Complete listing of all API endpoints organized by feature domain. Total: **74 routes**.

### Chart Bundles (Aggregated Data APIs)

Bundle APIs aggregate multiple chart data sources into a single response with Redis caching for performance.

| Route | Method | Description | Cache TTL |
|-------|--------|-------------|-----------|
| `/api/charts/home-bundle` | GET | Home page charts (KPIs, activity rings, daily spending) | 5 min |
| `/api/charts/analytics-bundle` | GET | Analytics page charts (category breakdown, trends) | 5 min |
| `/api/charts/fridge-bundle` | GET | Fridge page charts (grocery spending, receipt stats) | 5 min |
| `/api/charts/trends-bundle` | GET | Trends page charts (category trends over time) | 5 min |
| `/api/charts/savings-bundle` | GET | Savings page charts (savings rate, cumulative) | 5 min |
| `/api/charts/data-library-bundle` | GET | Data library overview | 5 min |
| `/api/charts/test-charts-bundle` | GET | Test charts playground (transactions + receipt transactions) | 5 min |
| `/api/charts/world-map-bundle` | GET | World map page (country spending, stats) | 5 min |

### Individual Chart APIs

| Route | Method | Description |
|-------|--------|-------------|
| `/api/charts/transaction-history` | GET | Transaction timeline data |
| `/api/dashboard-stats` | GET | Dashboard statistics |
| `/api/stats` | GET | General statistics |
| `/api/financial-health` | GET | Financial health score |

### Analytics APIs

| Route | Method | Description |
|-------|--------|-------------|
| `/api/analytics/grocery-vs-restaurant` | GET | Grocery vs. eating out comparison |
| `/api/analytics/category-bubble` | GET | Category bubble chart data |
| `/api/analytics/day-of-week-category` | GET | Day-of-week spending by category |
| `/api/analytics/monthly-category-duplicate` | GET | Monthly category breakdown |

### World Map APIs

| Route | Method | Description |
|-------|--------|-------------|
| `/api/world-map/links` | POST | Link transactions to a country |
| `/api/world-map/links` | DELETE | Unlink transactions from a country |
| `/api/world-map/transactions` | GET | Get transactions for a specific country |
| `/api/world-map/unlinked-transactions` | GET | Get transactions not linked to any country |

### Transaction APIs

| Route | Method | Description |
|-------|--------|-------------|
| `/api/transactions` | GET, POST | List/create transactions |
| `/api/transactions/[id]` | GET, PUT, DELETE | Single transaction operations |
| `/api/transactions/daily` | GET | Daily transaction aggregates |
| `/api/transactions/daily-365` | GET | 365-day history |
| `/api/transactions/years` | GET | Available transaction years |
| `/api/transactions/total-count` | GET | Total transaction count |
| `/api/transactions/preferences` | GET, POST | User's categorization preferences |

### Category APIs

| Route | Method | Description |
|-------|--------|-------------|
| `/api/categories` | GET, POST | List/create spending categories |
| `/api/categories/[id]` | PUT, DELETE | Update/delete category |
| `/api/categories/count` | GET | Category count |
| `/api/categories/needs-wants` | GET | Needs vs. wants analysis |
| `/api/categories/backfill` | POST | Backfill category for transactions |
| `/api/categories/reset` | POST | Reset to default categories |

### Statement & Import APIs

| Route | Method | Description |
|-------|--------|-------------|
| `/api/statements` | GET | List statements |
| `/api/statements/[id]` | GET, DELETE | Get/delete statement details |
| `/api/statements/[id]/transactions` | GET | Get transactions from statement |
| `/api/statements/import` | POST | Import CSV statements |
| `/api/statements/parse` | POST | Parse uploaded CSV file |

### Receipt & Fridge APIs

| Route | Method | Description |
|-------|--------|-------------|
| `/api/receipts` | GET | List receipts |
| `/api/receipts/[id]` | GET, DELETE | Get/delete receipt details |
| `/api/receipts/upload` | POST | Upload receipt images/PDFs |
| `/api/receipts/commit` | POST | Finalize receipt processing |
| `/api/receipts/manual` | POST | Manual receipt entry |
| `/api/receipt-categories` | GET, POST | Receipt category management |
| `/api/receipt-categories/types` | GET | Macronutrient types |
| `/api/receipt-categories/migrate` | POST | Migration utilities |
| `/api/receipt-transactions/[id]` | GET, PUT | Get/update receipt line item |
| `/api/receipt-transactions/[id]/category` | PUT | Update item category |
| `/api/receipt-stores/language` | GET, PUT | Store language settings |
| `/api/fridge` | GET | Fridge aggregation |

### Billing & Subscription APIs

| Route | Method | Description |
|-------|--------|-------------|
| `/api/billing/portal` | POST | Stripe customer portal session |
| `/api/billing/change-plan` | POST | Switch subscription plan |
| `/api/billing/preview-upgrade` | GET | Preview plan upgrade costs |
| `/api/billing/cancel` | POST | Cancel subscription at period end |
| `/api/billing/cancel-now` | POST | Cancel immediately |
| `/api/billing/cancel-preview` | GET | Preview cancellation |
| `/api/billing/reactivate` | POST | Reactivate canceled subscription |
| `/api/billing/apply-retention-coupon` | POST | Apply retention coupon |
| `/api/checkout` | POST | Stripe checkout session |
| `/api/subscription/me` | GET | Get current subscription |
| `/api/subscription/status` | GET | Subscription status |
| `/api/stripe/sync-subscription` | POST | Sync subscription from Stripe |
| `/api/budgets` | GET, POST | Category budget management |

### File APIs

| Route | Method | Description |
|-------|--------|-------------|
| `/api/files` | GET | List uploaded files |
| `/api/files/upload` | POST | Upload files |

### AI Features APIs

| Route | Method | Description |
|-------|--------|-------------|
| `/api/ai/chat` | POST | Chat with AI insights |
| `/api/ai/chart-insight` | POST | AI-generated chart insights |

### Webhook APIs

| Route | Method | Description |
|-------|--------|-------------|
| `/api/webhook/stripe` | POST | Stripe webhook receiver |
| `/api/webhook/clerk` | POST | Clerk webhook receiver |

### User Preferences APIs

| Route | Method | Description |
|-------|--------|-------------|
| `/api/user-preferences` | GET | Get current user's UI preferences (chart favourites, layout, sizes) |
| `/api/user-preferences` | PUT | Upsert user's UI preferences (full replace) |

### Admin & Maintenance APIs

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/backfill-all-categories` | POST | Backfill all users' categories |
| `/api/cache/invalidate` | POST | Manually invalidate cache |
| `/api/health` | GET | Health check |
| `/api/limits/status` | GET | User's current usage limits |
| `/api/debug/sync-user` | POST | Debug user sync |
| `/api/migrations/fix-default-categories` | POST | Migrate default categories |

---

## Bundle APIs & Caching

Every page loads chart data via a **single bundle API** that aggregates all charts and caches with **Upstash Redis**.

### Bundle Architecture

```
Page Request
    ↓
Bundle API Route (/api/charts/*-bundle)
    ↓
getCachedOrCompute(cacheKey, aggregationFn, ttl)
    ↓
┌─────────────────────────────────────────┐
│  Cache HIT?                              │
│  ├─ YES → Return cached data            │
│  └─ NO  → Run aggregation function      │
│           → Cache result                 │
│           → Return data                  │
└─────────────────────────────────────────┘
```

### Bundle Routes by Page

| Page | Bundle API | Aggregation File | Summary Type |
|------|------------|------------------|--------------|
| Home | `/api/charts/home-bundle` | `lib/charts/home-trends-savings-aggregations.ts` | `HomeSummary` |
| Analytics | `/api/charts/analytics-bundle` | `lib/charts/aggregations.ts` | `AnalyticsSummary` |
| Fridge | `/api/charts/fridge-bundle` | `lib/charts/fridge-aggregations.ts` | `FridgeSummary` |
| Trends | `/api/charts/trends-bundle` | `lib/charts/home-trends-savings-aggregations.ts` | `TrendsSummary` |
| Savings | `/api/charts/savings-bundle` | `lib/charts/home-trends-savings-aggregations.ts` | `SavingsSummary` |
| Data Library | `/api/charts/data-library-bundle` | — | `DataLibrarySummary` |
| Test Charts | `/api/charts/test-charts-bundle` | `lib/charts/aggregations.ts` | `TestChartsSummary` |
| World Map | `/api/charts/world-map-bundle` | `lib/charts/world-map-aggregations.ts` | `WorldMapBundleResponse` |

### Cache Configuration (`lib/cache/upstash.ts`)

**Cache Key Prefixes:**
```typescript
const CACHE_PREFIX = {
    analytics: 'analytics',
    fridge: 'fridge',
    home: 'home',
    trends: 'trends',
    savings: 'savings',
    categories: 'categories',
    'data-library': 'data-library',
    'test-charts': 'test-charts',
    'world-map': 'world-map',
}
```

**TTL Values:**
| Type | TTL | Use Case |
|------|-----|----------|
| `analytics` | 5 minutes | Chart data (default) |
| `fridge` | 5 minutes | Receipt/grocery data |
| `world-map` | 5 minutes | World map country spending data |
| `categories` | 30 minutes | Category lookups |
| `short` | 1 minute | Frequently changing data |

### Cache Key Format

```
user:{userId}:{prefix}:{filter}:{suffix}
```

**Examples:**
- `user:user_2abc123xyz:analytics:12m:bundle`
- `user:user_2abc123xyz:home:3m:bundle`
- `user:user_2abc123xyz:categories:list`

### Cache Usage Pattern

```typescript
import { getCachedOrCompute, buildCacheKey, CACHE_TTL } from '@/lib/cache/upstash'

// In bundle route:
const cacheKey = buildCacheKey('analytics', userId, filter, 'bundle')
const data = await getCachedOrCompute<AnalyticsSummary>(
    cacheKey,
    () => getAnalyticsBundle(userId, filter),
    CACHE_TTL.analytics  // 5 minutes
)
```

### Cache Invalidation

When data changes (upload, edit, delete), invalidate the relevant cache:

```typescript
import { invalidateUserCachePrefix } from '@/lib/cache/upstash'

// After mutation:
await invalidateUserCachePrefix(userId, 'analytics')
await invalidateUserCachePrefix(userId, 'home')
```

**Which prefixes to invalidate:**

| After... | Invalidate |
|----------|------------|
| Transaction create/update/delete | `analytics`, `home`, `trends`, `savings`, `world-map`, `test-charts` |
| Category create/update/delete | `categories`, `analytics`, `test-charts` |
| Receipt create/update/delete | `fridge`, `test-charts` |
| Statement import | `analytics`, `home`, `trends`, `savings`, `world-map`, `data-library`, `test-charts` |
| World map link/unlink transactions | `world-map` |

---

## Data Flow

How data moves through the system from import to display.

### Bank Statement Flow

```
CSV/PDF Upload
    ↓
/api/statements/parse (detect bank format)
    ↓
lib/parsing/ (bank-specific parsers)
    ↓
/api/statements/import (save to DB)
    ↓
lib/ai/ (AI categorization via Anthropic)
    ↓
Neon DB (transactions table)
    ↓
lib/charts/ (aggregations)
    ↓
Bundle API (cached response)
    ↓
UI Components
```

### Receipt Flow

```
Receipt Image/PDF
    ↓
/api/receipts/upload
    ↓
lib/receipts/ocr/ (OCR extraction)
    ↓
lib/receipts/parsers/ (store-specific parsing)
    ↓
lib/ai/ (item categorization)
    ↓
/api/receipts/commit (finalize)
    ↓
Neon DB (receipts + receipt_transactions)
    ↓
lib/charts/fridge-aggregations.ts
    ↓
/api/charts/fridge-bundle
    ↓
Fridge UI
```

### Three-System Identity Flow

```
Clerk Authentication
    ↓
Clerk userId (e.g., "user_2abc123xyz")
    ↓
┌─────────────────────────────────────────┐
│  /api/webhook/clerk                      │
│  Creates user in Neon if not exists     │
└─────────────────────────────────────────┘
    ↓
Neon users.id = Clerk userId (same value)
    ↓
┌─────────────────────────────────────────┐
│  /api/checkout                           │
│  Creates Stripe customer with metadata  │
│  { userId: clerkUserId }                │
└─────────────────────────────────────────┘
    ↓
Stripe customer.metadata.userId = Clerk userId
    ↓
┌─────────────────────────────────────────┐
│  /api/webhook/stripe                     │
│  Updates Neon subscriptions table       │
│  using customer.metadata.userId         │
└─────────────────────────────────────────┘
```

### Authentication Flow (Every API Request)

```typescript
// lib/auth.ts
import { getCurrentUserId } from '@/lib/auth'

export async function GET() {
    // 1. Get Clerk userId (throws 401 if not authenticated)
    const userId = await getCurrentUserId()

    // 2. User exists in Neon (ensured by Clerk webhook)

    // 3. All queries scoped by userId
    const data = await neonQuery(
        'SELECT * FROM table WHERE user_id = $1',
        [userId]
    )
}
```

---

## Last Updated

Snapshot timestamp for this document. Refresh using Neon MCP when needed.

This documentation was generated on: **February 7, 2026**

Metadata, metrics, and connection details were refreshed using Neon MCP tools and reflect the current state of the database.

### Recent Changes

Notable schema and data changes since the previous snapshot.

- **February 7, 2026**: User preferences migration to database:
  - Added `user_preferences` table (JSONB) for chart favourites, layout order, and grid sizes across Home, Analytics, and Fridge pages
  - Added `ai_chat_usage` table to docs (already existed in DB, missing from docs)
  - Added `receipt_store_language_preferences` table to docs (already existed in DB, missing from docs)
  - Added API route `/api/user-preferences` (GET + PUT)
  - Updated table sizes and project metrics
  - Total public schema tables: 14 → 17
- **February 1, 2026**: World Map feature database integration:
  - Added `country_name` (text NULL) column to `transactions` table
  - Added `idx_transactions_user_country` partial index for country aggregation
  - Added World Map APIs: `/api/charts/world-map-bundle`, `/api/world-map/links`, `/api/world-map/transactions`, `/api/world-map/unlinked-transactions`
  - Added `world-map` cache prefix with 5-minute TTL
- **January 26, 2026**: Added comprehensive API Routes Reference (68 routes), Bundle APIs & Caching documentation, and Data Flow diagrams
- **December 30, 2025**: Refreshed organization, project, branch, compute, and size metrics via Neon MCP; added preview branch summary
- **December 28, 2025**: Expanded category system:
  - Transaction categories: 22 -> 41 (added utilities, transport, health, shopping subcategories)
  - Receipt categories: 31 -> 62 (detailed food, beverage, non-food items)
  - Standardized `broad_type` to Food/Drinks/Other only
  - Migration endpoint `/api/migrations/fix-default-categories` to mark defaults
- **December 24, 2025**: Added `webhook_events` table for Stripe webhook idempotency
- **December 24, 2025**: Compute endpoint resumed from suspension
- **December 23, 2025**: Initial documentation created

### Migration Notes

Optional migrations or backfills for existing data.

For existing users with old default categories, run:
```bash
curl -X POST http://localhost:3000/api/migrations/fix-default-categories?dryRun=true
```

This marks default categories with `is_default=true` to exclude them from user category limits.

