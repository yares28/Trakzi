import { render, screen, fireEvent } from '@testing-library/react'
import { NavMain } from '@/components/nav-main'

const mockNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: 'Home' },
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
    
    const dashboardItem = screen.getByText('Dashboard')
    fireEvent.click(dashboardItem)
    
    expect(mockOnClick).toHaveBeenCalledWith('/dashboard')
  })

  it('highlights active navigation item', () => {
    render(<NavMain items={mockNavItems} activeUrl="/dashboard" />)
    
    const dashboardItem = screen.getByText('Dashboard')
    expect(dashboardItem.closest('a')).toHaveClass('active')
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





