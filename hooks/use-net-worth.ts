import { useQuery } from '@tanstack/react-query'
import { useAccountFilter } from '@/components/account-filter-provider'
import { demoFetch, isDemoActive } from '@/lib/demo/demo-fetch'

export interface CurrencyTotals {
    assets: number
    liabilities: number
    netWorth: number
}

export interface NetWorthData {
    netWorth: number
    totalAssets: number
    totalLiabilities: number
    primaryCurrency: string
    byCurrency: Record<string, CurrencyTotals>
    breakdown: Array<{
        id: string
        name: string
        accountType: string
        currency: string
        balance: number
        isAsset: boolean
    }>
    /** U9: total active accounts, ignoring filter. */
    totalAccountCount: number
    /** U9: count returned in `breakdown` after filter applied. */
    filteredAccountCount: number
    /** U9: true when the request was scoped by an account filter. */
    filterActive: boolean
}

async function fetchNetWorth(accountIds: string[] = []): Promise<NetWorthData> {
    const url = accountIds.length > 0
        ? `/api/accounts/net-worth?accounts=${encodeURIComponent(accountIds.join(','))}`
        : '/api/accounts/net-worth'
    const res = await demoFetch(url)
    if (!res.ok) throw new Error('Failed to fetch net worth')
    const data = await res.json()
    return {
        netWorth: data.netWorth,
        totalAssets: data.totalAssets,
        totalLiabilities: data.totalLiabilities,
        primaryCurrency: data.primaryCurrency ?? 'EUR',
        byCurrency: data.byCurrency ?? {},
        breakdown: data.breakdown,
        totalAccountCount: data.totalAccountCount ?? 0,
        filteredAccountCount: data.filteredAccountCount ?? 0,
        filterActive: data.filterActive ?? false,
    }
}

export function useNetWorth() {
    const { selected: accountIds, isReady: accountsReady } = useAccountFilter()
    const accountKey = accountIds.length === 0 ? 'all' : accountIds.join(',')
    // SECURITY: namespace the cache by demo state. `enterDemo()` is a soft
    // navigation, so the React Query cache survives — without this scope a
    // real logged-in user's account breakdown would be served from cache
    // while the app is in demo mode. Mirrors the predicate `demoFetch` uses,
    // so the cache key always matches which endpoint is actually hit.
    const scope = isDemoActive() ? 'demo' : 'live'

    return useQuery({
        queryKey: ['accounts', 'net-worth', scope, accountKey],
        queryFn: () => fetchNetWorth(accountIds),
        enabled: accountsReady,
    })
}
