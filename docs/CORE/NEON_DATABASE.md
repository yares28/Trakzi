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
- **Project Active Time**: 397,176 seconds (~110.3 hours)
- **Project CPU Used**: 102,081 seconds (~28.4 hours)
- **Synthetic Storage Size**: 105,123,096 bytes (~100.3 MB)
- **Project Updated**: February 12, 2026 at 17:29:15 UTC
- **Compute Last Active**: February 12, 2026 at 17:29:06 UTC

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
- **Updated**: February 12, 2026 at 17:30:48 UTC
- **Created By**: yares
- **Logical Size**: 52,060,160 bytes (~49.7 MB)
- **Compute Usage**: 66,907 seconds (~18.6 hours)
- **Active Time**: 261,588 seconds (~72.7 hours)
- **Written Data**: 76,136,272 bytes (~72.6 MB)
- **Data Transfer**: 39,763,687 bytes (~37.9 MB)
- **Console Link**: https://console.neon.tech/app/projects/orange-waterfall-16223480/branches/br-rapid-voice-abajd9gp

### Other Branches

1. **dev** (br-shy-tooth-ab0gdcbd)
   - Parent: br-rapid-voice-abajd9gp
   - Status: ready
   - Source: console
   - Created: December 30, 2025 at 23:46:12 UTC
   - Updated: February 12, 2026 at 17:10:49 UTC
   - Logical Size: 50,151,424 bytes (~47.8 MB)
   - Compute Usage: 35,174 seconds (~9.8 hours)
   - Active Time: 135,588 seconds (~37.7 hours)

