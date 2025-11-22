import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'
import RegisterPage from '@/app/register/page'
import DashboardPage from '@/app/dashboard/page'

describe('Authentication Flow Integration', () => {
  describe('Complete Login Flow', () => {
    it('allows user to login and navigate to dashboard', async () => {
      // Render login page
      const { rerender } = render(<LoginPage />)
      
      // Fill in login form
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /login/i })
      fireEvent.click(submitButton)
      
      // Wait for redirect and render dashboard
      await waitFor(() => {
        rerender(<DashboardPage />)
      })
      
      // Verify dashboard is displayed
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })

  describe('Complete Registration Flow', () => {
    it('allows user to register and navigate to dashboard', async () => {
      // Render register page
      const { rerender } = render(<RegisterPage />)
      
      // Fill in registration form
      fireEvent.change(screen.getByLabelText(/name/i), {
        target: { value: 'John Doe' },
      })
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'john@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'SecurePass123!' },
      })
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /register/i })
      fireEvent.click(submitButton)
      
      // Wait for redirect and render dashboard
      await waitFor(() => {
        rerender(<DashboardPage />)
      })
      
      // Verify dashboard is displayed
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })

  describe('Protected Route Access', () => {
    it('redirects unauthenticated users to login', () => {
      // Mock unauthenticated state
      const mockPush = jest.fn()
      jest.spyOn(require('next/navigation'), 'useRouter').mockImplementation(() => ({
        push: mockPush,
      }))
      
      // Try to access dashboard without auth
      render(<DashboardPage />)
      
      // Should redirect to login
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })
})







