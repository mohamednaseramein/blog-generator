-- Migration 002: Create blog_outlines table for Step 3 outline persistence
-- Ticket:  https://github.com/mohamednaseramein/blog-generator/issues/19
-- AgDR:    docs/agdr/AgDR-0008-migration-blog-outlines-table.md
-- Rollback: DROP TABLE IF EXISTS blog_outlines;

CREATE TABLE IF NOT EXISTS blog_outlines (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id             UUID         NOT NULL UNIQUE REFERENCES blogs(id) ON DELETE CASCADE,
  outline_json        TEXT         NOT NULL,
  outline_confirmed   BOOLEAN      NOT NULL DEFAULT FALSE,
  outline_iterations  SMALLINT     NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_outlines_blog_id ON blog_outlines(blog_id);
