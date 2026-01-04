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
import { PlanCard } from "@/components/subscription-dialog/PlanCard"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { PlanType, SubscriptionStatus } from "@/components/subscription-dialog/types"
import { AnimatedThemeSwitcher } from "@/components/animated-theme-switcher"

type SettingsSection = "appearance" | "currency" | "time-period" | "layout" | "subscription" | "bug-report"

interface SettingsPanelProps {
    children: React.ReactNode
}

const sidebarItems: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: "appearance", label: "Appearance", icon: <IconPalette className="size-4" /> },
    { id: "currency", label: "Currency", icon: <IconCoin className="size-4" /> },
    { id: "time-period", label: "Time Period", icon: <IconCalendar className="size-4" /> },
    { id: "layout", label: "Layout", icon: <IconLayoutGrid className="size-4" /> },
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
    { value: "last-30-days", label: "Last 30 Days" },
    { value: "last-3-months", label: "Last 3 Months" },
    { value: "last-6-months", label: "Last 6 Months" },
    { value: "last-year", label: "Last Year" },
    { value: "ytd", label: "Year to Date" },
    { value: "all-time", label: "All Time" },
]

export function SettingsPanel({ children }: SettingsPanelProps) {
    const [open, setOpen] = React.useState(false)
    const [activeSection, setActiveSection] = React.useState<SettingsSection>("appearance")

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-[700px] p-0 gap-0 overflow-hidden">
                <div className="flex h-[500px]">
                    {/* Sidebar */}
                    <nav className="w-[200px] border-r bg-muted/30 flex flex-col">
                        <DialogHeader className="p-4 pb-2">
                            <DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
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

                    {/* Content Area - improved vertical scroll */}
                    <main
                        className="flex-1 p-6 overflow-y-auto overflow-x-hidden"
                        style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'hsl(var(--muted-foreground) / 0.3) transparent'
                        }}
                    >
                        {activeSection === "appearance" && <AppearanceSection />}
                        {activeSection === "currency" && <CurrencySection />}
                        {activeSection === "time-period" && <TimePeriodSection />}
                        {activeSection === "layout" && <LayoutSection />}
                        {activeSection === "subscription" && <SubscriptionSection />}
                        {activeSection === "bug-report" && <BugReportSection />}
                    </main>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ============ APPEARANCE SECTION ============
function AppearanceSection() {
    const { colorScheme, setColorScheme } = useColorScheme()

    return (
        <div className="space-y-6">
            {/* Theme - Animated switcher with Light/Dark/System */}
            <div>
                <h3 className="text-sm font-medium mb-3">Theme</h3>
                <AnimatedThemeSwitcher />
            </div>

            {/* Color Palette */}
            <div>
                <h3 className="text-sm font-medium mb-3">Color Palette</h3>
                <div className="grid grid-cols-4 gap-3">
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
                                    "relative flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all",
                                    isSelected && "ring-2 ring-primary ring-offset-2",
                                    isDisabled
                                        ? "opacity-50 cursor-not-allowed"
                                        : "hover:border-primary/50 cursor-pointer"
                                )}
                            >
                                {/* Gradient swatch */}
                                <div
                                    className="w-full h-8 rounded-md"
                                    style={{
                                        background: `linear-gradient(to right, ${colors.slice(0, 5).join(", ")})`,
                                    }}
                                />
                                <span className="text-xs font-medium">
                                    {palette.label}
                                </span>
                                {isDisabled && (
                                    <span className="absolute -top-1 -right-1 text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                                        Soon
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ============ CURRENCY SECTION ============
function CurrencySection() {
    const { currency, setCurrency } = useCurrency()

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-medium mb-3">Currency</h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Select your preferred currency for displaying amounts
                </p>
                <div className="space-y-2">
                    {Object.entries(currencies).map(([code, config]) => (
                        <button
                            key={code}
                            onClick={() => setCurrency(code)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors",
                                currency === code
                                    ? "border-primary bg-primary/5"
                                    : "hover:border-primary/50"
                            )}
                        >
                            <span className="text-lg font-semibold w-8">{config.symbol}</span>
                            <div className="text-left">
                                <div className="font-medium">{config.name}</div>
                                <div className="text-xs text-muted-foreground">{code}</div>
                            </div>
                            {currency === code && (
                                <span className="ml-auto text-primary">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ============ TIME PERIOD SECTION ============
function TimePeriodSection() {
    const { filter, setFilter } = useDateFilter()

    const handleSetDefault = (value: string) => {
        setFilter(value)
        // Also save as default
        if (typeof window !== "undefined") {
            localStorage.setItem("default-time-period", value)
        }
    }

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-medium mb-3">Default Time Period</h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Set the default time range for charts and data across the app
                </p>
                <div className="space-y-2">
                    {timeFilterOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => handleSetDefault(option.value)}
                            className={cn(
                                "w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors",
                                filter === option.value
                                    ? "border-primary bg-primary/5"
                                    : "hover:border-primary/50"
                            )}
                        >
                            <span className="font-medium">{option.label}</span>
                            {filter === option.value && (
                                <span className="text-primary">✓</span>
                            )}
                        </button>
                    ))}
                </div>
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

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-medium mb-3">Layout</h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Customize the layout of draggable cards on analytics pages
                </p>
                <Button onClick={handleRandomize} variant="outline">
                    <IconLayoutGrid className="size-4 mr-2" />
                    Randomize Cards
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                    Applies to the current draggable grid layout
                </p>
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
                            fridgeItems: data.usage?.receipt_transactions || 0,
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
                            fridgeItems: newData.usage?.receipt_transactions || 0,
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
                            fridgeItems: newData.usage?.receipt_transactions || 0,
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
                            fridgeItems: newData.usage?.receipt_transactions || 0,
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
                            fridgeItems: newData.usage?.receipt_transactions || 0,
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
