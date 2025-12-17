// __tests__/integration/webhook.test.ts
// Integration tests for Stripe webhook handler

// Note: These tests verify webhook signature verification and event parsing
// Run with: npm test -- __tests__/integration/webhook.test.ts

import { NextRequest } from 'next/server';
import Stripe from 'stripe';

// Create a mock Stripe instance
const mockStripe = {
    webhooks: {
        constructEvent: jest.fn(),
    },
    subscriptions: {
        retrieve: jest.fn(),
    },
};

// Mock Stripe lib
jest.mock('@/lib/stripe', () => ({
    getStripe: jest.fn().mockReturnValue(mockStripe),
    getPlanFromPriceId: jest.fn().mockImplementation((priceId: string) => {
        if (priceId.includes('pro')) return 'pro';
        if (priceId.includes('team')) return 'team';
        return 'free';
    }),
}));

// Mock subscriptions lib
jest.mock('@/lib/subscriptions', () => ({
    upsertSubscription: jest.fn().mockResolvedValue({}),
    getSubscriptionByStripeCustomerId: jest.fn().mockResolvedValue(null),
}));

// Mock headers
jest.mock('next/headers', () => ({
    headers: jest.fn().mockResolvedValue({
        get: jest.fn().mockReturnValue('valid_signature'),
    }),
}));

describe('Stripe Webhook Handler', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, STRIPE_WEBHOOK_SECRET: 'whsec_test_secret' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('Signature Verification', () => {
        it('should return 400 if signature verification fails', async () => {
            mockStripe.webhooks.constructEvent.mockImplementation(() => {
                throw new Error('Invalid signature');
            });

            const { POST } = await import('@/app/api/webhook/stripe/route');

            const request = new NextRequest('http://localhost:3000/api/webhook/stripe', {
                method: 'POST',
                body: JSON.stringify({ type: 'test.event' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('signature verification failed');
        });

        it('should accept valid webhook signatures', async () => {
            const mockEvent: Partial<Stripe.Event> = {
                type: 'checkout.session.completed',
                data: {
                    object: {
                        id: 'cs_test_123',
                        customer: 'cus_test_123',
                        subscription: 'sub_test_123',
                        metadata: { userId: 'user_123' },
                    },
                },
            };

            mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
            mockStripe.subscriptions.retrieve.mockResolvedValue({
                id: 'sub_test_123',
                status: 'active',
                items: { data: [{ price: { id: 'price_pro_monthly' } }] },
                current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
                cancel_at_period_end: false,
            });

            const { POST } = await import('@/app/api/webhook/stripe/route');

            const request = new NextRequest('http://localhost:3000/api/webhook/stripe', {
                method: 'POST',
                body: JSON.stringify(mockEvent),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.received).toBe(true);
        });
    });

    describe('Event Handling', () => {
        it('should ignore irrelevant events', async () => {
            const mockEvent: Partial<Stripe.Event> = {
                type: 'customer.created',
                data: { object: {} },
            };

            mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

            const { POST } = await import('@/app/api/webhook/stripe/route');

            const request = new NextRequest('http://localhost:3000/api/webhook/stripe', {
                method: 'POST',
                body: JSON.stringify(mockEvent),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.received).toBe(true);
        });

        it('should update subscription on customer.subscription.updated', async () => {
            const { upsertSubscription, getSubscriptionByStripeCustomerId } = require('@/lib/subscriptions');

            getSubscriptionByStripeCustomerId.mockResolvedValue({
                userId: 'user_123',
                plan: 'pro',
            });

            const mockEvent: Partial<Stripe.Event> = {
                type: 'customer.subscription.updated',
                data: {
                    object: {
                        id: 'sub_test_123',
                        customer: 'cus_test_123',
                        status: 'active',
                        items: { data: [{ price: { id: 'price_pro_monthly' } }] },
                        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
                        cancel_at_period_end: false,
                        metadata: {},
                    },
                },
            };

            mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

            const { POST } = await import('@/app/api/webhook/stripe/route');

            const request = new NextRequest('http://localhost:3000/api/webhook/stripe', {
                method: 'POST',
                body: JSON.stringify(mockEvent),
            });

            const response = await POST(request);

            expect(response.status).toBe(200);
            expect(upsertSubscription).toHaveBeenCalled();
        });
    });
});
