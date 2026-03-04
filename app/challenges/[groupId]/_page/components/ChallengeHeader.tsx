"use client"

import { useState } from "react"
import { Copy, Check, Globe, Lock, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ChallengeMetric } from "@/lib/types/challenges"

const METRIC_LABELS: Record<ChallengeMetric, string> = {
    savingsRate: "Savings Rate",
    financialHealth: "Financial Health",
    fridgeScore: "Healthy Fridge",
    wantsPercent: "Frugality",
}

interface ChallengeHeaderProps {
    name: string
    isPublic: boolean
    inviteCode: string
    memberCount: number
    daysLeft: number
    metrics: ChallengeMetric[]
}

export function ChallengeHeader({ name, isPublic, inviteCode, memberCount, daysLeft, metrics }: ChallengeHeaderProps) {
    const [copied, setCopied] = useState(false)

    const copyCode = () => {
        navigator.clipboard.writeText(inviteCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="rounded-3xl border bg-muted/30 px-4 py-6 lg:px-6 lg:py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
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
                    <div className="flex gap-1.5 flex-wrap mt-1">
                        {metrics.map(m => (
                            <Badge key={m} variant="secondary" className="text-xs">
                                {METRIC_LABELS[m]}
                            </Badge>
                        ))}
                    </div>
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
    )
}
