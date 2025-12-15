import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)', 
  '/sign-up(.*)',
  '/sso-callback(.*)',
  '/', // Landing page is public
  '/api/webhooks(.*)',
])

// Protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/home(.*)',
  '/analytics(.*)',
  '/data-library(.*)',
  '/fridge(.*)',
  '/reports(.*)',
  '/savings(.*)',
  '/trends(.*)',
  '/chat(.*)', // Chat page is protected
])

export default clerkMiddleware(async (auth, req) => {
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
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

