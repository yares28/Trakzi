/**
 * Server-safe demo helpers — no "use client" directive.
 * Safe to import from Server Components, middleware, and API routes.
 */

const DEMO_COOKIE_NAME = "trakzi-demo-mode"

export function isDemoCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false
  return cookieHeader.includes(`${DEMO_COOKIE_NAME}=true`)
}
