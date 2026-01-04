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

                    {/* Content Area */}
                    <main className="flex-1 p-6 overflow-y-auto">
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
    const { resolvedTheme, setTheme } = useTheme()
    const { colorScheme, setColorScheme } = useColorScheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const themeOptions = [
        { value: "light", label: "Light", icon: <IconSun className="size-5" /> },
        { value: "dark", label: "Dark", icon: <IconMoon className="size-5" /> },
    ]

    return (
        <div className="space-y-6">
            {/* Theme - Radio style like currency */}
            <div>
                <h3 className="text-sm font-medium mb-3">Theme</h3>
                <div className="space-y-2">
                    {themeOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setTheme(option.value)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors",
                                mounted && resolvedTheme === option.value
                                    ? "border-primary bg-primary/5"
                                    : "hover:border-primary/50"
                            )}
                        >
                            <span className="text-muted-foreground">{option.icon}</span>
                            <span className="font-medium">{option.label}</span>
                            {mounted && resolvedTheme === option.value && (
                                <span className="ml-auto text-primary">✓</span>
                            )}
                        </button>
                    ))}
                </div>
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

// ============ SUBSCRIPTION SECTION (INLINE) ============
function SubscriptionSection() {
    const [status, setStatus] = React.useState<{
        plan: string
        status: string
        usage?: { totalTransactions: number; transactionLimit: number; percentUsed: number }
        subscription?: { currentPeriodEnd: string; cancelAtPeriodEnd: boolean }
    } | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)

    React.useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch("/api/subscription/me")
                if (response.ok) {
                    const data = await response.json()
                    setStatus({
                        plan: data.plan,
                        status: data.status,
                        usage: {
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

    const handleManageBilling = async () => {
        try {
            const response = await fetch("/api/billing/portal", { method: "POST" })
            const data = await response.json()
            if (data.url) {
                window.open(data.url, "_blank")
            } else {
                toast.error("Unable to open billing portal")
            }
        } catch (err) {
            toast.error("Failed to open billing portal")
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                <h3 className="text-sm font-medium">Subscription</h3>
                <div className="animate-pulse space-y-3">
                    <div className="h-20 bg-muted rounded-lg" />
                    <div className="h-12 bg-muted rounded-lg" />
                </div>
            </div>
        )
    }

    const planColors: Record<string, string> = {
        free: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
        basic: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        pro: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
        max: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    }

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium">Subscription</h3>

            {/* Current Plan Card */}
            <div className="p-4 rounded-lg border bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Current Plan</span>
                    <span className={cn("px-2 py-1 rounded-md text-xs font-semibold uppercase", planColors[status?.plan || "free"])}>
                        {status?.plan || "Free"}
                    </span>
                </div>

                {status?.usage && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Transactions Used</span>
                            <span className="font-medium">
                                {status.usage.totalTransactions.toLocaleString()} / {status.usage.transactionLimit.toLocaleString()}
                            </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                            <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(100, status.usage.percentUsed)}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {status.usage.percentUsed}% of your limit used
                        </p>
                    </div>
                )}

                {status?.subscription?.currentPeriodEnd && (
                    <p className="text-xs text-muted-foreground mt-3">
                        {status.subscription.cancelAtPeriodEnd ? "Ends" : "Renews"} on{" "}
                        {new Date(status.subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
                <Button onClick={handleManageBilling} variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                        <IconCreditCard className="size-4" />
                        Manage Billing
                    </span>
                    <IconExternalLink className="size-4" />
                </Button>
                <p className="text-xs text-muted-foreground">
                    Opens Stripe billing portal to manage your subscription, update payment method, or view invoices.
                </p>
            </div>
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
