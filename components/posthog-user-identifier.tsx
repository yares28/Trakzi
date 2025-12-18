"use client"

import { useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import posthog from "posthog-js"

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

    if (isSignedIn && user) {
      // Identify user to PostHog
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName || user.firstName || undefined,
        created_at: user.createdAt?.toISOString(),
      })
    } else {
      // Reset identity when signed out
      posthog.reset()
    }
  }, [isSignedIn, user, isLoaded])

  return null
}
