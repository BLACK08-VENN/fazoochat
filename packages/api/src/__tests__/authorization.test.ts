import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../supabaseClient', () => ({
  supabaseAdmin: {
    from: vi.fn()
  }
}))

import { isOrganizationMember, canAccessConversation } from '../authorization'
import { supabaseAdmin } from '../supabaseClient'

const mockFrom = supabaseAdmin.from as any

function mockChain(result: any) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result)
  }
  return chain
}

describe('authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isOrganizationMember', () => {
    it('returns true when user is a member', async () => {
      mockFrom.mockReturnValue(mockChain({ data: { id: 'mem-1' }, error: null }))

      const result = await isOrganizationMember('user-1', 'org-1')
      expect(result).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('organization_members')
    })

    it('returns false when user is not a member', async () => {
      mockFrom.mockReturnValue(mockChain({ data: null, error: null }))

      const result = await isOrganizationMember('user-1', 'org-1')
      expect(result).toBe(false)
    })

    it('returns false on database error', async () => {
      mockFrom.mockReturnValue(mockChain({ data: null, error: { message: 'db error' } }))

      const result = await isOrganizationMember('user-1', 'org-1')
      expect(result).toBe(false)
    })
  })

  describe('canAccessConversation', () => {
    it('returns conversation when user has access', async () => {
      const conv = { id: 'conv-1', organization_id: 'org-1' }
      mockFrom
        .mockReturnValueOnce(mockChain({ data: conv, error: null }))
        .mockReturnValueOnce(mockChain({ data: { id: 'mem-1' }, error: null }))

      const result = await canAccessConversation('user-1', 'conv-1')
      expect(result).toEqual(conv)
    })

    it('returns null when conversation not found', async () => {
      mockFrom.mockReturnValue(mockChain({ data: null, error: null }))

      const result = await canAccessConversation('user-1', 'conv-1')
      expect(result).toBeNull()
    })

    it('returns null when user is not a member of the org', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ data: { id: 'conv-1', organization_id: 'org-1' }, error: null }))
        .mockReturnValueOnce(mockChain({ data: null, error: null }))

      const result = await canAccessConversation('user-1', 'conv-1')
      expect(result).toBeNull()
    })
  })
})
