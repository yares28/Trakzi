"use client"

import { useRef, useState } from "react"
import { File, FileSpreadsheet, FileText, HelpCircle, Loader2, Plus, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useAccounts, useCreateAccount } from "@/hooks/use-accounts"
import { useIsMobile } from "@/hooks/use-mobile"
import { usePlanFeatures } from "@/hooks/use-plan-features"
import { AccountLimitDialog } from "@/components/limits/account-limit-dialog"
import type { AccountType } from "@/lib/types/accounts"

const CREATE_SENTINEL = "__create__"

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
    { value: "checking", label: "Checking / Debit" },
    { value: "savings", label: "Savings" },
    { value: "credit_card", label: "Credit card" },
    { value: "cash", label: "Cash" },
    { value: "investment", label: "Investment" },
    { value: "loan", label: "Loan" },
]

export type FileUploadStatementLead = {
    id: string
    name: string
    imageUrl?: string | null
}

export interface FileUploadStatementProps {
    files: File[]
    fileProgresses?: Record<string, number>
    isBusy?: boolean
    error?: string | null
    parsingStatus?: string | null

    projectName: string
    onProjectNameChange: (next: string) => void
    projectLead?: FileUploadStatementLead | null

    accountId?: string | null
    onAccountChange?: (id: string | null) => void

    accept?: string
    onFilesChange: (nextFiles: File[]) => void

    onCancel: () => void
    onContinue: () => void
    continueLabel?: string
}

