-- Migration 015: Create blog_ai_checks cache table for AI content detector (POST /api/blogs/:id/ai-check)
-- Ticket:  https://github.com/mohamednaseramein/blog-generator/issues/116
-- Epic:    https://github.com/mohamednaseramein/blog-generator/issues/115
-- AgDR:    docs/agdr/AgDR-0032-migration-blog-ai-checks-table.md
-- Rollback: DROP TABLE IF EXISTS blog_ai_checks;

CREATE TABLE blog_ai_checks (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id                  UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  input_hash               CHAR(64) NOT NULL,
  rubric_version           VARCHAR(32) NOT NULL,
  ai_likelihood_percent    SMALLINT,
  human_likelihood_percent SMALLINT,
  uncertainty_percent      SMALLINT,
  mode                     VARCHAR(32) NOT NULL,
  result                   JSONB NOT NULL,
  llm_provider             VARCHAR(32) NOT NULL,
  llm_model                VARCHAR(100) NOT NULL,
  tokens_input             INTEGER NOT NULL DEFAULT 0,
  tokens_output            INTEGER NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cache lookup index (the hot path)
CREATE UNIQUE INDEX uniq_blog_ai_checks_cache_key
  ON blog_ai_checks (blog_id, input_hash, rubric_version);

-- Cleanup / observability indexes
CREATE INDEX idx_blog_ai_checks_blog_id ON blog_ai_checks (blog_id);
CREATE INDEX idx_blog_ai_checks_created_at ON blog_ai_checks (created_at);

-- Mode validation (cheap CHECK; rubric versions handled in app)
ALTER TABLE blog_ai_checks
  ADD CONSTRAINT chk_blog_ai_checks_mode CHECK (
    mode IN ('pure_ai', 'ai_assisted', 'human_polish', 'pure_human', 'language_unsupported')
  );
