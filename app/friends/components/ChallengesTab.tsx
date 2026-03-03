"use client"

import { useState } from "react"
import { Plus, Trophy, Globe, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { useColorScheme } from "@/components/color-scheme-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { demoFetch } from "@/lib/demo/demo-fetch"
import type { ChallengeGroupWithMembers, ChallengeMetric } from "@/lib/types/challenges"
import { CreateChallengeGroupDialog } from "@/components/friends/create-challenge-group-dialog"

const METRIC_LABELS: Record<ChallengeMetric, string> = {
    savingsRate: "Savings",
    financialHealth: "Health",
    fridgeScore: "Fridge",
    wantsPercent: "Frugality",
}

export default function ChallengesTab() {
    const { getPalette } = useColorScheme()
    const router = useRouter()
    const [groups, setGroups] = useState<ChallengeGroupWithMembers[]>([])
    const [loading, setLoading] = useState(true)
    const [createOpen, setCreateOpen] = useState(false)

    const palette = getPalette()

    const getCardColor = (index: number) => {
        const mid = Math.floor(palette.length / 2)
        const offset = index % Math.max(palette.length - 2, 1)
        return palette[Math.min(mid + offset, palette.length - 2)] ?? palette[mid]
    }

    // Fetch groups on mount
    useState(() => {
        demoFetch("/api/challenge-groups")
            .then(r => r.json())
            .then(data => { setGroups(data); setLoading(false) })
            .catch(() => setLoading(false))
    })

    const handleCreated = (newGroup: ChallengeGroupWithMembers) => {
        setGroups(prev => [newGroup, ...prev])
    }

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header with actions */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {groups.length > 0
                        ? `${groups.length} active group${groups.length > 1 ? "s" : ""}`
                        : "No active groups"}
                </p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                        const code = prompt("Enter invite code:")
                        if (!code) return
                        demoFetch("/api/challenge-groups/join", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ invite_code: code }),
                        })
                            .then(r => r.json())
                            .then(d => {
                                if (d.error) { toast.error(d.error); return }
                                toast.success("Joined group!")
                                demoFetch("/api/challenge-groups")
                                    .then(r => r.json())
                                    .then(setGroups)
                            })
                            .catch(() => toast.error("Failed to join"))
                    }}>
                        <Globe className="w-4 h-4" /> Join
                    </Button>
                    <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
                        <Plus className="w-4 h-4" /> Create
                    </Button>
                </div>
            </div>

            {/* Empty State */}
            {groups.length === 0 && (
                <Card className="border-border/40 bg-card/60 backdrop-blur-sm rounded-3xl overflow-hidden">
                    <CardContent className="py-16 text-center">
                        <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                        <h3 className="text-lg font-semibold mb-2">No challenge groups yet</h3>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                            Create a group with friends or strangers and battle it out monthly using your real financial stats.
                        </p>
                        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                            <Plus className="w-4 h-4" /> Create your first group
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Group Cards Grid — identical to Room cards */}
            {groups.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map((group, idx) => {
                        const cardColor = getCardColor(idx)
                        const yourBestRank = Object.values(group.yourRanks).length > 0
                            ? Math.min(...Object.values(group.yourRanks).filter((r): r is number => r !== undefined))
                            : null

                        return (
                            <Card
                                key={group.id}
                                onClick={() => router.push(`/challenges/${group.id}`)}
                                className="relative h-[220px] rounded-3xl bg-card/60 backdrop-blur-md shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer overflow-hidden border border-border/50 hover:border-border"
                            >
                                {/* Palette-based accent glow */}
                                <div
                                    className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20"
                                    style={{ backgroundColor: cardColor }}
                                />
                                <div
                                    className="absolute bottom-0 left-0 right-0 h-1 opacity-60"
                                    style={{ backgroundColor: cardColor }}
                                />

                                <CardContent className="p-6 h-full flex flex-col justify-between z-10 relative">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1 max-w-[70%]">
                                            <h3 className="font-semibold text-lg truncate" title={group.name}>{group.name}</h3>
                                            <div className="flex gap-1 flex-wrap">
                                                {group.metrics.map(m => (
                                                    <Badge key={m} variant="secondary" className="text-[10px] px-1.5 py-0">
                                                        {METRIC_LABELS[m]}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div
                                            className="p-2 rounded-xl"
                                            style={{ backgroundColor: `${cardColor}20`, color: cardColor }}
                                        >
                                            <Trophy className="w-4 h-4" />
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between mt-4">
                                        <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground block">Your Best Rank</span>
                                            <div className={cn(
                                                "text-xl font-bold font-sans",
                                                yourBestRank === 1 ? "text-yellow-500" :
                                                    yourBestRank === 2 ? "text-slate-400" :
                                                        yourBestRank === 3 ? "text-amber-600" :
                                                            "text-foreground"
                                            )}>
                                                {yourBestRank ? `#${yourBestRank}` : "—"}
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="bg-background/50 border-border/50 text-xs shadow-none">
                                            {group.daysLeftInMonth}d left
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-auto">
                                        <div className="flex -space-x-2">
                                            {group.members.slice(0, 4).map((member) => (
                                                <div key={member.user_id} className="relative z-0">
                                                    <Avatar className="w-8 h-8 border-2 border-background shadow-sm hover:z-20 hover:scale-110 transition-transform">
                                                        <AvatarFallback className="text-[10px] bg-muted">{member.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                </div>
                                            ))}
                                            {group.members.length > 4 && (
                                                <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium z-10 text-muted-foreground shadow-sm">
                                                    +{group.members.length - 4}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                                            <Users className="w-3 h-3" /> {group.memberCount}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            <CreateChallengeGroupDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onCreated={handleCreated}
            />
        </div>
    )
}
