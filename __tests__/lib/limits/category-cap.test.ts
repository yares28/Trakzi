// __tests__/lib/limits/category-cap.test.ts
// Tests that category counts exclude default names (only user-created categories count toward limits)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_CATEGORIES } from '../../../lib/categories';
import { DEFAULT_RECEIPT_CATEGORIES } from '../../../lib/receipt-categories';

const mockNeonQuery = vi.fn();
vi.mock('../../../lib/neonClient', () => ({
    neonQuery: (...args: unknown[]) => mockNeonQuery(...args),
}));

vi.mock('../../../lib/subscriptions', () => ({
    getUserPlan: vi.fn().mockResolvedValue('pro'),
}));

import {
    getCategoryCounts,
    getRemainingCategoryCapacity,
    getCategoryCap,
} from '../../../lib/limits/category-cap';

describe('category-cap', () => {
    beforeEach(() => {
        mockNeonQuery.mockReset();
    });

    describe('getCategoryCounts', () => {
        it('excludes default names: only counts user-created categories', async () => {
            mockNeonQuery
                .mockResolvedValueOnce([{ count: '2' }])
                .mockResolvedValueOnce([{ count: '3' }]);

            const result = await getCategoryCounts('user-123');

            expect(result.transactionCategories).toBe(2);
            expect(result.receiptCategories).toBe(3);
            expect(result.total).toBe(5);

            expect(mockNeonQuery).toHaveBeenCalledTimes(2);

            const [txQuery, txParams] = mockNeonQuery.mock.calls[0];
            expect(txQuery).toContain('NOT (name = ANY($2::text[]))');
            expect(txQuery).toContain('is_default IS NULL OR is_default = false');
            expect(txParams[0]).toBe('user-123');
            expect(txParams[1]).toEqual(DEFAULT_CATEGORIES);

            const [receiptQuery, receiptParams] = mockNeonQuery.mock.calls[1];
            expect(receiptQuery).toContain('NOT (name = ANY($2::text[]))');
            expect(receiptQuery).toContain('is_default IS NULL OR is_default = false');
            expect(receiptParams[0]).toBe('user-123');
            expect(receiptParams[1]).toEqual(DEFAULT_RECEIPT_CATEGORIES.map((c) => c.name));
        });

        it('returns zero when no user-created categories (defaults excluded)', async () => {
            mockNeonQuery
                .mockResolvedValueOnce([{ count: '0' }])
                .mockResolvedValueOnce([{ count: '0' }]);

            const result = await getCategoryCounts('user-456');

            expect(result.transactionCategories).toBe(0);
            expect(result.receiptCategories).toBe(0);
            expect(result.total).toBe(0);
        });

        it('handles empty query results', async () => {
            mockNeonQuery
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const result = await getCategoryCounts('user-789');

            expect(result.transactionCategories).toBe(0);
            expect(result.receiptCategories).toBe(0);
            expect(result.total).toBe(0);
        });
    });

    describe('getRemainingCategoryCapacity', () => {
        it('uses getCategoryCounts so default-named categories do not count toward used', async () => {
            mockNeonQuery
                .mockResolvedValueOnce([{ count: '1' }])
                .mockResolvedValueOnce([{ count: '2' }]);

            const capacity = await getRemainingCategoryCapacity('user-123');

            expect(capacity.plan).toBe('pro');
            expect(capacity.transactionCap).toBe(20);
            expect(capacity.receiptCap).toBe(20);
            expect(capacity.transactionUsed).toBe(1);
            expect(capacity.receiptUsed).toBe(2);
            expect(capacity.transactionRemaining).toBe(19);
            expect(capacity.receiptRemaining).toBe(18);
        });
    });

    describe('getCategoryCap', () => {
        it('returns correct caps per plan', () => {
            expect(getCategoryCap('free')).toEqual({ transactions: 5, receipts: 5 });
            expect(getCategoryCap('pro')).toEqual({ transactions: 20, receipts: 20 });
            expect(getCategoryCap('max')).toEqual({ transactions: 100, receipts: 100 });
        });
    });
});
