create extension if not exists pgcrypto;
create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text, role text not null default 'student' check (role in ('student','admin')), created_at timestamptz not null default now());
create table if not exists public.categories (id uuid primary key default gen_random_uuid(), name text not null unique, created_at timestamptz not null default now());
create table if not exists public.courses (id uuid primary key default gen_random_uuid(), title text not null, description text not null default '', image_url text, category_id uuid references public.categories(id) on delete set null, instructor_name text not null default 'ENG OSAMA', published boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.lessons (id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade, title text not null, description text not null default '', youtube_url text not null, sort_order integer not null default 1, created_at timestamptz not null default now());
create table if not exists public.progress (user_id uuid not null references auth.users(id) on delete cascade, lesson_id uuid not null references public.lessons(id) on delete cascade, completed_at timestamptz not null default now(), primary key(user_id,lesson_id));
create index if not exists lessons_course_order_idx on public.lessons(course_id,sort_order);
create index if not exists courses_published_idx on public.courses(published);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin'); $$;

alter table public.profiles enable row level security; alter table public.categories enable row level security; alter table public.courses enable row level security; alter table public.lessons enable row level security; alter table public.progress enable row level security;

drop policy if exists "profiles self read" on public.profiles; create policy "profiles self read" on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
drop policy if exists "admin profiles manage" on public.profiles; create policy "admin profiles manage" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read categories" on public.categories; create policy "public read categories" on public.categories for select using (true);
drop policy if exists "admin categories manage" on public.categories; create policy "admin categories manage" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read published courses" on public.courses; create policy "public read published courses" on public.courses for select using (published=true or public.is_admin());
drop policy if exists "admin courses manage" on public.courses; create policy "admin courses manage" on public.courses for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read published lessons" on public.lessons; create policy "public read published lessons" on public.lessons for select using (exists(select 1 from public.courses c where c.id=course_id and (c.published=true or public.is_admin())));
drop policy if exists "admin lessons manage" on public.lessons; create policy "admin lessons manage" on public.lessons for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users own progress read" on public.progress; create policy "users own progress read" on public.progress for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists "users own progress write" on public.progress; create policy "users own progress write" on public.progress for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "users own progress update" on public.progress; create policy "users own progress update" on public.progress for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "users own progress delete" on public.progress; create policy "users own progress delete" on public.progress for delete to authenticated using (user_id=auth.uid() or public.is_admin());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,full_name) values(new.id,new.raw_user_meta_data->>'full_name'); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users; create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

insert into public.categories(name) values ('برمجة'),('تصميم'),('مونتاج'),('تسويق'),('ذكاء اصطناعي') on conflict (name) do nothing;
-- بعد إنشاء حسابك، اجعل حسابك Admin مرة واحدة من SQL Editor باستبدال البريد:
-- update public.profiles set role='admin' where id=(select id from auth.users where email='YOUR_EMAIL');
