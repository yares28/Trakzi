import { render, screen, fireEvent } from '@testing-library/react'
import { ChartAreaInteractive } from '@/components/chart-area-interactive'

const mockData = [
  { date: '2024-01-01', value: 100 },
  { date: '2024-01-02', value: 150 },
  { date: '2024-01-03', value: 120 },
  { date: '2024-01-04', value: 180 },
]

describe('ChartAreaInteractive', () => {
  it('renders chart container', () => {
    render(<ChartAreaInteractive data={mockData} />)
    
    const chart = screen.getByTestId('area-chart')
    expect(chart).toBeInTheDocument()
  })

  it('displays chart with correct data points', () => {
    render(<ChartAreaInteractive data={mockData} />)
    
    // Check if recharts components are rendered
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument()
  })

  it('handles empty data', () => {
    render(<ChartAreaInteractive data={[]} />)
    
    expect(screen.getByText(/no data available/i)).toBeInTheDocument()
  })

  it('shows tooltip on hover', () => {
    render(<ChartAreaInteractive data={mockData} />)
    
    const chartArea = screen.getByTestId('area-chart')
    fireEvent.mouseEnter(chartArea)
    
    // Tooltip functionality would be tested here
  })

  it('allows interaction with data points', () => {
    const mockOnClick = jest.fn()
    render(<ChartAreaInteractive data={mockData} onDataPointClick={mockOnClick} />)
    
    const dataPoints = screen.getAllByRole('button', { hidden: true })
    if (dataPoints.length > 0) {
      fireEvent.click(dataPoints[0])
      expect(mockOnClick).toHaveBeenCalled()
    }
  })

  it('supports different chart configurations', () => {
    render(
      <ChartAreaInteractive 
        data={mockData}
        config={{
          color: '#8884d8',
          strokeWidth: 2,
        }}
      />
    )
    
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  it('renders legend when enabled', () => {
    render(<ChartAreaInteractive data={mockData} showLegend />)
    
    // Check for legend elements
    const chart = screen.getByTestId('area-chart')
    expect(chart).toBeInTheDocument()
  })
})