function formatFileSize(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB"
    const kb = bytes / 1024
    if (kb < 1024) return `${Math.round(kb)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
}

function getFileIcon(filename: string) {
    const ext = filename.split(".").pop()?.toLowerCase()
    if (ext && ["csv", "xlsx", "xls"].includes(ext)) return FileSpreadsheet
    if (ext === "pdf") return FileText
    return File
}

function getFileKey(file: File) {
    return `${file.name}::${file.size}::${file.lastModified}`
}

export function FileUploadStatement({
    files,
    fileProgresses = {},
    isBusy = false,
    error,
    parsingStatus,
    projectName,
    onProjectNameChange,
    projectLead: _projectLead,
    accountId,
    onAccountChange,
    accept = ".csv,.xlsx,.xls,.pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf",
    onFilesChange,
    onCancel,
    onContinue,
    continueLabel = "Parse file",
}: FileUploadStatementProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { data: accounts = [] } = useAccounts()
    const isMobile = useIsMobile()
    const planFeatures = usePlanFeatures()
    const createAccount = useCreateAccount()

    const [createOpen, setCreateOpen] = useState(false)
    const [limitOpen, setLimitOpen] = useState(false)
    const [newAccountName, setNewAccountName] = useState("")
    const [newAccountType, setNewAccountType] = useState<AccountType>("checking")
    const [newAccountInstitution, setNewAccountInstitution] = useState("")
    const [newAccountCurrency, setNewAccountCurrency] = useState("EUR")

    const maxAccounts = planFeatures?.maxAccounts ?? Infinity
    const planName = planFeatures?.plan ?? "free"
    const atAccountLimit = accounts.length >= maxAccounts

    const resetCreateForm = () => {
        setNewAccountName("")
        setNewAccountType("checking")
        setNewAccountInstitution("")
        setNewAccountCurrency(accounts[0]?.currency ?? "EUR")
    }

    const openCreateFlow = () => {
        if (atAccountLimit) {
            setLimitOpen(true)
            return
        }
        resetCreateForm()
        setCreateOpen(true)
    }

    const handleCreateAccount = async () => {
        const trimmedName = newAccountName.trim()
        if (!trimmedName) {
            toast.error("Account name is required")
            return
        }
        try {
            const account = await createAccount.mutateAsync({
                name: trimmedName,
                accountType: newAccountType,
                currency: newAccountCurrency.trim().toUpperCase() || "EUR",
                institution: newAccountInstitution.trim() || null,
            })
            onAccountChange?.(account.id)
            setCreateOpen(false)
            resetCreateForm()
            toast.success(`${account.name} added`)
        } catch (err: any) {
            const message = err?.message ?? "Failed to create account"
            if (message.toLowerCase().includes("limit") || message.toLowerCase().includes("reached")) {
                setCreateOpen(false)
                setLimitOpen(true)
                return
            }
            toast.error(message)
        }
    }

    const handleFileSelect = (selected: FileList | null) => {
        if (!selected) return
        const incoming = Array.from(selected)
        if (incoming.length === 0) return
        onFilesChange([...files, ...incoming])
    }

    const handleBoxClick = () => {
        fileInputRef.current?.click()
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        handleFileSelect(e.dataTransfer.files)
    }

    const removeFile = (fileKey: string) => {
        onFilesChange(files.filter((file) => getFileKey(file) !== fileKey))
    }

    return (
        <Card className="w-full mx-auto max-w-xl bg-background rounded-lg p-0 shadow-2xl">
            <CardContent className="p-0">
                <div className="p-6 pb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-lg font-medium text-foreground">Import transactions</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Drop your bank statement or CSV file to import transactions.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-6 pb-4 mt-2">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="projectName" className="mb-2">
                                Report name
                            </Label>
                            <Input
                                id="projectName"
                                type="text"
                                value={projectName}
                                onChange={(e) => onProjectNameChange(e.target.value)}
                                placeholder="Monthly statement"
                            />
                        </div>

                        <div>
                            <Label htmlFor="accountPicker" className="mb-2">
                                Account / Card
                            </Label>
                            <Select
                                value={accountId ?? undefined}
                                onValueChange={(v) => {
                                    if (v === CREATE_SENTINEL) {
                                        openCreateFlow()
                                        return
                                    }
                                    onAccountChange?.(v)
                                }}
                            >
                                <SelectTrigger id="accountPicker" className="w-full">
                                    <SelectValue placeholder={accounts.length === 0 ? "Create your first account" : "Pick an account"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {accounts.map((acc) => (
                                            <SelectItem key={acc.id} value={acc.id}>
                                                {acc.name}
                                                {acc.institution ? ` · ${acc.institution}` : ""}
                                            </SelectItem>
                                        ))}
                                        <SelectItem value={CREATE_SENTINEL} className="text-primary">
                                            <Plus className="h-4 w-4" /> Create new account
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            {!isMobile && createOpen ? (
                                <CreateAccountForm
                                    name={newAccountName}
                                    onNameChange={setNewAccountName}
                                    type={newAccountType}
                                    onTypeChange={setNewAccountType}
                                    institution={newAccountInstitution}
                                    onInstitutionChange={setNewAccountInstitution}
                                    currency={newAccountCurrency}
                                    onCurrencyChange={setNewAccountCurrency}
                                    onCancel={() => setCreateOpen(false)}
                                    onSubmit={handleCreateAccount}
                                    submitting={createAccount.isPending}
                                    className="mt-3"
                                />
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="px-6">
                    <div
                        className={cn(
                            "border-2 border-dashed border-border rounded-md p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors",
                            "hover:border-primary/50 hover:bg-primary/5"
                        )}
                        onClick={handleBoxClick}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    >
                        <div className="mb-2 bg-muted rounded-full p-3">
                            <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Upload bank statement</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            or,{" "}
                            <label
                                htmlFor="fileUpload"
                                className="text-primary hover:text-primary/90 font-medium cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                            >
                                click to browse
                            </label>{" "}
                            (CSV, XLSX, PDF)
                        </p>
                        <input
                            type="file"
                            id="fileUpload"
                            ref={fileInputRef}
                            className="hidden"
                            accept={accept}
                            multiple
                            onChange={(e) => handleFileSelect(e.target.files)}
                        />
                    </div>
                </div>

                <div className={cn("px-6 pb-5 space-y-3", files.length > 0 ? "mt-4" : "")}>
                    {files.map((file, index) => {
                        const fileKey = getFileKey(file)
                        const progress = fileProgresses[fileKey] ?? 0
                        const Icon = getFileIcon(file.name)

                        return (
                            <div className="border border-border rounded-lg p-2 flex flex-col" key={`${file.name}-${index}`}>
                                <div className="flex items-center gap-2">
                                    <div className="w-18 h-14 bg-muted rounded-sm flex items-center justify-center self-start row-span-2 overflow-hidden">
                                        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                                    </div>

                                    <div className="flex-1 pr-1">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-foreground truncate max-w-[250px]">{file.name}</span>
                                                <span className="text-sm text-muted-foreground whitespace-nowrap">{formatFileSize(file.size)}</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 bg-transparent! hover:text-red-500"
                                                onClick={() => removeFile(fileKey)}
                                                disabled={isBusy}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="h-2 bg-muted rounded-full overflow-hidden flex-1">
                                                <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
                                            </div>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">{Math.round(progress)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {parsingStatus ? (
                    <div className="px-6 pb-4">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {parsingStatus}
                        </p>
                    </div>
                ) : null}

                {error ? (
                    <div className="px-6 pb-4">
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                ) : null}

                <div className="px-6 py-3 border-t border-border bg-muted rounded-b-lg flex justify-between items-center">
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center text-muted-foreground hover:text-foreground"
                                    type="button"
                                >
                                    <HelpCircle className="h-4 w-4 mr-1" />
                                    Need help?
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="py-3 bg-background text-foreground border">
                                <div className="space-y-1">
                                    <p className="text-[13px] font-medium">Bank statement uploads</p>
                                    <p className="text-muted-foreground dark:text-muted-background text-xs max-w-[220px]">
                                        Drop CSV, Excel, or PDF bank statements. We'll parse and categorize your transactions automatically.
                                    </p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="h-9 px-4 text-sm font-medium"
                            type="button"
                            onClick={onCancel}
                            disabled={isBusy}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="h-9 px-4 text-sm font-medium"
                            type="button"
                            onClick={onContinue}
                            disabled={isBusy || files.length === 0 || !accountId}
                        >
                            {isBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            {continueLabel}
                        </Button>
                    </div>
                </div>
            </CardContent>

            {isMobile ? (
                <Drawer
                    open={createOpen}
                    onOpenChange={(open) => {
                        if (!createAccount.isPending) setCreateOpen(open)
                    }}
                >
                    <DrawerContent>
                        <DrawerHeader>
                            <DrawerTitle>New account</DrawerTitle>
                            <DrawerDescription>
                                Add the bank, card, or cash pocket this statement belongs to.
                            </DrawerDescription>
                        </DrawerHeader>
                        <div className="px-4 pb-4">
                            <CreateAccountForm
                                name={newAccountName}
                                onNameChange={setNewAccountName}
                                type={newAccountType}
                                onTypeChange={setNewAccountType}
                                institution={newAccountInstitution}
                                onInstitutionChange={setNewAccountInstitution}
                                currency={newAccountCurrency}
                                onCurrencyChange={setNewAccountCurrency}
                                onCancel={() => setCreateOpen(false)}
                                onSubmit={handleCreateAccount}
                                submitting={createAccount.isPending}
                                buttonHeight="h-11"
                            />
                        </div>
                    </DrawerContent>
                </Drawer>
            ) : null}

            <AccountLimitDialog
                open={limitOpen}
                onOpenChange={setLimitOpen}
                data={{
                    plan: planName,
                    current: accounts.length,
                    max: maxAccounts === Infinity ? accounts.length : maxAccounts,
                }}
            />
        </Card>
    )
}

interface CreateAccountFormProps {
    name: string
    onNameChange: (v: string) => void
    type: AccountType
    onTypeChange: (v: AccountType) => void
    institution: string
    onInstitutionChange: (v: string) => void
    currency: string
    onCurrencyChange: (v: string) => void
    onCancel: () => void
    onSubmit: () => void
    submitting: boolean
    className?: string
    buttonHeight?: string
}

function CreateAccountForm({
    name,
    onNameChange,
    type,
    onTypeChange,
    institution,
    onInstitutionChange,
    currency,
    onCurrencyChange,
    onCancel,
    onSubmit,
    submitting,
    className,
    buttonHeight = "h-9",
}: CreateAccountFormProps) {
    return (
        <div className={cn("rounded-md border border-border bg-muted/40 p-3 space-y-3", className)}>
            <div>
                <Label htmlFor="newAccountName" className="mb-1.5 text-xs">
                    Name
                </Label>
                <Input
                    id="newAccountName"
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    placeholder="Chase Checking"
                    autoFocus
                />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <Label htmlFor="newAccountType" className="mb-1.5 text-xs">
                        Type
                    </Label>
                    <Select value={type} onValueChange={(v) => onTypeChange(v as AccountType)}>
                        <SelectTrigger id="newAccountType" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="newAccountCurrency" className="mb-1.5 text-xs">
                        Currency
                    </Label>
                    <Input
                        id="newAccountCurrency"
                        value={currency}
                        onChange={(e) => onCurrencyChange(e.target.value.toUpperCase().slice(0, 3))}
                        placeholder="EUR"
                        maxLength={3}
                    />
                </div>
            </div>
            <div>
                <Label htmlFor="newAccountInstitution" className="mb-1.5 text-xs">
                    Institution <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                    id="newAccountInstitution"
                    value={institution}
                    onChange={(e) => onInstitutionChange(e.target.value)}
                    placeholder="Chase, Revolut, …"
                />
            </div>
            <div className="flex gap-2 justify-end pt-1">
                <Button
                    variant="outline"
                    type="button"
                    onClick={onCancel}
                    disabled={submitting}
                    className={buttonHeight}
                >
                    Cancel
                </Button>
                <Button
                    type="button"
                    onClick={onSubmit}
                    disabled={submitting || !name.trim()}
                    className={buttonHeight}
                >
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Create account
                </Button>
            </div>
        </div>
    )
}
