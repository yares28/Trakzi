// app/api/transactions/buy/route.ts
// Create a Stripe Checkout session for a one-time transaction pack purchase

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe, getAppUrl, STRIPE_PRICES, isTransactionPackPriceId } from '@/lib/stripe';
import { getUserSubscription } from '@/lib/subscriptions';
import { TRANSACTION_PACKS, getTransactionPackByPriceId } from '@/lib/plan-limits';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in to continue' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { priceId } = body;

        if (!priceId) {
            return NextResponse.json(
                { error: 'Missing required field: priceId' },
                { status: 400 }
            );
        }

        // Validate this is a transaction pack price ID
        const allowedPackPriceIds = [
            STRIPE_PRICES.TRANSACTION_PACK_500,
            STRIPE_PRICES.TRANSACTION_PACK_1500,
            STRIPE_PRICES.TRANSACTION_PACK_5000,
        ].filter(Boolean) as string[];

        if (!allowedPackPriceIds.includes(priceId) || !isTransactionPackPriceId(priceId)) {
            return NextResponse.json(
                { error: 'Invalid transaction pack. Please select a valid pack.' },
                { status: 400 }
            );
        }

        const pack = getTransactionPackByPriceId(priceId);
        if (!pack) {
            return NextResponse.json(
                { error: 'Transaction pack not found.' },
                { status: 400 }
            );
        }

        const stripe = getStripe();
        const appUrl = getAppUrl();

        // Get or ensure Stripe customer exists
        const existingSubscription = await getUserSubscription(userId);
        const customerId = existingSubscription?.stripeCustomerId;

        if (!customerId) {
            return NextResponse.json(
                { error: 'Please set up a subscription first before purchasing transaction packs.' },
                { status: 400 }
            );
        }

        // Create one-time payment checkout session (mode: 'payment', not 'subscription')
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            customer: customerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${appUrl}/dashboard?pack_purchased=success&pack=${pack.id}`,
            cancel_url: `${appUrl}/dashboard?pack_purchased=canceled`,
            metadata: {
                userId,
                pack_id: pack.id,
                pack_transactions: String(pack.transactions),
                purchase_type: 'transaction_pack',
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('[Buy Transactions] Error creating checkout session:', error);

        const msg = error.message || '';

        if (msg.includes('Stripe is not initialized')) {
            return NextResponse.json(
                { error: 'Payment system is temporarily unavailable. Please try again later.' },
                { status: 503 }
            );
        }

        if (msg.includes('No such price')) {
            return NextResponse.json(
                { error: 'This pack is currently unavailable. Please try again or contact support.' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Unable to start checkout. Please try again.' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/transactions/buy
 * Returns available transaction pack options with pricing info.
 */
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Return available packs with their env-configured price IDs
        const packs = TRANSACTION_PACKS.map(pack => ({
            id: pack.id,
            name: pack.name,
            transactions: pack.transactions,
            priceCents: pack.priceCents,
            currency: pack.currency,
            priceId: process.env[pack.stripePriceEnvKey] ?? null,
        }));

        return NextResponse.json({ packs });
    } catch (error: any) {
        console.error('[Buy Transactions] Error fetching packs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transaction packs.' },
            { status: 500 }
        );
    }
}
