-- ENG OSAMA: safe profile editing + avatars
-- Run once in Supabase SQL Editor.

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles enable row level security;

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() = old.id and not public.is_admin() and new.role is distinct from old.role then
    raise exception 'غير مسموح بتغيير صلاحية الحساب';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before update on public.profiles
for each row execute function public.protect_profile_role();

-- Reuse the existing public site-assets bucket for student avatars and course covers.
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "authenticated upload own avatar" on storage.objects;
create policy "authenticated upload own avatar" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'site-assets'
  and (name like 'avatars/' || auth.uid()::text || '-%')
);

-- Course covers are managed only by admins.
drop policy if exists "admin upload site assets" on storage.objects;
create policy "admin upload site assets" on storage.objects
for insert to authenticated
with check (bucket_id = 'site-assets' and public.is_admin());


drop policy if exists "authenticated update own avatar" on storage.objects;
create policy "authenticated update own avatar" on storage.objects
for update to authenticated
using (bucket_id = 'site-assets' and name like 'avatars/' || auth.uid()::text || '-%')
with check (bucket_id = 'site-assets' and name like 'avatars/' || auth.uid()::text || '-%');

drop policy if exists "authenticated delete own avatar" on storage.objects;
create policy "authenticated delete own avatar" on storage.objects
for delete to authenticated
using (bucket_id = 'site-assets' and name like 'avatars/' || auth.uid()::text || '-%');
