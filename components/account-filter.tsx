"use client"

import * as React from "react"
import {
    CreditCard,
    PiggyBank,
    Landmark,
    Wallet,
    TrendingUp,
    HandCoins,
    Settings,
    Wallet as WalletTrigger,
} from "lucide-react"
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
        case "checking": return <Landmark className="size-4" />
        case "savings": return <PiggyBank className="size-4" />
        case "credit_card": return <CreditCard className="size-4" />
        case "cash": return <Wallet className="size-4" />
        case "investment": return <TrendingUp className="size-4" />
        case "loan": return <HandCoins className="size-4" />
    }
}

interface FilterBodyProps {
    accounts: BankAccount[]
    selected: string[]
    onToggle: (id: string) => void
    onSelectAll: () => void
    onClear: () => void
    onManage?: () => void
}

function FilterBody({ accounts, selected, onToggle, onSelectAll, onClear, onManage }: FilterBodyProps) {
    const isAllSelected = selected.length === 0

    return (
        <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <p className="text-sm font-semibold leading-none">Accounts</p>
                <p className="text-xs text-muted-foreground">
                    {isAllSelected
                        ? `${accounts.length} total`
                        : `${selected.length} / ${accounts.length}`}
                </p>
            </div>

            {/* Account list */}
            <div className="max-h-[240px] overflow-y-auto px-1">
                {accounts.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-3 py-8 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-border bg-[oklch(0.6716_0.1368_48.513/0.06)]">
                            <Landmark className="size-4" style={{ color: "oklch(0.6716 0.1368 48.513)" }} />
                        </div>
                        <div>
                            <p className="text-xs font-medium">No accounts yet</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Add one in Settings → Accounts</p>
                        </div>
                    </div>
                ) : (
                    accounts.map((account) => {
                        const checked = isAllSelected || selected.includes(account.id)
                        return (
                            <label
                                key={account.id}
                                className={cn(
                                    "flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer",
                                    "hover:bg-accent hover:text-accent-foreground",
                                    "min-h-10"
                                )}
                            >
                                <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => onToggle(account.id)}
                                    aria-label={`Toggle ${account.name}`}
                                />
                                <span
                                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground shrink-0"
                                    style={
                                        account.color
                                            ? { backgroundColor: `${account.color}22`, color: account.color }
                                            : undefined
                                    }
                                >
                                    {getAccountIcon(account.accountType)}
                                </span>
                                <span className="flex-1 min-w-0 truncate text-sm">
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

            {/* Footer */}
            <div className="border-t border-border p-2 space-y-1">
                {accounts.length > 0 && (
                    <div className="flex gap-1.5">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={onSelectAll}
                            disabled={isAllSelected}
                        >
                            All
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={onClear}
                            disabled={isAllSelected}
                        >
                            Clear
                        </Button>
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 justify-start gap-2 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={onManage}
                >
                    <Settings className="size-3.5" />
                    Manage accounts
                </Button>
            </div>
        </div>
    )
}

export function AccountFilter({
    triggerVariant = "outline",
    triggerSize = "icon",
    triggerClassName,
}: AccountFilterProps) {
    const { selected, toggle, clear } = useAccountFilter()
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
            <WalletTrigger className="size-[1.2rem]" />
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
            onToggle={toggle}
            onSelectAll={handleSelectAll}
            onClear={clear}
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
