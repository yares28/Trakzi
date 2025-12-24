/**
 * Safe PostHog wrapper utilities
 * 
 * These functions provide error-safe wrappers around PostHog methods
 * to prevent analytics failures from breaking the application.
 */

import posthog from "posthog-js"

/**
 * Check if PostHog is initialized and ready to use
 */
function isPostHogReady(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof posthog === 'undefined') return false
  
  // Check if PostHog has been initialized
  // PostHog sets various internal flags when initialized
  try {
    // @ts-ignore - accessing internal property
    if (posthog.__loaded === true) return true
    // @ts-ignore - accessing internal property
    if (posthog.initialized === true) return true
    // Alternative check: if capture method exists and is a function
    if (typeof posthog.capture === 'function') {
      // Try a test capture to see if it's actually ready
      // We'll catch any errors in the calling function
      return true
    }
  } catch {
    return false
  }
  
  return false
}

/**
 * Safely capture a PostHog event
 * 
 * @param eventName - Name of the event to capture
 * @param properties - Optional properties to attach to the event
 * @returns true if event was captured, false otherwise
 */
export function safeCapture(
  eventName: string,
  properties?: Record<string, any>
): boolean {
  try {
    if (!isPostHogReady()) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PostHog] Not initialized, skipping event:', eventName)
      }
      return false
    }

    posthog.capture(eventName, properties)
    return true
  } catch (error) {
    // Silently fail - analytics should never break the app
    if (process.env.NODE_ENV === 'development') {
      console.warn('[PostHog] Capture failed:', error, { eventName, properties })
    }
    return false
  }
}

/**
 * Safely identify a user to PostHog
 * 
 * @param distinctId - Unique identifier for the user
 * @param properties - Optional user properties
 * @returns true if identification succeeded, false otherwise
 */
export function safeIdentify(
  distinctId: string,
  properties?: Record<string, any>
): boolean {
  try {
    if (!isPostHogReady()) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PostHog] Not initialized, skipping identify')
      }
      return false
    }

    posthog.identify(distinctId, properties)
    return true
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[PostHog] Identify failed:', error, { distinctId, properties })
    }
    return false
  }
}

/**
 * Safely reset PostHog user identity
 * 
 * @returns true if reset succeeded, false otherwise
 */
export function safeReset(): boolean {
  try {
    if (!isPostHogReady()) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PostHog] Not initialized, skipping reset')
      }
      return false
    }

    posthog.reset()
    return true
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[PostHog] Reset failed:', error)
    }
    return false
  }
}

/**
 * Check if PostHog is available (exported for external checks)
 */
export function isPostHogAvailable(): boolean {
  return isPostHogReady()
}

