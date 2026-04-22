-- Migration 003: Create blog_references table for multi-URL reference support
-- Ticket:  https://github.com/mohamednaseramein/blog-generator/issues/26
-- AgDR:    docs/agdr/AgDR-0009-migration-blog-references-table.md
-- Rollback: DROP TABLE IF EXISTS blog_references;
--
-- NOTE: blog_briefs.reference_url, scraped_content, scrape_status are
-- deprecated by this migration but NOT dropped here. They are dropped in
-- migrate-004 after US-09 and US-10 have both shipped.

CREATE TABLE IF NOT EXISTS blog_references (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id           UUID         NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  url               TEXT         NOT NULL,
  position          SMALLINT     NOT NULL DEFAULT 1,
  scrape_status     VARCHAR(20)  NOT NULL DEFAULT 'pending'
                                 CHECK (scrape_status IN ('pending','success','failed','timeout','skipped')),
  scrape_error      TEXT,
  scraped_content   TEXT,
  extraction_status VARCHAR(20)  NOT NULL DEFAULT 'pending'
                                 CHECK (extraction_status IN ('pending','success','failed','irrelevant')),
  extraction_json   TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_references_blog_id ON blog_references(blog_id);
