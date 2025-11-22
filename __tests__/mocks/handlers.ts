// Mock Service Worker (MSW) handlers for API mocking
// Uncomment and configure when you need API mocking

/*
import { rest } from 'msw'

export const handlers = [
  // Mock login endpoint
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
        },
        token: 'mock-jwt-token',
      })
    )
  }),

  // Mock register endpoint
  rest.post('/api/auth/register', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
        },
        token: 'mock-jwt-token',
      })
    )
  }),

  // Mock dashboard data endpoint
  rest.get('/api/dashboard', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: [
          { id: 1, name: 'Item 1', value: 100 },
          { id: 2, name: 'Item 2', value: 200 },
        ],
      })
    )
  }),
]
*/

export const handlers: any[] = []







