import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../supabaseClient', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: { getUser: vi.fn() }
  }
}))

vi.mock('../knowledgeProcessor', () => ({
  processKnowledgeSource: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('../db', () => ({
  query: vi.fn(),
  pool: { end: vi.fn() }
}))

vi.mock('../gemini', () => ({
  generateText: vi.fn().mockResolvedValue('AI response'),
  generateGeminiEmbedding: vi.fn().mockResolvedValue([0.1, 0.2])
}))

vi.mock('../embeddings', () => ({
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2])
}))

import request from 'supertest'
import { createApp } from '../app'
import { supabaseAdmin } from '../supabaseClient'
import { processKnowledgeSource } from '../knowledgeProcessor'

const app = createApp()
const mockFrom = supabaseAdmin.from as any
const mockGetUser = supabaseAdmin.auth.getUser as any

function mockChain(data: any = null, error: any = null) {
  const chain: any = {
    _data: data,
    _error: error,
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    then: (resolve: any) => resolve({ data, error })
  }
  return chain
}

function authHeader(token = 'valid-token') {
  return `Bearer ${token}`
}

function mockAuthUser(userId = 'user-1', email = 'test@example.com') {
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId, email } },
    error: null
  })
}

describe('Auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /auth/verify', () => {
    it('returns user, profile, and orgs for valid token', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })
      mockFrom
        .mockReturnValueOnce(mockChain({ user_id: 'user-1', full_name: 'Test User' }))
        .mockReturnValueOnce(mockChain([{ organization_id: 'org-1', role: 'owner' }]))

      const res = await request(app)
        .post('/auth/verify')
        .send({ token: 'valid-token' })

      expect(res.status).toBe(200)
      expect(res.body.user.id).toBe('user-1')
      expect(res.body.profile).toBeDefined()
      expect(res.body.orgs).toBeDefined()
    })

    it('returns 401 for invalid token', async () => {
      mockGetUser.mockResolvedValue({ data: null, error: { message: 'invalid' } })

      const res = await request(app)
        .post('/auth/verify')
        .send({ token: 'invalid' })

      expect(res.status).toBe(401)
    })

    it('returns 400 for missing token', async () => {
      const res = await request(app)
        .post('/auth/verify')
        .send({})

      expect(res.status).toBe(400)
    })
  })
})

describe('Knowledge routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthUser()
  })

  describe('GET /knowledge/sources/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/knowledge/sources/some-id')
      expect(res.status).toBe(401)
    })

    it('returns 404 when source not found', async () => {
      mockFrom.mockReturnValue(mockChain(null, { message: 'not found' }))

      const res = await request(app)
        .get('/knowledge/sources/some-id')
        .set('Authorization', authHeader())

      expect(res.status).toBe(404)
    })

    it('returns 404 when user is not org member', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ id: 'ks-1', organization_id: 'org-1' }))
        .mockReturnValueOnce(mockChain(null))

      const res = await request(app)
        .get('/knowledge/sources/ks-1')
        .set('Authorization', authHeader())

      expect(res.status).toBe(404)
    })

    it('returns source when user is org member', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ id: 'ks-1', organization_id: 'org-1', title: 'FAQ' }))
        .mockReturnValueOnce(mockChain({ id: 'mem-1' }))

      const res = await request(app)
        .get('/knowledge/sources/ks-1')
        .set('Authorization', authHeader())

      expect(res.status).toBe(200)
      expect(res.body.title).toBe('FAQ')
    })
  })

  describe('POST /knowledge/sources', () => {
    it('creates a knowledge source and triggers processing', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ role: 'owner' }))  // membership check
        .mockReturnValueOnce(mockChain({ id: 'ks-1', title: 'New Source' }))  // insert

      const res = await request(app)
        .post('/knowledge/sources')
        .set('Authorization', authHeader())
        .send({
          assistant_id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'New Source',
          content: 'Some content',
          organization_id: '550e8400-e29b-41d4-a716-446655440000'
        })

      expect(res.status).toBe(201)
      expect(processKnowledgeSource).toHaveBeenCalled()
    })

    it('returns 403 when user is not org member', async () => {
      mockFrom.mockReturnValueOnce(mockChain(null))  // no membership

      const res = await request(app)
        .post('/knowledge/sources')
        .set('Authorization', authHeader())
        .send({
          assistant_id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'New Source',
          organization_id: '550e8400-e29b-41d4-a716-446655440000'
        })

      expect(res.status).toBe(403)
    })
  })

  describe('DELETE /knowledge/sources/:id', () => {
    it('returns 404 when source not found', async () => {
      mockFrom.mockReturnValue(mockChain(null))

      const res = await request(app)
        .delete('/knowledge/sources/nonexistent')
        .set('Authorization', authHeader())

      expect(res.status).toBe(404)
    })

    it('returns 404 when user is not org member', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ organization_id: 'org-1' }))  // fetch source
        .mockReturnValueOnce(mockChain(null))  // no membership

      const res = await request(app)
        .delete('/knowledge/sources/ks-1')
        .set('Authorization', authHeader())

      expect(res.status).toBe(404)
    })

    it('deletes source when user is org member', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ organization_id: 'org-1' }))  // fetch source
        .mockReturnValueOnce(mockChain({ id: 'mem-1' }))  // membership check
        .mockReturnValueOnce(mockChain(null))  // delete

      const res = await request(app)
        .delete('/knowledge/sources/ks-1')
        .set('Authorization', authHeader())

      expect(res.status).toBe(204)
    })
  })
})

