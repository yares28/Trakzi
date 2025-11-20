import { render, screen } from '@testing-library/react'
import RegisterPage from '@/app/register/page'

describe('Register Page', () => {
  it('renders register page', () => {
    render(<RegisterPage />)
    
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('displays register form', () => {
    render(<RegisterPage />)
    
    expect(screen.getByTestId('register-form')).toBeInTheDocument()
  })

  it('shows page title', () => {
    render(<RegisterPage />)
    
    expect(screen.getByText(/create account/i)).toBeInTheDocument()
  })

  it('includes link to login page', () => {
    render(<RegisterPage />)
    
    const loginLink = screen.getByText(/already have an account/i)
    expect(loginLink).toBeInTheDocument()
  })

  it('displays terms and conditions', () => {
    render(<RegisterPage />)
    
    expect(screen.getByText(/terms/i)).toBeInTheDocument()
  })
})





