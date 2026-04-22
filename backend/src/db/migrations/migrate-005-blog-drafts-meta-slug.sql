-- AgDR: docs/agdr/AgDR-0014-migration-blog-drafts-meta-slug.md
-- Ticket: https://github.com/mohamednaseramein/blog-generator/issues/39
ALTER TABLE blog_drafts
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS suggested_slug   TEXT;
