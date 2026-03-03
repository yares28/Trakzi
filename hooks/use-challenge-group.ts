import { useAuth } from "@clerk/nextjs"
import { useQuery } from "@tanstack/react-query"
import { demoFetch } from "@/lib/demo/demo-fetch"
import { useDemoMode } from "@/lib/demo/demo-context"
import type { ChallengeGroupWithMembers } from "@/lib/types/challenges"

async function fetchChallengeGroup(groupId: string): Promise<ChallengeGroupWithMembers> {
    const res = await demoFetch(`/api/challenge-groups/${groupId}`)
    if (!res.ok) throw new Error(`Failed to fetch challenge group: ${res.statusText}`)
    return res.json()
}

export function useChallengeGroup(groupId: string) {
    const { userId } = useAuth()
    const { isDemoMode } = useDemoMode()

    return useQuery({
        queryKey: ["challenge-group", groupId, isDemoMode ? "demo" : (userId ?? "")],
        queryFn: () => fetchChallengeGroup(groupId),
        enabled: (isDemoMode || !!userId) && !!groupId,
    })
}
