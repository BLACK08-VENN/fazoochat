import express from 'express'
import { supabaseAdmin } from '../supabaseClient'
import { validate, createOrgSchema } from '../validation'

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

export default router
