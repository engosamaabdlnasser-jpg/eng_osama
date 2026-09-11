-- ENG OSAMA: profile editing + safe student self-service
-- Run once in Supabase SQL Editor.

alter table public.profiles enable row level security;

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- The existing admin policy remains responsible for admin-only changes.
