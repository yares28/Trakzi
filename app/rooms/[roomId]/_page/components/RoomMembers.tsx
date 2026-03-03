"use client"

import { Crown, Shield, User } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface Member {
    user_id: string
    display_name: string
    role: string
    joined_at: string
}

interface RoomMembersProps {
    members: Member[]
}

const RoleIcon = ({ role }: { role: string }) => {
    if (role === "owner") return <Crown className="w-3.5 h-3.5 text-yellow-500" />
    if (role === "admin") return <Shield className="w-3.5 h-3.5 text-blue-500" />
    return <User className="w-3.5 h-3.5 text-muted-foreground" />
}

export function RoomMembers({ members }: RoomMembersProps) {
    return (
        <div className="space-y-3">
            <h2 className="text-lg font-semibold px-1">Members ({members.length})</h2>
            <Card className="border-border/40 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-3xl overflow-hidden">
                <CardContent className="p-0 divide-y divide-border/30">
                    {members.map(m => (
                        <div key={m.user_id} className="flex items-center justify-between px-6 py-3.5">
                            <div className="flex items-center gap-3">
                                <Avatar className="w-9 h-9 border border-border/50">
                                    <AvatarFallback className="text-[10px]">{m.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-sm">{m.display_name}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Joined {new Date(m.joined_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <Badge variant="outline" className="gap-1 text-xs capitalize">
                                <RoleIcon role={m.role} />
                                {m.role}
                            </Badge>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}
