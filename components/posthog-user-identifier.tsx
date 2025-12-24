"use client"

import { useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { safeIdentify, safeReset } from "@/lib/posthog-safe"

/**
 * PostHog User Identifier Component
 *
 * This component identifies the current user to PostHog when they sign in,
 * and resets the identity when they sign out.
 *
 * Place this component inside ClerkProvider in your layout.
 */
export function PostHogUserIdentifier() {
  const { isSignedIn, user, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded) return

    try {
      if (isSignedIn && user) {
        // Identify user to PostHog
        safeIdentify(user.id, {
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName || user.firstName || undefined,
          created_at: user.createdAt?.toISOString(),
        })
      } else {
        // Reset identity when signed out
        safeReset()
      }
    } catch (error) {
      // Silently handle errors - analytics should never break the app
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PostHog] User identification error:', error)
      }
    }
  }, [isSignedIn, user, isLoaded])

  return null
}
