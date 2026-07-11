-- Verdict feedback (Helpful Yes/No) linked to agent_runs
create table if not exists verdict_feedback (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references agent_runs(id) on delete cascade,
  helpful boolean not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  unique (run_id)
);

alter table verdict_feedback enable row level security;

create index if not exists verdict_feedback_run_id_idx on verdict_feedback (run_id);
