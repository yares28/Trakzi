import { render, screen, waitFor } from '@testing-library/react'
import HomePage from '@/app/home/page'

describe('Home Page', () => {
  it('renders home page', () => {
    render(<HomePage />)
    
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('displays home title', () => {
    render(<HomePage />)
    
    expect(screen.getByText(/home/i)).toBeInTheDocument()
  })

  it('loads and displays home data', async () => {
    render(<HomePage />)
    
    await waitFor(() => {
      // Check for data table or chart components
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })
  })

  it('renders section cards', () => {
    render(<HomePage />)
    
    const cards = screen.getAllByTestId('section-card')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('renders interactive chart', () => {
    render(<HomePage />)
    
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  it('renders data table', () => {
    render(<HomePage />)
    
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('handles loading state', () => {
    render(<HomePage />)
    
    const loadingIndicator = screen.queryByTestId('loading')
    // Should either be loading or loaded
    expect(loadingIndicator || screen.getByRole('main')).toBeTruthy()
  })

  it('handles error state gracefully', async () => {
    // Mock API error
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('API Error'))
    )

    render(<HomePage />)
    
    await waitFor(() => {
      expect(screen.queryByText(/error/i)).toBeInTheDocument()
    })
  })
})







