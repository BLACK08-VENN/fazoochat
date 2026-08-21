import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../supabaseClient', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn()
    }
  }
}))

import { authenticate } from '../middleware/authenticate'
import { supabaseAdmin } from '../supabaseClient'

const mockGetUser = supabaseAdmin.auth.getUser as any

describe('authenticate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mockReq(authHeader?: string) {
    return { header: (name: string) => (name === 'authorization' ? authHeader : undefined) } as any
  }

  function mockRes() {
    const res: any = {}
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    return res
  }

  it('returns 401 when no authorization header', async () => {
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await authenticate(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'missing authorization' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 for malformed authorization header', async () => {
    const req = mockReq('Bearer')
    const res = mockRes()
    const next = vi.fn()

    await authenticate(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'invalid authorization' })
  })

  it('returns 401 for invalid token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } })
    const req = mockReq('Bearer invalid-token')
    const res = mockRes()
    const next = vi.fn()

    await authenticate(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'invalid token' })
  })

  it('calls next() and sets req.user on valid token', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null
    })
    const req = mockReq('Bearer valid-token')
    const res = mockRes()
    const next = vi.fn()

    await authenticate(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toEqual({ id: 'user-1', email: 'test@example.com' })
  })

  it('returns 500 on unexpected error', async () => {
    mockGetUser.mockRejectedValue(new Error('network error'))
    const req = mockReq('Bearer token')
    const res = mockRes()
    const next = vi.fn()

    await authenticate(req, res, next)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'internal error' })
  })
})
