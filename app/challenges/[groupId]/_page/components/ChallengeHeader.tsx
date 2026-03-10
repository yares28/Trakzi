"use client"

import { useState, useEffect } from "react"
import { Copy, Check, Globe, Lock, Users, PiggyBank, HeartPulse, Apple, ShoppingBag, Eye, EyeOff, Pencil, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { demoFetch } from "@/lib/demo/demo-fetch"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { ChallengeMetric } from "@/lib/types/challenges"

const CODE_VISIBLE_KEY = "trakzi-challenge-code-visible"

const METRIC_LABELS: Record<ChallengeMetric, string> = {
    savingsRate: "Savings Rate",
    financialHealth: "Financial Health",
    fridgeScore: "Healthy Fridge",
    wantsPercent: "Frugality",
}

const METRIC_ICONS: Record<ChallengeMetric, React.ComponentType<{ className?: string }>> = {
    savingsRate: PiggyBank,
    financialHealth: HeartPulse,
    fridgeScore: Apple,
    wantsPercent: ShoppingBag,
}

const renderMetricCluster = (metrics: ChallengeMetric[]) => {
    const getContainerSize = (count: number) => {
        if (count === 1) return { width: '1em', height: '1em' };
        if (count === 2) return { width: '2em', height: '1em' };
        if (count === 3) return { width: '2em', height: '1.866em' };
        if (count === 4) return { width: '2.732em', height: '2em' };
        return { width: `${count}em`, height: '1em' };
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
        <div className="relative text-[32px] sm:text-[40px] shrink-0 transition-all duration-300" style={getContainerSize(metrics.length)}>
            {metrics.map((m, index) => {
                const Icon = METRIC_ICONS[m]
                return (
                    <div
                        key={m}
                        className="absolute w-[1em] h-[1em] rounded-full flex items-center justify-center shadow-sm border border-primary/20 bg-primary/10 text-primary transition-all duration-300 hover:scale-110 hover:shadow-md group backdrop-blur-sm hover:z-50"
                        style={getClusterStyle(metrics.length, index)}
                        title={METRIC_LABELS[m]}
                    >
                        <Icon className="w-[0.55em] h-[0.55em] transition-transform duration-300 group-hover:scale-110" />
                    </div>
                )
            })}
        </div>
    )
}

interface ChallengeHeaderProps {
    name: string
    description: string | null
    isPublic: boolean
    inviteCode: string
    memberCount: number
    daysLeft: number
    metrics: ChallengeMetric[]
    groupId: string
    isAdmin: boolean
    onDescriptionUpdated?: () => void
}

export function ChallengeHeader({
    name,
    description,
    isPublic,
    inviteCode,
    memberCount,
    daysLeft,
    metrics,
    groupId,
    isAdmin,
    onDescriptionUpdated,
}: ChallengeHeaderProps) {
    const [copied, setCopied] = useState(false)
    const [codeVisible, setCodeVisible] = useState(() => {
        if (typeof window === "undefined") return false
        try {
            return localStorage.getItem(CODE_VISIBLE_KEY) === "true"
        } catch {
            return false
        }
    })
    const [editingDesc, setEditingDesc] = useState(false)
    const [draftDesc, setDraftDesc] = useState(description ?? "")
    const [savingDesc, setSavingDesc] = useState(false)

    useEffect(() => {
        try { localStorage.setItem(CODE_VISIBLE_KEY, String(codeVisible)) } catch { /* noop */ }
    }, [codeVisible])

    const copyCode = () => {
        navigator.clipboard.writeText(inviteCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const saveDescription = async () => {
        setSavingDesc(true)
        try {
            const res = await demoFetch(`/api/challenge-groups/${groupId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description: draftDesc.trim() || null }),
            })
            if (!res.ok) {
                const json = await res.json()
                toast.error(json.error ?? "Failed to save description")
                return
            }
            toast.success("Description updated")
            setEditingDesc(false)
            onDescriptionUpdated?.()
        } finally {
            setSavingDesc(false)
        }
    }

    return (
        <div className="rounded-3xl border bg-muted/30 px-4 py-6 lg:px-6 lg:py-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                    <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>

                    {/* Description — editable for admins */}
                    {editingDesc ? (
                        <div className="space-y-1.5">
                            <Textarea
                                value={draftDesc}
                                onChange={e => setDraftDesc(e.target.value)}
                                placeholder="Add a description..."
                                className="text-sm min-h-[64px] resize-none"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <Button size="sm" onClick={saveDescription} disabled={savingDesc} className="h-7 text-xs px-3">
                                    {savingDesc ? "Saving…" : "Save"}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setEditingDesc(false); setDraftDesc(description ?? "") }} className="h-7 text-xs px-3">
                                    <X className="w-3 h-3 mr-1" /> Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-1.5 group/desc">
                            {description ? (
                                <p className="text-sm text-muted-foreground">{description}</p>
                            ) : isAdmin ? (
                                <p className="text-sm text-muted-foreground/50 italic">No description — click to add one</p>
                            ) : null}
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={() => setEditingDesc(true)}
                                    className="opacity-0 group-hover/desc:opacity-100 transition-opacity shrink-0 mt-0.5 text-muted-foreground hover:text-foreground"
                                    aria-label="Edit description"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="gap-1">
                            {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            {isPublic ? "Public" : "Private"}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                            <Users className="w-3 h-3" /> {memberCount} members
                        </Badge>
                        <Badge variant="outline">
                            {daysLeft}d left this month
                        </Badge>
                    </div>
                    {/* Invite code below info */}
                    <div className="flex items-center gap-2 pt-1">
                        <div className="bg-muted/50 rounded-lg px-4 py-2 font-mono text-sm tracking-widest font-semibold min-w-[120px]">
                            {codeVisible ? inviteCode : "••••••"}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setCodeVisible(v => !v)} aria-label={codeVisible ? "Hide code" : "Show code"}>
                            {codeVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button variant="outline" size="icon" onClick={copyCode} aria-label="Copy invite code">
                            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
                <div className="flex flex-col shrink-0 justify-start items-end">
                    {renderMetricCluster(metrics)}
                </div>
            </div>
        </div>
    )
}
