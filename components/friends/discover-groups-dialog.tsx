"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Globe, Users, Trophy, Loader2 } from "lucide-react"

import { demoFetch } from "@/lib/demo/demo-fetch"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { ChallengeMetric } from "@/lib/types/challenges"

const METRIC_LABELS: Record<ChallengeMetric, string> = {
    savingsRate: "Savings",
    financialHealth: "Health",
    fridgeScore: "Fridge",
    wantsPercent: "Frugality",
}

interface DiscoverGroup {
    id: string
    name: string
    description: string | null
    metrics: ChallengeMetric[]
    memberCount: number
    created_at: string
}

interface DiscoverGroupsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onJoined: () => void
}

export function DiscoverGroupsDialog({ open, onOpenChange, onJoined }: DiscoverGroupsDialogProps) {
    const [groups, setGroups] = useState<DiscoverGroup[]>([])
    const [loading, setLoading] = useState(false)
    const [joiningId, setJoiningId] = useState<string | null>(null)

    useEffect(() => {
        if (!open) return
        setLoading(true)
        demoFetch("/api/challenge-groups/discover")
            .then(r => r.json())
            .then(data => { setGroups(data); setLoading(false) })
            .catch(() => { setLoading(false) })
    }, [open])

    const handleJoin = async (groupId: string) => {
        setJoiningId(groupId)
        try {
            const res = await demoFetch("/api/challenge-groups/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ group_id: groupId }),
            })
            const data = await res.json()
            if (!res.ok) {
                if (res.status === 403 && data.error?.includes('privacy settings')) {
                    toast.error(data.error, {
                        action: {
                            label: 'Privacy Settings →',
                            onClick: () => window.dispatchEvent(new CustomEvent('open-settings', { detail: { section: 'privacy' } })),
                        },
                    })
                } else {
                    toast.error(data.error || "Failed to join")
                }
                return
            }
            toast.success("Joined group!")
            setGroups(prev => prev.filter(g => g.id !== groupId))
            onJoined()
        } catch {
            toast.error("Failed to join group")
        } finally {
            setJoiningId(null)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5" /> Discover Public Groups
                    </DialogTitle>
                </DialogHeader>

                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                )}

                {!loading && groups.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Trophy className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">No public groups available right now.</p>
                        <p className="text-xs mt-1">Check back later or create your own!</p>
                    </div>
                )}

                {!loading && groups.length > 0 && (
                    <div className="space-y-3">
                        {groups.map(group => (
                            <Card key={group.id} className="border-border/40 bg-card/60 rounded-2xl overflow-hidden">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1.5 min-w-0 flex-1">
                                            <h3 className="font-semibold text-sm truncate">{group.name}</h3>
                                            {group.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-2">{group.description}</p>
                                            )}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <Users className="w-3 h-3" /> {group.memberCount}
                                                </span>
                                                {group.metrics.map(m => (
                                                    <Badge key={m} variant="secondary" className="text-[9px] px-1 py-0">
                                                        {METRIC_LABELS[m]}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="shrink-0"
                                            disabled={joiningId === group.id}
                                            onClick={() => handleJoin(group.id)}
                                        >
                                            {joiningId === group.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                "Join"
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
