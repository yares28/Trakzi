"use client"

import { useState } from "react"
import { Copy, Check, Globe, Lock, Users, PiggyBank, HeartPulse, Apple, ShoppingBag } from "lucide-react"

import { cn } from "@/lib/utils"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ChallengeMetric } from "@/lib/types/challenges"

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
}

export function ChallengeHeader({ name, description, isPublic, inviteCode, memberCount, daysLeft, metrics }: ChallengeHeaderProps) {
    const [copied, setCopied] = useState(false)

    const copyCode = () => {
        navigator.clipboard.writeText(inviteCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="rounded-3xl border bg-muted/30 px-4 py-6 lg:px-6 lg:py-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
                    {description && (
                        <p className="text-sm text-muted-foreground">{description}</p>
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
                </div>
                <div className="flex flex-col items-end gap-3 h-full justify-between">
                    <div className="flex flex-col shrink-0 justify-end items-end">
                        {renderMetricCluster(metrics)}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="bg-muted/50 rounded-lg px-4 py-2 font-mono text-sm tracking-widest font-semibold">
                            {inviteCode}
                        </div>
                        <Button variant="outline" size="icon" onClick={copyCode}>
                            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
