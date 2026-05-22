"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ProfileModal } from "@/components/friends/profile-modal"
import type { ProfileModalUser } from "@/components/friends/profile-modal"
import type { ChallengeGroupMember } from "@/lib/types/challenges"

interface ChallengeMembersProps {
    members: ChallengeGroupMember[]
    currentUserId: string
}

export function ChallengeMembers({ members, currentUserId }: ChallengeMembersProps) {
    const sorted = [...members].sort((a, b) => b.total_points - a.total_points)
    const [selectedUser, setSelectedUser] = useState<ProfileModalUser | null>(null)

    return (
        <div className="space-y-3">
            <h2 className="text-lg font-semibold px-1">Members ({members.length})</h2>
            <Card className="border-border/40 bg-card/60 backdrop-blur-sm rounded-3xl overflow-hidden">
                <CardContent className="p-0 divide-y divide-border/30">
                    {sorted.map(m => {
                        const isYou = m.user_id === currentUserId
                        return (
                            <div
                                key={m.user_id}
                                role="button"
                                tabIndex={0}
                                className="flex items-center justify-between px-3 sm:px-6 py-3.5 hover:bg-muted/10 transition-colors cursor-pointer"
                                onClick={() => setSelectedUser({ id: m.user_id, name: m.display_name, avatar: m.avatar_url })}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedUser({ id: m.user_id, name: m.display_name, avatar: m.avatar_url }) } }}
                            >
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <Avatar className="w-9 h-9 border border-border/50">
                                        <AvatarImage src={m.avatar_url || undefined} alt={m.display_name} />
                                        <AvatarFallback className="text-[10px]">{m.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className={cn("font-medium text-sm", isYou && "text-primary")}>
                                            {m.display_name}
                                            {isYou && <span className="ml-1 text-xs">(You)</span>}
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
            <ProfileModal open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)} user={selectedUser} />
        </div>
    )
}
