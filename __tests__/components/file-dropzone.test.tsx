import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FileDropzone } from '@/components/file-dropzone'

describe('FileDropzone', () => {
  it('renders dropzone with instructions', () => {
    render(<FileDropzone />)
    
    expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument()
  })

  it('handles file drop', async () => {
    const mockOnDrop = jest.fn()
    render(<FileDropzone onDrop={mockOnDrop} />)
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    const dropzone = screen.getByTestId('dropzone')
    
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    })

    await waitFor(() => {
      expect(mockOnDrop).toHaveBeenCalledWith(expect.arrayContaining([file]))
    })
  })

  it('validates file types', async () => {
    const mockOnError = jest.fn()
    render(
      <FileDropzone 
        accept={{ 'image/*': ['.png', '.jpg'] }}
        onError={mockOnError}
      />
    )
    
    const invalidFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    const dropzone = screen.getByTestId('dropzone')
    
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [invalidFile] },
    })

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalled()
    })
  })

  it('shows drag active state', () => {
    render(<FileDropzone />)
    
    const dropzone = screen.getByTestId('dropzone')
    
    fireEvent.dragEnter(dropzone)
    expect(dropzone).toHaveClass('drag-active')
    
    fireEvent.dragLeave(dropzone)
    expect(dropzone).not.toHaveClass('drag-active')
  })

  it('handles multiple files', async () => {
    const mockOnDrop = jest.fn()
    render(<FileDropzone onDrop={mockOnDrop} multiple />)
    
    const files = [
      new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['content2'], 'test2.pdf', { type: 'application/pdf' }),
    ]
    
    const dropzone = screen.getByTestId('dropzone')
    fireEvent.drop(dropzone, {
      dataTransfer: { files },
    })

    await waitFor(() => {
      expect(mockOnDrop).toHaveBeenCalledWith(expect.arrayContaining(files))
    })
  })

  it('respects max file size', async () => {
    const mockOnError = jest.fn()
    render(<FileDropzone maxSize={1024} onError={mockOnError} />)
    
    // Create a file larger than 1KB
    const largeFile = new File([new Array(2048).join('a')], 'large.pdf')
    const dropzone = screen.getByTestId('dropzone')
    
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [largeFile] },
    })

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalled()
    })
  })
})



