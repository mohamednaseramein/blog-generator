-- Migration 011: Scope author_profiles to user_id
-- Ticket: https://github.com/mohamednaseramein/blog-generator/issues/82
-- Depends on: migrate-008-author-profiles.sql, migrate-009-seed-predefined-profiles.sql
--
-- Rationale:
-- - Backend uses Supabase service role, which bypasses RLS.
-- - Enforce tenancy in application queries by attaching a user_id to user-created profiles.
-- - Predefined profiles remain global (user_id NULL, is_predefined = true).
--
-- Rollback:
--   ALTER TABLE author_profiles DROP COLUMN IF EXISTS user_id;
--   DROP INDEX IF EXISTS idx_author_profiles_user_id;
--   DROP INDEX IF EXISTS idx_author_profiles_user_id_created_at;

ALTER TABLE author_profiles
  ADD COLUMN IF NOT EXISTS user_id UUID NULL;

-- Backfill existing non-predefined profiles to the dev user (EP-01 placeholder auth).
UPDATE author_profiles
  SET user_id = '00000000-0000-0000-0000-000000000001'
  WHERE is_predefined = false AND user_id IS NULL;

-- Ensure predefined profiles remain global.
UPDATE author_profiles
  SET user_id = NULL
  WHERE is_predefined = true;

-- Indexes to keep list queries fast.
CREATE INDEX IF NOT EXISTS idx_author_profiles_user_id
  ON author_profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_author_profiles_user_id_created_at
  ON author_profiles (user_id, created_at);

