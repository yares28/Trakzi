/**
 * Migration script to transfer existing data from old UUID user_id to Clerk user_id
 * 
 * This script:
 * 1. Finds all data associated with the old UUID user_id (from DEMO_USER_ID)
 * 2. Updates it to use the new Clerk user_id
 * 
 * Usage:
 * 1. Set OLD_USER_ID in .env (the UUID that was used before)
 * 2. Set NEW_USER_ID in .env (your Clerk user ID, or it will use current Clerk user)
 * 3. Run: npx tsx scripts/migrate-data-to-clerk-user.ts
 */

// Load environment variables from .env file FIRST, before importing neonClient
import { config } from 'dotenv'
// Load .env file (dotenv will check .env.local automatically if .env doesn't exist)
const envResult = config()
if (envResult.error) {
    console.warn('Warning: Could not load .env file:', envResult.error.message)
} else {
    console.log(`✅ Loaded environment variables from ${envResult.parsed ? Object.keys(envResult.parsed).length : 0} variables`)
}

// Now import neonClient (it will use the loaded env vars)
import { neonQuery } from '../lib/neonClient'

async function migrateData() {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL && !process.env.NEON_CONNECTION_STRING) {
        console.error('❌ DATABASE_URL or NEON_CONNECTION_STRING not found in .env')
        console.log('Please add your Neon database connection string to .env:')
        console.log('DATABASE_URL="postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require"')
        process.exit(1)
    }

    const oldUserId = process.env.OLD_USER_ID || process.env.DEMO_USER_ID
    const newUserId = process.env.NEW_USER_ID

    if (!oldUserId) {
        console.error('❌ OLD_USER_ID or DEMO_USER_ID not set in .env')
        console.log('Please set OLD_USER_ID to the UUID that was used before Clerk integration')
        console.log('Example: OLD_USER_ID=7b17d144-e47f-4849-97ed-a4983fddae94')
        process.exit(1)
    }

    // Get Clerk user ID - must be provided since we can't access Clerk context in standalone script
    if (!newUserId) {
        console.error('❌ NEW_USER_ID not set in .env')
        console.log('Please set NEW_USER_ID to your Clerk user ID')
        console.log('You can find it by:')
        console.log('  1. Signing in to your app')
        console.log('  2. Checking the users table: SELECT id FROM users;')
        console.log('  3. Or check your Clerk dashboard')
        console.log('Example: NEW_USER_ID=user_36HyDILclr8hpbHOsiREUBrg4Rz')
        process.exit(1)
    }
    const clerkUserId = newUserId
    console.log(`✅ Using Clerk user ID: ${clerkUserId}`)

    console.log(`\n🔄 Migrating data from user_id: ${oldUserId}`)
    console.log(`   To user_id: ${clerkUserId}\n`)

    // Check if old user has data
    const transactionCount = await neonQuery<{ count: string }>(
        'SELECT COUNT(*) as count FROM transactions WHERE user_id = $1',
        [oldUserId]
    )
    const categoryCount = await neonQuery<{ count: string }>(
        'SELECT COUNT(*) as count FROM categories WHERE user_id = $1',
        [oldUserId]
    )
    const statementCount = await neonQuery<{ count: string }>(
        'SELECT COUNT(*) as count FROM statements WHERE user_id = $1',
        [oldUserId]
    )

    const txCount = parseInt(transactionCount[0]?.count || '0', 10)
    const catCount = parseInt(categoryCount[0]?.count || '0', 10)
    const stmtCount = parseInt(statementCount[0]?.count || '0', 10)

    console.log(`📊 Found:`)
    console.log(`   - ${txCount} transactions`)
    console.log(`   - ${catCount} categories`)
    console.log(`   - ${stmtCount} statements`)

    if (txCount === 0 && catCount === 0 && stmtCount === 0) {
        console.log('\n⚠️  No data found for the old user_id. Nothing to migrate.')
        return
    }

    // Ensure new user exists
    const userCheck = await neonQuery<{ id: string }>(
        'SELECT id FROM users WHERE id = $1',
        [clerkUserId]
    )

    if (userCheck.length === 0) {
        console.log(`\n⚠️  Clerk user ${clerkUserId} not found in database.`)
        console.log('   The user sync function should create it automatically.')
        console.log('   Please sign in once through Clerk, then run this script again.')
        return
    }

    // Migrate transactions
    if (txCount > 0) {
        console.log(`\n🔄 Migrating ${txCount} transactions...`)
        await neonQuery(
            'UPDATE transactions SET user_id = $1 WHERE user_id = $2',
            [clerkUserId, oldUserId]
        )
        console.log('   ✅ Transactions migrated')
    }

    // Migrate categories
    if (catCount > 0) {
        console.log(`🔄 Migrating ${catCount} categories...`)
        await neonQuery(
            'UPDATE categories SET user_id = $1 WHERE user_id = $2',
            [clerkUserId, oldUserId]
        )
        console.log('   ✅ Categories migrated')
    }

    // Migrate statements
    if (stmtCount > 0) {
        console.log(`🔄 Migrating ${stmtCount} statements...`)
        await neonQuery(
            'UPDATE statements SET user_id = $1 WHERE user_id = $2',
            [clerkUserId, oldUserId]
        )
        console.log('   ✅ Statements migrated')
    }

    // Migrate user_files
    const fileCount = await neonQuery<{ count: string }>(
        'SELECT COUNT(*) as count FROM user_files WHERE user_id = $1',
        [oldUserId]
    )
    const fileCnt = parseInt(fileCount[0]?.count || '0', 10)
    if (fileCnt > 0) {
        console.log(`🔄 Migrating ${fileCnt} user files...`)
        await neonQuery(
            'UPDATE user_files SET user_id = $1 WHERE user_id = $2',
            [clerkUserId, oldUserId]
        )
        console.log('   ✅ User files migrated')
    }

    // Migrate category_budgets
    const budgetCount = await neonQuery<{ count: string }>(
        'SELECT COUNT(*) as count FROM category_budgets WHERE user_id = $1',
        [oldUserId]
    )
    const budgetCnt = parseInt(budgetCount[0]?.count || '0', 10)
    if (budgetCnt > 0) {
        console.log(`🔄 Migrating ${budgetCnt} category budgets...`)
        await neonQuery(
            'UPDATE category_budgets SET user_id = $1 WHERE user_id = $2',
            [clerkUserId, oldUserId]
        )
        console.log('   ✅ Category budgets migrated')
    }

    console.log('\n✅ Migration complete!')
    console.log(`\n📊 Verifying migration...`)

    // Verify
    const newTxCount = await neonQuery<{ count: string }>(
        'SELECT COUNT(*) as count FROM transactions WHERE user_id = $1',
        [clerkUserId]
    )
    const newCatCount = await neonQuery<{ count: string }>(
        'SELECT COUNT(*) as count FROM categories WHERE user_id = $1',
        [clerkUserId]
    )

    console.log(`   - Transactions for new user: ${newTxCount[0]?.count || '0'}`)
    console.log(`   - Categories for new user: ${newCatCount[0]?.count || '0'}`)
    console.log('\n✅ All done! Your data should now be visible in the app.')
}

migrateData().catch(console.error)

