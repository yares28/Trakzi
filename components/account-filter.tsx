"use client"

import * as React from "react"
import {
    IconCreditCard,
    IconPigMoney,
    IconBuildingBank,
    IconWallet,
    IconTrendingUp,
    IconCash,
    IconSettings,
    IconChevronRight,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerFooter,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { useAccountFilter } from "@/components/account-filter-provider"
import { useAccounts } from "@/hooks/use-accounts"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import type { AccountType, BankAccount } from "@/lib/types/accounts"

interface AccountFilterProps {
    triggerVariant?: React.ComponentProps<typeof Button>["variant"]
    triggerSize?: React.ComponentProps<typeof Button>["size"]
    triggerClassName?: string
}

function getAccountIcon(type: AccountType) {
    switch (type) {
        case "checking": return <IconBuildingBank className="size-3.5" />
        case "savings": return <IconPigMoney className="size-3.5" />
        case "credit_card": return <IconCreditCard className="size-3.5" />
        case "cash": return <IconCash className="size-3.5" />
        case "investment": return <IconTrendingUp className="size-3.5" />
        case "loan": return <IconWallet className="size-3.5" />
    }
}

interface FilterBodyProps {
    accounts: BankAccount[]
    selected: string[]
    includeUnassigned: boolean
    onToggle: (id: string) => void
    onSelectAll: () => void
    onClear: () => void
    onToggleUnassigned: () => void
    onManage?: () => void
}

function PillSwitch({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onCheckedChange(!checked)}
            className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
                "transition-colors duration-200 ease-in-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                checked ? "bg-primary" : "bg-input"
            )}
        >
            <span
                className={cn(
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm ring-0",
                    "transition-transform duration-200 ease-in-out",
                    checked ? "translate-x-4" : "translate-x-0"
                )}
            />
        </button>
    )
}

function FilterBody({ accounts, selected, includeUnassigned, onToggle, onSelectAll, onClear, onToggleUnassigned, onManage }: FilterBodyProps) {
    const isAllSelected = selected.length === 0

    return (
        <div className="flex flex-col">
            {/* Manage accounts — top action */}
            <button
                type="button"
                onClick={onManage}
                className="group flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/60 transition-colors duration-150 border-b border-border"
            >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                    <IconSettings className="size-3.5" />
                </span>
                <span className="flex-1 text-[13px] font-medium text-foreground">Manage accounts</span>
                <IconChevronRight className="size-3.5 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
            </button>

            {/* Section label */}
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Accounts
                </p>
                <p className="text-[11px] text-muted-foreground">
                    {isAllSelected
                        ? `${accounts.length} total`
                        : `${selected.length} / ${accounts.length}`}
                </p>
            </div>

            {/* Account list */}
            <div className="max-h-[220px] overflow-y-auto px-1.5">
                {accounts.length === 0 ? (
                    <div className="flex flex-col items-center gap-2.5 px-3 py-6 text-center">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-dashed border-border bg-primary/[0.06]">
                            <IconBuildingBank className="size-4 text-primary" />
                        </span>
                        <div>
                            <p className="text-xs font-medium">No accounts yet</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Add one via Manage accounts above</p>
                        </div>
                    </div>
                ) : (
                    accounts.map((account) => {
                        const checked = isAllSelected || selected.includes(account.id)
                        return (
                            <label
                                key={account.id}
                                className={cn(
                                    "flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer select-none",
                                    "hover:bg-accent hover:text-accent-foreground transition-colors duration-100",
                                    "min-h-9"
                                )}
                            >
                                <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => onToggle(account.id)}
                                    aria-label={`Toggle ${account.name}`}
                                    className="shrink-0"
                                />
                                <span
                                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground shrink-0"
                                    style={
                                        account.color
                                            ? { backgroundColor: `${account.color}22`, color: account.color }
                                            : undefined
                                    }
                                >
                                    {getAccountIcon(account.accountType)}
                                </span>
                                <span className="flex-1 min-w-0 truncate text-[13px]">
                                    {account.name}
                                </span>
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
                                    {account.currency}
                                </span>
                            </label>
                        )
                    })
                )}
            </div>

            {/* Include unassigned toggle — only meaningful when filtering */}
            <div className="mx-1.5 mt-1 mb-1 px-2 py-2 rounded-md flex items-center justify-between gap-3 bg-muted/40">
                <div className="min-w-0">
                    <p className="text-[12px] font-medium leading-none">Include unassigned</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
                        {isAllSelected ? "Active when filtering by account" : "Show transactions with no account"}
                    </p>
                </div>
                <PillSwitch
                    checked={includeUnassigned}
                    onCheckedChange={onToggleUnassigned}
                />
            </div>

            {/* Footer pills */}
            {accounts.length > 0 && (
                <div className="border-t border-border px-2 py-2 flex gap-1.5">
                    <button
                        type="button"
                        onClick={onSelectAll}
                        disabled={isAllSelected}
                        className={cn(
                            "flex-1 h-7 rounded-full border text-[12px] font-medium transition-colors duration-150",
                            isAllSelected
                                ? "border-border/50 text-muted-foreground/40 cursor-not-allowed"
                                : "border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/60 hover:text-foreground"
                        )}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        onClick={onClear}
                        disabled={isAllSelected}
                        className={cn(
                            "flex-1 h-7 rounded-full border text-[12px] font-medium transition-colors duration-150",
                            isAllSelected
                                ? "border-border/50 text-muted-foreground/40 cursor-not-allowed"
                                : "border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/60 hover:text-foreground"
                        )}
                    >
                        Clear
                    </button>
                </div>
            )}
        </div>
    )
}