describe('Assistants routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthUser()
  })

  describe('GET /assistants', () => {
    it('returns assistants for user orgs', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain([{ organization_id: 'org-1' }]))
        .mockReturnValueOnce(mockChain([{ id: 'a-1', name: 'Bot' }]))

      const res = await request(app)
        .get('/assistants')
        .set('Authorization', authHeader())

      expect(res.status).toBe(200)
      expect(res.body).toEqual([{ id: 'a-1', name: 'Bot' }])
    })
  })

  describe('GET /assistants/:id', () => {
    it('returns 404 when assistant not found', async () => {
      mockFrom.mockReturnValue(mockChain(null, { message: 'not found' }))

      const res = await request(app)
        .get('/assistants/nonexistent')
        .set('Authorization', authHeader())

      expect(res.status).toBe(404)
    })

    it('returns 404 when user is not org member', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ id: 'a-1', organization_id: 'org-1' }))
        .mockReturnValueOnce(mockChain(null))

      const res = await request(app)
        .get('/assistants/a-1')
        .set('Authorization', authHeader())

      expect(res.status).toBe(404)
    })

    it('returns assistant when user is org member', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ id: 'a-1', organization_id: 'org-1', name: 'Bot' }))
        .mockReturnValueOnce(mockChain({ id: 'mem-1' }))

      const res = await request(app)
        .get('/assistants/a-1')
        .set('Authorization', authHeader())

      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Bot')
    })
  })

  describe('POST /assistants', () => {
    it('creates assistant when user is org member', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ role: 'owner' }))
        .mockReturnValueOnce(mockChain({ id: 'a-1', name: 'New Bot' }))

      const res = await request(app)
        .post('/assistants')
        .set('Authorization', authHeader())
        .send({
          organization_id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'New Bot'
        })

      expect(res.status).toBe(201)
    })

    it('returns 403 when not org member', async () => {
      mockFrom.mockReturnValueOnce(mockChain(null))

      const res = await request(app)
        .post('/assistants')
        .set('Authorization', authHeader())
        .send({
          organization_id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'New Bot'
        })

      expect(res.status).toBe(403)
    })
  })
})

describe('Orgs routes', () => {
  describe('GET /orgs', () => {
    it('returns 403 without admin key', async () => {
      const res = await request(app).get('/orgs')
      expect(res.status).toBe(403)
    })

    it('returns orgs with valid admin key', async () => {
      process.env.ADMIN_API_KEY = 'test-admin-key'
      mockFrom.mockReturnValue(mockChain([{ id: 'org-1', name: 'Test Org' }]))

      const res = await request(app)
        .get('/orgs')
        .set('x-admin-key', 'test-admin-key')

      expect(res.status).toBe(200)
      delete process.env.ADMIN_API_KEY
    })
  })
})

