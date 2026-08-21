import { supabaseAdmin } from './supabaseClient'

export interface KnowledgeMatch {
  id: string
  content: string
  metadata: Record<string, unknown> | null
  similarity: number
}

export async function retrieveKnowledge(
  embedding: number[],
  organizationId: string,
  assistantId: string,
  limit = 5
): Promise<KnowledgeMatch[]> {
  const { data, error } = await supabaseAdmin.rpc('match_knowledge_chunks', {
    query_embedding: embedding,
    filter_organization_id: organizationId,
    filter_assistant_id: assistantId,
    match_count: limit
  })

  if (error) throw new Error(`Vector search failed: ${error.message}`)
  return (data || []) as KnowledgeMatch[]
}
