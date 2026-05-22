// app/api/transactions/buy/route.ts
// Create a Stripe Checkout session for a one-time transaction pack purchase

import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getStripe, getAppUrl, STRIPE_PRICES, isTransactionPackPriceId } from '@/lib/stripe';
import { getUserSubscription, upsertSubscription } from '@/lib/subscriptions';
import { TRANSACTION_PACKS, getTransactionPackByPriceId } from '@/lib/plan-limits';
import { ensureUserExists } from '@/lib/user-sync';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limiter';
import { getSubscriptionBlockReason } from '@/lib/billing-utils';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in to continue' },
                { status: 401 }
            );
        }

        const rateLimitResult = await checkRateLimit(userId, 'mutation');
        if (rateLimitResult.limited) {
            return createRateLimitResponse(rateLimitResult.resetIn);
        }

        await ensureUserExists();

        const body = await request.json();
        const { priceId } = body;

        if (!priceId) {
            return NextResponse.json(
                { error: 'Missing required field: priceId' },
                { status: 400 }
            );
        }

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

        const existingSubscription = await getUserSubscription(userId);
        const blockReason = getSubscriptionBlockReason(existingSubscription?.status);
        if (blockReason) {
            return NextResponse.json({ error: blockReason }, { status: 403 });
        }

        const stripe = getStripe();
        const appUrl = getAppUrl();

        let customerId = existingSubscription?.stripeCustomerId;
        const isValidStripeCustomer = customerId?.startsWith('cus_');

        if (!isValidStripeCustomer) {
            const client = await clerkClient();
            const clerkUser = await client.users.getUser(userId);
            const email = clerkUser.emailAddresses[0]?.emailAddress;

            const customer = await stripe.customers.create({
                email: email || undefined,
                metadata: { userId },
            });
            customerId = customer.id;

            await upsertSubscription({
                userId,
                stripeCustomerId: customerId,
                plan: existingSubscription?.plan ?? 'free',
                status: existingSubscription?.status ?? 'active',
            });

            console.log(`[Buy Transactions] Created Stripe customer ${customerId} for user ${userId}`);
        }

        const resolvedCustomerId = customerId as string;

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            payment_method_options: {
                card: {
                    request_three_d_secure: 'automatic',
                },
            },
            customer: resolvedCustomerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${appUrl}/home?pack_purchased=success&pack=${pack.id}`,
            cancel_url: `${appUrl}/home?pack_purchased=canceled`,
            metadata: {
                userId,
                pack_id: pack.id,
                pack_transactions: String(pack.transactions),
                purchase_type: 'transaction_pack',
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error: unknown) {
        const err = error as { message?: string; code?: string; type?: string; raw?: { message?: string } };
        const msg = err.message || '';
        const stripeCode = err.code || '';
        const stripeType = err.type || '';

        console.error('[Buy Transactions] Error creating checkout session:', {
            message: msg,
            code: stripeCode,
            type: stripeType,
            raw: err?.raw?.message,
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
            { error: 'Unable to start checkout. Please try again or contact support.' },
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
    } catch (error: unknown) {
        console.error('[Buy Transactions] Error fetching packs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transaction packs.' },
            { status: 500 }
        );
    }
}
