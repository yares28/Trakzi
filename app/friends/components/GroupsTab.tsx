"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Plus, Users, LogIn, Activity } from "lucide-react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { useCurrency } from "@/components/currency-provider"
import { useColorScheme } from "@/components/color-scheme-provider"
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useFriendsBundleData } from "@/hooks/use-friends-bundle"
import { CreateRoomDialog } from "@/components/rooms/create-room-dialog"
import { JoinRoomDialog } from "@/components/rooms/join-room-dialog"
import { AnimatedTooltip } from "@/components/ui/animated-tooltip"
import { ProfileModal } from "@/components/friends/profile-modal"
import type { ProfileModalUser } from "@/components/friends/profile-modal"
import type { RoomData } from "@/lib/charts/friends-aggregations"

export default function GroupsTab() {
    const { data: bundleData, isLoading } = useFriendsBundleData()
    const queryClient = useQueryClient()
    const [createOpen, setCreateOpen] = useState(false)
    const [joinOpen, setJoinOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<ProfileModalUser | null>(null)
    const router = useRouter()
    const { formatCurrency } = useCurrency()
    const { getPalette } = useColorScheme()
    const palette = getPalette()

    const rooms = (bundleData?.rooms || []) as RoomData[]

    const activeGroups = rooms.length
    const totalYouOwe = rooms.reduce((acc, r) => r.yourBalance < 0 ? acc + Math.abs(r.yourBalance) : acc, 0)
    const totalOwedToYou = rooms.reduce((acc, r) => r.yourBalance > 0 ? acc + r.yourBalance : acc, 0)

    // Pick a stable color from the middle of the palette for each card
    const getCardColor = (index: number) => {
        const mid = Math.floor(palette.length / 2)
        const offset = index % Math.max(palette.length - 2, 1)
        return palette[Math.min(mid + offset, palette.length - 2)] ?? palette[mid]
    }

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500">

            {/* Header with actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    {rooms.length > 0
                        ? `${rooms.length} active room${rooms.length > 1 ? "s" : ""}`
                        : "No active rooms"}
                </p>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="gap-1.5 flex-1 sm:flex-none" onClick={() => setJoinOpen(true)}>
                        <LogIn className="w-4 h-4" /> <span className="hidden sm:inline">Join</span>
                    </Button>
                    <Button size="sm" className="gap-1.5 flex-1 sm:flex-none" onClick={() => setCreateOpen(true)}>
                        <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Create</span>
                    </Button>
                </div>
            </div>

            {/* Summary Top Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card className="relative group overflow-hidden h-[5.5rem] sm:h-[7rem] py-3 sm:py-4 bg-card/60 backdrop-blur-sm border-border/50 shadow-sm">
                    <CardHeader className="pb-1 sm:pb-2 pt-2 sm:pt-[5px] flex-1 min-h-0">
                        <CardDescription className="text-[10px] sm:text-xs mb-0.5 sm:mb-1 truncate">Active rooms</CardDescription>
                        <CardTitle className="text-lg sm:text-2xl font-semibold tabular-nums md:text-3xl truncate">
                            {activeGroups}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card className="relative group overflow-hidden h-[5.5rem] sm:h-[7rem] py-3 sm:py-4 bg-card/60 backdrop-blur-sm border-border/50 shadow-sm">
                    <CardHeader className="pb-1 sm:pb-2 pt-2 sm:pt-[5px] flex-1 min-h-0">
                        <CardDescription className="text-[10px] sm:text-xs mb-0.5 sm:mb-1 truncate">Owed to you</CardDescription>
                        <CardTitle className="text-lg sm:text-2xl font-semibold tabular-nums md:text-3xl truncate text-emerald-500">
                            {formatCurrency(totalOwedToYou)}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card className="relative group overflow-hidden h-[5.5rem] sm:h-[7rem] py-3 sm:py-4 bg-card/60 backdrop-blur-sm border-border/50 shadow-sm">
                    <CardHeader className="pb-1 sm:pb-2 pt-2 sm:pt-[5px] flex-1 min-h-0">
                        <CardDescription className="text-[10px] sm:text-xs mb-0.5 sm:mb-1 truncate">You owe</CardDescription>
                        <CardTitle className="text-lg sm:text-2xl font-semibold tabular-nums md:text-3xl truncate text-rose-500">
                            {formatCurrency(totalYouOwe)}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Empty state */}
            {rooms.length === 0 && (
                <Card className="border-border/40 bg-card/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl overflow-hidden">
                    <CardContent className="py-10 sm:py-16 text-center px-4">
                        <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground/40" />
                        <h3 className="text-base sm:text-lg font-semibold mb-2">No rooms yet</h3>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-5 sm:mb-6">
                            Create a room to split shared expenses with roommates, friends, or travel buddies.
                        </p>
                        <Button className="gap-2 w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
                            <Plus className="w-4 h-4" /> Create your first room
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Room Cards Grid */}
            {rooms.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {rooms.map((room, idx) => {
                        const cardColor = getCardColor(idx)
                        return (
                            <Card
                                key={room.id}
                                onClick={() => router.push(`/rooms/${room.id}`)}
                                className="relative h-[210px] sm:h-[260px] rounded-2xl sm:rounded-3xl bg-card/60 backdrop-blur-md shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer border border-border/50 hover:border-border"
                            >
                                {/* Palette-based accent glow */}
                                <div
                                    className="absolute -top-12 -right-12 w-24 sm:w-32 h-24 sm:h-32 rounded-full blur-3xl opacity-20"
                                    style={{ backgroundColor: cardColor }}
                                />

                                <CardContent className="p-4 sm:p-6 h-full flex flex-col justify-between z-10 relative">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-1 max-w-[65%] sm:max-w-[70%]">
                                            <h3 className="font-semibold text-base sm:text-lg truncate" title={room.name}>{room.name}</h3>
                                            {room.description && (
                                                <p className="text-[10px] sm:text-xs text-muted-foreground truncate" title={room.description}>{room.description}</p>
                                            )}
                                        </div>
                                        <div
                                            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0"
                                            style={{ backgroundColor: `${cardColor}20`, color: cardColor }}
                                        >
                                            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between mt-auto gap-2">
                                        <div className="space-y-0.5 sm:space-y-1">
                                            <span className="text-[10px] sm:text-xs text-muted-foreground block">Your Balance</span>
                                            <div className={cn(
                                                "text-base sm:text-xl font-bold font-sans",
                                                room.yourBalance > 0 ? "text-emerald-500" :
                                                    room.yourBalance < 0 ? "text-rose-500" :
                                                        "text-foreground"
                                            )}>
                                                {room.yourBalance > 0 ? formatCurrency(room.yourBalance, { showSign: true }) :
                                                    room.yourBalance < 0 ? formatCurrency(room.yourBalance, { showSign: true }) :
                                                        "Settled"}
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="bg-background/50 border-border/50 text-foreground text-[10px] sm:text-xs shadow-none px-1.5 sm:px-2">
                                            <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                                            <span className="hidden sm:inline">{formatCurrency(room.totalShared)} Total</span>
                                            <span className="sm:hidden">{formatCurrency(room.totalShared)}</span>
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 sm:pt-4 border-t border-border/40 mt-2 sm:mt-4">
                                        {/* Mobile: max 2 avatars */}
                                        <div className="flex z-20 ml-2 sm:hidden">
                                            <AnimatedTooltip
                                                items={room.members.slice(0, 2).map((member, mIdx) => {
                                                    const memberColor = palette[mIdx % palette.length]
                                                    return {
                                                        id: member.id,
                                                        name: member.name,
                                                        designation: "Member",
                                                        image: member.avatar_url || null,
                                                        color: memberColor,
                                                        onClick: () => {
                                                            setSelectedUser({
                                                                id: member.id,
                                                                name: member.name,
                                                                avatar: member.avatar_url || null,
                                                                color: memberColor,
                                                            })
                                                        }
                                                    }
                                                })}
                                            />
                                            {room.members.length > 2 && (
                                                <div className="w-7 h-7 ml-1 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-medium z-10 text-muted-foreground shadow-sm">
                                                    +{room.members.length - 2}
                                                </div>
                                            )}
                                        </div>
                                        {/* Desktop: max 3 avatars */}
                                        <div className="hidden sm:flex z-20 ml-2">
                                            <AnimatedTooltip
                                                items={room.members.slice(0, 3).map((member, mIdx) => {
                                                    const memberColor = palette[mIdx % palette.length]
                                                    return {
                                                        id: member.id,
                                                        name: member.name,
                                                        designation: "Member",
                                                        image: member.avatar_url || null,
                                                        color: memberColor,
                                                        onClick: () => {
                                                            setSelectedUser({
                                                                id: member.id,
                                                                name: member.name,
                                                                avatar: member.avatar_url || null,
                                                                color: memberColor,
                                                            })
                                                        }
                                                    }
                                                })}
                                            />
                                            {room.members.length > 3 && (
                                                <div className="w-9 h-9 ml-1 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium z-10 text-muted-foreground shadow-sm">
                                                    +{room.members.length - 3}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                            {room.lastActivity}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            <CreateRoomDialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) queryClient.invalidateQueries({ queryKey: ['friends-bundle'] }) }} />
            <JoinRoomDialog open={joinOpen} onOpenChange={(open) => { setJoinOpen(open); if (!open) queryClient.invalidateQueries({ queryKey: ['friends-bundle'] }) }} />
            <ProfileModal open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)} user={selectedUser} />
        </div>
    )
}
