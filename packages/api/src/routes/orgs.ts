import express from 'express'
import { supabaseAdmin } from '../supabaseClient'
import { validate, createOrgSchema } from '../validation'
import { authenticate, AuthRequest } from '../middleware/authenticate'
import { isOrganizationMember } from '../authorization'

const router = express.Router()

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const adminKey = process.env.ADMIN_API_KEY
  const header = req.header('x-admin-key')
  if (!adminKey || header !== adminKey) return res.status(403).json({ error: 'forbidden' })
  next()
}

router.get('/', requireAdmin, async (_req, res) => {
  const { data, error } = await supabaseAdmin.from('organizations').select('*')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/', requireAdmin, validate(createOrgSchema), async (req, res) => {
  const { name, slug, owner_user_id } = req.body

  const { data: org, error: orgErr } = await supabaseAdmin.from('organizations').insert([{ name, slug }]).select().single()
  if (orgErr) return res.status(500).json({ error: orgErr.message })

  const { error: memberErr } = await supabaseAdmin.from('organization_members').insert([
    { organization_id: org.id, user_id: owner_user_id, role: 'owner' }
  ])
  if (memberErr) return res.status(500).json({ error: memberErr.message })

  res.status(201).json(org)
})

router.get('/:id/members', authenticate, async (req: AuthRequest, res) => {
  if (!(await isOrganizationMember(req.user!.id, req.params.id))) {
    return res.status(404).json({ error: 'not found' })
  }

  const { data, error } = await supabaseAdmin
    .from('organization_members')
    .select('id, user_id, role, created_at')
    .eq('organization_id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/:id/members', authenticate, async (req: AuthRequest, res) => {
  const { user_id, role } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id required' })

  const { data: caller } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .match({ organization_id: req.params.id, user_id: req.user!.id })
    .limit(1)
    .maybeSingle()

  if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
    return res.status(403).json({ error: 'insufficient permissions' })
  }

  const { data, error } = await supabaseAdmin
    .from('organization_members')
    .insert([{ organization_id: req.params.id, user_id, role: role || 'member' }])
    .select()
    .single()

  if (error) {
    if (error.message?.includes('unique')) {
      return res.status(409).json({ error: 'user is already a member' })
    }
    return res.status(500).json({ error: error.message })
  }

  res.status(201).json(data)
})

router.delete('/:id/members/:memberId', authenticate, async (req: AuthRequest, res) => {
  const { data: caller } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .match({ organization_id: req.params.id, user_id: req.user!.id })
    .limit(1)
    .maybeSingle()

  if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
    return res.status(403).json({ error: 'insufficient permissions' })
  }

  const { error } = await supabaseAdmin
    .from('organization_members')
    .delete()
    .eq('id', req.params.memberId)
    .eq('organization_id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.status(204).end()
})

export default router
