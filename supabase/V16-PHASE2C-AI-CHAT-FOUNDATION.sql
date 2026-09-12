-- ENG OSAMA — Phase 2C P0: real AI assistant foundation.
-- Safe, additive migration. Does not touch conversations/conversation_messages,
-- their RLS, their triggers, or the existing human support system in any way.
-- Run after V15-PHASE2C-AI-NOTIFICATIONS-TELEGRAM.sql.
--
-- Purpose: give the ai-chat Edge Function a server-side place to enforce
-- rate limiting that the frontend cannot bypass. No client role (anon or
-- authenticated) is granted any access to this table — only the Edge
-- Function's service-role client can read or write it.

create table if not exists public.ai_chat_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_requests_user_created_idx
  on public.ai_chat_requests(user_id, created_at desc);

-- Old rows are only ever needed for a rolling 24h rate-limit window; keep
-- the table small with a lightweight retention index rather than a cron job
-- for this first phase.
create index if not exists ai_chat_requests_created_idx
  on public.ai_chat_requests(created_at);

alter table public.ai_chat_requests enable row level security;

-- Deliberately no policies for anon/authenticated: default-deny.
-- The service-role key used inside the ai-chat Edge Function bypasses RLS,
-- which is the only way this table is ever read or written.
revoke all on public.ai_chat_requests from anon, authenticated;

comment on table public.ai_chat_requests is
  'Server-only request log used to rate-limit the ai-chat Edge Function. Not readable by students or exposed to the frontend.';
