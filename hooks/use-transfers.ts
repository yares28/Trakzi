import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AccountTransferWithDetails } from '@/lib/types/accounts'
import { demoFetch, isDemoActive } from '@/lib/demo/demo-fetch'

export type TransferStatusFilter = 'open' | 'pending' | 'suggested' | 'confirmed' | 'all'

async function fetchTransfers(filter: TransferStatusFilter): Promise<AccountTransferWithDetails[]> {
    const res = await demoFetch(`/api/transfers?status=${filter}`)
    if (!res.ok) throw new Error('Failed to fetch transfers')
    const data = await res.json()
    return data.transfers
}

/**
 * Default queue: 'open' = pending + suggested. The review-queue UI is built
 * around this combined list — pending render auto-quarantine state, suggested
 * render the "pick the right counterpart" affordance.
 */
export function useTransfers(filter: TransferStatusFilter = 'open') {
    const scope = isDemoActive() ? 'demo' : 'live'
    return useQuery({
        queryKey: ['transfers', scope, filter],
        queryFn: () => fetchTransfers(filter),
    })
}

// Back-compat shim — older callers use `usePendingTransfers`. Same data shape;
// now returns the open queue (pending + suggested) so badges/queues align.
export function usePendingTransfers() {
    return useTransfers('open')
}

export interface TransferCounts {
    openCount: number
    staleCount: number
    staleAgeDays: number
}

async function fetchTransferCounts(): Promise<TransferCounts> {
    const res = await demoFetch('/api/transfers/count')
    if (!res.ok) throw new Error('Failed to fetch transfer counts')
    const data = await res.json()
    return {
        openCount: data.openCount ?? 0,
        staleCount: data.staleCount ?? 0,
        staleAgeDays: data.staleAgeDays ?? 7,
    }
}

/**
 * Cheap polling hook for the sidebar badge + Analytics stale-banner.
 * Returns 0/0 by default while loading so render code can render unconditionally.
 */
export function useTransferCounts() {
    const scope = isDemoActive() ? 'demo' : 'live'
    return useQuery({
        queryKey: ['transfers', scope, 'count'],
        queryFn: fetchTransferCounts,
        staleTime: 30_000,
    })
}

export function useResolveTransfer() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, action }: { id: string; action: 'confirm' | 'reject' }) => {
            const res = await fetch(`/api/transfers/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Failed to update transfer')
            return json
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['transfers'] })
            // tx_type cascade affects every account-aware aggregation.
            qc.invalidateQueries({ queryKey: ['analytics'] })
            qc.invalidateQueries({ queryKey: ['home'] })
            qc.invalidateQueries({ queryKey: ['trends'] })
            qc.invalidateQueries({ queryKey: ['savings'] })
            qc.invalidateQueries({ queryKey: ['fridge'] })
            qc.invalidateQueries({ queryKey: ['pockets'] })
            qc.invalidateQueries({ queryKey: ['net-worth'] })
        },
    })
}
