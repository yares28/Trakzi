import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback(.*)',
  '/', // Landing page is public
  '/features(.*)',
  '/receipt-scanner(.*)',
  '/split-expenses(.*)',
  '/grocery-tracker(.*)',
  '/csv-import(.*)',
  '/blog(.*)',
  '/docs(.*)',
  '/compare(.*)',
  '/pricing(.*)',
  '/es(.*)', // Spanish pages are public
  '/privacy(.*)',
  '/cookies(.*)',
  '/legal(.*)',
  '/terms(.*)',
  '/api/webhooks(.*)',
])

// Public API routes that don't require authentication (webhooks, health checks, demo)
const isPublicApiRoute = createRouteMatcher([
  '/api/webhook/(.*)',
  '/api/webhooks/(.*)',
  '/api/health(.*)',
  '/api/demo/(.*)',
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

// --- Language auto-detection ---

const LANDING_ROUTES = ['/', '/features', '/receipt-scanner', '/split-expenses', '/grocery-tracker', '/csv-import']

const EN_TO_ES: Record<string, string> = {
  '/': '/es',
  '/features': '/es/features',
  '/receipt-scanner': '/es/escaner-tickets',
  '/split-expenses': '/es/dividir-gastos',
  '/grocery-tracker': '/es/gastos-supermercado',
  '/csv-import': '/es/importar-csv',
}

const ES_TO_EN: Record<string, string> = {
  '/es': '/',
  '/es/features': '/features',
  '/es/escaner-tickets': '/receipt-scanner',
  '/es/dividir-gastos': '/split-expenses',
  '/es/gastos-supermercado': '/grocery-tracker',
  '/es/importar-csv': '/csv-import',
}

function isSpanishBrowser(acceptLanguage: string | null): boolean {
  if (!acceptLanguage) return false
  const langs = acceptLanguage.toLowerCase().split(',').map(l => l.trim().split(';')[0])
  return langs.some(l => l.startsWith('es'))
}

export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname

  // Language auto-detection for landing pages
  // Skips if user has manually chosen a language (trakzi-lang cookie)
  const langCookie = req.cookies.get('trakzi-lang')?.value
  const acceptLanguage = req.headers.get('accept-language')

  if (!langCookie) {
    // English landing pages → redirect to Spanish if browser prefers Spanish
    if (LANDING_ROUTES.includes(path) && isSpanishBrowser(acceptLanguage)) {
      const esPath = EN_TO_ES[path] || '/es'
      return NextResponse.redirect(new URL(esPath, req.url))
    }

    // Spanish pages → redirect to English if browser does NOT prefer Spanish
    if (path.startsWith('/es') && !isSpanishBrowser(acceptLanguage)) {
      const enPath = ES_TO_EN[path] || '/'
      return NextResponse.redirect(new URL(enPath, req.url))
    }
  }

  // API routes: enforce auth at middleware level as defense-in-depth
  // Individual routes still call getCurrentUserId() for their own auth logic
  if (path.startsWith('/api/')) {
    // Public API routes (webhooks, health) skip auth — they handle it differently
    if (isPublicApiRoute(req)) {
      return NextResponse.next()
    }

    // For all other API routes, verify the user has a valid session
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
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
  // Exception: demo mode users (identified by cookie) can access pages without auth
  if (!userId && isProtectedRoute(req)) {
    const cookieHeader = req.headers.get('cookie')
    const isDemoMode = cookieHeader?.includes('trakzi-demo-mode=true')
    if (!isDemoMode) {
      const signInUrl = new URL('/sign-in', req.url)
      signInUrl.searchParams.set('redirect_url', path)
      return NextResponse.redirect(signInUrl)
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Landing pages for language detection
    "/",
    "/features",
    "/receipt-scanner",
    "/split-expenses",
    "/grocery-tracker",
    "/csv-import",
    "/es/:path*",
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
