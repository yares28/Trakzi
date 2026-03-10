"use client"

import { useState } from "react"
import { ShieldCheck, UserRound, ChevronDown } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ProfileModal } from "@/components/friends/profile-modal"
import type { ProfileModalUser } from "@/components/friends/profile-modal"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/components/currency-provider"
import { demoFetch } from "@/lib/demo/demo-fetch"

interface Member {
    user_id: string
    display_name: string
    role: string
    joined_at: string
    avatar_url: string | null
}

interface Balance {
    user_id: string
    net_balance: number
}

interface RoomMembersProps {
    members: Member[]
    balances?: Balance[]
    currentUserId?: string
    currentUserRole?: string
    roomId?: string
    onMemberUpdated?: () => void
}

const RoleIcon = ({ role }: { role: string }) => {
    if (role === "owner" || role === "admin") return <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
    return <UserRound className="w-3.5 h-3.5 text-muted-foreground" />
}

export function RoomMembers({ members, balances = [], currentUserId, currentUserRole, roomId, onMemberUpdated }: RoomMembersProps) {
    const [selectedUser, setSelectedUser] = useState<ProfileModalUser | null>(null)
    const { formatCurrency } = useCurrency()

    const balanceMap = balances.reduce<Record<string, number>>((acc, b) => {
        acc[b.user_id] = b.net_balance
        return acc
    }, {})

    const isAdmin = currentUserRole === "owner" || currentUserRole === "admin"

    const handleRoleChange = async (targetUserId: string, newRole: "admin" | "member") => {
        if (!roomId) return
        try {
            const res = await demoFetch(`/api/rooms/${roomId}/members/${targetUserId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            })
            if (!res.ok) {
                const json = await res.json()
                toast.error(json.error ?? "Failed to update role")
                return
            }
            toast.success(`Member is now ${newRole === "admin" ? "an admin" : "a regular member"}`)
            onMemberUpdated?.()
        } catch {
            toast.error("Failed to update role")
        }
    }

    return (
        <div className="space-y-3">
            <h2 className="text-lg font-semibold px-1">Members ({members.length})</h2>
            <Card className="border-border/40 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-3xl overflow-hidden">
                <CardContent className="p-0 divide-y divide-border/30">
                    {members.map(m => {
                        const netBalance = balanceMap[m.user_id] ?? 0
                        const isYou = m.user_id === currentUserId
                        const canManage = isAdmin && !isYou && m.role !== "owner" && m.role !== "admin"

                        return (
                            <div
                                key={m.user_id}
                                className="flex items-center justify-between px-3 sm:px-6 py-3.5"
                            >
                                <button
                                    type="button"
                                    className="flex items-center gap-2 sm:gap-3 text-left hover:opacity-80 transition-opacity"
                                    onClick={() => setSelectedUser({ id: m.user_id, name: m.display_name, avatar: m.avatar_url })}
                                >
                                    <Avatar className="w-9 h-9 border border-border/50">
                                        <AvatarImage src={m.avatar_url || undefined} alt={m.display_name} />
                                        <AvatarFallback className="text-[10px]">{m.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium text-sm">
                                            {m.display_name}
                                            {isYou && <span className="ml-1 text-xs text-muted-foreground">(You)</span>}
                                        </p>
                                        {balances.length > 0 && (
                                            <p className={cn(
                                                "text-xs font-medium tabular-nums",
                                                netBalance > 0 ? "text-emerald-500" :
                                                netBalance < 0 ? "text-rose-500" :
                                                "text-muted-foreground"
                                            )}>
                                                {netBalance > 0 ? "+" : ""}{formatCurrency(netBalance)}
                                            </p>
                                        )}
                                    </div>
                                </button>

                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="gap-1 text-xs capitalize">
                                        <RoleIcon role={m.role} />
                                        {m.role === "owner" ? "admin" : m.role}
                                    </Badge>

                                    {canManage && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="p-1 rounded-md hover:bg-muted/60 transition-colors text-muted-foreground"
                                                    aria-label="Member options"
                                                >
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44">
                                                {m.role === "member" ? (
                                                    <DropdownMenuItem onClick={() => handleRoleChange(m.user_id, "admin")}>
                                                        <ShieldCheck className="w-3.5 h-3.5 mr-2 text-blue-500" />
                                                        Make Admin
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem onClick={() => handleRoleChange(m.user_id, "member")}>
                                                        <UserRound className="w-3.5 h-3.5 mr-2" />
                                                        Remove Admin
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </CardContent>
            </Card>
            <ProfileModal open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)} user={selectedUser} />
        </div>
    )
}
