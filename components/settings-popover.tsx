"use client"

import * as React from "react"
import {
    IconSettings,
    IconPalette,
    IconCreditCard,
    IconHelpCircle,
    IconLayoutDashboard,
    IconBug,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent
} from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { useColorScheme, colorPalettes } from "@/components/color-scheme-provider"
import { useCurrency, currencies } from "@/components/currency-provider"
import { BugReportDialog } from "@/components/bug-report-dialog"
import { SubscriptionDialog } from "@/components/subscription-dialog"

// Helper to manage default time period in localStorage
const DEFAULT_TIME_PERIOD_KEY = "default-time-period"

export function SettingsPopover({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false)
    const { colorScheme, setColorScheme } = useColorScheme()
    const { currency, setCurrency } = useCurrency()
    const [defaultTimePeriod, setDefaultTimePeriod] = React.useState("lastyear")

    // Load default time period
    React.useEffect(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem(DEFAULT_TIME_PERIOD_KEY)
            if (stored) setDefaultTimePeriod(stored)
        }
    }, [open])

    const handleTimePeriodChange = (value: string) => {
        setDefaultTimePeriod(value)
        if (typeof window !== "undefined") {
            localStorage.setItem(DEFAULT_TIME_PERIOD_KEY, value)
            toast.success("Default time period updated")
        }
    }

    const handleRandomizeLayout = () => {
        const keys = Object.keys(localStorage)
        const layoutKeys = keys.filter(k => k.includes('layout') || k.includes('grid'))
        if (layoutKeys.length > 0) {
            layoutKeys.forEach(k => localStorage.removeItem(k))
            toast.success("Layout reset/randomized", { description: "Refresh to see changes." })
        } else {
            toast.info("No custom layouts found to randomize")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-3xl h-[600px] p-0 gap-0 overflow-hidden sm:rounded-2xl border-border/60 shadow-2xl">
                <DialogTitle className="sr-only">Settings</DialogTitle>
                <Tabs defaultValue="general" orientation="vertical" className="flex w-full h-full">
                    {/* Sidebar */}
                    <TabsList className="w-[240px] h-full rounded-none justify-start px-4 py-6 space-y-1 bg-muted/10 border-r border-border/40 text-left items-stretch flex-col">
                        <div className="px-2 mb-6">
                            <h2 className="text-lg font-semibold tracking-tight text-foreground/90 flex items-center gap-2">
                                <IconSettings className="w-5 h-5" />
                                Settings
                            </h2>
                        </div>

                        <TabsTrigger
                            value="general"
                            className="justify-start gap-3 px-3 py-2.5 h-auto text-sm font-medium transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted/50 rounded-lg group"
                        >
                            <IconPalette className="w-4 h-4 text-muted-foreground group-data-[state=active]:text-primary" />
                            General
                        </TabsTrigger>

                        <TabsTrigger
                            value="subscription"
                            className="justify-start gap-3 px-3 py-2.5 h-auto text-sm font-medium transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted/50 rounded-lg group"
                        >
                            <IconCreditCard className="w-4 h-4 text-muted-foreground group-data-[state=active]:text-primary" />
                            Subscription
                        </TabsTrigger>

                        <TabsTrigger
                            value="layout"
                            className="justify-start gap-3 px-3 py-2.5 h-auto text-sm font-medium transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted/50 rounded-lg group"
                        >
                            <IconLayoutDashboard className="w-4 h-4 text-muted-foreground group-data-[state=active]:text-primary" />
                            Layout
                        </TabsTrigger>

                        <div className="flex-1" />

                        <TabsTrigger
                            value="support"
                            className="justify-start gap-3 px-3 py-2.5 h-auto text-sm font-medium transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted/50 rounded-lg group mb-2"
                        >
                            <IconHelpCircle className="w-4 h-4 text-muted-foreground group-data-[state=active]:text-primary" />
                            Support
                        </TabsTrigger>

                        <div className="px-2 py-2 text-xs text-muted-foreground/60">
                            Version 2.0.1
                        </div>
                    </TabsList>

                    {/* Content Area */}
                    <div className="flex-1 h-full bg-background relative overflow-hidden">
                        <ScrollArea className="h-full w-full">
                            <div className="p-8 pb-20 space-y-8 max-w-2xl mx-auto">

                                {/* General Tab */}
                                <TabsContent value="general" className="mt-0 space-y-8 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-1">Appearance</h3>
                                        <p className="text-sm text-muted-foreground">Customize how Trakzi looks on your device.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-base">Theme</Label>
                                        <div className="grid grid-cols-3 gap-4">
                                            {['sunset', 'dark', 'colored', 'gold', 'aqua', 'dull', 'dry', 'greens', 'chrome', 'beach', 'jolly', 'gothic'].map((scheme) => (
                                                <button
                                                    key={scheme}
                                                    onClick={() => setColorScheme(scheme as keyof typeof colorPalettes)}
                                                    className={cn(
                                                        "relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all hover:bg-muted/50",
                                                        colorScheme === scheme
                                                            ? "border-primary bg-primary/5"
                                                            : "border-transparent bg-muted/20 hover:border-muted-foreground/20"
                                                    )}
                                                >
                                                    <div className="w-full h-12 rounded-lg flex overflow-hidden shadow-sm">
                                                        {colorPalettes[scheme as keyof typeof colorPalettes]?.slice(0, 4).map((c, i) => (
                                                            <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
                                                        ))}
                                                    </div>
                                                    <span className="text-xs font-medium capitalize">{scheme}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-xl font-semibold mb-1">Preferences</h3>
                                            <p className="text-sm text-muted-foreground">Manage your regional and display settings.</p>
                                        </div>

                                        <div className="grid gap-6">
                                            <div className="space-y-2">
                                                <Label>Default Currency</Label>
                                                <Select value={currency} onValueChange={setCurrency}>
                                                    <SelectTrigger className="w-full md:w-[300px]">
                                                        <SelectValue placeholder="Select currency" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(currencies).map(([code, config]) => (
                                                            <SelectItem key={code} value={code}>
                                                                <span className="flex items-center gap-2">
                                                                    <span className="text-muted-foreground w-6 text-center">{config.symbol}</span>
                                                                    {config.name} ({code})
                                                                </span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-[0.8rem] text-muted-foreground">
                                                    Used for all monetary values throughout the app.
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Default Time Period</Label>
                                                <Select value={defaultTimePeriod} onValueChange={handleTimePeriodChange}>
                                                    <SelectTrigger className="w-full md:w-[300px]">
                                                        <SelectValue placeholder="Select period" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="lastyear">Last Year</SelectItem>
                                                        <SelectItem value="last6months">Last 6 Months</SelectItem>
                                                        <SelectItem value="last3months">Last 3 Months</SelectItem>
                                                        <SelectItem value="last30days">Last 30 Days</SelectItem>
                                                        <SelectItem value="ytd">Year to Date (YTD)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-[0.8rem] text-muted-foreground">
                                                    The default time range applied when you visit the dashboard.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Subscription Tab */}
                                <TabsContent value="subscription" className="mt-0 space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-1">Subscription</h3>
                                        <p className="text-sm text-muted-foreground">Manage your plan and billing details.</p>
                                    </div>

                                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                                <IconCreditCard className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-lg">Your Plan</h4>
                                                <p className="text-sm text-muted-foreground">Manage billing and upgrade options</p>
                                            </div>
                                        </div>

                                        <SubscriptionDialog>
                                            <Button className="w-full sm:w-auto">
                                                Manage Subscription
                                            </Button>
                                        </SubscriptionDialog>
                                    </div>

                                    <div className="bg-muted/20 rounded-xl p-6">
                                        <h4 className="text-sm font-medium mb-2">Billing Support</h4>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Need help with an invoice or payment? Contact our support team.
                                        </p>
                                        <Button variant="outline" size="sm" asChild>
                                            <a href="mailto:billing@trakzi.com">Contact Billing</a>
                                        </Button>
                                    </div>
                                </TabsContent>

                                {/* Layout Tab */}
                                <TabsContent value="layout" className="mt-0 space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-1">Dashboard Layout</h3>
                                        <p className="text-sm text-muted-foreground">Customize your dashboard grid.</p>
                                    </div>

                                    <div className="rounded-xl border border-border bg-card p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-medium">Randomize Cards</h4>
                                                <p className="text-sm text-muted-foreground max-w-[300px]">
                                                    Reset the draggable grid layout to a random arrangement. Applies to the current draggable grid.
                                                </p>
                                            </div>
                                            <Button variant="secondary" onClick={handleRandomizeLayout}>
                                                Randomize
                                            </Button>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Support Tab */}
                                <TabsContent value="support" className="mt-0 space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-1">Support & Feedback</h3>
                                        <p className="text-sm text-muted-foreground">Found a bug? Have a feature request?</p>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="p-4 rounded-xl border bg-card hover:bg-accent/5 transition-colors cursor-pointer group">
                                            <div className="mb-3 p-2 w-fit rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                                                <IconBug className="w-5 h-5" />
                                            </div>
                                            <h4 className="font-medium mb-1 group-hover:text-primary transition-colors">Report a Bug</h4>
                                            <p className="text-xs text-muted-foreground mb-4">Let us know if something isn't working correctly.</p>
                                            <BugReportDialog /> {/* This renders a button trigger */}
                                        </div>

                                        <div className="p-4 rounded-xl border bg-card hover:bg-accent/5 transition-colors group">
                                            <div className="mb-3 p-2 w-fit rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                                <IconHelpCircle className="w-5 h-5" />
                                            </div>
                                            <h4 className="font-medium mb-1">Help Center</h4>
                                            <p className="text-xs text-muted-foreground mb-4">Read our guides and documentation.</p>
                                            <Button variant="outline" size="sm" className="w-full" asChild>
                                                <a href="#" target="_blank">Visit Help Center</a>
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center pt-8">
                                        <p className="text-xs text-muted-foreground">
                                            Trakzi v2.0.1 &bull; Built with ❤️
                                        </p>
                                    </div>
                                </TabsContent>

                            </div>
                        </ScrollArea>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
