"use client"

import { useState } from "react"
import { Plus, Trophy, Globe, Lock, Users, Search, PiggyBank, HeartPulse, Apple, ShoppingBag } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useUser } from "@clerk/nextjs"

import { cn } from "@/lib/utils"
import { useColorScheme } from "@/components/color-scheme-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { demoFetch } from "@/lib/demo/demo-fetch"
import type { ChallengeGroupWithMembers, ChallengeMetric } from "@/lib/types/challenges"
import { CreateChallengeGroupDialog } from "@/components/friends/create-challenge-group-dialog"
import { DiscoverGroupsDialog } from "@/components/friends/discover-groups-dialog"
import { AnimatedTooltip } from "@/components/ui/animated-tooltip"
import { ProfileModal } from "@/components/friends/profile-modal"
import type { ProfileModalUser } from "@/components/friends/profile-modal"

const METRIC_LABELS: Record<ChallengeMetric, string> = {
    savingsRate: "Savings",
    financialHealth: "Health",
    fridgeScore: "Fridge",
    wantsPercent: "Frugality",
}

const METRIC_ICONS: Record<ChallengeMetric, React.ComponentType<{ className?: string }>> = {
    savingsRate: PiggyBank,
    financialHealth: HeartPulse,
    fridgeScore: Apple,
    wantsPercent: ShoppingBag,
}

const renderMetricCluster = (metrics: ChallengeMetric[], cardColor: string) => {
    const getContainerSize = (count: number) => {
        if (count === 1) return { width: '1em', minHeight: '2em' };
        if (count === 2) return { width: '2em', minHeight: '2em' };
        if (count === 3) return { width: '2em', minHeight: '2em' };
        if (count === 4) return { width: '2.732em', minHeight: '2em' };
        return { width: `${count}em`, minHeight: '2em' };
    };

    const getClusterStyle = (count: number, index: number): React.CSSProperties => {
        const base = { position: 'absolute' as const };
        if (count === 1) return { ...base, top: 0, left: 0, zIndex: 10 };
        if (count === 2) return { ...base, top: 0, left: index === 0 ? 0 : '1em', zIndex: 10 };
        if (count === 3) {
            if (index === 0) return { ...base, top: 0, left: '0.5em', zIndex: 20 }; // Top
            if (index === 1) return { ...base, top: '0.866em', left: 0, zIndex: 10 }; // Bottom Left
            return { ...base, top: '0.866em', left: '1em', zIndex: 10 }; // Bottom Right
        }
        if (count === 4) {
            if (index === 0) return { ...base, top: '1em', left: '0.866em', zIndex: 30 }; // Middle
            if (index === 1) return { ...base, top: 0, left: '0.866em', zIndex: 20 }; // Top
            if (index === 2) return { ...base, top: '0.5em', left: 0, zIndex: 20 }; // Left
            return { ...base, top: '0.5em', left: '1.732em', zIndex: 20 }; // Right
        }
        return { ...base, top: 0, left: `${index}em`, zIndex: 10 };
    }

    return (
        <div className="relative text-[32px] sm:text-[36px] shrink-0 transition-all duration-300" style={getContainerSize(metrics.length)}>
            {metrics.map((m, index) => {
                const Icon = METRIC_ICONS[m]
                return (
                    <div
                        key={m}
                        className="absolute w-[1em] h-[1em] rounded-full flex items-center justify-center shadow-sm border border-foreground/5 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-md group hover:z-50"
                        style={{ ...getClusterStyle(metrics.length, index), backgroundColor: `${cardColor}25`, color: cardColor }}
                        title={METRIC_LABELS[m]}
                    >
                        <Icon className="w-[0.45em] h-[0.45em] transition-transform duration-300 group-hover:scale-110" />
                    </div>
                )
            })}
        </div>
    )
}

