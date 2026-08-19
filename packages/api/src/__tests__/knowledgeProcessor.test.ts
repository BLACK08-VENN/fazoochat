import { describe, it, expect } from 'vitest'
import { chunkText } from '../utils'

describe('chunkText', () => {
  it('returns a single chunk for short text', () => {
    const result = chunkText('hello world')
    expect(result).toEqual(['hello world'])
  })

  it('splits text into chunks of specified size', () => {
    const text = 'a'.repeat(2000)
    const result = chunkText(text, 800, 0)
    expect(result.length).toBe(3)
    expect(result[0]).toBe('a'.repeat(800))
    expect(result[1]).toBe('a'.repeat(800))
    expect(result[2]).toBe('a'.repeat(400))
  })

  it('handles overlap correctly', () => {
    const text = 'abcdefghij'
    const result = chunkText(text, 4, 2)
    expect(result[0]).toBe('abcd')
    expect(result[1]).toBe('cdef')
    expect(result[2]).toBe('efgh')
    expect(result[3]).toBe('ghij')
  })

  it('returns empty array for empty string', () => {
    const result = chunkText('')
    expect(result).toEqual([])
  })

  it('defaults to 800 chunk size with 100 overlap', () => {
    const text = 'x'.repeat(1000)
    const result = chunkText(text)
    expect(result.length).toBe(2)
    expect(result[0].length).toBe(800)
    expect(result[1].length).toBe(300)
  })
})
