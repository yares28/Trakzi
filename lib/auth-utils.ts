// lib/auth-utils.ts
// Utility functions for authentication and error handling

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { ensureUserExists } from './user-sync'

/**
 * Wrapper for API routes that require authentication
 * Handles auth errors gracefully and ensures user exists in database
 * 
 * @param handler - The API route handler function
 * @returns Wrapped handler with auth error handling
 */
export function withAuth<T extends any[]>(
    handler: (userId: string, ...args: T) => Promise<NextResponse>
) {
    return async (...args: T): Promise<NextResponse> => {
        try {
            // Get Clerk user ID
            const { userId } = await auth()
            
            if (!userId) {
                return NextResponse.json(
                    { error: 'Unauthorized - Please sign in to access this resource' },
                    { status: 401 }
                )
            }

            // Ensure user exists in database (syncs Clerk user with DB)
            let dbUserId: string
            try {
                dbUserId = await ensureUserExists()
            } catch (syncError: any) {
                console.error('[Auth] User sync error:', syncError)
                // If sync fails, still use Clerk userId (might work if schema allows)
                dbUserId = userId
            }

            // Call the handler with the user ID
            return await handler(dbUserId, ...args)
        } catch (error: any) {
            console.error('[Auth] Authentication error:', error)
            
            // Handle specific auth errors
            if (error.message?.includes('Unauthorized') || error.message?.includes('sign in')) {
                return NextResponse.json(
                    { error: error.message || 'Unauthorized' },
                    { status: 401 }
                )
            }

            // Generic error
            return NextResponse.json(
                { error: error.message || 'Internal server error' },
                { status: 500 }
            )
        }
    }
}

/**
 * Get authenticated user ID with proper error handling
 * Returns null if not authenticated (for optional auth scenarios)
 */
export async function getUserIdOrNull(): Promise<string | null> {
    try {
        const { userId } = await auth()
        return userId
    } catch {
        return null
    }
}

