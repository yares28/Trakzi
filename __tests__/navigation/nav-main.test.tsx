import { render, screen, fireEvent } from '@testing-library/react'
import { NavMain } from '@/components/nav-main'

const mockNavItems = [
  { title: 'Home', url: '/home', icon: 'Home' },
  { title: 'Documents', url: '/documents', icon: 'FileText' },
  { title: 'Settings', url: '/settings', icon: 'Settings' },
]

describe('NavMain', () => {
  it('renders all navigation items', () => {
    render(<NavMain items={mockNavItems} />)
    
    mockNavItems.forEach(item => {
      expect(screen.getByText(item.title)).toBeInTheDocument()
    })
  })

  it('renders icons for navigation items', () => {
    render(<NavMain items={mockNavItems} />)
    
    const icons = screen.getAllByTestId(/icon/)
    expect(icons.length).toBeGreaterThan(0)
  })

  it('handles navigation item clicks', () => {
    const mockOnClick = jest.fn()
    render(<NavMain items={mockNavItems} onItemClick={mockOnClick} />)
    
    const homeItem = screen.getByText('Home')
    fireEvent.click(homeItem)
    
    expect(mockOnClick).toHaveBeenCalledWith('/home')
  })

  it('highlights active navigation item', () => {
    render(<NavMain items={mockNavItems} activeUrl="/home" />)
    
    const homeItem = screen.getByText('Home')
    expect(homeItem.closest('a')).toHaveClass('active')
  })

  it('supports nested navigation items', () => {
    const nestedItems = [
      {
        title: 'Documents',
        url: '/documents',
        children: [
          { title: 'All Documents', url: '/documents/all' },
          { title: 'Favorites', url: '/documents/favorites' },
        ],
      },
    ]

    render(<NavMain items={nestedItems} />)
    
    const documentsItem = screen.getByText('Documents')
    fireEvent.click(documentsItem)
    
    expect(screen.getByText('All Documents')).toBeInTheDocument()
    expect(screen.getByText('Favorites')).toBeInTheDocument()
  })
})







