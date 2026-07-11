-- Resolve PostgREST PGRST203: drop duplicate match_document_chunks overloads
-- (e.g. an extra match_tier variant) and keep one canonical RPC.

drop function if exists public.match_document_chunks(vector, text, int);
drop function if exists public.match_document_chunks(vector, text, integer);
drop function if exists public.match_document_chunks(vector(1536), text, int);
drop function if exists public.match_document_chunks(vector(1536), text, int, text);
drop function if exists public.match_document_chunks(vector(1536), text, int, text, text);

create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_collection text,
  match_count int default 5,
  match_jurisdiction text default null
)
returns table (
  id uuid,
  chunk_text text,
  metadata jsonb,
  similarity float
)
language plpgsql
stable
as $$
begin
  return query
  select
    dc.id,
    dc.chunk_text,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.collection = match_collection
    and dc.embedding is not null
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;
