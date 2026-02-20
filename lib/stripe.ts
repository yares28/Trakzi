// lib/stripe.ts
// Stripe SDK initialization and helper functions

import Stripe from 'stripe';
import { PlanType } from './subscriptions';

// Create Stripe instance lazily to avoid build-time errors
// This ensures the build succeeds even without STRIPE_SECRET_KEY
let stripeInstance: Stripe | null = null;

/**
 * Get or create Stripe instance
 * Throws at runtime if STRIPE_SECRET_KEY is not set
 */
export function getStripe(): Stripe {
    if (stripeInstance) {
        return stripeInstance;
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
        throw new Error(
            'Stripe is not initialized. Set STRIPE_SECRET_KEY in your environment variables.'
        );
    }

    stripeInstance = new Stripe(stripeSecretKey);
    return stripeInstance;
}

// Price IDs from environment
export const STRIPE_PRICES = {
    PRO_MONTHLY: process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
    PRO_ANNUAL: process.env.STRIPE_PRICE_ID_PRO_ANNUAL,
    MAX_MONTHLY: process.env.STRIPE_PRICE_ID_MAX_MONTHLY,
    MAX_ANNUAL: process.env.STRIPE_PRICE_ID_MAX_ANNUAL,
    // Transaction packs (one-time purchases)
    TRANSACTION_PACK_500: process.env.STRIPE_PRICE_ID_TRANSACTION_PACK_500,
    TRANSACTION_PACK_1500: process.env.STRIPE_PRICE_ID_TRANSACTION_PACK_1500,
    TRANSACTION_PACK_5000: process.env.STRIPE_PRICE_ID_TRANSACTION_PACK_5000,
} as const;

// Map price IDs to plan names
export function getPlanFromPriceId(priceId: string): PlanType {
    if (!priceId) {
        console.warn('[Stripe] Empty price ID provided to getPlanFromPriceId');
        return 'free';
    }

    if (priceId === STRIPE_PRICES.PRO_MONTHLY || priceId === STRIPE_PRICES.PRO_ANNUAL) {
        return 'pro';
    }
    if (priceId === STRIPE_PRICES.MAX_MONTHLY || priceId === STRIPE_PRICES.MAX_ANNUAL) {
        return 'max';
    }

    // Log unknown price ID for investigation (should not happen in production)
    console.error('[Stripe] Unknown price ID:', priceId, {
        knownPrices: {
            PRO_MONTHLY: STRIPE_PRICES.PRO_MONTHLY,
            PRO_ANNUAL: STRIPE_PRICES.PRO_ANNUAL,
            MAX_MONTHLY: STRIPE_PRICES.MAX_MONTHLY,
            MAX_ANNUAL: STRIPE_PRICES.MAX_ANNUAL,
        },
    });

    // Return 'free' as safe default, but log error for investigation
    return 'free';
}

/**
 * Detect billing interval from Stripe price ID
 */
export function getBillingIntervalFromPriceId(priceId: string): 'monthly' | 'annual' {
    if (priceId === STRIPE_PRICES.PRO_ANNUAL || priceId === STRIPE_PRICES.MAX_ANNUAL) {
        return 'annual';
    }
    return 'monthly';
}

/**
 * Check if a price ID corresponds to a transaction pack (one-time purchase)
 */
export function isTransactionPackPriceId(priceId: string): boolean {
    return (
        priceId === STRIPE_PRICES.TRANSACTION_PACK_500 ||
        priceId === STRIPE_PRICES.TRANSACTION_PACK_1500 ||
        priceId === STRIPE_PRICES.TRANSACTION_PACK_5000
    );
}

// Get app URL for redirects
export { getAppUrl } from './env';
