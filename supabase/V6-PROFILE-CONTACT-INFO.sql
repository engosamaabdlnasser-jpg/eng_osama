-- ENG OSAMA V6: optional profile contact information
-- Run once in Supabase SQL Editor. Existing users are preserved.
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists age smallint;

-- Keep values optional; when supplied, age is limited to a sensible human range.
alter table public.profiles drop constraint if exists profiles_age_check;
alter table public.profiles add constraint profiles_age_check check (age is null or (age between 5 and 100));
