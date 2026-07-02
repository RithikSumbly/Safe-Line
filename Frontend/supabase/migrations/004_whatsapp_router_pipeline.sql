-- WhatsApp router pipeline sessions + buffering (Section 7.2–7.4)

alter table if exists whatsapp_sessions
  add column if not exists state text default 'idle',
  add column if not exists pending_content text,
  add column if not exists pending_media_type text,
  add column if not exists prompt_fail_count int default 0,
  add column if not exists buffer jsonb default '[]'::jsonb,
  add column if not exists buffer_started_at timestamptz,
  add column if not exists last_message_at timestamptz;

-- Defense-in-depth: keep this table server-managed (service role), not exposed via client policies.
alter table if exists whatsapp_sessions enable row level security;
