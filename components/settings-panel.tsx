"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
import {
    IconSun,
    IconMoon,
    IconCoin,
    IconCalendar,
    IconLayoutGrid,
    IconCrown,
    IconBug,
    IconPalette,
    IconCreditCard,
    IconExternalLink,
    IconX,
    IconCheck,
} from "@tabler/icons-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useColorScheme, colorPalettes } from "@/components/color-scheme-provider"
import { useCurrency, currencies } from "@/components/currency-provider"
import { useDateFilter } from "@/components/date-filter-provider"
import { useUserPreferences } from "@/components/user-preferences-provider"
import { PlanCard } from "@/components/subscription-dialog/PlanCard"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { PlanType, SubscriptionStatus } from "@/components/subscription-dialog/types"
import { AnimatedThemeSwitcher } from "@/components/animated-theme-switcher"
import { useIsMobile } from "@/hooks/use-mobile"

type SettingsSection = "preferences" | "subscription" | "bug-report"

interface SettingsPanelProps {
    children: React.ReactNode
}

const sidebarItems: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: "preferences", label: "Preferences", icon: <IconPalette className="size-4" /> },
    { id: "subscription", label: "Subscription", icon: <IconCrown className="size-4" /> },
    { id: "bug-report", label: "Bug Report", icon: <IconBug className="size-4" /> },
]

// Color palette display with gradients
const paletteInfo: { id: string; label: string; enabled: boolean }[] = [
    { id: "sunset", label: "Sunset", enabled: true },
    { id: "dark", label: "Dark", enabled: false },
    { id: "colored", label: "Colored", enabled: false },
    { id: "gold", label: "Gold", enabled: false },
    { id: "aqua", label: "Aqua", enabled: false },
    { id: "dull", label: "Dull", enabled: false },
    { id: "dry", label: "Dry", enabled: false },
    { id: "greens", label: "Greens", enabled: false },
    { id: "chrome", label: "Chrome", enabled: false },
    { id: "beach", label: "Beach", enabled: false },
    { id: "jolly", label: "Jolly", enabled: false },
    { id: "gothic", label: "Gothic", enabled: false },
]

// Date filter options
const timeFilterOptions = [
    { value: "last7days", label: "Last 7 Days", mobileVisible: true },
    { value: "last30days", label: "Last 30 Days", mobileVisible: true },
    { value: "last3months", label: "Last 3 Months", mobileVisible: true },
    { value: "last6months", label: "Last 6 Months", mobileVisible: true },
    { value: "lastyear", label: "Last Year", mobileVisible: false },
    { value: "ytd", label: "Year to Date", mobileVisible: false },
]

