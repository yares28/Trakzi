"use client"

import { memo, useEffect, useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Check, ChevronsUpDown } from "lucide-react"
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
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

const CURRENCIES: { code: string; name: string }[] = [
    { code: "EUR", name: "Euro" },
    { code: "USD", name: "US Dollar" },
    { code: "GBP", name: "British Pound" },
    { code: "CHF", name: "Swiss Franc" },
    { code: "JPY", name: "Japanese Yen" },
    { code: "CAD", name: "Canadian Dollar" },
    { code: "AUD", name: "Australian Dollar" },
    { code: "NZD", name: "New Zealand Dollar" },
    { code: "SEK", name: "Swedish Krona" },
    { code: "NOK", name: "Norwegian Krone" },
    { code: "DKK", name: "Danish Krone" },
    { code: "PLN", name: "Polish Zloty" },
    { code: "CZK", name: "Czech Koruna" },
    { code: "HUF", name: "Hungarian Forint" },
    { code: "RON", name: "Romanian Leu" },
    { code: "BGN", name: "Bulgarian Lev" },
    { code: "HRK", name: "Croatian Kuna" },
    { code: "RSD", name: "Serbian Dinar" },
    { code: "CNY", name: "Chinese Yuan" },
    { code: "HKD", name: "Hong Kong Dollar" },
    { code: "SGD", name: "Singapore Dollar" },
    { code: "TWD", name: "Taiwan Dollar" },
    { code: "KRW", name: "South Korean Won" },
    { code: "INR", name: "Indian Rupee" },
    { code: "IDR", name: "Indonesian Rupiah" },
    { code: "MYR", name: "Malaysian Ringgit" },
    { code: "THB", name: "Thai Baht" },
    { code: "PHP", name: "Philippine Peso" },
    { code: "VND", name: "Vietnamese Dong" },
    { code: "PKR", name: "Pakistani Rupee" },
    { code: "BDT", name: "Bangladeshi Taka" },
    { code: "LKR", name: "Sri Lankan Rupee" },
    { code: "BRL", name: "Brazilian Real" },
    { code: "MXN", name: "Mexican Peso" },
    { code: "ARS", name: "Argentine Peso" },
    { code: "CLP", name: "Chilean Peso" },
    { code: "COP", name: "Colombian Peso" },
    { code: "PEN", name: "Peruvian Sol" },
    { code: "UYU", name: "Uruguayan Peso" },
    { code: "BOB", name: "Bolivian Boliviano" },
    { code: "PYG", name: "Paraguayan Guarani" },
    { code: "ZAR", name: "South African Rand" },
    { code: "NGN", name: "Nigerian Naira" },
    { code: "KES", name: "Kenyan Shilling" },
    { code: "GHS", name: "Ghanaian Cedi" },
    { code: "EGP", name: "Egyptian Pound" },
    { code: "MAD", name: "Moroccan Dirham" },
    { code: "TND", name: "Tunisian Dinar" },
    { code: "DZD", name: "Algerian Dinar" },
    { code: "ETB", name: "Ethiopian Birr" },
    { code: "TZS", name: "Tanzanian Shilling" },
    { code: "UGX", name: "Ugandan Shilling" },
    { code: "SAR", name: "Saudi Riyal" },
    { code: "AED", name: "UAE Dirham" },
    { code: "QAR", name: "Qatari Riyal" },
    { code: "KWD", name: "Kuwaiti Dinar" },
    { code: "BHD", name: "Bahraini Dinar" },
    { code: "OMR", name: "Omani Rial" },
    { code: "JOD", name: "Jordanian Dinar" },
    { code: "ILS", name: "Israeli Shekel" },
    { code: "TRY", name: "Turkish Lira" },
    { code: "RUB", name: "Russian Ruble" },
    { code: "UAH", name: "Ukrainian Hryvnia" },
    { code: "KZT", name: "Kazakhstani Tenge" },
    { code: "GEL", name: "Georgian Lari" },
    { code: "AZN", name: "Azerbaijani Manat" },
    { code: "AMD", name: "Armenian Dram" },
    { code: "BYN", name: "Belarusian Ruble" },
    { code: "ISK", name: "Icelandic Krona" },
]

interface CurrencyComboboxProps {
    value: string
    onChange: (value: string) => void
}

function CurrencyCombobox({ value, onChange }: CurrencyComboboxProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return CURRENCIES
        return CURRENCIES.filter(
            c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
        )
    }, [search])

    const selected = CURRENCIES.find(c => c.code === value)

    return (
        <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch("") }}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                >
                    <span>{selected ? `${selected.code} — ${selected.name}` : "Select currency"}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-2" align="start">
                <Input
                    placeholder="Search currency…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="mb-2 h-8 text-sm"
                    autoFocus
                />
                <div className="max-h-52 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <p className="px-2 py-3 text-xs text-muted-foreground text-center">No currencies found.</p>
                    ) : (
                        filtered.map(c => (
                            <button
                                key={c.code}
                                type="button"
                                className={cn(
                                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                    value === c.code && "bg-accent text-accent-foreground"
                                )}
                                onClick={() => { onChange(c.code); setOpen(false); setSearch("") }}
                            >
                                <Check className={cn("h-3.5 w-3.5 shrink-0", value === c.code ? "opacity-100" : "opacity-0")} />
                                <span className="font-mono text-xs font-medium w-9 shrink-0">{c.code}</span>
                                <span className="text-muted-foreground truncate">{c.name}</span>
                            </button>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}

const schema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    accountType: z.enum(["checking", "savings", "credit_card", "cash", "investment", "loan"] as const),
    institution: z.string().max(100).optional(),
    currency: z.string().length(3),
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
            })
        } else {
            reset({ name: "", accountType: "checking", institution: "", currency: "EUR" })
        }
    }, [editAccount, open, reset])

    const onSubmit = async (values: FormValues) => {
        const payload = {
            name: values.name,
            accountType: values.accountType,
            institution: values.institution?.trim() || null,
            currency: values.currency,
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

                    <div className="space-y-1.5">
                        <Label htmlFor="acc-institution">
                            Institution{" "}
                            <span className="text-muted-foreground text-xs">(optional)</span>
                        </Label>
                        <Input id="acc-institution" placeholder="Revolut, N26…" {...register("institution")} />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Currency</Label>
                        <CurrencyCombobox
                            value={watchedCurrency}
                            onChange={v => setValue("currency", v)}
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
