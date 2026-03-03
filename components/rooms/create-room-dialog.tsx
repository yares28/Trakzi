"use client"

import { useState } from "react"
import { Home } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import { demoFetch } from "@/lib/demo/demo-fetch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface CreateRoomDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CreateRoomDialog({ open, onOpenChange }: CreateRoomDialogProps) {
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const queryClient = useQueryClient()

    const handleSubmit = async () => {
        if (!name.trim()) return
        setLoading(true)
        setError(null)

        try {
            const res = await demoFetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || undefined,
                }),
            })

            if (res.ok) {
                queryClient.invalidateQueries({ queryKey: ["friends-bundle"] })
                onOpenChange(false)
                setName(""); setDescription("")
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to create group')
            }
        } catch {
            setError('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setError(null) }}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Home className="w-5 h-5" /> Create Group
                    </DialogTitle>
                    <DialogDescription>
                        Create a room to split expenses with friends.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <Label>Group name</Label>
                        <Input
                            placeholder="e.g., Apartment 4B"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Description (optional)</Label>
                        <Input
                            placeholder="What's this group for?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="bg-rose-500/10 text-rose-500 p-3 rounded-lg text-sm">{error}</div>
                    )}

                    <Button className="w-full" onClick={handleSubmit} disabled={loading || !name.trim()}>
                        {loading ? "Creating..." : "Create Group"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
