"use client"

import { useState } from "react"
import { Copy, Check, Pencil, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { demoFetch } from "@/lib/demo/demo-fetch"

interface RoomHeaderProps {
    name: string
    description: string | null
    inviteCode: string
    memberCount: number
    roomId?: string
    isAdmin?: boolean
    onDescriptionUpdated?: () => void
}

export function RoomHeader({ name, description, inviteCode, memberCount, roomId, isAdmin, onDescriptionUpdated }: RoomHeaderProps) {
    const [copied, setCopied] = useState(false)
    const [editingDesc, setEditingDesc] = useState(false)
    const [draftDesc, setDraftDesc] = useState(description ?? "")
    const [savingDesc, setSavingDesc] = useState(false)

    const copyCode = () => {
        navigator.clipboard.writeText(inviteCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const saveDescription = async () => {
        if (!roomId) return
        setSavingDesc(true)
        try {
            const res = await demoFetch(`/api/rooms/${roomId}`, {
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
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => { setEditingDesc(false); setDraftDesc(description ?? "") }}
                                    className="h-7 text-xs px-3"
                                >
                                    <X className="w-3 h-3 mr-1" /> Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-1.5 group/desc">
                            {description ? (
                                <p className="text-muted-foreground text-sm">{description}</p>
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

                    <div className="flex items-center gap-2">
                        <Badge variant="outline">{memberCount} members</Badge>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
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
