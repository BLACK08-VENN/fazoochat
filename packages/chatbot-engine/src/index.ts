import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Pool } from 'pg'

export interface KnowledgeChunk {
  id: string
  content: string
  embedding?: number[]
  metadata?: Record<string, any>
}

export interface EngineConfig {
  supabaseUrl: string
  supabaseKey: string
  databaseUrl: string
  geminiApiKey: string
  geminiEmbeddingUrl: string
  geminiApiUrl: string
}

export class ChatbotEngine {
  private supabase: SupabaseClient
  private pool: Pool
  private config: EngineConfig

  constructor(config: EngineConfig) {
    this.config = config
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey, { auth: { persistSession: false } })
    this.pool = new Pool({ connectionString: config.databaseUrl })
  }

  chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
    const chunks: string[] = []
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      chunks.push(text.slice(i, i + chunkSize))
      if (i + chunkSize >= text.length) break
    }
    return chunks
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const res = await fetch(this.config.geminiEmbeddingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.geminiApiKey}`
      },
      body: JSON.stringify({ input: text })
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`Embedding API error: ${res.status} ${txt}`)
    }
    const payload = await res.json()
    if (!payload?.data?.[0]?.embedding) {
      throw new Error('Unexpected embedding response format')
    }
    return payload.data[0].embedding
  }

  async retrieveSimilarChunks(queryEmbedding: number[], organizationId: string, topK = 5): Promise<KnowledgeChunk[]> {
    const vecLiteral = '[' + queryEmbedding.join(',') + ']'
    const sql = `SELECT id, content, metadata FROM knowledge_chunks WHERE organization_id = $2 ORDER BY embedding <-> ($1::vector) LIMIT $3`
    const result = await this.pool.query(sql, [vecLiteral, organizationId, topK])
    return result.rows
  }

  async processKnowledgeSource(sourceId: string): Promise<void> {
    const { data: source } = await this.supabase
      .from('knowledge_sources')
      .select('*')
      .eq('id', sourceId)
      .single()

    if (!source?.content) {
      await this.supabase.from('knowledge_sources').update({ status: 'ready' }).eq('id', sourceId)
      return
    }

    await this.supabase.from('knowledge_sources').update({ status: 'processing' }).eq('id', sourceId)

    try {
      const chunks = this.chunkText(source.content)
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await this.generateEmbedding(chunks[i])
        await this.supabase.from('knowledge_chunks').insert([{
          knowledge_source_id: sourceId,
          organization_id: source.organization_id,
          content: chunks[i],
          embedding: JSON.stringify(embedding),
          metadata: { chunk_index: i, total_chunks: chunks.length, source_title: source.title }
        }])
      }
      await this.supabase.from('knowledge_sources').update({ status: 'ready' }).eq('id', sourceId)
    } catch {
      await this.supabase.from('knowledge_sources').update({ status: 'error' }).eq('id', sourceId)
    }
  }

  async chat(assistantId: string, message: string, customerId?: string): Promise<{ reply: string; conversationId: string; contexts: KnowledgeChunk[] }> {
    const { data: assistant } = await this.supabase.from('assistants').select('*').eq('id', assistantId).eq('enabled', true).single()
    if (!assistant) throw new Error('Assistant not found')

    const orgId = assistant.organization_id

    const embedding = await this.generateEmbedding(message)
    const chunks = await this.retrieveSimilarChunks(embedding, orgId)

    const contextText = chunks.map(c => c.content).join('\n---\n')
    const systemPrompt = assistant.system_prompt || 'You are a helpful assistant.'
    const constructedPrompt = contextText
      ? `${systemPrompt}\n\nRelevant knowledge:\n${contextText}\n\nCustomer question:\n${message}`
      : `${systemPrompt}\n\nCustomer question:\n${message}`

    const resp = await fetch(this.config.geminiApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.config.geminiApiKey}` },
      body: JSON.stringify({ prompt: constructedPrompt })
    })
    const gen = await resp.json()
    const reply = gen?.output || gen?.text || JSON.stringify(gen)

    const { data: conv } = await this.supabase.from('conversations').insert([{
      organization_id: orgId, assistant_id: assistantId, customer_id: customerId || null,
      started_at: new Date().toISOString(), last_message_at: new Date().toISOString()
    }]).select('id').single()

    if (!conv) throw new Error('Failed to create conversation')

    await this.supabase.from('messages').insert([
      { conversation_id: conv.id, organization_id: orgId, sender_type: 'customer', content: message },
      { conversation_id: conv.id, organization_id: orgId, sender_type: 'assistant', content: reply }
    ])

    return { reply, conversationId: conv.id, contexts: chunks }
  }

  async close() {
    await this.pool.end()
  }
}

export { chunkText } from './utils'