export default function ChallengesTab() {
    const { getPalette } = useColorScheme()
    const router = useRouter()
    const [groups, setGroups] = useState<ChallengeGroupWithMembers[]>([])
    const [loading, setLoading] = useState(true)
    const [createOpen, setCreateOpen] = useState(false)
    const [discoverOpen, setDiscoverOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<ProfileModalUser | null>(null)
    const { user } = useUser()

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

    const refreshGroups = () => {
        demoFetch("/api/challenge-groups")
            .then(r => r.json())
            .then(setGroups)
            .catch(() => { })
    }

    if (loading) {
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
                    {groups.length > 0
                        ? `${groups.length} active group${groups.length > 1 ? "s" : ""}`
                        : "No active groups"}
                </p>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="gap-1.5 flex-1 sm:flex-none" onClick={() => setDiscoverOpen(true)}>
                        <Search className="w-4 h-4" /> <span className="hidden sm:inline">Discover</span>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 flex-1 sm:flex-none" onClick={() => {
                        const code = prompt("Enter invite code:")
                        if (!code) return
                        demoFetch("/api/challenge-groups/join", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ invite_code: code }),
                        })
                            .then(r => r.json())
                            .then(d => {
                                if (d.error) {
                                    if (d.error?.includes('privacy settings')) {
                                        toast.error(d.error, {
                                            action: {
                                                label: 'Privacy Settings →',
                                                onClick: () => window.dispatchEvent(new CustomEvent('open-settings', { detail: { section: 'privacy' } })),
                                            },
                                        })
                                    } else {
                                        toast.error(d.error)
                                    }
                                    return
                                }
                                toast.success("Joined group!")
                                demoFetch("/api/challenge-groups")
                                    .then(r => r.json())
                                    .then(setGroups)
                            })
                            .catch(() => toast.error("Failed to join"))
                    }}>
                        <Globe className="w-4 h-4" /> <span className="hidden sm:inline">Join</span>
                    </Button>
                    <Button size="sm" className="gap-1.5 flex-1 sm:flex-none" onClick={() => setCreateOpen(true)}>
                        <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Create</span>
                    </Button>
                </div>
            </div>

            {/* Empty State */}
            {groups.length === 0 && (
                <Card className="border-border/40 bg-card/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl overflow-hidden">
                    <CardContent className="py-10 sm:py-16 text-center px-4">
                        <Trophy className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground/40" />
                        <h3 className="text-base sm:text-lg font-semibold mb-2">No challenge groups yet</h3>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-5 sm:mb-6">
                            Create a group with friends or strangers and battle it out monthly using your real financial stats.
                        </p>
                        <Button className="gap-2 w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
                            <Plus className="w-4 h-4" /> Create your first group
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Group Cards Grid — identical to Room cards */}
            {groups.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {groups.map((group, idx) => {
                        const cardColor = getCardColor(idx)
                        const yourBestRank = Object.values(group.yourRanks).length > 0
                            ? Math.min(...Object.values(group.yourRanks).filter((r): r is number => r !== undefined))
                            : null

                        return (
                            <Card
                                key={group.id}
                                onClick={() => router.push(`/challenges/${group.id}`)}
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
                                            <div className="flex items-center gap-1.5">
                                                <h3 className="font-semibold text-base sm:text-lg truncate" title={group.name}>{group.name}</h3>
                                                {group.is_public ? (
                                                    <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground shrink-0" />
                                                ) : (
                                                    <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground shrink-0" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col shrink-0 justify-end items-end">
                                            {renderMetricCluster(group.metrics, cardColor)}
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between mt-auto gap-2">
                                        <div className="space-y-0.5 sm:space-y-1">
                                            <span className="text-[10px] sm:text-xs text-muted-foreground block">Your Best Rank</span>
                                            <div className={cn(
                                                "text-base sm:text-xl font-bold font-sans",
                                                yourBestRank === 1 ? "text-yellow-500" :
                                                    yourBestRank === 2 ? "text-slate-400" :
                                                        yourBestRank === 3 ? "text-amber-600" :
                                                            "text-foreground"
                                            )}>
                                                {yourBestRank ? `#${yourBestRank}` : "—"}
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="bg-background/50 border-border/50 text-[10px] sm:text-xs shadow-none text-muted-foreground">
                                            {group.daysLeftInMonth}d left
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 sm:pt-4 border-t border-border/40 mt-2 sm:mt-4">
                                        {/* Mobile: max 2 avatars */}
                                        <div className="flex z-20 ml-2 sm:hidden">
                                            <AnimatedTooltip
                                                items={group.members.slice(0, 2).map((member, mIdx) => {
                                                    const memberColor = palette[mIdx % palette.length]
                                                    const isCurrentUser = member.user_id === user?.id
                                                    return {
                                                        id: member.user_id,
                                                        name: member.display_name,
                                                        designation: "Challenger",
                                                        image: isCurrentUser && user?.imageUrl ? user.imageUrl : member.avatar_url,
                                                        color: memberColor,
                                                        onClick: () => {
                                                            setSelectedUser({
                                                                id: member.user_id,
                                                                name: member.display_name,
                                                                avatar: isCurrentUser && user?.imageUrl ? user.imageUrl : member.avatar_url,
                                                                color: memberColor,
                                                            })
                                                        }
                                                    }
                                                })}
                                            />
                                            {group.members.length > 2 && (
                                                <div className="w-7 h-7 ml-1 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-medium z-10 text-muted-foreground shadow-sm">
                                                    +{group.members.length - 2}
                                                </div>
                                            )}
                                        </div>
                                        {/* Desktop: max 3 avatars */}
                                        <div className="hidden sm:flex z-20 ml-2">
                                            <AnimatedTooltip
                                                items={group.members.slice(0, 3).map((member, mIdx) => {
                                                    const memberColor = palette[mIdx % palette.length]
                                                    const isCurrentUser = member.user_id === user?.id
                                                    return {
                                                        id: member.user_id,
                                                        name: member.display_name,
                                                        designation: "Challenger",
                                                        image: isCurrentUser && user?.imageUrl ? user.imageUrl : member.avatar_url,
                                                        color: memberColor,
                                                        onClick: () => {
                                                            setSelectedUser({
                                                                id: member.user_id,
                                                                name: member.display_name,
                                                                avatar: isCurrentUser && user?.imageUrl ? user.imageUrl : member.avatar_url,
                                                                color: memberColor,
                                                            })
                                                        }
                                                    }
                                                })}
                                            />
                                            {group.members.length > 3 && (
                                                <div className="w-9 h-9 ml-1 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium z-10 text-muted-foreground shadow-sm">
                                                    +{group.members.length - 3}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                                            <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {group.memberCount}
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
            <DiscoverGroupsDialog
                open={discoverOpen}
                onOpenChange={setDiscoverOpen}
                onJoined={refreshGroups}
            />
            <ProfileModal open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)} user={selectedUser} />
        </div>
    )
}
