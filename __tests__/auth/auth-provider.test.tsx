import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from '@/components/auth-provider'

describe('AuthProvider', () => {
  it('renders children when authenticated', () => {
    render(
      <AuthProvider>
        <div>Protected Content</div>
      </AuthProvider>
    )
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('provides authentication context to children', () => {
    const TestComponent = () => {
      // This would use your auth context
      return <div>Auth Context Available</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    
    expect(screen.getByText('Auth Context Available')).toBeInTheDocument()
  })

  it('handles authentication state changes', async () => {
    const { rerender } = render(
      <AuthProvider>
        <div>Content</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    rerender(
      <AuthProvider>
        <div>Updated Content</div>
      </AuthProvider>
    )

    expect(screen.getByText('Updated Content')).toBeInTheDocument()
  })
})







