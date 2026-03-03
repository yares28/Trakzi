"use client"

import { useState } from "react"
import { Users } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

import RankingsTab from "./components/RankingsTab"
import GroupsTab from "./components/GroupsTab"
import FriendsTab from "./components/FriendsTab"
import ChallengesTab from "./components/ChallengesTab"
import { FriendsLayout } from "./components/FriendsLayout"

export type FriendsViewMode = "rankings" | "friends" | "groups" | "challenges"

const TAB_CONFIG: { key: FriendsViewMode; label: string; description: string }[] = [
    { key: "rankings", label: "Rankings", description: "Compare your financial progress with friends and climb the ranks." },
    { key: "friends", label: "Friends", description: "Manage your friends, pending requests, and view recent activity." },
    { key: "groups", label: "Rooms", description: "Manage your shared rooms, split expenses, and settle up instantly." },
    { key: "challenges", label: "Challenges", description: "Compete with friends on spending goals and build better habits." },
]

export default function FriendsPage() {
    const [viewMode, setViewMode] = useState<FriendsViewMode>("rankings")

    const activeTab = TAB_CONFIG.find(t => t.key === viewMode)!

    return (
        <FriendsLayout>
            <div className="flex h-full w-full flex-col font-mono font-medium">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    {/* Top Intro Card */}
                    <section className="px-4 lg:px-6 pt-4">
                        <div className="flex flex-col justify-between gap-4 rounded-3xl border bg-muted/30 px-6 py-6 lg:flex-row lg:items-center">
                            <div className="space-y-2">
                                <Badge variant="outline" className="gap-1 px-3 py-1 text-sm bg-background border-muted-foreground/20 text-foreground">
                                    <Users className="size-4 text-primary" />
                                    {activeTab.label}
                                </Badge>
                                <h1 className="text-3xl font-semibold tracking-tight">
                                    {activeTab.label}
                                </h1>
                                <p className="text-muted-foreground max-w-2xl">
                                    {activeTab.description}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Pill-shaped Tab Switcher */}
                    <section className="px-4 lg:px-6">
                        <div className="flex justify-center">
                            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/50 border">
                                {TAB_CONFIG.map(tab => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setViewMode(tab.key)}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                                            viewMode === tab.key
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Main Content Area */}
                    <div className="flex flex-col gap-4 py-2 pb-10 md:gap-6 md:py-4 h-full">
                        {viewMode === "rankings" && <RankingsTab />}
                        {viewMode === "friends" && <FriendsTab />}
                        {viewMode === "groups" && <GroupsTab />}
                        {viewMode === "challenges" && <ChallengesTab />}
                    </div>
                </div>
            </div>
        </FriendsLayout>
    )
}
