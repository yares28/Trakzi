// Mock Service Worker (MSW) server setup
// Uncomment when you need API mocking

/*
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
*/

export const server = {
  listen: () => {},
  close: () => {},
  resetHandlers: () => {},
}



