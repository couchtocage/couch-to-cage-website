-- CTC fighter portal custom background setup
-- Safe to run more than once.
alter table public.fighters add column if not exists portal_background_url text;

insert into storage.buckets (id, name, public)
values ('fighter-portal-backgrounds', 'fighter-portal-backgrounds', true)
on conflict (id) do update set public = true;

-- Storage policies are managed in the live Supabase project.
-- The portal stores each fighter's image at: <auth.uid()>/portal-background.jpg
