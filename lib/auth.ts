// lib/auth.ts
import { auth } from '@clerk/nextjs/server'
import { ensureUserExists } from './user-sync'

/**
 * Get the current authenticated user's ID from Clerk
 * Also ensures the user exists in the database
 * @returns The database user ID (synced with Clerk)
 * @throws Error if user is not authenticated
 */
export async function getCurrentUserId(): Promise<string> {
    const { userId } = await auth()

    if (!userId) {
        throw new Error("Unauthorized - Please sign in to access this resource")
    }

    // Ensure user exists in database and return the synced user ID
    // This MUST succeed for subscriptions and other features to work correctly
    try {
        return await ensureUserExists()
    } catch (syncError: any) {
        // Log the full error for debugging
        console.error('[Auth] CRITICAL: User sync failed!', {
            clerkUserId: userId,
            error: syncError.message,
            stack: syncError.stack
        })

        // Re-throw so the calling code knows there's an issue
        throw new Error(`User database sync failed: ${syncError.message}`)
    }
}

/**
 * Get the current authenticated user's ID, or return null if not authenticated.
 * Useful for optional-authentication scenarios.
 *
 * Failure mode: if Clerk-to-DB sync fails, we now return null instead of falling
 * back to the raw Clerk userId. Previously the helper would hand callers an
 * unsynced ID, meaning downstream queries could execute under a user_id that
 * has no `users` row — opening odd edge cases where plan checks or FK-dependent
 * inserts behave inconsistently. Returning null forces callers to treat the
 * request as unauthenticated when the DB isn't in a state we trust.
 */
export async function getCurrentUserIdOrNull(): Promise<string | null> {
    try {
        const { userId } = await auth()
        if (!userId) return null

        try {
            return await ensureUserExists()
        } catch (syncError: any) {
            console.warn('[Auth] getCurrentUserIdOrNull: user sync failed, treating as unauthenticated', {
                clerkUserId: userId,
                error: syncError?.message,
            })
            return null
        }
    } catch {
        return null
    }
}
