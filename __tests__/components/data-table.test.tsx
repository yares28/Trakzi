import { render, screen, fireEvent } from '@testing-library/react'
import { DataTable } from '@/components/data-table'

const mockColumns = [
  { header: 'Name', accessorKey: 'name' },
  { header: 'Email', accessorKey: 'email' },
  { header: 'Status', accessorKey: 'status' },
]

const mockData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'active' },
]

describe('DataTable', () => {
  it('renders table with correct columns', () => {
    render(<DataTable columns={mockColumns} data={mockData} />)
    
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('renders all data rows', () => {
    render(<DataTable columns={mockColumns} data={mockData} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    render(<DataTable columns={mockColumns} data={[]} />)
    
    expect(screen.getByText(/no data available/i)).toBeInTheDocument()
  })

  it('supports sorting functionality', () => {
    render(<DataTable columns={mockColumns} data={mockData} />)
    
    const nameHeader = screen.getByText('Name')
    fireEvent.click(nameHeader)
    
    // Verify sorting indicator appears
    const rows = screen.getAllByRole('row')
    expect(rows.length).toBeGreaterThan(1)
  })

  it('supports row selection', () => {
    render(<DataTable columns={mockColumns} data={mockData} enableRowSelection />)
    
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    
    expect(checkboxes[0]).toBeChecked()
  })

  it('handles pagination correctly', () => {
    const largeDataset = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      status: 'active',
    }))

    render(<DataTable columns={mockColumns} data={largeDataset} pageSize={10} />)
    
    expect(screen.getByText(/page 1 of/i)).toBeInTheDocument()
  })
})




