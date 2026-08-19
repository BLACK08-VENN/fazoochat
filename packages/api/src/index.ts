import express from 'express'
import dotenv from 'dotenv'
import orgsRouter from './routes/orgs'
import authRouter from './routes/auth'
import assistantsRouter from './routes/assistants'
import knowledgeRouter from './routes/knowledge'
import chatRouter from './routes/chat'
import publicChatRouter from './routes/publicChat'
import { publicChatLimiter, authLimiter } from './middleware/rateLimit'

dotenv.config()

const app = express()
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/orgs', orgsRouter)
app.use('/auth', authLimiter, authRouter)
app.use('/assistants', assistantsRouter)
app.use('/knowledge', knowledgeRouter)
app.use('/chat', chatRouter)
app.use('/chat/public', publicChatLimiter, publicChatRouter)

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`API listening on http://localhost:${port}`))
