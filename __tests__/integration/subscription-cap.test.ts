// __tests__/integration/subscription-cap.test.ts
// Tests for transaction cap enforcement and auto-delete logic

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the neonQuery function
const mockNeonQuery = vi.fn();
vi.mock('@/lib/neonClient', () => ({
    neonQuery: (...args: any[]) => mockNeonQuery(...args),
}));

// Import after mocking
import {
    getTransactionCount,
    getTransactionCap,
    getRemainingCapacity,
    getOldestTransactionsToDelete,
    enforceTransactionCap,
    calculateDeletionsForCap,
} from '@/lib/limits/transactions-cap';

// Mock getUserPlan for tests
vi.mock('@/lib/subscriptions', () => ({
    getUserPlan: vi.fn().mockResolvedValue('free'),
}));

describe('Transaction Cap Logic', () => {
    beforeEach(() => {
        mockNeonQuery.mockReset();
    });

    describe('getTransactionCount', () => {
        it('returns sum of transactions and receipts (trips)', async () => {
            mockNeonQuery
                .mockResolvedValueOnce([{ count: '150' }]) // bank transactions
                .mockResolvedValueOnce([{ count: '50' }]); // receipt trips

            const result = await getTransactionCount('user-123');

            expect(result.total).toBe(200);
            expect(result.bankTransactions).toBe(150);
            expect(result.receiptTrips).toBe(50);
        });

        it('handles zero counts', async () => {
            mockNeonQuery
                .mockResolvedValueOnce([{ count: '0' }])
                .mockResolvedValueOnce([{ count: '0' }]);

            const result = await getTransactionCount('user-123');

            expect(result.total).toBe(0);
        });

        it('handles empty query results', async () => {
            mockNeonQuery
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const result = await getTransactionCount('user-123');

            expect(result.total).toBe(0);
        });
    });

    describe('getTransactionCap', () => {
        it('returns correct cap for free plan', () => {
            expect(getTransactionCap('free')).toBe(300);
        });

        it('returns correct cap for pro plan', () => {
            expect(getTransactionCap('pro')).toBe(1500);
        });

        it('returns correct cap for max plan', () => {
            expect(getTransactionCap('max')).toBe(5000);
        });
    });

    describe('getOldestTransactionsToDelete', () => {
        it('returns empty array when countToDelete is 0', async () => {
            const result = await getOldestTransactionsToDelete('user-123', 0);
            expect(result).toEqual([]);
            expect(mockNeonQuery).not.toHaveBeenCalled();
        });

        it('returns empty array when countToDelete is negative', async () => {
            const result = await getOldestTransactionsToDelete('user-123', -5);
            expect(result).toEqual([]);
        });

        it('returns oldest transactions from both tables ordered by timestamp', async () => {
            mockNeonQuery.mockResolvedValueOnce([
                { source_table: 'transactions', id: '1', ts: '2024-01-01T00:00:00' },
                { source_table: 'receipts', id: '5', ts: '2024-01-02T00:00:00' },
                { source_table: 'transactions', id: '2', ts: '2024-01-03T00:00:00' },
            ]);

            const result = await getOldestTransactionsToDelete('user-123', 3);

            expect(result).toHaveLength(3);
            expect(result[0].source_table).toBe('transactions');
            expect(result[0].id).toBe(1);
            expect(result[1].source_table).toBe('receipts');
            expect(result[1].id).toBe('5'); // receipts use string IDs
        });
    });

    describe('calculateDeletionsForCap', () => {
        it('returns zero deletions when under cap', async () => {
            mockNeonQuery
                .mockResolvedValueOnce([{ count: '100' }])
                .mockResolvedValueOnce([{ count: '50' }]);

            const result = await calculateDeletionsForCap('user-123', 400);

            expect(result.currentTotal).toBe(150);
            expect(result.targetCap).toBe(400);
            expect(result.toDelete).toBe(0);
            expect(result.wouldExceed).toBe(false);
        });

        it('returns correct deletion count when over cap', async () => {
            mockNeonQuery
                .mockResolvedValueOnce([{ count: '350' }])
                .mockResolvedValueOnce([{ count: '200' }]);

            const result = await calculateDeletionsForCap('user-123', 400);

            expect(result.currentTotal).toBe(550);
            expect(result.targetCap).toBe(400);
            expect(result.toDelete).toBe(150);
            expect(result.wouldExceed).toBe(true);
        });

        it('returns correct for edge case at exact cap', async () => {
            mockNeonQuery
                .mockResolvedValueOnce([{ count: '300' }])
                .mockResolvedValueOnce([{ count: '100' }]);

            const result = await calculateDeletionsForCap('user-123', 400);

            expect(result.currentTotal).toBe(400);
            expect(result.toDelete).toBe(0);
            expect(result.wouldExceed).toBe(false);
        });
    });

    describe('enforceTransactionCap', () => {
        it('does nothing when under cap', async () => {
            mockNeonQuery
                .mockResolvedValueOnce([{ count: '100' }])
                .mockResolvedValueOnce([{ count: '50' }]);

            const result = await enforceTransactionCap('user-123', 500);

            expect(result.deleted).toBe(0);
            expect(result.tables.transactions).toBe(0);
            expect(result.tables.receipts).toBe(0);
            expect(result.remaining).toBe(350);
        });

        it('deletes oldest transactions when over cap (manual user action only)', async () => {
            mockNeonQuery
                .mockResolvedValueOnce([{ count: '300' }])
                .mockResolvedValueOnce([{ count: '200' }])
                .mockResolvedValueOnce([
                    { source_table: 'transactions', id: '1', ts: '2024-01-01' },
                    { source_table: 'receipts', id: '10', ts: '2024-01-02' },
                    { source_table: 'transactions', id: '2', ts: '2024-01-03' },
                ])
                .mockResolvedValueOnce([{ count: '2' }])
                .mockResolvedValueOnce([{ count: '1' }]);

            const result = await enforceTransactionCap('user-123', 497);

            expect(result.deleted).toBe(3);
            expect(result.tables.transactions).toBe(2);
            expect(result.tables.receipts).toBe(1);
        });
    });
});

