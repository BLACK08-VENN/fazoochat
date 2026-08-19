import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'

// Minimal Express app test (no DB deps needed)
describe('API health endpoint', () => {
  let server: any
  let baseUrl: string

  beforeAll(async () => {
    const app = express()
    app.get('/health', (_req, res) => res.json({ ok: true }))
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address()
        baseUrl = `http://localhost:${addr.port}`
        resolve()
      })
    })
  })

  afterAll(() => {
    server?.close()
  })

  it('GET /health returns ok', async () => {
    const res = await fetch(`${baseUrl}/health`)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })
})
