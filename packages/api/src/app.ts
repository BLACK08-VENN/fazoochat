import cors from 'cors'
import express, { Request, Response } from 'express'
import orgsRouter from './routes/orgs'
import authRouter from './routes/auth'
import assistantsRouter from './routes/assistants'
import knowledgeRouter from './routes/knowledge'
import chatRouter from './routes/chat'
import publicChatRouter from './routes/publicChat'
import analyticsRouter from './routes/analytics'
import customersRouter from './routes/customers'
import whatsappRouter from './routes/whatsapp'
import { publicChatLimiter, authLimiter } from './middleware/rateLimit'
import { isSupabaseAdminConfigured } from './supabaseClient'

function allowedOrigins() {
  return [
    'http://localhost:3000',
    'https://fazoochat.vercel.app',
    ...(process.env.CORS_ORIGINS || '').split(',')
  ]
    .map(origin => origin.trim())
    .map(origin => origin.replace(/\/$/, ''))
    .filter(Boolean)
}

export function healthHandler(_req: Request, res: Response) {
  return res.json({
    ok: true,
    supabase_admin_configured: isSupabaseAdminConfigured()
  })
}

export function createApp() {
  const app = express()
  const origins = allowedOrigins()
  app.use(cors({
    origin(origin, callback) {
      const normalizedOrigin = origin?.replace(/\/$/, '')
      if (!normalizedOrigin || origins.includes('*') || origins.includes(normalizedOrigin)) return callback(null, true)
      return callback(new Error('Origin is not allowed by CORS'))
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }))
  app.use(express.json({ limit: '1mb' }))
  app.get('/health', healthHandler)
  app.use('/orgs', orgsRouter)
  app.use('/auth', authLimiter, authRouter)
  app.use('/assistants', assistantsRouter)
  app.use('/knowledge', knowledgeRouter)
  app.use('/chat/public', publicChatLimiter, publicChatRouter)
  app.use('/chat', chatRouter)
  app.use('/analytics', analyticsRouter)
  app.use('/customers', customersRouter)
  app.use('/whatsapp', whatsappRouter)
  return app
}
