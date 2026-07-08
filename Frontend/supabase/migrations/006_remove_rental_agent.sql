-- Remove rental agent references from agent_runs check constraint.
-- This is additive (do not edit 003 in-place if it was applied already).

do $$
begin
  -- Drop all existing check constraints on agent_runs.agent, then re-add a strict one.
  -- Constraint names differ across environments, so we drop by introspection.
  declare c record;
  begin
    for c in
      select conname
      from pg_constraint
      where conrelid = 'public.agent_runs'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%agent in (%'
    loop
      execute format('alter table public.agent_runs drop constraint if exists %I', c.conname);
    end loop;
  exception when undefined_table then
    -- agent_runs not created yet in this environment
    return;
  end;

  alter table public.agent_runs
    add constraint agent_runs_agent_check
    check (agent in ('scam', 'job_offer', 'crisis_rumor'));
end $$;

