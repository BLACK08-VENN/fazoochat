import express from 'express'
import { supabaseAdmin } from '../supabaseClient'
import { generateEmbedding } from '../embeddings'
import { retrieveKnowledge } from '../vectorSearch'
import { validate, publicChatSchema } from '../validation'
import { randomUUID } from 'crypto'
import { generateText } from '../gemini'

const router = express.Router()

router.post('/', validate(publicChatSchema), async (req, res) => {
  const { assistant_id, message, conversation_id, conversation_token, customer_name, customer_email } = req.body

  const { data: assistant, error: aErr } = await supabaseAdmin
    .from('assistants')
    .select('*')
    .eq('id', assistant_id)
    .eq('enabled', true)
    .maybeSingle()
  if (aErr || !assistant) return res.status(404).json({ error: 'assistant not found' })

  const orgId = assistant.organization_id

  let customerId: string | null = null
  if (customer_email) {
    const { data: existing } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('organization_id', orgId)
      .eq('email', customer_email)
      .maybeSingle()

    if (existing) {
      customerId = existing.id
    } else {
      const { data: newCustomer } = await supabaseAdmin
        .from('customers')
        .insert([{ organization_id: orgId, name: customer_name || null, email: customer_email }])
        .select('id')
        .single()
      customerId = newCustomer?.id || null
    }
  }

  let convId = conversation_id
  let publicToken = conversation_token
  if (!convId) {
    publicToken = randomUUID()
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .insert([{
        organization_id: orgId,
        assistant_id,
        customer_id: customerId,
        channel: 'widget',
        public_token: publicToken,
        started_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      }])
      .select('id')
      .single()
    convId = conv?.id
  } else {
    if (!conversation_token) return res.status(403).json({ error: 'conversation token required' })
    const { data: existingConversation } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('id', convId)
      .eq('assistant_id', assistant_id)
      .eq('organization_id', orgId)
      .eq('public_token', conversation_token)
      .maybeSingle()
    if (!existingConversation) return res.status(403).json({ error: 'invalid conversation credentials' })
    await supabaseAdmin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId)
  }

  if (!convId) return res.status(500).json({ error: 'failed to create conversation' })

  await supabaseAdmin.from('messages').insert([{
    conversation_id: convId,
    organization_id: orgId,
    sender_type: 'customer',
    content: message
  }])

  let embedding: number[]
  try {
    embedding = await generateEmbedding(message)
  } catch (err: any) {
    return res.status(500).json({ error: 'embedding generation failed', detail: err.message })
  }

  let chunks: any[] = []
  try {
    chunks = await retrieveKnowledge(embedding, orgId, assistant_id)
  } catch (err: any) {
    console.error('Vector search failed:', err.message)
  }

  const contextText = chunks.map((c: any) => c.content).join('\n---\n')
  const systemPrompt = assistant.system_prompt || 'You are a helpful assistant.'
  const constructedPrompt = contextText
    ? `${systemPrompt}\n\nRelevant knowledge:\n${contextText}\n\nCustomer question:\n${message}`
    : `${systemPrompt}\n\nCustomer question:\n${message}`

  try {
    const assistantReply = await generateText(constructedPrompt)

    await supabaseAdmin.from('messages').insert([{
      conversation_id: convId,
      organization_id: orgId,
      sender_type: 'assistant',
      content: assistantReply
    }])

    // Analytics: log the chat event
    Promise.resolve(supabaseAdmin.from('analytics_events').insert([{
      organization_id: orgId,
      assistant_id,
      conversation_id: convId,
      event_type: 'message_sent',
      metadata: { sender_type: 'customer', chunks_used: chunks.length }
    }])).catch(err => console.error('Analytics insert failed:', err.message))

    res.json({
      reply: assistantReply,
      conversation_id: convId,
      conversation_token: publicToken,
      assistant: { id: assistant.id, name: assistant.name, avatar_url: assistant.avatar_url, welcome_message: assistant.welcome_message }
    })
  } catch (err: any) {
    return res.status(500).json({ error: 'generation failed', detail: err.message })
  }
})

router.get('/conversations/:id/messages', async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : ''
  if (!token) return res.status(403).json({ error: 'conversation token required' })
  const { data: conversation } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('id', req.params.id)
    .eq('public_token', token)
    .maybeSingle()
  if (!conversation) return res.status(404).json({ error: 'conversation not found' })

  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('id, sender_type, content, created_at')
    .eq('conversation_id', req.params.id)
    .order('created_at', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.get('/assistants/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('assistants')
    .select('id, name, description, welcome_message, avatar_url, primary_color')
    .eq('id', req.params.id)
    .eq('enabled', true)
    .maybeSingle()
  if (error || !data) return res.status(404).json({ error: 'assistant not found' })
  res.json(data)
})

export default router
