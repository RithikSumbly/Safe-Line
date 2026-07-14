-- Persist pasted/uploaded chat screenshots with the message row so history
-- can re-render the image (same data URL the UI already shows in-session).

alter table public.chat_messages
  add column if not exists image_data_url text;
