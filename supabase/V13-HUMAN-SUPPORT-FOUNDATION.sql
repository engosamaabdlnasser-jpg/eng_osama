-- ENG OSAMA Phase 2A — Human Support & Live Conversation Foundation
-- Safe, additive migration. Existing support_requests rows are preserved and migrated.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'HUMAN_SUPPORT' check (type in ('AI_CHAT','HUMAN_SUPPORT','COURSE_QUESTION','TECHNICAL_ISSUE','ACCOUNT_HELP','GENERAL_INQUIRY')),
  status text not null default 'WAITING_FOR_HUMAN' check (status in ('AI_ACTIVE','WAITING_FOR_HUMAN','ASSIGNED','HUMAN_ACTIVE','WAITING_FOR_STUDENT','RESOLVED','CLOSED','RETENTION_PENDING','REOPENED')),
  assigned_admin_id uuid references public.profiles(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  current_page text,
  priority text not null default 'NORMAL' check (priority in ('CRITICAL','HIGH','NORMAL','LOW')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_read_at timestamptz,
  admin_replied_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  retention_started_at timestamptz,
  auto_delete_at timestamptz,
  retention_exempt boolean not null default false,
  ai_summary text,
  legacy_support_request_id uuid unique references public.support_requests(id) on delete set null
);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('student','admin','ai','system')),
  body text not null check (char_length(trim(body)) between 1 and 10000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists conversations_student_updated_idx on public.conversations(student_id, updated_at desc);
create index if not exists conversations_status_priority_created_idx on public.conversations(status, priority, created_at);
create index if not exists conversations_assigned_status_idx on public.conversations(assigned_admin_id, status);
create index if not exists conversations_retention_idx on public.conversations(auto_delete_at) where auto_delete_at is not null and retention_exempt = false;
create index if not exists conversation_messages_conversation_created_idx on public.conversation_messages(conversation_id, created_at);
create index if not exists conversation_messages_sender_idx on public.conversation_messages(sender_id, created_at desc);

alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;

-- Students can only read their own conversations/messages.
drop policy if exists "students read own conversations" on public.conversations;
create policy "students read own conversations" on public.conversations
for select to authenticated using (student_id = auth.uid() or public.is_admin());

drop policy if exists "students read own conversation messages" on public.conversation_messages;
create policy "students read own conversation messages" on public.conversation_messages
for select to authenticated using (
  exists (select 1 from public.conversations c where c.id = conversation_id and (c.student_id = auth.uid() or public.is_admin()))
);

-- Admins may manage conversations/messages. Students write through the server-side RPC below.
drop policy if exists "admins manage conversations" on public.conversations;
create policy "admins manage conversations" on public.conversations
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins insert conversation messages" on public.conversation_messages;
create policy "admins insert conversation messages" on public.conversation_messages
for insert to authenticated
with check (public.is_admin() and sender_id = auth.uid() and sender_role = 'admin');

drop policy if exists "admins manage conversation messages" on public.conversation_messages;
create policy "admins manage conversation messages" on public.conversation_messages
for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Keep the existing support_requests API working while new code moves to conversations.
-- The old table remains intact; legacy rows are copied once and never deleted by this migration.
insert into public.conversations (
  student_id, type, status, priority, current_page, created_at, updated_at, last_message_at,
  admin_replied_at, legacy_support_request_id
)
select
  sr.user_id,
  'HUMAN_SUPPORT',
  case sr.status
    when 'open' then 'WAITING_FOR_HUMAN'
    when 'in_progress' then 'HUMAN_ACTIVE'
    when 'resolved' then 'RESOLVED'
    when 'closed' then 'CLOSED'
    else 'WAITING_FOR_HUMAN'
  end,
  'NORMAL',
  sr.page_path,
  sr.created_at,
  sr.updated_at,
  sr.created_at,
  case when nullif(trim(coalesce(sr.admin_note, '')), '') is not null then sr.updated_at else null end,
  sr.id
from public.support_requests sr
where sr.user_id is not null
  and not exists (
    select 1 from public.conversations c where c.legacy_support_request_id = sr.id
  );

insert into public.conversation_messages (conversation_id, sender_id, sender_role, body, created_at)
select c.id, sr.user_id, 'student', sr.message, sr.created_at
from public.support_requests sr
join public.conversations c on c.legacy_support_request_id = sr.id
where not exists (
  select 1 from public.conversation_messages m
  where m.conversation_id = c.id and m.sender_id = sr.user_id and m.body = sr.message and m.created_at = sr.created_at
);

-- Existing admin_note remains in support_requests for backward compatibility.
-- It is not attributed to a specific admin because V12 did not store that actor.

-- Add Phase 2 settings into the existing JSON settings row; no duplicate settings table.
insert into public.site_settings(id, settings)
values ('default', jsonb_build_object('support_retention_human_hours', 72, 'support_retention_ai_hours', 72))
on conflict (id) do update set settings = public.site_settings.settings || jsonb_build_object(
  'support_retention_human_hours', coalesce(public.site_settings.settings->'support_retention_human_hours', '72'::jsonb),
  'support_retention_ai_hours', coalesce(public.site_settings.settings->'support_retention_ai_hours', '72'::jsonb)
), updated_at = now();

create or replace function public.support_retention_hours()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(0, coalesce((select case when settings->>'support_retention_human_hours' ~ '^[0-9]+$' then (settings->>'support_retention_human_hours')::integer else 72 end from public.site_settings where id = 'default'), 72));
$$;

create or replace function public.set_conversation_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists conversations_updated_at on public.conversations;
create trigger conversations_updated_at
before update on public.conversations
for each row execute function public.set_conversation_updated_at();

create or replace function public.sync_conversation_message_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation public.conversations;
  v_retention_hours integer;
begin
  select * into v_conversation from public.conversations where id = new.conversation_id for update;
  if not found then
    raise exception 'Conversation not found';
  end if;

  if new.sender_role = 'student' then
    if v_conversation.student_id <> new.sender_id then
      raise exception 'Student is not allowed to write to this conversation';
    end if;
    if v_conversation.status in ('CLOSED', 'RETENTION_PENDING') then
      update public.conversations
      set status = 'REOPENED', retention_started_at = null, auto_delete_at = null, closed_at = null
      where id = new.conversation_id;
    end if;
  elsif new.sender_role = 'admin' then
    if not exists (select 1 from public.profiles p where p.id = new.sender_id and p.role = 'admin') then
      raise exception 'Only admins can send admin messages';
    end if;
  end if;

  update public.conversations
  set last_message_at = new.created_at,
      updated_at = now(),
      admin_replied_at = case when new.sender_role = 'admin' then coalesce(admin_replied_at, new.created_at) else admin_replied_at end,
      retention_started_at = case when new.sender_role in ('student','admin') then null else retention_started_at end,
      auto_delete_at = case when new.sender_role in ('student','admin') then null else auto_delete_at end,
      status = case
        when new.sender_role = 'student' and status in ('REOPENED','CLOSED','RETENTION_PENDING') then 'WAITING_FOR_HUMAN'
        when new.sender_role = 'admin' and status = 'WAITING_FOR_STUDENT' then 'HUMAN_ACTIVE'
        else status
      end
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists conversation_message_state on public.conversation_messages;
create trigger conversation_message_state
after insert on public.conversation_messages
for each row execute function public.sync_conversation_message_state();

create or replace function public.start_conversation_retention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hours integer;
begin
  if new.retention_exempt then
    new.retention_started_at := null;
    new.auto_delete_at := null;
  elsif new.status in ('RESOLVED','CLOSED') and old.status is distinct from new.status then
    v_hours := public.support_retention_hours();
    new.retention_started_at := now();
    new.auto_delete_at := case when v_hours > 0 then now() + make_interval(hours => v_hours) else null end;
    if new.status = 'RESOLVED' then
      new.resolved_at := coalesce(new.resolved_at, now());
    end if;
    if new.status = 'CLOSED' then
      new.closed_at := coalesce(new.closed_at, now());
      new.status := 'RETENTION_PENDING';
    end if;
  elsif new.status not in ('RESOLVED','CLOSED','RETENTION_PENDING') then
    new.retention_started_at := null;
    new.auto_delete_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists conversation_retention_state on public.conversations;
create trigger conversation_retention_state
before update of status, retention_exempt on public.conversations
for each row execute function public.start_conversation_retention();

create or replace function public.create_student_support_conversation(
  p_message text,
  p_page_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_conversation public.conversations;
  v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if nullif(trim(p_message), '') is null then raise exception 'Message is required'; end if;

  select * into v_conversation
  from public.conversations
  where student_id = v_user
    and status in ('WAITING_FOR_HUMAN','ASSIGNED','HUMAN_ACTIVE','WAITING_FOR_STUDENT','REOPENED','RESOLVED','CLOSED','RETENTION_PENDING')
  order by updated_at desc
  limit 1
  for update;

  if not found then
    insert into public.conversations (student_id, type, status, current_page, priority, last_message_at)
    values (v_user, 'HUMAN_SUPPORT', 'WAITING_FOR_HUMAN', p_page_path, 'NORMAL', now())
    returning id into v_id;
  else
    v_id := v_conversation.id;
  end if;

  insert into public.conversation_messages (conversation_id, sender_id, sender_role, body)
  values (v_id, v_user, 'student', trim(p_message));

  return v_id;
end;
$$;

revoke all on function public.create_student_support_conversation(text,text) from public;
grant execute on function public.create_student_support_conversation(text,text) to authenticated;

create or replace function public.accept_support_conversation(p_conversation_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_row public.conversations;
begin
  if v_admin is null or not public.is_admin() then raise exception 'Admin authorization required'; end if;

  update public.conversations
  set assigned_admin_id = v_admin, status = 'HUMAN_ACTIVE', updated_at = now()
  where id = p_conversation_id
    and status = 'WAITING_FOR_HUMAN'
    and assigned_admin_id is null
  returning * into v_row;

  if not found then
    raise exception 'Conversation is no longer waiting for assignment';
  end if;

  return v_row;
end;
$$;

revoke all on function public.accept_support_conversation(uuid) from public;
grant execute on function public.accept_support_conversation(uuid) to authenticated;

-- Safe cleanup: only expired, non-exempt, inactive conversations are eligible.
create or replace function public.cleanup_expired_support_conversations(p_batch_size integer default 100)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.conversations c
  where c.id in (
    select id from public.conversations
    where auto_delete_at is not null
      and auto_delete_at <= now()
      and retention_exempt = false
      and status in ('RESOLVED','CLOSED','RETENTION_PENDING')
    order by auto_delete_at
    limit greatest(1, least(p_batch_size, 1000))
    for update skip locked
  );
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.cleanup_expired_support_conversations(integer) from public, authenticated;
grant execute on function public.cleanup_expired_support_conversations(integer) to service_role;

-- NOTE: scheduling is intentionally not created here because Supabase projects differ
-- in whether pg_cron is enabled. The function above is safe to invoke from a scheduled
-- server-side job once the project's supported scheduler is confirmed.


-- Enable Supabase Realtime for the two live tables when the standard publication exists.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations') then
      execute 'alter publication supabase_realtime add table public.conversations';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_messages') then
      execute 'alter publication supabase_realtime add table public.conversation_messages';
    end if;
  end if;
end $$;
