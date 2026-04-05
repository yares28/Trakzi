import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AccountTransferWithDetails } from '@/lib/types/accounts'

async function fetchPendingTransfers(): Promise<AccountTransferWithDetails[]> {
    const res = await fetch('/api/transfers')
    if (!res.ok) throw new Error('Failed to fetch transfers')
    const data = await res.json()
    return data.transfers
}

export function usePendingTransfers() {
    return useQuery({
        queryKey: ['transfers', 'pending'],
        queryFn: fetchPendingTransfers,
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
            // Also invalidate analytics since tx_type changed
            qc.invalidateQueries({ queryKey: ['analytics'] })
            qc.invalidateQueries({ queryKey: ['home'] })
        },
    })
}
