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
            // Tell server to bust its Redis cache and re-warm it with fresh data
            // This must happen BEFORE invalidating React Query, so the next
            // refetch gets fresh data instead of the stale Redis entry
            await fetchFriendsBundle(true)
        } catch {
            // Non-fatal — fall through to invalidate
        }
        // Invalidate React Query — any mounted query will refetch immediately,
        // unmounted queries will refetch on next mount
        queryClient.invalidateQueries({ queryKey: ["friends-bundle"] })
    }, [queryClient])
}
