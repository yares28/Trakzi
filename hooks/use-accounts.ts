import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { BankAccount, CreateAccountDto, UpdateAccountDto } from "@/lib/types/accounts"
import { demoFetch, isDemoActive } from "@/lib/demo/demo-fetch"

async function fetchAccounts(): Promise<BankAccount[]> {
    const res = await demoFetch("/api/accounts")
    if (!res.ok) throw new Error("Failed to fetch accounts")
    const data = await res.json()
    return data.accounts
}

export function useAccounts() {
    const scope = isDemoActive() ? 'demo' : 'live'
    return useQuery({
        queryKey: ["accounts", scope],
        queryFn: fetchAccounts,
    })
}

export function useCreateAccount() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (data: CreateAccountDto) => {
            const res = await fetch("/api/accounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || "Failed to create account")
            return json.account as BankAccount
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
    })
}

export function useUpdateAccount() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateAccountDto & { isActive?: boolean } }) => {
            const res = await fetch(`/api/accounts/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || "Failed to update account")
            return json.account as BankAccount
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
    })
}

export function useDeleteAccount() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || "Failed to delete account")
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
    })
}

