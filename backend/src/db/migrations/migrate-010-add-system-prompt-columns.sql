-- Migration 010: Add system_prompt columns to AI generation step tables
-- Ticket: https://github.com/mohamednaseramein/blog-generator/issues/82
-- Purpose: Persist the exact system prompt sent to Claude for each AI step
--          so the ViewPromptPanel can display the actual prompt used

-- Add alignment_system_prompt to blog_briefs (alignment data lives here)
ALTER TABLE blog_briefs
  ADD COLUMN alignment_system_prompt TEXT;

-- Add system_prompt to blog_outlines
ALTER TABLE blog_outlines
  ADD COLUMN system_prompt TEXT;

-- Add system_prompt to blog_drafts
ALTER TABLE blog_drafts
  ADD COLUMN system_prompt TEXT;

-- Note: Columns are nullable for existing rows (they were generated before this migration).
--       New generations will populate system_prompt via the buildProfileContext() service.
