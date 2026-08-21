import { describe, expect, it, vi } from 'vitest'
import {
  validate,
  createOrgSchema,
  createWorkspaceSchema,
  createAssistantSchema,
  updateAssistantSchema,
  createKnowledgeSourceSchema,
  publicChatSchema,
  authenticatedChatSchema,
  verifyTokenSchema,
  escalateSchema,
  updateConversationSchema
} from '../validation'

describe('Zod schemas', () => {
  describe('createOrgSchema', () => {
    it('accepts valid org data', () => {
      const result = createOrgSchema.safeParse({
        name: 'Test Org',
        slug: 'test-org',
        owner_user_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid slug format', () => {
      const result = createOrgSchema.safeParse({
        name: 'Test Org',
        slug: 'Invalid Slug!',
        owner_user_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing name', () => {
      const result = createOrgSchema.safeParse({ slug: 'test', owner_user_id: '550e8400-e29b-41d4-a716-446655440000' })
      expect(result.success).toBe(false)
    })
  })

  describe('createWorkspaceSchema', () => {
    it('accepts a workspace owned by the authenticated user', () => {
      const result = createWorkspaceSchema.safeParse({
        name: 'Test Workspace',
        slug: 'test-workspace'
      })
      expect(result.success).toBe(true)
    })

    it('rejects a workspace slug with spaces', () => {
      const result = createWorkspaceSchema.safeParse({
        name: 'Test Workspace',
        slug: 'Test Workspace'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('createAssistantSchema', () => {
    it('accepts valid assistant data', () => {
      const result = createAssistantSchema.safeParse({
        organization_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Support Bot'
      })
      expect(result.success).toBe(true)
    })

    it('accepts optional fields', () => {
      const result = createAssistantSchema.safeParse({
        organization_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Bot',
        description: 'A helpful bot',
        system_prompt: 'Be helpful',
        welcome_message: 'Hello!'
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty name', () => {
      const result = createAssistantSchema.safeParse({
        organization_id: '550e8400-e29b-41d4-a716-446655440000',
        name: ''
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateAssistantSchema', () => {
    it('accepts partial updates', () => {
      const result = updateAssistantSchema.safeParse({ name: 'New Name' })
      expect(result.success).toBe(true)
    })

    it('accepts enabled boolean', () => {
      const result = updateAssistantSchema.safeParse({ enabled: false })
      expect(result.success).toBe(true)
    })

    it('rejects invalid primary_color', () => {
      const result = updateAssistantSchema.safeParse({ primary_color: 'red' })
      expect(result.success).toBe(false)
    })

    it('accepts valid hex color', () => {
      const result = updateAssistantSchema.safeParse({ primary_color: '#ff0000' })
      expect(result.success).toBe(true)
    })
  })

  describe('createKnowledgeSourceSchema', () => {
    it('accepts valid knowledge source', () => {
      const result = createKnowledgeSourceSchema.safeParse({
        assistant_id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'FAQ'
      })
      expect(result.success).toBe(true)
    })

    it('accepts source_type text', () => {
      const result = createKnowledgeSourceSchema.safeParse({
        assistant_id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'FAQ',
        content: 'Some content',
        source_type: 'text'
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid source_type', () => {
      const result = createKnowledgeSourceSchema.safeParse({
        assistant_id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'FAQ',
        source_type: 'invalid'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('publicChatSchema', () => {
    it('accepts minimal message', () => {
      const result = publicChatSchema.safeParse({
        assistant_id: '550e8400-e29b-41d4-a716-446655440000',
        message: 'Hello'
      })
      expect(result.success).toBe(true)
    })

    it('accepts message with customer info', () => {
      const result = publicChatSchema.safeParse({
        assistant_id: '550e8400-e29b-41d4-a716-446655440000',
        message: 'Hello',
        customer_name: 'John',
        customer_email: 'john@example.com'
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty message', () => {
      const result = publicChatSchema.safeParse({
        assistant_id: '550e8400-e29b-41d4-a716-446655440000',
        message: ''
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid email', () => {
      const result = publicChatSchema.safeParse({
        assistant_id: '550e8400-e29b-41d4-a716-446655440000',
        message: 'Hi',
        customer_email: 'not-an-email'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('authenticatedChatSchema', () => {
    it('accepts valid chat message', () => {
      const result = authenticatedChatSchema.safeParse({ content: 'Hello' })
      expect(result.success).toBe(true)
    })

    it('rejects empty content', () => {
      const result = authenticatedChatSchema.safeParse({ content: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('verifyTokenSchema', () => {
    it('accepts non-empty token', () => {
      const result = verifyTokenSchema.safeParse({ token: 'abc123' })
      expect(result.success).toBe(true)
    })

    it('rejects empty token', () => {
      const result = verifyTokenSchema.safeParse({ token: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('escalateSchema', () => {
    it('accepts valid reason', () => {
      const result = escalateSchema.safeParse({ reason: 'Complex issue' })
      expect(result.success).toBe(true)
    })

    it('rejects empty reason', () => {
      const result = escalateSchema.safeParse({ reason: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('updateConversationSchema', () => {
    it('accepts status update', () => {
      const result = updateConversationSchema.safeParse({ status: 'closed' })
      expect(result.success).toBe(true)
    })

    it('accepts assigned_to update', () => {
      const result = updateConversationSchema.safeParse({
        assigned_to: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid status', () => {
      const result = updateConversationSchema.safeParse({ status: 'invalid' })
      expect(result.success).toBe(false)
    })
  })
})

describe('validate middleware', () => {
  it('calls next() on valid body', () => {
    const req = { body: { token: 'valid-token' } } as any
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any
    const next = vi.fn()

    validate(verifyTokenSchema)(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('returns 400 on invalid body', () => {
    const req = { body: { token: '' } } as any
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any
    const next = vi.fn()

    validate(verifyTokenSchema)(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'validation failed' }))
    expect(next).not.toHaveBeenCalled()
  })
})
