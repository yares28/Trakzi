// lib/security/cors.ts
// CORS configuration for API endpoints

import { NextResponse } from 'next/server';

// Allowed origins - add your production domains here
const ALLOWED_ORIGINS = [
    'https://trakzi.com',
    'https://www.trakzi.com',
    'https://trakzi.vercel.app',
    'https://dev.trakzi.com',
    // Add other Vercel preview URLs if needed
];

// Allow localhost only in development
if (process.env.NODE_ENV === 'development') {
    ALLOWED_ORIGINS.push('http://localhost:3000');
    ALLOWED_ORIGINS.push('http://127.0.0.1:3000');
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
    if (!origin) return true; // Same-origin requests don't have an Origin header

    // In development, allow all localhost variants
    if (process.env.NODE_ENV === 'development') {
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return true;
        }
    }

    // Check against allowed origins
    return ALLOWED_ORIGINS.some(allowed =>
        origin === allowed ||
        origin.endsWith('.vercel.app') // Allow all Vercel preview deployments
    );
}

/**
 * Create CORS headers for a response
 */
export function createCorsHeaders(origin: string | null): Record<string, string> {
    if (!origin || !isOriginAllowed(origin)) {
        return {};
    }

    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400', // 24 hours
    };
}

/**
 * Handle CORS preflight request (OPTIONS)
 */
export function handleCorsPreflightRequest(request: Request): NextResponse | null {
    const origin = request.headers.get('origin');

    // Only handle OPTIONS requests
    if (request.method !== 'OPTIONS') {
        return null;
    }

    if (!isOriginAllowed(origin)) {
        return new NextResponse(null, { status: 403 });
    }

    return new NextResponse(null, {
        status: 204,
        headers: createCorsHeaders(origin),
    });
}

/**
 * Add CORS headers to an existing response
 */
export function addCorsHeaders(response: NextResponse, request: Request): NextResponse {
    const origin = request.headers.get('origin');
    const corsHeaders = createCorsHeaders(origin);

    for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
    }

    return response;
}
