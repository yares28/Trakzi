"use client"

import { use } from "react"
import { ArrowLeft, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { FriendsLayout } from "@/app/friends/components/FriendsLayout"
import { useChallengeGroup } from "@/hooks/use-challenge-group"
import { useUser } from "@clerk/nextjs"
import { demoFetch } from "@/lib/demo/demo-fetch"
import type { ChallengeMetric } from "@/lib/types/challenges"
import { ChallengeHeader } from "./_page/components/ChallengeHeader"
import { ChallengeLeaderboards } from "./_page/components/ChallengeLeaderboards"
import { ChallengeMembers } from "./_page/components/ChallengeMembers"

export default function ChallengeDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = use(params)
    const { data, isLoading, error } = useChallengeGroup(groupId)
    const { user } = useUser()
    const router = useRouter()

    const handleLeave = async () => {
        try {
            const res = await demoFetch(`/api/challenge-groups/${groupId}`, { method: "DELETE" })
            if (!res.ok) throw new Error()
            toast.success("Left the group")
            router.push("/friends")
        } catch {
            toast.error("Failed to leave group")
        }
    }

    return (
        <FriendsLayout>
            <div className="max-w-5xl mx-auto font-mono font-medium space-y-6 px-3 sm:px-0">
                <div className="flex items-center justify-between gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => router.push('/friends')}
                    >
                        <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back to Challenges</span>
                    </Button>

                    {data && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-rose-500 hover:text-rose-600"
                            onClick={handleLeave}
                        >
                            <LogOut className="w-3.5 h-3.5" /> Leave
                        </Button>
                    )}
                </div>

                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                )}

                {error && (
                    <div className="text-center py-20 text-muted-foreground">
                        <p>Failed to load challenge group. You may not have access.</p>
                        <Button variant="outline" className="mt-4" onClick={() => router.push('/friends')}>
                            Go Back
                        </Button>
                    </div>
                )}

                {data && (
                    <div className="space-y-6">
                        <ChallengeHeader
                            name={data.name}
                            isPublic={data.is_public}
                            inviteCode={data.invite_code}
                            memberCount={data.memberCount}
                            daysLeft={data.daysLeftInMonth}
                            metrics={data.metrics as ChallengeMetric[]}
                        />
                        <ChallengeLeaderboards
                            metrics={data.metrics as ChallengeMetric[]}
                            members={data.members}
                            currentUserId={user?.id ?? ""}
                        />
                        <ChallengeMembers
                            members={data.members}
                            currentUserId={user?.id ?? ""}
                        />
                    </div>
                )}
            </div>
        </FriendsLayout>
    )
}
