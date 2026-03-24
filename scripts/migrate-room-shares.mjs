// Room shares migration — run once via: node scripts/migrate-room-shares.mjs
// Adds room_transaction_id, room_id, room_item_id columns to the personal transactions
// table so each user's share of a room expense can be stored as a personal transaction.
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf8')
const DATABASE_URL = envContent.match(/^DATABASE_URL="?([^"\n]+)"?/m)?.[1]

if (!DATABASE_URL) {
    console.error('DATABASE_URL not found in .env')
    process.exit(1)
}

const sql = neon(DATABASE_URL)

async function migrate() {
    console.log('Running room-shares migration...')

    await sql`
        ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS room_transaction_id TEXT
        REFERENCES shared_transactions(id) ON DELETE SET NULL
    `
    console.log('✓ room_transaction_id column added')

    await sql`
        ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS room_id TEXT
    `
    console.log('✓ room_id column added')

    await sql`
        ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS room_item_id TEXT
    `
    console.log('✓ room_item_id column added')

    // One personal tx per (shared_tx, user, item). COALESCE treats NULL item as ''
    // so transaction-level splits (no item) are also deduplicated per user.
    await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_room_user_item
        ON transactions(room_transaction_id, user_id, COALESCE(room_item_id, ''))
        WHERE room_transaction_id IS NOT NULL
    `
    console.log('✓ uq_transactions_room_user_item unique index created')

    await sql`
        CREATE INDEX IF NOT EXISTS idx_transactions_room_id
        ON transactions(room_id, user_id)
        WHERE room_id IS NOT NULL
    `
    console.log('✓ idx_transactions_room_id index created')

    console.log('\nRoom shares migration complete.')
}

migrate().catch(err => {
    console.error('Migration failed:', err.message)
    process.exit(1)
})
