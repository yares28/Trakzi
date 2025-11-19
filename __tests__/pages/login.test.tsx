import { render, screen } from '@testing-library/react'
import LoginPage from '@/app/login/page'

describe('Login Page', () => {
  it('renders login page', () => {
    render(<LoginPage />)
    
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('displays login form', () => {
    render(<LoginPage />)
    
    expect(screen.getByTestId('login-form')).toBeInTheDocument()
  })

  it('shows page title', () => {
    render(<LoginPage />)
    
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
  })

  it('includes link to register page', () => {
    render(<LoginPage />)
    
    const registerLink = screen.getByText(/create account/i)
    expect(registerLink).toBeInTheDocument()
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register')
  })

  it('renders site header', () => {
    render(<LoginPage />)
    
    expect(screen.getByTestId('site-header')).toBeInTheDocument()
  })
})




