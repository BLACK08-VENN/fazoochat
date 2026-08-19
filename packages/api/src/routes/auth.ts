import express from 'express'
import { supabaseAdmin } from '../supabaseClient'
import { validate, verifyTokenSchema } from '../validation'

const router = express.Router()

// Verify a Supabase access token and return user, profile, and organizations
router.post('/verify', validate(verifyTokenSchema), async (req, res) => {
  const { token } = req.body

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error) return res.status(401).json({ error: error.message })
  const user = data.user

  const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('user_id', user.id).limit(1).maybeSingle()

  const { data: orgs } = await supabaseAdmin.from('organization_members').select('organization_id, role').eq('user_id', user.id)

  res.json({ user, profile, orgs })
})

export default router
