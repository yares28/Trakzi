"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { AnimatePresence, MotionConfig, motion } from "framer-motion"
import { X, Lock, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useDemoMode } from "@/lib/demo/demo-context"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useTheme } from "next-themes"

// ── helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
}

/** Deterministic mock stats seeded from the user name */
function getMockStats(name: string) {
    let h = 0
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
    const s = (v: number, lo: number, hi: number) => lo + (Math.abs(v) % (hi - lo))
    return {
        savingsRate: s(h, 8, 42),
        spendingRate: 100 - s(h, 8, 42),
        financialHealth: s(h >> 3, 55, 95),
        fridgeScore: s(h >> 6, 40, 100),
        wantsPercent: s(h >> 4, 12, 55),
        streak: s(h >> 9, 1, 30),
    }
}

// ── types ────────────────────────────────────────────────────────────────────

export interface ProfileModalUser {
    id: string | number
    name: string
    username?: string
    avatar?: string | null
    color?: string
    isPrivate?: boolean
    stats?: {
        savingsRate?: number
        spendingRate?: number
        financialHealth?: number
        fridgeScore?: number
        wantsPercent?: number
        streak?: number
    }
}

interface ProfileModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: ProfileModalUser | null
    onInvite?: (userId: string | number) => void
}

// ── Avatar content helper ────────────────────────────────────────────────────

function AvatarContent({
    hasImage,
    avatar,
    name,
    bgColor,
    initials,
    textSize,
}: {
    hasImage: boolean
    avatar?: string | null
    name: string
    bgColor: string
    initials: string
    textSize?: string
}) {
    if (hasImage) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={avatar!}
                alt={name}
                className="pointer-events-none h-full w-full object-cover"
            />
        )
    }
    return (
        <div
            className="flex items-center justify-center h-full w-full select-none"
            style={{ backgroundColor: bgColor }}
        >
            <span className={cn("text-white font-bold", textSize || "text-2xl")}>
                {initials}
            </span>
        </div>
    )
}

// ── Mini Activity Rings ──────────────────────────────────────────────────────

interface RingDatum {
    label: string
    value: number // 0-100 percentage
    color: string
}

