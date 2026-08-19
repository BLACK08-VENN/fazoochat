import express from 'express'
import { supabaseAdmin } from '../supabaseClient'
import { generateEmbedding } from '../embeddings'
import { query as pgQuery } from '../db'
import { validate, publicChatSchema } from '../validation'

const router = express.Router()

router.post('/', validate(publicChatSchema), async (req, res) => {
  const { assistant_id, message, conversation_id, customer_name, customer_email } = req.body

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
  if (!convId) {
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .insert([{
        organization_id: orgId,
        assistant_id,
        customer_id: customerId,
        channel: 'widget',
        started_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      }])
      .select('id')
      .single()
    convId = conv?.id
  } else {
    await supabaseAdmin
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', convId)
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

  const vecLiteral = '[' + embedding.join(',') + ']'
  const topK = 5
  let chunks: any[] = []
  try {
    const r = await pgQuery(
      'SELECT id, content, metadata FROM knowledge_chunks WHERE organization_id = $2 ORDER BY embedding <-> ($1::vector) LIMIT $3',
      [vecLiteral, orgId, topK]
    )
    chunks = r.rows
  } catch (err: any) {
    console.error('Vector search failed:', err.message)
  }

  const contextText = chunks.map((c: any) => c.content).join('\n---\n')
  const systemPrompt = assistant.system_prompt || 'You are a helpful assistant.'
  const constructedPrompt = contextText
    ? `${systemPrompt}\n\nRelevant knowledge:\n${contextText}\n\nCustomer question:\n${message}`
    : `${systemPrompt}\n\nCustomer question:\n${message}`

  const GEMINI_API_URL = process.env.GEMINI_API_URL || ''
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
  if (!GEMINI_API_URL || !GEMINI_API_KEY) {
    return res.status(500).json({ error: 'AI not configured on server' })
  }

  try {
    const resp = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GEMINI_API_KEY}` },
      body: JSON.stringify({ prompt: constructedPrompt })
    })
    const gen = await resp.json()
    const assistantReply = gen?.output || gen?.text || JSON.stringify(gen)

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
    }])).catch(() => {})

    res.json({
      reply: assistantReply,
      conversation_id: convId,
      assistant: { id: assistant.id, name: assistant.name, avatar_url: assistant.avatar_url, welcome_message: assistant.welcome_message }
    })
  } catch (err: any) {
    return res.status(500).json({ error: 'generation failed', detail: err.message })
  }
})

router.get('/conversations/:id/messages', async (req, res) => {
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
