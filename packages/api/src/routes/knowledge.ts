import express from 'express'
import { createSupabaseUserClient } from '../supabaseClient'
import { authenticate, AuthRequest } from '../middleware/authenticate'
import { processKnowledgeSource } from '../knowledgeProcessor'
import { validate, createKnowledgeSourceSchema } from '../validation'

const router = express.Router()

router.get('/sources', authenticate, async (req: AuthRequest, res) => {
  const supabaseUser = createSupabaseUserClient(req.accessToken!)
  const { assistant_id } = req.query
  if (!assistant_id) return res.status(400).json({ error: 'assistant_id required' })

  const { data: assistant } = await supabaseUser.from('assistants').select('organization_id').eq('id', assistant_id).single()
  if (!assistant) return res.status(404).json({ error: 'assistant not found' })

  const { data, error } = await supabaseUser.from('knowledge_sources').select('*').eq('assistant_id', assistant_id)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.get('/sources/:id', authenticate, async (req: AuthRequest, res) => {
  const supabaseUser = createSupabaseUserClient(req.accessToken!)
  const { data, error } = await supabaseUser.from('knowledge_sources').select('*').eq('id', req.params.id).single()
  if (error || !data) return res.status(404).json({ error: 'not found' })
  res.json(data)
})

router.post('/sources', authenticate, validate(createKnowledgeSourceSchema), async (req: AuthRequest, res) => {
  const supabaseUser = createSupabaseUserClient(req.accessToken!)
  const { assistant_id, title, content, source_type } = req.body

  const { data: assistant } = await supabaseUser
    .from('assistants')
    .select('organization_id')
    .eq('id', assistant_id)
    .single()
  if (!assistant) return res.status(404).json({ error: 'assistant not found' })

  const { data, error } = await supabaseUser.from('knowledge_sources').insert([{
    assistant_id, title, content, source_type: source_type || 'text', organization_id: assistant.organization_id
  }]).select().single()
  if (error) return res.status(500).json({ error: error.message })

  processKnowledgeSource(data.id, supabaseUser).catch(err => {
    console.error('Background knowledge processing failed:', err.message)
  })

  res.status(201).json(data)
})

router.put('/sources/:id', authenticate, async (req: AuthRequest, res) => {
  const supabaseUser = createSupabaseUserClient(req.accessToken!)
  const { title, content, source_type } = req.body
  const { data: existing } = await supabaseUser.from('knowledge_sources').select('organization_id').eq('id', req.params.id).single()
  if (!existing) return res.status(404).json({ error: 'not found' })

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (title !== undefined) updates.title = title
  if (content !== undefined) updates.content = content
  if (source_type !== undefined) updates.source_type = source_type

  const { data, error } = await supabaseUser.from('knowledge_sources').update(updates).eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ error: error.message })

  // Re-process if content changed
  if (content !== undefined) {
    // Delete existing chunks
    await supabaseUser.from('knowledge_chunks').delete().eq('knowledge_source_id', req.params.id)
    processKnowledgeSource(req.params.id, supabaseUser).catch(err => {
      console.error('Background knowledge processing failed:', err.message)
    })
  }

  res.json(data)
})

router.delete('/sources/:id', authenticate, async (req: AuthRequest, res) => {
  const supabaseUser = createSupabaseUserClient(req.accessToken!)
  const { data: existing } = await supabaseUser.from('knowledge_sources').select('organization_id').eq('id', req.params.id).single()
  if (!existing) return res.status(404).json({ error: 'not found' })
  const { error } = await supabaseUser.from('knowledge_sources').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.status(204).end()
})

router.get('/sources/:id/chunks', authenticate, async (req: AuthRequest, res) => {
  const supabaseUser = createSupabaseUserClient(req.accessToken!)
  const { data: source } = await supabaseUser.from('knowledge_sources').select('organization_id').eq('id', req.params.id).single()
  if (!source) return res.status(404).json({ error: 'not found' })
  const { data, error } = await supabaseUser
    .from('knowledge_chunks')
    .select('id, content, metadata, created_at')
    .eq('knowledge_source_id', req.params.id)
    .order('created_at', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
