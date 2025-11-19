import { render, screen, fireEvent } from '@testing-library/react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

describe('Tabs Component', () => {
  it('renders tabs with all triggers and content', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
        <TabsContent value="tab3">Content 3</TabsContent>
      </Tabs>
    )
    
    expect(screen.getByText('Tab 1')).toBeInTheDocument()
    expect(screen.getByText('Tab 2')).toBeInTheDocument()
    expect(screen.getByText('Tab 3')).toBeInTheDocument()
    expect(screen.getByText('Content 1')).toBeVisible()
  })

  it('switches between tabs on click', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )
    
    // Initially, content 1 should be visible
    expect(screen.getByText('Content 1')).toBeVisible()
    
    // Click on tab 2
    const tab2Trigger = screen.getByText('Tab 2')
    fireEvent.click(tab2Trigger)
    
    // Content 2 should now be visible
    expect(screen.getByText('Content 2')).toBeVisible()
  })

  it('applies active state to selected tab', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )
    
    const tab1 = screen.getByText('Tab 1')
    expect(tab1).toHaveAttribute('data-state', 'active')
  })

  it('supports controlled tabs', () => {
    const mockOnChange = jest.fn()
    
    render(
      <Tabs value="tab1" onValueChange={mockOnChange}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )
    
    const tab2Trigger = screen.getByText('Tab 2')
    fireEvent.click(tab2Trigger)
    
    expect(mockOnChange).toHaveBeenCalledWith('tab2')
  })
})




