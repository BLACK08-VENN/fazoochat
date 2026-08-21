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

function allowedOrigins() {
  return (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
}

export function healthHandler(_req: Request, res: Response) {
  return res.json({ ok: true })
}

export function createApp() {
  const app = express()
  const origins = allowedOrigins()
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origins.includes('*') || origins.includes(origin)) return callback(null, true)
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
