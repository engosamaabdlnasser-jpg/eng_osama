-- ENG OSAMA — Phase 2C foundation
-- AI summaries, suggested replies, notifications and Telegram isolation.
-- Run after V14-SECURITY-AUDIT-RATE-LIMIT.sql.
-- Provider secrets MUST stay in Edge Function secrets, never in these tables or Vite env.

create table if not exists public.conversation_ai_summaries (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  summary text not null,
  language text not null default 'ar' check (language in ('ar','en')),
  model text,
  provider text,
  generated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (conversation_id)
);

create table if not exists public.conversation_suggested_replies (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  reply text not null check (char_length(trim(reply)) between 1 and 2000),
  language text not null default 'ar' check (language in ('ar','en')),
  provider text,
  model text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('support_reply','support_status','system','telegram_linked')),
  title text not null check (char_length(trim(title)) between 1 and 180),
  body text not null check (char_length(trim(body)) between 1 and 4000),
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  dedupe_key text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.telegram_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  telegram_chat_id text not null unique,
  linked_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.ai_provider_configs (
  id text primary key,
  provider text not null check (provider in ('openai_compatible','supabase_edge','disabled')),
  model text,
  base_url text,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.ai_provider_configs(id, provider, model, base_url, enabled)
values ('support', 'disabled', null, null, false)
on conflict (id) do nothing;

alter table public.conversation_ai_summaries enable row level security;
alter table public.conversation_suggested_replies enable row level security;
alter table public.user_notifications enable row level security;
alter table public.telegram_links enable row level security;
alter table public.ai_provider_configs enable row level security;

-- Students can see only their own AI artifacts and notifications.
create policy if not exists "students read own ai summaries"
on public.conversation_ai_summaries for select to authenticated
using (exists (select 1 from public.conversations c where c.id = conversation_id and c.student_id = auth.uid()) or public.is_admin());

create policy if not exists "students read own suggested replies"
on public.conversation_suggested_replies for select to authenticated
using (exists (select 1 from public.conversations c where c.id = conversation_id and c.student_id = auth.uid()) or public.is_admin());

create policy if not exists "users read own notifications"
on public.user_notifications for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy if not exists "users update own notifications"
on public.user_notifications for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy if not exists "users read own telegram link"
on public.telegram_links for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy if not exists "admins read provider config"
on public.ai_provider_configs for select to authenticated
using (public.is_admin());

revoke all on public.conversation_ai_summaries from anon, authenticated;
revoke all on public.conversation_suggested_replies from anon, authenticated;
revoke all on public.telegram_links from anon, authenticated;
revoke all on public.ai_provider_configs from anon, authenticated;
grant select on public.conversation_ai_summaries, public.conversation_suggested_replies to authenticated;
grant select, update on public.user_notifications to authenticated;
grant select on public.telegram_links to authenticated;
grant select on public.ai_provider_configs to authenticated;

-- Server-only notification insertion with idempotency.
create or replace function public.create_user_notification(
  p_user_id uuid, p_kind text, p_title text, p_body text,
  p_entity_type text default null, p_entity_id uuid default null, p_dedupe_key text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if p_user_id is null or p_kind not in ('support_reply','support_status','system','telegram_linked') then raise exception 'Invalid notification'; end if;
  insert into public.user_notifications(user_id,kind,title,body,entity_type,entity_id,dedupe_key)
  values (p_user_id,p_kind,left(trim(p_title),180),left(trim(p_body),4000),p_entity_type,p_entity_id,p_dedupe_key)
  on conflict (dedupe_key) do nothing returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.create_user_notification(uuid,text,text,text,text,uuid,text) from public, anon, authenticated;
grant execute on function public.create_user_notification(uuid,text,text,text,text,uuid,text) to service_role;

comment on table public.ai_provider_configs is 'Non-secret AI provider metadata. API keys are Edge Function secrets only.';
comment on table public.telegram_links is 'Telegram identity mapping; webhook authentication is handled server-side.';
