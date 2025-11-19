import { render, screen } from '@testing-library/react'
import { SectionCards } from '@/components/section-cards'

describe('SectionCards', () => {
  const mockCards = [
    { id: 1, title: 'Card 1', description: 'Description 1', value: 100 },
    { id: 2, title: 'Card 2', description: 'Description 2', value: 200 },
    { id: 3, title: 'Card 3', description: 'Description 3', value: 300 },
  ]

  it('renders all cards', () => {
    render(<SectionCards cards={mockCards} />)
    
    expect(screen.getByText('Card 1')).toBeInTheDocument()
    expect(screen.getByText('Card 2')).toBeInTheDocument()
    expect(screen.getByText('Card 3')).toBeInTheDocument()
  })

  it('displays card descriptions', () => {
    render(<SectionCards cards={mockCards} />)
    
    expect(screen.getByText('Description 1')).toBeInTheDocument()
    expect(screen.getByText('Description 2')).toBeInTheDocument()
  })

  it('displays card values', () => {
    render(<SectionCards cards={mockCards} />)
    
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('300')).toBeInTheDocument()
  })

  it('handles empty cards array', () => {
    render(<SectionCards cards={[]} />)
    
    expect(screen.getByText(/no cards available/i)).toBeInTheDocument()
  })

  it('renders card grid layout', () => {
    render(<SectionCards cards={mockCards} />)
    
    const container = screen.getByTestId('section-cards-grid')
    expect(container).toHaveClass('grid')
  })

  it('supports different card layouts', () => {
    render(<SectionCards cards={mockCards} layout="horizontal" />)
    
    const container = screen.getByTestId('section-cards-grid')
    expect(container).toBeInTheDocument()
  })
})




