import { useQuery } from '@tanstack/react-query'

export interface NetWorthData {
    netWorth: number
    totalAssets: number
    totalLiabilities: number
    breakdown: Array<{
        id: string
        name: string
        accountType: string
        currency: string
        balance: number
        isAsset: boolean
    }>
}

async function fetchNetWorth(): Promise<NetWorthData> {
    const res = await fetch('/api/accounts/net-worth')
    if (!res.ok) throw new Error('Failed to fetch net worth')
    const data = await res.json()
    return {
        netWorth: data.netWorth,
        totalAssets: data.totalAssets,
        totalLiabilities: data.totalLiabilities,
        breakdown: data.breakdown,
    }
}

export function useNetWorth() {
    return useQuery({
        queryKey: ['accounts', 'net-worth'],
        queryFn: fetchNetWorth,
    })
}
