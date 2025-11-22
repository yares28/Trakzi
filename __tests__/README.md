# Testing Guide

## Overview

This directory contains comprehensive tests for all major features of the application.

## Test Structure

```
__tests__/
├── setup.ts                          # Test configuration and global mocks
├── auth/                             # Authentication tests
│   ├── login-form.test.tsx
│   ├── register-form.test.tsx
│   └── auth-provider.test.tsx
├── components/                       # Component tests
│   ├── data-table.test.tsx
│   ├── file-dropzone.test.tsx
│   └── chart-area-interactive.test.tsx
├── navigation/                       # Navigation tests
│   ├── app-sidebar.test.tsx
│   └── nav-main.test.tsx
├── pages/                           # Page tests
│   ├── dashboard.test.tsx
│   ├── login.test.tsx
│   └── register.test.tsx
├── theme/                           # Theme tests
│   ├── theme-provider.test.tsx
│   └── mode-toggle.test.tsx
├── ui/                              # UI component tests
│   ├── button.test.tsx
│   └── input.test.tsx
└── utils/                           # Utility function tests
    └── utils.test.ts
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run specific test file
```bash
npm test -- auth/login-form.test.tsx
```

### Run tests for specific feature
```bash
npm test -- auth/
```

## Writing Tests

### Component Test Template

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { YourComponent } from '@/components/your-component'

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('handles user interaction', () => {
    const mockFn = jest.fn()
    render(<YourComponent onAction={mockFn} />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(mockFn).toHaveBeenCalled()
  })
})
```

### Utility Test Template

```typescript
import { yourUtil } from '@/lib/utils'

describe('yourUtil', () => {
  it('performs expected operation', () => {
    const result = yourUtil('input')
    expect(result).toBe('expected output')
  })
})
```

## Testing Best Practices

1. **Test User Behavior**: Focus on how users interact with components
2. **Avoid Implementation Details**: Don't test internal state or methods
3. **Use Semantic Queries**: Prefer `getByRole`, `getByLabelText` over `getByTestId`
4. **Test Accessibility**: Ensure components are accessible
5. **Mock External Dependencies**: Mock API calls, routers, and external services
6. **Keep Tests Isolated**: Each test should be independent
7. **Write Descriptive Test Names**: Clearly describe what is being tested

## Coverage Goals

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Common Testing Utilities

### Render Helpers
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
```

### Query Methods
- `getBy*`: Throws error if not found (use for elements that should exist)
- `queryBy*`: Returns null if not found (use for elements that shouldn't exist)
- `findBy*`: Async, waits for element (use for async operations)

### Fire Events
```tsx
fireEvent.click(element)
fireEvent.change(input, { target: { value: 'text' } })
fireEvent.submit(form)
```

### Async Testing
```tsx
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument()
})
```

## Debugging Tests

### View rendered HTML
```tsx
const { debug } = render(<Component />)
debug()
```

### Pause test execution
```tsx
import { screen } from '@testing-library/react'
screen.debug()
```

## Continuous Integration

Tests are run automatically on:
- Every push to main branch
- Every pull request
- Before deployment

## Adding New Tests

When adding a new feature, create a corresponding test file:

1. Create test file in appropriate directory
2. Import component/function to test
3. Write test cases covering:
   - Rendering
   - User interactions
   - Edge cases
   - Error handling
4. Run tests to ensure they pass
5. Commit both feature and tests together

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)







