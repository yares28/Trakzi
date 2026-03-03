import { useAuth } from "@clerk/nextjs"
import { useQuery } from "@tanstack/react-query"
import { demoFetch } from "@/lib/demo/demo-fetch"
import { useDemoMode } from "@/lib/demo/demo-context"
import type { FriendsBundleSummary } from "@/lib/charts/friends-aggregations"

export type FriendsBundleData = FriendsBundleSummary

async function fetchFriendsBundle(): Promise<FriendsBundleData> {
    const response = await demoFetch('/api/charts/friends-bundle')
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
        queryFn: fetchFriendsBundle,
        enabled: isDemoMode || !!userId,
    })
}
