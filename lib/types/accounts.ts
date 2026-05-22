// lib/types/accounts.ts
// TypeScript types for the multi-account model

export type AccountType =
    | 'checking'    // Debit / current account
    | 'savings'     // Savings / ISA
    | 'credit_card' // Credit card (payments between it and checking are transfers)
    | 'cash'        // Physical cash tracking
    | 'investment'  // Brokerage (excluded from spending analytics)
    | 'loan'        // Mortgage, car loan (liability)

export type SyncStatus = 'manual' | 'active' | 'expired' | 'error'

export type TransferStatus = 'pending' | 'suggested' | 'confirmed' | 'rejected'

export interface BankAccount {
    id: string
    userId: string
    name: string
    accountType: AccountType
    currency: string
    institution: string | null
    color: string | null
    isActive: boolean
    displayOrder: number
    syncProvider: string | null
    syncExternalId: string | null
    syncConsentExpires: string | null
    syncLastAt: string | null
    syncStatus: SyncStatus
    createdAt: string
    updatedAt: string
}

export interface CreateAccountDto {
    name: string
    accountType: AccountType
    currency?: string
    institution?: string | null
    color?: string | null
}

export interface UpdateAccountDto {
    name?: string
    accountType?: AccountType
    currency?: string
    institution?: string | null
    color?: string | null
    displayOrder?: number
}

export interface AccountTransfer {
    id: string
    userId: string
    fromTxId: number
    toTxId: number
    amount: number
    status: TransferStatus
    createdAt: string
}

export interface AccountTransferWithDetails extends AccountTransfer {
    fromTx: {
        id: number
        description: string
        amount: number
        txDate: string
        accountId: string | null
        accountName: string | null
    }
    toTx: {
        id: number
        description: string
        amount: number
        txDate: string
        accountId: string | null
        accountName: string | null
    }
}

export interface AccountLimitStatus {
    allowed: boolean
    current: number
    max: number
    plan: string
}
