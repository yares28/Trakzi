import { render, screen, fireEvent } from '@testing-library/react'
import { AppSidebar } from '@/components/app-sidebar'

describe('AppSidebar', () => {
  it('renders sidebar with navigation items', () => {
    render(<AppSidebar />)
    
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('displays all main navigation links', () => {
    render(<AppSidebar />)
    
    // Check for common navigation items
    expect(screen.getByText(/home/i)).toBeInTheDocument()
  })

  it('highlights active navigation item', () => {
    render(<AppSidebar activeItem="home" />)
    
    const homeLink = screen.getByText(/home/i)
    expect(homeLink.closest('a')).toHaveClass('active')
  })

  it('toggles sidebar visibility', () => {
    render(<AppSidebar collapsible />)
    
    const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i })
    fireEvent.click(toggleButton)
    
    const sidebar = screen.getByRole('navigation')
    expect(sidebar).toHaveClass('collapsed')
  })

  it('renders user section', () => {
    render(<AppSidebar />)
    
    expect(screen.getByTestId('nav-user')).toBeInTheDocument()
  })

  it('renders secondary navigation', () => {
    render(<AppSidebar />)
    
    expect(screen.getByTestId('nav-secondary')).toBeInTheDocument()
  })

  it('handles navigation item clicks', () => {
    const mockOnNavigate = jest.fn()
    render(<AppSidebar onNavigate={mockOnNavigate} />)
    
    const homeLink = screen.getByText(/home/i)
    fireEvent.click(homeLink)
    
    expect(mockOnNavigate).toHaveBeenCalledWith('home')
  })

  it('supports mobile responsive behavior', () => {
    render(<AppSidebar />)
    
    // Test mobile menu toggle
    global.innerWidth = 375
    global.dispatchEvent(new Event('resize'))
    
    const sidebar = screen.getByRole('navigation')
    expect(sidebar).toHaveAttribute('data-mobile', 'true')
  })
})







