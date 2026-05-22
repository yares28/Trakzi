// app/api/cron/cleanup-webhooks/route.ts
// Deletes old webhook_events rows (Stripe's max retry window is 3 days — keep 30).
// Trigger via Vercel Cron: 0 3 * * * (daily at 03:00 UTC).
// vercel.json → crons → path: /api/cron/cleanup-webhooks
//
// REQUIRED: Set CRON_SECRET in the deployment environment. Vercel Cron should send
// Authorization: Bearer <CRON_SECRET>. Without the secret, this route returns 401.

import { NextResponse } from 'next/server';
import { deleteOldWebhookEvents } from '@/lib/webhook-events';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
    // Fail closed: require CRON_SECRET and matching Bearer (misconfigured env must not leave an open delete endpoint)
    const authHeader = request.headers.get('authorization');
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const deleted = await deleteOldWebhookEvents(30);
        return NextResponse.json({ ok: true, deleted });
    } catch (err) {
        console.error('[Cron] cleanup-webhooks failed:', err);
        return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
    }
}
