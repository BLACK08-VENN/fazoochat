import { describe, expect, it, vi } from 'vitest'
import { healthHandler } from '../app'

// Minimal Express app test (no DB deps needed)
describe('API health endpoint', () => {
  it('returns an ok response without starting a network listener', () => {
    const json = vi.fn()
    healthHandler({} as never, { json } as never)
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }))
  })
})
