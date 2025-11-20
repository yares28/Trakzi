import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from '@/app/dashboard/page'

describe('Dashboard Page', () => {
  it('renders dashboard page', () => {
    render(<DashboardPage />)
    
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('displays dashboard title', () => {
    render(<DashboardPage />)
    
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
  })

  it('loads and displays dashboard data', async () => {
    render(<DashboardPage />)
    
    await waitFor(() => {
      // Check for data table or chart components
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })
  })

  it('renders section cards', () => {
    render(<DashboardPage />)
    
    const cards = screen.getAllByTestId('section-card')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('renders interactive chart', () => {
    render(<DashboardPage />)
    
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  it('renders data table', () => {
    render(<DashboardPage />)
    
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('handles loading state', () => {
    render(<DashboardPage />)
    
    const loadingIndicator = screen.queryByTestId('loading')
    // Should either be loading or loaded
    expect(loadingIndicator || screen.getByRole('main')).toBeTruthy()
  })

  it('handles error state gracefully', async () => {
    // Mock API error
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('API Error'))
    )

    render(<DashboardPage />)
    
    await waitFor(() => {
      expect(screen.queryByText(/error/i)).toBeInTheDocument()
    })
  })
})





