import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { isAdminUser } from '@/lib/admin'
import { neonQuery } from '@/lib/neonClient'

/**
 * POST /api/migrations/multi-account-schema
 *
 * Idempotent migration that creates the multi-account model schema:
 *   - bank_accounts table
 *   - account_transfers table
 *   - transactions: account_id, external_tx_id, external_tx_provider, import_source columns
 *   - statements: account_id column
 *   - tx_type CHECK constraint expanded to include 'pending_transfer'
 *
 * Safe to run multiple times — each step checks before executing.
 * Restricted to admin users: this endpoint executes ALTER TABLE / CREATE TABLE
 * statements globally (not user-scoped), so allowing any authenticated user to
 * trigger it could cause launch-time lock contention or unintended schema
 * drift if the SQL is ever modified.
 */
export const POST = async () => {
    try {
        const userId = await getCurrentUserId()

        if (!isAdminUser(userId)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized - admin access required' },
                { status: 403 }
            )
        }

        const steps: { name: string; status: 'ok' | 'skipped' | 'error'; detail?: string }[] = []

        // ── Step 1: Expand tx_type CHECK constraint ──────────────────────────────
        try {
            // Check if pending_transfer is already in the constraint
            const checkRows = await neonQuery<{ consrc: string }>(
                `SELECT pg_get_constraintdef(c.oid) AS consrc
                 FROM pg_constraint c
                 JOIN pg_class t ON t.oid = c.conrelid
                 WHERE t.relname = 'transactions'
                   AND c.contype = 'c'
                   AND pg_get_constraintdef(c.oid) LIKE '%tx_type%'
                 LIMIT 1`
            )

            const alreadyHasPending = checkRows[0]?.consrc?.includes('pending_transfer')

            if (!alreadyHasPending) {
                await neonQuery(
                    `ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_tx_type_check`
                )
                await neonQuery(
                    `ALTER TABLE transactions ADD CONSTRAINT transactions_tx_type_check
                     CHECK (tx_type IN ('expense', 'income', 'settlement_sent', 'settlement_received', 'transfer', 'pending_transfer'))`
                )
                steps.push({ name: 'tx_type CHECK expanded', status: 'ok' })
            } else {
                steps.push({ name: 'tx_type CHECK expanded', status: 'skipped', detail: 'already includes pending_transfer' })
            }
        } catch (err: any) {
            steps.push({ name: 'tx_type CHECK expanded', status: 'error', detail: err.message })
        }

        // ── Step 2: Create bank_accounts table ───────────────────────────────────
        try {
            // Per OQ-2: balance is computed from transactions, never stored.
            await neonQuery(
                `CREATE TABLE IF NOT EXISTS bank_accounts (
                    id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
                    user_id         text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name            text NOT NULL,
                    account_type    text NOT NULL
                                    CHECK (account_type IN ('checking','savings','credit_card','cash','investment','loan')),
                    currency        text NOT NULL DEFAULT 'EUR',
                    institution     text,
                    color           text,
                    is_active       boolean NOT NULL DEFAULT true,
                    display_order   integer NOT NULL DEFAULT 0,
                    sync_provider         text,
                    sync_external_id      text,
                    sync_consent_expires  timestamptz,
                    sync_last_at          timestamptz,
                    sync_status           text DEFAULT 'manual'
                                          CHECK (sync_status IN ('manual','active','expired','error')),
                    created_at      timestamptz DEFAULT NOW(),
                    updated_at      timestamptz DEFAULT NOW()
                )`
            )
            // Idempotent removal for environments seeded with the original schema.
            await neonQuery(
                `ALTER TABLE bank_accounts DROP COLUMN IF EXISTS current_balance`
            )
            await neonQuery(
                `CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON bank_accounts(user_id)`
            )
            await neonQuery(
                `CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_active ON bank_accounts(user_id) WHERE is_active = true`
            )
            steps.push({ name: 'bank_accounts table', status: 'ok' })
        } catch (err: any) {
            steps.push({ name: 'bank_accounts table', status: 'error', detail: err.message })
        }

        // ── Step 3: updated_at trigger for bank_accounts ─────────────────────────
        try {
            const triggerExists = await neonQuery<{ count: string }>(
                `SELECT COUNT(*) AS count FROM pg_trigger
                 WHERE tgname = 'set_updated_at_bank_accounts'`
            )
            if (triggerExists[0]?.count === '0') {
                await neonQuery(
                    `CREATE TRIGGER set_updated_at_bank_accounts
                     BEFORE UPDATE ON bank_accounts
                     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
                )
                steps.push({ name: 'bank_accounts updated_at trigger', status: 'ok' })
            } else {
                steps.push({ name: 'bank_accounts updated_at trigger', status: 'skipped', detail: 'already exists' })
            }
        } catch (err: any) {
            steps.push({ name: 'bank_accounts updated_at trigger', status: 'error', detail: err.message })
        }

        // ── Step 4: Add columns to transactions ───────────────────────────────────
        const txColumns = [
            { col: 'account_id', ddl: `ALTER TABLE transactions ADD COLUMN account_id text REFERENCES bank_accounts(id) ON DELETE SET NULL` },
            { col: 'external_tx_id', ddl: `ALTER TABLE transactions ADD COLUMN external_tx_id text` },
            { col: 'external_tx_provider', ddl: `ALTER TABLE transactions ADD COLUMN external_tx_provider text` },
            { col: 'import_source', ddl: `ALTER TABLE transactions ADD COLUMN import_source text NOT NULL DEFAULT 'csv' CHECK (import_source IN ('csv','bank_sync','manual'))` },
        ]

        for (const { col, ddl } of txColumns) {
            try {
                const colExists = await neonQuery<{ count: string }>(
                    `SELECT COUNT(*) AS count FROM information_schema.columns
                     WHERE table_name = 'transactions' AND column_name = $1`,
                    [col]
                )
                if (colExists[0]?.count === '0') {
                    await neonQuery(ddl)
                    steps.push({ name: `transactions.${col}`, status: 'ok' })
                } else {
                    steps.push({ name: `transactions.${col}`, status: 'skipped', detail: 'column already exists' })
                }
            } catch (err: any) {
                steps.push({ name: `transactions.${col}`, status: 'error', detail: err.message })
            }
        }

        // ── Step 5: Indexes on transactions ──────────────────────────────────────
        // Dedup index includes user_id and requires account_id IS NOT NULL so that
        // ON DELETE SET NULL on bank_accounts can never produce colliding orphans.
        try {
            await neonQuery(
                `CREATE INDEX IF NOT EXISTS idx_transactions_account
                 ON transactions(account_id) WHERE account_id IS NOT NULL`
            )
            // Drop the old loose index if it exists (older deployments may have it).
            await neonQuery(`DROP INDEX IF EXISTS idx_transactions_dedup`)
            await neonQuery(
                `CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_dedup
                 ON transactions(user_id, account_id, external_tx_provider, external_tx_id)
                 WHERE external_tx_id IS NOT NULL AND account_id IS NOT NULL`
            )
            steps.push({ name: 'transactions indexes', status: 'ok' })
        } catch (err: any) {
            steps.push({ name: 'transactions indexes', status: 'error', detail: err.message })
        }

        // ── Step 6: Add account_id to statements ──────────────────────────────────
        try {
            const colExists = await neonQuery<{ count: string }>(
                `SELECT COUNT(*) AS count FROM information_schema.columns
                 WHERE table_name = 'statements' AND column_name = 'account_id'`
            )
            if (colExists[0]?.count === '0') {
                await neonQuery(
                    `ALTER TABLE statements ADD COLUMN account_id text REFERENCES bank_accounts(id) ON DELETE SET NULL`
                )
                await neonQuery(
                    `CREATE INDEX IF NOT EXISTS idx_statements_account
                     ON statements(account_id) WHERE account_id IS NOT NULL`
                )
                steps.push({ name: 'statements.account_id', status: 'ok' })
            } else {
                steps.push({ name: 'statements.account_id', status: 'skipped', detail: 'column already exists' })
            }
        } catch (err: any) {
            steps.push({ name: 'statements.account_id', status: 'error', detail: err.message })
        }

        // ── Step 7: Create account_transfers table ────────────────────────────────
        // NOTE: transactions.id is integer (serial), so FKs must be integer
        try {
            await neonQuery(
                `CREATE TABLE IF NOT EXISTS account_transfers (
                    id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
                    user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    from_tx_id  integer NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
                    to_tx_id    integer NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
                    amount      numeric(10,2) NOT NULL,
                    status      text NOT NULL DEFAULT 'confirmed'
                                CHECK (status IN ('pending','suggested','confirmed','rejected')),
                    created_at  timestamptz DEFAULT NOW(),
                    UNIQUE (from_tx_id),
                    UNIQUE (to_tx_id)
                )`
            )
            await neonQuery(
                `CREATE INDEX IF NOT EXISTS idx_account_transfers_user ON account_transfers(user_id)`
            )
            steps.push({ name: 'account_transfers table', status: 'ok' })
        } catch (err: any) {
            steps.push({ name: 'account_transfers table', status: 'error', detail: err.message })
        }

        // ── Step 8: Add FX columns to transactions ────────────────────────────────
        const fxColumns = [
            { col: 'original_amount', ddl: `ALTER TABLE transactions ADD COLUMN original_amount numeric` },
            { col: 'original_currency', ddl: `ALTER TABLE transactions ADD COLUMN original_currency char(3)` },
        ]
        for (const { col, ddl } of fxColumns) {
            try {
                const colExists = await neonQuery<{ count: string }>(
                    `SELECT COUNT(*) AS count FROM information_schema.columns
                     WHERE table_name = 'transactions' AND column_name = $1`,
                    [col]
                )
                if (colExists[0]?.count === '0') {
                    await neonQuery(ddl)
                    steps.push({ name: `transactions.${col}`, status: 'ok' })
                } else {
                    steps.push({ name: `transactions.${col}`, status: 'skipped', detail: 'column already exists' })
                }
            } catch (err: any) {
                steps.push({ name: `transactions.${col}`, status: 'error', detail: err.message })
            }
        }

        const errors = steps.filter(s => s.status === 'error')
        return NextResponse.json({
            success: errors.length === 0,
            steps,
            message: errors.length === 0
                ? 'Multi-account schema migration completed successfully'
                : `Migration completed with ${errors.length} error(s)`,
        })

    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Migration failed' },
            { status: 500 }
        )
    }
}
