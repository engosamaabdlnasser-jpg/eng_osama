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
