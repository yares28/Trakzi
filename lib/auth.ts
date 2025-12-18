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
 * Get the current authenticated user's ID, or return null if not authenticated
 * Useful for optional authentication scenarios
 */
export async function getCurrentUserIdOrNull(): Promise<string | null> {
    try {
        const { userId } = await auth()
        if (!userId) return null

        // Try to sync, but don't fail if it doesn't work
        try {
            return await ensureUserExists()
        } catch {
            return userId
        }
    } catch {
        return null
    }
}
