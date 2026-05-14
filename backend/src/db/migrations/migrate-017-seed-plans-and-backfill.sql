-- Migration 017: Seed 3 plans, backfill existing users to Free, extend new-user trigger
-- Ticket:  https://github.com/mohamednaseramein/blog-generator/issues/155
-- Epic:    https://github.com/mohamednaseramein/blog-generator/issues/149
-- AgDR:    docs/agdr/AgDR-0035-migration-subscriptions-schema.md
-- Rollback:
--   1. Restore handle_new_user() to its migrate-013 body (users insert only).
--   2. DELETE FROM subscriptions;  DELETE FROM plans WHERE slug IN ('free','pro','team');
--   (or DROP both tables per migrate-016 rollback)

-- Seed the three launch plans. All values are admin-editable post-launch.
-- price_cents is display-only in v1 (no payment provider integrated).
INSERT INTO plans (slug, name, description, price_cents, currency,
                   blog_quota, ai_check_quota, author_profile_limit, reference_extraction_quota,
                   is_public, is_default, sort_order) VALUES
  ('free', 'Free', 'Get started at no cost.',           0,    'USD', 3,    5,    1,    10,   true, true,  1),
  ('pro',  'Pro',  'For regular content creators.',     1900, 'USD', 50,   200,  10,   300,  true, false, 2),
  ('team', 'Team', 'For teams shipping at volume.',     9900, 'USD', NULL, NULL, 50,   NULL, true, false, 3);

-- Backfill: every existing user gets an active Free subscription.
-- Idempotent — skips users who already have an active subscription.
INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
SELECT u.id,
       (SELECT id FROM plans WHERE slug = 'free'),
       'active',
       date_trunc('month', NOW()),
       date_trunc('month', NOW()) + INTERVAL '1 month'
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active'
);

-- Extend the existing auth-sync function (migrate-013) to also create a default
-- subscription for every new user. SECURITY DEFINER + search_path + REVOKE are
-- re-declared to match migrate-013 exactly (CREATE OR REPLACE does not preserve them).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_plan_id UUID;
BEGIN
  INSERT INTO public.users (id, role, email_verified_at)
  VALUES (new.id, 'user', new.email_confirmed_at);

  SELECT id INTO default_plan_id
  FROM public.plans
  WHERE is_default = true AND archived_at IS NULL
  LIMIT 1;

  IF default_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, plan_id, status,
                                      current_period_start, current_period_end)
    VALUES (new.id, default_plan_id, 'active',
            date_trunc('month', NOW()),
            date_trunc('month', NOW()) + INTERVAL '1 month');
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.handle_new_user() SET search_path = public;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- The on_auth_user_created trigger (migrate-013) already points at this function;
-- CREATE OR REPLACE updates the body in place, so no trigger change is needed.
