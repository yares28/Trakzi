import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import HomePage from '@/app/home/page'

describe('Home Data Integration', () => {
  beforeEach(() => {
    // Mock fetch for home data
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { id: 1, name: 'Item 1', value: 100, status: 'active' },
              { id: 2, name: 'Item 2', value: 200, status: 'inactive' },
              { id: 3, name: 'Item 3', value: 300, status: 'active' },
            ],
            stats: {
              total: 600,
              active: 2,
              inactive: 1,
            },
          }),
      })
    ) as jest.Mock
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('loads and displays home data', async () => {
    render(<HomePage />)
    
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })
    
    // Verify data is displayed
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
  })

  it('displays statistics correctly', async () => {
    render(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText('600')).toBeInTheDocument()
    })
    
    expect(screen.getByText(/active.*2/i)).toBeInTheDocument()
    expect(screen.getByText(/inactive.*1/i)).toBeInTheDocument()
  })

  it('handles data filtering', async () => {
    render(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument()
    })
    
    // Apply filter
    const filterButton = screen.getByRole('button', { name: /filter/i })
    if (filterButton) {
      fireEvent.click(filterButton)
      
      const activeFilter = screen.getByText(/active only/i)
      fireEvent.click(activeFilter)
      
      // Should show only active items
      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument()
        expect(screen.queryByText('Item 2')).not.toBeInTheDocument()
      })
    }
  })

  it('updates chart when data changes', async () => {
    const { rerender } = render(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    })
    
    // Update data
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { id: 1, name: 'Item 1', value: 150, status: 'active' },
            ],
          }),
      })
    ) as jest.Mock
    
    rerender(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument()
    })
  })
})

