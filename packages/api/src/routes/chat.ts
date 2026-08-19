import express from 'express'
import { supabaseAdmin } from '../supabaseClient'
import { authenticate, AuthRequest } from '../middleware/authenticate'
import { generateEmbedding } from '../embeddings'
import { query as pgQuery } from '../db'
import { validate, authenticatedChatSchema, escalateSchema, updateConversationSchema } from '../validation'

const router = express.Router()

router.get('/conversations', authenticate, async (req: AuthRequest, res) => {
  const userId = req.user!.id
  const { data: orgs } = await supabaseAdmin.from('organization_members').select('organization_id').eq('user_id', userId)
  const orgIds = (orgs || []).map((o: any) => o.organization_id)
  const { status } = req.query

  let query = supabaseAdmin
    .from('conversations')
    .select('*, assistants(name), customers(name, email)')
    .in('organization_id', orgIds)
  if (status) query = query.eq('status', status as string)

  const { data, error } = await query.order('last_message_at', { ascending: false }).limit(50)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.get('/conversations/:id', authenticate, async (req: AuthRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('*, assistants(name), customers(name, email)')
    .eq('id', req.params.id)
    .single()
  if (error) return res.status(404).json({ error: 'not found' })
  res.json(data)
})

router.put('/conversations/:id', authenticate, validate(updateConversationSchema), async (req: AuthRequest, res) => {
  const { status, assigned_to } = req.body
  const updates: Record<string, any> = {}
  if (status) updates.status = status
  if (assigned_to !== undefined) updates.assigned_to = assigned_to

  const { data, error } = await supabaseAdmin
    .from('conversations')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/conversations/:id/escalate', authenticate, validate(escalateSchema), async (req: AuthRequest, res) => {
  const { reason } = req.body

  const { data: conv } = await supabaseAdmin.from('conversations').select('organization_id').eq('id', req.params.id).single()
  if (!conv) return res.status(404).json({ error: 'conversation not found' })

  const { data, error } = await supabaseAdmin.from('escalations').insert([{
    conversation_id: req.params.id,
    organization_id: conv.organization_id,
    reason,
    status: 'open'
  }]).select().single()
  if (error) return res.status(500).json({ error: error.message })

  await supabaseAdmin.from('conversations').update({ status: 'escalated' }).eq('id', req.params.id)

  res.status(201).json(data)
})

router.get('/conversations/:id/escalations', authenticate, async (req: AuthRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from('escalations')
    .select('*')
    .eq('conversation_id', req.params.id)
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.put('/escalations/:id', authenticate, async (req: AuthRequest, res) => {
  const { status } = req.body
  const updates: Record<string, any> = { status: status || 'resolved' }
  if (status === 'resolved') updates.resolved_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('escalations')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.get('/conversations/:id/messages', authenticate, async (req: AuthRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('id, sender_type, content, created_at')
    .eq('conversation_id', req.params.id)
    .order('created_at', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/assistants/:assistantId/message', authenticate, validate(authenticatedChatSchema), async (req: AuthRequest, res) => {
  const { assistantId } = req.params
  const { content, customer_id } = req.body
  const userId = req.user!.id

  const { data: assistant, error: aErr } = await supabaseAdmin.from('assistants').select('*').eq('id', assistantId).maybeSingle()
  if (aErr || !assistant) return res.status(404).json({ error: 'assistant not found' })

  const orgId = assistant.organization_id

  const { data: m } = await supabaseAdmin.from('organization_members').select('role').match({ organization_id: orgId, user_id: userId }).limit(1).maybeSingle()
  if (!m) return res.status(403).json({ error: 'not a member of organization' })

  let embedding: number[]
  try {
    embedding = await generateEmbedding(content)
  } catch (err: any) {
    return res.status(500).json({ error: 'embedding generation failed', detail: err.message })
  }

  const vecLiteral = '[' + embedding.join(',') + ']'
  const topK = 5
  const sql = `SELECT id, content, metadata FROM knowledge_chunks WHERE organization_id = $2 ORDER BY embedding <-> ($1::vector) LIMIT $3`
  let chunks: any[] = []
  try {
    const r = await pgQuery(sql, [vecLiteral, orgId, topK])
    chunks = r.rows
  } catch (err: any) {
    return res.status(500).json({ error: 'similarity search failed', detail: err.message })
  }

  const contextText = chunks.map((c: any) => c.content).join('\n---\n')
  const systemPrompt = assistant.system_prompt || ''
  const constructedPrompt = `${systemPrompt}\n\nRelevant knowledge:\n${contextText}\n\nCustomer question:\n${content}`

  const GEMINI_API_URL = process.env.GEMINI_API_URL || ''
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
  if (!GEMINI_API_URL || !GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini not configured on server' })
  }

  try {
    const resp = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GEMINI_API_KEY}` },
      body: JSON.stringify({ prompt: constructedPrompt })
    })
    const gen = await resp.json()
    const assistantReply = gen?.output || gen?.text || JSON.stringify(gen)

    const { data: conv } = await supabaseAdmin.from('conversations').insert([{
      organization_id: orgId,
      assistant_id: assistantId,
      customer_id: customer_id || null,
      started_at: new Date().toISOString(),
      last_message_at: new Date().toISOString()
    }]).select().single()

    await supabaseAdmin.from('messages').insert([
      { conversation_id: conv.id, organization_id: orgId, sender_type: 'customer', content },
      { conversation_id: conv.id, organization_id: orgId, sender_type: 'assistant', content: assistantReply }
    ])

    // Analytics
    Promise.resolve(supabaseAdmin.from('analytics_events').insert([{
      organization_id: orgId, assistant_id: assistantId, conversation_id: conv.id,
      event_type: 'message_sent', metadata: { sender_type: 'customer', chunks_used: chunks.length }
    }])).catch(() => {})

    res.json({ reply: assistantReply, conversation_id: conv.id, contexts: chunks })
  } catch (err: any) {
    return res.status(500).json({ error: 'generation failed', detail: err.message })
  }
})

export default router
