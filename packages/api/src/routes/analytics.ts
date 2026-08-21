import express from 'express'
import { supabaseAdmin } from '../supabaseClient'
import { authenticate, AuthRequest } from '../middleware/authenticate'
import { isOrganizationMember } from '../authorization'

const router = express.Router()

router.get('/summary', authenticate, async (req: AuthRequest, res) => {
  const userId = req.user!.id
  const { data: orgs } = await supabaseAdmin.from('organization_members').select('organization_id').eq('user_id', userId)
  const orgIds = (orgs || []).map((o: any) => o.organization_id)

  const [convResult, msgResult, escResult] = await Promise.all([
    supabaseAdmin.from('conversations').select('id, status, created_at').in('organization_id', orgIds),
    supabaseAdmin.from('messages').select('id, sender_type, created_at').in('organization_id', orgIds),
    supabaseAdmin.from('escalations').select('id, status, created_at').in('organization_id', orgIds)
  ])

  const conversations = convResult.data || []
  const messages = msgResult.data || []
  const escalations = escResult.data || []

  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const summary = {
    total_conversations: conversations.length,
    open_conversations: conversations.filter(c => c.status === 'open').length,
    total_messages: messages.length,
    customer_messages: messages.filter(m => m.sender_type === 'customer').length,
    assistant_messages: messages.filter(m => m.sender_type === 'assistant').length,
    total_escalations: escalations.length,
    open_escalations: escalations.filter(e => e.status === 'open').length,
    conversations_24h: conversations.filter(c => new Date(c.created_at) >= last24h).length,
    conversations_7d: conversations.filter(c => new Date(c.created_at) >= last7d).length,
    messages_24h: messages.filter(m => new Date(m.created_at) >= last24h).length,
    messages_7d: messages.filter(m => new Date(m.created_at) >= last7d).length
  }

  res.json(summary)
})

router.get('/events', authenticate, async (req: AuthRequest, res) => {
  const userId = req.user!.id
  const { data: orgs } = await supabaseAdmin.from('organization_members').select('organization_id').eq('user_id', userId)
  const orgIds = (orgs || []).map((o: any) => o.organization_id)

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200)

  const { data, error } = await supabaseAdmin
    .from('analytics_events')
    .select('*')
    .in('organization_id', orgIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.get('/by-assistant', authenticate, async (req: AuthRequest, res) => {
  const userId = req.user!.id
  const { data: orgs } = await supabaseAdmin.from('organization_members').select('organization_id').eq('user_id', userId)
  const orgIds = (orgs || []).map((o: any) => o.organization_id)

  const { data, error } = await supabaseAdmin
    .from('analytics_events')
    .select('assistant_id, event_type')
    .in('organization_id', orgIds)

  if (error) return res.status(500).json({ error: error.message })

  const byAssistant: Record<string, { total: number; byType: Record<string, number> }> = {}
  for (const event of data || []) {
    const aid = event.assistant_id || 'unknown'
    if (!byAssistant[aid]) byAssistant[aid] = { total: 0, byType: {} }
    byAssistant[aid].total++
    byAssistant[aid].byType[event.event_type] = (byAssistant[aid].byType[event.event_type] || 0) + 1
  }

  res.json(byAssistant)
})

export default router
