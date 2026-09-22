-- Safe upgrade for existing CTC Supabase project
alter table public.applications add column if not exists fighter_level text;
update public.site_settings set setting_value='FIGHT OPPORTUNITIES', updated_at=now() where setting_key='home_eyebrow' and setting_value ilike '%amateur%';
update public.site_settings set setting_value='Join the Couch To Cage roster and get connected with MMA, Muay Thai, and kickboxing opportunities.', updated_at=now() where setting_key='home_description' and setting_value ilike '%amateur%';
select 'Fighter level and site wording upgrade complete' as result;
