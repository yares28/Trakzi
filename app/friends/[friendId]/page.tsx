"use client"

import { use, useMemo, type ReactNode } from "react"
import { ArrowLeft, PiggyBank, Heart, TrendingUp, ShoppingBag, Trophy } from "lucide-react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FriendsLayout } from "@/app/friends/components/FriendsLayout"
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useFriendsBundleData } from "@/hooks/use-friends-bundle"
import { useCurrency } from "@/components/currency-provider"
import type { FriendScore } from "@/lib/charts/friends-aggregations"

const METRIC_LABELS: { key: keyof FriendScore; label: string; icon: ReactNode }[] = [
    { key: "savingsRate", label: "Savings Rate", icon: <PiggyBank className="w-3.5 h-3.5" /> },
    { key: "financialHealth", label: "Financial Health", icon: <Heart className="w-3.5 h-3.5" /> },
    { key: "fridgeScore", label: "Healthy Fridge", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { key: "wantsPercent", label: "Frugality", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
    { key: "overallScore", label: "Overall Score", icon: <Trophy className="w-3.5 h-3.5" /> },
]

export default function FriendProfilePage({ params }: { params: Promise<{ friendId: string }> }) {
    const { friendId } = use(params)
    const { data: bundleData, isLoading, isError } = useFriendsBundleData()
    const router = useRouter()
    const { formatCurrency } = useCurrency()

    const friendData = useMemo(() => {
        if (!bundleData) return null
        const friendScore = bundleData.friends?.find(
            (f: FriendScore) => f.id === friendId
        ) as FriendScore | undefined
        const friendBalance = bundleData.friendsList?.find(
            f => f.friendship_id === friendId
        )
        return { score: friendScore, balance: friendBalance }
    }, [bundleData, friendId])

    return (
        <FriendsLayout>
            <div className="max-w-3xl mx-auto font-mono font-medium space-y-6 px-3 sm:px-0">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => router.push('/friends')}
                >
                    <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back to Friends</span>
                </Button>

                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                )}

                {!isLoading && isError && (
                    <div className="text-center py-20 text-muted-foreground">
                        <p>Couldn&apos;t load this profile right now.</p>
                        <Button variant="outline" className="mt-4" onClick={() => router.push('/friends')}>
                            Go Back
                        </Button>
                    </div>
                )}

                {!isLoading && !isError && !friendData?.score && (
                    <div className="text-center py-20 text-muted-foreground">
                        <p>Friend not found.</p>
                        <Button variant="outline" className="mt-4" onClick={() => router.push('/friends')}>
                            Go Back
                        </Button>
                    </div>
                )}

                {friendData?.score && (
                    <div className="space-y-6">
                        {/* Profile Header */}
                        <Card className="rounded-3xl border bg-muted/30">
                            <CardContent className="p-4 lg:p-6 flex items-center gap-4">
                                <Avatar className="w-16 h-16 border-2 border-border/50">
                                    <AvatarFallback className="text-xl font-bold">
                                        {friendData.score.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <h1 className="text-2xl font-semibold">{friendData.score.name}</h1>
                                </div>
                                {friendData.score.isPrivate ? (
                                    <Badge variant="secondary" className="text-sm">Private</Badge>
                                ) : (
                                    <div className="text-right">
                                        <p className="text-3xl font-bold">{friendData.score.overallScore}</p>
                                        <p className="text-xs text-muted-foreground">Overall Score</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Balance Card */}
                        {friendData.balance && (
                            <Card className="rounded-3xl">
                                <CardHeader className="pb-3">
                                    <CardDescription>Balance with {friendData.score.name}</CardDescription>
                                    <CardTitle className={cn(
                                        "text-3xl tabular-nums",
                                        friendData.balance.net_balance > 0 ? "text-emerald-500" :
                                        friendData.balance.net_balance < 0 ? "text-rose-500" :
                                        ""
                                    )}>
                                        {formatCurrency(friendData.balance.net_balance, { showSign: true })}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        {friendData.balance.net_balance > 0
                                            ? `${friendData.score.name} owes you`
                                            : friendData.balance.net_balance < 0
                                            ? `You owe ${friendData.score.name}`
                                            : "All settled up!"}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Comparative Metrics */}
                        {!friendData.score.isPrivate && (
                            <Card className="rounded-3xl border-border/40 bg-white/5 dark:bg-black/20 backdrop-blur-xl overflow-hidden">
                                <div className="px-6 py-4 border-b border-border/40">
                                    <h3 className="text-lg font-semibold">How you compare</h3>
                                </div>
                                <CardContent className="p-6 space-y-5">
                                    {METRIC_LABELS.map(metric => {
                                        const friendVal = friendData.score![metric.key] as number
                                        const myScore = bundleData?.friends?.find(
                                            (f: FriendScore) => f.name === "You"
                                        ) as FriendScore | undefined
                                        const myVal = (myScore?.[metric.key] as number) ?? 0

                                        return (
                                            <div key={metric.key} className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground flex items-center gap-1.5">{metric.icon} {metric.label}</span>
                                                    <span className="font-medium">
                                                        <span className="text-primary">{myVal}%</span>
                                                        {" vs "}
                                                        <span>{friendVal}%</span>
                                                    </span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Progress value={myVal} max={100} className="h-2 flex-1" />
                                                    <Progress value={friendVal} max={100} className="h-2 flex-1 [&>div]:bg-muted-foreground" />
                                                </div>
                                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                                    <span>You</span>
                                                    <span>{friendData.score!.name}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </FriendsLayout>
    )
}
