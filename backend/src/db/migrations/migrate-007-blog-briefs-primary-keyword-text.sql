-- primary_keyword: SEO phrases and multi-term keywords can exceed VARCHAR(255).
-- tone_of_voice: allow richer descriptions (was 100).
-- Fixes: value too long for type character varying(255) on blog_briefs upsert.
ALTER TABLE blog_briefs
  ALTER COLUMN primary_keyword TYPE TEXT;

ALTER TABLE blog_briefs
  ALTER COLUMN tone_of_voice TYPE VARCHAR(200);
