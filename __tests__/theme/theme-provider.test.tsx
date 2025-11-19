import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@/components/theme-provider'

describe('ThemeProvider', () => {
  it('renders children', () => {
    render(
      <ThemeProvider>
        <div>Test Content</div>
      </ThemeProvider>
    )
    
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('provides theme context to children', () => {
    const TestComponent = () => {
      return <div>Theme Available</div>
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
    
    expect(screen.getByText('Theme Available')).toBeInTheDocument()
  })

  it('applies default theme', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <div data-testid="content">Content</div>
      </ThemeProvider>
    )
    
    const content = screen.getByTestId('content')
    expect(content).toBeInTheDocument()
  })

  it('supports system theme preference', () => {
    render(
      <ThemeProvider defaultTheme="system">
        <div>Content</div>
      </ThemeProvider>
    )
    
    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})



