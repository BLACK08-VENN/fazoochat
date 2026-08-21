import { generateGeminiEmbedding } from './gemini'

export async function generateEmbedding(text: string): Promise<number[]> {
  return generateGeminiEmbedding(text)
}