2. **preview/main** (br-square-firefly-abkjqt5p)
   - Parent: br-rapid-voice-abajd9gp
   - Status: archived
   - Source: vercel
   - Created: December 31, 2025 at 01:21:21 UTC
   - Updated: January 14, 2026 at 01:22:55 UTC
   - Logical Size: 45,686,784 bytes (~43.6 MB)

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
- **Last Active**: February 12, 2026 at 17:29:06 UTC
- **Started At**: February 12, 2026 at 17:29:04 UTC
- **Pooler Enabled**: false
- **Pooler Mode**: transaction
- **Passwordless Access**: true
- **Suspend Timeout**: 0 seconds
- **Compute Release Version**: 11319
- **Created**: November 22, 2025 at 19:29:06 UTC
- **Updated**: February 12, 2026 at 17:29:15 UTC

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
18. **pockets** - Unified pocket items (vehicles, properties, other assets)
19. **pocket_transactions** - Junction table linking transactions to pockets with tab classification
20. **transaction_wallet** - Per-user transaction capacity tracking (base gift + earned monthly bonuses + purchased packs)

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
- `simplified_description` (character varying, NULLABLE) - Simplified merchant/label generated by hybrid pipeline v2
- `created_at` (timestamp without time zone, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (timestamp without time zone, NOT NULL)

**Indexes**:
- `transactions_pkey` (48 kB) - PRIMARY KEY on `id`
- `idx_transactions_user` (16 kB) - Index on `user_id`
- `idx_transactions_user_date` (64 kB) - Composite index on `user_id, tx_date DESC`
- `idx_transactions_user_date_desc_covering` (184 kB) - Covering index on `user_id, tx_date DESC` INCLUDE (`amount`, `balance`, `category_id`, `description`, `tx_time`)
- `idx_transactions_user_country` (16 kB) - Partial index on `user_id, country_name` WHERE `country_name IS NOT NULL` (for world map aggregation)
- `idx_transactions_simplified_description` (16 kB) - Index on `simplified_description` for merchant/label lookups

**Constraints**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` -> `users(id)` ON DELETE CASCADE

**Size**: Table: 232 kB, Indexes: 448 kB, Total: 680 kB

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
- `broad_type` (text, NULLABLE) - Category broad type classification
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())
- `updated_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `categories_pkey` (16 kB) - PRIMARY KEY on `id`
- `categories_user_id_name_key` (48 kB) - UNIQUE index on `user_id, name`
- `idx_categories_user` (16 kB) - Index on `user_id`
- `idx_categories_user_name` (48 kB) - Composite index on `user_id, name`

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

**Size**: Table: 40 kB, Indexes: 112 kB, Total: 152 kB

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

**Note**: This table has duplicate indexes (`receipt_item_category_prefere_user_id_store_key_description_key` and `receipt_item_category_preferences_unique` both enforce the same UNIQUE constraint). Consider consolidating.

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
- `plan` (text, NOT NULL, DEFAULT 'free') - free, pro, max (basic was removed in Feb 2026 overhaul)
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

**Size**: Table: 8 kB, Indexes: 24 kB, Total: 32 kB

### 18. pockets

**Purpose**: Unified storage for vehicles, properties, and other pocket items. Uses JSONB `metadata` for type-specific data (vehicle details, mortgage info, etc.).

**Columns**:
- `id` (serial, PRIMARY KEY)
- `user_id` (text, NOT NULL) - References `users(id)` ON DELETE CASCADE
- `type` (text, NOT NULL) - Discriminator: `'vehicle'` | `'property'` | `'other'`
- `name` (text, NOT NULL) - Display name (e.g., "My Toyota", "Main Apartment")
- `metadata` (jsonb, NOT NULL, DEFAULT '{}') - Type-specific data (see TypeScript types in `lib/types/pockets.ts`)
- `svg_path` (text, nullable) - Icon/image path (e.g., "/topView/topviewcar2.svg")
- `created_at` (timestamptz, NOT NULL, DEFAULT now())
- `updated_at` (timestamptz, NOT NULL, DEFAULT now())

**Indexes**:
- `idx_pockets_user` - ON `(user_id)`
- `idx_pockets_user_type` - ON `(user_id, type)`

**Constraints**:
- `pockets_user_type_name_unique` - UNIQUE `(user_id, type, name)` — prevents duplicate names per user per type

**Triggers**:
- `update_pockets_updated_at` - Auto-updates `updated_at` via `update_updated_at_column()`

**JSONB Metadata Schemas** (TypeScript types in `lib/types/pockets.ts`):
- **VehicleMetadata**: `{ brand, vehicleType, year, priceBought, licensePlate?, fuelType?, tankSizeL?, financing?: {...}, nextMaintenanceDate?, ... }`
- **OwnedPropertyMetadata**: `{ propertyType: "owned", estimatedValue, mortgage?: { originalAmount, interestRate, loanYears, yearsPaid } }`
- **RentedPropertyMetadata**: `{ propertyType: "rented", monthlyRent? }`
- **OtherPocketMetadata**: `{}` (name is sufficient)

### 19. pocket_transactions

**Purpose**: Junction table linking transactions to pockets with a `tab` discriminator for sub-categorization.

**Columns**:
- `id` (serial, PRIMARY KEY)
- `pocket_id` (integer, NOT NULL) - References `pockets(id)` ON DELETE CASCADE
- `transaction_id` (integer, NOT NULL) - References `transactions(id)` ON DELETE CASCADE
- `user_id` (text, NOT NULL) - References `users(id)` ON DELETE CASCADE (denormalized for fast queries)
- `tab` (text, NOT NULL) - Sub-section: `'fuel'`, `'maintenance'`, `'insurance'`, `'certificate'`, `'financing'`, `'parking'`, `'mortgage'`, `'taxes'`, `'rent'`, `'utilities'`, `'deposit'`, `'fees'`, `'general'`
- `created_at` (timestamptz, NOT NULL, DEFAULT now())

**Indexes**:
- `idx_pocket_tx_pocket` - ON `(pocket_id)`
- `idx_pocket_tx_user` - ON `(user_id)`
- `idx_pocket_tx_transaction` - ON `(transaction_id)`
- `idx_pocket_tx_pocket_tab` - ON `(pocket_id, tab)`
- `idx_pocket_tx_user_agg` - ON `(user_id, pocket_id, tab)` — covering index for bundle aggregation

**Constraints**:
- UNIQUE `(pocket_id, transaction_id)` — each transaction can only be linked once per pocket

---

### 20. transaction_wallet

**Purpose**: Tracks per-user transaction capacity using a wallet model: base gift from plan + earned monthly bonuses (permanent) + purchased packs (permanent) + renewable monthly slots.

**Columns**:
- `user_id` (text, PRIMARY KEY) - References `users(id)`
- `base_capacity` (integer, NOT NULL, DEFAULT 500) - Initial gift from plan. Set on signup or plan change. Free=500, Pro=1500/2000, Max=5000/6000
- `monthly_bonus_earned` (integer, NOT NULL, DEFAULT 0) - Cumulative monthly bonus converted to permanent capacity. Grows each rollover by the amount of monthly slots used that period
- `purchased_capacity` (integer, NOT NULL, DEFAULT 0) - Transactions bought via one-time Stripe payment. Survives plan changes (permanent)
- `monthly_used` (integer, NOT NULL, DEFAULT 0) - Monthly bonus slots consumed this period. Resets on period rollover. ONE-WAY: only increments, never decrements (deleting transactions does NOT free monthly slots)
- `monthly_period_start` (timestamp with time zone, NOT NULL, DEFAULT DATE_TRUNC('month', NOW())) - Start of current monthly period. Used to detect lazy rollover
- `updated_at` (timestamp with time zone, NOT NULL, DEFAULT NOW())

**Indexes**:
- `transaction_wallet_pkey` - PRIMARY KEY on `user_id`

**Constraints**:
- PRIMARY KEY: `user_id`
- FOREIGN KEY: `user_id` -> `users(id)` ON DELETE CASCADE

**Capacity Formula**:
```
total_capacity = base_capacity
               + monthly_bonus_earned
               + purchased_capacity
               + MAX(0, plan.monthlyTransactions - monthly_used)
```

**Rollover Behavior** (lazy, detected on first request after period expires):
```
1. monthly_bonus_earned += monthly_used   (used slots become permanent)
2. monthly_used = 0                       (reset for new period)
3. monthly_period_start = new period start
```

**Key Invariants**:
- `monthly_used` is one-way -- only increments, never decrements within a period
- Purchased capacity is permanent -- survives plan downgrades and cancellations
- On plan upgrade: `base_capacity = GREATEST(current, new_plan_base)` (never reduces)
- NEVER auto-delete transactions -- block writes and show helpful error instead

**Code Reference**: `lib/limits/transaction-wallet.ts`

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

- `pockets` - `update_pockets_updated_at` (BEFORE UPDATE)

**Note**: While many tables have `updated_at` columns, only the `pockets` table currently has an active trigger. Other tables may rely on application-level updates or triggers may have been removed. The `update_updated_at_column()` function exists and can be used to create triggers for other tables if needed.

## Performance Optimizations

Indexing and denormalization choices that improve query speed.

### Covering Indexes

1. **transactions**: `idx_transactions_user_date_desc_covering` (184 kB)
   - Includes frequently accessed columns (`amount`, `balance`, `category_id`, `description`, `tx_time`)
   - Optimizes queries that filter by `user_id` and `tx_date` and select these columns
   - Largest index in the database, critical for transaction queries

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

- **Logical Size**: ~49.7 MB
- **Written Data**: ~72.6 MB
- **Data Transfer**: ~37.9 MB

### Table Sizes Summary

| Table | Table Size | Index Size | Total Size |
|-------|------------|------------|------------|
| user_files | 32 kB | 17 MB | 17 MB |
| transactions | 232 kB | 448 kB | 680 kB |
| categories | 56 kB | 168 kB | 224 kB |
| receipt_categories | 56 kB | 160 kB | 216 kB |
| receipt_transactions | 40 kB | 112 kB | 152 kB |
| subscriptions | 8 kB | 120 kB | 128 kB |
| users | 8 kB | 72 kB | 80 kB |
| webhook_events | 8 kB | 72 kB | 80 kB |
| pockets | 8 kB | 72 kB | 80 kB |
| category_budgets | 8 kB | 56 kB | 64 kB |
| pocket_transactions | 0 bytes | 64 kB | 64 kB |
| receipts | 8 kB | 56 kB | 64 kB |
| receipt_category_types | 8 kB | 56 kB | 64 kB |
| statements | 8 kB | 56 kB | 64 kB |
| receipt_item_category_preferences | 0 bytes | 48 kB | 48 kB |
| ai_chat_usage | 8 kB | 40 kB | 48 kB |
| transaction_category_preferences | 8 kB | 40 kB | 48 kB |
| user_preferences | 8 kB | 24 kB | 32 kB |
| receipt_store_language_preferences | 0 bytes | 24 kB | 24 kB |
| users_sync (neon_auth) | 8 kB | 40 kB | 48 kB |

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

- **Total Compute Time**: 66,907 seconds (~18.6 hours)
- **Active Time**: 261,588 seconds (~72.7 hours)
- **Last Active**: February 12, 2026 at 17:29:06 UTC
- **Current Status**: Active

## Notes

Important context and caveats for the schema and infrastructure.

1. **User IDs**: All user IDs are stored as `TEXT` to match Clerk's authentication format (e.g., "user_2abc123xyz"), not UUIDs.

2. **Connection Pooling**: While the compute endpoint shows pooler as disabled, the connection string uses the `-pooler` suffix, which enables Neon's built-in connection pooling at the proxy level.

3. **Database Suspension**: The compute endpoint automatically suspends when idle on the free tier. It was suspended on December 23, 2025 and resumed on December 24, 2025 at 00:06:09 UTC. The endpoint is currently active (last active December 30, 2025 at 00:16:06 UTC).

4. **File Storage**: The `user_files` table stores binary data directly in the database. Consider migrating to object storage (S3, etc.) for production if file sizes grow significantly.

5. **Neon Auth**: The `neon_auth` schema contains a `users_sync` table, indicating Neon Auth may have been provisioned at some point, though it's not currently active in the main database.

---

## API Routes Reference

Complete listing of all API endpoints organized by feature domain. Total: **76 routes**.

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
| `/api/charts/pockets-bundle` | GET | Pockets page (country spending, stats) | 5 min |

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
| `/api/pockets/links` | POST | Link transactions to a country |
| `/api/pockets/links` | DELETE | Unlink transactions from a country |
| `/api/pockets/transactions` | GET | Get transactions for a specific country |
| `/api/pockets/unlinked-transactions` | GET | Get transactions not linked to any country |
| `/api/pockets/items` | GET | List all pocket items (vehicles, properties, other) with totals |
| `/api/pockets/items` | POST | Create a new pocket (vehicle, property, or other) |
| `/api/pockets/items?id=` | PATCH | Update pocket name, metadata, or svg_path |
| `/api/pockets/items?id=` | DELETE | Delete a pocket (cascade deletes linked transactions) |
| `/api/pockets/item-links` | POST | Link transactions to a pocket tab |
| `/api/pockets/item-links` | DELETE | Unlink transactions from a pocket |
| `/api/pockets/item-transactions` | GET | Get linked transactions for a pocket tab |
| `/api/pockets/item-unlinked` | GET | Get unlinked transactions filtered by pocket tab categories |

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
| `/api/transactions/buy` | GET, POST | GET: list available transaction packs; POST: create Stripe checkout for one-time pack purchase |
| `/api/transactions/wallet` | GET | Current user's transaction wallet capacity breakdown (base, earned, purchased, monthly) |

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
| Pockets | `/api/charts/pockets-bundle` | `lib/charts/pockets-aggregations.ts` | `PocketsBundleResponse` |

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
    'pockets': 'pockets',
}
```

**TTL Values:**
| Type | TTL | Use Case |
|------|-----|----------|
| `analytics` | 5 minutes | Chart data (default) |
| `fridge` | 5 minutes | Receipt/grocery data |
| `pockets` | 5 minutes | Pockets page country spending data |
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
| Transaction create/update/delete | `analytics`, `home`, `trends`, `savings`, `pockets`, `test-charts` |
| Category create/update/delete | `categories`, `analytics`, `test-charts` |
| Receipt create/update/delete | `fridge`, `test-charts` |
| Statement import | `analytics`, `home`, `trends`, `savings`, `pockets`, `data-library`, `test-charts` |
| Pockets link/unlink transactions | `pockets` |

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

This documentation was generated on: **February 12, 2026**

Metadata, metrics, and connection details were refreshed using Neon MCP tools and reflect the current state of the database.

### Recent Changes

Notable schema and data changes since the previous snapshot.

- **February 18, 2026**: Plan & Subscription System Overhaul:
  - Removed `basic` plan -- only `free`, `pro`, `max` remain in `PlanType`
  - Added `transaction_wallet` table for per-user capacity tracking (base + earned + purchased + monthly)
  - Added API routes: `GET/POST /api/transactions/buy` (transaction pack purchases), `GET /api/transactions/wallet` (wallet capacity)
  - Transaction wallet uses lazy monthly rollover (no cron needed)
  - `monthly_used` is one-way -- deleting transactions does NOT free monthly slots
  - NEVER auto-delete transactions; block writes and show helpful error instead
  - AI chat rate limiting changed from per-day to rolling 7-day window for all plans
  - See `docs/CORE/PLAN_SUBSCRIPTION_OVERHAUL.md` for full details
  - Total public schema tables: 21 -> 22
- **February 16, 2026**: Created `country_instances` table for travel feature:
  - Added `country_instances` table (id, user_id, country_name, label, created_at, updated_at)
  - Added indexes: `idx_country_instances_user`, `idx_country_instances_user_country_label` (unique)
  - Added `country_instance_id` column to `transactions` (FK to `country_instances.id`, ON DELETE SET NULL)
  - Added `idx_transactions_country_instance` partial index
  - Total public schema tables: 20 → 21
- **February 12, 2026**: Database documentation refresh:
  - Updated project metrics (active time, CPU usage, storage size)
  - Updated branch information (Prod branch metrics, added dev and preview/main branches)
  - Updated compute endpoint information (last active time, release version)
  - Updated table schemas with latest column information (added `simplified_description` to transactions, `broad_type` to categories)
  - Updated table sizes and index information
  - Updated triggers section (only `pockets` table has active trigger)
  - Total public schema tables: 19 → 20 (added country_instances)
- **February 12, 2026**: Pockets DB integration (vehicles, properties, other):
  - Added `pockets` table with JSONB metadata for unified vehicle/property/other storage
  - Added `pocket_transactions` junction table with tab discriminator for sub-categorization
  - Added 8 new API routes: `/api/pockets/items` (CRUD), `/api/pockets/item-links`, `/api/pockets/item-transactions`, `/api/pockets/item-unlinked`
  - Extended `/api/charts/pockets-bundle` to return vehicles, properties, otherPockets, and per-tab stats
  - Added 3 new default categories: Car Certificate, Car Loan, Deposit
  - Total public schema tables: 17 → 20
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
  - Added Pockets APIs: `/api/charts/pockets-bundle`, `/api/pockets/links`, `/api/pockets/transactions`, `/api/pockets/unlinked-transactions`
  - Added `pockets` cache prefix with 5-minute TTL
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

