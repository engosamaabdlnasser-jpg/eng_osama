-- ENG OSAMA V12: bilingual content fields (safe to run once)
alter table if exists public.courses add column if not exists title_ar text;
alter table if exists public.courses add column if not exists title_en text;
alter table if exists public.courses add column if not exists description_ar text;
alter table if exists public.courses add column if not exists description_en text;
alter table if exists public.lessons add column if not exists title_ar text;
alter table if exists public.lessons add column if not exists title_en text;
alter table if exists public.lessons add column if not exists description_ar text;
alter table if exists public.lessons add column if not exists description_en text;
alter table if exists public.categories add column if not exists name_ar text;
alter table if exists public.categories add column if not exists name_en text;
update public.courses set title_ar=coalesce(title_ar,title), description_ar=coalesce(description_ar,description), title_en=coalesce(title_en,title), description_en=coalesce(description_en,description) where true;
update public.lessons set title_ar=coalesce(title_ar,title), description_ar=coalesce(description_ar,description), title_en=coalesce(title_en,title), description_en=coalesce(description_en,description) where true;
update public.categories set name_ar=coalesce(name_ar,name), name_en=coalesce(name_en,name) where true;
