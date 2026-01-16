import { PostHog } from 'posthog-node'

let posthogClient: PostHog | null = null

/**
 * Get the PostHog ingestion API host
 * Converts UI host to ingestion host if needed
 */
function getIngestionHost(): string {
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
  
  // Convert UI host to ingestion host if needed
  // e.g., https://eu.posthog.com -> https://eu.i.posthog.com
  if (host.includes('posthog.com') && !host.includes('.i.posthog.com')) {
    return host.replace('posthog.com', 'i.posthog.com')
  }
  
  return host
}

/**
 * Get or create the PostHog server-side client
 * 
 * @returns PostHog client instance or null if not configured
 */
export function getPostHogClient(): PostHog | null {
  if (!posthogClient) {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

    if (!apiKey) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PostHog] Server client: API key not configured')
      }
      return null
    }

    const host = getIngestionHost()

    try {
      posthogClient = new PostHog(apiKey, {
        host,
        // Flush immediately for serverless environments
        flushAt: 1,
        flushInterval: 0
      })
      
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PostHog] Server client initialized with host:', host)
      }
    } catch (error) {
      console.error('[PostHog] Failed to initialize server client:', error)
      return null
    }
  }
  return posthogClient
}

/**
 * Safely capture an event from the server-side
 * 
 * @param eventName - Name of the event
 * @param properties - Event properties
 * @param distinctId - Optional user distinct ID
 */
export async function captureServerEvent(
  eventName: string,
  properties?: Record<string, any>,
  distinctId?: string
): Promise<boolean> {
  try {
    const client = getPostHogClient()
    if (!client) return false

    client.capture({
      distinctId: distinctId || 'server',
      event: eventName,
      properties,
    })

    // Client will auto-flush based on flushAt: 1 setting
    return true
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[PostHog] Server capture failed:', error)
    }
    return false
  }
}

/**
 * Gracefully shutdown the PostHog client
 */
export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    try {
      await posthogClient.shutdown()
      posthogClient = null
    } catch (error) {
      console.error('[PostHog] Shutdown error:', error)
    }
  }
}
