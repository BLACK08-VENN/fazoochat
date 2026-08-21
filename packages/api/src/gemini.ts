const apiKey = () => process.env.GEMINI_API_KEY || ''

async function geminiRequest(url: string, body: unknown) {
  const key = apiKey()
  if (!url || !key) throw new Error('Gemini is not configured on server')

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Gemini API error: ${response.status} ${detail}`)
  }

  return response.json()
}

export async function generateText(prompt: string): Promise<string> {
  const payload = await geminiRequest(process.env.GEMINI_API_URL || '', {
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  })
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || '')
    .join('')
    .trim()

  if (!text) throw new Error('Gemini returned no text response')
  return text
}

export async function generateGeminiEmbedding(text: string): Promise<number[]> {
  const payload = await geminiRequest(process.env.GEMINI_EMBEDDING_URL || '', {
    content: { parts: [{ text }] },
    outputDimensionality: 1536
  })
  const values = payload?.embedding?.values
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Gemini returned an invalid embedding response')
  }
  return values
}
