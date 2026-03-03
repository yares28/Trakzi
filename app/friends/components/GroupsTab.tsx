"use client"

import { useState } from "react"
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
import type { RoomData } from "@/lib/charts/friends-aggregations"

export default function GroupsTab() {
    const { data: bundleData, isLoading } = useFriendsBundleData()
    const [createOpen, setCreateOpen] = useState(false)
    const [joinOpen, setJoinOpen] = useState(false)
    const router = useRouter()
    const { formatCurrency } = useCurrency()
    const { getPalette } = useColorScheme()

    const rooms = (bundleData?.rooms || []) as RoomData[]
    const palette = getPalette()

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
        <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">

            {/* Header with actions */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {rooms.length > 0
                        ? `${rooms.length} active room${rooms.length > 1 ? "s" : ""}`
                        : "No active rooms"}
                </p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setJoinOpen(true)}>
                        <LogIn className="w-4 h-4" /> Join
                    </Button>
                    <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
                        <Plus className="w-4 h-4" /> Create
                    </Button>
                </div>
            </div>

            {/* Summary Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="relative group overflow-hidden h-[7rem] py-4 bg-card/60 backdrop-blur-sm border-border/50 shadow-sm">
                    <CardHeader className="pb-2 pt-[5px] flex-1 min-h-0">
                        <CardDescription className="text-xs mb-1 truncate">Active rooms</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums md:text-3xl truncate">
                            {activeGroups}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card className="relative group overflow-hidden h-[7rem] py-4 bg-card/60 backdrop-blur-sm border-border/50 shadow-sm">
                    <CardHeader className="pb-2 pt-[5px] flex-1 min-h-0">
                        <CardDescription className="text-xs mb-1 truncate">Owed to you</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums md:text-3xl truncate text-emerald-500">
                            {formatCurrency(totalOwedToYou)}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card className="relative group overflow-hidden h-[7rem] py-4 bg-card/60 backdrop-blur-sm border-border/50 shadow-sm">
                    <CardHeader className="pb-2 pt-[5px] flex-1 min-h-0">
                        <CardDescription className="text-xs mb-1 truncate">You owe</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums md:text-3xl truncate text-rose-500">
                            {formatCurrency(totalYouOwe)}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Empty state */}
            {rooms.length === 0 && (
                <Card className="border-border/40 bg-card/60 backdrop-blur-sm rounded-3xl overflow-hidden">
                    <CardContent className="py-16 text-center">
                        <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                        <h3 className="text-lg font-semibold mb-2">No rooms yet</h3>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                            Create a room to split shared expenses with roommates, friends, or travel buddies.
                        </p>
                        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                            <Plus className="w-4 h-4" /> Create your first room
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Room Cards Grid */}
            {rooms.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rooms.map((room, idx) => {
                        const cardColor = getCardColor(idx)
                        return (
                            <Card
                                key={room.id}
                                onClick={() => router.push(`/rooms/${room.id}`)}
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
                                            <h3 className="font-semibold text-lg truncate" title={room.name}>{room.name}</h3>
                                            {room.description && (
                                                <p className="text-xs text-muted-foreground truncate" title={room.description}>{room.description}</p>
                                            )}
                                        </div>
                                        <div
                                            className="p-2 rounded-xl"
                                            style={{ backgroundColor: `${cardColor}20`, color: cardColor }}
                                        >
                                            <Users className="w-4 h-4" />
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between mt-4">
                                        <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground block">Your Balance</span>
                                            <div className={cn(
                                                "text-xl font-bold font-sans",
                                                room.yourBalance > 0 ? "text-emerald-500" :
                                                    room.yourBalance < 0 ? "text-rose-500" :
                                                        "text-foreground"
                                            )}>
                                                {room.yourBalance > 0 ? formatCurrency(room.yourBalance, { showSign: true }) :
                                                    room.yourBalance < 0 ? formatCurrency(room.yourBalance, { showSign: true }) :
                                                        "Settled"}
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="bg-background/50 border-border/50 text-xs shadow-none">
                                            <Activity className="w-3 h-3 mr-1" />
                                            {formatCurrency(room.totalShared)} Total
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-auto">
                                        <div className="flex -space-x-2">
                                            {room.members.slice(0, 4).map((member) => (
                                                <div key={member.id} className="relative z-0">
                                                    <Avatar className="w-8 h-8 border-2 border-background shadow-sm hover:z-20 hover:scale-110 transition-transform">
                                                        <AvatarFallback className="text-[10px] bg-muted">{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                </div>
                                            ))}
                                            {room.members.length > 4 && (
                                                <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium z-10 text-muted-foreground shadow-sm">
                                                    +{room.members.length - 4}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                            {room.lastActivity}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            <CreateRoomDialog open={createOpen} onOpenChange={setCreateOpen} />
            <JoinRoomDialog open={joinOpen} onOpenChange={setJoinOpen} />
        </div>
    )
}
