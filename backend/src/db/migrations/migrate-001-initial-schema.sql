-- Migration 001: Create initial blogs and blog_briefs tables
-- Ticket:  https://github.com/mohamednaseramein/blog-generator/issues/6
-- AgDR:    docs/agdr/AgDR-0005-migration-initial-schema.md
-- Rollback: DROP TABLE IF EXISTS blog_briefs; DROP TABLE IF EXISTS blogs;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS blogs (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL,
  status       VARCHAR(20)  NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'in_progress', 'completed')),
  current_step SMALLINT     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_briefs (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id              UUID          NOT NULL UNIQUE REFERENCES blogs(id) ON DELETE CASCADE,
  title                VARCHAR(500)  NOT NULL,
  primary_keyword      VARCHAR(255)  NOT NULL,
  audience_persona     TEXT          NOT NULL,
  tone_of_voice        VARCHAR(100)  NOT NULL,
  word_count_min       INTEGER       NOT NULL,
  word_count_max       INTEGER       NOT NULL,
  blog_brief           TEXT          NOT NULL,
  reference_url        TEXT,
  scraped_content      TEXT,
  scrape_status        VARCHAR(20)   NOT NULL DEFAULT 'skipped'
                                     CHECK (scrape_status IN ('pending', 'success', 'failed', 'skipped')),
  alignment_summary    TEXT,
  alignment_confirmed  BOOLEAN       NOT NULL DEFAULT FALSE,
  alignment_iterations SMALLINT      NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blogs_user_id          ON blogs(user_id);
CREATE INDEX IF NOT EXISTS idx_blogs_status           ON blogs(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_briefs_blog_id ON blog_briefs(blog_id);
