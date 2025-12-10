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
    try {
        return await ensureUserExists()
    } catch (syncError: any) {
        // If sync fails, log but still return Clerk userId
        // This allows the app to work even if database sync has issues
        console.warn('[Auth] User sync failed, using Clerk userId:', syncError.message)
        return userId
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
