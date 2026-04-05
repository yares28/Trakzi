"use client"

import { memo, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useCreateAccount, useUpdateAccount } from "@/hooks/use-accounts"
import type { BankAccount, AccountType } from "@/lib/types/accounts"

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
    { value: "checking", label: "Checking / Current" },
    { value: "savings", label: "Savings" },
    { value: "credit_card", label: "Credit Card" },
    { value: "cash", label: "Cash" },
    { value: "investment", label: "Investment / Brokerage" },
    { value: "loan", label: "Loan / Mortgage" },
]

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "JPY", "CAD", "AUD", "PLN", "DKK", "SEK", "NOK"]

const schema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    accountType: z.enum(["checking", "savings", "credit_card", "cash", "investment", "loan"] as const),
    institution: z.string().max(100).optional(),
    currency: z.string().length(3),
    currentBalance: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface AccountFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    editAccount?: BankAccount | null
}

export const AccountFormDialog = memo(function AccountFormDialog({
    open,
    onOpenChange,
    editAccount,
}: AccountFormDialogProps) {
    const isEdit = !!editAccount
    const createAccount = useCreateAccount()
    const updateAccount = useUpdateAccount()

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: "",
            accountType: "checking",
            institution: "",
            currency: "EUR",
            currentBalance: "",
        },
    })

    const watchedType = watch("accountType")
    const watchedCurrency = watch("currency")

    useEffect(() => {
        if (editAccount) {
            reset({
                name: editAccount.name,
                accountType: editAccount.accountType,
                institution: editAccount.institution ?? "",
                currency: editAccount.currency,
                currentBalance: editAccount.currentBalance !== null
                    ? String(editAccount.currentBalance)
                    : "",
            })
        } else {
            reset({ name: "", accountType: "checking", institution: "", currency: "EUR", currentBalance: "" })
        }
    }, [editAccount, open, reset])

    const onSubmit = async (values: FormValues) => {
        const payload = {
            name: values.name,
            accountType: values.accountType,
            institution: values.institution?.trim() || null,
            currency: values.currency,
            currentBalance: values.currentBalance ? parseFloat(values.currentBalance) : null,
        }

        try {
            if (isEdit && editAccount) {
                await updateAccount.mutateAsync({ id: editAccount.id, data: payload })
                toast.success("Account updated")
            } else {
                await createAccount.mutateAsync(payload)
                toast.success("Account created")
            }
            onOpenChange(false)
        } catch (err: any) {
            toast.error(err.message || "Something went wrong")
        }
    }

    const isPending = createAccount.isPending || updateAccount.isPending

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Account" : "Add Account"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="acc-name">Account name</Label>
                        <Input id="acc-name" placeholder="e.g. N26 Checking, Amex Gold" {...register("name")} />
                        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label>Type</Label>
                        <Select value={watchedType} onValueChange={v => setValue("accountType", v as AccountType)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ACCOUNT_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.accountType && <p className="text-xs text-destructive">{errors.accountType.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="acc-institution">
                                Institution{" "}
                                <span className="text-muted-foreground text-xs">(optional)</span>
                            </Label>
                            <Input id="acc-institution" placeholder="Revolut, N26…" {...register("institution")} />
                        </div>

                        <div className="space-y-1.5">
                            <Label>Currency</Label>
                            <Select value={watchedCurrency} onValueChange={v => setValue("currency", v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CURRENCIES.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="acc-balance">
                            Current balance{" "}
                            <span className="text-muted-foreground text-xs">(optional)</span>
                        </Label>
                        <Input
                            id="acc-balance"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...register("currentBalance")}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Saving…" : isEdit ? "Save changes" : "Add account"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
})

AccountFormDialog.displayName = "AccountFormDialog"