function MiniActivityRings({ rings }: { rings: RingDatum[] }) {
    const { resolvedTheme } = useTheme()
    const isDark = resolvedTheme === "dark"
    const trackColor = isDark ? "#374151cc" : "#e5e7ebff"
    const [animated, setAnimated] = useState(false)
    const [hoveredRing, setHoveredRing] = useState<number | null>(null)
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
    const svgRef = useRef<SVGSVGElement>(null)

    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 50)
        return () => clearTimeout(t)
    }, [])

    const size = 240
    const center = size / 2
    const ringWidth = 14
    const gap = 6
    const baseRadius = 32

    const handleMouseMove = (e: React.MouseEvent, i: number) => {
        if (!svgRef.current) return
        const rect = svgRef.current.getBoundingClientRect()
        setTooltipPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        })
        setHoveredRing(i)
    }

    return (
        <div className="relative w-full max-w-full flex items-center justify-center">
            <svg
                ref={svgRef}
                viewBox={`0 0 ${size} ${size}`}
                className="w-full max-w-full aspect-square px-2"
                onMouseLeave={() => setHoveredRing(null)}
            >
                {rings.map((ring, i) => {
                    const radius = baseRadius + (rings.length - 1 - i) * (ringWidth + gap)
                    const circumference = 2 * Math.PI * radius
                    const clamped = Math.max(0, Math.min(1, ring.value / 100))
                    const dashOffset = circumference * (1 - clamped)
                    const isHovered = hoveredRing === i
                    const isOtherHovered = hoveredRing !== null && hoveredRing !== i

                    return (
                        <g key={ring.label}>
                            {/* Track */}
                            <circle
                                cx={center}
                                cy={center}
                                r={radius}
                                fill="none"
                                stroke={trackColor}
                                strokeWidth={ringWidth}
                                strokeLinecap="round"
                            />
                            {/* Value arc */}
                            <circle
                                cx={center}
                                cy={center}
                                r={radius}
                                fill="none"
                                stroke={ring.color}
                                strokeWidth={ringWidth}
                                strokeDasharray={circumference}
                                strokeDashoffset={animated ? dashOffset : circumference}
                                strokeLinecap="round"
                                transform={`rotate(-90 ${center} ${center})`}
                                onMouseMove={(e) => handleMouseMove(e, i)}
                                style={{
                                    cursor: "pointer",
                                    transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke-width 0.2s, opacity 0.2s",
                                    strokeWidth: isHovered ? ringWidth + 2 : ringWidth,
                                    opacity: isOtherHovered ? 0.6 : 1,
                                }}
                            />
                        </g>
                    )
                })}
            </svg>

            {hoveredRing !== null && (
                <div
                    className="pointer-events-none absolute z-50 border border-border/50 bg-background/95 backdrop-blur-sm shadow-xl rounded-lg px-2.5 py-1.5 text-xs animate-in fade-in-0 zoom-in-95 duration-200"
                    style={{
                        left: `${tooltipPos.x + 10}px`,
                        top: `${tooltipPos.y - 10}px`,
                        transform: "translate(-50%, -100%)",
                    }}
                >
                    <div className="font-medium text-foreground">{rings[hoveredRing].label}</div>
                    <div className="flex items-center gap-2 mt-1">
                        <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: rings[hoveredRing].color }}
                        />
                        <span className="text-muted-foreground">Score:</span>
                        <span className="font-mono font-medium tabular-nums">{rings[hoveredRing].value}%</span>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── component ────────────────────────────────────────────────────────────────

export function ProfileModal({ open, onOpenChange, user, onInvite }: ProfileModalProps) {
    const { isDemoMode } = useDemoMode()
    const { getPalette } = useColorScheme()
    const [expand, setExpand] = useState(false)

    const handleOpenChange = (val: boolean) => {
        if (!val) setExpand(false)
        onOpenChange(val)
    }

    // Pick palette accent colors
    const palette = getPalette()
    const colors = useMemo(() => {
        const p = palette
        const pick = (frac: number) => p[Math.floor(p.length * frac)] || p[Math.floor(p.length / 2)]
        return {
            c1: pick(0.3),
            c2: pick(0.5),
            c3: pick(0.65),
            c4: pick(0.8),
        }
    }, [palette])

    if (!user) return null

    const hasImage = !!(user.avatar && user.avatar.length > 0)
    const bgColor = user.color || colors.c2
    const initials = getInitials(user.name)
    const username = user.username || `@${user.name.toLowerCase().replace(/\s+/g, "")}`

    const stats = isDemoMode ? getMockStats(user.name) : user.stats
    const isPrivate = !isDemoMode && user.isPrivate

    // Build ring data from stats
    const ringData: RingDatum[] | null = stats
        ? [
            { label: "Savings", value: stats.savingsRate ?? 0, color: colors.c1 },
            { label: "Health", value: stats.financialHealth ?? 0, color: colors.c2 },
            { label: "Fridge", value: stats.fridgeScore ?? 0, color: colors.c3 },
            { label: "Frugality", value: 100 - (stats.wantsPercent ?? 0), color: colors.c4 },
        ]
        : null

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[380px] p-0 overflow-hidden border-border/50 bg-card backdrop-blur-xl rounded-2xl sm:rounded-3xl [&>button:last-child]:hidden">
                <div className="sr-only">
                    <DialogTitle>{user.name}&apos;s Profile</DialogTitle>
                    <DialogDescription>View {user.name}&apos;s profile details.</DialogDescription>
                </div>

                {/* ── Close button ── */}
                <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-3 top-3 z-50 h-8 w-8 rounded-xl border-border/80 bg-background/90 shadow-md backdrop-blur-sm hover:scale-105 hover:bg-primary/10 hover:border-primary/30 hover:shadow-lg transition-all [&_svg]:size-4"
                    onClick={() => handleOpenChange(false)}
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Close</span>
                </Button>

                <MotionConfig
                    transition={{
                        duration: 0.4,
                        type: "spring",
                        bounce: 0.2,
                    }}
                >
                    {/* ── Header with expandable avatar ── */}
                    <motion.div
                        layout
                        style={{ aspectRatio: expand ? "1/1" : undefined }}
                        className={cn(
                            "relative isolate flex flex-col",
                            expand
                                ? "mt-0 items-start justify-end p-4"
                                : "mt-0 items-center justify-center pt-8 pb-4 px-6"
                        )}
                    >
                        <motion.button
                            layoutId="profile-avatar"
                            className="relative flex aspect-square w-20 items-center justify-center overflow-hidden cursor-pointer mb-3"
                            onClick={() => setExpand(!expand)}
                            style={{ borderRadius: 40 }}
                        >
                            <AvatarContent
                                hasImage={hasImage}
                                avatar={user.avatar}
                                name={user.name}
                                bgColor={bgColor}
                                initials={initials}
                                textSize="text-2xl"
                            />
                        </motion.button>

                        <motion.div
                            layout
                            className={cn(
                                "relative z-20 flex flex-col",
                                expand ? "items-start" : "items-center"
                            )}
                        >
                            <motion.h3
                                layout
                                className="text-lg font-semibold"
                                animate={{ color: expand ? "#ffffff" : "var(--foreground)" }}
                            >
                                {user.name}
                            </motion.h3>
                            <motion.p
                                layout
                                className="text-sm"
                                animate={{ color: expand ? "rgba(255,255,255,0.7)" : "var(--muted-foreground)" }}
                            >
                                {username}
                            </motion.p>
                        </motion.div>

                        {!expand && (
                            <div className="mt-3 w-12 h-0.5 rounded-full" style={{ backgroundColor: bgColor }} />
                        )}

                        <AnimatePresence>
                            {expand && (
                                <motion.button
                                    layoutId="profile-avatar"
                                    className="absolute inset-0 -z-10 aspect-square overflow-hidden cursor-pointer"
                                    style={{ borderRadius: 0 }}
                                    onClick={() => setExpand(false)}
                                >
                                    <AvatarContent
                                        hasImage={hasImage}
                                        avatar={user.avatar}
                                        name={user.name}
                                        bgColor={bgColor}
                                        initials={initials}
                                        textSize="text-6xl"
                                    />
                                    <motion.div className="absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t from-black/50 to-transparent" />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </MotionConfig>

                {/* ── Stats area ── */}
                <div className="px-5 pb-5">
                    {isPrivate ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <Lock className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">Private Profile</p>
                            <p className="text-xs text-muted-foreground/70 max-w-[200px]">
                                This user has chosen to keep their financial data private.
                            </p>
                        </div>
                    ) : stats && ringData ? (
                        <div className="space-y-4">
                            {/* ── Activity Rings (centered) ── */}
                            <div className="flex flex-col items-center gap-3">
                                <MiniActivityRings rings={ringData} />
                                {/* Legend row */}
                                <div className="flex items-center justify-center gap-4 flex-wrap">
                                    {ringData.map((ring) => (
                                        <div key={ring.label} className="flex items-center gap-1.5">
                                            <div
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: ring.color }}
                                            />
                                            <span className="text-[10px] text-muted-foreground">{ring.label}</span>
                                            <span className="text-[10px] font-semibold tabular-nums">{ring.value}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Dashboard-style stat cards ── */}
                            <div className="grid grid-cols-3 gap-2">
                                <MiniStatCard label="Savings" value={`${stats.savingsRate ?? 0}%`} color={colors.c1} />
                                <MiniStatCard label="Spending" value={`${stats.spendingRate ?? 0}%`} color={colors.c2} />
                                <MiniStatCard label="Streak" value={`${stats.streak ?? 0}d`} color={colors.c3} />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground">No stats available</p>
                        </div>
                    )}
                    {onInvite && user && (
                        <Button
                            className="w-full mt-3 gap-2"
                            variant="outline"
                            onClick={() => onInvite(user.id)}
                        >
                            <UserPlus className="w-4 h-4" /> Add Friend
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ── Mini stat card ───────────────────────────────────────────────────────────

function MiniStatCard({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div className="relative overflow-hidden rounded-xl bg-muted/30 border border-border/20 px-3 py-2.5">
            {/* Subtle accent glow (like dashboard cards) */}
            <div
                className="absolute -top-4 -right-4 w-10 h-10 rounded-full blur-xl opacity-20"
                style={{ backgroundColor: color }}
            />
            <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground block">{label}</span>
            <span className="text-base font-bold tabular-nums block mt-0.5">{value}</span>
        </div>
    )
}