export function AccountFilter({
    triggerVariant = "outline",
    triggerSize = "icon",
    triggerClassName,
}: AccountFilterProps) {
    const { selected, toggle, clear, includeUnassigned, setIncludeUnassigned } = useAccountFilter()
    const { data: accounts = [] } = useAccounts()
    const isMobile = useIsMobile()
    const [open, setOpen] = React.useState(false)

    const activeAccounts = React.useMemo(
        () => accounts.filter((a) => a.isActive),
        [accounts]
    )

    const filterCount = selected.length

    const handleSelectAll = () => clear()

    const trigger = (
        <Button
            variant={triggerVariant}
            size={triggerSize}
            className={cn("!gap-0 !p-0 relative", triggerClassName)}
            aria-label="Filter by account"
        >
            <IconWallet className="size-[1.2rem]" />
            {filterCount > 0 && (
                <span
                    aria-hidden="true"
                    className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold leading-none"
                >
                    {filterCount}
                </span>
            )}
            <span className="sr-only">
                {filterCount === 0
                    ? "Filter by account (all accounts shown)"
                    : `Filter by account (${filterCount} selected)`}
            </span>
        </Button>
    )

    const handleManage = () => {
        setOpen(false)
        window.dispatchEvent(new CustomEvent("open-settings", { detail: { section: "accounts" } }))
    }

    const body = (
        <FilterBody
            accounts={activeAccounts}
            selected={selected}
            includeUnassigned={includeUnassigned}
            onToggle={toggle}
            onSelectAll={handleSelectAll}
            onClear={clear}
            onToggleUnassigned={() => setIncludeUnassigned(!includeUnassigned)}
            onManage={handleManage}
        />
    )

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>{trigger}</DrawerTrigger>
                <DrawerContent>
                    <DrawerHeader className="text-left">
                        <DrawerTitle>Filter by account</DrawerTitle>
                    </DrawerHeader>
                    <div className="px-2 pb-2">{body}</div>
                    <DrawerFooter className="pt-2">
                        <Button onClick={() => setOpen(false)}>Done</Button>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0" sideOffset={8}>
                {body}
            </PopoverContent>
        </Popover>
    )
}
