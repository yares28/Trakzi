"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface RoomHeaderProps {
    name: string
    description: string | null
    inviteCode: string
    memberCount: number
}

export function RoomHeader({ name, description, inviteCode, memberCount }: RoomHeaderProps) {
    const [copied, setCopied] = useState(false)

    const copyCode = () => {
        navigator.clipboard.writeText(inviteCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="rounded-3xl border bg-muted/30 px-6 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
                    {description && (
                        <p className="text-muted-foreground">{description}</p>
                    )}
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">{memberCount} members</Badge>
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
