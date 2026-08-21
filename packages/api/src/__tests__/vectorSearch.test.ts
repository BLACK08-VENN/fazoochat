import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('../supabaseClient', () => ({
  supabaseAdmin: { rpc }
}))

import { retrieveKnowledge } from '../vectorSearch'

describe('retrieveKnowledge', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls the assistant-scoped Supabase vector RPC', async () => {
    const matches = [{ id: 'chunk-1', content: 'Context', metadata: null, similarity: 0.9 }]
    rpc.mockResolvedValue({ data: matches, error: null })

    await expect(retrieveKnowledge([0.1, 0.2], 'org-1', 'assistant-1')).resolves.toEqual(matches)
    expect(rpc).toHaveBeenCalledWith('match_knowledge_chunks', {
      query_embedding: [0.1, 0.2],
      filter_organization_id: 'org-1',
      filter_assistant_id: 'assistant-1',
      match_count: 5
    })
  })

  it('surfaces Supabase RPC errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'function missing' } })
    await expect(retrieveKnowledge([], 'org-1', 'assistant-1')).rejects.toThrow('function missing')
  })
})
