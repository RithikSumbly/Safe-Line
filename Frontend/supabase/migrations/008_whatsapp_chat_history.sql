-- Orchestrator-aligned WhatsApp conversation history

alter table if exists public.whatsapp_sessions
  add column if not exists chat_history jsonb default '[]'::jsonb;
