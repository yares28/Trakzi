import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

describe('Card Component', () => {
  it('renders card with all sections', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Card Content</CardContent>
        <CardFooter>Card Footer</CardFooter>
      </Card>
    )
    
    expect(screen.getByText('Card Title')).toBeInTheDocument()
    expect(screen.getByText('Card Description')).toBeInTheDocument()
    expect(screen.getByText('Card Content')).toBeInTheDocument()
    expect(screen.getByText('Card Footer')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Card className="custom-class">Content</Card>)
    
    const card = screen.getByText('Content').parentElement
    expect(card).toHaveClass('custom-class')
  })

  it('renders without optional sections', () => {
    render(
      <Card>
        <CardContent>Only Content</CardContent>
      </Card>
    )
    
    expect(screen.getByText('Only Content')).toBeInTheDocument()
  })

  it('renders nested components correctly', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>
            <span data-testid="icon">📊</span>
            Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div data-testid="chart">Chart Component</div>
        </CardContent>
      </Card>
    )
    
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByTestId('chart')).toBeInTheDocument()
  })
})




