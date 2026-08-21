import express from 'express'
import { supabaseAdmin } from '../supabaseClient'
import { authenticate, AuthRequest } from '../middleware/authenticate'
import { generateEmbedding } from '../embeddings'
import { retrieveKnowledge } from '../vectorSearch'
import { validate, authenticatedChatSchema, escalateSchema, updateConversationSchema } from '../validation'
import { canAccessConversation, isOrganizationMember } from '../authorization'
import { generateText } from '../gemini'

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
  if (!(await canAccessConversation(req.user!.id, req.params.id))) {
    return res.status(404).json({ error: 'not found' })
  }
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('*, assistants(name), customers(name, email)')
    .eq('id', req.params.id)
    .single()
  if (error) return res.status(404).json({ error: 'not found' })
  res.json(data)
})

router.put('/conversations/:id', authenticate, validate(updateConversationSchema), async (req: AuthRequest, res) => {
  if (!(await canAccessConversation(req.user!.id, req.params.id))) {
    return res.status(404).json({ error: 'not found' })
  }
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

  const conv = await canAccessConversation(req.user!.id, req.params.id)
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
  if (!(await canAccessConversation(req.user!.id, req.params.id))) {
    return res.status(404).json({ error: 'not found' })
  }
  const { data, error } = await supabaseAdmin
    .from('escalations')
    .select('*')
    .eq('conversation_id', req.params.id)
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.put('/escalations/:id', authenticate, async (req: AuthRequest, res) => {
  const { data: escalation } = await supabaseAdmin
    .from('escalations')
    .select('conversation_id')
    .eq('id', req.params.id)
    .maybeSingle()
  if (!escalation || !(await canAccessConversation(req.user!.id, escalation.conversation_id))) {
    return res.status(404).json({ error: 'not found' })
  }
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
  if (!(await canAccessConversation(req.user!.id, req.params.id))) {
    return res.status(404).json({ error: 'not found' })
  }
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

  if (!(await isOrganizationMember(userId, orgId))) return res.status(403).json({ error: 'not a member of organization' })

  if (customer_id) {
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('id', customer_id)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (!customer) return res.status(400).json({ error: 'customer does not belong to organization' })
  }

  let embedding: number[]
  try {
    embedding = await generateEmbedding(content)
  } catch (err: any) {
    return res.status(500).json({ error: 'embedding generation failed', detail: err.message })
  }

  let chunks: any[] = []
  try {
    chunks = await retrieveKnowledge(embedding, orgId, assistantId)
  } catch (err: any) {
    return res.status(500).json({ error: 'similarity search failed', detail: err.message })
  }

  const contextText = chunks.map((c: any) => c.content).join('\n---\n')
  const systemPrompt = assistant.system_prompt || ''
  const constructedPrompt = `${systemPrompt}\n\nRelevant knowledge:\n${contextText}\n\nCustomer question:\n${content}`

  try {
    const assistantReply = await generateText(constructedPrompt)

    const { data: conv } = await supabaseAdmin.from('conversations').insert([{
      organization_id: orgId,
      assistant_id: assistantId,
      customer_id: customer_id || null,
      started_at: new Date().toISOString(),
      last_message_at: new Date().toISOString()
    }]).select().single()

    if (!conv) return res.status(500).json({ error: 'failed to create conversation' })

    await supabaseAdmin.from('messages').insert([
      { conversation_id: conv.id, organization_id: orgId, sender_type: 'customer', content },
      { conversation_id: conv.id, organization_id: orgId, sender_type: 'assistant', content: assistantReply }
    ])

    // Analytics
    Promise.resolve(supabaseAdmin.from('analytics_events').insert([{
      organization_id: orgId, assistant_id: assistantId, conversation_id: conv.id,
      event_type: 'message_sent', metadata: { sender_type: 'customer', chunks_used: chunks.length }
    }])).catch(err => console.error('Analytics insert failed:', err.message))

    res.json({ reply: assistantReply, conversation_id: conv.id, contexts: chunks })
  } catch (err: any) {
    return res.status(500).json({ error: 'generation failed', detail: err.message })
  }
})

export default router
