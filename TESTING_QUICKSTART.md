# Testing Quick Start Guide

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Install Testing Dependencies

```bash
npm install
```

This will install all the testing libraries added to your `package.json`:
- Jest (test runner)
- React Testing Library (component testing)
- @testing-library/jest-dom (custom matchers)

### Step 2: Run Your First Test

```bash
npm test
```

This will run all tests in the `__tests__` directory.

### Step 3: Watch Mode for Development

```bash
npm run test:watch
```

Tests will automatically re-run when you make changes.

## 📋 Common Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate coverage report |
| `npm test -- login-form` | Run specific test file |
| `npm test -- auth/` | Run all tests in auth folder |

## 🧪 Your First Custom Test

Create a new test file for a component:

```bash
# Example: Testing a new component
touch __tests__/components/my-component.test.tsx
```

Add this template:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { MyComponent } from '@/components/my-component'

describe('MyComponent', () => {
  it('renders the component', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('handles user interaction', () => {
    render(<MyComponent />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    // Assert expected behavior
  })
})
```

## 📁 Where to Put Tests

Follow this structure:

```
__tests__/
├── auth/              # Authentication-related tests
├── components/        # Reusable component tests
├── pages/            # Page-level tests
├── ui/               # UI component library tests
├── utils/            # Utility function tests
├── hooks/            # Custom hook tests
└── integration/      # Multi-component workflow tests
```

## 🎯 Test Naming Convention

- **File**: `component-name.test.tsx` or `function-name.test.ts`
- **Describe block**: Component or feature name
- **Test**: What it does in plain English

```typescript
describe('LoginForm', () => {
  it('displays validation error for invalid email', () => {
    // Test code
  })
})
```

## 🔍 Finding Elements

Use these queries (in order of preference):

1. **getByRole**: `screen.getByRole('button', { name: 'Submit' })`
2. **getByLabelText**: `screen.getByLabelText('Email')`
3. **getByPlaceholderText**: `screen.getByPlaceholderText('Enter email')`
4. **getByText**: `screen.getByText('Welcome')`
5. **getByTestId**: `screen.getByTestId('custom-element')` (last resort)

## ⚡ Common Patterns

### Testing Button Clicks
```typescript
const button = screen.getByRole('button', { name: 'Submit' })
fireEvent.click(button)
expect(mockFunction).toHaveBeenCalled()
```

### Testing Form Input
```typescript
const input = screen.getByLabelText('Email')
fireEvent.change(input, { target: { value: 'test@example.com' } })
expect(input).toHaveValue('test@example.com')
```

### Testing Async Operations
```typescript
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument()
})
```

### Testing Conditional Rendering
```typescript
expect(screen.getByText('Visible')).toBeInTheDocument()
expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
```

## 🐛 Debugging Tests

### View Rendered HTML
```typescript
const { debug } = render(<Component />)
debug() // Prints HTML to console
```

### Pause Test Execution
```typescript
screen.debug() // Prints current DOM state
```

### Run Single Test
```typescript
it.only('this test will run alone', () => {
  // Test code
})
```

### Skip Test Temporarily
```typescript
it.skip('this test will be skipped', () => {
  // Test code
})
```

## 📊 Understanding Coverage

After running `npm run test:coverage`, check:

- `coverage/lcov-report/index.html` - Open in browser for visual report
- Look for files with < 70% coverage
- Focus on testing critical paths first

## ✅ Pre-Commit Checklist

Before committing code:

- [ ] All tests pass: `npm test`
- [ ] Coverage meets threshold: `npm run test:coverage`
- [ ] No linting errors: `npm run lint`
- [ ] New features have tests

## 🎨 Examples in This Project

Check these files for examples:

- **Form Testing**: `__tests__/auth/login-form.test.tsx`
- **Component Testing**: `__tests__/ui/button.test.tsx`
- **Page Testing**: `__tests__/pages/dashboard.test.tsx`
- **Integration Testing**: `__tests__/integration/auth-flow.test.tsx`
- **Hook Testing**: `__tests__/hooks/use-mobile.test.ts`

## 🆘 Common Issues & Solutions

### Issue: "Cannot find module '@/components/...'"

**Solution**: Check `jest.config.js` has correct path mapping:
```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1',
}
```

### Issue: "window is not defined"

**Solution**: Ensure `testEnvironment: 'jest-environment-jsdom'` in config

### Issue: "useRouter is not defined"

**Solution**: Already mocked in `__tests__/setup.ts`

### Issue: Test timeout

**Solution**: Increase timeout or check for unresolved promises:
```typescript
jest.setTimeout(10000) // 10 seconds
```

## 📚 Learn More

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🎉 You're Ready!

You now have a complete testing setup. Start by:

1. Running `npm test` to see all tests pass
2. Exploring existing test files
3. Writing tests for your new features
4. Maintaining > 70% coverage

Happy Testing! 🚀



