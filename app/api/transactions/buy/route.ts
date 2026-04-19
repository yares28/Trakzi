// app/api/transactions/buy/route.ts
// Create a Stripe Checkout session for a one-time transaction pack purchase

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe, getAppUrl, STRIPE_PRICES, isTransactionPackPriceId } from '@/lib/stripe';
import { getUserSubscription } from '@/lib/subscriptions';
import { TRANSACTION_PACKS, getTransactionPackByPriceId } from '@/lib/plan-limits';
import { neonQuery } from '@/lib/neonClient';

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

        // Resolve a valid Stripe customer ID (cus_...).
        // Manual/lifetime entries in the DB won't be real Stripe customers, so
        // we create one on the fly and persist it for future purchases.
        const existingSubscription = await getUserSubscription(userId);
        let customerId = existingSubscription?.stripeCustomerId;

        const isValidStripeCustomer = customerId?.startsWith('cus_');

        if (!isValidStripeCustomer) {
            // Create a real Stripe customer tied to this user
            const customer = await stripe.customers.create({
                metadata: { userId },
            });
            customerId = customer.id;

            // Persist the new customer ID so we don't create duplicates next time
            await neonQuery(
                `UPDATE subscriptions SET stripe_customer_id = $1 WHERE user_id = $2`,
                [customerId, userId]
            );

            console.log(`[Buy Transactions] Created Stripe customer ${customerId} for user ${userId}`);
        }

        const resolvedCustomerId = customerId as string;

        // Create one-time payment checkout session (mode: 'payment', not 'subscription')
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            customer: resolvedCustomerId,
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
        const msg = error.message || '';
        const stripeCode = error.code || '';
        const stripeType = error.type || '';

        console.error('[Buy Transactions] Error creating checkout session:', {
            message: msg,
            code: stripeCode,
            type: stripeType,
            raw: error?.raw?.message,
        });

        if (msg.includes('Stripe is not initialized')) {
            return NextResponse.json(
                { error: 'Payment system is temporarily unavailable. Please try again later.' },
                { status: 503 }
            );
        }

        if (msg.includes('No such price') || (stripeCode === 'resource_missing' && msg.includes('price'))) {
            return NextResponse.json(
                { error: 'This pack is currently unavailable. Please try again or contact support.' },
                { status: 400 }
            );
        }

        if (msg.includes('recurring') || msg.includes('mode=payment') || msg.includes('mode: payment')) {
            return NextResponse.json(
                { error: 'Pack price configuration error: price must be one-time, not recurring. Contact support.' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: `Unable to start checkout: ${msg || 'unknown error'}` },
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

        // Map each pack id to its resolved Stripe price id from STRIPE_PRICES
        // (module-level static env access is more reliable than dynamic lookups).
        const priceIdByPackId: Record<string, string | undefined> = {
            pack_500: STRIPE_PRICES.TRANSACTION_PACK_500,
            pack_1500: STRIPE_PRICES.TRANSACTION_PACK_1500,
            pack_5000: STRIPE_PRICES.TRANSACTION_PACK_5000,
        };

        const packs = TRANSACTION_PACKS.map(pack => {
            const priceId = priceIdByPackId[pack.id] ?? null;
            if (!priceId) {
                console.warn(
                    `[Buy Transactions] Missing Stripe price id for ${pack.id} ` +
                    `(env var ${pack.stripePriceEnvKey} is not set). ` +
                    `The pack will be marked unavailable on the client.`
                );
            }
            return {
                id: pack.id,
                name: pack.name,
                transactions: pack.transactions,
                priceCents: pack.priceCents,
                currency: pack.currency,
                priceId,
            };
        });

        return NextResponse.json({ packs });
    } catch (error: any) {
        console.error('[Buy Transactions] Error fetching packs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transaction packs.' },
            { status: 500 }
        );
    }
}