export function SettingsPanel({ children }: SettingsPanelProps) {
    const [open, setOpen] = React.useState(false)
    const [activeSection, setActiveSection] = React.useState<SettingsSection>("preferences")
    const isMobile = useIsMobile()

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className={cn(
                "p-0 gap-0 overflow-hidden [&>button]:hidden",
                isMobile
                    ? "!grid-cols-1 w-[90vw] max-w-[90vw] h-[75vh] max-h-[75vh] landscape:!w-[60vw] landscape:!max-w-[60vw] landscape:!h-[70vh] landscape:!max-h-[70vh] rounded-2xl flex flex-col"
                    : "max-w-[700px]"
            )}>
                <div className={cn(
                    "flex w-full overflow-hidden",
                    isMobile ? "flex-col h-full min-h-0" : "flex-row h-[500px]"
                )}>
                    {/* Mobile: minimal layout */}
                    {isMobile ? (
                        <>
                            {/* Header with section title and close button */}
                            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                                <span className="text-base font-semibold tracking-tight">
                                    {sidebarItems.find(item => item.id === activeSection)?.label || "Settings"}
                                </span>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                >
                                    <IconX className="h-5 w-5 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Wrapping tabs */}
                            <div className="flex flex-wrap gap-2 px-4 py-3 border-b shrink-0">
                                {sidebarItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveSection(item.id)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                                            activeSection === item.id
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground hover:bg-accent"
                                        )}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            {/* Content Area - scrollable */}
                            <main
                                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-4"
                                style={{
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: 'hsl(var(--muted-foreground) / 0.3) transparent'
                                }}
                            >
                                {activeSection === "preferences" && <PreferencesContent />}
                                {activeSection === "subscription" && <SubscriptionSection />}
                                {activeSection === "bug-report" && <BugReportSection />}
                            </main>
                        </>
                    ) : (
                        /* Desktop: Sidebar */
                        <>
                            <nav className="w-[200px] border-r bg-muted/30 flex flex-col">
                                <DialogHeader className="p-4 pb-2">
                                    <DialogTitle className="text-lg font-semibold tracking-tight">Settings</DialogTitle>
                                </DialogHeader>
                                <div className="flex-1 p-2 space-y-1">
                                    {sidebarItems.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveSection(item.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                                "hover:bg-accent hover:text-accent-foreground",
                                                activeSection === item.id
                                                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                                                    : "text-muted-foreground"
                                            )}
                                        >
                                            {item.icon}
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </nav>

                            {/* Content Area */}
                            <main
                                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6"
                                style={{
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: 'hsl(var(--muted-foreground) / 0.3) transparent'
                                }}
                            >
                                {activeSection === "preferences" && <PreferencesContent />}
                                {activeSection === "subscription" && <SubscriptionSection />}
                                {activeSection === "bug-report" && <BugReportSection />}
                            </main>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}


// ============ PREFERENCES CONTENT WRAPPER ============
function PreferencesContent() {
    return (
        <div className="space-y-10">
            <AppearanceSection />
            <FontsSection />
            <CurrencySection />
            <TimePeriodSection />
            <LayoutSection />
        </div>
    )
}

// ============ APPEARANCE SECTION ============
function AppearanceSection() {
    const { colorScheme, setColorScheme } = useColorScheme()

    return (
        <div className="space-y-8">
            {/* Theme */}
            <div className="space-y-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">Theme</span>
                <AnimatedThemeSwitcher />
            </div>

            {/* Color Palette */}
            <div className="space-y-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">Color Palette</span>
                <div className="grid grid-cols-3 gap-2.5">
                    {paletteInfo.map((palette) => {
                        const colors = colorPalettes[palette.id as keyof typeof colorPalettes]
                        const isSelected = colorScheme === palette.id
                        const isDisabled = !palette.enabled

                        return (
                            <button
                                key={palette.id}
                                disabled={isDisabled}
                                onClick={() => !isDisabled && setColorScheme(palette.id as any)}
                                className={cn(
                                    "group relative flex flex-col items-center gap-2 p-2.5 rounded-xl border transition-all duration-200",
                                    isSelected && "ring-2 ring-primary/80 border-primary/30 bg-primary/[0.03] shadow-sm",
                                    !isSelected && !isDisabled && "border-border/40 hover:border-border hover:shadow-sm",
                                    isDisabled && "opacity-35 cursor-not-allowed"
                                )}
                            >
                                <div
                                    className="w-full h-10 rounded-lg"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.slice(0, 6).join(", ")})`,
                                    }}
                                />
                                <span className={cn(
                                    "text-[11px] font-medium transition-colors",
                                    isSelected ? "text-primary" : "text-muted-foreground"
                                )}>
                                    {palette.label}
                                </span>
                                {isSelected && (
                                    <div className="absolute -top-1.5 -right-1.5 size-[18px] rounded-full bg-primary flex items-center justify-center shadow-sm">
                                        <IconCheck className="size-2.5 text-primary-foreground" strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Layout Shuffle */}
            <div className="space-y-3">
                <div>
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">Shuffle Layout</span>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                        Randomize the position of dashboard cards
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                    <button
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent("gridstack:randomize"))
                            toast.success("Analytics layout updated")
                        }}
                        className="group flex items-center justify-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-border transition-all duration-200"
                    >
                        <IconLayoutGrid className="size-3.5 opacity-50 group-hover:opacity-80 transition-opacity" />
                        Analytics
                    </button>
                    <button
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent("gridstack:randomize:fridge"))
                            toast.success("Fridge layout updated")
                        }}
                        className="group flex items-center justify-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-border transition-all duration-200"
                    >
                        <IconLayoutGrid className="size-3.5 opacity-50 group-hover:opacity-80 transition-opacity" />
                        Fridge
                    </button>
                </div>
            </div>
        </div>
    )
}

// ============ CURRENCY SECTION ============
function CurrencySection() {
    const { currency, setCurrency } = useCurrency()

    return (
        <div className="space-y-3">
            <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">Currency</span>
                <p className="text-[11px] text-muted-foreground/60 mt-1">
                    How monetary values are displayed
                </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
                {Object.entries(currencies).map(([code, config]) => {
                    const isSelected = currency === code
                    return (
                        <button
                            key={code}
                            onClick={() => setCurrency(code)}
                            className={cn(
                                "relative inline-flex items-center justify-center rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all duration-150",
                                isSelected
                                    ? "border-primary bg-primary/[0.06] text-primary"
                                    : "border-border/40 bg-muted/15 text-muted-foreground hover:border-border hover:bg-muted/30"
                            )}
                        >
                            <span className="font-semibold mr-1.5">{config.symbol}</span>
                            <span>{code}</span>
                        </button>
                    )
                })}
            </div>

            <div className="rounded-xl bg-muted/15 border border-border/30 px-4 py-2.5 text-center">
                <span className="text-[11px] text-muted-foreground/70">
                    Preview:{" "}
                    <span className="font-semibold text-foreground">
                        {currency === "EUR" ? "1,234.56 €" : currency === "GBP" ? "£1,234.56" : "$1,234.56"}
                    </span>
                </span>
            </div>
        </div>
    )
}

// ============ TIME PERIOD SECTION ============
function TimePeriodSection() {
    const { filter, setFilter } = useDateFilter()
    const isMobile = useIsMobile()

    const visibleOptions = isMobile
        ? timeFilterOptions.filter(o => o.mobileVisible)
        : timeFilterOptions

    const handleSetDefault = (value: string) => {
        setFilter(value)
        if (typeof window !== "undefined") {
            localStorage.setItem("default-time-period", value)
        }
        toast.success("Default time period updated", { description: `Set to ${timeFilterOptions.find(o => o.value === value)?.label}` })
    }

    return (
        <div className="space-y-3">
            <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">Default Time Period</span>
                <p className="text-[11px] text-muted-foreground/60 mt-1">
                    Date range for charts and analytics
                </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
                {visibleOptions.map((option) => {
                    const isSelected = filter === option.value
                    return (
                        <button
                            key={option.value}
                            onClick={() => handleSetDefault(option.value)}
                            className={cn(
                                "relative flex items-center justify-center rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all duration-200",
                                isSelected
                                    ? "border-primary bg-primary/10 text-primary font-semibold"
                                    : "border-border/40 bg-muted/15 text-muted-foreground hover:text-foreground hover:border-border/60"
                            )}
                        >
                            {option.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}


// ============ FONTS SECTION ============
const fontOptions = [
    { id: "geist-sans", label: "Geist Sans", description: "Clean, modern sans-serif", fontClass: "font-sans" },
    { id: "geist-mono", label: "Geist Mono", description: "Monospaced, technical feel", fontClass: "font-mono" },
] as const

function FontsSection() {
    const { preferences, updatePagePreferences } = useUserPreferences()
    const currentFont = preferences.settings?.font || "geist-sans"

    return (
        <div className="space-y-3">
            <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">Font</span>
                <p className="text-[11px] text-muted-foreground/60 mt-1">
                    Applied across all pages
                </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
                {fontOptions.map((option) => {
                    const isSelected = currentFont === option.id
                    return (
                        <button
                            key={option.id}
                            onClick={() => updatePagePreferences("settings", { font: option.id })}
                            className={cn(
                                "relative flex flex-col items-start rounded-xl border px-4 py-3 transition-all duration-150 text-left flex-1 min-w-[140px]",
                                isSelected
                                    ? "border-primary bg-primary/[0.06]"
                                    : "border-border/40 bg-muted/15 hover:border-border hover:bg-muted/30"
                            )}
                        >
                            <span className={cn("text-sm font-medium", option.fontClass, isSelected && "text-primary")}>
                                {option.label}
                            </span>
                            <span className={cn("text-[11px] text-muted-foreground/70 mt-0.5", option.fontClass)}>
                                {option.description}
                            </span>
                            {isSelected && (
                                <div className="absolute -top-1.5 -right-1.5 size-[18px] rounded-full bg-primary flex items-center justify-center shadow-sm">
                                    <IconCheck className="size-2.5 text-primary-foreground" strokeWidth={3} />
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>

            <div className="rounded-xl bg-muted/15 border border-border/30 px-4 py-2.5">
                <p className={cn(
                    "text-[11px] text-muted-foreground/70 text-center",
                    currentFont === "geist-mono" ? "font-mono" : "font-sans"
                )}>
                    Preview: <span className="font-semibold text-foreground">The quick brown fox jumps over $1,234.56</span>
                </p>
            </div>
        </div>
    )
}


// ============ LAYOUT SECTION ============
function LayoutSection() {
    const handleRandomize = () => {
        window.dispatchEvent(new CustomEvent("gridstack:randomize"))
        toast.success("Cards randomized!", { description: "The grid layout has been shuffled." })
    }

    const layoutOptions = [
        {
            id: "randomize",
            title: "Shuffle Layout",
            description: "Randomize card positions",
            icon: "🎲",
            action: handleRandomize,
            active: true,
        },
        {
            id: "compact",
            title: "Compact View",
            description: "Minimize card spacing",
            icon: "📦",
            action: () => toast.info("Coming soon!", { description: "Compact view will be available soon." }),
            active: false,
            soon: true,
        },
        {
            id: "reset",
            title: "Reset Default",
            description: "Restore original layout",
            icon: "↩️",
            action: () => toast.info("Coming soon!", { description: "Reset feature will be available soon." }),
            active: false,
            soon: true,
        },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-sm font-medium mb-1">Layout & Display</h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Customize the dashboard layout and visual preferences
                </p>
            </div>

            {/* Layout Actions Grid */}
            <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Grid Actions</p>
                <div className="grid grid-cols-2 gap-2">
                    {layoutOptions.map((option) => (
                        <button
                            key={option.id}
                            onClick={option.action}
                            disabled={!option.active && option.soon}
                            className={cn(
                                "relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 text-center",
                                option.active
                                    ? "bg-muted/40 hover:bg-muted/60 border-transparent hover:border-primary/30 cursor-pointer"
                                    : "bg-muted/20 border-transparent opacity-60 cursor-not-allowed"
                            )}
                        >
                            <span className="text-2xl">{option.icon}</span>
                            <div>
                                <div className="text-sm font-medium">{option.title}</div>
                                <div className="text-[10px] text-muted-foreground">{option.description}</div>
                            </div>
                            {option.soon && (
                                <span className="absolute top-2 right-2 text-[9px] bg-muted px-1.5 py-0.5 rounded-full font-medium">
                                    Soon
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

        </div>
    )
}

// ============ SUBSCRIPTION SECTION (INLINE WITH FULL FUNCTIONALITY) ============
function SubscriptionSection() {
    const [status, setStatus] = React.useState<SubscriptionStatus | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [isManaging, setIsManaging] = React.useState(false)
    const [billingPeriod, setBillingPeriod] = React.useState<"monthly" | "annual">("monthly")

    // Fetch subscription status
    React.useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch("/api/subscription/me")
                if (response.ok) {
                    const data = await response.json()
                    setStatus({
                        plan: data.plan,
                        status: data.status,
                        limits: data.limits || {},
                        usage: {
                            bankTransactions: data.usage?.bank_transactions || 0,
                            fridgeItems: data.usage?.receipt_trips || 0,
                            totalTransactions: data.used_total || 0,
                            transactionLimit: data.cap || 400,
                            percentUsed: data.cap > 0 ? Math.round((data.used_total / data.cap) * 100) : 0,
                        },
                        subscription: {
                            currentPeriodEnd: data.current_period_end,
                            cancelAtPeriodEnd: data.cancel_at_period_end,
                        },
                    })
                }
            } catch (err) {
                console.error("Failed to fetch subscription status:", err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchStatus()
    }, [])

    // Get price ID for a plan
    const getPriceIdForPlan = (plan: PlanType, period: "monthly" | "annual" = "monthly"): string | null => {
        if (plan === 'basic') {
            return period === 'annual'
                ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_ANNUAL || null
                : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_MONTHLY || null
        }
        if (plan === 'pro') {
            return period === 'annual'
                ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL || null
                : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY || null
        }
        if (plan === 'max') {
            return period === 'annual'
                ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MAX_ANNUAL || null
                : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MAX_MONTHLY || null
        }
        return null
    }

    const handleUpgrade = async (targetPlan: PlanType) => {
        const priceId = getPriceIdForPlan(targetPlan, billingPeriod)
        if (!priceId) {
            toast.error("Unable to process upgrade. Please try again later.")
            return
        }

        setIsManaging(true)
        try {
            const response = await fetch("/api/billing/change-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetPlan, priceId }),
            })
            const data = await response.json()

            if (data.action === 'checkout' && data.url) {
                window.location.href = data.url
            } else if (data.success) {
                toast.success(data.message || `Upgraded to ${targetPlan.toUpperCase()}!`)
                // Refresh status
                const statusResponse = await fetch("/api/subscription/me")
                if (statusResponse.ok) {
                    const newData = await statusResponse.json()
                    setStatus({
                        plan: newData.plan,
                        status: newData.status,
                        limits: newData.limits || {},
                        usage: {
                            bankTransactions: newData.usage?.bank_transactions || 0,
                            fridgeItems: newData.usage?.receipt_trips || 0,
                            totalTransactions: newData.used_total || 0,
                            transactionLimit: newData.cap || 400,
                            percentUsed: newData.cap > 0 ? Math.round((newData.used_total / newData.cap) * 100) : 0,
                        },
                        subscription: {
                            currentPeriodEnd: newData.current_period_end,
                            cancelAtPeriodEnd: newData.cancel_at_period_end,
                        },
                    })
                }
            } else if (data.error) {
                toast.error(data.error)
            } else {
                toast.error("Unable to process upgrade")
            }
        } catch (err) {
            console.error("Upgrade error:", err)
            toast.error("Failed to upgrade subscription")
        } finally {
            setIsManaging(false)
        }
    }

    const handleDowngrade = async (targetPlan: PlanType) => {
        if (targetPlan === 'free') {
            handleCancel()
            return
        }

        const priceId = getPriceIdForPlan(targetPlan, billingPeriod)
        if (!priceId) {
            toast.error("Unable to process downgrade. Please try again later.")
            return
        }

        setIsManaging(true)
        try {
            const response = await fetch("/api/billing/change-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetPlan, priceId }),
            })
            const data = await response.json()

            if (data.success) {
                toast.success(data.message || `Downgraded to ${targetPlan.toUpperCase()}`)
                // Refresh status
                const statusResponse = await fetch("/api/subscription/me")
                if (statusResponse.ok) {
                    const newData = await statusResponse.json()
                    setStatus({
                        plan: newData.plan,
                        status: newData.status,
                        limits: newData.limits || {},
                        usage: {
                            bankTransactions: newData.usage?.bank_transactions || 0,
                            fridgeItems: newData.usage?.receipt_trips || 0,
                            totalTransactions: newData.used_total || 0,
                            transactionLimit: newData.cap || 400,
                            percentUsed: newData.cap > 0 ? Math.round((newData.used_total / newData.cap) * 100) : 0,
                        },
                        subscription: {
                            currentPeriodEnd: newData.current_period_end,
                            cancelAtPeriodEnd: newData.cancel_at_period_end,
                        },
                    })
                }
            } else if (data.error) {
                toast.error(data.error)
            } else {
                toast.error("Unable to process downgrade")
            }
        } catch (err) {
            console.error("Downgrade error:", err)
            toast.error("Failed to downgrade subscription")
        } finally {
            setIsManaging(false)
        }
    }

    const handleCancel = async () => {
        if (status?.plan === "free") {
            toast.info("You are on the free plan")
            return
        }

        setIsManaging(true)
        try {
            const response = await fetch("/api/billing/cancel", { method: "POST" })
            const data = await response.json()

            if (data.success) {
                toast.success("Subscription cancelled", { description: data.message })
                // Refresh status
                const statusResponse = await fetch("/api/subscription/me")
                if (statusResponse.ok) {
                    const newData = await statusResponse.json()
                    setStatus({
                        plan: newData.plan,
                        status: newData.status,
                        limits: newData.limits || {},
                        usage: {
                            bankTransactions: newData.usage?.bank_transactions || 0,
                            fridgeItems: newData.usage?.receipt_trips || 0,
                            totalTransactions: newData.used_total || 0,
                            transactionLimit: newData.cap || 400,
                            percentUsed: newData.cap > 0 ? Math.round((newData.used_total / newData.cap) * 100) : 0,
                        },
                        subscription: {
                            currentPeriodEnd: newData.current_period_end,
                            cancelAtPeriodEnd: newData.cancel_at_period_end,
                        },
                    })
                }
            } else if (data.error) {
                toast.error(data.error)
            } else {
                toast.error("Unable to cancel subscription")
            }
        } catch (err) {
            console.error("Cancel subscription error:", err)
            toast.error("Failed to cancel subscription")
        } finally {
            setIsManaging(false)
        }
    }

    const handleReactivate = async () => {
        setIsManaging(true)
        try {
            const response = await fetch("/api/billing/reactivate", { method: "POST" })
            const data = await response.json()

            if (data.success) {
                toast.success(data.message || "Subscription reactivated!")
                // Refresh status
                const statusResponse = await fetch("/api/subscription/me")
                if (statusResponse.ok) {
                    const newData = await statusResponse.json()
                    setStatus({
                        plan: newData.plan,
                        status: newData.status,
                        limits: newData.limits || {},
                        usage: {
                            bankTransactions: newData.usage?.bank_transactions || 0,
                            fridgeItems: newData.usage?.receipt_trips || 0,
                            totalTransactions: newData.used_total || 0,
                            transactionLimit: newData.cap || 400,
                            percentUsed: newData.cap > 0 ? Math.round((newData.used_total / newData.cap) * 100) : 0,
                        },
                        subscription: {
                            currentPeriodEnd: newData.current_period_end,
                            cancelAtPeriodEnd: newData.cancel_at_period_end,
                        },
                    })
                }
            } else if (data.error) {
                toast.error(data.error)
            } else {
                toast.error("Unable to reactivate subscription")
            }
        } catch (err) {
            console.error("Reactivate error:", err)
            toast.error("Failed to reactivate subscription")
        } finally {
            setIsManaging(false)
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="animate-pulse space-y-3">
                    <div className="h-10 bg-muted rounded-lg w-1/2 mx-auto" />
                    <div className="h-48 bg-muted rounded-xl" />
                    <div className="h-48 bg-muted rounded-xl" />
                </div>
            </div>
        )
    }

    if (!status) {
        return (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
                Unable to load subscription info
            </div>
        )
    }

    // Order plans with current plan first
    const allPlans: PlanType[] = ["free", "basic", "pro", "max"]
    const orderedPlans: PlanType[] = [status.plan, ...allPlans.filter((p) => p !== status.plan)]

    return (
        <div className="space-y-4">
            {/* Header - matching other sections style */}
            <div>
                <h3 className="text-sm font-medium mb-3">Manage Subscription</h3>
                {status.subscription?.currentPeriodEnd && (
                    <p className="text-xs text-muted-foreground mb-4">
                        {status.subscription.cancelAtPeriodEnd ? "Ends" : "Renews"} on{" "}
                        {new Date(status.subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                )}
            </div>

            {/* Billing Period Toggle */}
            <div className="flex justify-center">
                <ToggleGroup
                    type="single"
                    value={billingPeriod}
                    onValueChange={(value) => value && setBillingPeriod(value as "monthly" | "annual")}
                    className="bg-muted rounded-lg p-1"
                >
                    <ToggleGroupItem
                        value="monthly"
                        className="px-4 py-2 text-sm font-medium rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm"
                    >
                        Monthly
                    </ToggleGroupItem>
                    <ToggleGroupItem
                        value="annual"
                        className="px-4 py-2 text-sm font-medium rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm"
                    >
                        Annual
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>

            {/* Plan Cards - centered without horizontal scroll */}
            <div className="space-y-3 max-w-md mx-auto">
                {orderedPlans.map((plan) => (
                    <PlanCard
                        key={plan}
                        plan={plan}
                        isCurrentPlan={plan === status.plan}
                        currentUserPlan={status.plan}
                        onManageSubscription={handleCancel}
                        onUpgrade={handleUpgrade}
                        onDowngrade={handleDowngrade}
                        onReactivate={handleReactivate}
                        isManaging={isManaging}
                        isCancelPending={status.subscription?.cancelAtPeriodEnd || false}
                        billingPeriod={billingPeriod}
                    />
                ))}
            </div>

            {/* Help text */}
            <p className="text-xs text-center text-muted-foreground">
                Need help? Contact us at{" "}
                <a href="mailto:help@trakzi.com" className="text-primary hover:underline">
                    help@trakzi.com
                </a>
            </p>
        </div>
    )
}

// ============ BUG REPORT SECTION (INLINE) ============
const bugFormSchema = z.object({
    type: z.enum(["bug", "feature"]),
    title: z.string().min(5, "Title must be at least 5 characters.").max(50, "Title must be at most 50 characters."),
    description: z.string().min(20, "Description must be at least 20 characters.").max(500, "Description must be at most 500 characters."),
})

function BugReportSection() {
    const form = useForm<z.infer<typeof bugFormSchema>>({
        resolver: zodResolver(bugFormSchema),
        defaultValues: {
            type: "bug",
            title: "",
            description: "",
        },
    })

    const descriptionValue = form.watch("description")

    function onSubmit(data: z.infer<typeof bugFormSchema>) {
        toast.success("Thank you for your feedback!", {
            description: "We've prepared an email for you to send.",
        })

        const subject = `[${data.type === "bug" ? "Bug Report" : "Feature Request"}] ${data.title}`
        const body = `${data.description}\n\n--\nSubmitted via Trakzi`
        const mailtoLink = `mailto:help@trakzi.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

        window.location.href = mailtoLink
        form.reset()
    }

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-medium mb-1">Bug Report & Feature Request</h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Help us improve. Select the type of report and provide details.
                </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Report Type */}
                <div className="space-y-2">
                    <Label>Report Type</Label>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={form.watch("type") === "bug" ? "default" : "outline"}
                            size="sm"
                            onClick={() => form.setValue("type", "bug")}
                            className="flex-1"
                        >
                            Bug Report
                        </Button>
                        <Button
                            type="button"
                            variant={form.watch("type") === "feature" ? "default" : "outline"}
                            size="sm"
                            onClick={() => form.setValue("type", "feature")}
                            className="flex-1"
                        >
                            Feature Request
                        </Button>
                    </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="title">Title</Label>
                        {form.formState.errors.title && (
                            <span className="text-xs text-destructive">{form.formState.errors.title.message}</span>
                        )}
                    </div>
                    <Input
                        id="title"
                        placeholder={form.watch("type") === "bug" ? "Login button not working..." : "Add dark mode..."}
                        {...form.register("title")}
                    />
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="description">Description</Label>
                        {form.formState.errors.description && (
                            <span className="text-xs text-destructive">{form.formState.errors.description.message}</span>
                        )}
                    </div>
                    <div className="relative">
                        <textarea
                            id="description"
                            placeholder="Describe the issue or feature in detail..."
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none pr-2 pb-6"
                            {...form.register("description")}
                        />
                        <div className="absolute bottom-2 right-2 text-[0.7rem] text-muted-foreground tabular-nums">
                            {descriptionValue?.length || 0}/500
                        </div>
                    </div>
                </div>

                <Button type="submit" className="w-full">
                    Submit Report
                </Button>
            </form>
        </div>
    )
}
