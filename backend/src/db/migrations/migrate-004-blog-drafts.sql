-- Migration 004: Create blog_drafts table for Step 4 draft persistence
-- Ticket:  https://github.com/mohamednaseramein/blog-generator/issues/33
-- AgDR:    docs/agdr/AgDR-0012-migration-blog-drafts-table.md
-- Rollback: DROP TABLE IF EXISTS blog_drafts;

CREATE TABLE IF NOT EXISTS blog_drafts (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id             UUID         NOT NULL UNIQUE REFERENCES blogs(id) ON DELETE CASCADE,
  draft_markdown      TEXT         NOT NULL DEFAULT '',
  draft_confirmed     BOOLEAN      NOT NULL DEFAULT FALSE,
  draft_iterations    SMALLINT     NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_drafts_blog_id ON blog_drafts(blog_id);
