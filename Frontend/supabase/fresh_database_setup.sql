-- SafeLine: full database setup (3 agents only).
-- Wipes existing SafeLine tables, then recreates the final schema.
-- Safe to run if you already ran 001–006 or got "relation already exists" errors.
-- Does NOT delete auth.users — only app tables.

-- ---------------------------------------------------------------------------
-- Step 1: tear down existing SafeLine objects
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.match_document_chunks(vector(1536), text, int, text) cascade;
drop function if exists public.handle_new_user() cascade;

drop table if exists public.chat_messages cascade;
drop table if exists public.chat_sessions cascade;
drop table if exists public.agent_runs cascade;
drop table if exists public.document_chunks cascade;
drop table if exists public.whatsapp_sessions cascade;
drop table if exists public.eval_runs cascade;
drop table if exists public.checks cascade;
drop table if exists public.profiles cascade;

-- orphan tables from removed rental/legal feature (ignore if missing)
drop table if exists public.legal_corpus_coverage cascade;
drop table if exists public.stamp_duty_rates cascade;

-- ---------------------------------------------------------------------------
-- Step 2: extensions
-- ---------------------------------------------------------------------------
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Frontend: user checks history
-- ---------------------------------------------------------------------------
create table public.checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  agent text not null check (agent in ('scam', 'job_offer', 'crisis_rumor')),
  input_text text,
  verdict jsonb not null,
  created_at timestamptz default now()
);

alter table public.checks enable row level security;

create policy "Users read own checks"
  on public.checks for select
  using (auth.uid() = user_id);

create policy "Users insert own checks"
  on public.checks for insert
  with check (auth.uid() = user_id);

create index checks_user_created_idx on public.checks (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Profiles + auto-create on signup
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  whatsapp_phone text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users manage own profile"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Backend: agent runs + evidence
-- ---------------------------------------------------------------------------
create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  channel text check (channel in ('web', 'whatsapp')),
  agent text not null check (agent in ('scam', 'job_offer', 'crisis_rumor')),
  input_text text,
  input_location jsonb,
  verdict jsonb not null,
  latency_ms int,
  created_at timestamptz default now()
);

alter table public.agent_runs enable row level security;

create policy "Users read own agent_runs"
  on public.agent_runs for select
  using (auth.uid() = user_id);

create index agent_runs_user_created_idx on public.agent_runs (user_id, created_at desc);

create table public.evidence_log (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.agent_runs(id) on delete cascade,
  source_name text,
  source_url text,
  supports_claim boolean,
  snippet text
);

alter table public.evidence_log enable row level security;

create policy "Users read own evidence_log"
  on public.evidence_log for select
  using (
    exists (
      select 1 from public.agent_runs r
      where r.id = evidence_log.run_id and r.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- RAG: scam corpus only
-- ---------------------------------------------------------------------------
create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid,
  collection text not null check (collection in ('scam_corpus')),
  chunk_text text,
  embedding vector(1536),
  metadata jsonb
);

create index document_chunks_embedding_idx
  on public.document_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table public.document_chunks enable row level security;

create policy "Public read scam corpus"
  on public.document_chunks for select
  using (collection = 'scam_corpus');

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

-- ---------------------------------------------------------------------------
-- WhatsApp sessions (router + buffering)
-- ---------------------------------------------------------------------------
create table public.whatsapp_sessions (
  phone text primary key,
  last_agent text,
  checkpoint_id text,
  state text default 'idle',
  pending_content text,
  pending_media_type text,
  prompt_fail_count int default 0,
  buffer jsonb default '[]'::jsonb,
  buffer_started_at timestamptz,
  last_message_at timestamptz,
  chat_history jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table public.whatsapp_sessions enable row level security;

-- ---------------------------------------------------------------------------
-- Eval harness (service role writes only)
-- ---------------------------------------------------------------------------
create table public.eval_runs (
  id uuid primary key default gen_random_uuid(),
  agent text,
  test_case_id text,
  expected_status text,
  actual_status text,
  correct boolean,
  run_at timestamptz default now()
);

alter table public.eval_runs enable row level security;

-- ---------------------------------------------------------------------------
-- Web chat sessions
-- ---------------------------------------------------------------------------
create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.chat_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text,
  message_type text not null default 'text'
    check (message_type in ('text', 'verdict', 'clarification', 'help')),
  verdict jsonb,
  agent text,
  created_at timestamptz default now()
);

create index chat_sessions_user_updated_idx
  on public.chat_sessions (user_id, updated_at desc);

create index chat_messages_session_created_idx
  on public.chat_messages (session_id, created_at asc);

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

create policy "Users read own chat_sessions"
  on public.chat_sessions for select
  using (auth.uid() = user_id);

create policy "Users insert own chat_sessions"
  on public.chat_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users update own chat_sessions"
  on public.chat_sessions for update
  using (auth.uid() = user_id);

create policy "Users delete own chat_sessions"
  on public.chat_sessions for delete
  using (auth.uid() = user_id);

create policy "Users read own chat_messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  );

create policy "Users insert own chat_messages"
  on public.chat_messages for insert
  with check (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  );
