-- eval_runs is written by the backend eval harness (service role only).
alter table if exists public.eval_runs enable row level security;
