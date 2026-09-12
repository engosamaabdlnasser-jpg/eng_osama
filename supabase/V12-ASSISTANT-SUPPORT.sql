-- ENG OSAMA V12 — in-platform assistant support requests
create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text,
  email text,
  message text not null,
  source text not null default 'assistant',
  page_path text,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_requests_created_idx on public.support_requests(created_at desc);
create index if not exists support_requests_status_idx on public.support_requests(status);
create index if not exists support_requests_user_idx on public.support_requests(user_id);

alter table public.support_requests enable row level security;

drop policy if exists "users create support requests" on public.support_requests;
create policy "users create support requests" on public.support_requests
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "admins read support requests" on public.support_requests;
create policy "admins read support requests" on public.support_requests
for select to authenticated
using (public.is_admin());

drop policy if exists "admins manage support requests" on public.support_requests;
create policy "admins manage support requests" on public.support_requests
for update to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Assistant inbox: persist every authenticated student conversation/message.
create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text,
  status text not null default 'open' check (status in ('open','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('user','assistant','admin')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists assistant_conversations_updated_idx on public.assistant_conversations(updated_at desc);
create index if not exists assistant_messages_conversation_idx on public.assistant_messages(conversation_id,created_at);
alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;
drop policy if exists "students create own conversations" on public.assistant_conversations;
create policy "students create own conversations" on public.assistant_conversations for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "students read own conversations" on public.assistant_conversations;
create policy "students read own conversations" on public.assistant_conversations for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists "admins manage conversations" on public.assistant_conversations;
create policy "admins manage conversations" on public.assistant_conversations for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "students create own messages" on public.assistant_messages;
create policy "students create own messages" on public.assistant_messages for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "students read own messages" on public.assistant_messages;
create policy "students read own messages" on public.assistant_messages for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists "admins manage messages" on public.assistant_messages;
create policy "admins manage messages" on public.assistant_messages for all to authenticated using (public.is_admin()) with check (public.is_admin());
