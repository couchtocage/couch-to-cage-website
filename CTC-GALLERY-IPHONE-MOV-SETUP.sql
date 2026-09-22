-- Optional: run if Gallery iPhone .MOV upload reports video/quicktime not supported.
-- Do NOT create/replace the media bucket; this only extends an existing restricted MIME list.
update storage.buckets
set allowed_mime_types = case
  when allowed_mime_types is null then null
  else array(select distinct x from unnest(allowed_mime_types || array['video/quicktime','video/mp4','video/x-m4v','video/webm','video/mpeg']) as x)
end
where id = 'ctc-media';
