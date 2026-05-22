"use client"

import { useState } from "react"
import { LogIn } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import { demoFetch } from "@/lib/demo/demo-fetch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface JoinRoomDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function JoinRoomDialog({ open, onOpenChange }: JoinRoomDialogProps) {
    const [code, setCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const queryClient = useQueryClient()

    const handleSubmit = async () => {
        if (code.length !== 6) return
        setLoading(true)
        setError(null)

        try {
            const res = await demoFetch('/api/rooms/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invite_code: code }),
            })

            if (res.ok) {
                queryClient.invalidateQueries({ queryKey: ["friends-bundle"] })
                onOpenChange(false)
                setCode("")
            } else {
                const data = await res.json()
                setError(data.error || 'Invalid invite code')
            }
        } catch {
            setError('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setError(null); setCode("") } }}>
            <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LogIn className="w-5 h-5" /> Join Group
                    </DialogTitle>
                    <DialogDescription>
                        Enter the 6-character invite code to join a group.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <Label>Invite code</Label>
                        <Input
                            placeholder="ABC123"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                            maxLength={6}
                            className="font-mono text-2xl tracking-[0.4em] text-center h-14"
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        />
                    </div>

                    {error && (
                        <div className="bg-rose-500/10 text-rose-500 p-3 rounded-lg text-sm">{error}</div>
                    )}

                    <Button className="w-full" onClick={handleSubmit} disabled={loading || code.length !== 6}>
                        {loading ? "Joining..." : "Join Group"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
