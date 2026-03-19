// Phase 5 schema migration — run once via: node scripts/migrate-phase5.mjs
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

// Load .env manually since we're outside Next.js
const envContent = readFileSync('.env', 'utf8')
const DATABASE_URL = envContent.match(/^DATABASE_URL="?([^"\n]+)"?/m)?.[1]

if (!DATABASE_URL) {
    console.error('DATABASE_URL not found in .env')
    process.exit(1)
}

const sql = neon(DATABASE_URL)

async function migrate() {
    console.log('Running Phase 5 migration...')

    // Add tx_type column
    await sql`
        ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS tx_type text NOT NULL DEFAULT 'expense'
        CHECK (tx_type IN ('expense', 'income', 'settlement_sent', 'settlement_received', 'transfer'))
    `
    console.log('✓ tx_type column added')

    // Add pending_import_match column
    await sql`
        ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS pending_import_match boolean NOT NULL DEFAULT false
    `
    console.log('✓ pending_import_match column added')

    // Add settlement_for_split_id column (FK to transaction_splits.id)
    await sql`
        ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS settlement_for_split_id text
        REFERENCES transaction_splits(id) ON DELETE SET NULL
    `
    console.log('✓ settlement_for_split_id column added')

    // Index for looking up pending settlements by user + type
    await sql`
        CREATE INDEX IF NOT EXISTS idx_tx_pending_settle
        ON transactions(user_id, tx_type, pending_import_match)
        WHERE tx_type IN ('settlement_sent', 'settlement_received') AND pending_import_match = true
    `
    console.log('✓ idx_tx_pending_settle index created')

    console.log('\nPhase 5 migration complete.')
}

migrate().catch(err => {
    console.error('Migration failed:', err.message)
    process.exit(1)
})
