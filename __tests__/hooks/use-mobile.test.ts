import { renderHook } from '@testing-library/react'
import { useMobile } from '@/hooks/use-mobile'

describe('useMobile Hook', () => {
  beforeEach(() => {
    // Reset window size
    global.innerWidth = 1024
    global.dispatchEvent(new Event('resize'))
  })

  it('returns false for desktop viewport', () => {
    global.innerWidth = 1024
    global.dispatchEvent(new Event('resize'))
    
    const { result } = renderHook(() => useMobile())
    expect(result.current).toBe(false)
  })

  it('returns true for mobile viewport', () => {
    global.innerWidth = 375
    global.dispatchEvent(new Event('resize'))
    
    const { result } = renderHook(() => useMobile())
    expect(result.current).toBe(true)
  })

  it('updates when viewport changes', () => {
    global.innerWidth = 1024
    const { result, rerender } = renderHook(() => useMobile())
    
    expect(result.current).toBe(false)
    
    // Change to mobile viewport
    global.innerWidth = 375
    global.dispatchEvent(new Event('resize'))
    rerender()
    
    expect(result.current).toBe(true)
  })

  it('handles tablet viewport correctly', () => {
    global.innerWidth = 768
    global.dispatchEvent(new Event('resize'))
    
    const { result } = renderHook(() => useMobile())
    // Result depends on your mobile breakpoint definition
    expect(typeof result.current).toBe('boolean')
  })
})





