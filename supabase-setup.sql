-- COUCH TO CAGE ADMIN V1
-- Paste this entire file into Supabase SQL Editor and press Run.

create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  promotion text,
  event_date timestamptz not null,
  discipline text not null check (discipline in ('MMA','Muay Thai','Kickboxing','Multiple')),
  venue text,
  location text not null,
  image_url text,
  ticket_url text,
  description text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fight_clips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  fighters text,
  discipline text not null check (discipline in ('MMA','Muay Thai','Kickboxing')),
  fight_date date,
  video_url text not null,
  event_name text,
  caption text,
  featured boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;
alter table public.fight_clips enable row level security;

drop policy if exists "Public can view published events" on public.events;
create policy "Public can view published events"
on public.events for select
to anon, authenticated
using (published = true or auth.role() = 'authenticated');

drop policy if exists "Authenticated admins manage events" on public.events;
create policy "Authenticated admins manage events"
on public.events for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can view published clips" on public.fight_clips;
create policy "Public can view published clips"
on public.fight_clips for select
to anon, authenticated
using (published = true or auth.role() = 'authenticated');

drop policy if exists "Authenticated admins manage clips" on public.fight_clips;
create policy "Authenticated admins manage clips"
on public.fight_clips for all
to authenticated
using (true)
with check (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists set_fight_clips_updated_at on public.fight_clips;
create trigger set_fight_clips_updated_at
before update on public.fight_clips
for each row execute function public.set_updated_at();
