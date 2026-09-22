-- RUN ONCE in Supabase SQL Editor, after the existing CTC messaging setup.
-- No existing messages or policies are deleted. All file reads go through a
-- user-authorized short-lived URL from the Netlify function.
ALTER TABLE public.ctc_messages ADD COLUMN IF NOT EXISTS attachment_path text;
ALTER TABLE public.ctc_messages ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE public.ctc_messages ADD COLUMN IF NOT EXISTS attachment_type text;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('ctc-message-attachments','ctc-message-attachments',false,3145728,
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=3145728,
 allowed_mime_types=EXCLUDED.allowed_mime_types;
-- No public storage policies: uploads/downloads use server-only service credentials.
-- Fighter-message existing row-level policies remain in force.
