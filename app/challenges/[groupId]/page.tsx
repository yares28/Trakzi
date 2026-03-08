"use client"

import { use, useState } from "react"
import { ArrowLeft, LogOut, Pencil, Check, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { FriendsLayout } from "@/app/friends/components/FriendsLayout"
import { useChallengeGroup } from "@/hooks/use-challenge-group"
import { useUser } from "@clerk/nextjs"
import { demoFetch } from "@/lib/demo/demo-fetch"
import type { ChallengeMetric } from "@/lib/types/challenges"
import { ChallengeHeader } from "./_page/components/ChallengeHeader"
import { ChallengeLeaderboards } from "./_page/components/ChallengeLeaderboards"
import { ChallengeMembers } from "./_page/components/ChallengeMembers"
import { ChallengeScoreChart } from "./_page/components/ChallengeScoreChart"

export default function ChallengeDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = use(params)
    const { data, isLoading, error, refetch } = useChallengeGroup(groupId)
    const { user } = useUser()
    const router = useRouter()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState<string>("leaderboards")
    const [isEditingDesc, setIsEditingDesc] = useState(false)
    const [draftDesc, setDraftDesc] = useState("")
    const [isSavingDesc, setIsSavingDesc] = useState(false)

    const isAdmin = data && user ? data.created_by === user.id : false

    const handleStartEditDesc = () => {
        setDraftDesc(data?.description ?? "")
        setIsEditingDesc(true)
    }

    const handleSaveDesc = async () => {
        setIsSavingDesc(true)
        try {
            const res = await demoFetch(`/api/challenge-groups/${groupId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description: draftDesc || null }),
            })
            if (!res.ok) throw new Error()
            toast.success("Description updated")
            setIsEditingDesc(false)
            refetch()
        } catch {
            toast.error("Failed to update description")
        } finally {
            setIsSavingDesc(false)
        }
    }

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
                            description={data.description}
                            isPublic={data.is_public}
                            inviteCode={data.invite_code}
                            memberCount={data.memberCount}
                            daysLeft={data.daysLeftInMonth}
                            metrics={data.metrics as ChallengeMetric[]}
                        />

                        {/* Leaderboards / About tab switch (desktop only — mobile shows all) */}
                        <div className="hidden sm:block">
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="grid w-full max-w-md grid-cols-3">
                                    <TabsTrigger value="leaderboards">Leaderboard</TabsTrigger>
                                    <TabsTrigger value="allTime">All Time</TabsTrigger>
                                    <TabsTrigger value="about">About</TabsTrigger>
                                </TabsList>

                                <TabsContent value="leaderboards" className="mt-6 space-y-6">
                                    <ChallengeLeaderboards
                                        metrics={data.metrics as ChallengeMetric[]}
                                        members={data.members}
                                        currentUserId={user?.id ?? ""}
                                        hideAllTime
                                    />
                                    <ChallengeScoreChart
                                        members={data.members}
                                        metrics={data.metrics as ChallengeMetric[]}
                                        currentUserId={user?.id ?? ""}
                                    />
                                </TabsContent>

                                <TabsContent value="allTime" className="mt-6 space-y-6">
                                    <ChallengeLeaderboards
                                        metrics={[]}
                                        members={data.members}
                                        currentUserId={user?.id ?? ""}
                                        allTimeOnly
                                    />
                                    <ChallengeScoreChart
                                        members={data.members}
                                        metrics={data.metrics as ChallengeMetric[]}
                                        currentUserId={user?.id ?? ""}
                                    />
                                </TabsContent>

                                <TabsContent value="about" className="mt-6 space-y-6">
                                    {/* Editable description */}
                                    <Card className="border-border/40 bg-card/60 backdrop-blur-sm rounded-3xl overflow-hidden">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <h2 className="text-lg font-semibold">Description</h2>
                                                {isAdmin && !isEditingDesc && (
                                                    <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleStartEditDesc}>
                                                        <Pencil className="w-3.5 h-3.5" /> Edit
                                                    </Button>
                                                )}
                                            </div>
                                            {isEditingDesc ? (
                                                <div className="space-y-3">
                                                    <Textarea
                                                        value={draftDesc}
                                                        onChange={(e) => setDraftDesc(e.target.value)}
                                                        placeholder="Add a description for your group..."
                                                        className="min-h-[100px] resize-none"
                                                        maxLength={500}
                                                    />
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-muted-foreground">{draftDesc.length}/500</span>
                                                        <div className="flex gap-2">
                                                            <Button variant="ghost" size="sm" onClick={() => setIsEditingDesc(false)} disabled={isSavingDesc}>
                                                                <X className="w-4 h-4 mr-1" /> Cancel
                                                            </Button>
                                                            <Button size="sm" onClick={handleSaveDesc} disabled={isSavingDesc}>
                                                                <Check className="w-4 h-4 mr-1" /> Save
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">
                                                    {data.description || "No description yet."}
                                                </p>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <ChallengeMembers
                                        members={data.members}
                                        currentUserId={user?.id ?? ""}
                                    />
                                    {/* Leave button at bottom of members section */}
                                    <Button
                                        variant="outline"
                                        className="w-full gap-2 text-rose-500 hover:text-rose-600 border-rose-500/30 hover:border-rose-500/50 hover:bg-rose-500/5"
                                        onClick={handleLeave}
                                    >
                                        <LogOut className="w-4 h-4" /> Leave Group
                                    </Button>
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* Mobile: show everything stacked (no tabs) */}
                        <div className="sm:hidden space-y-6">
                            <ChallengeLeaderboards
                                metrics={data.metrics as ChallengeMetric[]}
                                members={data.members}
                                currentUserId={user?.id ?? ""}
                                hideAllTime
                            />
                            <ChallengeLeaderboards
                                metrics={[]}
                                members={data.members}
                                currentUserId={user?.id ?? ""}
                                allTimeOnly
                            />
                            <ChallengeScoreChart
                                members={data.members}
                                metrics={data.metrics as ChallengeMetric[]}
                                currentUserId={user?.id ?? ""}
                            />
                            <ChallengeMembers
                                members={data.members}
                                currentUserId={user?.id ?? ""}
                            />
                            <Button
                                variant="outline"
                                className="w-full gap-2 text-rose-500 hover:text-rose-600 border-rose-500/30 hover:border-rose-500/50 hover:bg-rose-500/5"
                                onClick={handleLeave}
                            >
                                <LogOut className="w-4 h-4" /> Leave Group
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </FriendsLayout>
    )
}
