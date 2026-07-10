-- Remove rental agent references from agent_runs check constraint.
-- Safe to run multiple times.

do $$
declare
  c record;
begin
  -- If agent_runs doesn't exist yet, exit cleanly.
  perform 1 from pg_class where oid = 'public.agent_runs'::regclass;
exception when undefined_table then
  return;
end $$;

do $$
declare
  c record;
begin

  -- Drop the named constraint first (common failure mode).
  alter table public.agent_runs
    drop constraint if exists agent_runs_agent_check;

  -- Drop any other CHECK constraints that enforce an agent IN (...) list.
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.agent_runs'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%agent in (%'
  loop
    execute format('alter table public.agent_runs drop constraint if exists %I', c.conname);
  end loop;

  -- Re-add strict 3-agent constraint.
  alter table public.agent_runs
    add constraint agent_runs_agent_check
    check (agent in ('scam', 'job_offer', 'crisis_rumor'));
end $$;

