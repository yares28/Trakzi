// lib/accounts/index.ts
// Data access layer for bank accounts

import { neonQuery } from '@/lib/neonClient'
import { checkAccountLimit } from '@/lib/feature-access'
import { BankAccount, CreateAccountDto, UpdateAccountDto } from '@/lib/types/accounts'

// ── Row ↔ Domain mapping ──────────────────────────────────────────────────────

interface AccountRow {
    id: string
    user_id: string
    name: string
    account_type: string
    currency: string
    current_balance: string | null
    institution: string | null
    color: string | null
    is_active: boolean
    display_order: number
    sync_provider: string | null
    sync_external_id: string | null
    sync_consent_expires: string | null
    sync_last_at: string | null
    sync_status: string
    created_at: string
    updated_at: string
}

function rowToAccount(row: AccountRow): BankAccount {
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        accountType: row.account_type as BankAccount['accountType'],
        currency: row.currency,
        currentBalance: row.current_balance !== null ? parseFloat(row.current_balance) : null,
        institution: row.institution,
        color: row.color,
        isActive: row.is_active,
        displayOrder: row.display_order,
        syncProvider: row.sync_provider,
        syncExternalId: row.sync_external_id,
        syncConsentExpires: row.sync_consent_expires,
        syncLastAt: row.sync_last_at,
        syncStatus: row.sync_status as BankAccount['syncStatus'],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getUserAccounts(userId: string): Promise<BankAccount[]> {
    const rows = await neonQuery<AccountRow>(
        `SELECT * FROM bank_accounts
         WHERE user_id = $1 AND is_active = true
         ORDER BY display_order ASC, created_at ASC`,
        [userId]
    )
    return rows.map(rowToAccount)
}

export async function getAllUserAccounts(userId: string): Promise<BankAccount[]> {
    const rows = await neonQuery<AccountRow>(
        `SELECT * FROM bank_accounts
         WHERE user_id = $1
         ORDER BY is_active DESC, display_order ASC, created_at ASC`,
        [userId]
    )
    return rows.map(rowToAccount)
}

export async function getAccountById(userId: string, accountId: string): Promise<BankAccount | null> {
    const rows = await neonQuery<AccountRow>(
        `SELECT * FROM bank_accounts WHERE id = $1 AND user_id = $2 LIMIT 1`,
        [accountId, userId]
    )
    return rows[0] ? rowToAccount(rows[0]) : null
}

export async function getAccountCount(userId: string, activeOnly = true): Promise<number> {
    const rows = await neonQuery<{ count: string }>(
        activeOnly
            ? `SELECT COUNT(*) AS count FROM bank_accounts WHERE user_id = $1 AND is_active = true`
            : `SELECT COUNT(*) AS count FROM bank_accounts WHERE user_id = $1`,
        [userId]
    )
    return parseInt(rows[0]?.count || '0')
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createAccount(userId: string, data: CreateAccountDto): Promise<BankAccount> {
    const access = await checkAccountLimit(userId)
    if (!access.allowed) {
        throw new Error(access.reason || 'Account limit reached')
    }

    // Get max display_order for ordering new account at end
    const orderRows = await neonQuery<{ max: string | null }>(
        `SELECT MAX(display_order) AS max FROM bank_accounts WHERE user_id = $1`,
        [userId]
    )
    const nextOrder = (orderRows[0]?.max !== null ? parseInt(orderRows[0].max!) : -1) + 1

    const rows = await neonQuery<AccountRow>(
        `INSERT INTO bank_accounts (user_id, name, account_type, currency, current_balance, institution, color, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
            userId,
            data.name.trim(),
            data.accountType,
            data.currency ?? 'EUR',
            data.currentBalance ?? null,
            data.institution?.trim() ?? null,
            data.color ?? null,
            nextOrder,
        ]
    )
    if (!rows[0]) throw new Error('Failed to create account')
    return rowToAccount(rows[0])
}

export async function updateAccount(
    userId: string,
    accountId: string,
    data: UpdateAccountDto
): Promise<BankAccount> {
    const existing = await getAccountById(userId, accountId)
    if (!existing) throw new Error('Account not found')

    const rows = await neonQuery<AccountRow>(
        `UPDATE bank_accounts
         SET name             = COALESCE($3, name),
             account_type     = COALESCE($4, account_type),
             currency         = COALESCE($5, currency),
             current_balance  = $6,
             institution      = $7,
             color            = $8,
             display_order    = COALESCE($9, display_order),
             updated_at       = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [
            accountId,
            userId,
            data.name?.trim() ?? null,
            data.accountType ?? null,
            data.currency ?? null,
            data.currentBalance !== undefined ? data.currentBalance : existing.currentBalance,
            data.institution !== undefined ? data.institution?.trim() ?? null : existing.institution,
            data.color !== undefined ? data.color : existing.color,
            data.displayOrder ?? null,
        ]
    )
    if (!rows[0]) throw new Error('Account not found')
    return rowToAccount(rows[0])
}

export async function archiveAccount(userId: string, accountId: string): Promise<void> {
    const result = await neonQuery<{ id: string }>(
        `UPDATE bank_accounts SET is_active = false, updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [accountId, userId]
    )
    if (!result[0]) throw new Error('Account not found')
}

export async function unarchiveAccount(userId: string, accountId: string): Promise<BankAccount> {
    // Check limit before re-activating
    const access = await checkAccountLimit(userId)
    if (!access.allowed) {
        throw new Error(access.reason || 'Account limit reached. Archive another account first.')
    }

    const rows = await neonQuery<AccountRow>(
        `UPDATE bank_accounts SET is_active = true, updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [accountId, userId]
    )
    if (!rows[0]) throw new Error('Account not found')
    return rowToAccount(rows[0])
}

/**
 * On plan downgrade: archive the oldest active accounts that exceed the new limit.
 * Never deletes — archived accounts can be unarchived if the user upgrades again.
 * Returns the number of accounts archived.
 */
export async function enforceAccountLimitOnDowngrade(
    userId: string,
    newLimit: number
): Promise<number> {
    const active = await getUserAccounts(userId)
    if (active.length <= newLimit) return 0

    const excess = active
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(newLimit) // keep the first `newLimit` (oldest), archive the rest

    for (const acc of excess) {
        await archiveAccount(userId, acc.id)
    }
    return excess.length
}

export async function deleteAccount(userId: string, accountId: string): Promise<void> {
    // Block deletion if transactions are linked
    const txCount = await neonQuery<{ count: string }>(
        `SELECT COUNT(*) AS count FROM transactions
         WHERE account_id = $1 AND user_id = $2`,
        [accountId, userId]
    )
    if (parseInt(txCount[0]?.count || '0') > 0) {
        throw new Error(
            'Cannot delete an account with transactions. Archive it instead, or re-assign the transactions first.'
        )
    }

    const result = await neonQuery<{ id: string }>(
        `DELETE FROM bank_accounts WHERE id = $1 AND user_id = $2 RETURNING id`,
        [accountId, userId]
    )
    if (!result[0]) throw new Error('Account not found')
}
