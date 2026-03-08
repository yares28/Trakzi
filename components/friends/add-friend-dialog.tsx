"use client"

import { useState } from "react"
import { Search, Copy, Check, Share2, Hash, Mail } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { demoFetch } from "@/lib/demo/demo-fetch"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface AddFriendDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function AddFriendDialog({ open, onOpenChange }: AddFriendDialogProps) {
    const [email, setEmail] = useState("")
    const [friendCode, setFriendCode] = useState("")
    const [myCode, setMyCode] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null)
    const queryClient = useQueryClient()

    const handleEmailSearch = async () => {
        if (!email.trim()) return
        setLoading(true)
        setResult(null)
        try {
            const res = await demoFetch('/api/friends/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            })
            const data = await res.json()

            if (!res.ok) {
                setResult({ success: false, message: data.error || 'User not found' })
                return
            }

            // Send friend request — API wraps result in { success, data: { user_id, display_name } }
            const target = data.data
            const reqRes = await demoFetch('/api/friends/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: target.user_id }),
            })
            const reqData = await reqRes.json()

            if (reqRes.ok) {
                setResult({ success: true, message: `Friend request sent to ${target.display_name}!` })
                queryClient.invalidateQueries({ queryKey: ["friends-bundle"] })
            } else if (reqRes.status === 409) {
                // Friendship already exists — invalidate cache so UI reflects it
                queryClient.invalidateQueries({ queryKey: ["friends-bundle"] })
                setResult({ success: true, message: reqData.error || 'You are already friends!' })
            } else {
                setResult({ success: false, message: reqData.error || 'Failed to send request' })
            }
        } catch {
            setResult({ success: false, message: 'Something went wrong' })
        } finally {
            setLoading(false)
        }
    }

    const handleCodeAdd = async () => {
        if (!friendCode.trim()) return
        setLoading(true)
        setResult(null)
        try {
            const res = await demoFetch('/api/friends/add-by-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: friendCode.trim() }),
            })
            const data = await res.json()

            if (res.ok) {
                setResult({ success: true, message: 'Friend request sent!' })
                queryClient.invalidateQueries({ queryKey: ["friends-bundle"] })
            } else if (res.status === 409) {
                queryClient.invalidateQueries({ queryKey: ["friends-bundle"] })
                setResult({ success: true, message: data.error || 'You are already friends!' })
            } else {
                setResult({ success: false, message: data.error || 'Invalid code' })
            }
        } catch {
            setResult({ success: false, message: 'Something went wrong' })
        } finally {
            setLoading(false)
        }
    }

    const fetchMyCode = async () => {
        try {
            const res = await demoFetch('/api/friends/my-code')
            const data = await res.json()
            if (res.ok) setMyCode(data.data?.code ?? data.code)
        } catch { /* swallow */ }
    }

    const copyCode = () => {
        if (!myCode) return
        navigator.clipboard.writeText(myCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setResult(null); setEmail(""); setFriendCode("") } }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Friend</DialogTitle>
                    <DialogDescription>Find friends by email, enter their code, or share yours.</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="email" className="mt-2">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="email" className="gap-1.5 text-xs"><Mail className="w-3.5 h-3.5" /> Email</TabsTrigger>
                        <TabsTrigger value="code" className="gap-1.5 text-xs"><Hash className="w-3.5 h-3.5" /> Code</TabsTrigger>
                        <TabsTrigger value="qr" className="gap-1.5 text-xs" onClick={fetchMyCode}><Share2 className="w-3.5 h-3.5" /> Share</TabsTrigger>
                    </TabsList>

                    <TabsContent value="email" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>Email address</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="friend@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleEmailSearch()}
                                />
                                <Button onClick={handleEmailSearch} disabled={loading || !email.trim()}>
                                    <Search className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="code" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>Friend code</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="ABCD-EFGH"
                                    value={friendCode}
                                    onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                                    maxLength={9}
                                    className="font-mono tracking-widest text-center"
                                    onKeyDown={(e) => e.key === 'Enter' && handleCodeAdd()}
                                />
                                <Button onClick={handleCodeAdd} disabled={loading || !friendCode.trim()}>
                                    Add
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="qr" className="space-y-4 mt-4">
                        <div className="text-center space-y-4">
                            <p className="text-sm text-muted-foreground">Share this code with friends so they can add you.</p>
                            {myCode ? (
                                <div className="space-y-3">
                                    <div className="bg-muted/50 rounded-xl p-6 font-mono text-2xl tracking-[0.3em] font-bold">
                                        {myCode}
                                    </div>
                                    <Button variant="outline" className="gap-2" onClick={copyCode}>
                                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                        {copied ? "Copied!" : "Copy Code"}
                                    </Button>
                                </div>
                            ) : (
                                <div className="animate-pulse bg-muted/50 rounded-xl h-20" />
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Result feedback */}
                {result && (
                    <div className={`mt-2 p-3 rounded-lg text-sm ${result.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {result.message}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
