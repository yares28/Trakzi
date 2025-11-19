import { render, screen, fireEvent } from '@testing-library/react'
import { ModeToggle } from '@/components/mode-toggle'

describe('ModeToggle', () => {
  it('renders theme toggle button', () => {
    render(<ModeToggle />)
    
    const toggleButton = screen.getByRole('button')
    expect(toggleButton).toBeInTheDocument()
  })

  it('shows theme options on click', () => {
    render(<ModeToggle />)
    
    const toggleButton = screen.getByRole('button')
    fireEvent.click(toggleButton)
    
    expect(screen.getByText(/light/i)).toBeInTheDocument()
    expect(screen.getByText(/dark/i)).toBeInTheDocument()
    expect(screen.getByText(/system/i)).toBeInTheDocument()
  })

  it('changes theme when option is selected', () => {
    const mockSetTheme = jest.fn()
    
    render(<ModeToggle onThemeChange={mockSetTheme} />)
    
    const toggleButton = screen.getByRole('button')
    fireEvent.click(toggleButton)
    
    const darkOption = screen.getByText(/dark/i)
    fireEvent.click(darkOption)
    
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('displays current theme icon', () => {
    render(<ModeToggle currentTheme="dark" />)
    
    const icon = screen.getByTestId('theme-icon')
    expect(icon).toBeInTheDocument()
  })
})



