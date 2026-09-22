-- CTC upgrade: run ONCE in Supabase SQL Editor BEFORE deploying this build.
-- Review against your live schema first. Additive only: no fighter rows deleted or altered.
-- Existing portal / messaging setup SQL is NOT repeated here.
begin;
create table if not exists public.ctc_fighter_requests (
 id uuid primary key default gen_random_uuid(),
 fighter_id uuid not null references public.fighters(id) on delete cascade,
 request_type text not null check (request_type in ('weight','bloodwork')),
 status text not null default 'pending' check (status in ('pending','completed')),
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 dismissed_at timestamptz,
 constraint ctc_request_completed_timestamp check (status <> 'completed' or completed_at is not null)
);
create index if not exists ctc_fighter_requests_fighter_created_idx on public.ctc_fighter_requests(fighter_id,created_at desc);
alter table public.ctc_fighter_requests enable row level security;
revoke all on public.ctc_fighter_requests from anon;
revoke all on public.ctc_fighter_requests from authenticated;
grant select on public.ctc_fighter_requests to authenticated;
grant update(status, completed_at, dismissed_at) on public.ctc_fighter_requests to authenticated;
-- Supabase service-role Netlify API handles creation; fighter login reads/updates only its own requests.
do $$ begin
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='ctc_fighter_requests' and policyname='CTC fighter reads own requests') then
  create policy "CTC fighter reads own requests" on public.ctc_fighter_requests for select to authenticated
   using (exists (select 1 from public.fighters f where f.id=fighter_id and f.auth_user_id=auth.uid() and coalesce(f.status,'active') <> 'inactive' and coalesce(f.portal_status,'') <> 'disabled'));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='ctc_fighter_requests' and policyname='CTC fighter updates own requests') then
  create policy "CTC fighter updates own requests" on public.ctc_fighter_requests for update to authenticated
   using (exists (select 1 from public.fighters f where f.id=fighter_id and f.auth_user_id=auth.uid() and coalesce(f.status,'active') <> 'inactive' and coalesce(f.portal_status,'') <> 'disabled'))
   with check (exists (select 1 from public.fighters f where f.id=fighter_id and f.auth_user_id=auth.uid() and coalesce(f.status,'active') <> 'inactive' and coalesce(f.portal_status,'') <> 'disabled'));
 end if;
end $$;
commit;

-- FINAL FOLLOW-UP: weight correction workflow + fighter cleanup permissions.
-- Safe to run after the earlier CTC request migration.
alter table if exists public.fighter_weight_history add column if not exists status text not null default 'valid';
alter table if exists public.fighter_weight_history add column if not exists admin_comment text;
alter table if exists public.fighter_weight_history add column if not exists updated_at timestamptz not null default now();

grant update(weight,status,admin_comment,updated_at) on public.fighter_weight_history to authenticated;
do $$ begin
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='fighter_weight_history' and policyname='CTC fighter corrects own weigh-ins') then
  create policy "CTC fighter corrects own weigh-ins" on public.fighter_weight_history for update to authenticated
  using (exists(select 1 from public.fighters f where f.id=fighter_id and f.auth_user_id=auth.uid()))
  with check (exists(select 1 from public.fighters f where f.id=fighter_id and f.auth_user_id=auth.uid()));
 end if;
end $$;

grant delete on public.fighter_documents to authenticated;
do $$ begin
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='fighter_documents' and policyname='CTC fighter removes replaceable bloodwork') then
  create policy "CTC fighter removes replaceable bloodwork" on public.fighter_documents for delete to authenticated
  using (exists(select 1 from public.fighters f where f.id=fighter_id and f.auth_user_id=auth.uid()) and (review_status in ('pending','rejected') or (expiration_date is not null and expiration_date < current_date)));
 end if;
end $$;
