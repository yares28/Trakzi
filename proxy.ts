import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// ============================================================================
// DEVELOPMENT AUTH BYPASS
// Set BYPASS_CLERK_AUTH=true in your .env file to skip authentication
// See DEV_AUTH_BYPASS.md for more details
// ============================================================================
const BYPASS_AUTH = process.env.BYPASS_CLERK_AUTH === 'true'

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback(.*)',
  '/', // Landing page is public
  '/privacy(.*)',
  '/cookies(.*)',
  '/legal(.*)',
  '/terms(.*)',
  '/api/webhooks(.*)',
])

// Protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/home(.*)',
  '/analytics(.*)',
  '/dashboard(.*)',
  '/data-library(.*)',
  '/fridge(.*)',
  '/reports(.*)',
  '/savings(.*)',
  '/trends(.*)',
  '/chat(.*)',
  '/billing(.*)',
  '/pockets(.*)',
  '/testCharts(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname

  // FAST PATH: Skip auth() for API routes - they handle auth internally via getCurrentUserId()
  // Proxy still runs to set up Clerk context, but we avoid the expensive auth() call
  if (path.startsWith('/api/')) {
    return NextResponse.next()
  }

  // BYPASS: Skip all auth checks in development when enabled
  if (BYPASS_AUTH) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV] Auth bypass enabled - skipping authentication')
    }
    return NextResponse.next()
  }

  // Only call auth() for page routes that need redirect logic
  const { userId } = await auth()

  // If user is signed in and trying to access sign-in/sign-up, redirect to home
  if (userId && (path.startsWith('/sign-in') || path.startsWith('/sign-up'))) {
    return NextResponse.redirect(new URL('/home', req.url))
  }

  // If user is not signed in and trying to access protected routes, redirect to sign-in
  if (!userId && isProtectedRoute(req)) {
    const signInUrl = new URL('/sign-in', req.url)
    signInUrl.searchParams.set('redirect_url', path)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  // Proxy must run on routes that need Clerk auth() to work
  // Clerk's auth() returns null if proxy doesn't run on the route
  matcher: [
    // Protected page routes that need auth redirect logic
    "/home/:path*",
    "/analytics/:path*",
    "/dashboard/:path*",
    "/data-library/:path*",
    "/fridge/:path*",
    "/reports/:path*",
    "/savings/:path*",
    "/trends/:path*",
    "/chat/:path*",
    "/billing/:path*",
    "/pockets/:path*",
    "/testCharts/:path*",
    // Auth routes for sign-in redirect logic
    "/sign-in/:path*",
    "/sign-up/:path*",
    // API routes need proxy for auth() to work
    "/api/:path*",
  ],
}