describe('Chat routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthUser()
  })

  describe('GET /chat/conversations', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/chat/conversations')
      expect(res.status).toBe(401)
    })

    it('returns conversations for user orgs', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain([{ organization_id: 'org-1' }]))
        .mockReturnValueOnce(mockChain([{ id: 'conv-1', status: 'open' }]))

      const res = await request(app)
        .get('/chat/conversations')
        .set('Authorization', authHeader())

      expect(res.status).toBe(200)
    })
  })
})

describe('Health endpoint', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

describe('Analytics routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthUser()
  })

  describe('GET /analytics/summary', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/analytics/summary')
      expect(res.status).toBe(401)
    })

    it('returns summary stats for user orgs', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain([{ organization_id: 'org-1' }]))
        .mockReturnValueOnce(mockChain([{ id: 'c1', status: 'open', created_at: new Date().toISOString() }]))
        .mockReturnValueOnce(mockChain([{ id: 'm1', sender_type: 'customer', created_at: new Date().toISOString() }]))
        .mockReturnValueOnce(mockChain([{ id: 'e1', status: 'open', created_at: new Date().toISOString() }]))

      const res = await request(app)
        .get('/analytics/summary')
        .set('Authorization', authHeader())

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('total_conversations')
      expect(res.body).toHaveProperty('total_messages')
    })
  })

  describe('GET /analytics/events', () => {
    it('returns events for user orgs', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain([{ organization_id: 'org-1' }]))
        .mockReturnValueOnce(mockChain([{ id: 'ev1', event_type: 'message_sent' }]))

      const res = await request(app)
        .get('/analytics/events')
        .set('Authorization', authHeader())

      expect(res.status).toBe(200)
    })
  })
})

describe('Customers routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthUser()
  })

  describe('GET /customers', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/customers?organization_id=org-1')
      expect(res.status).toBe(401)
    })

    it('returns 400 without organization_id', async () => {
      const res = await request(app)
        .get('/customers')
        .set('Authorization', authHeader())
      expect(res.status).toBe(400)
    })

    it('returns 403 when not org member', async () => {
      mockFrom.mockReturnValueOnce(mockChain(null))

      const res = await request(app)
        .get('/customers?organization_id=org-1')
        .set('Authorization', authHeader())

      expect(res.status).toBe(403)
    })

    it('returns customers when user is org member', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ id: 'mem-1' }))
        .mockReturnValueOnce(mockChain([{ id: 'cust-1', name: 'John' }]))

      const res = await request(app)
        .get('/customers?organization_id=org-1')
        .set('Authorization', authHeader())

      expect(res.status).toBe(200)
    })
  })

  describe('POST /customers', () => {
    it('creates customer when user is org member', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ id: 'mem-1' }))
        .mockReturnValueOnce(mockChain({ id: 'cust-1', name: 'Jane' }))

      const res = await request(app)
        .post('/customers')
        .set('Authorization', authHeader())
        .send({ organization_id: 'org-1', name: 'Jane', email: 'jane@test.com' })

      expect(res.status).toBe(201)
    })

    it('returns 403 when not org member', async () => {
      mockFrom.mockReturnValueOnce(mockChain(null))

      const res = await request(app)
        .post('/customers')
        .set('Authorization', authHeader())
        .send({ organization_id: 'org-1', name: 'Jane' })

      expect(res.status).toBe(403)
    })
  })

  describe('DELETE /customers/:id', () => {
    it('returns 404 when customer not found', async () => {
      mockFrom.mockReturnValue(mockChain(null))

      const res = await request(app)
        .delete('/customers/nonexistent')
        .set('Authorization', authHeader())

      expect(res.status).toBe(404)
    })

    it('deletes customer when user is org member', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ organization_id: 'org-1' }))
        .mockReturnValueOnce(mockChain({ id: 'mem-1' }))
        .mockReturnValueOnce(mockChain(null))

      const res = await request(app)
        .delete('/customers/cust-1')
        .set('Authorization', authHeader())

      expect(res.status).toBe(204)
    })
  })
})

