-- Migration 008: Create author_profiles table and add profile snapshot columns to blog_briefs
-- Ticket:  https://github.com/mohamednaseramein/blog-generator/issues/82
-- AgDR:    docs/agdr/AgDR-0020-migration-author-profiles-table.md
-- Rollback: ALTER TABLE blog_briefs DROP COLUMN IF EXISTS profile_id, author_role, intent, voice_note;
--           DROP TABLE IF EXISTS author_profiles;

-- Create the author_profiles table
CREATE TABLE IF NOT EXISTS author_profiles (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(120) NOT NULL,
  author_role      VARCHAR(200) NOT NULL,
  audience_persona TEXT         NOT NULL,
  intent           VARCHAR(40)  NOT NULL
                                CHECK (intent IN ('thought_leadership','seo','product_announcement','newsletter','deep_dive')),
  tone_of_voice    VARCHAR(200) NOT NULL,
  voice_note       TEXT         NOT NULL DEFAULT '',
  is_predefined    BOOLEAN      NOT NULL DEFAULT false,
  voice_sample_text TEXT        NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index for fast predefined profile lookup
CREATE INDEX IF NOT EXISTS idx_author_profiles_is_predefined
  ON author_profiles (is_predefined)
  WHERE is_predefined = true;

-- Add profile snapshot columns to blog_briefs
ALTER TABLE blog_briefs
  ADD COLUMN author_role   VARCHAR(200),
  ADD COLUMN intent        VARCHAR(40),
  ADD COLUMN voice_note    TEXT,
  ADD COLUMN profile_id    UUID REFERENCES author_profiles(id) ON DELETE SET NULL;

-- Backfill existing rows with sensible defaults
UPDATE blog_briefs
  SET author_role = 'Subject matter expert',
      intent      = 'thought_leadership',
      voice_note  = '';

-- Apply NOT NULL and DEFAULT constraints after backfill
ALTER TABLE blog_briefs
  ALTER COLUMN author_role SET NOT NULL,
  ALTER COLUMN intent      SET NOT NULL;

ALTER TABLE blog_briefs
  ALTER COLUMN voice_note SET DEFAULT '';

ALTER TABLE blog_briefs
  ALTER COLUMN voice_note SET NOT NULL;
