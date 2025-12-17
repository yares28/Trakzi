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
    PRO_MONTHLY: process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
    PRO_ANNUAL: process.env.STRIPE_PRICE_ID_PRO_ANNUAL,
    MAX_MONTHLY: process.env.STRIPE_PRICE_ID_MAX_MONTHLY,
    MAX_ANNUAL: process.env.STRIPE_PRICE_ID_MAX_ANNUAL,
} as const;

// Map price IDs to plan names
export function getPlanFromPriceId(priceId: string): 'pro' | 'max' | 'free' {
    if (priceId === STRIPE_PRICES.PRO_MONTHLY || priceId === STRIPE_PRICES.PRO_ANNUAL) {
        return 'pro';
    }
    if (priceId === STRIPE_PRICES.MAX_MONTHLY || priceId === STRIPE_PRICES.MAX_ANNUAL) {
        return 'max';
    }
    return 'free';
}

// Get app URL for redirects
export function getAppUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
