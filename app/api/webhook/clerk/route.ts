// app/api/webhook/clerk/route.ts
// Clerk webhook handler for user lifecycle events

import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { neonQuery } from '@/lib/neonClient';

// Clerk sends webhooks signed with this secret
const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

interface ClerkUserEvent {
    data: {
        id: string;
        email_addresses?: Array<{ email_address: string }>;
    };
    type: string;
}

/**
 * Delete all user data from the database
 */
async function deleteUserData(userId: string): Promise<void> {
    console.log(`[Clerk Webhook] Deleting all data for user ${userId}`);

    // Delete in order to respect foreign key constraints
    await neonQuery(`DELETE FROM subscriptions WHERE user_id = $1::text`, [userId]);
    await neonQuery(`DELETE FROM categories WHERE user_id = $1::text`, [userId]);
    await neonQuery(`DELETE FROM receipt_categories WHERE user_id = $1::text`, [userId]);
    await neonQuery(`DELETE FROM transactions WHERE user_id = $1::text`, [userId]);
    await neonQuery(`DELETE FROM statements WHERE user_id = $1::text`, [userId]);
    await neonQuery(`DELETE FROM receipts WHERE user_id = $1::text`, [userId]);
    await neonQuery(`DELETE FROM budgets WHERE user_id = $1::text`, [userId]);
    await neonQuery(`DELETE FROM users WHERE id = $1::text`, [userId]);

    console.log(`[Clerk Webhook] Successfully deleted all data for user ${userId}`);
}

export async function POST(request: NextRequest) {
    // Verify webhook signature
    if (!CLERK_WEBHOOK_SECRET) {
        console.error('[Clerk Webhook] CLERK_WEBHOOK_SECRET not configured');
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const payload = await request.text();
    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixSignature = request.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
        return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
    }

    let event: ClerkUserEvent;

    try {
        const wh = new Webhook(CLERK_WEBHOOK_SECRET);
        event = wh.verify(payload, {
            'svix-id': svixId,
            'svix-timestamp': svixTimestamp,
            'svix-signature': svixSignature,
        }) as ClerkUserEvent;
    } catch (err) {
        console.error('[Clerk Webhook] Signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle different event types
    try {
        switch (event.type) {
            case 'user.deleted':
                const userId = event.data.id;
                await deleteUserData(userId);
                break;

            // You can add more event handlers here:
            // case 'user.created':
            // case 'user.updated':

            default:
                console.log(`[Clerk Webhook] Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Clerk Webhook] Error processing event:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
