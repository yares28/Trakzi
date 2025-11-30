import '@testing-library/jest-dom'

// Polyfill TextDecoder and TextEncoder for Neon serverless client
// These are needed in jsdom environment
if (typeof global.TextDecoder === 'undefined') {
  const { TextDecoder, TextEncoder } = require('util')
  global.TextDecoder = TextDecoder
  global.TextEncoder = TextEncoder
}

// Polyfill fetch for Neon serverless client
// Neon client requires fetch to make HTTP requests
// In Node.js 18+, fetch is available globally
if (typeof global.fetch === 'undefined') {
  // Try to use Node's built-in fetch (Node 18+)
  // In Node environment, fetch should be available
  if (typeof fetch !== 'undefined') {
    global.fetch = fetch
  } else {
    // Fallback: try to import from undici (Node's internal fetch implementation)
    try {
      // @ts-ignore - undici might not have types
      const { fetch: nodeFetch, Headers, Request, Response } = require('undici')
      global.fetch = nodeFetch as typeof fetch
      global.Headers = Headers
      global.Request = Request
      global.Response = Response
    } catch (e) {
      // If undici is not available and fetch is not global, we need a polyfill
      console.warn(
        'fetch is not available. Please ensure you are using Node.js 18+ or install node-fetch: npm install --save-dev node-fetch@2'
      )
    }
  }
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }
  },
  usePathname() {
    return ''
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock next-themes
jest.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
}))







