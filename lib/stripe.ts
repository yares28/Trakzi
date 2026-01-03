// lib/stripe.ts
// Stripe SDK initialization and helper functions

import Stripe from 'stripe';

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
    BASIC_MONTHLY: process.env.STRIPE_PRICE_ID_BASIC_MONTHLY,
    BASIC_ANNUAL: process.env.STRIPE_PRICE_ID_BASIC_ANNUAL,
    PRO_MONTHLY: process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
    PRO_ANNUAL: process.env.STRIPE_PRICE_ID_PRO_ANNUAL,
    MAX_MONTHLY: process.env.STRIPE_PRICE_ID_MAX_MONTHLY,
    MAX_ANNUAL: process.env.STRIPE_PRICE_ID_MAX_ANNUAL,
} as const;

// Map price IDs to plan names
export function getPlanFromPriceId(priceId: string): 'basic' | 'pro' | 'max' | 'free' {
    if (!priceId) {
        console.warn('[Stripe] Empty price ID provided to getPlanFromPriceId');
        return 'free';
    }

    if (priceId === STRIPE_PRICES.BASIC_MONTHLY || priceId === STRIPE_PRICES.BASIC_ANNUAL) {
        return 'basic';
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
            BASIC_MONTHLY: STRIPE_PRICES.BASIC_MONTHLY,
            BASIC_ANNUAL: STRIPE_PRICES.BASIC_ANNUAL,
            PRO_MONTHLY: STRIPE_PRICES.PRO_MONTHLY,
            PRO_ANNUAL: STRIPE_PRICES.PRO_ANNUAL,
            MAX_MONTHLY: STRIPE_PRICES.MAX_MONTHLY,
            MAX_ANNUAL: STRIPE_PRICES.MAX_ANNUAL,
        },
    });

    // Return 'free' as safe default, but log error for investigation
    // Callers should validate this doesn't happen
    return 'free';
}

// Get app URL for redirects
export { getAppUrl } from './env';
