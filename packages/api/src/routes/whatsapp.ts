import express from 'express'
import { supabaseAdmin } from '../supabaseClient'
import { generateEmbedding } from '../embeddings'
import { retrieveKnowledge } from '../vectorSearch'
import { generateText } from '../gemini'
import { getWhatsAppConfig, sendWhatsAppMessage, verifyTwilioSignature } from '../whatsapp'
import { authenticate, AuthRequest } from '../middleware/authenticate'
import { isOrganizationMember } from '../authorization'

const router = express.Router()

function parseWhatsAppNumber(from: string): string {
  return from.replace('whatsapp:', '')
}

// Public webhook - receives incoming WhatsApp messages from Twilio
router.post('/webhook/:organizationId', express.urlencoded({ extended: false }), async (req, res) => {
  const { organizationId } = req.params
  const { From, Body, MessageSid, NumMedia } = req.body

  if (!From || !Body) {
    return res.status(400).send('Missing required fields')
  }

  const config = await getWhatsAppConfig(organizationId)
  if (!config) {
    console.warn(`No WhatsApp config for org ${organizationId}`)
    return res.status(200).send('OK')
  }

  // Verify Twilio signature
  const signature = req.header('x-twilio-signature') || ''
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`
  if (!verifyTwilioSignature(config.authToken, url, req.body, signature)) {
    console.warn('Invalid Twilio signature')
    return res.status(403).send('Invalid signature')
  }

  const customerPhone = parseWhatsAppNumber(From)
  const messageBody = Body.trim()

  // Find or create customer by phone
  let customerId: string | null = null
  const { data: existingCustomer } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('phone', customerPhone)
    .maybeSingle()

  if (existingCustomer) {
    customerId = existingCustomer.id
  } else {
    const { data: newCustomer } = await supabaseAdmin
      .from('customers')
      .insert([{ organization_id: organizationId, phone: customerPhone, name: customerPhone }])
      .select('id')
      .single()
    customerId = newCustomer?.id || null
  }

  // Find the assistant for this org (use first enabled assistant)
  const { data: assistant } = await supabaseAdmin
    .from('assistants')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('enabled', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!assistant) {
    console.warn(`No enabled assistant for org ${organizationId}`)
    return res.status(200).send('OK')
  }

  // Find or create conversation for this customer
  let convId: string | null = null
  const { data: existingConv } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('assistant_id', assistant.id)
    .eq('customer_id', customerId)
    .eq('channel', 'whatsapp')
    .eq('status', 'open')
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingConv) {
    convId = existingConv.id
    await supabaseAdmin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId)
  } else {
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .insert([{
        organization_id: organizationId,
        assistant_id: assistant.id,
        customer_id: customerId,
        channel: 'whatsapp',
        started_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      }])
      .select('id')
      .single()
    convId = conv?.id || null
  }

  if (!convId) {
    console.error('Failed to create/find conversation')
    return res.status(200).send('OK')
  }

  // Store customer message
  await supabaseAdmin.from('messages').insert([{
    conversation_id: convId,
    organization_id: organizationId,
    sender_type: 'customer',
    content: messageBody,
    metadata: { whatsapp_sid: MessageSid, phone: customerPhone }
  }])

  // RAG: generate embedding and retrieve context
  let embedding: number[]
  try {
    embedding = await generateEmbedding(messageBody)
  } catch (err: any) {
    console.error('Embedding failed:', err.message)
    return res.status(200).send('OK')
  }

  let chunks: any[] = []
  try {
    chunks = await retrieveKnowledge(embedding, organizationId, assistant.id)
  } catch (err: any) {
    console.error('Vector search failed:', err.message)
  }

  // Generate AI reply
  const contextText = chunks.map((c: any) => c.content).join('\n---\n')
  const systemPrompt = assistant.system_prompt || 'You are a helpful assistant.'
  const constructedPrompt = contextText
    ? `${systemPrompt}\n\nRelevant knowledge:\n${contextText}\n\nCustomer question:\n${messageBody}`
    : `${systemPrompt}\n\nCustomer question:\n${messageBody}`

  try {
    const assistantReply = await generateText(constructedPrompt)

    await supabaseAdmin.from('messages').insert([{
      conversation_id: convId,
      organization_id: organizationId,
      sender_type: 'assistant',
      content: assistantReply,
      metadata: { channel: 'whatsapp' }
    }])

    // Send reply via WhatsApp
    await sendWhatsAppMessage(config, customerPhone, assistantReply)

    // Analytics
    Promise.resolve(supabaseAdmin.from('analytics_events').insert([{
      organization_id: organizationId,
      assistant_id: assistant.id,
      conversation_id: convId,
      event_type: 'message_sent',
      metadata: { sender_type: 'customer', channel: 'whatsapp', chunks_used: chunks.length }
    }])).catch((err: any) => console.error('Analytics insert failed:', err.message))
  } catch (err: any) {
    console.error('AI generation failed:', err.message)
    await sendWhatsAppMessage(config, customerPhone, 'Sorry, I encountered an error. Please try again later.')
  }

  // Twilio expects a 200 response with TwiML or empty body
  res.status(200).send('OK')
})

// Send outbound WhatsApp message (authenticated)
router.post('/send', authenticate, async (req: AuthRequest, res) => {
  const { organization_id, to, message, assistant_id } = req.body
  if (!organization_id || !to || !message) {
    return res.status(400).json({ error: 'organization_id, to, and message required' })
  }

  if (!(await isOrganizationMember(req.user!.id, organization_id))) {
    return res.status(403).json({ error: 'not a member' })
  }

  const config = await getWhatsAppConfig(organization_id)
  if (!config) {
    return res.status(400).json({ error: 'WhatsApp not configured for this organization' })
  }

  const msgSid = await sendWhatsAppMessage(config, to, message)
  if (!msgSid) {
    return res.status(500).json({ error: 'Failed to send WhatsApp message' })
  }

  // Optionally log to conversation if assistant_id provided
  if (assistant_id) {
    const phone = to.replace('+', '')
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('phone', phone)
      .maybeSingle()

    if (customer) {
      const { data: conv } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('assistant_id', assistant_id)
        .eq('customer_id', customer.id)
        .eq('channel', 'whatsapp')
        .eq('status', 'open')
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (conv) {
        await supabaseAdmin.from('messages').insert([{
          conversation_id: conv.id,
          organization_id,
          sender_type: 'assistant',
          content: message,
          metadata: { channel: 'whatsapp', twilio_sid: msgSid }
        }])
        await supabaseAdmin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conv.id)
      }
    }
  }

  res.json({ success: true, message_sid: msgSid })
})

// Get WhatsApp config for an org (authenticated)
router.get('/config/:organizationId', authenticate, async (req: AuthRequest, res) => {
  if (!(await isOrganizationMember(req.user!.id, req.params.organizationId))) {
    return res.status(404).json({ error: 'not found' })
  }

  const { data, error } = await supabaseAdmin
    .from('whatsapp_configs')
    .select('id, organization_id, twilio_account_sid, twilio_whatsapp_number, enabled, created_at')
    .eq('organization_id', req.params.organizationId)
    .single()

  if (error || !data) return res.status(404).json({ error: 'not configured' })
  res.json(data)
})

// Create or update WhatsApp config (authenticated)
router.post('/config/:organizationId', authenticate, async (req: AuthRequest, res) => {
  const { organizationId } = req.params
  const { twilio_account_sid, twilio_auth_token, twilio_whatsapp_number } = req.body

  if (!twilio_account_sid || !twilio_auth_token || !twilio_whatsapp_number) {
    return res.status(400).json({ error: 'twilio_account_sid, twilio_auth_token, and twilio_whatsapp_number required' })
  }

  if (!(await isOrganizationMember(req.user!.id, organizationId))) {
    return res.status(403).json({ error: 'not a member' })
  }

  const { data: existing } = await supabaseAdmin
    .from('whatsapp_configs')
    .select('id')
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('whatsapp_configs')
      .update({ twilio_account_sid, twilio_auth_token, twilio_whatsapp_number, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .select('id, organization_id, twilio_account_sid, twilio_whatsapp_number, enabled')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  const { data, error } = await supabaseAdmin
    .from('whatsapp_configs')
    .insert([{
      organization_id: organizationId,
      twilio_account_sid,
      twilio_auth_token,
      twilio_whatsapp_number
    }])
    .select('id, organization_id, twilio_account_sid, twilio_whatsapp_number, enabled')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// Delete WhatsApp config
router.delete('/config/:organizationId', authenticate, async (req: AuthRequest, res) => {
  if (!(await isOrganizationMember(req.user!.id, req.params.organizationId))) {
    return res.status(403).json({ error: 'not a member' })
  }

  const { error } = await supabaseAdmin
    .from('whatsapp_configs')
    .delete()
    .eq('organization_id', req.params.organizationId)

  if (error) return res.status(500).json({ error: error.message })
  res.status(204).end()
})

export default router