describe('Org members routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthUser()
  })

  describe('GET /orgs/:id/members', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/orgs/org-1/members')
      expect(res.status).toBe(401)
    })

    it('returns 404 when not org member', async () => {
      mockFrom.mockReturnValueOnce(mockChain(null))

      const res = await request(app)
        .get('/orgs/org-1/members')
        .set('Authorization', authHeader())

      expect(res.status).toBe(404)
    })

    it('returns members when user is org member', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ id: 'mem-1' }))
        .mockReturnValueOnce(mockChain([{ user_id: 'user-1', role: 'owner' }]))

      const res = await request(app)
        .get('/orgs/org-1/members')
        .set('Authorization', authHeader())

      expect(res.status).toBe(200)
    })
  })

  describe('POST /orgs/:id/members', () => {
    it('returns 403 when caller is not owner/admin', async () => {
      mockFrom.mockReturnValueOnce(mockChain({ role: 'member' }))

      const res = await request(app)
        .post('/orgs/org-1/members')
        .set('Authorization', authHeader())
        .send({ user_id: 'user-2' })

      expect(res.status).toBe(403)
    })

    it('adds member when caller is owner', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ role: 'owner' }))
        .mockReturnValueOnce(mockChain({ id: 'new-mem', user_id: 'user-2', role: 'member' }))

      const res = await request(app)
        .post('/orgs/org-1/members')
        .set('Authorization', authHeader())
        .send({ user_id: 'user-2', role: 'member' })

      expect(res.status).toBe(201)
    })
  })
})

describe('WhatsApp routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthUser()
  })

  describe('POST /whatsapp/config/:organizationId', () => {
    it('returns 403 when not org member', async () => {
      mockFrom.mockReturnValueOnce(mockChain(null))

      const res = await request(app)
        .post('/whatsapp/config/org-1')
        .set('Authorization', authHeader())
        .send({
          twilio_account_sid: 'AC123',
          twilio_auth_token: 'token123',
          twilio_whatsapp_number: 'whatsapp:+1234567890'
        })

      expect(res.status).toBe(403)
    })

    it('returns 400 when missing required fields', async () => {
      const res = await request(app)
        .post('/whatsapp/config/org-1')
        .set('Authorization', authHeader())
        .send({ twilio_account_sid: 'AC123' })

      expect(res.status).toBe(400)
    })

    it('creates config when user is org member', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ id: 'mem-1' }))  // membership check
        .mockReturnValueOnce(mockChain(null))  // check existing
        .mockReturnValueOnce(mockChain({ id: 'cfg-1', twilio_account_sid: 'AC123', twilio_whatsapp_number: '+1234567890', enabled: true }))  // insert

      const res = await request(app)
        .post('/whatsapp/config/org-1')
        .set('Authorization', authHeader())
        .send({
          twilio_account_sid: 'AC123',
          twilio_auth_token: 'token123',
          twilio_whatsapp_number: 'whatsapp:+1234567890'
        })

      expect(res.status).toBe(201)
    })
  })

  describe('GET /whatsapp/config/:organizationId', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/whatsapp/config/org-1')
      expect(res.status).toBe(401)
    })

    it('returns 404 when not configured', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ id: 'mem-1' }))
        .mockReturnValueOnce(mockChain(null, { message: 'not found' }))

      const res = await request(app)
        .get('/whatsapp/config/org-1')
        .set('Authorization', authHeader())

      expect(res.status).toBe(404)
    })
  })

  describe('POST /whatsapp/send', () => {
    it('returns 400 when missing fields', async () => {
      const res = await request(app)
        .post('/whatsapp/send')
        .set('Authorization', authHeader())
        .send({})

      expect(res.status).toBe(400)
    })

    it('returns 403 when not org member', async () => {
      mockFrom.mockReturnValueOnce(mockChain(null))

      const res = await request(app)
        .post('/whatsapp/send')
        .set('Authorization', authHeader())
        .send({ organization_id: 'org-1', to: '+1234567890', message: 'Hello' })

      expect(res.status).toBe(403)
    })
  })
})
