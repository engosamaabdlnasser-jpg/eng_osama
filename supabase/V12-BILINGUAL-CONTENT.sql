-- ENG OSAMA V12.1 — bilingual dynamic content
-- Run once in Supabase SQL Editor.
alter table public.courses add column if not exists title_ar text;
alter table public.courses add column if not exists title_en text;
alter table public.courses add column if not exists description_ar text;
alter table public.courses add column if not exists description_en text;
alter table public.courses add column if not exists instructor_name_ar text;
alter table public.courses add column if not exists instructor_name_en text;
alter table public.lessons add column if not exists title_ar text;
alter table public.lessons add column if not exists title_en text;
alter table public.lessons add column if not exists description_ar text;
alter table public.lessons add column if not exists description_en text;
alter table public.categories add column if not exists name_ar text;
alter table public.categories add column if not exists name_en text;
update public.courses set title_ar=coalesce(title_ar,title), description_ar=coalesce(description_ar,description), instructor_name_ar=coalesce(instructor_name_ar,instructor_name);
update public.lessons set title_ar=coalesce(title_ar,title), description_ar=coalesce(description_ar,description);
update public.categories set name_ar=coalesce(name_ar,name);
