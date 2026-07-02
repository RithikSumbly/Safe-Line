create table checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  agent text not null,
  input_text text,
  verdict jsonb not null,
  created_at timestamptz default now()
);

alter table checks enable row level security;

create policy "Users read own checks"
  on checks for select
  using (auth.uid() = user_id);

create policy "Users insert own checks"
  on checks for insert
  with check (auth.uid() = user_id);

create index checks_user_created_idx on checks (user_id, created_at desc);
