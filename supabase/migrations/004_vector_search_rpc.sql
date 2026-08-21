-- Assistant-scoped vector retrieval through Supabase/PostgREST.
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding vector(1536),
  filter_organization_id uuid,
  filter_assistant_id uuid,
  match_count integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    kc.id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks AS kc
  INNER JOIN public.knowledge_sources AS ks
    ON ks.id = kc.knowledge_source_id
  WHERE kc.organization_id = filter_organization_id
    AND ks.organization_id = filter_organization_id
    AND ks.assistant_id = filter_assistant_id
    AND kc.embedding IS NOT NULL
  ORDER BY kc.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 20);
$$;

REVOKE ALL ON FUNCTION public.match_knowledge_chunks(vector, uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.match_knowledge_chunks(vector, uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.match_knowledge_chunks(vector, uuid, uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(vector, uuid, uuid, integer) TO service_role;