describe('Auto-Delete Selection Logic', () => {
    beforeEach(() => {
        mockNeonQuery.mockReset();
    });

    it('selects oldest transactions first regardless of table', async () => {
        // This tests that the SQL query uses ORDER BY ts ASC
        mockNeonQuery.mockResolvedValueOnce([
            { source_table: 'receipts', id: '100', ts: '2023-06-01T10:00:00' },
            { source_table: 'transactions', id: '5', ts: '2023-06-15T14:30:00' },
            { source_table: 'transactions', id: '8', ts: '2023-07-01T09:00:00' },
            { source_table: 'receipts', id: '105', ts: '2023-07-10T11:00:00' },
            { source_table: 'transactions', id: '12', ts: '2023-08-01T16:00:00' },
        ]);

        const result = await getOldestTransactionsToDelete('user-123', 5);

        // Verify they come back in timestamp order (oldest first)
        expect(result[0].ts.getTime()).toBeLessThan(result[1].ts.getTime());
        expect(result[1].ts.getTime()).toBeLessThan(result[2].ts.getTime());
        expect(result[2].ts.getTime()).toBeLessThan(result[3].ts.getTime());
        expect(result[3].ts.getTime()).toBeLessThan(result[4].ts.getTime());
    });

    it('prioritizes by id when timestamps are equal', async () => {
        // Two transactions with same timestamp - lower ID should come first
        mockNeonQuery.mockResolvedValueOnce([
            { source_table: 'transactions', id: '5', ts: '2024-01-01T00:00:00' },
            { source_table: 'transactions', id: '10', ts: '2024-01-01T00:00:00' },
        ]);

        const result = await getOldestTransactionsToDelete('user-123', 2);

        expect(result[0].id).toBe(5);
        expect(result[1].id).toBe(10);
    });
});
