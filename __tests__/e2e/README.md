# End-to-End (E2E) Testing

## Overview

This directory is reserved for end-to-end tests using tools like Playwright or Cypress.

## Setup

### Using Playwright (Recommended)

```bash
npm install -D @playwright/test
npx playwright install
```

### Using Cypress

```bash
npm install -D cypress
npx cypress open
```

## E2E Test Structure

```
__tests__/e2e/
├── auth.spec.ts              # Authentication flows
├── dashboard.spec.ts         # Dashboard interactions
├── file-upload.spec.ts       # File upload workflows
└── navigation.spec.ts        # Navigation and routing
```

## Example E2E Test (Playwright)

```typescript
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('http://localhost:3000/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')
  })
})
```

## Running E2E Tests

### Playwright

```bash
# Run all tests
npx playwright test

# Run in headed mode
npx playwright test --headed

# Run specific test file
npx playwright test auth.spec.ts

# Debug mode
npx playwright test --debug
```

### Cypress

```bash
# Open Cypress Test Runner
npx cypress open

# Run tests headlessly
npx cypress run

# Run specific test file
npx cypress run --spec "cypress/e2e/auth.spec.cy.ts"
```

## Best Practices

1. **Test User Journeys**: Focus on complete user workflows
2. **Use Page Objects**: Create reusable page object models
3. **Wait for Elements**: Use proper waiting strategies
4. **Clean State**: Reset database/state between tests
5. **Visual Testing**: Consider screenshot comparison
6. **Mobile Testing**: Test responsive breakpoints
7. **Performance**: Monitor load times and interactions

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
```

## Debugging Tips

1. Use `page.pause()` in Playwright to pause execution
2. Take screenshots at failure points
3. Record videos of test runs
4. Use browser DevTools
5. Check network requests
6. Verify element selectors

## Environment Variables

Create `.env.test` for E2E tests:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpass123
```




