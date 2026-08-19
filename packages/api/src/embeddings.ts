const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_EMBEDDING_URL = process.env.GEMINI_EMBEDDING_URL || ''

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!GEMINI_API_KEY || !GEMINI_EMBEDDING_URL) {
    throw new Error('GEMINI_API_KEY or GEMINI_EMBEDDING_URL not configured. Set env vars for production.')
  }

  const res = await fetch(GEMINI_EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GEMINI_API_KEY}`
    },
    body: JSON.stringify({ input: text })
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Embedding API error: ${res.status} ${txt}`)
  }

  const payload = await res.json()
  // Expect embedding in payload.data[0].embedding or similar — adapt as required
  if (!payload || !payload.data || !payload.data[0] || !payload.data[0].embedding) {
    throw new Error('Unexpected embedding response format')
  }
  return payload.data[0].embedding
}
