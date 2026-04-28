-- Migration 009: Seed predefined author profiles
-- Ticket: https://github.com/mohamednaseramein/blog-generator/issues/82
-- Depends on: migrate-008-author-profiles.sql

-- Insert 4 predefined profiles (is_predefined = true)
INSERT INTO author_profiles (
  id, name, author_role, audience_persona, intent, tone_of_voice, voice_note, is_predefined, created_at, updated_at
) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'Technical CTO',
    'CTO / Engineering Leader',
    'Senior engineers and engineering managers',
    'thought_leadership',
    'Direct, evidence-based, confident',
    '',
    true,
    NOW(),
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'Growth Marketer',
    'Marketing Lead',
    'Founders, marketers, and growth-curious readers',
    'seo',
    'Conversational, scannable, action-oriented',
    '',
    true,
    NOW(),
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'Founder',
    'Founder / CEO',
    'Founders, investors, and operators',
    'product_announcement',
    'Storytelling, candid, narrative-driven',
    '',
    true,
    NOW(),
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440004',
    'Domain Expert',
    'Specialist Practitioner',
    'Peers and informed practitioners',
    'deep_dive',
    'Formal, precise, thorough',
    '',
    true,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;
