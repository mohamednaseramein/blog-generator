-- AgDR: docs/agdr/AgDR-0015-migration-blog-drafts-seo-title.md
-- Ticket: https://github.com/mohamednaseramein/blog-generator/issues/48
ALTER TABLE blog_drafts
  ADD COLUMN IF NOT EXISTS seo_title TEXT;
