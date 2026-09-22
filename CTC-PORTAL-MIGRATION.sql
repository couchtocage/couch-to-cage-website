-- Run once in Supabase SQL Editor after deploying this ZIP.
alter table public.fighters add column if not exists instagram_url text;
alter table public.fighters add column if not exists tiktok_url text;
alter table public.fighters add column if not exists sherdog_url text;
alter table public.fighters add column if not exists walkout_song_title text;
alter table public.fighters add column if not exists walkout_song_artist text;
alter table public.fighters add column if not exists walkout_song_url text;
alter table public.fighters add column if not exists walkout_song_updated_at timestamptz;
alter table public.fighters add column if not exists headshot_url text;
alter table public.fighters add column if not exists headshot_path text;

create table if not exists public.fighter_documents (
 id uuid primary key default gen_random_uuid(), fighter_id uuid not null references public.fighters(id) on delete cascade,
 document_type text not null default 'bloodwork', file_path text, file_url text, issue_date date, expiration_date date,
 review_status text not null default 'pending', created_at timestamptz not null default now(), reviewed_at timestamptz
);
create table if not exists public.fighter_matchups (
 id uuid primary key default gen_random_uuid(), fighter_id uuid not null references public.fighters(id) on delete cascade,
 status text not null default 'pending', promotion text, event_name text, fight_date date, fight_time text, venue text, city text, state text,
 opponent_name text, opponent_record text, contracted_weight text, discipline text, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.fighter_documents enable row level security;
alter table public.fighter_matchups enable row level security;
drop policy if exists "Fighters view own documents" on public.fighter_documents;
create policy "Fighters view own documents" on public.fighter_documents for select to authenticated using (exists(select 1 from public.fighters f where f.id=fighter_id and f.auth_user_id=auth.uid()));
drop policy if exists "Fighters add own documents" on public.fighter_documents;
create policy "Fighters add own documents" on public.fighter_documents for insert to authenticated with check (exists(select 1 from public.fighters f where f.id=fighter_id and f.auth_user_id=auth.uid()));
drop policy if exists "Fighters view own matchups" on public.fighter_matchups;
create policy "Fighters view own matchups" on public.fighter_matchups for select to authenticated using (exists(select 1 from public.fighters f where f.id=fighter_id and f.auth_user_id=auth.uid()));
insert into storage.buckets(id,name,public) values('fighter-documents','fighter-documents',false) on conflict(id) do nothing;
drop policy if exists "Fighters upload own documents" on storage.objects;
create policy "Fighters upload own documents" on storage.objects for insert to authenticated with check (bucket_id='fighter-documents' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Fighters read own documents" on storage.objects;
create policy "Fighters read own documents" on storage.objects for select to authenticated using (bucket_id='fighter-documents' and (storage.foldername(name))[1]=auth.uid()::text);

-- Application fields used by the new Join Fighter form.
alter table public.applications add column if not exists gym text;
alter table public.applications add column if not exists tapology_url text;


-- Compatibility for older fighter_documents tables already used by CTC.
alter table public.fighter_documents add column if not exists fighter_id uuid references public.fighters(id) on delete cascade;
alter table public.fighter_documents add column if not exists file_path text;
alter table public.fighter_documents add column if not exists issue_date date;
alter table public.fighter_documents add column if not exists expiration_date date;
alter table public.fighter_documents add column if not exists review_status text default 'pending';
-- Legacy required user_id is populated by the portal on every new upload.


-- Public fighter headshots (non-medical profile images only).
insert into storage.buckets(id,name,public) values('fighter-headshots','fighter-headshots',true) on conflict(id) do update set public=true;
drop policy if exists "Fighters upload own headshots" on storage.objects;
create policy "Fighters upload own headshots" on storage.objects for insert to authenticated with check (bucket_id='fighter-headshots' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Fighters update own headshots" on storage.objects;
create policy "Fighters update own headshots" on storage.objects for update to authenticated using (bucket_id='fighter-headshots' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='fighter-headshots' and (storage.foldername(name))[1]=auth.uid()::text);

-- Fighter-selectable portal header background.
-- Uses the existing fighter-headshots public image bucket and its per-user folder policies.
alter table public.fighters add column if not exists portal_background_url text;
