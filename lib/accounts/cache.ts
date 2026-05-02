// lib/accounts/cache.ts
// Shared cache invalidation for account mutations.
//
// Net-worth, analytics, home, trends, savings, fridge, and pockets all read
// transactions joined to bank_accounts — any account mutation (create / update /
// archive / unarchive / delete) can change their output, so we wipe each prefix.

import { invalidateUserCachePrefix } from '@/lib/cache/upstash'

const ACCOUNT_AFFECTED_PREFIXES = [
    'accounts',
    'analytics',
    'home',
    'trends',
    'savings',
    'fridge',
    'pockets',
] as const

export async function invalidateAccountAffectedCaches(userId: string): Promise<void> {
    await Promise.all(
        ACCOUNT_AFFECTED_PREFIXES.map(prefix => invalidateUserCachePrefix(userId, prefix))
    )
}
