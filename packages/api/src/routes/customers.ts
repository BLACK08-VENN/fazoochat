import express from 'express'
import { supabaseAdmin } from '../supabaseClient'
import { authenticate, AuthRequest } from '../middleware/authenticate'
import { isOrganizationMember } from '../authorization'

const router = express.Router()

router.get('/', authenticate, async (req: AuthRequest, res) => {
  const userId = req.user!.id
  const { organization_id } = req.query
  if (!organization_id) return res.status(400).json({ error: 'organization_id required' })

  if (!(await isOrganizationMember(userId, organization_id as string))) {
    return res.status(403).json({ error: 'not a member' })
  }

  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('organization_id', organization_id as string)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (error || !data) return res.status(404).json({ error: 'not found' })

  if (!(await isOrganizationMember(req.user!.id, data.organization_id))) {
    return res.status(404).json({ error: 'not found' })
  }

  res.json(data)
})

router.post('/', authenticate, async (req: AuthRequest, res) => {
  const { organization_id, name, email, phone } = req.body
  if (!organization_id) return res.status(400).json({ error: 'organization_id required' })

  if (!(await isOrganizationMember(req.user!.id, organization_id))) {
    return res.status(403).json({ error: 'not a member' })
  }

  const { data, error } = await supabaseAdmin
    .from('customers')
    .insert([{ organization_id, name, email, phone }])
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  const { data: existing } = await supabaseAdmin
    .from('customers')
    .select('organization_id')
    .eq('id', req.params.id)
    .single()

  if (!existing) return res.status(404).json({ error: 'not found' })

  if (!(await isOrganizationMember(req.user!.id, existing.organization_id))) {
    return res.status(404).json({ error: 'not found' })
  }

  const { name, email, phone } = req.body
  const updates: Record<string, any> = {}
  if (name !== undefined) updates.name = name
  if (email !== undefined) updates.email = email
  if (phone !== undefined) updates.phone = phone

  const { data, error } = await supabaseAdmin
    .from('customers')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  const { data: existing } = await supabaseAdmin
    .from('customers')
    .select('organization_id')
    .eq('id', req.params.id)
    .single()

  if (!existing) return res.status(404).json({ error: 'not found' })

  if (!(await isOrganizationMember(req.user!.id, existing.organization_id))) {
    return res.status(404).json({ error: 'not found' })
  }

  const { error } = await supabaseAdmin.from('customers').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.status(204).end()
})

export default router
