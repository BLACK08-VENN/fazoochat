import express from 'express'
import { createSupabaseUserClient } from '../supabaseClient'
import { authenticate, AuthRequest } from '../middleware/authenticate'
import { validate, createAssistantSchema, updateAssistantSchema } from '../validation'

const router = express.Router()

router.get('/', authenticate, async (req: AuthRequest, res) => {
  const supabaseUser = createSupabaseUserClient(req.accessToken!)
  const userId = req.user!.id
  const { data: orgs } = await supabaseUser.from('organization_members').select('organization_id').eq('user_id', userId)
  const orgIds = (orgs || []).map((o: any) => o.organization_id)
  const { data, error } = await supabaseUser.from('assistants').select('*').in('organization_id', orgIds)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const supabaseUser = createSupabaseUserClient(req.accessToken!)
  const { data, error } = await supabaseUser.from('assistants').select('*').eq('id', req.params.id).single()
  if (error) return res.status(404).json({ error: 'not found' })
  res.json(data)
})

router.post('/', authenticate, validate(createAssistantSchema), async (req: AuthRequest, res) => {
  const supabaseUser = createSupabaseUserClient(req.accessToken!)
  const userId = req.user!.id
  const { organization_id, name, description, system_prompt, welcome_message } = req.body

  const { data: m } = await supabaseUser.from('organization_members').select('role').match({ organization_id, user_id: userId }).limit(1).maybeSingle()
  if (!m) return res.status(403).json({ error: 'not a member' })

  const { data, error } = await supabaseUser.from('assistants').insert([{
    organization_id, name, description, system_prompt, welcome_message
  }]).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

router.put('/:id', authenticate, validate(updateAssistantSchema), async (req: AuthRequest, res) => {
  const supabaseUser = createSupabaseUserClient(req.accessToken!)
  const { data: existing } = await supabaseUser.from('assistants').select('organization_id').eq('id', req.params.id).single()
  if (!existing) return res.status(404).json({ error: 'not found' })

  const { data: m } = await supabaseUser.from('organization_members').select('role').match({ organization_id: existing.organization_id, user_id: req.user!.id }).limit(1).maybeSingle()
  if (!m) return res.status(403).json({ error: 'not a member' })

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const [key, val] of Object.entries(req.body)) {
    if (val !== undefined) updates[key] = val
  }

  const { data, error } = await supabaseUser.from('assistants').update(updates).eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  const supabaseUser = createSupabaseUserClient(req.accessToken!)
  const { data: existing } = await supabaseUser.from('assistants').select('organization_id').eq('id', req.params.id).single()
  if (!existing) return res.status(404).json({ error: 'not found' })

  const { data: m } = await supabaseUser.from('organization_members').select('role').match({ organization_id: existing.organization_id, user_id: req.user!.id }).limit(1).maybeSingle()
  if (!m) return res.status(403).json({ error: 'not a member' })

  const { error } = await supabaseUser.from('assistants').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.status(204).end()
})

export default router
