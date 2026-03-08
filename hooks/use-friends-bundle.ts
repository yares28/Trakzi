import { useAuth } from "@clerk/nextjs"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { demoFetch } from "@/lib/demo/demo-fetch"
import { useDemoMode } from "@/lib/demo/demo-context"
import type { FriendsBundleSummary } from "@/lib/charts/friends-aggregations"

export type FriendsBundleData = FriendsBundleSummary

async function fetchFriendsBundle(fresh?: boolean): Promise<FriendsBundleData> {
    const url = fresh
        ? '/api/charts/friends-bundle?fresh=1'
        : '/api/charts/friends-bundle'
    const response = await demoFetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch friends bundle: ${response.statusText}`)
    }
    return response.json()
}

export function useFriendsBundleData() {
    const { userId } = useAuth()
    const { isDemoMode } = useDemoMode()

    return useQuery({
        queryKey: ["friends-bundle", isDemoMode ? "demo" : (userId ?? "")],
        queryFn: () => fetchFriendsBundle(),
        enabled: isDemoMode || !!userId,
    })
}

/**
 * Hook that returns a function to force-refresh the friends bundle,
 * bypassing both Redis and React Query caches.
 */
export function useRefreshFriendsBundle() {
    const queryClient = useQueryClient()

    return useCallback(async () => {
        try {
            // Fetch fresh data bypassing Redis cache
            const freshData = await fetchFriendsBundle(true)
            // Update all matching React Query entries
            queryClient.setQueriesData(
                { queryKey: ["friends-bundle"] },
                () => freshData,
            )
        } catch {
            // Fallback: just invalidate so React Query refetches normally
            queryClient.invalidateQueries({ queryKey: ["friends-bundle"] })
        }
    }, [queryClient])
}
