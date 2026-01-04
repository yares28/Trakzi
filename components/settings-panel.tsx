"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import {
    IconSun,
    IconMoon,
    IconCoin,
    IconCalendar,
    IconLayoutGrid,
    IconCrown,
    IconBug,
    IconPalette,
} from "@tabler/icons-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useColorScheme, colorPalettes } from "@/components/color-scheme-provider"
import { useCurrency, currencies } from "@/components/currency-provider"
import { useDateFilter } from "@/components/date-filter-provider"
import { SubscriptionDialog } from "@/components/subscription-dialog/SubscriptionDialog"
import { BugReportDialog } from "@/components/bug-report-dialog"

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
    const [subscriptionOpen, setSubscriptionOpen] = React.useState(false)
    const [bugReportOpen, setBugReportOpen] = React.useState(false)

    const handleSectionClick = (section: SettingsSection) => {
        if (section === "subscription") {
            setSubscriptionOpen(true)
            return
        }
        if (section === "bug-report") {
            setBugReportOpen(true)
            return
        }
        setActiveSection(section)
    }

    return (
        <>
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
                                        onClick={() => handleSectionClick(item.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                            "hover:bg-accent hover:text-accent-foreground",
                                            activeSection === item.id && item.id !== "subscription" && item.id !== "bug-report"
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
                        </main>
                    </div>
                </DialogContent>
            </Dialog>

            {/* External dialogs */}
            <SubscriptionDialog open={subscriptionOpen} onOpenChange={setSubscriptionOpen} />
            <BugReportDialog open={bugReportOpen} onOpenChange={setBugReportOpen}></BugReportDialog>
        </>
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

    return (
        <div className="space-y-6">
            {/* Theme */}
            <div>
                <h3 className="text-sm font-medium mb-3">Theme</h3>
                <div className="flex gap-2">
                    <Button
                        variant={mounted && resolvedTheme === "light" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTheme("light")}
                        className="flex items-center gap-2"
                    >
                        <IconSun className="size-4" />
                        Light
                    </Button>
                    <Button
                        variant={mounted && resolvedTheme === "dark" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTheme("dark")}
                        className="flex items-center gap-2"
                    >
                        <IconMoon className="size-4" />
                        Dark
                    </Button>
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
