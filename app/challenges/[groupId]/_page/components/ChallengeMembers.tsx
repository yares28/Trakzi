"use client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { ChallengeGroupMember } from "@/lib/types/challenges"

interface ChallengeMembersProps {
    members: ChallengeGroupMember[]
    currentUserId: string
}

export function ChallengeMembers({ members, currentUserId }: ChallengeMembersProps) {
    const sorted = [...members].sort((a, b) => b.total_points - a.total_points)

    return (
        <div className="space-y-3">
            <h2 className="text-lg font-semibold px-1">Members ({members.length})</h2>
            <Card className="border-border/40 bg-card/60 backdrop-blur-sm rounded-3xl overflow-hidden">
                <CardContent className="p-0 divide-y divide-border/30">
                    {sorted.map(m => {
                        const isYou = m.user_id === currentUserId
                        return (
                            <div key={m.user_id} className="flex items-center justify-between px-6 py-3.5">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-9 h-9 border border-border/50">
                                        <AvatarFallback className="text-[10px]">{m.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className={cn("font-medium text-sm", isYou && "text-primary")}>
                                            {m.display_name}
                                            {isYou && <span className="ml-1 text-xs">(You)</span>}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            Joined {new Date(m.joined_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-xs tabular-nums">
                                    {m.total_points} pts
                                </Badge>
                            </div>
                        )
                    })}
                </CardContent>
            </Card>
        </div>
    )
}
