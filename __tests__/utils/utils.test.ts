import { cn } from '@/lib/utils'

describe('Utils', () => {
  describe('cn (className utility)', () => {
    it('merges class names correctly', () => {
      const result = cn('class1', 'class2')
      expect(result).toBe('class1 class2')
    })

    it('handles conditional classes', () => {
      const result = cn('base', false && 'hidden', true && 'visible')
      expect(result).toBe('base visible')
    })

    it('handles undefined and null values', () => {
      const result = cn('base', undefined, null, 'extra')
      expect(result).toBe('base extra')
    })

    it('merges tailwind classes correctly', () => {
      const result = cn('p-4', 'p-2')
      expect(result).toBe('p-2')
    })

    it('handles arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    it('handles objects with boolean values', () => {
      const result = cn({
        'always': true,
        'never': false,
        'sometimes': true,
      })
      expect(result).toContain('always')
      expect(result).toContain('sometimes')
      expect(result).not.toContain('never')
    })
  })
})







