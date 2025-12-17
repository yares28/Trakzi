// __tests__/integration/checkout.test.ts
// Integration tests for Stripe checkout flow

// Note: These tests mock the Stripe SDK to avoid making real API calls
// Run with: npm test -- __tests__/integration/checkout.test.ts

import { NextRequest } from 'next/server';

// Mock Stripe SDK
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        checkout: {
            sessions: {
                create: jest.fn().mockResolvedValue({
                    id: 'cs_test_123',
                    url: 'https://checkout.stripe.com/test_session',
                }),
            },
        },
    }));
});

// Mock Clerk auth
jest.mock('@clerk/nextjs/server', () => ({
    auth: jest.fn(),
}));

// Mock subscriptions lib
jest.mock('@/lib/subscriptions', () => ({
    getUserSubscription: jest.fn().mockResolvedValue(null),
}));

// Mock stripe lib
jest.mock('@/lib/stripe', () => ({
    getStripe: jest.fn().mockReturnValue({
        checkout: {
            sessions: {
                create: jest.fn().mockResolvedValue({
                    id: 'cs_test_123',
                    url: 'https://checkout.stripe.com/test_session',
                }),
            },
        },
    }),
    getAppUrl: jest.fn().mockReturnValue('http://localhost:3000'),
    STRIPE_PRICES: {
        PRO_MONTHLY: 'price_test_pro_monthly',
        PRO_ANNUAL: 'price_test_pro_annual',
        TEAM_MONTHLY: 'price_test_team_monthly',
        TEAM_ANNUAL: 'price_test_team_annual',
    },
}));

describe('Checkout API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/checkout', () => {
        it('should return 401 if user is not authenticated', async () => {
            const { auth } = require('@clerk/nextjs/server');
            auth.mockResolvedValue({ userId: null });

            // Import handler after mocks are set up
            const { POST } = await import('@/app/api/checkout/route');

            const request = new NextRequest('http://localhost:3000/api/checkout', {
                method: 'POST',
                body: JSON.stringify({ priceId: 'price_test_pro_monthly' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toContain('Unauthorized');
        });

        it('should return 400 if priceId is missing', async () => {
            const { auth } = require('@clerk/nextjs/server');
            auth.mockResolvedValue({ userId: 'user_123' });

            const { POST } = await import('@/app/api/checkout/route');

            const request = new NextRequest('http://localhost:3000/api/checkout', {
                method: 'POST',
                body: JSON.stringify({}),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('priceId');
        });

        it('should create checkout session for authenticated user', async () => {
            const { auth } = require('@clerk/nextjs/server');
            auth.mockResolvedValue({ userId: 'user_123' });

            const { POST } = await import('@/app/api/checkout/route');

            const request = new NextRequest('http://localhost:3000/api/checkout', {
                method: 'POST',
                body: JSON.stringify({ priceId: 'price_test_pro_monthly' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.url).toBe('https://checkout.stripe.com/test_session');
        });
    });

    describe('GET /api/checkout', () => {
        it('should return subscription status for authenticated user', async () => {
            const { auth } = require('@clerk/nextjs/server');
            auth.mockResolvedValue({ userId: 'user_123' });

            const { getUserSubscription } = require('@/lib/subscriptions');
            getUserSubscription.mockResolvedValue({
                plan: 'pro',
                status: 'active',
                currentPeriodEnd: new Date('2024-12-31'),
                cancelAtPeriodEnd: false,
            });

            const { GET } = await import('@/app/api/checkout/route');

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.subscription.plan).toBe('pro');
            expect(data.subscription.status).toBe('active');
        });
    });
});
