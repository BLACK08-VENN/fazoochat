import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateGeminiEmbedding, generateText } from '../gemini'

describe('Gemini API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_URL
    delete process.env.GEMINI_EMBEDDING_URL
  })

  it('uses the native generateContent contract', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    process.env.GEMINI_API_URL = 'https://example.test/generate'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Hello' }, { text: ' world' }] } }] })
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(generateText('Question')).resolves.toBe('Hello world')
    expect(fetchMock).toHaveBeenCalledWith('https://example.test/generate', expect.objectContaining({
      headers: expect.objectContaining({ 'x-goog-api-key': 'test-key' }),
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Question' }] }] })
    }))
  })

  it('requests and reads 1536-dimensional embeddings', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    process.env.GEMINI_EMBEDDING_URL = 'https://example.test/embed'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: [0.1, 0.2] } })
    }))

    await expect(generateGeminiEmbedding('Knowledge')).resolves.toEqual([0.1, 0.2])
    expect(fetch).toHaveBeenCalledWith('https://example.test/embed', expect.objectContaining({
      body: JSON.stringify({ content: { parts: [{ text: 'Knowledge' }] }, outputDimensionality: 1536 })
    }))
  })
})
