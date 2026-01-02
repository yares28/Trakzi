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
  '/api/webhooks(.*)',
  '/testCharts(.*)',
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
])

export default clerkMiddleware(async (auth, req) => {
  // BYPASS: Skip all auth checks in development when enabled
  if (BYPASS_AUTH) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV] Auth bypass enabled - skipping authentication')
    }
    return NextResponse.next()
  }

  const { userId } = await auth()

  // If user is signed in and trying to access sign-in/sign-up, redirect to home
  if (userId && (req.nextUrl.pathname.startsWith('/sign-in') || req.nextUrl.pathname.startsWith('/sign-up'))) {
    return NextResponse.redirect(new URL('/home', req.url))
  }

  // If user is not signed in and trying to access protected routes, redirect to sign-in
  if (!userId && isProtectedRoute(req)) {
    const signInUrl = new URL('/sign-in', req.url)
    signInUrl.searchParams.set('redirect_url', req.nextUrl.pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  // OPTIMIZED: Only run middleware on protected page routes
  // API routes handle their own auth via getCurrentUserId() - no middleware needed
  // This reduces Vercel Fluid CPU usage by ~70-80%
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
    // Auth routes for sign-in redirect logic
    "/sign-in/:path*",
    "/sign-up/:path*",
  ],
};
