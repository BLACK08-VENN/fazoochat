import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from './supabaseClient'
import { generateEmbedding } from './embeddings'
import { chunkText } from './utils'

export async function processKnowledgeSource(
  sourceId: string,
  supabase: SupabaseClient = supabaseAdmin
): Promise<void> {
  const { data: source, error: fetchErr } = await supabase
    .from('knowledge_sources')
    .select('*')
    .eq('id', sourceId)
    .single()

  if (fetchErr || !source) {
    console.error('Failed to fetch knowledge source:', fetchErr?.message)
    return
  }

  if (!source.content) {
    await supabase
      .from('knowledge_sources')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', sourceId)
    return
  }

  try {
    await supabase
      .from('knowledge_sources')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', sourceId)

    const textChunks = chunkText(source.content)

    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i]
      const embedding = await generateEmbedding(chunk)

      const { error: insertErr } = await supabase.from('knowledge_chunks').insert([{
        knowledge_source_id: sourceId,
        organization_id: source.organization_id,
        content: chunk,
        embedding: JSON.stringify(embedding),
        metadata: { chunk_index: i, total_chunks: textChunks.length, source_title: source.title }
      }])

      if (insertErr) {
        console.error('Failed to insert chunk:', insertErr.message)
      }
    }

    await supabase
      .from('knowledge_sources')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', sourceId)

    console.log(`Processed knowledge source ${sourceId}: ${textChunks.length} chunks created`)
  } catch (err: any) {
    console.error('Knowledge processing failed:', err.message)
    await supabase
      .from('knowledge_sources')
      .update({ status: 'error', updated_at: new Date().toISOString() })
      .eq('id', sourceId)
  }
}
