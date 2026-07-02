-- Enable pgvector for RAG
create extension if not exists vector;

-- Agent runs (canonical backend log)
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  channel text check (channel in ('web', 'whatsapp')),
  agent text check (agent in ('scam', 'job_offer', 'crisis_rumor', 'rental_redflag')),
  input_text text,
  input_location jsonb,
  verdict jsonb not null,
  latency_ms int,
  created_at timestamptz default now()
);

alter table agent_runs enable row level security;

create policy "Users read own agent_runs"
  on agent_runs for select
  using (auth.uid() = user_id);

create index if not exists agent_runs_user_created_idx on agent_runs (user_id, created_at desc);

-- Evidence log per run
create table if not exists evidence_log (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references agent_runs(id) on delete cascade,
  source_name text,
  source_url text,
  supports_claim boolean,
  snippet text
);

alter table evidence_log enable row level security;

create policy "Users read own evidence_log"
  on evidence_log for select
  using (
    exists (
      select 1 from agent_runs r
      where r.id = evidence_log.run_id and r.user_id = auth.uid()
    )
  );

-- Rental documents
create table if not exists rental_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  file_path text,
  original_filename text,
  jurisdiction text,
  status text default 'processing',
  created_at timestamptz default now()
);

alter table rental_documents enable row level security;

create policy "Users manage own rental_documents"
  on rental_documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Document chunks with embeddings
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references rental_documents(id) on delete cascade,
  collection text check (collection in ('user_rental_doc', 'legal_reference', 'scam_corpus')),
  chunk_text text,
  embedding vector(768),
  metadata jsonb
);

create index if not exists document_chunks_embedding_idx
  on document_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table document_chunks enable row level security;

create policy "Public read reference corpora"
  on document_chunks for select
  using (collection in ('legal_reference', 'scam_corpus'));

create policy "Users read own rental chunks"
  on document_chunks for select
  using (
    collection = 'user_rental_doc'
    and exists (
      select 1 from rental_documents d
      where d.id = document_chunks.document_id and d.user_id = auth.uid()
    )
  );

-- WhatsApp sessions
create table if not exists whatsapp_sessions (
  phone text primary key,
  last_agent text,
  checkpoint_id text,
  updated_at timestamptz default now()
);

-- Eval harness results
create table if not exists eval_runs (
  id uuid primary key default gen_random_uuid(),
  agent text,
  test_case_id text,
  expected_status text,
  actual_status text,
  correct boolean,
  run_at timestamptz default now()
);

-- Vector similarity search RPC
create or replace function match_document_chunks(
  query_embedding vector(768),
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
as $$
begin
  return query
  select
    dc.id,
    dc.chunk_text,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  where dc.collection = match_collection
    and dc.embedding is not null
    and (
      match_jurisdiction is null
      or match_collection != 'legal_reference'
      or (dc.metadata->>'jurisdiction') = match_jurisdiction
      or (dc.metadata->>'tier') = '1'
    )
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;
