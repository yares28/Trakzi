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
 * Each deletion is wrapped in try-catch to handle missing tables gracefully
 */
async function deleteUserData(userId: string): Promise<void> {
    console.log(`[Clerk Webhook] Deleting all data for user ${userId}`);

    // Tables to clean up - order matters for foreign key constraints
    const tablesToClean = [
        'subscriptions',
        'categories',
        'receipt_categories',
        'transactions',
        'statements',
        'receipts',
        'budgets',
    ];

    for (const table of tablesToClean) {
        try {
            await neonQuery(`DELETE FROM ${table} WHERE user_id = $1::text`, [userId]);
            console.log(`[Clerk Webhook] Cleaned ${table} for user ${userId}`);
        } catch (e: any) {
            // Table may not exist or have different schema - continue cleanup
            console.log(`[Clerk Webhook] Skipping ${table}: ${e.message?.slice(0, 50) || 'unknown error'}`);
        }
    }

    // Finally delete the user record
    try {
        await neonQuery(`DELETE FROM users WHERE id = $1::text`, [userId]);
        console.log(`[Clerk Webhook] Deleted user record ${userId}`);
    } catch (e: any) {
        console.error(`[Clerk Webhook] Failed to delete user ${userId}: ${e.message}`);
    }

    console.log(`[Clerk Webhook] Cleanup completed for user ${userId}`);
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
