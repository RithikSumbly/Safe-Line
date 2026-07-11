-- Web chat sessions and messages

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.chat_messages (
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

create index if not exists chat_sessions_user_updated_idx
  on public.chat_sessions (user_id, updated_at desc);

create index if not exists chat_messages_session_created_idx
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
