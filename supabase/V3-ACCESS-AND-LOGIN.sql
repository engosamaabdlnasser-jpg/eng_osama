-- ENG OSAMA V3: protect the educational catalog from anonymous visitors.
-- Run once in Supabase SQL Editor after V2-FIX-ONCE.sql.
-- Safe to run more than once.

-- Site settings stay public because they contain only public-facing branding/support text.
-- Courses, categories and lessons become authenticated-only.

drop policy if exists "public read categories" on public.categories;
drop policy if exists "authenticated read categories" on public.categories;
create policy "authenticated read categories" on public.categories
for select to authenticated
using (true);

drop policy if exists "public read published courses" on public.courses;
drop policy if exists "authenticated read published courses" on public.courses;
create policy "authenticated read published courses" on public.courses
for select to authenticated
using (published = true or public.is_admin());

drop policy if exists "public read published lessons" on public.lessons;
drop policy if exists "authenticated read published lessons" on public.lessons;
create policy "authenticated read published lessons" on public.lessons
for select to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_id
      and (c.published = true or public.is_admin())
  )
);
