/**
 * Demo-aware fetch wrapper.
 *
 * When the `trakzi-demo-mode` cookie is active, every client-side GET
 * request to `/api/*` is silently redirected to `/api/demo/*` so the
 * page receives mock data instead of hitting the real database.
 *
 * Non-GET requests (POST, PUT, DELETE) are *blocked* in demo mode and
 * return a synthetic 403 response so mutations never leave the client.
 */

const COOKIE_NAME = "trakzi-demo-mode"

function isDemoActive(): boolean {
    if (typeof document === "undefined") return false
    return document.cookie.includes(`${COOKIE_NAME}=true`)
}

export function demoFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
): Promise<Response> {
    // Only intercept string URLs starting with /api/
    if (typeof input !== "string" || !input.startsWith("/api/")) {
        return fetch(input, init)
    }

    // Already a demo route — pass through
    if (input.startsWith("/api/demo/")) {
        return fetch(input, init)
    }

    if (!isDemoActive()) {
        return fetch(input, init)
    }

    // Block mutations in demo mode
    const method = (init?.method ?? "GET").toUpperCase()
    if (method !== "GET") {
        return Promise.resolve(
            new Response(
                JSON.stringify({ error: "Mutations are disabled in demo mode" }),
                { status: 403, headers: { "Content-Type": "application/json" } },
            ),
        )
    }

    // Redirect GET requests: /api/foo → /api/demo/foo
    const demoUrl = input.replace(/^\/api\//, "/api/demo/")
    return fetch(demoUrl, init)
}
