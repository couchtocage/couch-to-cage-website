-- Run once in Supabase SQL Editor before deploying this build.
create table if not exists public.ctc_messages (
 id uuid primary key default gen_random_uuid(),
 fighter_id uuid not null references public.fighters(id) on delete cascade,
 sender_role text not null check (sender_role in ('fighter','admin')),
 body text not null check (char_length(body) between 1 and 5000),
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create index if not exists ctc_messages_fighter_time on public.ctc_messages(fighter_id,created_at);
alter table public.ctc_messages enable row level security;
revoke all on public.ctc_messages from anon;
grant select,insert on public.ctc_messages to authenticated;
grant update(read_at) on public.ctc_messages to authenticated;
drop policy if exists "CTC fighter reads own messages" on public.ctc_messages;
create policy "CTC fighter reads own messages" on public.ctc_messages for select to authenticated
 using (exists(select 1 from public.fighters f where f.id=fighter_id and f.auth_user_id=auth.uid() and f.status <> 'inactive' and f.portal_status <> 'disabled'));
drop policy if exists "CTC fighter sends own messages" on public.ctc_messages;
create policy "CTC fighter sends own messages" on public.ctc_messages for insert to authenticated
 with check(sender_role='fighter' and read_at is null and exists(select 1 from public.fighters f where f.id=fighter_id and f.auth_user_id=auth.uid() and f.status <> 'inactive' and f.portal_status <> 'disabled'));
drop policy if exists "CTC fighter reads admin messages" on public.ctc_messages;
create policy "CTC fighter reads admin messages" on public.ctc_messages for update to authenticated
 using(sender_role='admin' and read_at is null and exists(select 1 from public.fighters f where f.id=fighter_id and f.auth_user_id=auth.uid() and f.status <> 'inactive' and f.portal_status <> 'disabled'))
 with check(sender_role='admin' and exists(select 1 from public.fighters f where f.id=fighter_id and f.auth_user_id=auth.uid() and f.status <> 'inactive' and f.portal_status <> 'disabled'));
