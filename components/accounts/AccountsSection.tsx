"use client"

import { memo, useState } from "react"
import { toast } from "sonner"
import {
    Plus,
    Pencil,
    Archive,
    ArchiveRestore,
    Trash2,
    CreditCard,
    PiggyBank,
    Landmark,
    Wallet,
    TrendingUp,
    HandCoins,
    ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAccounts, useUpdateAccount, useDeleteAccount } from "@/hooks/use-accounts"
import { AccountFormDialog } from "./AccountFormDialog"
import { NetWorthCard } from "./NetWorthCard"
import type { BankAccount, AccountType } from "@/lib/types/accounts"

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

function getAccountTypeLabel(type: AccountType): string {
    const labels: Record<AccountType, string> = {
        checking: "Checking",
        savings: "Savings",
        credit_card: "Credit Card",
        cash: "Cash",
        investment: "Investment",
        loan: "Loan",
    }
    return labels[type]
}

interface AccountRowProps {
    account: BankAccount
    onEdit: (account: BankAccount) => void
    onArchive: (account: BankAccount) => void
    onDelete: (account: BankAccount) => void
}

const AccountRow = memo(function AccountRow({ account, onEdit, onArchive, onDelete }: AccountRowProps) {
    return (
        <div className="flex items-center gap-3 py-2.5 px-1 rounded-md hover:bg-muted/50 group">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                {getAccountIcon(account.accountType)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{account.name}</span>
                    {!account.isActive && (
                        <Badge variant="secondary" className="text-xs shrink-0">Archived</Badge>
                    )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{getAccountTypeLabel(account.accountType)}</span>
                    {account.institution && (
                        <>
                            <span>·</span>
                            <span className="truncate">{account.institution}</span>
                        </>
                    )}
                    {account.currency && account.currency !== "EUR" && (
                        <>
                            <span>·</span>
                            <span>{account.currency}</span>
                        </>
                    )}
                </div>
            </div>
            {account.currentBalance !== null && (
                <span className="text-sm font-medium tabular-nums shrink-0">
                    {account.currentBalance.toLocaleString(undefined, { style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {" "}{account.currency}
                </span>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronDown className="size-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(account)}>
                        <Pencil className="size-3.5 mr-2" />
                        Edit
                    </DropdownMenuItem>
                    {account.isActive ? (
                        <DropdownMenuItem onClick={() => onArchive(account)}>
                            <Archive className="size-3.5 mr-2" />
                            Archive
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem onClick={() => onArchive(account)}>
                            <ArchiveRestore className="size-3.5 mr-2" />
                            Unarchive
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => onDelete(account)}
                        className="text-destructive focus:text-destructive"
                    >
                        <Trash2 className="size-3.5 mr-2" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
})

AccountRow.displayName = "AccountRow"

export const AccountsSection = memo(function AccountsSection() {
    const { data: accounts = [], isLoading } = useAccounts()
    const updateAccount = useUpdateAccount()
    const deleteAccount = useDeleteAccount()

    const [formOpen, setFormOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<BankAccount | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null)
    const [showArchived, setShowArchived] = useState(false)

    const active = accounts.filter(a => a.isActive)
    const archived = accounts.filter(a => !a.isActive)

    const handleEdit = (account: BankAccount) => {
        setEditTarget(account)
        setFormOpen(true)
    }

    const handleArchive = async (account: BankAccount) => {
        try {
            await updateAccount.mutateAsync({
                id: account.id,
                data: { isActive: !account.isActive },
            })
            toast.success(account.isActive ? "Account archived" : "Account unarchived")
        } catch (err: any) {
            toast.error(err.message || "Failed to update account")
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        try {
            await deleteAccount.mutateAsync(deleteTarget.id)
            toast.success("Account deleted")
            setDeleteTarget(null)
        } catch (err: any) {
            toast.error(err.message || "Failed to delete account")
        }
    }

    const handleAddNew = () => {
        setEditTarget(null)
        setFormOpen(true)
    }

    return (
        <div className="space-y-4">
            <NetWorthCard />

            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold">Bank Accounts</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Assign accounts to imports to track transfers and eliminate double-counting.
                    </p>
                </div>
                <Button size="sm" variant="outline" onClick={handleAddNew} className="shrink-0 gap-1.5">
                    <Plus className="size-3.5" />
                    Add
                </Button>
            </div>

            {isLoading ? (
                <div className="space-y-2">
                    {[1, 2].map(i => (
                        <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
                    ))}
                </div>
            ) : active.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground">No accounts yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Add your first account to start tracking transfers.
                    </p>
                </div>
            ) : (
                <div className="space-y-0.5">
                    {active.map(account => (
                        <AccountRow
                            key={account.id}
                            account={account}
                            onEdit={handleEdit}
                            onArchive={handleArchive}
                            onDelete={setDeleteTarget}
                        />
                    ))}
                </div>
            )}

            {archived.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowArchived(v => !v)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronDown className={`size-3 transition-transform ${showArchived ? "rotate-180" : ""}`} />
                        {archived.length} archived account{archived.length > 1 ? "s" : ""}
                    </button>
                    {showArchived && (
                        <div className="mt-2 space-y-0.5 opacity-60">
                            {archived.map(account => (
                                <AccountRow
                                    key={account.id}
                                    account={account}
                                    onEdit={handleEdit}
                                    onArchive={handleArchive}
                                    onDelete={setDeleteTarget}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            <AccountFormDialog
                open={formOpen}
                onOpenChange={open => {
                    setFormOpen(open)
                    if (!open) setEditTarget(null)
                }}
                editAccount={editTarget}
            />

            <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {`"${deleteTarget?.name}" will be permanently deleted. This is only allowed if no transactions are assigned to this account.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
})

AccountsSection.displayName = "AccountsSection"
