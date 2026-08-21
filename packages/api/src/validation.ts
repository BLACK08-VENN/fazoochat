import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
      return res.status(400).json({ error: 'validation failed', details: message })
    }
    req.body = result.data
    next()
  }
}

export const createOrgSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
  owner_user_id: z.string().uuid()
})

export const createAssistantSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  system_prompt: z.string().max(10000).optional(),
  welcome_message: z.string().max(1000).optional()
})

export const updateAssistantSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  system_prompt: z.string().max(10000).optional(),
  welcome_message: z.string().max(1000).optional(),
  avatar_url: z.string().url().optional(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  enabled: z.boolean().optional()
})

export const createKnowledgeSourceSchema = z.object({
  assistant_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  content: z.string().max(500000).optional(),
  source_type: z.enum(['text', 'url', 'file']).optional(),
  organization_id: z.string().uuid()
})

export const publicChatSchema = z.object({
  assistant_id: z.string().uuid(),
  message: z.string().min(1).max(10000),
  conversation_id: z.string().uuid().optional(),
  conversation_token: z.string().uuid().optional(),
  customer_name: z.string().max(200).optional(),
  customer_email: z.string().email().optional()
})

export const publicConversationQuerySchema = z.object({
  token: z.string().uuid()
})

export const authenticatedChatSchema = z.object({
  content: z.string().min(1).max(10000),
  customer_id: z.string().uuid().optional()
})

export const verifyTokenSchema = z.object({
  token: z.string().min(1)
})

export const escalateSchema = z.object({
  reason: z.string().min(1).max(2000)
})

export const updateConversationSchema = z.object({
  status: z.enum(['open', 'closed', 'resolved', 'escalated']).optional(),
  assigned_to: z.string().uuid().optional()
})
