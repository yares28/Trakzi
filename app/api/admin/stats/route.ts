import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { isAdminUser } from '@/lib/admin'
import { neonQuery } from '@/lib/neonClient'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await getCurrentUserId()

    if (!isAdminUser(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [
      usersResult,
      subsResult,
      lifetimeResult,
      txResult,
      receiptsResult,
      statementsResult,
      statementHealthResult,
      aiChatResult,
      roomsResult,
      friendshipsResult,
      bankAccountsResult,
      savingsGoalsResult,
      debtAccountsResult,
      chatHistoriesResult,
      challengeUsersResult,
      storageResult,
      webhooksResult,
    ] = await Promise.all([
      // Users with today/7d/30d buckets
      neonQuery(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')  as new_7d,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_30d,
          COUNT(*) FILTER (WHERE created_at > CURRENT_DATE)               as new_today
        FROM users
      `),
      // Subscription plan × status matrix
      neonQuery(`
        SELECT plan, status, COUNT(*) as count
        FROM subscriptions
        GROUP BY plan, status
        ORDER BY
          CASE plan WHEN 'max' THEN 1 WHEN 'pro' THEN 2 WHEN 'free' THEN 3 ELSE 4 END,
          CASE status
            WHEN 'active'   THEN 1 WHEN 'past_due' THEN 2
            WHEN 'paused'   THEN 3 WHEN 'canceled' THEN 4
            WHEN 'disputed' THEN 5 ELSE 6
          END
      `),
      // Lifetime subscribers
      neonQuery(`SELECT COUNT(*) as total FROM subscriptions WHERE is_lifetime = true`),
      // Transactions
      neonQuery(`
        SELECT
          COUNT(*)                 as total,
          COUNT(DISTINCT user_id)  as distinct_users,
          COUNT(*) FILTER (WHERE tx_date > NOW() - INTERVAL '30 days') as last_30d
        FROM transactions
      `),
      // Receipts
      neonQuery('SELECT COUNT(*) as total FROM receipts'),
      // Statements total
      neonQuery('SELECT COUNT(*) as total FROM statements'),
      // Statement health: failed + stuck-processing
      neonQuery(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'failed')     as failed,
          COUNT(*) FILTER (WHERE status = 'processing') as processing
        FROM statements
      `),
      // AI chat usage
      neonQuery(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as last_30d
        FROM ai_chat_usage
      `),
      // Rooms
      neonQuery('SELECT COUNT(*) as total FROM rooms'),
      // Friendships
      neonQuery('SELECT COUNT(*) as total FROM friendships'),
      // Feature adoption: bank accounts
      neonQuery(`SELECT COUNT(DISTINCT user_id) as users FROM bank_accounts WHERE is_active = true`),
      // Feature adoption: active savings goals
      neonQuery(`SELECT COUNT(*) as total FROM savings_goals WHERE archived_at IS NULL`),
      // Feature adoption: debt accounts
      neonQuery(`SELECT COUNT(*) as total FROM debt_accounts`),
      // Feature adoption: saved chat histories
      neonQuery(`SELECT COUNT(*) as total FROM chat_histories`),
      // Feature adoption: challenge participants (unique users)
      neonQuery(`SELECT COUNT(DISTINCT user_id) as users FROM challenge_participants`),
      // File storage (count + bytes)
      neonQuery(`
        SELECT
          COUNT(*)                              as file_count,
          COALESCE(SUM(octet_length(data)), 0)  as total_bytes
        FROM user_files
      `),
      // Stripe webhook events (last 30)
      neonQuery(`
        SELECT event_id, event_type, status, created_at
        FROM webhook_events
        ORDER BY created_at DESC
        LIMIT 30
      `),
    ])

    return NextResponse.json({
      users: {
        total:   Number(usersResult[0]?.total     ?? 0),
        new7d:   Number(usersResult[0]?.new_7d    ?? 0),
        new30d:  Number(usersResult[0]?.new_30d   ?? 0),
        today:   Number(usersResult[0]?.new_today ?? 0),
      },
      subscriptions: subsResult.map(s => ({
        plan:   String(s.plan),
        status: String(s.status),
        count:  Number(s.count),
      })),
      lifetimeSubs: Number(lifetimeResult[0]?.total ?? 0),
      transactions: {
        total:         Number(txResult[0]?.total          ?? 0),
        distinctUsers: Number(txResult[0]?.distinct_users ?? 0),
        last30d:       Number(txResult[0]?.last_30d       ?? 0),
      },
      receipts:   { total: Number(receiptsResult[0]?.total  ?? 0) },
      statements: { total: Number(statementsResult[0]?.total ?? 0) },
      statementHealth: {
        failed:     Number(statementHealthResult[0]?.failed     ?? 0),
        processing: Number(statementHealthResult[0]?.processing ?? 0),
      },
      aiChat: {
        total:   Number(aiChatResult[0]?.total   ?? 0),
        last30d: Number(aiChatResult[0]?.last_30d ?? 0),
      },
      rooms:       { total: Number(roomsResult[0]?.total       ?? 0) },
      friendships: { total: Number(friendshipsResult[0]?.total ?? 0) },
      adoption: {
        bankAccountUsers:  Number(bankAccountsResult[0]?.users  ?? 0),
        savingsGoals:      Number(savingsGoalsResult[0]?.total  ?? 0),
        debtAccounts:      Number(debtAccountsResult[0]?.total  ?? 0),
        chatHistories:     Number(chatHistoriesResult[0]?.total ?? 0),
        challengeUsers:    Number(challengeUsersResult[0]?.users ?? 0),
      },
      storage: {
        fileCount:  Number(storageResult[0]?.file_count  ?? 0),
        totalBytes: Number(storageResult[0]?.total_bytes ?? 0),
      },
      webhookEvents: webhooksResult.map(e => ({
        eventId:   String(e.event_id),
        eventType: String(e.event_type),
        status:    String(e.status),
        createdAt: String(e.created_at),
      })),
      fetchedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    if (err.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[Admin] Stats error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
